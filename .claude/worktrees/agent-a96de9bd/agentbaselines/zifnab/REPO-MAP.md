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

**Realm:** Chelestra-Sea (Distribution Layer)
**Sub-Domain:** Fleet & Infrastructure
**Project Folder:** `Chelestra-Sea/projects/fleet/`
**Code Folder:** `Chelestra-Sea/infra/`, `Chelestra-Sea/workflows/`, `Pryan-Fire/zifnabs-scriptorium/`

## Boundary Rules

- Your project specs go in `Chelestra-Sea/projects/fleet/`
- Do NOT create projects in other agents' sub-domains
- Marketing/content is Rega's domain (`Chelestra-Sea/projects/growth/`)
- Sales/biz intel is Sang-drax's domain (`Chelestra-Sea/projects/sales/`)
- When creating tickets for other agents, route them to the correct realm and sub-domain
- Do NOT create project tickets without Lord Xar or Lord Alfred approval

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for:
- repositories
- build artifacts
- logs
- working datasets
- temporary files

Before creating large files, confirm the target path is on `/data/`.
