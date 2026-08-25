# SoulDrifter Procedural Dungeon Topology Policy

## Owner-locked diagnosis

The current First Breach generator has behaved too much like this:

```text
choose room boxes
-> place sealed boxes at predefined/random positions
-> add corridor/door objects after placement
-> hope the shells, apertures, collision and navigation line up
```

That architecture can produce:

- two walls occupying the same shared boundary;
- a visible door or gate with an intact wall behind it;
- corridors that stop at a room wall instead of entering the room;
- overlapping room shells, floors or ceilings;
- z-fighting and excessive wall thickness;
- navigation that says two spaces connect while the rendered geometry does not;
- randomized layouts that are logically valid but architecturally impossible.

The corrected rule is:

> **Logical graph first, constructive spatial embedding second, one shared architectural shell third.**

A room is not accepted as a closed box and connected afterward. The generator grows the level edge by edge and creates every connection as part of placing the next room.

---

# 1. Authoritative representations

Every generated run has three distinct but reconciled representations.

## A. Logical gameplay graph

Defines:

- required rooms/nodes;
- route choice and branch rules;
- room archetype pool;
- edge order;
- connection type;
- encounter/reward/progression semantics;
- portal versus physical-traversal semantics.

## B. Embedded top-down architectural plan

Defines actual:

- room polygons and elevations;
- canonical wall/boundary segments;
- shared-boundary ownership;
- apertures;
- door/gate/portcullis sockets;
- corridor polygons/centerlines;
- floor and ceiling continuity;
- vertical transitions;
- clearance envelopes;
- collision and navigation footprints.

## C. Runtime 3D geometry

Must be derived from the accepted architectural plan.

The runtime is not allowed to reinterpret the graph independently or invent openings after shell construction.

---

# 2. Constructive placement algorithm

## Phase A — Build the logical run

For a seed and route:

1. choose the fixed spine;
2. select 3–5 legal gallery archetypes without replacement;
3. create the ordered node/edge graph;
4. assign each edge exactly one connection type;
5. validate gameplay progression before spatial placement.

## Phase B — Grow the map from the root

Start with the root/fixed room.

For every outgoing edge:

1. select a legal source socket on the already accepted room;
2. select the edge connection type and required clearance;
3. select a compatible destination socket on the next room archetype;
4. calculate the connector/shared-boundary geometry;
5. place the destination room relative to the connector—not at an unrelated slot center;
6. test room/corridor/boundary/elevation collisions;
7. if invalid, try another socket/orientation/room variant;
8. if no legal placement exists, backtrack and choose a different previous placement or seed result;
9. accept the new room only when the entire edge is physically valid.

The map therefore grows as:

```text
room 1
-> build/validate edge 1
-> place room 2 from edge 1
-> build/validate edge 2
-> place room 3 from edge 2
-> ...
```

It must not grow as independent boxes placed first and connected later.

---

# 3. Connection-type semantics

Every logical edge is exactly one of the following.

## A. Direct open adjacency

Two rooms are directly connected with no corridor and no door.

Rules:

- rooms share one canonical boundary segment;
- the connecting span is an aperture, not two overlapping walls;
- neither room emits wall geometry across the opening;
- floor, ceiling, collision and navigation are continuous;
- any elevation change includes a specified threshold, step, ramp or landing.

## B. Door/gate adjacency

Two rooms touch at a shared boundary with a door, gate or portcullis.

Rules:

- one canonical boundary owner;
- one matching aperture through both room shells;
- one portal assembly owner;
- one animation/state owner;
- one collision-state owner;
- jamb/lintel overlap is intentional and within tolerance;
- no hidden duplicate wall behind the portal.

## C. Corridor connection

Rooms are separated and connected by a corridor.

Rules:

- source wall aperture;
- corridor floor/walls/ceiling begin at the source opening;
- corridor reaches the destination opening, not merely its coordinates;
- destination wall aperture;
- continuous player-clear volume;
- continuous floor/elevation profile;
- collision/nav ownership across the whole connector;
- doors/gates, when used, are attached to a named endpoint or corridor section.

## D. Teleport/magical portal edge

The connection intentionally does not use physical corridor geometry.

Rules:

- logical edge is marked `PORTAL_TRANSFER`;
- source and destination anchors are explicit;
- activation, loading/transition and return rules are explicit;
- no fake corridor or door is generated;
- tests prove transfer and progression rather than physical walking.

A portal edge must never be confused with a physical doorway into the next room.

## E. Vertical connection

Stairs, ramp, ladder, lift, drop or other elevation transition.

Rules:

- explicit source and destination elevations;
- continuous transition geometry;
- landing/clearance contract;
- camera and player-capsule proof;
- navigation and collision continuity;
- fall/death semantics where relevant.

---

# 4. Shared-wall ownership

The embedded plan creates canonical boundary IDs before 3D shell extrusion.

For every room perimeter segment, the plan records:

- boundary ID;
- owner room or shared owner;
- adjacent room/outside/corridor;
- wall/opening/portal classification;
- elevation range;
- thickness;
- aperture spans;
- material/trim metadata.

Rules:

- one physical shared wall is emitted once;
- an open shared span emits no wall from either side;
- a portal span emits wall only outside the aperture;
- co-planar duplicate walls are a hard failure;
- overlapping floor and ceiling slabs are unioned or deterministically owned;
- shell generation consumes the boundary inventory rather than drawing four complete walls for every room.

---

# 5. Top-down architectural validation gate

Every seed/route produces a diagnostic top-down image and machine-readable topology record **from the actual embedded geometry**.

The diagnostic must show:

- room footprint polygons and IDs;
- fixed versus randomized rooms;
- wall segments and boundary IDs;
- apertures;
- door/gate/portcullis footprints;
- corridor polygons and centerlines;
- navigation path/clearance envelope;
- floor elevations and vertical transitions;
- intended gameplay graph edges;
- actual physical-edge matches;
- overlap/error overlays.

The image is reviewed by:

1. automated geometry/topology checks;
2. an independent AI/vision reviewer;
3. owner review for major architectural changes or the initial accepted generator design.

The map cannot proceed to 3D dressing until the top-down gate passes.

---

# 6. Required automated invariants

For every accepted run:

```text
requiredLogicalEdges == physicallyResolvedEdges
connectedPhysicalComponents == 1        # excluding explicit portal-transfer components
unintendedRoomOverlaps == 0
unintendedCorridorRoomOverlaps == 0
coincidentDuplicateWalls == 0
wallsCrossingApertures == 0
orphanDoorsOrGates == 0
unmatchedCorridorEndpoints == 0
corridorsEndingAtIntactWalls == 0
missingDestinationApertures == 0
minimumPlayerClearanceFailures == 0
floorContinuityFailures == 0
ceilingContinuityFailures == 0
collisionContinuityFailures == 0
navigationContinuityFailures == 0
unsupportedElevationTransitions == 0
```

Additional requirements:

- every room is reachable from the run start unless intentionally secret/locked and explicitly modeled;
- every required progression node is reachable in order;
- exactly one legal route reaches convergence after route choice;
- direct adjacency, corridor and portal edges are not confused;
- both Wayfarer and Oathbreaker satisfy the same physical rules;
- seed sweeps reject or backtrack invalid arrangements rather than accepting and patching them visually.

---

# 7. Visual/runtime proof

A passing top-down plan is necessary but not sufficient.

After 3D generation:

- walk every edge with WASD;
- traverse every physical edge with click-to-move;
- inspect source opening, connector midpoint/bend and destination opening;
- inspect both sides of every portal/gate;
- inspect room shell, floor and ceiling;
- verify collision matches open/closed state;
- capture the actual renderer geometry, not only a debug graph;
- do not use room warp as traversal evidence.

The prior #451 failure—an open gate with intact wall geometry behind it—is a permanent regression case.

---

# 8. Fix strategy for existing BREACH-V2

Issue #451 is a repair, not a content reset.

The worker must:

1. preserve accepted room archetypes, registry content, art and gameplay rules;
2. audit the current slot-center/box-shell generator for root-cause failures;
3. introduce an authoritative physical topology/connection manifest;
4. make shell generation consume canonical boundaries/apertures;
5. replace post-hoc corridor attachment with constructive edge placement where required;
6. keep deterministic seed behavior;
7. regenerate committed fixtures only after the new topology gate passes;
8. compare before/after top-down maps and continuous runtime traversal;
9. avoid unrelated decorative redesign until topology is verified.

If a minimal patch cannot guarantee the invariants, a focused generator refactor is allowed. “Do not rebuild” means preserve the level design and accepted content—not preserve a flawed room-box assembly algorithm.

---

# 9. State and evidence

Store per generated run:

- logical graph;
- selected room archetypes;
- placement attempts/backtracking decisions;
- room transforms;
- canonical boundaries;
- connection records;
- topology metrics;
- diagnostic plan image;
- automated report;
- AI review;
- runtime evidence;
- verifier status.

Use `config/dungeon-topology-policy.json` and `templates/dungeon-topology-record.template.json`.

## Done rule

A randomized dungeon is not complete when the boxes appear in roughly the right places.

It is complete when every accepted seed produces a coherent top-down architectural plan, one non-overlapping shared shell, physically resolved edges, continuous traversal, and independent proof.