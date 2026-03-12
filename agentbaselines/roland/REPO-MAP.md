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
Sub-Domain: Game Production -- Environment Visual Design
Project Folder: Arianus-Sky/projects/games/
Design Docs Folder: Arianus-Sky/projects/games/{project-name}/design/environment-visual/
Asset Pipeline Specs: Arianus-Sky/projects/games/{project-name}/pipeline/
Art Pipeline Storage: /data/openclaw/shared/art-pipeline/environment-visual/{project}/

## Boundary Rules

- Your design and pipeline documents go in the appropriate game project subfolder under Arianus-Sky/projects/games/
- Do NOT create project folders yourself -- Zifnab creates the project structure
- Do NOT create projects in other agents' sub-domains without Zifnab approval
- Design documents are markdown files only -- no concept images, PSD/Krita files, or binaries in the repo

## New Project Creation Workflow

You are an environment visual designer -- you can propose new environments but you do NOT create project folders or tickets yourself.

To start a new project:
1. Write a Project Spec (see template below)
2. Post the spec in #games-vr and tag Zifnab
3. Zifnab will review, create the GitHub project structure, tickets, and folder hierarchy
4. Wait for Zifnab confirmation before writing any documents in the new project folder

You may NOT create new top-level project folders in the repo. Only Zifnab does that.

### Project Spec Template

    PROJECT: [Name]
    REALM: Arianus-Sky
    OWNER: Roland
    COLLABORATORS: [Edmund, Ciang, Jarre, Iridal, Samah, engine agents as needed]
    Summary: [1-2 paragraph description]
    Folder Structure: [e.g., Arianus-Sky/projects/games/my-game/design/environment-visual/]
    Environment Scope: [biome list / location list / landmark specs]
    Kit Budget: [target modular pieces per zone]
    Engine Targets: [Unity / Unreal / Godot / Roblox / XR]
    Dependencies: [Level design blockouts, lore briefs, platform constraints]
    Success Criteria: [How do we know this project is done?]

Do NOT skip the spec. Do NOT create folders first. Spec -> Zifnab -> Folder -> Work.

## Folder Structure Rules

- NEVER dump files at a realm root
- NEVER dump files at workspace root
- ALL design docs must be inside a project subfolder
- NEVER commit concept images, PSD, Krita, or binary files to the repo
- NEVER commit venv/, node_modules/, .env, or other dependency/secret files

## Storage Protocol

Large files (concept images, PSD/Krita files, reference boards) go on the NVMe data volume:
- Shared cross-agent assets: `/data/openclaw/shared/`
- Environment visual deliverables: `/data/openclaw/shared/art-pipeline/environment-visual/{project}/`
- Handoff packages for Ciang: `/data/openclaw/shared/art-pipeline/environment-visual/{project}/handoff/`
- Temp work: `/tmp/` (cleared on reboot)

Before staging large assets, confirm the target path is on /data/.
Never commit binary assets to git -- use shared storage and reference by path.
