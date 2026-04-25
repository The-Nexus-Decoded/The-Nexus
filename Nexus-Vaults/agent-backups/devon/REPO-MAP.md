# REPO-MAP.md -- Devon

## Monorepo Rule -- The-Nexus Only

All code, issues, and PRs go through The-Nexus monorepo.
Legacy standalone repos are deprecated.
Never create issues, branches, or PRs on standalone repos.

## Nexus Architecture -- Mandatory Organization

Map all work into the correct realm within The-Nexus monorepo:

- Pryan-Fire: business logic, backend services, trading bots, execution
- Arianus-Sky: UIs, dashboards, mobile apps, VR/XR, games, design
- Chelestra-Sea: fleet infra, orchestration, marketing, sales, distribution
- Abarrach-Stone: data models, schemas, storage, analytics
- Nexus-Vaults: governance, QA, memory, security, roadmap

When creating or moving files, place them in the correct realm.
If uncertain, ask before creating a new structure.

## Your Realm Assignments

Primary rapid prototypes:

- Realm: Arianus-Sky
- Typical folder: `Arianus-Sky/projects/prototypes/{project-name}/`

Data pipelines and analytics storage:

- Realm: Abarrach-Stone
- Typical folder: `Abarrach-Stone/projects/analytics/{project-name}/`

Fleet dashboards and operational reporting:

- Realm: Chelestra-Sea or Abarrach-Stone, depending on whether the work is orchestration UI or data model.
- Ask Zifnab when the boundary is unclear.

## Boundary Rules

- Do not create new top-level project folders yourself. Zifnab creates project structure.
- Do not dump files at a realm root.
- Do not dump files at workspace root.
- Do not commit raw exports, credentials, `.env`, `node_modules`, virtualenvs, build artifacts, or logs.
- Prototype code belongs in repo project folders, not in your OpenClaw workspace.
- Large datasets belong on `/data/`, with repo docs pointing to their location.

## New Project Creation Workflow

You can propose prototypes and dashboards, but you do not create tickets yourself.

To start a new project:

1. Write a short project spec.
2. Post it in the correct work channel and tag Zifnab.
3. Zifnab reviews and creates the issue/project structure.
4. Wait for project structure confirmation before writing project files.

### Project Spec Template

```markdown
PROJECT: [Name]
REALM: [Arianus-Sky / Abarrach-Stone / Chelestra-Sea]
OWNER: Devon
COLLABORATORS: [Agents involved]
Hypothesis: [What this prototype/dashboard/pipeline proves]
Data sources: [Tables, APIs, exports, or input paths]
Folder structure: [Proposed path]
Tasks: [Small task list]
Validation: [How we know the prototype or dashboard worked]
Production owner: [Who hardens it if validated]
```

## Storage Protocol

Use `/data/` for large files and raw data.
Before creating large assets or datasets, confirm the target path is on `/data/`.
