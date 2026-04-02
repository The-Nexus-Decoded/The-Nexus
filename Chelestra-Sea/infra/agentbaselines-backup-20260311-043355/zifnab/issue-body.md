## Problem

Hugh's trading service (`patryn-trader`) fails to start due to `RiskManager` initialization error. The `RiskManager` class requires `discord_token` and `channel_id` parameters, but `TradeOrchestrator` does not provide them.

## Stack trace

```
ModuleNotFoundError: No module named 'AuditLogger'  [already fixed]
...
RiskManager initialization missing required arguments
```

## Context

- Jupiter API key is ready at `/data/openclaw/keys/jupiter-api-key` on ola-claw-trade
- Service: `patryn-trader.service` (user service, runs as openclaw)
- Code location: `/data/repos/The-Nexus-Decoded/Pryan-Fire/hughs-forge/`
- Related: Pryan-Fire #140 (procurement complete), #133, #134, #135

## Required fix

Either:

1. Modify `TradeOrchestrator` to read Discord credentials from environment variables (`DISCORD_TOKEN`, `DISCORD_CHANNEL_ID`) and pass them to `RiskManager`; OR
2. Make `RiskManager` optional / provide a mock mode when Discord is not configured (for headless operation).

## Acceptance

- Service starts successfully with Jupiter integration enabled
- No Discord-related errors in logs when credentials are absent (if optional)
- Jupiter API key is read from environment or config file

## Assignee

Haplo (code fix in Pryan-Fire/hughs-forge)