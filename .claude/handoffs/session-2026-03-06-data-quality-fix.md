# Handoff — 2026-03-06 Data Quality Fix Session (Evening)

## Resume With
"Continue from handoff session-2026-03-06-data-quality-fix"

---

## What Was Done This Session

### PR #153 — merged + deployed successfully
- Fixed bin ID offsets 72/76 → 7912/7916 in `_parse_position`
- Fixed `active_bin_id`: replaced broken log formula (gave -1236) with on-chain lb_pair parse at offset 76 (gives correct -370/-383)
- Added per-position data from Meteora `/position/{addr}` API: `fee_apy_24h`, `fees_claimed_usd`, `pool_apy`
- Removed unused `import math`

### Deploy pipeline fixed (#156 closed)
- Root cause: `TRADE_SERVER_HOST` GitHub secret was never set — every deploy failed since day one
- Code fix: added `git fetch origin && git checkout main && git reset --hard origin/main` before pull (repo was stuck on `feature/209-fix-orchestrator-wrapper`)
- Sterol added secrets: TRADE_SERVER_HOST=100.104.166.53, TRADE_SERVER_USER=openclaw, TRADE_SERVER_SSH_KEY=ed25519
- First successful auto-deploy completed

### #147 closed — Zifnab fixes confirmed applied
- Tools profile: `full` ✅
- SystemPrompts: mention-only filter on #coding/#the-nexus/#crypto ✅
- gemini.conf: clean ✅

### Verified live data after deploy
```
BiHjJb4a: bins -393 to -325, active -383, in_range=True, fees_claimed=$0.46
AgrzMmYh: bins -411 to -343, active -383, in_range=True, fees_claimed=$126.68
HgNhgJL2: bins -370 to -301, active -383, in_range=False (just below lower)
9y8ZaXJp: AUTISM-SOL, bins -529 to -460, active -562, in_range=False
CG59oJJ8: bins -407 to -339, active -383, in_range=True, fees_claimed=$25.23
DkEwend5: SOL-USDC bot, bins -24229 to -24160, active -24592, in_range=False
```

---

## Next Task: #158 — Killfeed/Toppools/Fees Refactor

### The Problem
Meteora API `apy` values are unreliable — 24h fee snapshots extrapolated to annual. A pool with $5k liquidity and one $1k trade shows 500%+ APY. Result: 50 pools in "extreme" tier when maybe 3 are legit.

### Three things to fix:

**1. Killfeed tiers (extreme/killer/alpha)**
- File: `Pryan-Fire/hughs-forge/scripts/killfeed_discord_poster.py`
- Add APY cap at 500%, flag higher as "spike"
- Require sustained volume (not just one trade)
- Filter pools < 24h old
- Use `fee_tvl_ratio` from Meteora API for tier classification instead of raw `apy`

**2. Toppools endpoint**
- File: `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/health_server.py` (`/toppools`, `/pools`)
- Same filters as killfeed
- Rank by fee/TVL ratio instead of raw APY

**3. Position monitor fees**
- File: `Pryan-Fire/hughs-forge/scripts/position_monitor.py`
- Drop misleading `pool_apy` (millions of %) from embeds
- Show `fees_claimed_usd` prominently (per-position, correct)
- `liquidity_usd` per-position = Phase 2 (needs on-chain liquidityShares parsing)

### Current filter config
```json
{"min_apy": 20.0, "min_liquidity_usd": 5000, "min_volume_24h": 1000}
```

### Acceptance criteria
- Extreme tier < 10 pools at any time (not 50)
- APY capped at 500% display
- Toppools ranked by fee/TVL ratio
- Position embeds show per-position fees, not pool APY

---

## Key Facts
- Deploy pipeline NOW WORKS — merge to main auto-deploys to Hugh
- Hugh IP: 100.104.166.53, SSH server name: `hugh`
- Service: patryn-trader.service (health_server.py)
- Position monitor: position-monitor.timer (every 15 min)
- Killfeed: killfeed-discord-poster.timer (every ~4 min)
- lb_pair active_id offset: 76 (confirmed on Lobstar-SOL pair)
- Position bin_id offsets: 7912/7916 (confirmed)
- Owner wallet: sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb
- Bot wallet: 74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x
- Automation: enabled on both wallets (owner=alert_owner, bot=auto_execute)
- Sterol reviews PRs, Haplo can audit

## Still Open
- #137 — Hugh CLI reinstall
- #131 — Shyft API key Unauthorized
- #152 Phase 2 — per-position liquidity (on-chain parsing)
- #158 — killfeed/toppools/fees refactor (NEXT)
