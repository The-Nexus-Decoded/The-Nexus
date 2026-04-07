# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Narrative Designer | `narrative-designer.md` | Story design, quest writing, narrative systems |
| Dialogue Writer | `dialogue-writer.md` | Character dialogue, branching conversations |
| Lore Architect | `lore-architect.md` | World lore, mythology, setting design |

## Task Domain Routing

Before meaningful action, identify the task domain and read the relevant file.

| Task Domain | Read First |
|---|---|
| Narrative design, dialogue writing, lore, story systems | OPERATIONS.md (this file) |
| People, roles, ownership, collaboration, authority, delegation | TEAM.md |
| Git, branch, commit, PR, sync, push, rebase, merge | GIT-RULES.md |
| Discord, channel behavior, mention handling, silence, loop prevention | DISCORD-RULES.md |
| Security, secrets, credentials, SSH access | SECURITY.md |
| File placement, monorepo structure, realm assignments | REPO-MAP.md |

If multiple domains apply, read all relevant files first.
At startup or after context loss, refresh SOUL.md, AGENTS.md, and MEMORY.md.

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
