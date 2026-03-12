# Roadmap: OpenClaw Homelab

## Overview

This roadmap delivers a 3-server autonomous productivity system in 5 phases. Infrastructure comes first. Dev Factory setup follows immediately because all subsequent integrations are built on ola-claw-dev and deployed to the other servers. Crypto trading follows in two phases -- Meteora LP farming with the full risk management layer, then leveraged trading (DefiTuna and Hyperliquid) -- all built by the Dev Factory and deployed to ola-claw-trade. Jarvis and job scanning activate once crypto is operational and producing data. Monitoring, local LLMs, and voice finish the system.

**Build philosophy:** Code is written on ola-claw-dev (Dev Factory), tested there, then deployed to ola-claw-trade (Crypto) or ola-claw-main (Jarvis) over Tailscale. The trading and Jarvis servers never build their own integrations.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure and Notifications Foundation** - Provision all 3 servers, harden security, establish Discord/iMessage alert channels
- [ ] **Phase 2: Dev Factory + Crypto Core** - Stand up Dev Factory (agents, VS Code, GitHub, CI/CD), then build Meteora + risk manager on dev, deploy to trade
- [ ] **Phase 3: Leveraged Trading -- DefiTuna and Hyperliquid** - Dev Factory builds leveraged LP + Hyperliquid integrations, deploys to trade
- [ ] **Phase 4: Jarvis, Jobs, and Quant** - Personal intelligence hub, job scanning, quant analysis on ola-claw-main, with cross-server orchestration
- [ ] **Phase 5: Monitoring, Local LLM, Voice, and Operational Polish** - Cross-server dashboard, local LLM inference, daily digest, voice interaction

## Phase Details

### Phase 1: Infrastructure and Notifications Foundation
**Goal**: All 3 servers are provisioned, hardened, network-connected, and able to send alerts to the owner
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09, NOTIF-01, NOTIF-02
**Success Criteria** (what must be TRUE):
  1. Owner can SSH into all 3 servers from the Windows workstation over Tailscale, and password-based SSH is rejected
  2. OpenClaw is installed and the gateway responds on port 18789 on all 3 servers
  3. Each server has a distinct SOUL.md and the agent responds in character when prompted
  4. Discord bot posts a test message to the correct per-server channel (jarvis, crypto, coding) and owner receives it
  5. iMessage delivers a test critical alert to the owner's phone
  6. Data drives mounted at /data on all servers (2TB NVMe on each)
  7. Weekly backup cron job runs successfully, and backup data appears in iCloud Drive on Windows PC
**Plans**: 4 plans in 3 waves (sequential, 01-04 runs in Wave 2 parallel with 01-02)

Plans:
- [ ] 01-01-PLAN.md -- Server provisioning and security hardening (Ansible roles for Tailscale, SSH, UFW, Fail2ban) [Wave 1]
- [ ] 01-02-PLAN.md -- OpenClaw bare-metal installation, SOUL.md deployment, RPC endpoint storage [Wave 2]
- [ ] 01-03-PLAN.md -- Discord bot channel config and iMessage/ntfy.sh critical alert setup [Wave 3]
- [ ] 01-04-PLAN.md -- Data drive mount (/data) and weekly iCloud backup via rsync to Windows PC [Wave 2]

### Phase 2: Dev Factory + Crypto Core
**Goal**: ola-claw-dev is a fully operational Dev Factory with autonomous coding agents, VS Code Server, and CI/CD. Using that factory, build and deploy the Meteora SDK integration, risk manager, and trade execution pipeline to ola-claw-trade.
**Depends on**: Phase 1
**Requirements**: DEV-01, DEV-02, DEV-03, DEV-04, DEV-05, DEV-06, DEV-07, DEV-08, DEV-12, DEV-13, DEV-14, DEV-15, MET-01, MET-02, MET-03, MET-04, MET-05, RISK-01, RISK-02, RISK-03, RISK-04, RISK-05, RISK-06, RISK-07, NOTIF-03, QUANT-03
**Success Criteria** (what must be TRUE):
  1. ola-claw-dev runs autonomous coding agents that can build and test code without hand-holding
  2. Owner can access VS Code Server on ola-claw-dev via Tailscale from any device
  3. ola-claw-dev has a working CI/CD pipeline that can deploy code to ola-claw-trade over Tailscale
  4. Owner can query current Meteora LP positions and balances from ola-claw-trade and see accurate data
  5. ola-claw-trade opens a Meteora LP position under $250 without human intervention and logs the transaction with tx hash
  6. ola-claw-trade sends a Discord confirmation request for a trade above $250 and blocks execution until the owner replies approve/reject
  7. Risk manager blocks a trade when reserve balance is insufficient, and the owner receives a notification explaining why
  8. Cumulative spend limits (hourly and daily) prevent rapid accumulation of sub-$250 auto-trades, and a circuit breaker pauses trading if too many trades fire in a short window
  9. GSD is installed globally on ola-claw-dev and configured for autonomous operation (skip-permissions, auto flags) so coding agents can run full project lifecycles without prompting
  10. All crypto code was built and tested on ola-claw-dev using GSD workflows before being deployed to ola-claw-trade
**Plans**: TBD

Plans:
- [ ] 02-01: Dev Factory core setup (autonomous coding agents, GSD install + autonomous config, VS Code Server, GitHub integration, CI/CD pipeline to trade+main)
- [ ] 02-02: Crypto SDK integration (Meteora read/write, price feeds, wallet setup) — built on dev, deployed to trade
- [ ] 02-03: Risk manager implementation (threshold, reserves, cumulative limits, circuit breaker) — built on dev, deployed to trade
- [ ] 02-04: Trade execution pipeline with Discord confirmation workflow — built on dev, deployed to trade

### Phase 3: Leveraged Trading -- DefiTuna and Hyperliquid
**Goal**: Dev Factory builds leveraged position management for DefiTuna and Hyperliquid, deploys to ola-claw-trade with liquidation protection and dead man's switch
**Depends on**: Phase 2
**Requirements**: TUNA-01, TUNA-02, TUNA-03, TUNA-04, TUNA-05, HL-01, HL-02, HL-03, HL-04, HL-05, RISK-08
**Success Criteria** (what must be TRUE):
  1. Owner can view all open DefiTuna leveraged LP positions and their margin ratios from ola-claw-trade
  2. ola-claw-trade automatically adds collateral to a DefiTuna position approaching its liquidation threshold, and the owner receives an iMessage alert
  3. Global circuit breaker closes all leveraged positions when the reserve drops below 30%, and the owner is notified
  4. Hyperliquid spot and perp trades execute through the existing risk manager, with funding rate costs tracked as a separate P&L line item
  5. Dead man's switch triggers emergency position close if ola-claw-trade goes offline for a configured interval during active leveraged positions
  6. All leveraged trading code was built and tested on ola-claw-dev before being deployed to ola-claw-trade
**Plans**: TBD

Plans:
- [ ] 03-01: DefiTuna SDK integration with liquidation monitoring and auto-collateral — built on dev, deployed to trade
- [ ] 03-02: Hyperliquid SDK integration (spot + perps + funding rate tracking) — built on dev, deployed to trade
- [ ] 03-03: Dead man's switch and global circuit breaker — built on dev, deployed to trade

### Phase 4: Jarvis, Jobs, and Quant
**Goal**: ola-claw-main is a proactive personal intelligence hub ("Jarvis") that ingests the owner's files, emails, and messages, orchestrates the other servers, generates quant signals for ola-claw-trade, and surfaces job opportunities. Dev Factory builds any new integrations Jarvis or the owner requests.
**Depends on**: Phases 2 and 3 (Jarvis needs crypto data flowing to analyze, and Dev Factory operational to build integrations on demand)
**Requirements**: JARVIS-01, JARVIS-02, JARVIS-03, JARVIS-04, JARVIS-05, JARVIS-06, JARVIS-07, JARVIS-08, SOCIAL-01, SOCIAL-02, SOCIAL-03, SOCIAL-04, SOCIAL-05, QUANT-01, QUANT-02, JOBS-01, JOBS-02, JOBS-03, JOBS-04, JOBS-05, DEV-09, DEV-10, DEV-11, CTX-01, CTX-02, CTX-03, CTX-04
**Success Criteria** (what must be TRUE):
  1. ola-claw-main delivers a daily briefing (unprompted) covering emails, calendar, pending tasks, and opportunities
  2. ola-claw-main makes context-aware suggestions based on what the owner is working on
  3. ola-claw-main scans at least one freelance platform on a recurring schedule and posts ranked matches to Discord
  4. ola-claw-main classifies which surfaced jobs could be completed autonomously by AI
  5. Owner can search across all ingested data (emails, files, messages) using natural language via vector DB
  6. ola-claw-main can browse the owner's Windows PC files via SMB share over Tailscale
  7. ola-claw-main can read the owner's recent emails and use them for context
  8. Jarvis can query ola-claw-trade for crypto positions/P&L and ola-claw-dev for project status, and present a unified view
  9. Jarvis can delegate tasks to the other servers (e.g., "check balance" to trade, "build this integration" to dev)
  10. Jarvis generates quant entry/exit signals from on-chain data, technical indicators, and social sentiment, and feeds them to ola-claw-trade for execution
  11. Jarvis monitors X/Twitter and Reddit for crypto token mentions, sentiment shifts, and emerging narratives, and incorporates social signals into trading analysis
  12. Jarvis surfaces non-crypto trends and news relevant to the owner from social media
  13. Owner can tell Jarvis to build something and Jarvis coordinates with Dev Factory to deliver it
**Plans**: TBD

Plans:
- [ ] 04-01: Owner context ingestion (SMB file share, email IMAP, message feed, vector DB indexing) — built on dev, deployed to main
- [ ] 04-02: Cross-server orchestration (Jarvis reads data from trade+dev via gateway API, task delegation protocol) — built on dev, deployed to main
- [ ] 04-03: Jarvis intelligence layer (daily briefings, context-aware suggestions, proactive research, pattern learning) — built on dev, deployed to main
- [ ] 04-04: Job scanner pipeline (platform scanning, deduplication, ranking, AI-task identification, notifications) — built on dev, deployed to main
- [ ] 04-05: Social media research pipeline (X/Twitter monitoring, Reddit/Discord/Telegram scanning, sentiment scoring, trend detection) — built on dev, deployed to main
- [ ] 04-06: Quant analysis engine (token trend analysis, social sentiment integration, signal generation, strategy feed to ola-claw-trade) — built on dev, deployed to main
- [ ] 04-07: Dev Factory integration builder (API connectors for Xano/Supabase/REST, on-demand integration builds for trade+main)

### Phase 5: Monitoring, Local LLM, Voice, and Operational Polish
**Goal**: Owner has a single dashboard showing all 3 servers' health, crypto P&L, and job pipeline status, local LLM inference to cut cloud costs, and voice interaction with the servers
**Depends on**: Phases 2, 3, 4 (needs all servers producing data)
**Requirements**: MON-01, MON-02, MON-03, MON-04, MON-05, NOTIF-04, LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05
**Success Criteria** (what must be TRUE):
  1. Owner opens a Grafana dashboard via Tailscale and sees open positions, balances, recent trades, and P&L across Meteora, DefiTuna, and Hyperliquid
  2. Dashboard shows health status of all 3 servers on a single page (up/down, CPU, memory, last activity)
  3. Every trade and significant event has an audit trail entry with timestamp, parameters, and transaction hash, queryable from the dashboard
  4. Quant signals from Jarvis (Phase 4) are visible in the dashboard alongside positions and P&L
  5. Owner receives a daily Discord digest summarizing overnight activity across all 3 servers
  6. Owner can speak a command near a server and receive a spoken response (STT + TTS working end-to-end)
  7. Wake word ("Hey Ola" or configured phrase) activates listening without touching a keyboard
  8. Local LLM inference server responds to OpenClaw requests without hitting cloud APIs
  9. OpenClaw falls back to cloud API gracefully when local model can't handle the request
**Plans**: TBD

Plans:
- [ ] 05-01: Grafana + Prometheus monitoring stack with cross-server health
- [ ] 05-02: Trade audit trail and P&L dashboard
- [ ] 05-03: Daily digest and notification polish
- [ ] 05-04: Local LLM infrastructure (GPU drivers, Ollama/vLLM, model management, OpenClaw routing, cloud fallback)
- [ ] 05-05: Voice interface (audio hardware setup, STT/TTS pipeline, wake word detection)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5
Dev Factory (ola-claw-dev) is set up first in Phase 2, then builds ALL subsequent integrations for ola-claw-trade and ola-claw-main. No server builds its own integrations.

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Infrastructure and Notifications Foundation | 0/4 | Planned | - |
| 2. Dev Factory + Crypto Core | 0/4 | Not started | - |
| 3. Leveraged Trading -- DefiTuna and Hyperliquid | 0/3 | Not started | - |
| 4. Jarvis, Jobs, and Quant | 0/7 | Not started | - |
| 5. Monitoring, LLM, Voice, and Operational Polish | 0/5 | Not started | - |

---
*Roadmap created: 2026-02-17*
*Depth: Quick (5 phases)*
*Coverage: 91/91 v1 requirements mapped*
