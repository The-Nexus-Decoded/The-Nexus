# SoulDrifter #501 — Astra-led Heartvale Rework and Quest Framework Kickoff

Version: 2026-09-04 / environment-first-v3

## Latest owner additions — checkpoint first, real meshes, selectable test avatar

These additions take precedence over the earlier execution ordering below:

1. **PR #511 first:** preserve and restore-test the original outdoor source/assets, then reconcile and verify the QA baseline. Read every current #511 comment. Do not cosmetically clean up the source before freezing it, repoint checkpoint tags, or make new features a condition of finishing the backup.
2. **#512 after the checkpoint:** implement removal of visible capsule/pill actor stand-ins and the `Test Avatar` selector in its own branch/worktree/PR. The selector lets the owner control any available usable registered 3D model in the running level: player assembly, NPC, monster/boss, animal or other loadable mesh.
3. Mandatory common policy: `../TEST_AVATAR_ASSET_SELECTION_POLICY.md`. Read it plus live #512. Include checkpoint status, current placeholder-render paths, registry/selector/controller reuse, and selector file ownership in the Session/Context Receipt.
4. Keep collision proxies functioning but invisible except in an explicit debug overlay. Remove giant opaque pill labels without removing required actors/interactions. Missing models are explicit blockers, never invisible quest givers or silently substituted pills.
5. Valid unanimated meshes remain selectable and movable for testing, labeled MESH_ONLY. This is not accepted locomotion. Preserve scale, ground contact and asset-appropriate collision/camera; no fake universal rig compatibility or automatic noclip.
6. The developer avatar appearance is separate from saved player/class/quest identity. Heartvale's local social NPCs remain Human-only, but that rule must not prevent the tester from choosing a monster or other non-Human model. Use isolated test saves and restore the normal avatar on exit.

#512 is an early testing capability within the existing #501 program, coordinated with #509/#510/#495/#459. It does not replace the full NPC-production or framework tickets. The checkpoint-only agent preserves the old pills as historical state and hands this feature to a post-checkpoint worker; it does not fold the feature into PR #511.

## Mission and latest ordering

Deliver an actual 3D overhaul of the currently mapped Heartvale outdoor section, populate it with fresh Tripo Human quest NPCs and usable existing #456 creature meshes, and implement a small provisional quest loop. Then broaden/harden the reusable quest and leveling framework.

```text
PR #511 restore-tested original checkpoint and verified QA baseline
-> current-state recovery and spatial plan
-> #509 outdoor environment reconstruction
-> #512 real-mesh test-avatar selection (coordinated early testing capability)
-> #510 new Tripo Human cast + #495 existing creature placement
-> #459 provisional in-world quest loop using minimum #502/#503/#507 interfaces
-> integrated 3D review
-> full reusable quest/progression framework
-> owner approves final content
-> full 30-quest Heartvale rollout
```

This supersedes the former framework-first schedule. Final quest names, dialogue and numbers are not blockers. Do not interpret this as permission to create a throwaway duplicate quest engine, overwrite another worker, or mark static meshes as fully animated.

## 1. Mandatory catch-up

Use cached fast-start; do not reinstall tools merely because the chat is new. Read:

1. `../START_HERE.md`
2. `../SESSION_FAST_START.md`
3. `../PROJECT_CANON_INDEX.md`
4. `../WORKFLOW.md`
5. `../HEARTVALE_ENVIRONMENT_FIRST_HANDOFF.md` — current production sequencing and source map
6. `../QUEST_AND_PROGRESSION_FRAMEWORK_RUNBOOK.md`
7. `../config/quest-progression-framework-policy.json`
8. `../templates/quest-definition.template.json`
9. `../templates/quest-instance.template.json`
10. `../HEARTVALE_LEVELS_2_10_CAMPAIGN_RUNBOOK.md`
11. `../QUEST_DIALOGUE_VIDEO_POLICY.md`
12. current zone, topology, staging, collision/interaction/destruction and asset-intake policies
13. current image/Tripo/animation routing and provenance/spend policies
14. every governing `AGENTS.md`; root `CLAUDE.md` and Claude transition handoff for Claude workers.
15. `../TEST_AVATAR_ASSET_SELECTION_POLICY.md` and PR #511 checkpoint/restore instructions.

Fetch live issues, all current comments, linked PRs/reviews/heads and affected files for:

```text
#501 #509 #510 #512 / PR #511
#452 #453 #454 #455
#456 #492 #493 #494 #495
#459 #498 #499 #500
#502 #503 #504 #505 #506 #442 #507 #508
#443 #487 #451 / PR #460
```

Use role-scoped deep reads after loading the common constraints. Do not omit later owner corrections because an issue body is older. Recover actual local worktree/receipt state, including `.agent-state` or `.planning` where present; do not assume a locally mentioned file was pushed.

## 2. Find the actual outdoor build

Historical source branch: `codex/heartvale-outdoor`.

Game-root `docs/HEARTVALE_ZONE_TICKETS.md` contains `ZONE-HV-1 — Soul Well Basin` and `ZONE-HV-2 — Anwel & Lockroot Reach`, followed by the other mapped Heartvale subzones. These are named document tasks. Do not invent a numbered original outdoor issue/PR or mistake indoor PR #460 for it. PR #511 is the subsequent recovery/checkpoint PR, not evidence of an older completed outdoor merge.

Read current applicable versions of `server/sections.mjs`, `public/data/zones/heartvale/layout.json`, NPC/creature manifests, `docs/THALENYR_SCALE_AND_SECTIONS.md`, `docs/ZONE_BUILD_RUNBOOK.md` and `docs/REVIEW-2026-08-20-heartvale-hv1-v2.md`. Historical checkpoint `43876e05` is a reference, not a rollback instruction.

Discover the latest accepted integration base and preserve the old renderable section, all source assets and active branches/worktrees. Verify historical defects against fresh runtime views before claiming they remain unfixed.

## 3. Lead model and worker boundaries

Requested lead: GPT-6 Astra (`gpt-6-astra`) with `max` reasoning where the host exposes it. Verify actual session/account availability and record the model/effort. A prompt does not set the model. Three.js/browser/mobile remains the runtime.

First work sessions after the #511 checkpoint gate:

- #501: lead design/integration orchestration and acceptance.
- #509: outdoor section reconstruction; reconcile #452–#455 instead of duplicating their work.
- #510: fresh Human Tripo NPC production, complete quest-cast coverage and placement.

#512 owns the test-avatar selector and no-visible-pill presentation. Coordinate its controller/preview/asset-registry edits with the environment and population workers; do not make it a second rendering or character system.

#495 owns staged existing-creature integration using #492 population and #493 legal sockets; #494 adds verified behavior/motion. #456 remains the producing asset lane and #487 remains the playable-character lane. Do not reset or commandeer either.

#502/#503/#507 keep their generic compiler/runtime/reward ownership. Their initial thin interfaces support the early playable loop; their broad implementation follows the environment-first milestone. One worker/concern/worktree/PR; define a serialization owner for shared renderer/map/types.

## 4. Required first response, then actual work

Return a bounded Session/Context Receipt containing:

- actual model/effort and role;
- repository/base/head/branch/worktree and preservation plan;
- newest owner direction and policies loaded;
- #511 original/QA checkpoint and restore-evidence status;
- current outdoor implementation and historical-vs-current defect ledger;
- exact #456 mesh/material/rig/clip availability and rejection table with paths/hashes;
- spatial plan and stable quest/NPC/encounter/cinematic/habitat socket contract;
- first new Tripo NPC batch and full draft-cast coverage plan;
- #512 placeholder paths and existing registry/selector/controller reuse and ownership;
- initial provisional quest loop and minimum compiler/state/reward seams;
- file ownership, verification plan and genuine owner/spend blockers.

After the applicable checkpoint gate and receipt, proceed with authorized local implementation. Do not stop at documentation or wait for final names, story details or every creature animation. Hold only affected work at genuine access, unresolved destructive changes, missing source or paid-operation gates.

## 5. Non-negotiable environment and population requirements

- Rework the entire currently authored Heartvale section coherently; build/review Basin -> road/ford -> Anwel -> nearby fields/river first, then remaining mapped section work. Do not silently call the first loop the whole completed section.
- One accepted master map/world frame; top-down layout and gameplay routes before detailed geometry.
- Keep the Basin treeless grassland and the Soul Well a shallow silvery machine-like liquid pool, distinct from ordinary river water.
- Fix actual building/street/landscape/water defects; props before collision walkthrough; population after valid area sockets; recheck collision/nav after population.
- All local social NPCs/factions are Human. Drakkin/other peoples belong later; player ancestry eligibility and developer test-avatar appearance are separate contracts.
- Fresh Tripo visual identity for every distinct quest NPC; recurring actors share their identity, object-only quests need no invented giver. No stock model/capsule delivered as new production cast.
- Good existing creature meshes may be used as `MESH_ONLY_PREVIEW` without complete motion. Do not use rejected/quarantined assets, restore rejected clips, or claim static placement as full combat/escort readiness.
- New pilot views show actual actor meshes, not pill stand-ins or giant opaque pill labels. Hidden physics proxies and explicitly enabled debug overlays remain permitted. The untouched backup retains its historical appearance.
- Working First Breach, stable IDs, sources, rollback, browser/mobile and accessible alternate routes are preserved.

## 6. Provisional gameplay before broad framework rollout

#459 must put four representative quests into the reconstructed map: rescue/combat, dialogue/map orientation, travel/exploration, and one side task using creatures/gathering/interaction.

Use current usable runtime systems and minimal real #502/#503/#507 contracts, stable IDs, localization keys and isolated test saves. No renderer/UI direct XP mutation, parallel temporary quest engine, or final-canon claim. Required objectives need real completion/retry and one-time reward behavior even when animation polish is limited. #512 model swaps must retain the same test player's quest/event identity and must not duplicate rewards or alter normal saves.

The complete framework still requires definition validation, deterministic lifecycle/branching, adapters, coordinated awards, migrations, inventory/claims, factions/readiness, journal/map/dialogue UX, both combat modes, simulations and independent verification. It remains reusable outside Heartvale.

## 7. Provider and completion gates

Verify Studio/API/CLI separately and use the current functioning authorized lane. Read live balances and current exact/scoped approvals. No other ticket's balance snapshot or budget is an automatic spending grant. Serialize provider access, verify staged source/task IDs, reconcile deductions, and stop on unknown charges. No automatic paid retry, credit purchase or subscription change. Selecting a test model must not trigger a paid generation.

Required evidence: fresh before/after views, real controller routes, building/water close-ups, terrain/collision/socket overlays, placed models with status ledger, working provisional quest loop, desktop/mobile performance and First Breach regression. Include real-mesh avatar selection, unanimated-mesh movement, restore-normal, correct camera/collision profiles and save isolation under #512. Independent producer/verifier sessions; no merge or deployment without owner approval.

## 8. Copy/paste start

```text
Start SoulDrifter #501, environment-first-v3 revision.

Load this kickoff from infra/game-production-playbooks:
Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/
kickoffs/ISSUE-501-QUEST-PROGRESSION-FRAMEWORK-KICKOFF.md

Read HEARTVALE_ENVIRONMENT_FIRST_HANDOFF.md and
TEST_AVATAR_ASSET_SELECTION_POLICY.md. Follow the live-state list.
Verify the selected Astra/highest-reasoning setting; do not assume this
prompt changes the model. Keep Three.js/browser/mobile.

Complete PR #511's restore-tested checkpoint and QA-baseline gate first.
Do not modify the original backup just to remove historical placeholders.

Recover codex/heartvale-outdoor, ZONE-HV-1/HV-2 and the complete mapped
Heartvale section. Coordinate #509 environment, #510 new Human Tripo NPCs,
#495 usable #456 creatures, and #512 real-mesh test-avatar selection.
Read #452–#455 and #492–#494 before duplicating or replacing any work.

Deliver the 3D map/building/landscape/water rework, proper placement,
and a small provisional in-game quest loop. Mesh-only creature previews
and test-avatar movement are allowed with explicit animation limitations.
Remove visible pill actor stand-ins; keep physics proxies hidden.
Testing may use any usable registered model without changing story NPCs
or the saved player identity. Rejected assets remain quarantined.
Use minimum #502/#503/#507 interfaces, then harden the full framework.

Return the catch-up receipt and then proceed with authorized local work
when checkpoint gates pass. Final names/story details remain for later
owner review. No blind resets, unapproved spending, merge or deployment.
```
