
import sys
import os
# Add the Pryan-Fire root directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

# main.py for the Trade Executor service
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient
from solana.rpc.types import MemcmpOpts, TokenAccountOpts
from typing import Optional, List, Dict, Any
import asyncio
from anchorpy import Program, Provider, Wallet, Idl
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.instruction import Instruction
from solders.transaction import Transaction
import requests
import httpx
import json
import logging
import datetime
import threading
from health_server import start_health_server, stop_health_server

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("trade_executor_audit.log"),
        logging.FileHandler("/data/openclaw/logs/meteora_audits.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Constants
RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"
BOT_WALLET_PUBKEY = "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x"
METEORA_DLMM_PROGRAM_ID = Pubkey.from_string("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")

# Circuit breaker status
CIRCUIT_BREAKER_ACTIVE = False

# Simplified Meteora IDL
METEORA_IDL_DICT = {
    "version": "0.1.0",
    "name": "dlmm",
    "instructions": [], # Simplified for audit
    "accounts": [
        {
            "name": "Position",
            "type": {
                "kind": "struct",
                "fields": [
                    {"name": "owner", "type": "publicKey"},
                    {"name": "pool", "type": "publicKey"},
                    {"name": "lowerBinId", "type": "i64"},
                    {"name": "upperBinId", "type": "i64"},
                    {"name": "liquidity", "type": "u64"},
                    {"name": "totalFeeX", "type": "u64"},
                    {"name": "totalFeeY", "type": "u64"},
                    {"name": "lastUpdatedAt", "type": "i64"},
                ],
            },
        },
        {
            "name": "Pool",
            "type": {
                "kind": "struct",
                "fields": [
                    {"name": "tokenXMint", "type": "publicKey"},
                    {"name": "tokenYMint", "type": "publicKey"},
                ],
            },
        },
    ],
}
METEORA_IDL = Idl.from_json(json.dumps(METEORA_IDL_DICT))

class RiskManager:
    def __init__(self, daily_loss_limit: float = -1000.0, max_trade_size: float = 100.0):
        self.daily_loss_limit = daily_loss_limit
        self.max_trade_size = max_trade_size
        self.current_daily_loss = 0.0
        self.circuit_breaker_active = False
        self.strategy_risk_scores = {"Spot": 1, "Curve": 3, "BidAsk": 5}
        logger.info("Risk Manager initialized.")

    def check_trade(self, amount: float) -> bool:
        if self.circuit_breaker_active: return False
        if amount > self.max_trade_size: return False
        return True

    def activate_circuit_breaker(self):
        self.circuit_breaker_active = True
        logger.critical("🚨 CIRCUIT BREAKER ACTIVATED")

    def deactivate_circuit_breaker(self):
        self.circuit_breaker_active = False
        logger.info("✅ CIRCUIT BREAKER DEACTIVATED")

class RebalanceStrategy:
    def __init__(self, buffer_bins: int = 10, target_width: int = 20):
        self.buffer_bins = buffer_bins
        self.target_width = target_width
        logger.info(f"Rebalance Strategy initialized (Buffer: {buffer_bins})")

    def should_rebalance(self, active_id: int, lower: int, upper: int) -> bool:
        return active_id < (lower - self.buffer_bins) or active_id > (upper + self.buffer_bins)

    def calculate_new_range(self, active_id: int) -> Dict[str, int]:
        half = self.target_width // 2
        return {"lower": active_id - half, "upper": active_id + half}

class TradeExecutor:
    def __init__(self, rpc_endpoint: str, private_key: str = None):
        self.wallet: Optional[Keypair] = Keypair.from_base58_string(private_key) if private_key else None
        self.client = AsyncClient(rpc_endpoint)
        self.provider = Provider(self.client, Wallet(self.wallet) if self.wallet else None)
        self.meteora_dlmm_program = Program(METEORA_IDL, METEORA_DLMM_PROGRAM_ID, self.provider)
        self.risk_manager = RiskManager()
        self.rebalance_strategy = RebalanceStrategy()
        
        # Load MomentumScanner (Modular Architecture)
        from src.signals.dex_screener import MomentumScanner
        self.momentum_scanner = MomentumScanner()
        logger.info("Trade Executor initialized (Modular Architecture).")

    async def run_autonomous_audit(self, positions: Optional[List[Dict[str, Any]]] = None):
        logger.info(f"--- [AUTONOMOUS AUDIT: {datetime.datetime.now()}] ---")
        lp_positions = positions
        if lp_positions is None:
            lp_positions = await self.get_meteora_lp_positions(Pubkey.from_string(BOT_WALLET_PUBKEY))
        
        if not lp_positions:
            logger.info("    -> No active positions found.")
            return

        for pos in lp_positions:
            active_id = pos.get("activeId")
            token_x_mint = pos.get("tokenXMint")
            if active_id is None or not token_x_mint: continue

            # Momentum Verification Filter (Modular Client Usage)
            momentum_check = await self.momentum_scanner.validate_momentum(str(token_x_mint))
            if momentum_check["momentum_signal"] == "NEGATIVE":
                logger.warning(f"MOMENTUM_BLOCK: Skipping rebalance due to negative momentum on {token_x_mint}: {momentum_check['reasons']}")
                continue
            
            logger.info(f"    -> Momentum check PASSED for {token_x_mint}. Signal: {momentum_check['momentum_signal']}")

            if self.rebalance_strategy.should_rebalance(active_id, pos['lowerBinId'], pos['upperBinId']):
                logger.warning(f"🚨 [STRATEGY ALERT] Rebalance required for {pos['pubkey']}")

    async def get_meteora_lp_positions(self, owner_pubkey: Pubkey) -> List[Dict[str, Any]]:
        # Mocking for testing
        return []

    async def get_sol_balance(self, pubkey_str: str) -> float:
        try:
            pubkey = Pubkey.from_string(pubkey_str)
            res = await self.client.get_balance(pubkey)
            return res.value / 1_000_000_000
        except: return 0.0

    async def get_pyth_price(self, feed_id: str) -> Optional[Dict[str, Any]]:
        url = f"https://hermes.pyth.network/v2/updates/price/latest?ids[]={feed_id}"
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            data = res.json()
            if data and "parsed" in data:
                return data["parsed"][0].get("price")
        return None

    async def close(self):
        logger.info("Closing sessions...")
        await self.momentum_scanner.close()
        await self.client.close()

    def execute_trade(self, trade_details: dict) -> Dict[str, Any]:
        amount = trade_details.get("amount", 0.0)
        if not self.risk_manager.check_trade(amount):
            return {"status": "rejected"}
        if not self.wallet:
            return {"status": "error", "message": "Wallet not loaded"}
        return {"status": "pending"}

if __name__ == "__main__":
    async def main_async():
        health_thread = threading.Thread(target=start_health_server, args=(8000,), daemon=True)
        health_thread.start()
        
        executor = TradeExecutor(RPC_ENDPOINT)
        try:
            # 1. Verification Run with a REAL mint address (SOL)
            SOL_MINT = "So11111111111111111111111111111111111111112"
            
            # Create a mock position for SOL to test live scan
            mock_positions = [{
                "pubkey": Pubkey.new_unique(),
                "tokenXMint": Pubkey.from_string(SOL_MINT),
                "lowerBinId": -10,
                "upperBinId": 10,
                "activeId": 5, # In range
                "liquidity": 1000,
                "ownerTokenXBalance": 0,
                "ownerTokenYBalance": 0
            }]
            
            logger.info("\n--- LIVE PERFORMANCE AUDIT (SOL MINT) ---")
            await executor.run_autonomous_audit(mock_positions)
            
            # 2. Test Risk Manager
            logger.info("\n--- RISK MANAGER DEMO ---")
            res = executor.execute_trade({"amount": 50.0})
            logger.info(f"Trade result: {res}")

        finally:
            await executor.close()
            stop_health_server()
            
    asyncio.run(main_async())
