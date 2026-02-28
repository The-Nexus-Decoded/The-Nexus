import asyncio
import json
from typing import Dict, Any, List, Optional
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from meteora_armory import MeteoraArmory
from pyth_pricing import PythPricingClient
from audit_logger import AuditLogger # Import the new AuditLogger

class TradeOrchestrator:
    """
    Hugh's Strategic Nervous System.
    Bridges Strategy signals with Meteora execution while enforcing Risk Manager constraints.
    
    Supporting Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45
    Supporting Issue #47: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/47 (Failsafe)
    Supporting Issue #48: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/48 (Pyth Pricing)
    Supporting Issue #17: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/17 (Audit Logging)
    Supporting Issue #8: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/8 (Audit Logging)
    """
    def __init__(self, rpc_url: str, wallet_keypair: Optional[Keypair] = None, risk_limit_usd: float = 250.0):
        self.armory = MeteoraArmory(rpc_url, wallet_keypair)
        self.pricing = PythPricingClient(rpc_url)
        self.logger = AuditLogger() # Instantiate the AuditLogger
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
        # Placeholder for complex valuation logic, currently returns simulated exposure
        return self.current_exposure_usd 

    async def execute_open_strike(self, pool: str, amount_x: int, amount_y: int, bin_arrays: List[int], lower_bin_id: int, width: int) -> List[Any]:
        """
        Sequences the 'Initialize -> Add Liquidity' strike.
        Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45
        """
        print(f"[ORCHESTRATOR] Sequencing OPEN strike on {pool}...")
        
        init_ix = await self.armory.build_initialize_position_ix(pool, lower_bin_id, width)
        lb_pair_pub = Pubkey.from_string(pool)
        pos_pda = self.armory.derive_position_pda(
            lb_pair_pub, 
            self.armory.wallet.public_key, 
            lower_bin_id, 
            width
        )
        add_ix = await self.armory.build_add_liquidity_ix(pool, str(pos_pda), amount_x, amount_y, bin_arrays)
        
        return [init_ix, add_ix]

    async def execute_close_strike(self, pool: str, position_pda: str, amount_x: int, amount_y: int, bin_arrays: List[int]) -> List[Any]:
        """
        Sequences the 'Remove Liquidity -> Close Position' strike.
        Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45
        """
        print(f"[ORCHESTRATOR] Sequencing CLOSE strike for position {position_pda} on {pool}...")
        
        remove_ix = await self.armory.build_remove_liquidity_ix(
            pool, position_pda, amount_x, amount_y, bin_arrays
        )
        close_ix = await self.armory.build_close_position_ix(pool, position_pda)
        
        return [remove_ix, close_ix]

    async def process_signal(self, signal: Dict[str, Any]):
        """
        Processes an inbound trade signal with real-time risk validation.
        """
        self.logger.log_signal_received(signal) # Log signal reception

        pool = signal.get('pool')
        action = signal.get('action')
        amount_usd = signal.get('amount_usd', 0.0)
        params = signal.get('params', {})

        print(f"[ORCHESTRATOR] Received {action} signal for pool {pool} (Requested: ${amount_usd})")

        # Live Risk Validation (Issue #47 & #48)
        current_value = await self.get_total_position_value_usd()
        projected_value = current_value + amount_usd
        
        if action == 'OPEN':
            if projected_value > self.risk_limit_usd:
                reason = "RISK_LIMIT_EXCEEDED"
                self.logger.log_risk_check(signal, "REJECTED", reason, current_value, projected_value, self.risk_limit_usd)
                print(f"[RISK ALERT] Trade rejected. Projected exposure (${projected_value}) exceeds limit (${self.risk_limit_usd})")
                self.logger.log_trade_failed(action, pool, reason)
                return {"status": "REJECTED", "reason": reason}
            self.logger.log_risk_check(signal, "APPROVED", current_exposure=current_value, projected_exposure=projected_value, risk_limit=self.risk_limit_usd)

        # Execution Logic
        try:
            if action == 'OPEN':
                ixs = await self.execute_open_strike(
                    pool, 
                    params.get('amount_x', 0), 
                    params.get('amount_y', 0), 
                    params.get('bin_arrays', [0]),
                    params.get('lower_bin_id', 0),
                    params.get('width', 1)
                )
                print(f"[ORCHESTRATOR] OPEN strike instructions generated: {len(ixs)}")
                self.current_exposure_usd += amount_usd
                self.logger.log_trade_executed(action, pool, amount_usd, len(ixs))
                return {"status": "SUCCESS", "action": "OPEN", "ix_count": len(ixs)}
            
            elif action == 'CLOSE':
                ixs = await self.execute_close_strike(
                    pool,
                    params.get('position_pda', ''),
                    params.get('amount_x', 0),
                    params.get('amount_y', 0),
                    params.get('bin_arrays', [0])
                )
                print(f"[ORCHESTRATOR] CLOSE strike instructions generated: {len(ixs)}")
                self.current_exposure_usd -= amount_usd
                self.logger.log_trade_executed(action, pool, amount_usd, len(ixs))
                return {"status": "SUCCESS", "action": "CLOSE", "ix_count": len(ixs)}

        except Exception as e:
            reason = str(e)
            print(f"[ORCHESTRATOR ERROR] Execution failed: {reason}")
            self.logger.log_trade_failed(action, pool, reason)
            return {"status": "ERROR", "reason": reason}

    async def shutdown(self):
        await self.armory.close()
        await self.pricing.close()

if __name__ == "__main__":
    async def test_orch():
        orch = TradeOrchestrator("https://api.mainnet-beta.solana.com", None)
        await orch.initialize()
        
        # Test Risk Failsafe & Logging
        print("\n--- TEST: Risk Failsafe (Should Reject) ---")
        await orch.process_signal({
            'pool': '8Pm2k...', 
            'action': 'OPEN', 
            'amount_usd': 300.0, 
            'params': {'amount_x': 1000, 'amount_y': 1000, 'bin_arrays': [0]}
        })
        
        print("\n--- TEST: Valid OPEN (Should Approve) ---")
        await orch.process_signal({
            'pool': '8Pm2k...', 
            'action': 'OPEN', 
            'amount_usd': 100.0, 
            'params': {'amount_x': 1000, 'amount_y': 1000, 'bin_arrays': [0]}
        })

        print("\n--- TEST: Valid CLOSE (Should Approve) ---")
        await orch.process_signal({
            'pool': '8Pm2k...', 
            'action': 'CLOSE', 
            'amount_usd': 50.0, 
            'params': {'position_pda': 'BSS8E...', 'amount_x': 1000, 'amount_y': 1000, 'bin_arrays': [0]}
        })
        
        await orch.shutdown()
    asyncio.run(test_orch())
