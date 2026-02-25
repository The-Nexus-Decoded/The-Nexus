import asyncio
from enum import Enum, auto
from decimal import Decimal
from typing import Dict, Any, Optional
from .kill_switch import KILL_SWITCH
from .guards import TradingGuards
from ..services.jupiter_service import JupiterService
from .transaction_core import TransactionCore

class ExecutorState(Enum):
    IDLE = auto()
    DISCOVERY = auto()  # Finding Meteora LP opportunities
    ROUTING = auto()    # Fetching Jupiter routes
    VERIFYING = auto()  # Running guards and risk checks
    AWAITING_AUTH = auto() # Paused for Lord Xar's manual approval
    EXECUTING = auto()  # (Simulated) broadcasting transaction
    HALTED = auto()     # Emergency stop state

class TradeStateMachine:
    def __init__(self, rpc_url: str = "https://api.mainnet-beta.solana.com"):
        self.state = ExecutorState.IDLE
        self.current_trade: Optional[Dict[str, Any]] = None
        self.is_authorized = False # Final Law 3 flag
        self.jupiter = JupiterService()
        self.tx_core = TransactionCore(rpc_url)
        self.user_pubkey = "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x" # Default bot wallet

    def transition(self, to_state: ExecutorState):
        if KILL_SWITCH.is_halted():
            self.state = ExecutorState.HALTED
            return

        print(f"[STATE] {self.state.name} -> {to_state.name}")
        self.state = to_state

    async def process_opportunity(self, meteora_data: Dict[str, Any]):
        """Main entry point for a discovered LP opportunity."""
        self.transition(ExecutorState.DISCOVERY)
        self.current_trade = {"meteora": meteora_data}
        
        # Next: Get routing
        await self.get_jupiter_route()

    async def get_jupiter_route(self):
        self.transition(ExecutorState.ROUTING)
        
        # Pull mints and amount from Meteora LP data
        input_mint = self.current_trade["meteora"].get("input_mint")
        output_mint = self.current_trade["meteora"].get("output_mint")
        amount_atoms = self.current_trade["meteora"].get("amount_atoms", 0)

        if not (input_mint and output_mint and amount_atoms):
            print("[ROUTING ERROR] Missing mints/amount in Meteora data.")
            self.transition(ExecutorState.IDLE)
            return

        quote = await self.jupiter.get_quote(input_mint, output_mint, amount_atoms)
        
        if not quote:
            print("[ROUTING ERROR] Failed to fetch Jupiter quote.")
            self.transition(ExecutorState.IDLE)
            return

        # Estimate USD Value for Guard (assuming USDC/USDT output or stable value)
        usd_value = Decimal(quote.get("outAmount", "0")) / Decimal("1e6") # Assume 6 decimals for USDC/USDT
        
        self.current_trade["quote"] = quote
        self.current_trade["usd_value"] = usd_value
        
        await self.verify_trade()

    async def verify_trade(self):
        self.transition(ExecutorState.VERIFYING)
        usd_value = self.current_trade["usd_value"]

        # Check Law 2: Threshold
        if not TradingGuards.check_trade_value(usd_value):
            print(f"[ALERT] Opportunity ${usd_value} exceeds limit. Moving to AWAITING_AUTH.")
            self.transition(ExecutorState.AWAITING_AUTH)
            self.request_manual_approval(usd_value)
            return

        # If within threshold, proceed to execution (simulation)
        await self.execute_trade()

    def request_manual_approval(self, amount: Decimal):
        """Prepares the manual approval alert."""
        from .notifications import TradeNotifier
        msg = TradeNotifier.format_auth_request(self.current_trade)
        print(f"[NOTIFY] {msg}")

    async def execute_trade(self):
        self.transition(ExecutorState.EXECUTING)
        try:
            # 1. Fetch the swap transaction
            print("[TX] Requesting swap transaction from Jupiter...")
            swap_b64 = await self.jupiter.get_swap_transaction(
                self.current_trade["quote"], 
                self.user_pubkey
            )
            
            if not swap_b64:
                print("[TX ERROR] Failed to fetch swap transaction.")
                self.transition(ExecutorState.IDLE)
                return

            # 2. Deserialize
            tx = await self.tx_core.build_from_jupiter(swap_b64)
            if not tx:
                self.transition(ExecutorState.IDLE)
                return

            # 3. Simulate (The Ultimate Truth)
            sim_result = await self.tx_core.simulate(tx)
            
            # Final Law 3: Live Authorization check
            TradingGuards.verify_live_execution_status(self.is_authorized)
            
            if sim_result["success"] and self.is_authorized:
                print("[LIVE] Simulation succeeded and authorized. Manual signing required.")
                # await self.tx_core.sign_and_broadcast(...)
            else:
                if not sim_result["success"]:
                    print(f"[SIMULATION FAILED] Result: {sim_result.get('error')}")
                print("[SIMULATION] Transaction simulation phase complete.")
                
            self.transition(ExecutorState.IDLE)
        except PermissionError as e:
            print(f"[SIMULATION] {e}")
            self.transition(ExecutorState.IDLE)
        except Exception as e:
            print(f"[ERROR] Execution failed: {e}")
            self.transition(ExecutorState.IDLE)

    async def authorize_trade(self):
        """Manual override from Lord Xar."""
        if self.state == ExecutorState.AWAITING_AUTH:
            print("[AUTH] Manual authorization received.")
            self.is_authorized = True
            await self.execute_trade()
            self.is_authorized = False # Reset for safety
