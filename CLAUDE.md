# The-Nexus Monorepo - Agent Instructions

## Source of Truth (Post-Migration)

**All agent code, workflows, and configuration now reside in the consolidated monorepo:**
`/data/openclaw/workspace/The-Nexus/`

The five realms and their purposes:
- **Pryan-Fire/** — Business logic, agent services, tools (Haplo's code, Zifnab's coordination, Hugh's trading)
- **Chelestra-Sea/** — Infrastructure (Ansible, systemd, deployment, networking, workflows)
- **Arianus-Sky/** — Monitoring (dashboards, alerting, analytics UIs)
- **Abarrach-Stone/** — Data (schemas, models, knowledge base)
- **Nexus-Vaults/** — Workspace Backups (redacted agent configs snapshots)

Legacy standalone repositories are deprecated. Never write to `/data/openclaw/workspace/Pryan-Fire/` directly; use the monorepo path instead.

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

## Build & Test Commands (Updated for Monorepo)

All commands must run from within the specific realm subdirectory.

### General (from The-Nexus root)
```bash
# Run all tests across all realms (if configured)
npm run test --workspaces
# or recursive
npm run test --if-present --recursive
```

### Pryan-Fire (Python services)
```bash
cd /data/openclaw/workspace/The-Nexus/Pryan-Fire
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
cd /data/openclaw/workspace/The-Nexus/Chelestra-Sea
# Workflow linting (if applicable)
npm run lint --if-present
# Shell script validation
find . -name "*.sh" -exec shellcheck {} \;
```

### Arianus-Sky (UI/Dashboards)
```bash
cd /data/openclaw/workspace/The-Nexus/Arianus-Sky
npm run dev        # Start dev server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
```

### Abarrach-Stone (Data/Schemas)
No build step required. Validate schemas:
```bash
cd /data/openclaw/workspace/The-Nexus/Abarrach-Stone
# JSON schema validation (example)
python -m jsonschema -i data/schema.json examples/
```

### Nexus-Vaults (Backup/Sync)
```bash
cd /data/openclaw/workspace/The-Nexus/Nexus-Vaults
# Test redaction script
./scripts/redact-and-sync.sh --dry-run
```

---

## Server Roles

- **Hugh** (`ola-claw-trade`): trader only — runs `patryn-trader.service`
- **Haplo** (`ola-claw-dev`): coder only — runs GitHub Actions runner
- **Zifnab** (`ola-claw-main`): coordinator only — do not deploy code here

---

## Key Paths (Updated for Monorepo)

- **Monorepo root:** `/data/openclaw/workspace/The-Nexus/`
- **Pryan-Fire code:** `/data/openclaw/workspace/The-Nexus/Pryan-Fire/`
  - Haplo tools: `haplos-workshop/`
  - Zifnab tools: `zifnabs-scriptorium/`
  - Hugh trading: `hughs-forge/`
- **Infrastructure:** `/data/openclaw/workspace/The-Nexus/Chelestra-Sea/`
- **Dashboards:** `/data/openclaw/workspace/The-Nexus/Arianus-Sky/`
- **Data schemas:** `/data/openclaw/workspace/The-Nexus/Abarrach-Stone/`
- **Backup snapshots:** `/data/openclaw/workspace/The-Nexus/Nexus-Vaults/`
- **Workflows:** `/data/openclaw/workspace/workflows/` (still outside monorepo for now)

**File edit/write operations:** Use the workspace paths above. For exec/git operations, the same paths apply. The symlink `/data/repos/The-Nexus/` exists for compatibility but edits MUST go through the workspace location.

---

## Lobster Workflows Location

All workflow files remain at:
`/data/openclaw/workspace/workflows/*.lobster`

They reference The-Nexus paths in their arguments.

---

## Migration Status

✅ **The-Nexus Monorepo Migration COMPLETE** (2026-03-04)
- All five realms consolidated under The-Nexus
- Full git history preserved via subtree merges
- Legacy standalone repositories deprecated
- AGENTS.md, MEMORY.md, and this file updated with new paths
- Bridge handoff created at `.claude/handoffs/monorepo-completion.md`
