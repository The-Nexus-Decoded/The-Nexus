import asyncio
from enum import Enum, auto
from decimal import Decimal
from typing import Dict, Any, Optional
from .kill_switch import KILL_SWITCH
from .guards import TradingGuards
from ..services.jupiter_service import JupiterService

class ExecutorState(Enum):
    IDLE = auto()
    DISCOVERY = auto()  # Finding Meteora LP opportunities
    ROUTING = auto()    # Fetching Jupiter routes
    VERIFYING = auto()  # Running guards and risk checks
    AWAITING_AUTH = auto() # Paused for Lord Xar's manual approval
    EXECUTING = auto()  # (Simulated) broadcasting transaction
    HALTED = auto()     # Emergency stop state

class TradeStateMachine:
    def __init__(self):
        self.state = ExecutorState.IDLE
        self.current_trade: Optional[Dict[str, Any]] = None
        self.is_authorized = False # Final Law 3 flag
        self.jupiter = JupiterService()

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
        # For simulation, we'll extract the outAmount and use a basic Decimal conversion
        # TODO: Refine USD valuation with a price feed or pool oracle
        usd_value = Decimal(quote.get("outAmount", "0")) / Decimal("1e6") # Assume 6 decimals for USDC/USDT
        
        self.current_trade["quote"] = quote
        self.current_trade["usd_value"] = usd_value
        
        self.verify_trade()

    def verify_trade(self):
        self.transition(ExecutorState.VERIFYING)
        usd_value = self.current_trade["usd_value"]

        # Check Law 2: Threshold
        if not TradingGuards.check_trade_value(usd_value):
            print(f"[ALERT] Opportunity ${usd_value} exceeds limit. Moving to AWAITING_AUTH.")
            self.transition(ExecutorState.AWAITING_AUTH)
            self.request_manual_approval(usd_value)
            return

        # If within threshold, proceed to execution (simulation)
        self.execute_trade()

    def request_manual_approval(self, amount: Decimal):
        """Prepares the manual approval alert."""
        from .notifications import TradeNotifier
        msg = TradeNotifier.format_auth_request(self.current_trade)
        print(f"[NOTIFY] {msg}")
        # The agent will capture this [NOTIFY] tag in logs and use the 'message' tool.

    def execute_trade(self):
        self.transition(ExecutorState.EXECUTING)
        try:
            # Check Law 3: Live Authorization
            TradingGuards.verify_live_execution_status(self.is_authorized)
            
            print("[LIVE] Executing transaction on-chain...")
            # actual logic here
            self.transition(ExecutorState.IDLE)
        except PermissionError as e:
            print(f"[SIMULATION] {e}")
            print("[SIMULATION] Transaction logged but not broadcast.")
            self.transition(ExecutorState.IDLE)

    def authorize_trade(self):
        """Manual override from Lord Xar."""
        if self.state == ExecutorState.AWAITING_AUTH:
            print("[AUTH] Manual authorization received.")
            self.is_authorized = True
            self.execute_trade()
            self.is_authorized = False # Reset for safety
