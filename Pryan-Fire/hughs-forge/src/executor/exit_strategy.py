from __future__ import annotations

from typing import Dict, List


class ExitStrategist:
    def __init__(self, ledger, tp_percent: float = 20.0, sl_percent: float = -10.0):
        self.ledger = ledger
        self.tp_percent = tp_percent
        self.sl_percent = sl_percent

    async def check_all_positions(self, prices: Dict[str, float]) -> List[Dict[str, object]]:
        signals = []
        for position in self.ledger.get_active_positions():
            mint = position["mint"]
            if mint not in prices:
                continue
            entry = float(position["average_entry_usd"])
            current = float(prices[mint])
            pnl_pct = ((current - entry) / entry) * 100 if entry else 0.0
            action = "HOLD"
            if pnl_pct >= self.tp_percent:
                action = "TAKE_PROFIT"
            elif pnl_pct <= self.sl_percent:
                action = "STOP_LOSS"
            signals.append({"mint": mint, "action": action, "pnl_percent": pnl_pct, "price_usd": current})
        return signals
