import aiohttp
import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("DexScreenerClient")

class DexScreenerClient:
    """
    The Eyes of the Patryn.
    Fetches real-time market data from DEX Screener.
    """
    def __init__(self):
        self.base_url = "https://api.dexscreener.com/latest/dex/pairs/solana/"
        self.session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def fetch_pair_data(self, mint: str) -> Optional[Dict[str, Any]]:
        """
        Fetches the primary pair data for a given mint address.
        """
        session = await self._get_session()
        url = f"{self.base_url}{mint}"
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    logger.error(f"DEX Screener API Error: {response.status}")
                    return None
                
                data = await response.json()
                pairs = data.get("pairs", [])
                
                if not pairs:
                    logger.warning(f"No pairs found for mint {mint}")
                    return None
                
                # Primary pair is usually the highest liquidity one
                return pairs[0]

        except Exception as e:
            logger.error(f"DEX Screener fetch failed: {e}")
            return None

    async def close(self):
        if self.session:
            await self.session.close()
