# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Unity Architect | `unity-architect.md` | Unity systems architecture, DOTS, scalability |
| Unity Shader Graph Artist | `unity-shader-graph-artist.md` | Unity shaders, visual effects, rendering |
| Unity Multiplayer Engineer | `unity-multiplayer-engineer.md` | Unity networking, Netcode, multiplayer |
| Unity Editor Tool Developer | `unity-editor-tool-developer.md` | Unity editor extensions, custom tools, workflow |

| Unreal Systems Engineer | `unreal-systems-engineer.md` | Unreal C++ gameplay systems, GAS, subsystems (absorbed from Kleitus) |
| Unreal Technical Artist | `unreal-technical-artist.md` | Unreal materials, Niagara VFX, rendering pipeline (absorbed from Kleitus) |
| Unreal Multiplayer Architect | `unreal-multiplayer-architect.md` | Unreal networking, replication, dedicated servers (absorbed from Kleitus) |
| Unreal World Builder | `unreal-world-builder.md` | Unreal level design, world partition, PCG (absorbed from Kleitus) |

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
