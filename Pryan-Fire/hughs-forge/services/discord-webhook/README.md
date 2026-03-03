# Discord Webhook Broadcaster

Standalone service for sending trade alerts to a Discord channel via incoming webhook.

## Features

- Rate limited to 5 messages per minute (configurable)
- Exponential backoff retry (max 3 attempts) on network/5xx errors
- Embed formatting with color-coded messages:
  - ✅ **Executed** (green)
  - ❌ **Failed** (red)
  - ⚠️ **Rejected** (yellow)
- Configurable via environment variable or constructor
- Can be imported as a module or used via CLI

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### As a Library

```python
from discord_webhook.src.broadcaster import DiscordBroadcaster, TradeAlert

# Initialize with webhook URL from env or explicitly
broadcaster = DiscordBroadcaster()  # reads DISCORD_TRADE_ALERTS_WEBHOOK
# or
broadcaster = DiscordBroadcaster(webhook_url="https://discord.com/api/webhooks/...")

# Send trade alerts
trade_data = {
    "trade_id": "tx_001",
    "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 1000.50,
    "route": "Jupiter",
    "entry_price": 0.00123,
    "slippage_bps": 30,
    "tx_signature": "5tC3...xyz"
}
broadcaster.broadcast_trade_executed(trade_data)
broadcaster.broadcast_trade_failed({**trade_data, "error": "Insufficient liquidity"})
broadcaster.broadcast_trade_rejected({**trade_data, "rejection_reason": "Risk limit exceeded"})
```

### Convenience Functions

```python
from discord_webhook.src.broadcaster import broadcast_trade_executed, broadcast_trade_failed
broadcast_trade_executed(trade_data)
```

### CLI

```bash
python -m discord_webhook --executed '{"trade_id": "123", "token_address": "Tok", "amount": 100}'
python -m discord_webhook --failed '{"trade_id": "124", ...}'
python -m discord_webhook --rejected '{"trade_id": "125", ...}'
```

## Configuration

Set the `DISCORD_TRADE_ALERTS_WEBHOOK` environment variable to your Discord incoming webhook URL.

## Testing

```bash
pytest tests/
```

## Design Notes

- Rate limiting uses token bucket algorithm (5 tokens per 60 seconds)
- Retries on network errors and 5xx responses only; 4xx are considered final
- Embed fields are truncated to Discord limits automatically
- Thread-safe rate limiter

## Integration

This service is intended to be used by Hugh's trading pipeline (The Assassins Ledger) to broadcast trade alerts to Discord.

Issue: Pryan-Fire #185
