# Project Canon Index

## Priority order

1. Latest explicit owner direction
2. Binding repository `AGENTS.md`
3. Current runtime/code contracts
4. Locked/current SoulDrifter docs and approved GitHub issue decisions
5. This master harness
6. Recovered Lifepaper/Book-of-Life historical material
7. Death Gate source inspiration within current-phase restrictions
8. New proposals

A lower-priority source never silently overrides a higher-priority source.

## Core harness

- `START_HERE.md`
- `SESSION_FAST_START.md`
- `ONBOARDING.md`
- `AUTO_DISCOVER_WORKSPACE.md`
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`
- `ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`
- `ZONE_PRODUCTION_QUALITY_GATES.md`
- `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
- `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
- `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
- `IMAGE_REFERENCE_BAKEOFF_POLICY.md`
- `HOUDINI_APPRENTICE_POC_POLICY.md`
- `BROWSER_RUNTIME_ROADMAP.md`
- `ANIMATION_PROVIDER_ROUTING.md`
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- `QUEST_DIALOGUE_VIDEO_POLICY.md`
- `kickoffs/FIRST-BREACH-QUEST-DIALOGUE-VIDEO-BAKEOFF-RUNBOOK.md`
- `config/onboarding-cache-policy.json`
- `config/tripo-provider.json`
- `config/zone-environment-completion-policy.json`
- `config/dungeon-topology-policy.json`
- `config/spatial-connection-policy.json`
- `config/animation-bakeoff-policy.json`
- `config/quest-dialogue-video-policy.json`
- matching record templates
- `WORKFLOW.md`
- `ARCHITECTURE_DECISION.md`
- ticket kickoff files under `kickoffs/`
- complete archived specialist source under `source-bundle/`

## Production-document authority

Current SEA playbook files are the production workflow authority.

`Arianus-Sky/projects/games/SoulDrifterWeb/` is the implementation target for runtime code, data, assets and tests. Legacy SKY runbooks may inform implementation but do not override the SEA harness.

---

# Zone production canon

Every SoulDrifter zone/environment uses this stage order:

```text
0.  design/canon/budget/zone-seam contract
1.  topology and connection/traversal solver
2.  graybox playability/scale/pacing/camera/socket reservation
3.  shared shell/surfaces/volumes/world seams
4.  asset intake and technical readiness
5.  environment staging and prop placement
6.  prop-complete real-character walkthrough/collision discovery
7.  collision/physics/navigation/hazard regression
8.  interaction/pickup/destruction/dynamic state
9.  lookdev/lighting/atmosphere/wayfinding
10. audio/acoustics
11. performance/streaming/loading/memory
12. failure recovery/checkpoints/out-of-bounds/soft locks
13. device/input/camera/accessibility/network contract
14. population-readiness revalidation and handoff
15. final integrated walkthrough and experience review
16. independent environment verification
17. separate zone-population/gameplay ticket
```

No stage proves another stage. Unused gates are explicitly `NOT_REQUIRED`; required gates may not be omitted.

## Binding zone rules

- Graybox scale, pacing, camera and combat space pass before expensive production art.
- Entry/exit seams, world transforms, save/respawn and loading handoff are explicit.
- Assets pass technical intake before staging: provenance, scale, axes, pivot, materials, textures, LOD, collider, interaction/destruction anchors and rollback.
- Final intended props are placed before the collision walkthrough.
- An empty-shell traversal is not final collision proof.
- Navigation/pathfinding is not collision proof.
- Collision/physics/hazards pass before interaction/destruction acceptance.
- Atmosphere may not hide structural, collision or missing-content defects.
- Audio/acoustics are a zone system, not an afterthought.
- Performance is measured at multiple checkpoints and receives a dedicated final gate.
- Checkpoints, re-entry, stuck recovery, out-of-bounds, failed state and soft-lock scenarios are tested.
- Device/input/camera/accessibility and online-state contracts are explicit where applicable.
- Population is a later ticket, but spawn/patrol/encounter/quest/cinematic/drop envelopes are reserved during graybox and revalidated after the environment is final.
- Final review includes orientation, believability, pacing, repetition, fatigue and enjoyment—not only technical correctness.
- A change reopens the lowest affected gate and every dependent gate.

## Environment staging versus population

### Environment ticket owns

- design/canon/budgets/zone seams;
- topology/graybox/shell/surfaces/volumes;
- asset intake and registry;
- furniture, containers, art, statues, cover, wall/ceiling fixtures, remains, clues and environmental storytelling;
- collision/physics/navigation/hazards;
- base interaction/pickup/destruction/dynamic state;
- lookdev, lighting, atmosphere, wayfinding and audio;
- performance/streaming/loading/memory;
- recovery/out-of-bounds/device/accessibility/network contract;
- stable population-readiness sockets;
- deterministic test contents;
- independent environment verification.

### Separate population/gameplay ticket owns

- NPC/monster spawns;
- patrols, random encounters and respawn tuning;
- quest actors, dialogue and objectives;
- production loot/drop tables;
- encounter composition and combat pacing;
- boss waves/adds and population state;
- AI population persistence/network behavior.

A later population change that needs a moved prop, new aperture, new actor-size envelope or changed collider reopens the relevant environment gates.

---

# Semantic staging canon

Every spatial node receives a `spacePurposeProfile` and must read as the kind of place it represents.

Examples:

- houses: sleeping, storage, food/hearth, seating, lighting and personal-use areas;
- shops: counters, display/stock, secure storage, signage, work areas and customer circulation;
- workshops: stations, tools, materials, storage, waste and safety systems;
- temples: ritual focus, offerings, iconography, processional/service space and lighting;
- dungeons/crypts: cages, chains, remains, rubble, altars, braziers, containers, wall art, warnings, hidden ruins, breakable clutter and faction/creature traces;
- biome pockets/mega-zones: terrain landmarks, local subregions, routes, streaming cells and environmental systems rather than uniform scatter.

Placement order:

```text
structural fixtures
-> functional furniture/equipment
-> containers and cover
-> wall/ceiling/hanging objects
-> environmental storytelling
-> small clutter
-> hidden/secret candidates
```

Every placed object records collision class, interaction class, destruction class, protection reason when applicable, and performance class.

---

# Collision, interaction and maximum destructibility canon

The prop-complete walkthrough uses the actual playable controller/model and representative required profiles.

It detects and repairs:

- missing collision on visible solids;
- invisible blockers;
- collider/mesh mismatch;
- door/gate state mismatch;
- tunneling;
- camera/model clipping;
- prop layouts that trap/block;
- click-to-move/WASD disagreement;
- large-body visual clipping;
- surface, water, moving-platform and hazard behavior;
- collision after opening/destruction.

Both positive and negative collision are required: intended solids block, while intended openings, interaction approaches and destroyed footprints remain clear.

SoulDrifter uses a maximum-destructibility environment:

> Every placed object must have a working interaction/destruction contract or an explicit reason it is protected or intentionally noninteractive.

Defaults:

- crates, boxes, barrels, wooden furniture, pottery, bones, loose debris and noncritical cover: destructible;
- noncritical paintings, banners, shelves, sconces, chains, cages and wall fixtures: destructible/detachable when practical;
- chests/coffers: interactable first, commonly protected until opened/looted, with optional break-after-empty behavior;
- iron/steel structural objects: protected by default;
- structural shell and progression-critical doors/gates/mechanisms: protected by default;
- quest/story destruction: explicit `QUEST_DESTRUCTIBLE` state.

Destroyed collision clears correctly, debris does not soft-lock routes, and save/reload preserves open, looted and destroyed state.

---

# Additional quality canon

## Graybox and gameplay readiness

Validate real movement speed, route time, dimensions, camera profiles, sightlines, combat/telegraph/dodge/projectile/recovery lanes, interaction approaches and largest body profile. Reserve checkpoint, spawn, patrol, leash, quest, dialogue, cinematic and drop envelopes.

## Zone seams

Define source/destination IDs, transforms/facing, return behavior, save/checkpoint/respawn, streaming/loading, lighting/weather/audio/music handoff, procedural state and destination-load fallback.

## Asset readiness

Reject wrong-scale assets, broken pivots/materials/textures, excessive texture units/draw calls, unoptimized collision meshes, missing provenance/rollback or assets that cannot support required state changes.

## Lookdev and wayfinding

Materials, lighting, shadows, exposure, fog, particles, water, weather and post effects must preserve route/interaction/state readability, including low-light and color-independent cues.

## Audio/acoustics

Ambient beds, local emitters, music transitions, reverb, occlusion, attenuation, surface footsteps, interaction/destruction/hazard cues, water transitions, concurrency and browser/mobile resume behavior are explicit.

## Performance/streaming

Track loading, draw calls, triangles, materials/textures/texture units, frame time, memory, lights/shadows, particles/overdraw, animations, physics, nav, audio, save size, shader stutter and representative mobile thermal behavior. Use LOD/HLOD, instancing, batching, compression, culling, streaming and pooling.

## Recovery and accessibility

Test checkpoint/save/respawn/re-entry, stuck/out-of-bounds, dynamic-state recovery, failed load/state fallback, required devices/inputs/viewports, camera behavior, reduced motion/shake/flash, prompt contrast, color-independent cues and captions.

## Population-readiness

Revalidate final spawn envelopes, patrol/leash routes, actor-size clearance, encounter spaces, cover/LOS, quest/dialogue/cinematic anchors, drop regions, AI/player nav agreement and population streaming cells. Provide stable socket IDs and dependency commit.

---

# Spatial nodes and traversal

SoulDrifter topology is not limited to rectangular rooms.

A node may be a room, cavern, shaft, climb surface, bridge, moving platform region, water volume, underwater tunnel, air pocket, biome pocket, labyrinth, mega-zone or transforming living-dungeon state.

Every edge declares connection type, physical/nonphysical status, movement mode/medium, directionality, geometry/surface/volume, collision/navigation ownership, controller/animation/camera transitions, resources/hazards/recovery, AI/persistence/streaming/network behavior, diagnostics and verification.

Use top-down plans for horizontal routes, sections/elevations for vertical routes, 3D volume/slice views for aquatic routes, state graphs for moving/transforming topology, and region/streaming maps for mega-zones.

Debug warp, pathfinding or a visible doorway never proves a connection.

## Procedural topology

Required architecture:

```text
route/branch selection when applicable
-> logical graph with traversal contracts
-> constructive edge-by-edge embedding
-> canonical boundaries/surfaces/volumes
-> actual-geometry diagnostics
-> graybox acceptance
-> shared shell
-> asset intake/staging
-> prop-complete collision/interaction/quality gates
```

Do not place independently sealed modules and connect them after rendering. Place each destination relative to a compatible source and resolve the full edge before acceptance; retry/backtrack/reject invalid layouts.

### Current First Breach

- fixed Soul Well/vestibule/Threshold Plaza may exist before route selection;
- randomized branch is generated after Wayfarer/Oathbreaker choice;
- selected topology is solved before gallery meshes render;
- no magical teleport/`PORTAL_TRANSFER` edge exists;
- gates, corridors, stairs/landings and Soulwell water veil are physical connections;
- preserve valid topology, staging, lookdev and gameplay, then reconcile missing gates instead of restarting;
- do not expand random encounters, quest population or production spawn systems merely to finish environment correction.

---

# Browser/runtime portability

- Browser-first/mobile-browser remains the product direction.
- Three.js remains canonical through First Breach and the first playable Heartvale POC section.
- After both are complete/verified, an isolated Babylon.js port of exactly those sections may be compared; Three.js remains intact until owner verdict.
- Unreal/Unity remain later optional native/full-engine candidates.
- Preserve Houdini/Blender/provider source, neutral assets/caches/manifests and target derivatives.

# Images and 3D providers

- Important primary 3D references use the configured four-candidate comparison when live lanes are available.
- Every primary source shows the complete asset in frame.
- Tripo Studio, API/SDK and official CLI are separate lanes; use live evidence and do not assume credentials/credits are shared.
- Geometry-changing operations occur before final rigging.

# Animation

- Search Tripo presets first.
- Accepted direct presets do not require duplicate DCC work.
- Substantial custom motions receive Houdini KineFX and Blender candidates under identical inputs, blinded AI review and blinded owner selection.
- No pipeline retires automatically.

# Quest dialogue video

- Every production quest requires a video introduction or cutscene narrative beat.
- Quest, dialogue and population workers must read `QUEST_DIALOGUE_VIDEO_POLICY.md` plus its config and record template.
- MiniMax H3 is the default lane for flashbacks, memories, chronicles, story exposition, visions, quest transitions and later cinematics.
- Full video payloads remain outside the zone package and base application bundle; the game stores a versioned manifest and lazy-loads external media.
- Video failure never blocks quest progression; captions, text fallback, skip and replay are required.
- Visible speaking-NPC videos require a controlled bakeoff between a provider avatar generated from canonical NPC references and an in-house render of the actual approved 3D NPC.
- Stock/preset avatars may not replace canonical named NPC identity.
- The owner-selected bakeoff winner becomes the recurring named-NPC default; the losing lane remains an allowed fallback.

# Houdini

- Current mode is `NONCOMMERCIAL_POC`.
- Use the full FX features exposed by Apprentice while respecting restrictions.
- Three.js receives supported baked/exported representations.
- Indie upgrade requires clean rebuild/re-export for the production lane.

# Other current direction

- playable characters remain modular;
- approved NPC full-outfit segmentation is allowed;
- monsters use regenerate/compare QA;
- real-GPU validation remains mandatory;
- each class should ultimately have three starter active abilities with source-grounded owner-approved third abilities;
- starter Summoner creature is Lesser Driftling, progressing to Minor and Major, with separate pet controls/manual/autocast rules.
