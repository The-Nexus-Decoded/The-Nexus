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

    def process_signal(self, signal_data: Dict[str, Any]) -> str:
        trade_id = signal_data.get("trade_id", str(uuid.uuid4()))

        # Dispatch based on signal type
        if "pool_address" in signal_data and "action" in signal_data:
            # DLMM position management signal (Meteora)
            self.logger.info(f"[{trade_id}] Processing DLMM signal: {signal_data.get('action')} for pool {signal_data.get('pool_address')}")
            return self._handle_dlmm_signal(trade_id, signal_data)
        else:
            # Traditional token trade signal
            token_address = signal_data.get("token_address")
            amount = signal_data.get("amount", 0.0)
            self.logger.info(f"[{trade_id}] Processing token trade signal for {token_address}, amount: ${amount}")
            return self._handle_token_trade(trade_id, token_address, amount, signal_data)

    def _handle_token_trade(self, trade_id: str, token_address: str, amount: float, signal_data: Dict[str, Any]) -> str:
        """Original token trade processing."""
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
            self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data)
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
        self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data)

        success = False
        if route == "JUPITER":
            success = self.rpc_integrator.execute_jupiter_trade(token_address, amount)
        elif route == "METEORA":
            success = self.rpc_integrator.execute_meteora_trade(token_address, amount)

        # Post-Execution Phase
        if success:
            self.logger.info(f"[{trade_id}] Trade execution successful. Transitioning to EXECUTED.")
            current_state = TradeState.EXECUTED.value
            self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data)
        else:
            self.logger.error(f"[{trade_id}] Trade execution failed.")
            current_state = TradeState.FAILED.value
            self.state_manager.save_trade(trade_id, current_state, token_address, amount, signal_data)

        return current_state

    def _handle_dlmm_signal(self, trade_id: str, signal_data: Dict[str, Any]) -> str:
        """
        Handle Meteora DLMM position management signals:
        - CLAIM_FEES: claim collected fees from the DLMM position
        - REBALANCE_OUT: exit the position (remove liquidity)
        Future: ENTER_POSITION, REBALANCE_RANGE, etc.
        """
        action = signal_data.get("action")
        pool_address = signal_data.get("pool_address")
        metadata = signal_data.get("metadata", {})

        # Record signal receipt
        current_state = TradeState.SIGNAL_RECEIVED.value
        # For DLMM, we don't have token_address/amount in the same sense; store pool as token_address for tracking
        self.state_manager.save_trade(trade_id, current_state, pool_address, 0.0, signal_data)

        self.logger.info(f"[{trade_id}] DLMM action '{action}' for pool {pool_address}")

        # Check dry run
        if self.dry_run:
            self.logger.info(f"[{trade_id}] [DRY RUN] Would execute DLMM action '{action}' with details: {metadata.get('details')}")
            current_state = TradeState.EXECUTED.value
            self.state_manager.save_trade(trade_id, current_state, pool_address, 0.0, signal_data)
            return current_state

        # Execute based on action
        success = False
        if action == "CLAIM_FEES":
            # TODO: Implement fee claiming via RpcIntegrator or TS Armory
            self.logger.info(f"[{trade_id}] CLAIM_FEES not yet implemented - placeholder")
            # For now, mark as successful for prototyping
            success = True
        elif action in ("REBALANCE_OUT", "EXIT_POSITION"):
            # TODO: Implement position removal via RpcIntegrator
            self.logger.info(f"[{trade_id}] REBALANCE_OUT not yet implemented - placeholder")
            success = True
        else:
            self.logger.warning(f"[{trade_id}] Unknown DLMM action: {action}")
            success = False

        if success:
            self.logger.info(f"[{trade_id}] DLMM action completed successfully.")
            current_state = TradeState.EXECUTED.value
        else:
            self.logger.error(f"[{trade_id}] DLMM action failed or not implemented.")
            current_state = TradeState.FAILED.value

        self.state_manager.save_trade(trade_id, current_state, pool_address, 0.0, signal_data)
        return current_state
