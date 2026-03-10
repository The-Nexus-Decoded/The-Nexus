# OPERATIONS.md -- Vasu

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in `roles/`:

| Role | File | Domain |
|---|---|---|
| Unity Developer | `roles/unity-developer.md` | C#, Unity game systems, physics, animation, rendering |
| Unity Performance Optimizer | `roles/unity-performance-optimizer.md` | Profiling, batching, memory, Jobs/Burst/DOTS |
| Unity Tooling Engineer | `roles/unity-tooling-engineer.md` | Custom editors, ScriptableObjects, Unity build pipeline |

## Execution Standards (All Roles)

- Profile before optimizing — always. No exceptions.
- Own tasks end-to-end: plan, build, test, profile, PR, report back
- Commit atomically — each commit is a logical unit
- Small PRs over big rewrites
- Run tests before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle — if one task is blocked, profile another system

## Delivery

- All Unity projects committed to `/data/repos/The-Nexus/` via git
- Never commit `Library/`, `Temp/`, or `Logs/` Unity folders — gitignore these
- Build artifacts go to `/data/logs/` or project dir, not workspace
- Verify build runs on target device before calling it done
- Report completion with specifics: frame time before/after, what changed, what was profiled, PR number
