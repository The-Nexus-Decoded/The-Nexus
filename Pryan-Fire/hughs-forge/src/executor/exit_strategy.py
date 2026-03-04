import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from src.data.ledger import LedgerDB

class ExitStrategist:
    """
    Monitors open positions and executes automatic sell signals 
    based on Take-Profit (TP) and Stop-Loss (SL) thresholds.
    """
    def __init__(self, ledger: LedgerDB, tp_percent: float = 20.0, sl_percent: float = -10.0):
        self.ledger = ledger
        self.tp_percent = tp_percent
        self.sl_percent = sl_percent

    async def check_all_positions(self, current_prices: Dict[str, float]) -> List[Dict[str, Any]]:
        """
        Compares ledger positions against current market prices.
        Returns a list of signal triggers.
        """
        positions = self.ledger.get_active_positions()
        signals = []

        for pos in positions:
            mint = pos['mint']
            if mint not in current_prices:
                continue

            current_price = current_prices[mint]
            avg_entry = pos['avg_entry_price']
            
            # Calculate % change
            change = ((current_price - avg_entry) / avg_entry) * 100
            
            trigger = None
            if change >= self.tp_percent:
                trigger = "TAKE_PROFIT"
            elif change <= self.sl_percent:
                trigger = "STOP_LOSS"

            if trigger:
                signals.append({
                    "trigger": trigger,
                    "mint": mint,
                    "symbol": pos.get('symbol', 'UNKNOWN'),
                    "amount_atoms": pos['amount_atoms'],
                    "entry_price": avg_entry,
                    "current_price": current_price,
                    "pnl_percent": change
                })
        
        return signals

    async def exit_monitor_loop(self, price_fetcher_func, interval_sec: int = 60):
        """
        Heartbeat loop that periodically checks for exit conditions.
        Price_fetcher_func must return a map of {mint: price_usd}
        """
        print(f"[EXIT] Starting exit monitor (TP: {self.tp_percent}%, SL: {self.sl_percent}%)")
        while True:
            try:
                # Fetch current market state
                prices = await price_fetcher_func()
                # Check for triggers
                signals = await self.check_all_positions(prices)
                
                for signal in signals:
                    print(f"[REAPER] Signal Triggered: {signal['trigger']} for {signal['symbol']} ({signal['pnl_percent']:.2f}%)")
                    # TODO: Dispatch to execution state machine
                
                await asyncio.sleep(interval_sec)
            except Exception as e:
                print(f"[EXIT ERROR] Loop failed: {e}")
                await asyncio.sleep(interval_sec)
