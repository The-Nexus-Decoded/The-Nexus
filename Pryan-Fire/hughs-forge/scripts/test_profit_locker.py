#!/usr/bin/env python3
"""Contract tests for the deterministic Meteora profit-locker core."""

from __future__ import annotations

import ast
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

import profit_locker


NOW = datetime(2026, 8, 27, 4, 0, tzinfo=timezone.utc)
WALLET = "wallet-owner"
POOL = "pool-sparky-sol"
POSITION = "position-sparky-1"
VAULT = "wallet-profit-vault"


def _discover(state, *, position=POSITION, pool=POOL, now=NOW):
    return profit_locker.sync_discovered_positions(
        state,
        WALLET,
        [{"pool": pool, "position": position, "pool_name": "SPARKY-SOL"}],
        now=now,
    )


def _enroll(
    state,
    *,
    position=POSITION,
    pool=POOL,
    target=30.0,
    fee_sleeve=40.0,
    reserve=0.0,
    max_multiple=12.0,
):
    _discover(state, position=position, pool=pool)
    key = profit_locker.position_key(WALLET, pool, position)
    profit_locker.record_enrollment_decision(
        state,
        key,
        enroll=True,
        approved_by="owner",
        auth_method="signed_in_app",
        target_profit_pct=target,
        max_fee_sleeve_pct=fee_sleeve,
        protected_reserve_pct=reserve,
        max_range_price_multiple=max_multiple,
        profit_vault_wallet=VAULT,
        now=NOW,
    )
    return key


def _snapshot(*, position=POSITION, pool=POOL, exit_value=1100.0, claimed=100.0):
    return {
        "scope": {"wallet": WALLET, "pool": pool, "position": position},
        "basis_complete": True,
        "valuation_at": NOW.isoformat(),
        "max_age_seconds": 120,
        "capital_contributions": [
            {"source_id": "deposit:campaign:1", "usd": 1000.0},
            {"source_id": "deposit:campaign:2", "usd": 200.0},
        ],
        "realized_liquidity_proceeds": [
            {"source_id": "withdrawal:child-position:1", "usd": 125.0}
        ],
        "claimed_fees": [{"source_id": "claim:campaign:1", "usd": claimed}],
        "execution_costs": [
            {"source_id": "swap-fee:1", "usd": 5.0},
            {"source_id": "priority-fee:1", "usd": 2.0},
        ],
        "current_exit_value": [{"source_id": "quote:campaign:current", "usd": exit_value}],
        "unclaimed_fees": [{"source_id": "position:unclaimed:current", "usd": 25.0}],
        "current_exit_includes_unclaimed_fees": True,
    }


def _valid_plan(*, position=POSITION, pool=POOL, generated_at=NOW, top_multiple=8.5):
    return {
        "scope": {"wallet": WALLET, "pool": pool, "position": position},
        "generated_at": generated_at.isoformat(),
        "max_age_seconds": 60,
        "strategy": "bid_ask_upward_two_position",
        "future_fees_counted_toward_target": False,
        "deterministic_recovery_profit_pct": 32.0,
        "live_price": 1.0,
        "range_top_price": top_multiple,
        "active_bin_id": 100,
        "min_bin_id": 100,
        "max_bin_id": 800,
        "fee_sleeve_pct": 5.0,
        "protected_reserve_pct": 0.0,
        "recovery_ladder_pct": 95.0,
        "positions": [
            {"role": "wide_upward_recovery_ladder", "starts_at_active_bin": True},
            {"role": "tight_upward_fee_sleeve", "starts_at_active_bin": True},
        ],
    }


def _passing_guards():
    return {name: True for name in profit_locker.REQUIRED_RECOVERY_GUARDS}


def test_positions_default_pending_and_nag_until_explicit_answer():
    state = profit_locker.new_state()

    first = _discover(state)
    assert first[0]["type"] == "request_enrollment"
    assert first[0]["default_enrolled"] is False
    assert first[0]["requires_explicit_yes_or_no"] is True
    assert first[0]["channels"] == ["in_app", "email"]

    key = profit_locker.position_key(WALLET, POOL, POSITION)
    assert state["positions"][key]["enrollment_status"] == profit_locker.PENDING
    assert _discover(state, now=NOW + timedelta(minutes=14, seconds=59)) == []

    reminder = _discover(state, now=NOW + timedelta(minutes=15))
    assert reminder[0]["prompt_count"] == 2
    assert reminder[0]["idempotency_key"] != first[0]["idempotency_key"]

    profit_locker.record_enrollment_decision(
        state,
        key,
        enroll=False,
        approved_by="owner",
        auth_method="signed_in_app",
        now=NOW + timedelta(minutes=16),
    )
    assert _discover(state, now=NOW + timedelta(days=1)) == []
    assert state["positions"][key]["enrollment_status"] == profit_locker.DECLINED


@pytest.mark.parametrize("target", [10.0, 30.0, 80.0])
def test_enrollment_creates_durable_scoped_campaign_authorization(target, tmp_path):
    state = profit_locker.new_state()
    key = _enroll(state, target=target)
    policy = state["positions"][key]["policy"]

    assert state["positions"][key]["enrollment_status"] == profit_locker.ENROLLED
    assert policy["root_scope"] == {"wallet": WALLET, "pool": POOL, "position": POSITION}
    assert policy["target_profit_pct"] == target
    assert policy["autonomous_recovery_authorized"] is True
    assert policy["future_fees_may_satisfy_target"] is False
    assert policy["profit_sweep"]["required"] is True
    assert policy["profit_sweep"]["destination_wallet"] == VAULT
    assert policy["profit_sweep"]["principal_may_be_swept"] is False

    campaign_id = state["positions"][key]["campaign_id"]
    assert state["campaigns"][campaign_id]["position_keys"] == [key]
    assert state["campaigns"][campaign_id]["policy"] == policy

    store = profit_locker.AtomicJsonStore(tmp_path / "profit-locker-state.json")
    store.save(state)
    restored = store.load()
    assert restored["positions"][key]["policy"] == policy


@pytest.mark.parametrize("target", [9.99, 80.01])
def test_enrollment_rejects_profit_targets_outside_10_to_80(target):
    state = profit_locker.new_state()
    _discover(state)
    key = profit_locker.position_key(WALLET, POOL, POSITION)

    with pytest.raises(ValueError, match="between_10_and_80"):
        profit_locker.record_enrollment_decision(
            state,
            key,
            enroll=True,
            approved_by="owner",
            auth_method="signed_in_app",
            target_profit_pct=target,
            profit_vault_wallet=VAULT,
        )


def test_enrollment_requires_a_distinct_profit_vault_when_sweep_is_active():
    state = profit_locker.new_state()
    _discover(state)
    key = profit_locker.position_key(WALLET, POOL, POSITION)

    with pytest.raises(ValueError, match="profit_vault_wallet_required"):
        profit_locker.record_enrollment_decision(
            state,
            key,
            enroll=True,
            approved_by="owner",
            auth_method="signed_in_app",
        )
    with pytest.raises(ValueError, match="profit_vault_must_differ"):
        profit_locker.record_enrollment_decision(
            state,
            key,
            enroll=True,
            approved_by="owner",
            auth_method="signed_in_app",
            profit_vault_wallet=WALLET,
        )


def test_lifecycle_ledger_uses_provenance_and_does_not_double_count_unclaimed_fees():
    result = profit_locker.calculate_net_profit(_snapshot(), now=NOW)

    assert result["ready"] is True
    assert result["cost_basis_usd"] == 1200.0
    assert result["gross_recovery_value_usd"] == 1325.0
    assert result["unclaimed_fees_counted_usd"] == 0.0
    assert result["net_profit_usd"] == 118.0
    assert result["profit_pct"] == pytest.approx(9.8333333333)


def test_lifecycle_ledger_fails_closed_on_duplicate_provenance():
    snapshot = _snapshot()
    snapshot["claimed_fees"][0]["source_id"] = "withdrawal:child-position:1"

    result = profit_locker.calculate_net_profit(snapshot, now=NOW)

    assert result["ready"] is False
    assert "duplicate_value_source_detected" in result["reasons"]


def test_profit_target_is_scope_bound_and_idempotent_across_campaign_lifecycle():
    state = profit_locker.new_state()
    key = _enroll(state, target=30.0)
    snapshot = _snapshot(exit_value=1400.0, claimed=100.0)
    campaign_id = state["positions"][key]["campaign_id"]
    snapshot["scope"] = {"wallet": WALLET, "pool": POOL, "campaign_id": campaign_id}

    trigger = profit_locker.evaluate_profit_target(state, key, snapshot, now=NOW)
    assert trigger["type"] == "preflight_profit_close"
    assert trigger["calculation"]["profit_pct"] > 30.0
    assert trigger["settlement"]["profit_vault_wallet"] == VAULT
    assert trigger["settlement"]["principal_may_be_swept"] is False
    assert profit_locker.evaluate_profit_target(state, key, snapshot, now=NOW) is None

    wrong_scope = _snapshot(exit_value=1400.0)
    wrong_scope["scope"] = {"wallet": WALLET, "pool": POOL, "campaign_id": "wrong-campaign"}
    state["campaigns"][campaign_id].pop("profit_trigger")
    assert profit_locker.evaluate_profit_target(state, key, wrong_scope, now=NOW) is None


def test_forty_percent_target_counts_swept_fees_plus_current_positions():
    state = profit_locker.new_state()
    key = _enroll(state, target=40.0)
    campaign_id = state["positions"][key]["campaign_id"]
    snapshot = _snapshot(exit_value=950.0, claimed=450.0)
    snapshot["capital_contributions"] = [{"source_id": "deposit:root", "usd": 1000.0}]
    snapshot["realized_liquidity_proceeds"] = []
    snapshot["execution_costs"] = []
    snapshot["scope"] = {"wallet": WALLET, "pool": POOL, "campaign_id": campaign_id}

    trigger = profit_locker.evaluate_profit_target(state, key, snapshot, now=NOW)

    assert trigger["type"] == "preflight_profit_close"
    assert trigger["calculation"]["profit_pct"] == pytest.approx(40.0)
    assert trigger["settlement"]["convert_proceeds_to"] == "SOL"


def test_campaign_child_inherits_authorization_without_another_enrollment_answer():
    state = profit_locker.new_state()
    root_key = _enroll(state)
    campaign_id = state["positions"][root_key]["campaign_id"]

    child = profit_locker.attach_campaign_child_position(
        state,
        campaign_id,
        {
            "wallet": WALLET,
            "pool": POOL,
            "position": "rolled-tight-position",
            "pool_name": "SPARKY-SOL",
        },
        now=NOW + timedelta(minutes=5),
    )

    child_key = profit_locker.position_key(WALLET, POOL, "rolled-tight-position")
    assert child["managed_child"] is True
    assert child["enrollment_status"] == profit_locker.ENROLLED
    assert child["policy"] == state["campaigns"][campaign_id]["policy"]
    assert child_key in state["campaigns"][campaign_id]["position_keys"]
    assert _discover(state, position="rolled-tight-position", now=NOW + timedelta(hours=1)) == []


def test_enrolled_recovery_notifies_then_opens_without_a_second_approval_timer():
    state = profit_locker.new_state()
    key = _enroll(state)
    plan = _valid_plan()

    proposed = profit_locker.propose_recovery(state, key, plan, _passing_guards(), now=NOW)
    assert proposed["type"] == "notify_and_preflight_recovery"
    assert proposed["authorization_source"] == "position_enrollment"
    assert proposed["channels"] == ["in_app", "email"]
    assert "approval_deadline" not in proposed
    assert "requires_operator_response" not in proposed

    opened = profit_locker.finalize_recovery_preflight(
        state, proposed["proposal_id"], plan, _passing_guards(), now=NOW
    )
    assert opened["type"] == "open_recovery_bidask_pair"
    assert opened["authorization_source"] == "position_enrollment"
    assert opened["plan"]["positions"][0]["role"] == "wide_upward_recovery_ladder"
    assert opened["plan"]["positions"][1]["role"] == "tight_upward_fee_sleeve"


def test_recovery_fails_closed_when_fresh_preflight_guard_changes():
    state = profit_locker.new_state()
    key = _enroll(state)
    plan = _valid_plan()
    proposed = profit_locker.propose_recovery(state, key, plan, _passing_guards(), now=NOW)
    changed_guards = _passing_guards()
    changed_guards["simulation_ok"] = False

    blocked = profit_locker.finalize_recovery_preflight(
        state, proposed["proposal_id"], plan, changed_guards, now=NOW
    )
    assert blocked["type"] == "recovery_open_blocked"
    assert "guard_failed:simulation_ok" in blocked["reasons"]
    assert state["recovery_proposals"][proposed["proposal_id"]]["status"] == "failed_closed"


@pytest.mark.parametrize(
    ("mutator", "expected_reason"),
    [
        (lambda plan: plan.update(range_top_price=13.0), "range_multiple_exceeds_enrollment_limit"),
        (lambda plan: plan.update(min_bin_id=99), "range_must_start_at_live_bin_and_move_upward"),
        (lambda plan: plan.update(fee_sleeve_pct=41.0), "fee_sleeve_exceeds_enrollment_limit"),
    ],
)
def test_recovery_plan_cannot_exceed_enrolled_limits(mutator, expected_reason):
    state = profit_locker.new_state()
    key = _enroll(state)
    plan = _valid_plan()
    mutator(plan)

    rejected = profit_locker.propose_recovery(state, key, plan, _passing_guards(), now=NOW)
    assert rejected["type"] == "recovery_plan_rejected"
    assert expected_reason in rejected["reasons"]


def test_independent_positions_can_hold_concurrent_recovery_proposals():
    state = profit_locker.new_state()
    key_a = _enroll(state, position="position-a")
    key_b = _enroll(state, position="position-b")

    proposal_a = profit_locker.propose_recovery(
        state, key_a, _valid_plan(position="position-a"), _passing_guards(), now=NOW
    )
    proposal_b = profit_locker.propose_recovery(
        state,
        key_b,
        _valid_plan(position="position-b"),
        _passing_guards(),
        now=NOW + timedelta(seconds=1),
    )

    assert proposal_a["proposal_id"] != proposal_b["proposal_id"]
    assert proposal_a["scope"]["position"] == "position-a"
    assert proposal_b["scope"]["position"] == "position-b"
    assert len(state["recovery_proposals"]) == 2


def test_core_has_no_ai_wallet_or_transaction_submission_dependency():
    source_path = Path(profit_locker.__file__)
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    imported_roots = {
        alias.name.split(".")[0]
        for node in ast.walk(tree)
        if isinstance(node, ast.Import)
        for alias in node.names
    }
    imported_roots.update(
        node.module.split(".")[0]
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom) and node.module
    )

    assert not imported_roots.intersection(
        {"openai", "anthropic", "solana", "solders", "anchorpy", "base58", "requests", "httpx"}
    )


def test_mainnet_config_encodes_monitoring_roll_harvest_reentry_and_learning_contract():
    config_path = Path(__file__).parents[1] / "config" / "mainnet" / "profit_locker_config.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))

    assert config["execution"]["enabled"] is False
    assert config["execution"]["dry_run"] is True
    assert config["enrollment"]["default_status"] == "pending"
    assert config["enrollment"]["requires_explicit_yes_or_no"] is True
    assert config["profit_targets"]["minimum_pct"] == 10
    assert config["profit_targets"]["maximum_pct"] == 80
    assert config["profit_sweep"]["enabled"] is True
    assert config["profit_sweep"]["required_for_enrollment"] is True
    assert (
        config["profit_sweep"]["destination_wallet"]
        == "3d3Q5meqQpVV4CLCyHfHyYFD4Yy7jvNNt4dovdkNyNhB"
    )
    assert config["profit_sweep"]["principal_may_be_swept"] is False
    assert config["monitoring"]["active_bin_subscription"]["enabled"] is True
    assert config["monitoring"]["active_bin_subscription"]["fallback_poll_seconds"] == 15
    assert config["recovery"]["strategy"] == "bid_ask_upward_two_position"
    assert config["recovery"]["authorization"] == "enrollment_with_notification"
    assert config["recovery"]["downward_anti_chase"]["enabled"] is True
    assert config["recovery"]["wide_recovery_position"]["continuous_range_management"] is True
    assert config["recovery"]["wide_recovery_position"]["retarget_trigger_bins_from_edge"] == 2
    assert config["recovery"]["wide_recovery_position"]["retarget_may_fund_tight_position"] is False
    assert config["recovery"]["tight_fee_position"]["continuous_roll_management"] is True
    assert config["recovery"]["tight_fee_position"]["maximum_inventory_pct"] == 40
    sparky = config["recovery"]["campaign_overrides"]["sparky_capital_recovery"]
    assert sparky["maximum_tight_fee_position_pct"] == 30
    assert sparky["recovery_price_ceiling"] == "entry_price_divided_by_fresh_live_price"
    assert sparky["profit_target_pct"] == 40
    assert config["fee_harvesting"]["swap_non_sol_fees_to_sol"] is True
    assert config["recovery"]["protected_reserve"]["default_inventory_pct"] == 0
    assert config["recovery"]["allocation_optimizer"]["enabled"] is True
    assert config["top_side_reentry"]["max_recovered_sol_recycle_pct"] == 100
    assert config["accounting"]["scope"] == "wallet_pool_campaign_lifecycle"
    assert config["accounting"]["require_unique_source_id"] is True
    assert config["learning"]["record_outcomes"] is True
    assert config["learning"]["record_counterfactuals"] is True
    assert config["learning"]["may_change_live_policy"] is False


def test_profit_sweep_moves_only_realized_net_profit_and_is_idempotent():
    state = profit_locker.new_state()
    key = _enroll(state)
    campaign_id = state["positions"][key]["campaign_id"]
    settlement = {
        "scope": {"wallet": WALLET, "pool": POOL, "campaign_id": campaign_id},
        "positions_executable_value_sol": 9.0,
        "cumulative_net_fees_earned_sol": 6.1,
        "realized_fee_sol_available": 6.0,
        "required_source_wallet_reserve_sol": 0.02,
        "transfer_fee_budget_sol": 0.001,
        "break_even_basis_sol": 10.0,
    }
    guards = {name: True for name in profit_locker.REQUIRED_PROFIT_SWEEP_GUARDS}

    action = profit_locker.prepare_profit_sweep(state, campaign_id, settlement, guards, now=NOW)
    assert action["type"] == "preflight_profit_sweep"
    assert action["amount_sol"] == 5.979
    assert action["destination_wallet"] == VAULT
    assert action["principal_may_be_swept"] is False
    assert profit_locker.prepare_profit_sweep(state, campaign_id, settlement, guards, now=NOW)[
        "type"
    ] == "profit_sweep_already_exists"

    finalized = profit_locker.finalize_profit_sweep(
        state,
        campaign_id,
        idempotency_key=action["idempotency_key"],
        amount_sol=5.979,
        signature="finalized-sol-transfer-signature",
        finalized_at=NOW,
    )
    assert finalized["status"] == "finalized"
    assert state["campaigns"][campaign_id]["profit_swept_sol"] == 5.979
    assert profit_locker.finalize_profit_sweep(
        state,
        campaign_id,
        idempotency_key=action["idempotency_key"],
        amount_sol=5.979,
        signature="ignored-on-idempotent-retry",
        finalized_at=NOW,
    )["signature"] == "finalized-sol-transfer-signature"

    next_settlement = {
        **settlement,
        "positions_executable_value_sol": 9.0,
        "cumulative_net_fees_earned_sol": 6.1,
        "realized_fee_sol_available": 2.0,
    }
    next_action = profit_locker.prepare_profit_sweep(
        state, campaign_id, next_settlement, guards, now=NOW + timedelta(minutes=15)
    )
    assert next_action["type"] == "preflight_profit_sweep"
    assert next_action["amount_sol"] == 1.979
    assert next_action["funding_source"] == "realized_campaign_fees_only"
    assert next_action["campaign_return_value_after_sweep_sol"] >= 10.0


def test_profit_sweep_fails_closed_before_campaign_break_even():
    state = profit_locker.new_state()
    key = _enroll(state)
    campaign_id = state["positions"][key]["campaign_id"]
    settlement = {
        "scope": {"wallet": WALLET, "pool": POOL, "campaign_id": campaign_id},
        "positions_executable_value_sol": 8.0,
        "cumulative_net_fees_earned_sol": 1.99,
        "realized_fee_sol_available": 1.49,
        "required_source_wallet_reserve_sol": 0.02,
        "transfer_fee_budget_sol": 0.001,
        "break_even_basis_sol": 10.0,
    }
    guards = {name: True for name in profit_locker.REQUIRED_PROFIT_SWEEP_GUARDS}

    blocked = profit_locker.prepare_profit_sweep(state, campaign_id, settlement, guards, now=NOW)
    assert blocked["type"] == "profit_sweep_blocked"
    assert "positions_plus_fees_have_not_reached_break_even" in blocked["reasons"]


def test_post_close_exit_sweep_keeps_entry_basis_and_ignores_unrelated_wallet_sol():
    state = profit_locker.new_state()
    key = _enroll(state, target=40.0)
    campaign_id = state["positions"][key]["campaign_id"]
    state["campaigns"][campaign_id]["status"] = "closed"
    settlement = {
        "scope": {"wallet": WALLET, "pool": POOL, "campaign_id": campaign_id},
        "exit_transaction_sol_proceeds": 14.0,
        "available_proven_exit_proceeds_sol": 14.0,
        "entry_basis_sol": 10.0,
        "transfer_fee_budget_sol": 0.001,
        "wallet_total_sol": 114.0,
    }
    guards = {name: True for name in profit_locker.REQUIRED_EXIT_SWEEP_GUARDS}

    action = profit_locker.prepare_exit_profit_sweep(
        state, campaign_id, settlement, guards, now=NOW
    )

    assert action["type"] == "preflight_exit_profit_sweep"
    assert action["amount_sol"] == 3.999
    assert action["entry_basis_retained_sol"] == 10.0
    assert action["unrelated_wallet_sol_may_be_swept"] is False
