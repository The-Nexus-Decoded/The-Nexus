# SoulDrifter Collision, Interaction, and Destruction Policy

## Purpose

A connected topology, a complete prop layout and a reachable navigation graph do not prove that a level is playable.

After the staged environment is frozen, every SoulDrifter zone must prove three separate runtime systems:

```text
PROP-COMPLETE WALKTHROUGH / COLLISION DISCOVERY
-> COLLISION IMPLEMENTATION AND REGRESSION
-> INTERACTION / PICKUP / DESTRUCTION
-> FINAL INTEGRATED ENVIRONMENT WALKTHROUGH
```

This prevents three false positives:

1. the route exists, but the player passes through visible walls, statues, chests, crates or furniture;
2. the player reaches an object, but opening, pickup or activation does not work;
3. an object looks breakable, but has no damage, destruction, collision-update or persistence state.

Topology, navigation, collision, interaction and destruction require separate proof.

---

# 1. Gate order

## Gate A — Topology and connection

The accepted topology defines shared boundaries, apertures, connectors, surfaces, volumes, movement modes and intended collision/navigation ownership.

## Gate B — Environment staging

All structural fixtures, furniture, props, containers, wall/ceiling objects, cover and environmental storytelling required for the level ticket are placed and classified.

## Gate C — Prop-complete walkthrough and collision discovery

Walk the actual playable character/controller through the fully staged environment.

The purpose is to discover:

- visible solids with missing collision;
- invisible colliders blocking clear space;
- collider/mesh mismatch;
- tunneling at doors, gates, stairs and thin props;
- camera clipping;
- prop layouts that prevent passage or trap the player;
- walk/click-to-move disagreement;
- body-size or animation clipping.

The first walkthrough is a defect-finding pass, not final acceptance.

## Gate D — Collision implementation and regression

Repair collision classes, shapes, layers, transforms, state synchronization and placement defects. Then repeat all required routes and object probes.

## Gate E — Interaction, pickup and destruction

Implement and test every object state required by the environment ticket.

## Gate F — Final integrated environment walkthrough

Run the complete staged level with final collision, interactions and destruction enabled. This pass must show that all systems work together without opening new route, camera, performance, save or soft-lock defects.

Only after Gate F is independently verified may the environment package be handed to a separate zone-population/gameplay ticket.

---

# 2. Required collision profiles

Test the profiles actually used in the zone:

- canonical playable-character capsule/controller;
- largest supported playable body/build visual profile when its mesh could clip despite a shared capsule;
- representative humanoid NPC/companion capsule when those actors traverse the route;
- representative large-monster capsule when large enemies use shared passages;
- third-person and close-camera collision profiles;
- melee sweep, projectile and physics-prop layers when interaction/destruction requires them.

Playable body variants should normally share a stable gameplay capsule. When traversal sizes intentionally differ, every affected connection records which profiles can pass.

The visible model and gameplay collider must remain aligned. A small invisible capsule passing while a large body clips through the wall is a failure.

---

# 3. Positive and negative collision proof

Every collision pass proves both directions.

## Positive collision

Visible solids that should block must stop the appropriate profile:

- walls and closed boundaries;
- columns, statues and structural fixtures;
- closed chests/cabinets when authored as solid;
- crates, barrels, furniture and cover;
- closed doors, gates and portcullises;
- terrain, floors, ceilings and stair/ramp limits;
- protected machinery and quest structures.

## Negative collision

Clear space must remain clear:

- open door and gate apertures;
- intended corridors and room connections;
- stairs, ramps and landings;
- gaps beneath raised gates;
- walk-through effects such as the First Breach Soulwell exit veil;
- areas where a destroyed object has been removed;
- interaction approach zones;
- pickup areas;
- camera corridors and combat lanes.

Passing positive collision while leaving invisible blockers is not acceptable.

---

# 4. Runtime collision classes

Every object receives one explicit class.

## `STRUCTURAL_SOLID`

Walls, floors, ceilings, permanent pillars, terrain, cavern shell, stairs, ramps and load-bearing architecture.

- blocks intended layers;
- collider matches visible geometry within tolerance;
- never extends across a declared opening;
- protected unless a separate authored state changes the topology.

## `STATEFUL_THRESHOLD`

Doors, portcullises, gates, hatches and shutters.

- closed visual and closed collision agree;
- opening animation and collision transition remain synchronized;
- open state clears the complete required passage envelope;
- no stale collider remains;
- no early collider removal allows a player through a visibly closed threshold.

## `INTERACTABLE_CONTAINER`

Chests, coffers, cabinets, reliquaries, caches and searchable remains.

- valid approach/interaction volume;
- authored intact/open/empty/destroyed states as applicable;
- lid/door animation does not trap the player;
- collider updates with state;
- contents transfer exactly once.

## `DESTRUCTIBLE_SOLID_PROP`

Crates, barrels, wooden furniture, pottery, bone piles, noncritical barricades, breakable cover and detachable wall props.

- blocks while intact when appropriate;
- receives approved damage/contact events;
- enters authored damaged/broken state;
- removes or changes collision safely;
- debris cannot permanently block a required route;
- cleanup and persistence are deterministic.

## `PROTECTED_PROP_OR_STRUCTURE`

Iron/steel structural objects, progression-critical doors, permanent shell, required quest mechanisms and objects whose destruction would soft-lock progression.

- not freely destructible;
- impact feedback may still play;
- protection reason is explicit;
- may transition to `QUEST_DESTRUCTIBLE` when authorized.

## `QUEST_DESTRUCTIBLE`

Protected until a named quest, puzzle, encounter, world state, item or ability enables destruction.

The allowed damage source, replacement geometry, collision update, progression result and save/reload state are explicit.

## `PICKUP_TRIGGER`

Dropped gear, keys, currency, consumables and quest items.

- not an unintended solid obstacle;
- range/overlap/line-of-sight rules are defined;
- transfers once;
- disappears or changes state immediately;
- cannot duplicate through save/reload or repeated interaction.

## `SOFT_OR_COSMETIC_NONBLOCKING`

Small foliage, cloth strips, particles, harmless chains, tiny debris and purely visual effects.

Noncollision is intentional and recorded; it is not an implementation omission.

## `HAZARD_OR_SPECIAL_VOLUME`

Fire, poison, deep water, currents, fall/death zones, climb volumes and trigger regions.

The volume's movement/state transition, damage/effect, entry/exit, persistence and recovery behavior are explicit.

---

# 5. Maximum-destructibility rule

SoulDrifter uses a **maximum-destructibility environment**.

This does not mean every wall, floor, iron gate or quest-critical door is breakable. The binding rule is:

> Every placed environmental object must either have a working interaction/destruction contract or an explicit documented reason why it is protected or intentionally noninteractive.

Default direction:

- wooden boxes, crates, barrels, furniture, pottery, bones, loose debris and noncritical cover: destructible;
- noncritical wall-mounted paintings, banners, shelves, sconces, chains, cages and fixtures: destructible or detachable when performance and art constraints permit;
- chests/coffers: interactable containers first; commonly protected until opened/looted, with optional break-after-empty behavior defined by the zone;
- iron/steel structural props: protected unless an authored high-force, quest or special-ability rule applies;
- progression doors, gates, mechanisms and structural shell: protected by default;
- quest/story destruction: implemented through explicit `QUEST_DESTRUCTIBLE` state, never by globally enabling damage on progression geometry.

Indestructible-looking objects and destructible-looking objects should communicate their state consistently through material, feedback and interaction prompts.

---

# 6. Interaction contracts

Every interactable records:

- interaction ID and prompt;
- approach volume and maximum range;
- line-of-sight/facing requirements;
- usable movement/combat states;
- animation and event markers;
- audio/VFX feedback;
- authoritative state machine;
- collision changes;
- inventory/loot/result;
- repeated-use behavior;
- save/reload persistence;
- multiplayer authority when applicable;
- mobile/touch input behavior;
- failure and recovery behavior.

Required common tests include:

- open a chest and receive one test item;
- open-state collision and lid clearance;
- pick up a dropped item once;
- operate a non-destructible door/gate through its intended state;
- activate a lever, mechanism or searchable fixture when present;
- verify prompt selection when multiple objects overlap.

---

# 7. Destruction contracts

Every destructible records:

- durability/health or break trigger;
- allowed damage/contact sources;
- resistance/material class;
- intact, damaged and destroyed visual states;
- fracture/debris strategy;
- collision update timing;
- loot/drop behavior;
- audio/VFX/animation markers;
- nav/path update when applicable;
- cleanup lifetime and pooling;
- save/reload persistence;
- respawn/reset rules;
- network authority when applicable;
- route/quest soft-lock analysis.

Destruction must never leave an invisible intact collider or remove collision while the intact object remains visible.

For mobile/browser performance, use bounded debris counts, pooling, LOD/culling and deterministic cleanup rather than unlimited physics fragments.

---

# 8. Prop-complete collision test matrix

At minimum, test:

```text
all structural walls and corners
all room/corridor apertures
all doors/gates closed and open
all stairs/ramps/landings
all large statues and furniture
all chests/cabinets
all crates/barrels/barricades
all wall and hanging fixtures near the player
all cover lanes and combat centers
all hidden/secret candidate boundaries
all destroyed-object cleared footprints
all camera pinch points
all route-critical interaction approaches
```

Test with:

- WASD/controller movement;
- click-to-move;
- sprint when supported;
- camera rotation/zoom;
- representative animation states;
- desktop and narrow/mobile viewport;
- real GPU for final evidence.

---

# 9. Final integrated environment walkthrough

The final pass uses the complete intended environment package and proves:

1. topology and all physical connections remain correct;
2. navigation reaches every required environment destination;
3. visible solids block and intended openings remain clear;
4. no staged prop causes clipping, trapping or camera failure;
5. representative chests/containers open and transfer contents once;
6. representative pickups work and do not duplicate;
7. every destructible category breaks correctly;
8. protected objects reject damage without becoming confusing;
9. destroyed colliders clear and debris does not soft-lock the route;
10. save/reload preserves open, looted, destroyed and protected states correctly;
11. performance remains inside the target budget;
12. no console, shader, asset or state-machine errors occur;
13. an independent verifier repeats the pass on the exact commit.

A successful empty-shell walkthrough cannot substitute for this prop-complete final pass.

---

# 10. Separate population/gameplay ticket boundary

After the environment package is independently verified, create or continue a separate ticket for:

- NPC and monster spawn placement;
- AI navigation and patrols;
- random encounters and respawn;
- encounter composition and combat pacing;
- quest entities, objectives and dialogue;
- production loot/drop tables;
- boss adds/waves and zone population state;
- population save/reload and multiplayer behavior.

That ticket may consume the verified environment sockets and interaction APIs. It must not silently alter topology, prop placement or collision. Any required environment change reopens the affected environment gate and its regression tests.

## Current First Breach application

The current #451 branch already has props and some gameplay content. Preserve valid work.

For #451, the required remaining environment sequence is:

```text
existing prop-placement audit
-> real-character prop-complete walkthrough
-> collision repair/regression
-> chest/pickup/destruction/protected-object interaction proof
-> final integrated environment walkthrough
-> independent verification
```

Do not expand random encounters, new population systems or quest scope inside the collision/interaction correction unless the issue explicitly requires them.

## Done rule

The environment package is complete only when the fully staged level stops and clears the correct colliders, supports all required interactions and destruction states, survives save/reload, remains performant, and passes an independent full-route walkthrough.