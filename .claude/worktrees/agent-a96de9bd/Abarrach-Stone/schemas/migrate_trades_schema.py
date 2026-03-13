#!/usr/bin/env python3
"""
Migration: Add Assassins Ledger columns to trades table.

New fields:
- entry_price REAL
- exit_price REAL
- rejection_reason TEXT
- route TEXT
- tx_signature TEXT
- slippage_bps INTEGER
- fee_lamports INTEGER
- executed_at TIMESTAMP

Backfill: If existing trades have execution data in the JSON `data` field, extract and populate new columns.

Usage:
    python migrate_trades_schema.py /path/to/trades.db
"""

import sqlite3
import json
import sys
from datetime import datetime
from pathlib import Path

def migrate(db_path: str):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Check current schema
    cursor.execute("PRAGMA table_info(trades);")
    existing_columns = {row[1] for row in cursor.fetchall()}
    print(f"Existing columns: {existing_columns}")

    # 2. Add new columns (if not present)
    new_columns = [
        ("entry_price", "REAL"),
        ("exit_price", "REAL"),
        ("rejection_reason", "TEXT"),
        ("route", "TEXT"),
        ("tx_signature", "TEXT"),
        ("slippage_bps", "INTEGER"),
        ("fee_lamports", "INTEGER"),
        ("executed_at", "TIMESTAMP")
    ]

    for col_name, col_type in new_columns:
        if col_name not in existing_columns:
            print(f"Adding column: {col_name} {col_type}")
            cursor.execute(f"ALTER TABLE trades ADD COLUMN {col_name} {col_type};")
        else:
            print(f"Column {col_name} already exists, skipping")

    conn.commit()

    # 3. Backfill from JSON data for existing trades
    print("\nBackfilling data from JSON `data` field...")
    cursor.execute("SELECT trade_id, data FROM trades;")
    rows = cursor.fetchall()
    updated = 0

    for trade_id, data_json in rows:
        try:
            data = json.loads(data_json) if data_json else {}
            updates = {}
            # Extract fields from data if present
            if "entry_price" in data and data["entry_price"] is not None:
                updates["entry_price"] = data["entry_price"]
            if "exit_price" in data and data["exit_price"] is not None:
                updates["exit_price"] = data["exit_price"]
            if "rejection_reason" in data and data["rejection_reason"] is not None:
                updates["rejection_reason"] = data["rejection_reason"]
            if "route" in data and data["route"] is not None:
                updates["route"] = data["route"]
            if "tx_signature" in data and data["tx_signature"] is not None:
                updates["tx_signature"] = data["tx_signature"]
            if "slippage_bps" in data and data["slippage_bps"] is not None:
                updates["slippage_bps"] = data["slippage_bps"]
            if "fee_lamports" in data and data["fee_lamports"] is not None:
                updates["fee_lamports"] = data["fee_lamports"]
            if "executed_at" in data and data["executed_at"] is not None:
                updates["executed_at"] = data["executed_at"]

            if updates:
                set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
                values = list(updates.values())
                values.append(trade_id)
                cursor.execute(f"UPDATE trades SET {set_clause} WHERE trade_id = ?", values)
                updated += 1
        except Exception as e:
            print(f"Warning: failed to parse data for trade {trade_id}: {e}")

    conn.commit()
    conn.close()

    print(f"\nMigration complete. Added columns. Backfilled {updated} trades.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python migrate_trades_schema.py /path/to/trades.db")
        sys.exit(1)
    db_path = sys.argv[1]
    if not Path(db_path).exists():
        print(f"Error: database not found at {db_path}")
        sys.exit(1)
    migrate(db_path)
