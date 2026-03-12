## Problem

The `patryn-trader.service` (TradeOrchestrator) fails to start with:

```
TypeError: RiskManager.__init__() missing 2 required positional arguments: 'discord_token' and 'channel_id'
```

**Root cause:**  
`TradeOrchestrator.py` imports `from RiskManager import RiskManager` which is the Discord bot class requiring `discord_token` and `channel_id`. However, the orchestrator instantiates it with no arguments (`RiskManager()`), and the systemd service does not provide these credentials in its environment.

## Context

- **Jupiter API key** is ready at `/data/openclaw/keys/jupiter-api-key` (value: `f64551a6-2f59-4dc1-ba48-774632c342fe`)
- **Service:** `patryn-trader.service` (user service, runs as `openclaw`)
- **Code locations:**
  - Orchestrator: `hughs-forge/services/trade-orchestrator/src/TradeOrchestrator.py`
  - RiskManager (Discord bot): `hughs-forge/risk-manager/src/RiskManager.py`
  - Jupiter service: `src/services/jupiter_service.py`

## What's Needed

**Option A (discord bot flow):** Provide Discord credentials (bot token + channel ID) to the service environment and ensure the RiskManager Discord bot is intended to be embedded in the orchestrator.

**Option B (refactor):** Modify TradeOrchestrator to use the simpler RiskManager (or call the risk-manager service via HTTP) instead of embedding the Discord bot. There is a separate `services/risk-manager/main.py` with a config-based RiskManager that may be the intended design.

## Impact

This blocks the Jupiter integration testing and deployment. The trading pipeline cannot run until resolved.

## environment

- Server: ola-claw-trade
- Service: patryn-trader.service
- Jupiter API key location: `/data/openclaw/keys/jupiter-api-key`

**Please clarify the intended architecture and provide a fix.**
