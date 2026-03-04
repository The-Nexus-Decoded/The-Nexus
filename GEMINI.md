# GEMINI Context Transfer — The-Nexus Monorepo

This file serves as the system prompt context for Gemini CLI sessions. It describes the complete homelab architecture, repository structure, and operational procedures.

## Monorepo Overview

All agent code now resides in a single repository: **The-Nexus** (github.com/The-Nexus-Decoded/The-Nexus). This monorepo consolidates five specialized realms:

- **Pryan-Fire** (Fire) — Business logic, agent services, trading tools (`/Pryan-Fire/`)
- **Chelestra-Sea** (Sea) — Infrastructure, networking, deployment, integration (`/Chelestra-Sea/`)
- **Arianus-Sky** (Sky) — User interfaces, dashboards, visualizations (`/Arianus-Sky/`)
- **Abarrach-Stone** (Stone) — Data schemas, storage, migrations (`/Abarrach-Stone/`)
- **Nexus-Vaults** (Vaults) — Workspace backups, documentation, workflows (`/Nexus-Vaults/`)

Each realm is a top-level directory within the monorepo. Cross-realm dependencies are allowed but should be documented.

## Workspace Layout

- **Editable workspace** (where you edit files): `/data/openclaw/workspace/The-Nexus/`
- **Deployed on servers** (runtime read-only): `/data/repos/The-Nexus/`
- **Gateway configs**: `~/.openclaw/` (per server)
- **Agent memory**: `memory/` (daily logs) in workspace

## Key Servers (Tailscale)

| Host | IP | Role | Primary Repo Path |
|------|-----|------|-------------------|
| ola-claw-dev | 100.94.203.10 | Haplo (builder) | `/data/openclaw/workspace/The-Nexus/` |
| ola-claw-main | 100.103.189.117 | Zifnab (coordinator) | `/data/repos/The-Nexus/` |
| ola-claw-trade | 100.104.166.53 | Hugh (trader) | `/data/repos/The-Nexus/Pryan-Fire/` |

## GitHub Workflow

1. `git checkout main && git pull origin main` — always start from latest main
2. Create branch: `git checkout -b <realm>/<descriptive-name>`
3. Make changes, add tests, commit (`conventional commits`)
4. Push and open PR against `main`
5. CI runs realm-specific workflows (phantom-gauntlet for Pryan-Fire, etc.)
6. After approval, merge → auto-deploy to target servers

### Important Workflows

- `Deploy Patryn Trader MVP` — Deploys Pryan-Fire trade-orchestrator to ola-claw-trade
- `Deploy Trade Executor to Trade Server` — Deploys executor component
- `Phantom Gauntlet Trial` — Test suite for Pryan-Fire changes

## Project Boards

Each realm has a dedicated GitHub Project (ProjectV2):

- Pryan-Fire: Project #13
- Chelestra-Sea: Project #14
- Arianus-Sky: Project #15
- Abarrach-Stone: Project #16
- Nexus-Vaults: Project #17

All open issues are tagged with `priority:P0-P3`, `type:bug|feature|task|chore`, and `area:fire|sea|sky|stone|vaults`.

## Notable Path Changes (post-migration)

- All agent code is under `/Pryan-Fire/haplos-workshop`, `/Pryan-Fire/zifnabs-scriptorium`, `/Pryan-Fire/hughs-forge/`
- Infrastructure scripts moved to `/Chelestra-Sea/workflows/` and `/Chelestra-Sea/infra/`
- Intelligence feed code now in `/Arianus-Sky/intelligence-feeds/` (previously in Pryan-Fire)
- Database schemas and migrations in `/Abarrach-Stone/schemas/`
- Workspace memory and documentation in `/Nexus-Vaults/memory/`

### Specific Relocations

| Old Path (scattered) | New Path (monorepo) |
|----------------------|---------------------|
| `Pryan-Fire/src/feed/` (when it existed) | `Arianus-Sky/intelligence-feeds/` |
| `Pryan-Fire/trades.db` & `migrate_trades_schema.py` | `Abarrach-Stone/schemas/` |
| `Pryan-Fire/.gemini/memory/*.md` | `Nexus-Vaults/memory/` |
| `openclaw-homelab/` (standalone) | `Chelestra-Sea/infra/openclaw-homelab/` |

## Current Services

- **patryn-trader** — Systemd service on ola-claw-trade; runs from `/data/repos/The-Nexus/Pryan-Fire/hughs-forge/services/trade-orchestrator/`
- **openclaw-gateway** — Each agent's gateway (main, dev, trade)

## Environment Variables

- `TRADING_WALLET_PATH` — Path to wallet JSON (on trade server)
- `SOLANA_RPC_URL` — Solana RPC endpoint
- `JUPITER_API_KEY` — Jupiter API key (in `/data/openclaw/keys/jupiter.env`)
- `GEMINI_API_KEY` — Google Gemini (rotated; currently using free models)

## Important Notes

- Do NOT commit secrets. All keys live in `/data/openclaw/keys/` or vault files.
- All edits must be inside `/data/openclaw/workspace/The-Nexus/`.
- Never push to main without PR and review.
- Service files on remote servers reference `/data/repos/The-Nexus/...`; updates to paths must be reflected there.

## Handoff

If resuming after a break, check:
- `ACTIVE-TASKS.md` for ongoing work
- `memory/YYYY-MM-DD.md` for recent context
- `MEMORY.md` (main session only) for long-term decisions
