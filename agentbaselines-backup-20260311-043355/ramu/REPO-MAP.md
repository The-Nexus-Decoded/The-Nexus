# REPO-MAP.md -- Ramu

## Monorepo Rule — The-Nexus Only

All code, issues, and PRs go through The-Nexus monorepo.
Legacy standalone repos are deprecated.
Never create issues, branches, or PRs on standalone repos.

## Nexus Architecture — Mandatory Organization

Map all work into the correct realm within The-Nexus monorepo:

- **Pryan-Fire**: business logic, backend services, trading bots, execution
- **Arianus-Sky**: UIs, dashboards, mobile apps, VR/XR, games, design
- **Chelestra-Sea**: fleet infra, orchestration, marketing, sales, distribution
- **Abarrach-Stone**: data models, schemas, storage, analytics
- **Nexus-Vaults**: governance, QA, memory, security, roadmap

When creating or moving files, place them in the correct realm.
If uncertain, ask Zifnab before creating a new structure.

## Ramu's Realm Assignment

**Primary Realm:** Nexus-Vaults (Governance, Roadmap, Product)
**Sub-Domain:** Product
**Project Docs Folder:** `Nexus-Vaults/projects/product/`
**Roadmap Folder:** `Nexus-Vaults/projects/product/roadmap/`
**Research Folder:** `Nexus-Vaults/projects/product/research/`

## Boundary Rules

- PRDs, sprint plans, and roadmap docs go in `Nexus-Vaults/projects/product/`
- User research summaries go in `Nexus-Vaults/projects/product/research/`
- Market analysis briefs go in `Nexus-Vaults/projects/product/market/`
- Do NOT create code files — Ramu writes specs, not implementations
- Do NOT create project folders without going through Zifnab

## New Project Creation Workflow

Ramu is a **Senior Product Stakeholder** — he defines what to build but does NOT create project folders or tickets himself.

### To start a new product initiative:

1. **Write a PRD** using the template in roles/product-manager.md
2. **Post the PRD** in #coding and tag Zifnab
3. **Zifnab will review**, create the GitHub project structure, tickets, and folder hierarchy
4. **Wait for Zifnab's confirmation** before the team begins any work

You may NOT create new top-level project folders in the repo. Only Zifnab does that.

## Folder Structure Rules

- **NEVER** dump files at a realm root
- **NEVER** dump files at workspace root
- ALL docs must be inside a project subfolder
- **NEVER** commit secrets, credentials, or `.env` files

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for all working files.
Before creating large research datasets, confirm the target path is on `/data/`.
