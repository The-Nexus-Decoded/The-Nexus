from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.revenue_lane import CappedRevenueLane
from core.risk_gate import RiskGate


def gate(tmp_path):
    return RiskGate(max_capped_lane_usd=25, force_stop_file=str(tmp_path / "stop.lock"))


def test_revenue_lane_builds_full_dry_run_plan(tmp_path):
    lane = CappedRevenueLane(risk_gate=gate(tmp_path))

    result = lane.plan({"mint": "TokenMint", "amount_usd": 12.5}, live_execution=False)

    assert result.status == "DRY_RUN_PLAN_READY"
    assert result.live_execution is False
    assert result.route == "JUPITER_ULTRA_ORDER_PROBE"
    assert result.order_probe["non_executing"] is True
    assert result.signer["ready"] is False
    assert result.execution_plan["submit_transaction"] is False
    assert result.accounting["position_reconciliation_required"] is True


def test_revenue_lane_blocks_live_even_under_cap(tmp_path):
    lane = CappedRevenueLane(risk_gate=gate(tmp_path))

    result = lane.plan({"mint": "TokenMint", "amount_usd": 12.5}, live_execution=True)

    assert result.status == "AWAITING_OWNER_APPROVAL"
    assert result.live_execution is True
    assert result.blocker == "live execution requires explicit Lord Xar approval gate resolution"


def test_revenue_lane_blocks_failed_order_probe(tmp_path):
    class BrokenQuoteClient:
        def route_trade(self, token_address, amount_usd):
            return "JUPITER_ULTRA_ORDER_PROBE"

        def fetch_order_preview(self, signal):
            return {"ok": False, "reason": "jupiter_unauthorized"}

    lane = CappedRevenueLane(risk_gate=gate(tmp_path), quote_client=BrokenQuoteClient())

    result = lane.plan({"mint": "TokenMint", "amount_usd": 12.5}, live_execution=False)

    assert result.status == "BLOCKED_ORDER_PROBE"
    assert result.blocker == "jupiter_unauthorized"
