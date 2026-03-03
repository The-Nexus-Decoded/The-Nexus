import os
import aiohttp
import asyncio
import logging
from datetime import datetime
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
                    return {"passed": False, "reason": f"API Error: {response.status}"}

                data = await response.json()
                pairs = data.get("pairs", [])

                if not pairs:
                    return {"passed": False, "reason": "No pairs found (Too early or low liquidity)"}

                # Analyze the primary pair (usually the one with highest liquidity)
                primary_pair = pairs[0]

                price_change = primary_pair.get("priceChange", {})

                metrics = {
                    "liquidity": float(primary_pair.get("liquidity", {}).get("usd", 0)),
                    "volume_5m": float(primary_pair.get("volume", {}).get("m5", 0)),
                    "volume_1h": float(primary_pair.get("volume", {}).get("h1", 0)),
                    "volume_24h": float(primary_pair.get("volume", {}).get("h24", 0)),
                    "buys_5m": int(primary_pair.get("txns", {}).get("m5", {}).get("buys", 0)),
                    "sells_5m": int(primary_pair.get("txns", {}).get("m5", {}).get("sells", 0)),
                    "buys_1h": int(primary_pair.get("txns", {}).get("h1", {}).get("buys", 0)),
                    "sells_1h": int(primary_pair.get("txns", {}).get("h1", {}).get("sells", 0)),
                    "has_boosts": primary_pair.get("boosts", {}).get("active", 0) > 0,
                    "fdv": float(primary_pair.get("fdv", 0)),
                    "price_usd": primary_pair.get("priceUsd", "0"),
                    "price_native": primary_pair.get("priceNative", "0"),
                    "price_change_5m": float(price_change.get("m5", 0) or 0),
                    "price_change_1h": float(price_change.get("h1", 0) or 0),
                    "pair_created_at": primary_pair.get("pairCreatedAt", None),
                    "dex_id": primary_pair.get("dexId", "unknown"),
                    "pair_address": primary_pair.get("pairAddress", ""),
                    "url": primary_pair.get("url", ""),
                }

                return self._apply_leash(metrics)

        except Exception as e:
            logger.error(f"DEX Screener fetch failed: {e}")
            return {"passed": False, "reason": f"Fetch error: {str(e)}"}

    def _apply_leash(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        The MomentumLeash (Phase 5a).
        Enforces minimum floors for trading quality within the Main Portfolio Engine.
        """
        reasons = []

        # 1. Liquidity Floor (MVP Standard)
        if metrics["liquidity"] < 10000:  # Raised for safer main-bag trading
            reasons.append(f"Liquidity too thin for portfolio entry (${metrics['liquidity']})")

        # 2. Buy/Sell Ratio (Anti-Wash Guard - Initial Version)
        total_tx = metrics["buys_5m"] + metrics["sells_5m"]
        if total_tx > 0:
            buy_ratio = metrics["buys_5m"] / total_tx
            if buy_ratio > 0.95 or buy_ratio < 0.05:
                reasons.append(f"Suspect volume distribution (Buy Ratio: {buy_ratio:.2f})")

        # 3. Market Cap/FDV Floor
        if metrics["fdv"] < 10000:
            reasons.append(f"Market Cap too low (${metrics['fdv']})")

        # 4. Min 5m Volume in SOL (Turbocharger #24)
        min_vol_5m_sol = float(os.getenv("LEASH_MIN_VOL_5M_SOL", "7"))
        try:
            price_native = float(metrics["price_native"])
            price_usd = float(metrics["price_usd"])
            if price_native > 0 and price_usd > 0:
                sol_price_usd = price_usd / price_native
                volume_5m_sol = metrics["volume_5m"] / sol_price_usd if sol_price_usd > 0 else 0
            else:
                sol_price_usd = float(os.getenv("SOL_PRICE_USD", "130"))
                volume_5m_sol = metrics["volume_5m"] / sol_price_usd
        except (ValueError, ZeroDivisionError):
            sol_price_usd = float(os.getenv("SOL_PRICE_USD", "130"))
            volume_5m_sol = metrics["volume_5m"] / sol_price_usd
        if volume_5m_sol < min_vol_5m_sol:
            reasons.append(f"5m volume too low ({volume_5m_sol:.1f} SOL < {min_vol_5m_sol} SOL)")

        # 5. Min 1h Buyers (Turbocharger #25)
        min_buyers_1h = int(os.getenv("LEASH_MIN_BUYERS_1H", "50"))
        if metrics["buys_1h"] < min_buyers_1h:
            reasons.append(f"1h buyers too low ({metrics['buys_1h']} < {min_buyers_1h})")

        # 6. Min Unique Buyers Per 5m, Scaling With Age (Turbocharger #17)
        min_buyers_per_5m = int(os.getenv("LEASH_MIN_BUYERS_PER_5M", "10"))
        if metrics.get("pair_created_at"):
            try:
                age_seconds = (datetime.utcnow() - datetime.utcfromtimestamp(metrics["pair_created_at"] / 1000)).total_seconds()
                age_minutes = max(age_seconds / 60, 1)
                periods = age_minutes / 5
                min_expected = int(min_buyers_per_5m * periods)
                actual_buyers = metrics["buys_1h"]
                if actual_buyers < min_expected:
                    reasons.append(f"Buyer rate too low ({actual_buyers} buys in {age_minutes:.0f}m, need {min_expected})")
            except Exception:
                pass  # Skip age-based check if timestamp parsing fails

        passed = len(reasons) == 0
        return {
            "passed": passed,
            "reasons": reasons,
            "metrics": metrics
        }

    async def close(self):
        if self.session:
            await self.session.close()
