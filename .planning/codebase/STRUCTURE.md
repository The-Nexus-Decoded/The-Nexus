# Codebase Structure

**Analysis Date:** 2026-04-02

## Directory Layout

```
The-Nexus/
├── .github/
│   ├── workflows/
│   │   ├── phantom-gauntlet.yml           # PR validation (CI)
│   │   ├── deploy-mvp.yml                 # Auto-deploy on merge to main
│   │   ├── deploy-to-trade.yml            # Legacy trade deploy
│   │   └── [other CI workflows]
│   └── ...
├── .planning/
│   └── codebase/                          # Analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
├── Pryan-Fire/                            # Realm: Business Logic
│   ├── haplos-workshop/                   # Haplo's domain (CI/CD, dev tools)
│   ├── zifnabs-scriptorium/               # Zifnab's domain (orchestration, monitoring)
│   ├── hughs-forge/                       # Hugh's domain (trading services)
│   │   ├── services/
│   │   │   ├── trade-orchestrator/        # Main trading orchestrator service
│   │   │   │   ├── src/
│   │   │   │   │   ├── core/              # Event loop, orchestrator, RPC, state machine
│   │   │   │   │   ├── state/             # State manager
│   │   │   │   │   ├── telemetry/         # Logging setup
│   │   │   │   │   ├── main.py            # Entry point
│   │   │   │   │   ├── health_server.py   # Health check HTTP endpoint
│   │   │   │   │   └── TradeOrchestrator.py
│   │   │   │   ├── config/
│   │   │   │   │   └── orchestrator_config.json
│   │   │   │   ├── patryn-trader.service  # systemd service file
│   │   │   │   ├── requirements.txt
│   │   │   │   └── tests/
│   │   │   ├── trade-executor/            # Solana transaction executor
│   │   │   │   ├── src/
│   │   │   │   ├── test_risk_manager.py
│   │   │   │   └── requirements.txt
│   │   │   ├── risk-manager/              # Position limits, risk controls
│   │   │   │   ├── src/
│   │   │   │   │   ├── RiskManager.py
│   │   │   │   │   ├── AuditLogger.py
│   │   │   │   │   └── discord_gate.py
│   │   │   │   └── requirements.txt
│   │   │   └── meteora-trader/            # Meteora AMM integration (Node.js/TypeScript)
│   │   │       ├── src/
│   │   │       │   ├── PositionManager.ts
│   │   │       │   └── pyth-hermes-client/
│   │   │       ├── package.json
│   │   │       └── tsconfig.json
│   │   ├── scripts/
│   │   │   ├── switch_realm.sh            # Testnet/mainnet toggle
│   │   │   ├── gen-wallet.js/.ts          # Keypair generation
│   │   │   ├── position_monitor.py        # Background position tracker
│   │   │   ├── killfeed_discord_poster.py # Kill feed to Discord
│   │   │   ├── automation_engine.py       # Orchestration scripts
│   │   │   ├── position-monitor.service/timer # systemd service files
│   │   │   └── killfeed-discord-poster.service/timer
│   │   ├── config/
│   │   │   ├── mainnet/
│   │   │   │   ├── orchestrator_config.json
│   │   │   │   └── position_monitor_config.json
│   │   │   ├── testnet/
│   │   │   │   └── orchestrator_config.json
│   │   │   └── trading_profiles.json
│   │   ├── main.py                        # Legacy entry point
│   │   └── README.md
│   ├── projects/
│   │   ├── backend/                       # Haplo's backend service projects
│   │   └── trading/                       # Hugh's trading & execution projects
│   ├── src/
│   │   └── xr-spatial-resolver/           # Shared utilities
│   ├── tests/
│   │   └── simulations/
│   ├── README.md
│   └── .gitignore
├── Chelestra-Sea/                         # Realm: Infrastructure & Communication
│   ├── infra/
│   │   └── openclaw-homelab/              # Ansible playbooks for homelab
│   │       ├── playbooks/
│   │       ├── roles/
│   │       │   ├── base/                  # Base system setup
│   │       │   ├── networking/            # Network configuration
│   │       │   ├── notifications/         # Alert systems
│   │       │   ├── nvidia/                # GPU setup
│   │       │   ├── data-drive/            # Storage management
│   │       │   └── kernel-params/         # Kernel tuning
│   │       ├── inventory/
│   │       │   ├── group_vars/
│   │       │   └── host_vars/
│   │       ├── docs/
│   │       └── .planning/
│   ├── workflows/                         # Lobster workflow definitions (archived)
│   │   ├── archive/legacy/                # Legacy workflows (reference only)
│   │   └── README.md
│   ├── scripts/                           # Deployment and automation scripts
│   ├── projects/
│   │   ├── fleet/                         # Zifnab's infrastructure projects
│   │   ├── growth/                        # Rega's marketing/content projects
│   │   └── sales/                         # Sang-drax's sales projects
│   ├── docs/
│   │   └── [integration specs, protocol docs]
│   ├── README.md
│   └── .gitignore
├── Arianus-Sky/                           # Realm: User Interfaces
│   ├── src/
│   │   └── app/
│   │       ├── layout.tsx                 # Root Next.js layout
│   │       ├── page.tsx                   # Landing page
│   │       ├── api/
│   │       │   ├── documents/
│   │       │   └── logs/
│   │       ├── documents/page.tsx
│   │       ├── distortion-indicator/page.tsx
│   │       └── [other pages]
│   ├── public/                            # Static assets
│   │   └── [images, fonts, etc.]
│   ├── intelligence-feeds/                # Python package for Discord feed + stats
│   ├── projects/
│   │   ├── design/                        # Orla's UI/UX design projects
│   │   ├── mobile/                        # Paithan's mobile app projects
│   │   └── games-xr/                      # Samah's VR/XR/game projects
│   │       └── soul-drifter/              # Death Gate Cycle VR game
│   │           ├── src/
│   │           │   ├── spatial/           # XR/spatial components
│   │           │   └── styles/
│   │           └── [game config]
│   ├── data/
│   ├── docs/
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── README.md
│   └── .gitignore
├── Abarrach-Stone/                        # Realm: Data & Storage
│   ├── schemas/
│   │   ├── migrate_trades_schema.py       # Trade database migrations
│   │   └── [JSON schemas, data models]
│   ├── pipelines/                         # ETL and data processing
│   ├── archives/                          # Historical data snapshots
│   ├── projects/
│   │   └── analytics/                     # Data modeling & analytics
│   ├── README.md
│   └── .gitignore
├── Nexus-Vaults/                          # Realm: Memory & Governance
│   ├── memory/                            # Agent decision logs, memory files
│   ├── agent-backups/                     # Daily workspace .md snapshots (10 agents)
│   │   ├── haplo/
│   │   ├── alfred/
│   │   ├── marit/
│   │   ├── paithan/
│   │   ├── orla/
│   │   ├── zifnab/
│   │   ├── rega/
│   │   ├── sangdrax/
│   │   ├── hugh/
│   │   └── samah/
│   ├── new-agent-souls/                   # Agent identity templates
│   ├── agency-agents-raw/                 # Agency agent definitions
│   ├── projects/
│   │   └── qa/                            # Marit's QA projects
│   ├── ARTICLE-AI-AGENT-FLEET-ARCHITECTURE.md
│   ├── FLEET-ORG-CHART.md
│   ├── research-agency-agents.md
│   ├── README.md
│   └── .gitignore
├── agentbaselines/                        # Agent workspace baseline files (control copy)
│   ├── calandra/                          # Baseline workspace structure for each agent
│   └── [other agent baselines when deployed]
├── soul-originals/                        # Original Death Gate Cycle character definitions
├── .claude/                               # Claude-specific workspace (git worktrees, handoffs)
│   ├── handoffs/
│   ├── worktrees/
│   └── [Claude configuration]
├── .gemini/                               # Gemini-specific workspace
├── CLAUDE.md                              # Project-wide instructions for Claude
├── GEMINI.md                              # Project-wide instructions for Gemini
├── README.md                              # Monorepo root overview
└── .gitignore                             # Git ignore rules
```

## Directory Purposes

**Pryan-Fire/:**
- Purpose: Business logic, trading algorithms, backend services, agent tools
- Contains: Python services (orchestrator, risk manager), Node.js integrations (Meteora), bash scripts
- Key files: `hughs-forge/services/trade-orchestrator/src/main.py`, `hughs-forge/services/trade-executor/`
- Deployment: Auto-deploys to ola-claw-trade when merged to main

**Chelestra-Sea/:**
- Purpose: Fleet orchestration, infrastructure automation, cross-server integration
- Contains: Ansible playbooks, shell scripts, Lobster workflows, deployment pipelines
- Key files: `infra/openclaw-homelab/`, `workflows/`, CI/CD scripts
- Deployment: Infrastructure changes applied by Zifnab via Ansible on ola-claw-main

**Arianus-Sky/:**
- Purpose: Web UIs, dashboards, visualizations, game/XR projects
- Contains: Next.js application with TypeScript, Tailwind CSS, game engines
- Key files: `src/app/`, `projects/games-xr/soul-drifter/`, intelligence feeds
- Deployment: Static builds to web server, game projects to respective dev environments

**Abarrach-Stone/:**
- Purpose: Data definitions, schemas, persistence contracts
- Contains: JSON schemas, migration scripts, analytics pipelines
- Key files: `schemas/migrate_trades_schema.py`, schema definitions
- Deployment: No direct deployment; consumed by other realms at runtime

**Nexus-Vaults/:**
- Purpose: Long-term memory, disaster recovery, governance artifacts
- Contains: Daily agent workspace backups (.md files), decision logs, security policies
- Key files: `agent-backups/`, `memory/`, documentation articles
- Deployment: Daily sync from all 3 servers via Tier 2 backup system (Haplo-initiated SSH)

**agentbaselines/:**
- Purpose: Source of truth for agent workspace structure
- Contains: Baseline .md files for each agent (SOUL.md, AGENTS.md, OPERATIONS.md, etc.)
- Generated by: Never manually modified; restore source only
- Used for: Comparing live agent state against baseline to detect drift

**.github/workflows/:**
- Purpose: CI/CD automation
- Contains: PR validation (Phantom Gauntlet), auto-deploy on merge, custom test workflows
- Key files: `phantom-gauntlet.yml`, `deploy-mvp.yml`
- Triggered by: PR events, push to main

## Key File Locations

**Entry Points:**

- `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/main.py` - Trade orchestrator main
- `Arianus-Sky/src/app/page.tsx` - Next.js landing page
- `.github/workflows/phantom-gauntlet.yml` - PR CI pipeline
- `.github/workflows/deploy-mvp.yml` - Deployment pipeline
- `Pryan-Fire/haplos-workshop/signal-intel/main.py` - Signal intelligence tool

**Configuration:**

- `Pryan-Fire/hughs-forge/config/mainnet/orchestrator_config.json` - Mainnet settings
- `Pryan-Fire/hughs-forge/config/testnet/orchestrator_config.json` - Testnet settings
- `Pryan-Fire/hughs-forge/services/trade-orchestrator/patryn-trader.service` - systemd service
- `Arianus-Sky/package.json` - Next.js dependencies
- `Arianus-Sky/tsconfig.json` - TypeScript configuration
- `Chelestra-Sea/infra/openclaw-homelab/inventory/` - Ansible inventory

**Core Logic:**

- `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/orchestrator.py` - State machine
- `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/event_loop.py` - Event processing
- `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/rpc_integration.py` - Solana RPC
- `Pryan-Fire/hughs-forge/services/trade-orchestrator/src/core/state_machine.py` - Trade states
- `Pryan-Fire/hughs-forge/services/risk-manager/src/RiskManager.py` - Risk controls
- `Arianus-Sky/src/app/api/` - Next.js API routes

**Testing:**

- `.github/workflows/phantom-gauntlet.yml` - Defines all smoke tests
- `Pryan-Fire/hughs-forge/services/trade-executor/test_risk_manager.py` - Risk manager tests
- `Pryan-Fire/hughs-forge/services/trade-orchestrator/tests/test_rpc_integration.py` - RPC tests
- `Pryan-Fire/tests/simulations/` - Trade simulation tests

## Naming Conventions

**Files:**

- Services: `{agent}-{service}/` (e.g., `hughs-forge/services/trade-orchestrator/`)
- Scripts: `{verb}_{noun}.py` or `{verb}-{noun}.sh` (e.g., `position_monitor.py`, `switch_realm.sh`)
- Configs: `{service}_config.json` or `{realm}_config.yml` (e.g., `orchestrator_config.json`)
- Tests: `test_{module}.py` or `{module}.test.ts` (e.g., `test_risk_manager.py`)
- Services: `{service}.service` and `{service}.timer` for systemd units

**Directories:**

- Agent domains: lowercase, hyphenated (e.g., `hughs-forge`, `zifnabs-scriptorium`)
- Project domains: lowercase, hyphenated (e.g., `games-xr`, `intelligence-feeds`)
- Code layers: lowercase, plural (e.g., `core/`, `services/`, `schemas/`, `workflows/`)
- Config: `config/` or `{network}/` for testnet/mainnet variants

**Functions & Classes:**

- Python classes: PascalCase (e.g., `TradeOrchestrator`, `RiskManager`, `EventLoop`)
- Python functions: snake_case (e.g., `process_signal`, `validate_trade`)
- TypeScript/JavaScript: camelCase for functions, PascalCase for classes/components
- Database tables: lowercase, plural (e.g., `trades`, `positions`, `accounts`)

## Where to Add New Code

**New Trading Service:**
- Primary code: `Pryan-Fire/hughs-forge/services/{new-service}/src/`
- Config: `Pryan-Fire/hughs-forge/config/{mainnet,testnet}/{new-service}_config.json`
- systemd: `Pryan-Fire/hughs-forge/services/{new-service}/{service-name}.service`
- Tests: `Pryan-Fire/hughs-forge/services/{new-service}/test_*.py`
- Entry: `Pryan-Fire/hughs-forge/services/{new-service}/src/main.py`

**New Backend Tool (Haplo):**
- Primary code: `Pryan-Fire/haplos-workshop/{tool-name}/`
- Scripts: `Pryan-Fire/haplos-workshop/{tool-name}/main.py` or `scripts/`
- Tests: Same directory with `test_` prefix

**New Coordination/Monitoring (Zifnab):**
- Primary code: `Pryan-Fire/zifnabs-scriptorium/{function}/`
- Scripts: `Pryan-Fire/zifnabs-scriptorium/scripts/`
- Monitoring: `Pryan-Fire/zifnabs-scriptorium/monitoring/`

**New Dashboard/Page:**
- Primary code: `Arianus-Sky/src/app/{page-name}/page.tsx`
- API routes: `Arianus-Sky/src/app/api/{route}/route.ts`
- Styles: Co-located in components or `Arianus-Sky/src/app/{page-name}/`
- Shared components: `Arianus-Sky/src/components/` (if created)

**New Schema/Data Model:**
- Definitions: `Abarrach-Stone/schemas/{domain}/`
- Migrations: `Abarrach-Stone/schemas/migrations/`
- Examples: `Abarrach-Stone/schemas/examples/`

**New Project/Planning:**
- Specs: `{Realm}/projects/{domain}/{project-name}/` (e.g., `Pryan-Fire/projects/trading/sniper-queue/`)
- Never place source code in projects/ — only design docs and specs

**New Agent:**
- Workspace template: Copy from `agentbaselines/{closest-match}/` → `agentbaselines/{new-agent}/`
- Note: Never modify agentbaselines directly; it's a control copy. Update server workspace, then sync via Nexus-Vaults.

## Special Directories

**.github/workflows/:**
- Purpose: GitHub Actions pipeline definitions
- Generated: No (manually maintained)
- Committed: Yes (required for CI/CD)
- Key files: `phantom-gauntlet.yml` (PR checks), `deploy-mvp.yml` (auto-deploy)

**agentbaselines/:**
- Purpose: Control copy of agent workspace structure
- Generated: No (manually maintained by owner)
- Committed: Yes
- Important: Do NOT modify in production. This is restore source only.

**node_modules/, venv/, .pytest_cache/:**
- Purpose: Dependency/build artifacts
- Generated: Yes (by package managers and test runners)
- Committed: No (in .gitignore)
- Action: Delete before archival; reinstall with package managers

**trades.db:**
- Purpose: SQLite persistence for trades
- Generated: Yes (by TradeOrchestrator at runtime)
- Committed: No
- Location: `Pryan-Fire/hughs-forge/services/trade-orchestrator/` at runtime

**/data/ paths (on servers):**
- Workspace: `/data/openclaw/workspace/The-Nexus/` (editable)
- Runtime: `/data/repos/The-Nexus/` (deployed code)
- Backups: `/data/backups/openclaw/` (daily local archives)

---

*Structure analysis: 2026-04-02*
