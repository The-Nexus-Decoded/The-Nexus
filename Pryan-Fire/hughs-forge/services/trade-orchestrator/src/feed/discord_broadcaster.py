"""
Discord Webhook Broadcaster for The Assassins Ledger.

Rate limited to max 5 messages per minute (token bucket).
Sends embed messages for trade events: executed, failed, rejected.
Scanner rejections and balance alerts use a separate rate limiter.
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

# Scanner rate limit: 10 per minute (show each token individually)
SCANNER_RATE_LIMIT_TOKENS = 10
SCANNER_TOKEN_REFRESH_RATE = RATE_LIMIT_INTERVAL / SCANNER_RATE_LIMIT_TOKENS  # 6s


class DiscordBroadcaster:
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.getenv("DISCORD_TRADE_ALERTS_WEBHOOK")
        self.logger = logging.getLogger("DiscordBroadcaster")
        self._tokens = RATE_LIMIT_TOKENS
        self._last_refill = time.time()
        self._lock = threading.Lock()
        # Separate rate limiter for scanner events
        self._scanner_tokens = SCANNER_RATE_LIMIT_TOKENS
        self._scanner_last_refill = time.time()
        self._scanner_lock = threading.Lock()
        # Scanner rejection counter (for batching info)
        self._scanner_rejected_count = 0
        self._scanner_rejected_since = time.time()

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

    def _refill_scanner_tokens(self):
        now = time.time()
        elapsed = now - self._scanner_last_refill
        if elapsed >= SCANNER_TOKEN_REFRESH_RATE:
            new_tokens = elapsed / SCANNER_TOKEN_REFRESH_RATE
            self._scanner_tokens = min(SCANNER_RATE_LIMIT_TOKENS, self._scanner_tokens + new_tokens)
            self._scanner_last_refill = now

    def _consume_scanner_token(self) -> bool:
        with self._scanner_lock:
            self._refill_scanner_tokens()
            if self._scanner_tokens >= 1:
                self._scanner_tokens -= 1
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
        """Send a warning embed for a rejected trade (TokenFilter level)."""
        if not self.webhook_url:
            self.logger.warning("No Discord webhook URL configured; skipping broadcast")
            return

        if not self._consume_token():
            self.logger.warning("Rate limit exceeded; dropping trade_rejected message")
            return

        embed = self._build_rejected_embed(trade_data)
        self._send(embed)

    def broadcast_scanner_rejected(self, token_data: Dict[str, Any]):
        """Send an embed for scanner-level rejection (momentum check)."""
        if not self.webhook_url:
            return

        self._scanner_rejected_count += 1

        if not self._consume_scanner_token():
            # Rate limited -- count is tracked, will show in next allowed message
            return

        # Include batch count if we skipped some
        skipped = self._scanner_rejected_count - 1
        self._scanner_rejected_count = 0

        embed = self._build_scanner_rejected_embed(token_data, skipped)
        self._send(embed)

    def broadcast_queued_for_retry(self, token_data: Dict[str, Any]):
        """Send an embed when a token is queued for retry (no DEX data yet)."""
        if not self.webhook_url:
            return
        if not self._consume_scanner_token():
            return
        mint = token_data.get("mint", "")
        symbol = token_data.get("symbol", "UNKNOWN")
        queue_size = token_data.get("queue_size", "?")
        desc = f"**{symbol}**\n`{mint}`"
        embed = {
            "title": "Queued — Waiting for DEX Data",
            "description": desc,
            "color": 0x5865F2,  # blurple
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {"name": "Status", "value": "No pairs on DEX Screener yet — watching for up to 24h (checks back off as token ages)", "inline": False},
                {"name": "Queue Size", "value": str(queue_size), "inline": True},
            ]
        }
        self._send(embed)

    def broadcast_balance_alert(self, balance_sol: float, alert_type: str, threshold: float):
        """Send balance alert (low or high)."""
        if not self.webhook_url:
            return

        if not self._consume_token():
            return

        embed = self._build_balance_embed(balance_sol, alert_type, threshold)
        self._send(embed)

    def _build_executed_embed(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": "Trade Executed",
            "color": 65280,  # green
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {"name": "Trade ID", "value": str(trade_data.get("trade_id", "unknown")), "inline": False},
                {"name": "Token", "value": trade_data.get("token_address", "N/A")[:12] + "...", "inline": True},
                {"name": "Amount (USD)", "value": "$" + f"{trade_data.get('amount', 0):.2f}", "inline": True},
                {"name": "Route", "value": trade_data.get("route", "N/A"), "inline": True},
                {"name": "Entry Price", "value": str(trade_data.get("entry_price") or "N/A"), "inline": True},
                {"name": "Slippage (bps)", "value": str(trade_data.get("slippage_bps") or "N/A"), "inline": True},
                {"name": "Tx Signature", "value": (trade_data.get("tx_signature", "N/A")[:40] + "..."), "inline": False},
            ]
        }

    def _build_failed_embed(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": "Trade Failed",
            "color": 16711680,  # red
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {"name": "Trade ID", "value": str(trade_data.get("trade_id", "unknown")), "inline": False},
                {"name": "Token", "value": trade_data.get("token_address", "N/A")[:12] + "...", "inline": True},
                {"name": "Amount (USD)", "value": "$" + f"{trade_data.get('amount', 0):.2f}", "inline": True},
                {"name": "Route", "value": trade_data.get("route", "N/A"), "inline": True},
                {"name": "Error", "value": trade_data.get("error", "Unknown error")[:500], "inline": False},
            ]
        }

    def _build_rejected_embed(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": "Trade Rejected (Filter)",
            "color": 16776960,  # yellow
            "timestamp": datetime.utcnow().isoformat(),
            "fields": [
                {"name": "Trade ID", "value": str(trade_data.get("trade_id", "unknown")), "inline": False},
                {"name": "Token", "value": trade_data.get("token_address", "N/A")[:12] + "...", "inline": True},
                {"name": "Amount (USD)", "value": "$" + f"{trade_data.get('amount', 0):.2f}", "inline": True},
                {"name": "Reason", "value": trade_data.get("rejection_reason", "No reason provided")[:500], "inline": False},
            ]
        }

    def _build_scanner_rejected_embed(self, token_data: Dict[str, Any], skipped: int) -> Dict[str, Any]:
        reason = token_data.get("reason", "Unknown")
        # Handle both "reason" (string) and "reasons" (list) from momentum scanner
        reasons_list = token_data.get("reasons", [])
        if reasons_list:
            reason = " | ".join(reasons_list)

        metrics = token_data.get("metrics", {})
        mint = token_data.get("mint", "N/A")
        symbol = token_data.get("symbol", "???")

        title = f"Scanner Rejected - {symbol}"
        if skipped > 0:
            title += f" (+{skipped} more)"

        # Build description with full mint (copyable)
        desc = f"**{symbol}**\n`{mint}`"

        fields = [
            {"name": "Rejected", "value": reason[:500], "inline": False},
        ]

        # Rich metrics when available (Rick Bot style)
        if metrics:
            price_usd = metrics.get("price_usd", "0")
            price_sol = metrics.get("price_native", "0")
            liq = metrics.get("liquidity", 0)
            fdv = metrics.get("fdv", 0)
            vol_1h = metrics.get("volume_1h", 0)
            vol_24h = metrics.get("volume_24h", 0)
            buys_5m = metrics.get("buys_5m", 0)
            sells_5m = metrics.get("sells_5m", 0)
            buys_1h = metrics.get("buys_1h", 0)
            sells_1h = metrics.get("sells_1h", 0)
            chg_5m = metrics.get("price_change_5m", 0)
            chg_1h = metrics.get("price_change_1h", 0)
            dex = metrics.get("dex_id", "unknown")
            url = metrics.get("url", "")
            pair_created = metrics.get("pair_created_at", None)

            # Price line
            fields.append({"name": "Price", "value": f"${price_usd} / {price_sol} SOL", "inline": False})
            # Core stats row
            fields.append({"name": "FDV", "value": f"${fdv:,.0f}", "inline": True})
            fields.append({"name": "Liquidity", "value": f"${liq:,.0f}", "inline": True})
            fields.append({"name": "DEX", "value": dex, "inline": True})
            # Volume row
            fields.append({"name": "Vol 1H", "value": f"${vol_1h:,.0f}", "inline": True})
            fields.append({"name": "Vol 24H", "value": f"${vol_24h:,.0f}", "inline": True})
            # Price change
            arrow_5m = "+" if chg_5m >= 0 else ""
            arrow_1h = "+" if chg_1h >= 0 else ""
            fields.append({"name": "Change", "value": f"5m: {arrow_5m}{chg_5m:.1f}% | 1h: {arrow_1h}{chg_1h:.1f}%", "inline": True})
            # Txns row
            fields.append({"name": "5m Txns", "value": f"{buys_5m}B / {sells_5m}S", "inline": True})
            fields.append({"name": "1h Txns", "value": f"{buys_1h}B / {sells_1h}S", "inline": True})
            # Age
            if pair_created:
                try:
                    age_seconds = (datetime.utcnow() - datetime.utcfromtimestamp(pair_created / 1000)).total_seconds()
                    if age_seconds < 3600:
                        age_str = f"{int(age_seconds / 60)}m"
                    elif age_seconds < 86400:
                        age_str = f"{int(age_seconds / 3600)}h"
                    else:
                        age_str = f"{int(age_seconds / 86400)}d"
                    fields.append({"name": "Age", "value": age_str, "inline": True})
                except Exception:
                    pass
            # Chart link
            if url:
                desc += f"\n[Chart]({url})"

        return {
            "title": title,
            "description": desc,

            "color": 16744448,  # orange
            "timestamp": datetime.utcnow().isoformat(),
            "fields": fields
        }

    def _build_balance_embed(self, balance_sol: float, alert_type: str, threshold: float) -> Dict[str, Any]:
        if alert_type == "low":
            return {
                "title": "LOW BALANCE WARNING",
                "color": 16711680,  # red
                "timestamp": datetime.utcnow().isoformat(),
                "description": f"Wallet balance is {balance_sol:.4f} SOL (below {threshold} SOL threshold). Trading will fail without funds.",
                "fields": [
                    {"name": "Balance", "value": f"{balance_sol:.4f} SOL", "inline": True},
                    {"name": "Threshold", "value": f"{threshold} SOL", "inline": True},
                ]
            }
        else:
            return {
                "title": "HIGH BALANCE ALERT",
                "color": 3066993,  # teal/green
                "timestamp": datetime.utcnow().isoformat(),
                "description": f"Wallet balance is {balance_sol:.4f} SOL (above {threshold} SOL). The Hand is well-funded.",
                "fields": [
                    {"name": "Balance", "value": f"{balance_sol:.4f} SOL", "inline": True},
                    {"name": "Threshold", "value": f"{threshold} SOL", "inline": True},
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
