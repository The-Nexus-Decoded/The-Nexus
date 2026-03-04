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
from collections import OrderedDict

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
_callback_count = 0
_callback_drop_count = 0

# ============ RUNNER CLASS ============
class CombinedRunner:
    # Retry queue config
    RETRY_INTERVAL_S = int(os.getenv("SNIPER_RETRY_INTERVAL_S", "30"))
    RETRY_MAX_AGE_S = int(os.getenv("SNIPER_RETRY_MAX_AGE_S", "900"))  # 15 minutes
    SNIPE_AMOUNT_SOL = float(os.getenv("SNIPE_AMOUNT_SOL", "0.01"))

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
        self.retry_thread = None
        # Retry queue: mint -> {symbol, metadata, queued_at, retries}
        self._retry_queue = OrderedDict()
        self._retry_lock = threading.Lock()

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
        from src.signals.rugcheck import RugcheckScanner

        self.momentum_scanner = MomentumScanner()
        g_momentum_scanner = self.momentum_scanner
        self.rugcheck_scanner = RugcheckScanner()
        if self.rugcheck_scanner.enabled:
            logger.info("Rugcheck scanner enabled (max_score=%d, min_liq=$%s)",
                        self.rugcheck_scanner.max_score, self.rugcheck_scanner.min_liquidity_usd)
        else:
            logger.info("Rugcheck scanner DISABLED (SCAN_RUGCHECK_ENABLED=false)")

        logger.info("Scanner components initialized")

        # Define Pump.fun token callback
        async def on_token_discovered_local(mint: str, metadata: dict):
            """Callback for Pump.fun scanner: validates momentum then enqueues to orchestrator."""
            global _callback_count, _callback_drop_count
            _callback_count += 1
            symbol = metadata.get('symbol', 'UNKNOWN')

            try:
                intel = await self.momentum_scanner.validate_momentum(mint)
            except Exception as e:
                logger.warning(f"Validation error for {symbol}: {e}")
                return

            if not intel.get("passed"):
                metrics = intel.get("metrics", {})

                # No DEX data yet — queue for retry instead of dropping
                if not metrics:
                    self._enqueue_retry(mint, metadata)
                    return

                reasons_list = intel.get("reasons", [])
                reason = " | ".join(reasons_list) if reasons_list else intel.get("reason", "Unknown")
                logger.info(f"Token {symbol} rejected: {reason}")
                self.broadcaster.broadcast_scanner_rejected({
                    "mint": mint,
                    "symbol": symbol,
                    "reason": reason,
                    "reasons": reasons_list,
                    "metrics": metrics,
                })
                return

            # Token has data AND passed momentum — run full pipeline
            await self._process_validated_token(mint, symbol, intel)

        async def process_retry_token(mint: str, entry: dict, scanner=None):
            """Re-check a queued token. Called from retry loop."""
            symbol = entry["symbol"]
            active_scanner = scanner or self.momentum_scanner
            try:
                intel = await active_scanner.validate_momentum(mint)
            except Exception as e:
                logger.warning(f"Retry validation error for {symbol}: {e}")
                return False  # keep in queue

            metrics = intel.get("metrics", {})
            if not metrics:
                return False  # still no data, keep in queue

            # Data appeared — remove from queue and process
            if not intel.get("passed"):
                reasons_list = intel.get("reasons", [])
                reason = " | ".join(reasons_list) if reasons_list else intel.get("reason", "Unknown")
                logger.info(f"Token {symbol} rejected on retry: {reason}")
                self.broadcaster.broadcast_scanner_rejected({
                    "mint": mint,
                    "symbol": symbol,
                    "reason": reason,
                    "reasons": reasons_list,
                    "metrics": metrics,
                })
                return True  # processed, remove from queue

            await self._process_validated_token(mint, symbol, intel)
            return True  # processed, remove from queue

        # Store callback ref for retry loop
        self._process_retry_token = process_retry_token

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

        # Start retry queue processor
        self._start_retry_loop()

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

    async def _process_validated_token(self, mint: str, symbol: str, intel: dict):
        """Run rugcheck + enqueue buy for a token that passed momentum validation."""
        # Rugcheck security filter
        try:
            dex_liq = intel.get("metrics", {}).get("liquidity", 0)
            safety = await self.rugcheck_scanner.check_token(mint, dex_liquidity=dex_liq)
            if not safety["safe"]:
                logger.info(f"Token {symbol} failed rugcheck: {safety['reason']}")
                self.broadcaster.broadcast_scanner_rejected({
                    "mint": mint,
                    "symbol": symbol,
                    "reason": f"Rugcheck: {safety['reason']}",
                    "reasons": [f"Rugcheck: {safety['reason']}"],
                    "metrics": intel.get("metrics", {}),
                })
                return
            if not safety.get("skipped"):
                logger.info(f"Token {symbol} passed rugcheck (score={safety['score']}, lp={safety['lp_locked_pct']:.1f}%)")
        except Exception as e:
            logger.warning(f"Rugcheck error for {mint}: {e} — allowing trade (fail-open)")

        # Enqueue signal to orchestrator
        amount = self.SNIPE_AMOUNT_SOL
        signal = {
            "token_address": mint,
            "amount": amount,
            "trade_id": f"snipe-{mint[:8]}"
        }
        try:
            self.event_loop.enqueue_signal(signal)
            logger.info(f"Signal enqueued for {symbol} ({amount} SOL)")
        except Exception as e:
            logger.error(f"Failed to enqueue signal for {symbol}: {e}")

    def _enqueue_retry(self, mint: str, metadata: dict):
        """Add a token to the retry queue for periodic re-checking."""
        with self._retry_lock:
            if mint in self._retry_queue:
                return  # already queued
            self._retry_queue[mint] = {
                "symbol": metadata.get("symbol", "UNKNOWN"),
                "metadata": metadata,
                "queued_at": time.time(),
                "retries": 0,
            }
            qsize = len(self._retry_queue)
        symbol = metadata.get("symbol", "UNKNOWN")
        logger.info(f"Token {symbol} queued for retry (queue={qsize})")
        if self.broadcaster:
            self.broadcaster.broadcast_queued_for_retry({
                "mint": mint,
                "symbol": symbol,
                "queue_size": qsize,
            })

    def _start_retry_loop(self):
        """Background thread that re-checks queued tokens every RETRY_INTERVAL_S seconds."""
        def retry_loop():
            # Dedicated event loop + scanner for this thread.
            # self.momentum_scanner's session is created in the pump scanner's loop;
            # reusing it here (a different loop) causes aiohttp timeout errors.
            from src.signals.dex_screener import MomentumScanner
            retry_scanner = MomentumScanner()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            logger.info(f"Retry queue active (interval={self.RETRY_INTERVAL_S}s, max_age={self.RETRY_MAX_AGE_S}s)")
            try:
                while True:
                    time.sleep(self.RETRY_INTERVAL_S)
                    with self._retry_lock:
                        if not self._retry_queue:
                            continue
                        snapshot = list(self._retry_queue.items())

                    now = time.time()
                    expired = []
                    to_process = []

                    for mint, entry in snapshot:
                        age = now - entry["queued_at"]
                        if age > self.RETRY_MAX_AGE_S:
                            expired.append(mint)
                        else:
                            to_process.append((mint, entry))

                    # Drop expired tokens
                    if expired:
                        with self._retry_lock:
                            for mint in expired:
                                self._retry_queue.pop(mint, None)
                        logger.info(f"Retry queue: dropped {len(expired)} expired tokens")

                    if not to_process:
                        continue

                    processed = loop.run_until_complete(self._run_retries(to_process, retry_scanner))

                    with self._retry_lock:
                        for mint in processed:
                            self._retry_queue.pop(mint, None)
                        remaining = len(self._retry_queue)

                    if processed or remaining:
                        logger.info(f"Retry queue: processed={len(processed)}, remaining={remaining}")
            finally:
                loop.run_until_complete(retry_scanner.close())
                loop.close()

        self.retry_thread = threading.Thread(target=retry_loop, daemon=True, name="RetryQueue")
        self.retry_thread.start()
        logger.info("Retry queue thread started")

    async def _run_retries(self, tokens, scanner=None):
        """Process a batch of retry tokens. Returns list of mints to remove from queue."""
        mints = []
        coros = []
        for mint, entry in tokens:
            entry["retries"] += 1
            mints.append(mint)
            coros.append(self._safe_retry(mint, entry, scanner=scanner))
        results = await asyncio.gather(*coros, return_exceptions=True)
        processed = []
        for mint, result in zip(mints, results):
            if isinstance(result, Exception):
                logger.warning(f"Retry task error for {mint[:8]}: {result}")
            elif result:
                processed.append(mint)
        return processed

    async def _safe_retry(self, mint: str, entry: dict, scanner=None) -> bool:
        try:
            return await self._process_retry_token(mint, entry, scanner=scanner)
        except Exception as e:
            logger.warning(f"Retry error for {entry['symbol']}: {e}")
            return False

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
    parser.add_argument('--rpc', default=os.getenv('SOLANA_RPC_URL', 'https://api.devnet.solana.com'), help='Solana RPC URL')
    parser.add_argument('--health-port', type=int, default=8002, help='Health check port')
    parser.add_argument('--meteora', action='store_true', help='Enable Meteora DLMM scanner')
    args = parser.parse_args()

    runner = CombinedRunner(dry_run=args.dry_run, rpc_url=args.rpc, health_port=args.health_port, meteora=args.meteora)
    runner.start()


if __name__ == "__main__":
    main()
