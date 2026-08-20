# REVIEW — 2026-08-20 — BREACH-V2 (issue #451)

**Status:** builder-side review record. The runbook §7 independent gate (fresh session,
reviewer's brief below) is still REQUIRED before the owner is shown — this document seeds it
with measured evidence, not intentions.

## Reviewer's brief (for the fresh-session reviewer)

1. Open the flat map `docs/maps/breach-v2/breach-v2-flatmap-1600.webp` and the registry
   `src/game/dungeons/breach-v2-registry.mjs`. Verify the registry against the map
   (measured-only: room dims, pools, sockets, tables — no invented numbers).
2. Render FRESH probe shots from the runtime preview (dev server +
   `?dungeonPreview=breach-v2&seed=4182&path=wayfarer|oathbreaker&cam=vestibule|plaza|gallery|boss|exit|overview`,
   plus seeds 7/1/2 for sparse/median/dense). Judge renders against the map and canon —
   never the builder's prose.
3. Verify scale/frame conformance against the registry (meters, chamber counts, pool
   separation, socket integrity) and name material/shader ceilings.
4. Record findings here; the owner is never the first to catch a basic miss.

## Evidence examined (this builder's pass)

- Probe matrix: 10 shots, all clean (0 console errors, 0 failed requests, no loop errors) —
  `workspace\souldrifter-thalenyr\playtest\breach-v2\*.png`, `probe-report-*.json`.
- Renderer stats (HUD, recorded per shot): 755–1,156 draw calls, 2.49–3.39 M triangles.
  Rejected #450 scene: 2,211 calls / 3.78 M tris. Under on both axes; density pass noted
  as follow-up (see handoff issue 2).
- `npm run typecheck` green; `npm test` 171/171 (registry consistency, generator §4
  invariants on a 500-seed sweep ×2 paths incl. 4182, fixture/live byte parity).
- Houdini build headless: 13 rooms, 109 kit placements, 3,768 shell points / 4,082 prims.

## Findings vs map + canon (renders, not intentions)

| Check | Result | Evidence |
|---|---|---|
| Soul Well = small silvery glowing pool (V14) | PASS — pool Ø 3.6 m reads with rim, ripples, shard, cyan glow | `4182-wayfarer-vestibule.png` |
| True-3D perspective, Heartvale stack (V15) | PASS — perspective OrbitControls, PBR, real-time light; no isometric framing | all shots |
| No visible gameplay cells at gameplay distance | PASS — world-scale UVs (1 repeat / 4 m), merged continuous shell | vestibule/plaza/gallery/boss shots |
| Two physically distinct doors, soul-cyan vs ember | PASS — distinct exits + door accent lights + veils + banners | `4182-wayfarer-plaza.png` |
| Threshold plaza safe, Orren/Brannoc present | PASS (markers; characters are #448 scope) | plaza shot |
| 3–5 chambers per run, pool separation | PASS — 500-seed sweep ×2 paths + fixtures 7/1/2 | tests + `*-overview.png` |
| Corruption densest at Ashen Lock, cleanest Vestibule | PASS — veins scale with registry corruption levels | boss vs vestibule shots |
| Gates/doors convincing | PASS — heavy-door kit models in real wall openings + lintels | plaza shot |
| Darkness never blocks navigation/readability | PASS after lighting pass (base fills + per-room fills + door accents) | all shots |
| Exit reads as first outdoor moment into Heartvale | PASS — daylight portal + westward spot; world anchor recorded | `4182-wayfarer-exit.png` |
| Wall art zoom-readable (§5A) | PASS for the three map arts (atlas/section/zone); reliefs/banners are labeled placeholders pending local-GPU art | vestibule + plaza shots |
| Books/scrolls present (Add-on A #4) | PASS (texture-based blocks; covers pending local art) | vestibule shot |
| Boss = Cinderbound Warden, 1 per run, seeded pattern | PASS (anchor ring + ember; monster model is #448 scope) | boss shots + tests |
| First Memory awarded once | PASS at data level (vault, sealed link, registry invariant) | registry + tests |
| Kit gap fill (4 uncovered IDs) | PASS — heavy-door = trial doors; false-wall-panel H-03; reliquary-alcoves E-03/vault; hanging-brazier = chain-mounted variant | registry coverage test |
| `npm run build` (150 MiB prune gate) | **FAIL — pre-existing** (155.1 MB; handed branch ~153.9 MB before this ticket's 1.2 MB) — owner ruling requested | handoff issue 1 |

## Named material/shader ceilings

- Kit GLBs: meshopt-compressed, catalog-normalized scale/ground; PBR channels preserved
  (glTF combined map G=roughness, B=metallic — asserted by catalog-parity test).
- Shell: flagstone/masonry color+normal(GL)+roughness+AO, world-scale UV, merged per material.
- Shadow ceiling: only soul-well + boss point lights cast shadows (point-light shadow maps
  consume shader texture units; uncapped fire lights exceeded MAX_TEXTURE_IMAGE_UNITS(32)
  and broke programs — now capped by construction).

## Gate verdict (builder pass)

Ready for the independent §7 pass, then the owner. Blocking owner decision: build budget.
