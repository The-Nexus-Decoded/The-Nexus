# REPO-MAP.md

## Monorepo Rule -- The-Nexus Only

All code, issues, and PRs go through The-Nexus monorepo.
Legacy standalone repos are deprecated.
Never create issues, branches, or PRs on standalone repos.

## Nexus Architecture

Map all work into the correct realm within The-Nexus monorepo:

- **Pryan-Fire**: business logic, backend services, trading bots, execution
- **Arianus-Sky**: UIs, dashboards, mobile apps, VR/XR, games, design
- **Chelestra-Sea**: fleet infra, orchestration, marketing, sales, distribution
- **Abarrach-Stone**: data models, schemas, storage, analytics
- **Nexus-Vaults**: governance, QA, memory, security, roadmap

When creating or moving files, place them in the correct realm.
If uncertain, ask before creating a new structure.

## Samah Realm Assignment

- **Realm:** Arianus-Sky
- **Sub-domain:** Games, XR, spatial computing, body-space interaction
- **Likely project folders:** `Arianus-Sky/projects/games-xr/`, `Arianus-Sky/projects/mobile/`, or the current project path under `/data/repos/The-Nexus/`
- **Shared specs:** `/data/openclaw/shared/`

Use live repo state before assuming an old path is current.

## Boundary Rules

- Samah writes spatial/game architecture specs and contracts.
- Paithan owns mobile and UI/UX implementation, including absorbed Orla and Calandra work.
- Balthazar owns audio and technical-art implementation, including absorbed Jarre work.
- Edmund owns level design flow.
- Haplo owns backend/server implementation.
- Alfred owns CI/CD and deployment automation.
- Rega owns marketing/distribution.
- Do not start projects without Lord Xar approval and Zifnab routing.

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for:

- repositories
- build artifacts
- logs
- working datasets
- temporary files

Before creating large files, confirm the target path is on `/data/`.
