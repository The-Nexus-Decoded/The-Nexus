# Architecture

**Analysis Date:** 2026-04-02

## Pattern Overview

**Overall:** Monorepo with domain-driven realms (5 layers) + decoupled agent fleet

**Key Characteristics:**
- Five independent "Realms" organized by domain and responsibility
- Clear separation of concerns: execution vs. communication vs. UI vs. data vs. governance
- OpenClaw gateway system for agent coordination and CLI management
- Service-oriented architecture within Pryan-Fire (orchestrator, executor, risk manager, etc.)
- GitHub Actions + Phantom Gauntlet CI pipeline for PR validation
- Systemd services for autonomous background operations

## Layers

**Pryan-Fire (Business Logic):**
- Purpose: Trading services, agent tools, backend APIs, execution engines
- Location: `Pryan-Fire/`
- Contains: Orchestrator service, Risk Manager, Meteora trader, Haplo's CI tools, Zifnab's coordination scripts
- Depends on: Solana RPC, database schemas (Abarrach-Stone), Discord webhooks (Chelestra-Sea)
- Used by: Trading agents, automated workflows, CI/CD pipelines

**Chelestra-Sea (Infrastructure & Communication):**
- Purpose: Fleet orchestration, networking, cross-realm integration, Lobster workflows
- Location: `Chelestra-Sea/`
- Contains: Ansible playbooks, shell scripts, workflow definitions, CI/CD infrastructure, Discord bot integrations
- Depends on: Pryan-Fire services, target servers via SSH/Tailscale
- Used by: Zifnab agent, deployment pipelines, cross-server communication

**Arianus-Sky (User Interfaces):**
- Purpose: Dashboards, web UIs, visualizations, intelligence feeds, game/XR projects
- Location: `Arianus-Sky/`
- Contains: Next.js application, React components, API routes, Tailwind CSS styling
- Depends on: Pryan-Fire APIs, intelligence feeds (moved from Fire), static assets
- Used by: Web browsers, developers, game engines

**Abarrach-Stone (Data & Storage):**
- Purpose: Data models, schemas, storage pipelines, historical archives
- Location: `Abarrach-Stone/`
- Contains: JSON schemas, migration scripts, analytics pipelines
- Depends on: None (pure data definitions)
- Used by: All realms for persistent storage contracts

**Nexus-Vaults (Memory & Governance):**
- Purpose: Agent workspace backups, institutional memory, security policies, compliance artifacts
- Location: `Nexus-Vaults/`
- Contains: Agent workspace snapshots (daily .md backups), memory files, fleet documentation
- Depends on: SSH access to all 3 servers for Tier 2 backup sync
- Used by: Disaster recovery, agent re-onboarding, audit trails

## Data Flow

**Trading Signal → Execution:**

1. Signal arrives (external scanner, Discord webhook, or internal trigger)
2. EventLoop (`core/event_loop.py`) dequeues signal and passes to TradeOrchestrator
3. TradeOrchestrator transitions through state machine: INITIAL → VALIDATION → ROUTING → EXECUTING → EXECUTED
4. RpcIntegrator (`core/rpc_integration.py`) handles Solana wallet operations, transaction signing
5. Risk Manager (`risk-manager/`) applies position limits, validates risk
6. Result persists to `trades.db` (Abarrach-Stone schema)
7. Health server (`health_server.py`) exposes `/health` for monitoring

**Deployment Flow:**

1. Developer commits to branch, pushes to GitHub
2. PR triggers Phantom Gauntlet (`phantom-gauntlet.yml`): linter, type checks, smoke tests
3. After approval, merge to `main`
4. GitHub Actions runs `deploy-mvp.yml` on push to main
5. Deploy workflow SSH into target server (Hugh's ola-claw-trade)
6. Sync codebase from `/data/repos/The-Nexus`
7. Install dependencies, reload systemd services
8. Service restarts and reports status

**Agent Coordination:**

1. Agents run on OpenClaw gateway (`~/.openclaw-<name>/`)
2. Each agent has profile-specific config: `~/.openclaw-<name>/openclaw.json`
3. Discord channels (via Alfred's bot) relay messages between agents and systems
4. Agents query Pryan-Fire services for data, state updates
5. Long-running operations logged to Nexus-Vaults daily backups

**State Management:**

- **Trade State:** State machine in `core/state_machine.py` (enum-based)
- **Orchestrator State:** In-memory queue + SQLite persistence (`trades.db`)
- **Position State:** TradeStateManager in `state/state_manager.py` tracks open positions
- **Agent State:** Profile-specific files in `~/.openclaw-<name>/` on each server
- **Memory:** Daily markdown snapshots in `Nexus-Vaults/agent-backups/`

## Key Abstractions

**TradeOrchestrator:**
- Purpose: Central state machine for a single trade (validate → route → execute)
- Examples: `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/orchestrator.py`
- Pattern: Stateful service with logging, configuration injection, dependency on RpcIntegrator

**EventLoop:**
- Purpose: Async-safe event queue processor, decouples signal ingestion from processing
- Examples: `core/event_loop.py`
- Pattern: Thread-safe queue (queue.Queue) with graceful shutdown on KeyboardInterrupt

**RpcIntegrator:**
- Purpose: Abstraction over Solana RPC calls and keypair management
- Examples: `core/rpc_integration.py`
- Pattern: Singleton-like, eager loading of keypair from environment, httpx client pooling

**HealthServer:**
- Purpose: Liveness probe endpoint for orchestrator
- Examples: `health_server.py`
- Pattern: Async HTTP server (FastAPI/uvicorn) running in daemon thread

**Realm Gateway:**
- Purpose: OpenClaw CLI and agent runtime
- Examples: `/home/openclaw/.openclaw-<name>/`
- Pattern: Profile-based isolation, per-server state management

## Entry Points

**Trade Orchestrator:**
- Location: `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/main.py`
- Triggers: systemd service `patryn-trader.service` on ola-claw-trade
- Responsibilities: Parse CLI args (--db, --log, --health-port, --dry-run), init logger, spawn health & event loop threads, listen for shutdown signals

**Next.js App:**
- Location: `Arianus-Sky/src/app/` (App Router)
- Triggers: `npm run dev` (development) or `npm run start` (production)
- Responsibilities: Render landing page, manage routes, expose API endpoints in `/api/`

**GitHub Actions CI/CD:**
- Location: `.github/workflows/phantom-gauntlet.yml`
- Triggers: Pull request to main/master
- Responsibilities: Type-check TypeScript, smoke-test Python imports, dry-run orchestrator, verify devnet wallet

**Deployment Pipeline:**
- Location: `.github/workflows/deploy-mvp.yml`
- Triggers: Push to main (when Pryan-Fire/ files change)
- Responsibilities: SSH into trade server, git sync, venv setup, systemd reload/restart

## Error Handling

**Strategy:** Layered logging + graceful degradation

**Patterns:**

- **Logging:** All services use `logging` module with structured logs (JSON format in `health_server.py`)
- **Trade Failures:** EventLoop catches all exceptions, logs to JSONL telemetry, continues processing next signal
- **RPC Errors:** RpcIntegrator handles httpx timeout/connection errors with retry logic (implicit in httpx.Client)
- **Service Shutdown:** Orchestrator.stop() and EventLoop.stop() flags allow graceful teardown
- **Health Checks:** `/health` endpoint returns 200 if running, can be queried by monitoring systems

## Cross-Cutting Concerns

**Logging:** 
- Framework: `logging` (Python stdlib)
- Pattern: Each module initializes `logger = logging.getLogger(__name__)` at module level
- Destination: `/logs/orchestrator.jsonl` (JSONL telemetry) for structured logs; stdout for debug
- Trade-specific: All trade operations prefixed with `[trade_id]` for correlation

**Validation:**
- Approach: Type hints + Pydantic models (in requirements, not fully deployed yet)
- Trade limits: Hardcoded MAX_AUTO_TRADE_USD in TradeOrchestrator (currently $1)
- RPC validation: httpx + solders library type safety
- Configuration validation: JSON schema in `config/orchestrator_config.json`

**Authentication:**
- Solana keypair: Loaded from environment (`TRADING_WALLET_PRIVATE_KEY`)
- Discord webhooks: Token in environment (`DISCORD_WEBHOOK_URL` implicit in scripts)
- SSH deployment: GitHub Actions secrets (`TRADE_SERVER_SSH_KEY`)
- OpenClaw gateway: Profile-based isolation, no cross-profile access without explicit config

**Configuration:**
- Orchestrator config: `config/orchestrator_config.json` + CLI args override
- Service deployment: systemd units in `~/.config/systemd/user/`
- Environment: `.env` files (not tracked in git, loaded by systemd)
- RPC endpoints: Hardcoded in code (Solana mainnet default, testnet via `--dry-run`)

---

*Architecture analysis: 2026-04-02*
