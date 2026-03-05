#!/usr/bin/env python3
"""
Patryn Trading Launcher — starts EventLoop, scanners, and monitors.
This is the main entry point for the patryn-trader service.
"""

import os
import sys
import asyncio
import threading
import time
import logging
import json
from typing import Dict, Any

# ----------------------------------------------------------------------
# PATH SETUP — ensure imports resolve from monorepo
# ----------------------------------------------------------------------
REPO_ROOT = "/data/openclaw/workspace/Pryan-Fire"
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

SRC_PATH = os.path.join(REPO_ROOT, "src")
if SRC_PATH not in sys.path:
    sys.path.insert(0, SRC_PATH)

# ----------------------------------------------------------------------
# LOGGING
# ----------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("Launcher")

# ----------------------------------------------------------------------
# FLEXIBLE TRADE AMOUNT CONFIG (Pump.fun)
# ----------------------------------------------------------------------
PUMP_BASE_AMOUNT = float(os.getenv("PUMP_TRADE_AMOUNT_BASE", "10.0"))
PUMP_AMOUNT_MODE = os.getenv("PUMP_TRADE_AMOUNT_MODE", "fixed").lower()  # "fixed" or "flexible"

# ----------------------------------------------------------------------
# SIGNAL HANDLER — validates and computes trade size before enqueueing
# ----------------------------------------------------------------------
class SignalHandler:
    def __init__(self, event_loop: EventLoop):
        self.event_loop = event_loop
        self.momentum_scanner = MomentumScanner()
        self.rugcheck_scanner = RugcheckScanner()
        self.sentinel = AntiRugScanner(self._get_security_profile())
        logger.info("SignalHandler initialized with security profile")

    def _get_security_profile(self):
        return {
            "name": "Standard_Security",
            "buy_amount_sol": 0.1,
            "min_liquidity_usd": 10000,
            "security": {"use_rug_check": True, "use_bundle_check": True}
        }

    async def on_token_discovered(self, mint: str, metadata: dict):
        """Callback for Pump.fun new token."""
        symbol = metadata.get('symbol', 'UNKNOWN')
        logger.info(f"New token discovered: {symbol} ({mint})")

        # 1. Momentum validation (DEX Screener)
        try:
            intel = await self.momentum_scanner.validate_momentum(mint)
            if not intel.get("passed"):
                reason = intel.get("reason", "Unknown")
                reasons_list = intel.get("reasons", [])
                if reasons_list:
                    reason = " | ".join(reasons_list)
                logger.info(f"Token {symbol} rejected (momentum): {reason}")
                return
        except Exception as e:
            logger.error(f"Momentum validation error for {mint}: {e}")
            return

        logger.info(f"Token {symbol} passed momentum validation")

        # 2. Rugcheck security scan
        try:
            dex_liq = intel.get("metrics", {}).get("liquidity", 0)
            safety = await self.rugcheck_scanner.scan_token(mint, dex_liquidity=dex_liq)
            if not safety["safe"]:
                logger.info(f"Token {symbol} failed rugcheck: {safety['reason']}")
                return
            if not safety.get("skipped"):
                logger.info(f"Token {symbol} passed rugcheck (score={safety['score']}, lp={safety.get('lp_locked_pct', 0):.1f}%)")
        except Exception as e:
            logger.warning(f"Rugcheck error for {mint}: {e} — allowing trade (fail-open)")

        # 3. Determine trade amount (flexible or fixed)
        amount = self._compute_amount(intel.get("metrics", {}))
        trade_id = f"pump-{mint[:8]}"

        signal = {
            "token_address": mint,
            "amount": amount,
            "trade_id": trade_id,
            "source": "pump_fun"
        }
        logger.info(f"Enqueuing signal for {symbol}: amount={amount:.6f} tokens")
        self.event_loop.enqueue_signal(signal)

    def _compute_amount(self, metrics: Dict[str, Any]) -> float:
        """Compute trade amount based on configuration and metrics."""
        if PUMP_AMOUNT_MODE == "fixed":
            return PUMP_BASE_AMOUNT
        # Flexible mode: scale by liquidity
        liquidity = metrics.get("liquidity", 0)
        factor = max(0.1, min(1.0, liquidity / 100_000.0))
        return PUMP_BASE_AMOUNT * factor

# ----------------------------------------------------------------------
# MAIN LAUNCHER
# ----------------------------------------------------------------------
def main():
    # Load configuration for core orchestrator
    config_path = os.path.join(os.path.dirname(__file__), "orchestrator_config.json")
    config = {}
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        logger.info(f"Loaded orchestrator config from {config_path}")
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        return

    # Initialize Audit Logger
    audit_logger = AuditLogger()

    # Initialize Risk Manager (mock or real)
    discord_token = os.getenv("DISCORD_TOKEN")
    channel_id_str = os.getenv("DISCORD_CHANNEL_ID")
    if discord_token and channel_id_str:
        try:
            channel_id = int(channel_id_str)
            risk_manager = RiskManager(discord_token, channel_id)
            logger.info("RiskManager initialized with Discord (real mode)")
        except ValueError:
            logger.error("DISCORD_CHANNEL_ID invalid. Using MOCK RiskManager")
            risk_manager = RiskManager()
    else:
        logger.warning("Discord credentials not set. Using MOCK RiskManager (auto-approve)")
        risk_manager = RiskManager()

    # Create Core Orchestrator
    core_orchestrator = TradeOrchestrator(risk_manager, audit_logger, config_path=config_path)
    logger.info("Core Orchestrator created")

    # Create and start EventLoop in daemon thread
    event_loop = EventLoop(core_orchestrator)
    loop_thread = threading.Thread(target=event_loop.run, daemon=True, name="EventLoop")
    loop_thread.start()
    logger.info("EventLoop started")

    # Signal handler (scanners callbacks)
    handler = SignalHandler(event_loop)

    # Start Pump.fun scanner in daemon thread
    def run_pump():
        pump_scanner = PumpFunSignal(on_token_received=handler.on_token_discovered)
        try:
            asyncio.run(pump_scanner.run())
        except Exception as e:
            logger.error(f"Pump.fun scanner thread error: {e}", exc_info=True)
    pump_thread = threading.Thread(target=run_pump, daemon=True, name="PumpFun-Scanner")
    pump_thread.start()
    logger.info("Pump.fun scanner started")

    # Start Meteora scanner if enabled
    if os.getenv("METEORA_ENABLED", "").lower() == "true":
        devnet = "devnet" in os.getenv("SOLANA_RPC_URL", "").lower()
        meteora_scanner = MeteoraDLMMScanner(orchestrator=core_orchestrator, devnet=devnet)
        def run_meteora():
            try:
                asyncio.run(meteora_scanner.run())
            except Exception as e:
                logger.error(f"Meteora scanner thread error: {e}", exc_info=True)
        meteora_thread = threading.Thread(target=run_meteora, daemon=True, name="Meteora-DLMM-Scanner")
        meteora_thread.start()
        logger.info("Meteora DLMM scanner started")
    else:
        logger.info("Meteora scanner disabled (set METEORA_ENABLED=true to enable)")

    # Keep main thread alive
    logger.info("All components launched. Entering main loop.")
    try:
        while True:
            time.sleep(30)
    except KeyboardInterrupt:
        logger.info("Shutting down launcher...")

if __name__ == "__main__":
    main()
