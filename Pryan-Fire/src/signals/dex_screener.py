import logging
from typing import Dict, Any, Optional
from src.services.dex_screener import DexScreenerClient

logger = logging.getLogger("MomentumScanner")

class MomentumScanner:
    """
    The Mind of the Patryn Trader (Phase 5).
    Evaluates market momentum using live data from DEX Screener.
    """
    def __init__(self):
        self.client = DexScreenerClient()

    async def validate_momentum(self, mint: str) -> Dict[str, Any]:
        """
        Polls DEX Screener for the given mint to check for 'The Heartbeat'.
        """
        pair_data = await self.client.fetch_pair_data(mint)
        
        if not pair_data:
            return {
                "passed": False, 
                "momentum_signal": "NEGATIVE", 
                "reasons": ["No pair data found (Too early or low liquidity)"]
            }

        metrics = {
            "liquidity": float(pair_data.get("liquidity", {}).get("usd", 0)),
            "volume_24h": float(pair_data.get("volume", {}).get("h24", 0)),
            "price_change_5m": float(pair_data.get("priceChange", {}).get("m5", 0)),
            "price_change_1h": float(pair_data.get("priceChange", {}).get("h1", 0)),
            "price_change_6h": float(pair_data.get("priceChange", {}).get("h6", 0)),
            "price_change_24h": float(pair_data.get("priceChange", {}).get("h24", 0)),
            "fdv": float(pair_data.get("fdv", 0))
        }
        
        return self._apply_leash(metrics)

    def _apply_leash(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        The MomentumLeash (Phase 5a).
        Enforces minimum floors for trading quality.
        """
        reasons = []
        
        # 1. Liquidity Floor ($10k for MVP)
        if metrics["liquidity"] < 10000:
            reasons.append(f"Liquidity too thin (${metrics['liquidity']})")
            
        # 2. 24h Volume Floor ($5k)
        if metrics["volume_24h"] < 5000:
            reasons.append(f"24h Volume too low (${metrics['volume_24h']})")

        # 3. Market Cap/FDV Floor ($10k)
        if metrics["fdv"] < 10000:
            reasons.append(f"Market Cap too low (${metrics['fdv']})")

        # 4. Price Change Momentum (1-hour)
        # Thresholds: >5% is POSITIVE, <-5% is NEGATIVE (Block)
        momentum_score = 0
        if metrics["price_change_1h"] < -5:
            reasons.append(f"Significant 1-hour price drop ({metrics['price_change_1h']:.2f}%)")
            momentum_score -= 1
        elif metrics["price_change_1h"] > 5:
            momentum_score += 1

        # Determine overall momentum signal
        if len(reasons) > 0:
            momentum_signal = "NEGATIVE"
        elif momentum_score > 0:
            momentum_signal = "POSITIVE"
        else:
            momentum_signal = "NEUTRAL"
            
        return {
            "passed": momentum_signal != "NEGATIVE",
            "momentum_signal": momentum_signal,
            "reasons": reasons,
            "metrics": metrics
        }

    async def close(self):
        await self.client.close()
