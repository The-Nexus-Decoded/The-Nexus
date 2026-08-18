from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.risk_gate import RiskGate


def test_dry_run_under_cap_is_allowed(tmp_path):
    gate = RiskGate(max_capped_lane_usd=25, force_stop_file=str(tmp_path / "stop.lock"))

    decision = gate.assess({"amount_usd": 10}, live_execution=False)

    assert decision.allowed is True
    assert decision.status == "DRY_RUN_APPROVED"
    assert decision.requires_owner_approval is False


def test_live_under_cap_fails_closed_for_owner_approval(tmp_path):
    gate = RiskGate(max_capped_lane_usd=25, force_stop_file=str(tmp_path / "stop.lock"))

    decision = gate.assess({"amount_usd": 10}, live_execution=True)

    assert decision.allowed is False
    assert decision.status == "AWAITING_OWNER_APPROVAL"
    assert decision.requires_owner_approval is True


def test_over_cap_requires_owner_approval(tmp_path):
    gate = RiskGate(max_capped_lane_usd=25, force_stop_file=str(tmp_path / "stop.lock"))

    decision = gate.assess({"amount_usd": 26}, live_execution=False)

    assert decision.allowed is False
    assert decision.status == "AWAITING_OWNER_APPROVAL"
    assert decision.requires_owner_approval is True


def test_force_stop_lock_blocks_dry_run_and_live(tmp_path):
    stop = tmp_path / "stop.lock"
    stop.write_text("halt")
    gate = RiskGate(max_capped_lane_usd=25, force_stop_file=str(stop))

    dry = gate.assess({"amount_usd": 10}, live_execution=False)
    live = gate.assess({"amount_usd": 10}, live_execution=True)

    assert dry.allowed is False
    assert dry.status == "FORCE_STOP_LOCK"
    assert live.allowed is False
    assert live.status == "FORCE_STOP_LOCK"
