import sqlite3
import os
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional

class LedgerDB:
    """
    The local memory of the Patryn Trader. 
    Handles persistence of positions, trade history, and PnL data.
    """
    def __init__(self, db_path: str = "src/data/ledger.db"):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        # Using check_same_thread=False because the state machine is async
        return sqlite3.connect(self.db_path, check_same_thread=False)

    def _init_db(self):
        """Initializes the SQLite tables if they don't exist."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Positions Table: Current holdings
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS positions (
                    mint TEXT PRIMARY KEY,
                    symbol TEXT,
                    amount_atoms INTEGER NOT NULL,
                    avg_entry_price REAL NOT NULL,
                    last_updated DATETIME
                )
            """)

            # 2. Trade History: Audit log of all actions
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS trade_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME,
                    action TEXT, -- BUY / SELL
                    mint TEXT,
                    symbol TEXT,
                    amount_atoms INTEGER,
                    price_usd REAL,
                    total_usd REAL,
                    signature TEXT,
                    status TEXT -- SUCCESS / FAILED / SIMULATED
                )
            """)
            conn.commit()

    def record_trade(self, trade_data: Dict[str, Any]):
        """
        Logs a trade to the history and updates the current position.
        """
        timestamp = datetime.utcnow().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Insert into history
            cursor.execute("""
                INSERT INTO trade_history 
                (timestamp, action, mint, symbol, amount_atoms, price_usd, total_usd, signature, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                timestamp,
                trade_data['action'],
                trade_data['mint'],
                trade_data.get('symbol', 'UNKNOWN'),
                trade_data['amount_atoms'],
                trade_data['price_usd'],
                trade_data['total_usd'],
                trade_data.get('signature', 'GHOST_TX'),
                trade_data.get('status', 'SIMULATED')
            ))

            # Update Positions
            if trade_data['action'] == 'BUY':
                self._update_position_on_buy(cursor, trade_data, timestamp)
            elif trade_data['action'] == 'SELL':
                self._update_position_on_sell(cursor, trade_data, timestamp)
            
            conn.commit()

    def _update_position_on_buy(self, cursor, trade_data, timestamp):
        # Simple average entry price calculation
        cursor.execute("SELECT amount_atoms, avg_entry_price FROM positions WHERE mint = ?", (trade_data['mint'],))
        row = cursor.fetchone()
        
        if row:
            current_amount, current_avg = row
            new_amount = current_amount + trade_data['amount_atoms']
            # Weighted average
            new_avg = ((current_amount * current_avg) + (trade_data['amount_atoms'] * trade_data['price_usd'])) / new_amount
            cursor.execute("""
                UPDATE positions SET amount_atoms = ?, avg_entry_price = ?, last_updated = ?
                WHERE mint = ?
            """, (new_amount, new_avg, timestamp, trade_data['mint']))
        else:
            cursor.execute("""
                INSERT INTO positions (mint, symbol, amount_atoms, avg_entry_price, last_updated)
                VALUES (?, ?, ?, ?, ?)
            """, (trade_data['mint'], trade_data.get('symbol', 'UNKNOWN'), trade_data['amount_atoms'], trade_data['price_usd'], timestamp))

    def _update_position_on_sell(self, cursor, trade_data, timestamp):
        cursor.execute("SELECT amount_atoms FROM positions WHERE mint = ?", (trade_data['mint'],))
        row = cursor.fetchone()
        if row:
            current_amount = row[0]
            new_amount = max(0, current_amount - trade_data['amount_atoms'])
            if new_amount == 0:
                cursor.execute("DELETE FROM positions WHERE mint = ?", (trade_data['mint'],))
            else:
                cursor.execute("UPDATE positions SET amount_atoms = ?, last_updated = ? WHERE mint = ?", 
                               (new_amount, timestamp, trade_data['mint']))

    def get_active_positions(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM positions")
            return [dict(row) for row in cursor.fetchall()]
