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
- `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
- `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
- `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
- `IMAGE_REFERENCE_BAKEOFF_POLICY.md`
- `HOUDINI_APPRENTICE_POC_POLICY.md`
- `BROWSER_RUNTIME_ROADMAP.md`
- `ANIMATION_PROVIDER_ROUTING.md`
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- `config/onboarding-cache-policy.json`
- `config/tripo-provider.json`
- `config/zone-environment-completion-policy.json`
- `config/dungeon-topology-policy.json`
- `config/spatial-connection-policy.json`
- `config/animation-bakeoff-policy.json`
- `templates/zone-environment-completion-record.template.json`
- `templates/dungeon-topology-record.template.json`
- `templates/spatial-connection-record.template.json`
- `templates/animation-bakeoff-record.template.json`
- `WORKFLOW.md`
- `ARCHITECTURE_DECISION.md`
- ticket kickoff files under `kickoffs/`
- complete archived specialist source under `source-bundle/`

## Production-document authority

Current SEA playbook files are the production workflow authority.

`Arianus-Sky/projects/games/SoulDrifterWeb/` is the implementation target for runtime code, data, assets and tests. Legacy SKY runbooks may inform implementation but do not override the SEA harness.

---

# Zone environment completion canon

Every SoulDrifter zone/environment uses this exact stage order:

```text
0. design and purpose contract
1. topology and connection solver
2. shared shell, surfaces and traversal volumes
3. environment staging and prop placement
4. prop-complete real-character walkthrough / collision discovery
5. collision implementation and regression
6. interaction, pickup and destruction
7. final integrated environment walkthrough
8. independent environment verification
9. separate zone-population/gameplay ticket
```

No stage may be skipped or treated as proof of another stage.

Key rules:

- place the final intended environmental props before the collision walkthrough;
- an empty-shell walkthrough is not final collision proof;
- navigation/pathfinding is not collision proof;
- collision must pass before interaction/destruction acceptance;
- interaction/destruction must pass before the final integrated walkthrough;
- the environment must be independently verified before population expansion;
- population work may not silently alter verified topology, prop placement or collision.

## Environment staging versus population

### Environment/level ticket owns

- architectural shell and fixtures;
- furniture and functional staging;
- paintings, statues, shelves, sconces and wall/ceiling fixtures;
- chests, containers, crates, barrels, pottery, cover and debris;
- environmental storytelling, remains, clues and hidden-route candidates;
- collision/interaction/destruction classification;
- base chest/pickup/destruction proof using deterministic test contents;
- final environment verification.

### Separate zone-population/gameplay ticket owns

- NPC and monster spawns;
- patrols, random encounters and respawn;
- quest actors, dialogue and objectives;
- production loot/drop tables;
- encounter composition and combat pacing;
- boss waves/adds and population state;
- AI population persistence/network behavior.

A later population change that needs a moved prop, new aperture or changed collider reopens the relevant environment gate.

## Semantic staging canon

Every spatial node receives a `spacePurposeProfile` and must read as the kind of place it represents.

Examples:

- houses require believable sleeping, storage, food/hearth, seating, lighting and personal-use areas;
- shops require counters, display/stock, storage, signage, work areas and customer circulation;
- workshops require stations, tools, materials, storage, waste and safety systems;
- temples require ritual focus, offerings, iconography, processional/service space and lighting;
- dungeons/crypts require appropriate cages, chains, remains, rubble, altars, braziers, containers, wall art, warnings, hidden ruins, breakable clutter and faction/creature traces;
- biome pockets and mega-zones use terrain landmarks, local subregions, routes and streaming cells rather than uniform scatter.

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

## Collision canon

The prop-complete walkthrough uses the actual playable controller/model and representative required profiles.

It must detect and repair:

- missing collision on visible solids;
- invisible blockers;
- collider/mesh mismatch;
- door/gate state mismatch;
- tunneling;
- camera clipping;
- prop placement that traps or blocks the player;
- click-to-move/WASD disagreement;
- large-body visual clipping.

Both positive and negative collision are required:

- intended solids block;
- intended openings and destroyed footprints remain clear.

## Maximum-destructibility canon

SoulDrifter uses a maximum-destructibility environment.

The binding rule is:

> Every placed environmental object must have a working interaction/destruction contract or an explicit reason why it is protected or intentionally noninteractive.

Defaults:

- crates, boxes, barrels, wooden furniture, pottery, bones, loose debris and noncritical cover: destructible;
- noncritical paintings, banners, shelves, sconces, chains, cages and wall fixtures: destructible or detachable when performance/art constraints permit;
- chests/coffers: interactable first, commonly protected until opened/looted, with optional break-after-empty behavior;
- iron/steel structural objects: protected by default;
- structural shell and progression-critical doors/gates/mechanisms: protected by default;
- quest/story destruction requires an explicit `QUEST_DESTRUCTIBLE` state.

Destroyed collision must clear correctly; debris must not soft-lock required routes; save/reload must preserve open, looted and destroyed states.

---

# Spatial nodes and traversal

SoulDrifter topology is not limited to rectangular rooms.

A spatial node may be:

- a room, chamber, corridor, cavern or shaft;
- a stair, climb surface, bridge or moving-platform region;
- a water basin, flooded tunnel, submerged cave or breathable air pocket;
- a forest, city ruin, swamp or other biome contained inside a dungeon;
- a large labyrinth, hub, arena or streamed mega-zone;
- a moving, transforming or non-Euclidean living-dungeon state.

Read `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md` for the full connection taxonomy.

Every edge declares connection type, physical/nonphysical status, movement mode/medium, directionality, geometry/surface/volume, collision/navigation ownership, controller/animation/camera transitions, resources/hazards/recovery, AI/persistence/streaming/network behavior, diagnostics and verification.

Use:

- top-down plans for horizontal routes;
- sections/elevations for stairs, climbing, drops, lifts and layered spaces;
- 3D volume/slice views for swimming, underwater tunnels and air pockets;
- state graphs/timelines for moving or living-dungeon topology;
- region/streaming maps and local subgraphs for biome pockets, labyrinths and mega-zones.

Debug warp, pathfinding or a visible doorway never proves a connection.

## Procedural dungeon topology

Required architecture:

```text
fixed pre-choice area when applicable
-> route/branch selection
-> logical graph with explicit traversal contracts
-> constructive edge-by-edge spatial embedding
-> canonical boundaries, surfaces and volumes
-> actual-geometry plan/section/volume/state validation
-> shared shell and structural movement intent
-> environment staging
-> prop-complete collision/interaction/destruction gates
```

Do not place independently sealed rooms or other modules and connect them after rendering.

Place each destination relative to a compatible source socket, surface or volume. Resolve the full edge before accepting the destination. Retry alternate connections or backtrack when invalid.

Shared walls emit once; open spans emit no wall. Physical corridors enter both endpoints. Water, air, climb and moving-platform volumes have explicit ownership and cannot trap the player. Invalid arrangements are rejected rather than hidden with fog, darkness or props.

### Current First Breach

- The fixed Soul Well/vestibule/Threshold Plaza may exist before route selection.
- Generate the randomized branch after the player chooses Wayfarer or Oathbreaker.
- Solve the selected-route topology before gallery meshes render.
- The current First Breach contains **no magical teleport or `PORTAL_TRANSFER` edge**.
- Route gates, corridors, stairs/landings and the walk-through Soulwell water veil are physical connections.
- A code/mesh label containing `portal` does not make an edge nonphysical.
- Current #451 allowed connection types are defined in `config/spatial-connection-policy.json`.
- Preserve the existing extensive staging, audit/freeze it, then complete the prop-aware collision and interaction/destruction gates.
- Do not expand random encounters, quest population or spawn systems merely to finish the environment correction.

---

# Browser runtime and portability

- SoulDrifter remains browser-first and mobile-browser compatible.
- Three.js remains canonical while completing the First Breach and first playable Heartvale section POC.
- Do not begin Babylon.js work during #451, #448 or the unfinished Heartvale POC.
- After both sections are complete and independently verified in Three.js, create an isolated Babylon.js port of exactly those two sections for side-by-side comparison.
- Compare desktop/mobile browser support, WebGL/WebGPU, loading/bundle size, performance/memory/thermal behavior, water/particles/lighting/FX, animation, physics, UI/input, material fidelity, tooling, defects and implementation effort.
- Three.js remains intact and canonical until the owner records the comparison verdict.
- Unreal/Unity remain later optional native/full-engine candidates only.
- Preserve Houdini/Blender/provider source, neutral assets/caches/manifests and target packages so every port reuses expensive work rather than starting over.

# Images and primary 3D references

- Follow `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
- When the authenticated Tripo Studio allowance is active, generate two Studio candidates—Nano Banana and Nano Banana Pro—and two ChatGPT/OpenAI candidates.
- Verify exact Studio labels and allowance live.
- Compare all four and store the owner-selected source.
- Every primary 3D-source image shows the **entire asset in frame**, including critical geometry, supports and attachments.
- Cropped close-ups are `DETAIL_REFERENCE_ONLY`.

# Tripo 3D

- Studio browser, API/SDK and official CLI are separate lanes; credentials and credits may differ.
- Use `API_SDK_PRIMARY` when authenticated/funded.
- Use `OFFICIAL_CLI_PRIMARY` only when first-party and separately authenticated/funded.
- Use `STUDIO_BROWSER_PRIMARY` when API/CLI are unavailable/unfunded but Studio is active.
- A blocked API/CLI lane must not block Studio browser production.
- Geometry-changing operations occur before final rigging.

# Animation

- Search the live Tripo preset library first.
- A direct Tripo preset that passes acceptance does not require duplicate DCC production.
- Every substantial custom motion not acceptably covered by Tripo produces both Houdini KineFX and Blender candidates from identical locked inputs.
- Blind the candidates, use independent AI review, present a blinded owner A/B comparison, integrate the winner and preserve both candidates/data.
- Review aggregate results after 10, 25, 50, 100 and every additional 50 custom animations.
- No pipeline retires automatically.

# Houdini

- Current owner-declared mode is `NONCOMMERCIAL_POC`; read `HOUDINI_APPRENTICE_POC_POLICY.md`.
- Use the full FX feature set exposed by Apprentice when appropriate.
- Apprentice restrictions remain binding.
- Three.js receives supported baked/exported representations.
- The planned Indie upgrade establishes the limited-commercial/Engine/export/rendering lane and requires clean rebuild/re-export.

# Character, asset, combat and lore direction

The source bundle preserves detailed character, Tripo, animation, combat-reaction, VFX, gear, loot, ancestry, Summoner, resource/cooldown and dual-combat-mode documents.

Before relying on a specialist file, locate/materialize the actual file.

Current owner direction also includes:

- playable characters remain modular;
- approved NPC full-outfit segmentation is allowed;
- monsters use regenerate/compare QA;
- real-GPU validation remains mandatory;
- each class should ultimately have three starter active abilities, with source-grounded and owner-approved third abilities;
- starter Summoner creature is Lesser Driftling, progressing to Minor and Major, with separate pet controls/manual/autocast rules.