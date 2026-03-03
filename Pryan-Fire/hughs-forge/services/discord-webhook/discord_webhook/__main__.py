#!/usr/bin/env python3
"""
Command-line interface for Discord webhook broadcaster.

Usage:
    python -m discord_webhook --executed '{"trade_id": "123", ...}'
    python -m discord_webhook --failed '{"trade_id": "123", ...}'
"""

import sys
import json
import logging
from .broadcaster import DiscordBroadcaster, TradeAlert

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("--executed", "--failed", "--rejected"):
        print("Usage: python -m discord_webhook (--executed|--failed|--rejected) '<json>'")
        sys.exit(1)

    kind = sys.argv[1][2:]  # strip leading '--'
    try:
        data = json.loads(sys.argv[2])
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        sys.exit(1)

    broadcaster = DiscordBroadcaster()
    if kind == "executed":
        success = broadcaster.broadcast_trade_executed(data)
    elif kind == "failed":
        success = broadcaster.broadcast_trade_failed(data)
    else:
        success = broadcaster.broadcast_trade_rejected(data)

    print("Sent" if success else "Failed to send")
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
