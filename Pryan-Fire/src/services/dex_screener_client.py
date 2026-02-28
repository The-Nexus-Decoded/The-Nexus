import aiohttp
import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("DexScreenerClient")

class DexScreenerClient:
    """
    Client for interacting with the DEX Screener API.
    Handles network requests and session management.
    """
    def __init__(self):
        self.base_url = "https://api.dexscreener.com/latest/dex/pairs/solana/"
        self.session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def fetch_pair_data(self, mint: str) -> Dict[str, Any]:
        """Fetches data for a given mint from DEX Screener."""
        session = await self._get_session()
        url = f"{self.base_url}{mint}"
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    return {"success": False, "error": f"API Error: {response.status}", "data": None}
                
                data = await response.json()
                return {"success": True, "error": None, "data": data}

        except Exception as e:
            logger.error(f"DEX Screener fetch failed: {e}")
            return {"success": False, "error": f"Fetch error: {str(e)}", "data": None}

    async def close(self):
        """Gracefully close the aiohttp session."""
        if self.session:
            await self.session.close()
