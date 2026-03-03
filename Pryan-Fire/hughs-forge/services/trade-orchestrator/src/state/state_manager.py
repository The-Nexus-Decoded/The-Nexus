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
            # Base schema - migration will add enriched columns
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

    def save_trade(self, trade_id: str, state: str, token_address: str, amount: float, data: Dict[str, Any],
                   entry_price: Optional[float] = None,
                   exit_price: Optional[float] = None,
                   rejection_reason: Optional[str] = None,
                   route: Optional[str] = None,
                   tx_signature: Optional[str] = None,
                   slippage_bps: Optional[int] = None,
                   fee_lamports: Optional[int] = None,
                   executed_at: Optional[str] = None):
        """Save trade with optional enriched fields."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Build dynamic INSERT/UPDATE based on provided enriched fields
            columns = ["trade_id", "state", "token_address", "amount", "data"]
            values = [trade_id, state, token_address, amount, json.dumps(data)]

            # Optional enriched columns
            if entry_price is not None:
                columns.append("entry_price")
                values.append(entry_price)
            if exit_price is not None:
                columns.append("exit_price")
                values.append(exit_price)
            if rejection_reason is not None:
                columns.append("rejection_reason")
                values.append(rejection_reason)
            if route is not None:
                columns.append("route")
                values.append(route)
            if tx_signature is not None:
                columns.append("tx_signature")
                values.append(tx_signature)
            if slippage_bps is not None:
                columns.append("slippage_bps")
                values.append(slippage_bps)
            if fee_lamports is not None:
                columns.append("fee_lamports")
                values.append(fee_lamports)
            if executed_at is not None:
                columns.append("executed_at")
                values.append(executed_at)

            placeholders = ", ".join(["?"] * len(values))
            column_names = ", ".join(columns)

            # For UPDATE, set all columns except trade_id
            set_clause = ", ".join([f"{col} = excluded.{col}" for col in columns if col != "trade_id"])

            query = f"""
                INSERT INTO trades ({column_names})
                VALUES ({placeholders})
                ON CONFLICT(trade_id) DO UPDATE SET
                    {set_clause},
                    updated_at=CURRENT_TIMESTAMP
            """
            cursor.execute(query, values)
            conn.commit()
            
    def get_trade(self, trade_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Select all columns including enriched ones
            cursor.execute('''
                SELECT trade_id, state, token_address, amount, data, created_at, updated_at,
                       entry_price, exit_price, rejection_reason, route, tx_signature, slippage_bps, fee_lamports, executed_at
                FROM trades WHERE trade_id = ?
            ''', (trade_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "trade_id": row[0],
                    "state": row[1],
                    "token_address": row[2],
                    "amount": row[3],
                    "data": json.loads(row[4]),
                    "created_at": row[5],
                    "updated_at": row[6],
                    "entry_price": row[7],
                    "exit_price": row[8],
                    "rejection_reason": row[9],
                    "route": row[10],
                    "tx_signature": row[11],
                    "slippage_bps": row[12],
                    "fee_lamports": row[13],
                    "executed_at": row[14]
                }
            return None
