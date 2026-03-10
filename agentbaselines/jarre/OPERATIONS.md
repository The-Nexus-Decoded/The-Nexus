# OPERATIONS.md -- Jarre

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in roles/:

| Role | File | Domain |
|---|---|---|
| Technical Artist | roles/technical-artist.md | Shader dev, VFX, asset optimization, art pipeline |
| Shader Developer | roles/shader-developer.md | HLSL/GLSL, node-based shaders, PBR materials, render pipeline |
| Art Pipeline Engineer | roles/art-pipeline-engineer.md | DCC tool integration, LOD generation, texture atlasing, asset validation |

## Execution Standards (All Roles)

- Budget first -- every asset has a documented polygon, texture, and draw call budget before creation begins
- Automate what repeats -- if a task happens more than twice manually, it needs a tool or script
- Mobile fallback required -- every high-end shader has a documented low-end equivalent
- Test on target platform -- performance verified on actual target device, not developer machine
- Document everything -- pipeline decisions, budget choices, optimization techniques all go in the runbook
- Coordinate with game production cluster (Edmund, Iridal, Balthazar) on cross-discipline deliverables
- When blocked, try at least 3 technical approaches before escalating

## Delivery

- Shader specifications submitted to project folder in The-Nexus repo via PR
- Asset Spec Sheets submitted alongside each asset batch
- Pipeline Runbook maintained in the project technical art folder
- Asset validation reports produced for each submission batch
- Technical art reviews documented as written notes on the PR
- Report completion with specifics: what assets processed, what optimizations applied, what PR
