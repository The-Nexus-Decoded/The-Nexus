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

## 👥 Supervision

- **Lord Xar** — Owner, final authority
- **Zifnab** — Coordinator (ola-claw-main, #jarvis)
- **Haplo** — Builder (ola-claw-dev, #coding)
- **Hugh** — Trader (ola-claw-trade, #trading)

---

*Last updated: 2026-03-04 — Migration complete, librarian phase aligning final structure.*
