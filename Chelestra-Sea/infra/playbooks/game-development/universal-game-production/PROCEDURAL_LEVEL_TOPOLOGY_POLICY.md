# Universal Procedural Level Topology Policy

## Purpose

Prevent procedural generators from treating rooms, corridors, buildings, lots, platforms, roads, water volumes or biome regions as independent closed modules that are placed first and connected afterward.

Read with:

- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`;
- `config/procedural-level-topology-policy.json`;
- `config/spatial-connection-policy.json`;
- `templates/procedural-level-topology-record.template.json`;
- `templates/spatial-connection-record.template.json`.

This policy applies to indoor dungeons, modular buildings, outdoor zones, roads/tracks, platformer spaces, shooter arenas, strategy maps, aquatic routes, vertical complexes, labyrinths, biome pockets and living/transforming spaces.

## Core rule

> **Logical graph first, explicit traversal contracts second, constructive spatial embedding third, canonical boundaries/surfaces/volumes fourth, runtime geometry last.**

A destination node is accepted only after its complete connection from already accepted geometry is solved and validated.

Do not place sealed modules and hope later doors, corridors, water, climbing logic or pathfinding make them coherent.

---

# Representation layers

Every generated layout maintains:

1. **Logical graph** — gameplay nodes, edges, ordering, directionality and state semantics.
2. **Traversal contracts** — connection type, movement mode, medium, resources, hazards and recovery.
3. **Embedded spatial plan** — polygons, terrain, boundaries, openings, paths, surfaces, volumes, elevations/depths and clearance.
4. **Runtime geometry/physics/navigation/controller states** — derived from the accepted embedded data.

The layers reconcile 1:1 for every accepted edge and reachable state.

---

# Spatial nodes

A node may be:

- an enclosed room, hall or corridor;
- a cavern, shaft or vertical complex;
- a climb surface, bridge or moving-platform region;
- a water body, flooded tunnel, submerged cave or air pocket;
- a forest, city, swamp or other biome contained inside another space;
- a labyrinth, arena, hub or streamed mega-zone;
- a moving, transforming or non-Euclidean region;
- a vehicle/transport space or exterior zone.

Large or dynamic spaces use region/local/state graphs rather than one oversized room rectangle.

---

# Constructive embedding

For each logical edge:

1. choose a legal source socket, boundary, surface, path or volume;
2. choose the exact connection type, movement mode, medium, directionality and state contract;
3. choose a compatible destination socket/orientation/state;
4. calculate the shared boundary, connector path/spline, surface or volume;
5. derive the destination transform from the connection;
6. validate overlap, clearance, elevation/depth, surfaces/volumes, collision, navigation, camera, resources, hazards and recovery;
7. accept the destination only when the complete edge passes;
8. otherwise retry another connection/orientation/module or backtrack;
9. reject/regenerate when legal embedding is exhausted.

This supports deterministic seeded generation while refusing impossible or unsafe layouts.

---

# Connection taxonomy

`SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md` defines the complete reusable taxonomy, including:

- open adjacency, doors/gates, corridors, crawlspaces and secret/destructible passages;
- stairs, ramps, ladders, climbing, mantling, lifts, drops, ropes and moving platforms;
- jumps, bridges, balance paths and platform sequences;
- wading, swimming, underwater tunnels, dive shafts, air pockets, currents, waterfalls and boats;
- biome transitions, labyrinths, mega-zones and living-world transformations;
- vehicles, streaming boundaries, true transfer edges and non-Euclidean connections.

A physical edge requires continuous real geometry/surfaces/volumes. A true transfer edge is explicitly nonphysical and creates no fake corridor.

---

# Canonical ownership

The embedded plan creates stable IDs before runtime construction for:

- shared walls/boundaries and apertures;
- floor, ceiling, terrain and climb surfaces;
- water, air and hazard volumes;
- connector paths/splines;
- moving platforms and state-specific geometry;
- streaming boundaries.

Rules:

- shared boundaries are emitted once;
- open spans emit no blocking boundary;
- controlled thresholds own one aperture/state/collision contract;
- physical connectors reach both endpoint openings/surfaces/volumes;
- co-planar duplicate boundaries are failures;
- overlapping surfaces/volumes use deterministic ownership or union;
- water/air volumes cannot trap the player;
- runtime construction consumes the accepted inventory instead of independently closing every module.

---

# Diagnostic gate

Every accepted seed/variant produces diagnostics from actual embedded geometry, volumes and states.

Use:

- top-down plan for primarily horizontal routes;
- section/elevation for stairs, climbs, drops, lifts and layered spaces;
- 3D volume/slice views for water, underwater tunnels, air pockets and volumetric hazards;
- state graphs/timelines and before/after geometry for moving or transforming topology;
- region/streaming maps plus local subgraphs for mega-zones and biome pockets.

Required review:

- automated topology/traversal checks;
- independent AI/vision review where meaningful;
- owner/design review for the initial generator architecture or major changes.

Do not begin dressing/detailing until the required diagnostic set passes.

---

# Minimum invariants

A project config sets tolerances, but accepted generation normally requires:

```text
requiredLogicalEdges == physicallyOrExplicitlyResolvedEdges
unintendedNodeOverlaps == 0
unintendedConnectorNodeOverlaps == 0
coincidentDuplicateBoundaries == 0
boundariesCrossingOpenings == 0
orphanDoorsGatesOrConnectors == 0
unmatchedConnectorEndpoints == 0
physicalConnectorsEndingAtBlockingGeometry == 0
missingDestinationOpenings == 0
clearanceFailures == 0
surfaceContinuityFailures == 0
volumeContinuityFailures == 0
collisionContinuityFailures == 0
navigationContinuityFailures == 0
unsupportedElevationOrDepthTransitions == 0
movementStateTransitionFailures == 0
resourceRuleFailures == 0
recoveryOrSoftLockFailures == 0
```

Every required progression node is reachable under intended locks/states.

Aquatic routes validate oxygen/drowning/air pockets. Vertical/gap routes validate mount/travel/dismount/fall/recovery. Dynamic topology validates every reachable state and atomic collision/nav changes. Mega-zones validate region and local graphs.

Invalid layouts are repaired/backtracked/rejected, not cosmetically hidden.

---

# Runtime proof

Graph or pathfinding success is not enough.

For each edge, test the real movement mode and failure/recovery path:

- walk/click-to-move;
- crouch/crawl;
- climb/mantle/ladder;
- jump/platform/rope;
- swim/dive/oxygen/air pockets;
- vehicle/transport;
- true transfer activation/arrival when applicable.

Capture source, transition/midpoint and destination. Verify camera, animation, collision, navigation, resources, hazards, persistence and recovery.

Debug teleport/warp may be used for inspection but not connection proof.

---

# State and evidence

Store per seed/variant:

- logical graph and node types;
- connection/traversal records;
- placement attempts/backtracking;
- transforms, polygons, surfaces and volumes;
- canonical ownership inventory;
- topology and movement-state metrics;
- plan/section/volume/state diagnostics;
- automated results;
- AI/design review;
- runtime evidence;
- verifier status.

## Universal done rule

A procedural level is not complete because modules appear near one another or a navigation graph connects coordinates.

It is complete when every accepted state has coherent geometry/volumes, explicit traversal contracts, correct movement/camera/resource behavior, no accidental blockage or entrapment, and independent real-input proof.