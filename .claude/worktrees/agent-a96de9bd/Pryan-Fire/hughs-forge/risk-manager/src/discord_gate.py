"""
discord_gate — Simple in-memory trade approval store for Risk Manager.

This module provides functions to handle manual trade approvals when
the trade size exceeds the threshold. It stores pending trades in memory
and allows resolution (approve/deny) and status checks.

In a production environment, this would be replaced with a persistent store
(e.g., database) and possibly trigger Discord notifications via webhook.
"""

import threading
import uuid
from typing import Dict, Any, Tuple, Optional

# In-memory store: trade_id -> { "trade": dict, "status": str, "user": str (if resolved) }
_pending_trades: Dict[str, Dict[str, Any]] = {}
_lock = threading.Lock()

def request_approval(trade_details: Dict[str, Any]) -> str:
    """
    Register a new trade that requires manual approval.

    Args:
        trade_details: The trade parameters (pair, amount_usd, side, price, etc.)

    Returns:
        trade_id: A unique identifier for this approval request.
    """
    trade_id = str(uuid.uuid4())
    with _lock:
        _pending_trades[trade_id] = {
            "trade": trade_details,
            "status": "pending",
            "user": None,
        }
    return trade_id

def resolve_trade(trade_id: str, approved: bool, user: str) -> bool:
    """
    Resolve a pending trade approval.

    Args:
        trade_id: The ID returned by request_approval.
        approved: True to approve, False to deny.
        user: The Discord username (or identifier) of the approver.

    Returns:
        True if the trade was found and resolved, False otherwise.

    Raises:
        ValueError: If trade_id not found.
    """
    with _lock:
        if trade_id not in _pending_trades:
            raise ValueError(f"Trade {trade_id} not found")
        _pending_trades[trade_id]["status"] = "approved" if approved else "denied"
        _pending_trades[trade_id]["user"] = user
    return True

def check_status(trade_id: str) -> Tuple[str, Optional[Dict[str, Any]]]:
    """
    Check the current status of a trade approval.

    Args:
        trade_id: The identifier of the trade.

    Returns:
        A tuple (status, info) where status is one of:
          - "pending"
          - "approved"
          - "denied"
          - "unknown" (if trade_id not found)
        If found, info is a dict containing the trade details, status, and user.
        If not found, info is None.
    """
    with _lock:
        entry = _pending_trades.get(trade_id)
    if entry is None:
        return "unknown", None
    # Return a copy to avoid external mutation
    return entry["status"], {
        "trade": entry["trade"],
        "status": entry["status"],
        "user": entry["user"],
    }

# Optional helper for debugging / monitoring
def list_pending_trades() -> Dict[str, Dict[str, Any]]:
    """Return a copy of all pending trades (for debugging)."""
    with _lock:
        return dict(_pending_trades)
