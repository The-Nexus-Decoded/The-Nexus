# SoulDrifter Procedural Dungeon Topology Policy

## Purpose

Prevent SoulDrifter generators from treating rooms, corridors, caverns, water volumes, biome pockets or other playable spaces as independent closed boxes that are placed first and connected afterward.

Read this policy together with:

- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`;
- `config/dungeon-topology-policy.json`;
- `config/spatial-connection-policy.json`;
- `templates/dungeon-topology-record.template.json`;
- `templates/spatial-connection-record.template.json`.

## Owner-locked diagnosis

The original First Breach architecture behaved too much like:

```text
choose room boxes
-> place sealed boxes at predefined/random positions
-> add corridor/door objects after placement
-> hope shells, apertures, collision and navigation line up
```

That can produce duplicate walls, blocked doorways, corridors ending at intact walls, overlapping floors/ceilings and navigation that disagrees with visible geometry.

The corrected rule is:

> **Logical graph first, constructive spatial embedding second, canonical shared boundaries and traversal volumes third, runtime geometry last.**

A destination space is accepted only after the complete connection from the already accepted source space is solved and validated.

---

# 1. Spatial nodes are not limited to rooms

A logical node may be:

- a chamber, hall, corridor, cavern or shaft;
- a stairwell, climb surface, bridge or moving platform region;
- a water basin, flooded tunnel, submerged cave or air pocket;
- a forest, city ruin, swamp or other biome contained inside a dungeon;
- a large labyrinth, hub, arena or streamed region;
- a moving, transforming or non-Euclidean living-dungeon state.

Large or dynamic spaces use region graphs, local subgraphs, volumes and state graphs. They must not be flattened into one oversized rectangular room merely to fit the generator.

---

# 2. Authoritative representations

Every generated run maintains reconciled layers.

## A. Logical gameplay graph

Defines:

- required spatial nodes;
- route and branch rules;
- node archetype pools;
- edge order and connection type;
- directionality and state requirements;
- encounter/reward/progression semantics;
- movement mode and traversal medium.

## B. Embedded spatial plan

Defines actual:

- polygons, terrain regions and 3D volumes;
- canonical boundaries and ownership;
- apertures, sockets and connectors;
- corridor/path/spline geometry;
- floor, ceiling, climb and water surfaces;
- elevations, depths and air pockets;
- collision, navigation and player-clearance envelopes;
- streaming and state-transition boundaries.

## C. Runtime geometry and movement systems

Three.js geometry, collision, navigation, movement-state transitions, camera behavior and animations are derived from the accepted plan/volume/state data.

The runtime may not reinterpret the graph independently or invent openings after shell construction.

Each run/state also derives one complete runtime spatial authority from the accepted inventory. Production player movement, NPC navigation, line of sight, projectile/melee/physics queries, interaction targeting, camera collision/occlusion and debug/proof hooks share stable owner IDs and the same current transform/state revision; no subsystem or proof-only shadow inventory may reinterpret the plan.

---

# 3. Constructive placement algorithm

## Phase A — Build the logical run

For a seed and route:

1. choose the fixed spine;
2. select legal node archetypes and order;
3. create the node/edge graph;
4. assign each edge one explicit connection type from the traversal catalog;
5. assign movement mode, medium, directionality and lock/state rules;
6. validate progression before spatial placement.

## Phase B — Grow from accepted geometry

For every outgoing edge:

1. select a legal source socket, boundary, surface or volume;
2. select the exact connection contract;
3. select a compatible destination socket/orientation/state;
4. calculate the shared boundary, path, spline, surface or volume;
5. derive the destination transform from the connection;
6. validate overlap, clearance, elevation/depth, floor/ceiling/volume, collision, navigation, camera and movement-state rules;
7. accept the destination only when the entire edge passes;
8. otherwise retry another socket/orientation/archetype or backtrack;
9. reject the variant when legal embedding is exhausted.

The level grows as:

```text
accepted node 1
-> solve/validate edge 1
-> place/accept node 2
-> solve/validate edge 2
-> place/accept node 3
-> ...
```

It must not grow as independent sealed modules placed first and repaired later.

---

# 4. Connection semantics

`SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md` is the complete taxonomy.

The topology engine must support explicit contracts for categories such as:

- open adjacency, door/gate thresholds and physical corridors;
- crawlspaces, secret/destructible and puzzle-locked passages;
- stairs, ramps, ladders, climbing, mantling, lifts, drops and moving platforms;
- jumps, bridges, ropes, ziplines and platform sequences;
- wading, surface swimming, underwater tunnels, dive shafts, air pockets, currents, waterfalls and boats;
- seamless biome transitions, labyrinths, mega-zones and living-dungeon transformations;
- vehicles, streaming boundaries, true portal transfers and non-Euclidean connections.

A physical edge must contain real geometry/surfaces/volumes from source to destination. A true transfer edge is explicitly nonphysical and creates no fake corridor.

## Current First Breach rule

The current First Breach contains **no magical `PORTAL_TRANSFER` edge**.

Its route gates, corridors, stairs/landings and walk-through Soulwell water veil are physical connections inside one continuous navigable level. Code or mesh names containing `portal` do not change this classification.

Current #451 allowed connection types are defined in `config/spatial-connection-policy.json`.

---

# 5. Canonical boundary, surface and volume ownership

Before runtime mesh construction, the accepted plan records stable IDs for:

- walls and shared boundaries;
- open spans and apertures;
- floor, ceiling, terrain and climb surfaces;
- water and air volumes;
- corridor/path/spline connectors;
- moving platforms and dynamic-state geometry;
- streaming boundaries.

Rules:

- one physical shared wall is emitted once;
- an open span emits no blocking wall;
- a controlled threshold emits wall only outside its aperture;
- co-planar duplicate walls/surfaces are a hard failure;
- overlapping slabs/volumes use deterministic ownership or union;
- water volumes and air pockets cannot overlap incorrectly or trap the player;
- shell/runtime generation consumes the accepted inventory instead of closing every node independently.

Runtime ownership requirements:

- every effective visible render owner and collider owner has a stable ID;
- every render owner is explicitly a blocking solid, traversable surface, nonblocking detail, hazard/special volume, VFX-only owner or inherited child;
- every rendered solid maps to collider-owner ID(s), while every collision-only owner records an approved reason;
- compound/merged render owners enumerate all collider IDs, and inherited children name their owner;
- asset-catalog defaults, placement-registry approved overrides, generated-layout effective contracts and runtime render/collider instances remain traceable and reconciled;
- fitting/normalization and world placement happen before final world bounds are measured and the final proxy is derived or validated;
- closed/open/raised, intact/damaged/destroyed, enabled/disabled and spawned/despawned transitions update render plus every spatial consumer atomically.

## Effective placement and export gate

Before any procedural placement or static dressing placement is accepted, resolve its effective spatial contract in this order:

```text
asset-catalog default
-> placement-registry approved override
-> generated-layout contract
-> final fitted runtime footprint
```

Clearance, standability and reachability consume the effective actor blockers and effective camera blockers from that final fitted footprint. Catalog guesses, authored footprint assumptions and pre-fit bounds cannot substitute for the resolved contract.

Run this acceptance gate across the complete configured seed/route matrix plus a representative random-seed sweep for every required body profile, including the player and each NPC/companion profile. When any required profile loses clearance or reachability, retry another legal placement/orientation, backtrack, or reject the variant.

Artifact export must preserve active, inactive, conditional and supplemental topology assemblies together with their stable IDs, contracts and state metadata. An assembly cannot be pruned merely because it is inactive, hidden or unselected in the current render state when another supported route, state, runtime consumer or proof step requires it.

---

# 6. Diagnostic gate

Every seed/route produces diagnostics from the **actual solved geometry, volumes and states**, not a separate concept image.

Use:

- top-down plan for horizontal layouts;
- section/elevation for stairs, climbs, drops, lifts and layered labyrinths;
- 3D volume/slice views for water, underwater tunnels, air pockets and volumetric hazards;
- state graphs and before/after views for moving or living-dungeon topology;
- region/streaming maps and local subgraphs for mega-zones and biome pockets.

Required review:

1. automated geometry/topology/state checks;
2. independent AI/vision review where meaningful;
3. owner design review for the initial generator architecture or major changes.

Do not begin dressing, lighting or FX until the required diagnostic set passes.

---

# 7. Required invariants

For every accepted run:

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
minimumPlayerClearanceFailures == 0
surfaceContinuityFailures == 0
volumeContinuityFailures == 0
collisionContinuityFailures == 0
navigationContinuityFailures == 0
unsupportedElevationOrDepthTransitions == 0
movementStateTransitionFailures == 0
resourceRuleFailures == 0
recoveryOrSoftLockFailures == 0
runtimeSpatialAuthorityCoverageFailures == 0
renderColliderReconciliationFailures == 0
contractChainOrOverrideFailures == 0
postFitProxyMismatchFailures == 0
spatialQueryStateParityFailures == 0
productionMovementPrimitiveParityFailures == 0
continuousSweepFailures == 0
effectivePlacementContractFailures == 0
requiredBodyProfileClearanceFailures == 0
artifactTopologyAssemblyLosses == 0
cameraOnlyOverheadBlockerFailures == 0
```

Additional requirements:

- every required progression node is reachable in its intended state;
- aquatic routes validate oxygen, drowning and air-pocket behavior;
- climb/jump/platform routes validate mount, travel, dismount/fall and recovery;
- dynamic topology validates every reachable state and atomic collision/nav swaps;
- mega-zones validate region and local navigation graphs;
- invalid arrangements backtrack/reject instead of being hidden with fog, darkness or props.

---

# 8. Runtime proof

A passing plan/section/volume diagnostic is necessary but not sufficient.

The verifier uses the real movement mode:

- walk and click-to-move for ground routes;
- crawl/crouch for narrow passages;
- climb/mantle/ladder controls for vertical routes;
- jump/platform/rope controls for gap routes;
- swim/dive controls, oxygen and air pockets for aquatic routes;
- ride/board controls for transport;
- activation/arrival checks for true transfer edges.

Ground-route and collision acceptance invokes the actual production movement/collision primitive with production body dimensions, speed, timestep and substep rules. Test axis-aligned and diagonal approaches, corners, grazing, wall sliding, thin obstacles and every reachable dynamic-threshold or destructible footprint state. Record and validate every continuous swept segment between movement samples.

Test actor-passable camera-only overhead solids, including visible lintels, ceilings, beams and caps where applicable. Their effective camera blockers must prevent invalid camera passage or visibility while remaining absent from actor reachability blockers when their contract permits actors beneath them.

Endpoint arrival, grid/BFS/path/navigation reachability and sparse point checks are insufficient even when a route reaches its destination. Runtime proof/debug hooks must query the same complete spatial authority and current state revision as production.

Inspect source, midpoint/transition and destination. Verify camera, animation, collision, navigation, resources, hazards, save/reload and recovery.

Debug warp never proves a connection.

The prior #451 defect—an open gate with an intact wall behind it—is a permanent regression case.

---

# 9. Fix strategy for BREACH-V2

Issue #451 remains a repair, not a content reset.

The worker must preserve accepted room archetypes, art, encounters, route design and progression while replacing any flawed slot-center/closed-box assembly logic that can reproduce the defect.

For the current First Breach:

1. generate the selected route after the player chooses Wayfarer or Oathbreaker;
2. solve the complete selected-route topology before rendering gallery meshes;
3. use compatible source/destination sockets and constructive placement;
4. generate canonical boundaries/apertures/corridors/elevations;
5. keep every edge physical—no magical transfer shortcut;
6. regenerate fixtures only after the topology gate passes;
7. prove both routes with continuous no-warp traversal.

“Do not rebuild” means preserve accepted design/content, not preserve a flawed procedural assembly algorithm.

---

# 10. State and evidence

Store per seed/variant:

- logical graph and spatial-node types;
- connection records and traversal contracts;
- placement attempts/backtracking;
- transforms, polygons, surfaces and volumes;
- canonical boundary/surface/volume inventory;
- complete runtime spatial-authority inventory with stable render-owner/collider IDs and state revision;
- catalog/placement-registry/generated-layout/runtime contract and approved-override reconciliation;
- rendered-solid/collider and collision-only-reason reconciliation;
- final fitted world transforms/bounds and final proxy comparison;
- topology and movement-state metrics;
- plan/section/volume/state diagnostics;
- automated results;
- AI/owner review;
- production movement/body/timestep plus continuous swept-segment runtime evidence;
- configured seed/route matrix and representative random-seed results for every required player and NPC/companion body profile;
- artifact-export manifest proving active, inactive, conditional and supplemental topology assemblies survived export;
- camera-only overhead-solid collision and occlusion evidence where applicable;
- verifier status.

## Done rule

A procedural level is not complete because modules appear near one another or a navigation graph connects coordinates.

It is complete when every accepted state has coherent geometry/volumes, explicit traversal contracts, no accidental overlap or blockage, correct movement/camera/resource behavior and independent real-input proof.
