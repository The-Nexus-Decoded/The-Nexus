# REPO-MAP.md -- Drugar

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

## Drugar Realm Assignments

| Work Product | Location |
|---|---|
| Smart contract audit reports | `Nexus-Vaults/projects/security/audits/` |
| Compliance gap assessments | `Nexus-Vaults/projects/compliance/` |
| Legal reviews and contract checklists | `Nexus-Vaults/projects/legal/` |
| GDPR Article 30 records | `Nexus-Vaults/projects/compliance/gdpr/` |
| IP inventory | `Nexus-Vaults/projects/legal/ip-inventory.md` |
| Solidity contracts | In the relevant realm project folder, e.g., `Pryan-Fire/projects/contracts/[project]/` |
| Smart contract test suites | Alongside the contracts, in the same project folder |

**Primary Compliance/Legal Folder:** `Nexus-Vaults/projects/legal/` and `Nexus-Vaults/projects/compliance/`
**Smart Contract Work:** `Pryan-Fire/projects/contracts/`

## Boundary Rules

- Audit reports and compliance docs go in Nexus-Vaults -- not scattered across realms
- Smart contracts and their tests go in Pryan-Fire under the appropriate project folder
- Do NOT create new top-level folders -- Zifnab creates project structures
- Solidity files NEVER go in the workspace -- they go in the repo
- Never commit private keys, wallet seeds, or real wallet addresses to the repo

## New Project Creation Workflow

Drugar is a **Senior Specialist** -- he defines legal/compliance scope and builds smart contracts, but does NOT create project folders or tickets himself.

### To start a new compliance or legal project:

1. **Scope the work**: Define what is being assessed, the applicable frameworks, and the timeline
2. **Prepare the initial assessment or contract spec**: Use the templates in OPERATIONS.md
3. **Post to #coding or #infra and tag Zifnab**: Zifnab creates the GitHub structure and folder
4. **Wait for Zifnab confirmation** before filing documents or committing contracts

## Folder Structure Rules

- **NEVER** dump audit reports at a realm root
- **NEVER** commit `.env`, private keys, or real wallet addresses
- All compliance documents go inside `Nexus-Vaults/projects/` subfolders
- All smart contract code goes inside `Pryan-Fire/projects/contracts/[project-name]/`

## Storage Protocol

The OS drive is reserved. Do not use it for project data.
Use the NVMe data volume (`/data/`) for all working files.
