"""Fail-closed risk gate for capped revenue-lane planning.

This gate is deliberately small and dependency-light. Its job is not to
approve live money. Its job is to make sure every non-simulated lane stops
until a real owner-approval integration resolves it.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Mapping


DEFAULT_FORCE_STOP_FILE = "/data/openclaw/trade_stop.lock"
DEFAULT_MAX_CAPPED_LANE_USD = 25.0


@dataclass(frozen=True)
class RiskDecision:
    allowed: bool
    status: str
    reason: str
    amount_usd: float
    max_capped_lane_usd: float
    live_execution: bool
    requires_owner_approval: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RiskGate:
    """Validate capped-lane constraints before routing or execution.

    Live execution always fails closed until the caller supplies a real owner
    approval integration. Dry-run/sim lanes may continue below the cap so we can
    prove the full path without submitting transactions.
    """

    def __init__(
        self,
        *,
        max_capped_lane_usd: float = DEFAULT_MAX_CAPPED_LANE_USD,
        force_stop_file: str = DEFAULT_FORCE_STOP_FILE,
    ) -> None:
        self.max_capped_lane_usd = float(max_capped_lane_usd)
        self.force_stop_file = force_stop_file

    def assess(self, signal: Mapping[str, Any], *, live_execution: bool) -> RiskDecision:
        amount_usd = self._amount_usd(signal)

        if self.force_stop_file and Path(self.force_stop_file).exists():
            return self._blocked("FORCE_STOP_LOCK", "force-stop lock file is present", amount_usd, live_execution)

        if amount_usd <= 0:
            return self._blocked("INVALID_SIZE", "trade amount must be greater than zero", amount_usd, live_execution)

        if amount_usd > self.max_capped_lane_usd:
            return RiskDecision(
                allowed=False,
                status="AWAITING_OWNER_APPROVAL",
                reason=f"amount_usd exceeds capped lane limit ({self.max_capped_lane_usd})",
                amount_usd=amount_usd,
                max_capped_lane_usd=self.max_capped_lane_usd,
                live_execution=live_execution,
                requires_owner_approval=True,
            )

        if live_execution:
            return RiskDecision(
                allowed=False,
                status="AWAITING_OWNER_APPROVAL",
                reason="live execution requires explicit Lord Xar approval gate resolution",
                amount_usd=amount_usd,
                max_capped_lane_usd=self.max_capped_lane_usd,
                live_execution=True,
                requires_owner_approval=True,
            )

        return RiskDecision(
            allowed=True,
            status="DRY_RUN_APPROVED",
            reason="dry-run/sim lane below capped limit; no transaction submission permitted",
            amount_usd=amount_usd,
            max_capped_lane_usd=self.max_capped_lane_usd,
            live_execution=False,
            requires_owner_approval=False,
        )

    def _blocked(self, status: str, reason: str, amount_usd: float, live_execution: bool) -> RiskDecision:
        return RiskDecision(
            allowed=False,
            status=status,
            reason=reason,
            amount_usd=amount_usd,
            max_capped_lane_usd=self.max_capped_lane_usd,
            live_execution=live_execution,
            requires_owner_approval=live_execution,
        )

    @staticmethod
    def _amount_usd(signal: Mapping[str, Any]) -> float:
        raw = signal.get("amount_usd", signal.get("amount", 0.0))
        try:
            return float(raw)
        except (TypeError, ValueError):
            return 0.0
