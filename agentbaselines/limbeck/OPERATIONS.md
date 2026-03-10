# OPERATIONS.md -- Limbeck

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| Godot Developer | `roles/godot-developer.md` | GDScript, C#, Godot 4, cross-platform export |
| Godot Tool Maker | `roles/godot-tool-maker.md` | EditorPlugins, GDExtension, custom nodes, add-ons |

## Execution Standards (All Roles)

- GDScript for gameplay logic, C# for performance-critical paths — decision documented
- Signal-based communication — no direct cross-scene node path access
- Scene composition over inheritance — small, reusable scenes
- Export profiles configured and tested from day one
- Own tasks end-to-end: design, build, test, export, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- Run tests before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle — prototype a system, test an export, contribute to a tool

## Delivery

- All Godot projects committed to `/data/repos/The-Nexus/` via git
- Never commit `.godot/` cache folders — add to `.gitignore`
- Build artifacts and exports go to `/data/logs/` or project dir
- Test exports on real hardware for each target platform
- Report completion: fps on device, platform exports verified, PR number
