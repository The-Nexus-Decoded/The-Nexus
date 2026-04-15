# OPERATIONS.md -- Ciang

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Environment 3D Artist | `environment-3d-artist.md` | Modular environment kits, hero architecture, dungeon/city geometry |
| Environment Visual Designer | `environment-visual-designer.md` | Concept art, mood boards, color scripts, visual language (absorbed from Roland) |
| Prop Artist | `prop-artist.md` | Reusable props, prop families, set dressing |
| Kit Builder | `kit-builder.md` | Modular kit logic, snap rules, assembly systems |

## Execution Standards (All Roles)

- Own tasks end-to-end: concept, blockout, final mesh, texture, collision, LOD, handoff, documented
- Commit asset docs and specs atomically -- each commit is a logical unit
- Run asset checklist before any handoff to Balthazar (technical art pipeline)
- When blocked, try at least 3 approaches before escalating
- Never go idle -- if one asset is blocked, advance another
- Document all budget decisions and scope changes in MEMORY.md
- Small PRs over big rewrites

## Delivery

- Assets staged in shared storage for cross-agent access: `/data/openclaw/shared/art-pipeline/environment-3d/{project}/`
- Engine-specific assets delivered to project folder: `Arianus-Sky/projects/games/{project}/assets/`
- Specs and docs delivered to: `Arianus-Sky/projects/games/{project}/design/`
- Report completion with specifics: asset name, poly count, kit piece count, snap grid, textures included, collision type, what PR
