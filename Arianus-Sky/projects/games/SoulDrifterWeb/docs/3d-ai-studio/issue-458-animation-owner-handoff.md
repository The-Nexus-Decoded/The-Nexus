# Issue #458 — animation-agent takeover and completion contract

Date: 2026-08-30 America/Chicago. Existing ticket: https://github.com/The-Nexus-Decoded/The-Nexus/issues/458

Status: **OPEN; owner QA pending. This is a takeover checkpoint, not completed monster animation, combat, or production acceptance.**

## 1. Owner decision: what the next agent owns

The owner is transferring this ticket to the agent responsible for the approved Human Foundation weapon/animation lab. Finish this ticket by combining that human pilot with this branch's dungeon, monsters, bosses, camera, UI, diagnostics, and navigation. The owner will deliver this handoff; this checkpoint does not dispatch another task or transfer a worktree automatically.

1. Replace the current #458 player/human animation implementation with the animation agent's approved human pilot and weapon calibration. Do not continue polishing the rejected #458 human playback/stance implementation.
2. Audit NPCs and old V1 animation consumers too. Replace obsolete motion routing where necessary, preserving NPC identity, quests, gameplay, save data, and compatible shared infrastructure. The deletion inventory below is a migration map, NOT permission to blindly delete all old files.
3. Retain the real monster/boss assets and useful skeletal animation work. Refine the remaining failures; do not replace them with capsules, rigid mesh rotations, or a second disconnected preview.
4. Extend the animation agent's own tool with a separate monster/boss selection hierarchy so every actor and action can be refined there and tested in the dungeon through the same underlying runtime/data.
5. Complete the animation/grip/contact passes first. Then perform an uninterrupted entrance-to-boss-and-exit walkthrough with **every actual weapon/loadout**, on **both paths**, with real fighting and navigation. Inspector playback or warping to a boss does not satisfy this walkthrough.
6. Keep desktop and mobile usable throughout. The latest settings/panel reopening requirement is mandatory and remains unimplemented at this checkpoint; see section 9.

Priority order: reconcile source identities → integrate accepted human runtime → finish per-creature/boss rig/contact/motion gates → complete shared inspection UI → every-weapon combat walkthrough → independent review → owner approval. Do not close #458 because the handoff exists.

## 2. Exact lanes, commits, and local preview state

All application-relative paths in this document are relative to `Arianus-Sky/projects/games/SoulDrifterWeb` inside the indicated repository. All work is on H:, not the task's C: chat directory.

| Role | Exact location / identity |
| --- | --- |
| Destination repository | `H:/CodexData/.codex/worktrees/458-pre-codex-fixes-validation/The-Nexus` |
| Destination branch | `codex/458-pre-codex-fixes-validation` |
| Latest runtime commit | `3a8c345cb83ed88980554e7ac5953a80aff318cf` — stabilize Breachling clip-reference grounding |
| Preceding documentation checkpoint | `54d817732fe93d673554a6767e435bfac3d1438f` |
| Latest installed base creature asset commit | `6d63ce75` — base lunge bite, swipe, death |
| Incoming human lab repository | `H:/CodexData/.codex/worktrees/435-v2/The-Nexus-tripo-modular-character-foundation` |
| Incoming human lab branch | `codex/435-tripo-modular-character-foundation-v2` |
| Incoming source verified during handoff | `55e4311f070e412ebc14f1d2395e254bfc1150f1` — approved weapon lab and shared armed locomotion QA package |
| Common ancestor of these branches | `7666af63bac70f8d48c864b4a85122975bdaa4cb` |
| Older pilot lineage, not the newest weapon package | `codex/487-human-animation-pilot`, `a3354ac1ad0e1aebc53be07463055d2411fa57df`, repository `H:/CodexData/.codex/worktrees/487/The-Nexus-human-animation-pilot` |

The owner explicitly wants the existing #458 branch to receive the accepted human work. This is not an instruction to start from main, wholesale overwrite either branch, or merge the old #435 V1 game integration. Refresh the donor head and receipt before integration; the hashes above are a verified snapshot, not a claim that other agents will never advance it.

**Port 4180 is intentionally unchanged.** The owner's Python preview server continues serving the existing `dist-pages`. The new grounding checkpoint was verified on a private Vite server and in a separate build directory because the old non-base assets still fail contact checks. No new runtime was published to the owner preview in this handoff turn. The private review server on 4191 and its browser were closed.

Existing inspection links, NOT links to the new grounding build:

- Base H-04: http://192.168.1.118:4180/?dungeonPreview=breach-v2&seed=4182&path=oathbreaker&cam=isometric&start=H-04&animationReview=1&creatureReview=1&diagnostics=1&rev=6d63ce75
- Stalker H-06: http://192.168.1.118:4180/?dungeonPreview=breach-v2&seed=4182&path=oathbreaker&cam=isometric&start=H-06&animationReview=1&creatureReview=1&diagnostics=1&rev=6d63ce75
- Entrance walkthrough configuration: same preview flags, `start=H-01`, add `wardenReview=1`; run once with `path=wayfarer`, once with `path=oathbreaker` after the integration is ready.
- Boss inspection: `start=ashen-lock`, `wardenReview=1`, and the chosen path. This is inspection only, not a completed entrance walkthrough.

The `rev` parameter is not source-version enforcement. The existing preview's `release.json` still reports `d9953f176415e6780ddeda7801bcb382cc7836ab` from an earlier pre-commit build; the installed base asset was separately hash-verified. Fix release provenance on the next intentional preview publication: build the exact committed source, verify `/release.json`, JS assets, and served GLB hashes. Do not infer source identity merely from a pasted URL.

No push, merge, remote deployment, issue closure, old-asset deletion, or edit of #435 occurred in this checkpoint. Pre-existing untracked repository `.planning/` belongs to prior work and was left untouched.

## 3. Just-finished grounding fix: bounded result and remaining failures

File: `src/game/dungeons/breach-v2-breachlings.ts`, commit `3a8c345c`.

Previously, each scrub/action change reset calibration. Three updates later, the renderer re-grounded the currently sampled or blended pose, including airborne attacks. Death also received a per-frame lowest-vertex floor correction. Thus the same timeline position could change height depending on prior scrub order, and the runtime could disguise bad animation contacts.

The fix caches a first-pose floor reference for each clip once per actor, immediately uses it for explicit timeline posing, and blends reference offsets across the existing 0.28-second action transition. It preserves the authored trajectory rather than re-grounding an airborne pose or pinning a corpse every frame. It does not alter the source GLBs.

Skin measurement explicitly calls `updateMatrixWorld(true)` after parent world updates: `SkinnedMesh` updates its attached inverse bind there. `updateWorldMatrix(...)` alone was insufficient for this probe. The shared `calibrateAnimatedPoseOnFloor()` helper in `src/game/animationPacks.ts` was NOT changed; the human/Warden consumers still require a separate audit.

Independent native GTX 1070 / ANGLE D3D11 review covered actual H-04 assets at desktop 1440×900 and mobile-emulated 844×390. This was native GPU verification, not SwiftShader, and not physical-phone certification.

| Check | Result |
| --- | --- |
| Bite/Death timeline sequence 0, .5, .7, 1, .7, .5, 0, 1 | Pivot span exactly zero; repeated refreshed mesh pose discrepancy exactly zero |
| Base bite midpoint | Intentional airborne clearance retained, about +139 mm |
| Base bite at .7 | About -1.265 mm residual floor penetration; do not round this into exact zero |
| Base terminal death | Approximately +0.000455 mm mesh contact; no per-frame floor pin |
| Play, Restart, return to CombatIdle | Working; Death holds terminal pose |
| Browser runtime | Zero page/console/network errors and no context loss in the scoped runs |
| Source runtime hash reviewed | `18b5b58a52118bb9f832d79d34c211e6ce4b907378320c09b53a5c8aff83635c` |

**Still open, including on the base creature:**

- CombatIdle's weighted front-paw mesh regions are about +103.5 / +133.5 mm above the floor while rear feet are about +7.2 / 0 mm. Whole-mesh minimum zero is NOT an all-feet contact pass. Lowering the whole actor would sink the rear feet; author the stance properly.
- Switching straight from terminal scrubbed Death to Bite produces a brief approximately 60 mm floor intersection during the blend. Normal CombatIdle→Bite replay did not produce that large dip. This edge was not compared against the old runtime, so its regression provenance is unknown. Define safe inspection recovery/blending from terminal states.
- Old public H-06 Stalker motion now exposes approximately -102 mm Bite and -366 mm Death penetration without the former runtime mask. It is deterministic but **not contact-approved**. Do not publish this combination as a fixed roster.
- `groundingStatus = calibrated-live-pose` is retained for compatibility and contains a cached early measurement, not a continuous contact certificate. The independent review sampled actual refreshed skinned vertices.

Evidence root: `H:/CodexData/.codex/artifacts/issue-458-body-motion-phase-2/grounding-runtime/independent-review/`. Read `REVIEW.md`, `H-04-desktop-result.json`, `H-04-mobile-result.json`, `H-06-desktop-result.json`, and `supplement-result.json`. Wide, side, close and native recordings are alongside them.

## 4. Incoming approved human package: use this source, not stale chat transforms

Read these donor files first:

- `docs/3d-ai-studio/issue-435-QA-HANDOFF.md`
- `docs/3d-ai-studio/issue-435-REVIEW.md`
- `docs/3d-ai-studio/issue-435-lab-asset-map.json`
- The donor humanoid calibration/reference runbooks referenced by that package.

The package is an approved **QA lab**; it expressly does not certify dungeon combat integration or every material/body combination. Its canonical body and original 400 animation clips are byte-preserved. Five genuine matching 65-bone Mixamo clips are added: Injured Run, Slow Run, Running Leaning Back Or Forth, Running Up Stairs, Walking Up The Stairs. Stair source travel remains and must be reconciled with dungeon movement policy, not blindly stripped.

| Donor entry point | Integration responsibility |
| --- | --- |
| `weapon-lab.html`, `asset-review.html` | Portable approved human/weapon lab and separate asset inspection entry points |
| `src/review/weapon-lab/weapon-lab.js` | Actual loadout, action, grip, timeline and view choices; migrate its accepted behavior, not an approximation |
| `src/review/weapon-lab/weapon-locomotion.js` | Shared armed gait logic; staff guard layers preserve gait root/spine/head/legs/feet and timing |
| `src/review/weapon-lab/staff-grip.js`, `staff-moves.js` | Accepted staff holds/motions and loadout-specific calibration |
| `src/review/weapon-lab/tripo-asset-review.js` | Independent asset review, not gameplay combat |
| `src/game/humanPilotWeaponFit.ts`, `src/game/pilotSkinReview.ts`, `src/pilotAnimationReview.ts` | Inspect current use; fit/pilot infrastructure is not automatically the selected lab implementation |
| `src/game/dungeons/breach-v2-human-foundation-actors.ts` | Donor plural-name adapter; reconcile with the destination singular-name file rather than leaving two competing players |
| `src/game/archery/` | Asset contract/loaders, calibration, clip catalog/actions, inventory adapter, presentation/runtime, scene assembly and arrow projectile components |
| `scripts/verify-weapon-lab-staff.mjs`, `verify-weapon-lab-locomotion.mjs` | Carry/pose checks to retain and extend after integration |
| `vite.config.ts`, worker routes, runtime manifest, release verifier | Integrate review entries/assets without replacing current dungeon startup or asset-pruning protections |

Donor receipt: 24 referenced assets, 157,307,338 bytes; fifteen newly packaged assets, 81,996,694 bytes. All eighteen GLBs are self-contained. Preserve per-asset provenance and licenses. Original 8K sources remain archived; their exclusion from a specific lab package is not permission to destroy the masters or globally force low resolution.

Important limitations explicitly recorded by donor:

- 24 walk/run choices across ten loadouts, but shortsword/mace/daggers use explicit ProMeleeAxe proxy motions. A proxy is not proof of the correct finished weapon technique.
- **Sword-plus-shield is not an existing completed lab loadout**, despite the shield mesh being available. Wire and calibrate it; do not claim it is done because the asset loads.
- Staff fighting uses the accepted carry layer; casting uses ProMagic. Bow uses its actual retrieval/nock/release/carry flow.
- Archery/quiver/harness/arrows have base-color/normal/metallic-roughness maps. Several other accepted meshes/body remain base-color-only: full PBR is a separate unfinished production gate.
- The lab does not prove steering/pathing, attacks landing at the correct range, AI, actual damage, minimum bow range, or every-frame mesh collision.
- The donor's quick code review found no confirmed P0/P1 in its limited scope, NOT an exhaustive guarantee.

## 5. Current #458 human implementation to replace

| File / resource | Present behavior and required treatment |
| --- | --- |
| `src/game/dungeons/breach-v2-human-foundation-actor.ts` | Rejected human actor playback, root normalization, one-time floor calibration, current locomotion selection and weapon presentation. Replace with accepted donor runtime behavior; preserve necessary game-facing contract through an adapter. |
| `src/game/dungeons/breach-v2-human-foundation-review.ts` | Current human inspector. Migrate its useful controls into the unified inspector; do not leave a second independently visible human menu. |
| `src/game/dungeons/breach-v2-preview.ts` | Human construction around 4786, panel wiring around 4804, hooks around 5236, movement update around 5634 at this checkpoint. Replace only human integration; preserve scene/camera/navigation/lifecycle. Line numbers drift. |
| `public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-core-actions.glb` and companion metadata | Current rejected eighteen-action selection. Retire when all consumers are switched and references are zero. |
| `scripts/build-human-foundation-core-pack.mjs` | Retire current core-subset production path after migration; retain historical provenance rather than silently using it to regenerate the rejected pack. |
| `public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb` | Canonical body shared with donor; do NOT delete or resize it merely because the current animations were rejected. |
| Full `human-foundation-pilot` animation library | Shared original 400-clip source: retain. Replacing runtime selection/behavior does not mean discarding the approved source library. |
| `docs/3d-ai-studio/issue-458/human-foundation/` receipts | Historical input identities; supersede explicitly with new integration receipt. Do not treat old weapon socket values as current approval. |

Exact current eighteen-action routing to retire/replace (names matter for reference searches):

```text
MaleLocomotion__Idle
MaleLocomotion__Walking
MaleLocomotion__StandardRun
ProSwordAndShield__DrawSword1
ProSwordAndShield__SwordAndShieldIdle
ProSwordAndShield__SwordAndShieldAttack
ProSwordAndShield__SheathSword1
GreatSword__DrawAGreatSword1
GreatSword__GreatSwordIdle
GreatSword__GreatSwordAttack
GreatSword__GreatSwordWalk
GreatSword__GreatSwordRun
Interactions__HumanMasculineAthleticMuscularStaffButtSmash
ProLongbow__StandingEquipBow
ProLongbow__StandingIdle01
ProLongbow__StandingDrawArrow
ProLongbow__StandingAimRecoil
ProLongbow__StandingDisarmBow
```

The current adapter normalizes armature/hips horizontal travel, preserves vertical travel, crossfades over 0.18 seconds, and chooses old Idle/Walking/StandardRun from movement booleans. It loads only the longsword visual even while exposing greatsword or archery action names. Replacing a label is not enough: motion, equipped mesh, both hand contacts, carry, event timing, actual gameplay and movement speed must agree.

Current weapon uses two visual clones with draw/sheath visibility transfer at normalized .90/.74. Current hand socket is identity, current hip local position approximately (.09056,.1034,.07796), hip Euler (.08,-.12,2.95). These are NOT the latest approved #435 fit. Earlier #435 receipt `50b768fb` instead specified hand Euler Z=-π/2, hip (.25,.02,-.03), Euler (.08,-.12,2.1), post-authored finger curls, and a radially thinned grip. That receipt itself predates the incoming `55e4311f` lab package. Resolve the accepted donor calibration by exact body, weapon hash and action; never average conflicting transforms or silently reuse this rejected adapter.

Keep the approved starter longsword path `/assets/3d/weapons/sword/weapon-sword-longsword-starter-v001.glb`, grip-centered origin and 1.05 m overall length. Verify actual source hash at integration. Historical original hash is `b6783c90db54f5dd70dd68362eb0b2796a8df1c25c0c34f41779a1a59ad2389d`; the earlier corrected-grip handoff hash is `20f5f964405699065d77769bc86fa796d791ddf8144793f93c06066b0fb2b984`. Do not confuse provenance with the latest installed donor bytes.

Hand sockets belong to the real right-hand bone; left-hand support needs its own calibrated contact. Explicit draw/sheath transfer markers are mandatory. The weapon GLB is weapon-only: hip scabbard, upper-back sheath/harness and bow/quiver accessories are separate modules. Weapon presentation must not block navigation, and combat reach must be skill/animation-owned rather than blindly derived from full mesh bounds.

## 6. V1 / NPC cleanup inventory and deletion gates

These files are still active consumers or shared systems. The owner wants obsolete animations scrubbed, not a broken Level 01 or deleted NPCs.

| Audit target | What may be replaced or retired | What must survive |
| --- | --- | --- |
| `src/game/World3D.ts` | Old human/NPC animation loading and routing after equivalent accepted runtime exists | World rendering, placement, interaction, game entry and working Level 01 behavior |
| `src/game/avatarIdentity.ts` | Old per-class animation pack selection and obsolete model fallbacks after replacement coverage | Character identity, race/class selection and compatible save IDs |
| `src/game/avatarMotionController.ts` | Obsolete playback/transition assumptions after donor integration | Semantic motion contract until all consumers migrate |
| `src/game/animationPacks.ts` | Legacy elf/human pack constants/routing; audit shared grounding helper | Generic pack loading, compatible bone binding and measurements still used by other actors |
| `src/game/animationTuning.ts`, `public/config/animation-tuning.json` | Stale rates/overrides that fight approved new clips | Explicit tuning registry needed by still-active consumers; update tests rather than deleting blindly |
| `src/game/motionArchetypes.ts` | Obsolete concrete mappings | Idle/walk/run/start/stop/stairs/door/pickup/combat intent shared by gameplay |
| `src/game/combatActions.ts`, `combatFlow.ts`, `combat.ts`, `equipment.ts`, `character.ts`, `npc.ts` | Animation-specific bindings if superseded | Damage, inventory, skills, equipment semantics, NPC/quest/save behavior |
| `src/game/presentation.ts`, other shared UI | Only proven obsolete animation display paths | Unrelated gameplay presentation and UI |
| `public/assets/3d/animations/elf-shadowknight/` | Legacy packs after every consumer migrates | Licensed sources/provenance, still-live dependencies until replaced |
| Old authoring utilities | Active use of superseded pipelines, not their historical evidence | Reproducibility/source records for retained assets |

Old elf-shadowknight pack families include walk/run/idle, weapon-strike, siphon-cleave, draw/sheathe, unarmed punch/kick, hit/death, door inward/outward, lever, pickup-ground/waist, cast-projectile/ward/summon. Search complete names and URL strings before retirement.

NPCs currently referenced in `World3D.ts`: **Ilyra, Orren, Brannoc**, with `npc-ilyra.gltf`, `npc-orren.gltf`, `npc-brannoc.gltf`. They must not lose their identities/interactions when given accepted skeletal motion. Class fallback GLTFs cover warrior, mage, priest, sharpshooter, paladin, summoner, asura, slayer, shadowknight. Existing human-shadowknight and elf-shadowknight-v2 GLBs are still referenced; dwarf/halfling aliases also need auditing before removing a shared human model.

`enemy-breachling.gltf` is an old monster consumer, NOT part of the instruction to discard human animation. Preserve until its game route is intentionally migrated to the retained creature pipeline. The manifest currently protects it and several old character assets.

Before any removal: separately search direct imports/calls, type references, asset/name string literals, dynamic imports/require, re-exports/barrels, tests/mocks, HTML entries, build/worker routes, manifests and license records. Require zero obsolete runtime references plus replacement test coverage. Retire `build-human-foundation-core-pack.mjs` and old animation-baseline/export utilities only after this audit. Never delete `.md` provenance/runbooks or `public/lore-atlas/*`.

## 7. Retained monsters and bosses: exact installed inventory

All four Breachling GLBs have one mesh, one skin, **24 joints**, twelve clips and one embedded image. This confirms real skeletal data exists; it is not proof of correct weights, independent limb movement, or approved animation.

| Runtime file under `public/assets/3d/characters/breachlings/` | Height m | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `breachling-base.glb` | 1.025 | 6429716 | `00921227fb9a2c3049363c1a8bda35bb8acf20a73811e3ad86c6256bd91b0cc7` |
| `breachling-stalker.glb` | 1.075 | 5974384 | `1f61df8716b60dd376959dbff1295c708f770d3601cf9781263d1996f808a641` |
| `oathbound-breachling.glb` | 1.2 | 6340124 | `077e130cd8a9fa0a755aed1c1efe1f268f8ef08470762adead1b7bf0e2948939` |
| `breachling-ravager.glb` | 1.325 | 5759384 | `cd8fa4f5daf6f789e80322fad2ed7df15cb7b6dcea0dec19c0d869478f08e22c` |

Clip names: `Idle`, `CombatIdle`, `Walk`, `Run`, `BiteAttack`, `ClawAttack`, `LungeAttack`, `TailWhip`, `SpitAttack`, `RecieveHit`, `Death`, `SwordSlashOutward`. Preserve the misspelled `RecieveHit` compatibility until all callers and asset names migrate. `SwordSlashOutward` is an alias of the corrected swipe, not a genuinely different attack. Expose only actions supported by the selected tier's actual gameplay contract; a GLB containing Spit does not authorize every tier to use it.

Runtime/controller: `src/game/dungeons/breach-v2-breachlings.ts`; inspection: `src/game/dungeons/breach-v2-creature-review.ts`. Placement resolves per room and actor ID. Loading is room-scoped; preserve lifetime guards and skeleton/resource disposal.

Warden assets under `public/assets/3d/creatures/cinderbound-wardens/` each have four meshes, one skin, **18 joints**, thirteen clips and one embedded image:

| File | Path / height | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `cinderbound-warden.glb` | wayfarer / 3.6 m | 16289808 | `8d511cda894b174bdb0777c51c8f9fcdf9d96b0baaf8fb347bb7676cfa18a196` |
| `greater-cinderbound-warden.glb` | oathbreaker / 3.9 m | 18296196 | `244cefb9e478c8ce561722e479a2cafce9fb5c91c4ee42477c893ee8f91a5a3d` |

Warden clips: `AshCall`, `BladeSweep`, `CinderSweep`, `CombatIdle`, `DeathCollapse`, `HeadLook`, `HeavyRun`, `HeavyWalk`, `HitReact`, `Idle`, `PalmFire`, `TurnLeft`, `TurnRight`.

Warden runtime: `src/game/dungeons/breach-v2-wardens.ts`; review: `breach-v2-warden-review.ts`. Retain damage segmentation: `Breakoff_30_Shoulders`, `Breakoff_60_Forearms`, `Breakoff_90_Thighs` at damage fractions .3/.6/.9. Audit detached debris contacts/disposal and attack effects, not just the intact body.

Editable Warden source archives are committed in `docs/3d-ai-studio/issue-458/cinderbound-warden-rigging/`, with `asset-receipt.json`; generation/rigging script is `scripts/rig-cinderbound-wardens.py`. Runtime constants also record original Tripo source hashes; those are not the same as the installed rigged hashes above.

Owner's Warden requirements still need explicit acceptance: independent arm/hand/body motion, visible breathing/idle, correct grounding instead of half-buried body, correctly textured armor, glowing red eyes, readable whole-body attacks, correct boss-path selection and useful contact-range behavior. Eighteen bones or a loaded texture does not prove these are finished.

## 8. Monster source candidates and animation quality contract

External artifact root, referred to below as **P**:
`H:/CodexData/.codex/artifacts/issue-458-body-motion-phase-2`.

Read `P/RESUME-CHECKPOINT.md` and `P/skin/SOURCE-HANDOFF.md` for detailed source reconstruction, then this document for newer runtime/takeover status. Their earlier statement that the runtime grounding edit was awaiting permission is superseded by `3a8c345c`.

Independent anatomical source-rig gates passed for all four variants. This does NOT approve all their actions. Refitted origins need calibrated rest-basis mappings for existing clips; do not paste unconverted old local rotations onto a new joint layout.

| Source / candidate | Status and next work |
| --- | --- |
| Base source `skin/base-pilot-v6`; accepted runtime `accepted/breachling-base.glb` | Base bite/swipe/death had prior independent articulation/contact review. Latest owner feedback exposes inherited idle paw lift; see current runtime/contact findings. Do not treat earlier approval as approval of the entire roster. |
| Stalker source `skin/stalker-bind-v1`; candidate `stalker-refit/candidate-v4/breachling-stalker.glb` | Articulation PASS, contact HOLD. Candidate hash `443be985493d864c8a66f941d2d976fb6b46d75dd185db5f22cbe15a57ed8d2e`, 7926340 bytes. Old-runtime review found live swipe 5–14 mm penetration, bite scrub .7 about 76 mm, masked death corrections, and separate Lunge contact failure. Recheck against new deterministic runtime before revising source. NOT installed. |
| Oathbound source `skin/oathbound-bind-v9`; candidate `oathbound-refit/candidate-v1/oathbound-breachling.glb` | HOLD: death tail/hip contact and forearm settlement. Hash `5261ec13712af21ff142aa534ff24c3b2a80a4e0852193241c7a3d71e4565607`, 8337328 bytes. Candidate retains upright tail; hip about 32 mm and forearm about 26 mm below reference floor. A shoulder-pole experiment reduced the forearm error but was not a finished approved export. NOT installed. |
| Ravager source `skin/ravager-bind-v5`; candidate `ravager-refit/candidate-v3/breachling-ravager.glb` | HOLD: bite landing about 71 mm below floor; death upper thigh about 51.7 mm and hip origin about 38.1 mm below reference. Hash `c1b09fc227e2b3765201ebec5033f4a33e75ff259b21e67a542759097f7b6c67`, 7667276 bytes. Own proportional bite/swipe/death and jaw, NOT installed. |

Source hashes: Stalker `ae3dc7f6ffde9a5c8eda2f53dcc431c9721561e124b041cd78095fd1fd41a633`; Oathbound `4e6565bed62cb85cda431d5f454a69bf9575e6d7155ccc0b4369b716e6fe3837`; Ravager `42ea852eeaa824efecdb98c93255746b5f5243a6107d06c4c0c44c531b54d27b`. Confirm against `skin/SOURCE-HANDOFF.md` before use.

Protected geometry, UVs, texture/material bytes and protected head/jaw weights were preserved through source repair. A whole Blender re-export can resample unrelated clips: use the documented action-buffer replacement pipeline and audit the final GLB, not merely a pre-export pose report. Blender display bone tails are not glTF joint-end coordinates; inspect actual head-to-head chain geometry.

Authoring utilities are in P: `author_lunging_bite.py`, `author_death.py`, `solve_swipe_supports.py`, `skin/map_motion_to_repaired_rig.py`, `replace_clip.py`, `preserve_target_jaw.py`, `finish_contacts.py`, `audit_refit.py`, `review_actions.py`. Accepted base round-trip source is `accepted/blender/breachling-base.blend`; original death authoring is `death-v7/breachling-base.blend`. The external sources/evidence are local-only and must be copied deliberately if the successor works on another machine.

Mandatory motion rules, reflecting the owner's corrections:

- Real skinned skeletons for every creature, boss, player and NPC. Record actual hierarchy, bones, weights and binding; independently pose each required chain. Missing/unsafe weights block animation authoring.
- Squared, anatomically forward quadruped stance in game. A side camera for a sheet is NOT a side-twisted animal pose. Ravager's source anatomy is diagonally aligned: determine forward from head/pelvis, not an assumed mesh axis.
- Idle: visible restrained breathing/attention and a seamless loop; independently verify all intended support contacts, not the minimum vertex of the entire mesh.
- Claw: three supporting feet stay planted; the active shoulder, elbow and wrist lift the paw and drive a horizontal cross-swipe into the forward combat space. No overhead arm flourish and no torso-only substitute.
- Bite: the latest owner direction supersedes the earlier stationary bite concept. Load, lunge forward with the front of the body, reach/reposition the forelimbs, snap the jaw at forward contact, land and recover. Use coordinated pelvis/spine/neck/head/jaw and limbs; not neck-only movement or frozen arms.
- Lunge swipe: haunch compression, hind-limb launch, visible suspension, both forelimbs reaching forward to grab/strike, landing and recovery. Keep the distinct bite/jaw action separate from this two-claw attack.
- Tail whip: pelvis/spine counterrotation and a travelling tail-chain sweep across the body into the strike, followed by recovery. Do not just rotate the entire model.
- Spit: same body mechanic across the intended poison tiers; stronger power/VFX does not require an unrelated rearing pose. Jaw opens/closes, head aims, body supports the action. Owner liked one poison reference and rejected the final alternate version; do not resurrect that rejected movement.
- Walk/run: preserve accepted footfall directions and cycles, but gameplay translation/pathing must actually move the animal. In-place mode is useful for inspection only and must be labeled. Match footfalls to speed and blend starting/stopping; avoid loop resets and sudden freezing.
- Hit/death: joints lose support progressively, body contacts then settles, limbs and tail relax. No rigid sideways tipping, standing crouch as a corpse, or root-lifting the entire body to hide one penetrating toe. Solve proximal hip/flank support and articulated limbs.

Use the creature-animation playbook/`quadruped-animation-sheets` skill together with `docs/ANIMATION_PRODUCTION_PIPELINE.md`. The owner's approved lunge-bite requirement takes precedence over any generic planted-bite template. Use licensed/owner-approved reference motion where suitable; otherwise approve eight ordered full-body poses per difficult action before final authoring. Approval is per action/body family, not blanket permission for new variants. Deliver matching target poses, 1× playback and slower diagnostic playback, with real surface-contact and mesh-deformation evidence.

## 9. Shared animation tool and latest panel-discoverability requirement

The user accepted the improved non-overlapping UI and click-to-inspect foundation, but wants it reliably discoverable and recoverable. These final additions are **NOT implemented in this checkpoint**.

### Required behavior

- Desktop hover over an inspectable visible monster/boss/NPC/player gives a clear cue such as **Click to inspect animations**. Do not hint through walls/fog or on unselectable objects.
- Touch users get an on-screen hint/affordance; do not depend on hover. Distinguish camera dragging/pinching from a deliberate tap.
- Settings includes **Animation panel**, alongside Combat and Navigation.
- Closing the inspector hides it but preserves the last selected actor and action. Pressing Animation panel reopens that inspector and selection. Do not reset playback/time merely because visibility changes unless explicitly chosen by the user.
- If the selected actor was unloaded/disposed, including removal after death, show an honest unavailable state and a valid replacement choice; do not retain a stale actor object or silently inspect a different monster. A still-present corpse remains inspectable for its death animation. No-selection state must explain how to pick an actor.
- Only one active settings/navigation/combat/animation workspace at a time. Opening one closes/hides the others completely, including their collapsed headers; diagnostics can remain as a separate compact HUD.
- Mobile panel remains small, scrollable with obvious overflow, collapsible, safe-area aware, and usable while gameplay remains visible. Settings, camera reset and movement controls must remain reachable. Test portrait/landscape and resize, not desktop CSS shrunk to phone width.

### Tool model and source integration

Selection hierarchy: Human / NPC / Monsters / Bosses → body/species/variant → live actor instance → action. Include all four Breachlings and both Wardens, with actual action lists and clear aliases. Preserve separate loadout/grip selection for the human lab. Multiple same-species monsters must remain individually selectable.

Expose Play, Pause, Restart, scrub, speed, loop/one-shot status, current actor/action/time, front/side/back/gameplay views, focus/reset camera, and labeled in-place versus path-following locomotion. Show contact/skeleton diagnostics without claiming their cached values prove animation quality. Use the actual game controller/asset metadata rather than maintaining a second animation list or a preview-only skeleton.

Current integration seams in `breach-v2-preview.ts`: `reviewPanels`, `hideReviewPanels`, `showReviewPanel`, actor raycast selection, and the `BREACH_V2_PANEL_EVENT` coordination from `breach-v2-mobile-controls.ts`. Current Close hides the panel and clears camera inspection focus; it does not implement the requested remembered-selection launcher. Settings/navigation live in `breach-v2-mobile-controls.ts` and `breach-v2-dev-panel.ts`; combat workspace in `breach-v2-gameplay-ui.ts`.

Existing review controllers/hooks useful for adaptation:

- `window.__dungeonHumanFoundation`: animation names/snapshot/play/pose/pause.
- `window.__dungeonCreatures`: snapshots and actor-ID-based play/pose/pause.
- `window.__dungeonWarden`: snapshots and Warden play/pose/pause/damage controls.
- `__dungeonScene`, `__dungeonRenderer`, `__dungeonCamera`, `__dungeonControls`, `__dungeonFrames`, `__dungeonLoopError`, `__dungeonStats` for diagnostics.
- `__dungeonPlayer`, `__dungeonNavigateTo`, `__dungeonWalkTo`, `__dungeonCanStandAt`, `__dungeonPathSnapshot`, `__dungeonPathRemaining`, `__dungeonGameplay`, `__dungeonFogOfWar` for inspection/tests. These debug hooks are not a replacement for actual user-control testing.

## 10. Dungeon/runtime work that must survive integration

| Area | Preserve / acceptance requirement |
| --- | --- |
| Scene lifecycle | `breach-v2-startup-safety.ts`, generation/disposal guards, async actor activation guards, shared unique-resource disposal and skeleton bone-texture cleanup. Warden uses disposal helpers exported by the Breachling runtime. |
| Diagnostics | `breach-v2-runtime-diagnostics.ts`, downloadable persistent report, frame timings, context events, resource counts and material-readiness evidence. Diagnostics visible as compact HUD with Settings closed; no giant compulsory box. |
| Camera | Isometric default; first-person/third-person/isometric switching in place preserves player position, seed, progress and scene. No reload/rebuild on ordinary view change. |
| Inspection camera | Reversible wheel/pinch zoom, close face-level inspection, pitch down to see complete target, reset/focus, no one-way zoom trap, no unwanted movement when clicking menus. Verify all modes on desktop/touch. |
| Room topology/navigation | `breach-v2-layout.ts`, generator/registry, collision/profile path tests, doors/stairs/elevation, room activation and navigation continuity. Keep dungeon changes while replacing only animation consumers. |
| Fog/exploration | `breach-v2-fog-of-war.ts` and preview rendering. Hide unexplored layout/silhouette, not just room contents with visible roofs/walls. Retain explored rooms for that run; reset discovery for a new procedural run. Test overview and the boss-to-exit leak. |
| Designer controls | Explicit demo/design reveal-unexplored toggle; never silently expose gameplay layout. Camera switching must not rebuild or reset the run. |
| Ceilings | First-person shows ceilings; isometric may cut away. Do not reintroduce see-through exit/stair-room leakage. |
| Combat vs preview | Inspection is a sandbox, not a forced objective UI. Actual demo/game mode owns progression/objectives and true combat outcomes. |
| Performance/materials | Room-scoped/lazy assets, stable cleanup, texture readiness after room changes; preserve high-resolution masters and validate runtime memory/render settings on GTX 1070 8 GB and mobile. No diagnosis from texture size alone. |

Relevant history to inspect rather than overwrite: `597d1b0f` in-place camera; `5ab65bf3` initial camera mode; `5fa4bba1` selected actor focus; `e9589e5a` contextual camera/review; `7ffbc683` viewport/navigation panels; `f7c70a26` persistent diagnostics; `23b203e9` mobile isometric framing; `e795d16f` mobile inspection state; `2b5e2365` close mobile zoom; `ea2fb6ce`, `c8e23459`, `216b951b`, `7029509b`, `f71833ed`, `977c3edc` lifecycle/disposal fixes. These commits document implementation, not proof that every later owner edge case is solved.

The owner replaced the previously mining-used GPU with another GTX 1070 8 GB and reported crashes gone. Preserve that observation. Do not continue presenting the old hardware failure as an unresolved proven application crash, or use it to excuse remaining code/animation defects. Current scoped native tests also observed no context loss; this is not an unlimited-duration stress guarantee.

## 11. Every-weapon acceptance matrix: only after animation passes

Inventory the incoming tool and actual game equipment; do not mark a family complete solely because a menu label exists. The donor package lists greatsword, shortsword, staff fighting/casting, mace, bow, fire wand, ritual knife, single dagger, paired daggers and unarmed casting. Additionally the owner requires sword-and-shield using the existing shield asset. Resolve whether a dedicated greatsword mesh is approved; do not silently use an unrelated sword as proof.

| Loadout | Required checks beyond common locomotion/combat checks |
| --- | --- |
| Starter longsword / approved greatsword presentation | Correct one/two-hand contract for the selected technique, both hand contacts when two-handed, guard clearance, draw/sheath markers, correct carry asset and length |
| Shortsword / sword + shield | Actual shield visible and socketed, independent offhand grip, block/parry/recovery, no sword-only substitute for shield animation |
| Fighting staff / caster staff | Approved grip variants, two-hand contact where required, turns/carry, butt-smash/melee versus casting technique and equipment clearance |
| Mace | Correct heavy-weapon timing and reach; proxy motion either explicitly accepted or replaced |
| Bow + standard/fire/ice/poison arrows | Equip, retrieve from quiver, nock, draw, aim, release, real projectile and hit/damage, minimum-range behavior, inventory changes, correct harness/quiver/socket visibility |
| Approved fire wand | Correct asset, grip, caster locomotion and spell release/hit timing; no rejected wand draft substitution |
| Ritual knife; single and paired daggers | Correct loadout count, independent hands, contact and attack intent, no unexplained axe/jump proxy treated as final |
| Unarmed casting / other actual equipped families | Accepted body motion, intended skill events and recovery; include additional real inventory entries discovered during integration |

For each row, run both Wayfarer and Oathbreaker from H-01 through real connectors/stairs/doors and monster rooms to the appropriate Warden and exit. Use seed 4182 for comparison plus at least one additional generated layout. Use warps only for isolated debugging, not as the walkthrough evidence.

Required recorded steps per run:

1. Correct body/loadout assets loaded, source commit and per-asset hashes recorded, no missing textures.
2. Idle breathing → start → walk → run → turn → slow/stop → idle; smooth at several speeds, no in-place sliding, jerking, resets, floating feet or abrupt stops. Stairs match travel policy and floor elevation.
3. Draw/ready/attack/cancel/recover/sheath, with visible fingers, grip/guard clearance and correct event markers. Weapons never teleport between sockets outside the authored transfer.
4. Fight each encountered tier using real input: facing/range, forward strike envelope, damage, hit reaction, defensive response, death and progression. Prove target response, not only player animation playback.
5. Creature walk/run actually path and face travel direction; attacks face the player without side-twisted base alignment. Planted supports stay down, airborne phases are intentional, death settles properly.
6. Both Warden versions: all attacks, heavy locomotion/turns, actual range/damage, red-eye/material presentation, staged breakoffs and final death. No buried legs or floor/platform substitutions.
7. While away from spawn, switch first/third/isometric views, zoom in AND out, pitch/focus/reset. Player position and discovered rooms remain unchanged.
8. Select a monster, close inspector, reopen from Settings to same selection, switch actor/action, open Combat/Navigation/Settings in turn. No overlapping panels; diagnostics stay readable without Settings open.
9. Desktop native GTX 1070 8 GB and physical mobile portrait/landscape. Emulation supplements but does not replace device acceptance. Capture frame-time/stutter and memory/resource trend through room changes and repeated actions, plus context/error logs.
10. Exit/progression, repeated entry/teardown and new procedural run leave no stale actors, event listeners or resource growth. New-run fog must not reuse exploration from a different generated layout.

Attach a per-run matrix with weapon, path, seed, commit, device/renderer, start/end, actions tested, pass/fail, evidence and open defects. Do not replace failed acceptance with a screenshot of a favorable pose.

## 12. Safe integration order, verification and completion gates

Recommended bounded work phases (follow the owner's max-five-files-per-phase/approval rule; split further when necessary):

1. Read both current receipts and refresh branch status. Map shared imports and assets from common ancestor. Choose one authoritative human controller/data path. Record the removal list and transfer source/evidence as needed.
2. Integrate a minimal accepted human adapter plus its tests first, preserving current dungeon scene/navigation. Do not import all historical #435 World3D/main/combat changes. Retain source provenance and direct same-rig animation packs.
3. Wire the remaining loadouts and actual skill/projectile/equipment behavior in small reviewed phases. Retire rejected #458 human files only when replacement consumers and tests are complete.
4. Integrate monster/boss categories into the same tool and finish each action/body's contact gates using the retained sources. Resolve the old non-base motion failures before publishing the new grounding runtime to the owner preview.
5. Complete remembered panel reopening/discoverability and remaining camera/fog/UI checks; then do the full acceptance matrix above.

Before a structural refactor of a file over 300 lines, perform the owner's separate dead-code cleanup step, but remove only proven dead code. Do not turn this handoff into an unreviewed broad rewrite. For more than five independent files, follow the owner's explicit parallel-agent ownership rule; avoid overlapping file ownership and do not overwrite another agent's work.

Tests to preserve/extend include `breachV2Breachlings`, `breachV2Wardens`, `breachV2HumanFoundationActor`, `breachV2HumanFoundationReview`, `breachV2MobileControls`, camera collision, startup safety, gameplay, topology render, elevation/layout/generator/door/registry tests, animation packs/assets/tuning and equipment tests. Search actual filenames before edits. Update assertions to the accepted new contract; do not disable failed pose/asset tests to force a pass.

Fresh checkpoint verification:

- `yarn typecheck`: PASS.
- `yarn test --maxWorkers=4`: **38 test files / 286 tests PASS**.
- Four extra real AttachedBind SkinnedMesh grounding regressions: PASS. External file `P/grounding-runtime/regression/grounding.test.ts`; command from app: `node node_modules/vitest/vitest.mjs run --root H:/CodexData/.codex/artifacts/issue-458-body-motion-phase-2/grounding-runtime/regression`. Covers elevated room floor, bidirectional/repeated airborne scrub, authored death trajectory, recovery, and source clip preservation. Migrate these into permanent repo tests in the successor's next appropriate phase.
- No ESLint script/config is configured in this game package; no ESLint pass is claimed.
- Isolated `yarn build`: PASS. `dist` **256288202 bytes**; `dist-pages` **256278043 bytes**, both below preferred 475000000 and hard 500000000 limits. Existing >500 kB JS-chunk warning remains.
- Build location: `P/grounding-runtime/build-verification-20260830`. It copies source/config/tests/scripts, references the actual app's public assets/dependencies via local junctions, and has its own dist outputs. No owner preview output was overwritten. Release metadata explicitly marks `54d81773...+grounding-working-tree`, because verification preceded commit; runtime hash above matches committed `3a8c345c` content.
- Independent native browser contact result: scoped PASS with the explicit HOLD findings in section 3. No source assets were substituted during that review.

After successor integration, rerun typecheck, full tests, donor numerical suites, production build, release verification and independent native/physical-device evidence. Check both built targets against the permanent budget and exact approved asset hashes. Only then intentionally rebuild the owner's preview with correct committed release metadata and provide a verified URL. A commit is not a build, a build is not a running preview, and a preview is not deployment.

Closure requires: accepted human replacement, safe V1/NPC migration, per-species/boss skeletal/motion/contact approval, complete equipment/skill behavior, persistent usable inspector, camera/fog/material acceptance, every-loadout walkthrough evidence, independent review and owner QA. Keep #458 open and `owner-qa:pending` until those gates are met.

## 13. Short pickup instruction for the receiving animation agent

Take over existing issue #458 on `codex/458-pre-codex-fixes-validation`. Start with this file, the external `skin/SOURCE-HANDOFF.md` and native grounding review, then the current #435 QA handoff and asset map. Preserve the dungeon/mob/camera/UI/lifecycle work. Replace the rejected current human playback with your accepted lab source; do not resurrect V1 or capsule previews. Retain/refine the monsters/bosses in your tool with species/variant/actor dropdowns. Finish all action/contact passes and the remembered Animation panel launcher. Then prove every weapon from entrance to boss/exit on both paths before asking the owner to close the ticket.
