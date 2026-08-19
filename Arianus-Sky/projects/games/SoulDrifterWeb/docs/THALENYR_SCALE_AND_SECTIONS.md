# Thalenyr — World Scale, Zone Tiling, and Seamless Traversal

Design contract for turning the painted Thalenyr atlas (M-003) into playable
mini-world zones. Status: **v2 POI-safe zone cut + taxonomy approved by the
owner (2026-08-19)**; shard overflow instancing is implemented on
`feat/multiplayer-base-layer`; in-world tile streaming and boundary crossover
land with the Heartvale world build (see `docs/ZONE_BUILD_RUNBOOK.md` and
`docs/HEARTVALE_ZONE_TICKETS.md`).

---

## 0. World-building taxonomy (approved — use in all docs/tickets)

| Level | What it is | Example |
| --- | --- | --- |
| **Map / Landmass** | A whole painted realm map | Thalenyr (M-003) |
| **Section** | Named sub-region of a landmass — the **world-building unit**, authored as ONE continuous world | Heartvale, Thalholt, Greshfar Plains, Fenward Mires |
| **Zone** | Server/simulation/streaming slice of a section — 30 players per shard, adjacency pre-join | `hv-1` Soul Well Basin … `hv-7` East March |
| **Connector** | An *authored* crossing site on a zone seam — road crossing, river ford, bridge, trail; has a name and gameplay (guards, tolls, ambushes) | "Anwel Ford", "Heir's Road crossing" |
| **Shard** | Runtime overflow instance of a zone (`hv-1#2`) — operational only, not world-building | — |

So: **Map → Sections → Zones → Connectors** (+ shards at runtime).

**The authoring rule:** a Section is built **whole** — one heightmap, one
river system, one road network, one prop layout — and only then sliced into
Zones. Zone boundaries are simulation seams, never authored walls, so roads
and rivers line up across zones *by construction*. Zone membership at runtime
is decided purely by world coordinates (`zoneAt(x, z)` in
`server/sections.mjs`), never by which road or river the player followed.

---

## 1. Scale model — what "1 day on foot" means

The M-003 legend plaque reads:

> Scale: relative ~ 2 days on foot / 1 grid cell = 1 day on foot

The painted plate (2048×1152 px) has no printed grid, so we define it:

| Unit | Value |
| --- | --- |
| Grid cell (painted plate) | 256 px |
| **Canon scale** | **1 cell = 1 day on foot = 30 km** |
| Full plate (canon) | 8 × 4.5 cells = 240 km × 135 km |
| Heartvale span | ≈ 2 cells ≈ 60 km across (matches the legend's "~2 days on foot") |

**Is a "day on foot" real-time walking? No.** Literal real-time is absurd:
30 km at 1.5 m/s walk speed is ~5.5 hours of holding W per cell. We apply a
**20:1 distance compression** (`DISTANCE_COMPRESSION` in
`server/sections.mjs` — tune in one place):

| World unit | Value |
| --- | --- |
| 1 cell in-world | 30 km ÷ 20 = **1500 m** |
| Walk time per cell | 1500 m at 1.5 m/s ≈ **16.7 min** continuous |
| Full plate in-world | **12 000 m × 6750 m** |

Walk times between Heartvale landmarks (world meters @ 20:1):

| Route | Distance | Walk |
| --- | --- | --- |
| Soul Well → Anwel | 203 m | 2.3 min |
| Soul Well → Vaeldor | 739 m | 8.2 min |
| Vaeldor → Thalen's Heir | 450 m | 5.0 min |
| Soul Well → Lockroot | 588 m | 6.5 min |
| Soul Well → Erboug Stones | 1152 m | 12.8 min |
| Vaeldor → Greshgarth | 2041 m | 22.7 min |

Every zone we build derives its footprint from the painted landmass through
this same pipeline: measure px span on the plate → cells → ×1500 m. Zone
geometry therefore **exactly matches the landmass size as portrayed on the
map**, at the compressed play scale.

---

## 2. Heartvale zone cut (v2 — POI-safe, approved)

v1 lesson: boundaries must run through **empty terrain** — v1 cut Anwel and
Thalen's Heir in half and left the Lock-Inscription Fragment uncovered. v2
moves every seam between POIs (all marker positions measured on the plate).

| Zone | Name | Plate rect (% x, % y) | World rect (m) | Size | POIs |
| --- | --- | --- | --- | --- | --- |
| hv-1 | Soul Well Basin (start) | 41.5–52, 37.5–44 | 4980–6240 × 2531–2970 | 1260 × 439 m | Soul Well |
| hv-2 | Anwel & Lockroot Reach | 41.5–56, 23–37.5 | 4980–6720 × 1553–2531 | 1740 × 979 m | Anwel, Lockroot Vaults |
| hv-3 | Vaeldor Crown | 41.5–52, 44–50 | 4980–6240 × 2970–3375 | 1260 × 405 m | Vaeldor (capital) |
| hv-4 | Thalen's Heir | 41.5–52, 50–63 | 4980–6240 × 3375–4253 | 1260 × 878 m | Thalen's Heir |
| hv-5 | Erboug Stones | 52–64, 37.5–44 | 6240–7680 × 2531–2970 | 1440 × 439 m | Echoing Stones |
| hv-6 | West Vale Wilds | 36–41.5, 23–63 | 4320–4980 × 1553–4253 | 660 × 2700 m | Lock-Inscription Fragment |
| hv-7 | East March | 52–64, 44–63 | 6240–7680 × 2970–4253 | 1440 × 1283 m | — (wilderness march) |

Measured POI positions (plate px → world m; plate px is authoritative for
boundary math — `HEARTVALE_POIS` in `server/sections.mjs`):

| POI | Zone | Plate px | World m |
| --- | --- | --- | --- |
| Soul Well (start) | hv-1 | (928, 452) | (5437.5, 2648.4) |
| Anwel | hv-2 | (928, 417) | (5437.5, 2441.4) |
| Lockroot Vaults | hv-2 | (995, 355) | (5830.1, 2078.9) |
| Vaeldor (capital) | hv-3 | (1007, 552) | (5900.4, 3234.4) |
| Thalen's Heir | hv-4 | (875, 598) | (5127.0, 3503.9) |
| Echoing Stones | hv-5 | (1125, 480) | (6591.8, 2812.5) |
| Lock-Inscription Fragment | hv-6 | (828, 288) | (4851.6, 1687.5) |

Adjacency (shared edges — used for pre-join crossover):

- hv-1 ↔ hv-2, hv-3, hv-5, hv-6
- hv-2 ↔ hv-1, hv-5, hv-6
- hv-3 ↔ hv-1, hv-4, hv-6, hv-7
- hv-4 ↔ hv-3, hv-6, hv-7
- hv-5 ↔ hv-1, hv-2, hv-7
- hv-6 ↔ hv-1, hv-2, hv-3, hv-4
- hv-7 ↔ hv-3, hv-4, hv-5

**How long/odd shapes mesh (hv-6 is the case study):** hv-6 is a 660 × 2700 m
strip whose east edge is shared with four different zones along its length.
Crossing anywhere along that edge lands you in whatever zone contains the
ground you step onto — top segment → hv-2, then hv-1, hv-3, hv-4 toward the
bottom. The client pre-joins only the zone whose edge is actually being
approached. A zone does not need to be square; it needs to be contiguous,
bounded in player load, and clean in adjacency.

Canonical source: `server/sections.mjs`. Review visuals live in the owner's
Kimi workspace (`souldrifter-thalenyr/heartvale_section_cut_v2.png` and
`heartvale_hv6_meshing.png`) — review artifacts, not runtime assets.

Outside this cut (neighboring sections, future tickets): Greshgarth and
Farwatch Ruin (Greshfar Plains), Heartroot Hollow (Thalholt), Fenward Mires,
Korvel Reaches.

---

## 3. Shard overflow instancing (implemented)

Each zone is backed by one or more shards (`server/zone-directory.mjs`):

- Shard id `<zone>#<n>` (e.g. `hv-1#2`). One shard = one `ZoneRoom`, cap 30.
- Joins land in the **first non-full shard**; a fresh shard is created on
  demand only when every existing shard is at cap. A busy zone therefore
  pushes overflow players into **another instance of the same area** — nobody
  is rejected in normal operation.
- `full` is returned only when the hard `maxShards` ceiling is exceeded
  (default 10 shards/zone = 300 concurrent per area; safety valve, env
  `MAX_SHARDS`).
- Empty shards close automatically; freed serials are reused, so instance
  count tracks real load.
- `welcome` carries `shard` + `shards` (live count); the HUD badge shows e.g.
  `hv-1 · #2 · 27/30 drifters`. `/health` reports per-shard occupancy.
- State relay is isolated per shard: players in `hv-1#1` never see `hv-1#2`.

Verified by `tests/zoneDirectory.test.mjs` (6 tests) and the live
`scripts/mp-smoke-test.mjs` (31-client overflow scenario).

---

## 4. Seamless zone transitions (design — lands with the world build)

Goal: **no loading screen** when moving between zones, at any point along a
shared edge (not just at Connectors).

1. **Pre-join**: when the local player comes within ~50 m of a zone edge,
   the client opens a second connection and joins the adjacent zone's shard
   (the directory picks the first non-full shard).
2. **Dual-receive**: during the crossover band the client renders both
   shards' remote players; the local player keeps publishing to the current
   shard only.
3. **Crossing confirm**: once `zoneAt(x, z)` reports the neighbor, the
   client transfers presence — final state to the old shard, publishes to
   the new shard, drops the old connection after a short hysteresis
   (~2 s or ~10 m past the edge) to avoid flap on the line.
4. **World geometry**: the adjacent zone's terrain/props stream in as the
   player approaches (same ~50 m band). Tile-level streaming of the
   Heartvale world mesh is part of the zone build, not this networking
   layer.

Edge case — destination shard full at the moment of crossing: the directory
creates the next shard transparently (the badge's shard id ticks over).
Party-aware shard affinity (friends crossing together land in the *same*
shard) is a follow-up — directory hint `?shard=hv-2#1`, noted, not built.

---

## 5. What lands where

| Piece | Status |
| --- | --- |
| Scale model + v2 zone registry (`server/sections.mjs`) | Done (this branch) |
| Shard overflow instancing + tests + smoke | Done (this branch) |
| v2 zone cut + taxonomy (owner-approved) | Done (this doc) |
| Zone build runbook (`docs/ZONE_BUILD_RUNBOOK.md`) | Done (this branch) |
| Per-zone tickets (`docs/HEARTVALE_ZONE_TICKETS.md`) | Done (this branch) |
| Client boundary detection + pre-join crossover | Zone build (tickets HV-x) |
| Terrain/prop tile streaming | Zone build (tickets HV-x) |
| Party-aware shard affinity | Follow-up |
| Tickets for remaining Thalenyr sections | Blocked until Heartvale validated in-game (ticket THALENYR-SECTIONS-01) |
