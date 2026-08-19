# Thalenyr — World Scale, Section Tiling, and Seamless Traversal

Design contract for turning the painted Thalenyr atlas (M-003) into playable
mini-world zones. Status: **scale model + Heartvale section cut awaiting owner
approval**; shard overflow instancing is implemented (this branch); in-world
tile streaming and boundary crossover land with the Heartvale world build.

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
**20:1 distance compression** (a named constant, `DISTANCE_COMPRESSION` in
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

> Open question for the owner: the legend's "~2 days on foot" is read as the
> Heartvale span; confirm before locking. The 20:1 compression is the
> recommended feel (MMO-typical); raise it for a more epic/hardcore traversal
> game, lower it for a denser one.

---

## 2. Heartvale section cut (first area)

Heartvale is split into **7 sections** — each a semi-zone rendered and
simulated separately, capped at 30 concurrent players per instance.

| ID | Name | Plate rect (% x, % y) | World rect (m) | Size |
| --- | --- | --- | --- | --- |
| hv-1 | Soul Well Basin (start) | 41–52, 36–44 | 4920–6240 × 2430–2970 | 1320 × 540 m |
| hv-2 | Anwel & Lockroot Reach | 41–56, 26–36 | 4920–6720 × 1755–2430 | 1800 × 675 m |
| hv-3 | Vaeldor Crown | 41–52, 44–51 | 4920–6240 × 2970–3442.5 | 1320 × 473 m |
| hv-4 | Thalen's Heir | 41–52, 51–63 | 4920–6240 × 3442.5–4252.5 | 1320 × 810 m |
| hv-5 | Erboug Stones | 52–64, 36–44 | 6240–7680 × 2430–2970 | 1440 × 540 m |
| hv-6 | West Vale Wilds | 36–41, 26–63 | 4320–4920 × 1755–4252.5 | 600 × 2498 m |
| hv-7 | East March | 52–64, 44–63 | 6240–7680 × 2970–4252.5 | 1440 × 1283 m |

Adjacency (shared edges — used for pre-join crossover):

- hv-1 ↔ hv-2, hv-3, hv-5, hv-6
- hv-2 ↔ hv-1, hv-5, hv-6
- hv-3 ↔ hv-1, hv-4, hv-6, hv-7
- hv-4 ↔ hv-3, hv-6, hv-7
- hv-5 ↔ hv-1, hv-2, hv-7
- hv-6 ↔ hv-1, hv-2, hv-3, hv-4
- hv-7 ↔ hv-3, hv-4, hv-5

Canonical source: `server/sections.mjs` (ids, names, world rects, adjacency,
scale constants). The annotated cross-section visual lives in the workspace as
`souldrifter-thalenyr/heartvale_section_cut_v1.png` (review artifact; not a
runtime asset).

---

## 3. Shard overflow instancing (implemented)

Each section is a zone id; the zone directory (`server/zone-directory.mjs`)
owns its shards:

- Shard id `<section>#<n>` (e.g. `hv-1#2`). One shard = one `ZoneRoom`, cap 30.
- Joins land in the **first non-full shard**; a fresh shard is created on
  demand only when every existing shard is at cap. A busy section therefore
  pushes overflow players into **another instance of the same area** — nobody
  is rejected in normal operation.
- `full` is returned only when the hard `maxShards` ceiling is exceeded
  (default 10 shards/section = 300 concurrent per area; safety valve, env
  `MAX_SHARDS`).
- Empty shards close automatically; freed serials are reused, so instance
  count tracks real load.
- `welcome` carries `shard` + `shards` (live count); the HUD badge shows e.g.
  `hv-1 · #2 · 27/30 drifters`. `/health` reports per-shard occupancy.
- State relay is isolated per shard: players in `hv-1#1` never see `hv-1#2`.

Verified by `tests/zoneDirectory.test.mjs` (6 tests) and the live
`scripts/mp-smoke-test.mjs` (31-client overflow scenario).

---

## 4. Seamless section transitions (design — lands with the world build)

Goal: **no loading screen** when moving between sections.

1. **Pre-join**: when the local player comes within ~50 m of a section edge,
   the client opens a second connection and joins the adjacent section's
   shard (directory picks the least-full shard — the same shard the crossing
   will land in).
2. **Dual-receive**: during the crossover band the client renders both
   shards' remote players; the local player keeps publishing to the current
   shard only.
3. **Crossing confirm**: once the player crosses the boundary, the client
   transfers presence — sends a final state to the old shard, starts
   publishing to the new shard, and drops the old connection after a short
   hysteresis (~2 s or ~10 m past the edge) to avoid flap on the line.
4. **World geometry**: the adjacent section's terrain/props stream in as the
   player approaches (same ~50 m band), so the visible world is already
   there at the crossing point. Tile-level streaming of the Heartvale world
   mesh is part of the zone build, not this networking layer.

Edge case — destination shard full at the moment of crossing: the directory
creates the next shard transparently; from the player's view nothing changes
(the instance id in the badge ticks over). Two friends crossing together
should join the *same* destination shard: party-aware shard affinity is a
follow-up (directory hint `?shard=hv-2#1`), noted but not built.

---

## 5. What lands where

| Piece | Status |
| --- | --- |
| Scale model + constants (`server/sections.mjs`) | Done (this branch) |
| Shard overflow instancing + tests + smoke | Done (this branch) |
| Section cut visual for owner review | Done (workspace PNG) |
| Client boundary detection + pre-join crossover | Heartvale world build |
| Terrain/prop tile streaming | Heartvale world build |
| Party-aware shard affinity | Follow-up |
