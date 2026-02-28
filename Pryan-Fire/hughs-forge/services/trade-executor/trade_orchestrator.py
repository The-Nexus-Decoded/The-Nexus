import asyncio
import json
from typing import Dict, Any, List, Optional
from solana.transaction import Transaction
from solders.instruction import Instruction
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from meteora_armory import MeteoraArmory

class TradeOrchestrator:
    """
    Hugh's Strategic Nervous System.
    Bridges Strategy signals with Meteora execution while enforcing Risk Manager constraints.
    
    Supporting Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45
    Supporting Issue #47: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/47 (Failsafe)
    """
    def __init__(self, rpc_url: str, wallet_keypair: Optional[Keypair] = None, risk_limit_usd: float = 250.0):
        self.armory = MeteoraArmory(rpc_url, wallet_keypair)
        self.risk_limit_usd = risk_limit_usd
        self.current_exposure_usd = 0.0

    async def initialize(self):
        await self.armory.initialize()
        print(f"[ORCHESTRATOR] Initialized with Risk Limit: ${self.risk_limit_usd}")

    async def execute_open_strike(self, pool: str, amount_x: int, amount_y: int, bin_arrays: List[int], lower_bin_id: int, width: int):
        """
        Sequences the 'Initialize -> Add Liquidity' strike.
        Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45
        """
        print(f"[ORCHESTRATOR] Sequencing OPEN strike on {pool}...")
        
        # 1. Initialize Position Instruction
        init_ix = await self.armory.build_initialize_position_ix(pool, lower_bin_id, width)
        
        # 2. Derive Position PDA for context mapping
        lb_pair_pub = Pubkey.from_string(pool)
        pos_pda = self.armory.derive_position_pda(
            lb_pair_pub, 
            self.armory.wallet.public_key, 
            lower_bin_id, 
            width
        )
        
        # 3. Add Liquidity Instruction
        add_ix = await self.armory.build_add_liquidity_ix(
            pool, str(pos_pda), amount_x, amount_y, bin_arrays
        )
        
        return [init_ix, add_ix]

    async def execute_close_strike(self, pool: str, position_pda: str, amount_x: int, amount_y: int, bin_arrays: List[int]):
        """
        Sequences the 'Remove Liquidity -> Close Position' strike.
        Issue #45: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/45
        """
        print(f"[ORCHESTRATOR] Sequencing CLOSE strike for position {position_pda} on {pool}...")
        
        # 1. Remove Liquidity Instruction
        remove_ix = await self.armory.build_remove_liquidity_ix(
            pool, position_pda, amount_x, amount_y, bin_arrays
        )
        
        # 2. Close Position Instruction (Rent Recovery)
        close_ix = await self.armory.build_close_position_ix(pool, position_pda)
        
        return [remove_ix, close_ix]

    async def process_signal(self, signal: Dict[str, Any]):
        """
        Processes an inbound trade signal from the Strategy Engine.
        Format: { 'pool': str, 'action': 'OPEN'|'CLOSE', 'amount_usd': float, 'params': dict }
        """
        pool = signal.get('pool')
        action = signal.get('action')
        amount = signal.get('amount_usd', 0.0)
        params = signal.get('params', {})

        print(f"[ORCHESTRATOR] Received {action} signal for pool {pool} (Amount: ${amount})")

        # Issue #47: Hard Risk Failsafe
        if action == 'OPEN':
            if self.current_exposure_usd + amount > self.risk_limit_usd:
                print(f"[RISK ALERT] Trade rejected. Total exposure (${self.current_exposure_usd + amount}) exceeds limit (${self.risk_limit_usd})")
                return {"status": "REJECTED", "reason": "RISK_LIMIT_EXCEEDED"}

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
                self.current_exposure_usd += amount
                return {"status": "SUCCESS", "action": "OPEN", "ix_count": len(ixs)}
            
            elif action == 'CLOSE':
                ixs = await self.execute_close_strike(
                    pool,
                    params.get('position_pda'),
                    params.get('amount_x', 0),
                    params.get('amount_y', 0),
                    params.get('bin_arrays', [0])
                )
                print(f"[ORCHESTRATOR] CLOSE strike instructions generated: {len(ixs)}")
                self.current_exposure_usd -= amount
                return {"status": "SUCCESS", "action": "CLOSE", "ix_count": len(ixs)}

        except Exception as e:
            print(f"[ORCHESTRATOR ERROR] Execution failed: {e}")
            return {"status": "ERROR", "reason": str(e)}

    async def shutdown(self):
        await self.armory.close()

if __name__ == "__main__":
    async def test_orch():
        orch = TradeOrchestrator("https://api.mainnet-beta.solana.com", None)
        await orch.initialize()
        await orch.process_signal({
            'pool': '8Pm2k...', 
            'action': 'CLOSE', 
            'amount_usd': 50.0, 
            'params': {
                'position_pda': 'BSS8E...', 
                'amount_x': 1000, 
                'amount_y': 1000, 
                'bin_arrays': [0]
            }
        })
        await orch.shutdown()
    asyncio.run(test_orch())
