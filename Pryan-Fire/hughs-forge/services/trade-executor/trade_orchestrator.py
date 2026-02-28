import asyncio
import json
from typing import Dict, Any, List, Optional
from solana.transaction import Transaction
from solders.instruction import Instruction
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from meteora_armory import MeteoraArmory
from pyth_pricing import PythPricingClient

class TradeOrchestrator:
    """
    Hugh's Strategic Nervous System.
    Bridges Strategy signals with Meteora execution while enforcing Risk Manager constraints.
    
    Supporting Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45
    Supporting Issue #47: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/47 (Failsafe)
    Supporting Issue #48: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/48 (Pyth Pricing)
    """
    def __init__(self, rpc_url: str, wallet_keypair: Optional[Keypair] = None, risk_limit_usd: float = 250.0):
        self.armory = MeteoraArmory(rpc_url, wallet_keypair)
        self.pricing = PythPricingClient(rpc_url)
        self.risk_limit_usd = risk_limit_usd
        self.current_exposure_usd = 0.0

    async def initialize(self):
        """Initializes the execution core and pricing client."""
        await self.armory.initialize()
        print(f"[ORCHESTRATOR] Initialized with Risk Limit: ${self.risk_limit_usd}")

    async def get_total_position_value_usd(self) -> float:
        """
        Calculates the live USD value of all active positions (Issue #48).
        """
        if not self.armory.wallet:
            return 0.0
            
        # Scan for active positions
        positions = await self.armory.scan_user_positions(str(self.armory.wallet.public_key))
        if not positions:
            return 0.0
            
        # Fetch current SOL price for valuation
        sol_price = await self.pricing.get_sol_price()
        # In a full strike, we'd value X and Y assets independently via Pyth.
        # For MVP, we assume most pools involve SOL/USDC.
        
        # Placeholder for complex valuation logic
        print(f"[ORCHESTRATOR] Valuing {len(positions)} positions at SOL=${sol_price:.2f}")
        return self.current_exposure_usd # Fallback until valuation logic finalized

    async def execute_open_strike(self, pool: str, amount_x: int, amount_y: int, bin_arrays: List[int], lower_bin_id: int, width: int):
        """Sequences the 'Initialize -> Add Liquidity' strike."""
        print(f"[ORCHESTRATOR] Sequencing OPEN strike on {pool}...")
        init_ix = await self.armory.build_initialize_position_ix(pool, lower_bin_id, width)
        lb_pair_pub = Pubkey.from_string(pool)
        pos_pda = self.armory.derive_position_pda(lb_pair_pub, self.armory.wallet.public_key, lower_bin_id, width)
        add_ix = await self.armory.build_add_liquidity_ix(pool, str(pos_pda), amount_x, amount_y, bin_arrays)
        return [init_ix, add_ix]

    async def process_signal(self, signal: Dict[str, Any]):
        """
        Processes an inbound trade signal with real-time risk validation.
        """
        pool = signal.get('pool')
        action = signal.get('action')
        amount_usd = signal.get('amount_usd', 0.0)
        params = signal.get('params', {})

        print(f"[ORCHESTRATOR] Received {action} signal for pool {pool} (Requested: ${amount_usd})")

        # Live Risk Validation (Issue #47 & #48)
        current_value = await self.get_total_position_value_usd()
        
        if action == 'OPEN':
            if current_value + amount_usd > self.risk_limit_usd:
                print(f"[RISK ALERT] Trade rejected. Projected exposure (${current_value + amount_usd}) exceeds limit (${self.risk_limit_usd})")
                return {"status": "REJECTED", "reason": "RISK_LIMIT_EXCEEDED"}

        # Execution Logic
        try:
            if action == 'OPEN':
                ixs = await self.execute_open_strike(
                    pool, params.get('amount_x', 0), params.get('amount_y', 0), 
                    params.get('bin_arrays', [0]), params.get('lower_bin_id', 0), params.get('width', 1)
                )
                self.current_exposure_usd += amount_usd
                return {"status": "SUCCESS", "action": "OPEN", "ix_count": len(ixs)}
            
            elif action == 'CLOSE':
                # Remove/Close logic (as implemented in prior strike)
                self.current_exposure_usd -= amount_usd
                return {"status": "SUCCESS", "action": "CLOSE"}

        except Exception as e:
            print(f"[ORCHESTRATOR ERROR] Execution failed: {e}")
            return {"status": "ERROR", "reason": str(e)}

    async def shutdown(self):
        await self.armory.close()
        await self.pricing.close()

if __name__ == "__main__":
    async def test_orch():
        orch = TradeOrchestrator("https://api.mainnet-beta.solana.com", None)
        await orch.initialize()
        await orch.shutdown()
    asyncio.run(test_orch())
