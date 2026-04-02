# ACTIVE-TASKS.md (Updated 2026-03-01 by ZIFNAB)

## Automated Monitoring (DO NOT TOUCH — set up by XAR)

### Rate Guard Fleet Monitor (15-min cron)
- Script: `/data/openclaw/rate-guard-v2/rate-guard-monitor.sh`
- Cron: `*/15 * * * *` — curls /health on all 3 proxies, posts report to #jarvis
- Status: ACTIVE AND RUNNING

### Memory Guard (cron every 5min)
- Watches MEMORY.md for corruption, auto-restores from shadow copy
- Running on ALL 3 servers — DO NOT DISABLE

## Active Tasks

- [x] Claude Code & Build Workflow Integration (Nexus-Vaults #11) - Haplo - Pattern verified and ready for delegation.
- [x] Pryan-Fire Windows Clone (Nexus-Vaults #11 related) - Zifnab - `Pryan-Fire` repository successfully cloned to `C:\Users\olawal\Pryan-Fire` on Windows workstation.
- [x] Claude Code Analysis (Nexus-Vaults #11) - Zifnab - Completed initial analysis; identified race condition.
- [ ] Fleet Workspace Git Sync (Nexus-Vaults#1) - Zifnab - Ongoing daily redaction and push to GitHub.
- [ ] Meteora REST API Integration (Pryan-Fire) - Haplo - Switch to Shyft API for position reads. Support configurable profit rules per wallet.
- [ ] Security: PAT exposed in channel - rotation required (Chelestra-Sea #43) - Zifnab, Haplo (action pending)

### Lord Xar: Document Sync & Re-parse (2026-03-05)
- Status: **IN PROGRESS** — delegated to Haplo
- Source: Windows `H:\IcloudDrive\...\Documents` (52,849 files)
- Target: `/data/openclaw/staging/` on ola-claw-main
- Acceptance: Full 52K indexed in SQLite DB
- **Rate Guard Fleet Monitor:** Active (15-min cron).
- **Memory Guard:** Active (5-min cron).
- **GitHub Operations:** Restored. Merging/closing PRs functional. Haplo has admin on Pryan-Fire. Open PRs can be processed.
- **Trading Pipeline (Pryan-Fire #133–#139, #141, #145):** Implementation complete in workspace on ola-claw-dev but **NOT YET COMMITTED**. Key fixes deployed:
  - TradeExecutor: config-driven paper mode, fail-fast wallet loading (#136, #139)
  - Jupiter swap execution via direct HTTP (#134)
  - Signal ingestion endpoint on orchestrator (#138)
  - Pyth price fallback to CoinGecko (> $1k) (#137)
  - RiskManager Discord integration with mock fallback (#141)
- **Jupiter Swap PR #195:** Open but has merge conflicts; requires rebase onto current main before review.
- **Jupiter v6 deserialization (#152):** Merged (resolved).
- **Wallet History Analysis:** Completed. Extracted trades from Owner wallet (73,660 transactions) and Bot wallet (933 transactions). Insights:
  - Owner: 14,701 trades across 532 tokens; average fee 0.00064 SOL/trade; strong speculative bias (187 "pump" tokens, minimal USDC/wSOL). Activity peaks Fri 13:00-17:UTC.
  - Bot: No token balance changes detected (transactions likely non-trade or pre-funding). Data archived in `Pryan-Fire/tools/solana-wallet-analyzer/output_analysis/`.
- **Service Status (ola-claw-trade):** patryn-trader running (PID 610795) but **stub Jupiter** (pre-merge code). Cannot execute real trades until #159 is merged and deployed.
- **Wallet Credentials:** ✅ Provisioned on ola-claw-trade (Pryan-Fire #145 complete). File: `/data/openclaw/keys/trading_wallet.json` (600)
- **Next Steps:**
  1. Lord Xar merges PR #159
  2. Deploy to ola-claw-trade via `patryn-workhorse` + `nexus-bridge`
  3. Perform devnet smoke test ($1-2) then mainnet trade
  4. Rotate Jupiter API key (**Pryan-Fire #211** — assigned to Lord Xar, P0 blocker)
- **Pryan-Fire #205:** Full regression analysis on trading data (wins/losses patterns) → knowledge base — Hugh (P1)

### Project: The Assassins Ledger (Arianus-Sky #3)
- **Status:** LAUNCHED — GitHub Project #11 created, tickets assigned.
- **Supervision:** Alfred (Windows CLI) | Coordination: Zifnab
- **Haplo Tickets:**
  - Pryan-Fire #184: Enhanced trade data capture
  - **Pryan-Fire #185: Discord webhook broadcaster → ABANDONED (wrong assignment)**
  - **Chelestra-Sea #84: Meteora DLMM webhook → COMPLETED (PR #89 merged)**
  - Abarrach-Stone #3: trades.db schema migration
- **Lord Xar Ticket:** Chelestra-Sea #78 (Discord webhook setup) — still needed for URL
- **Milestones:**
  - [x] Haplo completes Meteora webhook service and PR merged
  - [ ] DB migration validated against existing 564 records
  - [ ] Discord webhook URL provisioned by Lord Xar (Chelestra-Sea#78)
  - [ ] End-to-end feed verification in #trading channel
- **Blockers:** Awaiting webhook creation (Chelestra-Sea#78) before final integration test.

### Haplo: Monorepo Migration (Nexus-Vaults #15)
- Status: **IN PROGRESS** - Consolidating all realm code into The-Nexus monorepo.
- Current task: Creating PR with full consolidated structure.
- Follow-up task: Nexus-Vaults #16 (file completeness verification) will run after merge.

### Haplo: Librarian Phase (Nexus-Vaults #17)
- Status: **PENDING** - Surgical refinement after initial consolidation.
- Tasks: Master Map README, file redistribution (feeds→Arianus-Sky, trades.db→Abarrach-Stone, memory→Nexus-Vaults, Chelestra-Sea integration), path logic updates, context realignment.
- Will start after initial migration PR is opened/merged.

### Haplo: PR Review & Deployment
- **Review pending:** PR #210 (orchestrator wrapper) — blocked until Jupiter key rotation (#211) completes
- After key rotation: approve PR #210 → merge → deploy → verify wrapper activation

### Hugh: Chelestra-Sea #2 (Profile Distillation)
- Status: **COMPLETED** (2026-03-02 01:15 CST)
- Result: Processed 22,630 files, 44 errors; SQLite + ChromaDB fully built

### Lord Xar: Lobster Workflow Management
- **Nexus-Vaults #18:** Automate workflow deployment and sync across fleet — IN PROGRESS (policy design, verification script built)
- **Chelestra-Sea #96:** PR merged; `.github/workflows/deploy-on-merge.yml` added to main (post-merge fix) — awaiting secret setup to activate
- Under direct management.

## RESOLVED (DO NOT RE-ASSIGN)
- Fleet Security & Cost Monitoring (Pryan-Fire #94) — DONE (2026-03-01)
- Issue #1 (Self-hosted runner setup) — DONE (2026-03-01)
- PR #120 (Race condition fix) — MERGED (2026-03-01)
- PR #132 (Volatility-Aware Rebalancing Implementation) — MERGED (2026-03-01 23:34)
- Pryan-Fire #122 (Volatility-Aware Rebalancing) — DEPLOYED (2026-03-01)
- Pryan-Fire #125 (Devnet Testing Approval) — CLOSED (2026-03-01)
- Nexus-Vaults #10 (GitHub auth issue) — RESOLVED (2026-03-01)
- Chelestra-Sea #34, #35, #48 — CLOSED (2026-03-01)
- Issue #11 (Meteora Tracking) — DONE
- Issue #117 (Hugh's Env Alignment) — DONE
- Issue #15/PR #116 (Pyth Hermes) — DONE
- Issue #18 (Standardized Health) — DONE
- fleet-health-check.lobster — DELETED (Redundant)
- Issues #9, #6 — CLOSED (Duplicates)

