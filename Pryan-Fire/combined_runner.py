#!/usr/bin/env python3
"""
Combined Scanner + Orchestrator for Patryn Trader

Runs both the Pump.fun scanner and TradeOrchestrator in one process.
Signals from scanner are enqueued directly to orchestrator's event loop.
Includes Discord feed broadcasting and wallet balance monitoring.
"""

import asyncio
import threading
import time
import os
import sys
import argparse
import json
import logging
from pathlib import Path

# ============ PATH CONFIGURATION ============
WORKSPACE = "/data/openclaw/workspace/Pryan-Fire"
# Adjust these if the directory layout differs on the target host
ORCHESTRATOR_SRC = f"{WORKSPACE}/hughs-forge/services/trade-orchestrator/src"
RISK_MANAGER_SRC = f"{WORKSPACE}/hughs-forge/risk-manager/src"

# Add to path if not already there
for p in [ORCHESTRATOR_SRC, RISK_MANAGER_SRC, WORKSPACE]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ============ LOGGING ============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("CombinedRunner")

# ============ GLOBAL FOR CALLBACK ============
g_event_loop = None
g_momentum_scanner = None

# ============ RUNNER CLASS ============
class CombinedRunner:
    def __init__(self, dry_run: bool = False, rpc_url: str = None, health_port: int = 8002, meteora: bool = False):
        self.dry_run = dry_run
        self.rpc_url = rpc_url or "https://api.devnet.solana.com"
        self.health_port = health_port
        self.enable_meteora = meteora or os.getenv("METEORA_ENABLED", "").lower() == "true"
        self.orchestrator = None
        self.event_loop = None
        self.momentum_scanner = None
        self.pump_scanner = None
        self.meteora_scanner = None
        self.broadcaster = None
        self.stats_tracker = None
        self.pump_thread = None
        self.meteora_thread = None
        self.health_thread = None
        self.loop_thread = None
        self.balance_thread = None

    def start(self):
        global g_event_loop, g_momentum_scanner

        # Set environment for RPC
        os.environ["SOLANA_RPC_URL"] = self.rpc_url
        if self.dry_run:
            os.environ["DRY_RUN"] = "true"
            logger.info("Running in DRY-RUN mode (no real transactions)")
        logger.info(f"Using Solana RPC: {self.rpc_url}")

        # Import components (deferred to after path setup)
        from core.orchestrator import TradeOrchestrator
        from core.event_loop import EventLoop
        from telemetry.logger import setup_telemetry_logger
        from health_server import start_orchestrator_health_server
        from feed.discord_broadcaster import DiscordBroadcaster
        from feed.stats_tracker import StatsTracker

        # Initialize Telemetry
        logger_telemetry = setup_telemetry_logger(log_file="logs/orchestrator.jsonl")
        logger_telemetry.info("CombinedRunner starting", extra={"version": "0.2.0"})

        # Initialize Assassins Ledger components
        self.broadcaster = DiscordBroadcaster()
        if self.broadcaster.webhook_url:
            logger.info("Discord broadcaster initialized (webhook configured)")
        else:
            logger.warning("Discord broadcaster has NO webhook URL -- broadcasts will be skipped")

        self.stats_tracker = StatsTracker(db_path="trades.db", output_path="feed_stats.json")
        self.stats_tracker.start()
        logger.info("Stats tracker started")

        # Initialize Orchestrator
        self.orchestrator = TradeOrchestrator(db_path="trades.db", dry_run=self.dry_run)
        # Inject broadcaster into orchestrator so it can broadcast trade events
        self.orchestrator.discord_broadcaster = self.broadcaster
        logger.info("Broadcaster injected into orchestrator")

        self.event_loop = EventLoop(self.orchestrator)
        g_event_loop = self.event_loop

        # Start orchestrator event loop in daemon thread
        self.loop_thread = threading.Thread(
            target=self.event_loop.run,
            daemon=True,
            name="EventLoop"
        )
        self.loop_thread.start()
        logger.info("Orchestrator EventLoop started")

        # Start health server in daemon thread
        self.health_thread = threading.Thread(
            target=start_orchestrator_health_server,
            args=(self.health_port,),
            daemon=True,
            name="HealthServer"
        )
        self.health_thread.start()
        logger.info(f"Health server started on port {self.health_port}")

        # Initialize Scanner components
        from src.signals.dex_screener import MomentumScanner
        from src.signals.pump_fun_stream import PumpFunSignal
        from src.signals.meteora_dlmm_scanner import MeteoraDLMMScanner

        self.momentum_scanner = MomentumScanner()
        g_momentum_scanner = self.momentum_scanner

        logger.info("Scanner components initialized")

        # Define Pump.fun token callback
        async def on_token_discovered_local(mint: str, metadata: dict):
            """Callback for Pump.fun scanner: validates momentum then enqueues to orchestrator."""
            symbol = metadata.get('symbol', 'UNKNOWN')
            logger.info(f"Scanner discovered token: {symbol} ({mint})")
            try:
                intel = await self.momentum_scanner.validate_momentum(mint)
                if not intel.get("passed"):
                    reason = intel.get("reason", "Unknown")
                    reasons_list = intel.get("reasons", [])
                    if reasons_list:
                        reason = " | ".join(reasons_list)
                    logger.warning(f"Token {symbol} failed momentum check: {reason}")
                    # Only broadcast rejections that have actual metrics (skip 'No pairs found' noise)
                    metrics = intel.get("metrics", {})
                    if metrics:
                        self.broadcaster.broadcast_scanner_rejected({
                            "mint": mint,
                            "symbol": symbol,
                            "reason": reason,
                            "reasons": intel.get("reasons", []),
                            "metrics": metrics,
                        })
                    return
                logger.info(f"Token {symbol} passed momentum validation")
            except Exception as e:
                logger.error(f"Momentum validation error for {mint}: {e}")
                self.broadcaster.broadcast_scanner_rejected({
                    "mint": mint,
                    "symbol": symbol,
                    "reason": f"Validation error: {str(e)[:200]}",
                })
                return

            # Enqueue signal to orchestrator
            amount = 10.0  # Fixed $10 for testing
            signal = {
                "token_address": mint,
                "amount": amount,
                "trade_id": f"scan-{mint[:8]}"
            }
            try:
                self.event_loop.enqueue_signal(signal)
                logger.info(f"Signal enqueued for {symbol} (${amount})")
            except Exception as e:
                logger.error(f"Failed to enqueue signal: {e}")

        # Scanner start/stop functions
        def start_pump_scanner():
            self.pump_scanner = PumpFunSignal(on_token_received=on_token_discovered_local)
            def run_pump():
                try:
                    asyncio.run(self.pump_scanner.run())
                except Exception as e:
                    logger.error(f"Pump.fun scanner thread error: {e}", exc_info=True)
            self.pump_thread = threading.Thread(target=run_pump, daemon=True, name="PumpFun-Scanner")
            self.pump_thread.start()
            logger.info("Pump.fun scanner started")

        def stop_pump_scanner():
            if self.pump_scanner:
                self.pump_scanner.stop()
                logger.info("Pump.fun scanner stopped")

        def start_meteora_scanner():
            # Derive devnet from RPC URL to ensure scanner matches network
            devnet = "devnet" in self.rpc_url.lower() or "testnet" in self.rpc_url.lower()
            self.meteora_scanner = MeteoraDLMMScanner(orchestrator=self.orchestrator, devnet=devnet)
            def run_meteora():
                try:
                    asyncio.run(self.meteora_scanner.run())
                except Exception as e:
                    logger.error(f"Meteora scanner thread error: {e}", exc_info=True)
            self.meteora_thread = threading.Thread(target=run_meteora, daemon=True, name="Meteora-DLMM-Scanner")
            self.meteora_thread.start()
            logger.info("Meteora DLMM scanner started")

        def stop_meteora_scanner():
            if self.meteora_scanner:
                self.meteora_scanner.stop()
                logger.info("Meteora DLMM scanner stopped")

        # Start scanners
        start_pump_scanner()
        if self.enable_meteora:
            start_meteora_scanner()
        else:
            logger.info("Meteora scanner disabled (use --meteora to enable)")

        # Start balance monitor (only in live mode)
        if not self.dry_run:
            self._start_balance_monitor()

        # Graceful shutdown
        try:
            logger.info("All components running. Press Ctrl+C to stop.")
            while True:
                time.sleep(30)
        except KeyboardInterrupt:
            logger.info("Shutting down...")
            stop_pump_scanner()
            if self.enable_meteora:
                stop_meteora_scanner()
            self.stats_tracker.stop()
            self.orchestrator.stop()
            logger.info("Shutdown complete")

    def _check_balance(self):
        """Check SOL balance of trading wallet. Returns balance in SOL or None on error."""
        try:
            rpc = self.orchestrator.rpc_integrator
            if not rpc.client or not hasattr(rpc, 'wallet'):
                return None
            result = rpc.client.get_balance(rpc.wallet.pubkey())
            return result.value / 1e9
        except Exception as e:
            logger.error(f"Balance check failed: {e}")
            return None

    def _start_balance_monitor(self):
        """Start periodic balance monitoring thread."""
        low_threshold = float(os.getenv("BALANCE_ALERT_LOW_SOL", "0.1"))
        high_threshold = float(os.getenv("BALANCE_ALERT_HIGH_SOL", "20.0"))
        check_interval = int(os.getenv("BALANCE_CHECK_INTERVAL_SECONDS", "300"))  # 5 min

        def monitor():
            last_alert_type = None  # Prevent repeated alerts
            # Wait for orchestrator to fully initialize
            time.sleep(30)
            logger.info(f"Balance monitor active (low={low_threshold} SOL, high={high_threshold} SOL, interval={check_interval}s)")

            while True:
                sol = self._check_balance()
                if sol is not None:
                    logger.info(f"Wallet balance: {sol:.4f} SOL")
                    if sol < low_threshold and last_alert_type != "low":
                        self.broadcaster.broadcast_balance_alert(sol, "low", low_threshold)
                        last_alert_type = "low"
                        logger.warning(f"LOW BALANCE ALERT: {sol:.4f} SOL")
                    elif sol > high_threshold and last_alert_type != "high":
                        self.broadcaster.broadcast_balance_alert(sol, "high", high_threshold)
                        last_alert_type = "high"
                        logger.info(f"HIGH BALANCE ALERT: {sol:.4f} SOL")
                    elif low_threshold <= sol <= high_threshold:
                        last_alert_type = None  # Reset when back in normal range

                time.sleep(check_interval)

        self.balance_thread = threading.Thread(target=monitor, daemon=True, name="BalanceMonitor")
        self.balance_thread.start()
        logger.info("Balance monitor thread started")


def main():
    parser = argparse.ArgumentParser(description="Combined Pump.fun Scanner + TradeOrchestrator")
    parser.add_argument('--dry-run', action='store_true', help='Run without real transactions')
    parser.add_argument('--rpc', default='https://api.devnet.solana.com', help='Solana RPC URL')
    parser.add_argument('--health-port', type=int, default=8002, help='Health check port')
    parser.add_argument('--meteora', action='store_true', help='Enable Meteora DLMM scanner')
    args = parser.parse_args()

    runner = CombinedRunner(dry_run=args.dry_run, rpc_url=args.rpc, health_port=args.health_port, meteora=args.meteora)
    runner.start()


if __name__ == "__main__":
    main()
