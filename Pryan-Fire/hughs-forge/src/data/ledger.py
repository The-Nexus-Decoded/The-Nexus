from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any, Dict, List


class LedgerDB:
    """Tiny SQLite trade ledger for dry-run accounting tests."""

    def __init__(self, db_path: str = "src/data/ledger.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self):
        return sqlite3.connect(self.db_path)

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action TEXT NOT NULL,
                    mint TEXT NOT NULL,
                    symbol TEXT,
                    amount_atoms INTEGER NOT NULL,
                    price_usd REAL NOT NULL,
                    total_usd REAL NOT NULL,
                    status TEXT DEFAULT 'SUCCESS',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

    def record_trade(self, trade: Dict[str, Any]) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO trades(action, mint, symbol, amount_atoms, price_usd, total_usd, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(trade["action"]).upper(),
                    trade["mint"],
                    trade.get("symbol"),
                    int(trade["amount_atoms"]),
                    float(trade["price_usd"]),
                    float(trade["total_usd"]),
                    trade.get("status", "SUCCESS"),
                ),
            )

    def get_active_positions(self) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM trades WHERE status = 'SUCCESS' ORDER BY id").fetchall()

        positions: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            mint = row["mint"]
            pos = positions.setdefault(
                mint,
                {"mint": mint, "symbol": row["symbol"] or mint[:6], "amount_atoms": 0, "cost_basis_usd": 0.0},
            )
            amount = int(row["amount_atoms"])
            total = float(row["total_usd"])
            if row["action"] == "BUY":
                pos["amount_atoms"] += amount
                pos["cost_basis_usd"] += total
            elif row["action"] == "SELL":
                if pos["amount_atoms"] > 0:
                    average_cost = pos["cost_basis_usd"] / pos["amount_atoms"]
                    pos["cost_basis_usd"] = max(0.0, pos["cost_basis_usd"] - (average_cost * amount))
                pos["amount_atoms"] -= amount

        active = []
        for pos in positions.values():
            if pos["amount_atoms"] <= 0:
                continue
            token_amount = pos["amount_atoms"] / 1_000_000_000
            pos["average_entry_usd"] = pos["cost_basis_usd"] / token_amount
            active.append(pos)
        return active
