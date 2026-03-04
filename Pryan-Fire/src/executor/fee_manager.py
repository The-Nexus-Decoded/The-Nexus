from typing import Dict, Any, Optional
from solana.rpc.async_api import AsyncClient
from solders.instruction import Instruction
from solders.compute_budget import set_compute_unit_limit, set_compute_unit_price
from solders.transaction import VersionedTransaction

class GasManager:
    """
    Handles dynamic prioritization fees and compute budget management for Solana transactions.
    Ensures transactions land in congested markets.
    """
    def __init__(self, rpc_url: str = "https://api.mainnet-beta.solana.com"):
        self.rpc_url = rpc_url
        self.client = AsyncClient(rpc_url)
        # Default safety fallback values
        self.default_cu_limit = 200_000
        self.default_micro_lamports = 10_000

    async def get_competitive_fee(self, account_keys: Optional[list] = None) -> int:
        """
        Queries the RPC for recent prioritization fees via raw request.
        """
        try:
            # We use the raw request method on the client
            # The account_keys must be a list of strings (Pubkeys)
            params = [account_keys] if account_keys else []
            
            # Use raw call to bypass potential client versioning issues
            import httpx
            async with httpx.AsyncClient() as client:
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getRecentPrioritizationFees",
                    "params": params
                }
                response = await client.post(self.rpc_url, json=payload)
                data = response.json()
            
            if 'result' not in data:
                return self.default_micro_lamports
            
            fees = [f['prioritizationFee'] for f in data['result']]
            if not fees:
                return self.default_micro_lamports
            
            # Sort and take high percentile for priority
            fees.sort()
            high_priority_fee = fees[int(len(fees) * 0.75)]
            
            # Additional safety cap (e.g., max 10,000,000 micro-lamports = ~0.01 SOL/CU)
            return min(max(high_priority_fee, self.default_micro_lamports), 10_000_000)
        except Exception as e:
            print(f"[GAS ERROR] Failed to fetch recent fees: {e}")
            return self.default_micro_lamports

    def create_budget_instructions(self, cu_limit: int = 200_000, micro_lamports: int = 10_000) -> list[Instruction]:
        """
        Creates the instructions to set compute limit and price.
        """
        return [
            set_compute_unit_limit(cu_limit),
            set_compute_unit_price(micro_lamports)
        ]

    async def inject_priority_fee(self, tx: VersionedTransaction) -> VersionedTransaction:
        """
        TODO: Implement VersionedTransaction modification.
        Note: VersionedTransactions have locked messages; modification usually happens 
        at the message construction phase or via re-serialization.
        """
        print("[GAS] Warning: Direct injection into signed VersionedTransaction is restricted.")
        return tx
