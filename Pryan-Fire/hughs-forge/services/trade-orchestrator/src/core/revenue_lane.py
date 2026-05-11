"""Capped revenue-lane dry-run harness.

The harness proves the shortest earning path without live transaction submit:
strategy signal -> risk gate -> route -> quote/order probe -> signer readiness
-> execution plan -> accounting skeleton.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping, Protocol

from .risk_gate import RiskDecision, RiskGate


class QuoteClient(Protocol):
    def route_trade(self, token_address: str, amount_usd: float) -> str: ...

    def fetch_order_preview(self, signal: Mapping[str, Any]) -> Mapping[str, Any]: ...


@dataclass(frozen=True)
class RevenueLaneResult:
    status: str
    live_execution: bool
    signal: dict[str, Any]
    risk: dict[str, Any]
    route: str | None = None
    order_probe: dict[str, Any] | None = None
    signer: dict[str, Any] | None = None
    execution_plan: dict[str, Any] | None = None
    accounting: dict[str, Any] | None = None
    blocker: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class CappedRevenueLane:
    """Plan one capped earning lane while keeping live execution disabled."""

    def __init__(self, *, risk_gate: RiskGate | None = None, quote_client: QuoteClient | None = None) -> None:
        self.risk_gate = risk_gate or RiskGate()
        self.quote_client = quote_client

    def plan(self, signal: Mapping[str, Any], *, live_execution: bool = False) -> RevenueLaneResult:
        normalized = self._normalize_signal(signal)
        risk = self.risk_gate.assess(normalized, live_execution=live_execution)
        if not risk.allowed:
            return self._blocked(normalized, risk, risk.status)

        route = self._route(normalized)
        order_probe = self._order_probe(normalized)
        if not order_probe.get("ok", False):
            return RevenueLaneResult(
                status="BLOCKED_ORDER_PROBE",
                live_execution=live_execution,
                signal=normalized,
                risk=risk.to_dict(),
                route=route,
                order_probe=order_probe,
                blocker=str(order_probe.get("reason", "order probe failed")),
            )

        signer = self._signer_readiness(normalized)
        if live_execution and not signer.get("ready", False):
            return RevenueLaneResult(
                status="BLOCKED_SIGNER",
                live_execution=True,
                signal=normalized,
                risk=risk.to_dict(),
                route=route,
                order_probe=order_probe,
                signer=signer,
                blocker=str(signer.get("reason", "signer not ready")),
            )

        execution_plan = self._execution_plan(normalized, route, order_probe)
        accounting = self._accounting_plan(normalized)
        return RevenueLaneResult(
            status="DRY_RUN_PLAN_READY",
            live_execution=False,
            signal=normalized,
            risk=risk.to_dict(),
            route=route,
            order_probe=order_probe,
            signer=signer,
            execution_plan=execution_plan,
            accounting=accounting,
        )

    def _blocked(self, signal: dict[str, Any], risk: RiskDecision, status: str) -> RevenueLaneResult:
        return RevenueLaneResult(
            status=status,
            live_execution=risk.live_execution,
            signal=signal,
            risk=risk.to_dict(),
            blocker=risk.reason,
        )

    def _normalize_signal(self, signal: Mapping[str, Any]) -> dict[str, Any]:
        token_address = signal.get("token_address") or signal.get("mint") or signal.get("input_mint")
        amount_usd = float(signal.get("amount_usd", signal.get("amount", 0.0)))
        return {
            "strategy": signal.get("strategy", "capped_dlmm_volume_momentum"),
            "token_address": token_address,
            "input_mint": signal.get("input_mint", token_address),
            "output_mint": signal.get("output_mint", "USDC"),
            "amount_usd": amount_usd,
            "profit_target_bps": int(signal.get("profit_target_bps", 35)),
            "stop_loss_bps": int(signal.get("stop_loss_bps", 50)),
            "max_slippage_bps": int(signal.get("max_slippage_bps", 50)),
            "source": signal.get("source", "simulated"),
        }

    def _route(self, signal: Mapping[str, Any]) -> str:
        if self.quote_client:
            return self.quote_client.route_trade(str(signal["token_address"]), float(signal["amount_usd"]))
        return "JUPITER_ULTRA_ORDER_PROBE"

    def _order_probe(self, signal: Mapping[str, Any]) -> dict[str, Any]:
        if self.quote_client:
            return dict(self.quote_client.fetch_order_preview(signal))
        return {
            "ok": True,
            "mode": "simulated",
            "endpoint": "/ultra/v1/order",
            "non_executing": True,
            "requires_authorized_jupiter_key": True,
            "request_id_present": True,
            "transaction_present": True,
        }

    def _signer_readiness(self, signal: Mapping[str, Any]) -> dict[str, Any]:
        return {
            "ready": False,
            "mode": "not_loaded_in_dry_run",
            "reason": "dry-run plan does not load or expose key material",
            "owner_match_required_before_live": True,
        }

    def _execution_plan(self, signal: Mapping[str, Any], route: str, order_probe: Mapping[str, Any]) -> dict[str, Any]:
        return {
            "route": route,
            "submit_transaction": False,
            "max_size_usd": signal["amount_usd"],
            "profit_target_bps": signal["profit_target_bps"],
            "stop_loss_bps": signal["stop_loss_bps"],
            "max_slippage_bps": signal["max_slippage_bps"],
            "hard_rejects": [
                "missing_exit_quote",
                "stale_feed",
                "rpc_read_failure",
                "mock_approval_gate",
                "unsafe_liquidity_profile",
                "unreconciled_accounting",
            ],
            "order_probe_mode": order_probe.get("mode", "live_probe"),
        }

    def _accounting_plan(self, signal: Mapping[str, Any]) -> dict[str, Any]:
        return {
            "pre_trade_snapshot_required": True,
            "post_trade_snapshot_required": True,
            "position_reconciliation_required": True,
            "pnl_asset": "USDC",
            "ledger_event": "SIMULATED_REVENUE_LANE_PLAN",
        }
