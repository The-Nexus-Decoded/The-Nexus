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

**Realm:** Nexus-Vaults (Governance Layer)
**Sub-Domain:** Quality Assurance
**Project Folder:** `Nexus-Vaults/projects/qa/`

## Boundary Rules

- Your test plans, audit specs, and quality frameworks go in `Nexus-Vaults/projects/qa/`
- QA is cross-cutting — you test work from ALL realms, but your specs live in Nexus-Vaults
- Test code/scripts go in the realm being tested (e.g., `Pryan-Fire/tests/`)
- Do NOT create feature projects — you verify and gate them, not build them
- Nothing ships without your QA sign-off
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
