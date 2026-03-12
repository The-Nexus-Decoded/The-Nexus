import asyncio
from src.executor.fee_manager import GasManager

async def test_gas():
    # Use public RPC for fee check
    rpc = "https://api.mainnet-beta.solana.com"
    manager = GasManager(rpc)
    
    print("[TEST] Fetching competitive priority fee...")
    # Optional: Pass USDC/SOL pool account to see specific congestion
    fee = await manager.get_competitive_fee()
    print(f"[TEST] 75th Percentile Fee: {fee} micro-lamports")
    
    instructions = manager.create_budget_instructions(cu_limit=300000, micro_lamports=fee)
    print(f"[TEST] Created instructions: {instructions}")

if __name__ == "__main__":
    asyncio.run(test_gas())
