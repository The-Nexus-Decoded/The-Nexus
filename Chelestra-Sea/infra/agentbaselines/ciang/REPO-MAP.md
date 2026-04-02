# REPO-MAP.md

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

## Your Realm Assignment

Realm: Arianus-Sky (Experience Layer)
Sub-Domain: Environment 3D Production
Project Folder: Arianus-Sky/projects/games/
Asset Docs Folder: Arianus-Sky/projects/games/{project-name}/design/environment-3d/
Asset Pipeline Specs: Arianus-Sky/projects/games/{project-name}/pipeline/
Kit Documentation: Arianus-Sky/projects/games/{project-name}/design/environment-3d/kits/

## Art Pipeline Shared Storage

| What | Path |
|---|---|
| Environment 3D exports | `/data/openclaw/shared/art-pipeline/environment-3d/{project}/` |
| Kit packages | `/data/openclaw/shared/art-pipeline/environment-3d/{project}/kits/` |
| Hero asset exports | `/data/openclaw/shared/art-pipeline/environment-3d/{project}/heroes/` |
| Prop exports | `/data/openclaw/shared/art-pipeline/environment-3d/{project}/props/` |
| Terrain data | `/data/openclaw/shared/art-pipeline/environment-3d/{project}/terrain/` |
| Texture exports | `/data/openclaw/shared/art-pipeline/environment-3d/{project}/textures/` |
| Validation reports | `/data/openclaw/shared/art-pipeline/environment-3d/{project}/validation/` |

## Boundary Rules

- Your design and pipeline documents go in the appropriate game project subfolder under Arianus-Sky/projects/games/
- Do NOT create project folders yourself -- Zifnab creates the project structure
- Do NOT create projects in other agents' sub-domains without Zifnab approval
- Design documents are markdown files only -- no 3D assets, textures, or binaries in the repo

## New Project Creation Workflow

You are an environment 3D production specialist -- you can propose new projects but you do NOT create project folders or tickets yourself.

To start a new project:
1. Write a Project Spec (see template below)
2. Post the spec in #games-vr and tag Zifnab
3. Zifnab will review, create the GitHub project structure, tickets, and folder hierarchy
4. Wait for Zifnab confirmation before writing any documents in the new project folder

You may NOT create new top-level project folders in the repo. Only Zifnab does that.

### Project Spec Template

    PROJECT: [Name]
    REALM: Arianus-Sky
    OWNER: Ciang
    COLLABORATORS: [Roland (concept), Edmund (blockout), Jarre (tech art), Samah (XR), engine agents as needed]
    Summary: [1-2 paragraph description]
    Folder Structure: [e.g., Arianus-Sky/projects/games/my-game/design/environment-3d/]
    Environment Scope: [kit list, hero asset list, prop families, terrain specs]
    Poly Budget: [target counts per asset type]
    Kit Grid: [snap grid unit, e.g., 2m]
    Engine Targets: [Unity / Unreal / Godot / Roblox / XR]
    Dependencies: [Roland concept packages, Edmund blockouts, other projects]
    Success Criteria: [How do we know this project is done?]

Do NOT skip the spec. Do NOT create folders first. Spec -> Zifnab -> Folder -> Work.

## Folder Structure Rules

- NEVER dump files at a realm root
- NEVER dump files at workspace root
- ALL design docs must be inside a project subfolder
- NEVER commit 3D assets, textures, or binary files to the repo
- NEVER commit venv/, node_modules/, .env, or other dependency/secret files

## Storage Protocol

Large files (3D assets, textures, heightmaps) go on the NVMe data volume:
- Shared cross-agent assets: `/data/openclaw/shared/art-pipeline/environment-3d/`
- Project-specific assets: `/data/repos/The-Nexus/Arianus-Sky/projects/games/{project}/assets/`
- Temp work: `/tmp/` (cleared on reboot)

Before staging large assets, confirm the target path is on /data/.
Never commit binary assets to git -- use git-lfs or store in /data/ and reference by path.
