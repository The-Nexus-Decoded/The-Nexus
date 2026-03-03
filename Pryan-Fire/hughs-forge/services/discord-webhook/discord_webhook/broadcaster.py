"""
Discord Webhook Broadcaster with rate limiting and retry logic.

Sends embed messages for trade events: executed, failed, rejected.
"""

import os
import time
import logging
import threading
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass

import requests
from requests.exceptions import RequestException

logger = logging.getLogger("discord_broadcaster")

# Configuration
RATE_LIMIT_TOKENS = 5
RATE_LIMIT_INTERVAL = 60.0  # seconds
TOKEN_REFRESH_RATE = RATE_LIMIT_INTERVAL / RATE_LIMIT_TOKENS  # ~12s

# Retry settings
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 2.0  # seconds
MAX_RETRY_DELAY = 10.0

@dataclass
class TradeAlert:
    """Canonical trade alert data structure."""
    trade_id: str
    token_address: str
    amount: float
    route: Optional[str] = None
    entry_price: Optional[float] = None
    slippage_bps: Optional[int] = None
    tx_signature: Optional[str] = None
    error: Optional[str] = None
    rejection_reason: Optional[str] = None

class RateLimiter:
    """Token bucket rate limiter for Discord webhook."""
    def __init__(self, tokens: int, interval: float):
        self.max_tokens = tokens
        self.interval = interval
        self.refill_rate = interval / tokens
        self._tokens = float(tokens)
        self._last_refill = time.time()
        self._lock = threading.Lock()

    def consume(self) -> bool:
        """Consume one token if available. Returns True if allowed, False if rate limited."""
        with self._lock:
            now = time.time()
            elapsed = now - self._last_refill
            if elapsed >= self.refill_rate:
                new_tokens = elapsed / self.refill_rate
                self._tokens = min(self.max_tokens, self._tokens + new_tokens)
                self._last_refill = now
            if self._tokens >= 1:
                self._tokens -= 1
                return True
            return False

class DiscordBroadcaster:
    def __init__(self, webhook_url: Optional[str] = None, rate_limiter: Optional[RateLimiter] = None):
        self.webhook_url = webhook_url or os.getenv("DISCORD_TRADE_ALERTS_WEBHOOK")
        self.logger = logging.getLogger("DiscordBroadcaster")
        self.rate_limiter = rate_limiter or RateLimiter(RATE_LIMIT_TOKENS, RATE_LIMIT_INTERVAL)

    def broadcast(self, trade_alert: TradeAlert, kind: str = "executed") -> bool:
        """Broadcast a trade alert to Discord.

        Args:
            trade_alert: TradeAlert instance with trade data.
            kind: One of "executed", "failed", "rejected".

        Returns:
            True if message was sent successfully (or queued), False otherwise.
        """
        if not self.webhook_url:
            self.logger.warning("No Discord webhook URL configured; skipping broadcast")
            return False

        if not self.rate_limiter.consume():
            self.logger.warning("Rate limit exceeded; dropping %s message for trade %s", kind, trade_alert.trade_id)
            return False

        embed = self._build_embed(trade_alert, kind)
        return self._send_with_retry(embed)

    def broadcast_trade_executed(self, trade_data: Dict[str, Any]) -> bool:
        """Send a success embed for an executed trade."""
        alert = self._dict_to_alert(trade_data)
        return self.broadcast(alert, "executed")

    def broadcast_trade_failed(self, trade_data: Dict[str, Any]) -> bool:
        """Send an error embed for a failed trade."""
        alert = self._dict_to_alert(trade_data)
        return self.broadcast(alert, "failed")

    def broadcast_trade_rejected(self, trade_data: Dict[str, Any]) -> bool:
        """Send a warning embed for a rejected trade."""
        alert = self._dict_to_alert(trade_data)
        return self.broadcast(alert, "rejected")

    def _build_embed(self, alert: TradeAlert, kind: str) -> Dict[str, Any]:
        """Build Discord embed payload based on alert and kind."""
        base_timestamp = datetime.now(timezone.utc).isoformat()
        common_fields = [
            {"name": "Trade ID", "value": alert.trade_id, "inline": False},
            {"name": "Token", "value": self._truncate(alert.token_address, 12) + "...", "inline": True},
            {"name": "Amount (USD)", "value": f"${alert.amount:.2f}", "inline": True},
        ]
        if alert.route:
            common_fields.append({"name": "Route", "value": alert.route, "inline": True})
        if alert.entry_price is not None:
            common_fields.append({"name": "Entry Price", "value": str(alert.entry_price), "inline": True})
        if alert.slippage_bps is not None:
            common_fields.append({"name": "Slippage (bps)", "value": str(alert.slippage_bps), "inline": True})

        if kind == "executed":
            title = "✅ Trade Executed"
            color = 65280  # green
            if alert.tx_signature:
                common_fields.append({"name": "Tx Signature", "value": f"```{alert.tx_signature[:40]}...```", "inline": False})
        elif kind == "failed":
            title = "❌ Trade Failed"
            color = 16711680  # red
            common_fields.append({"name": "Error", "value": self._truncate(alert.error or "Unknown error", 500), "inline": False})
        else:  # rejected
            title = "⚠️ Trade Rejected"
            color = 16776960  # yellow
            common_fields.append({"name": "Reason", "value": self._truncate(alert.rejection_reason or "No reason provided", 500), "inline": False})

        return {
            "title": title,
            "color": color,
            "timestamp": base_timestamp,
            "fields": common_fields
        }

    def _send_with_retry(self, payload: Dict[str, Any]) -> bool:
        """Send payload with exponential backoff retry."""
        attempt = 0
        delay = INITIAL_RETRY_DELAY
        while attempt < MAX_RETRIES:
            try:
                resp = requests.post(self.webhook_url, json={"embeds": [payload]}, timeout=10)
                if resp.status_code < 400:
                    return True
                # 4xx client errors likely permanent (e.g., 404, 400); don't retry
                if 400 <= resp.status_code < 500:
                    self.logger.warning("Discord webhook client error %s: %s", resp.status_code, resp.text[:200])
                    return False
                # 5xx server errors are retryable
                self.logger.warning("Discord webhook server error %s; retrying in %.1fs", resp.status_code, delay)
            except RequestException as e:
                self.logger.warning("Network error sending webhook: %s; retrying in %.1fs", e, delay)
            attempt += 1
            time.sleep(delay)
            delay = min(delay * 2, MAX_RETRY_DELAY)
        self.logger.error("Failed to send Discord webhook after %d attempts", MAX_RETRIES)
        return False

    @staticmethod
    def _truncate(text: str, max_len: int) -> str:
        """Truncate text to max_len with ellipsis if needed."""
        if not text:
            return ""
        return (text[:max_len-3] + "...") if len(text) > max_len else text

    @staticmethod
    def _dict_to_alert(data: Dict[str, Any]) -> TradeAlert:
        """Convert dict to TradeAlert, handling missing keys gracefully."""
        return TradeAlert(
            trade_id=str(data.get("trade_id", "unknown")),
            token_address=str(data.get("token_address", "N/A")),
            amount=float(data.get("amount", 0)),
            route=data.get("route"),
            entry_price=data.get("entry_price"),
            slippage_bps=data.get("slippage_bps"),
            tx_signature=data.get("tx_signature"),
            error=data.get("error"),
            rejection_reason=data.get("rejection_reason")
        )

# Convenience functions for module-level usage
_default_broadcaster: Optional[DiscordBroadcaster] = None

def _get_default() -> DiscordBroadcaster:
    global _default_broadcaster
    if _default_broadcaster is None:
        _default_broadcaster = DiscordBroadcaster()
    return _default_broadcaster

def broadcast_trade_executed(trade_data: Dict[str, Any]) -> bool:
    return _get_default().broadcast_trade_executed(trade_data)

def broadcast_trade_failed(trade_data: Dict[str, Any]) -> bool:
    return _get_default().broadcast_trade_failed(trade_data)

def broadcast_trade_rejected(trade_data: Dict[str, Any]) -> bool:
    return _get_default().broadcast_trade_rejected(trade_data)
