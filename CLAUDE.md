# The-Nexus Monorepo - Agent Instructions

## 🌌 The Infrastructure Lords
- **Archivist (Alfred/Claude):** Keeper of the memory, branch runner, and CI supervisor.
- **High Councillor (Samah/Gemini):** Master of infrastructure, Ansible runes, and cross-realm orchestration.

## 🚫 File Protection Rules
- **NEVER delete .md files** — not on servers, not in workspaces, not in the repo. No exceptions.
- **NEVER remove agent workspace files** — SOUL.md, TEAM.md, AGENTS.md, OPERATIONS.md, DISCORD-RULES.md, GIT-RULES.md, REPO-MAP.md, SECURITY.md, TOOLS.md, IDENTITY.md, HEARTBEAT.md, USER.md, BOOTSTRAP.md are ALL intentional.
- If something seems like bloat, **ask the user first**. If context overflows, fix the model config — don't trim content.
- Agent workspace originals are in `agentstructure/` — that's the restore source, not a delete target.

## 🏛️ Source of Truth (Post-Migration)
All agent code, workflows, and configuration now reside in the consolidated monorepo:
`/data/openclaw/workspace/The-Nexus/`

Legacy standalone repositories (e.g., `/data/openclaw/workspace/Pryan-Fire/`) are deprecated. Never write to them directly.

## OpenClaw CLI Profile Rule (MANDATORY)

**ALWAYS use `--profile <name>` when running any `openclaw` CLI command on servers.** Every agent runs from its own profile-specific root at `~/.openclaw-<name>/`. The default root (`~/.openclaw`) is NOT any agent — running CLI commands without `--profile` hits the wrong config and can break things.

- Agent configs live at: `~/.openclaw-<name>/openclaw.json`
- Agent state lives at: `~/.openclaw-<name>/`
- **NEVER read or edit `/data/openclaw/openclaw.json`** — that is the old default root, not a live agent config.
- **NEVER assume `~/.openclaw` is the right path** — it is a legacy symlink to `/data/openclaw/` and is not used by any running gateway.

---

## Branch Discipline (MANDATORY — NO EXCEPTIONS)

**Before touching any code, you MUST run:**
```bash
git fetch origin
git log --oneline HEAD..origin/main
```

If that returns ANY commits, your branch is stale. **Stop immediately.**

**If your branch is behind main:**
1. Do NOT open a PR
2. Do NOT continue coding
3. Rebase first: `git rebase origin/main`
4. Resolve all conflicts, then continue

**If a PR you're working on already exists and is behind main:**
1. Do NOT merge it
2. Update the branch: `git fetch origin && git rebase origin/main`
3. Force-push: `git push --force-with-lease`
4. Only then proceed with merge

**Never ask the owner to authorize a merge on a stale branch. Fix the branch first.**

---

## Deployment (MANDATORY — NO EXCEPTIONS)

**Never SSH into Hugh and manually edit files or restart services.**

All changes go through the pipeline:
```
branch → PR → phantom-gauntlet CI → merge to main → deploy-mvp.yml auto-deploys
```

The only deploy workflow is `.github/workflows/deploy-mvp.yml`. It triggers automatically on push to `main` when relevant files change. Do not create new deploy workflows.

---

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/sniper-retry-queue` |
| Bug fix | `fix/<short-description>` | `fix/retry-aiohttp-context` |
| Hotfix | `hotfix/<short-description>` | `hotfix/wallet-path` |

Always branch from `main`. Always target `main`.

---

## PR Rules

- One concern per PR — don't bundle unrelated changes
- PR must pass phantom-gauntlet CI before merge
- After merge, delete the branch
- If a PR has been open more than 48 hours without merge, it is stale — close it or rebase and update it

---

## 🛠️ Build & Test Runes (Subdirectory Logic)
All commands MUST account for the subdirectory nesting:
- **Fire:** `cd Pryan-Fire/ && [command]`
- **Sea:** `cd Chelestra-Sea/ && [command]`
- **Sky:** `cd Arianus-Sky/ && [command]`
- **Stone:** `cd Abarrach-Stone/ && [command]`

### General (from The-Nexus root)
```bash
# Run all tests across all realms (if configured)
npm run test --workspaces
# or recursive
npm run test --if-present --recursive
```

### Pryan-Fire (Python + Node services)
```bash
cd Pryan-Fire
# Haplo's workshop tools
cd haplos-workshop && pytest && npm run lint
# Zifnab's coordination tools
cd zifnabs-scriptorium && pytest && npm run lint
# Hugh's trading code (test only, never deploy未经测试)
cd hughs-forge && pytest && npm run lint
# Meteora trader (Node.js)
cd hughs-forge/services/meteora-trader && npm run lint && npm test
```

### Chelestra-Sea (Infrastructure)
```bash
cd Chelestra-Sea
# Workflow linting (if applicable)
npm run lint --if-present
# Shell script validation
find . -name "*.sh" -exec shellcheck {} \;
```

### Arianus-Sky (UI/Dashboards)
```bash
cd Arianus-Sky
npm run dev        # Start dev server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
```

### Abarrach-Stone (Data/Schemas)
No build step required. Validate schemas:
```bash
cd Abarrach-Stone
# JSON schema validation (example)
python -m jsonschema -i data/schema.json examples/
```

### Nexus-Vaults (Backup/Sync)
```bash
cd Nexus-Vaults
# Test redaction script
./scripts/redact-and-sync.sh --dry-run
```

---

## Server Roles

- **Hugh** (`ola-claw-trade`): trader only — runs `patryn-trader.service`
- **Haplo** (`ola-claw-dev`): coder only — runs GitHub Actions runner
- **Zifnab** (`ola-claw-main`): coordinator only — do not deploy code here

---

## 📁 Key Paths
- **Monorepo Root:** `/data/openclaw/workspace/The-Nexus/`
- **Pryan-Fire:** `/data/openclaw/workspace/The-Nexus/Pryan-Fire/`
- **Infrastructure:** `/data/openclaw/workspace/The-Nexus/Chelestra-Sea/`
- **Dashboards:** `/data/openclaw/workspace/The-Nexus/Arianus-Sky/`
- **Data schemas:** `/data/openclaw/workspace/The-Nexus/Abarrach-Stone/`

**Note:** Always use the workspace paths above for edits. Use `/data/repos/The-Nexus/` only for exec/git operations.

---

## Lobster Workflows Location

All workflow files remain at:
`/data/openclaw/workspace/workflows/*.lobster`

They reference The-Nexus paths in their arguments.

---

## MCP Servers (Live — 2026-03-24)

Two MCP servers run on Lord Xar's Windows machine and are forwarded to ola-claw-dev via socat.

| MCP | Windows Port | Dev Local Port | Agent | mcporter name |
|---|---|---|---|---|
| Unity (CoplayDev/unity-mcp) | 8080 | 18080 | Vasu | `unity-mcp` |
| Roblox (boshyxd/robloxstudio-mcp) | 8090 | 18090 | Limbeck | `roblox-mcp` |

**Architecture:**
```
Agent (danger-full-access sandbox) → Tailscale → 100.90.155.49:8080/8090 (Windows)
```

**Windows startup (must be running for MCP to work):**
```bash
# Unity MCP (HTTP transport, port 8080)
uvx --from mcpforunityserver mcp-for-unity --transport http --http-host 0.0.0.0 --http-port 8080

# Roblox MCP (stdio wrapped via supergateway as streamable HTTP, port 8090)
npx -y supergateway --stdio "npx -y robloxstudio-mcp@latest" --port 8090 --outputTransport streamableHttp --cors
```

**mcporter config:** `/home/openclaw/config/mcporter.json` — shared by all agents on dev. Points to `100.90.155.49` (Windows Tailscale IP).

**Sandbox override (Vasu + Limbeck only):**
OpenClaw gateway hardcodes `--sandbox workspace-write` for codex-cli backends (in `discord-CcCLMjHw.js`). This blocks network access. Vasu and Limbeck have a config override at `agents.defaults.cliBackends.codex-cli` in their `openclaw.json` that sets `--sandbox danger-full-access` to allow MCP network calls. No other agents are affected.

**Unity Editor plugin:** Window > Package Manager > + > Add from git URL:
`https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main`

**Roblox Studio plugin:** Install from `boshyxd/robloxstudio-mcp` releases. Enable "Allow HTTP Requests" in Experience Settings > Security.

---

## Migration Status

✅ **The-Nexus Monorepo Migration COMPLETE** (2026-03-04)
- All five realms consolidated under The-Nexus
- Full git history preserved via subtree merges
- Legacy standalone repositories deprecated
- AGENTS.md, MEMORY.md, and this file updated with new paths
- Bridge handoff created at `.claude/handoffs/monorepo-completion.md`

<!-- GSD:project-start source:PROJECT.md -->
## Project

**OpenClaw Agent Management & Normalization**

A fleet management system for 20 OpenClaw AI agents running across 3 homelab servers (Zifnab/ola-claw-main, Haplo/ola-claw-dev, Hugh/ola-claw-trade). Covers post-upgrade stabilization, ongoing configuration optimization, tooling/dashboards for fleet health, agent coordination via Discord, and sub-project management for the work agents do (AI tools, apps, crypto trading, gaming).

**Core Value:** All 20 agents running perfectly, doing their assigned jobs with minimal issues — and the owner has the tools, dashboards, and processes to keep it that way without manual firefighting.

### Constraints

- **Infrastructure ownership**: All systemd, crontabs, scripts, firewall changes via owner's Claude CLI only — never delegated to agents
- **Config safety**: NEVER rewrite full openclaw.json — always targeted JSON patches with backups
- **Server access**: SSH MCP tools available for reads/checks; owner runs destructive operations
- **Discord rules**: PLAIN TEXT only, include "This is Lord Xar", requireMention: true on all channels except #jarvis
- **Pipeline discipline**: No manual deploys for Pryan-Fire — always use Actions pipeline
- **Budget**: OpenRouter $5/day hard cap per model, free-tier primary models preferred
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Python 3.12 - Trade services, scripting, orchestration, risk management
- TypeScript 5.3+ - Meteora trading client, XR spatial resolver, Next.js dashboard
- JavaScript (Node.js 20) - Image generation MCP server, Next.js applications
- Bash - Infrastructure scripting, deployment automation
- Go - Not detected
- Rust - Not detected (Solana SDK uses Rust internally)
## Runtime
- Node.js 20 (used in CI/CD workflows)
- Python 3.12 (used in CI/CD workflows)
- npm (Node.js projects)
- pip (Python projects)
- Lockfiles: `package-lock.json` present for Node.js, `requirements.txt` pinned for Python
## Frameworks
- FastAPI 0.100.0+ - Trade orchestrator API, risk manager API, health servers
- Next.js 16.1.6 - Arianus-Sky dashboard (React 19.2.3, TypeScript 5)
- Uvicorn 0.20.0+ - ASGI server for FastAPI applications
- @solana/web3.js 1.91.6 - Solana RPC interactions, wallet management
- @coral-xyz/anchor 0.30.1 - Anchor framework for Solana program interaction
- @meteora-ag/dlmm 1.9.3 - Meteora DLMM liquidity management protocol
- solana (Python) 0.36.11+ - Python Solana client library
- solders 0.21.0+ - Solana transaction building and signing
- anchorpy - Anchor framework Python bindings
- pytest 7.0.0+ - Python unit tests
- unittest - Python standard library testing (fallback)
- TypeScript 5.3.3+ - Type checking
- Tailwind CSS 4 - Utility-first CSS framework (Arianus-Sky)
- ESLint 9 - Linting (Next.js via eslint-config-next)
- Zod 3.24.0 - TypeScript-first schema validation (MCP server)
- discord.py 2.0.0+ - Discord bot integration, messaging
- @modelcontextprotocol/sdk 1.12.1 - Model Context Protocol server framework
- httpx 0.24.0+ - Async HTTP client for RPC and API calls
- requests 2.28.0+ - HTTP client library
- axios 1.6.7+ - HTTP client for JavaScript/Node.js
## Key Dependencies
- @google/genai 1.3.0 - Gemini API integration for image generation
- discord.py 2.0.0+ - Discord bot webhooks and messaging (telemetry, alerts)
- solana ecosystem packages - Blockchain interaction core
- pydantic 2.0.0+ - Data validation and settings management (FastAPI)
- fastapi + uvicorn - REST API serving for trade services
- Three.js 0.160.0 - 3D rendering for XR spatial resolver
- sqlite3 - Embedded database for trade ledgers and state persistence
- json, datetime, logging - Standard library utilities
- pandas 2.0.0 - Data analysis (risk manager)
- numpy 1.24.0 - Numerical computing (risk manager)
- scikit-learn 1.3.0 - Machine learning (risk manager)
## Configuration
- `GEMINI_API_KEY` - Google Gemini API authentication
- `DISCORD_TOKEN` / `RISK_MANAGER_DISCORD_TOKEN` - Discord bot credentials
- `SOLANA_RPC_URL` - Solana RPC endpoint (defaults to mainnet-beta)
- `JUPITER_API_KEY` - Jupiter DEX API key (Ultra v1 endpoint)
- `TRADING_WALLET_PATH` - Path to trading wallet JSON (defaults to `/data/openclaw/keys/trading_wallet.json`)
- `TRADING_WALLET_SECRET` - Wallet private key (fallback)
- `MCP_TRANSPORT` - MCP server transport mode ("stdio" or "http")
- `MCP_PORT` - HTTP port for MCP server
- `DISCORD_WEBHOOK_*` - Multiple webhook URLs for different alert categories (ALERTS, EXTREME, KILLER, ALPHA, POSITIONS, TRADE_ALERTS, etc.)
- `POSITION_MONITOR_STATE_FILE` - Persistent state for position tracking
- `HEALTH_SERVER_URL` - Internal health monitoring endpoint
- `tsconfig.json` - `Arianus-Sky/tsconfig.json`: ES2017 target, strict mode, path aliases
- `.github/workflows/` - CI/CD configuration files (phantom-gauntlet, deploy-mvp, trade-executor-ci)
## Platform Requirements
- Node.js 20+
- Python 3.12+
- Git
- bash/shell environment
- Deployment target: Linux servers (ola-claw-trade, ola-claw-dev)
- Solana mainnet-beta or devnet
- Discord Guild with bot permissions
- Tailscale network (for cross-server communication)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Overview
## Naming Patterns
### Files
- PascalCase for React components: `RiskManager.tsx`, `PositionManager.ts`
- camelCase for utility modules: `useXRMobileBridge.ts`, `HapticEngine.ts`
- Snake_case for configuration files: `orchestrator_config.json`
- snake_case consistently: `exit_strategy.py`, `trade_orchestrator.py`, `security_scanner.py`
- Class definitions inside files: multiple classes per file is common
- No strict separation of test vs production (tests can import from src directly)
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\trade-executor\main.py` (service entry point)
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\src\app\layout.tsx` (React layout)
### Functions
- snake_case: `check_trade()`, `report_trade_result()`, `get_active_positions()`
- Async methods prefixed with pattern: `async def check_all_positions()`, `async def exit_monitor_loop()`
- Private/internal: Single leading underscore: `_format_approval_message()`, `_setup_bot()`, `_add_position()`
- camelCase for methods/functions: `fetchActivePositions()`, `claimFees()`, `fetchSolanaPrice()`
- Async functions naturally use async/await: `async fetchActivePositions()`
- Constructor patterns: `constructor(rpcUrl: string, ownerPublicKey: string)`
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 60-125
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\meteora-trader\src\PositionManager.ts` lines 16-35
### Variables
- snake_case consistently: `daily_loss_limit`, `circuit_breaker_active`, `consecutive_losses`, `max_trade_size`
- Class attributes: private with underscore: `self._discord_enabled`, `self._setup_bot()`, `self.lock`
- Constants: SCREAMING_SNAKE_CASE: `RPC_ENDPOINT`, `TOKEN_PROGRAM_ID`, `TRADING_WALLET_PUBLIC_KEY`
- Dictionaries and maps: lowercase with underscores: `self.pending_trades`, `self.trade_approvals`
- camelCase: `connection`, `owner`, `pythHermesClient`
- Private fields: prefixed with underscore in class definitions: (not heavily used in sampled code)
- Type annotations always present in function signatures
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 31-33
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\meteora-trader\src\PositionManager.ts` lines 6-8
### Types
- Type hints in function signatures: `def check_trade(self, trade_details: Dict[str, Any]) -> bool:`
- Union types: `Optional[Dict[str, float]]`, `List[Dict[str, Any]]`
- Enum for state machines: `class ExecutorState(Enum):` with `auto()` values
- Pydantic models for API contracts: `class TradeDetails(BaseModel):`
- Explicit return types required: `async fetchActivePositions()` should be `async fetchActivePositions(): Promise<any[]>`
- Interfaces for data structures (rare in sampled code, but available via tsconfig paths)
- Generic types used in service classes
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\risk-manager\main.py` lines 27-36
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\src\executor\state_machine.py` lines 10-17
## Code Style
### Formatting
- No strict formatter configured (no Black, Ruff, or isort config found)
- Observed: 4-space indentation, max line length ~100-120 characters
- String formatting: f-strings used: `f"Trade {trade_id} auto-approved (mock mode)."`
- Docstrings: Triple-quoted, single-line for simple methods, multi-line for complex: `"""Monitors open positions and executes automatic sell signals based on Take-Profit (TP) and Stop-Loss (SL) thresholds."""`
- ESLint configured: `H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\eslint.config.mjs`
- Config extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Next.js specific rules enforced (proper image handling, component patterns)
- No Prettier config, likely using Next.js defaults
### Linting
- No linting config found (no pyproject.toml, setup.cfg, or pylintrc)
- Practices suggest PEP 8 adherence: snake_case, 4-space indentation
- Type hints used but not strictly enforced
- ESLint via `eslint: "^9"` in `H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\package.json`
- Run with: `npm run lint` (from Arianus-Sky)
- Next.js core vitals and TypeScript rules applied automatically
## Import Organization
### Python
- Relative imports for sibling modules: `from .guards import TradingGuards`
- Absolute imports for cross-service: `from src.data.ledger import LedgerDB`
- No wildcard imports observed
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\risk-manager\main.py` lines 1-11
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 1-6
### TypeScript
- Configured in `H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\tsconfig.json`: `"@/*": ["./src/*"]`
- Not observed in sampled files (likely reserved for larger projects)
## Error Handling
### Python Patterns
### TypeScript Patterns
## Logging
### Framework
- `logging.basicConfig()` sets up handlers and level
- Named loggers: `logger = logging.getLogger(__name__)`
- Multiple handlers: file + stderr simultaneously
### Logging Patterns
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\risk-manager\src\RiskManager.py` lines 11-12, 38-39, 94, 98
- `H:\Projects\AI_Tools_And_Information\The-Nexus\Pryan-Fire\hughs-forge\services\risk-manager\main.py` lines 34-43
## Comments
### When to Comment
### JSDoc/TSDoc
## Function Design
### Size Guidelines
- Observed: Functions range 5-50 lines
- Pattern: Smaller async functions with orchestration in caller
- Example: `check_position_size()` is 4 lines; `check_trade()` is 28 lines
- State machines use async/await to decompose: `get_jupiter_route()` → `verify_trade()` → `request_manual_approval()`
- Observed: Methods 5-30 lines
- Pattern: Simple, constructor-based dependency injection
- Example: `fetchActivePositions()` is 3 lines; `claimFees()` is 8 lines
### Parameters
- Explicit types: `def check_trade(self, trade_details: Dict[str, Any]) -> bool:`
- Dict unpacking common: `trade_dict = trade.model_dump()`
- Optional parameters with defaults: `def __init__(self, discord_token: str = None, channel_id: int = None):`
- Constructor params: `constructor(rpcUrl: string, ownerPublicKey: string, hermesUrl: string)`
- Type annotations required
- No default parameters observed (constructor patterns used instead)
### Return Values
- Single values: `async def check_all_positions(...) -> List[Dict[str, Any]]:`
- Tuples for success/error: `def check_position_size(...) -> tuple[bool, str]:`
- None for void operations: `async def on_reaction(...)` returns implicitly None
- Promises for async: `async fetchActivePositions(): Promise<any[]>` (implicit in sampled code)
- Single values or arrays
- No union return types observed in samples
## Module Design
### Exports
- Classes: Public classes defined at module level, importable
- Functions: Public functions at module level
- No explicit `__all__` lists observed
- Init files (`__init__.py`) kept minimal
- Named exports: `export class PositionManager { ... }`
- Default exports rare (not observed in samples)
- No barrel files (index.ts exports) observed
### Barrel Files
## Configuration and Constants
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Five independent "Realms" organized by domain and responsibility
- Clear separation of concerns: execution vs. communication vs. UI vs. data vs. governance
- OpenClaw gateway system for agent coordination and CLI management
- Service-oriented architecture within Pryan-Fire (orchestrator, executor, risk manager, etc.)
- GitHub Actions + Phantom Gauntlet CI pipeline for PR validation
- Systemd services for autonomous background operations
## Layers
- Purpose: Trading services, agent tools, backend APIs, execution engines
- Location: `Pryan-Fire/`
- Contains: Orchestrator service, Risk Manager, Meteora trader, Haplo's CI tools, Zifnab's coordination scripts
- Depends on: Solana RPC, database schemas (Abarrach-Stone), Discord webhooks (Chelestra-Sea)
- Used by: Trading agents, automated workflows, CI/CD pipelines
- Purpose: Fleet orchestration, networking, cross-realm integration, Lobster workflows
- Location: `Chelestra-Sea/`
- Contains: Ansible playbooks, shell scripts, workflow definitions, CI/CD infrastructure, Discord bot integrations
- Depends on: Pryan-Fire services, target servers via SSH/Tailscale
- Used by: Zifnab agent, deployment pipelines, cross-server communication
- Purpose: Dashboards, web UIs, visualizations, intelligence feeds, game/XR projects
- Location: `Arianus-Sky/`
- Contains: Next.js application, React components, API routes, Tailwind CSS styling
- Depends on: Pryan-Fire APIs, intelligence feeds (moved from Fire), static assets
- Used by: Web browsers, developers, game engines
- Purpose: Data models, schemas, storage pipelines, historical archives
- Location: `Abarrach-Stone/`
- Contains: JSON schemas, migration scripts, analytics pipelines
- Depends on: None (pure data definitions)
- Used by: All realms for persistent storage contracts
- Purpose: Agent workspace backups, institutional memory, security policies, compliance artifacts
- Location: `Nexus-Vaults/`
- Contains: Agent workspace snapshots (daily .md backups), memory files, fleet documentation
- Depends on: SSH access to all 3 servers for Tier 2 backup sync
- Used by: Disaster recovery, agent re-onboarding, audit trails
## Data Flow
- **Trade State:** State machine in `core/state_machine.py` (enum-based)
- **Orchestrator State:** In-memory queue + SQLite persistence (`trades.db`)
- **Position State:** TradeStateManager in `state/state_manager.py` tracks open positions
- **Agent State:** Profile-specific files in `~/.openclaw-<name>/` on each server
- **Memory:** Daily markdown snapshots in `Nexus-Vaults/agent-backups/`
## Key Abstractions
- Purpose: Central state machine for a single trade (validate → route → execute)
- Examples: `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/orchestrator.py`
- Pattern: Stateful service with logging, configuration injection, dependency on RpcIntegrator
- Purpose: Async-safe event queue processor, decouples signal ingestion from processing
- Examples: `core/event_loop.py`
- Pattern: Thread-safe queue (queue.Queue) with graceful shutdown on KeyboardInterrupt
- Purpose: Abstraction over Solana RPC calls and keypair management
- Examples: `core/rpc_integration.py`
- Pattern: Singleton-like, eager loading of keypair from environment, httpx client pooling
- Purpose: Liveness probe endpoint for orchestrator
- Examples: `health_server.py`
- Pattern: Async HTTP server (FastAPI/uvicorn) running in daemon thread
- Purpose: OpenClaw CLI and agent runtime
- Examples: `/home/openclaw/.openclaw-<name>/`
- Pattern: Profile-based isolation, per-server state management
## Entry Points
- Location: `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/main.py`
- Triggers: systemd service `patryn-trader.service` on ola-claw-trade
- Responsibilities: Parse CLI args (--db, --log, --health-port, --dry-run), init logger, spawn health & event loop threads, listen for shutdown signals
- Location: `Arianus-Sky/src/app/` (App Router)
- Triggers: `npm run dev` (development) or `npm run start` (production)
- Responsibilities: Render landing page, manage routes, expose API endpoints in `/api/`
- Location: `.github/workflows/phantom-gauntlet.yml`
- Triggers: Pull request to main/master
- Responsibilities: Type-check TypeScript, smoke-test Python imports, dry-run orchestrator, verify devnet wallet
- Location: `.github/workflows/deploy-mvp.yml`
- Triggers: Push to main (when Pryan-Fire/ files change)
- Responsibilities: SSH into trade server, git sync, venv setup, systemd reload/restart
## Error Handling
- **Logging:** All services use `logging` module with structured logs (JSON format in `health_server.py`)
- **Trade Failures:** EventLoop catches all exceptions, logs to JSONL telemetry, continues processing next signal
- **RPC Errors:** RpcIntegrator handles httpx timeout/connection errors with retry logic (implicit in httpx.Client)
- **Service Shutdown:** Orchestrator.stop() and EventLoop.stop() flags allow graceful teardown
- **Health Checks:** `/health` endpoint returns 200 if running, can be queried by monitoring systems
## Cross-Cutting Concerns
- Framework: `logging` (Python stdlib)
- Pattern: Each module initializes `logger = logging.getLogger(__name__)` at module level
- Destination: `/logs/orchestrator.jsonl` (JSONL telemetry) for structured logs; stdout for debug
- Trade-specific: All trade operations prefixed with `[trade_id]` for correlation
- Approach: Type hints + Pydantic models (in requirements, not fully deployed yet)
- Trade limits: Hardcoded MAX_AUTO_TRADE_USD in TradeOrchestrator (currently $1)
- RPC validation: httpx + solders library type safety
- Configuration validation: JSON schema in `config/orchestrator_config.json`
- Solana keypair: Loaded from environment (`TRADING_WALLET_PRIVATE_KEY`)
- Discord webhooks: Token in environment (`DISCORD_WEBHOOK_URL` implicit in scripts)
- SSH deployment: GitHub Actions secrets (`TRADE_SERVER_SSH_KEY`)
- OpenClaw gateway: Profile-based isolation, no cross-profile access without explicit config
- Orchestrator config: `config/orchestrator_config.json` + CLI args override
- Service deployment: systemd units in `~/.config/systemd/user/`
- Environment: `.env` files (not tracked in git, loaded by systemd)
- RPC endpoints: Hardcoded in code (Solana mainnet default, testnet via `--dry-run`)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
