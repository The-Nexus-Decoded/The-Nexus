import logging
import uuid
import time
from typing import Dict, Any
from .state_machine import TradeState
from state.state_manager import TradeStateManager
from .rpc_integration import RpcIntegrator
from .revenue_lane import CappedRevenueLane
from .risk_gate import RiskGate

class TradeOrchestrator:
    def __init__(self, db_path: str = "trades.db", dry_run: bool = False, max_capped_lane_usd: float = 25.0):
        self.logger = logging.getLogger("TradeOrchestrator")
        self.dry_run = dry_run
        self.state_manager = TradeStateManager(db_path)
        self.rpc_integrator = RpcIntegrator(dry_run=dry_run)
        self.risk_gate = RiskGate(max_capped_lane_usd=max_capped_lane_usd)
        self.revenue_lane = CappedRevenueLane(risk_gate=self.risk_gate, quote_client=self.rpc_integrator)
        self.MAX_AUTO_TRADE_USD = max_capped_lane_usd

    def process_signal(self, signal_data: Dict[str, Any]) -> str:
        trade_id = signal_data.get("trade_id", str(uuid.uuid4()))
        token_address = signal_data.get("token_address") or signal_data.get("mint") or signal_data.get("input_mint")
        amount = float(signal_data.get("amount_usd", signal_data.get("amount", 0.0)) or 0.0)

        self.logger.info(f"[{trade_id}] Processing signal for {token_address}, amount: ${amount}")

        # Initial State
        current_state = TradeState.SIGNAL_RECEIVED.value
        self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data)

        # Validating Phase
        current_state = TradeState.VALIDATING.value
        self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data)

        lane_result = self.revenue_lane.plan(signal_data, live_execution=not self.dry_run)
        lane_payload = {**signal_data, "revenue_lane": lane_result.to_dict()}

        if lane_result.status == "AWAITING_OWNER_APPROVAL":
            self.logger.warning(f"[{trade_id}] Owner approval required: {lane_result.blocker}")
            current_state = TradeState.AWAITING_APPROVAL.value
            self.state_manager.save_trade(trade_id, current_state, token_address, amount, lane_payload)
            return current_state

        if lane_result.status != "DRY_RUN_PLAN_READY":
            self.logger.error(f"[{trade_id}] Revenue lane blocked: {lane_result.status} ({lane_result.blocker})")
            current_state = TradeState.FAILED.value
            self.state_manager.save_trade(trade_id, current_state, token_address, amount, lane_payload)
            return current_state

        self.logger.info(f"[{trade_id}] Revenue lane planned via {lane_result.route}; transaction submit disabled.")
        current_state = TradeState.ROUTING.value
        self.state_manager.save_trade(trade_id, current_state, token_address, amount, lane_payload)

        current_state = TradeState.PLANNED.value
        self.state_manager.save_trade(trade_id, current_state, token_address, amount, lane_payload)
        return current_state
