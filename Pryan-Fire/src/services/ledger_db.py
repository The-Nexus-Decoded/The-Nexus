import sqlite3
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("StateRecovery")

class LedgerDB:
    """
    The Memory of the Patryn Trader.
    Ensures state persistence for active positions across restarts.
    """
    def __init__(self, db_path: str = "data/ledger.db"):
        self.db_path = db_path
        self._initialize_db()

    def _initialize_db(self):
        """Creates the necessary runes (tables) in the database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS active_positions (
                    mint TEXT PRIMARY KEY,
                    symbol TEXT,
                    entry_price_sol REAL,
                    amount_tokens REAL,
                    entry_timestamp INTEGER,
                    status TEXT DEFAULT 'OPEN'
                )
            """)
            conn.commit()

    def log_entry(self, mint: str, symbol: str, price: float, amount: float):
        """Records a new position acquisition."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO active_positions 
                (mint, symbol, entry_price_sol, amount_tokens, entry_timestamp)
                VALUES (?, ?, ?, ?, strftime('%s', 'now'))
            """, (mint, symbol, price, amount))
            conn.commit()
            logger.info(f"Position Logged: {symbol} ({mint})")

    def log_exit(self, mint: str):
        """Marks a position as closed."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE active_positions SET status = 'CLOSED' WHERE mint = ?", (mint,))
            conn.commit()
            logger.info(f"Position Closed: {mint}")

    def get_active_positions(self) -> List[Dict[str, Any]]:
        """Retrieves all open positions for state recovery."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM active_positions WHERE status = 'OPEN'")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
