# RUNBOOK — Building a Zone inside a Section (SoulDrifter world-building contract)

**Audience:** any agent handed a Zone ticket (e.g. `ZONE-HV-1` … `ZONE-HV-7`
in `docs/HEARTVALE_ZONE_TICKETS.md`). Read this whole file before touching
code. Pair it with `docs/THALENYR_SCALE_AND_SECTIONS.md` (scale + taxonomy,
canonical) and `server/sections.mjs` (machine-readable zone registry).

**Mission shape:** you are building ONE Zone — a server/simulation/streaming
slice of a Section (a continuous authored world). Your zone must mesh
seamlessly with its neighbors: no walls, no loading screens, no topology
breaks at the seams.

---

## 1. Taxonomy (speak this language in all tickets/PRs)

**Map/Landmass → Section → Zone → Connector** (+ Shard at runtime).

- **Section** = the world-building unit (e.g. Heartvale). Authored WHOLE:
  one heightmap, one river system, one road network, one prop layout.
- **Zone** = your deliverable: a slice of the Section with its own streaming
  chunk, server zone id, 30-player shard cap, and adjacency list.
- **Connector** = an authored crossing site on a seam (road, ford, bridge,
  trail). Connectors have names and gameplay. NOTE: players can cross the
  seam ANYWHERE, not just at Connectors — the seamless handoff covers the
  entire shared edge.
- **Shard** = runtime overflow instance of your zone (`hv-1#2`). You do not
  build shards; the zone directory (`server/zone-directory.mjs`) does.

## 2. The authoring rule (why roads and rivers line up)

You never build a zone as a standalone map. The Section's master layout is
the single source of truth; your zone is a **viewport into it at a fixed
world rect**. Boundaries are simulation seams, never authored walls. If a
river crosses your seam, you build the water right up to your rect edge using
the master layout's spline — the neighbor does the same from the other side,
and the two halves meet exactly because both came from the same source.

## 3. The world frame (non-negotiable)

- Origin: **top-left corner of the M-003 painted plate**. +x = east, +z = south. Units: **meters**.
- Scale: plate 2048×1152 px, 256 px = 1 grid cell = 30 km canon, **20:1 compression → 1 cell = 1500 m world**. Full plate = 12000 × 6750 m. (`DISTANCE_COMPRESSION` in `server/sections.mjs`.)
- Your zone's world rect, neighbors, and POI positions come from
  `server/sections.mjs` (`HEARTVALE_ZONES`, `HEARTVALE_POIS`) — **do not
  re-measure, do not round, do not "improve" them.** If a number looks wrong,
  raise it in the ticket; don't fork the frame.
- Map your logical tile grid onto this frame and document the tile size in
  your zone data file (e.g. "1 tile = 15 m → hv-1 is 84×29.25 tiles"). POI
  anchor coordinates must land inside YOUR rect per `HEARTVALE_POIS`.
- Heightmap: the basin terrain is one continuous surface; your rect's edge
  heights must match the master layout's values at the seam (tolerance
  ≤ 0.05 m). No cliffs, no ditches, no invisible walls at seams.

## 4. Zone contract (what your zone must contain)

1. **Zone data module** — data-authored (follow `src/game/dungeon.ts`'s
   data-first pattern): tiles/terrain, water, roads, props, NPCs, triggers,
   encounter dressing. No hardcoded geometry in World3D.
2. **Streaming chunk** — your zone's geometry/props load and unload as one
   chunk keyed by your zone id, so the client can stream neighbor chunks in
   the ~50 m pre-join band before a crossing (no loading screen).
3. **POI anchors** — each POI listed in your ticket sits at its
   `HEARTVALE_POIS` world position (±5 m), with its anchor interaction and
   `markAtlasPoi` promotion per the vertical-slice runbook.
4. **Nav grid** — walkable across the full rect INCLUDING the seam edges:
   if the master layout has open ground at the seam, it must be walkable to
   the boundary line (players cross anywhere). Block only water/cliffs per
   the master layout.
5. **Connector dressing** — at each authored crossing site named in your
   ticket, build the crossing content (ford stones, bridge, road crest)
   straddling the seam from your side; coordinate the exact meeting point
   with the neighbor zone's ticket (world coordinates in the ticket).
6. **Multiplayer hook** — your zone reports the local player position in
   world-frame meters so the client can call `zoneAt(x, z)` for boundary
   detection and pre-join. (Base layer: `docs/MULTIPLAYER_BASE_LAYER.md`;
   join with `?mp=ws://…&zone=<your-zone-id>`.)

## 5. Seam checklist (the part that makes slices invisible)

- [ ] Every shared edge matches the neighbor's terrain height/texture at the seam.
- [ ] Roads/rivers that cross a seam enter and exit at the master layout's coordinates — verify against BOTH sides' builds in one scene before calling it done.
- [ ] No POI, building, or prop footprint straddles a seam (they sit fully inside one zone; boundaries run through empty terrain — this is how the v2 cut was drawn; don't undo it).
- [ ] Nav grid is walkable to the seam line wherever the ground is open.
- [ ] Your zone renders correctly with a neighbor chunk streamed beside it (dual-chunk test scene or probe).
- [ ] Fog of war / minimap treats the seam as ordinary ground.

## 6. Ground rules (inherited, non-negotiable)

From the Heartvale vertical-slice runbook — they apply to every zone ticket:

1. **NEVER deploy to GitHub Pages / the live site.** Owner reviews in local preview first, always.
2. `npm run typecheck` and `npm test` green at every commit; never break Level 01 (the Breach).
3. Do not touch `public/lore-atlas/*` — atlas state changes only via `markAtlasPoi()` at runtime.
4. Asset policy: original or licensed/CC0 only, recorded in `third-party-assets.json` (see `docs/ASSET_AND_LICENSE_POLICY.md`). No Ultima-derived data, ever.
5. Low-level magic boundary (canon): mortal-tier techniques only in Heartvale (levels 1–19).
6. Phone-width responsive + desktop must both keep working; respect the 3D budgets in `docs/3d-ai-studio/README.md`.
7. Map-reading rules: POIs shown on water sit NEXT to it; roads/rivers continue through POI markers (never dead-end a road at a settlement).
8. Never leave a dev server running when a task ends.

## 7. Visual review gate (mandatory — added 2026-08-19)

Before a zone build is shown to the owner, it MUST pass an **independent
visual review pass** — done by a fresh session or a different agent than the
builder, with a reviewer's brief (find what's wrong), not a builder's brief
(verify what's done). The reviewer checks:

- [ ] **Renders, not intentions** — capture current renders/screenshots and
      judge them against the owner's visual target (realistic isometric).
      "The geometry exists" is not "it reads correctly."
- [ ] **Material/shader ceiling** — read the material code: untextured
      vertex-color terrain, flat-color water, and procedural placeholder
      textures cap visual quality no matter how good the layout is. Name
      the ceiling explicitly in the review.
- [ ] **Intent vs output** — for every feature the docs claim (elevation,
      river carve, rises, dressing density), verify it is *readable* in the
      render, not merely present in the data.
- [ ] **Scale/frame conformance** — verify world-frame numbers against
      `server/sections.mjs` (rects, POI anchors, distances). Any locally
      invented scale authority is a finding, even if it predates the frame.
- [ ] **Fresh-render rule** — review renders must postdate the last
      content commit. Never judge (or approve) from stale screenshots.
- [ ] Findings are written to `docs/REVIEW-<date>-<zone-id>.md` with
      root causes (code paths, not vibes) and a prioritized fix list.

The owner should never be the first person to catch a basic visual miss —
the process catches it first.

## 8. Driving the builder chat (prompt cadence — added 2026-08-19)

Hard-won lesson from the hv-1 build: a zone build handed to an agent chat as
ONE giant prompt blows through the chat's turn limit and strands uncommitted
work mid-task (the LOD exporter incident). For every remaining zone/section:

1. **One deliverable per prompt.** "Commit the LOD→glTF exporter and nothing
   else", not "do the whole visual pass." A prompt is sized correctly when
   the builder can finish AND commit it inside a single turn.
2. **Commit early, commit often.** Every prompt includes: "commit each
   completed sub-step before starting the next." A turn-limit stop then costs
   nothing — continue picks up from the last commit, never a dirty tree.
3. **Sequence, don't parallelize.** Feed the prompts one at a time in
   runbook order (frame → terrain → water → vegetation → structures →
   dressing → LODs → exports); each builds on the previous commit.
4. **Review between prompts, not at the end.** The §7 visual review gate
   runs per deliverable, so drift is caught after one commit, not after ten.

## 9. Done =

- `npm run typecheck && npm test` green; zone data invariants covered by vitest (rect containment of POIs, nav continuity to seams).
- Probe screenshots: your zone alone, your zone + each built neighbor streamed together, and a seam-crossing walk.
- `docs/SESSION_HANDOFF_<date>_<zone-id>.md` with evidence paths and open issues.
- Report to the owner with the preview URL and exactly what to click. **Do not deploy.**
