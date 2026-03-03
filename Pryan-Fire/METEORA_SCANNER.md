# Meteora DLMM Scanner

## Overview

The Meteora DLMM Scanner polls Meteora's Dynamic Liquidity Market Maker (DLMM) pools on Solana (devnet or mainnet) to detect trading opportunities. It applies configurable filters for liquidity, volume, APY, and fee tiers, then generates trade signals for the TradeOrchestrator.

## Features

- **Polling**: Configurable interval (default 30s) using Meteora GraphQL API
- **Filters**:
  - Minimum liquidity (default $5,000)
  - Minimum 24h volume (default $5,000)
  - Minimum APY (default 50%)
  - Maximum fee tier (default 0.5%)
- **Signal Types**:
  - `new_pool`: Pool just appeared (confidence 0.9)
  - `volume_spike`: 24h volume >2x average over last 5 minutes (confidence 0.7)
  - `fee_arbitrage`: Low fee tier with sufficient liquidity (confidence 0.6)
  - `generic_opportunity`: Pool passes filters but no special signal (confidence 0.5)
- **Integration**: Sends signals directly to TradeOrchestrator via `process_signal()` (same process) or can run standalone
- **Robust**: Auto-reconnect on API errors, exponential backoff, structured logging

## Configuration

Environment variables (all optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `METEORA_POLL_INTERVAL` | `30` | Polling interval in seconds |
| `METEORA_MIN_LIQUIDITY` | `5000` | Minimum liquidity in USD |
| `METEORA_MIN_VOLUME` | `5000` | Minimum 24h volume in USD |
| `METEORA_MIN_APY` | `50.0` | Minimum APY in percent |
| `METEORA_FEE_TIER_CUTOFF` | `0.5` | Maximum fee tier (percent) |
| `METEORA_VOLUME_SPIKE_MULTIPLIER` | `2.0` | Spike multiplier (e.g., 2.0 = 2x) |
| `METEORA_VOLUME_SPIKE_WINDOW` | `300` | Spike window in seconds |
| `METEORA_TRADE_AMOUNT` | `0.1` | Trade amount in token native units (e.g., SOL) |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Solana RPC endpoint |
| `DRY_RUN` | `true` | If true, orchestrator won't sign real transactions |

## Usage

### Standalone

```bash
# Install dependencies (aiohttp, pydantic)
pip install aiohttp pydantic

# Run scanner (will print signals, no orchestrator)
python -m src.signals.meteora_dlmm_scanner
```

### Integrated with Orchestrator (Combined Runner)

The `combined_runner.py` script runs both the Pump.fun scanner and TradeOrchestrator, with optional Meteora support.

```bash
# Run with Pump.fun scanner only (default)
python combined_runner.py --dry-run --rpc https://api.devnet.solana.com

# Run with both Pump.fun and Meteora scanners
python combined_runner.py --dry-run --meteora
```

The combined runner:
- Initializes the TradeOrchestrator
- Starts the event loop and health server (port 8002)
- Launches Pump.fun scanner in a separate thread
- If `--meteora` is set, launches Meteora scanner in its own thread
- Signals from both scanners are enqueued to the orchestrator's event loop

### As a Library

```python
from src.signals.meteora_dlmm_scanner import MeteoraDLMMScanner
from core.orchestrator import TradeOrchestrator

orchestrator = TradeOrchestrator(db_path="trades.db", dry_run=True)
scanner = MeteoraDLMMScanner(orchestrator=orchestrator, devnet=True)
await scanner.run()  # runs until stopped
```

## Signal Format

Signals sent to orchestrator are dictionaries with these keys:

```python
{
    "token_address": "MINT_ADDRESS",      # Base mint of the pool
    "amount": 0.1,                        # Trade amount in token native units (e.g., SOL)
    "trade_id": "meteora-abcdefg",        # Unique ID for tracking
    "source": "meteora_dlmm",
    "signal_type": "new_pool",            # or volume_spike, fee_arbitrage, generic_opportunity
    "confidence": 0.9,
    "metadata": {
        "pool_address": "POOL_ADDRESS",
        "liquidity_usd": 10000.0,
        "volume_24h_usd": 5000.0,
        "apy": 75.5,
        "fee_tier_percent": 0.3
    }
}
```

## Health & Monitoring

The TradeOrchestrator's health server (default port 8002) provides:

- `GET /health` — service health status
- `POST /signal` — HTTP endpoint to receive signals (used by external scanners if not in-process)

When the Meteora scanner runs in-process (via combined_runner), it calls `orchestrator.process_signal()` directly.

## Architecture Notes

- **Threading**: Each scanner runs in its own daemon thread with its own asyncio event loop.
- **Event Loop**: The orchestrator's EventLoop runs in a separate daemon thread and receives signals via a thread-safe queue.
- **Logging**: Uses Python's logging module; integrated with the orchestrator's JSONL telemetry.
- **Error Handling**: Network errors are logged and retried; individual pool parse failures are skipped.

## Testing

Basic unit tests are provided in `test_meteora_scanner.py`:

```bash
# Install test dependencies
python -m venv .venv_test
source .venv_test/bin/activate
pip install aiohttp pydantic

# Run tests
python test_meteora_scanner.py
```

## Future Improvements

- Add integration tests with mock Meteora API
- Configure signal amount based on pool liquidity or confidence
- Add metrics for number of pools scanned, API latency, etc.
- Support mainnet with proper API key if required
- Implement actual Meteora trade execution route in RpcIntegrator
