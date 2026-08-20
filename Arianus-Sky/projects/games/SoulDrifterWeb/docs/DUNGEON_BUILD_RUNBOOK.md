# RUNBOOK — Building a Dungeon / Indoor Zone (SoulDrifter world-building contract)

**Status:** owner-approved workflow, 2026-08-20. Applies to every indoor
zone: the starting zone (Level 01, the Breach — see `docs/TICKET-BREACH-V2.md`),
caves, ruins, towers, and all future randomized dungeons.

Companion docs: `docs/3d-ai-studio/README.md` (asset budgets + pipeline),
`docs/3d-ai-studio/3D_AI_STUDIO_CHARACTER_PIPELINE.md` (characters).

---

## 1. The flat-map-first rule (non-negotiable)

Every indoor zone starts with a **flat 2D map**, authored exactly like our
outdoor zone maps, BEFORE any 3D work begins. This is the same discipline
that produced the Thalenyr atlas and the Heartvale section map: art first,
measure from the art, then build.

The flat map shows **ALL content that can exist in the dungeon** — including
content that will be randomized at runtime:

- every fixed room (start/training, boss suite, Connectors)
- every room in every randomization pool, drawn at true relative size
- path/door logic (branches, convergences, one-way gates, locked doors)
- boss set (all possible bosses, and how many appear per run)
- spawn areas, encounter anchors, loot/prop tables, per room or per pool
- scale bar in real meters (indoor zones use the same meters discipline as
  the world frame — no invented local units)

"Randomized" never means "undocumented": if a room, boss, enemy, or prop can
appear in the dungeon, it appears on the flat map and in the registry. The
RNG only chooses *which subset and which order* — never *what exists*.

## 2. Fixed anchors vs randomized middle (the architecture)

Every dungeon has three structural layers:

1. **Fixed start area** — authored room set (e.g. the training room). Same
   every run. Tutorial/beats live here.
2. **Randomized middle** — one or more PATHS, each an ordered sequence of
   rooms drawn from that path's authored **room pool**. Branch points are
   explicit (doors); paths may converge before the boss.
3. **Fixed boss suite** — ante-room + boss room, authored architecture, same
   every run. **Which boss appears** is rolled from the dungeon's boss set.

Path/branch example (the starting zone, from the owner): training room →
**two doors** (easy path / hard path) → each path runs its own randomized
room set → paths converge → boss room (1 boss) → exit Connector.

Boss-set example (higher-level dungeons, from the owner): a dungeon with
**6 possible bosses shows 3 per run**, rolled per seed.

## 3. The dungeon registry (single source of truth)

Like `server/sections.mjs` for the world map, every dungeon has one
registry module (`<dungeon>-registry.mjs`) derived from the flat map:

- room definitions (id, kind, pool, true meter dims, door sockets)
- path definitions (id, difficulty tag, pool, min/max rooms, convergence)
- boss set (ids, per-run count, weights)
- spawn/loot/prop tables per room/pool
- seed policy + validation invariants

The builder never invents numbers that contradict the registry; reviewers
verify the registry against the flat map (measured-only, like POI anchors).

## 4. Seed discipline + validation invariants

- Seeded RNG (mulberry32 lineage, as in `src/game/dungeon.ts`); the seed is
  recorded per run so any layout can be reproduced for support/bugs.
- Invariants covered by vitest (the existing dungeon tests are the pattern):
  - **reachability** — start → boss → exit connected on EVERY seed
  - every objective and encounter reachable (no orphaned content)
  - path difficulty tags honored (easy pool rooms never appear on the hard
    path; boss count matches the set rule)
  - room pool exhaustion rules (no duplicate rooms unless the pool allows)
  - door/socket integrity (every room connects through real door sockets)

## 5. Build pipeline (same as Heartvale, adapted indoors)

1. **Flat map** authored + checked in (source of the registry).
2. **Registry** derived from the map (meters, pools, tables).
3. **Houdini build** — the interior shell + dressing authored from the
   registry as ONE continuous build per floor/level (rooms share walls,
   floors, and light continuity, exactly why Heartvale was authored whole).
4. **Runtime exports** — geometry/LOD glTFs, textures, splat/material maps,
   and the data JSONs (registry instance, spawn tables) to
   `public/data/dungeons/<dungeon-id>/`.
5. **Runtime preview** — `?dungeonPreview=<id>` route with review hooks
   (`window.__dungeonScene` etc.), same pattern as the Heartvale preview.
6. **Assets** — reuse the 3D AI Studio inventory FIRST (see the ticket's
   asset manifest; existing breach work lives on branches
   `codex/448-souldrifter-first-breach-models` and
   `codex/450-houdini-apprentice-first-breach`). Asset policy: original or
   licensed/CC0 only, recorded in `third-party-assets.json`. No
   Ultima-derived data, ever.

## 6. Ground rules (inherited, non-negotiable)

1. **NEVER deploy to GitHub Pages / the live site.** Owner reviews locally.
2. `npm run typecheck` and `npm test` green at every commit. **Never break
   Level 01**: the v2 starting zone is built behind a preview route/flag and
   only replaces the current Level 01 on explicit owner sign-off.
3. Low-level magic boundary (canon): mortal-tier only in the starting zone.
4. Phone-width responsive + desktop both keep working; respect the 3D
   budgets in `docs/3d-ai-studio/README.md`.
5. Commit early, commit often; resume the builder chat on turn limit.
6. Never leave a dev server running when a task ends.
7. Visual direction is **true 3D** (owner ruling 2026-08-20 — the Heartvale
   outdoor look is the benchmark; isometric framing is dropped). The failure
   lesson behind the old isometric rule still binds: the logical gameplay
   grid stays hidden under a visually continuous environment — no visible
   repeated cells at gameplay distance.
8. Houdini Apprentice is non-commercial and `.hipnc` cannot run in the
   browser. Prototype freely, but shipping assets must go through an
   approved licensed Houdini or Blender export path; Three.js is the runtime.
9. No paid provider operation (generation, texture, rig, remesh, purchase,
   retry) without a new exact-cost owner approval.

## 7. Review gate (mandatory)

Same gate as the outdoor zones: an independent reviewer (fresh session,
reviewer's brief) judges FRESH renders against the flat map and the canon —
renders not intentions, material/shader ceilings named, scale/frame
conformance verified against the registry, findings written to
`docs/REVIEW-<date>-<dungeon-id>.md`. The owner is never the first person
to catch a basic miss.

## 8. Done =

- Flat map + registry checked in and consistent (measured-only).
- `npm run typecheck && npm test` green incl. the §4 invariants on a seed
  sweep.
- Runtime preview live; probe renders: start area, one full easy-path run,
  one full hard-path run (different seeds), boss suite, exit Connector view.
- Review gate (§7) passed; `docs/SESSION_HANDOFF_<date>_<dungeon-id>.md`
  with evidence paths and open issues.
- Report to the owner with the preview URL and exactly what to click.
  **Do not deploy.**
