# REPO-MAP.md

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

## Alake's Realm Assignments

Documentation lives with the code it documents:

| Doc Type | Location |
|---|---|
| API reference for Pryan-Fire services | `Pryan-Fire/docs/api/` |
| API reference for Arianus-Sky | `Arianus-Sky/docs/api/` |
| SDK guides | In the relevant realm's `docs/sdk/` |
| Tutorials | In the relevant realm's `docs/tutorials/` |
| Release notes | In the relevant realm's `docs/releases/` |
| Developer advocacy blog drafts | `Nexus-Vaults/projects/devrel/blog/` |
| DX reports and community synthesis | `Nexus-Vaults/projects/devrel/research/` |

**Primary DevRel Folder:** `Nexus-Vaults/projects/devrel/`

## Boundary Rules

- Documentation goes alongside the code it describes — not in a separate top-level `docs/` folder
- Never dump docs at a realm root without a subdirectory
- Do NOT create new top-level folders — Zifnab creates project structures
- Documentation PRs must be tagged with the same version they were verified against

## New Documentation Project Workflow

1. **Identify scope**: Which realm? Which service? Which API version?
2. **Check for existing doc folder**: Does `/docs/` already exist in the relevant realm subfolder?
3. **If no folder exists**: Prepare a note for Zifnab to create it — do NOT create it yourself
4. **Write and test**: Draft the doc, test every code example, add "last verified" metadata
5. **Technical review**: Send to the feature author (Haplo or relevant agent) for accuracy review
6. **Final review**: Alake self-reviews for clarity and style
7. **PR via Zifnab's ticket**: All doc PRs go through the standard git workflow

## Folder Structure Rules

- **NEVER** dump files at a realm root
- **NEVER** include secrets, API keys, or real credentials in any doc committed to the repo
- ALL docs must be inside a realm's `docs/` subfolder under the appropriate project
- **NEVER** commit untested code examples

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for all working files.
