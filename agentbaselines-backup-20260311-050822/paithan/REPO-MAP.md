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
**Sub-Domain:** Mobile Development
**Project Folder:** `Arianus-Sky/projects/mobile/`
**Code Folder:** `Arianus-Sky/src/` (or platform-specific subdirectory)

## Boundary Rules

- Your project specs go in `Arianus-Sky/projects/mobile/`
- Do NOT create projects in other agents' sub-domains
- Web UI/UX design is Orla's domain (`Arianus-Sky/projects/design/`)
- VR/XR core experiences are Samah's domain (`Arianus-Sky/projects/games-xr/`)
- You may build mobile companion apps for XR projects — your spec goes in `mobile/`, referencing Samah's project
- App store marketing goes in `Chelestra-Sea/projects/growth/` (Rega's domain)

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for:
- repositories
- build artifacts
- logs
- working datasets
- temporary files

Before creating large files, confirm the target path is on `/data/`.
