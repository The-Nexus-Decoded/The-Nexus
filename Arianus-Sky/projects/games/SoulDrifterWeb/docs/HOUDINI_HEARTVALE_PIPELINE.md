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

## Provenance

Fully procedural, original work — no third-party or AI-generated assets, so no `third-party-assets.json` record is required. Reusing seed `318044611` reproduces the exact dressing fingerprint; adjacent seeds produce a different but equally valid basin.
