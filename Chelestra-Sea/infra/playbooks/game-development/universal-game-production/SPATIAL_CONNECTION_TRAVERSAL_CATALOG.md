# Universal Spatial Connection and Traversal Catalog

## Purpose

A game level is a graph of playable **spatial nodes**, not necessarily a set of rectangular rooms.

A node may be:

- a room, hall, corridor, cavern or shaft;
- a climb surface, bridge, moving platform or vertical complex;
- a water body, flooded tunnel, submerged cave or air pocket;
- a forest, city, swamp, biome pocket or open-world region inside another space;
- a labyrinth, arena, hub or streamed mega-zone;
- a moving, transforming, looping or non-Euclidean state;
- a vehicle, transport route or instanced sub-area.

Every edge between nodes requires an explicit traversal contract. Projects select the relevant types through their profile/overlay.

---

# Connection families

## 1. Ground and architectural

- `DIRECT_OPEN_ADJACENCY`
- `DOOR_GATE_THRESHOLD`
- `PHYSICAL_CORRIDOR_OR_PASSAGE`
- `CRAWLSPACE_SQUEEZE_OR_VENT`
- `SECRET_OR_DESTRUCTIBLE_PASSAGE`
- `PUZZLE_LOCKED_PHYSICAL_CONNECTION`

These define real openings, shared boundaries, floor/ceiling continuity, collision/navigation, state ownership and player clearance.

## 2. Vertical and climbing

- `STAIRS_RAMP_OR_LANDING`
- `LADDER_CLIMB_OR_MANTLE`
- `ROPE_SWING_ZIPLINE_OR_GRAPPLE`
- `LIFT_ELEVATOR_OR_MOVING_PLATFORM`
- `ONE_WAY_DROP_SHAFT_OR_SLIDE`

These require source/destination elevation, attach/mount/dismount rules, animation, camera, fall/recovery, directionality and AI support.

## 3. Gap and platform traversal

- `JUMP_GAP_OR_MANTLE_CHAIN`
- `STATIC_BRIDGE_BEAM_OR_BALANCE_PATH`
- `MOVING_PLATFORM_SEQUENCE`

These require reachable movement envelopes, failure volumes, timing, mobile-input usability, checkpoints/recovery and deterministic physics tolerances.

## 4. Aquatic

- `WADE_OR_SHALLOW_WATER_PATH`
- `SURFACE_SWIM_CONNECTION`
- `UNDERWATER_TUNNEL_OR_CAVE`
- `DIVE_SHAFT_WITH_AIR_POCKETS`
- `CURRENT_WATERFALL_OR_WATER_SLIDE`
- `BOAT_RAFT_OR_WATER_TRANSPORT`

Aquatic edges require water/depth/air volumes, entry/exit points, swim/dive controls, camera/lighting/fog, oxygen/drowning, current/force, air-pocket behavior, save/reload and recovery.

An air pocket is a spatial node with explicit breathable volume, reliable head-above-water region and oxygen-reset behavior.

## 5. Large-zone, biome and living-world transitions

- `SEAMLESS_BIOME_TRANSITION`
- `LABYRINTH_OR_MEGA_ZONE_GRAPH`
- `LIVING_DUNGEON_TRANSFORMATION`

A room may open into a forest, cavern ecosystem, city, swamp or other world-like region. Such a region uses terrain/volume boundaries, region graphs, landmarks, streaming cells and local subgraphs—not one oversized room rectangle.

Dynamic/living topology requires before/after graphs, atomic collision/navigation swaps, player/AI relocation safety, persistence and state synchronization.

## 6. Transport, streaming and nonphysical transfer

- `VEHICLE_RAIL_MINECART_OR_MOUNT_ROUTE`
- `STREAMING_OR_LOADING_BOUNDARY`
- `PORTAL_TRANSFER`
- `NON_EUCLIDEAN_OR_LOOPING_CONNECTION`

A true transfer is explicitly nonphysical and creates no fake corridor. A loading boundary is implementation metadata layered onto a coherent visible or nonphysical connection.

---

# Required edge contract

Every connection records:

- source and destination nodes/types/states;
- connection type;
- physical or nonphysical;
- movement mode(s);
- traversal medium;
- directionality;
- lock/puzzle/encounter/equipment/ability/world-state requirements;
- geometry, aperture, surface, path, spline or volume;
- clearance, elevation/depth and endpoint ownership;
- collision and navigation ownership;
- controller state transitions;
- animations and event markers;
- camera behavior;
- stamina, oxygen or other resource rules;
- hazards, failure and recovery;
- AI/companion eligibility;
- combat and interaction rules;
- save/reload and persistence;
- streaming/loading;
- network synchronization where applicable;
- accessibility and mobile-input requirements;
- evidence and independent-verifier status.

Use:

- `config/spatial-connection-policy.json`;
- `templates/spatial-connection-record.template.json`.

---

# Diagnostic requirements

Use diagnostics generated from actual solved data:

- **top-down plan:** horizontal routes, roads, rooms and region boundaries;
- **section/elevation:** stairs, ramps, climbs, drops, lifts and layered spaces;
- **3D volume/slice:** water, underwater tunnels, air pockets and volumetric hazards;
- **state graph/timeline:** moving platforms, destructible routes, transformations and living topology;
- **region/streaming map:** mega-zones, biome pockets, labyrinths and open-world regions.

A concept image, navigation graph or debug warp is not sufficient physical proof.

---

# Verification

The verifier uses the real movement mode and failure/recovery path:

- walk/click-to-move;
- crouch/crawl;
- climb/mantle/ladder;
- jump/platform/rope;
- swim/dive/oxygen/air pockets;
- vehicle/transport;
- transfer activation/arrival when applicable.

The edge is complete only when geometry/volumes, controller state, camera, animation, collision, navigation, resources, hazards, persistence and recovery pass on the target runtime/device.