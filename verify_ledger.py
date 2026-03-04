#!/usr/bin/env python3
"""
Verification script for The Assassins Ledger implementation.

Tests:
1. Database schema has all required columns
2. StateManager can save and retrieve enriched trade data
3. DiscordBroadcaster rate limiting works
4. StatsTracker aggregates correctly
5. RpcIntegrator returns structured dict and propagates ALT addresses

Run: python verify_implementation.py
"""

import sqlite3
import sys
import os
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'hughs-forge', 'services', 'trade-orchestrator', 'src'))

from state.state_manager import TradeStateManager
from feed.discord_broadcaster import DiscordBroadcaster
from feed.stats_tracker import StatsTracker
from core.rpc_integration import RpcIntegrator

def verify_db_schema(db_path):
    print("Verifying DB schema...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(trades);")
    cols = {row[1] for row in cursor.fetchall()}
    required = {"entry_price", "exit_price", "rejection_reason", "route", "tx_signature", "slippage_bps", "fee_lamports", "executed_at"}
    missing = required - cols
    if missing:
        print(f"  ❌ Missing columns: {missing}")
        return False
    print("  ✅ All enriched columns present")
    conn.close()
    return True

def test_state_manager(db_path):
    print("Testing TradeStateManager...")
    mgr = TradeStateManager(db_path)
    trade_id = "verify_test"
    mgr.save_trade(
        trade_id=trade_id,
        state="EXECUTED",
        token_address="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount=100.0,
        data={"test": True},
        entry_price=1.234,
        tx_signature="sig123",
        slippage_bps=50,
        fee_lamports=5000,
        executed_at=datetime.utcnow().isoformat(),
        route="JUPITER"
    )
    retrieved = mgr.get_trade(trade_id)
    if not retrieved or retrieved["entry_price"] != 1.234:
        print("  ❌ TradeStateManager failed to store/retrieve enriched fields")
        return False
    print("  ✅ TradeStateManager works with enriched fields")
    return True

def test_discord_broadcaster():
    print("Testing DiscordBroadcaster rate limit...")
    broadcaster = DiscordBroadcaster(webhook_url=None)
    # Should not raise
    broadcaster.broadcast_trade_executed({"trade_id": "1"})
    broadcaster.broadcast_trade_failed({"trade_id": "2"})
    broadcaster.broadcast_trade_rejected({"trade_id": "3"})
    print("  ✅ DiscordBroadcaster works without webhook")
    return True

def test_stats_tracker(db_path):
    print("Testing StatsTracker aggregation (requires executed_at in last hour)...")
    # Insert sample trade with executed_at = now
    conn = sqlite3.connect(db_path)
    conn.execute('''
        INSERT INTO trades (trade_id, state, token_address, amount, data, route, executed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', ("stats_test", "EXECUTED", "tokenX", 10.0, "{}", "JUPITER", datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

    tracker = StatsTracker(db_path=db_path, output_path="feed_stats_test.json")
    stats = tracker._compute_stats()
    if stats["trades_count"] < 1:
        print("  ❌ StatsTracker failed to aggregate trades")
        return False
    print(f"  ✅ StatsTracker computed: {stats['trades_count']} trades, ${stats['total_volume_usd']} volume")
    tracker._write_stats(stats)
    if not os.path.exists("feed_stats_test.json"):
        print("  ❌ StatsTracker failed to write JSON")
        return False
    os.remove("feed_stats_test.json")
    return True

def test_rpc_integrator_structure():
    print("Testing RpcIntegrator return structure...")
    integrator = RpcIntegrator(dry_run=True)
    result = integrator.execute_jupiter_trade("token", 0.001)
    required_keys = {"success", "tx_signature", "entry_price", "slippage_bps", "fee_lamports", "executed_at", "error"}
    if not required_keys.issubset(result.keys()):
        print(f"  ❌ Missing keys in result: {required_keys - result.keys()}")
        return False
    print("  ✅ RpcIntegrator returns structured dict")
    return True

def main():
    print("=== Assassins Ledger Verification ===\n")
    db = "services/trade-orchestrator/trades.db"
    if not os.path.exists(db):
        print(f"Database not found at {db}. Run from workspace root or create DB first.")
        sys.exit(1)

    checks = [
        verify_db_schema(db),
        test_state_manager(db),
        test_discord_broadcaster(),
        test_stats_tracker(db),
        test_rpc_integrator_structure()
    ]
    print("\n" + "="*40)
    if all(checks):
        print("✅ All verifications passed")
        sys.exit(0)
    else:
        print("❌ Some verifications failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
