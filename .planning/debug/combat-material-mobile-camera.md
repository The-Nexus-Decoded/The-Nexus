---
status: resolved
trigger: "Attack animation moves the whole character badly, the avatar renders as one red color instead of distinct body and equipment materials, and mobile camera framing cannot reach the room sides."
created: 2026-08-08
updated: 2026-08-08T17:00:00-05:00
---

## Symptoms

- Expected: attacks articulate the weapon and body with believable planted feet and no whole-character slide.
- Actual: triggering an attack moves the character's whole body unnaturally.
- Expected: skin, shirt, leggings, armor, and weapon retain separate readable materials and colors.
- Actual: the character reads as one strange red object.
- Expected: mobile and narrow screens can pan or reframe far enough to see both sides of the room.
- Actual: room sides remain outside the reachable camera view.
- Errors: none reported.
- Timeline: present in the current beta and described as an ongoing regression.
- Reproduction: play the current Shadowknight, trigger attack skills, inspect the avatar, then use a phone or narrow viewport and attempt to view the room edges.

## Current Focus

- hypothesis: Confirmed root causes are fixed at their shared boundaries.
- test: Completed focused/full automated checks plus live 390 by 844 material, combat, and room-edge camera verification.
- expecting: Weapon Strike and Siphon Cleave keep the hero upright and planted while arms/weapon articulate, authored material roles remain distinct, and mobile arrows pan to both room sides with center reset.
- next_action: Resolved; optional owner review of final animation artistry and physical-phone ergonomics.
- reasoning_checkpoint:
    hypothesis: createActor's uniform player tint/emissive rewrite causes palette collapse; unnormalized attack clips permit root/armature/hips translation such as SiphonCleave pelvis motion; and fixed follow-only camera targeting prevents narrow-screen users from reaching room edges.
    confirming_evidence:
      - The GLB has 11 semantically distinct named materials, while createActor overwrites color and emissive on every player mesh material.
      - SiphonCleave contains 36-key pelvis.position motion with 0.07055 aggregate component delta, and playAnimation consumes the clip unchanged.
      - Camera input contains rotate/zoom only and updateCamera has fixed 30 percent follow with 4.2/3.4 clamps independent of viewport.
    falsification_test: If preserving player material properties, stripping attack root/armature/hips translation tracks, and adding bounded pan controls do not respectively retain distinct colors, remove translated attack tracks, and move the camera target to both room sides under unit/runtime inspection, this hypothesis is wrong.
    fix_rationale: Enforcing each invariant once at its shared intake/control boundary prevents every player mesh, attack caller, and viewport from recreating the same defects.
    blind_spots: Automated tests cannot judge final animation aesthetics or prove finger ergonomics on every physical phone; parent/user visual verification remains required after self-verification.
- tdd_checkpoint:

## Evidence

- timestamp: 2026-08-08T16:05:00-05:00
  checked: Regression test before implementation
  found: tests/presentation.test.ts failed because the shared presentation boundary did not exist, confirming the new tests were red before the fix.
  implication: Subsequent green results will exercise newly implemented material, animation, and camera policies rather than pre-existing behavior.

- timestamp: 2026-08-08T16:15:00-05:00
  checked: Focused presentation regression suite and TypeScript compiler after integration
  found: Initial green attempt caught prefixed ElfShadowknight_Armature.position escaping exact-name filtering; the semantic matcher was corrected. Final focused result is 4/4 tests passing and npm run typecheck passes.
  implication: The helper contracts work for authored material preservation, exact and prefixed animation-root targets, screen-relative pan transforms, and training-room bounds; integration is type-safe.

- timestamp: 2026-08-08T16:30:00-05:00
  checked: Live runtime at 390 by 844 after full tests and production build
  found: All nine camera controls are visible in a 110 by 110 pixel cluster, the 380 by 748 canvas has zero page overflow, and repeated right-pan input visibly reaches the far authored room wall. The live hero also shows distinct pale skin, silver hair, dark cloth, brown leather, and metal weapon colors.
  implication: The material and mobile camera hypotheses are confirmed in the rendered application.

- timestamp: 2026-08-08T16:32:00-05:00
  checked: Live Weapon Strike and Siphon Cleave captures after translation-only attack sanitization
  found: Outer post-animation bounds return to minY 0 and maxY 2.16, but the mid-Siphon capture still shows an extreme curved whole-body bend while pelvis and leg quaternion tracks remain active.
  implication: Translation filtering fixes sliding but not planted-foot pose integrity; root/pelvis/lower-body rotations must also be excluded at attack intake.

- timestamp: 2026-08-08T16:50:00-05:00
  checked: Final masked attack intake and repeat live mobile captures
  found: Attack intake now anchors root, armature, pelvis/hips, legs/feet, spine, neck, and head while retaining clavicle/arm/hand/weapon tracks. At 390 by 844 both Siphon Cleave and Weapon Strike remained upright over the contact ring, articulated the weapon arms, returned to Idle, and reported post-animation bounds minY 0, maxY 2.16, height 2.16.
  implication: The runtime no longer applies authored whole-body displacement/bending to attack actions; the remaining motion is upper-limb weapon articulation.

- timestamp: 2026-08-08T16:52:00-05:00
  checked: Final automated verification
  found: npm test passes 10 files and 38 tests; npm run build passes TypeScript and the Vite production build. The only build output is the pre-existing advisory that the main bundle exceeds 500 kB.
  implication: The fixes are regression-covered and production-build compatible; no new compiler, test, or build failures were introduced.

- timestamp: 2026-08-08T00:00:00-05:00
  checked: Live repository identity and worktree state
  found: Branch is codex/souldrifter-browser at 2025f85f; only .planning/ is untracked.
  implication: Investigation can proceed without touching or reverting tracked user changes; the debug session itself accounts for the untracked planning path.

- timestamp: 2026-08-08T00:15:00-05:00
  checked: createActor material traversal and source elf-shadowknight GLB material inventory
  found: The GLB has distinct cloth, skin, leather, iron, eye, ember, and silver-hair colors across 11 named materials, but createActor clones every player material, lerps every base color toward the same class tint, brightens all of them, and replaces every emissive channel with a derivative of that tinted color.
  implication: The shared actor loader is destroying authored material intent; production hero materials must be cloned for instance isolation without global recoloring or emissive replacement.

- timestamp: 2026-08-08T00:15:00-05:00
  checked: Imported animation metadata and runtime playAnimation path
  found: The asset reports in-place root.position, but every clip includes the full skeleton track set and playAnimation uses each imported clip unchanged; the SwordSlash proof visibly carries an exaggerated whole-body/lower-body pose despite the planted-feet requirement.
  implication: Root translation alone is not the complete invariant; combat clips need runtime intake normalization that excludes actor-root and lower-body tracks while retaining upper-body weapon articulation.

- timestamp: 2026-08-08T00:15:00-05:00
  checked: Camera input, updateCamera, and resize paths
  found: Input exposes rotate and zoom only. The training camera target follows 30 percent of player displacement with fixed x/z clamps of 4.2/3.4, while resize shrinks horizontal orthographic span directly with portrait aspect.
  implication: Mobile cannot intentionally pan and receives less horizontal coverage with the same desktop follow limits; camera pan and responsive projection must share viewport-aware bounds.

- timestamp: 2026-08-08T15:44:01-05:00
  checked: Additional reproduction and expected animation invariant supplied during investigation
  found: Attack/whole-body movement reproduces on desktop too and is not mobile-specific. The expected shared invariant is stable world/model root Y with root, armature, and hips translation tracks sanitized for attack clips so feet remain planted. Only the camera-framing symptom is mobile-specific.
  implication: Diagnose attack grounding at the shared animation boundary across desktop and mobile; do not couple that fix to responsive camera behavior.

- timestamp: 2026-08-08T16:00:00-05:00
  checked: Exact SwordSlash and SiphonCleave root/pelvis/lower-body track values against the loaded skeleton bind pose
  found: SwordSlash root and pelvis translations are constant, while SiphonCleave animates pelvis.position across 36 keys with a measured 0.07055 component delta; both are accepted unchanged by the runtime. Root, pelvis, thighs, calves, and feet all have named transform tracks suitable for deterministic intake filtering.
  implication: The sanitizer should be semantic and clip-agnostic: for every attack clip, discard translation tracks targeting root, armature, pelvis, or hips while leaving weapon and body rotation articulation intact.

## Eliminated

- hypothesis: Removing only root/armature/pelvis/hips position tracks is sufficient to eliminate the visible whole-body attack defect.
  evidence: A repeatable 390 by 844 live Siphon capture after that change still showed an extreme curved whole-body pose; the clip retains pelvis quaternion delta 0.64037 and thigh quaternion deltas above 2.1.
  timestamp: 2026-08-08T16:32:00-05:00

## Resolution

- root_cause: createActor globally recolored and replaced emissive channels on every authored player material; playAnimation consumed full imported attack clips whose pelvis/lower-body/core transforms bent or translated the whole hero; and the training camera exposed rotate/zoom only while using fixed desktop follow clamps with no user-controlled pan.
- fix: Added shared presentation helpers; player materials are cloned without palette/emissive rewrites, attack clips are masked to upper-limb/weapon articulation with the root/core/lower body anchored, and the training camera has bounded screen-relative four-way pan plus center reset in the responsive camera control cluster.
- verification: Focused regression was red before implementation and now passes 4/4. Full suite passes 38/38, typecheck and production build pass, 390 by 844 runtime has zero horizontal overflow and reaches the far room wall, material roles are visibly distinct, and live basic/signature captures remain grounded with stable 0 to 2.16 world bounds.
- files_changed: [src/game/presentation.ts, src/game/World3D.ts, index.html, src/styles.css, tests/presentation.test.ts]
