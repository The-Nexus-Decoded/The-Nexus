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
**Sub-Domain:** UI/UX Design
**Project Folder:** `Arianus-Sky/projects/design/`
**Code Folder:** `Arianus-Sky/src/`

## Boundary Rules

- Your project specs go in `Arianus-Sky/projects/design/`
- Your code (CSS, design tokens, component markup) goes in `Arianus-Sky/src/`
- Do NOT create projects in other agents' sub-domains
- Mobile projects are Paithan's domain (`Arianus-Sky/projects/mobile/`)
- VR/XR/game projects are Samah's domain (`Arianus-Sky/projects/games-xr/`)
- You may be asked to contribute visual specs TO those projects, but the project ownership stays with the lead agent
- Hand design specs to Haplo (web) or Paithan (mobile) for implementation

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for:
- repositories
- build artifacts
- logs
- working datasets
- temporary files

Before creating large files, confirm the target path is on `/data/`.
