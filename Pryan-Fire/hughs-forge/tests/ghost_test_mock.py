import asyncio
from decimal import Decimal
from src.executor.state_machine import TradeStateMachine, ExecutorState
from src.executor.kill_switch import KILL_SWITCH

class MockJupiterService:
    async def get_quote(self, input_mint, output_mint, amount, slippage_bps=50):
        # Mocking a successful quote for 0.1 SOL -> ~15 USDC
        return {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "inAmount": str(amount),
            "outAmount": "15000000", # 15 USDC (6 decimals)
            "otherAmountThreshold": "14900000",
            "swapMode": "ExactIn",
            "slippageBps": slippage_bps,
            "platformFee": None,
            "priceImpactPct": "0.01"
        }

async def ghost_run_mock():
    print("--- INITIATING MOCKED GHOST EXECUTION TEST ---")
    
    executor = TradeStateMachine()
    # Inject Mock Service to bypass transient API issues
    executor.jupiter = MockJupiterService()
    
    # 1. Test Small Opportunity (Within $250)
    print("\n[TEST 1] Small Opportunity (0.1 SOL -> $15)")
    small_op = {
        "input_mint": "So11111111111111111111111111111111111111112",
        "output_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "amount_atoms": 100000000, 
        "description": "Small Trade Test"
    }
    await executor.process_opportunity(small_op)

    # 2. Test Large Opportunity (Exceeds $250)
    print("\n[TEST 2] Large Opportunity (10 SOL -> $1500)")
    large_op = {
        "input_mint": "So11111111111111111111111111111111111111112",
        "output_mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "amount_atoms": 10000000000, # 10 SOL
        "description": "Large Trade Test"
    }
    # Update mock for large amount
    executor.jupiter.get_quote = lambda i, o, a: asyncio.Future()
    f = asyncio.Future()
    f.set_result({"outAmount": "1500000000"}) # $1500
    executor.jupiter.get_quote = lambda i, o, a: f
    
    await executor.process_opportunity(large_op)
    
    print("\n--- MOCKED GHOST TEST COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(ghost_run_mock())
