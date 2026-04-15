# Gemini Context Transfer — Pryan-Fire

**Date:** 2026-03-03
**Handoff from:** Claude Code (Sonnet 4.6)
**Session summary:** Completed 24h adaptive retry queue (PR #202) + aiohttp root-cause fix (PR #200). Both merged. Minor text fix (PR #203) also merged. Trading pipeline now live on Hugh.

---

---

## 0. Handoff Loop — How to Switch Between Gemini and Claude

This project goes back and forth between Gemini CLI (when Claude credits run out) and Claude Code (when credits are restored). Here is how each handoff works.

### Handing back to Claude

When your Gemini credits run out or the owner wants to switch back to Claude Code, do this before ending your session:

1. Commit any updates you made to `.gemini/memory/` files so Claude gets your changes
2. Update the relevant Chelestra-Sea issue with what you did, what's pending, and any decisions made
3. Tell the owner: "Resume from Chelestra-Sea #91 and PR #204" (update issue/PR numbers if they have changed)

Claude will reconstruct context from the issue and PR, re-read the memory files from the repo, and continue from the pending work queue.

### Handing back to Gemini

When Claude's context runs out or the owner switches to Gemini, Claude will:

1. Update this GEMINI.md with the latest session summary at the top
2. Update `.gemini/memory/` files with any new discoveries
3. Commit and push everything to the repo
4. Tell the owner the PR number and issue number to reference

### Memory file sync rule

**Whichever AI is active owns the memory files.** If you learn something new — a bug, a bad idea, a config gotcha — write it to the relevant `.gemini/memory/` file and commit it. That is how the other AI picks it up next session. Do not leave discoveries only in chat.

## 1. What Gemini CLI Has Instead of Claude MCPs

Claude Code had these MCPs — you will need SSH instead:

| Claude MCP | Gemini replacement |
|---|---|
| `ssh-manager` (aliases: haplo, zifnab, hugh) | `ssh openclaw@<tailscale-ip>` directly |
| `discord` (Alfred's bot token) | SSH to any server + `openclaw agent --message` or Discord webhook |
| `context7` (doc lookup) | Web search or `curl` to fetch docs |
| `sequential-thinking` | Built-in Gemini reasoning |

**SSH key:** The servers use `openclaw` user on all 3.

**SSH access:**
```
zifnab (coordinator): openclaw@100.103.189.117   (LAN: 192.168.1.127)
haplo  (coder):       openclaw@100.94.203.10     (LAN: 192.168.1.211)
hugh   (trader):      openclaw@100.104.166.53    (LAN: 192.168.1.88)
```

**GitHub CLI:** `gh` is available on all servers. On Zifnab it's wrapped (`/usr/bin/gh` → GitHub App token). On Haplo/Hugh it uses legacy PATs. Org: `The-Nexus-Decoded`. Repo: `Pryan-Fire`.

---

## 2. Server Topology & Roles

| Server | Hostname | Role | Key service |
|---|---|---|---|
| Zifnab | ola-claw-main | Coordinator / orchestrator | openclaw-gateway (agent), fleet monitoring |
| Haplo | ola-claw-dev | Coder / CI runner | openclaw-gateway (agent), GitHub Actions runner |
| Hugh | ola-claw-trade | Trader | openclaw-gateway (agent), **patryn-trader.service** |

**Role boundaries — hard rules:**
- Hugh: trading code only. Never touches infra.
- Haplo: coding / CI only. Never touches infra.
- Zifnab: coordinator, fleet management. No code deployment.
- All infra (systemd, crontabs, firewall, service files) is owner-only via Claude CLI. Do NOT create or modify services, timers, or crons.

---

## 3. Pryan-Fire Repo Architecture

**Repo:** `The-Nexus-Decoded/Pryan-Fire`
**Local path on Hugh (live):** `/data/openclaw/workspace/Pryan-Fire`
**Local path on Haplo (CI):** `/data/openclaw/workspace/Pryan-Fire`

### Directory Layout
```
Pryan-Fire/
├── combined_runner.py          # Main entry point — scanner + orchestrator + retry queue
├── main.py                     # Simple launcher wrapper
├── CLAUDE.md                   # Claude Code agent instructions
├── GEMINI.md                   # This file — Gemini CLI context
├── .gemini/
│   └── memory/                 # Extended context — read when working in that area
├── src/
│   ├── core/
│   │   └── token_filter.py     # L2 filter: liquidity, age, Jupiter quote validation
│   ├── signals/
│   │   ├── dex_screener.py     # MomentumScanner (DEX Screener API)
│   │   └── rugcheck.py         # Rugcheck (danger risks, score, liquidity check)
│   └── feed/
│       └── discord_broadcaster.py  # Kill feed embeds to #hands-kill-feed
├── hughs-forge/
│   ├── services/trade-orchestrator/  # TradeOrchestrator + Jupiter execution
│   ├── risk-manager/                 # Placeholder (not implemented yet)
│   └── meteora-trader/               # Meteora DLMM scanner (--meteora flag)
├── haplos-workshop/
│   ├── ci/                     # CI scripts for phantom-gauntlet
│   └── tools/                  # Signal intel tools
├── tools/
│   └── solana-wallet-analyzer/ # Deployed to Hugh, analyzes wallet history
└── .github/workflows/
    └── deploy-mvp.yml          # Auto-deploys to Hugh on merge to main
```

### How the threads fit together in combined_runner.py
```
main thread
├── pump_thread        — Pump.fun scanner (blocking, runs in thread)
├── meteora_thread     — Meteora scanner (optional, --meteora flag)
├── loop_thread        — asyncio event loop + TradeOrchestrator
├── retry_thread       — 24h adaptive retry queue (OWN loop + OWN MomentumScanner)
├── balance_thread     — wallet balance monitor
└── health_thread      — HTTP health server (port 8002)
```

**Important:** The retry thread has its own `MomentumScanner()` instance and its own `asyncio.new_event_loop()`. Never share the main scanner — that's what caused the aiohttp crash (PR #200 fix).

---

## 4. The aiohttp Fix (PR #200 — MERGED)

The retry thread was reusing `self.momentum_scanner` from the main pump scanner thread. That scanner's `aiohttp.ClientSession` was created inside the pump scanner's asyncio event loop. Calling it from a different event loop in the retry thread caused `RuntimeError: Session is bound to a different event loop`.

**Fix:** `_start_retry_loop()` now creates a dedicated `MomentumScanner()` instance (`retry_scanner`) inside the retry thread, along with its own `asyncio.new_event_loop()`. The scanner is closed cleanly on thread exit. Merged at commit `3ea6d65`. Working in production.

---

## 5. The 24h Adaptive Queue (PR #202 — MERGED)

When a token passes the scanner but fails leash checks, it goes into `_retry_queue` (an `OrderedDict`) instead of being dropped. The retry thread re-checks it at adaptive intervals:

| Token age | Check interval |
|---|---|
| 0–5 min | every 30s |
| 5–30 min | every 2 min |
| 30 min–6h | every 10 min |
| 6h–24h | every 30 min |

After 24h (`SNIPER_RETRY_MAX_AGE_S=86400`), the token is silently dropped. If leash fails on retry, the token stays in queue — only removed on buy success or 24h expiry.

PR #203 (merged) updated the queued embed text from "retry in ~15 min" to "watching for up to 24h".

---

## 6. Trading Pipeline State (Hugh — LIVE)

**Service:** `systemctl --user status patryn-trader` on Hugh
**Mode:** $0.01 SOL trades, $1 max cap, mainnet
**Env config:** `~/.config/systemd/user/patryn-trader.service.d/env.conf`

**Two-layer defense:**
- L1-Leash (MomentumScanner): volume, buyers, liquidity, rugcheck thresholds
- L2-Filter (TokenFilter): age, liquidity range, Jupiter quote, price impact, rate limit
- L1.5-Enhanced: rugcheck, 5m unique buyers scaling with age, 5m volume

**Key env vars on Hugh:**
```
SNIPE_AMOUNT_SOL=0.01
SNIPER_RETRY_MAX_AGE_S=86400
LEASH_MIN_LIQUIDITY_USD=10000
LEASH_MIN_FDV_USD=10000
LEASH_MIN_VOL_5M_SOL=7
LEASH_MIN_BUYERS_1H=50
LEASH_MIN_BUYERS_PER_5M=10
SCAN_RUGCHECK_ENABLED=true
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<key>
HELIUS_API_KEY=<key>
PYTHONUNBUFFERED=1
```

**Discord kill feed:** `#hands-kill-feed` (channel ID: 1478255757492228149)
**Assassin's Ledger DB:** `/data/openclaw/workspace/Pryan-Fire/trades.db` on Hugh

**Known broken:** Pump.fun scanner checks DEX Screener immediately at launch — pre-bonded tokens haven't listed yet so "No pairs found" is returned. The 24h retry queue helps but the real fix is a pre-bonding delay queue (rules #14–#21, not yet built).

---

## 7. Branch & Deploy Rules

```
branch → PR → phantom-gauntlet CI (Haplo runner) → merge to main → deploy-mvp.yml auto-deploys to Hugh
```

1. Always check staleness first:
   ```bash
   git fetch origin
   git log --oneline HEAD..origin/main
   ```
   If any output: rebase before anything else.

2. Branch naming: `feat/<short>`, `fix/<short>`, `hotfix/<short>`. Always from main, always targeting main.

3. One concern per PR. Must pass CI before merge. Delete branch after merge.

4. PR open >48h without merge = stale. Rebase and update or close.

5. Never directly SSH into Hugh and edit files. Changes only go through git pipeline.

6. After any merge touching trading code, Hugh runs a 0.001 SOL micro-trade test and reports in #trading.

7. **PR #195** (`feat/Jupiter swap execution`) is currently open and stale. Branch: `feature/126-meteora-dynamic-fees`. Must be rebased before touching or merging.

---

## 8. GitHub Setup

**Org:** `The-Nexus-Decoded`

| Repo | Purpose |
|---|---|
| Chelestra-Sea | Issues tracker, networking, integration |
| Pryan-Fire | Trading code, tools, agent services |
| Abarrach-Stone | Data / schemas |
| Arianus-Sky | UIs / dashboards |
| Nexus-Vaults | Workspace snapshots |

**Issue tracking:** All work gets a Chelestra-Sea issue. Every change gets documented there — summary, files changed, implementation notes, test results. This is not optional. The task is not done until the ticket is updated.

**Auth on Hugh/Haplo:** Legacy PATs. `gh` CLI is authenticated. On Zifnab: GitHub App (`zifnab-bot[bot]`) with full issue/PR write access. Use Zifnab for issue creation when possible.

---

## 9. OpenClaw Infrastructure (Don't Touch — Reference Only)

Each server runs three services alongside the trading code:
- `openclaw-gateway.service` — AI agent runtime
- `openclaw-rate-guard.service` — TypeScript proxy at localhost:8787, routes Gemini API calls
- `openclaw-openrouter-proxy.service` — OpenRouter budget proxy at localhost:8788

Config lives at `/home/openclaw/.openclaw/openclaw.json` — owner-only, do not edit.

After any OpenClaw npm update, the rate guard vendor patches must be reapplied:
```bash
sudo bash /data/openclaw/rate-guard-v2/reapply-rate-guard-patches.sh
```
Then restart the gateway. After every gateway restart: check logs for Discord "logged in", curl the health endpoint, send a test Discord message.

---

## 10. Pending Work

**P0 — Do this before anything else:**
PR #195 is stale and must be rebased. `git fetch origin && git rebase origin/main` on `feature/126-meteora-dynamic-fees`, then `git push --force-with-lease`. Do not merge until CI passes.

**P1 — Risk manager / circuit breaker**
`hughs-forge/risk-manager/` is a placeholder. This is the next major feature. Chelestra-Sea #88. Owner must sign off before starting.

**P2 — Pre-bonding pipeline (rules #14–#21)**
Delay queue before DEX Screener check, on-chain bonding status, linked wallet detection, min txns/15min. Full spec in Chelestra-Sea #83 and `.gemini/memory/solana-trading.md`.

**P3 — Wallet separation**
Separate wallets for Jupiter trading vs Meteora LP. Owner decision needed.

**P4 — Post-merge test hook**
Add to Hugh's SOUL.md: after trading code merges, run 0.001 SOL test and report in #trading.

---

## 11. Discord Channels

| Channel | ID | Notes |
|---|---|---|
| #the-nexus | 1475082874234343621 | All bots, requireMention: true |
| #trading | 1475082964156157972 | Hugh, requireMention: true |
| #jarvis | 1475082997027049584 | Zifnab monitoring, requireMention: false |
| #coding | 1475083038810443878 | Haplo + Zifnab, requireMention: true |
| #hands-kill-feed | 1478255757492228149 | Kill feed (webhook) |
| #nexus-health | 1478276459134193775 | Fleet health embeds (auto, every 10 min) |

**Guild ID:** 1475082873777426494

To message agents from SSH (Zifnab's server — he can't receive Discord messages sent by himself):
```bash
nohup openclaw agent --agent main --message 'XAR - <msg>' \
  --deliver --channel discord --reply-to 1475082997027049584 \
  > /tmp/cmd.log 2>&1 &
```

Discord formatting: plain text only, no markdown, no em-dashes.

---

## 12. Key Files Quick Reference

| What | Path | Server |
|---|---|---|
| Main runner | `/data/openclaw/workspace/Pryan-Fire/combined_runner.py` | Hugh |
| Token filter | `/data/openclaw/workspace/Pryan-Fire/src/core/token_filter.py` | Hugh |
| DEX screener | `/data/openclaw/workspace/Pryan-Fire/src/signals/dex_screener.py` | Hugh |
| Rugcheck | `/data/openclaw/workspace/Pryan-Fire/src/signals/rugcheck.py` | Hugh |
| Kill feed | `/data/openclaw/workspace/Pryan-Fire/src/feed/discord_broadcaster.py` | Hugh |
| Trades DB | `/data/openclaw/workspace/Pryan-Fire/trades.db` | Hugh |
| Trader env | `~/.config/systemd/user/patryn-trader.service.d/env.conf` | Hugh |
| OpenClaw config | `/home/openclaw/.openclaw/openclaw.json` | All (owner-only) |
| Rate guard config | `/data/openclaw/rate-guard-v2/rate-guard-limits.json` | All (owner-only) |
| Fleet analytics DB | `/data/openclaw/rate-guard-v2/rate-guard-analytics.db` | Zifnab (aggregated) |
| Fleet CLI | `/usr/local/bin/fleet` | All |

---

## 13. Important Gotchas

- **Never `systemctl restart` when editing counters.json** — SIGTERM saves in-memory state on shutdown, overwriting your edits. Must stop → edit → start.
- **OpenClaw patches are overwritten by updates.** After any `openclaw` npm update, run the reapply script on all 3 servers then restart gateways.
- **Zifnab self-corrupts config** on restarts (renames `streaming` → `streamMode`). Always verify config after Zifnab gateway restarts.
- **Never put flash-lite or any non-thinking model in the Gemini priority chain** — causes `thought_signature` errors.
- **Session poisoning:** If an agent gets 5+ consecutive identical errors, it may stop trying that tool. Fix: truncate the session `.jsonl` file (keep the session KEY in sessions.json). Never delete session keys.
- **`npm install -g .` breaks after updates.** Always use `npm pack` tarball method for global installs.
- **Haplo's edit/write tools are workspace-scoped.** Agents must use `/data/openclaw/workspace/` paths, not `/data/repos/`.
- **Ollama 7B cannot do tool use** — hallucinates results. Background file parsing only.
- **FILTER_* env vars in Hugh's env.conf may be stale.** Check for old `VOL=7`, `BUYERS_1H=50` overrides — remove them, those values are now set via the leash system.

---

## 14. Memory Files

The `.gemini/memory/` directory has detailed operational notes for when you need to go deeper:

| File | What's in it |
|---|---|
| `openclaw-server-config.md` | Gateway management, provider config structure, full tokens |
| `openclaw-decisions.md` | BAD IDEAS list, lessons learned, standing rules — read this before any significant change |
| `rate-guard-ops.md` | Rate guard proxy architecture, vendor patch checklist, counter sync procedure |
| `openclaw-models.md` | Model chains, API keys, OpenRouter proxy, Ollama specs |
| `openclaw-scheduling.md` | All cron jobs, fleet timers, change protocol |
| `openclaw-config-gotchas.md` | Invalid config keys, JSON editing rules, workspace path enforcement |
| `openclaw-github-discord.md` | GitHub App auth, repo mapping, Discord bot IDs, how to message each agent |
| `lobster-pipelines.md` | Lobster pipeline syntax, fleet CLI commands, Death Gate pipelines |
| `solana-trading.md` | Full scanner pipeline spec, trading rules, wallet details, rugcheck notes |
