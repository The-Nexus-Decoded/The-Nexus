
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

class RebalanceStrategy:
    def __init__(self, buffer_bins: int = 10, target_width: int = 20):
        self.buffer_bins = buffer_bins
        self.target_width = target_width
        logger.info(f"Rebalance Strategy initialized (Buffer: {buffer_bins})")

    def should_rebalance(self, active_id: int, lower: int, upper: int) -> bool:
        return active_id < (lower - self.buffer_bins) or active_id > (upper + self.buffer_bins)

class TradeExecutor:
    def __init__(self, rpc_endpoint: str, private_key: str = None):
        self.wallet: Optional[Keypair] = Keypair.from_base58_string(private_key) if private_key else None
        self.client = AsyncClient(rpc_endpoint)
        self.provider = Provider(self.client, Wallet(self.wallet) if self.wallet else None)
        self.meteora_dlmm_program = Program(METEORA_IDL, METEORA_DLMM_PROGRAM_ID, self.provider)
        self.risk_manager = RiskManager()
        self.rebalance_strategy = RebalanceStrategy()
        
        # Load Modular Components
        from src.signals.dex_screener import MomentumScanner
        from src.services.watchlist_monitor import WatchlistMonitor
        self.momentum_scanner = MomentumScanner()
        self.watchlist_monitor = WatchlistMonitor()
        logger.info("Trade Executor initialized (Phase 6 Architecture).")

    async def run_autonomous_audit(self, positions: Optional[List[Dict[str, Any]]] = None):
        logger.info(f"--- [AUTONOMOUS AUDIT: {datetime.datetime.now()}] ---")
        
        # 1. Active Portfolio Scan
        lp_positions = positions
        if lp_positions is None:
            lp_positions = await self.get_meteora_lp_positions(Pubkey.from_string(BOT_WALLET_PUBKEY))
        
        held_mints = set()
        if lp_positions:
            for pos in lp_positions:
                active_id = pos.get("activeId")
                token_x_mint = pos.get("tokenXMint")
                if active_id is None or not token_x_mint: continue
                
                held_mints.add(str(token_x_mint))

                # Portfolio Momentum Check
                momentum_check = await self.momentum_scanner.validate_momentum(str(token_x_mint))
                if momentum_check["momentum_signal"] == "NEGATIVE":
                    logger.warning(f"MOMENTUM_BLOCK: Negative momentum on held token {token_x_mint}: {momentum_check['reasons']}")
                    continue
                
                logger.info(f"    -> Portfolio momentum check PASSED for {token_x_mint}.")

                if self.rebalance_strategy.should_rebalance(active_id, pos['lowerBinId'], pos['upperBinId']):
                    logger.warning(f"🚨 [STRATEGY ALERT] Rebalance required for {pos['pubkey']}")
        else:
            logger.info("    -> No active positions found in portfolio.")

        # 2. Watchlist Parallel Monitoring (Phase 6)
        logger.info("--- [WATCHLIST SCAN] ---")
        watchlist_tokens = self.watchlist_monitor.get_tokens()
        for mint in watchlist_tokens:
            if mint in held_mints: continue # Already handled in portfolio scan
            
            momentum_check = await self.momentum_scanner.validate_momentum(mint)
            if momentum_check["momentum_signal"] == "POSITIVE":
                logger.warning(f"BREAKOUT_SIGNAL: Positive momentum detected on {mint}! Potential entry detected.")
            else:
                logger.info(f"    -> Watchlist token {mint} momentum: {momentum_check['momentum_signal']}")

    async def get_meteora_lp_positions(self, owner_pubkey: Pubkey) -> List[Dict[str, Any]]:
        return []

    async def close(self):
        logger.info("Closing sessions...")
        await self.momentum_scanner.close()
        await self.client.close()

if __name__ == "__main__":
    async def main_async():
        health_thread = threading.Thread(target=start_health_server, args=(8000,), daemon=True)
        health_thread.start()
        
        executor = TradeExecutor(RPC_ENDPOINT)
        try:
            # Run audit including watchlist
            await executor.run_autonomous_audit([])
        finally:
            await executor.close()
            stop_health_server()
            
    asyncio.run(main_async())
