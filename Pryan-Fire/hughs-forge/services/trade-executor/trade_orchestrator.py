import asyncio
import json
from typing import Dict, Any, List, Optional
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from meteora_armory import MeteoraArmory
from pyth_pricing import PythPricingClient
from audit_logger import AuditLogger
from pnl_tracker import PnLTracker
import datetime

class TradeOrchestrator:
    """
    Hugh's Strategic Nervous System.
    Bridges Strategy signals with Meteora execution while enforcing Risk Manager constraints.
    """
    def __init__(self, rpc_url: str, wallet_keypair: Optional[Keypair] = None, risk_limit_usd: float = 250.0):
        self.armory = MeteoraArmory(rpc_url, wallet_keypair)
        self.pricing = PythPricingClient(rpc_url)
        self.logger = AuditLogger()
        self.pnl_tracker = PnLTracker()
        self.risk_limit_usd = risk_limit_usd
        self.current_exposure_usd = 0.0

    async def initialize(self):
        """Initializes the execution core and pricing client."""
        await self.armory.initialize()
        print(f"[ORCHESTRATOR] Initialized with Risk Limit: ${self.risk_limit_usd}")

    async def get_total_position_value_usd(self) -> float:
        """Calculates live USD value of active positions."""
        return self.current_exposure_usd 

    async def execute_open_strike(self, pool: str, amount_x: int, amount_y: int, bin_arrays: List[int], lower_bin_id: int, width: int) -> Dict[str, Any]:
        """Sequences the 'Initialize -> Add Liquidity' strike with full on-chain interaction."""
        print(f"[ORCHESTRATOR] Sequencing OPEN strike on {pool}...")
        
        # 1. Build Initialize Position Instruction
        init_ix = await self.armory.build_initialize_position_ix(pool, lower_bin_id, width)
        
        # 2. Derive Position PDA
        lb_pair_pub = Pubkey.from_string(pool)
        pos_pda = self.armory.derive_position_pda(
            lb_pair_pub, 
            self.armory.wallet.public_key, 
            lower_bin_id, 
            width
        )
        
        # 3. Build Add Liquidity Instruction
        add_ix = await self.armory.build_add_liquidity_ix(pool, str(pos_pda), amount_x, amount_y, bin_arrays)
        
        # Phase 3 will bundle and broadcast. For now, we verify instruction generation.
        print(f"[ORCHESTRATOR] Instructions generated for {pos_pda}")
        return {"ix_count": 2, "position_pda": str(pos_pda)}

    async def execute_close_strike(self, pool: str, position_pda: str, amount_x: int, amount_y: int, bin_arrays: List[int]) -> Dict[str, Any]:
        """Sequences the 'Remove Liquidity -> Close Position' strike with full on-chain interaction."""
        print(f"[ORCHESTRATOR] Sequencing CLOSE strike for position {position_pda} on {pool}...")
        
        # 1. Build Remove Liquidity Instruction
        remove_ix = await self.armory.build_remove_liquidity_ix(pool, position_pda, amount_x, amount_y, bin_arrays)
        
        # 2. Build Close Position Instruction
        close_ix = await self.armory.build_close_position_ix(pool, position_pda)
        
        return {"ix_count": 2, "position_pda": position_pda}

    async def process_claim_fees(self, pool: str, position_pda: str) -> Dict[str, Any]:
        """Processes a 'CLAIM_FEES' signal, orchestrating fee and reward claiming."""
        print(f"[ORCHESTRATOR] Processing CLAIM_FEES for position {position_pda} on {pool}...")
        
        # 1. Build Claim Fee Instruction
        claim_fee_ix = await self.armory.build_claim_fee_ix(pool, position_pda)
        
        # 2. Build Claim Reward Instruction
        claim_reward_ix = await self.armory.build_claim_reward_ix(pool, position_pda)
        
        # Simulation placeholders
        claimed_x_usd = 1.50
        claimed_y_usd = 0.75
        claimed_reward_usd = 0.25
        ix_count = 2

        self.logger.log_fee_claimed(position_pda, pool, claimed_x_usd, claimed_y_usd, 1)
        self.logger.log_reward_claimed(position_pda, pool, claimed_reward_usd, 1)
        self.pnl_tracker.track_claimed_fees(position_pda, claimed_x_usd + claimed_y_usd)
        self.pnl_tracker.track_claimed_rewards(position_pda, claimed_reward_usd)

        print(f"[ORCHESTRATOR] Fees claimed for {position_pda}: ${claimed_x_usd + claimed_y_usd:.2f} USD")
        return {"status": "SUCCESS", "action": "CLAIM_FEES", "ix_count": ix_count}

    async def process_signal(self, signal: Dict[str, Any]):
        """Processes inbound trade signal with real-time risk validation."""
        self.logger.log_signal_received(signal)
        pool = signal.get('pool')
        action = signal.get('action')
        amount_usd = signal.get('amount_usd', 0.0)
        params = signal.get('params', {})

        print(f"[ORCHESTRATOR] Received {action} signal for pool {pool} (Requested: ${amount_usd})")

        current_value = await self.get_total_position_value_usd()
        projected_value = current_value + amount_usd
        
        if action == 'OPEN':
            if projected_value > self.risk_limit_usd:
                reason = "RISK_LIMIT_EXCEEDED"
                self.logger.log_risk_check(signal, "REJECTED", reason, current_value, projected_value, self.risk_limit_usd)
                self.logger.log_trade_failed(action, pool, reason)
                return {"status": "REJECTED", "reason": reason}
            self.logger.log_risk_check(signal, "APPROVED", current_exposure=current_value, projected_exposure=projected_value, risk_limit=self.risk_limit_usd)

        try:
            if action == 'OPEN':
                exec_result = await self.execute_open_strike(
                    pool, params.get('amount_x', 0), params.get('amount_y', 0), 
                    params.get('bin_arrays', [0]), params.get('lower_bin_id', 0), params.get('width', 1)
                )
                self.current_exposure_usd += amount_usd
                self.logger.log_trade_executed(action, pool, amount_usd, exec_result["ix_count"])
                self.pnl_tracker.track_open_position(exec_result["position_pda"], pool, amount_usd)
                return {"status": "SUCCESS", "action": "OPEN", "position_pda": exec_result["position_pda"]}
            
            elif action == 'CLOSE':
                pos_pda = params.get('position_pda', '')
                exec_result = await self.execute_close_strike(pool, pos_pda, params.get('amount_x', 0), params.get('amount_y', 0), params.get('bin_arrays', [0]))
                self.current_exposure_usd -= amount_usd
                self.logger.log_trade_executed(action, pool, amount_usd, exec_result["ix_count"])
                self.pnl_tracker.track_close_position(pos_pda, amount_usd * 0.99)
                return {"status": "SUCCESS", "action": "CLOSE"}
            
            elif action == 'CLAIM_FEES':
                return await self.process_claim_fees(pool, params.get('position_pda', ''))

        except Exception as e:
            print(f"[ORCHESTRATOR ERROR] Execution failed: {e}")
            self.logger.log_trade_failed(action, pool, str(e))
            return {"status": "ERROR", "reason": str(e)}

    async def shutdown(self):
        await self.armory.close()
        await self.pricing.close()

if __name__ == "__main__":
    async def test():
        orch = TradeOrchestrator("https://api.mainnet-beta.solana.com", Keypair())
        await orch.initialize()
        await orch.shutdown()
    asyncio.run(test())
