#!/usr/bin/env python3
"""
Tests for automation_engine.py - SL/TP automation logic
"""
import sys
import os
# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from automation_engine import evaluate_triggers


def test_evaluate_triggers_no_automation():
    """Test that positions are skipped when automation is disabled."""
    wallet_config = {"automation": {"enabled": False}}
    positions = [{"position": "abc123", "liquidity_usd": 1000, "fees_24h": 10}]
    state = {"wallets": {}}
    
    triggers = evaluate_triggers("test_wallet", positions, wallet_config, state)
    assert len(triggers) == 0, "Should return no triggers when automation disabled"


def test_evaluate_triggers_stop_loss():
    """Test stop loss trigger fires at correct threshold."""
    wallet_config = {
        "automation": {
            "enabled": True,
            "stop_loss_pct": 10.0,
            "take_profit_pct": 50.0
        }
    }
    positions = [{
        "position": "pos123",
        "liquidity_usd": 900,  # -10% from entry
        "fees_24h": 0
    }]
    state = {
        "wallets": {
            "test_wallet": {
                "positions": {
                    "pos123": {"entry_value_usd": 1000}
                }
            }
        }
    }
    
    triggers = evaluate_triggers("test_wallet", positions, wallet_config, state)
    assert len(triggers) == 1
    assert triggers[0]["trigger_type"] == "stop_loss"
    assert triggers[0]["pnl_pct"] == -10.0


def test_evaluate_triggers_take_profit():
    """Test take profit trigger fires at correct threshold."""
    wallet_config = {
        "automation": {
            "enabled": True,
            "stop_loss_pct": 10.0,
            "take_profit_pct": 50.0
        }
    }
    positions = [{
        "position": "pos456",
        "liquidity_usd": 1500,  # +50% from entry
        "fees_24h": 0
    }]
    state = {
        "wallets": {
            "test_wallet": {
                "positions": {
                    "pos456": {"entry_value_usd": 1000}
                }
            }
        }
    }
    
    triggers = evaluate_triggers("test_wallet", positions, wallet_config, state)
    assert len(triggers) == 1
    assert triggers[0]["trigger_type"] == "take_profit"
    assert triggers[0]["pnl_pct"] == 50.0


def test_evaluate_triggers_with_fees():
    """Test PnL calculation includes fees."""
    wallet_config = {
        "automation": {
            "enabled": True,
            "stop_loss_pct": 5.0,
            "take_profit_pct": 10.0
        }
    }
    positions = [{
        "position": "pos789",
        "liquidity_usd": 1000,
        "fees_24h": 60  # Fees push PnL positive
    }]
    state = {
        "wallets": {
            "test_wallet": {
                "positions": {
                    "pos789": {"entry_value_usd": 1000}
                }
            }
        }
    }
    
    # Net change: (1000 + 60) - 1000 = +60 = +6%
    triggers = evaluate_triggers("test_wallet", positions, wallet_config, state)
    assert len(triggers) == 0  # Not at TP threshold yet


def test_evaluate_triggers_no_entry_value():
    """Test positions without entry value are skipped."""
    wallet_config = {
        "automation": {
            "enabled": True,
            "stop_loss_pct": 10.0,
            "take_profit_pct": 50.0
        }
    }
    positions = [{"position": "newpos", "liquidity_usd": 1000, "fees_24h": 0}]
    state = {"wallets": {}}  # No entry value recorded
    
    triggers = evaluate_triggers("test_wallet", positions, wallet_config, state)
    assert len(triggers) == 0


def test_evaluate_triggers_multiple_positions():
    """Test multiple positions are evaluated correctly."""
    wallet_config = {
        "automation": {
            "enabled": True,
            "stop_loss_pct": 10.0,
            "take_profit_pct": 50.0
        }
    }
    positions = [
        {"position": "pos1", "liquidity_usd": 900, "fees_24h": 0},   # -10% SL
        {"position": "pos2", "liquidity_usd": 1500, "fees_24h": 0}, # +50% TP
        {"position": "pos3", "liquidity_usd": 1000, "fees_24h": 0}, # No trigger
    ]
    state = {
        "wallets": {
            "test_wallet": {
                "positions": {
                    "pos1": {"entry_value_usd": 1000},
                    "pos2": {"entry_value_usd": 1000},
                    "pos3": {"entry_value_usd": 1000},
                }
            }
        }
    }
    
    triggers = evaluate_triggers("test_wallet", positions, wallet_config, state)
    assert len(triggers) == 2
    trigger_types = {t["trigger_type"] for t in triggers}
    assert trigger_types == {"stop_loss", "take_profit"}


if __name__ == "__main__":
    print("Running automation_engine tests...")
    test_evaluate_triggers_no_automation()
    test_evaluate_triggers_stop_loss()
    test_evaluate_triggers_take_profit()
    test_evaluate_triggers_with_fees()
    test_evaluate_triggers_no_entry_value()
    test_evaluate_triggers_multiple_positions()
    print("✅ All tests passed!")
