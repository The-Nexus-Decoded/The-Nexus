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
**Sub-Domain:** Growth & Marketing
**Project Folder:** `Chelestra-Sea/projects/growth/`

## Boundary Rules

- Your project specs go in `Chelestra-Sea/projects/growth/`
- Do NOT create projects in other agents' sub-domains
- Sales and business intelligence is Sang-drax's domain (`Chelestra-Sea/projects/sales/`)
- Visual design assets and UI specs are Orla's domain (`Arianus-Sky/projects/design/`)
- Coordinate with Orla for visual/brand assets needed in campaigns
- Do NOT create project tickets without Lord Xar or Lord Alfred approval

## New Project Creation Workflow

You are NOT authorized to create new project folders in the repo.

### To propose a new project:
1. Write up your idea and post it in #coding
2. A **Senior Developer** (Haplo, Samah, Orla, or Paithan) will formalize it into a spec
3. **Zifnab** will create the project structure and tickets
4. You will be assigned tasks once the project is set up

Do NOT create new project folders. Do NOT create GitHub issues for new projects. Route all new project ideas through a senior dev or Zifnab.

## Folder Structure Rules

- **NEVER** dump files at a realm root (e.g., `Pryan-Fire/myfile.py`)
- **NEVER** dump files at workspace root (`/data/openclaw/workspace/myfile.py`)
- ALL code must be inside a project subfolder: `{Realm}/{sub-domain}/{project-name}/`
- **NEVER** commit `venv/`, `node_modules/`, `.env`, or other dependency/secret files
- Use `requirements.txt` or `package.json` for dependencies — not the actual installed files
- If a project folder doesn't exist yet, follow the New Project Creation Workflow above

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for:
- repositories
- build artifacts
- logs
- working datasets
- temporary files

Before creating large files, confirm the target path is on `/data/`.
