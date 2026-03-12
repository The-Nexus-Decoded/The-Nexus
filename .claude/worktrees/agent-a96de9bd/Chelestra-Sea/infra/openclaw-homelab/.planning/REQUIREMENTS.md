# Requirements: OpenClaw Homelab

**Defined:** 2026-02-17
**Core Value:** Autonomous productivity -- the system works while you don't, generating income through crypto trading and freelance work, and accelerating your coding projects.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: All 3 Ubuntu 24.04 LTS servers provisioned bare-metal (no Docker, no VMs for OpenClaw)
- [ ] **INFRA-02**: OpenClaw installed native on all 3 servers via `openclaw onboard --install-daemon`
- [ ] **INFRA-03**: Tailscale VPN mesh connecting all 3 servers + Windows workstation
- [ ] **INFRA-04**: SSH hardened -- password auth disabled, restricted to Tailscale IPs only
- [ ] **INFRA-05**: UFW firewall configured per server (only required ports open)
- [ ] **INFRA-06**: SOUL.md configured per server with specialized agent personality
- [ ] **INFRA-07**: Paid Solana RPC endpoint configured (Helius or QuickNode) for reliable DeFi operations
- [ ] **INFRA-08**: Data drive mounted at /data on all servers (2TB NVMe on trade+dev for models/trading, 3x 240GB SSD LVM span on main for Jarvis context data) -- 240GB SSD for OS only
- [ ] **INFRA-09**: Weekly automated backup from all servers to iCloud via rsync to Windows PC over Tailscale

### Notifications

- [ ] **NOTIF-01**: Discord bot operational with per-server channels (crypto, jobs, coding)
- [ ] **NOTIF-02**: iMessage alerts for critical events (near-liquidation, large trade confirmations, server down)
- [ ] **NOTIF-03**: Trade confirmation workflow -- trades above $250 require owner approval via Discord reply
- [ ] **NOTIF-04**: Daily Discord digest summarizing overnight activity across all 3 servers

### Crypto Trading -- Meteora

- [ ] **MET-01**: MeteoraAg SDK integrated -- read current LP positions and balances
- [ ] **MET-02**: Open and close DLMM LP positions via SDK
- [ ] **MET-03**: Collect accumulated LP fees
- [ ] **MET-04**: Fee compounding -- auto-reinvest collected fees back into positions
- [ ] **MET-05**: Position P&L tracking -- net calculation: fees earned minus IL minus gas costs

### Crypto Trading -- DefiTuna

- [ ] **TUNA-01**: DefiTuna tuna-sdk integrated -- read leveraged LP positions
- [ ] **TUNA-02**: Open and close leveraged LP positions via SDK
- [ ] **TUNA-03**: Monitor margin ratio and liquidation proximity
- [ ] **TUNA-04**: Auto-add collateral when approaching liquidation threshold
- [ ] **TUNA-05**: Global circuit breaker -- close all leveraged positions if reserve drops below 30%

### Crypto Trading -- Hyperliquid

- [ ] **HL-01**: Hyperliquid Python SDK integrated -- read balances and positions
- [ ] **HL-02**: Execute spot trades via SDK
- [ ] **HL-03**: Execute leveraged (perp) trades via SDK
- [ ] **HL-04**: Track funding rate costs as separate P&L line item
- [ ] **HL-05**: Position monitoring with liquidation proximity alerts

### Risk Management

- [ ] **RISK-01**: Deterministic risk manager (non-LLM Python) gates every trade before execution
- [ ] **RISK-02**: Auto-execute trades under $250, require Discord confirmation above $250
- [ ] **RISK-03**: Reserve balance enforcement -- block trades if insufficient reserves
- [ ] **RISK-04**: Cumulative spend limits -- rolling hourly and daily auto-trade caps
- [ ] **RISK-05**: Trade frequency circuit breaker -- pause and notify if too many trades in short window
- [ ] **RISK-06**: Wallet separation -- hot wallet with daily operating funds only, bulk capital stays cold
- [ ] **RISK-07**: Reserve health score -- single metric showing remaining trading runway
- [ ] **RISK-08**: Dead man's switch -- emergency position close if servers go offline during leveraged trades

### Social Media Research (runs on Jarvis, feeds into quant analysis)

- [ ] **SOCIAL-01**: X/Twitter monitoring -- track crypto influencers, token mentions, sentiment shifts, and trending topics in real time
- [ ] **SOCIAL-02**: Multi-platform social scanning -- monitor Reddit (r/solana, r/cryptocurrency), Discord alpha groups, and Telegram channels for early token signals
- [ ] **SOCIAL-03**: Social sentiment scoring -- aggregate social buzz into a per-token sentiment score that feeds into quant signal generation
- [ ] **SOCIAL-04**: Trend detection -- identify emerging narratives (new protocols, meta shifts, whale movements) before they hit mainstream crypto Twitter
- [ ] **SOCIAL-05**: General social media research -- monitor X and other platforms for non-crypto trends relevant to the owner (tech, jobs, industry news)

### Crypto Analysis (runs on Jarvis, feeds signals to ola-claw-trade)

- [ ] **QUANT-01**: Quant-style token trend analysis using on-chain data, technical indicators, and social sentiment
- [ ] **QUANT-02**: Signal generation for entry/exit points — Jarvis analyzes, ola-claw-trade executes
- [ ] **QUANT-03**: Price feed integration (Pyth/Jupiter for Solana, Hyperliquid REST for HL)

### Jarvis / Personal Intelligence (ola-claw-main)

- [ ] **JARVIS-01**: Proactive daily briefing -- summarize emails, calendar, pending tasks, and opportunities without being asked
- [ ] **JARVIS-02**: Context-aware suggestions -- surface relevant actions based on what the owner is working on, reading, or discussing
- [ ] **JARVIS-03**: Pattern recognition -- learn the owner's routines, preferences, and priorities over time to improve suggestions
- [ ] **JARVIS-04**: Vector database for semantic search across all ingested data (emails, files, messages, job listings)
- [ ] **JARVIS-05**: Preemptive research -- when the owner starts a new topic or project, automatically gather relevant background info
- [ ] **JARVIS-06**: Cross-server data ingestion -- pull trade history, P&L, positions from ola-claw-main and project/code status from ola-claw-dev to build a unified picture
- [ ] **JARVIS-07**: Cross-server task delegation -- dispatch work to ola-claw-main (e.g., "check my SOL balance") or ola-claw-dev (e.g., "run the test suite on project X") when Jarvis can't do it locally
- [ ] **JARVIS-08**: Unified status awareness -- Jarvis knows what every server is doing at all times and can answer "what's happening across my system?" in one response

### Jobs (Server 2)

- [ ] **JOBS-01**: Scan freelance platforms (Upwork, Fiverr, Toptal) for matching opportunities
- [ ] **JOBS-02**: Surface full-time job openings matching owner's skills
- [ ] **JOBS-03**: AI-task identification -- classify which tasks can be completed autonomously by AI
- [ ] **JOBS-04**: Opportunity ranking -- score jobs by effort/payout ratio
- [ ] **JOBS-05**: Job match notifications via Discord with ranked list

### Dev Factory (ola-claw-dev)

- [ ] **DEV-01**: OpenClaw coding agents operational on ola-claw-dev — can run autonomously on tasks without hand-holding
- [ ] **DEV-02**: Day-to-day coding task assistance (debugging, refactoring, code review)
- [ ] **DEV-03**: App idea generation -- brainstorm, evaluate, and prototype new project ideas
- [ ] **DEV-04**: Build complete apps from scratch -- take an idea through design, code, test, and deploy autonomously
- [ ] **DEV-05**: Assist with existing projects -- understand codebase context, contribute code, extend features
- [ ] **DEV-06**: GitHub integration -- PR reviews, issue tracking, code suggestions, branch management
- [ ] **DEV-07**: VS Code Server (code-server) accessible via Tailscale -- owner can remote into a full IDE on ola-claw-dev from any device
- [ ] **DEV-08**: API integration builder -- connect to any external API (Xano, Supabase, REST, GraphQL, webhooks) as directed by owner or Jarvis
- [ ] **DEV-09**: Build and deploy integrations for ola-claw-trade -- SDK wrappers, trading tools, custom connectors, strategy implementations
- [ ] **DEV-10**: Build and deploy integrations for ola-claw-main -- Jarvis context connectors, data pipelines, new intelligence modules
- [ ] **DEV-11**: Autonomous job execution -- receive a coding task from Jarvis or owner, independently research, plan, code, test, and deliver
- [ ] **DEV-12**: CI/CD pipeline -- test, lint, and deploy code to the other servers over Tailscale
- [ ] **DEV-13**: GSD (Get Shit Done) installed globally on ola-claw-dev -- spec-driven development with phase planning, atomic commits, and subagent orchestration for every code project
- [ ] **DEV-14**: GSD configured for autonomous operation -- skip-permissions mode, auto flags on all commands, minimal human prompts so coding agents can run end-to-end without hand-holding
- [ ] **DEV-15**: GSD project lifecycle -- agents can run full GSD workflows (/gsd:new-project, /gsd:plan-phase, /gsd:execute-phase, /gsd:verify-work) autonomously when building integrations for trade+main

### Owner Context Feed

- [ ] **CTX-01**: Server can access owner's Windows PC files via SMB share over Tailscale
- [ ] **CTX-02**: Server can read owner's emails (IMAP integration) to understand needs and context
- [ ] **CTX-03**: Server can receive text/message data to understand owner's communications
- [ ] **CTX-04**: Structured data feed from Windows PC to server (calendar, recent files, email summaries)

### Voice Interface

- [ ] **VOICE-01**: USB audio hardware (speakerphone or mic+speaker) connected to voice-enabled servers
- [ ] **VOICE-02**: Speech-to-text -- convert owner's spoken commands to text for OpenClaw (Whisper or similar on-device STT)
- [ ] **VOICE-03**: Text-to-speech -- server speaks responses aloud to owner (Piper TTS or similar on-device TTS)
- [ ] **VOICE-04**: Wake word detection -- hands-free activation without keyboard ("Hey Ola" or similar trigger phrase)
- [ ] **VOICE-05**: Real-time voice conversation mode -- continuous two-way voice interaction with OpenClaw agent

### Monitoring

- [ ] **MON-01**: Remote monitoring dashboard accessible via Tailscale (web UI)
- [ ] **MON-02**: Dashboard shows: open positions, balances, recent trades, P&L across all protocols
- [ ] **MON-03**: Trade/event logging -- audit trail for every action (timestamp, params, tx hash)
- [ ] **MON-04**: Cross-server health monitoring -- single view of all 3 servers' status
- [ ] **MON-05**: Grafana + Prometheus metrics collection from all servers

### Local LLM Infrastructure

- [ ] **LLM-01**: NVIDIA RTX 5090 GPU installed in at least one server with proprietary drivers and CUDA toolkit
- [ ] **LLM-02**: Local LLM inference server operational (Ollama or vLLM) serving models via API on the local network
- [ ] **LLM-03**: OpenClaw configured to route requests to local LLM endpoint instead of cloud API (cost savings mode)
- [ ] **LLM-04**: Model management -- download, swap, and benchmark open-weight models (Llama, Mistral, DeepSeek, Qwen)
- [ ] **LLM-05**: Fallback to cloud API when local model is insufficient or GPU is at capacity

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Trading

- **ADV-01**: Dynamic liquidation buffer -- volatility-scaled safety margin instead of fixed threshold
- **ADV-02**: Overnight batch execution -- time-window aware automation (aggressive off-hours, conservative market hours)
- **ADV-03**: Cross-protocol arbitrage detection across Meteora, DefiTuna, and Hyperliquid
- **ADV-04**: Hyperliquid Rust SDK integration for lower-latency execution paths

### Advanced Jobs

- **AJOB-01**: Autonomous income routing -- full pipeline from scan to effort/payout ranking with auto-bid
- **AJOB-02**: Portfolio of AI-completed micro-tasks generating passive income

### Advanced Platform

- **APLAT-01**: Lobster pipeline composability -- reusable workflow definitions across servers
- **APLAT-02**: Auto-scaling trade threshold as system proves reliability ($250 -> $500 -> $1000)
- **APLAT-03**: Network failover -- 4G/5G USB dongle backup for Server 1

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile app | Web dashboard via Tailscale works on mobile browser |
| Cloud hosting | Home lab only, no recurring cloud costs |
| iCloud sync to Linux | No Linux support; use Git for code sync |
| Docker/VMs for OpenClaw | Bare-metal for full native performance on all 24 cores |
| Custom trading bots from scratch | Wrap existing SDKs (MeteoraAg, DefiTuna, Hyperliquid) |
| Real-time WebSocket streaming | Polling sufficient for LP farming; WebSocket only for liquidation monitoring |
| Autonomous job application submission | ToS risk on platforms; surface and rank, owner applies manually |
| Self-modifying trading strategy | Unpredictable with real money; AI proposes, owner approves code changes |
| Full tax accounting automation | Log trades with tx hash; export CSV for accountant or Koinly |
| Kubernetes | 3-node homelab overkill; Docker Compose sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Pending |
| INFRA-06 | Phase 1 | Pending |
| INFRA-07 | Phase 1 | Pending |
| INFRA-08 | Phase 1 | Pending |
| INFRA-09 | Phase 1 | Pending |
| NOTIF-01 | Phase 1 | Pending |
| NOTIF-02 | Phase 1 | Pending |
| NOTIF-03 | Phase 2 | Pending |
| NOTIF-04 | Phase 5 | Pending |
| MET-01 | Phase 2 | Pending |
| MET-02 | Phase 2 | Pending |
| MET-03 | Phase 2 | Pending |
| MET-04 | Phase 2 | Pending |
| MET-05 | Phase 2 | Pending |
| TUNA-01 | Phase 3 | Pending |
| TUNA-02 | Phase 3 | Pending |
| TUNA-03 | Phase 3 | Pending |
| TUNA-04 | Phase 3 | Pending |
| TUNA-05 | Phase 3 | Pending |
| HL-01 | Phase 3 | Pending |
| HL-02 | Phase 3 | Pending |
| HL-03 | Phase 3 | Pending |
| HL-04 | Phase 3 | Pending |
| HL-05 | Phase 3 | Pending |
| RISK-01 | Phase 2 | Pending |
| RISK-02 | Phase 2 | Pending |
| RISK-03 | Phase 2 | Pending |
| RISK-04 | Phase 2 | Pending |
| RISK-05 | Phase 2 | Pending |
| RISK-06 | Phase 2 | Pending |
| RISK-07 | Phase 2 | Pending |
| RISK-08 | Phase 3 | Pending |
| SOCIAL-01 | Phase 4 | Pending |
| SOCIAL-02 | Phase 4 | Pending |
| SOCIAL-03 | Phase 4 | Pending |
| SOCIAL-04 | Phase 4 | Pending |
| SOCIAL-05 | Phase 4 | Pending |
| QUANT-01 | Phase 4 | Pending |
| QUANT-02 | Phase 4 | Pending |
| QUANT-03 | Phase 2 | Pending |
| JARVIS-01 | Phase 4 | Pending |
| JARVIS-02 | Phase 4 | Pending |
| JARVIS-03 | Phase 4 | Pending |
| JARVIS-04 | Phase 4 | Pending |
| JARVIS-05 | Phase 4 | Pending |
| JARVIS-06 | Phase 4 | Pending |
| JARVIS-07 | Phase 4 | Pending |
| JARVIS-08 | Phase 4 | Pending |
| JOBS-01 | Phase 4 | Pending |
| JOBS-02 | Phase 4 | Pending |
| JOBS-03 | Phase 4 | Pending |
| JOBS-04 | Phase 4 | Pending |
| JOBS-05 | Phase 4 | Pending |
| DEV-01 | Phase 4 | Pending |
| DEV-02 | Phase 4 | Pending |
| DEV-03 | Phase 4 | Pending |
| DEV-04 | Phase 4 | Pending |
| DEV-05 | Phase 4 | Pending |
| DEV-06 | Phase 4 | Pending |
| DEV-07 | Phase 4 | Pending |
| DEV-08 | Phase 4 | Pending |
| DEV-09 | Phase 4 | Pending |
| DEV-10 | Phase 4 | Pending |
| DEV-11 | Phase 4 | Pending |
| DEV-12 | Phase 4 | Pending |
| DEV-13 | Phase 2 | Pending |
| DEV-14 | Phase 2 | Pending |
| DEV-15 | Phase 2 | Pending |
| CTX-01 | Phase 4 | Pending |
| CTX-02 | Phase 4 | Pending |
| CTX-03 | Phase 4 | Pending |
| CTX-04 | Phase 4 | Pending |
| LLM-01 | Phase 5 | Pending |
| LLM-02 | Phase 5 | Pending |
| LLM-03 | Phase 5 | Pending |
| LLM-04 | Phase 5 | Pending |
| LLM-05 | Phase 5 | Pending |
| VOICE-01 | Phase 5 | Pending |
| VOICE-02 | Phase 5 | Pending |
| VOICE-03 | Phase 5 | Pending |
| VOICE-04 | Phase 5 | Pending |
| VOICE-05 | Phase 5 | Pending |
| MON-01 | Phase 5 | Pending |
| MON-02 | Phase 5 | Pending |
| MON-03 | Phase 5 | Pending |
| MON-04 | Phase 5 | Pending |
| MON-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 91 total
- Mapped to phases: 91
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 -- traceability table populated during roadmap creation*
