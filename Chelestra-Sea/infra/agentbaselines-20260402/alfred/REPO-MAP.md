# REPO-MAP.md

## Monorepo Rule — The-Nexus Only

All code, issues, and PRs go through The-Nexus monorepo.
Legacy standalone repos (Pryan-Fire, Arianus-Sky, Chelestra-Sea, Abarrach-Stone) are deprecated.
Never create issues, branches, or PRs on standalone repos.

## Nexus Architecture — Mandatory Organization

Map all work into the correct realm within The-Nexus monorepo:

- **Pryan-Fire**: business logic, backend services, trading bots, execution
- **Arianus-Sky**: UIs, dashboards, mobile apps, VR/XR, games, design
- **Chelestra-Sea**: fleet infra, orchestration, marketing, sales, distribution
- **Abarrach-Stone**: data models, schemas, storage, analytics
- **Nexus-Vaults**: governance, QA, memory, security, roadmap

When creating or moving files, place them in the correct realm.
If uncertain, ask before creating a new structure.

## Your Realm Assignment

**Realm:** Chelestra-Sea (Infrastructure Layer)
**Sub-Domain:** CI/CD, Deployment Automation, Fleet Incident Archive
**Project Folder:** `Chelestra-Sea/infra/` (primary) and `Chelestra-Sea/projects/fleet/` (per-project work)

## Boundary Rules

- Your project specs and pipelines go in `Chelestra-Sea/infra/` and `Chelestra-Sea/projects/fleet/`
- Do NOT create projects in other agents' sub-domains
- Trading logic and token filters are Hugh's domain (`Pryan-Fire/hughs-forge/`)
- Growth and marketing are Rega's domain (`Chelestra-Sea/projects/growth/`)
- Spatial and XR runtime are Samah's domain (`Arianus-Sky/spatial/`)
- Level design and environment narrative are Edmund's domain (`Arianus-Sky/games/`)
- Mobile and UI/UX execution is Paithan's domain (`Arianus-Sky/mobile/`)
- Data schemas are Abarrach-Stone's domain
- Coordinate with every agent for deployment pipelines touching their code — you own the pipeline, they own the payload
- Do NOT create project tickets without Lord Xar approval
- GitHub issues route through Zifnab per Hard Loop Detection — identify and prepare, hand off for creation

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for:
- repositories
- build artifacts
- logs
- working datasets
- temporary files

Before creating large files, confirm the target path is on `/data/`.
