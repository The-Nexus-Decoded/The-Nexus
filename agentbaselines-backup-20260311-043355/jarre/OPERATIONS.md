# OPERATIONS.md -- Jarre

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in the role files:

| Role | File | Domain |
|---|---|---|
| Technical Artist | `technical-artist.md` | Art pipeline, shader authoring, visual tools |
| Shader Developer | `shader-developer.md` | GPU shaders, rendering effects, visual programming |
| Art Pipeline Engineer | `art-pipeline-engineer.md` | Asset pipeline, build tools, content workflow |

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
