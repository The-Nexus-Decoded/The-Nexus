from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock

sys.modules.setdefault("solders", MagicMock())
sys.modules.setdefault("solders.keypair", MagicMock(Keypair=MagicMock()))
sys.modules.setdefault("solders.transaction", MagicMock(VersionedTransaction=MagicMock()))
sys.modules.setdefault("solders.signature", MagicMock(Signature=MagicMock()))
sys.modules.setdefault("solana", MagicMock())
sys.modules.setdefault("solana.rpc", MagicMock())
sys.modules.setdefault("solana.rpc.api", MagicMock(Client=MagicMock()))
sys.modules.setdefault("solana.rpc.types", MagicMock(TxOpts=MagicMock()))
sys.modules.setdefault("solana.rpc.commitment", MagicMock(Confirmed=MagicMock()))

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.orchestrator import TradeOrchestrator
from core.state_machine import TradeState


def test_orchestrator_wires_signal_into_dry_run_revenue_plan(tmp_path):
    db_path = tmp_path / "trades.db"
    orchestrator = TradeOrchestrator(db_path=str(db_path), dry_run=True, max_capped_lane_usd=25)

    state = orchestrator.process_signal({"trade_id": "lane-1", "mint": "TokenMint", "amount_usd": 12.5})

    assert state == TradeState.PLANNED.value
    saved = orchestrator.state_manager.get_trade("lane-1")
    assert saved["state"] == TradeState.PLANNED.value
    lane = saved["data"]["revenue_lane"]
    assert lane["status"] == "DRY_RUN_PLAN_READY"
    assert lane["execution_plan"]["submit_transaction"] is False
    assert lane["accounting"]["position_reconciliation_required"] is True


def test_orchestrator_blocks_over_cap_before_route_execution(tmp_path):
    db_path = tmp_path / "trades.db"
    orchestrator = TradeOrchestrator(db_path=str(db_path), dry_run=True, max_capped_lane_usd=25)

    state = orchestrator.process_signal({"trade_id": "lane-2", "mint": "TokenMint", "amount_usd": 26})

    assert state == TradeState.AWAITING_APPROVAL.value
    saved = orchestrator.state_manager.get_trade("lane-2")
    lane = saved["data"]["revenue_lane"]
    assert lane["risk"]["requires_owner_approval"] is True
    assert lane["execution_plan"] is None
