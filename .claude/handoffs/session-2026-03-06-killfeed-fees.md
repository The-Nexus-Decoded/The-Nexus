# Handoff — 2026-03-06 Killfeed + Wallet Fees Session

## Resume With
"Continue from handoff session-2026-03-06-killfeed-fees"

---

## What Was Done This Session
- Fixed killfeed falsy bug (`min_apy=0`) → PR #138 merged
- Extracted `_calculate_usd_liquidity()` helper → PR #138
- Added `/toppools` endpoint to health_server.py → PR #138
- Added `min_volume_24h` filter to kill stale APY spikes → PR #140 merged
- Installed killfeed-discord-poster.service + timer on Hugh (every 5 min)
- Configured `DISCORD_WEBHOOK_TOPPOOLS` drop-in on Hugh
- Re-registered GitHub Actions runner from Pryan-Fire → The-Nexus (#141 closed)

---

## NEXT TASK: Wallet Fee Display (#120, #121)
**Read-only fee display for two wallets. No management.**

Wallets:
- Owner: `sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb`
- Bot: `74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x`

Related tickets:
- #120 — Meteora Position Finder (Shyft API approach documented)
- #121 — DLMM Position Query (positions not returning)
- #131 — SHYFT_API_KEY needs setting on Hugh

Display target: TBD — ask user (endpoint only, Discord, or both)

---

## BLOCKED: /toppools Still 404 (#142)
Port 8002 on Hugh is served by `combined_runner.py` from legacy path:
`/data/openclaw/workspace/Pryan-Fire/` (user process, PID was ~501993)

NOT a system service — runs under user@1000. Need to:
1. Find what starts it (crontab? rc.local? user systemd?)
2. Stop it
3. Point service to monorepo path

Check: `sudo loginctl show-user openclaw` and `crontab -u openclaw -l`

---

## Pending (Not Started)
- Daily embed cleanup — delete old Discord messages before each new post
  (use webhook delete: `DELETE /webhooks/{id}/{token}/messages/{msg_id}` with `?wait=true`)
- Hugh CLI reinstall (#137)

---

## Key Facts
- Hugh IP: 100.104.166.53, port 8002
- Killfeed timer: active, every 5 min
- Webhooks on Hugh: `/etc/systemd/system/killfeed-discord-poster.service.d/webhooks.conf` + `toppools-webhook.conf`
- Runner: Haplo (ola-claw-dev) → The-Nexus-Decoded/The-Nexus ✓
- Auto-deploy: working now (runner fixed)
