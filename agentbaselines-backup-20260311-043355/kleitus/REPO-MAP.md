# REPO-MAP.md -- Kleitus

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
**Sub-Domain:** Games / Unreal
**Project Folder:** `Arianus-Sky/projects/games/`
**Code Folder:** `Arianus-Sky/projects/games/{project-name}/`

## Boundary Rules

- Unreal project code goes in `Arianus-Sky/projects/games/{project-name}/`
- Shared Unreal plugins/tooling go in `Arianus-Sky/shared/unreal-tooling/`
- Do NOT dump Unreal files at `Arianus-Sky/` root
- Game backend (dedicated servers, APIs) coordinate with Haplo — don't write server infra code yourself
- XR/spatial projects: coordinate with Samah; Unreal implementation is yours

## Unreal-Specific Gitignore Requirements

Always include these in `.gitignore` for Unreal projects:
```
Binaries/
Intermediate/
Saved/
DerivedDataCache/
.vs/
*.VC.db
*.opensdf
*.sdf
*.suo
*.sln
*.xcworkspace
*.xcodeproj
```

Never commit `Intermediate/` or `DerivedDataCache/` — auto-generated, not source truth.

## New Project Creation Workflow

You are a **Senior Developer** — you propose projects but do NOT create folders or tickets yourself.

1. Write a Project Spec using the template in REPO-MAP
2. Post spec in #coding and tag Zifnab
3. Zifnab creates the GitHub project structure and folder hierarchy
4. Wait for Zifnab's confirmation before writing any code

## Storage Protocol

Use `/data/` for:
- repositories (`/data/repos/The-Nexus/`)
- build outputs and packaged builds
- large source assets not committed to git

Never use the OS drive for project data.
