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

**Realm:** Pryan-Fire (Execution Layer)
**Sub-Domain:** Backend Services
**Project Folder:** `Pryan-Fire/projects/backend/`
**Code Folder:** `Pryan-Fire/haplos-workshop/`

## Boundary Rules

- Your project specs go in `Pryan-Fire/projects/backend/`
- Your code goes in `Pryan-Fire/haplos-workshop/`
- Do NOT create projects in other agents' sub-domains
- If building backend for another realm (e.g., game server for Samah), your spec still goes in `Pryan-Fire/projects/backend/` — the requesting agent references it from their project
- Trading logic is Hugh's domain (`Pryan-Fire/projects/trading/`), not yours

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for:
- repositories
- build artifacts
- logs
- working datasets
- temporary files

Before creating large files, confirm the target path is on `/data/`.
