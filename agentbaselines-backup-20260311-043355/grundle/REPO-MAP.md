# REPO-MAP.md -- Grundle

## Monorepo Rule — The-Nexus Only

All code, issues, and PRs go through The-Nexus monorepo.
Legacy standalone repos are deprecated.
Never create issues, branches, or PRs on standalone repos.

## Nexus Architecture — Mandatory Organization

- **Pryan-Fire**: business logic, backend services, trading bots, execution
- **Arianus-Sky**: UIs, dashboards, mobile apps, VR/XR, games, design
- **Chelestra-Sea**: fleet infra, orchestration, marketing, sales, distribution
- **Abarrach-Stone**: data models, schemas, storage, analytics
- **Nexus-Vaults**: governance, QA, memory, security, roadmap

## Your Realm Assignments

**Data Engineering:**
- **Realm:** Abarrach-Stone (Data Layer)
- **Project Folder:** `Abarrach-Stone/projects/pipelines/`
- **Code Folder:** `Abarrach-Stone/projects/pipelines/{pipeline-name}/`

**Embedded Firmware:**
- **Realm:** Pryan-Fire (Execution Layer) for standalone firmware
- **Realm:** Arianus-Sky for firmware that interfaces directly with games/XR hardware
- **Code Folder:** `Pryan-Fire/projects/firmware/{project-name}/`

## Boundary Rules

- DBT models go in `Abarrach-Stone/projects/pipelines/{pipeline-name}/models/`
- Airflow DAGs go in `Abarrach-Stone/projects/pipelines/{pipeline-name}/dags/`
- Firmware source code goes in `Pryan-Fire/projects/firmware/{project-name}/src/`
- Do NOT commit data files (CSV, JSON datasets) to git — use `/data/` storage
- Do NOT commit firmware binaries — only source code

## Data Pipeline Gitignore Requirements

```
__pycache__/
*.pyc
.venv/
venv/
*.egg-info/
.dbt/
target/          # dbt compiled output
dbt_packages/    # dbt dependencies
logs/
*.log
.env
```

## Firmware Gitignore Requirements

```
.pio/            # PlatformIO build output
.pioenvs/
build/
*.hex
*.elf
*.bin
*.o
*.d
```

## New Project Creation Workflow

You are a **Senior Developer** — you propose projects but do NOT create folders or tickets yourself.

1. Write a Project Spec using the template in REPO-MAP
2. Post spec in #coding and tag Zifnab
3. Zifnab creates the GitHub project structure and folder hierarchy
4. Wait for Zifnab's confirmation before writing any code

## Storage Protocol

Use `/data/` for:
- repositories (`/data/repos/The-Nexus/`)
- raw data files, datasets, exports
- pipeline logs and quality check outputs
- firmware build artifacts

Never use the OS drive for project data.
