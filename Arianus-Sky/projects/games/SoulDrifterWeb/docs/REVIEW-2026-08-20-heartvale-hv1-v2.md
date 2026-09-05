# REVIEW — 2026-08-20 — Heartvale hv-1 v2 runtime (independent §7 gate)

**Reviewer:** Kimi (fresh session, not the builder) · **Branch:** `codex/heartvale-outdoor`
**Reviewed:** commits `3c59f80c`…`1ea3b1f7` + fresh renders `runtime-{soulwell,anwel,river,riverclose,iso}.png` (2026-08-19 21:07–08)

## Verified clean (claims checked against files, not trusted)

- v2 frame conformance: plateOffset, embedded zone registry, live plate-world
  HUD zone readout (soulwell cam → hv-1, anwel cam → hv-2).
- `lockfragment` 7th anchor byte-identical to `server/sections.mjs`;
  exporter endpoint wording corrected (both verifier findings resolved).
- Export integrity: heightmap/splat/tint byte sizes exact (1393×1131 @ 2.5 m),
  soulwell h=1.42 + stone=255, anwel riverbed=255, splat weights sum 255
  (180-texel sweep), 140,918 grass clumps + 850 trees/600 shrubs/250 rocks.
- Quest/spawn data on v2 frame: `gridToWorld()` everywhere, 5 new test
  invariants green. Suite 182/185 at review time (3 pre-existing avatar
  failures — fixed separately in `e5e95c6d`, now 185/185).
- Renders: water reads as teal river (backface fix works), fog whiteout gone,
  houses trimmed (T4), windlass well/terrace read, grass patchiness natural.

## Findings (priority order)

- **V1. Vale reads semi-arid, not lush.** Pale-straw dominates ALL 5 renders;
  M-003 Heartvale is a lush river vale. Grass channel grading + tint pass.
  (Builder self-flagged; reviewer confirms it is the dominant read.)
- **V2. Near-field grass reads as spiky agave cones** (runtime-riverclose):
  oversized flat-shaded solid blades; alpha foliage maps not reading at close
  range. Blades should read 0.25–0.5 m tufts.
- **V3. Trees invisible in 4 of 5 beauty renders** despite 850 planted — only
  distant silhouettes in riverclose. Prove LOD tree instancing at gameplay
  distances with a trees-in-frame render.
- **V7. Tree density far too low for the fiction:** 850 trees over the ~9 km²
  section ≈ 94/km² (1 per ~106×106 m). Woodland character zones (West Vale
  Wilds, Lockroot Reach) want 400–600/km² → ~3,000–6,000 instanced LOD trees
  section-wide. LOD InstancedMesh pipeline already exists to carry this.
  Also: 137/850 trees (16%) sit OUTSIDE every zone rect (margin band) —
  decide: assign to nearest zone or document as deliberate margin belt
  (§5 chunk-ownership question).
  **Owner ruling 2026-08-20: Soul Well Basin treelessness is CANON — the
  basin is grassland on M-003 and the owner approved the current look
  ("i love it"). Do NOT add trees to hv-1. Woodland-zone density may be
  revisited inside those zones' own build tickets (hv-2/hv-6), not as an
  hv-1 change.**
- **V4. Bank→water stair-steps** (riverclose, right bank): 2.5 m grid
  terracing where the carve meets the ribbon. Feather/bevel at higher local
  resolution.
- **V8. Water pales toward fog at grazing angles** (iso) — keep the M-003
  teal; tune fresnel/fog mix. (Builder-acknowledged.)
- **V9. Terrain is diffuse-only** — no per-channel normal maps; close-range
  ground reads flat.
- **V10. Placeholders unfilled, no tickets:** NPC capsules, garden cones,
  lane dressing (Finding 8 lineage). File replacement tickets.
- **V11. Performance gate:** ~~decide one-section-terrain vs chunked tile
  streaming~~ **Owner ruling 2026-08-20: RESOLVED — keep the whole-section
  terrain.** Owner play-tested on an older machine: no lag, and the
  whole-Heartvale vista is explicitly loved ("dont change anything").
  Chunked tile streaming (§4.4) is shelved unless a future perf problem
  appears on phone-width; no perf smoke required for hv-1 sign-off.
- **V12. Seam/chunking checks (§5) untested** — only one dressed zone exists;
  needs a runtime seam-crossing probe verifying road/river continuity.

## Process notes

- Renders (21:07–08) technically predate the river-fix commit (21:14); the
  fix IS visible in them, but the handoff's "postdate all content commits"
  claim was imprecise. Capture after commit next time.
- hv-3…hv-7 POI builds (Vaeldor walls, Erboug ring) are their own zone
  tickets — not hv-1 gaps.

## Owner rulings added 2026-08-20 (canon + direction)

- **V13. Anwel is too small — canon: a small VILLAGE, not a tiny
  settlement.** Current build is 6 houses; expand to a real small-village
  footprint (more homes, lanes, communal plots) inside the hv-2 anchors,
  honoring map-reading ground rule 7 (POIs on water sit NEXT to it; roads
  continue through the village, never dead-end).
- **V14. The Soul Well is NOT a well — it is a small POOL.** Canon: a
  shallow basin filled with a silvery, machine-like liquid substance that
  enables two-way travel between realms. The surroundings (terrace, stone
  apron, breach arch, windlass housing may be repurposed or removed) are
  right; the feature itself must be rebuilt as the silvery pool — liquid
  shader (reflective metallic silver, slow machinic motion), not water,
  no well ring/roof/bucket.
- **V15. Visual direction: TRUE 3D, not isometric.** The owner prefers how
  the zone actually renders ("this is a better direction") — drop any
  isometric-framing targets; the outdoor zone's true-3D look is the style
  benchmark for the game going forward. Consequence: the STARTING ZONE
  (Level 01, the Breach) must be brought up to the outdoor build's true-3D
  standard so the first minutes match the outside (own ticket; runbook
  ground rule 2 — never break Level 01 — applies).
