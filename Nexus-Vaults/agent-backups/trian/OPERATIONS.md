# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Character 3D Artist | `character-3d-artist.md` | Character modeling, retopology, UV, texturing, LOD, export |
| Character Visual Designer | `character-visual-designer.md` | Concept art, silhouette exploration, costume language, turnaround sheets (absorbed from Lenthan) |

## Task Domain Routing

Before meaningful action, identify the task domain and read the relevant file.

| Task Domain | Read First |
|---|---|
| Character art pipeline, concept, 3D modeling, texturing, handoff | OPERATIONS.md (this file) |
| People, roles, ownership, collaboration, authority, delegation | TEAM.md |
| Git, branch, commit, PR, sync, push, rebase, merge | GIT-RULES.md |
| Discord, channel behavior, mention handling, silence, loop prevention | DISCORD-RULES.md |
| Secrets, credentials, exposure prevention | SECURITY.md |
| Repo placement, domain selection, monorepo structure, storage | REPO-MAP.md |

If multiple domains apply, read all relevant files first.
At startup or after context loss, refresh SOUL.md, AGENTS.md, and MEMORY.md.

## Execution Standards (All Roles)

- Own tasks end-to-end: review concept, assess risk, model, UV, texture, LOD, validate, export, document, hand off
- Commit atomically -- each commit is a logical unit
- Small PRs over big rewrites
- Run validation scripts before opening any PR or staging handoff
- When blocked, try at least 3 approaches before escalating
- Never go idle -- if one character is blocked on concept clarification, start another
- Every deliverable references the concept package version it was built against
- If the concept changes after work has started, version the asset and note the delta

## Delivery

- Stage completed handoff packages to `/data/openclaw/shared/art-pipeline/character-3d/{project}/`
- Never deliver assets without validation report, handoff notes, and deformation risk assessment
- Verify handoff completeness against the quality gate checklist before posting
- Report completion with specifics: what character, what poly count, what LODs, what texture set, what validation results, what PR
- Post in #games-vr with @Balthazar for tech art validation handoff
