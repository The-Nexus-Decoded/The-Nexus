"""Pytest configuration for discord-webhook tests."""
import pytest
from discord_webhook.broadcaster import DiscordBroadcaster, RateLimiter

@pytest.fixture
def broadcaster():
    """Create a broadcaster with a dummy webhook URL."""
    return DiscordBroadcaster(webhook_url="https://discord.com/api/webhooks/test")

@pytest.fixture
def rate_limiter():
    """Create a rate limiter with fast refill for tests."""
    return RateLimiter(tokens=10, interval=1.0)
