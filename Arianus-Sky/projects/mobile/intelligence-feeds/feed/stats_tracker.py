"""
Hourly Statistics Tracker for The Assassins Ledger.

Runs in a background thread, aggregates trades from the last hour,
and writes to feed_stats.json.
"""

import os
import time
import threading
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import sqlite3

logger = logging.getLogger("stats_tracker")

class StatsTracker:
    def __init__(self, db_path: str, output_path: str = "feed_stats.json", interval_seconds: int = 3600):
        self.db_path = db_path
        self.output_path = output_path
        self.interval = interval_seconds
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._last_stats: Optional[Dict[str, Any]] = None

    def start(self):
        self._thread.start()
        logger.info("StatsTracker started")

    def stop(self):
        self._stop_event.set()
        self._thread.join(timeout=5)
        logger.info("StatsTracker stopped")

    def _run(self):
        # Run once at startup after a short delay
        time.sleep(10)
        while not self._stop_event.wait(self.interval):
            try:
                stats = self._compute_stats()
                self._write_stats(stats)
                self._last_stats = stats
                logger.info(f"Updated stats: {stats['timestamp']}")
            except Exception as e:
                logger.error(f"Stats computation failed: {e}", exc_info=True)

    def _compute_stats(self) -> Dict[str, Any]:
        """Aggregate trade stats from the last hour."""
        now = datetime.utcnow()
        one_hour_ago = now - timedelta(hours=1)

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            # Fetch trades from last hour with state = EXECUTED
            cursor.execute('''
                SELECT state, token_address, amount, route, fee_lamports, slippage_bps, executed_at
                FROM trades
                WHERE executed_at IS NOT NULL
                  AND executed_at >= ?
            ''', (one_hour_ago.isoformat(),))
            rows = cursor.fetchall()

        trades = [dict(row) for row in rows]
        total_trades = len(trades)
        total_volume = sum(t["amount"] for t in trades if t["amount"])
        avg_trade_size = total_volume / total_trades if total_trades > 0 else 0
        success_count = sum(1 for t in trades if t["state"] == "EXECUTED")
        success_rate = (success_count / total_trades) if total_trades > 0 else 0.0
        total_fees = sum(t["fee_lamports"] for t in trades if t["fee_lamports"])

        # Route distribution
        route_dist: Dict[str, int] = {}
        for t in trades:
            r = t.get("route") or "UNKNOWN"
            route_dist[r] = route_dist.get(r, 0) + 1

        # Top tokens (by count)
        token_counts: Dict[str, int] = {}
        for t in trades:
            mint = t.get("token_address") or "unknown"
            token_counts[mint] = token_counts.get(mint, 0) + 1
        top_tokens = sorted(token_counts.items(), key=lambda kv: kv[1], reverse=True)[:5]
        top_tokens_list = [{"mint": mint, "count": count} for mint, count in top_tokens]

        return {
            "timestamp": now.isoformat() + "Z",
            "period_hours": 1,
            "trades_count": total_trades,
            "total_volume_usd": round(total_volume, 2),
            "avg_trade_size_usd": round(avg_trade_size, 2),
            "success_rate": round(success_rate, 4),
            "total_fees_lamports": total_fees,
            "route_distribution": route_dist,
            "top_tokens": top_tokens_list
        }

    def _write_stats(self, stats: Dict[str, Any]):
        """Write stats to JSON file."""
        try:
            with open(self.output_path, 'w') as f:
                json.dump(stats, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write stats file: {e}")

    def get_current_stats(self) -> Optional[Dict[str, Any]]:
        """Return the most recently computed stats."""
        return self._last_stats
