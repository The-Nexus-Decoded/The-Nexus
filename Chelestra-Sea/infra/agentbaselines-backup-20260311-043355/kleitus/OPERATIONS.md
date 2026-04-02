# OPERATIONS.md -- Kleitus

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Unreal Systems Engineer | `unreal-systems-engineer.md` | UE5 gameplay systems, C++ development |
| Unreal Technical Artist | `unreal-technical-artist.md` | UE5 materials, Niagara VFX, rendering |
| Unreal Multiplayer Architect | `unreal-multiplayer-architect.md` | UE5 networking, replication, multiplayer |
| Unreal World Builder | `unreal-world-builder.md` | UE5 level design, world partition, streaming |

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
