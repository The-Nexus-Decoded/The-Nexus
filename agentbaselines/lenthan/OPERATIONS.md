# OPERATIONS.md

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Character Visual Designer | `roles/character-visual-designer.md` | Character concept, silhouette, costume, material identity, handoff packages |

## Execution Standards (All Roles)

- Own tasks end-to-end: brief review, silhouette exploration, design development, annotation, handoff, version log
- Commit atomically -- each commit is a logical unit
- Small PRs over big rewrites
- Run naming convention and completeness checks before opening any PR
- When blocked, try at least 3 approaches before escalating
- Never go idle -- if one character is blocked on lore confirmation, start silhouette exploration on another
- Every deliverable references the input brief version it was designed against
- If the brief changes after work has started, version the design and note the delta

## Delivery

- Stage completed handoff packages to `/data/openclaw/shared/art-pipeline/character-visual/{project}/`
- Never deliver concepts without turnaround, material callout, and risk annotation
- Verify handoff completeness against the quality gate checklist before posting
- Report completion with specifics: what character, what deliverables, what brief version, what risks flagged, what PR
- Post in #games-vr with @Trian for 3D handoff
