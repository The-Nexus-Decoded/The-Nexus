# #458 — Motion Studio integration checkpoint

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
