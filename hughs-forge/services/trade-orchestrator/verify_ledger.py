#!/usr/bin/env python3
"""
Verification script for The Assassins Ledger implementation.
"""

import os
import sys
import json
import sqlite3
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add src to Python path
SRC_PATH = Path(__file__).parent / "src"
if str(SRC_PATH) not in sys.path:
    sys.path.insert(0, str(SRC_PATH))

def verify_migration():
    print("\n=== 1. Database Migration ===")
    migrator_path = Path(__file__).parent / "migrate_trades_schema.py"
    temp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
    db_path = temp_db.name
    temp_db.close()

    # Initialize with old schema
    conn = sqlite3.connect(db_path)
    conn.execute('''
        CREATE TABLE trades (
            trade_id TEXT PRIMARY KEY,
            state TEXT NOT NULL,
            token_address TEXT NOT NULL,
            amount REAL NOT NULL,
            data JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Insert a sample with data containing execution details
    conn.execute('''
        INSERT INTO trades (trade_id, state, token_address, amount, data)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        "test_trade_1",
        "EXECUTED",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        100.0,
        json.dumps({
            "entry_price": 1.234,
            "tx_signature": "signature123",
            "slippage_bps": 25,
            "fee_lamports": 5000,
            "executed_at": "2025-01-01T00:00:00Z",
            "route": "JUPITER"
        })
    ))
    conn.commit()
    conn.close()

    # Run migration
    import subprocess
    result = subprocess.run([sys.executable, str(migrator_path), db_path], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(f"Migration failed: {result.stderr}")
        return False

    # Verify columns exist and backfill worked
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(trades);")
    cols = {row[1] for row in cursor.fetchall()}
    expected = {"entry_price", "exit_price", "rejection_reason", "route", "tx_signature", "slippage_bps", "fee_lamports", "executed_at"}
    if not expected.issubset(cols):
        print(f"Missing columns after migration: {expected - cols}")
        return False

    # Check backfilled values
    cursor.execute("SELECT entry_price, route, tx_signature FROM trades WHERE trade_id = ?", ("test_trade_1",))
    row = cursor.fetchone()
    if row[0] != 1.234 or row[1] != "JUPITER" or row[2] != "signature123":
        print(f"Backfill data mismatch: {row}")
        return False
    conn.close()
    os.unlink(db_path)

    print("✓ Migration adds columns and backfills JSON data correctly")
    return True

def verify_orchestrator_integration():
    print("\n=== 2. Orchestrator Integration ===")
    try:
        from core.orchestrator import TradeOrchestrator
        print("✓ Orchestrator module imports successfully")
    except Exception as e:
        print(f"Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    temp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
    db_path = temp_db.name
    temp_db.close()

    try:
        orchestrator = TradeOrchestrator(db_path=db_path, dry_run=True)
        orchestrator.discord_broadcaster = MagicMock()

        signal = {
            "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "amount": 50.0,
            "trade_id": "verify_001"
        }
        result_state = orchestrator.process_signal(signal)
        if result_state not in ["EXECUTED", "FAILED"]:
            print(f"Unexpected state: {result_state}")
            return False

        trade = orchestrator.state_manager.get_trade("verify_001")
        if not trade:
            print("Trade record not found")
            return False
        if trade.get("route") is None:
            print("Route not captured")
            return False

        print("✓ Orchestrator captures enriched trade data")
        return True
    finally:
        os.unlink(db_path)

def verify_discord_rate_limit():
    print("\n=== 3. Discord Rate Limit ===")
    os.environ["DISCORD_TRADE_ALERTS_WEBHOOK"] = "https://discord.com/api/webhooks/test"
    from feed.discord_broadcaster import DiscordBroadcaster

    broadcaster = DiscordBroadcaster()
    calls = []
    def mock_post(url, json=None, timeout=None):
        calls.append(json)
        class Resp:
            status_code = 204
        return Resp()

    with patch('requests.post', side_effect=mock_post):
        # Send 6 messages
        for i in range(6):
            broadcaster.broadcast_trade_executed({"trade_id": f"t{i}"})
        # Only first 5 should have been sent
        if len(calls) != 5:
            print(f"Expected 5 sent, got {len(calls)}")
            return False
        print("✓ Rate limit blocks excess messages")
        return True

def verify_stats_tracker():
    print("\n=== 4. Stats Tracker ===")
    from feed.stats_tracker import StatsTracker
    from datetime import datetime, timedelta

    temp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
    db_path = temp_db.name
    temp_db.close()

    temp_stats = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
    stats_path = temp_stats.name
    temp_stats.close()

    try:
        conn = sqlite3.connect(db_path)
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
        now = datetime.utcnow().isoformat()
        for i in range(3):
            conn.execute('''
                INSERT INTO trades (trade_id, state, token_address, amount, route, fee_lamports, slippage_bps, executed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                f"t{i}",
                "EXECUTED" if i < 2 else "FAILED",
                f"token{i}",
                100.0 * (i+1),
                "JUPITER" if i % 2 == 0 else "METEORA",
                1000 * (i+1),
                10 * (i+1),
                now
            ))
        conn.commit()
        conn.close()

        tracker = StatsTracker(db_path=db_path, output_path=stats_path, interval_seconds=3600)
        stats = tracker._compute_stats()

        expected_keys = ["timestamp", "period_hours", "trades_count", "total_volume_usd",
                         "avg_trade_size_usd", "success_rate", "total_fees_lamports",
                         "route_distribution", "top_tokens"]
        if not all(k in stats for k in expected_keys):
            print(f"Missing keys in stats: {set(expected_keys) - set(stats.keys())}")
            return False

        if stats["trades_count"] != 3:
            print(f" trades_count should be 3, got {stats['trades_count']}")
            return False

        print(f"✓ Stats tracker computes {stats['trades_count']} trades, success_rate={stats['success_rate']:.2f}")
        return True
    finally:
        os.unlink(db_path)
        os.unlink(stats_path)

def main():
    print("The Assassins Ledger - Verification")
    print("=" * 40)
    results = [
        ("Migration", verify_migration()),
        ("Orchestrator", verify_orchestrator_integration()),
        ("Discord Rate Limit", verify_discord_rate_limit()),
        ("Stats Tracker", verify_stats_tracker())
    ]

    print("\n=== Summary ===")
    for name, ok in results:
        status = "PASS" if ok else "FAIL"
        print(f"{name}: {status}")

    if all(ok for _, ok in results):
        print("\nAll checks PASSED. Ready for PR.")
        return 0
    else:
        print("\nSome checks FAILED. Review above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
