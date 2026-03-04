import sqlite3
import json
import logging
from typing import Dict, Any, Optional

class TradeStateManager:
    def __init__(self, db_path: str = "trades.db"):
        self.db_path = db_path
        self.logger = logging.getLogger("TradeStateManager")
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS trades (
                    trade_id TEXT PRIMARY KEY,
                    state TEXT NOT NULL,
                    token_address TEXT NOT NULL,
                    amount REAL NOT NULL,
                    data JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()

    def save_trade(self, trade_id: str, state: str, token_address: str, amount: float, data: Dict[str, Any]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO trades (trade_id, state, token_address, amount, data)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(trade_id) DO UPDATE SET
                    state=excluded.state,
                    data=excluded.data,
                    updated_at=CURRENT_TIMESTAMP
            ''', (trade_id, state, token_address, amount, json.dumps(data)))
            conn.commit()
            
    def get_trade(self, trade_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT trade_id, state, token_address, amount, data, created_at, updated_at FROM trades WHERE trade_id = ?', (trade_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "trade_id": row[0],
                    "state": row[1],
                    "token_address": row[2],
                    "amount": row[3],
                    "data": json.loads(row[4]),
                    "created_at": row[5],
                    "updated_at": row[6]
                }
            return None
