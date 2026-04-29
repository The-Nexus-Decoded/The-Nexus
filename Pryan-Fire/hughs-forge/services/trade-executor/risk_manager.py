"""Risk management primitives for the trade executor.

Kept dependency-light so the risk policy can be unit-tested without
Solana/Jupiter runtime dependencies.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable, Optional

DEFAULT_FORCE_STOP_FILE = "/data/openclaw/trade_stop.lock"

_module_logger = logging.getLogger(__name__)


class RiskManager:
    """Manages trading risk, including limits, strategy scoring, and circuit breaker functionality."""

    def __init__(
        self,
        daily_loss_limit: float = -1000.0,
        max_trade_size: float = 100.0,
        mode: str = "SAFE",
        *,
        circuit_breaker_active: bool = False,
        force_stop_file: str = DEFAULT_FORCE_STOP_FILE,
        telemetry_callback: Optional[Callable[[str, dict], None]] = None,
        alert_callback: Optional[Callable[[str, int], None]] = None,
        logger: Optional[logging.Logger] = None,
    ):
        self.daily_loss_limit = daily_loss_limit
        self.max_trade_size = max_trade_size
        self.current_daily_loss = 0.0
        self.circuit_breaker_active = circuit_breaker_active
        self.force_stop_file = force_stop_file
        self.mode = mode  # DEGEN or SAFE
        self.strategy_risk_scores = {
            "Spot": 1,     # Conservative
            "Curve": 3,    # Moderate
            "BidAsk": 5,   # Aggressive
        }
        self._log_telemetry = telemetry_callback
        self._send_alert = alert_callback
        self._logger = logger or _module_logger

        self._logger.info("Risk Manager initialized in %s mode.", mode)
        self._logger.info("-> Daily Loss Limit: %s", self.daily_loss_limit)
        self._logger.info("-> Max Trade Size: %s", self.max_trade_size)
        self._logger.info("-> Strategy Risk Scores: %s", self.strategy_risk_scores)

    def check_strategy_risk(self, strategy: str, market_volatility: str) -> bool:
        """Veto aggressive strategies during high volatility."""
        score = self.strategy_risk_scores.get(strategy, 5)
        if market_volatility == "HIGH" and score >= 4:
            self._logger.warning("⚠️ Strategy VETO: %s is too aggressive for HIGH volatility.", strategy)
            return False
        return True

    def check_trade(self, proposed_trade_amount: float) -> bool:
        """Check whether a proposed trade adheres to risk parameters."""
        if self.force_stop_file and Path(self.force_stop_file).exists():
            self._logger.critical("🚨 TRADE VETOED: Force-stop lock file detected!")
            return False

        if self.circuit_breaker_active:
            self._logger.warning("Trade rejected: Circuit breaker is active.")
            self._emit_telemetry("RISK_BLOCK", {
                "reason": "CIRCUIT_BREAKER_ACTIVE",
                "proposed_amount": proposed_trade_amount,
            })
            return False

        if proposed_trade_amount > self.max_trade_size:
            self._logger.warning(
                "Trade rejected: Proposed amount (%s) exceeds max trade size (%s).",
                proposed_trade_amount,
                self.max_trade_size,
            )
            self._emit_telemetry("RISK_BLOCK", {
                "reason": "MAX_TRADE_SIZE_EXCEEDED",
                "proposed_amount": proposed_trade_amount,
                "max_size": self.max_trade_size,
            })
            return False

        self._logger.info("Trade approved by Risk Manager for amount: %s", proposed_trade_amount)
        return True

    def activate_circuit_breaker(self):
        """Activate the circuit breaker, halting all trading."""
        self.circuit_breaker_active = True
        self._logger.critical("🚨 CIRCUIT BREAKER ACTIVATED: All trading halted.")
        self._emit_alert(
            "🚨 **CIRCUIT BREAKER ACTIVATED**: All trading operations have been halted immediately.",
            color=15158332,
        )

    def deactivate_circuit_breaker(self):
        """Deactivate the circuit breaker, allowing trading to resume."""
        self.circuit_breaker_active = False
        self._logger.info("✅ CIRCUIT BREAKER DEACTIVATED: Trading can resume.")
        self._emit_alert(
            "✅ **CIRCUIT BREAKER DEACTIVATED**: Trading operations have resumed.",
            color=3066993,
        )

    def _emit_telemetry(self, event_type: str, data: dict):
        if self._log_telemetry:
            self._log_telemetry(event_type, data)

    def _emit_alert(self, content: str, *, color: int):
        if self._send_alert:
            self._send_alert(content, color=color)
