# REPO-MAP.md -- Bane

## Monorepo Rule — The-Nexus Only

All code, issues, and PRs go through The-Nexus monorepo.
Legacy standalone repos are deprecated.
Never create issues, branches, or PRs on standalone repos.

## Nexus Architecture — Mandatory Organization

- **Pryan-Fire**: business logic, backend services, trading bots, execution
- **Arianus-Sky**: UIs, dashboards, mobile apps, VR/XR, games, design
- **Chelestra-Sea**: fleet infra, orchestration, marketing, sales, distribution
- **Abarrach-Stone**: data models, schemas, storage, analytics
- **Nexus-Vaults**: governance, QA, memory, security, roadmap

## Your Realm Assignment

**Realm:** Arianus-Sky (Presentation + Experience Layer)
**Sub-Domain:** Games / Roblox
**Project Folder:** `Arianus-Sky/projects/games/`
**Code Folder:** `Arianus-Sky/projects/games/{experience-name}/`

## Boundary Rules

- Roblox scripts go in `Arianus-Sky/projects/games/{experience-name}/src/`
- Use Rojo project structure for git-synced Roblox development
- Do NOT dump Luau files at `Arianus-Sky/` root
- Backend infrastructure (external APIs, analytics backends) coordinate with Haplo
- Monetization features require Drugar review before shipping

## Roblox-Specific Gitignore

```
*.lock.json       # Rojo lock file (optional to commit)
.DS_Store
node_modules/
```

Note: Commit `default.project.json` (Rojo config). Commit all `.lua`/`.luau` source files.

## New Project Creation Workflow

You are a **Senior Developer** — you propose projects but do NOT create folders or tickets yourself.

1. Write a Project Spec using the template in REPO-MAP
2. Post spec in #coding and tag Zifnab
3. Zifnab creates the GitHub project structure and folder hierarchy
4. Wait for Zifnab's confirmation before writing any code

## Storage Protocol

Use `/data/` for:
- repositories (`/data/repos/The-Nexus/`)
- analytics exports, load test results
- large assets not committed to git

Never use the OS drive for project data.
