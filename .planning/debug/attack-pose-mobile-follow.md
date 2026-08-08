---
status: awaiting_human_verify
trigger: "Grounded weapon animations only raise the character's arms sideways instead of producing a believable attack, and mobile camera movement does not automatically keep the moving character framed."
created: 2026-08-08
updated: 2026-08-08T00:00:00-05:00
---

## Symptoms

- Expected: Weapon Strike and Siphon Cleave visibly read as attacks with anticipation, torso contribution, weapon arc, contact, and recovery while feet remain planted.
- Actual: the grounded fix leaves the character primarily raising both arms sideways.
- Expected: rendered mid-attack poses are visually inspected rather than accepted from bounds/tests alone.
- Actual: the previous acceptance check proved grounding but missed the poor pose.
- Expected: on mobile the camera automatically follows the player with a comfortable dead zone, while manual pan remains optional look-around control.
- Actual: the player can move out of useful framing unless the user manually pans.
- Errors: none reported.
- Timeline: visible after the latest grounding/material/mobile-camera fix.
- Reproduction: use Weapon Strike or Siphon Cleave, then walk across the training room on a narrow/mobile viewport.

## Current Focus

- hypothesis: confirmed fixes satisfy automated, render, and responsive camera acceptance
- test: owner verifies the two attacks and camera feel in the real workflow/environment
- expecting: Weapon Strike and Siphon Cleave read as asymmetric staged attacks with grounded feet, and follow/look-around feel comfortable on desktop and phone
- next_action: await human verification; archive only after the owner confirms fixed
- reasoning_checkpoint:
    hypothesis: sanitizeAttackClip causes arm-only poses because it removes every spine, neck, and head channel along with grounding channels; updateCamera causes framing drift because it statelessly applies only 30 percent fixed follow and adds an un-decaying manual offset
    confirming_evidence:
      - The current unit test requires only upperarm_r.quaternion to survive a clip containing torso and lower-body channels, directly encoding the arm-only result.
      - The validated GLB has zero root translation, while its builder explicitly authors multi-phase spine/head rotations and binds the weapon to hand_r.
      - updateCamera leaves 70 percent of training-room player displacement uncompensated, clamps correction to 4.2/3.4 world units, and never decays cameraPan.
      - Live production captures at roughly 210 ms and 470 ms show no asymmetric anticipation, contact, or recovery silhouette.
    falsification_test: If retaining spine/neck/head attack channels still produces arm-only phases or breaks ground contact, or if a bounded damped follow target still lets projected player position cross its responsive dead zone after settling, the hypotheses are wrong.
    fix_rationale: Correcting clip intake preserves authored choreography for every attack caller while keeping root/core/lower-body grounding at the same boundary; a single camera target state machine enforces follow, look-ahead, bounds, and manual-offset decay for every viewport.
    blind_spots: Synthetic unit tracks cannot judge pose quality, and camera math cannot prove rendered composition; both require real browser captures at three attack phases and movement checks at desktop plus 390x844.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-08-08T00:01:00-05:00
  checked: regression commit a23278bd and presentation sanitizer
  found: sanitizeAttackClip removes root, armature, pelvis, hips, every spine/neck track, head, and all lower-body tracks; the regression test explicitly requires the sanitized result to contain only upperarm_r.quaternion
  implication: the test codifies the reported arm-only pose and cannot establish believable attack silhouette or weapon-chain contribution

- timestamp: 2026-08-08T00:02:00-05:00
  checked: World3D.updateCamera training-room composition
  found: the target follows only 30 percent of player displacement from the authored center, clamps that correction, and adds cameraPan as an un-decaying persistent offset; there is no viewport dead-zone correction or movement-triggered recenter policy
  implication: narrow viewports can let the player leave useful framing, and manual look-around competes indefinitely with automatic composition

- timestamp: 2026-08-08T00:03:00-05:00
  checked: clarified camera acceptance invariant
  found: automatic soft-follow is required on desktop and mobile, with viewport-responsive dead zones, damping, modest movement look-ahead, room/world bounds, and temporary manual look-around that recenters on movement or explicit center; acceptance must cover desktop and 390x844
  implication: the camera fix belongs in one shared composition state machine with responsive parameters, not a mobile-only conditional

- timestamp: 2026-08-08T00:04:00-05:00
  checked: live production attack captures around 210 ms and 470 ms
  found: Weapon Strike leaves the hero upright but with both arms extended sideways/right and no readable wind-up, weapon arc, contact, or recovery silhouette
  implication: browser-frame acceptance must explicitly capture anticipation, contact, and recovery and require an asymmetric silhouette; stable bounds alone are insufficient

- timestamp: 2026-08-08T00:05:00-05:00
  checked: authored Shadowknight source, validation, and imported GLB tracks
  found: the asset validator proves zero root translation and the builder authors SwordSlash spine_02 rotation plus SiphonCleave pelvis, spine, head, thigh, calf, and foot motion; the sword is rigidly attached to hand_r
  implication: the sanitizer discards intentionally authored attack phases. Root translation can remain suppressed while torso rotation and the hand weapon chain are preserved; lower-body masking can independently enforce grounding

- timestamp: 2026-08-08T16:29:35-05:00
  checked: focused presentation tests after correcting the animation intake boundary
  found: 4 of 4 tests pass; the sanitizer now preserves spine, neck, head, and upper-arm channels while excluding root, pelvis, and lower-body channels
  implication: authored core choreography can reach the mixer without reintroducing the previously observed root/core/lower-body grounding defect

- timestamp: 2026-08-08T16:34:00-05:00
  checked: deterministic local 390x844 Weapon Strike pose at normalized time 0.28 with close zoom
  found: grounding remains stable and torso rotation is visible, but the pose still reads as a sideways extended arm with no clearly readable sword wind-up or arc
  implication: restoring torso/head channels is necessary but insufficient; the authored procedural attack/weapon presentation itself must be investigated before further fixing

- timestamp: 2026-08-08T16:33:00-05:00
  checked: local compact camera follow at the left authored room edge
  found: an initial visible-margin clamp settled at NDC x -0.211 and was too restrictive; using the true room/world center bounds instead settles the player at NDC x -0.118, within the compact dead zone of 0.12
  implication: room bounds must constrain the camera target to world extents without preventing player-centered composition at navigable edges

- timestamp: 2026-08-08T16:36:00-05:00
  checked: full attack-phase writer/reader state flow under the systemic-bug rule
  found: writers are the cache-local deterministic builder's SwordSlash/SiphonCleave keyframes, GLB export, sanitizeAttackClip at createActor intake, and AnimationMixer sampling; readers are every basic/signature/enemy playAnimation caller plus the render camera. The sword has no independent writer and rigidly inherits hand_r. The invariant is stable actor root/contact feet together with three visually distinct asymmetric phases: compact wind-up, readable weapon-leading contact arc, and opposite-side follow-through/recovery. Drift first enters in the authored procedural keys, where both upper arms cross from their down-arm bind signs to raised lateral signs at contact; the sanitizer then amplified it by removing torso channels.
  implication: further per-caller patches would duplicate behavior. The smallest structural fix is to correct both shared authored attack clips so the weapon arm leads a staged arc and the offhand stays compact, while keeping the runtime grounding sanitizer as the single world-contact boundary.

- timestamp: 2026-08-08T16:37:00-05:00
  checked: exported SwordSlash frame-15 validation preview and armature pose axes
  found: the canonical GLB preview itself shows the weapon arm vertically overhead and the offhand fully lateral; upperarm_r negative Z raises the weapon arm, while upperarm_l positive Z raises the offhand, and the current frame-15 keys do both simultaneously
  implication: the remaining sideways/T-like silhouette is authored into the asset and is not a camera-only illusion

- timestamp: 2026-08-08T16:42:00-05:00
  checked: rebuilt asset, round-trip validator, and repository copy
  found: validator reports PASS for all rig/action/root-motion/ground/material gates; cache and repo GLB hashes both equal 078437EB4A9A9C25DACC8BAA0DDC2A9372C8E3FEF1CF1A1C152617E14BD34457
  implication: the runtime consumes the exact validated authored-phase asset and provenance can identify it unambiguously

- timestamp: 2026-08-08T16:45:00-05:00
  checked: actual runtime Weapon Strike and Siphon Cleave timelines at 390x844
  found: Weapon Strike sampled SwordSlash at 0.239, 0.502, and 0.793 seconds before returning to Idle by 835 ms; Siphon sampled 0.219, 0.450, 0.716, and 1.047 seconds before returning to Idle by 1209 ms. Every sample kept minY 0, while close deterministic phase renders showed compact offhand, weapon-leading asymmetric silhouettes, and recovery rather than mirrored lateral arms.
  implication: the clips work through the real playAnimation crossfade/recovery path, not only through paused static inspection

- timestamp: 2026-08-08T16:46:00-05:00
  checked: desktop soft-follow and manual look-around state transitions
  found: at the left room edge player NDC settles to x -0.178 inside desktop dead zone 0.18; three pan inputs create bounded offset (6.576,5.227), it holds through one second, decays to (0.181,0.144), movement reduces a fresh offset to (0.003,0.003), and explicit center sets it to zero
  implication: desktop follow, temporary look-around, movement recenter, and explicit reset all use the shared state machine as required

- timestamp: 2026-08-08T16:47:00-05:00
  checked: full automated and production verification
  found: npm test passes 10 files and 40 tests, npm run typecheck passes, and npm run build passes; only the pre-existing Vite chunk-size advisory remains
  implication: the shared animation/camera changes are regression-covered, type-safe, and production-build compatible

- timestamp: 2026-08-08T16:48:00-05:00
  checked: final 390x844 follow and temporary look-around
  found: center settles at NDC x 0.120, left room edge settles at x -0.117, two pan inputs create bounded offset (-4.384,-3.485), and idle decay reduces it to (-0.130,-0.103) while player returns to x -0.088
  implication: compact follow respects its tighter dead zone and manual look-around is bounded and temporary

## Eliminated

- hypothesis: Preserving authored torso/head channels while continuing to mask root, pelvis, and lower body is sufficient by itself to make Weapon Strike visually believable.
  evidence: A deterministic close browser pose at normalized time 0.28 remains a poorly readable sideways-arm silhouette with no clear weapon wind-up or arc.
  timestamp: 2026-08-08T16:34:00-05:00

## Resolution

- root_cause: sanitizeAttackClip removes the authored torso/head channels needed to read anticipation, contact, and recovery, leaving primarily arms/weapon; updateCamera has no automatic-follow state machine, so it retains most player displacement from an authored room center and treats manual pan as permanent camera target drift.
- fix: Corrected the shared sanitizer to preserve torso/head choreography while anchoring root/pelvis/lower body; rebuilt both authored attack phase timelines with a weapon-leading arm, compact offhand, distinct anticipation/contact/follow-through/recovery, and a more legible still-dull starter blade; added a shared responsive camera follow state with damping, dead zones, look-ahead, room bounds, and temporary manual offset decay/recenter.
- verification: Deterministic browser phase inspection covered anticipation/contact/recovery for SwordSlash and SiphonCleave at 390x844; actual runtime timelines returned both actions to Idle with minY 0 throughout. Desktop player settled at NDC -0.178 inside the 0.18 dead zone and mobile at -0.117 inside 0.12. Manual offsets held temporarily, decayed, recentred on movement, and reset explicitly. Validator PASSed; 40/40 tests, typecheck, and production build pass.
- files_changed: [public/assets/3d/characters/elf-shadowknight/SOURCE.md, public/assets/3d/characters/elf-shadowknight/elf-shadowknight.glb, public/assets/3d/characters/elf-shadowknight/elf-shadowknight-diagnostics.json, public/assets/3d/characters/elf-shadowknight/elf-shadowknight-validation.json, public/assets/3d/characters/elf-shadowknight/elf-shadowknight-preview-swordslash.png, src/game/World3D.ts, src/game/presentation.ts, tests/presentation.test.ts]
