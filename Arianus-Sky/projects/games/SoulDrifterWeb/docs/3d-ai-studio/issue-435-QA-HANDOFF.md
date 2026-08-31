# Issue #435: approved human weapon lab QA package

Date: 2026-08-30. Ticket: https://github.com/The-Nexus-Decoded/The-Nexus/issues/435

## Release scope

This package publishes the approved human animation/weapon lab and independent Tripo archery asset review as `weapon-lab.html` and `asset-review.html`. It is a QA review package, not the #458 dungeon integration or blanket production acceptance.

- Canonical Human Foundation body and all 400 original source clips are byte-preserved.
- Five genuine Mixamo exports are added: Injured Run, Slow Run, Running Leaning Back Or Forth, Running Up Stairs, Walking Up The Stairs.
- Every existing weapon loadout now offers walking/running: greatsword, shortsword, staff (fighting and caster), mace, bow, fire wand, ritual knife, single dagger, paired daggers. Unarmed casting is also covered.
- Existing attacks, staff moves/three grip choices, bow retrieval/nock/release, and approved grip calibration remain available.
- Staff fighting locomotion composes the approved ready-guard arm/hand channels over the existing gait. It clones tracks and preserves gait root/spine/head/legs/feet and timing.
- Assets include standard/fire/ice/poison arrows, quiver, harness source mesh, and the single approved fire wand. No paid provider operation was performed for this packaging.
- All 24 referenced assets (157,307,338 bytes) have a path, source record, license record and SHA-256. Fifteen are newly copied (81,996,694 bytes); nine are identical existing #435 files.
- Runtime URLs are portable; optional live calibration is development-only and opt-in. No workstation filesystem URLs are used by the packaged browser modules.
- The original standalone lab remains separate. A Grip-view click-handler bug discovered during verification was corrected before the owner's read-only code-review request; no code-review findings were fixed.

## Shared carry coverage

| Loadout | Walk/run family |
| --- | --- |
| Greatsword | GreatSword |
| Shortsword, mace, single/paired daggers | ProMeleeAxe (explicit proxies) |
| Wand, ritual knife, unarmed magic | ProMagic |
| Staff fighting | CarryLayer staff guard over MaleLocomotion gait |
| Staff casting | ProMagic, staff upright in primary hand |
| Bow | ProLongbow carry plus existing drawn-bow walk/run |

There are 24 visible walk/run choices across 10 loadouts. This coverage does not add nonexistent loadouts such as sword-plus-shield or imply calibration for other body types.

## Reproduce verification

From the SoulDrifterWeb directory:

```sh
yarn typecheck
yarn test --maxWorkers=4
yarn build
yarn verify:release
```

The portable numerical scripts are `scripts/verify-weapon-lab-staff.mjs` and `scripts/verify-weapon-lab-locomotion.mjs`. Vitest runs both. Their reports go to ignored `node_modules/.cache/weapon-lab-qa/`. No ESLint configuration/command exists in this game package.

Source-package evidence:
- Typecheck passed; 48 test files / 316 tests passed.
- 2,111 staff/mace pose checks and 2,082 staff balance checks passed.
- All 400 source clips and original action baseline preserved.
- Five new clips: 155 sampled poses; exact canonical 65-bone hierarchy/rest transforms.
- Browser: 24 walk/run choices advance at both 0.6x and 1x. Five timeline phases plus opposing grip/back views captured.
- Independent visual review: no blocking new carry regression across nine armed loadouts and unarmed casting. Greatsword two-hand contact and centered staff fighting/caster grips retained.
- Built pages loaded successfully; all six independent archery asset selections loaded without browser errors.
- Built release verification: 24 identical asset hashes in both output targets. Source checkpoint build: dist 326,802,315 bytes; dist-pages 326,791,849 bytes, under the preferred 475,000,000-byte limit.
- Browser diagnostic: Three.Clock deprecation warning only; no application error observed on the built review pages.

Local source evidence is at:
`H:/CodexData/.codex/visualizations/2026/08/29/01a04c37-0734-7361-bb0a-45a35626ef6b/grip-lab/assets/qa/armed-locomotion/`
including `browser-proof.json`, five-phase wide captures, `--grip.png`, `--action-close.png`, and built-page captures. Initial blank Grip-view captures were invalid and replaced before independent approval.

## Read-only code review

See `issue-435-REVIEW.md`: a fresh quick Codex review of 12 scoped release files found zero confirmed P0/P1 defects. No review-driven fixes or refactors were applied. This is not exhaustive certification.

## QA integration discipline

Checkpoint the complete package on #435 first. Then integrate it through a clean branch based on current QA, with the nine mapped existing binary dependencies and related intake/calibration provenance.

Preserve QA's current game/dungeon entry, hardened asset pruner, protected globs, dependency/CI settings, asset collections, and existing license records. Do not merge the 118 inherited playbook/archive files or old #435 V1 World3D/main/combat integration. Those remain preserved on #435 for the later #458 handoff. Do not modify either #458 worktree.

A merge is not a deployment. Verify the QA merge commit and pipeline separately; GitHub Pages/main production deployment is outside this release.

## Deferred integration / acceptance work

- Receive the #458 dungeon handoff; replace its human animation wiring with this accepted source, then review monsters separately.
- Wire gameplay movement states, steering/pathing, attack radius, minimum bow range, AI, and end-to-end combat. The review menu is not proof those systems are integrated.
- Stair source travel is intentionally retained. Match it to actual stair/root-motion policy during dungeon integration.
- New bodies/equipment combinations require their own calibration identity and visual acceptance per HUMANOID_ANIMATION_CALIBRATION_RUNBOOK.md.
- Existing body/shorts deformation and every-frame mesh collision were not certified by this carry pass. Existing quiver/strap acceptance is not broadened by it.
- Archery assets have base-color/normal/metallic-roughness textures. Several other approved meshes remain base-color-only; see the asset map material audit. Full PBR acceptance is a separate production gate.
- The broader #435 modular character/clothing/race scope is not closed merely by this package.

