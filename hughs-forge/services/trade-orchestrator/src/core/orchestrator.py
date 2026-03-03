import logging
import uuid
import time
from typing import Dict, Any
from .state_machine import TradeState
from state.state_manager import TradeStateManager
from .rpc_integration import RpcIntegrator

class TradeOrchestrator:
    def __init__(self, db_path: str = "trades.db", dry_run: bool = False):
        self.logger = logging.getLogger("TradeOrchestrator")
        self.state_manager = TradeStateManager(db_path)
        self.dry_run = dry_run
        self.rpc_integrator = RpcIntegrator(dry_run=dry_run)
        self.MAX_AUTO_TRADE_USD = 250.0
        self.discord_broadcaster = None  # Injected by main.py

    def process_signal(self, signal_data: Dict[str, Any]) -> str:
        trade_id = signal_data.get("trade_id", str(uuid.uuid4()))
        token_address = signal_data.get("token_address")
        amount = signal_data.get("amount", 0.0)

        self.logger.info(f"[{trade_id}] Processing signal for {token_address}, amount: ${amount}")

        # Initial State
        current_state = TradeState.SIGNAL_RECEIVED.value
        self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data)

        # Validating Phase
        current_state = TradeState.VALIDATING.value
        self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data)

        # Failsafe check
        if amount > self.MAX_AUTO_TRADE_USD:
            self.logger.warning(f"[{trade_id}] Amount ${amount} exceeds ${self.MAX_AUTO_TRADE_USD} limit. Halting for manual approval.")
            current_state = TradeState.AWAITING_APPROVAL.value
            # Capture rejection reason
            rejection_data = {"rejection_reason": f"Amount exceeds auto-trade limit ${self.MAX_AUTO_TRADE_USD}"}
            self.state_manager.save_trade(
                trade_id, current_state, token_address, amount,
                data={**signal_data, **rejection_data},
                rejection_reason=rejection_data["rejection_reason"]
            )
            # Broadcast rejection
            self._broadcast_rejection(trade_id, token_address, amount, rejection_data["rejection_reason"])
            return current_state

        # Routing Phase
        self.logger.info(f"[{trade_id}] Proceeding to ROUTING phase.")
        current_state = TradeState.ROUTING.value
        self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data)

        # Determine Route
        route = self.rpc_integrator.route_trade(token_address, amount)
        self.logger.info(f"[{trade_id}] Selected Route: {route}")

        # Execution Phase
        self.logger.info(f"[{trade_id}] Transitioning to EXECUTING phase.")
        current_state = TradeState.EXECUTING.value
        self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data, route=route)

        success = False
        execution_result = {}
        if route == "JUPITER":
            execution_result = self.rpc_integrator.execute_jupiter_trade(token_address, amount)
            success = execution_result.get("success", False)
        elif route == "METEORA":
            try:
                execution_result = self.rpc_integrator.execute_meteora_trade(token_address, amount)
                success = execution_result.get("success", False)
            except NotImplementedError as e:
                self.logger.warning(f"[{trade_id}] Meteora execution not available: {e}")
                success = False
                execution_result = {"error": str(e)}

        # Post-Execution Phase
        if success:
            self.logger.info(f"[{trade_id}] Trade execution successful. Transitioning to EXECUTED.")
            current_state = TradeState.EXECUTED.value
            self.state_manager.save_trade(
                trade_id, current_state, token_address, amount,
                data={**signal_data, **execution_result},
                entry_price=execution_result.get("entry_price"),
                tx_signature=execution_result.get("tx_signature"),
                slippage_bps=execution_result.get("slippage_bps"),
                fee_lamports=execution_result.get("fee_lamports"),
                executed_at=execution_result.get("executed_at"),
                route=route
            )
            # Broadcast success
            self._broadcast_executed(trade_id, token_address, amount, {
                "route": route,
                "entry_price": execution_result.get("entry_price"),
                "slippage_bps": execution_result.get("slippage_bps"),
                "tx_signature": execution_result.get("tx_signature")
            })
        else:
            self.logger.error(f"[{trade_id}] Trade execution failed.")
            current_state = TradeState.FAILED.value
            error_msg = execution_result.get("error", "Unknown error")
            self.state_manager.save_trade(
                trade_id, current_state, token_address, amount,
                data={**signal_data, **execution_result},
                rejection_reason=error_msg,
                route=route
            )
            # Broadcast failure
            self._broadcast_failed(trade_id, token_address, amount, {
                "route": route,
                "error": error_msg
            })

        return current_state

    def _broadcast_executed(self, trade_id: str, token_address: str, amount: float, extra: Dict[str, Any]):
        if self.discord_broadcaster:
            trade_data = {"trade_id": trade_id, "token_address": token_address, "amount": amount, **extra}
            self.discord_broadcaster.broadcast_trade_executed(trade_data)

    def _broadcast_failed(self, trade_id: str, token_address: str, amount: float, extra: Dict[str, Any]):
        if self.discord_broadcaster:
            trade_data = {"trade_id": trade_id, "token_address": token_address, "amount": amount, **extra}
            self.discord_broadcaster.broadcast_trade_failed(trade_data)

    def _broadcast_rejection(self, trade_id: str, token_address: str, amount: float, reason: str):
        if self.discord_broadcaster:
            trade_data = {"trade_id": trade_id, "token_address": token_address, "amount": amount, "rejection_reason": reason}
            self.discord_broadcaster.broadcast_trade_rejected(trade_data)
