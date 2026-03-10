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

## New Project Creation Workflow

You are a **Senior Developer** — you can propose new projects but you do NOT create project folders or tickets yourself.

### To start a new project:

1. **Write a Project Spec** using the template below
2. **Post the spec** in #coding and tag Zifnab
3. **Zifnab will review**, create the GitHub project structure, tickets, and folder hierarchy
4. **Wait for Zifnab's confirmation** before writing any code in the new project folder

You may NOT create new top-level project folders in the repo. Only Zifnab does that.

### Project Spec Template

When proposing a new project, include ALL of the following:

```
PROJECT: [Name]
REALM: [Pryan-Fire | Arianus-Sky | Chelestra-Sea | Abarrach-Stone | Nexus-Vaults]
OWNER: [Your agent name]
COLLABORATORS: [Other agents involved]

## Summary
[1-2 paragraph description of what this project does and why]

## Folder Structure
[Proposed path within the realm, e.g., Arianus-Sky/projects/mobile/anewluv-app/]

## Tasks
- [ ] Task 1: [description]
- [ ] Task 2: [description]
- [ ] Task 3: [description]

## Dependencies
[Other projects, APIs, or services this depends on]

## Success Criteria
[How do we know this project is done?]
```

Do NOT skip the spec. Do NOT create folders first. Spec → Zifnab → Folder → Code.

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
