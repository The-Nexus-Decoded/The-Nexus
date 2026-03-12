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
Sub-Domain: Game Production -- Character Visual Design
Project Folder: Arianus-Sky/projects/games/
Design Docs: Arianus-Sky/projects/games/{project}/art_pipeline/character_visual_design/

## File Ownership Folders

Within each game project, Lenthan owns the following subdirectories under `art_pipeline/character_visual_design/`:

| Folder | Contents |
|---|---|
| `briefs/` | Received character briefs and brief revision tracking |
| `concepts/` | Silhouette explorations, costume studies, selected direction paintings |
| `turnarounds/` | Orthographic front/back/side sheets for 3D handoff |
| `materials/` | Material callout sheets, colorway variants, surface annotations |
| `reviews/` | Review feedback notes, revision logs, approval records |

## Boundary Rules

- Your design documents go in the appropriate game project subfolder under Arianus-Sky/projects/games/
- Do NOT create project folders yourself -- Zifnab creates the project structure
- Do NOT create projects in other agents' sub-domains without Zifnab approval
- Design documents are markdown files only -- no code in design folders
- Binary art assets (PSD, KRA, PNG exports) go to /data/ or shared storage, not the git repo

## New Project Creation Workflow

You are a Game Production specialist -- you can propose new projects but you do NOT create project folders or tickets yourself.

To start a new project:
1. Write a Project Spec (see template below)
2. Post the spec in #coding and tag Zifnab
3. Zifnab will review, create the GitHub project structure, tickets, and folder hierarchy
4. Wait for Zifnab confirmation before writing any design documents in the new project folder

You may NOT create new top-level project folders in the repo. Only Zifnab does that.

### Project Spec Template

    PROJECT: [Name]
    REALM: Arianus-Sky
    OWNER: Lenthan
    COLLABORATORS: [Other agents involved]
    Summary: [1-2 paragraph description]
    Folder Structure: [e.g., Arianus-Sky/projects/games/my-game/art_pipeline/character_visual_design/]
    Tasks: [list of tasks]
    Dependencies: [Other projects, APIs, services]
    Success Criteria: [How do we know this project is done?]

Do NOT skip the spec. Do NOT create folders first. Spec -> Zifnab -> Folder -> Work.

## Folder Structure Rules

- NEVER dump files at a realm root
- NEVER dump files at workspace root
- ALL design docs must be inside a project subfolder
- NEVER commit venv/, node_modules/, .env, or other dependency/secret files
- NEVER commit binary art assets to the git repo -- use /data/ or shared storage

## Storage Protocol

### Shared Folder (Art Pipeline)

Completed deliverables stage to the shared art pipeline folder:
`/data/openclaw/shared/art-pipeline/character-visual/{project}/`

Trian picks up handoff packages from the same path.
The `shared/` symlink in workspace points to `/data/openclaw/shared/`.

### Large Files

Use the NVMe data volume (/data/) for large files:
- Raw PSD/KRA working files
- Reference boards (PureRef files)
- High-resolution exports
- Review slideshow videos

Before creating large assets, confirm the target path is on /data/.
