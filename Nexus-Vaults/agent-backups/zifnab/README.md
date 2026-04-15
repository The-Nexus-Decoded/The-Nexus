# The Nexus Decoded — Monorepo Root

> "The center of the realms, where the Ship sails between the worlds."

Welcome to **The-Nexus**, the centralized command and control hub for the OpenClaw Homelab. This repository consolidates the five realms of our infrastructure into a single, high-performance monorepo.

## 🌌 The Five Realms

Each subdirectory in this repository represents a distinct "Realm" with its own domain, purpose, and dedicated AI supervisor.

| Realm | Folder | Domain | Supervisor |
|-------|--------|--------|------------|
| **Pryan-Fire** | `Pryan-Fire/` | Execution, Trading Algos, Forges | Hugh |
| **Chelestra-Sea** | `Chelestra-Sea/` | Networking, Fleet Orchestration, Proxy | Zifnab |
| **Arianus-Sky** | `Arianus-Sky/` | UI, Intelligence Feeds, Dashboards | Haplo |
| **Abarrach-Stone** | `Abarrach-Stone/` | Persistence, Schemas, Historical Logs | Zifnab |
| **Nexus-Vaults** | `Nexus-Vaults/` | Memory, Governance, Security, Roadmap | Lord Xar |

### Realm-to-Team Mapping

Each realm contains a `projects/` folder with sub-domains assigned to specific agents. Agents create project specs within their assigned sub-domain only.

| Realm | Sub-Domain | Folder | Lead Agent |
|-------|-----------|--------|------------|
| **Pryan-Fire** | Backend Services | `projects/backend/` | Haplo |
| **Pryan-Fire** | Trading & Execution | `projects/trading/` | Hugh |
| **Arianus-Sky** | UI/UX Design | `projects/design/` | Orla |
| **Arianus-Sky** | Mobile Development | `projects/mobile/` | Paithan |
| **Arianus-Sky** | Games & XR | `projects/games-xr/` | Samah |
| **Chelestra-Sea** | Fleet & Infrastructure | `projects/fleet/` | Zifnab |
| **Chelestra-Sea** | Growth & Marketing | `projects/growth/` | Rega |
| **Chelestra-Sea** | Sales & Business Intel | `projects/sales/` | Sang-drax |
| **Abarrach-Stone** | Analytics & Data | `projects/analytics/` | (cross-team) |
| **Nexus-Vaults** | Quality Assurance | `projects/qa/` | Marit |

**Rules:** Project specs and plans go in `projects/` folders. Source code stays in realm code directories. Agents must only create projects within their assigned sub-domain.

---

## 🏗️ Architecture & Redistribution

As part of the migration from independent repositories to this monorepo, files have been strategically redistributed to their logical domains:

- **Intelligence Feeds**: Moved from `Pryan-Fire/src/feed/` → `Arianus-Sky/intelligence-feeds/`
- **Database & Schemas**: `trades.db` and migration logic moved to `Abarrach-Stone/schemas/`
- **Fleet Memory**: `.gemini/memory/*.md` moved to `Nexus-Vaults/memory/`
- **CI/CD Pipelines**: Centralized in `.github/workflows/` at the repository root
- **Infrastructure Playbooks**: `openclaw-homelab/` integrated into `Chelestra-Sea/infra/openclaw-homelab/`

---

## 🚀 The Ship (Deployment & CI/CD)

The "Ship" is our automation engine. It moves code from these directories to their live states on our servers:

| Server | Realm | Controlled By |
|--------|-------|---------------|
| `ola-claw-trade` (Hugh) | Pryan-Fire/hughs-forge/ | Deploy workflows + systemd |
| `ola-claw-main` (Zifnab) | Chelestra-Sea/ | Fleet orchestration |
| `ola-claw-dev` (Haplo) | Arianus-Sky/ + CI | Development & testing |

### Deployment Rules

1. **Strict Pathing**: All deployment scripts and systemd units must use absolute paths relative to the monorepo root:
   - ✅ `/data/repos/The-Nexus/Pryan-Fire/...`
   - ❌ `/data/repos/Pryan-Fire/...` (deprecated)
2. **Phantom Gauntlet**: Every PR must pass the CI check in `.github/workflows/phantom-gauntlet.yml` before merging into `main`.
3. **Auto-Deploy**: Merging to `main` triggers automatic deployment to the appropriate target servers via GitHub Actions.

---

## 📚 Project Boards

Each realm has its own GitHub Project (ProjectV2) for issue tracking:

- Pryan-Fire: [Project #13](https://github.com/orgs/The-Nexus-Decoded/projects/13)
- Chelestra-Sea: [Project #14](https://github.com/orgs/The-Nexus-Decoded/projects/14)
- Arianus-Sky: [Project #15](https://github.com/orgs/The-Nexus-Decoded/projects/15)
- Abarrach-Stone: [Project #16](https://github.com/orgs/The-Nexus-Decoded/projects/16)
- Nexus-Vaults: [Project #17](https://github.com/orgs/The-Nexus-Decoded/projects/17)

All issues are tagged with standardized labels:
- `priority:P0`–`P3`
- `type:bug|feature|task|chore`
- `area:fire|sea|sky|stone|vaults`

---

## 🛠️ Development Workflow

1. `git checkout main && git pull origin main`
2. `git checkout -b <realm>/<descriptive-name>`
3. Make changes, add tests, commit using conventional commits
4. Push and open a PR against `main`
5. CI runs realm-specific checks (phantom-gauntlet for Pryan-Fire, etc.)
6. After approval, merge → auto-deploy to target servers

---

## 📁 Key Paths

- **Workspace (editable)**: `/data/openclaw/workspace/The-Nexus/`
- **Deployed runtime**: `/data/repos/The-Nexus/`
- **Gateway configs**: `~/.openclaw/` (per server)
- **Agent memory**: `memory/YYYY-MM-DD.md` (workspace daily logs)

---

## 🤖 Agent Fleet & Workspace Structure

### The Ten Agents

| Agent | Server | Role | Port | Discord Channels |
|-------|--------|------|------|-----------------|
| **Haplo** | ola-claw-dev | Patryn Runemaster / Builder | 18789 | #coding, #the-nexus, #crypto |
| **Alfred** | ola-claw-dev | Sartan Archivist / Code Review | 18810 | #coding, #the-nexus, #crypto |
| **Marit** | ola-claw-dev | QA & Testing Lead | 18811 | #coding, #the-nexus, #design |
| **Paithan** | ola-claw-dev | Mobile & Cross-Platform Dev | 18820 | #coding, #the-nexus, #design, #sales |
| **Orla** | ola-claw-dev | UI/UX Designer | 18830 | #coding, #the-nexus, #design, #sales |
| **Zifnab** | ola-claw-main | Ancient Wizard / Coordinator | 18789 | All channels |
| **Rega** | ola-claw-main | Content & Growth | 18811 | #the-nexus |
| **Sang-drax** | ola-claw-main | Sales & Business Intel | 18812 | #coding, #the-nexus, #crypto |
| **Hugh** | ola-claw-trade | Assassin / Trader | 18789 | #coding, #the-nexus, #crypto |
| **Samah** | ola-claw-trade | XR/Spatial & Game Dev | 18811 | #games-vr |

### Agent Workspace Files

Each agent has a dedicated workspace at `~/.openclaw/workspace-{name}/` containing curated profile files split from a single large profile into focused documents:

| File | Purpose | Unique Per Agent? |
|------|---------|:-:|
| `SOUL.md` | Death Gate Cycle character identity | Yes |
| `AGENTS.md` | Team hierarchy understanding | Yes |
| `TEAM.md` | Full team roster with roles & specialties | Shared template |
| `OPERATIONS.md` | Role-specific domain expertise & responsibilities | **Yes — most important** |
| `DISCORD-RULES.md` | Discord output rules, loop detection | Shared template |
| `GIT-RULES.md` | Branch discipline, PR rules | Shared template |
| `REPO-MAP.md` | Monorepo structure rules | Shared template |
| `SECURITY.md` | Never expose secrets/keys/tokens | Shared template |

### Agent Structure Repository

All workspace file originals are stored in this repo at:

```
agentstructure/
├── haplo/      (9 files — includes REFERENCE-LIBRARY.md)
├── zifnab/     (8 files)
├── hugh/       (8 files)
├── alfred/     (8 files)
├── marit/      (8 files)
├── paithan/    (8 files)
├── orla/       (8 files)
├── rega/       (8 files)
├── sangdrax/   (8 files)
└── samah/      (8 files)
```

**80 files total.** This is the source of truth for all agent workspace deployments. To restore an agent's workspace, copy from `agentstructure/{name}/` to the server.

### LLM Backend

| Server | Backend | Model | Speed |
|--------|---------|-------|-------|
| ola-claw-main (Zifnab) | vLLM v0.16.1 | Qwen3.5-9B-AWQ | ~19 tok/s |
| ola-claw-dev (Haplo) | Ollama | Qwen3.5-9B-GGUF (Q4_K_M) | ~24 tok/s |
| ola-claw-trade (Hugh) | Ollama | qwen3.5:4b GGUF | ~30 tok/s |

---

## 👥 Supervision

- **Lord Xar** — Owner, final authority
- **Zifnab** — Coordinator (ola-claw-main, #jarvis)
- **Haplo** — Builder (ola-claw-dev, #coding)
- **Hugh** — Trader (ola-claw-trade, #trading)

---

*Last updated: 2026-03-09 — Multi-agent fleet deployed, workspace structure documented.*
