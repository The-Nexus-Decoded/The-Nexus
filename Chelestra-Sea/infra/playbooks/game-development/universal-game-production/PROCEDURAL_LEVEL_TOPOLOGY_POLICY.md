# Universal Procedural Level Topology Policy

## Purpose

Prevent procedural generators from treating rooms, corridors, buildings, lots, platforms, roads or gameplay spaces as independent closed boxes that are placed first and connected after the fact.

This policy is genre-agnostic and applies to:

- indoor dungeons;
- modular buildings;
- outdoor zones and road networks;
- platformer room graphs;
- shooter arenas and connectors;
- strategy maps;
- vehicle routes/tracks;
- nested procedural spaces.

A project overlay defines its exact room/node/edge types and target-engine implementation.

## Core rule

> **Logical graph first, constructive spatial embedding second, canonical shared boundaries third, runtime geometry last.**

A generated level grows connection by connection. The next space is placed relative to a validated connection from already accepted geometry.

Do not place independent sealed modules and hope that later doors/corridors/pathfinding make them physically coherent.

---

# Representation layers

Every generated layout maintains:

1. **Logical graph** — gameplay nodes, edges, ordering and semantics.
2. **Embedded architectural/spatial plan** — actual polygons, boundaries, openings, connectors, elevations and clearance.
3. **Runtime geometry/physics/navigation** — generated from the accepted embedded plan.

The three layers must reconcile 1:1 for every accepted edge.

---

# Constructive embedding

For each logical edge:

1. choose a legal source socket/boundary on accepted geometry;
2. choose the connection type and clearance/elevation contract;
3. choose a compatible destination socket/orientation;
4. calculate the connector or shared boundary;
5. place the destination module relative to that edge;
6. test overlap, clearance, elevation, route and boundary rules;
7. accept the destination only when the complete physical edge passes;
8. otherwise retry another socket/orientation/module or backtrack;
9. reject/regenerate when backtracking is exhausted.

This supports deterministic seeded generation while refusing impossible arrangements.

---

# Universal connection types

Projects may extend these, but must not leave connection semantics implicit.

- `DIRECT_OPEN_ADJACENCY`
- `DOOR_GATE_ADJACENCY`
- `CORRIDOR_OR_PASSAGE`
- `PORTAL_OR_TELEPORT`
- `VERTICAL_TRANSITION`
- `ROAD_OR_PATH_JUNCTION`
- `PLATFORM_OR_BRIDGE_CONNECTION`

Each edge type defines physical geometry, state, collision, navigation, camera and gameplay semantics.

A portal/teleport edge is not required to create a corridor. A physical edge is not allowed to masquerade as a portal merely because geometry failed.

---

# Canonical shared boundaries

The embedded plan creates boundary IDs before shell/mesh construction.

Rules:

- shared walls/boundaries are emitted once;
- open spans emit no blocking boundary;
- doors/gates own one matching aperture and state/collision contract;
- corridors/passages must union/reach both endpoint openings;
- co-planar duplicate walls/surfaces are failures;
- overlapping slabs/surfaces have deterministic ownership/union;
- runtime shell construction consumes the boundary inventory instead of independently closing every module.

---

# Top-down/spatial diagnostic gate

Every accepted generated seed/variant produces a diagnostic representation from **actual embedded geometry**, not only the intended graph.

For 2D/top-down-compatible spaces, render a readable plan showing:

- polygons/modules and IDs;
- boundaries/walls;
- openings;
- connectors;
- doors/gates/portals;
- elevations/vertical transitions;
- navigation/clearance;
- logical edges and physical matches;
- overlaps/errors.

For fully 3D/free-form spaces, produce equivalent plan/section/volume diagnostics.

Required review:

- automated geometry/topology checks;
- independent AI/vision review where images are meaningful;
- owner/design review for the initial generator architecture or major changes.

Do not begin dressing/detailing until topology passes.

---

# Minimum invariants

A project config sets tolerances, but accepted generation normally requires:

```text
requiredLogicalEdges == physicallyResolvedEdges
unintendedModuleOverlaps == 0
coincidentDuplicateBoundaries == 0
boundariesCrossingOpenings == 0
orphanDoorsOrConnectors == 0
unmatchedConnectorEndpoints == 0
physicalConnectorsEndingAtBlockingGeometry == 0
missingDestinationOpenings == 0
clearanceFailures == 0
floorOrSurfaceContinuityFailures == 0
ceilingOrVolumeContinuityFailures == 0
collisionContinuityFailures == 0
navigationContinuityFailures == 0
unsupportedElevationTransitions == 0
```

Every required progression node must be reachable under its intended state/lock rules.

Invalid layouts are repaired/backtracked/rejected; they are not cosmetically hidden.

---

# Runtime proof

Graph or pathfinding success is not enough.

For each physical edge, test the real controller/input and collision/navigation implementation. Capture source opening, connector midpoint/bend, destination opening and both sides of stateful portals/doors.

Debug teleport/warp may be used for inspection but not as connection proof.

---

# State and evidence

Store per seed/variant:

- logical graph;
- selected modules;
- placement attempts/backtracking;
- transforms/polygons;
- canonical boundaries;
- connection records;
- topology metrics;
- diagnostic images/sections;
- automated results;
- AI/design review;
- runtime evidence;
- verifier status.

Use:

- `config/procedural-level-topology-policy.json`
- `templates/procedural-level-topology-record.template.json`

## Universal done rule

A procedural level is not complete because modules appear near one another or a navigation graph connects their coordinates.

It is complete when the accepted variant is spatially coherent, uses canonical shared boundaries, resolves every logical edge physically or explicitly as a portal, and passes real runtime traversal/interaction proof.