# Feature Research

**Domain:** DeFi Trading Automation + AI Productivity Homelab
**Researched:** 2026-02-17
**Confidence:** MEDIUM (WebSearch and WebFetch unavailable; based on training data + PROJECT.md context; flagged per confidence protocol)

> **Note on confidence:** WebSearch and WebFetch were denied during this research session. All findings are derived from training data on DeFi automation systems (Meteora, DefiTuna, Hyperliquid), AI homelab patterns, and the project's PROJECT.md. Claims based on training data only are marked LOW confidence. Claims corroborated by PROJECT.md requirements (established by owner) are MEDIUM. Standard industry patterns well-established pre-2025 are MEDIUM-HIGH.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist or the system is non-functional / broken. Missing any of these = the system cannot fulfill its core purpose.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **SDK integration: Meteora LP** | System cannot trade LP positions without it — core job of Server 1 | HIGH | MeteoraAg SDK; open/close DLMM positions, collect fees. Dependency: wallet key management |
| **SDK integration: DefiTuna leveraged LP** | Leveraged LP is a declared workload; without it Server 1 is half-built | HIGH | tuna-sdk; creates/manages leveraged positions. Dependency: liquidation monitoring |
| **SDK integration: Hyperliquid (Python or Rust)** | Leveraged + spot trading on Hyperliquid is a stated requirement | HIGH | hyperliquid-python-sdk or hypersdk (Rust). Pick one for MVP; both is v2 |
| **Wallet key management** | All on-chain actions require signing; without secure key management the system cannot act | MEDIUM | Environment variable injection or secrets manager (Vault / Docker secrets). Never hardcoded |
| **Auto-execute threshold logic** | Owner requires: auto-execute under $100, confirm above $100 — stated constraint | LOW | Simple dollar-value gate before trade submission; threshold configurable |
| **Liquidation protection: auto-add collateral** | Without this, leveraged positions blow up unattended overnight | HIGH | Monitor margin ratio vs threshold; trigger collateral top-up. Dependency: reserve balance tracking |
| **Reserve balance enforcement** | "Never trade more than reserves allow" is a hard constraint; violating it = catastrophic loss | MEDIUM | Pre-trade check: available reserve >= trade size + buffer. Block trade if not satisfied |
| **Position state tracking** | System must know what it owns (positions, sizes, PnL) to make decisions | MEDIUM | Persistent store (SQLite or Postgres) for position records; synced from on-chain state |
| **Trade/event logging** | Audit trail for every action taken — required for debugging, tax, and trust | LOW | Append-only log: timestamp, action, params, result, tx hash |
| **Notification system** | Owner must be alerted for confirmation requests (>$100) and critical events (near-liquidation) | MEDIUM | Telegram bot or Discord webhook. Dependency: confirmation workflow |
| **Confirmation workflow** | For trades >$100: send notification, wait for owner approval, timeout = cancel | MEDIUM | Reply-to-approve pattern via Telegram/Discord; timeout guard |
| **Remote monitoring dashboard** | Owner needs visibility into system state from Windows workstation | MEDIUM | Web UI accessible via Tailscale; shows positions, balances, recent activity |
| **Price feed / market data** | Trading decisions require current prices; without feed, signals and risk checks are blind | MEDIUM | Pyth Network or Jupiter price API for Solana tokens; Hyperliquid REST for HL data |
| **Scheduled job runner** | Automation requires polling/scheduling: check positions every N minutes | LOW | Cron or APScheduler (Python); or Lobster workflow scheduler in OpenClaw ecosystem |
| **Freelance platform scanning (Server 2)** | Server 2's entire purpose; without it the Jobs server does nothing | HIGH | Scraping or API access: Upwork RSS/API, Fiverr, Toptal. Rate-limit aware |
| **Job match surfacing (Server 2)** | Full-time job scanning is a stated requirement | MEDIUM | Indeed/LinkedIn RSS feeds or APIs; keyword + skill matching |
| **AI-task identification (Server 2)** | Identify which gigs are AI-completable — differentiates from simple job board | HIGH | LLM classification of job descriptions against owner capability profile |
| **Coding assistant integration (Server 3)** | Server 3's entire purpose | MEDIUM | OpenClaw skill wrapping Claude Code or similar; project context injection |
| **Docker isolation per server** | Required by OpenClaw ecosystem; stated constraint | MEDIUM | Each service in container; dependency: docker-compose or equivalent |
| **Tailscale VPN connectivity** | Stated requirement; how owner accesses everything remotely | LOW | Built into openclaw-ansible; minimal custom work |

### Differentiators (Competitive Advantage)

Features that set OpenClaw apart from a basic trading script or job scraper. Not assumed, but high value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Quant-style signal generation** | Token trend analysis goes beyond price alerts — generates actionable entry/exit signals | HIGH | On-chain data (volume, liquidity depth, fee APR) + technical indicators. LOW confidence: specific indicator set needs validation |
| **Cross-protocol position awareness** | Unified view across Meteora, DefiTuna, Hyperliquid — most people manage these separately | MEDIUM | Aggregate positions from all three into one data model; net exposure calculation |
| **Autonomous income routing (Jobs server)** | Identifies AI-completable tasks AND estimates effort/payout ratio for prioritization | HIGH | LLM scoring pipeline: task description → effort estimate + payout → ranked queue |
| **Overnight batch execution** | System designed to run unattended; batches low-risk tasks while owner sleeps | MEDIUM | Time-window awareness: aggressive during off-hours (low confirmation threshold), conservative during market hours |
| **Fee compounding automation** | Auto-collect and reinvest LP fees — turns passive LP into compounding position | MEDIUM | Trigger on fee accumulation threshold; reinvest into same pool or swap to reserve. Dependency: Meteora SDK integration |
| **Dynamic liquidation buffer** | Instead of fixed liquidation protection threshold, adjust buffer based on recent volatility | HIGH | Volatility-scaled safety margin; more conservative in high-vol regimes. LOW confidence: implementation complexity unclear |
| **Unified notification digest** | One daily digest summarizing overnight activity across all 3 servers, not just individual alerts | LOW | Aggregates logs from all servers; formats as readable summary. Dependency: cross-server log aggregation |
| **Reserve health score** | Single metric showing how much runway the trading system has before it needs manual funding | LOW | Computed: current_reserve / max_single_position_size; surfaced in dashboard |
| **Lobster pipeline composability** | Using OpenClaw's Lobster shell to compose trading workflows as reusable pipelines | MEDIUM | Leverages existing OpenClaw infrastructure; reduces custom glue code |
| **Cross-server health monitoring** | Single pane: are all 3 servers up, healthy, and making progress? | MEDIUM | Heartbeat endpoints per server; aggregated in dashboard |

### Anti-Features (Deliberately NOT Build)

Features that seem valuable but introduce scope creep, operational risk, or dilute focus.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Custom trading bot from scratch** | "More control" over strategy logic | Enormous engineering effort; existing SDKs (MeteoraAg, DefiTuna, Hyperliquid) already handle execution. Stated as out-of-scope in PROJECT.md | Wrap existing SDKs; write strategy logic on top, not beneath |
| **Mobile app** | Convenient on-the-go monitoring | High build cost for a personal tool; adds a separate codebase to maintain | Web dashboard accessible via Tailscale works on mobile browser |
| **Cloud hosting of any component** | Uptime / reliability argument | Defeats the homelab premise; adds recurring cost; stated as out-of-scope | Tailscale makes home lab remotely accessible without cloud |
| **Real-time everything (WebSocket streaming)** | Feels "professional" | Most LP farming decisions don't need sub-second data; polling is simpler and more resilient | Poll at sensible intervals (30s–5min depending on action type); use WebSocket only for liquidation monitoring |
| **Full tax accounting automation** | Useful feature | High complexity (cost basis tracking, wash sales, multi-chain); a dedicated product problem | Log every trade with tx hash; export CSV for accountant or Koinly import |
| **Social / copy-trading features** | Share strategies with others | Security risk (exposes wallet behavior), significant auth/multi-user complexity, no stated need | Keep system single-user; no sharing surface |
| **iCloud sync to Linux servers** | Sync planning docs to servers | Stated as out-of-scope; iCloud has no Linux support | Git + Ansible for deployment; iCloud only on Windows workstation |
| **Autonomous job application submission** | "Full automation" of job hunt | Legal/ToS risk on most platforms; reputational risk if low-quality submissions | Surface + rank jobs, let owner review and apply manually |
| **Self-modifying trading strategy** | AI rewrites its own strategy logic | Unpredictable behavior in production; high risk when real money is involved | Static strategy logic; AI can propose changes but owner approves code changes |

---

## Feature Dependencies

```
[Price Feed / Market Data]
    └──required by──> [Quant Signal Generation]
    └──required by──> [Liquidation Protection]
    └──required by──> [Reserve Health Score]

[Wallet Key Management]
    └──required by──> [Meteora LP Integration]
    └──required by──> [DefiTuna Integration]
    └──required by──> [Hyperliquid Integration]

[Position State Tracking]
    └──required by──> [Liquidation Protection]
    └──required by──> [Reserve Balance Enforcement]
    └──required by──> [Cross-Protocol Position Awareness]
    └──required by──> [Remote Monitoring Dashboard]

[Reserve Balance Enforcement]
    └──required by──> [Auto-Execute Threshold Logic]
    └──required by──> [Reserve Health Score]

[Trade / Event Logging]
    └──required by──> [Remote Monitoring Dashboard]
    └──required by──> [Unified Notification Digest]
    └──required by──> [Cross-Server Health Monitoring]

[Meteora LP Integration]
    └──enables──> [Fee Compounding Automation]

[Notification System]
    └──required by──> [Confirmation Workflow]
    └──required by──> [Unified Notification Digest]

[Freelance Platform Scanning]
    └──required by──> [AI-Task Identification]
    └──required by──> [Autonomous Income Routing]

[Docker Isolation]
    └──required by──> [All server services]

[Tailscale VPN]
    └──required by──> [Remote Monitoring Dashboard]
    └──required by──> [Cross-Server Health Monitoring]
    └──required by──> [Confirmation Workflow] (owner receives alerts remotely)
```

### Dependency Notes

- **Price Feed is a foundation:** Liquidation protection and signal generation both require reliable, current price data. This should be built first on Server 1 and treated as a shared service.
- **Position State Tracking must precede risk management:** You cannot enforce liquidation protection or reserve rules without knowing current positions. Build this before any live trading.
- **Notification System must precede live trading:** The $100 confirmation workflow requires notifications working before any trade above threshold can be submitted. A system that can't send confirmations must default to blocking all trades.
- **Reserve Balance Enforcement is a gate, not a feature:** It must be enforced synchronously before every trade submission, not as an async afterthought. Implement as middleware/guard, not an optional check.
- **Wallet Key Management is the single most critical security dependency:** Everything on-chain requires it. Get this right first; never revisit it cheaply.

---

## MVP Definition

### Launch With (v1) — Minimum Viable System

The system must do these things before any live trading or job automation runs. This is the "can it work without killing you financially" baseline.

- [ ] **Wallet key management** — secrets injected via environment, never in code or logs
- [ ] **Position state tracking (read-only)** — can query current positions from all 3 protocols before writing anything
- [ ] **Reserve balance enforcement** — hard gate: no trade executes without passing reserve check
- [ ] **Auto-execute threshold logic** — $100 gate implemented before any live order submission
- [ ] **Notification system** — Telegram or Discord bot operational, can send and receive messages
- [ ] **Confirmation workflow** — trades >$100 blocked until owner approves via notification reply
- [ ] **Trade / event logging** — every action written to log before and after execution
- [ ] **Meteora LP integration (basic)** — open/close positions; collect fees
- [ ] **Liquidation protection (basic)** — monitor margin, trigger collateral add on threshold breach
- [ ] **Price feed** — at least one reliable price source for Solana tokens and Hyperliquid assets
- [ ] **Tailscale connectivity** — all servers reachable from Windows workstation
- [ ] **Freelance platform scanning** — at least Upwork; surface raw listings
- [ ] **Docker isolation** — all services containerized; no bare-metal processes

### Add After Validation (v1.x) — Once Core Is Stable

Add these once v1 has run for 1-2 weeks without incidents:

- [ ] **DefiTuna leveraged LP integration** — higher risk; add after Meteora is proven
- [ ] **Hyperliquid integration** — leveraged trading; add after reserve management is battle-tested
- [ ] **Remote monitoring dashboard** — web UI; currently covered by notification alerts
- [ ] **Job match surfacing** — full-time jobs; add after freelance scanning is working
- [ ] **AI-task identification** — LLM classification layer on top of raw job scan
- [ ] **Fee compounding automation** — nice money-maker; not needed for safety
- [ ] **Cross-protocol position awareness** — unified view; valuable but not launch-critical
- [ ] **Quant signal generation** — improves decisions; start with manual strategy, automate signals later

### Future Consideration (v2+) — After Product-Market Fit

- [ ] **Dynamic liquidation buffer** — volatility-scaled safety margin; complex to tune safely
- [ ] **Autonomous income routing** — full pipeline from job scan to effort/payout ranking
- [ ] **Unified notification digest** — daily summary; nice to have, low urgency
- [ ] **Overnight batch execution** — time-window aware automation; requires validated behavior first
- [ ] **Cross-server health monitoring** — operational excellence; build after individual servers are stable
- [ ] **Lobster pipeline composability** — deeper OpenClaw integration; after core workflows proven

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Wallet key management | HIGH | LOW | P1 |
| Reserve balance enforcement | HIGH | LOW | P1 |
| Auto-execute threshold logic | HIGH | LOW | P1 |
| Trade / event logging | HIGH | LOW | P1 |
| Notification system + confirmation workflow | HIGH | MEDIUM | P1 |
| Position state tracking | HIGH | MEDIUM | P1 |
| Price feed / market data | HIGH | MEDIUM | P1 |
| Liquidation protection (basic) | HIGH | MEDIUM | P1 |
| Meteora LP integration | HIGH | HIGH | P1 |
| Docker + Tailscale | HIGH | LOW | P1 |
| Freelance platform scanning | HIGH | HIGH | P1 |
| DefiTuna leveraged LP | HIGH | HIGH | P2 |
| Hyperliquid integration | HIGH | HIGH | P2 |
| Remote monitoring dashboard | MEDIUM | MEDIUM | P2 |
| Job match surfacing | MEDIUM | MEDIUM | P2 |
| AI-task identification | HIGH | HIGH | P2 |
| Fee compounding automation | MEDIUM | MEDIUM | P2 |
| Cross-protocol position awareness | MEDIUM | MEDIUM | P2 |
| Quant signal generation | HIGH | HIGH | P2 |
| Coding assistant (Server 3) | MEDIUM | MEDIUM | P2 |
| Dynamic liquidation buffer | MEDIUM | HIGH | P3 |
| Autonomous income routing | MEDIUM | HIGH | P3 |
| Unified notification digest | LOW | LOW | P3 |
| Cross-server health monitoring | MEDIUM | MEDIUM | P3 |
| Lobster pipeline composability | LOW | MEDIUM | P3 |
| Reserve health score | MEDIUM | LOW | P2 |

**Priority key:**
- P1: Must have for launch (v1)
- P2: Should have; add after validation (v1.x)
- P3: Nice to have; future consideration (v2+)

---

## Competitor / Reference System Feature Analysis

> Confidence: LOW — based on training data; no live source verification possible this session. Treat as directional.

| Feature | Basic Trading Bot (e.g., generic LP bot) | Institutional DeFi System | OpenClaw Approach |
|---------|------------------------------------------|--------------------------|-------------------|
| Protocol integration | Single protocol | Multi-protocol via custom adapters | SDK-first: wrap MeteoraAg, DefiTuna, Hyperliquid SDKs |
| Risk management | None or basic stop-loss | Full risk engine, VaR, position limits | Reserve enforcement + liquidation protection; pragmatic not academic |
| Confirmations | Fully autonomous or fully manual | Risk-tiered approvals | $100 threshold: auto below, confirm above |
| Notifications | None | PagerDuty/Slack integration | Telegram/Discord; lightweight, owner-only |
| Monitoring | Log files | Grafana + metrics stack | Web dashboard via Tailscale; simple over sophisticated |
| Job hunting | Not a feature | Not a feature | Unique: AI-driven freelance + job surfacing alongside trading |
| Coding assistance | Not a feature | Not a feature | Unique: third server dedicated to coding acceleration |
| Deployment | Manual | Kubernetes/Terraform | Ansible-automated; minimizes Linux knowledge requirement |
| Liquidation protection | Rarely automated | Standard | Auto-add collateral; treated as a system feature not manual task |

---

## Sources

- **PROJECT.md** (H:/IcloudDrive/.../openclaw-homelab/.planning/PROJECT.md) — owner-validated requirements, constraints, and out-of-scope decisions. MEDIUM confidence (authoritative for this project).
- **Training data: Meteora DLMM / LP automation patterns** — LOW confidence (training data, unverified against current docs this session). Flagged where used.
- **Training data: DefiTuna / leveraged LP liquidation patterns** — LOW confidence. Standard leveraged position management patterns well-established in DeFi.
- **Training data: Hyperliquid SDK capabilities** — LOW confidence. SDK exists and is maintained; specific API surface not verified this session.
- **Training data: AI homelab patterns (self-hosted LLM, job automation)** — LOW confidence. Directional only.
- **Industry standard: $100 confirmation threshold** — MEDIUM confidence. Owner-stated constraint; analogous patterns (approval workflows in trading systems) are well-established.

> **Gaps requiring phase-specific research:**
> - Exact Meteora DLMM SDK API surface (position open/close, fee collection methods) — verify with MeteoraAg GitHub during implementation phase
> - DefiTuna tuna-sdk: margin monitoring methods, collateral addition API — verify with DefiTuna GitHub
> - Hyperliquid Python SDK: order submission, account info, position query — verify with hyperliquid-dex GitHub
> - Upwork / Fiverr API access: current ToS for automated scanning — verify before building Jobs server
> - OpenClaw Lobster workflow spec: how pipelines are defined and scheduled — verify with OpenClaw docs

---
*Feature research for: OpenClaw Homelab — DeFi Trading Automation + AI Productivity*
*Researched: 2026-02-17*
