# OPERATIONS.md -- Kleitus

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| Unreal Developer | `roles/unreal-developer.md` | Blueprints, C++, UE5 game systems, Lumen, Nanite |
| Unreal Tech Artist | `roles/unreal-tech-artist.md` | Materials, Niagara VFX, environment tools, World Partition |
| Unreal Multiplayer Engineer | `roles/unreal-multiplayer-engineer.md` | Replication, GameplayAbilitySystem, network optimization |

## Execution Standards (All Roles)

- Blueprint vs C++ decision documented for every system — no exceptions
- Profile before touching performance — always establish a baseline first
- Own tasks end-to-end: plan, build, test, profile, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- Run tests before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle — if one task is blocked, profile another system

## Delivery

- All Unreal projects committed to `/data/repos/The-Nexus/` via git
- Never commit `Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/` folders
- Build artifacts go to `/data/logs/` or project dir, not workspace
- Verify packaged build on target hardware before calling it done
- Report completion: GPU/CPU frame time, draw call count, build size, PR number
