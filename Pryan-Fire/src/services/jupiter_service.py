import aiohttp
import os
from typing import Dict, Any, Optional


class JupiterService:
    """
    Isolated Jupiter Ultra wrapper.

    Live/executable swaps use Ultra /order transactions only. The old
    quote-api/v6 quote -> swap flow is intentionally not a fallback here.
    """

    DEFAULT_ENDPOINTS = [
        "https://api.jup.ag/ultra/v1",
        "https://lite-api.jup.ag/ultra/v1",
    ]

    def __init__(self, timeout: int = 10, api_key: Optional[str] = None, endpoint: Optional[str] = None):
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.api_key = api_key or os.getenv("JUPITER_API_KEY")
        configured_endpoint = endpoint or os.getenv("JUPITER_ULTRA_API_BASE")
        self.endpoints = []
        if configured_endpoint:
            self.endpoints.append(configured_endpoint.rstrip("/"))
        for ultra_endpoint in self.DEFAULT_ENDPOINTS:
            if ultra_endpoint not in self.endpoints:
                self.endpoints.append(ultra_endpoint)

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/json",
            "User-Agent": "OpenClaw-Haplo/1.0",
        }
        if self.api_key:
            headers["x-api-key"] = self.api_key
        return headers

    async def _get_order(self, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with aiohttp.ClientSession(timeout=self.timeout) as session:
            for endpoint in self.endpoints:
                url = f"{endpoint}/order"
                try:
                    print(f"[*] Fetching Jupiter Ultra order from: {url}")
                    async with session.get(url, params=params, headers=self._headers()) as response:
                        if response.status == 200:
                            return await response.json()
                        error_text = await response.text()
                        print(f"[JUPITER ERROR] Ultra order {url} returned {response.status}: {error_text}")
                except Exception as e:
                    print(f"[JUPITER EXCEPTION] {url}: {e}")
        return None

    async def get_order(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        taker: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Fetch a Jupiter Ultra order preview, including transaction when taker is provided."""
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
        }
        if taker:
            params["taker"] = taker
        return await self._get_order(params)

    async def get_quote(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 50,
    ) -> Optional[Dict[str, Any]]:
        """Compatibility wrapper: Ultra /order without taker is the quote view."""
        _ = slippage_bps  # Ultra /order does not accept legacy slippageBps.
        return await self.get_order(input_mint, output_mint, amount)

    async def get_swap_transaction(self, quote: Dict[str, Any], user_public_key: str) -> Optional[str]:
        """
        Return the unsigned base64 transaction from Jupiter Ultra /order.

        If the supplied quote was fetched without a taker, fetch a taker-bound
        order using the same mints/amount. This replaces the old /swap endpoint.
        """
        transaction = quote.get("transaction")
        if transaction:
            return transaction

        input_mint = quote.get("inputMint")
        output_mint = quote.get("outputMint")
        amount = quote.get("inAmount") or quote.get("amount")
        if not (input_mint and output_mint and amount and user_public_key):
            return None

        taker_order = await self.get_order(input_mint, output_mint, int(amount), taker=user_public_key)
        if not taker_order:
            return None
        return taker_order.get("transaction")
