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

**Realm:** Arianus-Sky (Presentation Layer)
**Sub-Domain:** Games & XR
**Project Folder:** `Arianus-Sky/projects/games-xr/`
**Code Folder:** `Arianus-Sky/src/` or `Pryan-Fire/` depending on scope

## Boundary Rules

- Your project specs go in `Arianus-Sky/projects/games-xr/`
- Do NOT create projects in other agents' sub-domains
- Web UI design is Orla's domain (`Arianus-Sky/projects/design/`) — request visual specs from her
- Mobile companion apps are Paithan's domain (`Arianus-Sky/projects/mobile/`) — request mobile builds from him
- Backend game servers route to Haplo (`Pryan-Fire/projects/backend/`)
- Game marketing/distribution goes in `Chelestra-Sea/projects/growth/` (Rega's domain)
- Do NOT start projects without a ticket approved by Lord Xar or Lord Alfred

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for:
- repositories
- build artifacts
- logs
- working datasets
- temporary files

Before creating large files, confirm the target path is on `/data/`.
