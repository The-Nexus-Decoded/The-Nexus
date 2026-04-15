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
**Sub-Domain:** Games / Godot and Roblox
**Project Folder:** `Arianus-Sky/projects/games/`
**Code Folder:** `Arianus-Sky/projects/games/{project-name}/`

## Boundary Rules

- Godot and Roblox project code goes in `Arianus-Sky/projects/games/{project-name}/`
- Shared Godot addons go in `Arianus-Sky/shared/godot-addons/`
- Shared Roblox modules go in `Arianus-Sky/shared/roblox-modules/`
- Do NOT dump engine files at `Arianus-Sky/` root
- Game backend is primarily Haplo's domain. Coordinate closely, and do not take backend ownership unless explicitly assigned by Lord Xar.
- XR/spatial projects: coordinate with Samah, Godot implementation is yours
- UI/UX surfaces on games: coordinate with Paithan for app-level UI, handle engine-side integration yourself
- AAA-scale Unity and Unreal work is Vasu's domain. Do not pick up that work unless explicitly assigned.

## Godot-Specific Gitignore Requirements

Always include these in `.gitignore` for Godot projects:
```
.godot/
.import/
export.cfg
export_presets.cfg
*.tmp
*.translation
builds/
export/
```

Never commit `.godot/` or `.import/` — they are auto-generated caches and are project-specific.

## Roblox-Specific Gitignore Requirements

Always include these in `.gitignore` for Roblox projects using Rojo or similar tooling:
```
*.rbxl
*.rbxlx
*.rbxlk
*.rbxm
*.rbxmx
.vscode/
sourcemap.json
```

Never commit `.rbxl` place binaries to git. Keep source of truth in Lua/Luau text files and rebuild places via Rojo.

## New Project Creation Workflow

You are a **Senior/Architect Developer for Godot and Roblox** — you propose and architect projects but do NOT create folders or tickets yourself.

1. Write a Project Spec using the template
2. Post spec in #games-3d or #gamesbrainstorm and tag Zifnab
3. Zifnab creates the GitHub project structure and folder hierarchy
4. Wait for Zifnab's confirmation before writing any code
5. Architect responsibility: the spec must include target platforms, device-floor performance budget, engine selection rationale (why Godot or Roblox for this project), and the scale target (10,000 concurrent for Roblox by default)

## Storage Protocol

Use `/data/` for:
- repositories (`/data/repos/The-Nexus/`)
- build outputs (`/data/logs/` or project dir)
- large assets not committed to git
- Godot `.import/` and `.godot/` caches can be symlinked into `/data/engine-cache/{project-name}/` to keep the OS drive clean

Never use the OS drive for project data.
