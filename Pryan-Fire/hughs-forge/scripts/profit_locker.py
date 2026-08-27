#!/usr/bin/env python3
"""Pure workflow and accounting core for the Meteora DLMM profit locker.

This module deliberately does not sign or submit transactions.  It produces
scoped, idempotent actions for notification and execution adapters after all
state, accounting, authorization, and freshness checks have passed.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional, Tuple


SCHEMA_VERSION = 1
DEFAULT_TARGET_PROFIT_PCT = 30.0
MIN_TARGET_PROFIT_PCT = 10.0
MAX_TARGET_PROFIT_PCT = 80.0
DEFAULT_ENROLLMENT_REMINDER_SECONDS = 15 * 60

PENDING = "pending"
ENROLLED = "enrolled"
DECLINED = "declined"

RECOVERY_DISABLED = "disabled"
RECOVERY_AUTO_NOTIFY = "auto_notify"
RECOVERY_MODES = {RECOVERY_DISABLED, RECOVERY_AUTO_NOTIFY}

REQUIRED_RECOVERY_GUARDS = (
    "data_fresh",
    "owner_matches",
    "recovery_feasible",
    "price_impact_ok",
    "slippage_ok",
    "liquidity_ok",
    "hold_relative_drag_ok",
    "balance_ok",
    "simulation_ok",
)

REQUIRED_PROFIT_SWEEP_GUARDS = (
    "campaign_reconciled",
    "fee_provenance_reconciled",
    "all_sweepable_fees_in_sol",
    "destination_valid",
    "destination_distinct",
    "balance_ok",
    "network_fee_reserved",
    "simulation_ok",
)

REQUIRED_EXIT_SWEEP_GUARDS = (
    "campaign_close_reconciled",
    "exit_proceeds_provenance_reconciled",
    "all_exit_proceeds_in_sol",
    "destination_valid",
    "destination_distinct",
    "balance_ok",
    "network_fee_reserved",
    "simulation_ok",
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _iso(value: datetime) -> str:
    return _as_utc(value).isoformat().replace("+00:00", "Z")


def _parse_time(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        return _as_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))
    except ValueError:
        return None


def new_state() -> Dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "campaigns": {},
        "positions": {},
        "recovery_proposals": {},
    }


class AtomicJsonStore:
    """Small durable JSON store with atomic replacement and restrictive mode."""

    def __init__(self, path: str | Path):
        self.path = Path(path)

    def load(self) -> Dict[str, Any]:
        if not self.path.exists():
            return new_state()
        with self.path.open("r", encoding="utf-8") as handle:
            state = json.load(handle)
        if state.get("schema_version") != SCHEMA_VERSION:
            raise ValueError("unsupported_profit_locker_state_schema")
        state.setdefault("campaigns", {})
        state.setdefault("positions", {})
        state.setdefault("recovery_proposals", {})
        return state

    def save(self, state: Mapping[str, Any]) -> None:
        if state.get("schema_version") != SCHEMA_VERSION:
            raise ValueError("unsupported_profit_locker_state_schema")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temp_name = tempfile.mkstemp(
            prefix=f".{self.path.name}.", suffix=".tmp", dir=str(self.path.parent)
        )
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                json.dump(state, handle, indent=2, sort_keys=True)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            try:
                os.chmod(temp_name, 0o600)
            except OSError:
                pass
            os.replace(temp_name, self.path)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)


def position_key(wallet: str, pool: str, position: str) -> str:
    if not wallet or not pool or not position:
        raise ValueError("wallet_pool_and_position_are_required")
    return f"{wallet}:{pool}:{position}"


def _position_scope(record: Mapping[str, Any]) -> Dict[str, str]:
    return {
        "wallet": str(record["wallet"]),
        "pool": str(record["pool"]),
        "position": str(record["position"]),
    }


def _same_scope(expected: Mapping[str, Any], actual: Mapping[str, Any]) -> bool:
    return all(str(actual.get(key, "")) == str(value) for key, value in expected.items())


def _campaign_scope(campaign: Mapping[str, Any]) -> Dict[str, str]:
    return {
        "wallet": str(campaign["wallet"]),
        "pool": str(campaign["pool"]),
        "campaign_id": str(campaign["campaign_id"]),
    }


def sync_discovered_positions(
    state: MutableMapping[str, Any],
    wallet: str,
    positions: Iterable[Mapping[str, Any]],
    *,
    now: Optional[datetime] = None,
    reminder_seconds: int = DEFAULT_ENROLLMENT_REMINDER_SECONDS,
    channels: Iterable[str] = ("in_app", "email"),
) -> List[Dict[str, Any]]:
    """Register positions and emit due enrollment prompts.

    Enrollment never becomes approved through elapsed time. Pending positions
    continue producing reminders until an authenticated yes/no answer is stored.
    """
    if reminder_seconds <= 0:
        raise ValueError("reminder_seconds_must_be_positive")
    observed_at = _as_utc(now or utc_now())
    records = state.setdefault("positions", {})
    actions: List[Dict[str, Any]] = []

    for observed in positions:
        if observed.get("closed") or observed.get("stale"):
            continue
        pool = str(observed.get("pool") or observed.get("lb_pair") or "")
        position = str(observed.get("position") or "")
        if not pool or not position:
            continue
        key = position_key(wallet, pool, position)
        record = records.setdefault(
            key,
            {
                "wallet": wallet,
                "pool": pool,
                "position": position,
                "pool_name": observed.get("pool_name", "Unknown"),
                "enrollment_status": PENDING,
                "first_seen_at": _iso(observed_at),
                "last_seen_at": _iso(observed_at),
                "last_enrollment_prompt_at": None,
                "enrollment_prompt_count": 0,
            },
        )
        record["last_seen_at"] = _iso(observed_at)
        if observed.get("pool_name"):
            record["pool_name"] = observed["pool_name"]
        if record.get("enrollment_status") != PENDING:
            continue

        last_prompt = _parse_time(record.get("last_enrollment_prompt_at"))
        if last_prompt and (observed_at - last_prompt).total_seconds() < reminder_seconds:
            continue

        record["enrollment_prompt_count"] = int(record.get("enrollment_prompt_count", 0)) + 1
        record["last_enrollment_prompt_at"] = _iso(observed_at)
        actions.append(
            {
                "type": "request_enrollment",
                "idempotency_key": f"enrollment-prompt:{key}:{record['enrollment_prompt_count']}",
                "scope": _position_scope(record),
                "channels": list(channels),
                "prompt_count": record["enrollment_prompt_count"],
                "default_enrolled": False,
                "requires_explicit_yes_or_no": True,
            }
        )
    return actions


def record_enrollment_decision(
    state: MutableMapping[str, Any],
    key: str,
    *,
    enroll: bool,
    approved_by: str,
    auth_method: str,
    target_profit_pct: float = DEFAULT_TARGET_PROFIT_PCT,
    recovery_mode: str = RECOVERY_AUTO_NOTIFY,
    max_fee_sleeve_pct: float = 40.0,
    protected_reserve_pct: float = 0.0,
    max_range_price_multiple: float = 12.0,
    profit_vault_wallet: Optional[str] = None,
    profit_sweep_required: bool = True,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    record = state.get("positions", {}).get(key)
    if not record:
        raise KeyError("unknown_position")
    if not approved_by or not auth_method:
        raise ValueError("authenticated_operator_identity_required")
    decided_at = _as_utc(now or utc_now())

    if not enroll:
        record.update(
            {
                "enrollment_status": DECLINED,
                "enrollment_decided_at": _iso(decided_at),
                "enrollment_decided_by": approved_by,
                "enrollment_auth_method": auth_method,
                "policy": None,
            }
        )
        return record

    target = float(target_profit_pct)
    if not MIN_TARGET_PROFIT_PCT <= target <= MAX_TARGET_PROFIT_PCT:
        raise ValueError("target_profit_pct_must_be_between_10_and_80")
    if recovery_mode not in RECOVERY_MODES:
        raise ValueError("invalid_recovery_mode")
    if not 0 <= max_fee_sleeve_pct <= 100:
        raise ValueError("max_fee_sleeve_pct_out_of_range")
    if not 0 <= protected_reserve_pct <= 100:
        raise ValueError("protected_reserve_pct_out_of_range")
    if max_fee_sleeve_pct + protected_reserve_pct > 100:
        raise ValueError("fee_sleeve_and_reserve_exceed_inventory")
    if max_range_price_multiple <= 1:
        raise ValueError("max_range_price_multiple_must_exceed_one")
    source_wallet = str(record["wallet"])
    destination_wallet = str(profit_vault_wallet or "").strip()
    if profit_sweep_required and not destination_wallet:
        raise ValueError("profit_vault_wallet_required_for_enrollment")
    if destination_wallet and destination_wallet == source_wallet:
        raise ValueError("profit_vault_must_differ_from_source_wallet")

    root_scope = _position_scope(record)
    campaign_id = record.get("campaign_id") or (
        "campaign:" + hashlib.sha256(
            f"{root_scope['wallet']}:{root_scope['pool']}:{root_scope['position']}".encode("utf-8")
        ).hexdigest()[:24]
    )
    policy = {
        "root_scope": root_scope,
        "target_profit_pct": target,
        "recovery_mode": recovery_mode,
        "autonomous_recovery_authorized": recovery_mode == RECOVERY_AUTO_NOTIFY,
        "max_fee_sleeve_pct": float(max_fee_sleeve_pct),
        "protected_reserve_pct": float(protected_reserve_pct),
        "max_range_price_multiple": float(max_range_price_multiple),
        "future_fees_may_satisfy_target": False,
        "profit_sweep": {
            "required": bool(profit_sweep_required),
            "asset": "SOL",
            "destination_wallet": destination_wallet or None,
            "principal_may_be_swept": False,
        },
    }
    campaign = state.setdefault("campaigns", {}).setdefault(
        campaign_id,
        {
            "campaign_id": campaign_id,
            "wallet": record["wallet"],
            "pool": record["pool"],
            "root_position": record["position"],
            "status": "active",
            "created_at": _iso(decided_at),
            "position_keys": [],
        },
    )
    campaign["policy"] = policy
    if key not in campaign["position_keys"]:
        campaign["position_keys"].append(key)
    record.update(
        {
            "campaign_id": campaign_id,
            "enrollment_status": ENROLLED,
            "enrollment_decided_at": _iso(decided_at),
            "enrollment_decided_by": approved_by,
            "enrollment_auth_method": auth_method,
            "policy": policy,
        }
    )
    return record


def attach_campaign_child_position(
    state: MutableMapping[str, Any],
    campaign_id: str,
    position: Mapping[str, Any],
    *,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Attach an engine-created replacement position without a new enrollment prompt."""
    campaign = state.get("campaigns", {}).get(campaign_id)
    if not campaign or campaign.get("status") != "active":
        raise KeyError("unknown_or_inactive_campaign")
    wallet = str(position.get("wallet") or "")
    pool = str(position.get("pool") or position.get("lb_pair") or "")
    address = str(position.get("position") or "")
    if wallet != str(campaign["wallet"]) or pool != str(campaign["pool"]) or not address:
        raise ValueError("campaign_child_scope_mismatch")
    key = position_key(wallet, pool, address)
    attached_at = _as_utc(now or utc_now())
    record = state.setdefault("positions", {}).setdefault(key, {})
    record.update(
        {
            "wallet": wallet,
            "pool": pool,
            "position": address,
            "pool_name": position.get("pool_name", "Unknown"),
            "campaign_id": campaign_id,
            "managed_child": True,
            "enrollment_status": ENROLLED,
            "enrollment_decided_at": campaign["created_at"],
            "enrollment_decided_by": "inherited_campaign_policy",
            "enrollment_auth_method": "campaign_scope",
            "first_seen_at": record.get("first_seen_at", _iso(attached_at)),
            "last_seen_at": _iso(attached_at),
            "policy": campaign["policy"],
        }
    )
    if key not in campaign["position_keys"]:
        campaign["position_keys"].append(key)
    return record


def _money_rows(snapshot: Mapping[str, Any], field: str, reasons: List[str]) -> Tuple[float, List[str]]:
    rows = snapshot.get(field)
    if not isinstance(rows, list):
        reasons.append(f"missing_{field}")
        return 0.0, []
    total = 0.0
    source_ids: List[str] = []
    for row in rows:
        if not isinstance(row, Mapping):
            reasons.append(f"invalid_{field}_component")
            continue
        source_id = str(row.get("source_id") or "")
        try:
            value = float(row.get("usd"))
        except (TypeError, ValueError):
            reasons.append(f"invalid_{field}_value")
            continue
        if not source_id or value < 0:
            reasons.append(f"invalid_{field}_component")
            continue
        source_ids.append(source_id)
        total += value
    return total, source_ids


def calculate_net_profit(snapshot: Mapping[str, Any], *, now: Optional[datetime] = None) -> Dict[str, Any]:
    """Calculate lifecycle PnL from provenance-tagged, non-overlapping values."""
    evaluated_at = _as_utc(now or utc_now())
    reasons: List[str] = []
    if not snapshot.get("basis_complete"):
        reasons.append("cost_basis_incomplete")

    valuation_at = _parse_time(snapshot.get("valuation_at"))
    max_age_seconds = int(snapshot.get("max_age_seconds", 120) or 120)
    if not valuation_at:
        reasons.append("valuation_timestamp_missing")
    elif valuation_at > evaluated_at + timedelta(seconds=30):
        reasons.append("valuation_timestamp_in_future")
    elif (evaluated_at - valuation_at).total_seconds() > max_age_seconds:
        reasons.append("valuation_stale")

    basis, basis_sources = _money_rows(snapshot, "capital_contributions", reasons)
    realized, realized_sources = _money_rows(snapshot, "realized_liquidity_proceeds", reasons)
    claimed, claimed_sources = _money_rows(snapshot, "claimed_fees", reasons)
    costs, cost_sources = _money_rows(snapshot, "execution_costs", reasons)
    current_exit, current_sources = _money_rows(snapshot, "current_exit_value", reasons)
    unclaimed, unclaimed_sources = _money_rows(snapshot, "unclaimed_fees", reasons)

    all_sources = basis_sources + realized_sources + claimed_sources + cost_sources + current_sources + unclaimed_sources
    if len(all_sources) != len(set(all_sources)):
        reasons.append("duplicate_value_source_detected")
    if basis <= 0:
        reasons.append("positive_cost_basis_required")
    if len(current_sources) != 1:
        reasons.append("exactly_one_current_exit_valuation_required")

    unclaimed_counted = 0.0 if snapshot.get("current_exit_includes_unclaimed_fees") else unclaimed
    gross_value = realized + claimed + current_exit + unclaimed_counted
    net_profit = gross_value - basis - costs
    profit_pct = (net_profit / basis * 100.0) if basis > 0 else 0.0
    return {
        "ready": not reasons,
        "reasons": sorted(set(reasons)),
        "cost_basis_usd": basis,
        "realized_liquidity_proceeds_usd": realized,
        "claimed_fees_usd": claimed,
        "current_exit_value_usd": current_exit,
        "unclaimed_fees_usd": unclaimed,
        "unclaimed_fees_counted_usd": unclaimed_counted,
        "execution_costs_usd": costs,
        "gross_recovery_value_usd": gross_value,
        "net_profit_usd": net_profit,
        "profit_pct": profit_pct,
    }


def evaluate_profit_target(
    state: MutableMapping[str, Any],
    key: str,
    snapshot: Mapping[str, Any],
    *,
    now: Optional[datetime] = None,
) -> Optional[Dict[str, Any]]:
    record = state.get("positions", {}).get(key)
    if not record or record.get("enrollment_status") != ENROLLED:
        return None
    campaign = state.get("campaigns", {}).get(record.get("campaign_id"))
    if not campaign or campaign.get("status") != "active":
        return None
    if not _same_scope(_campaign_scope(campaign), snapshot.get("scope", {})):
        return None
    calculation = calculate_net_profit(snapshot, now=now)
    target = float(campaign["policy"]["target_profit_pct"])
    if not calculation["ready"] or calculation["profit_pct"] < target:
        return None
    sweep_policy = campaign["policy"].get("profit_sweep", {})
    if sweep_policy.get("required") and not sweep_policy.get("destination_wallet"):
        return None
    existing = campaign.get("profit_trigger")
    if existing:
        return None
    triggered_at = _as_utc(now or utc_now())
    idempotency_key = f"profit-close:{campaign['campaign_id']}"
    campaign["profit_trigger"] = {
        "status": "pending_execution",
        "triggered_at": _iso(triggered_at),
        "idempotency_key": idempotency_key,
        "calculation": calculation,
    }
    return {
        "type": "preflight_profit_close",
        "idempotency_key": idempotency_key,
        "scope": _campaign_scope(campaign),
        "managed_position_keys": list(campaign["position_keys"]),
        "target_profit_pct": target,
        "calculation": calculation,
        "settlement": {
            "convert_proceeds_to": "SOL",
            "profit_sweep_required": bool(sweep_policy.get("required")),
            "profit_vault_wallet": sweep_policy.get("destination_wallet"),
            "principal_may_be_swept": False,
        },
    }


def prepare_profit_sweep(
    state: MutableMapping[str, Any],
    campaign_id: str,
    settlement: Mapping[str, Any],
    guards: Mapping[str, Any],
    *,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Prepare a fee-funded SOL transfer after total campaign equity reaches break-even."""
    campaign = state.get("campaigns", {}).get(campaign_id)
    if not campaign or campaign.get("status") != "active":
        raise KeyError("unknown_or_inactive_campaign")
    policy = campaign.get("policy", {}).get("profit_sweep", {})
    if policy.get("required") is not True:
        raise ValueError("profit_sweep_not_required")
    destination = str(policy.get("destination_wallet") or "")
    source = str(campaign.get("wallet") or "")
    reasons = [
        f"guard_failed:{name}"
        for name in REQUIRED_PROFIT_SWEEP_GUARDS
        if guards.get(name) is not True
    ]
    if not destination:
        reasons.append("profit_vault_wallet_missing")
    if destination == source:
        reasons.append("profit_vault_matches_source_wallet")
    if not _same_scope(_campaign_scope(campaign), settlement.get("scope", {})):
        reasons.append("scope_mismatch")
    try:
        positions_value_sol = float(settlement.get("positions_executable_value_sol"))
        cumulative_net_fees_sol = float(settlement.get("cumulative_net_fees_earned_sol"))
        realized_fee_sol = float(settlement.get("realized_fee_sol_available"))
        required_reserve_sol = float(settlement.get("required_source_wallet_reserve_sol"))
        transfer_fee_budget_sol = float(settlement.get("transfer_fee_budget_sol"))
        break_even_basis_sol = float(settlement.get("break_even_basis_sol"))
    except (TypeError, ValueError):
        reasons.append("invalid_profit_sweep_values")
        positions_value_sol = cumulative_net_fees_sol = realized_fee_sol = 0.0
        required_reserve_sol = transfer_fee_budget_sol = break_even_basis_sol = 0.0
    campaign_return_value_sol = positions_value_sol + cumulative_net_fees_sol
    spendable_fee_sol = realized_fee_sol - required_reserve_sol - transfer_fee_budget_sol
    if realized_fee_sol <= 0:
        reasons.append("no_realized_fee_sol_available")
    if min(
        positions_value_sol,
        cumulative_net_fees_sol,
        realized_fee_sol,
        required_reserve_sol,
        transfer_fee_budget_sol,
        break_even_basis_sol,
    ) < 0:
        reasons.append("negative_profit_sweep_value")
    if campaign_return_value_sol + 1e-12 < break_even_basis_sol:
        reasons.append("positions_plus_fees_have_not_reached_break_even")
    amount_sol = round(spendable_fee_sol, 12)
    if amount_sol <= 0:
        reasons.append("no_realized_fee_batch_available_to_sweep")
    existing = campaign.get("profit_sweep")
    if existing and existing.get("status") == "pending_execution":
        return {
            "type": "profit_sweep_already_exists",
            "idempotency_key": existing["idempotency_key"],
            "status": existing["status"],
            "scope": _campaign_scope(campaign),
        }
    if reasons:
        return {
            "type": "profit_sweep_blocked",
            "scope": _campaign_scope(campaign),
            "reasons": sorted(set(reasons)),
        }

    prepared_at = _as_utc(now or utc_now())
    fingerprint = _fingerprint(
        {
            "campaign_id": campaign_id,
            "source": source,
            "destination": destination,
            "amount_sol": amount_sol,
            "positions_executable_value_sol": positions_value_sol,
            "cumulative_net_fees_earned_sol": cumulative_net_fees_sol,
            "realized_fee_sol_available": realized_fee_sol,
            "campaign_return_value_sol": campaign_return_value_sol,
            "break_even_basis_sol": break_even_basis_sol,
        }
    )
    sweep = {
        "status": "pending_execution",
        "idempotency_key": f"profit-sweep:{campaign_id}:{fingerprint[:16]}",
        "prepared_at": _iso(prepared_at),
        "source_wallet": source,
        "destination_wallet": destination,
        "asset": "SOL",
        "amount_sol": amount_sol,
        "funding_source": "realized_campaign_fees_only",
        "principal_may_be_swept": False,
        "break_even_basis_sol": break_even_basis_sol,
        "positions_executable_value_sol": positions_value_sol,
        "cumulative_net_fees_earned_sol": cumulative_net_fees_sol,
        "realized_fee_sol_available": realized_fee_sol,
        "campaign_return_value_before_sweep_sol": campaign_return_value_sol,
        "campaign_return_value_after_sweep_sol": round(
            campaign_return_value_sol - transfer_fee_budget_sol, 12
        ),
        "settlement_fingerprint": fingerprint,
    }
    campaign["profit_sweep"] = sweep
    return {"type": "preflight_profit_sweep", "scope": _campaign_scope(campaign), **sweep}


def prepare_exit_profit_sweep(
    state: MutableMapping[str, Any],
    campaign_id: str,
    settlement: Mapping[str, Any],
    guards: Mapping[str, Any],
    *,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Keep entry principal in the trading wallet and sweep only proven exit excess."""
    campaign = state.get("campaigns", {}).get(campaign_id)
    if not campaign:
        raise KeyError("unknown_campaign")
    policy = campaign.get("policy", {}).get("profit_sweep", {})
    destination = str(policy.get("destination_wallet") or "")
    source = str(campaign.get("wallet") or "")
    reasons = [
        f"guard_failed:{name}"
        for name in REQUIRED_EXIT_SWEEP_GUARDS
        if guards.get(name) is not True
    ]
    if not destination:
        reasons.append("profit_vault_wallet_missing")
    if destination == source:
        reasons.append("profit_vault_matches_source_wallet")
    if not _same_scope(_campaign_scope(campaign), settlement.get("scope", {})):
        reasons.append("scope_mismatch")
    try:
        exit_proceeds_sol = float(settlement.get("exit_transaction_sol_proceeds"))
        available_exit_proceeds_sol = float(settlement.get("available_proven_exit_proceeds_sol"))
        entry_basis_sol = float(settlement.get("entry_basis_sol"))
        transfer_fee_budget_sol = float(settlement.get("transfer_fee_budget_sol"))
    except (TypeError, ValueError):
        reasons.append("invalid_exit_sweep_values")
        exit_proceeds_sol = available_exit_proceeds_sol = entry_basis_sol = transfer_fee_budget_sol = 0.0
    if min(exit_proceeds_sol, available_exit_proceeds_sol, entry_basis_sol, transfer_fee_budget_sol) < 0:
        reasons.append("negative_exit_sweep_value")
    attributable_exit_sol = min(exit_proceeds_sol, available_exit_proceeds_sol)
    amount_sol = round(attributable_exit_sol - entry_basis_sol - transfer_fee_budget_sol, 12)
    if amount_sol <= 0:
        reasons.append("no_exit_profit_above_entry_basis")
    existing = campaign.get("profit_sweep")
    if existing and existing.get("status") == "pending_execution":
        return {
            "type": "profit_sweep_already_exists",
            "idempotency_key": existing["idempotency_key"],
            "status": existing["status"],
            "scope": _campaign_scope(campaign),
        }
    if reasons:
        return {"type": "exit_profit_sweep_blocked", "scope": _campaign_scope(campaign), "reasons": sorted(set(reasons))}

    prepared_at = _as_utc(now or utc_now())
    fingerprint = _fingerprint(
        {
            "campaign_id": campaign_id,
            "source": source,
            "destination": destination,
            "exit_transaction_sol_proceeds": exit_proceeds_sol,
            "available_proven_exit_proceeds_sol": available_exit_proceeds_sol,
            "entry_basis_sol": entry_basis_sol,
            "transfer_fee_budget_sol": transfer_fee_budget_sol,
            "amount_sol": amount_sol,
        }
    )
    sweep = {
        "status": "pending_execution",
        "kind": "post_close_exit_profit",
        "idempotency_key": f"exit-profit-sweep:{campaign_id}:{fingerprint[:16]}",
        "prepared_at": _iso(prepared_at),
        "source_wallet": source,
        "destination_wallet": destination,
        "asset": "SOL",
        "amount_sol": amount_sol,
        "funding_source": "proven_exit_transaction_proceeds_only",
        "entry_basis_retained_sol": entry_basis_sol,
        "unrelated_wallet_sol_may_be_swept": False,
        "principal_may_be_swept": False,
        "settlement_fingerprint": fingerprint,
    }
    campaign["profit_sweep"] = sweep
    return {"type": "preflight_exit_profit_sweep", "scope": _campaign_scope(campaign), **sweep}


def finalize_profit_sweep(
    state: MutableMapping[str, Any],
    campaign_id: str,
    *,
    idempotency_key: str,
    amount_sol: float,
    signature: str,
    finalized_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Record a finalized transfer exactly once after on-chain reconciliation."""
    campaign = state.get("campaigns", {}).get(campaign_id)
    sweep = campaign.get("profit_sweep") if campaign else None
    if not isinstance(sweep, MutableMapping):
        raise KeyError("profit_sweep_not_prepared")
    if sweep.get("idempotency_key") != idempotency_key:
        raise ValueError("profit_sweep_idempotency_mismatch")
    if sweep.get("status") == "finalized":
        return dict(sweep)
    if sweep.get("status") != "pending_execution":
        raise ValueError("profit_sweep_not_pending")
    if abs(float(amount_sol) - float(sweep["amount_sol"])) > 1e-12:
        raise ValueError("profit_sweep_amount_mismatch")
    if not signature:
        raise ValueError("finalized_signature_required")
    sweep.update(
        {
            "status": "finalized",
            "signature": signature,
            "finalized_at": _iso(_as_utc(finalized_at or utc_now())),
        }
    )
    campaign.setdefault("profit_sweep_history", []).append(dict(sweep))
    campaign["profit_swept_sol"] = float(campaign.get("profit_swept_sol", 0.0) or 0.0) + float(amount_sol)
    return dict(sweep)


def _recovery_plan_reasons(
    record: Mapping[str, Any],
    plan: Mapping[str, Any],
    guards: Mapping[str, Any],
    now: datetime,
) -> List[str]:
    reasons = [f"guard_failed:{name}" for name in REQUIRED_RECOVERY_GUARDS if guards.get(name) is not True]
    if not _same_scope(_position_scope(record), plan.get("scope", {})):
        reasons.append("scope_mismatch")
    generated_at = _parse_time(plan.get("generated_at"))
    max_age_seconds = int(plan.get("max_age_seconds", 60) or 60)
    if not generated_at or generated_at > now + timedelta(seconds=30):
        reasons.append("invalid_plan_timestamp")
    elif (now - generated_at).total_seconds() > max_age_seconds:
        reasons.append("plan_stale")
    if plan.get("strategy") != "bid_ask_upward_two_position":
        reasons.append("unsupported_recovery_strategy")
    if plan.get("future_fees_counted_toward_target") is not False:
        reasons.append("future_fees_cannot_prove_target")

    policy = record.get("policy", {})
    target = float(policy.get("target_profit_pct", 0))
    try:
        deterministic_profit = float(plan.get("deterministic_recovery_profit_pct"))
        live_price = float(plan.get("live_price"))
        top_price = float(plan.get("range_top_price"))
        active_bin = int(plan.get("active_bin_id"))
        min_bin = int(plan.get("min_bin_id"))
        max_bin = int(plan.get("max_bin_id"))
        fee_sleeve_pct = float(plan.get("fee_sleeve_pct"))
        reserve_pct = float(plan.get("protected_reserve_pct"))
        ladder_pct = float(plan.get("recovery_ladder_pct"))
    except (TypeError, ValueError):
        reasons.append("invalid_recovery_plan_values")
        return sorted(set(reasons))

    if deterministic_profit < target:
        reasons.append("deterministic_target_not_reached")
    if live_price <= 0 or top_price <= live_price:
        reasons.append("invalid_recovery_price_range")
    elif top_price / live_price > float(policy.get("max_range_price_multiple", 0)):
        reasons.append("range_multiple_exceeds_enrollment_limit")
    if min_bin != active_bin or max_bin <= min_bin:
        reasons.append("range_must_start_at_live_bin_and_move_upward")
    if not 0 <= fee_sleeve_pct <= float(policy.get("max_fee_sleeve_pct", 0)):
        reasons.append("fee_sleeve_exceeds_enrollment_limit")
    if reserve_pct < float(policy.get("protected_reserve_pct", 0)):
        reasons.append("protected_reserve_below_enrollment_floor")
    if any(value < 0 or value > 100 for value in (fee_sleeve_pct, reserve_pct, ladder_pct)):
        reasons.append("invalid_inventory_allocation")
    elif fee_sleeve_pct + reserve_pct + ladder_pct > 100.000001:
        reasons.append("inventory_allocation_exceeds_100_pct")
    return sorted(set(reasons))


def _fingerprint(payload: Mapping[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def propose_recovery(
    state: MutableMapping[str, Any],
    key: str,
    plan: Mapping[str, Any],
    guards: Mapping[str, Any],
    *,
    now: Optional[datetime] = None,
    channels: Iterable[str] = ("in_app", "email"),
) -> Dict[str, Any]:
    record = state.get("positions", {}).get(key)
    if not record or record.get("enrollment_status") != ENROLLED:
        raise ValueError("position_not_enrolled")
    policy = record.get("policy", {})
    mode = policy.get("recovery_mode", RECOVERY_DISABLED)
    if mode == RECOVERY_DISABLED:
        raise ValueError("recovery_disabled_for_position")
    if mode != RECOVERY_AUTO_NOTIFY or policy.get("autonomous_recovery_authorized") is not True:
        raise ValueError("autonomous_recovery_not_authorized")
    proposed_at = _as_utc(now or utc_now())
    reasons = _recovery_plan_reasons(record, plan, guards, proposed_at)
    if reasons:
        return {
            "type": "recovery_plan_rejected",
            "scope": _position_scope(record),
            "reasons": reasons,
        }

    active_id = record.get("active_recovery_proposal_id")
    active = state.setdefault("recovery_proposals", {}).get(active_id) if active_id else None
    if active and active.get("status") in {"awaiting_preflight", "ready_for_execution"}:
        return {
            "type": "recovery_proposal_already_active",
            "proposal_id": active_id,
            "scope": _position_scope(record),
        }

    plan_hash = _fingerprint(plan)
    proposal_id = f"recovery:{hashlib.sha256((key + _iso(proposed_at) + plan_hash).encode()).hexdigest()[:24]}"
    proposal = {
        "proposal_id": proposal_id,
        "position_key": key,
        "scope": _position_scope(record),
        "mode": mode,
        "status": "awaiting_preflight",
        "proposed_at": _iso(proposed_at),
        "authorization_source": "position_enrollment",
        "plan_fingerprint": plan_hash,
        "plan": dict(plan),
    }
    state["recovery_proposals"][proposal_id] = proposal
    record["active_recovery_proposal_id"] = proposal_id
    return {
        "type": "notify_and_preflight_recovery",
        "proposal_id": proposal_id,
        "scope": _position_scope(record),
        "channels": list(channels),
        "authorization_source": "position_enrollment",
        "plan": dict(plan),
    }


def finalize_recovery_preflight(
    state: MutableMapping[str, Any],
    proposal_id: str,
    fresh_plan: Mapping[str, Any],
    fresh_guards: Mapping[str, Any],
    *,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    proposal = state.get("recovery_proposals", {}).get(proposal_id)
    if not proposal:
        raise KeyError("unknown_recovery_proposal")
    if proposal.get("status") != "awaiting_preflight":
        raise ValueError("recovery_proposal_not_awaiting_preflight")
    record = state.get("positions", {}).get(proposal["position_key"])
    if not record or record.get("enrollment_status") != ENROLLED:
        raise ValueError("position_no_longer_enrolled")

    checked_at = _as_utc(now or utc_now())
    reasons = _recovery_plan_reasons(record, fresh_plan, fresh_guards, checked_at)
    if reasons:
        proposal.update(
            {
                "status": "failed_closed",
                "preflight_at": _iso(checked_at),
                "preflight_reasons": reasons,
            }
        )
        return {
            "type": "recovery_open_blocked",
            "proposal_id": proposal_id,
            "scope": proposal["scope"],
            "reasons": reasons,
        }

    fresh_hash = _fingerprint(fresh_plan)
    idempotency_key = f"recovery-open:{proposal_id}:{fresh_hash[:16]}"
    proposal.update(
        {
            "status": "ready_for_execution",
            "preflight_at": _iso(checked_at),
            "fresh_plan_fingerprint": fresh_hash,
            "execution_idempotency_key": idempotency_key,
        }
    )
    return {
        "type": "open_recovery_bidask_pair",
        "proposal_id": proposal_id,
        "idempotency_key": idempotency_key,
        "scope": proposal["scope"],
        "authorization_source": proposal.get("authorization_source"),
        "plan": dict(fresh_plan),
    }


def acquire_position_execution_lease(
    state: MutableMapping[str, Any],
    key: str,
    *,
    action: str,
    worker_id: str,
    ttl_seconds: int = 120,
    now: Optional[datetime] = None,
) -> Optional[Dict[str, Any]]:
    """Acquire an independent lease so positions can run concurrently without duplication."""
    record = state.get("positions", {}).get(key)
    if not record or record.get("enrollment_status") != ENROLLED:
        raise ValueError("position_not_enrolled")
    if not action or not worker_id or ttl_seconds <= 0:
        raise ValueError("valid_action_worker_and_ttl_required")
    acquired_at = _as_utc(now or utc_now())
    existing = record.get("execution_lease")
    existing_expiry = _parse_time(existing.get("expires_at")) if isinstance(existing, Mapping) else None
    if existing and existing_expiry and existing_expiry > acquired_at:
        return None
    token = hashlib.sha256(
        f"{key}:{action}:{worker_id}:{_iso(acquired_at)}".encode("utf-8")
    ).hexdigest()
    lease = {
        "token": token,
        "action": action,
        "worker_id": worker_id,
        "acquired_at": _iso(acquired_at),
        "expires_at": _iso(acquired_at + timedelta(seconds=ttl_seconds)),
    }
    record["execution_lease"] = lease
    return lease


def release_position_execution_lease(
    state: MutableMapping[str, Any], key: str, lease_token: str
) -> bool:
    record = state.get("positions", {}).get(key)
    existing = record.get("execution_lease") if record else None
    if not isinstance(existing, Mapping) or existing.get("token") != lease_token:
        return False
    record.pop("execution_lease", None)
    return True
