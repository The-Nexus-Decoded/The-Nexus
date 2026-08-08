# SoulDrifter Browser Build Handoff — 2026-08-08

Use this file as the source of truth when continuing in a fresh Codex task.

## Workspace

- Worktree: `H:\Projects\AI_Tools_And_Information\The-Nexus-souldrifter-browser`
- Branch: `codex/souldrifter-browser`
- App: `Arianus-Sky\projects\games\SoulDrifterWeb`
- Local game: `http://127.0.0.1:5174/`
- Existing work is intentionally uncommitted. Preserve all unrelated/current files.

## Locked product direction

- Original browser-based SoulDrifter RPG with an elevated Ultima VII/UO-style readability target, not copied Ultima assets.
- Fully rendered 3D characters and environments, grounded locomotion, combat animation, collision, obstruction handling, and fog of war.
- Both Tactical Turn-Based and Real-Time Action Bar combat.
- Illustrated bottom action bar with animated cooldown/resource feedback.
- Opening is a randomized but always-completable Soulwell dungeon crawl:
  1. large tutorial/training hall;
  2. light-mob room;
  3. miniboss/resource-management room;
  4. exit to the starting-realm open world.
- Do not expand rooms two and three until the user approves the first-room proof.

## Current vertical-slice gate

- Build one race/class combination first: low-level Elf Shadowknight.
- Approved character target: `public/assets/generated/characters/elf-shadowknight.png`.
- Approved room target: `public/assets/generated/first-breach-environment-v1.png`.
- Approved guide target: `public/assets/generated/npcs/ilyra.png`.
- The current live Three.js room is an engineering baseline and is visually rejected: bare repeated tiles, primitive props, sparse architecture, generic cartoon characters.
- The final hero must be an original SoulDrifter model matching the approved concept. Legal third-party packs may supply invisible rig/animation scaffolding only.

## Low-level magic rule

- No Sartan/Patryn-equivalent runes at levels 1-19.
- Aether-Scribed/Flesh-Forged high magic awakens around levels 20-30.
- Starter Shadowknight uses mortal Fire-Realm necromancy, ash/ember effects, and limited life drain.
- Starter proof abilities: basic weapon strike, Siphon Cleave, and Cinder Guard.
- Do not show body runes, weapon runes, written glyph circles, or high-level magic gear in this proof.

## Required character animations

- idle;
- eight-direction-compatible walk and run;
- grounded turn/blends;
- basic weapon strike;
- Siphon Cleave;
- Cinder Guard / restrained cast;
- hit reaction;
- death with settled floor pose;
- brief character-appropriate victory.

## Asset pipeline state

- Official Quaternius Universal Base Characters Standard pack downloaded and ZIP-verified:
  `C:\Users\olawal\.codex\cache\souldrifter-3d-pipeline\Universal Base Characters[Standard].zip`
- Size: 128,968,391 bytes.
- SHA-256: `FDBF1804C90DFC1EA03E992BFF7DA2DFD1A79318E13270A660180F9308455F40`.
- Source/license: official Quaternius, CC0.
- This pack is a possible adult humanoid base/rig reference, not the final visual design.
- Fantasy modular outfits and Universal Animation Library downloads were blocked temporarily by Itch HTTP 429 rate limiting.
- External generator probes: `TRIPO_API_KEY=MISSING`, `GEMINI_API_KEY=MISSING`.
- Do not claim an AI-generated 3D pipeline is available without new credentials.

## Engineering state

- `src/game/World3D.ts` contains the current Three.js renderer, GLTF loading, animation mixer, pathfinding/collision, wall fading, fog seals, combat VFX, both combat modes, and debug bridge.
- `src/game/dungeon.ts` contains deterministic three-room generation.
- A structural reachability fix reserves navigation spines before placing blockers.
- `tests/dungeon.test.ts` includes a 500-seed reachability test; it passed in the last completed run.
- TypeScript typecheck passed in the last completed run before this handoff.
- Re-run all checks after the next implementation changes.

## Current visual evidence

- Live baseline screenshot:
  `C:\Users\olawal\.codex\visualizations\2026\08\08\019fdec6-4ecd-7293-9577-59df74435bf4\souldrifter-first-room-live-2026-08-08.png`
- It is evidence of the rejected baseline, not an approval candidate.
- Independent visual audit scored it approximately 0.7/3.0 and identified automatic failures: primitive-dominant world, generic hero, missing encounter/VFX proof, rectangular/cropped HUD, darkness, and missing diagnostics.

## Quality framework

- User supplied `https://github.com/majidmanzarpour/threejs-game-skills` as a reference.
- Local read-only clone: `C:\Users\olawal\.codex\cache\threejs-game-skills` at commit `7221c1f`.
- Apply its asset diagnostics, animation intake, technical-art budget, screenshot validation, and 10-category visual scorecard.
- Project gate document: `docs/TECHNICAL_ART_VERTICAL_SLICE.md`.
- Approval requires every scorecard category at least 2, average at least 2.3, and no automatic failure.

## Immediate continuation order

1. Verify the local server and current worktree without discarding changes.
2. Finish obtaining/legal-checking the modular outfit and animation packs after the Itch cooldown, or use another clearly licensed source.
3. Build/customize the original adult Elf Shadowknight mesh and worn starter gear around the approved concept.
4. Validate model scale, bounds, skeleton, clip names/durations/tracks, foot grounding, triangle/material/texture counts, and collision proxy.
5. Replace only the first room with authored circular Soulwell architecture, layered stone modules, Soulwell water/energy, arches, shelves, worktables, gates, braziers, rubble, moss, props, and readable routes.
6. Integrate the full animation state machine and low-level no-rune combat VFX.
7. Fix viewport overflow and compact the HUD so the playfield dominates.
8. Run unit/type/build tests and a real-input playthrough in both combat modes.
9. Capture desktop/mobile active-play screenshots and renderer diagnostics.
10. Show the user the new first-room screenshot directly in the task before expanding the dungeon.

## Communication rule

The user is waiting for visual proof and is frustrated by placeholder-quality shortcuts. Lead with the actual image/result, state blockers plainly, and never call the current generic room finished or premium.
