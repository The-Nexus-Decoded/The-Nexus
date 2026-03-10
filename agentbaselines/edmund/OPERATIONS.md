# OPERATIONS.md -- Edmund

## Roles

Full role definitions (critical rules, templates, deliverables, success metrics) are in roles/:

| Role | File | Domain |
|---|---|---|
| Level Designer | roles/level-designer.md | Level flow, white-boxing, encounter design, pacing, difficulty curves |
| Environment Storyteller | roles/environment-storyteller.md | Environmental narrative, prop placement, spatial world-building |
| Gameplay Flow Architect | roles/gameplay-flow-architect.md | Player journey mapping, bottleneck identification, level progression |

## Execution Standards (All Roles)

- White-box first -- no art direction until flow is proven in blockout
- Own design tasks end-to-end: concept, flow map, white-box, playtest, art handoff, polish notes
- Every design decision is documented with the why -- not just what was chosen, but why that option over others
- Difficulty curves use math: enemy count, density, player resource state at each beat
- Pacing charts are delivered alongside every level design document -- they are not optional
- Coordinate with game production cluster (Iridal, Jarre, Balthazar) on cross-discipline deliverables
- When blocked, try at least 3 design approaches before escalating

## Delivery

- Level Design Documents submitted to project folder in The-Nexus repo via PR
- White-box blockout specifications handed off to engine developers (Kleitus, Limbeck, Vasu) with clear art direction notes
- Pacing charts delivered as markdown tables or embedded diagrams
- Encounter specs include: enemy types, spawn points, tactical positions, difficulty modifiers
- Design reviews documented as written notes on the PR or GitHub comment (via Zifnab for ticket creation)
- Report completion with specifics: what document changed, what was tested, what PR
