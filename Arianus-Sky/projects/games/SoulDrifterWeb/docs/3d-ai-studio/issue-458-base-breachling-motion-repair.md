# Base Breachling: owner-rejected motion repair

Date: 2026-08-31. Ticket: The-Nexus #458. Preview-only work on
`codex/458-pre-codex-fixes-validation`.

## Current direction

The owner paused broader dungeon integration to repair the **base Breachling
first**. Historical phase-2 review is not approval of the currently rejected
mouth, floating front claws, death, lunge, swipe, or jumping bite. This first
repair pass changes only the base candidate; accepted human animations, weapon
grips, and dungeon layout remain untouched.

The owner subsequently made the integration gate roster-wide: **finish every
mob variant and both path bosses before resuming dungeon integration**. Reuse
base repair techniques only after validating each variant's actual rig/weights.
The two path bosses share the intended attack repertoire, with different skins
and powers. Locate the existing eight-panel attack references in the old ticket
and creature workspace before proposing replacements. Do not assume skinning,
skeleton, topology, or clip compatibility just from the shared moveset.

The bite must be a grounded forward neck/head snap with supporting forelimbs,
not the existing lunge with a jaw animation added. The separate lunge retains
its jumping behavior, but needs articulated loading, forward forelimb reach,
landing, and recovery. Death must lose support and collapse through the joints,
not fold limbs around a mostly rigid rolling torso.

## Real-animal reference, not a new creature design

A large monitor lizard / Komodo dragon is the selected **movement analogue**.
This is a visual and biomechanical interpretation of the fictional creature,
not a species identification. Its neck, predatory head, long tail, claws, and
quadrupedal supports make monitor references useful. Its elevated torso and
unusually long forelimbs differ substantially: do not force a sprawling monitor
rest pose, measured monitor joint angles, or a frog hop onto this rig.

- [Cincinnati Zoo feeding footage](https://www.youtube.com/watch?v=VaHJK6im4EM):
  sampled visible frames at 0:05, 0:30, and 1:05 in the in-app browser. Useful
  for supported posture and neck/head feeding motion. These samples do not
  establish an entire measured footfall or attack sequence.
- [San Diego Zoo Komodo footage](https://www.youtube.com/watch?v=Ue3b5pBypPE):
  sampled external views around 0:15 and 0:20; other portions are keeper/GoPro
  views and unsuitable for whole-body contact measurement.
- [Montuelle et al., 2012](https://pubmed.ncbi.nlm.nih.gov/22899521/): primary
  research on varanid prey capture finds coordinated jaw, neck, and forelimb
  movement that varies with prey. Use that coordination principle, not one
  universal bite profile. The abstract and available paper text were inspected;
  the local PDF download was blocked, so no claim of inspecting its figure
  images or extracting motion data is made.

All-four-paw support is this proposal's contact contract, following the
quadruped-sheet workflow; owner approval of the proposal remains pending. It is
not a claim that every monitor feeding behavior always plants four feet.
Fantastical claw attacks and leaps still require anatomy-appropriate target
poses; zoo footage is reference only, not licensed animation data to redistribute.

## Exact source and fault isolation

Installed source remains `public/assets/3d/characters/breachlings/breachling-base.glb`:
6,429,716 bytes, SHA-256
`00921227fb9a2c3049363c1a8bda35bb8acf20a73811e3ad86c6256bd91b0cc7`.

The real rig has one skin, 24 joints, and 12 clips, with independent front/hind
limbs, pelvis/spine/chest, neck/head/jaw, and a five-joint tail. There are no
individual finger/claw bones. Geometry, UVs, textures, bind hierarchy, and source
files are preserved in this pass. No new paid generation has been requested.

- Raw-source and runtime comparison across 77 poses found matching local bone
  transforms and skinned shape after the runtime's global placement was removed.
  Reset overlays return to source. The studio did not create the jaw/stance faults.
- The authored closed-jaw pose exposes an abrupt skin-weight boundary: sampled
  edge stretch reached 3.888x in Idle and 4.115x in CombatIdle, while the earlier
  open bind shape remained intact. Coincident UV-seam vertices stayed coincident;
  this is not evidence of a newly corrupted export or split UV seam.
- CombatIdle front paw skin starts about 104mm / 134mm above its reference floor.
  Correct actual surfaces with articulated limbs; do not lower the entire model
  and sink its hind feet.
- Bite and Lunge share every non-jaw rotational channel. The bite's whole mesh
  becomes airborne by about 172mm. It is the wrong action, not merely bad timing.
- Separate Lunge stretches a forearm segment by about 24% and penetrates its
  reference floor by about 61mm. Death's axial motion is root-roll dominated.
  Swipe has some torso rotation, but its support and weight-transfer quality
  remain rejected; do not inaccurately describe its torso as literally frozen.

## Bounded candidates and acceptance gates

All candidates are external artifacts, **not installed game assets**.

Jaw candidate v1:
`breachling-base-jaw-candidate-v1.glb`, SHA-256
`f18fb3981e58df8682f6083e2a1249101bc210115860c76b77783de2e587f232`.
Only skin joint indices/weights change. Independent decoded-accessor comparison
confirms positions/normals/UVs/indices, all rest/inverse-bind data, materials/images,
and all 12 clip channels are exact. Dense checks across 373 poses/all 12 clips
found maximum sampled jaw-edge stretch 1.958x, no edges over 2x, and no coincident
seam separation. Front-limb perturbations leave protected head skin unchanged;
this verifies retained isolation rather than a new forelimb fix. Head motion
carries the rigid mandible correctly. Paired front/side closed/open
renders and an eight-state jaw sweep pass the bounded rig review. This does not
approve the existing attack motion, every possible collision, or a live preview.

Stance candidate v4 (`base-idle-stance-candidate-v4.glb`), SHA-256
`60f2649dfe8c95c94948ac46912a18cf56336ab6bbab70e1a2344ba8a1f7c164`,
passes the bounded static-planning gate. Only 24 limb rotation tracks change:
12 limb bones each in Idle and CombatIdle. Geometry/weights/rest/binds, other
tracks, and all other ten clips remain exact. Dense export-reloaded checks
(241 samples per clip) find a minimum whole-mesh clearance of +0.906mm and no
sampled floor penetration or reach clamps. Maximum CombatIdle elbow angle is
164.47 degrees. The largest sampled contact-surface XZ drift is 3.249mm in
CombatIdle / 5.946mm in Idle: this is not a claim of perfectly locked feet.
Fresh fixed-floor front/side solid and textured renders pass bounded review.
Only static CombatIdle pose planning is released, not final runtime acceptance.

Rejected drafts exposed two pipeline hazards worth retaining:

- Candidate v2's end-bone-weight contact mask missed mixed-weight claw vertices;
  whole-mesh checks exposed 6.7mm / 15.6mm penetration. Use actual full surfaces.
- Candidate v3 carried previous solved limb transforms into later samples:
  Three's mixer may skip rewriting an unchanged constant source track after
  manual IK mutation. Explicitly restore immutable original TRS values before
  each sample. V4 reduces the measured CombatIdle right-forelimb endpoint jump
  from 22.28mm to 0.260mm (source 0.258mm); unchanged tail motion still accounts
  for the largest whole-mesh endpoint difference.

An initial renderer also included a hidden imported bone widget in its bounds,
putting the diagnostic floor at -1 and making the body appear airborne. Those
images are rejected evidence. The corrected renderer derives its one common
floor/camera from armature-bound creature meshes, not helpers; it does not lower
the candidate or follow each pose with a moving floor.

The reviewed combined candidate is
`breachling-base-stance-v4-jaw-v1-combined.glb`, SHA-256
`011c7ead2ab1ff14c470619ef6cda397ea1560e053b3e5c20f429c480daa8fd3`.
Three-way comparison confirms only jaw weights differ from stance v4 and only
the 24 allowed limb tracks differ from jaw v1. It retains all 12 source actions;
combining safe weights and stance does not repair the remaining bad attacks.

### Short grounded bite: static proposal v2, awaiting owner approval

`base-grounded-bite-static-proposal-v2.png` contains exactly eight full-body,
fixed-camera/floor target poses: ready -> load -> brace/open -> head snap -> bite
contact -> brake -> recover -> ready. These are proposed phases/times, not
fabricated source-video timestamps. The actual source mesh and skeleton are
rendered in solid shading, not generated concept art.

The first proposal was rejected: its muzzle moved mostly upward (178mm up /
17mm forward from load to contact). V2 retracts the existing neck chain, then
returns toward its neutral reach while counter-rotating the head. Independent
actual-GLB replay measures 24mm forward / 6mm up at snap and 29mm forward / 4mm
up at contact. This is deliberately a **short bite**, not a long reach or lunge.
All bone-local translations/scales stay unchanged, with zero root movement.
All eight poses reproduce all 36,387 vertices exactly in independent replay;
whole-mesh clearance remains at least +0.956mm, contact-patch XZ flex at most
0.698mm, and jaw-edge stretch below 1.922x with no coincident seam openings.
Fresh eight-panel and enlarged front/side load/snap/contact views pass bounded
numeric and visual review for owner presentation only.

The quadruped-animation-sheets workflow requires per-asset/action owner approval
before final animation authoring. No final BiteAttack curves have been created,
installed, or accepted. The static sheet does not prove interpolation, real-time
fluidity, collision safety at every frame, hit timing, or native preview quality.

## Roster-wide follow-up and recovered boss references

The review roster contains four Breachlings (base, Stalker, Oathbound, Ravager)
and two bosses: Wayfarer's Cinderbound Warden and Oathbreaker's Greater
Cinderbound Warden. Oathbound is a Breachling variant, not the second boss path.

Read-only discovery located the approved GPT Warden design/mechanics board,
its cleaned mesh input, and the selected Midjourney Greater Warden image in the
old #458 workspace. No genuine approved eight-phase boss attack sheet was
located in the bounded workspace/ticket/original-task search. The board has
four mechanic illustrations, not eight sequential poses; do not relabel it.
Preserve Cinder-Sweep, Ash-Call, Soul-Tax, and Furnace Shutdown as distinct
mechanics. PalmFire is separately owner-requested; Soul-Tax is not fire, and
Furnace Shutdown vulnerability is not DeathCollapse. This repair does not
silently add missing mechanics to gameplay.

Both Warden rigs have 18 joints and 13 clips with matching timing and authored
rest-relative rotation deltas. Their meshes, proportions, bind axes, and skinning
differ: raw absolute rotations differ by up to 15.83 degrees. Reuse shared
choreography relative to each rest basis, not by copying absolute quaternion
channels; verify each actual model and all damage stages separately.

Neither `hand_R` influences skin. The approved right side is an integrated blade
bound to the forearm chain, so this fact alone is not a broken-hand diagnosis.
Use the actual articulated blade controls. The left palm is weighted, but neither
rig has finger bones; do not invent independent finger controls. Preserve the
30/60/90-percent breakoff sections, distinct approved designs, and path power
differences. Full reference paths, hashes, provenance, action mapping, and bounded
search coverage are in the external `boss-reference-map.md`.

All remaining base actions, the other variants, and both bosses still require
repair/review. Dungeon integration remains paused until the entire roster passes.

## Completed inspection fix and verification

Commit `feb014b3` changes only explicit action selection/Play/Restart in the older
dungeon creature inspector to use immediate playback. Previously Death-to-Bite
crossfading could pull the transitioning corpse through the floor. Timeline
scrubbing and gameplay transitions are unchanged; Motion Studio already used
immediate selection. This does not repair source animation curves.

- `yarn typecheck`: pass.
- `yarn test --maxWorkers=4`: 45 files / 348 tests pass, including four new
  explicit-inspection regression cases.
- No ESLint configuration or script is present in this app.
- `yarn build` and `yarn verify:release`: pass for `feb014b3`; 24 review assets
  per release target verified; `dist-pages` 377,197,210 bytes. Existing large
  JavaScript chunk warning remains.
- Fresh source/candidate checks use actual GLBs and offline Blender rendering.
  The owner localhost tab was unavailable to this browser session's policy;
  no alternate browser or host bypass was attempted. Native preview acceptance
  of these candidates is therefore **not claimed**.
- No asset install, remote push/merge/deployment, paid generation, or issue closure.

## Reproducible local evidence

Artifact root: `H:/CodexData/.codex/artifacts/issue-458-base-repair-audit-20260831/`.

`READ-ONLY-BODY-AUDIT.md`, `base-motion-audit.json`, `runtime-compare.json`,
`jaw-source-audit.json`, `jaw-candidate-dense-audit.json`, and
`candidate-protected-data.mjs` record the measured faults and protected-data gates.
`jaw-paired-render/` and `jaw-sweep-render/` hold fresh rig evidence.
`idle-stance-v4-export-audit.json`, `reviewer-loop-audit.mjs`, and
`stance-paired-v4-corrected-solid/` / `stance-paired-v4-corrected-textured/`
record the corrected stance checks; earlier renderer directories are invalid.
`combined-candidate-audit.json` records the three-way protected-data comparison.
`BITE-STATIC-PROPOSAL-V2-REPORT.md`, `bite-static-previs-v2.json`,
`base-grounded-bite-static-proposal-v2.png`, and `bite-static-side-v2/` preserve
the proposed poses, exact identities, independent replay, and enlarged views.
`boss-reference-map.md` records both bosses and the recovered design references.
`baseline-side/` and `baseline-bite-sheet.png` depict the **rejected existing**
motions, not improvements. Preserve original editable sources under
`issue-458-body-motion-phase-2/` unchanged.
