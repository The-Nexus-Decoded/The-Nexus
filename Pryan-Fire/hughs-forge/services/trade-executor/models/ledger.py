import sqlite3
import json
from datetime import datetime
from pathlib import Path

class TradeLedger:
    def __init__(self, db_path="trade_ledger.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    mint_address TEXT NOT NULL,
                    entry_price REAL NOT NULL,
                    amount REAL NOT NULL,
                    status TEXT DEFAULT "OPEN",
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            """)
            conn.commit()

    def record_entry(self, symbol, mint, price, amount, metadata=None):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO trades (symbol, mint_address, entry_price, amount, metadata)
                VALUES (?, ?, ?, ?, ?)
            """, (symbol, mint, price, amount, json.dumps(metadata) if metadata else None))
            conn.commit()

    def get_open_positions(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM trades WHERE status = \"OPEN\"")
            return [dict(row) for row in cursor.fetchall()]

    def close_position(self, trade_id, exit_price):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE trades 
                SET status = 'CLOSED', metadata = json_set(COALESCE(metadata, '{}'), '$.exit_price', ?)
                WHERE id = ?
            """, (exit_price, trade_id))
            conn.commit()
