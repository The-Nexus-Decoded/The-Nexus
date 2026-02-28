import aiohttp
import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("MomentumScanner")

class MomentumScanner:
    """
    The Mind of the Patryn Trader (Phase 5).
    Queries DEX Screener to validate momentum, volume, and paid boosts.
    """
    def __init__(self):
        self.base_url = "https://api.dexscreener.com/latest/dex/pairs/solana/"
        self.session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def validate_momentum(self, mint: str) -> Dict[str, Any]:
        """
        Polls DEX Screener for the given mint to check for 'The Heartbeat'.
        """
        session = await self._get_session()
        url = f"{self.base_url}{mint}"
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    return {"passed": False, "momentum_signal": "NEGATIVE", "reasons": [f"API Error: {response.status}"]}
                
                data = await response.json()
                pairs = data.get("pairs", [])
                
                if not pairs:
                    return {"passed": False, "momentum_signal": "NEGATIVE", "reasons": ["No pairs found (Too early or low liquidity)"]}
                
                # Analyze the primary pair (usually the one with highest liquidity)
                primary_pair = pairs[0]
                
                metrics = {
                    "liquidity": float(primary_pair.get("liquidity", {}).get("usd", 0)),
                    "volume_24h": float(primary_pair.get("volume", {}).get("h24", 0)),
                    "price_change_5m": float(primary_pair.get("priceChange", {}).get("m5", 0)),
                    "price_change_1h": float(primary_pair.get("priceChange", {}).get("h1", 0)),
                    "price_change_6h": float(primary_pair.get("priceChange", {}).get("h6", 0)),
                    "price_change_24h": float(primary_pair.get("priceChange", {}).get("h24", 0)),
                    "fdv": float(primary_pair.get("fdv", 0))
                }
                
                return self._apply_leash(metrics)

        except Exception as e:
            logger.error(f"DEX Screener fetch failed: {e}")
            return {"passed": False, "momentum_signal": "NEGATIVE", "reasons": [f"Fetch error: {str(e)}"]}

    def _apply_leash(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        The MomentumLeash (Phase 5a).
        Enforces minimum floors for trading quality within the Main Portfolio Engine.
        """
        reasons = []
        
        # 1. Liquidity Floor (MVP Standard)
        if metrics["liquidity"] < 10000:  # Raised for safer main-bag trading
            reasons.append(f"Liquidity too thin for portfolio entry (${metrics['liquidity']})")
            
        # 2. 24h Volume Floor
        if metrics["volume_24h"] < 5000: # Minimum 24h volume for consideration
            reasons.append(f"24h Volume too low (${metrics['volume_24h']})")

        # 3. Market Cap/FDV Floor
        if metrics["fdv"] < 10000:
            reasons.append(f"Market Cap too low (${metrics['fdv']})")

        # 4. Price Change Momentum (1-hour)
        momentum_score = 0
        if metrics["price_change_1h"] < -5: # Significant 1-hour drop
            reasons.append(f"Significant 1-hour price drop ({metrics['price_change_1h']:.2f}%)")
            momentum_score -= 1
        elif metrics["price_change_1h"] > 5: # Significant 1-hour gain
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
        if self.session:
            await self.session.close()
