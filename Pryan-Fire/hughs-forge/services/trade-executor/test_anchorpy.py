import asyncio
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient
from solana.rpc.types import MemcmpOpts
from anchorpy import Program, Provider, Wallet, Idl
import json

METEORA_DLMM_PROGRAM_ID = Pubkey.from_string("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")
BOT_WALLET_PUBKEY = Pubkey.from_string("74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x")
RPC_ENDPOINT = "https://api.mainnet-beta.solana.com" 

METEORA_IDL_DICT = {
    "version": "0.1.0",
    "name": "dlmm",
    "instructions": [],
    "accounts": [
        {
            "name": "Position",
            "type": {
                "kind": "struct",
                "fields": [
                    {"name": "owner", "type": "publicKey"},
                    {"name": "pool", "type": "publicKey"},
                    {"name": "lowerBinId", "type": "i64"},
                    {"name": "upperBinId", "type": "i64"},
                    {"name": "liquidity", "type": "u64"},
                    {"name": "feeOwner", "type": "u64"},
                    {"name": "feeProtocol", "type": "u64"},
                    {"name": "lastUpdatedAt", "type": "i64"},
                    {"name": "feeGrowthInsideX", "type": "u128"},
                    {"name": "feeGrowthInsideY", "type": "u128"}
                ],
            },
        }
    ],
}
METEORA_IDL = Idl.from_json(json.dumps(METEORA_IDL_DICT))

async def test():
    async with AsyncClient(RPC_ENDPOINT) as client:
        memcmp_filter = MemcmpOpts(offset=8, bytes=str(BOT_WALLET_PUBKEY))
        print(f"DEBUG: Fetching raw accounts from RPC...")
        response = await client.get_program_accounts(
            METEORA_DLMM_PROGRAM_ID,
            filters=[memcmp_filter]
        )
        if not response.value:
            print("No accounts found.")
            return
        print(f"Found {len(response.value)} accounts. Decoding now...")
        provider = Provider(client, Wallet.dummy())
        program = Program(METEORA_IDL, METEORA_DLMM_PROGRAM_ID, provider)
        for account_info in response.value:
            decoded = program.coder.accounts.decode(account_info.account.data)
            print(f"Position: {account_info.pubkey}")
            print(f"  Liquidity: {decoded.liquidity}")

if __name__ == "__main__":
    asyncio.run(test())
