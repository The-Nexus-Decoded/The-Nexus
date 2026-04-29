#!/usr/bin/env python3
"""Tests for position_monitor.py PnL calculation logic."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from position_monitor import calculate_pnl, build_position_embed


def test_calculate_pnl_first_position():
    state_wallet = {"positions": {}}
    result = calculate_pnl(state_wallet, "pos123", {"liquidity_usd": 1000, "fees_claimed_usd": 50})
    assert result["pnl_usd"] == 50
    assert result["entry_value_usd"] == 1000
    assert result["current_value_usd"] == 1000
    assert result["pnl_24h"] == 0
    assert result["stale"] is False


def test_calculate_pnl_gain():
    state_wallet = {"positions": {"pos456": {"entry_value_usd": 1000, "history": []}}}
    result = calculate_pnl(state_wallet, "pos456", {"liquidity_usd": 1200, "fees_claimed_usd": 30})
    assert result["pnl_usd"] == 230
    assert result["pnl_pct"] == 23.0


def test_calculate_pnl_loss():
    state_wallet = {"positions": {"pos789": {"entry_value_usd": 1000, "history": []}}}
    result = calculate_pnl(state_wallet, "pos789", {"liquidity_usd": 800, "fees_claimed_usd": 20})
    assert result["pnl_usd"] == -180
    assert result["pnl_pct"] == -18.0


def test_calculate_pnl_stale_zero_does_not_show_loss():
    state_wallet = {"positions": {"closed": {"entry_value_usd": 1000, "history": [], "last_known_value_usd": 900}}}
    result = calculate_pnl(state_wallet, "closed", {"liquidity_usd": 0, "fees_claimed_usd": 0})
    assert result["stale"] is True
    assert result["pnl_usd"] == 0.0
    assert result["pnl_pct"] == 0.0
    assert result["last_known_value_usd"] == 900


def test_build_position_embed_keeps_full_position(monkeypatch):
    monkeypatch.setattr("position_monitor.get_dexscreener_url", lambda _mint: "https://dexscreener.example/token")
    position_addr = "Position111111111111111111111111111111111111111"
    embed = build_position_embed(
        "bot",
        {"pool_name": "SOL-USDC", "position": position_addr, "mint_x": "So111", "meteora_url": "https://app.meteora.ag/dlmm/pool"},
        {"pnl_usd": 1, "pnl_pct": 1, "entry_value_usd": 100, "current_value_usd": 101, "pnl_24h": 1},
        include_buttons=False,
    )
    position_field = next(field for field in embed["fields"] if field["name"] == "Position")
    assert position_field["value"] == f"`{position_addr}`"
