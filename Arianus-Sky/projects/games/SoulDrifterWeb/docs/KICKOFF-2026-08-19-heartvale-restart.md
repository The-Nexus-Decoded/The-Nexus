# KICKOFF — 2026-08-19 — Heartvale Restart Brief (read first, new session)

You are taking over the Heartvale outdoor build on branch
`codex/heartvale-outdoor`. A previous session built a Houdini look-dev scene
without the zone frame; an independent review (2026-08-19) found a critical
scale conflict and several material ceilings. Everything you need is in this
repo, on this branch, right now. **Do not start over — reconcile.**

## Read in this order

1. **This file** — the situation and your first moves.
2. `docs/REVIEW-2026-08-19-heartvale-visuals.md` — the full findings list
   with root causes and a prioritized fix list. Your work plan is its §"Prioritized fix list".
3. `docs/HANDOFF-2026-08-19-zone-frame-alignment.md` — the world frame +
   reconciliation checklist for the in-flight build.
4. `docs/ZONE_BUILD_RUNBOOK.md` — the zone-building contract, including the
   mandatory **visual review gate (§7)** that now applies to you.
5. `docs/THALENYR_SCALE_AND_SECTIONS.md` + `server/sections.mjs` — scale
   model, taxonomy (Map → Section → Zone → Connector), the approved v2 zone
   cut, and the machine-readable registry (`HEARTVALE_ZONES`, `HEARTVALE_POIS`).
6. `docs/HEARTVALE_ZONE_TICKETS.md` — your tickets (ZONE-HV-1…HV-5 for the
   vertical slice; HV-1 first).
7. `docs/HOUDINI_HEARTVALE_PIPELINE.md` + `docs/SESSION_HANDOFF_2026-08-18_heartvale.md`
   — what the previous session built and how its pipeline works.

## The one-paragraph situation

The Houdini scene (`source-assets/houdini/heartvale-realistic.hipnc`, seed
318044611) has canon-correct POI *bearings* and a good export surface
(heightmap f32, 6-channel splat, layout JSON), plus a license-clean Poly
Haven intake. BUT it locked its own scale (1 atlas % = 8.75 m; basin =
280×280 m; Anwel 26 m from the Soul Well) before the owner-approved v2 frame
existed (1 % = 120 m; basin = 3360×2700 m; Anwel 203 m). **The world is ~13×
too small.** Terrain is untextured vertex colors, water is a flat colored
ribbon, building textures are crude procedural PNGs, and all current renders
are Houdini OpenGL viewport shots that predate the latest Poly Haven commit.

## Your first moves (in order)

1. **Check for stranded WIP:** the previous session left uncommitted changes
   (Poly Haven texture downloads, `build-heartvale-realistic.py` edits).
   Review `git status`/`git diff`, commit or discard deliberately — do not
   silently lose it.
2. **Rescale to the v2 frame** (Review Finding 0): re-derive the layout
   constants from `server/sections.mjs` — origin = M-003 plate top-left,
   +x east, +z south, meters, 1 grid cell = 1500 m world. POI anchors from
   `HEARTVALE_POIS` (painted-plate measurements are authoritative over
   data.js coords for boundary math). Bearings stay; distances change.
3. **Re-render** the post-Poly Haven scene and verify vegetation
   (Finding 5) — judge nothing from the stale 12:38 renders.
4. **Shift look-dev into the Three.js runtime**: splat-blended PBR terrain
   from the existing splat export + Poly Haven ground textures, a real water
   shader, day lighting per `docs/LIGHTING-PROFILES.md` (Findings 1, 2, 4, 6).
   Houdini stays the layout/scale source; OpenGL renders are blockout-only.
5. **Building dressing pass** with Poly Haven PBR texture sets (Finding 3).
6. Before showing the owner: run the visual review gate checklist
   (`ZONE_BUILD_RUNBOOK.md` §7) and attach fresh renders.

## Ground rules (unchanged, non-negotiable)

- **NEVER deploy to GitHub Pages / the live site.** Owner reviews in local preview first, always.
- `npm run typecheck && npm test` green at every commit; never break Level 01 (the Breach). (Note: 3 test failures in `avatarIdentity`/`presentationBoundaries` were pre-existing on the base branch per the 2026-08-18 handoff — verify current status, don't assume.)
- Do not touch `public/lore-atlas/*` — atlas state only via `markAtlasPoi()` at runtime.
- Asset policy per `docs/ASSET_AND_LICENSE_POLICY.md`; record everything in `third-party-assets.json`. Houdini **Apprentice** artifacts are non-commercial — do not promote into a commercial release.
- Low-level magic boundary: mortal-tier only in Heartvale (levels 1–19).
- Zone seams: no POI/prop straddling a seam; nav walkable to seam lines; one streaming chunk per zone id; seam height match ≤ 0.05 m.
- Never leave a dev server running when a task ends.

## Useful context

- Multiplayer/sharding lives on `feat/multiplayer-base-layer` (30 players/shard,
  on-demand overflow shards, `docs/MULTIPLAYER_BASE_LAYER.md`). The client-side
  boundary detection + pre-join crossover is part of the zone build (hv-1 is
  the reference implementation).
- Review visuals (v2 zone cut, hv-6 meshing diagram) and Playwright probe
  patterns live in the owner's Kimi workspace under `souldrifter-thalenyr/`.
- When done or out of context: write `docs/SESSION_HANDOFF_<date>_heartvale.md`
  with evidence paths, and report to the owner with the preview URL and exactly
  what to click. Do not deploy.
