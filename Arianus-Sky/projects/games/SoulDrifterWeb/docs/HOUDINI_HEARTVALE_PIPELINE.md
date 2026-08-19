# Heartvale Soul Well Starting Area — Houdini Pipeline

Branch: `codex/heartvale-outdoor` · Runbook: Zone 2 Heartvale Outdoor (Breach exit + 5 nearest POIs) · Created: 2026-08-18

This is the outdoor counterpart to the First Breach Houdini pilot (`docs/HOUDINI_FIRST_BREACH_PIPELINE.md`). It builds the Heartvale basin of Thalenyr — the world the player steps into after the "way upward" transition — as a procedurally authored Houdini source scene with an exportable OBJ blockout.

## Scale authority (locked)

The layout export script is the single source of truth for outdoor scale. Every future zone, POI, or location MUST be placed with these constants so the world stays consistent with the lore atlas (`public/lore-atlas/data.js`):

| Constant | Value | Meaning |
| --- | --- | --- |
| tile | 1.75 m | matches `src/game/dungeon.ts` tileSize |
| atlas unit | 5 tiles = 8.75 m | atlas coords are % of the realm map |
| zone grid | 160 × 160 tiles = 280 × 280 m | the Heartvale basin |
| zone origin | atlas (38.0, 24.0) → grid (0, 0) | NW corner of the basin |
| world origin | Soul Well terrace (grid 40, 72.5) | +X east, +Z south, +Y up |

Global rule for future zones: `tiles_from_atlas_origin = (atlas_coord − zone_origin) × 5`. Neighboring regions (Kalthorn Spine, Greshfar Plains, The Thalholt) pick their own zone origin and reuse the same multiplier, so cross-zone distances and bearings always match the atlas.

## Canon anchor placement (verified against data.js)

| POI | Atlas (x, y) | Grid (x, y) | World (x, z) metres | Bearing from the Well |
| --- | --- | --- | --- | --- |
| The Soul Well & First Breach | 46.0, 38.5 | 40.0, 72.5 | 0.0, 0.0 | — (zone anchor) |
| Anwel | 46.0, 35.5 | 40.0, 57.5 | 0.0, −26.3 | due north, 26 m |
| Lockroot Vaults | 48.5, 31.0 | 52.5, 35.0 | 21.9, −65.6 | north-east, 69 m |
| Vaeldor | 49.5, 47.5 | 57.5, 117.5 | 30.6, 78.8 | south, 85 m |
| The Erboug Stones | 55.5, 41.0 | 87.5, 85.0 | 83.1, 21.9 | east, 86 m |
| Thalen's Heir | 46.5, 51.5 | 42.5, 137.5 | 4.4, 113.8 | far south, 114 m |

River course canon: the Anwel run flows south past the Well; the Lockroot run comes down from the north-east treeline; they meet at Vaeldor ("raised at the meeting of the rivers") and continue south past Thalen's Heir toward the Fenward Mires.

## What the scene contains

- Zone-wide terrain mesh (3.5 m sampling): rolling meadow, river channel carve, road flattening, the mound behind the terrace that the Breach stair climbs out of, and the Erboug rise. Vertex colors carry grass / dry grass / meadow / dirt road / riverbed / terrace-stone masks.
- Soul Well emergence terrace (world origin): two-step circular platform, the aboveground Well (stone ring, dark shaft, soul-water surface, rim cap), three suspended echo shards, the Breach exit arch with dark passage and worn steps, the awakening-overlook parapet pair facing the basin, flagstone path, and weathered column stubs.
- Water ribbons for all three river courses; compacted dirt ribbons for the full road network connecting all six anchors.
- The Erboug ring blockout (seven standing stones + center slab) and waymark stones at Anwel, Lockroot, Vaeldor, and Thalen's Heir so every future POI site already exists in world space at the correct atlas distance.
- Seeded dressing (seed `318044611`): 110 trees and 48 rocks, dense inside the 22-tile starting-area radius and sparse toward the basin rim. The scatter rejects the terrace pad, rivers, roads, and every anchor site.
- 11 procedural Principled materials (terrain, terrace stone, well stone, river water, soul water, echo shard, portal dark, bark, leaf, rock, marker stone), late-afternoon sun + sky fill, soul-glow point lights, and two orthographic cameras (`ISO_ZONE_CAMERA`, `TERRACE_REVIEW_CAMERA`). Two OpenGL review renders live under `/out` (`TERRACE_REVIEW_RENDER`, `ZONE_REVIEW_RENDER`) — select one and Render to MPlay.

## Regeneration

From `SoulDrifterWeb` in PowerShell:

```powershell
$layout = Join-Path $env:TEMP 'heartvale-soulwell-layout.json'
$obj    = Join-Path $env:TEMP 'heartvale-soulwell-environment.obj'
node scripts/houdini/export-heartvale-soulwell-layout.mjs $layout
& 'H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hython.exe' scripts/houdini/build-heartvale-soulwell-terrace.py $layout source-assets/houdini/heartvale-soulwell-terrace.hipnc $obj
```

Same conventions as the First Breach pilot: the `.hipnc` is committed as the reproducible source; the ~27 MB OBJ is regenerated on demand and stays outside the repository and `public/`. Built with Houdini Apprentice 22.0.368 — non-commercial; do not promote Apprentice artifacts into a commercial release. Runtime integration (Three.js-native re-implementation per runbook phases P0–P1) treats this scene as the look-dev and scale reference; the logical tiles remain authoritative for navigation and collision.

## Realistic pass (`heartvale-realistic.hipnc`)

A second, higher-fidelity scene builds the full living basin on top of the same locked scale — this is the look-dev target for the isometric outdoor world and the portable source for other engines.

- **Terrain**: 200×200-quad grid (1.4 m resolution, shared points) with seeded fBm + domain warp, river carve with soft banks, road flattening, terrace pad blend, and the Erboug rise. Vertex colors are the biome splat (lush grass / dry grass / meadow / dirt road / riverbed / wet bank / terrace stone) driven by moisture and patch noise.
- **Anwel river-town**: six hollow, enterable timber-framed houses (stone footing, plank floor, plaster panel walls with **2.2 m open doorways** facing the green and a window on the back wall, timber corner posts and door surrounds, thatch/slate prism roofs) arranged in a spaced ring around the **village green** — well in the centre, a dirt **lane loop** (`anwel-village-lane` in the layout roads, so terrain flattens and colors it) connecting the green to the river road, and a short **dock spur**. Each house has a fenced **garden plot** with planter boxes, flowers, and soft planting beside or behind it. The river course and the north-south road both pass through the atlas anchor point, so the village sits ~7 m east — beside the road, off the wet bank.
- **Procedural textures** (`source-assets/textures/heartvale/`, generated by `scripts/houdini/generate-heartvale-textures.py`, PIL+numpy, original work): ashlar wellstone, terrace flagstones, daub plaster, timber grain, thatch streaks, slate shingles, grayscale bark (tinted per species), dock planks. Wired via `basecolor_texture`; untextured kinds keep white-base × point-color.
- **Vegetation**: all trees, shrubs, and rocks are **real Poly Haven geometry** — ~130 trees across four species (tree_small_02, island_tree_01/02/03 mapped onto the oak/willow/birch position plan from `scatter_vegetation()`), ~114 shrubs (shrub_01/02/03 + wild rooibos), boulders and path stones (boulder_01, stone_01), mossy outcrops (rock_moss_set_01/02) at six scenic fixed spots, riverbank grass tufts (grass_medium_02), and forest-floor life: ferns, moss patches, wild celandine, stumps, fallen logs, branch litter. Heavy assets scatter **polyreduced prototypes** (`<id>_lod.bgeo.sc`, ~2–4 % of LOD0 prims, made by `reduce-polyhaven-assets.py`); only the two spawn-area hero trees load full LOD0.
- **Grass field**: ~78,000 individually modeled curved blades (wider tapered ribbon prototype, root→tip color gradient) instanced via copy-to-points in three density bands (lush near the terrace, sparser to the basin rim), split lush/dry by moisture noise with a riparian green-up near rivers, plus ~280 scattered Poly Haven grass patches for ground cover. Kept in a separate `HEARTVALE_GRASS_FIELD` geo node so the committed hip and OBJ export stay lean.
- **Sky**: inward-facing gradient cylinder (horizon haze → zenith blue, emissive) + a distant ground plane at y=−4.65 so no camera ray ever hits void.
- **Review set**: ground-level perspective cameras (`GROUND_TERRACE_RENDER`, `ANWEL_STREET_RENDER`, `RIVER_BANK_RENDER`) + the orthographic `ZONE_REVIEW_RENDER`, all OpenGL ROPs with shadows, AO and distance fog.
- **Poly Haven dressing** (`HEARTVALE_POLYHAVEN` geo node): village props — barrel and crate clusters on the dock and at the store barn, wine barrels, buckets at the green's well, a lantern hung beside every house door at 2 m, planter boxes in the gardens. All chains are **live file references** (`$HIP/../polyhaven/<id>/...` → height-normalize → place/scatter), so the committed hip stays lean. Materials are generated per asset from the glTF's own material→texture map (`/mat/PH_*`, `basecolor_texture` wired, point-color tint off). The downloader (`download-polyhaven-assets.py`) strips a *required* `KHR_texture_transform` flag that Houdini's glTF importer rejects (geometry and textures unchanged; recorded in `third-party-assets.json`).
- **NPC scale mannequins** (`HEARTVALE_NPCS` geo node): 1.75 m role-colored stand-ins for all 11 quest NPCs + Brother Owyn, placed at their story posts (Mira/Pell/Anes/Bonn/Cael/Droma/Ils/Fen around Anwel plaza and dock, Wellkeeper Sef at the terrace, Rill and Sergeant Hull along the south road, Brother Owyn beside Cael). Prims carry the NPC id in `name` (`npc_<id>_...`) for later replacement with real character assets.

Regeneration (from `SoulDrifterWeb`):

```powershell
$layout = Join-Path $env:TEMP 'heartvale-soulwell-layout.json'
$out    = Join-Path $env:TEMP 'heartvale-realistic'
node scripts/houdini/export-heartvale-soulwell-layout.mjs $layout
& 'H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hython.exe' scripts/houdini/build-heartvale-realistic.py $layout source-assets/houdini/heartvale-realistic.hipnc $out
```

Headless OpenGL batch rendering segfaults on this driver (Vulkan, GR_PolyCurveVK), so each still is rendered in an isolated process:

```powershell
& '...\hython.exe' scripts/houdini/render-heartvale-still.py source-assets/houdini/heartvale-realistic.hipnc GROUND_TERRACE_RENDER "$out\ground_terrace_render.png"
```

Material notes: geometry carries its color as point `Cd`; every Principled shader keeps a white base with `basecolor_usePointColor=1`, otherwise the OpenGL review pass multiplies base color × point color and everything reads near-black. Grass and leaf materials add a small point-color emission (0.22) so backlit blades and canopy undersides never crush to black.

## Portable terrain export (Unreal / Unity / Three.js)

The realistic build also writes engine-agnostic terrain data next to the OBJ:

| File | Format | Contents |
| --- | --- | --- |
| `heartvale-heightmap-f32.raw` | float32 little-endian, 200×200, row-major (Z rows, south→north) | terrain height in metres |
| `heartvale-splat-u8.raw` | uint8, 200×200 | dominant biome index: 0 grass · 1 dry · 2 road · 3 riverbed · 4 wet · 5 stone |
| `heartvale-terrain-export.json` | JSON | extents, sample count, scale constants, splat legend, import notes |

- **Unreal**: Landscape → Import from Raw, 200×200, Z scale from the JSON `heightRange`; use the splat map as layer masks.
- **Unity**: TerrainData heightmap via script (`SetHeights` from the float grid); splat map drives TerrainLayers.
- **Three.js**: `PlaneGeometry` (199×199 segments) displaced by the float grid — matches the dungeon isometric pipeline's metre scale exactly, so the runtime loader can sample the same file for collision heights.

## Provenance

The terrain, buildings, procedural vegetation, grass blades, and generated textures are fully procedural original work; reusing seed `318044611` reproduces the exact dressing fingerprint. Village props, scatter grass, wild bushes, and the four hero trees are **Poly Haven CC0** assets under `source-assets/polyhaven/`, recorded in repo-root `third-party-assets.json` (`shippingAssets`, license `CC0-1.0`). They are referenced live by the hip and are not yet promoted to `public/assets`.
