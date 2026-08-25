# SoulDrifter #451 / PR #460 — Fix Existing BREACH-V2

## Mission

Continue and fix the existing BREACH-V2 implementation. Preserve accepted First Breach content, room archetypes, art direction, environmental staging, gameplay and progression, but repair and verify the procedural generator, collision and environment-interaction architecture at their roots.

The environment portion of the ticket is complete only when the player can travel continuously from Soul Well/vestibule through the selected route, 3–5 connected gallery spaces, Cinderbound Warden, First Memory and the Heartvale exit **inside the complete staged environment**, with correct collision, interactions and destruction.

This is not a replacement level and is not #448 character/monster production.

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
- `ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`
- `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
- `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
- `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
- `config/zone-environment-completion-policy.json`
- `config/dungeon-topology-policy.json`
- `config/spatial-connection-policy.json`
- the matching record templates
- `BROWSER_RUNTIME_ROADMAP.md`
- live ticket/PR comments and current implementation files

SEA playbooks govern workflow. SKY contains runtime implementation/data/assets/tests.

---

# Route selection triggers topology generation

The corrected lifecycle is:

```text
PRE-CHOICE
load/render only fixed Soul Well + vestibule + Threshold Plaza

PLAYER CHOOSES WAYFARER OR OATHBREAKER
-> lock seed + selected path
-> choose 3–5 legal room archetypes/order
-> build selected-route logical graph
-> assign explicit physical connection contracts
-> solve complete selected-route topology
-> place each next space from a validated source socket/connection
-> resolve canonical shared walls, apertures, corridors and elevations
-> run overlap, clearance, continuity and reachability checks
-> retry/backtrack when invalid
-> freeze accepted route topology

ONLY AFTER TOPOLOGY PASSES
-> generate/render one shared shell and interiors
-> derive structural collision/navigation intent
-> place/freeze environmental staging
-> run prop-complete collision walkthrough
-> repair/verify collision
-> verify interaction/pickup/destruction
-> run final integrated environment walkthrough
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
6. validate overlap, floor/ceiling, player clearance, structural collision/navigation and elevation;
7. accept the destination only when the entire edge passes;
8. otherwise retry or backtrack.

Do not place rooms at unrelated slot centers and connect coordinates afterward.

---

# Current First Breach connection types

The current First Breach contains **no magical teleport or `PORTAL_TRANSFER` edge**.

The word `portal` may still appear in old code, mesh names or visual-effect names. In this level it means a physical threshold/gate unless an explicit transfer contract says otherwise.

Allowed current connection families:

- `DIRECT_OPEN_ADJACENCY`;
- `DOOR_GATE_THRESHOLD`;
- `PHYSICAL_CORRIDOR_OR_PASSAGE`;
- `STAIRS_RAMP_OR_LANDING`;
- the Soulwell exit water veil as a doorless physical walk-through effect threshold.

Future zones may use swimming, underwater tunnels, air pockets, climbing, mega-zones, biome pockets, living-dungeon transformations or true portal transfers, but those are not part of #451 unless separately authorized.

---

# Canonical shared-boundary and topology gate

The accepted topology creates canonical boundary IDs before shell rendering.

- a closed shared wall renders once;
- an open span renders no wall;
- a door/gate span renders wall only outside its aperture;
- duplicate co-planar walls are forbidden;
- floors/ceilings have deterministic shared ownership or union;
- shell generation consumes the boundary inventory.

For every tested seed/path, generate diagnostics from actual solved topology showing space polygons, boundaries, openings/gates, corridor geometry, clearance/nav, elevation, physical edge resolutions and errors.

Use section/elevation details wherever plan view cannot prove vertical clearance.

Invalid arrangements retry/backtrack/reject; they are not hidden with darkness, fog, doors or props.

---

# Existing First Breach staging must be audited and frozen

The current branch already contains extensive environmental staging:

- chests and containers;
- crates, barrels and furniture;
- statues and cover;
- paintings, banners and wall fixtures;
- cages, chains, remains and dungeon dressing;
- lighting, water and FX fixtures.

Do **not** restart or remove valid staging merely to follow the new sequence.

Instead:

1. audit every current placement against `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`;
2. preserve valid placements;
3. fix only floating, intersecting, obstructive, semantically wrong or unclassified objects;
4. assign every object a collision, interaction and destruction class;
5. freeze the accepted staged environment before the collision walkthrough.

The level should read as a believable dungeon, not an empty shell or random asset scatter.

---

# Prop-complete collision gate

A nav graph or empty-shell walk is not sufficient.

Walk the actual playable character/controller through the **fully staged level** and identify:

- walls, statues, chests, boxes, furniture or fixtures with missing collision;
- invisible blockers;
- collider/mesh mismatch;
- door/gate state mismatch;
- tunneling;
- camera clipping;
- props that trap or obstruct the player;
- WASD versus click-to-move disagreement;
- largest-body visual clipping.

Test both positive and negative collision:

- objects that should block must block;
- openings, stairs, corridors, interaction approaches and destroyed footprints must remain clear.

After repairs, repeat the complete route and all representative prop probes.

---

# Interaction, pickup and destruction gate

Minimum required proof:

- open a chest/coffer and receive one deterministic test item exactly once;
- verify open-state lid/collision clearance;
- pick up a dropped item once without duplication;
- operate doors/gates through their intended state;
- break representative crates/boxes, barrels/furniture and allowed wall-mounted props;
- verify destroyed collision clears;
- verify debris cannot soft-lock the route;
- verify protected iron/structural/progression objects reject damage;
- verify save/reload preserves open, looted and destroyed states;
- verify browser/mobile debris and performance budgets.

SoulDrifter uses a maximum-destructibility direction:

- ordinary nonstructural props are destructible/detachable when practical;
- chests are interactable first and may use an explicit break-after-empty rule;
- iron/steel structures, structural shell and progression-critical doors/mechanisms are protected by default;
- quest/story destruction requires explicit `QUEST_DESTRUCTIBLE` state.

Every object needs a working interaction/destruction contract or a documented protection/noninteraction reason.

---

# Final integrated environment walkthrough

After collision and interaction/destruction pass, run the complete staged level with all systems active.

For Wayfarer and Oathbreaker:

- traverse every physical edge with WASD;
- traverse every physical edge with click-to-move;
- inspect source aperture, connector midpoint/bend and destination aperture;
- inspect both sides of stateful gates/doors;
- inspect floors, walls, ceilings and prop clusters;
- interact with representative containers and pickups;
- destroy representative objects from every allowed class;
- verify protected objects;
- complete at least one no-warp run through boss, First Memory and exit;
- save/reload after interaction/destruction;
- test desktop and representative mobile/narrow viewport;
- use real GPU/ANGLE D3D11 for final evidence;
- record performance and console/state errors.

The prior open-gate/intact-wall failure and the newly discovered pass-through-prop collision failure are permanent regression cases.

---

# Separate population/gameplay ticket boundary

After the environment package is independently verified, use a separate ticket for:

- NPC and monster spawning;
- patrols and AI routes;
- random encounters and respawn;
- encounter composition and combat pacing;
- quest actors, objectives and dialogue;
- production loot/drop tables;
- population persistence/network behavior.

The later ticket consumes verified environment sockets, paths and interaction APIs. It may not silently move props or weaken collision. Any environment change reopens the affected environment gate.

Existing minimal boss/progression content required to finish the current MVP remains in #451. Do not expand new random encounters, population systems or quest scope merely to complete the environment correction.

---

# Work order

```text
Phase -1  cached session fast-start
Phase 0   current-generator, topology and existing-staging audit
Phase 1   route-selection graph/topology solver
Phase 2   canonical boundaries, apertures, corridors and shared shell
Phase 3   audit/fix/freeze existing prop placement
Phase 4   prop-complete character walkthrough and collision defect inventory
Phase 5   collision repair and full regression
Phase 6   chest/pickup/destruction/protected-object implementation and proof
Phase 7   final integrated environment walkthrough
Phase 8   independent core-environment verification
Phase 9   complete required MVP boss/First Memory/exit proof
FINAL     chained-skeleton Tripo/Houdini/Blender pilot after exact spend approval
Phase 11  independent pilot/full regression
LATER     separate population/random-encounter/quest ticket
```

The chained-skeleton pilot remains last and cannot delay topology, staging, collision or interaction verification.

Babylon.js work is outside #451. After First Breach and the first playable Heartvale section are complete/verified in Three.js, a separate isolated Babylon.js port may compare exactly those two sections.

---

# Copy/paste instruction for a future/resumed worker

```text
Read the latest #451 kickoff and these policies:
- ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md
- ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md
- COLLISION_INTERACTION_DESTRUCTION_POLICY.md
- PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md
- SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md

For this ticket:
1. preserve/finalize the selected-route topology and shared shell;
2. audit and freeze the existing prop-complete staging;
3. walk the actual playable character through the fully staged zone;
4. produce the collision-defect inventory;
5. repair and regression-test positive/negative collision;
6. prove chest opening, pickup, destruction and protected objects;
7. run the final integrated no-warp walkthrough;
8. stop at IMPLEMENTED_UNVERIFIED for independent review.

Do not use an empty-shell walk, nav graph, coordinates or survey warp as final proof.
Do not expand random encounters or quest population inside this environment correction.
Do not merge or deploy.
```
