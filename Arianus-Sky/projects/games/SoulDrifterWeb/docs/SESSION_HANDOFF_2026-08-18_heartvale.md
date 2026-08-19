# Session Handoff — Heartvale Outdoor Zone (2026-08-18)

Branch: `codex/heartvale-outdoor` (from `codex/435-3d-asset-pipeline`) · Executor: Kimi session

## Landed (3 commits, all gated)

| Commit | Content |
| --- | --- |
| `b9801e7f` | Houdini pipeline: `heartvale-soulwell-terrace.hipnc` source scene (terrace, basin terrain, rivers, roads, Erboug ring, dressing, seed 318044611), layout export script, scale locked to atlas (1 tile = 1.75 m, 1 atlas % = 5 tiles, zone 160×160) |
| `c276ab22` | Systems: `progression.ts` (XP to level 10, budget-enforced), `loot.ts` (beasts=materials, humanoids=coin+rare armor+area weapons, wielders-only weapons), `quests.ts` (state machine, escort/puzzle objectives, party/out-level scaling), `zoneHeartvale.ts` (14 quests, 11 NPCs + dialogue, 12 monsters lvl 1–10, wander/quest/elite/boss spawn areas, 2 zone bosses, per-player phasing), `zoneState.ts` (localStorage persistence) |
| `70fde422` | Quest engine v2: `src/game/questdb/` (schema/templates/engine/gm/jsonStore), JSON DB (`public/data/heartvale-questdb.json` + overrides), GM/AI CLI (`scripts/questdb/questgm.mjs`), daily rotating contracts, live injection, debug snapshot |

## Verification status

- `npm run typecheck` — green
- `npm test` — 177/180 passing; the 3 failures (`avatarIdentity`, `presentationBoundaries` animation-manifest routing) are **pre-existing on the base branch** and unrelated to this work
- 47 new tests across progression/loot/quests/zone content/quest engine — all green
- QuestDB JSON validates clean via `export-heartvale-questdb.mjs`

## Open work (next sessions, in order)

1. **P0/P1 engine half — runtime zone loader**: `World3D.ts` currently hard-consumes `GeneratedDungeon`. Plan: add a zone-loading path that consumes a zone definition (tiles/props/NPCs/enemies data-authored from `zoneHeartvale.ts` scale constants), renders outdoor terrain (day profile per `docs/LIGHTING-PROFILES.md`), and transitions from the post-Warden hook (~line 2057–2064, tutorial step 9) to the Soul Well terrace. The Houdini scene is the visual/scale reference.
2. **P3 runtime half — Anwel live**: NPC actors + dialogue via existing `buildDialogue` + quest engine wiring (`offeredBy`/`turnableAt` on NPC interact), quest log UI panel, mob spawns filtered by `phasedSpawnAreas(completedQuestIds)`, XP/loot/coin awards into `zoneState` + inventory.
3. **Interaction probe**: Playwright probe (pattern in owner's `souldrifter-thalenyr/playtest/`) — accept q-first-roof from Mira, kill-credit flow, phasing assertion via localStorage, screenshots.
4. **Follow-up tickets**: Lockroot interior, Vaeldor interiors, NPC portraits (placeholder in use: `public/assets/generated/npcs/heartvale-villager.png`), multiplayer replication of `HeartvaleState` + quest overrides.

## Guardrails observed

- No edits to `public/lore-atlas/*`; atlas changes only via `markAtlasPoi` promotions defined in quest mutations
- No GitHub Pages deploy
- No third-party/AI assets; the one new image (villager placeholder) is procedurally generated original art
- Low-level magic boundary respected in all quest/monster writing (mortal tier only)
