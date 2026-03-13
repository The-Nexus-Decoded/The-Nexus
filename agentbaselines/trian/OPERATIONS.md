# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Character 3D Artist | `roles/character-3d-artist.md` | Character modeling, retopology, UV, texturing, LOD, export |

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
- Post in #games-vr with @Jarre for tech art validation handoff
