# REVIEW — 2026-08-19 — Heartvale current build (visual + scale)

**Reviewer:** independent Kimi session (not the builder) · **Subject:**
`codex/heartvale-outdoor` @ `07c06ac6` (2026-08-19 12:50) · **Evidence:**
`heartvale-realistic.hipnc` OpenGL renders of 2026-08-19 12:38 (owner
workspace `souldrifter-thalenyr/heartvale-preview/`) + code read of
`scripts/houdini/build-heartvale-realistic.py`.

**Verdict:** solid layout blockout, canon-anchored and reproducible — but
visually far below the "realistic isometric" target, and built on a scale
authority that conflicts with the owner-approved v2 zone frame. Both are
fixable without redesign; the scale fix must come first.

---

## Finding 0 — CRITICAL: world is ~13× too small (scale conflict)

The build locked its own scale authority before the v2 frame existed
(`docs/HOUDINI_HEARTVALE_PIPELINE.md`, "Scale authority (locked)"):

| Measure | Build (current) | v2 frame (approved) |
| --- | --- | --- |
| 1 atlas % | 8.75 m (5 tiles × 1.75 m) | 120 m (12000 m / 100) |
| Heartvale basin | 280 × 280 m | 3360 × 2700 m (hv-1…hv-7 span) |
| Soul Well → Anwel | 26.3 m (~17 s walk) | 203 m (~2.3 min walk) |
| Soul Well → Vaeldor | ~85 m | ~739 m (~8.2 min walk) |

Bearings and relative positions are correct — this is a pure scale-factor
divergence. **Fix:** re-derive all layout constants from the world frame in
`server/sections.mjs` (origin = plate top-left, +x east, +z south, 1 grid
cell = 1500 m world), per `docs/HANDOFF-2026-08-19-zone-frame-alignment.md`.
Note: the current builder used `data.js` atlas coords; the v2 frame's POI
anchors were measured off the painted plate markers (`HEARTVALE_POIS`) and
are authoritative for boundary math — they differ by ~1%, reconcile to the
frame.

## Finding 1 — Terrain is untextured (material ceiling)

`HVR_Terrain` = white Principled shader, roughness 0.96, **no texture** —
all ground detail is point `Cd` vertex colors at 1.4 m resolution
(`build-heartvale-realistic.py` ~line 181, 426–449). At isometric distance
this reads as flat green felt. No grass/dirt/rock texture, no normal maps,
no roughness breakup.
**Fix:** splat-blended PBR terrain in the Three.js runtime using the
existing 6-channel splat export (`heartvale-splat-u8.raw` + meta JSON) with
Poly Haven CC0 ground textures (aerial grass, dirt, rock) — the export was
clearly designed for exactly this.

## Finding 2 — Water is a flat colored ribbon

`HVR_River_Water`: one flat cyan color, roughness 0.12, no ripple normals,
no depth fade, no bank blend, no foam (~line 184). Rivers read as painted
lines; roads (salmon-tinted splat) read the same and are the wrong color.
**Fix:** runtime water shader (normal-scrolled ripple, depth fade at banks,
edge foam); road splat color to packed-earth brown with wheel-track/rut
breakup via a dirt road texture.

## Finding 3 — Building textures are crude procedural PNGs

Walls/roofs reference procedural textures (`source-assets/textures/heartvale/`:
plaster, thatch, slate, timber…). In renders, walls read flat grey and the
roof pattern reads as corrugated orange plastic; windows/doors are dark
rectangles; no trim, weathering, or edge wear.
**Fix:** replace procedural PNGs with Poly Haven PBR texture sets (wood
planks, plaster, roof tiles/thatch); add trim/foundation courses and
per-building tint/rotation variance.

## Finding 4 — Renderer ceiling (OpenGL viewport renders)

Current renders are Houdini OpenGL/MPlay: single harsh sun, pitch-black
shadows, no GI/AO, no fog/atmospheric haze, hard horizon. Even good assets
look dead here. The realistic-isometric target must be evaluated in the
game's Three.js renderer with the day profile from
`docs/LIGHTING-PROFILES.md` (soft shadows, distance haze, gradient sky).
**Do not iterate on look inside Houdini OpenGL beyond blockout.**

## Finding 5 — Vegetation unverified in current renders

Trees in the 12:38 renders are procedural dark blobs. The latest commit
(`07c06ac6`, 12:50) added real Poly Haven assets (island_tree_01–03,
tree_small_02, shrubs, ferns, boulders) — **after** those renders were
captured. Fresh-render rule: re-render before judging the vegetation pass.

## Finding 6 — Elevation unreadable

Terrace mound, river carve, and Erboug rise exist in the heightmap but are
invisible in renders (no slope shading, flat lighting, no contour cues).
Expected to resolve via Finding 1/4 fixes (textured splat + proper lighting
+ AO). Re-verify after.

## Finding 7 — Runtime integration not started (expected)

The Three.js zone loader is still open work (P0/P1), so nothing is playable
in-browser yet; this review covers the Houdini look-dev scene, which is the
current build output. The look-dev target going forward should be the
runtime, fed by the existing heightmap/splat/layout exports.

## Finding 8 — Known placeholders that must not ship as final

The Anwel well is an untextured grey cylinder; NPC "scale mannequins" are
untextured cylinder dummies; garden/fence/dock dressing is blockout
geometry. Fine as measurement stand-ins — but they must be tracked as
placeholders with a replacement ticket each, or they will silently become
"the look." Every placeholder gets: final-asset source (original or
CC0/Poly Haven per policy), a ticket id, and a removal condition.

## Finding 9 — No stated art-direction anchor + dressing is sparse

"Realistic isometric" was never anchored to a reference, so the scene
drifted to default-Houdini look. **The anchor is the painted M-003 atlas
itself**: warm harvest palette (golden meadows, olive forests, teal rivers),
soft readable forms, painted texture feel — the same art direction as the
approved flat travel maps. At the current dressing density the basin also
reads empty: meadows need grass/flower breakup, road verges need ruts and
stones, riverbanks need reeds and mud variation, and the treeline should
mass toward the Thalholt/west wilds per the plate. Target: standing on the
terrace, the world should read as the M-003 plate come to life in 3D.

## Spec-conformance gaps (runbook alignment — non-visual, all required)

From `ZONE_BUILD_RUNBOOK.md` §3–§5 and the v2 zone cut; none of these exist
in the current build because it predates the frame:

- [ ] World frame: origin = plate top-left, +x east, +z south, meters,
      1 cell = 1500 m — replace the local "1 atlas % = 8.75 m" constant.
- [ ] POI anchors at `HEARTVALE_POIS` world positions (±5 m).
- [ ] No POI/building/prop footprint straddles a zone seam.
- [ ] Nav grid walkable to every seam line where ground is open.
- [ ] Each zone's geometry/props stream as one chunk keyed by zone id
      (`hv-1`…`hv-7`) so neighbors pre-join with no loading screen.
- [ ] Seam terrain height/texture match ≤ 0.05 m against neighbor builds.
- [ ] Local player position available in world-frame meters (for
      `zoneAt(x, z)` boundary detection + multiplayer pre-join).
- [ ] Connector dressing at the named crossing sites in
      `HEARTVALE_ZONE_TICKETS.md` (e.g. "Anwel Ford" ≈ (5437, 2531)).
- [ ] Zone data modules data-authored (no hardcoded geometry in World3D).
- [ ] Visual review gate (runbook §7) passed before owner review.

---

## What is genuinely good (keep)

- Canon-anchored layout: POI bearings/relative positions match the atlas.
- Seeded, reproducible Houdini source (`seed 318044611`) committed as `.hipnc`.
- Poly Haven CC0 intake pipeline (download/reduce scripts + manifest) —
  license-clean per asset policy.
- Portable exports: float32 heightmap, 6-channel splat, layout JSON —
  the right handoff surface for runtime splat terrain.
- 11 NPCs/14 quests/12 monsters + quest engine already data-authored.

## Prioritized fix list (for the restart chat)

1. **Rescale to the v2 frame** (Finding 0) — everything else sits on top.
2. Re-render post-Poly Haven scene; verify vegetation (Finding 5).
3. Move look-dev into the Three.js runtime: splat terrain + water shader +
   day lighting (Findings 1, 2, 4, 6), art direction anchored to the painted
   M-003 palette (Finding 9).
4. Building texture/dressing pass with Poly Haven PBR sets (Finding 3) and
   placeholder replacement tickets (Finding 8).
5. Close every spec-conformance gap in the checklist above (zone chunks,
   seams, world-frame position reporting, connectors).
6. Re-run this review's checklist per `ZONE_BUILD_RUNBOOK.md` §7 before
   showing the owner.
