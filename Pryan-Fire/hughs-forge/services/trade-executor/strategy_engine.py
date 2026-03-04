import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class StrategyEngine:
    def __init__(self, threshold_buy: float = -0.015, threshold_sell: float = 0.015):
        """Simple momentum/threshold mock strategy."""
        self.threshold_buy = threshold_buy
        self.threshold_sell = threshold_sell
        self.last_price = None

    def evaluate(self, current_price: float) -> Optional[Dict]:
        """Evaluates price action and emits a trade signal if conditions are met."""
        if self.last_price is None:
            self.last_price = current_price
            return None

        price_change = (current_price - self.last_price) / self.last_price
        
        signal = None
        if price_change <= self.threshold_buy:
            signal = {"action": "BUY", "amount": 10.0, "pair": "SOL/USDC", "reason": "MOMENTUM_DROP", "price_change": price_change}
        elif price_change >= self.threshold_sell:
            signal = {"action": "SELL", "amount": 10.0, "pair": "SOL/USDC", "reason": "MOMENTUM_SPIKE", "price_change": price_change}

        if signal:
            logger.info(f"Strategy Engine emitted signal: {signal}")
        
        self.last_price = current_price
        return signal
