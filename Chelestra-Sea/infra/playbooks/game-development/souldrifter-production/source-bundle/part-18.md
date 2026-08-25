epresentative animations play;
- representative spell/VFX events execute;
- no blocking console/runtime errors occur;
- configured performance thresholds pass.
```

---

## `legacy-source/VALIDATION_PLAYBOOK.md`

SHA-256: `93f1d89ab4996696d37895a044bfa24274edcfe3e69c25e33bcf49aefa3ef4d9`

```markdown
# VALIDATION_PLAYBOOK.md — Mandatory Build Gates

The most important rule in this system is that **successful generation is not successful validation**.

## Gate 1 — State and schema validation

Fail if:
- duplicate entity IDs exist;
- required fields are missing;
- referenced assets/regions do not exist;
- seed/version/build metadata is absent.

## Gate 2 — Graph validation

For every required gameplay graph:
- required nodes exist;
- required edges exist;
- critical path is connected;
- spawn can reach required exits/objectives;
- boss/transition nodes are reachable;
- intended loops are real loops;
- secrets can be reached through their intended mechanism;
- dead-end ratio is within design target;
- locked routes have a key/trigger/bypass relationship if required.

A graph edge is not complete until it maps to a physical route or explicit gameplay mechanic.

## Gate 3 — Geometry/building validation

Check:
- roof coverage on enclosed buildings;
- wall closure;
- floor coverage;
- stair/ramp connections;
- doorway clearance;
- corridor minimum width/height;
- ceiling clearance;
- terrain holes;
- floating/sunken assets;
- obvious mesh intersections;
- room overlaps;
- zero-area/degenerate geometry where it affects runtime;
- consistent scale and orientation.

## Gate 4 — Collision/navigation validation

Check representative player capsule/collider against:
- all critical paths;
- doorways;
- stairs;
- bridges;
- elevators/platforms;
- dungeon corridors;
- ladders/climb volumes if applicable.

Automate path probes between required graph nodes. A visually connected room pair that the player cannot traverse is a failure.

## Gate 5 — Diagnostic render validation

Generate at least:
- top/aerial overview;
- oblique overview;
- representative ground-level views;
- hero landmark views;
- dungeon corridor/room samples.

For difficult failures, also produce:
- instance-ID/mask render;
- depth render;
- normal render;
- wireframe or collision debug view.

Vision review should explicitly look for:
- missing roofs/walls/floors;
- roads ending unnaturally;
- corridors not connecting;
- floating props;
- scale mismatches;
- doors/windows in impossible locations;
- repeated assets/patterns that look procedural in a bad way;
- landmark visibility failures;
- combat spaces that are too cramped or empty;
- lighting/VFX obscuring gameplay.

## Gate 6 — Rigging/animation validation

For every animated character:
- skeleton hierarchy valid;
- root joint present and stable;
- no catastrophic weight explosions;
- limb bends plausible;
- feet/paws do not detach;
- clip list matches metadata;
- Three.js can play at least idle + locomotion + one action;
- bounding volume updates are correct.

## Gate 7 — VFX validation

Check:
- spawn point attaches to the correct socket/bone;
- effect trajectory matches ability logic;
- impact occurs at the gameplay hit time;
- lifetime cleanup works;
- transparent overdraw is within budget;
- effect does not obscure critical player/enemy telegraphs;
- effect scale remains correct after GLB/runtime transforms.

## Gate 8 — Three.js integration

The exported build must:
- load without missing resources;
- preserve transforms;
- preserve materials/textures needed for the build;
- instantiate skinned characters correctly;
- play animation clips;
- preserve metadata/IDs used by gameplay;
- create or load collision representations;
- run the expected interaction smoke tests.

## Gate 9 — Performance budget

Track per region/scene:
- draw calls;
- triangles/vertices;
- texture memory;
- active skinned meshes;
- particle count;
- transparent overdraw hotspots;
- shader/material variants;
- memory footprint;
- frame-time samples on the target hardware/browser.

Use instancing and LODs for repeated props/buildings where possible.

## Severity

- **BLOCKER:** breaks traversal, required gameplay, export/load, or produces unusable visual/animation output.
- **MAJOR:** obvious quality failure, large collision issue, strong performance regression.
- **MINOR:** visual polish problem that does not block play.

## Repair report example

```json
{
  "failure_id": "VAL-2041",
  "severity": "BLOCKER",
  "region_id": "deep_mine",
  "entity_ids": ["room_08", "corridor_08_09", "room_09"],
  "invariant": "required_graph_edge_is_traversable",
  "evidence": "navigation probe cannot pass corridor midpoint",
  "allowed_scope": "corridor_08_09 and its two door sockets",
  "required_retests": ["graph", "collision", "nav", "ground_render"]
}
```

**The repair agent is not allowed to regenerate unrelated accepted regions.**
```

---

## `legacy-source/VFX_PIPELINE.md`

SHA-256: `11b8181183b9a3554fdd35d6737df9ca3cc80160c5c4d2fb79149447dc28a06b`

```markdown
# VFX_PIPELINE.md — Houdini + Three.js Effects Pipeline

## Principle

Separate **gameplay truth** from **visual representation**.

Gameplay owns:
- cast time;
- hit time;
- projectile trajectory;
- damage radius;
- collision;
- status effects.

VFX owns:
- particles;
- trails;
- light emission;
- impact visuals;
- decals;
- secondary debris/smoke;
- screen-space embellishment.

The VFX should follow gameplay events, never determine them.

## Effect specification

```json
{
  "effect_id": "spell_fireball_heavy",
  "phases": ["charge", "launch", "travel", "impact", "dissipate"],
  "duration": 2.8,
  "attach": {"phase": "charge", "socket": "hand_r"},
  "travel": {"source": "gameplay_projectile"},
  "impact": {"event": "projectile_hit"},
  "visual": {
    "core": "emissive_mesh",
    "trail": "gpu_particles",
    "sparks": "gpu_particles",
    "smoke": "flipbook",
    "impact_debris": "instanced_mesh_particles"
  }
}
```

## What Houdini should generate

Use Houdini for content that benefits from simulation/procedural authoring:
- pyro look development;
- debris patterns;
- fracture sources;
- trail/flow fields;
- flipbook/sprite-sheet sources;
- mesh sequences or baked deformation where justified;
- SDF/noise fields converted into runtime textures;
- procedural spell meshes;
- impact decals/masks.

## What Three.js should run live

Prefer runtime GPU-friendly representations for repeated combat effects:
- instanced particle meshes;
- GPU point/quad particles;
- shader-based distortion/noise;
- texture/flipbook animation;
- animated emissive meshes;
- simple trails/ribbons;
- light pulses;
- decals.

Avoid trying to run heavyweight Houdini-style volumetric simulation directly in the browser for ordinary combat effects.

## AI VFX workflow

```text
ability/gameplay spec
 -> VFX agent creates effect spec
 -> choose runtime vs baked components
 -> Houdini generates source/baked assets when needed
 -> export textures/meshes/metadata
 -> Three.js effect component loads them
 -> capture effect from multiple views
 -> visual + performance validation
 -> repair parameters/assets
```

## Validation questions

- Does the charge attach to the correct bone/socket?
- Does launch occur on the correct animation event?
- Does the projectile visual follow the gameplay projectile?
- Does impact occur at the same world position/time as the hit?
- Is the effect readable against bright/dark environments?
- Does it hide enemy telegraphs?
- Does it cause large transparent-overdraw spikes?
- Does cleanup destroy all temporary objects/material references?
```

---

## `legacy-source/WORLD_SCHEMA.md`

SHA-256: `3e9686917598eed9755cebcb41e390cf33bb61f3e1dcbe5068728f72eaf9b8fb`

```markdown
# WORLD_SCHEMA.md — Internal World / Level Contracts

The human does **not** author these files manually. The planning agent creates and maintains them.

## Design principle

Separate **intent** from **geometry**. A world spec says what a place is for, how it connects, what it must contain, and what it should feel like. Houdini decides how to realize most of the geometry.

## World-level shape

```json
{
  "world_id": "ashen_valley",
  "version": 12,
  "seed": 174221,
  "theme": ["dark_fantasy", "ruined_mining_settlement"],
  "scale_meters": {"width": 1800, "depth": 1400},
  "regions": ["village", "mine", "citadel", "marsh"],
  "global_invariants": [
    "boss_arena_reachable",
    "all_required_regions_connected",
    "no_unintentional_world_holes",
    "spawn_to_boss_has_at_least_two_routes"
  ]
}
```

## Region contract

```json
{
  "region_id": "village_market",
  "type": "district",
  "purpose": ["navigation_hub", "combat", "vendor_storytelling"],
  "priority": "hero",
  "bounds_hint": {"center": [120, 0, -40], "radius": 95},
  "density": 0.72,
  "landmarks": ["market_tower", "forge", "mine_gate"],
  "building_archetypes": {
    "residential": 18,
    "shop": 7,
    "warehouse": 4,
    "landmark": 3
  },
  "traversal": {
    "primary_routes": 3,
    "secondary_routes": 6,
    "vertical_routes": 2,
    "secret_routes": 2
  },
  "visual_rules": [
    "mine_gate_visible_from_market_center",
    "tower_breaks_skyline",
    "poor_housing_clusters_upslope"
  ]
}
```

## Connectivity graph

```json
{
  "nodes": [
    {"id": "spawn", "kind": "entry"},
    {"id": "market", "kind": "hub"},
    {"id": "forge", "kind": "encounter"},
    {"id": "mine_gate", "kind": "transition"},
    {"id": "boss", "kind": "boss"}
  ],
  "edges": [
    {"a": "spawn", "b": "market", "mode": "walk", "required": true},
    {"a": "market", "b": "forge", "mode": "walk", "required": true},
    {"a": "market", "b": "mine_gate", "mode": "walk", "required": true},
    {"a": "mine_gate", "b": "boss", "mode": "dungeon", "required": true}
  ]
}
```

**Hard rule:** each required graph edge must map to a traversable physical path or explicit game mechanic (door, elevator, climb, teleport, destructible wall, etc.).

## Dungeon contract

A dungeon is generated from graph-level gameplay intent, not a list of coordinates.

```json
{
  "dungeon_id": "deep_mine",
  "beats": [
    "entrance_decompression",
    "first_ambush",
    "branch_choice",
    "vertical_descent",
    "shortcut_unlock",
    "boss_antechamber",
    "boss"
  ],
  "graph_rules": {
    "critical_path_rooms": [8, 14],
    "optional_rooms": [3, 7],
    "loops": [1, 3],
    "secrets": [1, 4],
    "dead_ends_max_ratio": 0.20
  },
  "room_archetypes": [
    "mine_gallery",
    "collapsed_shaft",
    "storage",
    "ritual_chamber",
    "elevator_room"
  ]
}
```

## Building contract

```json
{
  "building_id": "market_inn_04",
  "archetype": "inn",
  "floors": 2,
  "footprint_class": "medium_irregular",
  "roof": {"required": true, "style": "steep_gable"},
  "interior": {
    "required": true,
    "rooms": ["taproom", "kitchen", "stairs", "bedrooms"],
    "all_rooms_reachable": true
  },
  "entrances": {"public": 1, "service": 1},
  "gameplay": ["loot", "ambush_cover", "upper_floor_vantage"]
}
```

The building generator is free to determine exact wall segmentation and module placement as long as the contract passes validation.

## Asset registry contract

```json
{
  "asset_id": "creature_warg_01",
  "category": "character",
  "source": "generated",
  "source_tool": "tripo",
  "canonical_file": "assets/characters/warg_01.glb",
  "scale_meters": 1.45,
  "forward_axis": "-Z",
  "up_axis": "+Y",
  "rig": {
    "type": "quadruped",
    "status": "validated",
    "provider": "tripo_v2.5"
  },
  "animations": ["idle", "walk", "run", "attack_01", "hit", "death"],
  "lods": [0, 1, 2],
  "collider": "capsule_plus_hitboxes"
}
```

## Build manifest

Record exact seeds, Houdini HIP file, HDA versions, export paths, generated asset task IDs, and git commit hashes when available. Reproducibility matters because an agent must be able to modify one region without rebuilding unrelated accepted content.
```

---

## `legacy-source/validation_report.example.json`

SHA-256: `9a215415a