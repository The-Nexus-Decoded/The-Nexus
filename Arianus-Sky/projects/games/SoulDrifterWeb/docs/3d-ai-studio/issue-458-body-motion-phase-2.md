# Issue 458: articulated bite, swipe, and death — phase 2

Date: 2026-08-30. Baseline: `d9953f17`. Owner approved this phase.

## Scope and progress

The base Breachling's three requested motions passed independent source/contact
and native-browser review. Its exact reviewed asset is installed and live locally.
The other three variants are not complete: Stalker needs proximal hind-leg
rig confirmation, and Oathbound/Ravager need anatomical bind/weight correction.
Do not describe this checkpoint as a completed roster or production approval.

## Base changes

- Reassigned contaminated torso/neck/shoulder skin to its anatomical chain;
  each upper arm now moves the actual upper-arm surface independently.
- Bite loads and launches forward, reaches with both forelimbs, snaps the jaw
  at extension, lands, and recovers. Uses the approved lunge body curves with
  connected elbow/wrist/knee/ankle origins and a separately retimed jaw snap.
- Claw lifts one arm, sweeps forward/across, follows through, and recovers;
  the other forelimb and both hind limbs support the animal.
- Death progressively releases supports, folds the limbs, contacts the floor,
  and settles onto its side. Tail and limbs remain articulated.
- Baked visible-surface clearance into bite/death only (base maximum 34.59 mm
  and 12.27 mm respectively). This supplements articulated joint/contact poses;
  it is not a replacement for moving the limbs.
- `SwordSlashOutward` uses the same corrected swipe. All eight other clips,
  including the separate `LungeAttack`, locomotion, tail, and spit, retain exact
  original channels. Source positions/normals/UVs/indices, materials, image
  bytes, joint hierarchy, and inverse binds are unchanged. One skin, 24 bones,
  12 clips; no camera, light, floor, or helper exported.

## Exact installed identity

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| breachling-base.glb | 6429716 | 00921227fb9a2c3049363c1a8bda35bb8acf20a73811e3ad86c6256bd91b0cc7 |

## Evidence

External artifact root:
`H:\CodexData\.codex\artifacts\issue-458-body-motion-phase-2`.

- `candidate-v8/audit.json`: protected buffer/channel audit; bounded root-Y
  clearance and connected distal origins checked separately.
- `candidate-v8/base-poses`: eight target poses per requested action.
- `skin/base-pilot-v6`: independent proximal/distal chain deformation source.
- `death-v7/breachling-base.blend`: editable death authoring source.
- `accepted/blender/breachling-base.blend`: exact accepted runtime imported
  back into Blender, with all 12 actions and the original texture packed.
- `browser-review/REVIEW.md`: fresh independent native-browser verdict, exact
  asset identity, wide/close/side views, eight-pose sheets, 1x recordings.

Independent 121-point contact checks found maximum penetration relative to
each clip's starting posed floor of 0.70 mm for bite, 3.582 mm for claw, and
1.85 mm for death. Sampled claw/face triangle intersections were zero.

Browser review used actual H-04 gameplay with private candidate interception:
GTX 1070 / ANGLE D3D11, desktop 1440x900 and mobile-emulated 844x390. All four
playback/scrub runs had zero console, page, or loop errors. Attacks returned to
CombatIdle; death remained terminal through the 7.3-second sample. Separate
LungeAttack sanity check passed. This is not physical-phone acceptance.

## Explicit limitations

The existing material has a color map but no normal, roughness, or AO maps.
The original texture bytes are preserved; this phase did not strip maps.
The source therefore does not satisfy the full-PBR production contract.
Extreme mobile close zoom can also leave parts of the creature under the
existing inspector/HUD. Neither issue is represented as fixed here.

Gameplay damage/reach/collision behavior is not changed by these animation
assets. This checkpoint is owner animation review, not final combat approval.

## Build and live verification

- `yarn typecheck`: pass; `yarn test`: 38 files, 286 tests pass.
- No ESLint configuration/script is present in this app.
- `yarn build`: pass; `dist-pages` is 256,274,719 bytes, under both budgets.
  Existing large-JavaScript-chunk warning remains.
- Live port 4180 returns HTTP 200 and the exact base hash above.
- Fresh non-intercepted H-04 browser smoke: desktop click/Idle/Bite/Claw/Death/
  Lunge/Walk/Run controls pass; mobile viewport loads; zero console/page errors.
  Saved in `browser-live/H-04/result.json`.
- Local owner-review build only. No remote deployment, merge, issue closure,
  or other worktree edit. Other variants remain on their preceding runtime.
