"""Unit tests for Discord webhook broadcaster."""
import time
import logging
import requests
from unittest.mock import patch, MagicMock
import pytest
from discord_webhook.broadcaster import (
    DiscordBroadcaster, TradeAlert, RateLimiter, broadcast_trade_executed
)

# Disable logging during tests
logging.disable(logging.CRITICAL)

class TestRateLimiter:
    def test_initial_tokens(self):
        rl = RateLimiter(5, 60.0)
        assert rl.consume()  # first token
        assert rl._tokens == 4

    def test_exhaust_tokens(self):
        rl = RateLimiter(2, 60.0)
        assert rl.consume()
        assert rl.consume()
        assert not rl.consume()  # rate limited

    def test_refill_over_time(self):
        rl = RateLimiter(1, 1.0)  # 1 token per second
        assert rl.consume()
        assert not rl.consume()
        time.sleep(1.1)
        assert rl.consume()  # refilled

class TestDiscordBroadcaster:
    def test_init_from_env(self, monkeypatch):
        monkeypatch.setenv("DISCORD_TRADE_ALERTS_WEBHOOK", "https://example.com/webhook")
        b = DiscordBroadcaster()
        assert b.webhook_url == "https://example.com/webhook"

    def test_init_from_param(self):
        b = DiscordBroadcaster(webhook_url="https://example.com/webhook")
        assert b.webhook_url == "https://example.com/webhook"

    def test_no_webhook_url(self):
        b = DiscordBroadcaster(webhook_url=None)
        assert not b.broadcast_trade_executed({"trade_id": "1"})

    def test_build_executed_embed_structure(self, broadcaster):
        data = {
            "trade_id": "abc123",
            "token_address": "Epf...kGj",
            "amount": 1234.56,
            "route": "Jupiter",
            "entry_price": 0.00123,
            "slippage_bps": 50,
            "tx_signature": "5tC3...longtx...xyz"
        }
        alert = TradeAlert(**data)
        embed = broadcaster._build_embed(alert, "executed")
        assert embed["title"] == "✅ Trade Executed"
        assert embed["color"] == 65280
        assert "fields" in embed
        field_names = [f["name"] for f in embed["fields"]]
        assert "Trade ID" in field_names
        assert "Token" in field_names
        assert "Tx Signature" in field_names

    def test_build_failed_embed_includes_error(self, broadcaster):
        data = {
            "trade_id": "fail1",
            "token_address": "TokenAddr",
            "amount": 100,
            "error": "Insufficient liquidity"
        }
        alert = TradeAlert(**data)
        embed = broadcaster._build_embed(alert, "failed")
        assert embed["title"] == "❌ Trade Failed"
        assert embed["color"] == 16711680
        error_field = next(f for f in embed["fields"] if f["name"] == "Error")
        assert "Insufficient liquidity" in error_field["value"]

    def test_build_rejected_embed_includes_reason(self, broadcaster):
        data = {
            "trade_id": "rej1",
            "token_address": "TokenAddr",
            "amount": 50,
            "rejection_reason": "Risk limit exceeded"
        }
        alert = TradeAlert(**data)
        embed = broadcaster._build_embed(alert, "rejected")
        assert embed["title"] == "⚠️ Trade Rejected"
        assert embed["color"] == 16776960
        reason_field = next(f for f in embed["fields"] if f["name"] == "Reason")
        assert "Risk limit exceeded" in reason_field["value"]

    def test_truncate(self):
        long_text = "x" * 100
        result = DiscordBroadcaster._truncate(long_text, 10)
        assert len(result) == 10
        assert result.endswith("...")

    def test_send_success(self, broadcaster, mocker):
        mock_post = mocker.patch("requests.post")
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_post.return_value = mock_resp

        # Mock rate limiter to always allow
        broadcaster.rate_limiter.consume = lambda: True

        data = {"trade_id": "1", "token_address": "Tok", "amount": 10}
        success = broadcaster.broadcast_trade_executed(data)
        assert success
        mock_post.assert_called_once()

    def test_send_network_error_retries(self, broadcaster, mocker):
        mock_post = mocker.patch("requests.post")
        # Fail twice, then succeed
        mock_post.side_effect = [requests.RequestException("timeout"), requests.RequestException("timeout"), MagicMock(status_code=200)]

        broadcaster.rate_limiter.consume = lambda: True

        data = {"trade_id": "1", "token_address": "Tok", "amount": 10}
        success = broadcaster.broadcast_trade_executed(data)
        assert success
        assert mock_post.call_count == 3

    def test_send_5xx_retries(self, broadcaster, mocker):
        mock_post = mocker.patch("requests.post")
        mock_post.side_effect = [
            MagicMock(status_code=503),
            MagicMock(status_code=503),
            MagicMock(status_code=200)
        ]

        broadcaster.rate_limiter.consume = lambda: True

        data = {"trade_id": "1", "token_address": "Tok", "amount": 10}
        success = broadcaster.broadcast_trade_executed(data)
        assert success
        assert mock_post.call_count == 3

    def test_send_4xx_no_retry(self, broadcaster, mocker):
        mock_post = mocker.patch("requests.post")
        mock_post.return_value = MagicMock(status_code=404)

        broadcaster.rate_limiter.consume = lambda: True

        data = {"trade_id": "1", "token_address": "Tok", "amount": 10}
        success = broadcaster.broadcast_trade_executed(data)
        assert not success
        mock_post.assert_called_once()  # no retry

    def test_rate_limited(self, broadcaster, mocker):
        mock_post = mocker.patch("requests.post")
        broadcaster.rate_limiter.consume = lambda: False

        data = {"trade_id": "1", "token_address": "Tok", "amount": 10}
        success = broadcaster.broadcast_trade_executed(data)
        assert not success
        mock_post.assert_not_called()

    def test_module_level_convenience(self, mocker):
        """Test convenience functions use a singleton with correct import."""
        # Reset singleton by reloading the module
        import importlib
        import discord_webhook.broadcaster as mod
        importlib.reload(mod)
        mod._default_broadcaster = None

        mock_post = mocker.patch("requests.post")
        mock_post.return_value = MagicMock(status_code=200)

        # Create a broadcaster instance with mocked init
        with patch.object(mod.DiscordBroadcaster, '__init__', lambda self, *a, **kw: setattr(self, 'webhook_url', 'https://test') or setattr(self, 'rate_limiter', MagicMock(consume=lambda: True)) or setattr(self, '_send_with_retry', lambda payload: True)):
            from discord_webhook.broadcaster import broadcast_trade_executed
            data = {"trade_id": "1", "token_address": "Tok", "amount": 10}
            assert broadcast_trade_executed(data) is True

    def test_trade_alert_from_dict_missing_fields(self):
        data = {"trade_id": "123", "token_address": "Tok", "amount": 5}
        alert = DiscordBroadcaster._dict_to_alert(data)
        assert alert.trade_id == "123"
        assert alert.amount == 5.0
        assert alert.route is None
        assert alert.error is None
