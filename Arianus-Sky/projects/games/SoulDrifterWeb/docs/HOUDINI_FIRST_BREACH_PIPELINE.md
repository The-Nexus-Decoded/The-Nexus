# First Breach Houdini Apprentice Pilot

Issue: `The-Nexus #450`

This branch provides a non-commercial Houdini Apprentice pilot for comparing a procedurally authored environment with the current Three.js-built First Breach. Phase 1 does not change the runtime, collision, pathfinding, encounters, or existing character loaders.

## Locked pilot input

- Source layout: `src/game/dungeon.ts#generateSoulwellDungeon`
- Owner review seed: `4182`
- Tile size: `1.75` metres
- Houdini: `22.0.368`
- License: Apprentice / non-commercial
- Source scene: `source-assets/houdini/first-breach-apprentice.hipnc`
- Comparison OBJ: generated on demand outside the repository
- PBR sources: existing `public/assets/textures/environment/first-breach/flagstone-*` and `masonry-*` sets

The Houdini scene preserves the generated training room, galleries, connecting passages, boss arena, prop coordinates, player start, NPC positions, and enemy positions. The approved environment kit is visible under `/obj/APPROVED_DUNGEON_KIT`. The gameplay and complete-character reference subnets remain available but hidden during environment review so character material fallbacks and rig guides cannot contaminate the lighting comparison.

The Houdini-only review composition guarantees coverage of all 38 approved environment asset IDs for every valid seed. It preserves the generator's existing placements, replaces the two procedural exit markers with the imported rusted portcullis and heavy door, then places only missing kit families in seed-stable, room-appropriate boundary sockets. Seed `4182` contains 51 imported environment instances: 16 in training, 25 in skirmish spaces, and 10 in the boss room. Each imported node stores its asset ID, semantic room, and source path as Houdini user data for direct scene auditing.

Houdini 22's GLTF 2.0 SOP cannot read images embedded in binary `.glb` files. The deterministic builder therefore extracts each used kit asset's embedded base-color and normal maps into the ignored `source-assets/houdini/.cache/dungeon-kit-textures/` folder, creates a dedicated Principled material, and assigns it to the imported mesh. The cache is regenerated from committed source GLBs and is never a source-of-truth artifact.

## Owner-directed visual revision

The initial generated-stone look was rejected because its floor and walls were too similar, too clean, and less convincing than the existing game room. The revised comparison scene reuses the game's established PBR sources rather than synthesizing a shared stone image: dark worn flagstone color, normal, and roughness maps are exclusive to the floor, while rough-cut masonry color, normal, and roughness maps are exclusive to staggered wall courses and architectural stone. Mortar backing, irregular block depth, buttresses, capstones, and a procedural bevel pass prevent the boundary walls from reading as repeated floor tiles.

Eleven Houdini materials now separate floor, wall, stone prop, aged bronze, aged wood, dark iron, mortar, bone, moss, soul-glass, and ember surfaces. Emission is deliberately restrained so the Soulwell and rune accents remain localized light sources instead of neon debug geometry.

The training room has an authored identity layer on top of the authoritative seeded layout: the Soulwell has a stepped basin and iron cradle, the back wall has an archive shrine and three realm reliefs, occupied-era shelves and broken furniture line the perimeter, columns show intact and fallen states, and grime, moss, fractures, and rubble break up the floor. The east wall contains two unmistakable separate exits: the cyan Wayfarer gate for the easier path and the ember Oathbreaker gate for the harder path. Their positions still come from `gate-wayfarer` and `gate-oathbreaker` in the generated dungeon payload.

The boss room is staged as the Ashen Lock rather than a generic empty rectangle: a soot-dark ritual lock, bronze channels, damaged monoliths, perimeter columns, collapsed corners, a chained reliquary, bones, ash-stained stone, and controlled fire pools give the arena a distinct combat silhouette while leaving its navigation center readable.

The scene also includes cool and warm directional lights, room-local Soulwell and Ashen Lock lights, controlled ambient fill, and four orthographic cameras:

- `ISO_CAMERA` for the complete generated route
- `TRAINING_MATERIAL_CAMERA` for close material inspection
- `SKIRMISH_MATERIAL_CAMERA` for the occupied galleries and monster takeover kit
- `BOSS_MATERIAL_CAMERA` for the Ashen Lock treatment

Four ready-to-render OpenGL nodes live under `/out`: `FULL_ROUTE_REVIEW_RENDER`, `TRAINING_REVIEW_RENDER`, `SKIRMISH_REVIEW_RENDER`, and `BOSS_REVIEW_RENDER`. They render at 1280x720 with 16 light samples, 4096-pixel anti-aliased area-shadow maps, ambient occlusion, subtle blue-gray distance haze, texture sampling, and restrained bloom on the emissive accents. Select a node and click **Render to MPlay** to review the complete route or a room-scale asset composition without changing the scene.

These are look-development references. The web runtime must reproduce the approved material and lighting intent with Three.js-native PBR materials, instancing, lights, and post-processing.

## Seeded environmental history

The environment dressing is procedurally authored, not AI-generated and not fixed to one room arrangement. It uses the dungeon seed and room coordinates to choose wall-adjacent positions, object families, rotations, damage states, and combinations. Room-specific quotas prevent the largest gallery from consuming the entire dressing budget.

- Former occupation: damaged tables, forgotten tools, barrels, storage stacks, crates, and barricades.
- Long decay: irregular masonry, cracked false-wall panels, cave-ins, fallen stone, dirt, and restrained moss.
- Monster occupation: bone scatters, broken defenses, disturbed storage, and debris concentrated in skirmish and boss spaces.
- Gameplay protection: the Houdini scatter rejects tiles close to the player start, NPCs, enemies, authored props, and blocked tiles, then favors walls and corners instead of navigation centers.

The current owner-review artifact uses seed `4182`. Reusing a seed reproduces its exact dressing. Room identity pieces stay attached to their semantic room and authored prop coordinates, while incidental clutter varies with the seed. Runtime collision remains unchanged in Phase 1; Phase 2 must classify accepted dressing as blocking or non-blocking before it can affect gameplay.

## Regeneration

From `SoulDrifterWeb` in PowerShell:

```powershell
$layout = Join-Path $env:TEMP 'souldrifter-first-breach-layout.json'
$obj = Join-Path $env:TEMP 'souldrifter-first-breach-environment.obj'
node --experimental-strip-types scripts/houdini/export-first-breach-layout.mjs 4182 $layout
& 'H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hython.exe' scripts/houdini/build-first-breach-apprentice.py $layout source-assets/houdini/first-breach-apprentice.hipnc $obj .
```

Houdini Apprentice blocks its glTF exporter, so this non-commercial pilot uses Houdini's permitted OBJ output. The current comparison OBJ is roughly 58 MB and remains outside the repository and `public/` so an unapproved source artifact cannot consume the web deployment budget. Phase 2 may test it locally with Three.js `OBJLoader`; a future production pipeline should convert an approved commercial source through Houdini Indie or a Blender cleanup/export pass to an optimized GLB.

The `.hipnc` scene is intentionally committed as a reproducible pilot source and references the existing game-owned PBR textures; the OBJ is regenerated on demand. Do not use Apprentice assets in a commercial release. They cannot be promoted into the commercial pipeline merely by opening them under another Houdini license.

## Phase boundary

Phase 2 may add a query-controlled A/B runtime loader for the exported environment only after the Phase 1 owner checkpoint. The existing logical tiles remain authoritative even when the Houdini environment is visible.

The owner also requested a contained Houdini-authored VFX and animation pilot on this branch. That follow-up phase should prove the pipeline with a small representative set before any cross-branch adoption:

- one layered soul/ember spell with impact, trail, and dissipate timing;
- one ambient dungeon particle treatment suitable for both rooms and corridors;
- one KineFX cleanup/retarget sample using an existing gameplay animation;
- web-friendly baked outputs such as flipbooks, curves, animated meshes, or GLB clips;
- Three.js used as the efficient runtime playback layer, not the simulation authoring tool.

No other branch adopts this workflow automatically. Cross-branch rollout requires successful visual and performance acceptance of this pilot plus explicit owner approval.
