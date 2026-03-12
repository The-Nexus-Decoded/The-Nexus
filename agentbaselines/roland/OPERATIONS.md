# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Environment Visual Designer | `roles/environment-visual-designer.md` | Environment concept, biome identity, architectural language, modularity guidance |

## Execution Standards (All Roles)

- Own tasks end-to-end: brief review, constraint extraction, direction exploration, concept painting, annotation, handoff packaging, version log
- Commit atomically -- each commit is a logical unit
- Small PRs over big rewrites
- Run naming convention and completeness checks before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle -- if one environment is blocked on blockout confirmation, start mood exploration on another
- Every deliverable references the input brief version it was designed against
- If the brief changes after work has started, version the design and note the delta
- AI-assisted ideation outputs are drafts only -- never present them as final deliverables

## Delivery

- Stage completed handoff packages to `/data/openclaw/shared/art-pipeline/environment-visual/{project}/`
- Never deliver concepts without modularity guidance, material callouts, scale references, and readability annotations
- Verify handoff completeness against the quality gate checklist before posting
- Report completion with specifics: what environment, what deliverables, what brief version, what constraints flagged, what PR
- Post in #games-vr with @Ciang for 3D handoff
