# BREACH-V2 — Starting Zone Flat Map (deliverable 1, issue #451)

`breach-v2-flatmap-1600.webp` is the checked-in 1600px WebP export of the
BREACH-V2 starting-zone flat map, authored per `docs/DUNGEON_BUILD_RUNBOOK.md`
§1 (flat-map-first) and `docs/TICKET-BREACH-V2.md` §8.1.

## What the map shows

- **Panel A — fixed spine** (same every run), all dims in true meters:
  Realm-Lock Vestibule (30 × 22 m) → Gallery Link → Threshold Plaza (16 × 12 m,
  safe; Orren + Brannoc; soul-cyan **Wayfarer** and ember-red **Oathbreaker**
  doors) → two seeded paths of 3–5 chambers (slots S1–S5) → Convergence
  Gallery → Ashen Threshold (ante-room) → The Ashen Lock (boss, 24 × 18 m,
  one-way portcullis, 3 boss-anchor sockets) → First Memory Vault →
  The Way Upward exit Connector to Heartvale hv-1 (Soul Well Basin), world
  anchor (5437.5, 2648.4).
- **Panel A2 — Vestibule + Plaza detail** (16 px/m inset): Soul Well pool
  (Ø 3.6 m silvery glowing pool, rim Ø 5.3 m — owner ruling V14), player
  emergence, Wellkeeper Ilyra, true Memory Loom, Wayfarer's Coffer, true
  training effigy, bronze conduits, 2 m interaction clearances.
- **Panels B1/B2 — room pools at true size**: 7 EASY (Wayfarer) rooms and
  7 HARD (Oathbreaker) rooms with door sockets, spawn/loot/prop socket counts.
- **Rail B — tables**: legend, per-path spawn table, loot table, prop tables
  (dungeon-kit IDs), boss set (1× Cinderbound Warden per run), seed policy
  (layout seed + dressing seed, mulberry32 lineage, comparison seed 4182).
- **Strip C/D**: run assembly and the corruption gradient (densest at the
  Ashen Lock, cleanest at the Vestibule).

## Convention (per `docs/MAP_ASSET_PIPELINE.md`)

- The full-resolution PNG master (3400 × 2420) lives **outside the repo** in
  the local workspace: `Documents\kimi\workspace\souldrifter-thalenyr\flatmaps\breach-v2\breach-v2-flatmap-master.png`.
- The shipped runtime copy is the 1600px WebP (q75) in this directory.
- Re-render with: `python make_breach_v2_flatmap.py` (managed Python + PIL)
  from `scripts/maps/`, with `breach_v2_design.py` beside it. That design
  module is the measured source for `breach-v2-registry.mjs` (deliverable 2) —
  rooms, pools, sockets, and tables must stay consistent with this map.

Scale: uniform 9 px/m on the master (16 px/m in the A2 inset). The engine nav
cell is 1.75 m and stays hidden under continuous geometry at runtime.
