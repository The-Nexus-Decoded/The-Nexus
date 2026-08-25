# SoulDrifter Zone Environment Completion Pipeline

## Purpose

This document is the authoritative stage order for building a playable SoulDrifter zone/environment.

The earlier First Breach work happened out of order: topology, decoration, interactions, collision and gameplay were mixed together. The corrected pipeline separates the gates so an agent cannot claim the zone is complete because one subsystem works.

## Canonical order

```text
0. DESIGN / PURPOSE CONTRACT
1. TOPOLOGY AND CONNECTION SOLVER
2. SHARED SHELL / SURFACES / VOLUMES
3. ENVIRONMENT STAGING AND PROP PLACEMENT
4. PROP-COMPLETE WALKTHROUGH / COLLISION DISCOVERY
5. COLLISION IMPLEMENTATION AND REGRESSION
6. INTERACTION / PICKUP / DESTRUCTION
7. FINAL INTEGRATED ENVIRONMENT WALKTHROUGH
8. INDEPENDENT ENVIRONMENT VERIFICATION
9. SEPARATE ZONE-POPULATION / GAMEPLAY TICKET
```

No later gate substitutes for an earlier one.

---

# Gate 0 — Design and purpose contract

Define:

- zone purpose, fiction and player experience;
- fixed versus generated regions;
- spatial-node types;
- route/progression graph;
- selected connection/traversal types;
- target devices and performance budget;
- room/space purpose profiles;
- required environment interactions;
- environmental-destructibility direction;
- population/encounter scope boundary.

Status required before Gate 1: `DESIGN_CONTRACT_ACCEPTED`.

---

# Gate 1 — Topology and connection solver

Follow:

- `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`;
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`;
- machine-readable topology and connection policies.

Prove:

- logical graph;
- constructive placement;
- canonical boundaries/openings;
- physical connection contracts;
- plan/section/volume/state diagnostics;
- overlap/clearance/continuity invariants;
- no false proof from pathfinding or warp.

Status required before Gate 2: `TOPOLOGY_VERIFIED_FOR_BUILD`.

---

# Gate 2 — Shared shell, surfaces and traversal volumes

Generate runtime geometry from the accepted topology:

- floors, walls, ceilings and terrain;
- apertures, doors, gates, corridors and thresholds;
- stairs, ramps and landings;
- water/climb/hazard volumes where applicable;
- structural collision intent;
- navigation intent;
- streaming/culling regions.

Do not place final dressing until shell geometry matches the accepted topology.

Status required before Gate 3: `SHELL_IMPLEMENTED_UNVERIFIED` followed by shell/topology regression pass.

---

# Gate 3 — Environment staging and prop placement

Follow `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`.

Stage every space according to its purpose:

- functional furniture and fixtures;
- containers and cover;
- wall/ceiling/hanging objects;
- environmental storytelling;
- destructible clutter;
- protected structures;
- hidden/secret candidates;
- performance and LOD classes.

Every prop receives collision, interaction and destruction classification before acceptance.

Status required before Gate 4: `STAGED_ENVIRONMENT_FROZEN_FOR_COLLISION_TEST`.

---

# Gate 4 — Prop-complete walkthrough and collision discovery

Walk the fully staged environment with the actual playable controller/model.

Test:

- WASD/controller route;
- click-to-move route;
- camera movement;
- largest relevant body visual profile;
- every threshold, stair, ramp and corridor;
- all large props, furniture, chests, statues, crates and wall fixtures;
- visible solids and intended clear space.

This pass produces a collision-defect inventory. It is not final acceptance.

Status required before Gate 5: `COLLISION_DEFECT_INVENTORY_COMPLETE`.

---

# Gate 5 — Collision implementation and regression

Follow `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`.

Repair and verify:

- mesh/collider alignment;
- collision layers/classes;
- open/closed threshold synchronization;
- prop collision;
- camera collision;
- no invisible blockers;
- no tunneling;
- destroyed-state collision clearing;
- navigation agreement.

Repeat all required routes after each structural collision change.

Status required before Gate 6: `COLLISION_VERIFIED`.

---

# Gate 6 — Interaction, pickup and destruction

Implement and test:

- chest/coffer/cabinet opening;
- deterministic test-item transfer;
- pickup once/no duplication;
- levers/searchables/mechanisms when in scope;
- destructible crates, barrels, furniture, wall props and cover;
- protected iron/structural/progression objects;
- quest-destructible state where explicitly authorized;
- collision updates;
- audio/VFX/animation;
- save/reload/persistence;
- bounded debris and browser/mobile performance.

Status required before Gate 7: `ENVIRONMENT_INTERACTIONS_VERIFIED`.

---

# Gate 7 — Final integrated environment walkthrough

Run the complete environment with:

- accepted topology;
- final shell;
- all intended props;
- final collision;
- interactions;
- destruction;
- save/reload;
- desktop and representative mobile/narrow viewport;
- real GPU;
- target performance instrumentation.

Prove that interactions and destruction do not reopen topology, navigation, camera, collision or performance defects.

Status required before Gate 8: `ENVIRONMENT_IMPLEMENTED_UNVERIFIED`.

---

# Gate 8 — Independent environment verification

An independent verifier repeats the full environment acceptance on the exact commit.

The producer cannot promote its own environment to `VERIFIED`.

Required final status: `ENVIRONMENT_VERIFIED`.

---

# Gate 9 — Separate zone-population and gameplay ticket

Only after `ENVIRONMENT_VERIFIED`, begin the separate population/gameplay phase for:

- NPCs and monsters;
- spawn points and patrols;
- encounter composition;
- random encounters and respawn;
- quests, dialogue and objective actors;
- production loot/drop tables;
- boss waves/adds;
- AI traversal and combat behavior;
- population persistence/network state.

The population ticket consumes the environment's verified sockets, routes and interaction APIs.

It may not silently move props, alter topology or weaken collision. Any required environment change reopens the affected environment gates and regression suite.

---

# Current First Breach adaptation

The existing #451 level already contains topology work, extensive props and some gameplay content. Do not discard valid work.

Apply the pipeline as a reconciliation:

```text
revalidate/finalize topology
-> audit and freeze existing staging
-> prop-complete character walkthrough
-> fix/verify collision
-> verify required interactions/destruction
-> final integrated walkthrough
-> independent environment verification
```

Existing minimal boss/progression content remains part of the current MVP proof. New random encounters, expanded population, new quests and production spawn tuning remain separate scope.

## Machine-readable files

- `config/zone-environment-completion-policy.json`
- `templates/zone-environment-completion-record.template.json`

## Done rule

A zone is not environment-complete because it looks finished or because the player can follow a nav path.

It is environment-complete only when the staged space has verified topology, collision, interactions, destruction, persistence, target-device performance and an independent full-route walkthrough.