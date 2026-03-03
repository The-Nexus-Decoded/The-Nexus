"""
Unit tests for stats_tracker aggregation logic.
"""

import unittest
import json
import tempfile
import os
from datetime import datetime, timedelta
from feed.stats_tracker import StatsTracker
import sqlite3

class TestStatsTracker(unittest.TestCase):
    def setUp(self):
        # Create a temporary database with sample trades
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        self.db_path = self.temp_db.name
        self.temp_db.close()
        self._init_db()

        # Create temp stats output file
        self.temp_stats = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        self.stats_path = self.temp_stats.name
        self.temp_stats.close()

        # Insert sample trades within last hour
        self._insert_trade(state="EXECUTED", token="ABC", amount=100.0, route="JUPITER", fee=5000, slippage=50, executed_at=datetime.utcnow().isoformat())
        self._insert_trade(state="EXECUTED", token="XYZ", amount=200.0, route="METEORA", fee=8000, slippage=25, executed_at=datetime.utcnow().isoformat())
        self._insert_trade(state="FAILED", token="ABC", amount=50.0, route="JUPITER", fee=None, slippage=None, executed_at=datetime.utcnow().isoformat())

    def tearDown(self):
        os.unlink(self.db_path)
        os.unlink(self.stats_path)

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE trades (
                    trade_id TEXT PRIMARY KEY,
                    state TEXT NOT NULL,
                    token_address TEXT NOT NULL,
                    amount REAL NOT NULL,
                    data JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    entry_price REAL,
                    exit_price REAL,
                    rejection_reason TEXT,
                    route TEXT,
                    tx_signature TEXT,
                    slippage_bps INTEGER,
                    fee_lamports INTEGER,
                    executed_at TIMESTAMP
                )
            ''')
            conn.commit()

    def _insert_trade(self, state, token, amount, route, fee, slippage, executed_at):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO trades (trade_id, state, token_address, amount, data, route, fee_lamports, slippage_bps, executed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                f"trade_{hash(token)}",
                state,
                token,
                amount,
                json.dumps({}),
                route,
                fee,
                slippage,
                executed_at
            ))
            conn.commit()

    def test_compute_stats(self):
        tracker = StatsTracker(db_path=self.db_path, output_path=self.stats_path, interval_seconds=3600)
        stats = tracker._compute_stats()

        # Verify counts
        self.assertEqual(stats["trades_count"], 3)
        self.assertEqual(stats["total_volume_usd"], 350.0)  # 100+200+50
        self.assertEqual(stats["avg_trade_size_usd"], round(350.0/3, 2))
        # success_rate = 2/3
        expected_success_rate = 2/3
        self.assertAlmostEqual(stats["success_rate"], expected_success_rate, places=4)

        # total_fees_lamports = 5000 + 8000 = 13000
        self.assertEqual(stats["total_fees_lamports"], 13000)

        # route distribution
        self.assertEqual(stats["route_distribution"]["JUPITER"], 2)
        self.assertEqual(stats["route_distribution"]["METEORA"], 1)

        # top tokens: ABC (2), XYZ (1)
        top_mints = {t["mint"]: t["count"] for t in stats["top_tokens"]}
        self.assertEqual(top_mints["ABC"], 2)
        self.assertEqual(top_mints["XYZ"], 1)

if __name__ == "__main__":
    unittest.main()
