# SoulDrifter Zone Production Quality Gates

## Purpose

The topology, staging, collision, interaction and destruction gates fixed the largest failures in the original First Breach process, but a complete zone pipeline still needs several additional systems that are easy for an agent to skip.

This document closes those remaining gaps. It applies to every new SoulDrifter interior, exterior, dungeon, settlement, house, shop, biome pocket, labyrinth, water route and streamed mega-zone.

The binding principle is:

> A zone is not complete because its geometry connects, its props look good, or one walkthrough succeeds. It is complete only when scale, camera, assets, readability, audio, hazards, performance, recovery, device behavior and future population-readiness all pass together.

Unused gates may be marked `NOT_REQUIRED`, but a required gate may not be silently omitted.

---

# 1. Graybox playability, scale, pacing and camera gate

Run this **after topology is accepted and before expensive production shell/art work**.

Build a primitive graybox from the authoritative topology and prove:

- room, corridor, doorway, stair, ramp, water and climb dimensions feel correct at the real movement speed;
- route length and traversal time fit the intended pacing;
- the player does not spend excessive time in dead, repetitive or empty travel;
- entrances, exits, landmarks and route choices are readable without final decoration;
- isometric, third-person, first-person and mobile camera profiles fit where required;
- ceilings, walls, pillars and elevation changes do not permanently obscure the player or objective;
- combat spaces reserve readable attack, dodge, telegraph, projectile and recovery lanes;
- cover and line-of-sight areas are large enough for the intended abilities and actor sizes;
- the largest supported body appearance does not visually clip through required routes;
- interaction approach zones remain reachable;
- boss arenas, tutorial areas and safe zones have explicit size and camera contracts;
- route timings, room counts and encounter-space density are recorded.

## Population-readiness reservations during graybox

Do not populate the zone yet, but reserve and validate:

- player entry, checkpoint and respawn anchors;
- humanoid NPC/companion sockets;
- small, medium and large enemy spawn envelopes expected by the design;
- patrol and leash/reset routes;
- encounter centers, wave-entry edges and boss/add regions;
- quest/dialogue actor anchors and conversation-camera clearance;
- production loot/drop-safe regions;
- cinematic or scripted-event camera/actor marks when applicable.

Props may not later occupy these reserved envelopes without reopening the graybox and staging gates.

Required status: `GRAYBOX_PLAYABILITY_ACCEPTED`.

---

# 2. Zone seam, entry/exit and world-coordinate gate

Every zone must define how it joins the rest of the game.

Record and test:

- world coordinate, scale, up-axis and orientation;
- source and destination zone IDs;
- entry/exit transform and facing;
- return/backtracking behavior;
- save/checkpoint/respawn relationship;
- streaming or loading boundary;
- camera, lighting, weather, audio and music handoff;
- procedural seed/state handoff;
- player, companion, pet and vehicle transfer where applicable;
- failure fallback if the destination fails to load;
- no visible seam, fall-through, duplicate spawn or repeated reward.

The First Breach-to-Heartvale threshold is one example of a zone seam even though it is visually represented by a water veil.

Required status: `ZONE_SEAMS_VERIFIED_FOR_BUILD`.

---

# 3. Asset intake and technical-readiness gate

An asset may not enter semantic staging merely because its GLB or texture loads.

Every production asset used by the zone must have a registry record proving, as applicable:

- source/provider, license, prompt/reference provenance and original hash;
- accepted version and rollback source;
- correct real-world units and scale;
- correct forward/up axes, origin and pivot;
- bounded dimensions and footprint;
- clean normals, tangents and winding;
- UV/material/texture completeness;
- texture resolution, format, color space and compression;
- material/shader and texture-unit budget;
- LOD/HLOD, instancing, batching and culling class;
- collider strategy and simplified collision proxy;
- interaction, pickup, destruction and attachment anchors;
- intact/open/damaged/destroyed variants when required;
- animation clips and event markers when applicable;
- light/shadow/occlusion flags;
- mobile/browser compatibility;
- naming, asset ID, version and manifest path.

Reject or quarantine:

- wrong-scale assets;
- floating or unusable pivots;
- broken materials or missing textures;
- excessive texture units or draw calls;
- enormous unoptimized collision meshes;
- assets with no provenance/rollback;
- assets whose visual geometry cannot support their required interaction or destruction state.

Required status: `ZONE_ASSET_SET_TECHNICALLY_ACCEPTED`.

---

# 4. Physics, surfaces and environmental-hazard gate

Collision alone is not enough. The zone also needs consistent physical and surface semantics.

Define and test, where applicable:

- friction, restitution and slope behavior;
- surface tags for footsteps, impact VFX/SFX and movement modifiers;
- wet, slippery, sticky, unstable or destructible surfaces;
- water depth, buoyancy, currents and shoreline transitions;
- fire, poison, corruption, spikes, falling debris and other damage volumes;
- fall, drowning, crushing and out-of-bounds volumes;
- moving-platform parenting/velocity transfer;
- projectile, melee, physics-prop and debris collision layers;
- destructible-cover fragments and cleanup;
- ragdoll/death-body interaction where enabled;
- hazard telegraph, immunity, cooldown and recovery;
- save/reload while inside or near a dynamic/hazard state.

A visual fire, deep pool or collapsing floor without a matching gameplay contract is a failure. A gameplay hazard with no readable visual/audio warning is also a failure.

Required status: `PHYSICS_SURFACES_HAZARDS_VERIFIED`.

---

# 5. Look development, lighting, atmosphere and wayfinding gate

Run this after structural geometry, staging, collision and interaction geometry are stable.

The pass includes:

- PBR material consistency and believable surface response;
- texture density and repetition control;
- decals, wear, damage and environmental state;
- direct, ambient and practical lighting;
- shadow quality and shadow budget;
- exposure, tone mapping and post-processing;
- fog, volumetrics, particles, water, weather and atmosphere;
- important-object, exit and interaction readability;
- route landmarks and orientation cues;
- visual differentiation of safe, dangerous, locked, destructible and protected states;
- colorblind-safe and low-light readability;
- no topology, collision or missing-content defect hidden by darkness, fog, bloom or particles;
- no critical route dependent only on color or a subtle effect.

Any look-development change that adds, removes or moves physical geometry reopens staging, collision and interaction regression.

Required status: `LOOKDEV_AND_WAYFINDING_VERIFIED`.

---

# 6. Audio and acoustics gate

Every zone receives an audio plan rather than a single looping ambience track.

Define and test, where applicable:

- ambient beds and localized emitters;
- music entry, exit and state transitions;
- room/cavern/outdoor reverb zones;
- obstruction and occlusion through walls and doors;
- distance attenuation and directionality;
- water-surface and underwater audio transitions;
- surface-specific footsteps and movement sounds;
- door, container, pickup, impact and destruction sounds;
- hazard and interaction cues;
- concurrency/voice limits and priority;
- loop seams and randomization;
- mobile/browser audio-start restrictions and resume behavior;
- pause, background-tab and device-interruption recovery;
- captions or visual alternatives for critical audio-only information;
- no constant layered ambience that causes clipping, fatigue or excessive CPU use.

Required status: `ZONE_AUDIO_ACOUSTICS_VERIFIED`.

---

# 7. Performance, streaming, loading and memory gate

Performance is a continuous budget, not a final surprise.

Capture budgets at graybox, post-staging, post-interaction/destruction, post-lookdev and final integration.

Track, where available:

- bundle and streamed-download size;
- startup, first-interactive and zone-entry time;
- draw calls, triangles and visible instances;
- active materials, textures and texture units;
- GPU/CPU frame time;
- JS heap, system RAM and GPU memory;
- active lights and shadow casters;
- particles, transparent overdraw and volumetric cost;
- animated skeletons and animation-update cost;
- physics bodies, debris and broad-phase cost;
- navigation/path-query cost;
- audio voices and decode memory;
- save/state size;
- shader compile and first-use stutter;
- thermal and battery behavior on representative phones.

Required optimization tools include, as applicable:

- LOD/HLOD;
- frustum/occlusion/distance culling;
- instancing and batching;
- mesh and texture compression;
- texture atlases/arrays where appropriate;
- streaming cells and unload/reload rules;
- pooled particles/debris/audio;
- bounded destructible fragments;
- animation update distance;
- quality tiers for shadows, water, particles, fog and post-processing.

Test slow network, cache miss, background/resume and repeated zone entry. Asset pop-in may be acceptable only when bounded and visually managed. Missing assets, shader failures or permanent loading stalls are hard failures.

Required status: `ZONE_PERFORMANCE_STREAMING_VERIFIED`.

---

# 8. Failure recovery, checkpoints, out-of-bounds and soft-lock gate

Test how the zone fails, not only how it succeeds.

Required scenarios include, when applicable:

- player death and respawn;
- fall, drowning, crushing and hazard recovery;
- checkpoint activation and reload;
- save/reload before and after doors, pickups and destruction;
- leaving and re-entering the zone;
- disconnect/reconnect or late resume for online state;
- player stuck between props or under moving geometry;
- approved unstuck/return-to-safe-point behavior;
- attempts to leave the playable boundary by sprinting, jumping, climbing, camera manipulation or destroyed cover;
- no fall-through, infinite void, inaccessible ledge or hidden soft lock;
- no progression item or required mechanism permanently lost;
- no required route blocked by debris, door state or failed script;
- procedural seed/schema/version migration behavior;
- safe fallback when an asset, audio file, save field or streamed cell fails.

Every dynamic topology or destruction state must define a known safe recovery state.

Required status: `FAILURE_RECOVERY_AND_SOFTLOCK_VERIFIED`.

---

# 9. Device, input, camera and accessibility gate

Verify the complete environment on every required control and display profile.

Include, as applicable:

- keyboard/mouse;
- controller;
- touch/mobile;
- supported desktop and mobile browsers;
- portrait/landscape rules and safe areas;
- narrow and wide viewports;
- interaction-target size and priority;
- camera collision, occlusion/fade, rotation, zoom and recenter;
- first-/third-/isometric transitions;
- reduced motion, camera-shake and flash options;
- readable text, prompts, contrast and colorblind-safe cues;
- subtitles/captions for important speech/audio cues;
- no hover-only requirement on touch devices;
- no progression-critical action requiring unreliable precision input;
- no animation, UI or camera state that traps the player after input interruption.

Required status: `DEVICE_INPUT_ACCESSIBILITY_VERIFIED`.

---

# 10. Online/network state gate when applicable

SoulDrifter is intended to support online play, so environment state must be designed for authority and synchronization even when the current POC runs locally.

For network-enabled zones, define and verify:

- authoritative procedural seed/layout;
- door/gate/mechanism ownership;
- container/open/looted state;
- pickup ownership and duplication prevention;
- destructible health/state and debris policy;
- hazard and moving-platform state;
- late join and reconnect reconstruction;
- state relevance/interest management;
- interaction contention;
- rollback/prediction limits;
- save/backend authority;
- disconnect during interaction or zone transition;
- version mismatch behavior.

A local-only POC may mark the live network test `NOT_REQUIRED`, but the state model must not make future synchronization impossible.

Required status: `NETWORK_ENVIRONMENT_CONTRACT_ACCEPTED` or `NOT_REQUIRED`.

---

# 11. Population-readiness revalidation gate

Before handing the zone to a population/gameplay ticket, revalidate all reserved gameplay envelopes against the **final staged, colliding, interactive, lit and optimized environment**.

Prove:

- spawn regions are not inside props, hazards or camera-blocking areas;
- patrol paths, chase routes and return/leash zones remain navigable;
- expected actor-size classes fit required routes;
- boss/encounter spaces preserve attack, telegraph, dodge and recovery lanes;
- cover and line-of-sight behave as intended;
- dialogue, quest and cinematic anchors remain usable;
- loot/drop zones do not place items inside geometry or unreachable areas;
- AI nav and player nav agree where they should;
- destruction cannot strand AI or expose an invalid route;
- population streaming/culling regions are defined;
- the later ticket receives stable socket IDs and a dependency commit.

This gate does not add live population; it proves the environment can support the planned population without being rebuilt.

Required status: `POPULATION_READY_ENVIRONMENT_HANDOFF`.

---

# 12. Observability and reproducibility gate

Every accepted zone must be diagnosable by another agent without relying on chat history.

Provide:

- zone ID, version, seed and route in evidence;
- topology, collision, navigation, interaction and hazard debug overlays;
- performance counters and target-device renderer information;
- deterministic reproduction commands/URLs;
- asset and state manifests;
- save/checkpoint test fixtures;
- error, failed-request and shader-compile capture;
- before/after evidence for dynamic states;
- a defect ledger and known-limit list;
- release builds with development controls/overlays disabled or access-controlled.

Required status: `ZONE_OBSERVABILITY_READY`.

---

# 13. Final experience and pacing review

The final integrated walkthrough is both technical and experiential.

In addition to hard checks, review:

- sense of place and believability;
- ability to understand where to go;
- repetition and asset spam;
- dead space and traversal fatigue;
- rhythm between narrow, open, safe and dangerous spaces;
- interaction/destruction density;
- visual and audio fatigue;
- discoverability of secrets without making the required route confusing;
- whether the zone is actually enjoyable to move through;
- whether the environment communicates its story without excessive text;
- whether the route still feels good after repeated runs/seeds.

Use an independent AI/vision reviewer and owner playtest where practical. A technically correct but confusing, dull or exhausting zone is not owner-ready.

Required status before independent verification: `OWNER_EXPERIENCE_REVIEW_READY`.

---

# Reopen rules

Changes reopen the lowest affected gate and every dependent gate.

Examples:

- topology/room transform change -> reopen topology onward;
- new large prop -> reopen staging, collision, interaction, lookdev, performance and final walkthrough;
- collider-only correction -> reopen collision onward;
- destruction-state geometry change -> reopen interaction, collision-after-destruction, performance, recovery and final walkthrough;
- new lighting/fog/particles -> reopen lookdev, readability, performance, device/accessibility and final walkthrough;
- streaming/LOD change -> reopen performance, visual/readability and final walkthrough;
- new monster size requirement -> reopen graybox/population-readiness and any affected staging/collision gates.

## Done rule

A zone is production-complete only when every required gate has a current evidence record and independent verification. Green tests, a connected nav graph, attractive screenshots or one successful walkthrough cannot substitute for the complete gate set.