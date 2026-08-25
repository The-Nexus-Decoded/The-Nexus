# SoulDrifter Zone Environment Completion Pipeline

## Purpose

This document is the authoritative stage order for building a playable SoulDrifter zone/environment.

The First Breach exposed a repeated failure pattern: agents mixed topology, art, props, collision, interaction, effects, performance and gameplay together, then declared the zone complete when only one subsystem worked.

The corrected pipeline uses ordered gates and explicit reopen rules.

Read with:

- `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`;
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`;
- `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`;
- `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`;
- `ZONE_PRODUCTION_QUALITY_GATES.md`;
- the matching machine-readable policies/templates.

## Canonical order

```text
0.  DESIGN / CANON / BUDGET / ZONE-SEAM CONTRACT
1.  TOPOLOGY AND CONNECTION / TRAVERSAL SOLVER
2.  GRAYBOX PLAYABILITY / SCALE / PACING / CAMERA / SOCKET RESERVATION
3.  SHARED SHELL / SURFACES / VOLUMES / WORLD-SEAM IMPLEMENTATION
4.  ASSET INTAKE AND TECHNICAL READINESS
5.  ENVIRONMENT STAGING AND PROP PLACEMENT
6.  PROP-COMPLETE WALKTHROUGH / COLLISION DISCOVERY
7.  COLLISION / PHYSICS / NAVIGATION / HAZARD REGRESSION
8.  INTERACTION / PICKUP / DESTRUCTION / DYNAMIC STATE
9.  LOOKDEV / LIGHTING / ATMOSPHERE / WAYFINDING
10. AUDIO / ACOUSTICS
11. PERFORMANCE / STREAMING / LOADING / MEMORY
12. FAILURE RECOVERY / CHECKPOINTS / OUT-OF-BOUNDS / SOFT LOCKS
13. DEVICE / INPUT / CAMERA / ACCESSIBILITY / NETWORK CONTRACT
14. POPULATION-READINESS REVALIDATION AND HANDOFF
15. FINAL INTEGRATED WALKTHROUGH AND EXPERIENCE REVIEW
16. INDEPENDENT ENVIRONMENT VERIFICATION
17. SEPARATE ZONE-POPULATION / GAMEPLAY TICKET
```

No later gate substitutes for an earlier one. A gate may be `NOT_REQUIRED` only when the ticket contract explains why.

---

# Gate 0 — Design, canon, budget and zone-seam contract

Define:

- zone purpose, fiction and intended player experience;
- fixed versus generated regions;
- spatial-node and traversal types;
- route/progression graph;
- adjacent-zone entry/exit contracts;
- world scale, coordinate frame, orientation and datum;
- target devices, browser/runtime path and performance budgets;
- room/space purpose profiles;
- interaction/destruction/hazard direction;
- required camera profiles;
- required actor/body-size classes;
- population/encounter scope boundary;
- accessibility and online-state requirements;
- evidence and owner-review expectations.

Status: `DESIGN_CONTRACT_ACCEPTED`.

---

# Gate 1 — Topology and connection/traversal solver

Prove:

- logical graph;
- constructive destination placement;
- explicit connection contracts;
- canonical boundaries, openings, surfaces and volumes;
- plan/section/volume/state diagnostics;
- overlap, clearance, elevation/depth and continuity invariants;
- deterministic generation/backtracking where applicable;
- no false proof from pathfinding, coordinates, visible doors or warp.

Status: `TOPOLOGY_VERIFIED_FOR_BUILD`.

---

# Gate 2 — Graybox playability, scale, pacing, camera and socket reservation

Build a primitive graybox from the accepted topology before expensive production art.

Validate:

- real movement speed and route timing;
- room/corridor/door/stair/water/climb dimensions;
- pacing, dead space and traversal fatigue;
- route choice and landmark readability;
- isometric, third-person, first-person and mobile camera fit where required;
- combat, telegraph, dodge, projectile, cover and recovery lanes;
- largest supported body profile;
- interaction approaches;
- tutorial, boss and safe-zone dimensions;
- player entry, checkpoint and respawn anchors;
- NPC/companion/enemy spawn envelopes;
- patrol/leash/reset paths;
- quest/dialogue/cinematic anchors;
- loot/drop-safe regions.

This gate reserves population-readiness space without adding final population.

Status: `GRAYBOX_PLAYABILITY_ACCEPTED`.

---

# Gate 3 — Shared shell, surfaces, volumes and world seams

Generate runtime geometry from accepted topology/graybox:

- floors, walls, ceilings, terrain and cavern shell;
- apertures, doors, gates, corridors and thresholds;
- stairs, ramps and landings;
- water, climb, hazard and streaming volumes;
- structural collision/navigation intent;
- entry/exit geometry, facing and return path;
- adjacent-zone loading/streaming handoff;
- culling/streaming region boundaries.

Do not place final props until shell/topology regression passes.

Status: `SHELL_AND_ZONE_SEAMS_IMPLEMENTED_UNVERIFIED`, then shell regression PASS.

---

# Gate 4 — Asset intake and technical readiness

Before staging, every asset used by the zone must pass the registry checks in `ZONE_PRODUCTION_QUALITY_GATES.md`, including:

- provenance/license/hash/rollback;
- units, scale, axes, pivot and bounds;
- normals, UVs, materials and textures;
- texture/shader/texture-unit budgets;
- LOD, instancing, compression and culling class;
- collision proxy strategy;
- final in-zone fitted world transform/bounds and final proxy agreement, including every reachable dynamic state;
- interaction/destruction/attachment anchors and variants;
- animation/event markers when applicable;
- browser/mobile compatibility.

Status: `ZONE_ASSET_SET_TECHNICALLY_ACCEPTED`.

---

# Gate 5 — Environment staging and prop placement

Follow `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`.

Stage every place according to its function and fiction:

- structural fixtures;
- functional furniture/equipment;
- containers and cover;
- wall/ceiling/hanging objects;
- environmental storytelling;
- destructible clutter;
- protected structures;
- hidden/secret candidates;
- LOD/culling/performance classes.

Every object receives collision, interaction, destruction and protection classification.

Before the staged environment freezes:

- reconcile the asset-catalog default -> placement-registry approved override -> generated-layout effective contract -> runtime render/collider instance chain;
- assign stable object, render-owner and collider IDs, with explicit blocking-solid, traversable-surface, nonblocking-detail, hazard/special-volume, VFX-only or inherited-child classification;
- prove every rendered solid maps to collider-owner ID(s), and every collision-only owner has an approved reason;
- verify final fitted world transform/bounds against the final runtime proxy rather than source or pre-fit bounds.

Status: `STAGED_ENVIRONMENT_FROZEN_FOR_COLLISION_TEST`.

---

# Gate 6 — Prop-complete walkthrough and collision discovery

Walk the fully staged environment using the actual playable controller/model.

Test:

- WASD/controller and click-to-move;
- required camera profiles;
- largest relevant body visual profile;
- every threshold, stair, ramp, corridor and transition;
- every large prop, chest, statue, furniture item, crate, wall fixture and cover cluster;
- positive collision and intended clear space;
- camera and model clipping;
- route obstruction/trapping.

The walkthrough and its proof hooks must consume the same complete runtime spatial authority as production. Invoke the production movement/collision primitive with production body dimensions, speed, timestep and substep rules; cover axis and diagonal approaches, corners, grazing, sliding and continuous swept segments between samples. Endpoint arrival, grid/path/navigation success and sparse sampled positions are explicitly insufficient.

This produces a defect inventory. It is not final acceptance.

Status: `COLLISION_DEFECT_INVENTORY_COMPLETE`.

---

# Gate 7 — Collision, physics, navigation and hazard regression

Follow `COLLISION_INTERACTION_DESTRUCTION_POLICY.md` and the physics/hazard section of `ZONE_PRODUCTION_QUALITY_GATES.md`.

Repair and verify:

- mesh/collider alignment;
- collision classes/layers;
- threshold open/closed synchronization;
- prop and camera collision;
- no invisible blockers or tunneling;
- surface friction/slope/material semantics;
- water/current/moving-platform behavior where applicable;
- hazard/damage/fall volumes and recovery;
- projectile/melee/physics/debris layers;
- destroyed-state collider clearing;
- player and AI navigation agreement where intended.

Player movement, NPC navigation, line of sight, projectile/melee/physics queries, interaction targeting, camera collision/occlusion and debug/proof hooks must share stable owner IDs plus the same current transform/state revision. Reconcile effective render owners to colliders, collision-only owners to recorded reasons and final fitted world bounds to final proxies. Closed/open/raised, intact/damaged/destroyed, enabled/disabled and spawned/despawned changes update all consumers atomically.

Repeat all affected routes after structural or collider changes.

Status: `COLLISION_PHYSICS_NAV_HAZARDS_VERIFIED`.

---

# Gate 8 — Interaction, pickup, destruction and dynamic state

Implement and test:

- containers/searchables/mechanisms;
- deterministic test-item transfer;
- pickup once/no duplication;
- stateful doors/gates;
- destructible crates, barrels, furniture, wall props and cover;
- protected structural/progression objects;
- quest-destructible states;
- collision/nav updates after state changes;
- audio/VFX/animation markers;
- save/reload/persistence;
- bounded debris and cleanup;
- moving/transforming environment states when applicable.

Every state transition must update render state and the complete shared runtime spatial authority atomically; subsystem-local, stale or proof-only state is a gate failure.

Status: `ENVIRONMENT_INTERACTIONS_DYNAMIC_STATE_VERIFIED`.

---

# Gate 9 — Look development, lighting, atmosphere and wayfinding

Verify:

- materials, texture density and repetition;
- decals, wear and environmental state;
- direct/ambient/practical lighting;
- shadows, exposure, tone mapping and post effects;
- fog, volumetrics, particles, water and weather;
- landmarks, exits and interaction readability;
- locked/open/destructible/protected state readability;
- colorblind-safe and low-light cues;
- no topology/collision/content defect hidden by atmosphere.

Any physical-geometry change reopens staging/collision/interaction gates.

Status: `LOOKDEV_AND_WAYFINDING_VERIFIED`.

---

# Gate 10 — Audio and acoustics

Verify:

- ambience and localized emitters;
- music and state transitions;
- reverb zones and wall/door occlusion;
- attenuation/directionality;
- surface footsteps;
- interaction/destruction/hazard cues;
- water/underwater transitions where applicable;
- concurrency, priority and loop quality;
- browser/mobile audio resume behavior;
- captions/visual alternatives for critical cues.

Status: `ZONE_AUDIO_ACOUSTICS_VERIFIED`.

---

# Gate 11 — Performance, streaming, loading and memory

Track budgets continuously and run the dedicated final pass after lookdev/audio.

Measure:

- bundle/download/zone-entry time;
- draw calls, triangles and instances;
- materials, textures and texture units;
- CPU/GPU frame time and memory;
- lights/shadows, particles/overdraw and volumetrics;
- skeleton/animation cost;
- physics/debris/nav/audio cost;
- save size and shader first-use stutter;
- representative mobile thermal/battery behavior.

Apply LOD/HLOD, instancing, batching, compression, culling, streaming/unload, pooling, bounded debris and scalable FX tiers.

Test slow network, cache miss, background/resume and repeated zone entry.

Status: `ZONE_PERFORMANCE_STREAMING_VERIFIED`.

---

# Gate 12 — Failure recovery, checkpoints, out-of-bounds and soft locks

Test:

- checkpoint/save/respawn and zone re-entry;
- fall, drowning, hazard and moving-geometry recovery;
- stuck/unstuck behavior;
- boundary escape attempts;
- no fall-through/infinite void/inaccessible ledge;
- no required item/mechanism permanently lost;
- no route blocked by debris, door state or failed script;
- dynamic-state recovery;
- procedural seed/schema/version migration;
- missing-asset/state/load fallback;
- disconnect/reconnect where applicable.

Status: `FAILURE_RECOVERY_AND_SOFTLOCK_VERIFIED`.

---

# Gate 13 — Device, input, camera, accessibility and network contract

Verify required:

- keyboard/mouse, controller and touch profiles;
- desktop/mobile browsers and viewports;
- safe areas/orientation;
- interaction target size/priority;
- camera collision/occlusion/recenter/zoom;
- reduced motion/shake/flash options;
- readable prompts/contrast/color-independent cues;
- captions/subtitles;
- no hover-only or precision-only progression action;
- interruption recovery.

For network-enabled zones, define authority/synchronization for layout, thresholds, interactions, pickups, destruction, hazards, moving geometry, late join and reconnect. A local POC may mark the live network test `NOT_REQUIRED`, but the state model must remain synchronizable.

Status: `DEVICE_INPUT_ACCESSIBILITY_VERIFIED` plus `NETWORK_ENVIRONMENT_CONTRACT_ACCEPTED` or `NOT_REQUIRED`.

---

# Gate 14 — Population-readiness revalidation and handoff

Revalidate all graybox reservations against the final staged, colliding, interactive, lit and optimized environment:

- spawn envelopes;
- patrol/chase/leash/reset routes;
- actor-size clearance;
- encounter/telegraph/dodge/recovery spaces;
- cover and line of sight;
- quest/dialogue/cinematic anchors;
- loot/drop-safe regions;
- AI/player navigation agreement;
- destruction effects on routes;
- population streaming/culling regions;
- stable socket IDs and dependency commit.

Do not add final population here.

Status: `POPULATION_READY_ENVIRONMENT_HANDOFF`.

---

# Gate 15 — Final integrated walkthrough and experience review

Run all systems together:

- topology and zone seams;
- shell and all props;
- collision/physics/nav/hazards;
- interactions/destruction/dynamic states;
- lookdev/lighting/FX/audio;
- save/reload/re-entry/recovery;
- required desktop/mobile/input/camera profiles;
- real GPU and performance instrumentation.

Also review:

- orientation and wayfinding;
- believability and environmental story;
- repetition, dead space and travel fatigue;
- spatial rhythm and visual/audio fatigue;
- interaction/destruction density;
- secret discoverability;
- whether repeated runs remain enjoyable.

Status: `ENVIRONMENT_IMPLEMENTED_UNVERIFIED` and `OWNER_EXPERIENCE_REVIEW_READY`.

---

# Gate 16 — Independent environment verification

An independent verifier repeats the complete acceptance on the exact commit and rejects stale/producer-only evidence.

The verifier independently re-derives spatial-authority coverage; catalog/registry/generated-layout/runtime contract reconciliation and override approval; stable render-owner/collider reconciliation; post-fit world-bounds/proxy agreement; movement/navigation/LOS/combat-physics/interaction/camera/debug state parity; and production movement-primitive proof including diagonal, corner, sliding and continuous swept-segment cases. Endpoint, grid, path or navigation success alone fails this gate.

Required final status: `ENVIRONMENT_VERIFIED`.

---

# Gate 17 — Separate zone-population/gameplay ticket

Only after `ENVIRONMENT_VERIFIED`, begin the separate population/gameplay phase for:

- NPCs/monsters;
- spawn/patrol/AI behavior;
- encounter composition, random encounters and respawn;
- quests/dialogue/objective actors;
- production loot/drop tables;
- boss waves/adds;
- population persistence/network state.

The later ticket consumes verified sockets, routes and APIs. It may not silently move props, alter topology or weaken collision. Any required environment change reopens the affected gates.

---

# Current First Breach adaptation

The current #451 level already contains topology work, extensive staging, lookdev/FX and minimal gameplay. Do not restart valid work.

Reconcile in this order:

```text
revalidate/finalize topology and current scale/camera assumptions
-> audit asset registry and freeze valid staging
-> prop-complete character walkthrough
-> fix/verify collision/physics/nav
-> verify interactions/destruction/dynamic state
-> reconcile lookdev/audio/readability
-> performance/streaming pass
-> recovery/out-of-bounds/device checks
-> population-readiness handoff
-> final integrated walkthrough
-> independent environment verification
```

Existing boss/progression content remains in the MVP proof. New random encounters, expanded population, new quests and production spawn tuning remain separate scope.

## Reopen rule

A change reopens the lowest affected gate and every dependent gate. See `ZONE_PRODUCTION_QUALITY_GATES.md` for examples.

## Machine-readable files

- `config/zone-environment-completion-policy.json`
- `templates/zone-environment-completion-record.template.json`

## Done rule

A zone is not complete because it looks finished, has a connected nav graph, passes unit tests or supports one successful walkthrough.

It is complete only when every required gate has current evidence and independent verification, with zero unresolved spatial-authority, contract-drift, render/collider, post-fit proxy, query/state-parity or production-movement proof omissions.
