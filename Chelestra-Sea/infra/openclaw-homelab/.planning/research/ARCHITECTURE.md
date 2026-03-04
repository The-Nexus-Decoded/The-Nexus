# Architecture Research

**Domain:** Multi-server AI assistant homelab with DeFi trading automation
**Researched:** 2026-02-17
**Confidence:** MEDIUM — Core homelab/Docker/Ansible patterns are HIGH confidence from established practices. OpenClaw/Lobster internals are LOW confidence (limited external documentation accessible). DeFi SDK integration patterns are MEDIUM confidence from SDK structure and community patterns known at training cutoff.

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CONTROL PLANE (Windows Workstation)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ openclaw-    │  │  .planning/  │  │  Monitoring Dashboard    │  │
│  │ ansible      │  │  (this repo) │  │  (Tailscale web access)  │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────────────┘  │
└─────────┼───────────────────────────────────────────────────────────┘
          │ SSH + Ansible (via Tailscale)
          │
┌─────────▼───────────────────────────────────────────────────────────┐
│                      TAILSCALE VPN MESH                             │
│         All servers reachable at stable Tailscale IPs               │
├────────────────┬──────────────────┬─────────────────────────────────┤
│  Server 1      │  Server 2        │  Server 3                       │
│  (Crypto)      │  (Jobs)          │  (Coding)                       │
│                │                  │                                  │
│ ┌────────────┐ │ ┌──────────────┐ │ ┌──────────────────────────┐   │
│ │ OpenClaw   │ │ │ OpenClaw     │ │ │ OpenClaw                 │   │
│ │ + Lobster  │ │ │ + Lobster    │ │ │ + Lobster                │   │
│ └─────┬──────┘ │ └──────┬───────┘ │ └──────────┬───────────────┘   │
│       │        │        │         │             │                   │
│ ┌─────▼──────┐ │ ┌──────▼───────┐ │ ┌──────────▼───────────────┐   │
│ │ Claw Hub   │ │ │ Claw Hub     │ │ │ Claw Hub                 │   │
│ │ Skills:    │ │ │ Skills:      │ │ │ Skills:                  │   │
│ │ -meteora   │ │ │ -job-scanner │ │ │ -code-assist             │   │
│ │ -defituna  │ │ │ -ai-task-id  │ │ │ -project-mgmt            │   │
│ │ -hyperliq  │ │ │ -notifier    │ │ │ -notifier                │   │
│ │ -risk-mgr  │ │ │              │ │ │                          │   │
│ │ -notifier  │ │ │              │ │ │                          │   │
│ └─────┬──────┘ │ └──────────────┘ │ └──────────────────────────┘   │
│       │        │                  │                                  │
│ ┌─────▼──────┐ │ ┌──────────────┐ │ ┌──────────────────────────┐   │
│ │ Docker     │ │ │ Docker       │ │ │ Docker                   │   │
│ │ Containers │ │ │ Containers   │ │ │ Containers               │   │
│ │ (isolated) │ │ │ (isolated)   │ │ │ (isolated)               │   │
│ └────────────┘ │ └──────────────┘ │ └──────────────────────────┘   │
└────────────────┴──────────────────┴─────────────────────────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌──────────────────┐ ┌──────────────┐  ┌──────────────────┐
│ External DeFi    │ │ Freelance    │  │ GitHub / Local   │
│ - Solana RPC     │ │ Platforms    │  │ Code Repos       │
│ - Meteora API    │ │ - Upwork API │  │                  │
│ - DefiTuna API   │ │ - Fiverr API │  │                  │
│ - Hyperliquid    │ │ - Toptal     │  │                  │
└──────────────────┘ └──────────────┘  └──────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| Windows Workstation | Control plane: Ansible runs, planning, monitoring | All servers via Tailscale SSH |
| openclaw-ansible | Provision servers, install OpenClaw, configure Docker + UFW + Tailscale | Target servers via SSH |
| Tailscale VPN | Encrypted mesh network; stable IPs across all nodes | Windows workstation + all 3 servers |
| OpenClaw (each server) | AI assistant runtime; processes tasks, runs pipelines | Lobster, Claw Hub skills, external APIs |
| Lobster (each server) | Workflow shell/pipeline runner; composes skills into sequences | OpenClaw, Claw Hub skills |
| Claw Hub (per server) | Skill registry; domain-specific automation modules loaded by OpenClaw | OpenClaw, external APIs/SDKs |
| Crypto Skills (Server 1) | Meteora LP, DefiTuna leveraged LP, Hyperliquid trading, risk management | Solana RPC, Meteora API, DefiTuna SDK, Hyperliquid SDK |
| Risk Manager (Server 1) | Enforce $100 threshold, reserve fund checks, liquidation monitoring | Crypto Skills, Notification system |
| Job Skills (Server 2) | Platform scanning, opportunity matching, AI-task identification | Upwork/Fiverr/Toptal APIs, OpenClaw |
| Coding Skills (Server 3) | Code generation, project assistance, PR review | GitHub APIs, local repo access |
| Notification System | Push alerts to owner (trade confirms, job matches) | All servers → owner's phone/desktop |
| Monitoring Dashboard | Health metrics, trade P&L, job pipeline status | All servers via Tailscale pull |

---

## Recommended Project Structure

### Per-Server Docker Layout

```
/opt/openclaw/
├── docker-compose.yml          # OpenClaw + Lobster + supporting services
├── .env                        # Secrets (API keys, wallet keys) — not in Git
├── skills/                     # Claw Hub skill directory (server-specific)
│   ├── meteora/                # Server 1 only
│   │   ├── skill.json
│   │   └── main.py
│   ├── defituna/               # Server 1 only
│   │   ├── skill.json
│   │   └── main.py
│   ├── hyperliquid/            # Server 1 only
│   │   ├── skill.json
│   │   └── main.py
│   ├── risk-manager/           # Server 1 only
│   │   ├── skill.json
│   │   └── main.py
│   ├── job-scanner/            # Server 2 only
│   │   ├── skill.json
│   │   └── main.py
│   └── code-assist/            # Server 3 only
│       ├── skill.json
│       └── main.py
├── pipelines/                  # Lobster workflow definitions
│   ├── lp-farm-cycle.yaml      # Server 1: check → harvest → reinvest
│   ├── liquidation-watch.yaml  # Server 1: monitor → fund → alert
│   ├── job-scan-cycle.yaml     # Server 2: scan → filter → notify
│   └── code-review-cycle.yaml  # Server 3: PR review → suggestions
├── data/                       # Persistent storage (Docker volumes)
│   ├── positions.db            # Current open positions (SQLite)
│   ├── trade-history.db        # Executed trades log
│   └── job-matches.db          # Job opportunities found
└── logs/                       # Structured logs per skill
    ├── meteora.log
    ├── defituna.log
    └── hyperliquid.log
```

### Ansible Repository Layout (Windows Control Plane)

```
openclaw-ansible/
├── inventory/
│   ├── hosts.yml               # Server IPs (Tailscale addresses)
│   └── group_vars/
│       ├── all.yml             # Shared config (Tailscale, UFW rules)
│       ├── crypto.yml          # Server 1 vars
│       ├── jobs.yml            # Server 2 vars
│       └── coding.yml          # Server 3 vars
├── playbooks/
│   ├── site.yml                # Full provision playbook
│   ├── harden.yml              # UFW + SSH hardening
│   ├── openclaw.yml            # OpenClaw + Docker install
│   └── deploy-skills.yml       # Push skill updates without full reprovision
├── roles/
│   ├── base/                   # Common: OS packages, users, UFW
│   ├── tailscale/              # Tailscale install + authkey
│   ├── docker/                 # Docker engine + compose
│   ├── openclaw/               # OpenClaw install + config
│   └── skills/                 # Skill deployment per server group
└── vault/
    └── secrets.yml             # Ansible Vault — API keys, wallet secrets
```

### Structure Rationale

- **skills/ per server:** Each server loads only its role-relevant skills. No shared skill state across servers — failures are isolated.
- **pipelines/ as YAML:** Lobster workflow files version-controlled alongside skills. Easy to audit automation logic.
- **data/ as Docker volumes:** Position state survives container restarts. SQLite is sufficient at this scale — no Postgres overhead.
- **Ansible vault for secrets:** Never store API keys or wallet private keys in plaintext. Vault encrypted at rest, decrypted only during Ansible runs.
- **inventory/group_vars per server:** Drives server-specific skill deployment without duplicating playbook logic.

---

## Architectural Patterns

### Pattern 1: Event-Driven Polling Loop (Lobster Pipeline)

**What:** Each server runs a Lobster pipeline that polls at intervals, processes state, and takes action. No persistent event bus needed at this scale.

**When to use:** All three servers. Polling fits DeFi (block-time granularity acceptable), job scanning (minutes acceptable), and coding assist (on-demand trigger).

**Trade-offs:** Simple to reason about and debug. Not real-time (latency = poll interval). Sufficient for this use case — Meteora LP is not HFT, job scanning can be 15-minute intervals.

**Example:**
```yaml
# pipelines/lp-farm-cycle.yaml (Lobster pipeline)
name: lp-farm-cycle
schedule: "*/5 * * * *"   # Every 5 minutes
steps:
  - skill: meteora
    action: check_positions
    output: positions

  - skill: meteora
    action: harvest_fees
    input: positions
    condition: "positions.unclaimed_fees > threshold"
    output: harvest_result

  - skill: risk-manager
    action: check_reserve_funds
    output: reserve_status

  - skill: notifier
    action: send_summary
    input: [harvest_result, reserve_status]
    condition: "harvest_result.amount > 0"
```

### Pattern 2: Risk-Gated Trade Execution

**What:** All trade actions pass through a risk manager layer before execution. The risk manager enforces the $100 auto-execute threshold, checks reserve fund levels, and monitors liquidation proximity.

**When to use:** Every trade action on Server 1. No exceptions — the risk layer is not optional.

**Trade-offs:** Adds latency to every trade (one extra function call). Worth it: prevents catastrophic losses from runaway automation.

**Example:**
```python
# skills/risk-manager/main.py
class RiskManager:
    AUTO_EXECUTE_THRESHOLD = 100  # USD

    def gate_trade(self, trade: TradeIntent) -> TradeDecision:
        if trade.usd_value > self.AUTO_EXECUTE_THRESHOLD:
            return TradeDecision(action="require_confirmation", trade=trade)

        if not self.has_sufficient_reserves(trade):
            return TradeDecision(action="block", reason="insufficient_reserve")

        if self.is_approaching_liquidation(trade.position):
            return TradeDecision(action="block_or_fund", reason="liquidation_risk")

        return TradeDecision(action="execute", trade=trade)
```

### Pattern 3: Secrets via Environment (Never in Code)

**What:** API keys, wallet private keys, and RPC endpoints are injected as environment variables from Ansible Vault at deploy time. Code reads from `os.environ`, never from config files in the repo.

**When to use:** Every skill that touches external APIs or holds wallet credentials.

**Trade-offs:** Requires Ansible Vault discipline. Eliminates entire class of secret-leak incidents.

**Example:**
```python
# skills/hyperliquid/main.py
import os

WALLET_ADDRESS = os.environ["HL_WALLET_ADDRESS"]
PRIVATE_KEY = os.environ["HL_PRIVATE_KEY"]
RPC_URL = os.environ["SOLANA_RPC_URL"]
```

### Pattern 4: Per-Server SQLite State Store

**What:** Each server maintains its own SQLite database for position state, trade history, and job matches. No shared database across servers.

**When to use:** All persistent state on all three servers.

**Trade-offs:** Cannot query across servers from a single DB. Acceptable here — cross-server analytics are a monitoring dashboard concern, not a real-time concern.

---

## Data Flow

### Server 1: Crypto Trade Execution Flow

```
Lobster Pipeline (cron trigger)
    │
    ▼
Meteora/DefiTuna/Hyperliquid Skill
    │ (fetch current positions + prices)
    ▼
External API / Solana RPC
    │ (position data, price feeds)
    ▼
Risk Manager Skill
    │ (gate: threshold check, reserve check, liquidation proximity)
    ├─ BLOCKED → Notification Skill → Owner (phone/dashboard)
    ├─ NEEDS CONFIRMATION → Notification Skill → Owner approval → Resume
    └─ AUTO EXECUTE →
        ▼
    DeFi SDK (MeteoraAg / tuna-sdk / hyperliquid-python-sdk)
        │ (signed transaction)
        ▼
    Solana / Hyperliquid Chain
        │ (tx hash, confirmation)
        ▼
    SQLite (trade-history.db)
        │
        ▼
    Notification Skill → Owner (execution summary)
```

### Server 2: Job Scanning Flow

```
Lobster Pipeline (15-min cron)
    │
    ▼
Job Scanner Skill
    │ (query Upwork / Fiverr / job board APIs)
    ▼
External Platform APIs
    │ (raw job listings)
    ▼
AI Task Identifier Skill (OpenClaw LLM call)
    │ (classify: AI-completable? skills match? value threshold?)
    ▼
SQLite (job-matches.db)
    │ (deduplicated, scored)
    ▼
Notification Skill → Owner (ranked opportunities)
```

### Server 3: Coding Assist Flow

```
Owner Trigger (manual or scheduled)
    │
    ▼
Code Assist Skill (OpenClaw LLM call)
    │ (repo context, task description)
    ▼
GitHub API / Local File System
    │ (code read, PR data)
    ▼
OpenClaw (LLM reasoning + code generation)
    │
    ▼
Output: PR comments / code suggestions / implementation draft
    │
    ▼
Owner review (manual approval before commit/push)
```

### Cross-Server Notification Flow

```
Any Server (event occurs)
    │
    ▼
Notification Skill
    │ (formats message with context)
    ▼
Notification Backend (e.g., ntfy.sh self-hosted or Telegram bot)
    │ (push notification)
    ▼
Owner: Phone / Windows Dashboard
```

### Key Data Flows Summary

1. **Market data → action:** External APIs → Skills → Risk Manager → SDK → Chain. Unidirectional, each step can veto.
2. **State persistence:** All trade/position/job state written to local SQLite after each pipeline run. No in-memory-only state.
3. **Secrets injection:** Ansible Vault → `.env` file on server → Docker container environment → skill code. Secrets never cross network at runtime.
4. **Control plane → servers:** Ansible push model. Windows workstation SSHs into servers to deploy updates. Servers do not call home to workstation.
5. **Monitoring pull:** Dashboard (on workstation or browser) pulls metrics from each server over Tailscale HTTP endpoints. Servers expose read-only status APIs.

---

## Anti-Patterns

### Anti-Pattern 1: Shared Database Across Servers

**What people do:** Stand up a central Postgres on one server and have all three servers write to it.

**Why it's wrong:** Creates a single point of failure. If the DB server goes down, all three OpenClaw instances stop functioning. At this scale (3 servers, 1 owner), the operational overhead is not worth the cross-server query capability.

**Do this instead:** SQLite per server. Export nightly summaries to the control plane workstation if cross-server reporting is needed. Monitoring dashboard reads from each server independently.

### Anti-Pattern 2: Trading Logic Without a Risk Gate

**What people do:** Let OpenClaw directly call DeFi SDK methods without an intermediate risk manager layer.

**Why it's wrong:** LLMs hallucinate. A pipeline bug, a bad API response, or a model error can trigger arbitrarily large trades with no human check. At Hyperliquid leverage, this means liquidation.

**Do this instead:** Every trade execution passes through the risk manager skill. The risk manager is a thin, deterministic Python module — not an LLM. Deterministic rules, not AI judgment, control trade gating.

### Anti-Pattern 3: Storing Private Keys in Git

**What people do:** Put wallet private keys or API keys in `config.yml`, `skills/hyperliquid/config.json`, or `.env` files that get committed.

**Why it's wrong:** Git history is permanent. Even if you delete the file, the key is exposed in history. On a homelab with GitHub sync this is a fast path to wallet drain.

**Do this instead:** Ansible Vault for all secrets. The `.env` file on each server is generated by Ansible at deploy time from vault-encrypted variables. `.env` is in `.gitignore`. No secrets ever touch Git.

### Anti-Pattern 4: One Docker Container for Everything

**What people do:** Run OpenClaw, all skills, the database, and the notification service in a single container.

**Why it's wrong:** A crash in one skill takes down the whole stack. You cannot update individual skills without restarting the LLM runtime. Log output becomes impossible to parse.

**Do this instead:** Docker Compose with one container per concern: `openclaw` (LLM runtime), `skills-crypto` or `skills-jobs` (skill runner), `sqlite` (or a mounted volume), `notifier`. Use Docker restart policies and health checks per container.

### Anti-Pattern 5: Hardcoded Poll Intervals in Code

**What people do:** `time.sleep(300)` inside skill logic.

**Why it's wrong:** Cannot change intervals without redeploying code. Different environments need different intervals. Cannot be paused without killing the process.

**Do this instead:** Use Lobster's scheduler (`schedule:` in pipeline YAML) or system cron as the trigger. Skills are invoked, do their work, and exit. The scheduler owns timing.

---

## Integration Points

### External Services

| Service | Integration Pattern | Confidence | Notes |
|---------|---------------------|------------|-------|
| Meteora (Solana) | MeteoraAg Python SDK + Solana RPC | MEDIUM | SDK is open source; RPC endpoint needs to be a paid/private node for reliability (public RPCs rate-limit) |
| DefiTuna | tuna-sdk (TypeScript/Python) | MEDIUM | SDK wraps on-chain program calls; positions stored on-chain, not in a central API |
| Hyperliquid | hyperliquid-python-sdk | MEDIUM | REST + WebSocket API; Python SDK wraps both; Rust SDK (hypersdk) is alternative for lower latency |
| Tailscale | Ansible role + `tailscaled` daemon | HIGH | Well-documented, stable, built into openclaw-ansible pattern |
| ntfy.sh (or Telegram) | HTTP POST from notification skill | HIGH | ntfy is self-hostable, no API key needed for basic use; Telegram requires bot token |
| GitHub | REST API via PyGitHub or gh CLI | HIGH | For Server 3 coding assist — reading repo structure, posting PR comments |
| Job platforms | Platform-specific REST APIs | LOW | Upwork/Fiverr API access requires application approval and may be restricted; scraping is fragile. This is the highest-risk integration. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| OpenClaw ↔ Lobster | Internal process call or IPC (exact mechanism depends on OpenClaw version) | LOW confidence on exact API — verify against openclaw-ansible source |
| OpenClaw ↔ Claw Hub Skills | Skill invocation via Claw Hub registry | LOW confidence on exact protocol — likely HTTP or subprocess |
| Server 1 ↔ Server 2 ↔ Server 3 | No direct cross-server communication at runtime | Intentional — servers are independent. Cross-server coordination happens only via shared Tailscale network for monitoring, not for skill execution |
| Servers ↔ Control Plane | SSH (Ansible push) + HTTP pull (monitoring) | HIGH confidence — standard pattern |
| Skills ↔ DeFi SDKs | In-process Python function calls | HIGH confidence — SDKs are Python libraries, not separate services |

---

## Build Order Implications

The architecture has a clear dependency chain that drives phase ordering:

```
Phase 1: Infrastructure Foundation
  openclaw-ansible provisions all 3 servers
  Tailscale mesh + UFW hardening
  Docker + OpenClaw installed
  └── Everything depends on this being done first

Phase 2: Server 1 - Crypto Core (read-only)
  Meteora SDK integrated, reads positions
  Hyperliquid SDK integrated, reads balances
  Risk Manager skeleton (no execution yet)
  └── Validate integrations work before enabling writes

Phase 3: Server 1 - Crypto Execution
  Risk Manager enforces $100 threshold
  Auto-execution paths for Meteora + Hyperliquid
  Notification system for confirmations
  └── Requires Phase 2 read paths proven stable

Phase 4: Server 1 - DefiTuna + Liquidation Protection
  DefiTuna SDK integrated
  Liquidation monitoring + auto-fund logic
  └── More complex risk logic, builds on Phase 3 patterns

Phase 5: Server 2 - Job Scanning
  Job platform integrations (start with APIs that work)
  AI task classification pipeline
  Notification for matches
  └── Independent of Server 1, can run in parallel with Phase 3-4

Phase 6: Server 3 - Coding Assist
  GitHub integration
  Code assist pipeline
  └── Lowest operational risk, can run in parallel

Phase 7: Monitoring Dashboard
  Cross-server health + P&L view
  Accessible via Tailscale from Windows workstation
  └── Requires all servers running; can be built incrementally
```

**Ordering rationale:**
- Infrastructure (Phase 1) is a hard prerequisite for everything.
- Crypto server (Phases 2-4) is the highest-value and highest-risk component — build it in read-only mode first, then enable execution.
- Risk Manager must be built before any execution path goes live. It is not optional.
- Job scanning (Phase 5) and coding assist (Phase 6) are independent workstreams; they can proceed in parallel with later crypto phases.
- Dashboard (Phase 7) is a nice-to-have at launch; Tailscale SSH access to each server is sufficient for early monitoring.

---

## Scaling Considerations

This is a single-owner homelab. Scaling considerations are about **reliability and operational simplicity**, not user volume.

| Concern | Current Hardware (3x 24-core / 16GB) | If Crypto Volume Increases |
|---------|--------------------------------------|---------------------------|
| LLM inference | 16GB RAM limits local model size; use API-backed OpenClaw or quantized model | Add RAM or use OpenAI/Anthropic API backend |
| Trade frequency | Polling every 5 min is fine for LP farming | Move Hyperliquid to WebSocket streaming if HFT needed |
| Position state | SQLite handles thousands of trades easily | Still fine; SQLite scales to millions of records on SSD |
| Job scan rate | 15-min intervals, no concurrency needed | Increase frequency if platform APIs allow |
| Log volume | Structured logs per skill, rotate daily | Add centralized log aggregation (Loki + Grafana) if parsing becomes hard |

**First bottleneck:** RAM on Server 1 (Crypto). Running OpenClaw LLM + DeFi SDK processes + position monitoring simultaneously may hit 16GB. Mitigation: run a smaller/quantized LLM, or offload LLM calls to API (Anthropic/OpenAI) rather than local model.

**Second bottleneck:** Solana RPC rate limits. Free public RPC endpoints will throttle at volume. Use a paid RPC provider (Helius, QuickNode) from the start for Server 1.

---

## Sources

- Project context from `PROJECT.md` (confirmed requirements, hardware, SDK choices)
- MeteoraAg SDK: https://github.com/MeteoraAg — not fetched (WebFetch unavailable); pattern based on standard LP SDK conventions (MEDIUM confidence)
- DefiTuna tuna-sdk: https://github.com/DefiTuna/tuna-sdk — not fetched; leveraged LP patterns from DeFi ecosystem knowledge (MEDIUM confidence)
- Hyperliquid Python SDK: https://github.com/hyperliquid-dex/hyperliquid-python-sdk — not fetched; REST + WebSocket pattern common to perp DEX SDKs (MEDIUM confidence)
- Tailscale homelab patterns: HIGH confidence, well-documented
- Docker Compose multi-container patterns: HIGH confidence, widely established
- Ansible Vault secrets management: HIGH confidence, standard practice
- SQLite for single-server persistence: HIGH confidence
- OpenClaw / Claw Hub / Lobster internals: LOW confidence — limited external documentation accessible. Build order and component boundaries inferred from project context and tool names.

**Flag for validation:** The exact IPC/API protocol between OpenClaw, Lobster, and Claw Hub skills needs verification against actual openclaw-ansible source code before Phase 1 implementation. The architecture above treats them as a composable pipeline which is the intended use — but the specific invocation mechanism (HTTP, subprocess, socket) is LOW confidence.

---

*Architecture research for: Multi-server AI assistant homelab with DeFi automation (OpenClaw)*
*Researched: 2026-02-17*
