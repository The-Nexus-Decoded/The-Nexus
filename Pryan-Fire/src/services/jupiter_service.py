import aiohttp
import asyncio
import os
from typing import Dict, Any, Optional
from decimal import Decimal

class JupiterService:
    """
    Isolated Jupiter Service Wrapper.
    Uses Jupiter V6 API for routing to avoid dependency conflicts.
    """
    # Try public failover first, fallback to standard
    ENDPOINTS = [
        "https://quote-api.jup.ag/v6",
        "https://api.jup.ag/swap/v6"
    ]

    def __init__(self, timeout: int = 10, api_key: Optional[str] = None):
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.api_key = api_key or os.getenv("JUPITER_API_KEY")

    async def get_quote(self, input_mint: str, output_mint: str, amount: int, slippage_bps: int = 50) -> Optional[Dict[str, Any]]:
        """
        Fetches the best swap route from Jupiter.
        Tries multiple endpoints to bypass transient Cloudflare/401 issues.
        """
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "slippageBps": slippage_bps,
            "onlyDirectRoutes": "false"
        }
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "OpenClaw-Haplo/1.0"
        }
        
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
            headers["x-api-key"] = self.api_key

        async with aiohttp.ClientSession(timeout=self.timeout) as session:
            for endpoint in self.ENDPOINTS:
                url = f"{endpoint}/quote"
                try:
                    print(f"[*] Fetching quote from: {url}")
                    async with session.get(url, params=params, headers=headers) as response:
                        if response.status == 200:
                            return await response.json()
                        else:
                            error_text = await response.text()
                            print(f"[JUPITER ERROR] Endpoint {url} returned {response.status}: {error_text}")
                except Exception as e:
                    print(f"[JUPITER EXCEPTION] {url}: {e}")
            
        return None

    def calculate_usd_value(self, quote: Dict[str, Any], price_of_output: Decimal) -> Decimal:
        """
        Helper to estimate trade value in USD for the Guard threshold check.
        """
        out_amount = Decimal(quote.get("outAmount", "0"))
        # This assumes we have an external price feed or are using a stablecoin pair
        # For MVP, we'll likely route to/from USDC to get clean USD valuations.
        return out_amount * price_of_output
