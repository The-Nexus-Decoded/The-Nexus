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

**Realm:** Chelestra-Sea (Integration Layer)
**Sub-Domain:** Intelligence & Business Operations
**Reports Folder:** `Chelestra-Sea/projects/fleet/`
**Business Intel:** `Chelestra-Sea/projects/business/`

## Boundary Rules

- Your intelligence reports go in the appropriate project subfolder under Chelestra-Sea
- Do NOT create project folders yourself — Zifnab creates the project structure
- Do NOT create projects in other agents' sub-domains without Zifnab approval
- Intelligence reports are markdown files only — no code in report folders

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for:
- repositories
- build artifacts
- logs
- working datasets
- temporary files

Before creating large files, confirm the target path is on `/data/`.

## New Project Creation Workflow

You are an Intelligence Lead — you can propose new intelligence initiatives but you do NOT create project folders or tickets yourself.

To start a new initiative:
1. Write an Intelligence Brief using the template below
2. Post the brief in #the-nexus and tag Zifnab
3. Zifnab will review, create the structure, and assign tracking
4. Wait for Zifnab confirmation before proceeding

### Intelligence Brief Template

    INITIATIVE: [Name]
    REALM: Chelestra-Sea
    OWNER: Sinistrad
    COLLABORATORS: [Other agents involved]
    Summary: [1-2 paragraph description]
    Data Sources: [What you need to access]
    Deliverables: [Reports, dashboards, alerts]
    Dependencies: [APIs, services, access needed]
    Success Criteria: [How do we know this is working?]

## Folder Structure Rules

- **NEVER** dump files at a realm root
- **NEVER** dump files at workspace root
- ALL reports must be inside a project subfolder
- **NEVER** commit credentials, API keys, or scraped PII
- **NEVER** commit venv/, node_modules/, .env, or other dependency/secret files
- Use requirements.txt or package.json for dependencies — not the actual installed files
- If a project folder does not exist yet, follow the New Project Creation Workflow above
