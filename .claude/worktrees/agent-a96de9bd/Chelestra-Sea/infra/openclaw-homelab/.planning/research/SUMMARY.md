# Project Research Summary

**Project:** OpenClaw Homelab — DeFi Trading Automation + Job Hunting + Coding Assistance
**Domain:** Multi-server AI assistant homelab with automated DeFi trading (Solana/Hyperliquid), job scanning, and coding assistance
**Researched:** 2026-02-17
**Confidence:** MEDIUM — infrastructure patterns HIGH confidence; DeFi SDK specifics MEDIUM; OpenClaw internals LOW

## Executive Summary

OpenClaw Homelab is a 3-server personal automation system where each server has a distinct, well-scoped purpose: Server 1 executes DeFi trades across Meteora LP, DefiTuna leveraged LP, and Hyperliquid; Server 2 scans freelance platforms and surfaces AI-completable job opportunities; Server 3 provides coding assistance via an always-available AI agent. The recommended build approach is SDK-first — wrap existing MeteoraAg, tuna-sdk, and hyperliquid-python-sdk rather than build anything beneath them — and infrastructure-first within each server (deploy Docker, Tailscale, and Ansible baseline before writing any trading logic). Start with Python on the Hyperliquid path; Rust is premature optimization until latency is a measured problem. The unified stack (Ubuntu 24.04 LTS, Docker Compose, PostgreSQL + TimescaleDB, Redis, Prometheus + Grafana, Telegram notifications) is well-established and carries HIGH confidence.

The architecture research is unambiguous about build order: infrastructure and security hardening must come first, then Server 1 in read-only mode before any execution path opens. The single most important architectural rule is that every trade on Server 1 must pass through a deterministic, non-LLM risk manager layer that enforces the $100 auto-execute threshold, reserve balance checks, and liquidation proximity checks. The LLM (OpenClaw) proposes; the risk manager decides. This is not optional and must be built before any live trading begins. The notification + confirmation workflow is equally non-negotiable: if the system cannot send a confirmation request, it must default to blocking all trades above threshold.

The most dangerous pitfalls are financial rather than technical: hot wallets holding excessive funds, liquidation spirals from under-sized reserves, and the $100 threshold being bypassed by accumulated small trades. These three pitfalls have high financial severity and simple technical prevention — they must be addressed in the first implementation phase, before any real capital is connected. Infrastructure-level pitfalls (default SSH config, Solana RPC rate limiting, residential network downtime for leveraged positions) are equally critical and belong in the provisioning phase. The good news: all critical pitfalls have clear, implementable prevention strategies.

## Key Findings

### Recommended Stack

See [STACK.md](.planning/research/STACK.md) for full detail.

The infrastructure layer — Ubuntu 24.04 LTS, Docker Engine 26+/27+, Docker Compose v2, Tailscale, UFW — carries HIGH confidence and is the stable foundation for all 3 servers. Server 1 runs two runtimes: Python 3.11/3.12 for the Hyperliquid SDK (hyperliquid-python-sdk) and Node.js 20/22 LTS + TypeScript 5.x for Meteora and DefiTuna SDKs. Server 2 is Python-only (Playwright for JS-heavy job boards, httpx for APIs, APScheduler for scheduling). Server 3 is OpenClaw with MCP tools. Shared services: PostgreSQL 15/16 + TimescaleDB 2.x for persistent trade data, Redis 7.x for queuing and rate-limit state, Prometheus + Grafana 10/11 + Alertmanager for monitoring, Grafana Loki for log aggregation, python-telegram-bot 20.x for notifications.

The stack research has one meaningful uncertainty: the DefiTuna tuna-sdk package name and availability on npm is LOW confidence and must be verified against the GitHub repo before implementation. Meteora SDK package name is MEDIUM confidence (verify on npm/GitHub). All other stack decisions are MEDIUM-HIGH confidence with version verification the only outstanding action.

**Core technologies:**
- Ubuntu 24.04 LTS + Docker Compose v2 — server runtime and container isolation — stable LTS with best OpenClaw compatibility
- Tailscale — zero-config mesh VPN — connects all servers + Windows workstation, built into openclaw-ansible
- Python 3.11+ (Server 1 + Server 2) — Hyperliquid SDK, job scraping — official SDK language; consistent across servers
- Node.js 20 LTS + TypeScript 5.x (Server 1) — Meteora and DefiTuna SDKs — SDKs are TypeScript-native
- PostgreSQL 16 + TimescaleDB 2.x — persistent storage and time-series trade data — reliable relational + time-series in one
- Redis 7.x — job queuing, signal caching, rate-limit state — lightweight, fast, well-supported
- Prometheus + Grafana + Alertmanager — metrics, dashboards, alerts — self-hosted, no data leakage
- python-telegram-bot 20.x — notifications and trade confirmation workflow — async-native, interactive approve/reject
- Ansible 9.x + Ansible Vault — server provisioning and secrets management — agentless, already chosen (openclaw-ansible)
- Playwright 1.40+ (Server 2) — browser automation for job scraping — modern standard for JS-heavy sites

**What NOT to use:** Kubernetes (3-node homelab overkill), ELK stack (use Loki), Celery (APScheduler sufficient), SQLite for production trade data on Server 1 (use PostgreSQL), Selenium (use Playwright), docker-compose v1.

### Expected Features

See [FEATURES.md](.planning/research/FEATURES.md) for full detail.

The feature research produced a clear MVP definition backed by a dependency graph. The dependency chain is: Wallet Key Management → all trading integrations; Position State Tracking → Risk Management → Trade Execution; Notification System → Confirmation Workflow → any trade above $100. Nothing in the live trading chain can be skipped.

**Must have (v1 — table stakes):**
- Wallet key management — secure injection via environment; never hardcoded; foundation of all on-chain actions
- Position state tracking (read-only first) — must know what is open before any writes
- Reserve balance enforcement — hard synchronous gate before every trade; not an async check
- Auto-execute threshold logic — $100 gate with cumulative hourly/daily limits (not just per-trade)
- Notification system + confirmation workflow — Telegram bot; must work before any trade above threshold
- Trade and event logging — append-only audit trail including tx hash and on-chain confirmation
- Liquidation protection (basic) — margin monitoring + collateral top-up for DefiTuna leveraged positions
- Price feed / market data — Pyth or Jupiter for Solana; Hyperliquid REST for HL data
- Meteora LP integration — open/close DLMM positions, collect fees
- Docker isolation + Tailscale connectivity — infrastructure baseline
- Freelance platform scanning (Server 2) — at least Upwork as starting point

**Should have (v1.x — after 1-2 weeks stable operation):**
- DefiTuna leveraged LP integration — higher risk; validate Meteora first
- Hyperliquid integration — leveraged trading; validate reserve management first
- Remote monitoring dashboard — web UI; Telegram alerts cover MVP monitoring gap
- Job match surfacing (full-time jobs) + AI-task identification — build after freelance scanning works
- Fee compounding automation — Meteora fee reinvestment
- Cross-protocol position awareness — unified view across all 3 protocols
- Quant signal generation — start with manual strategy; automate signals once patterns are understood

**Defer (v2+):**
- Dynamic liquidation buffer (volatility-scaled)
- Autonomous income routing (full effort/payout ranking pipeline)
- Overnight batch execution with time-window awareness
- Cross-server health monitoring and Lobster pipeline composability
- Unified daily notification digest

**Deliberate anti-features:** Custom trading bot from scratch (use SDKs), cloud hosting (homelab premise), WebSocket streaming for LP farming (polling is simpler and sufficient except for liquidation monitoring), autonomous job application submission (ToS risk), self-modifying trading strategy (unpredictable with real money).

### Architecture Approach

See [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) for full detail.

The architecture is three independent servers connected by Tailscale, each running OpenClaw + Lobster + server-specific Claw Hub skills, with no direct cross-server communication at runtime. The Windows workstation is the control plane (Ansible push, monitoring pull). Each server has its own SQLite for local state persistence; no shared cross-server database. The Lobster pipeline is the scheduling primitive — skills are invoked, do their work, and exit; the scheduler owns timing (no `time.sleep()` inside skill code). All external secrets are injected via environment variables from Ansible Vault at deploy time; code reads from `os.environ` only.

**Major components:**
1. Windows Workstation (control plane) — Ansible runs, monitoring dashboard access via Tailscale browser
2. Tailscale VPN mesh — stable private IPs across all nodes; encrypted; no port forwarding required
3. OpenClaw + Lobster + Claw Hub (per server) — AI runtime, workflow pipelines, skill registry
4. Risk Manager skill (Server 1) — deterministic (non-LLM) trade gating; enforces all financial rules
5. Crypto Skills (Server 1) — Meteora, DefiTuna, Hyperliquid SDK wrappers + position monitoring
6. Job Skills (Server 2) — platform scanning, opportunity matching, AI-task classification
7. Coding Skills (Server 3) — GitHub integration, code generation, project assistance
8. Notification Skill (all servers) — Telegram push, confirmation workflow
9. Monitoring stack — Prometheus scraping all servers via Tailscale; Grafana dashboard

**Key architectural rules:**
- Risk Manager is deterministic Python, not LLM — LLMs propose, the rule engine decides
- Secrets never touch Git — Ansible Vault decrypts at deploy time into `.env` on each server
- Per-server SQLite, not shared database — failures are isolated; cross-server queries are a monitoring dashboard concern
- Docker Compose with one container per concern — not one container for everything
- Lobster YAML pipelines own scheduling — skills are stateless, schedule-free executables

The one significant LOW confidence area in architecture is the exact IPC/API protocol between OpenClaw, Lobster, and Claw Hub skills. This needs verification against the openclaw-ansible source code before Phase 1 implementation begins.

### Critical Pitfalls

See [PITFALLS.md](.planning/research/PITFALLS.md) for full detail.

1. **Hot wallet with excessive funds** — Operate bot wallet with only 1-day operating capital ($200-500 USDC + gas). Bulk capital stays in cold/hardware wallet. Daily top-up requires human approval. Alert on unexpected balance drops. Address in infrastructure/security phase before first live trade.

2. **Liquidation spiral from under-sized reserve** — Size reserve to cover worst-case simultaneous liquidation of ALL open leveraged positions (not just one). Implement a global circuit breaker: if reserve drops below 30% of starting reserve, close all leveraged positions. Require human confirmation before opening new leveraged positions after any emergency top-up. Address before DefiTuna leveraged positions go live.

3. **$100 threshold bypassed by accumulated small trades** — Implement rolling time-window cumulative spend limit (e.g., total auto-executed trades in last 1 hour must not exceed $300). Implement daily auto-trade budget. Add trade frequency circuit breaker (N trades in M minutes without human review → pause + notify). All limits in a single auditable config file. Address before live trading begins.

4. **Solana RPC rate limiting causes silent failures** — Use a paid RPC endpoint (Helius, QuickNode) from day one ($20-100/month). Implement exponential backoff with jitter on all RPC calls. Log tx signature and poll confirmation separately — never assume "submitted" = "confirmed." Address in infrastructure phase before any live trading.

5. **Residential network downtime kills bot during liquidation events** — Implement dead man's switch for leveraged positions (external service executes pre-signed emergency close if bot offline for X minutes). Set leverage ratios that survive 4-8 hours unattended during 20% adverse price moves. Consider 4G/5G USB dongle failover for Server 1. Address in infrastructure phase and trading strategy phase.

Additional important pitfalls: Hyperliquid funding rate bleeds draining leveraged positions silently (include funding cost in all P&L calculations from day one), default SSH configuration on internet-exposed ports (disable password auth, restrict SSH to Tailscale IPs only, run openclaw-ansible hardening playbook), impermanent loss exceeding fee income on Meteora DLMM (implement proper net P&L = fees - IL - gas; set IL threshold to close positions).

## Implications for Roadmap

Based on combined research, the architecture's dependency chain and pitfall phase-to-phase mapping produce a clear 7-phase structure.

### Phase 1: Infrastructure Foundation and Security Hardening
**Rationale:** Every subsequent phase depends on this. SSH hardening must happen before any keys are present. Tailscale, UFW, and Docker must be operational before any service starts. The openclaw-ansible playbook is already designed for this — run it completely and verify it before proceeding.
**Delivers:** All 3 servers provisioned, Tailscale mesh operational, Docker installed, UFW hardened (SSH restricted to Tailscale IPs, password auth disabled), Ansible Vault set up for secrets, paid Solana RPC endpoint configured
**Addresses features:** Docker isolation, Tailscale VPN connectivity
**Avoids pitfalls:** Default SSH configuration (Pitfall 7), hot wallet key management groundwork (Pitfall 1), Solana RPC rate limiting setup (Pitfall 4)
**Research flag:** Standard patterns — openclaw-ansible handles most of this. Verify openclaw-ansible source for exact Tailscale + UFW playbook behavior before relying on it.

### Phase 2: Server 1 — Crypto Read-Only Integration
**Rationale:** Validate all three DeFi SDK integrations work before enabling any writes. Building read paths first surfaces integration issues with no financial risk. Position state tracking must exist before any risk management logic can be built. The risk manager skeleton should be started here — even if it blocks all trades — so it is in the execution path from day one.
**Delivers:** Meteora SDK reading positions and prices, Hyperliquid SDK reading balances, DefiTuna SDK reading positions, price feed operational, risk manager skeleton (blocks all trades), trade and event logging operational, wallet key management implemented (keys in Ansible Vault, injected via env vars)
**Addresses features:** Wallet key management, position state tracking, price feed / market data, trade / event logging
**Avoids pitfalls:** Hot wallet security groundwork (Pitfall 1 — establish key-per-purpose discipline here), Solana RPC rate limiting (verify backoff logic with read calls before write calls)
**Stack used:** Python 3.11, hyperliquid-python-sdk, @meteora-ag/dlmm + Node.js 20, tuna-sdk, @solana/web3.js, PostgreSQL + TimescaleDB
**Research flag:** Needs phase research — DefiTuna tuna-sdk package name/API surface must be verified against GitHub before implementation. Meteora DLMM SDK position read methods need verification.

### Phase 3: Server 1 — Risk Management and Crypto Execution
**Rationale:** Read paths proven stable (Phase 2) — now enable execution. Risk manager must be fully implemented and tested before the first live order is submitted. Notification and confirmation workflow must work before any trade above $100 threshold can execute.
**Delivers:** Risk manager fully implemented ($100 threshold with cumulative hourly/daily limits, reserve balance enforcement, liquidation proximity check), notification system operational (Telegram bot), confirmation workflow for >$100 trades, Meteora LP execution (open/close positions, collect fees), Hyperliquid basic execution (spot orders below threshold for initial testing)
**Addresses features:** Reserve balance enforcement, auto-execute threshold logic, notification system, confirmation workflow, Meteora LP integration, liquidation protection (basic)
**Avoids pitfalls:** $100 threshold bypass by accumulated small trades (Pitfall 6 — implement cumulative limits here), hot wallet excessive funds (Pitfall 1 — enforce operator wallet limits before first trade), alert fatigue (implement alert volume rules: confirm >$100, emergency events, daily summary only)
**Stack used:** python-telegram-bot 20.x, APScheduler, Lobster pipeline YAML
**Research flag:** Standard patterns — risk gating is deterministic Python; Telegram bot API is well-documented. No research phase needed, but the "Looks Done But Isn't" checklist from PITFALLS.md must be run as exit criteria.

### Phase 4: Server 1 — DefiTuna Leveraged LP and Liquidation Protection
**Rationale:** More complex risk logic than Phase 3. DefiTuna leveraged positions introduce liquidation spiral risk (Pitfall 2) — this must be built on top of a battle-tested reserve management system from Phase 3. Hyperliquid funding rate tracking (Pitfall 8) also belongs here as the perps execution path matures.
**Delivers:** DefiTuna leveraged LP integration (open/close/monitor positions), liquidation monitoring with auto-add collateral, global circuit breaker (close all leveraged positions if reserve < 30%), dead man's switch for leveraged positions, Hyperliquid full integration (perps), funding rate P&L tracking, reserve health score metric
**Addresses features:** DefiTuna leveraged LP integration, liquidation protection (full), cross-protocol position awareness (foundation), Hyperliquid integration
**Avoids pitfalls:** Liquidation spiral (Pitfall 2 — circuit breaker and portfolio-wide reserve sizing), Hyperliquid funding rate bleeds (Pitfall 8 — P&L includes funding from day one), residential network downtime (Pitfall 5 — dead man's switch implemented here), IL exceeding fees (Pitfall 3 — implement net P&L = fees - IL - gas for Meteora positions)
**Research flag:** Needs phase research — DefiTuna tuna-sdk collateral addition API and position health freshness caching behavior must be verified. Hyperliquid WebSocket reconnection patterns for long-running bots need verification.

### Phase 5: Server 2 — Job Scanning and Opportunity Surfacing
**Rationale:** Server 2 is independent of Servers 1 and 3. Can run in parallel with Phases 3-4 if resources allow, or sequentially after Phase 4. Freelance platform scanning provides immediate value (income) while DeFi automation matures. Start with Upwork; add more platforms after the pipeline is proven.
**Delivers:** Upwork scanning (API or RSS), job deduplication (PostgreSQL), AI-task identification (LLM classification via OpenClaw), notification for matched opportunities, APScheduler for 15-minute scan cadence; optionally: full-time job scanning (Indeed/LinkedIn RSS), Fiverr/Toptal integration
**Addresses features:** Freelance platform scanning, job match surfacing, AI-task identification
**Avoids pitfalls:** Upwork ToS for automated scanning (verify API terms before building scraper vs API path), alert fatigue (job match notifications should be batched — one digest per scan cycle, not per listing)
**Stack used:** Python 3.11, Playwright 1.40+, httpx 0.26+, BeautifulSoup4, APScheduler, PostgreSQL, Redis (rate-limit state)
**Research flag:** Needs phase research — Upwork API access requires application approval; verify current ToS before deciding scraping vs API approach. Fiverr/Toptal access patterns need verification.

### Phase 6: Server 3 — Coding Assistance
**Rationale:** Lowest operational risk of the three servers. Independent of Servers 1 and 2 at runtime. Can be built in parallel or last. Delivers immediate personal productivity value.
**Delivers:** OpenClaw coding assistant operational, GitHub API integration, code generation and PR review pipelines, project context injection via MCP tools
**Addresses features:** Coding assistant integration (Server 3)
**Avoids pitfalls:** No DeFi-specific pitfalls. Standard OpenClaw deployment.
**Stack used:** OpenClaw + MCP filesystem/git/shell tools
**Research flag:** LOW confidence on exact OpenClaw/Lobster/Claw Hub IPC mechanism. Verify against openclaw-ansible source before implementation. Otherwise standard patterns — skip research phase.

### Phase 7: Monitoring Dashboard and Operational Excellence
**Rationale:** All three servers running — now build the unified visibility layer. Dashboard is valuable at launch but Telegram alerts cover the monitoring gap for Phases 1-6. Build this after individual servers are stable and the alert volume is calibrated.
**Delivers:** Grafana dashboard (cross-server health, trade P&L, job pipeline status, reserve health score), Loki log aggregation, Alertmanager routing (Telegram/Discord), unified daily notification digest, cross-server health monitoring, fee compounding automation for Meteora
**Addresses features:** Remote monitoring dashboard, cross-server health monitoring, unified notification digest, fee compounding automation
**Avoids pitfalls:** Log rotation / disk fill (configure Promtail + Loki log rotation as part of this phase), monitoring accessible from public internet (verify Tailscale-only access)
**Stack used:** Prometheus 2.x, Grafana 10/11, Alertmanager 0.26+, Loki 2/3, Promtail
**Research flag:** Standard patterns — Prometheus + Grafana stack is well-documented. No research phase needed.

### Phase Ordering Rationale

- **Security before keys:** SSH hardening and Ansible Vault setup must precede any wallet key injection. The openclaw-ansible playbook enforces this if run completely — do not skip the hardening tasks.
- **Read before write:** Phase 2 validates all SDK integrations produce correct data before Phase 3 enables trade submission. A bug in position data reading produces no financial loss; a bug in trade submission with bad data does.
- **Risk manager in execution path from day one:** The risk manager skeleton (blocking all trades) is built in Phase 2, not Phase 3. This ensures the gating layer is in the execution path before the first order can be submitted.
- **Meteora before DefiTuna/Hyperliquid leveraged:** Lower-risk LP farming validates the reserve management system before leveraged positions introduce liquidation spiral risk.
- **Independent server paths:** Phases 5 (Server 2) and 6 (Server 3) have no runtime dependencies on Server 1. They can be built in parallel with Phases 3-4 if time/resource allows, or sequentially if single-developer focus is preferred.
- **Dashboard last:** Telegram notifications provide sufficient visibility for Phases 1-6. Dashboard adds operational polish after the system is proven.

### Research Flags

**Needs deeper research before implementation (suggest `/gsd:research-phase`):**
- **Phase 2 + Phase 4:** DefiTuna tuna-sdk — package name, npm availability, position read API, collateral addition API, position health caching behavior. Verify against https://github.com/DefiTuna/tuna-sdk before writing any integration code.
- **Phase 2:** Meteora DLMM SDK — exact position read/write methods, commitment level defaults. Verify against https://github.com/MeteoraAg before implementation.
- **Phase 5:** Upwork API access — current ToS for automated scanning, whether partner API is accessible, scraping vs API decision. Verify before building job scanner.
- **Phase 1 + Phase 2:** OpenClaw/Lobster/Claw Hub IPC mechanism — exact protocol between components. Verify against openclaw-ansible source before Phase 1 completion.

**Standard patterns (skip research phase):**
- **Phase 1:** Ubuntu + Docker + Tailscale + Ansible provisioning — well-documented, stable. Run the openclaw-ansible playbook.
- **Phase 3:** Telegram bot + confirmation workflow — python-telegram-bot v20 is well-documented; confirmation patterns are standard.
- **Phase 6:** OpenClaw coding assist deployment — standard OpenClaw install once IPC mechanism is understood from Phase 1 verification.
- **Phase 7:** Prometheus + Grafana + Loki stack — industry standard, extensive documentation. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Infrastructure (HIGH) — Ubuntu, Docker, Tailscale, Ansible are stable and well-established. DeFi SDK layer (MEDIUM) — Meteora and Hyperliquid Python SDKs exist and are known; exact versions need verification. DefiTuna tuna-sdk (LOW) — package name and availability unconfirmed without live lookup. Recommend verifying all SDK package names on GitHub/npm before implementation. |
| Features | MEDIUM | Table stakes and MVP definition corroborated by PROJECT.md (owner-validated requirements). Feature prioritization matrix is consistent with architecture dependency chain. The $100 threshold, reserve enforcement, and confirmation workflow are owner-stated constraints — HIGH confidence on these specifically. |
| Architecture | MEDIUM | Docker Compose multi-container patterns, Ansible Vault secrets management, SQLite per-server state: HIGH confidence. OpenClaw/Lobster/Claw Hub internal IPC mechanism: LOW confidence — component boundaries inferred from project context and tool names, not verified against source. This is the biggest single architecture gap. |
| Pitfalls | MEDIUM | DeFi post-mortems (liquidation spirals, key compromise, RPC rate limiting) are well-documented from training data. Hyperliquid funding rate mechanics are confirmed by multiple community sources pre-cutoff. DefiTuna SDK caching behavior and Meteora DLMM commitment level defaults are LOW confidence — validate against current SDK source before implementing those specific mitigations. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **DefiTuna tuna-sdk package name and API surface** — The single biggest unknown. Before Phase 2 implementation, verify the npm package name (could be `tuna-sdk`, `@defituna/tuna-sdk`, or private), position read methods, collateral addition API, and caching behavior. If SDK is private/internal, the integration approach changes significantly.
- **OpenClaw/Lobster/Claw Hub IPC mechanism** — Exact protocol (HTTP, subprocess, socket, IPC) between OpenClaw runtime and Claw Hub skills is LOW confidence from research. Read the openclaw-ansible role source code before Phase 1 completes to understand the invocation model. This affects how all skills are written.
- **Solana @solana/web3.js version** — Meteora and DefiTuna SDKs are likely pinned to v1. Do not upgrade to v2 independently. Check SDK `package.json` peer deps before installation to avoid dependency conflicts.
- **Upwork API access** — Verify whether partner API is accessible to an individual homelab operator. If not, the job scanner falls back to scraping, which introduces ToS risk and fragility. Decide this before investing in the scraping implementation.
- **OpenClaw LLM backend for Server 1** — The ARCHITECTURE.md notes that 16GB RAM is the first bottleneck: running OpenClaw LLM + DeFi SDK processes + position monitoring simultaneously may hit the RAM ceiling. Consider whether the crypto server uses a local quantized model or API-backed OpenClaw (Anthropic/OpenAI). This decision affects Server 1 resource planning.

## Sources

### Primary (HIGH confidence)
- PROJECT.md (H:/IcloudDrive/.../openclaw-homelab/.planning/PROJECT.md) — owner-validated requirements, hardware specs, SDK choices, constraints, out-of-scope decisions
- Tailscale documentation patterns — mesh VPN configuration, homelab use cases
- Docker Compose v2 documentation — multi-container composition patterns
- Ansible Vault documentation — secrets management patterns
- Ubuntu 24.04 LTS release — OS choice with 5-year LTS support
- TimescaleDB Docker images (timescale/timescaledb-ha) — version compatibility with PostgreSQL 15/16
- python-telegram-bot v20 documentation — async-native Telegram bot patterns

### Secondary (MEDIUM confidence)
- Training data: hyperliquid-python-sdk — SDK exists, REST + WebSocket pattern common to perp DEX SDKs; exact current version unverified. Verify: https://github.com/hyperliquid-dex/hyperliquid-python-sdk
- Training data: @meteora-ag/dlmm — MeteoraAg SDK exists; npm package name and version need verification. Verify: https://github.com/MeteoraAg
- Training data: DeFi post-mortems — liquidation cascades, key compromise patterns, RPC rate limiting failures — well-documented pre-cutoff
- Training data: Hyperliquid perpetuals funding rate mechanics — confirmed by multiple community sources pre-cutoff
- Training data: Playwright 1.40+ — clear modern standard for browser automation; HIGH confidence on technology choice

### Tertiary (LOW confidence — needs validation before implementation)
- DefiTuna tuna-sdk — package name, availability, API surface unconfirmed without live lookup. Verify: https://github.com/DefiTuna/tuna-sdk
- hypersdk (infinitefield Rust client) — community-maintained alternative; maintenance status unverified. Not recommended for MVP.
- Specific DefiTuna SDK caching behavior — validate against current tuna-sdk source before implementing position freshness checks
- Meteora DLMM commitment level defaults — validate against MeteoraAg SDK source before implementing

---
*Research completed: 2026-02-17*
*Ready for roadmap: yes*
