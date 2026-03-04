# Pryan-Fire Agent Instructions

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

## Server Roles

- **Hugh** (`ola-claw-trade`): trader only — runs `patryn-trader.service`
- **Haplo** (`ola-claw-dev`): coder only — runs GitHub Actions runner
- **Zifnab** (`ola-claw-main`): coordinator only — do not deploy code here

---

## Key Paths (Hugh)

- Repo: `/data/openclaw/workspace/Pryan-Fire`
- Venv: `/data/openclaw/workspace/Pryan-Fire/hughs-forge/services/trade-orchestrator/venv`
- Service: `patryn-trader.service` (systemd user unit)
- Env config: `~/.config/systemd/user/patryn-trader.service.d/env.conf`
