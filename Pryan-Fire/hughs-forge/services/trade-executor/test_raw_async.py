import asyncio
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient
from solana.rpc.types import MemcmpOpts

METEORA_DLMM_PROGRAM_ID = Pubkey.from_string("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")
BOT_WALLET_PUBKEY = Pubkey.from_string("74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x")
RPC_ENDPOINT = "https://api.mainnet-beta.solana.com" 

async def test():
    async with AsyncClient(RPC_ENDPOINT) as client:
        print(f"DEBUG: Using raw AsyncClient.get_program_accounts...")
        try:
            memcmp_filter = MemcmpOpts(offset=8, bytes=str(BOT_WALLET_PUBKEY))
            print("Calling get_program_accounts...")
            response = await client.get_program_accounts(
                METEORA_DLMM_PROGRAM_ID,
                filters=[memcmp_filter]
            )
            print(f"Success! Found {len(response.value)} accounts.")
        except Exception as e:
            print(f"FAILED: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
