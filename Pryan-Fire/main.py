import asyncio
import logging
from typing import Dict, Any

from src.signals.pump_fun_stream import PumpFunSignal
from src.signals.dex_screener import MomentumScanner
from src.services.security_scanner import AntiRugScanner
from src.services.ledger_db import LedgerDB
from src.services.shutdown_manager import kill_switch

# Configure Core Engine Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [CORE] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("TradingEngine")

class TradingEngine:
    """
    Central Trading Engine.
    Orchestrates discovery, intelligence, and execution.
    """
    def __init__(self):
        # 1. Initialize Persistence
        self.ledger = LedgerDB()
        
        # 2. Initialize Shutdown Manager
        kill_switch.register_callback(self.stop)
        
        # 3. Initialize Momentum Intelligence
        self.momentum_scanner = MomentumScanner()
        
        # 4. Initialize Security Sentinel
        self.profile = {
            "name": "Standard_Security",
            "buy_amount_sol": 0.1,
            "min_liquidity_usd": 10000,
            "security": {"use_rug_check": True, "use_bundle_check": True}
        }
        self.sentinel = AntiRugScanner(self.profile)
        
        # 5. Initialize Discovery Stream
        self.ear = PumpFunSignal(on_token_received=self.on_discovery)

    async def run(self):
        """Initializes the engine and begins the trading loop."""
        logger.info("Initializing Trading Engine...")
        
        # A. State Recovery
        active_positions = self.ledger.get_active_positions()
        if active_positions:
            logger.info(f"Database Recovery: Found {len(active_positions)} active positions.")
            for pos in active_positions:
                logger.info(f" -> Monitoring Exit Strategy for {pos['symbol']} ({pos['mint']})")
        
        # B. Start Discovery
        logger.info("Engaging Discovery: Listening for new launches...")
        await self.ear.run()

    async def on_discovery(self, mint: str, metadata: Dict[str, Any]):
        """Discovery Pipeline: Signal -> Intel -> Security -> Execution."""
        symbol = metadata.get('symbol', '???')
        
        # 1. Market Health Check
        intel = await self.momentum_scanner.validate_momentum(mint)
        if not intel["passed"]:
            return

        # 2. Security Audit
        security = await self.sentinel.scan_token(mint)
        if not security["passed"]:
            logger.warning(f"Aborting {symbol}: Security risk detected ({security['reasons'][0]})")
            return

        # 3. Execution (Simulated for MVP)
        logger.info(f"VALIDATED: {symbol} passed security checks. Initializing transaction...")

    def stop(self):
        """Graceful shutdown handler."""
        logger.info("Trading Engine shutting down...")

if __name__ == "__main__":
    engine = TradingEngine()
    try:
        asyncio.run(engine.run())
    except KeyboardInterrupt:
        pass
