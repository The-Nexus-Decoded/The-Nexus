import asyncio
import json
from typing import Dict, Any, List, Optional
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from meteora_armory import MeteoraArmory
from pyth_pricing import PythPricingClient
from audit_logger import AuditLogger # Import the new AuditLogger
from pnl_tracker import PnLTracker # Import the new PnLTracker
import datetime # Import datetime for dummy_pos_pda

class TradeOrchestrator:
    """
    Hugh's Strategic Nervous System.
    Bridges Strategy signals with Meteora execution while enforcing Risk Manager constraints.
    
    Supporting Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45
    Supporting Issue #47: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/47 (Failsafe)
    Supporting Issue #48: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/48 (Pyth Pricing)
    Supporting Issue #17: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/17 (Audit Logging)
    Supporting Issue #8: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/8 (Audit Logging)
    Supporting Issue #14: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/14 (P&L Tracking)
    Supporting Issue #5: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/5 (P&L Tracking)
    Supporting Issue #4: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/4 (Fee Claiming & Compounding)
    """
    def __init__(self, rpc_url: str, wallet_keypair: Optional[Keypair] = None, risk_limit_usd: float = 250.0):
        self.armory = MeteoraArmory(rpc_url, wallet_keypair)
        self.pricing = PythPricingClient(rpc_url)
        self.logger = AuditLogger() # Instantiate the AuditLogger
        self.pnl_tracker = PnLTracker() # Instantiate the PnLTracker
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

    async def execute_open_strike(self, pool: str, amount_x: int, amount_y: int, bin_arrays: List[int], lower_bin_id: int, width: int) -> Dict[str, Any]:
        """
        Sequences the 'Initialize -> Add Liquidity' strike.
        Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45
        
        TEMPORARILY STUBBED FOR AUDIT LOGGING AND P&L TRACKING VERIFICATION.
        """
        print(f"[ORCHESTRATOR] Sequencing OPEN strike on {pool} (STUBBED FOR LOGGING & P&L TEST)...")
        # Generate a dummy position_pda for P&L tracking during simulation
        dummy_pos_pda = f"SIM_POS_{self.armory.wallet.public_key}_{lower_bin_id}_{width}_{int(datetime.datetime.now().timestamp())}"
        return {"ix_count": 2, "position_pda": dummy_pos_pda}

    async def execute_close_strike(self, pool: str, position_pda: str, amount_x: int, amount_y: int, bin_arrays: List[int]) -> Dict[str, Any]:
        """
        Sequences the 'Remove Liquidity -> Close Position' strike.
        Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45

        TEMPORARILY STUBBED FOR AUDIT LOGGING AND P&L TRACKING VERIFICATION.
        """
        print(f"[ORCHESTRATOR] Sequencing CLOSE strike for position {position_pda} on {pool} (STUBBED FOR LOGGING & P&L TEST)...")
        return {"ix_count": 2, "position_pda": position_pda}

    async def process_claim_fees(self, pool: str, position_pda: str) -> Dict[str, Any]:
        """
        Processes a 'CLAIM_FEES' signal, orchestrating fee and reward claiming.
        Supporting Issue #4.
        """
        print(f"[ORCHESTRATOR] Processing CLAIM_FEES for position {position_pda} on {pool}...")
        
        # Build claim fee instruction (stubbed amounts for simulation)
        claim_fee_ix = await self.armory.build_claim_fee_ix(pool, position_pda)
        # Build claim reward instruction (stubbed amounts for simulation)
        claim_reward_ix = await self.armory.build_claim_reward_ix(pool, position_pda)
        
        # In a real scenario, we'd execute these and parse the transaction logs for actual claimed amounts.
        # For simulation, we'll use dummy values.
        claimed_x_usd = 1.50
        claimed_y_usd = 0.75
        claimed_reward_usd = 0.25
        ix_count = 2 # Assuming two instructions: claim_fee and claim_reward

        self.logger.log_fee_claimed(position_pda, pool, claimed_x_usd, claimed_y_usd, 1) # Log fee claim
        self.logger.log_reward_claimed(position_pda, pool, claimed_reward_usd, 1) # Log reward claim
        self.pnl_tracker.track_claimed_fees(position_pda, claimed_x_usd + claimed_y_usd) # Track claimed fees
        self.pnl_tracker.track_claimed_rewards(position_pda, claimed_reward_usd) # Track claimed rewards

        print(f"[ORCHESTRATOR] Fees claimed for {position_pda}: ${claimed_x_usd + claimed_y_usd:.2f} USD, Rewards: ${claimed_reward_usd:.2f} USD.")
        
        return {"status": "SUCCESS", "action": "CLAIM_FEES", "ix_count": ix_count, 
                "claimed_fees_usd": claimed_x_usd + claimed_y_usd, "claimed_rewards_usd": claimed_reward_usd}


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
                exec_result = await self.execute_open_strike(
                    pool, 
                    params.get('amount_x', 0), 
                    params.get('amount_y', 0), 
                    params.get('bin_arrays', [0]),
                    params.get('lower_bin_id', 0),
                    params.get('width', 1)
                )
                ix_count = exec_result["ix_count"]
                position_pda = exec_result["position_pda"]

                print(f"[ORCHESTRATOR] OPEN strike instructions generated: {ix_count}")
                self.current_exposure_usd += amount_usd
                self.logger.log_trade_executed(action, pool, amount_usd, ix_count)
                self.pnl_tracker.track_open_position(position_pda, pool, amount_usd) # Track open position

                # Placeholder for fees/gas tracking on open
                self.pnl_tracker.track_gas_cost(position_pda, 0.01) 

                return {"status": "SUCCESS", "action": "OPEN", "ix_count": ix_count, "position_pda": position_pda}
            
            elif action == 'CLOSE':
                position_pda = params.get('position_pda', '')
                if not position_pda: raise ValueError("Position PDA missing for CLOSE signal")

                exec_result = await self.execute_close_strike(
                    pool,
                    position_pda,
                    params.get('amount_x', 0),
                    params.get('amount_y', 0),
                    params.get('bin_arrays', [0])
                )
                ix_count = exec_result["ix_count"]
                
                print(f"[ORCHESTRATOR] CLOSE strike instructions generated: {ix_count}")
                self.current_exposure_usd -= amount_usd
                self.logger.log_trade_executed(action, pool, amount_usd, ix_count)
                
                # Track close position with a dummy final value for now
                self.pnl_tracker.track_close_position(position_pda, amount_usd * 0.99) # Simulate some loss/gain
                self.pnl_tracker.track_gas_cost(position_pda, 0.005) # Simulate gas for close

                return {"status": "SUCCESS", "action": "CLOSE", "ix_count": ix_count, "position_pda": position_pda}
            
            elif action == 'CLAIM_FEES':
                position_pda = params.get('position_pda', '')
                if not position_pda: raise ValueError("Position PDA missing for CLAIM_FEES signal")
                
                claim_result = await self.process_claim_fees(pool, position_pda)
                return claim_result

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
        orch = TradeOrchestrator("https://api.mainnet-beta.solana.com", Keypair())
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
        open_res = await orch.process_signal({
            'pool': '8Pm2k...', 
            'action': 'OPEN', 
            'amount_usd': 100.0, 
            'params': {'amount_x': 1000, 'amount_y': 1000, 'bin_arrays': [0]}
        })
        opened_pda = open_res.get("position_pda", "")
        
        print("\n--- TEST: Claim Fees (Should Approve) ---")
        if opened_pda:
            await orch.process_signal({
                'pool': '8Pm2k...', 
                'action': 'CLAIM_FEES', 
                'amount_usd': 0.0, 
                'params': {'position_pda': opened_pda}
            })

        print("\n--- TEST: Valid CLOSE (Should Approve) ---")
        await orch.process_signal({
            'pool': '8Pm2k...', 
            'action': 'CLOSE', 
            'amount_usd': 50.0, 
            'params': {'position_pda': opened_pda, 'amount_x': 1000, 'amount_y': 1000, 'bin_arrays': [0]}
        })
        
        # Add some fees and IL to the opened position for testing
        if opened_pda:
            print(f"\n--- TEST: Tracking P&L for {opened_pda} ---")
            orch.pnl_tracker.track_fees(opened_pda, 2.5)
            orch.pnl_tracker.track_impermanent_loss(opened_pda, 1.0)
            print(f"Overall P&L summary: {orch.pnl_tracker.get_overall_pnl()}")

        await orch.shutdown()
    asyncio.run(test_orch())
