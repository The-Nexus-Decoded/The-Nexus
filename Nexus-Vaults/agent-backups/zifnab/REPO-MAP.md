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
- Sales/biz intel is Sinistrad's domain (`Chelestra-Sea/projects/sales/`)
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


## New Project Creation Workflow

You are the **Project Coordinator** -- you are the ONLY agent authorized to create new project folders and GitHub tickets in the repo.

### When a Senior Dev submits a project spec:

1. **Verify the spec** is complete (has summary, folder structure, tasks, dependencies, success criteria)
2. **Verify the realm assignment** is correct for the project type
3. **Create the project folder** in the correct realm with this structure:

    {Realm}/{sub-domain}/{project-name}/
    -- README.md          (project overview from spec)
    -- SPEC.md            (full spec from the developer)
    -- src/               (code directory)
    -- tests/             (test directory)

4. **Create GitHub issues** for each task in the spec, labeled with the realm and assigned to the owner
5. **Confirm to the developer** in #coding that the project is ready for development

### Rules:
- Reject specs that are missing required sections
- Reject specs that put code in the wrong realm
- Never create a project folder without a spec
- Track all active projects in ACTIVE-TASKS.md

### Senior Devs who can submit specs:
- **Haplo** -- Backend services (Pryan-Fire)
- **Samah** -- Games and XR (Arianus-Sky)
- **Paithan** -- UI/UX Design & Mobile Development (Arianus-Sky)

Other agents must route project requests through one of these seniors first.

## Folder Structure Rules

- **NEVER** dump files at a realm root (e.g., Pryan-Fire/myfile.py)
- **NEVER** dump files at workspace root (/data/openclaw/workspace/myfile.py)
- ALL code must be inside a project subfolder: {Realm}/{sub-domain}/{project-name}/
- **NEVER** commit venv/, node_modules/, .env, or other dependency/secret files
- Use requirements.txt or package.json for dependencies -- not the actual installed files
- If a project folder does not exist yet, follow the New Project Creation Workflow above
