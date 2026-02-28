import asyncio
from typing import Dict, Optional
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
import struct

# Pyth Network Program ID on Solana Mainnet (Current Price Feed Program)
# This program owns the legacy price accounts which are directly readable.
PYTH_PROGRAM_ID = Pubkey.from_string("FsJ9A4RwY9thuxSssW2HJEhaoeS6u2EdUZrtTksqcy7y")

# Legacy SOL/USD Price Account Address on Mainnet-Beta
# Source: https://pyth.network/developers/price-feed-ids#solana-mainnet-beta
SOL_USD_PRICE_ACCOUNT = "H6ARHf9V2sM7AZjct6TeoMubvLKVacyRrCNoS1i6ifUR"
USDC_USD_PRICE_ACCOUNT = "Gnt27zSbeU32LBsDW1vnJ8tEJz8czaySptatv6S6Rk4b"

class PythPricingClient:
    """
    Hugh's Eyes: Real-time USD pricing via Pyth Network.
    Supporting Issue #48: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/48
    
    This client reads legacy Pyth price accounts directly from the blockchain.
    """
    def __init__(self, rpc_url: str):
        self.client = AsyncClient(rpc_url)

    async def get_price(self, price_account_address: str) -> Optional[float]:
        """
        Fetches and decodes a legacy Pyth price account.
        """
        pubkey = Pubkey.from_string(price_account_address)
        res = await self.client.get_account_info(pubkey)
        
        if not res.value:
            print(f"[PYTH ERROR] Account not found for {price_account_address}")
            return None
            
        data = res.value.data
        
        # Pyth V2 Price Account Layout (Legacy):
        # - magic (4 bytes): 0xa1b2c3d4
        # - version (4 bytes)
        # - type (4 bytes)
        # - size (4 bytes)
        # - price_type (4 bytes)
        # - exponent (4 bytes) at offset 20
        # ...
        # - agg.price (8 bytes) at offset 208
        
        try:
            # Verify Magic Number
            magic = struct.unpack("<I", data[0:4])[0]
            if magic != 0xa1b2c3d4:
                print(f"[PYTH ERROR] Invalid magic number: {hex(magic)}")
                return None
                
            exponent = struct.unpack("<i", data[20:24])[0]
            price = struct.unpack("<q", data[208:216])[0]
            
            return price * (10 ** exponent)
        except Exception as e:
            print(f"[PYTH ERROR] Failed to decode price data from {price_account_address}: {e}")
            return None

    async def get_sol_price(self) -> float:
        price = await self.get_price(SOL_USD_PRICE_ACCOUNT)
        return price if price else 0.0

    async def get_usdc_price(self) -> float:
        price = await self.get_price(USDC_USD_PRICE_ACCOUNT)
        return price if price else 0.0

    async def close(self):
        await self.client.close()

if __name__ == "__main__":
    async def test_pyth():
        # Using a public RPC for simulation - in production, we use the homelab node
        pyth = PythPricingClient("https://api.mainnet-beta.solana.com")
        sol_price = await pyth.get_sol_price()
        print(f"[PYTH] Current SOL Price: ${sol_price:.2f}")
        usdc_price = await pyth.get_usdc_price()
        print(f"[PYTH] Current USDC Price: ${usdc_price:.2f}")
        await pyth.close()
    asyncio.run(test_pyth())
