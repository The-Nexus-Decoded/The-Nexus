# Crypto Automation Cleanup Notes

## Duplicate Codebase — TO CONSOLIDATE

### Current State
Two meteora-trader directories exist with overlapping functionality:

| Path | Contents | Status |
|------|----------|--------|
| `meteora-trader/src/` | PositionManager.ts | Legacy |
| `services/meteora-trader/src/` | HermesClient.ts, CompoundingEngine.ts, index.ts | Active |

### Action Required
- [ ] Merge PositionManager.ts into services/meteora-trader/
- [ ] Remove top-level meteora-trader/ directory
- [ ] Update all imports/references

## Feed Architecture

### Current Issues
1. **Duplicate Hermes clients** — one broken (removed), one working in services/
2. **No unified price abstraction** — each module fetches differently
3. **Meteora API as price source** — health_server uses Meteora, not Pyth directly

### New Module
- `services/feed_reliability/price_feed.py` — unified feed with retry/fallback
- Use this for all future price feed access

## Test Coverage

### Added
- `scripts/test_automation_engine.py` — SL/TP trigger logic
- `scripts/test_position_monitor.py` — PnL calculations

### Still Needed
- [ ] Tests for HermesClient.ts
- [ ] Tests for health_server.py endpoints
- [ ] Integration tests for full automation flow

## Security Notes

### Issues Found
1. **Hardcoded wallet addresses** in automation_engine.py
2. **Dry-run default** — safe but execution path untested

### Recommendations
1. Move wallet addresses to config
2. Add audit logging for all automation executions
3. Add integration test for real execution path (with small amounts)
