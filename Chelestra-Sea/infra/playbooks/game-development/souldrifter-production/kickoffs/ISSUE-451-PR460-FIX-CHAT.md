# SoulDrifter #451 / PR #460 — Fix Existing BREACH-V2

## Mission

Continue and fix the existing BREACH-V2 implementation. Preserve accepted First Breach content, room archetypes, art direction, gameplay and progression, but repair the procedural generator/shell architecture at its root.

The ticket is complete only when the player can travel continuously from Soul Well/vestibule through the selected route, 3–5 connected gallery spaces, Cinderbound Warden, First Memory and the Heartvale exit.

This is not a new replacement level and is not #448 character/monster production.

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
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
- `config/dungeon-topology-policy.json`
- `config/spatial-connection-policy.json`
- `templates/dungeon-topology-record.template.json`
- `templates/spatial-connection-record.template.json`
- `BROWSER_RUNTIME_ROADMAP.md`
- live ticket/PR comments and current implementation files

SEA playbooks govern workflow. SKY contains runtime implementation/data/assets/tests.

---

# Route selection triggers topology generation

The current failure is procedural, not merely decorative.

The corrected runtime lifecycle is:

```text
PRE-CHOICE
load/render only fixed Soul Well + vestibule + Threshold Plaza

PLAYER CHOOSES WAYFARER OR OATHBREAKER
-> lock seed + selected path
-> choose 3–5 legal room archetypes/order
-> build selected-route logical graph
-> assign explicit physical connection contracts
-> solve complete selected-route top-down topology
-> place each next space from a validated source socket/connection
-> resolve canonical shared walls, apertures, corridors and elevations
-> run overlap, clearance, continuity and reachability checks
-> retry alternate socket/orientation/archetype or backtrack when invalid
-> freeze accepted route topology

ONLY AFTER TOPOLOGY PASSES
-> generate/render one shared shell and interiors
-> create collision/navigation
-> place encounters, props, lighting, water and FX
```

Except in explicit preview/fixture tests, the unselected randomized branch does not need to render. Its route gate remains sealed.

## Room archetypes are templates, not sealed boxes

A gallery archetype provides footprint/shape variants, legal sockets, allowed orientations, floor/ceiling/elevation requirements, encounter/dressing sockets and clearance constraints.

It does not arrive as an independently closed four-wall box that is pushed against another box.

## Place the next room from the connection

For each logical edge:

1. choose a legal source socket on the accepted previous space;
2. choose the exact connection type;
3. choose a compatible destination socket/orientation;
4. calculate the shared boundary or corridor;
5. derive the destination transform from the connection;
6. validate overlap, floor/ceiling, player clearance, collision, navigation and elevation;
7. accept the destination only when the entire edge passes;
8. otherwise retry or backtrack.

Do not place rooms at unrelated slot centers and connect coordinates afterward.

---

# Current First Breach connection types

The current First Breach contains **no magical teleport or `PORTAL_TRANSFER` edge**.

The word `portal` may still appear in old code, mesh names or visual-effect names. In this level it means a physical threshold/gate unless an explicit transfer contract says otherwise.

Allowed current connection families:

### `DIRECT_OPEN_ADJACENCY`

- spaces touch;
- connecting span has no wall;
- continuous floor/ceiling/nav volume.

### `DOOR_GATE_THRESHOLD`

- one shared boundary and aperture;
- one door/gate geometry, animation and collision owner;
- no hidden duplicate wall.

### `PHYSICAL_CORRIDOR_OR_PASSAGE`

- source aperture;
- continuous corridor floor/walls/ceiling/elevation;
- destination aperture;
- continuous collision/nav/player clearance.

### `STAIRS_RAMP_OR_LANDING`

- explicit elevations, rise/run and landing;
- floor/collision/nav/camera continuity.

### Soulwell exit water veil

The Heartvale exit veil is a **doorless physical walk-through threshold effect**, not a teleport. The ground route remains continuous through it.

Future SoulDrifter zones may use swimming, underwater tunnels, air pockets, climbing, mega-zones, biome pockets, living-dungeon transformations or true portal transfers, but those are documented in `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md` and are not part of #451 unless separately authorized.

---

# Canonical shared-boundary rule

The accepted topology creates canonical boundary IDs before shell rendering.

- a closed shared wall renders once;
- an open span renders no wall;
- a door/gate span renders wall only outside its aperture;
- duplicate co-planar room walls are forbidden;
- floors/ceilings have deterministic shared ownership or union;
- shell generation consumes the boundary inventory instead of drawing four complete walls around every room.

---

# Topology gate before selected-room rendering

For every tested seed/path, generate a diagnostic plan from actual solved topology showing:

- space polygons/IDs/archetypes/orientations;
- fixed versus randomized areas;
- canonical walls/boundary IDs;
- openings and gate footprints;
- corridor polygons and centerlines;
- player-clearance/nav route;
- floor elevations and vertical transitions;
- logical edges and physical resolutions;
- overlap/error overlays.

Use section/elevation details wherever the top-down plan cannot prove the stairs, ramp, landing or vertical clearance.

The plan must pass:

1. automated topology invariants;
2. independent AI/vision review;
3. owner architectural review for the initial corrected generator design or major later change.

Do not proceed to shell rendering, dressing, lighting or FX when the topology fails.

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

The prior open-gate/intact-wall failure is a permanent regression test.

---

# Work order

```text
Phase -1  cached session fast-start
Phase 0   read-only current-generator/root-cause audit
Phase 1   route-selection event + selected-route graph/topology solver
Phase 2   canonical boundaries, apertures, corridors and shared shell
Phase 3   collision/nav/WASD/click-to-move
Phase 4   route gameplay, 3–5 rooms, boss, First Memory, exit, save/reload
Phase 5   full-fidelity POC materials, water, lighting, Houdini/Three.js FX, mobile and performance
Phase 6   independent core-dungeon verification
FINAL      chained-skeleton Tripo/Houdini/Blender pilot after exact spend approval
Phase 8   independent pilot and full-regression verification
```

The chained-skeleton pilot remains last and cannot delay topology repair.

Babylon.js work is outside #451. After First Breach and the first playable Heartvale section are complete/verified in Three.js, a separate isolated Babylon.js port may compare exactly those two sections.

---

# Copy/paste instruction for a future/resumed worker

```text
Read the latest #451 kickoff, PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md,
SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md, and both topology/connection configs.

For this First Breach ticket:
- generate the randomized selected branch after route choice;
- solve topology before selected gallery meshes render;
- treat rooms as socketed architectural templates, not sealed boxes;
- place each destination from the accepted connection;
- use only physical open, gate, corridor and stair/ramp/landing connections;
- do not create or classify any magical PORTAL_TRANSFER edge;
- classify the Soulwell exit veil as a physical walk-through effect threshold;
- freeze topology before shared-shell generation;
- prove every edge with real movement, not coordinates/pathfinding/warps.

Do not merge or deploy. Producer stops at IMPLEMENTED_UNVERIFIED.
```
