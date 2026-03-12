# Trading & Monitoring Systems — Full Inventory

## Overview
Complete mapping of all trading and monitoring code in The-Nexus monorepo.

---

## 1. TRADING EXECUTION

### Primary Location: `Pryan-Fire/src/executor/`
| File | Purpose |
|------|---------|
| `exit_strategy.py` | Exit strategy logic |
| `fee_manager.py` | Fee management |
| `guards.py` | Risk guards |
| `kill_switch.py` | Emergency stop |
| `notifications.py` | Trade notifications |
| `state_machine.py` | Trade state machine |
| `transaction_core.py` | Transaction building |

### Secondary: `Pryan-Fire/hughs-forge/services/trade-executor/`
| File | Purpose |
|------|---------|
| `main.py` | Main executor (1000+ lines) |
| `run_pipeline.py` | Pipeline runner |
| `strategy_engine.py` | Strategy logic |
| `health_server.py` | Health endpoint |
| `fix_lp.py` | LP fixing utilities |

---

## 2. SIGNAL INGESTION

### Location: `Pryan-Fire/src/signals/`
| File | Purpose |
|------|---------|
| `meteora_dlmm_scanner.py` | Scan Meteora DLMM pools |
| `dex_screener.py` | DexScreener data |
| `pump_fun_stream.py` | Pump.fun streaming |

---

## 3. PRICE/FEED SYSTEMS

### Primary: `Pryan-Fire/hughs-forge/services/feed_reliability/`
| File | Purpose |
|------|---------|
| `price_feed.py` | Unified feed with retry/fallback (NEW) |

### Legacy: `Pryan-Fire/hughs-forge/services/meteora-trader/src/`
| File | Purpose |
|------|---------|
| `HermesClient.ts` | Pyth Hermes client (WORKING) |
| `PositionManager.ts` | Position management |
| `CompoundingEngine.ts` | Auto-compounding |
| `index.ts` | Entry point |

---

## 4. HEALTH/MONITORING

### Location: `Pryan-Fire/hughs-forge/services/trade-orchestrator/`
| File | Purpose |
|------|---------|
| `health_server.py` | REST API for positions/pools (616 lines) |
| `TradeOrchestrator.py` | Orchestration logic |
| `main.py` | Service entry point |

### Core Modules
- `src/core/orchestrator.py`
- `src/core/rpc_integration.py`
- `src/core/state_machine.py`
- `src/core/event_loop.py`
- `src/state/state_manager.py`

---

## 5. AUTOMATION (SL/TP)

### Location: `Pryan-Fire/hughs-forge/scripts/`
| File | Purpose |
|------|---------|
| `automation_engine.py` | SL/TP automation (425 lines) |
| `position_monitor.py` | Position monitoring to Discord (611 lines) |
| `killfeed_discord_poster.py` | Kill feed posting |

---

## 6. DISCORD POSTING/WEBHOOKS

| File | Discord Function |
|------|------------------|
| `automation_engine.py` | Alerts for SL/TP |
| `position_monitor.py` | Position embeds |
| `killfeed_discord_poster.py` | Kill feed posts |
| `services/risk-manager/discord_bot.py` | Risk alerts |
| `services/trade-executor/main.py` | Execution notifications |

---

## 7. CONFIG FILES

### Location: `Pryan-Fire/hughs-forge/config/`
```
config/
├── mainnet/
│   ├── orchestrator_config.json
│   └── position_monitor_config.json
└── testnet/
    └── orchestrator_config.json
```

---

## 8. ENVIRONMENT VARIABLES

### Required Envs
| Variable | Used By |
|----------|---------|
| `SOLANA_RPC_URL` | RPC calls |
| `HELIUS_RPC_URL` | Meteora trader |
| `WALLET_OWNER` | Owner wallet |
| `WALLET_BOT` | Bot wallet |
| `TRADING_WALLET_PUBLIC_KEY` | Trading wallet |
| `DISCORD_WEBHOOK_ALERTS` | Alert channel |
| `DISCORD_WEBHOOK_POSITIONS` | Positions channel |
| `AUTOMATION_DRY_RUN` | Dry-run mode |
| `POSITION_MONITOR_STATE_FILE` | State persistence |
| `METEORA_MIN_APY` | Scanner filter |
| `METEORA_MIN_LIQUIDITY` | Scanner filter |

---

## 9. DUPLICATE/LEGACY CODE

### Known Issues
1. **Two PositionManager implementations**:
   - `meteora-trader/src/PositionManager.ts` (OLD, broken)
   - `services/meteora-trader/src/PositionManager.ts` (NEW, working)

2. **Two price feed paths**:
   - `HermesClient.ts` (working)
   - `pyth-hermes-client/` (removed - was placeholder)

---

## 10. TEST STATUS

### Passing ✅
- `test_automation_engine.py` — 6 tests
- `test_position_monitor.py` — 5 tests

### Needs Fixing ❌
- TypeScript in `meteora-trader/` — Legacy, needs consolidation

---

## Dependency Graph

```
Signal Ingestion (src/signals/)
    ↓
Price/Feed Systems (feed_reliability/, HermesClient)
    ↓
Trading Execution (src/executor/, trade-executor/)
    ↓
Automation (automation_engine.py)
    ↓
Discord/Webhooks
    ↓
Health/Monitoring (health_server.py)
```

---

## Action Items

1. [ ] Consolidate duplicate PositionManager
2. [ ] Migrate all price calls to feed_reliability/price_feed.py
3. [ ] Add integration tests for full pipeline
4. [ ] Document all env vars in config
5. [ ] Remove legacy meteora-trader/ directory
