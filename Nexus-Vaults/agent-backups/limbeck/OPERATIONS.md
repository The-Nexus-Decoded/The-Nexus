# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Godot Gameplay Scripter | `godot-gameplay-scripter.md` | GDScript, game mechanics, player systems |
| Godot Multiplayer Engineer | `godot-multiplayer-engineer.md` | Godot networking, multiplayer, sync |
| Godot Shader Developer | `godot-shader-developer.md` | Godot shaders, visual effects, rendering |

| Roblox Experience Designer | `roblox-experience-designer.md` | Roblox world design, game systems, player experience (absorbed from Bane) |
| Roblox Avatar Creator | `roblox-avatar-creator.md` | Roblox avatar systems, customization, UGC items (absorbed from Bane) |
| Roblox Systems Scripter | `roblox-systems-scripter.md` | Roblox Luau scripting, game systems, multiplayer logic (absorbed from Bane) |

## Execution Standards (All Roles)

- Own tasks end-to-end: plan, build, test, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- Run tests before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle — if one task is blocked, switch to another

## Delivery

- Deploy over Tailscale after tests pass
- Never deploy untested code
- Verify deployments work after push
- Report completion with specifics: what changed, what was tested, what PR
