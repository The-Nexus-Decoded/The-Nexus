
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
DRY_RUN = True # Safety Flag

# Simplified Meteora IDL
METEORA_IDL_DICT = {
    "version": "0.1.0",
    "name": "dlmm",
    "instructions": [],
    "accounts": [
        {"name": "Position", "type": {"kind": "struct", "fields": [{"name": "owner", "type": "publicKey"}]}}
    ],
}
METEORA_IDL = Idl.from_json(json.dumps(METEORA_IDL_DICT))

class TradeExecutor:
    def __init__(self, rpc_endpoint: str, private_key: str = None):
        self.wallet: Optional[Keypair] = Keypair.from_base58_string(private_key) if private_key else None
        self.client = AsyncClient(rpc_endpoint)
        self.provider = Provider(self.client, Wallet(self.wallet) if self.wallet else None)
        
        # Load Modular Components
        from src.signals.dex_screener import MomentumScanner
        from src.services.watchlist_monitor import WatchlistMonitor
        from src.services.entry_executor import EntryExecutor
        
        self.momentum_scanner = MomentumScanner()
        self.watchlist_monitor = WatchlistMonitor()
        self.entry_executor = EntryExecutor(dry_run=DRY_RUN)
        logger.info("Trade Executor initialized (Phase 7 - The Strike).")

    async def run_autonomous_audit(self, positions: Optional[List[Dict[str, Any]]] = None):
        logger.info(f"--- [AUTONOMOUS AUDIT: {datetime.datetime.now()}] ---")
        
        # 1. Fetch current SOL balance for safety checks
        sol_balance = await self.get_sol_balance(BOT_WALLET_PUBKEY)
        logger.info(f"Current SOL Balance: {sol_balance:.4f}")

        # 2. Portfolio Scan
        lp_positions = positions if positions is not None else []
        held_mints = {str(p.get("tokenXMint")) for p in lp_positions if p.get("tokenXMint")}
        
        # 3. Watchlist Scan & Strike (Phase 7)
        logger.info("--- [WATCHLIST SCAN & STRIKE] ---")
        watchlist_tokens = self.watchlist_monitor.get_tokens()
        
        async def process_token(mint):
            if not self.entry_executor.can_strike(mint, held_mints):
                return

            momentum_check = await self.momentum_scanner.validate_momentum(mint)
            if momentum_check["momentum_signal"] == "POSITIVE":
                logger.warning(f"BREAKOUT_SIGNAL: Positive momentum on {mint}!")
                # THE STRIKE
                await self.entry_executor.execute_entry(mint, sol_balance)
            else:
                logger.info(f"    -> Watchlist token {mint} momentum: {momentum_check['momentum_signal']}")

        await asyncio.gather(*(process_token(m) for m in watchlist_tokens))

    async def get_sol_balance(self, pubkey_str: str) -> float:
        try:
            res = await self.client.get_balance(Pubkey.from_string(pubkey_str))
            return res.value / 1_000_000_000
        except: return 0.0

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
            await executor.run_autonomous_audit([])
        finally:
            await executor.close()
            stop_health_server()
    asyncio.run(main_async())
