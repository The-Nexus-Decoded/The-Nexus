# First Breach Houdini Apprentice Pilot

Issue: `The-Nexus #450`

This branch provides a non-commercial Houdini Apprentice pilot for comparing a procedurally authored environment with the current Three.js-built First Breach. Phase 1 does not change the runtime, collision, pathfinding, encounters, or existing character loaders.

## Locked pilot input

- Source layout: `src/game/dungeon.ts#generateSoulwellDungeon`
- Comparison seed: `2215682322`
- Tile size: `1.75` metres
- Houdini: `22.0.368`
- License: Apprentice / non-commercial
- Source scene: `source-assets/houdini/first-breach-apprentice.hipnc`
- Comparison OBJ: generated on demand outside the repository
- Generated stone texture: `source-assets/houdini/first-breach-stone.png`

The Houdini scene preserves the generated training room, galleries, connecting passages, boss arena, prop coordinates, player start, NPC positions, and enemy positions. Its visible model-reference subnet loads the current player, Ilyra, Orren, Brannoc, Breachlings, and Cinderbound Warden models. A hidden library subnet references all current calling and Shadowknight models without placing them into gameplay.

## Visual-material pass

The comparison scene is not an untextured graybox. The deterministic build now creates UVs and a seamless, seed-derived irregular flagstone surface with per-stone tonal variation, recessed joints, cracks, edge dirt, and restrained moss. A procedural bevel pass softens exposed geometry edges so highlights and shadows respond more naturally. Seven Houdini materials cover floors, walls, stone props, aged bronze, aged wood, soul-glass, and embers. Stone uses the generated image as both albedo variation and subtle bump input; soul-glass and embers add emission.

The scene also includes cool and warm directional lights, room-local Soulwell and Ashen Lock lights, controlled ambient fill, and three orthographic cameras:

- `ISO_CAMERA` for the complete generated route
- `TRAINING_MATERIAL_CAMERA` for close material inspection
- `BOSS_MATERIAL_CAMERA` for the Ashen Lock treatment

Two ready-to-render OpenGL nodes live under `/out`: `TRAINING_REVIEW_RENDER` and `BOSS_REVIEW_RENDER`. Both render at 1280x720 with 16 light samples, 4096-pixel anti-aliased area-shadow maps, ambient occlusion, subtle blue-gray distance haze, texture sampling, and restrained bloom on the emissive accents. Select either node and click **Render to MPlay** to review the authored lighting and shadows without changing the scene.

These are look-development references. The web runtime must reproduce the approved material and lighting intent with Three.js-native PBR materials, instancing, lights, and post-processing.

## Seeded environmental history

The environment dressing is procedurally authored, not AI-generated and not fixed to one room arrangement. It uses the dungeon seed and room coordinates to choose wall-adjacent positions, object families, rotations, damage states, and combinations. Room-specific quotas prevent the largest gallery from consuming the entire dressing budget.

- Former occupation: damaged tables, forgotten tools, barrels, storage stacks, crates, and barricades.
- Long decay: irregular masonry, cracked false-wall panels, cave-ins, fallen stone, dirt, and restrained moss.
- Monster occupation: bone scatters, broken defenses, disturbed storage, and debris concentrated in skirmish and boss spaces.
- Gameplay protection: the Houdini scatter rejects tiles close to the player start, NPCs, enemies, authored props, and blocked tiles, then favors walls and corners instead of navigation centers.

The comparison artifact uses seed `2215682322`, but adjacent seed `2215682323` produced a different dungeon size and a different dressing fingerprint. Reusing a seed reproduces its exact dressing. Runtime collision remains unchanged in Phase 1; Phase 2 must classify accepted dressing as blocking or non-blocking before it can affect gameplay.

## Regeneration

From `SoulDrifterWeb` in PowerShell:

```powershell
$layout = Join-Path $env:TEMP 'souldrifter-first-breach-layout.json'
$obj = Join-Path $env:TEMP 'souldrifter-first-breach-environment.obj'
node --experimental-strip-types scripts/houdini/export-first-breach-layout.mjs 2215682322 $layout
& 'H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hython.exe' scripts/houdini/build-first-breach-apprentice.py $layout source-assets/houdini/first-breach-apprentice.hipnc $obj .
```

Houdini Apprentice blocks its glTF exporter, so this non-commercial pilot uses Houdini's permitted OBJ output. The comparison OBJ remains outside the repository and `public/` so an unapproved 14 MB source artifact cannot consume the web deployment budget. Phase 2 may test it locally with Three.js `OBJLoader`; a future production pipeline should convert an approved commercial source through Houdini Indie or a Blender cleanup/export pass to an optimized GLB.

The `.hipnc` scene and generated stone texture are intentionally committed as reproducible pilot sources; the OBJ is regenerated on demand. Do not use Apprentice assets in a commercial release. They cannot be promoted into the commercial pipeline merely by opening them under another Houdini license.

## Phase boundary

Phase 2 may add a query-controlled A/B runtime loader for the exported environment only after the Phase 1 owner checkpoint. The existing logical tiles remain authoritative even when the Houdini environment is visible.

The owner also requested a contained Houdini-authored VFX and animation pilot on this branch. That follow-up phase should prove the pipeline with a small representative set before any cross-branch adoption:

- one layered soul/ember spell with impact, trail, and dissipate timing;
- one ambient dungeon particle treatment suitable for both rooms and corridors;
- one KineFX cleanup/retarget sample using an existing gameplay animation;
- web-friendly baked outputs such as flipbooks, curves, animated meshes, or GLB clips;
- Three.js used as the efficient runtime playback layer, not the simulation authoring tool.

No other branch adopts this workflow automatically. Cross-branch rollout requires successful visual and performance acceptance of this pilot plus explicit owner approval.
