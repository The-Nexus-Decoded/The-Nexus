# HANDOFF — 2026-08-19 — Heartvale Zone-Frame Alignment

**For:** the agent building the Heartvale outdoor zone (vertical slice, branch
`codex/435-3d-asset-pipeline` or its successor) and any agent picking up a
Heartvale zone ticket.

**Status of this handoff:** the zone frame (v2 cut + taxonomy) was approved
by the owner on 2026-08-19, *after* the Heartvale build had already started.
This document is therefore a **reconciliation guide**: keep what you've
built, align it to the frame below. If anything here conflicts with
in-flight work, the frame wins — but raise conflicts in your session handoff
rather than silently ripping out finished content.

---

## 1. Read first (in this repo)

1. `docs/ZONE_BUILD_RUNBOOK.md` — the zone-building contract. Non-negotiable.
2. `docs/THALENYR_SCALE_AND_SECTIONS.md` — taxonomy (Map → Section → Zone →
   Connector + Shard), scale model, the approved v2 zone cut.
3. `server/sections.mjs` — machine-readable zone registry
   (`HEARTVALE_ZONES`, `HEARTVALE_POIS`). **Numbers come from here — never
   re-measure, never round.**
4. `docs/HEARTVALE_ZONE_TICKETS.md` — your tickets: ZONE-HV-1…HV-5
   (HV-1 marked in-progress = the current build).

## 2. The world frame (align your grid to this)

- Origin: **top-left corner of the M-003 painted plate**. +x = east, +z = south. Units: **meters**.
- Scale: 256 plate px = 1 grid cell = 30 km canon; **20:1 compression → 1 cell = 1500 m world**. Full plate = 12000 × 6750 m.
- Map your logical tile grid onto this frame and document the tile size in
  your zone data file. (This supersedes the vertical-slice runbook's
  "160×160 tiles" suggestion.)

**POI world-meter anchors (authoritative):**

| POI | Zone | World (x, z) |
| --- | --- | --- |
| Soul Well (start, Breach exit) | hv-1 | (5437.5, 2648.4) |
| Anwel | hv-2 | (5437.5, 2441.4) |
| Lockroot Vaults | hv-2 | (5830.1, 2078.9) |
| Vaeldor (capital) | hv-3 | (5900.4, 3234.4) |
| Thalen's Heir | hv-4 | (5127.0, 3503.9) |
| Echoing (Erboug) Stones | hv-5 | (6591.8, 2812.5) |
| Lock-Inscription Fragment | hv-6 | (4851.6, 1687.5) |

**Zone rects (world meters):** hv-1: x 4980–6240, z 2531.25–2970 · hv-2: x
4980–6720, z 1552.5–2531.25 · hv-3: x 4980–6240, z 2970–3375 · hv-4: x
4980–6240, z 3375–4252.5 · hv-5: x 6240–7680, z 2531.25–2970 · hv-6: x
4320–4980, z 1552.5–4252.5 · hv-7: x 6240–7680, z 2970–4252.5.

## 3. Reconciliation checklist for the in-flight build

- [ ] POI anchors match the table above (±5 m). If your Soul Well/Anwel
      positions differ, shift the layout — the frame is authoritative.
- [ ] No POI, building, or prop footprint straddles a zone seam (the v2 cut
      was drawn so boundaries run through empty terrain — keep it that way).
- [ ] Nav grid is walkable to every seam line where the ground is open —
      players cross anywhere, not just at roads.
- [ ] Your zone's geometry/props load as **one streaming chunk keyed by zone
      id** so neighbors can pre-join with no loading screen.
- [ ] Terrain height/texture will match neighbors at seams (tolerance
      ≤ 0.05 m) — one master layout, sliced; roads/rivers continue across
      seams by construction.
- [ ] Local player position is available in world-frame meters (for
      `zoneAt(x, z)` boundary detection + multiplayer pre-join).

## 4. Ground rules (unchanged, restated)

- **NEVER deploy to GitHub Pages / the live site** — owner reviews in local preview first, always.
- `npm run typecheck && npm test` green at every commit; never break Level 01.
- Do not touch `public/lore-atlas/*` — atlas state only via `markAtlasPoi()` at runtime.
- Asset policy per `docs/ASSET_AND_LICENSE_POLICY.md`; every third-party/AI artifact recorded in `third-party-assets.json`.
- Low-level magic boundary: mortal-tier only in Heartvale (levels 1–19).
- Never leave a dev server running when a task ends.

## 5. Multiplayer note

Shard overflow instancing is live on `feat/multiplayer-base-layer`
(30 players/shard, on-demand shards `hv-1#2`…, relay isolated per shard).
Join from the game URL with `?mp=ws://localhost:8787&zone=hv-1`. See
`docs/MULTIPLAYER_BASE_LAYER.md`. The client-side boundary detection +
pre-join crossover is part of the zone build (runbook §4.6) — hv-1 is the
reference implementation for all other zones.

---

*Authored by the Kimi session that produced the v2 cut; review visuals live
in the owner's Kimi workspace (`souldrifter-thalenyr/heartvale_section_cut_v2.png`,
`heartvale_hv6_meshing.png`).*
