import asyncio
from typing import Dict, Optional
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
import struct

# Pyth Network Program ID on Solana Mainnet
PYTH_PROGRAM_ID = Pubkey.from_string("FsJ9A4RwY9thuxSssW2HJEhaoeS6u2EdUZrtTksqcy7y")

# Core Price Feeds (Issue #48)
# These are the standard Pyth SOL/USD and USDC/USD feed accounts on Mainnet
SOL_USD_FEED = Pubkey.from_string("H6ARHf9V2sM7AZjct6TeoMubvLKVacyRrCNoS1i6ifUR")
USDC_USD_FEED = Pubkey.from_string("Gnt27zSbeU32LBsDW1vnJ8tEJz8czaySptatv6S6Rk4b")

class PythPricingClient:
    """
    Hugh's Eyes: Real-time USD pricing via Pyth Network.
    Supporting Issue #48: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/48
    """
    def __init__(self, rpc_url: str):
        self.client = AsyncClient(rpc_url)

    async def get_price(self, price_feed_address: str) -> Optional[float]:
        """
        Fetches and decodes a Pyth V2 price feed.
        """
        feed_pubkey = Pubkey.from_string(price_feed_address)
        res = await self.client.get_account_info(feed_pubkey)
        
        if not res.value:
            return None
            
        data = res.value.data
        # Pyth Price Account structure (Legacy/Push):
        # magic (4), version (4), type (4), size (4), price_type (4), exponent (4)
        # exponent is at offset 20 (i32)
        # aggregate price info starts at offset 208
        # price (i64) is at offset 208
        
        exponent = struct.unpack("<i", data[20:24])[0]
        price = struct.unpack("<q", data[208:216])[0]
        
        return price * (10 ** exponent)

    async def get_sol_price(self) -> float:
        """Fetch current SOL/USD price."""
        price = await self.get_price(str(SOL_USD_FEED))
        return price if price else 0.0

    async def get_usdc_price(self) -> float:
        """Fetch current USDC/USD price (usually ~$1.00)."""
        price = await self.get_price(str(USDC_USD_FEED))
        return price if price else 1.0

    async def close(self):
        await self.client.close()

if __name__ == "__main__":
    async def test_pyth():
        # Using a public RPC for simulation/test
        pyth = PythPricingClient("https://api.mainnet-beta.solana.com")
        try:
            price = await pyth.get_sol_price()
            if price > 0:
                print(f"[PYTH] Current SOL Price: ${price:.2f}")
            else:
                # Fallback if RPC is ratelimited or account not found in this environment
                print("[PYTH WARNING] Could not fetch live price. Check RPC or Feed ID.")
        finally:
            await pyth.close()
    asyncio.run(test_pyth())
