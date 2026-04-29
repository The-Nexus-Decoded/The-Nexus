#!/usr/bin/env python3
"""Tests for automation_engine.py - SL/TP automation and close boundaries."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import automation_engine
from automation_engine import evaluate_triggers, execute_position_close, handle_auto_execute


def test_evaluate_triggers_no_automation():
    wallet_config = {"automation": {"enabled": False}}
    positions = [{"position": "abc123", "liquidity_usd": 1000, "fees_24h": 10}]
    assert evaluate_triggers("test_wallet", positions, wallet_config, {"wallets": {}}) == []


def test_evaluate_triggers_stop_loss():
    wallet_config = {"automation": {"enabled": True, "stop_loss_pct": 10.0, "take_profit_pct": 50.0}}
    positions = [{"position": "pos123", "liquidity_usd": 900, "fees_claimed_usd": 0}]
    state = {"wallets": {"test_wallet": {"positions": {"pos123": {"entry_value_usd": 1000}}}}}
    triggers = evaluate_triggers("test_wallet", positions, wallet_config, state)
    assert len(triggers) == 1
    assert triggers[0]["trigger_type"] == "stop_loss"
    assert triggers[0]["pnl_pct"] == -10.0


def test_evaluate_triggers_take_profit():
    wallet_config = {"automation": {"enabled": True, "stop_loss_pct": 10.0, "take_profit_pct": 50.0}}
    positions = [{"position": "pos456", "liquidity_usd": 1500, "fees_claimed_usd": 0}]
    state = {"wallets": {"test_wallet": {"positions": {"pos456": {"entry_value_usd": 1000}}}}}
    triggers = evaluate_triggers("test_wallet", positions, wallet_config, state)
    assert len(triggers) == 1
    assert triggers[0]["trigger_type"] == "take_profit"
    assert triggers[0]["pnl_pct"] == 50.0


def test_evaluate_triggers_skips_stale_zero_position():
    wallet_config = {"automation": {"enabled": True, "stop_loss_pct": 10.0, "take_profit_pct": 50.0}}
    positions = [{"position": "closed", "liquidity_usd": 0, "fees_claimed_usd": 0}]
    state = {"wallets": {"test_wallet": {"positions": {"closed": {"entry_value_usd": 1000}}}}}
    assert evaluate_triggers("test_wallet", positions, wallet_config, state) == []


def test_execute_position_close_live_fails_without_pool(monkeypatch):
    monkeypatch.setattr(automation_engine, "DISCORD_WEBHOOK_ALERTS", None)
    trigger = {
        "trigger_type": "stop_loss",
        "pnl_pct": -12.0,
        "position": {"position": "pos123", "pool_name": "SOL-USDC"},
    }
    assert execute_position_close("bot", trigger, {"execution": {"dry_run": False}}) is False


def test_execute_position_close_live_uses_dlmm_command(monkeypatch):
    monkeypatch.setattr(automation_engine, "DISCORD_WEBHOOK_ALERTS", None)
    called = {}

    def fake_close(wallet_name, trigger, config, pool_pubkey):
        called["pool"] = pool_pubkey
        return {"success": True, "signatures": ["sig123"]}

    monkeypatch.setattr(automation_engine, "_run_dlmm_close_command", fake_close)
    trigger = {
        "trigger_type": "take_profit",
        "pnl_pct": 55.0,
        "position": {"position": "pos123", "lb_pair": "pool123", "pool_name": "SOL-USDC"},
    }
    assert execute_position_close("bot", trigger, {"execution": {"dry_run": False}}) is True
    assert called["pool"] == "pool123"


def test_handle_auto_execute_tracks_failure_attempt(monkeypatch):
    monkeypatch.setattr(automation_engine, "DISCORD_WEBHOOK_ALERTS", None)
    monkeypatch.setattr(automation_engine, "execute_position_close", lambda *_: False)
    state = {}
    trigger = {
        "trigger_type": "stop_loss",
        "pnl_pct": -12.0,
        "entry_value": 1000,
        "current_value": 850,
        "position": {"position": "pos123", "lb_pair": "pool123", "pool_name": "SOL-USDC"},
    }
    assert handle_auto_execute("bot", trigger, {"execution": {"dry_run": False}}, state) is False
    assert state["automation"]["bot"]["exec_attempts"]["pos123"]["attempts"] == 1
