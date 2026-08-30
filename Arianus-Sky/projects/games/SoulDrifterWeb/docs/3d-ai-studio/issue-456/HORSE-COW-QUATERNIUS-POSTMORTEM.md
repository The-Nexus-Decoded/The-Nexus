# Issue 456 Horse/Cow Quaternius Comparison Postmortem

Status: the owner rejected every procedural horse and cow review clip. No previous
automated or independent `PASS` remains valid. The artifacts are retained only as a failed
baseline; they are ineligible for runtime integration.

## Outcome

The Smart Mesh inputs were not the cause of the failed animation. The animation-preparation
pipeline replaced accepted art, built an unvalidated ratio rig, finished with automatic
weights, and synthesized gait motion from per-frame equations. The correct recovery is to
preserve the accepted target meshes and retarget licensed authored quadruped motion. Do not
tune the rejected procedural gait functions again.

## Verified comparison inputs

| Source | License | SHA-256 | Imported structure | Authored locomotion/behavior inspected |
| --- | --- | --- | --- | --- |
| [Quaternius Ultimate horse](https://quaternius.com/packs/ultimateanimatedanimals.html) | CC0-1.0 | `BABB40391B8C3E217BE2BB9C1F7C4D21910E943C28840363509DDE7E88B54CBA` | one mesh, one 65-bone armature, 30 FPS | Walk, Gallop, Eating; 13 total actions |
| [Quaternius Ultimate cow](https://quaternius.com/packs/ultimateanimatedanimals.html) | CC0-1.0 | `097BA8D23692D901A9F821D569DE579032AEB43B9E52D89E73D0999387337D74` | one mesh, one 56-bone armature, 30 FPS | Walk, Gallop, Eating; 12 total actions |
| [Quaternius Farm horse](https://quaternius.com/packs/farmanimal.html) | CC0-1.0 | `6DB270DDC7591E9A013F96EAB445031381FA6D5D68D2FEBA567F964E0FE68D90` | one mesh, one 39-bone armature, 24 FPS | Walk, WalkSlow, Run; six total actions |
| [Quaternius Farm cow](https://quaternius.com/packs/farmanimal.html) | CC0-1.0 | `0202789CAD8C1DEBB8AE5B4A47D1A5D2E5F93A0875878BC0B05A80E42AE37E8D` | one mesh, one 39-bone armature, 24 FPS | Walk, WalkSlow, Run; six total actions |

The Quaternius meshes are motion/rig donors, not proposed Heartvale art. `Run` has not been
relabelled as `Trot`; contact classification remains required.

## Where the rejected pipeline went wrong

### 1. It destroyed accepted target art before rigging

- `rebuild_game_mesh()` voxel-remeshed the horse from 10,293 to 44,414 vertices and the
  cow from 4,949 to 49,214 vertices.
- It cleared every original material and reassigned flat colors from polygon-center tests.
- The original horse had one UV-textured PBR material and embedded
  `horse+3d+model_basecolor.jpg`. The rejected GLB contains no image or texture.
- The black horse face was authored by the rule that assigns near-black `Horse Dark Points`
  to every polygon with `center.y < -0.37 * length` and `center.z > 0.58 * height`. That is a
  head cap, not a localized muzzle marking.
- `Horse Mane` was created as a material but never assigned to source polygons.

Result: the model under review was no longer the accepted horse/cow art, and the rendered
viewport colors did not prove the actual exported material package.

### 2. It placed joints from bounding-box ratios instead of authored rest anatomy

- Both rejected assets use one custom 31-bone layout regardless of source landmarks.
- Horse fore-joint Y positions are nearly collinear, while no pole target or validated bone
  roll establishes a stable sagittal bend plane.
- The custom chain has no independently validated shoulder-to-elbow, elbow-to-carpus,
  carpus-to-fetlock, and fetlock-to-hoof landmarks. One hinge therefore fakes multiple
  anatomical functions.
- Cow `scapula.*` and `hip.*` bones are nondeforming, so legs cycle under effectively rigid
  shoulder and rump masses.
- Quaternius is not treated as a perfect anatomical mesh. Its advantage is that the rigs,
  rest axes, pole targets, weighted shoulder/hip/torso/neck relationships, and hundreds of
  authored animation curves were built and tested together.

Result: forelegs can fold in whichever direction satisfies the solver, while the chest,
shoulder, pelvis, and neck fail to carry the motion convincingly.

### 3. Automatic weighting was mistaken for a finished skin

- The horse and cow used Blender heat weights followed by a top-four influence trim.
- The defined topological weight smoother was never called.
- The horse had no anatomical cleanup pass. Measured rejected-horse weights include about
  11.1% combined scapula influence in the neck region, about 16.3% `neck_01` influence in
  each shoulder, and hundreds of shoulder vertices carrying the opposite limb above 0.05.
- Cow cleanup used broad coordinate masks; it did not author shoulder, hip, udder, hock,
  muzzle, horn, hoof, or contralateral transitions.
- Blender Preserve Volume review is not an exported glTF skinning guarantee.

Result: moving a limb pulls unrelated neck, chest, or opposite-side vertices, producing the
tearing, stiffness, and body disconnection the owner identified.

### 4. References were metadata, not motion sources

- Video URLs were written onto action properties, but no reference frames or donor curves
  were sampled into the gait.
- Walk/trot/gallop used analytic hoof paths, guessed touchdown tables, sine body waves, and
  independent per-frame two-dimensional solving.
- The horse walk solver exposes more rotational degrees of freedom than its hoof target can
  constrain and includes the hoof itself, without a pole, stable joint plane, or temporal
  continuity.
- Horse trot/gallop calls disable longitudinal target matching in key phases, so recorded
  stride metadata does not guarantee the visible fetlock or hoof reaches that stride.
- Swing flexion is derived from lift height, making upward and downward portions of the arc
  share the same joint logic even though real joint sequencing differs.
- Cow trot/gallop adds body waves and post-solve tucks that can create a readable still frame
  without one continuous physical gait.
- Deformation checksums proved only that vertices changed. Loop and export checks proved
  structure, not anatomical animation quality.

Result: nominal footfall labels could pass numeric checks while the actual legs bent, slid,
or moved beneath a nearly frozen body.

## Keep versus replace

Keep:

- exact Tripo source/job provenance and untouched source files;
- original target topology, UVs, materials, texture images, and silhouette;
- no-platform geometry audit and proof render;
- explicit export allowlist and orphan/helper purge;
- raw GLB inventory, factory-empty round trip, shared-skin verification, and action naming;
- side, three-quarter, contact-sheet, and GIF review tooling.

Replace or quarantine:

- voxel remesh and coordinate-based material replacement;
- bounding-box-ratio horse/cow rig construction;
- automatic heat weighting as the final skin;
- analytic hoof paths, sine body motion, guessed seed rotations, underconstrained gait
  solvers, and post-solve silhouette tucks;
- every rejected v2 horse/cow action and every prior `PASS` statement about those actions.

## Mandatory recovery sequence

1. Preserve the untouched approved Tripo target mesh, UVs, materials, and texture hashes.
2. Import the chosen Quaternius donor in Blender 5.2.1 and preserve its complete rest
   matrices, hierarchy, bone rolls, controls/poles, and action curves.
3. Render and classify the unmodified donor action. Walk must visibly be four-beat; trot must
   be diagonal two-beat with appropriate suspension; gallop must show the selected authored
   beat order and suspension. Never infer gait identity from the filename.
4. Fit the target to donor landmarks without remeshing the target. Transfer donor weights as
   a seed, then manually clean head/neck, same-side shoulder/hip, rigid distal segments,
   hoof/paw, tail, muzzle, and species-specific regions.
5. Retarget authored local motion and root loading. Preserve torso, pelvis, spine, neck,
   scapular/hip movement, and timing. Use constrained IK only for final foot-lock cleanup.
6. Compare donor and retarget at the same normalized frames. Require side and three-quarter
   motion, foot-contact markers, extreme-pose weight proof, and target texture/material hash.
7. Export only target mesh plus baked deform rig/actions. Round-trip and repeat the no-platform
   and material/image inventory.
8. Show one ordinary Walk to the owner without a `PASS` label. Only owner acceptance unlocks
   faster gaits, behaviors, and the related-species batch.

## Reusable quadruped acceptance gate

- Source: URL, license text, local filename, byte count, SHA-256, imported action names, FPS,
  frame ranges, and donor render recorded.
- Art: topology/UV/material/image counts and texture hashes equal the approved target unless
  a separate owner-approved revision exists.
- Rig: authored or landmark-fitted rest pose, stable joint planes and bone rolls, weighted
  shoulder/hip masses, no negative/nonuniform scale, and no helper dependence after bake.
- Weights: full coverage; final influence limit applied after cleanup; no torso-to-distal,
  head-to-limb, or contralateral bleed; rigid distal segments; extreme poses pass.
- Motion: verified species footfalls, continuous joint sequence, visible support-side body
  loading, stance-foot slide at most 1% body height, safe joint limits, and loop continuity.
- Visual: donor/retarget same-frame sheet plus side and three-quarter normal-speed clips; no
  tear, platform, facial-material drift, hyperextension, inversion, or hidden far-leg failure.
- Export: exactly the expected target mesh and baked deform rig/actions; no camera, light,
  empty, floor, platform, shadow catcher, or unexplained mesh; textures and skin survive the
  factory-empty round trip.

## Decision

The procedural horse/cow locomotion branch is closed as a failed experiment. The next
review candidate is one textured horse Walk retargeted from a verified authored donor. It
must not be labelled `PASS` before the owner accepts it.
