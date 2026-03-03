"""
Discord Webhook Broadcaster for The Assassins Ledger.

Rate limited to max 5 messages per minute (token bucket).
Sends embed messages for trade events: executed, failed, rejected.
"""

import os
import time
import threading
import requests
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("discord_broadcaster")

# Rate limiting: 5 messages per minute (12 seconds between tokens)
RATE_LIMIT_TOKENS = 5
RATE_LIMIT_INTERVAL = 60.0  # seconds
TOKEN_REFRESH_RATE = RATE_LIMIT_INTERVAL / RATE_LIMIT_TOKENS  # ~12s

class DiscordBroadcaster:
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.getenv("DISCORD_TRADE_ALERTS_WEBHOOK")
        self.logger = logging.getLogger("DiscordBroadcaster")
        self._tokens = RATE_LIMIT_TOKENS
        self._last_refill = time.time()
        self._lock = threading.Lock()

    def _refill_tokens(self):
        now = time.time()
        elapsed = now - self._last_refill
        if elapsed >= TOKEN_REFRESH_RATE:
            new_tokens = elapsed / TOKEN_REFRESH_RATE
            self._tokens = min(RATE_LIMIT_TOKENS, self._tokens + new_tokens)
            self._last_refill = now

    def _consume_token(self) -> bool:
        with self._lock:
            self._refill_tokens()
            if self._tokens >= 1:
                self._tokens -= 1
                return True
            return False

    def broadcast_trade_executed(self, trade_data: Dict[str, Any]):
        """Send a success embed for an executed trade."""
        if not self.webhook_url:
            self.logger.warning("No Discord webhook URL configured; skipping broadcast")
            return

        if not self._consume_token():
            self.logger.warning("Rate limit exceeded; dropping trade_executed message")
            return

        embed = self._build_executed_embed(trade_data)
        self._send(embed)

    def broadcast_trade_failed(self, trade_data: Dict[str, Any]):
        """Send an error embed for a failed trade."""
        if not self.webhook_url:
            self.logger.warning("No Discord webhook URL configured; skipping broadcast")
            return

        if not self._consume_token():
            self.logger.warning("Rate limit exceeded; dropping trade_failed message")
            return

        embed = self._build_failed_embed(trade_data)
        self._send(embed)

    def broadcast_trade_rejected(self, trade_data: Dict[str, Any]):
        """Send a warning embed for a rejected trade."""
        if not self.webhook_url:
            self.logger.warning("No Discord webhook URL configured; skipping broadcast")
            return

        if not self._consume_token():
            self.logger.warning("Rate limit exceeded; dropping trade_rejected message")
            return

        embed = self._build_rejected_embed(trade_data)
        self._send(embed)

    def _build_executed_embed(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": "✅ Trade Executed",
            "color": 65280,  # green
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {"name": "Trade ID", "value": str(trade_data.get("trade_id", "unknown")), "inline": False},
                {"name": "Token", "value": trade_data.get("token_address", "N/A")[:12] + "...", "inline": True},
                {"name": "Amount (USD)", "value": f"${trade_data.get('amount', 0):.2f}", "inline": True},
                {"name": "Route", "value": trade_data.get("route", "N/A"), "inline": True},
                {"name": "Entry Price", "value": str(trade_data.get("entry_price") or "N/A"), "inline": True},
                {"name": "Slippage (bps)", "value": str(trade_data.get("slippage_bps") or "N/A"), "inline": True},
                {"name": "Tx Signature", "value": f"```{trade_data.get('tx_signature', 'N/A')[:40]}...```", "inline": False},
            ]
        }

    def _build_failed_embed(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": "❌ Trade Failed",
            "color": 16711680,  # red
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {"name": "Trade ID", "value": str(trade_data.get("trade_id", "unknown")), "inline": False},
                {"name": "Token", "value": trade_data.get("token_address", "N/A")[:12] + "...", "inline": True},
                {"name": "Amount (USD)", "value": f"${trade_data.get('amount', 0):.2f}", "inline": True},
                {"name": "Route", "value": trade_data.get("route", "N/A"), "inline": True},
                {"name": "Error", "value": trade_data.get("error", "Unknown error")[:500], "inline": False},
            ]
        }

    def _build_rejected_embed(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": "⚠️ Trade Rejected",
            "color": 16776960,  # yellow
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {"name": "Trade ID", "value": str(trade_data.get("trade_id", "unknown")), "inline": False},
                {"name": "Token", "value": trade_data.get("token_address", "N/A")[:12] + "...", "inline": True},
                {"name": "Amount (USD)", "value": f"${trade_data.get('amount', 0):.2f}", "inline": True},
                {"name": "Reason", "value": trade_data.get("rejection_reason", "No reason provided")[:500], "inline": False},
            ]
        }

    def _send(self, embed: Dict[str, Any]):
        payload = {"embeds": [embed]}
        try:
            resp = requests.post(self.webhook_url, json=payload, timeout=10)
            if resp.status_code >= 400:
                self.logger.warning(f"Discord webhook returned {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            self.logger.error(f"Failed to send Discord webhook: {e}")
