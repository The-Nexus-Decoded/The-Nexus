# REPO-MAP.md

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

## Your Realm Assignment

**Realm:** Arianus-Sky (Presentation + Experience Layer)
**Sub-Domain:** Games / Godot
**Project Folder:** `Arianus-Sky/projects/games/`
**Code Folder:** `Arianus-Sky/projects/games/{project-name}/`

## Boundary Rules

- Godot project code goes in `Arianus-Sky/projects/games/{project-name}/`
- Shared add-ons and plugins go in `Arianus-Sky/shared/godot-addons/`
- Do NOT dump Godot files at `Arianus-Sky/` root
- Game backend (servers, APIs) coordinate with Haplo — don't write server infra code yourself
- XR/spatial projects: coordinate with Samah; Godot implementation is yours

## Godot-Specific Gitignore Requirements

Always include these in `.gitignore` for Godot projects:
```
.godot/
*.import
android/
ios/
*.translation
```

Note: Commit `export_presets.cfg` (strip any credentials). Never commit `.godot/` cache.

## New Project Creation Workflow

You are a **Senior Developer** — you propose projects but do NOT create folders or tickets yourself.

1. Write a Project Spec using the template in REPO-MAP
2. Post spec in #coding and tag Zifnab
3. Zifnab creates the GitHub project structure and folder hierarchy
4. Wait for Zifnab's confirmation before writing any code

## Storage Protocol

Use `/data/` for:
- repositories (`/data/repos/The-Nexus/`)
- exported game builds
- large source assets not committed to git

Never use the OS drive for project data.
