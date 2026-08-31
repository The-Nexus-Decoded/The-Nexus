# #458 — Motion Studio integration checkpoint

## Active owner goal — expanded 2026-08-31

The owner has requested continued implementation, not a stop after the base
pilot: put the revised animations into the lab for the current creature roster,
review both bosses, and add a full combat and environmental-interaction review
mode. This supersedes the older checkpoint's narrower next-step order below.
Work remains on the existing #458 issue branch; #435 supplies the accepted human
and equipment foundation, and #439 records related combat-presentation contracts.
No new ticket, paid generation, dungeon promotion, or live deployment is implied.

The later owner goal adds parallel builders, a harsh independent visual critic,
and repeated reference-based refinement of animation, contact/physics, materials,
lighting, NPCs, furniture and built review scenes. Apply the building/interior/
street quality wording to the scoped interaction scenes, not as permission to
overwrite other agents' Heartvale or dungeon work. "AAA" is a quality aspiration,
not a certification conferred by test counts, self-review, or a manufactured
"perfect" verdict. Record actual defects and comparisons, including unfavorable
results. Anonymous A/B frames may reduce label bias; recognizable sources and
reviewer familiarity must be disclosed rather than called fully blind.

Primary reference candidates, verified 2026-08-31: [Bruno Simon's live Three.js
portfolio](https://bruno-simon.com/) and its [source](https://github.com/brunosimon/folio-2025)
for browser lighting, interaction and scene coherence; [Rockstar's official GTA VI
media](https://www.rockstargames.com/VI/media) for a separate commercial visual
benchmark, **not** a claimed Three.js game. No comparison result exists yet.
Reference imagery is for analysis, not permission to import game assets.

Implementation proceeds in bounded, tested, committed phases:

1. Install the independently reviewed five-attack base pilot as a separate,
   hash-pinned lab asset. Preserve the forty approved keys, the approved neutral
   holds, and honest labels for untouched source clips and remaining review flags.
2. Adapt the shared authoring/validation pipeline to Stalker, Oathbound, and
   Ravager, and review both Cinderbound Wardens. Verify each actual skeleton,
   rest basis, skin weights, proportions, contacts, and action semantics; a base
   pass or common bone names do not certify another model. Preserve path-specific
   boss skins/powers and the established attack repertoire.
3. Add **Combat Review inside Motion Studio**, retaining solo review. Select
   attacker and defender independently from the human/monster/boss roster,
   including same-family and same-model pairings. Share one deterministic
   timeline for approach, facing, attack, projectile/spell flight, contact,
   reaction, recovery, and defeat. Expose spacing, playback, appropriate rig
   controls, reaction choice, and impact timing/location/direction/type; do not
   turn every hit into one generic flinch or report timer-only damage as contact.
4. Add a reusable spawnable-prop and interaction layer for real textured trees,
   chests, doors, water, and destructible objects. Test opening, breaking,
   climbing, swimming, and other available interactions through actor/prop
   capabilities. Reuse cleared assets and existing clips first. Unsupported
   anatomy or missing source assets must be identified honestly, not replaced
   silently with a fake clip or primitive content asset. Debug collision shapes
   remain explicitly diagnostic, not rendered substitutes for real props.
5. Verify the full pair-selection matrix, deterministic replay/reset, concurrent
   actor isolation, hit/reaction timing, prop state transitions, resource cleanup,
   source-asset preservation, desktop/phone controls, and the built local page.
   Fresh wide/close independent visual review complements automated checks.

Current scope is the six creatures already in the lab and the accepted Human
Foundation/loadouts. Registries and capability profiles must support extension
without copying model-specific controllers, scripts, UI workflows, or tasks.
Use the canonical [DRY reuse policy](README.md#dry-reuse-policy). Broad Heartvale
wildlife work owned by other tickets is not silently absorbed into this branch.

The base export is installed as a separate hash-pinned studio asset. Pilot
typecheck, 356 tests (zero skips), build/release and native playback/scrubbing
checks passed; an independent reviewer cleared ten refitted native wide/side
frames. The detailed repair runbook retains numeric and presentation limitations.
The first shared combat-clock phase is implemented but not yet connected to UI:
absolute actor/prop sampling, eased pose transitions, deterministic loop events,
seek without repeated effects, and terminal death holding. Nine focused tests
pass, including all nine actor-family pair combinations; the combined suite
passes 46 files / 365 tests. These are clock-contract tests, not rendered combat
or spatial-contact acceptance. Human factory extraction, variant retargeting,
boss review, real props and full combat presentation continue in parallel.
The expanded goal is **not complete**. All dungeon
creature assets, accepted human animations, and the existing local server remain
protected; local lab testing is not production or owner animation acceptance.

### Shared actor and contact checkpoint — 2026-08-31

- `dd62534d` extracts the existing human actor/catalog into reusable factories,
  retaining all 405 source clips, ten equipment loadouts, accepted grip/IK and
  authored moves. Two actors have separate skeletons, mixers, materials and
  calibration; raw motion mode no longer inherits equipment finger offsets.
  `d51da61c` updates only the staff verifier's source locations after extraction.
- `d6f18bfc` adds independent mob adapters around the existing MobsStage runtime,
  not a second creature controller. Same-model instances and both boss families
  preserve per-instance placement, sampling, calibration and disposal.
- `ac0d92ec`, `75675dde`, and `ef6636ed` add rendered/deformed-triangle contact
  surfaces, model-specific weighted contact probes, deterministic pose blending,
  and sampled-motion camera bounds. Sibling bones are refreshed and unindexed or
  hidden vertices cannot masquerade as visible contact points. These are shared
  helpers; a sampled probe is not a full continuous two-body physics solver.
- Focused latest verification: 51 tests across actual mob adapters, contact and
  posing pass; typecheck passes. Human extraction's earlier full suite passed
  48 files / 403 tests; subsequent independent actor/contact checks passed 55.
  Staff verification retains all 2,111 sampled frames and six authored moves.
  No ESLint pipeline is configured. No new combined build/native UI acceptance
  is claimed: Combat Review controller/panel integration is still in progress.
- Oathbound adaptation is external-only while its own jaw range and contact
  placement are reviewed. The inherited boss source has confirmed axis, armor
  separation and death-collapse defects; those clips are not called repaired.
  No variant/boss candidate, prop scene, or dungeon update has been installed by
  this checkpoint. The active expanded goal remains unfinished.

## Earlier integration checkpoint — historical evidence

Date: 2026-08-31. Status: local studio and starter-player integration verified; #458 remains OPEN and owner QA pending.

## Scope and source identity

- Destination: `codex/458-pre-codex-fixes-validation` in the existing #458 worktree.
- Imported the scoped #435 QA package from `d24168ffad8eccc5c04603f0838c97ce05e2f77d`, not its inherited V1 playbook/game changes.
- The 24 accepted lab assets retain their receipts in `issue-435-lab-asset-map.json`. The accepted canonical longsword replaces the old #458 sword export.
- Source Human Foundation body and 400-clip library are unchanged. The five locomotion extras and accepted authored lab motions remain available.
- Retired the now-unreferenced 18-clip core GLB, JSON manifest, and its builder. These are recoverable from Git. Historical Markdown handoffs and still-used V1 NPC consumers are retained.
- No new Tripo operation, creature GLB replacement, dungeon layout change, navigation change, or production deployment is included.

## Review entry points

Run `yarn dev --port 5179` from `Arianus-Sky/projects/games/SoulDrifterWeb`, then open `/weapon-lab.html` in the in-app browser. Do not use the game root as the animation review entry point.

- `/weapon-lab.html`: **SoulDrifter Motion Studio**, one shared viewport and playback toolbar.
- `/asset-review.html`: accepted archery asset inspection.
- `/?dungeonPreview=breach-v2&seed=4182&path=wayfarer&cam=isometric&start=H-01&animationReview=1&creatureReview=1&wardenReview=1&diagnostics=1`: actual first-level preview, not a completed combat walkthrough. Repeat with `path=oathbreaker` for that route when integration is ready.

For a built local review use `yarn build`, `yarn verify:release`, then serve `dist-pages` with a local static server. Verify `/release.json` and use the exact studio URL. No development server should remain running after the task.

## Contextual controls

- Human weapons: retains all ten loadout choices and their accepted/proxy labels, including shared walking/running. Arrow inventory and minimum bow range appear only for bows. Support-hand/IK/staff controls appear only where applicable.
- Human motions: source and authored motion catalog, activity/movement filters; no equipment, arrow inventory, or grip tuning.
- Mobs & bosses: four installed Breachling variants and both Warden bosses. The installed model SHA-256 is verified when Web Crypto is available; insecure HTTP explicitly reports size-only validation.
- Breachlings expose 32 real-joint controls: paired forelimbs/paws, hindlimbs/feet, torso/head, jaw and tail. These rigs do not contain individual finger or claw bones.
- Wardens expose 22 real-joint controls. The right-hand bone has no skin weights or useful weighted descendants, so its blade is adjusted via the weighted forearm, not a pretend finger grip.
- Playback: play/pause, restart, timeline, speed, repeat/one-shot and full/side/back/joint cameras. Panel hide/show remains available on desktop and phone-width layouts.

## Draft calibration contract

The studio uses `breach-v2-breachlings.ts` and `breach-v2-wardens.ts`, the same controllers used by the dungeon. A narrowly scoped review placement selects one real actor; it does not run dungeon AI or pathing.

`mob-pose-overlay.ts` restores clean source pose before mixer evaluation and applies additive local-joint offsets afterward. Repeated paused updates must not accumulate offsets. Profiles are isolated by family, exact asset SHA-256, action, and articulation schema.

Use **Export draft** to save changes before reloading the page. **Import draft** accepts only the matching model revision and action, validates finite/bounded controls atomically, and preserves the current pose when invalid. **Reset pose** restores the source clip. Drafts are not baked animation exports and are not automatically applied to gameplay.

**Measure contact** reports the current whole-mesh minimum only. A zero minimum is not proof that every paw or body part has good contact. Existing floor-reference correction is not a contact acceptance certificate.

## Human runtime integration boundary

The first-level adapter now reads the complete accepted library, uses the accepted body/canonical sword and shared greatsword hand calibration, and routes its supported starter actions honestly. It no longer presents a sword as a bow or staff, or the rejected hip-sheathing flow as an accepted action.

This is the starter greatsword/unarmed integration, not all weapon gameplay. All other accepted equipment and authored equip/stow sequences remain in Motion Studio until their full gameplay assembly is integrated. Do not label the restricted runtime action list as all 420 lab motions being production-ready.

### Continuous locomotion correction

The canonical imported rig is locally Z-up. The former normalization treated local Y as height, retaining roughly 0.941 m of forward travel per walking cycle and snapping it back at the loop boundary (about 1.93 m at runtime scale). Runtime-only cloned clips now project root translation onto world-up expressed in the actual parent frame. Navigation retains ownership of horizontal movement; true vertical bob/jump displacement is preserved and source clip arrays are unchanged.

Movement requests retain the same repeating action while walking/running continues. Walk-to-run and run-to-walk transitions preserve normalized cycle phase. One-shot attacks complete and recover directly into the still-requested gait, without an intermediate idle/reset. Snapshot playback telemetry records activation, cycle count, phase and repeat/one-shot mode.

Real 65-bone tests sample more than three cycles of all four armed/unarmed gaits. Maximum seam translations are 1.67 mm (walk), 1.21 mm (run), 2.23 mm (greatsword walk), and 0.38 mm (greatsword run); maximum angular step is below 0.045 radians. These numerical checks complement native dungeon inspection and do not certify all future movement speeds or monster gaits.

### Follow-up: running slowdown / stop transition

Owner request, 2026-08-31: a fast run should finish with a natural slowdown sequence, not switch straight into a stationary pose. This is a requested first-level integration follow-up, **not implemented by this checkpoint**.

- Keep the running cycle continuous while running is requested. On a normal stop, chain **run -> deceleration / run-stop -> idle or armed guard**; settle into walking instead if walking is still requested.
- Match movement speed to the transition so the feet do not slide while the animation brakes. Check stopping distance at navigation destinations, and allow renewed movement to interrupt the stop smoothly.
- First audit the accepted source library and locomotion extras for a usable slowdown/run-stop clip. Availability has not yet been verified; do not claim the existing looping fix provides this separate sequence.
- Verify armed and unarmed stopping in the actual first level, keeping attacks one-shot. This belongs to the first-level movement acceptance checklist, not a separate studio redesign.

## Verification at this checkpoint

- `yarn typecheck`: PASS. No ESLint pipeline is configured for this game package.
- `yarn test --maxWorkers=4`: 44 files / 344 tests PASS. Includes 13 actual-six-GLB stage tests, 7 overlay tests, 13 mode-isolation/recovery tests, and 11 human actor/calibration tests.
- `yarn build` and `yarn verify:release`: PASS. Sites artifact 377,207,450 bytes; Pages artifact 377,197,013 bytes, both below the preferred 475 MB budget. All 24 accepted lab asset receipts verified in both outputs.
- Staff and armed-locomotion numerical verification scripts pass; 400 source clips unchanged, six staff additions retained, ten loadouts retain locomotion choices.
- Native in-app browser: all ten human loadouts, human motion mode, all six mobs, served mob SHA-256, per-action offset isolation, single-shot terminal/replay, panel reopening, and phone-width layout inspected. Actual first-level room loads the accepted human adapter, moves on click navigation, and returns from armed walking to guard on arrival without console errors. This is not the full combat walkthrough.
- Independent review: mode isolation and failed-load recovery findings fixed and covered by tests; desktop renders and bounded human runtime code reviewed. Creature visual defects remain explicit rather than hidden.
- Local visual evidence: `H:/CodexData/.codex/artifacts/issue-458-motion-studio-integration-20260830`. Evidence is not committed into the repository.
- Preserved the pre-existing untracked repository `.planning/` files. No production deployment, QA merge, paid operation, or #458 closure.

## Remaining #458 acceptance gates

1. Review and repair the existing creature/boss source motion and contact defects, using the shared studio. The Warden's detached/floating visual segments and the Breachling contact failures are still visible and not accepted.
2. Complete every actual weapon/loadout's dungeon gameplay assembly, including accepted authored transitions, attacks, ammunition and close-range behavior.
3. Review the remaining NPC migration separately; preserve identity, quests, saves and active V1 consumers until their replacements are proven.
4. Complete uninterrupted entrance-to-boss-and-exit fighting/navigation on both paths, with every supported loadout; add AI/pathing/attack-radius work through its scoped tickets.
5. Fresh independent visual and runtime review, then owner QA. No issue closure or production promotion based on this checkpoint alone.
