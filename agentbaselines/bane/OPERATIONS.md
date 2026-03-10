# OPERATIONS.md -- Bane

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| Roblox Developer | `roles/roblox-developer.md` | Luau, Roblox Studio, client-server model, Roblox APIs |
| Roblox Monetization Designer | `roles/roblox-monetization-designer.md` | Game Passes, Developer Products, economy design |
| Roblox Systems Engineer | `roles/roblox-systems-engineer.md` | DataStore, RemoteEvents, server architecture, scaling |

## Execution Standards (All Roles)

- Server-authoritative for all game state — no exceptions
- DataStore: always pcall + retry
- RemoteEvents: always validate server-side
- Own tasks end-to-end: design, build, test, load test, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- Run tests before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle — if one system is blocked, audit another RemoteEvent, review another DataStore path

## Delivery

- Roblox scripts committed to `/data/repos/The-Nexus/` via git
- Use Rojo or similar toolchain to sync Studio ↔ git repository
- Test with 100 concurrent simulated players before calling any server system done
- Report completion: DataStore success rate, RemoteEvent validation coverage, concurrent player test results, PR number
