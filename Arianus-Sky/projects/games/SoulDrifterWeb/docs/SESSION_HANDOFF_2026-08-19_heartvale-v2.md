# SESSION HANDOFF — 2026-08-19 (evening) — Heartvale v2 frame + runtime look pass

**Branch:** `codex/heartvale-outdoor` · **Builder:** Kimi (this session) ·
**Status:** T6/T1–T5 landed; fresh runtime renders captured; **independent
review gate (runbook §7) NOT yet run** — see caveat below.

## What landed (commits, newest first)

1. River channel + water visibility + terrain tint repair
   - **Root-cause fix:** river ribbon triangle winding faced −Y → all water
     backface-culled. Diagnosed via in-page Playwright probes (geometry,
     bounds, loop liveness, red-cube control) before touching the shader.
   - River carve widened in the Houdini build (12.5 m channel) so banks no
     longer bury the ribbon; splat/exclusion radii aligned.
   - Splat-B/tint DataTextures repacked RGB→RGBA (WebGL2 texStorage rejected
     sRGB RGB → tint had been silently black since the first runtime shot).
   - Water: teal M-003 palette, fresnel 0.32, spec 0.45; manual uniform
     assembly (UniformsUtils.merge drops texture needsUpdate).
2. Three.js zone preview runtime (`src/game/zones/heartvale/`) — data-authored
   loaders (data.ts), splat terrain (terrain.ts, T3), river water (water.ts),
   LOD vegetation instancing + wind grass (vegetation.ts, T2), parametric
   Anwel + soulwell terrace (village.ts, T4), scene/lighting/N8AO/HUD
   (preview.ts, T5). Entry: `?zonePreview=hv-1&cam=soulwell|anwel|river|riverclose|iso`.
3. Runtime assets promoted: 7 ground splat texture sets + per-material LOD
   glTFs (scripts/houdini/export-lod-gltf.py) + PNG alpha foliage maps.
4. `lockfragment` (hv-6) added as 7th layout anchor (measured-only,
   driftMeters null); exporter docstring reworded: **POI-connecting**
   endpoints snap 0.00 m; river sources/north-exit road end 292–497 m from
   anchors by design.
5. v2 frame build: heightmap/splat/tint/scatter/village/npcs exports from one
   numpy HeightField (2.5 m grid, soulwell-local; plateOffset in meta).

## Evidence

- Fresh renders (postdate all content commits, 0 console errors):
  `C:\Users\olawal\Documents\kimi\workspace\souldrifter-thalenyr\heartvale-preview\runtime-{soulwell,anwel,river,riverclose,iso}.png`
- `npm run typecheck` green. `npm test`: 177/180 — the 3 failures
  (avatarIdentity, presentationBoundaries) predate this session (verified
  against files it touches: none overlap).
- Review hooks: `window.__zoneScene/__zoneData/__zoneCamera/__zoneRenderer/__zoneFrames/__zoneLoopError`.

## Review-gate caveat (runbook §7)

I am the builder, not an independent reviewer. The §7 gate requires a fresh
session with a reviewer's brief. Before owner sign-off, spawn one with:
`docs/REVIEW-2026-08-19-heartvale-visuals.md` checklist + the renders above
+ `?zonePreview=hv-1` live. Known-remaining soft spots to hand the reviewer:

- Water still pales toward fog color at extreme grazing (iso) — physical-ish
  but check against the M-003 teal plate intent.
- Ground meadow reads pale-straw; grass channel grading may want more green.
- NPC figures + garden cones + lane dressing are tracked placeholders
  (Finding 8) — no replacement tickets filed yet.
- No per-channel normal maps on terrain (diffuse-only blend).
- zoneHeartvale.ts quest/spawn data still uses old-scale coordinates — needs
  a world-meters pass before the quest engine drives this zone live.
- Seam/chunking checks (§5) untested: hv-1 is the only built zone so far.

## Rebuild commands

```powershell
node scripts/houdini/export-heartvale-soulwell-layout.mjs source-assets/houdini/heartvale-layout.json
& 'H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hython.exe' `
  scripts/houdini/build-heartvale-realistic.py source-assets/houdini/heartvale-layout.json `
  source-assets/houdini/heartvale-realistic.hipnc public/data/zones/heartvale
& 'H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hython.exe' scripts/houdini/export-lod-gltf.py
python scripts/houdini/download-polyhaven-textures.py   # ground + building PBR sets
```
