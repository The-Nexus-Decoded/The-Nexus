# SoulDrifter #451 / PR #460 — Fix Existing BREACH-V2

## Mission

Continue and fix the existing BREACH-V2 implementation. Preserve accepted First Breach content, room archetypes, art direction, gameplay and progression, but repair the procedural generator/shell architecture at its root.

The ticket is complete only when the player can travel continuously from Soul Well/vestibule through the selected route, 3–5 connected gallery rooms, Cinderbound Warden, First Memory and the Heartvale exit.

This is **not** a new level or replacement ticket. It is also not #448 character/monster production.

## Live target

- Issue: `#451`
- Draft PR: `#460`
- Branch: `codex/451-souldrifter-breach-v2`
- Base: `qa`
- Recorded worktree: `H:\CodexData\.codex\worktrees\breach\The-Nexus-breach-v2`
- Game root: `Arianus-Sky/projects/games/SoulDrifterWeb`
- Comparison seed: `4182`

Re-check live PR head and rediscover/reuse the existing worktree before editing. Never reset or discard unexplained work.

## Production authority

Read from `infra/game-production-playbooks`:

- `START_HERE.md`
- `SESSION_FAST_START.md`
- `WORKFLOW.md`
- `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
- `config/dungeon-topology-policy.json`
- `templates/dungeon-topology-record.template.json`
- `BROWSER_RUNTIME_ROADMAP.md`
- ticket/live PR comments and current implementation files

The SEA playbooks govern workflow. SKY contains runtime implementation/data/assets/tests.

---

# Latest owner correction — route selection triggers topology generation

The current failure is procedural, not merely decorative.

The branch currently selects rooms/positions and then attempts to add corridors/openings/shell fixes afterward. That produces boxes beside boxes, duplicate walls, corridors ending at intact walls, overlapping geometry and navigation that disagrees with rendered geometry.

The corrected runtime lifecycle is:

```text
PRE-CHOICE
load/render only the fixed Soul Well + vestibule + Threshold Plaza

PLAYER CHOOSES WAYFARER OR OATHBREAKER
-> lock seed + selected path
-> choose 3–5 legal room archetypes/order for that path
-> build selected-route logical graph
-> solve the complete selected-route top-down topology
-> place each next room from a validated source socket/connection
-> resolve canonical shared walls, apertures, corridor/portal semantics and elevations
-> run overlap, clearance, continuity and reachability checks
-> retry alternate socket/orientation/archetype or backtrack when invalid
-> freeze accepted route topology

ONLY AFTER TOPOLOGY PASSES
-> generate/render one shared shell and room interiors
-> create collision/navigation
-> place encounters, props, lighting, water and FX
```

Except in explicit preview/fixture tests, the unselected randomized branch does not need to be rendered. Its route gate remains sealed according to gameplay state.

## Room archetypes are templates, not sealed boxes

A selected gallery archetype provides:

- footprint/shape options;
- legal connection sockets;
- allowed orientations;
- floor/ceiling/elevation requirements;
- encounter/dressing sockets;
- clearance constraints.

It does not arrive as an independently closed four-wall box that is later pushed against another box.

## Place the next room from the connection

For each logical edge:

1. choose a legal source socket on the accepted previous room;
2. choose the exact connection type;
3. choose a compatible destination socket/orientation on the next room;
4. calculate the shared boundary or connector geometry;
5. derive the next room transform from that connection;
6. validate room/corridor overlap, floor/ceiling, player clearance, collision, navigation and elevation;
7. accept the next room only when the entire edge passes;
8. otherwise retry or backtrack.

Do not place rooms at unrelated slot centers and connect their coordinates afterward.

## Explicit connection semantics

Every edge is exactly one of:

### Direct open adjacency

- rooms touch;
- connecting span has no wall from either room;
- one continuous floor/ceiling/nav volume;
- no door unless explicitly required.

### Door/gate adjacency

- one shared boundary;
- one matching aperture;
- one door/gate geometry owner;
- one animation/collision-state owner;
- no duplicate hidden wall behind the gate.

### Physical corridor

- source wall aperture;
- corridor begins inside/flush with the source opening;
- continuous floor/walls/ceiling and elevation;
- corridor reaches and enters the destination opening;
- destination wall aperture;
- continuous collision/nav/player clearance.

### Magical/teleport portal

- explicitly marked nonphysical transfer;
- source/destination anchors and activation rules;
- no fake corridor and no assumption that the rooms physically touch.

### Vertical transition

- explicit source/destination elevation;
- stairs/ramp/landing/lift/drop geometry and gameplay semantics;
- collision/nav/camera proof.

## Shared-boundary rule

The accepted topology creates canonical boundary IDs before shell rendering.

- a closed shared wall renders once;
- an open span renders no wall;
- a portal span renders wall only outside its aperture;
- duplicate co-planar room walls are forbidden;
- floors/ceilings have deterministic shared ownership or union;
- shell generation consumes the boundary inventory instead of drawing four complete walls around every room.

---

# Top-down topology gate before any selected-room rendering

For every tested seed/path, generate a diagnostic plan from the actual solved topology showing:

- room polygons/IDs/archetypes/orientations;
- fixed versus randomized areas;
- canonical wall/boundary IDs;
- openings and portal footprints;
- corridor polygons and centerlines;
- player-clearance/nav route;
- floor elevations and vertical transitions;
- logical edges and their physical resolutions;
- overlap/error overlays.

The plan must pass:

1. automated topology invariants;
2. independent AI/vision review;
3. owner architectural review for the initial corrected generator design or major later change.

Do not proceed to room-shell rendering, dressing, lighting or FX when the topology map fails.

## Hard invariants

```text
requiredLogicalEdges == physicallyResolvedEdges
unintendedRoomOverlaps == 0
unintendedCorridorRoomOverlaps == 0
coincidentDuplicateWalls == 0
wallsCrossingApertures == 0
orphanDoorsOrGates == 0
unmatchedCorridorEndpoints == 0
corridorsEndingAtIntactWalls == 0
missingDestinationApertures == 0
playerClearanceFailures == 0
floorContinuityFailures == 0
ceilingContinuityFailures == 0
collisionContinuityFailures == 0
navigationContinuityFailures == 0
unsupportedElevationTransitions == 0
```

Invalid arrangements retry/backtrack/reject; they are not hidden with darkness, fog, doors or props.

---

# Runtime proof after rendering

A passing top-down map is necessary but not sufficient.

For Wayfarer and Oathbreaker:

- physically traverse every edge with WASD;
- physically traverse every edge with click-to-move;
- inspect source aperture, connector midpoint/bend and destination aperture;
- inspect both sides of every stateful gate/door;
- inspect floors, walls and ceilings;
- complete at least one continuous no-warp route through boss, First Memory and exit;
- verify real-time default and turn-based smoke on the same progression state;
- use real GPU/ANGLE D3D11 for final evidence;
- do not use survey warps as connection proof.

The prior failure—an open gate with intact wall geometry behind it—is a permanent regression test.

---

# Work order

```text
Phase -1  cached session fast-start
Phase 0   read-only current-generator/root-cause audit
Phase 1   route-selection event + selected-route graph/topology solver
Phase 2   canonical boundaries, apertures, corridors/portals and shared shell
Phase 3   collision/nav/WASD/click-to-move
Phase 4   route gameplay, 3–5 rooms, boss, First Memory, exit, save/reload
Phase 5   full-fidelity POC materials, water, lighting, Houdini/Three.js FX, mobile and performance
Phase 6   independent core-dungeon verification
FINAL      chained-skeleton Tripo/Houdini/Blender pilot after exact spend approval
Phase 8   independent pilot and full-regression verification
```

The chained-skeleton pilot remains last and cannot delay topology repair.

Babylon.js work is also outside #451. After the First Breach and first playable Heartvale section are complete and verified in Three.js, a separate isolated Babylon.js port may compare exactly those two sections.

---

# Copy/paste instruction for the active worker

```text
Read the latest #451 kickoff and PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md from branch infra/game-production-playbooks.

The key correction is timing and authority:

- Render/load only the fixed vestibule/plaza before route choice.
- When the player selects Wayfarer or Oathbreaker, generate the deterministic selected-route graph and solve the complete top-down topology before rendering any selected gallery-room meshes.
- Treat rooms as socketed architectural templates, not sealed boxes.
- Place each next room from a validated connection to the accepted previous room.
- Resolve canonical shared boundaries, source/destination apertures, corridor/portal type, elevation, collision/nav clearance and backtracking before accepting the room.
- Freeze the accepted topology, then derive the shared shell and runtime geometry from it.
- Do not add corridors/openings after independent room rendering.
- Do not claim completion from graph/pathfinding/coordinates/warps.

Before implementation, return:
1. current generator root-cause report;
2. proposed route-selection lifecycle;
3. topology data schema;
4. constructive placement/backtracking algorithm;
5. connection-type contracts;
6. canonical boundary/opening model;
7. automated invariant list;
8. top-down diagnostic design;
9. migration plan that preserves accepted First Breach content;
10. exact independent-verification plan.

Do not merge or deploy. Producer stops at IMPLEMENTED_UNVERIFIED.
```
