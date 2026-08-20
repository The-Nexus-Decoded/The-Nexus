# TICKET — BREACH-V2: Starting Zone rebuild (Level 01, the Breach) — true-3D, flat-map-first

**Branch:** `codex/breach-v2-rebuild` (cut from `qa` @ `a34fbfe9`)
**Runbook:** `docs/DUNGEON_BUILD_RUNBOOK.md` (read fully before starting)
**Style benchmark:** the Heartvale outdoor build on branch
`codex/heartvale-outdoor` (true 3D — owner ruling V15, 2026-08-20)
**Chat brief:** build this ticket end-to-end; commit each sub-step; if the
turn limit hits, the chat is resumed and continues the same ticket.

## Goal

Rebuild the starting zone (Level 01, the Breach) from the lore direction as
a true-3D indoor zone that matches the outdoor Heartvale standard, using the
flat-map-first workflow and the existing 3D AI Studio asset inventory. The
current Level 01 keeps working untouched until the owner signs off on the
replacement (runbook §6.2).

## Layout (owner-specified, 2026-08-20)

1. **Training room** (fixed) — the start area. Tutorial beats: movement,
   camera, first weapon, first breachling. Always the same room.
2. **Two doors** — after training, the player chooses:
   - **Easy path** — randomized room sequence from the EASY room pool
   - **Hard path** — randomized room sequence from the HARD room pool
     (tighter rooms, denser spawns, better loot table)
   Each path is a different randomized set of rooms per run (seeded).
3. **Convergence + boss suite** (fixed architecture) — paths rejoin at the
   ante-room, then the boss room. **One boss** for the starting zone.
   (Architecture must not preclude the boss-set model — higher dungeons roll
   e.g. 3 of 6 bosses per run — but BREACH-V2 ships exactly one.)
4. **Exit Connector** — out of the Breach into Heartvale hv-1 (Soul Well
   Basin), matching the existing lore: the Breach exit is the game's first
   outdoor moment, so the transition must feel continuous with the outdoor
   build (lighting, materials, scale).

## Canon anchors

- The Breach is the wound the Soul Well's silvery two-way travel substance
  relates to — the starting zone should echo that: silvery/machinic accents
  leaking into mortal stone, breachling corruption spreading from the boss
  suite outward (corruption density rises toward the boss, cleanest at the
  training room).
- Mortal-tier techniques only (levels 1–19); nothing high-magic in dressing
  or boss design.
- Lore direction docs in the repo are authoritative where they speak;
  conflicts go to the owner, not to a coin flip.

## Asset manifest (to be attached)

The ChatGPT agent will attach the 3D AI Studio asset manifest (locations +
branches to clone) to this ticket. Known starting points:

- `docs/3d-ai-studio/` — pipeline + budgets + character pipeline
- branch `codex/448-souldrifter-first-breach-models` — existing breach models
- branch `codex/450-houdini-apprentice-first-breach` — existing Houdini work
- `public/assets/3d/` — current GLB inventory
- `codex/heartvale-outdoor` — the outdoor build (style reference, LOD
  exporter `scripts/houdini/export-lod-gltf.py`, splat/terrain patterns)

Collect and record every reused asset in `third-party-assets.json`.

## Deliverables (in order)

1. **Flat map** of the whole starting zone — training room, both doors,
   full EASY and HARD room pools (every room drawn at true size), boss
   suite, exit Connector, spawn/loot/prop tables, meter scale bar — checked
   in under `source-assets/` (PNG master in the workspace per the
   map-delivery convention, 1600px WebP in repo).
2. **`server/breach-v2-registry.mjs`** (or `src/game/zones/breach/`
   equivalent) — rooms, paths, pools, boss set (1), tables, seed policy.
3. **Seeded generator** producing layouts from the registry + the §4
   validation invariants as vitest (reachability on a seed sweep, pool
   separation, door/socket integrity).
4. **Houdini build** of the interior (one continuous shell per runbook §5),
   LOD glTF exports, textures/materials to the outdoor standard.
5. **Runtime exports** to `public/data/dungeons/breach-v2/`.
6. **Runtime preview** at `?dungeonPreview=breach-v2` with review hooks and
   probe renders: training room, easy-path run, hard-path run (different
   seed), boss suite, exit Connector view into Heartvale.
7. **Session handoff doc** + independent review gate (runbook §7) BEFORE the
   owner is shown.

## Acceptance

- All runbook §8 "Done =" criteria.
- Two distinct path experiences verified on multiple seeds; the choice of
  door is meaningful (hard path is visibly harder and better rewarded).
- The exit-into-Heartvale moment reads as one continuous world.
- Owner plays the preview and signs off. Only then does replacement of the
  current Level 01 get scheduled (separate ticket, behind a flag).

## Explicit non-goals (this ticket)

- No replacement of Level 01 in the main flow (sign-off first).
- No multiplayer wiring (the mp base layer lands separately; the dungeon
  registry should just avoid contradicting world-frame meters).
- No new boss content beyond the single starting-zone boss.
