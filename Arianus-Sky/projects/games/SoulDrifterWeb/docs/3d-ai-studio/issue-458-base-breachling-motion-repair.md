# Base Breachling: owner-rejected motion repair

Date: 2026-08-31. Ticket: The-Nexus #458. Preview-only work on
`codex/458-pre-codex-fixes-validation`.

## Current direction

**The owner approved revised static neutral V3 ("yeah better"):** the
forepaws must support the chest farther forward, the hind supports must move
farther back, and the body must sit lower in a longer, comfortable all-fours
stance. Old stance-v4 grounding checks remain useful measurements, but do not
make its upright/cramped silhouette acceptable. Build the five attack pose
studies on this exact approved neutral. Approval is for the static foundation,
not new Idle motion or any attack. A static posture comparison is not an eight-pose
action sheet. Preserve the old candidates as evidence rather than installing them.

Approved static foundation: `neutral-stance-proposal/neutral-candidate-v3.json`,
SHA-256 `9e35a85e1036ab0b8feba0b1eaee299fcd2d0c353a918924303434716939a998`.
Body is 100mm lower; actual weighted front contact centers move about 118/138mm
forward and both hind contact centers about 120mm back. Selected-point target
offsets are not the same as actual skin-contact movement. All bone lengths,
source geometry, skin weights, materials, and source clips remain unchanged.
V1's visible hind-knee pinch and V2's asymmetric optimizer result were rejected.
V3 uses mirrored hind-pole/paw-angle changes and comparable hind joint angles
(130.57/126.42 degrees), with no new weights or mesh reshaping. Its six fixed
views pass independent **static visual presentation** review: the knee's rounded
volume is restored while the lower/longer posture is retained. CPU/Blender skin
parity is within 0.000001m and the whole-mesh floor clearance is positive. This
is the owner-approved neutral pose, not approved Idle, attack, transition, or runtime motion.

The owner also requires DRY reuse across models, scripts, tasks, code, and
processes. Follow the canonical [DRY reuse policy](README.md#dry-reuse-policy).
Shared tools and immutable assets do not require duplicate implementations;
model-specific mutable calibration and visual acceptance remain independent.

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
previously passed the bounded static-planning gate; its posture is now owner
rejected as too upright and cramped. Only 24 limb rotation tracks change:
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

### Short grounded bite: historical static proposal v2, now superseded

The owner accepted this short-bite direction, then required actual contact in
the adjacent square and rejected the neutral stance. Rebuild the attack review
around the revised neutral and real target. Do not promote this short static
proposal to a completed adjacent-square attack.

`base-grounded-bite-static-proposal-v2.png` contains exactly eight full-body,
fixed-camera/floor target poses: ready -> load -> brace/open -> head snap -> bite
contact -> brake -> recover -> ready. These are proposed phases/times, not
fabricated source-video timestamps. The actual source mesh and skeleton are
rendered in solid shading, not generated concept art.

The first proposal was rejected: its muzzle moved mostly upward (178mm up /
17mm forward from load to contact). V2 retracts the existing neck chain, then
returns toward its neutral reach while counter-rotating the head. Independent
transform replay measured 24mm forward / 6mm up at snap and 29mm forward / 4mm
up at contact. A later indexed-geometry audit found that the old mouth markers
22510/22511 are orphan vertices: no rendered triangle references them. Those
travel numbers are historical transform diagnostics, **not visible muzzle or
tooth-contact proof**. The new review uses indexed upper fang 22577 instead.
This historical study was a short bite, not a long reach or lunge.
All bone-local translations/scales stay unchanged, with zero root movement.
All eight poses reproduce all 36,387 vertices exactly in independent replay;
whole-mesh clearance remains at least +0.956mm, contact-patch XZ flex at most
0.698mm, and jaw-edge stretch below 1.922x with no coincident seam openings.
Fresh eight-panel and enlarged front/side load/snap/contact views pass bounded
numeric and visual review for owner presentation only.

The quadruped-animation-sheets workflow requires per-asset/action owner approval
before final animation authoring. No final replacement BiteAttack curves have been created,
installed, or accepted. The static sheet does not prove interpolation, real-time
fluidity, collision safety at every frame, hit timing, or native preview quality.

## Adjacent-square contact and the next review phase

The owner wants all attacks reviewed together. Bite, claw, lunge, and tail must
reach the adversary in the next square in front; spit is ranged and can cross
multiple squares. Tail contact requires a body turn initiated through pelvis and
spine plus articulated tail motion, not a tail bend behind a stationary body.
Root motion may support genuine steps, loading, and recovery; never stretch
bones or slide planted paws to manufacture range.

Read-only measurement confirms the V2 navigation cell is 1.75m. The approved
Human Foundation idle mesh, facing the attacker at the adjacent center, is the
contact reference. Its actual skin is not the 0.35m navigation radius. From the
initial cell center, a short all-four-paws-fixed bite alone cannot bridge the
gap to the visible leg surface. The current tooth-contact study needs about
0.697m of articulated approach before the short bite. Stepping/weight-transfer
breakdowns are needed before a grounded head/neck bite. A snout touching skin
is not proof of tooth/jaw contact. Root containment is not whole-mesh containment.

Earlier external claw, lunge, tail, and stepping-bite experiments used the
now-rejected neutral foundation. Keep them separate from the current
`approved-neutral-attacks/` studies below. None is a final clip or approved
animation. Versioned JSON hashes must match render manifests; static poses do
not establish interpolated foot locks or motion quality.

### Latest owner action review

The owner approved the claw V2 and tail-whip V2 pose directions; preserve those
exact candidates. This is pose approval, not final-motion or runtime acceptance.
Bite V5 was not discussed in that response and remains pending owner approval.

Lunge V8 needs a clearer airborne attack: launch off the ground, jump toward the
adjacent adversary, strike with both claws, then retreat. Keep articulated hind
push, actual suspension, two-claw contact, landing, and a distinct return.

Spit V3 is rejected as too static. Show a visible draw-back, forward head/neck
thrust and jaw release, then recovery; the ranged target is **three 1.75m cells
away (5.25m center-to-center)**. The two-cell V3 review below is historical.
Keep support paws grounded and do not fake head motion with a rigid whole-mesh
slide or extreme neck deformation. No final clip or projectile mechanic is
approved by this feedback.

### Revised lunge and spit pose studies

The current replacements are **Lunge V10** and **Spit V8**. Both use the unchanged
combined source GLB (`011c7ead...aa8fd3`) and approved neutral V3. They are external
eight-key studies, not installed animation clips. Claw V2 and Tail V2 retain
their exact approved payload hashes; Bite V5 remains owner-pose-pending.

- `lunge/lunge-static-draft-v10.json`, SHA256
  `98b7c6a0233b41798a03aa1f6248e7256fe2305ca25fe5735c2bbf9dc8c1469d`:
  haunch load, articulated hind push, airborne approach, **both claws striking
  while airborne**, four-paw landing, backward bound, exact neutral return.
  Whole visible mesh clearance is 321mm during approach and 351mm at contact.
  Actual indexed left/right claws reach the adjacent human skin within
  0.993/0.851mm, with no observed creature/target triangle-edge crossings.
  The skull remains 81mm behind the target front surface. The retreat key is
  an airborne backward bound, not a grounded sliding reset.
- `spit/spit-approved-neutral-poses-v8.json`, SHA256
  `58e59b22fa61bf2dd47d39848f909e7a1d784ddd6489880b126d03061c611d2f`:
  draw back, inhale/load, coordinated head/neck extension and jaw opening,
  forward release, follow-through, recoil and exact neutral return. From load
  to release, the head advances 79.2mm, the visible fang 71.7mm, and the root
  65mm; this is supported weight transfer plus articulation, not 79mm of
  isolated neck motion. The mouth reaches Z=0.8741m near its cell edge at
  Z=0.875m. The offline aim ray reaches the real human at a **three-cell,
  5.25m center distance**; it is not a shipped projectile or damage event.

Spit V7 was rejected during independent review: an actual grounded rear-left
skin point slid 13.76mm while the changing lowest-band centroid appeared fixed.
The shared pose solver now offers an explicit fixed-visible-point contact mode,
capturing the same indexed neutral surface points before posing. Existing
default behavior is unchanged. Spit V8's independent replay measures at most
0.138mm horizontal drift for persistent support points and 0.572mm across the
broader union of near-ground points. The original centroid-only V8 audit is
retained as superseded evidence; `spit-surface-audit-v8-fixed-anchor.json`
replays the new contact contract rather than weakening its thresholds.

Both studies replay all 36,387 stored vertices exactly, preserve local scale
and non-root translations, and return to exact approved neutral endpoints.
The reusable `review-bundle-integrity-owner-revision-v2.json` verifies the
current five-action set: 40 ordered keys and 80 decoded full-body PNGs.
Fresh independent wide/close review passed both exact studies for owner pose
presentation; `lunge/independent-lunge-v10-review.md` and
`spit/independent-spit-v8-review.md` retain the evidence and limits separately
from this mechanical gate. Neither grants final-motion or runtime approval.
The right lunge shoulder still has diagnostic edge strain up to 2.400x bind;
this is disclosed, not labeled a universal anatomical pass. Continuous launch,
landing, recoil, support transitions, swept contact and normal/slow playback
remain required after owner pose approval. No source GLB, runtime/public asset,
human animation, weapon grip, UI, or dungeon file changed in this revision.

This checkpoint reran `yarn typecheck` and the full
`yarn test --maxWorkers=4` suite: **45 files / 348 tests pass**. No ESLint
configuration/script exists. Shared authoring helpers pass Node syntax checks;
the offline renderer passes Python syntax parsing. Build/release results below
belong to the earlier code fix, not this external pose/documentation revision.

### Five-action pose bundle before that feedback

All five prior studies restore exact approved-neutral local transforms at
panels 1 and 8. Each contains eight ordered, actual-rig poses at fixed camera,
scale, and floor. The reusable `verify-review-bundle.mjs` checks their explicit
input map: 40 keys, matching source/neutral/render hashes, ordered times, and
80 decoded nonblank full-body PNGs. That integrity pass is not anatomical or
animation acceptance. Independent wide/close review receipts remain separate.

| Action | Prior pose payload in its action folder | Contact and motion intent |
| --- | --- | --- |
| Bite | `bite-static-proposal-v5.json` | Grounded approach; four supports during neck/head/jaw snap; indexed upper fang 22577 reaches actual human skin within 0.992mm. |
| Claw | `claw-approved-neutral-poses-v2.json` | Three planted paws during the right-forelimb strike; actual claw contact within 0.879mm; shorter recovery step. |
| Lunge | `lunge-static-draft-v8.json` | Haunch load, hind push, flight, two-claw contact within 1mm, front landing, recovery hop; no limb scaling. |
| Tail | `tail-approved-neutral-poses-v2.json` | Turning steps, pelvis/spine counterturn and five-joint tail wave; indexed tail tip reaches the front neighboring target within 3mm; lower turning-step lift. |
| Spit | `spit-approved-neutral-poses-v3.json` | Four supports, restrained neck loading and jaw release; target is two 1.75m cells away. Green line is an offline aim guide, not a game projectile. |

Bite's 6.30-second proposed review sequence includes approach and reset. Its
brace-to-contact snap is 0.31 seconds; do not interpret the review sequence as
a six-second attack cooldown. Its 318 planning samples pass bounded support,
segment-length and skin checks, but are not a baked clip. Turning/approach
footfalls, continuous transitions, impact timing, and normal/slow-speed review
still require animation authoring after per-action owner pose approval.

All five selected versions pass independent wide/close **static presentation**
review. The per-action receipts are linked from the external
`approved-neutral-attacks/REVIEW-INDEX.md`. Bite's broader 3mm support band reaches
6.447mm drift during the retreat planning samples; the narrower band's 0.927mm
result is not a whole-paw lock claim. Tail V2 relieves the over-compressed lifted
knee, but a small angular inner crease remains in close views. Explicit turning
footfalls and review of intermediate deformation are still required; neither
the numerical checks nor these static passes establish finished motion.

These are non-shipping experiments, not five separate production pipelines.
The selected mechanisms must be consolidated into shared tools with explicit
model/action profiles before promotion, preserving these immutable receipts.

After this attack pass, add **Combat Review** to the existing studio, not a
separate replacement tool. Independently select attacker and defender for human
versus mob, mob versus human, and mob versus mob review. Preserve current solo
review. Show controls appropriate to each rig and action. Review attacks,
defense, arrows, spells, and command-triggered actions on a shared timeline;
expose spacing, facing, impact timing/location/direction/type, and an appropriate
reaction selection or tuning. Do not substitute one universal flinch for every
impact or invent finger controls where the creature has no finger bones.

Integration findings are recorded for that later phase, not silently fixed now:
V2 gameplay currently applies aggregate damage and timed enemy damage without
linking them to measured animated contact; spit VFX is visual-only and lacks
projectile collision/damage. HP loss or a visual projectile therefore cannot
serve as proof that these animations hit a target. Dungeon integration remains
paused until every mob and both bosses pass review.

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
`approved-neutral-attacks/review-bundle-integrity-owner-revision-v2.json` records
the current five-action payload/render identities and reusable verifier inputs;
the original `review-bundle-integrity.json` is historical. Each action
folder holds its eight-pose sheet, fixed-camera views, diagnostics, and independent
review receipt. Those files supersede old-stance proposals for this owner review;
they do not change the installed GLB or original animation sources.
`baseline-side/` and `baseline-bite-sheet.png` depict the **rejected existing**
motions, not improvements. Preserve original editable sources under
`issue-458-body-motion-phase-2/` unchanged.
