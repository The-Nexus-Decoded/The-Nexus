# Issue 458: jaw/head repair, phase 1

Date: 2026-08-30. Baseline: `c943efb4`.

## Scope and explicit limits

This is a localized jaw/head-skin correction for all four Breachlings, not
completion of the requested attack/death overhaul. All existing body animation
channels and durations are preserved. New experimental body clips were rejected
and are **not** installed. The approved lunge's animation channels remain exact.

The review found mouth/head vertices incorrectly weighted to forelimbs. Moving
an arm could pull the Ravager's mouth open despite an identical head-relative
jaw transform. Neck/back-to-forelimb contamination also prevents a convincing
grounded death. That wider repair remains outstanding; do not call the rigs or
the bite/claw/death body motions fully corrected.

## Implemented

- Individually fitted jaw hinges, mandibular surface/tooth weights, and a
  geodesic head/neck ownership mask that removes forelimb influence from the
  isolated mouth/head region.
- Jaw closure at rest and opening/snap/recovery during the existing bite.
- Jaw rotation curves changed only in `Idle`, `CombatIdle`, `Walk`, `Run`,
  `BiteAttack`, `ClawAttack`, and `SwordSlashOutward`.
- All 857 other animation channels per asset remain byte-identical to the
  hinge-corrected source. `Death`, `LungeAttack`, `RecieveHit`, `SpitAttack`,
  and `TailWhip` have no curve changes.
- Positions, normals, UVs, and material/texture bytes remain exact. Only base
  triangles 905–907 were removed: confirmed malformed mouth-spanning triangles.
- Each export retains one skin, 24 bones, and 12 clips. No helper, camera,
  ground, or light was exported. Stalker's pre-existing mouth strands remain.

## Exact runtime identities

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| breachling-base.glb | 5628476 | f57eaaec84c22f3c673ee7a9b6d03f12768f81688609cafb73b1a5d684320d70 |
| breachling-stalker.glb | 5974384 | 1f61df8716b60dd376959dbff1295c708f770d3601cf9781263d1996f808a641 |
| breachling-ravager.glb | 5759384 | cd8fa4f5daf6f789e80322fad2ed7df15cb7b6dcea0dec19c0d869478f08e22c |
| oathbound-breachling.glb | 6340124 | 077e130cd8a9fa0a755aed1c1efe1f268f8ef08470762adead1b7bf0e2948939 |

## Local source and evidence

Artifacts: `H:\CodexData\.codex\artifacts\issue-458-feedback-corrections`.

- `phase-1-jaw`: exact runtime candidates, strict protected-buffer/channel
  audits, eight-pose jaw sheets, and texture-packed editable `blender/*.blend`.
- `jaw-repair/handoff-v6`: source correction receipt, weights/hinge reports,
  source Blender files, and per-variant hashes.
- `jaw-repair/v6-jawphase-evidence`: all four variants, eight bite and eight claw
  phases. Perturbing forelimb joints by 0.6 radians moves the isolated head
  region by 0.0 in head-local space in these tests.
- `merge_jaw_phase.py` and `audit_final.py`: integration and allowed-delta audit.
- `verify_jaw_phase.py`: native Chromium desktop and mobile-viewport smoke test;
  optional candidate interception does not alter the public preview.

Independent review passed the limited jaw/skull repair and playback scope.
It explicitly did not approve the existing body/death animation quality.

## Verification of this phase

- `yarn typecheck`: pass. `yarn test`: 38 files, 286 tests pass.
- No ESLint configuration/script is present in this app.
- `yarn build`: pass; local `dist-pages` is 255,473,479 bytes, below the
  475 MB preferred and 500 MB hard ceilings. Existing large-chunk warning remains.
- Native Chromium with D3D11: live port 4180, H-04 and H-06, desktop creature
  click/Idle/Bite/Claw/Lunge controls pass without console or page errors.
- Mobile-sized Chromium (844x390): those two rooms load without errors. This
  is a viewport smoke test, not physical-phone GPU or full touch acceptance.
- All four live GLB requests return HTTP 200 and exact hashes listed above.
- No source-application/state-machine/UI files changed; local preview only.
  No merge, remote deployment, or issue closure.

## Next phase requires owner approval

Repaint the broader neck/back/shoulder/limb boundaries, prove independent joint
deformation in extreme poses, then finish the whole-body bite, forward cross
swipe, and progressive grounded death. The `body-v11` experiments have connected
support chains and useful trajectories, but are not production-ready skin or
target-contact proof. Preserve approved lunge, tail, walking, and running work.

Do not try to correct bad skinning with larger root rotations, lower root
offsets, or disconnected planted-paw bones. Prove both deformation and actual
floor/attack contacts in close front/side and gameplay views before delivery.
