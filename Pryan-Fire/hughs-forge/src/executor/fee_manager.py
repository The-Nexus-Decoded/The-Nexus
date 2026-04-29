from __future__ import annotations


class GasManager:
    """Priority-fee helper with a deterministic offline fallback."""

    def __init__(self, rpc_url: str):
        self.rpc_url = rpc_url

    async def get_competitive_fee(self) -> int:
        # Safe dry-run default; production fee sampling belongs in the live executor.
        return 10_000

    def create_budget_instructions(self, cu_limit: int, micro_lamports: int):
        return [
            {"program": "ComputeBudget", "instruction": "set_compute_unit_limit", "units": int(cu_limit)},
            {"program": "ComputeBudget", "instruction": "set_compute_unit_price", "micro_lamports": int(micro_lamports)},
        ]
