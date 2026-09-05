# SoulDrifter Spatial Connection and Traversal Catalog

## Purpose

SoulDrifter levels are not limited to rectangular rooms connected by doors.

A generated or authored **spatial node** may be:

- a room, chamber, hall, corridor or stairwell;
- a cavern, shaft, tower, bridge or platform field;
- a water basin, flooded tunnel, submerged cave or air pocket;
- a forest, swamp, desert, city district or other biome contained inside a dungeon;
- a large labyrinth, hub, arena or living-world region;
- a moving, rotating, collapsing or transforming dungeon section;
- an exterior zone, vehicle interior or streamed sub-area.

Every transition between spatial nodes must use an explicit connection contract. The generator must never assume that every edge is a normal doorway or corridor.

## Current First Breach clarification

The current First Breach / issue #451 contains **no magical teleport or portal-transfer connection**.

Its route gates, doors, corridors, stairs/landings and the walk-through Soulwell water veil are physical thresholds inside one continuous navigable level. A variable, mesh, effect or developer label containing the word `portal` does not make the edge a teleport.

For #451, use only the connection types explicitly allowed in `config/spatial-connection-policy.json`.

---

# 1. Spatial-node types

## Enclosed architectural spaces

- room/chamber;
- hall/gallery;
- corridor/passage;
- stairwell/ramp hall;
- cellar/crypt;
- tower/shaft;
- cavern/undercroft.

## Large indoor or biome spaces

- mega-room or arena;
- labyrinth/maze region;
- underground forest or jungle;
- flooded cavern;
- ruined city district inside a dungeon;
- living ecosystem or pocket world;
- multi-level vertical complex;
- hub with streamed subregions.

A large biome region is not modeled as one oversized rectangular room. It uses terrain/volume boundaries, landmarks, routes, streaming cells and local subgraphs.

## Dynamic or living-dungeon spaces

- rotating room cluster;
- moving walls;
- expanding chamber that opens into a biome;
- collapsing or rebuilding passage;
- topology that changes after a puzzle, boss or world-state event;
- looping/non-Euclidean region;
- living organic passage that grows or closes.

Dynamic topology requires a state graph in addition to the spatial graph.

---

# 2. Connection taxonomy

## A. Ground and architectural connections

### `DIRECT_OPEN_ADJACENCY`

Two spaces share a continuous open span.

- one canonical shared boundary;
- no wall across the opening;
- continuous floor/ceiling/collision/navigation;
- explicit width and clearance.

### `DOOR_GATE_THRESHOLD`

A door, gate, portcullis, hatch or shutter controls a physical opening.

- one aperture owner;
- one geometry/animation/state/collision owner;
- open and closed clearance proof;
- no hidden duplicate wall.

### `PHYSICAL_CORRIDOR_OR_PASSAGE`

A corridor, tunnel, bridge passage or connector physically joins separated spaces.

- source aperture;
- continuous connector surface/volume;
- destination aperture;
- clear floor, ceiling, collision and navigation;
- endpoint ownership and elevation contract.

### `CRAWLSPACE_SQUEEZE_OR_VENT`

The player crouches, crawls, squeezes or moves through a narrow passage.

- entry/exit animation and state change;
- capsule/profile change;
- camera rules;
- interruption/combat rules;
- AI eligibility;
- stuck/recovery handling.

### `SECRET_OR_DESTRUCTIBLE_PASSAGE`

A hidden panel, breakable wall, burrow, cave-in or removable obstruction reveals a physical route.

- pre-open and post-open topology states;
- destruction/reveal ownership;
- debris and collision cleanup;
- save/reload persistence;
- alternate-route and soft-lock checks.

### `PUZZLE_LOCKED_PHYSICAL_CONNECTION`

A mechanism, rune, pressure plate, lever or encounter unlocks a normal physical route.

The puzzle state does not excuse missing physical geometry after unlock.

---

## B. Vertical and climbing connections

### `STAIRS_RAMP_OR_LANDING`

- explicit rise/run, width, slope and landing;
- floor continuity;
- controller, camera and nav proof;
- no unexplained step or overlapping slab.

### `LADDER_CLIMB_OR_MANTLE`

Includes ladders, climbable walls, ledges, vines, chains and tree trunks.

- climb spline/surface and attach points;
- mount, loop, dismount and top-out animations;
- hand/foot clearance;
- stamina/resource rules when used;
- one-way/bidirectional declaration;
- fall, interruption and recovery behavior;
- AI traversal support or exclusion.

### `ROPE_SWING_ZIPLINE_OR_GRAPPLE`

- anchor ownership;
- path/spline;
- attach/detach rules;
- velocity and fall handling;
- camera and animation;
- return-path or one-way semantics.

### `LIFT_ELEVATOR_OR_MOVING_PLATFORM`

- platform path and timing;
- boarding/exiting clearance;
- player/AI parenting or velocity transfer;
- collision throughout motion;
- call/state/power rules;
- save/reload synchronization.

### `ONE_WAY_DROP_SHAFT_OR_SLIDE`

- explicit one-way flag;
- landing safety or damage/death rules;
- no accidental route backtracking requirement;
- camera/streaming transition;
- recovery if the player enters early.

---

## C. Gap and platform traversal

### `JUMP_GAP_OR_MANTLE_CHAIN`

- takeoff/landing regions;
- minimum/maximum jump envelope;
- failure volume and recovery;
- mobile-input usability;
- AI path classification;
- no progression-critical jump that depends on undocumented physics variance.

### `STATIC_BRIDGE_BEAM_OR_BALANCE_PATH`

- width and rail/fall rules;
- camera readability;
- collision and nav;
- destruction/state variants when applicable.

### `MOVING_PLATFORM_SEQUENCE`

- synchronized platform graph;
- timing windows;
- checkpoint/failure recovery;
- deterministic behavior in both combat schedulers where relevant.

---

## D. Aquatic connections

### `WADE_OR_SHALLOW_WATER_PATH`

- water depth profile;
- movement-speed and animation change;
- floor collision remains authoritative;
- current/hazard rules;
- no hidden drop into deep-water state.

### `SURFACE_SWIM_CONNECTION`

- swimmable volume and surface height;
- enter/exit shoreline or ladder points;
- buoyancy and surface movement;
- camera above/below surface;
- combat/interaction rules;
- AI swim support.

### `UNDERWATER_TUNNEL_OR_CAVE`

- fully modeled water volume;
- entry and exit volumes;
- underwater movement/camera/lighting/fog;
- oxygen or breath system;
- drowning/failure/recovery;
- current and obstruction rules;
- exact destination emergence point;
- save/reload inside the water volume.

### `DIVE_SHAFT_WITH_AIR_POCKETS`

A submerged route may include intermediate breathable pockets.

Each air pocket is its own spatial node with:

- breathable-volume bounds;
- reliable head-above-water region;
- entry/exit clearance;
- oxygen reset/refill behavior;
- camera and animation transition;
- no geometry that traps the player at the surface.

### `CURRENT_WATERFALL_OR_WATER_SLIDE`

- direction and force field;
- upstream/downstream permissions;
- player-control authority;
- collision, damage and recovery;
- transition into/out of swimming or ground movement;
- one-way declaration when appropriate.

### `BOAT_RAFT_OR_WATER_TRANSPORT`

- embark/disembark points;
- route spline/steering rules;
- player and companion attachment;
- combat and collision rules;
- sinking/failure handling;
- streaming and save state.

---

## E. Large-zone and biome transitions

### `SEAMLESS_BIOME_TRANSITION`

A passage may open from masonry dungeon space into a forest, cavern ecosystem, ruined city, swamp or other large world-like region.

- source threshold and destination biome boundary;
- terrain/volume continuity;
- lighting, weather, audio and material transition;
- streaming-cell boundaries;
- navigation and landmark graph;
- camera and draw-distance changes;
- return route and save state.

### `LABYRINTH_OR_MEGA_ZONE_GRAPH`

A huge zone is represented as a graph of subregions, landmarks, routes, loops, vertical layers and hazards—not one room rectangle.

Required:

- region-level topology;
- local subgraphs;
- loop/shortcut/lock semantics;
- streaming and culling plan;
- navigation hierarchy;
- map/minimap policy;
- spawn and encounter ownership;
- complete route and escape proof.

### `LIVING_DUNGEON_TRANSFORMATION`

A room or passage can unfold into a forest, reorganize into a maze or change its topology.

Required:

- before/after spatial graphs;
- transition animation and timing;
- player/AI relocation safety;
- collision/nav swap atomicity;
- persistence and multiplayer/state synchronization;
- no player entrapment;
- evidence for every reachable state.

---

## F. Transport and nonphysical transfer

### `VEHICLE_RAIL_MINECART_OR_MOUNT_ROUTE`

- boarding state;
- route/steering;
- collision and derail/failure handling;
- camera/input;
- streaming and save state;
- dismount/return path.

### `STREAMING_OR_LOADING_BOUNDARY`

A physical doorway, tunnel, elevator or horizon may cross a loading boundary.

The loading implementation is separate from the visible connection. The source and destination still require coherent spatial/state semantics.

### `PORTAL_TRANSFER`

A true magical, technological or nonphysical transfer.

- explicit source and destination anchors;
- activation and eligibility;
- arrival orientation/clearance;
- return or one-way semantics;
- loading/streaming/save/network behavior;
- no fake physical corridor.

This type is available for future SoulDrifter zones but is **not used in the current First Breach**.

### `NON_EUCLIDEAN_OR_LOOPING_CONNECTION`

- explicit topology/state model;
- entry/exit mapping;
- orientation and transform rules;
- minimap/navigation policy;
- deterministic save/reload;
- proof that the player cannot become irrecoverably lost due to implementation errors rather than intended design.

---

# 3. Required connection contract

Every edge records:

- source node and destination node;
- connection type;
- physical versus nonphysical;
- movement mode(s);
- medium: air, shallow water, deep water, current, climb surface, moving platform, etc.;
- directionality and one-way/bidirectional state;
- lock/puzzle/encounter/world-state requirements;
- geometry, aperture, path, surface or volume definition;
- floor/ceiling/volume continuity;
- collision and navigation ownership;
- controller state transitions;
- animations and event markers;
- camera behavior;
- player resources such as stamina or oxygen;
- hazards, failure and recovery;
- AI/companion traversal support;
- combat/interactions allowed during traversal;
- save/reload and persistence;
- streaming/loading behavior;
- multiplayer/network synchronization when applicable;
- accessibility/mobile-input considerations;
- evidence and verifier result.

Use `config/spatial-connection-policy.json` and `templates/spatial-connection-record.template.json`.

---

# 4. Diagnostic requirements

A top-down map is sufficient only for primarily horizontal ground connections.

Use the appropriate evidence:

- **plan/top-down:** horizontal rooms, corridors, roads, biome boundaries;
- **section/elevation:** stairs, ramps, ladders, climbs, drops, lifts and layered labyrinths;
- **3D volume/slice:** water volumes, underwater tunnels, air pockets, currents, volumetric hazards;
- **state sequence/timeline:** moving platforms, transforming/living dungeons, destructible or puzzle-switched topology;
- **streaming map:** mega-zones, biome pockets and large labyrinths.

The diagnostic must come from the actual solved geometry/volumes/state data, not a separate concept drawing.

---

# 5. Verification rule

The verifier must use the real movement mode for each edge:

- walk/click-to-move for ground routes;
- crouch/crawl for narrow passages;
- climb/mantle/ladder controls for vertical routes;
- jump or platform timing for gap routes;
- swim/dive controls and oxygen behavior for aquatic routes;
- ride/board controls for transport;
- activation/arrival checks for true transfer edges.

Debug warp never proves a connection.

A connection is complete only when its spatial geometry/volume, movement state, camera, collision, navigation, animation, resources, hazards, persistence and recovery all pass independent verification.