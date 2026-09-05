# Heartvale Outdoor Zone — Systems and Content Design

Branch: `codex/heartvale-outdoor` · Runbook phase: P3 (Anwel + quest layer) · Created: 2026-08-18

This document covers the quest / XP / loot / phasing systems and the zone content authored in `src/game/`. It complements `docs/HOUDINI_HEARTVALE_PIPELINE.md` (the 3D source scene and scale authority).

## Systems (all data-first, unit-tested)

| Module | Role |
| --- | --- |
| `src/game/progression.ts` | XP curve (`80 + level² × 20` per level), levels to 10+, level-up stat points, monster XP by tier (normal/elite/boss), group XP bonus |
| `src/game/loot.ts` | Loot tables enforcing the owner economy: **beasts → materials only** (craft/sell), **humanoids → coin + rare armor + basic area weapons**, weapons only from wielders; deterministic seeded rolls |
| `src/game/quests.ts` | Pure quest state machine: available → active → ready-to-turn-in → completed; objective kinds kill / collect / find / talk / escort / puzzle; prerequisite DAG; **party-size + out-level encounter scaling**; world-mutation payload on turn-in |
| `src/game/zoneHeartvale.ts` | The content: scale constants (identical to the Houdini layout), 6 canon anchors, 12 monsters (levels 1–10), spawn areas (wander / quest / elite / boss / phased-in), 11 quest NPCs with dialogue, 14 quests, 2 puzzles, 2 escorts |
| `src/game/zoneState.ts` | Per-player persistence (`localStorage` key `souldrifter.heartvaleState.v1`, atlasSync pattern): quest log, progression, coin, puzzle/escort cursors |

## The level 1 → 10 path (canon-driven)

Direction follows the atlas: terrace → Anwel → the roads → Vaeldor shadow → Lockroot rumor.

1. **q-first-roof** (Mira Eddlestone, greeter) — teaches the quest system; the welcome beat. Completes `thalenyr.anwel` in the atlas.
2. **q-mudclaw-toll** (Dockmaster Pell) — kill 6 mudclaw crabs. Teaches combat + beast looting.
3. **q-gossamer-wings** (Fletcher Anes) — collect 8 moth wings from the wander meadow. Teaches exploration.
4. **q-thornback-trouble** (Herder Bonn) — cull 5 boars. Teaches positioning.
5. **q-road-to-well-stone** (Cael, Road Warden) — escort Brother Owyn past the viper banks. Teaches protect/follow.
6. **q-echoes-in-the-water** (Wellkeeper Sef) — terrace shard puzzle (stone → river → sky). Teaches puzzles + Law of the Echo.
7. **q-toll-road-reivers** (Reeve Droma) — break the fork camp (8 reivers). Teaches humanoid loot (coin/armor/weapons). Rumors the Erboug Stones.
8. **q-what-the-river-keeps** (Scavenger Ils) — find 5 river caches. Teaches find quests.
9. **q-eel-trap-geometry** (Old Fen) — trap-order puzzle (deep → slack → ripple).
10. **q-lost-yearling** (Shepherdess Rill) — escort a skittish yearling home; carries the Thalen's Heir song hook.
11. **q-break-east-road-camp** (Sgt. Hull, Vaeldor gate) — **elite camp**: 2 lieutenants + Captain Borro. Party 3 @ level 8, or solo ~11.
12. **q-weirwight** (Sef → Droma) — **zone boss** at the meeting of the rivers. Party 4 @ level 9, solo ~13.
13. **q-humming-roots** (Droma) — scout the Lockroot entrance. Promotes `thalenyr.lockroot` rumored → explored; seeds the next dungeon ticket.
14. **q-rootbound-cantor** (Sef) — **second zone boss** at the treeline. Party 4 @ level 10, solo ~14. The Heartvale capstone.

Budget (enforced by `tests/zoneHeartvale.test.ts`): quest XP 7,200 + required-kill XP ≈ 1,400 ≥ `xpToReachLevel(10)` = 6,420, while quest XP alone stays under level 12.

## Multiplayer / phasing model

- **Per-player phasing**: turning in a quest mutates the world only for players who turned it in — camps clear, fishers return to the shallows, a Vaeldor watch post rises from the elite camp's ash, the meeting waters run clear. Wander mobs and non-quest areas are identical for all players, always.
- **Group content**: elite camp and both zone bosses carry `recommendedParty` / `intendedLevel` / `soloLevel`. `encounterScale()` multiplies monster power: a full party at intended level faces 1.0×, smaller parties face more, out-leveled solo players face less. `groupXpShare()` gives every member full XP +8% per extra member, so grouping lower-level players is the intended way in.
- Server note: `HeartvaleState` is the exact replication payload; merge rule is union of completed quest ids, never demotion.

## Runtime integration status

These modules are engine-agnostic and fully tested (typecheck + vitest). Wiring them into `World3D` (zone loader, Anwel geometry, spawn runtime, dialogue UI hooks, quest log panel) is runbook phases P0–P3's engine half and lands next; the Houdini scene (`source-assets/houdini/heartvale-soulwell-terrace.hipnc`) is the visual/scale reference for that work. NPC dialogue reuses the existing `buildDialogue` contract; portraits share one original placeholder (`public/assets/generated/npcs/heartvale-villager.png`, procedurally generated — no third-party assets) until a portrait ticket lands.

## Verification

`tests/progression.test.ts`, `tests/loot.test.ts`, `tests/quests.test.ts`, `tests/zoneHeartvale.test.ts` cover: the level curve and budget, the loot economy contract (beasts never drop equipment/coin; humanoids pay coin; wielders-only weapons; deterministic rolls), the quest state machine and scaling math, content integrity (every objective target, spawn, mutation, and prerequisite resolves), and per-player phasing behavior.
