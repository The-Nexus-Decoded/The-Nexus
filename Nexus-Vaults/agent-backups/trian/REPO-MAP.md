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
Sub-Domain: Character 3D Production
Project Folder: Arianus-Sky/projects/games/
Asset Docs Folder: Arianus-Sky/projects/games/{project-name}/design/
Asset Pipeline Specs: Arianus-Sky/projects/games/{project-name}/pipeline/
Shared Art Pipeline: /data/openclaw/shared/art-pipeline/character-3d/

## Boundary Rules

- Your handoff notes and validation reports go in the appropriate game project subfolder under Arianus-Sky/projects/games/
- Do NOT create project folders yourself -- Zifnab creates the project structure
- Do NOT create projects in other agents' sub-domains without Zifnab approval
- Design documents and handoff notes are markdown files only -- no 3D assets, textures, or binaries in the repo

## New Project Creation Workflow

You are a character 3D production specialist -- you can propose new projects but you do NOT create project folders or tickets yourself.

To start a new project:
1. Write a Project Spec (see template below)
2. Post the spec in #games-vr and tag Zifnab
3. Zifnab will review, create the GitHub project structure, tickets, and folder hierarchy
4. Wait for Zifnab confirmation before writing any documents in the new project folder

You may NOT create new top-level project folders in the repo. Only Zifnab does that.

### Project Spec Template

    PROJECT: [Name]
    REALM: Arianus-Sky
    OWNER: Trian
    COLLABORATORS: [Lenthan, Jarre, engine agents as needed]
    Summary: [1-2 paragraph description]
    Folder Structure: [e.g., Arianus-Sky/projects/games/my-game/design/]
    Asset Scope: [character list with tiers]
    Poly Budget: [target counts per asset tier]
    Texture Budget: [resolution per tier, map types]
    Engine Targets: [Unity / Unreal / Godot / Roblox / XR]
    Export Formats: [FBX / glTF / specific engine format]
    Dependencies: [Concept packages from Lenthan, skeleton specs, shader specs from Jarre]
    Success Criteria: [How do we know this project is done?]

Do NOT skip the spec. Do NOT create folders first. Spec -> Zifnab -> Folder -> Work.

## Folder Structure Rules

- NEVER dump files at a realm root
- NEVER dump files at workspace root
- ALL handoff notes and validation reports must be inside a project subfolder
- NEVER commit 3D assets, textures, or binary files to the repo
- NEVER commit venv/, node_modules/, .env, or other dependency/secret files

## Storage Protocol

Large files (3D assets, textures, exports) go on the NVMe data volume:
- Shared cross-agent assets: `/data/openclaw/shared/art-pipeline/character-3d/{project}/`
- Source files (blend): `/data/openclaw/shared/art-pipeline/character-3d/{project}/source/`
- Export files (fbx, glb): `/data/openclaw/shared/art-pipeline/character-3d/{project}/exports/`
- Temp work: `/tmp/` (cleared on reboot)

Before staging large assets, confirm the target path is on /data/.
Never commit binary assets to git -- store in /data/ and reference by path.
