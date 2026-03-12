#!/usr/bin/env python3
"""
Tests for position_monitor.py PnL calculation logic
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Import the calculation function
from position_monitor import calculate_pnl


def test_calculate_pnl_first_position():
    """Test PnL calculation for a new position (first time seen)."""
    state_wallet = {"positions": {}}
    position_addr = "pos123"
    current_data = {"liquidity_usd": 1000, "fees_24h": 50}
    
    result = calculate_pnl(state_wallet, position_addr, current_data)
    
    assert result["pnl_usd"] == 50  # fees count as PnL
    assert result["entry_value_usd"] == 1000
    assert result["current_value_usd"] == 1000
    assert result["pnl_24h"] == 0  # No history yet


def test_calculate_pnl_gain():
    """Test PnL calculation with value increase."""
    state_wallet = {
        "positions": {
            "pos456": {"entry_value_usd": 1000, "history": []}
        }
    }
    position_addr = "pos456"
    current_data = {"liquidity_usd": 1200, "fees_24h": 30}
    
    result = calculate_pnl(state_wallet, position_addr, current_data)
    
    assert result["pnl_usd"] == 230  # (1200 + 30) - 1000
    assert result["pnl_pct"] == 23.0


def test_calculate_pnl_loss():
    """Test PnL calculation with value decrease."""
    state_wallet = {
        "positions": {
            "pos789": {"entry_value_usd": 1000, "history": []}
        }
    }
    position_addr = "pos789"
    current_data = {"liquidity_usd": 800, "fees_24h": 20}
    
    result = calculate_pnl(state_wallet, position_addr, current_data)
    
    assert result["pnl_usd"] == -180  # (800 + 20) - 1000
    assert result["pnl_pct"] == -18.0


def test_calculate_pnl_24h():
    """Test 24h PnL calculation from history."""
    state_wallet = {
        "positions": {
            "pos101": {
                "entry_value_usd": 1000,
                "history": [
                    {"timestamp": "2026-03-11T12:00:00Z", "value": 900},
                    {"timestamp": "2026-03-11T18:00:00Z", "value": 950},
                ]
            }
        }
    }
    position_addr = "pos101"
    current_data = {"liquidity_usd": 1100, "fees_24h": 50}
    
    result = calculate_pnl(state_wallet, position_addr, current_data)
    
    assert result["pnl_24h"] == 200  # 1100 - 900 (oldest history)


def test_calculate_pnl_zero_entry():
    """Test handling of zero entry value (should not divide by zero)."""
    state_wallet = {
        "positions": {
            "pos202": {"entry_value_usd": 0, "history": []}
        }
    }
    position_addr = "pos202"
    current_data = {"liquidity_usd": 1000, "fees_24h": 50}
    
    result = calculate_pnl(state_wallet, position_addr, current_data)
    
    assert result["pnl_pct"] == 0  # Should handle zero gracefully


if __name__ == "__main__":
    print("Running position_monitor tests...")
    test_calculate_pnl_first_position()
    test_calculate_pnl_gain()
    test_calculate_pnl_loss()
    test_calculate_pnl_24h()
    test_calculate_pnl_zero_entry()
    print("✅ All tests passed!")
