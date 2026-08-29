# SoulDrifter Animation Provider Routing

**Verified against public Tripo and Adobe Mixamo documentation:** 2026-08-28

## Owner-locked provider split

- **Biped humanoids:** Tripo remains the approved Smart Mesh, retopology, texture, and PBR source. Export the accepted clean T-pose without any Tripo skeleton or Tripo animation. Adobe Mixamo is the default humanoid marker-placement, auto-rigging, skinning, and preset-animation lane.
- **Animals, non-humanoid monsters, and other creature body plans:** Tripo creature auto-rigging and its matching preset library remain the default baseline lane.
- **Heads and faces:** neither body provider replaces the modular facial contract. Gaze, jaw, blink, expression, and viseme controls remain a separate compatible layer on the canonical actor.
- **Bespoke or constrained motion:** the approved DCC/custom-motion routes remain available after the provider baseline is exhausted.

For a new humanoid, Mixamo marker placement is a hard pre-rig gate. Place and visually verify the chin, wrists, elbows, knees, and groin on the clean centered T-pose before confirming the rig. Select the full finger-capable standard skeleton unless a recorded runtime-budget exception requires a reduced skeleton. Do not accept an automatically generated humanoid rig merely because a provider completed the task.

The 2026-08-28 Human pilot established that the Tripo v1.0 humanoid auto-rig can return a centered-looking bind pose while still producing skewed pelvis/root motion, upper-arm twisting, weak shoulder deformation, and open-hand combat motion without usable finger control. Those Tripo humanoid results are diagnostic evidence only and must not be promoted to the canonical Human rig.

## Correction

Tripo is a strong part of the animation pipeline, but the currently documented public Tripo API does **not** expose arbitrary prompt-to-animation generation for any requested motion.

What the public API clearly exposes is:

1. pre-rig compatibility checking;
2. automatic rigging and skinning;
3. retargeting from a versioned **preset animation library**;
4. exporting animated GLB/FBX results.

The retarget request accepts preset identifiers rather than a free-text motion prompt or an uploaded custom animation clip.

Depending on the upstream rig version, Tripo documents different fixed libraries:

- Rig v2.5 (`v2.5-20260210`): a fixed whitelist of 27 presets;
- Rig v1.0 (`v1.0-20240301`): 101 biped preset names.

The larger documented library includes useful actions such as multiple defeat animations, directional hit reactions, hurt, fall, climb, cast-a-spell, slash, shoot, swim, flee, frightened, dig, lift-heavy, and many gestures. This is much larger than only idle/walk/run, but it remains a finite preset library.

The authenticated Tripo Studio/CLI account must be inspected during onboarding. If the owner's account exposes a newer first-party **custom motion** or custom-animation endpoint not present in the public API docs, the agent may use it only after recording the exact official command/endpoint, input contract, version, pricing, and a no-charge or owner-approved pilot. Do not infer such a feature from marketing wording alone.

---

# Animation production tiers

## Tier 1A — Mixamo humanoid rig and preset animation: default biped lane

Use Mixamo for playable Humans, playable humanoid ancestries, humanoid NPCs, and biped humanoid enemies that conform to the canonical skeleton family.

Required order:

1. export the accepted clean, centered, skeleton-free T-pose from the mesh provider as FBX, OBJ plus textures in ZIP, or another Mixamo-supported intake;
2. upload the body to Mixamo;
3. place chin, wrist, elbow, knee, and groin markers and capture front-view evidence;
4. choose the full standard/finger-capable skeleton unless an approved LOD contract says otherwise;
5. confirm auto-rigging only after the marker gate passes;
6. inspect T-pose skeleton alignment, root/pelvis/spine orientation, shoulders, arms, wrists, fingers, hips, knees, ankles, and feet;
7. derive and validate the same-mesh A-pose;
8. search, preview, download, normalize, and ledger the required Mixamo animation set;
9. save every accepted rigged body and animation locally because Mixamo retains only the last-used character online.

The baseline humanoid animation search includes idle, walk, run, turn, jump, interaction, sword, shield, dual-wield or offhand where applicable, draw/sheath or equip/unequip where available, casting, hit reactions, knockdown, death, and terminal-state variations. Acquire all useful licensed Mixamo motions that satisfy a documented SoulDrifter animation demand; do not blindly ship every catalog entry without naming, deduplication, root-motion, contact, deformation, and runtime QA.

### Candidate library versus completed coverage

Provider downloads and bulk exports are candidates, not accepted semantics. The issue #487 Human pilot currently has a 400-clip intake library; its required status is `CANDIDATE_INTAKE_ONLY` until the demand matrix names and deduplicates the clips, maps each required action, and records runtime and owner verdicts. Do not report those 400 candidates as 400 finished animations or as proof that custom gaps were generated.

Keep missing requirements explicit. At minimum, preserve separate gap rows for spell-damage blowback/falls, complete staff combat/channel/draw/stow coverage, water surface/drowning, lockpicking, mining, chopping, farewell, special reactions, and damage-specific deaths until a direct-provider, derived, custom, or procedural result passes. A near-match remains a candidate; it does not silently close the required semantic.

### Owner-locked original gap-authoring rule

When the master demand matrix marks a humanoid motion `MISSING`, create a new motion for that semantic from the accepted rest rig. Do not fill the row by reversing, mirroring, renaming, trimming, splicing, crossfading, pose-copying, or combining existing clips or body regions. In particular, an existing pickup played backward is not a place animation, and a pickup upper body layered over walking legs is not a carry animation.

The new motion must be authored as one coherent whole-body performance using explicit Blender/DCC keyframes, IK, pole targets, object or weapon constraints, contact and release markers, and the recorded real-person reference. A direct provider clip may satisfy a row only when it already performs the exact required action and passes the full owner gate. Derived transformations remain allowed for variations of an already covered and approved motion, but never as a substitute for original gap authoring.

All issue #487 `SOURCE_DERIVED_VISUAL_REVIEW_REQUIRED` utility and combat gap packs produced before this rule are rejected process evidence. They must not be reviewed further, promoted, bound in runtime, or counted as coverage. Their replacement reports must declare `ORIGINAL_KEYFRAMED_MOTION`, contain no source-action recipe, and prove fresh rest-rig authorship.

Complete the full master-list audit and current-scope gap fill before presenting the review UI as exhaustive. Classify core and lower-level pilot requirements as `CURRENT_487_CORE`; search Mixamo first for every humanoid row, then use Blender only for verified provider gaps, derived variants, cleanup, contacts, transitions, or game-specific motion. Every current-core row needs a valid ingested candidate or explicit blocker before exhaustive review begins.

Future class-specific spellcasting identities are `DEFERRED_HIGHER_LEVEL` and do not block issue #487. Shared Mixamo magic variants can serve as generic pilot candidates, but they do not close future class-identity rows.

A Mixamo in-app Download click is not source acceptance. Require a browser completion receipt with the current resolved path, byte count, SHA-256, and successful Blender import. Small or truncated cache artifacts are failed transfers and must never be promoted, retargeted, or counted as candidates.

The exhaustive first-pilot decisions become the canonical semantic names, provider choices, transition/loop rules, contact/weapon rules, root-motion policy, and owner acceptance baseline for later foundation bodies. Those bodies reuse the decisions and source clips, then receive their own proportion-specific retarget, floor/contact correction, bake, and deformation/runtime QA.

### Organic custom-authoring gate

The accepted 65-bone zero-action T-pose is the authoritative humanoid **rig and rest reference only**. It defines skeleton identity, hierarchy, bone/rest transforms, scale, and the clean no-action import boundary. It is not a playable stance, an animation performance, a pose library, or evidence that body mechanics were authored. A custom gap must begin and end in its declared natural gameplay stance; it must never interpolate into the source T-pose.

Sparse scripted pose synthesis is forbidden as the sole authoring method for organic humanoid mechanics. Scripts may establish the rig, cameras, helpers, constraints, evidence capture, bake/export, and validation, but a handful of numerically plausible poses joined by interpolation does not prove loading, weight transfer, contact, impact, follow-through, or recovery. A technically valid export, low error metric, clean contact sheet, or generated `PASS` flag cannot promote a clip that looks physically wrong in continuous playback.

Every `ORIGINAL_TIER_3` gap must complete and receipt this sequence:

1. analyze the recorded real-person reference and the exact SoulDrifter semantic/contact brief;
2. create natural guard/ready boundaries and block the complete action in stepped/Constant interpolation, including anticipation, contact or release, follow-through, and recovery;
3. author the body mechanics densely and evaluate IK, pole, hand/foot, prop, weapon, and surface constraints on every frame of every required contact interval; bake at a one-frame sample step so sparse milestone interpolation cannot masquerade as a finished performance;
4. review pelvis and center-of-mass travel, support changes, feet, hip/shoulder sequencing, and weight transfer rather than judging arms alone;
5. calculate and review motion paths for the pelvis, hands, feet, and relevant weapon/prop controls, then programmatically inspect sampled transform curves plus linear and angular velocity for unexplained spikes;
6. convert the accepted blocking pass to purposeful spline/F-Curve motion, polish timing and spacing, and remove overshoot, Euler/quaternion flips, grip drift, foot slide, and one-frame discontinuities; the Blender GUI/Graph Editor is preferred for this pass but a recorded programmatic F-Curve/velocity workflow is valid and is not blocked by GUI access;
7. bake evaluated constraints onto the canonical rig, export, and fresh-reimport the exact hashed artifact; and
8. watch the entire action at normal gameplay speed from separate side and three-quarter cameras with the whole body and required prop/weapon path visible.

The receipt records hashes for blocking, dense/full-frame constraints, center-of-mass, motion-path/curve/velocity inspection, curve polish, export, and both normal-speed views under `technicalReview.evidence.organicAuthoringWorkflow`. The author must clear visible blockers before quarantine handoff, but this self-review never replaces the independent continuous-playback review or the owner's verdict.

`PROVISIONAL_PILOT` is a throughput status for explicitly documented **minor** contact, easing, or curve-polish deviations that do not change the action, break anatomy, penetrate the floor/prop/body, lose a required grip/contact, or violate provenance/lifecycle state. After the first full-motion review finds only minor deviations, make one corrective build, repeat the two-angle normal-speed self-review, record every remaining item in `polishNotes`, and move on as `PROVISIONAL_PILOT` instead of looping on polish. The exact candidate may enter independent/owner review and, after explicit owner approval, the BREACH-V2 pilot queue. Wrong-action semantics, source-rig drift, broken or snapping limbs, T/bind-pose boundaries, floor or prop penetration, missing required contacts, root/grounding failure, catastrophic motion discontinuities, missing evidence, hash mismatch, and unauthorized promotion remain hard failures and can never be relabeled provisional. A provisional candidate cannot reach `SHIPPING_VERIFIED`; it must be polished and revalidated as full `PASS` first.

Blender's official documentation is the implementation baseline:

- [Motion Paths](https://docs.blender.org/manual/en/latest/animation/motion_paths.html) for framewise bone/control trajectories;
- [Inverse Kinematics Constraint](https://docs.blender.org/manual/en/latest/animation/constraints/tracking/ik_solver.html) for target, pole, and chain control;
- [F-Curve Properties](https://docs.blender.org/manual/en/4.5/editors/graph_editor/fcurves/properties.html) for Constant blocking, Bezier polish, handle smoothing, and overshoot control; and
- [glTF Animation Bake and Merge](https://docs.blender.org/manual/en/dev/addons/scene_gltf2.html) for evaluated animation export behavior.

The owner selected the current `BLENDER_DENSE_FULL_FRAME` route for issue #487. Cascadeur and video-mocap drafting are deferred and must be recorded as `DEFERRED_NOT_USED`; they are not fallback blockers and are not authorized for this pass. A later owner-approved evaluation may consider Cascadeur's official [Physics](https://cascadeur.com/help/animation/physics) and [Mocap (Alpha)](https://cascadeur.com/help/category/203) tools, but it must preserve the same provenance, Blender cleanup, constraints, bake, fresh-import, two-angle normal-speed, independent-review, and owner-approval gates. No subscription, provider charge, or tool installation is authorized by this future option.

### Real-person video reference gate

Before acquiring or creating any humanoid animation, search YouTube or another video source for a real person performing that exact action. Record the URL, publisher, retrieval date, time range, and observed mechanics: stance, balance, weight transfer, feet, hips, shoulders, hands or grip, contacts, anticipation, duration, follow-through, and recovery. Provider names and memory are not references.

If an exact fantasy action does not exist, build and record a reference packet from the closest real physical components. No Mixamo selection, derived edit, Blender/Houdini authoring, or procedural generation may begin until this packet exists. The candidate provenance must link back to it, and any candidate that contradicts it returns to `REWORK` or `REJECTED` before owner preview.

Preview at the intended game rate and compare candidate duration with the real-person reference. Do not time-compress deliberate interactions to make the preview shorter. Record source duration, candidate duration, and playback rate; rushed or unnaturally fast candidates return to `REWORK`.

For any object- or surface-dependent action, include a correctly scaled proxy object or environment contact in the neutral-body preview. Hand placement, leverage, contact timing, clearance, and object response must be visible. A body-only mime does not pass the owner-preview gate for lift, carry, place, doors, locks, valves, mining, chopping, climbing, or comparable interactions. This proxy exists only for QA and is never exported or baked into the animation/character; the actual runtime item is a separate entity attached through declared sockets and contact markers.

### Candidate preview and owner-verdict gate

Every newly generated, provider-derived, DCC-derived, custom, or procedural animation candidate follows this order:

1. generate the candidate and record its source, transform, hashes, semantic row, loop/one-shot intent, and preview contract;
2. render the complete candidate on the neutral accepted body at the intended normal gameplay rate with any required prop, surface, or weapon context;
3. require an independent root-lane reviewer to watch the entire continuous playback and explicitly check anticipation or wind-up, feet, knees, hips, pelvis, spine, shoulders, elbows, hands, prop contacts, action cadence, follow-through, and recovery;
4. reject or return the candidate internally when any visible mechanic fails, even when numeric validation, fresh import, static phase frames, contact sheets, or the authoring agent's self-review pass;
5. post the labeled normal-speed preview in the active Codex chat only after that independent continuous-playback gate passes;
6. record the owner's `APPROVE`, `REJECT`, or `CHANGE` verdict for that exact candidate and hash; and
7. queue only owner-approved candidates for the BREACH-V2 exhaustive runtime review.

A contact sheet, phase-image set, numeric report, agent-authored `PASS` label, or valid GLB is supporting evidence only; none can substitute for watching the complete normal-speed motion. The authoring agent may report technical results but cannot self-approve its animation for owner review. A generated or structurally valid GLB is not accepted coverage and must not enter the BREACH-V2 queue before the independent continuous-playback review, neutral-body chat preview, and owner verdict exist. Rejected candidates remain preserved as provenance. Changed candidates return to generation and repeat the gate.

### One-shot natural boundary-pose gate

Every one-shot clip must begin in its declared natural gameplay stance, perform the complete action, and end in its declared natural recovery or ready stance. A source bind pose, arms-wide T-pose, or interpolation through either state is not a playable boundary and fails the candidate before preview. The generated receipt must declare `candidate.playIntent: ONE_SHOT`, name the start and end gameplay stances, hash the source-bind, declared-stance, and exported boundary samples, and record a numeric boundary comparison over at least eight upper-body bones.

Use `FRAMEWISE_BONE_QUATERNION_RMS_PLUS_ARMS_WIDE_SCORE`. Both exported boundaries must remain within 5 degrees RMS of their declared gameplay stance, at least 12 degrees RMS away from the source bind pose, and at or below a `0.35` arms-wide score. Record the sampled frames, bone count, threshold values, measured values, and `bindOrTPoseAtBoundary: false` under `technicalReview.evidence.boundaryPose`. The candidate validator rejects missing metadata, weakened thresholds, bind/T-pose stance labels, an arms-wide score above the limit, or a boundary too close to bind. Loops still declare `candidate.playIntent: LOOP`; their seam and cycle-pose checks remain governed by the loop contract rather than this one-shot stance gate.

Treat the numeric gate as a fail-closed preflight, not visual acceptance. The independent reviewer still watches every normal-speed frame to catch single-frame bind-pose flashes, bad interpolation, or a technically separated pose that does not read as the declared gameplay stance.

### Tree and plant harvest interaction gate

The generic `interaction.harvest` semantic and its Harvest v1 candidate are retired as `CHANGE/REWORK`. Harvest is two required current-core actions:

- `interaction.harvest.tree`: a ground bucket is ready, the actor makes a clearly upward tree-fruit pick, transfers the fruit, and deposits it into the bucket;
- `interaction.harvest.plant`: a ground bucket is ready, the actor uses a natural low bend or hip hinge to pick from the plant, rises, transfers the fruit, and deposits it into the bucket.

The bucket is a separate `HARVEST_BUCKET` entity with `RUNTIME_BOUND` binding and `GROUND_PLACED` placement. Fruit is a separate `RUNTIME_BOUND_ITEM`. Neither bucket nor fruit may be baked into the character or animation artifact, and the bucket may never float or follow a hand socket. The neutral-body preview must include the grounded bucket and prove clean hand-to-fruit, hand-to-bucket, and fruit-to-bucket paths with no visible collision. Receipts for either harvest semantic record the exact canonical beat order plus `bucketProp`, fruit binding, grounded preview, and all three collision checks under `technicalReview.evidence.interactionContext`; the executable candidate gate rejects incomplete or generic harvest receipts.

### Mounted-valve placement, grip, and regrip gate

Valve v2 is owner `CHANGE/REJECTED`: it does not establish the canonical `interaction.valve` motion. Every replacement uses a correctly scaled mounted-valve proxy and a slow, deliberate two-hand turn. The actor stands squarely on the front side of the valve plane and faces the valve; a side-on, behind-plane, or materially off-center placement fails even when the hand path looks plausible from one camera.

Use the mounted surface's outward normal as the signed-plane convention. Record `signedActorCenterDistanceFromValvePlaneMeters` in the positive front-side range `0.25` to `1.1`, `actorForwardTowardValveDot` at or above `0.9`, and absolute lateral offset from the valve center at or below `0.15m`. These are measured in the proxy's coordinate frame, not inferred from screenshots.

Hands keep ordered working sides in valve-local X: the left-hand minimum remains at or above zero, the right-hand maximum remains at or below zero, and left-minus-right separation never falls below `0.08m`. Minimum inter-hand clearance is `0.05m`; body-midline and inter-arm crossing counts are both zero. Before continued rotation would cross the hands or arms, one hand releases and regrips on its own side while the other hand controls the wheel. Receipts list the exact regrip frames, keep `crossingFrames` empty, and limit a single-hand regrip gap to six frames. Both hands otherwise remain engaged. A rushed gesture, unmarked release, hand/valve miss, arm/torso collision, or inter-arm collision fails closed.

Record the prop binding, signed placement/facing measurements, framewise side-order and clearance extrema, regrip/crossing frames, duration/cadence, and collision checks under `technicalReview.evidence.valveInteraction`. The executable candidate gate requires `MOUNTED_VALVE_TWO_HAND_TURN`, a `RUNTIME_BOUND` review proxy that is not baked into the animation artifact, `SLOW_DELIBERATE` cadence of at least two seconds, and all numeric/contact fields before quarantine or owner review can pass.

### Executable quarantine and promotion contract

All humanoid authoring lanes use the receipt template at
`templates/humanoid-animation-candidate-receipt.template.json`. Provisional GLBs,
technical reports, and review videos live under
`H:\CodexData\souldrifter-toolchain\evidence\<issue>\animation-candidates\` and
never under a runtime `public/assets` directory.

The authoring lane stops at `QUARANTINED`; it cannot set its own independent
visual verdict to `PASS`. The root coordinator must review the exact hashed
normal-speed playback and explicitly pass wind-up, semantic readability,
whole-body mechanics, balance and weight transfer, feet/knees/hips/pelvis,
spine/shoulders/elbows/hands, prop or surface contacts, cadence,
follow-through/recovery, grounding/root motion, and gameplay-camera readability.

Before that independent review begins, require a valid quarantine handoff:

```powershell
node Arianus-Sky/projects/games/SoulDrifterWeb/scripts/validate-human-animation-candidate.mjs --gate quarantine <candidate-receipt.json>
```

This gate rejects missing or undecodable evidence, noncanonical rest rigs,
source-derived provenance, and any authoring lane that prematurely claims an
independent visual pass, owner presentation, or runtime promotion.

Before a candidate can be shown to the owner, run:

```powershell
node Arianus-Sky/projects/games/SoulDrifterWeb/scripts/validate-human-animation-candidate.mjs --gate owner-review <candidate-receipt.json>
```

The owner-review exporter accepts only a passing receipt and produces one
candidate per file. It cannot merge multiple motions into a review reel. The
owner's `Y`, `N`, or `CHANGE` applies only to the exact candidate and playback
hashes in that receipt. Any regenerated key, export, camera, prop context, or
video invalidates the verdict and returns the candidate to quarantine.

Before copying approved bytes into a runtime asset directory, record the exact
owner-selected SHA-256 and change promotion to `OWNER_APPROVED`. Do not copy the
file manually. Use the fail-closed promoter:

```powershell
node Arianus-Sky/projects/games/SoulDrifterWeb/scripts/promote-human-animation-candidate.mjs --receipt <candidate-receipt.json> --destination public/assets/3d/animations/human-foundation-pilot/<semantic-name>.glb
```

The promoter runs the runtime-install gate, rejects a hash mismatch or missing
owner verdict, refuses any destination outside the runtime animation tree, and
sets runtime verification back to `PENDING`. After BREACH-V2 integration, run
typecheck, the complete test suite, the production build, and a real BREACH-V2
browser smoke. Record all four results as `PASS`, then require:

```powershell
node Arianus-Sky/projects/games/SoulDrifterWeb/scripts/validate-human-animation-candidate.mjs --gate shipping <candidate-receipt.json>
```

Only a receipt that re-hashes to the exact approved and installed bytes and has
all runtime checks at `PASS` reaches `SHIPPING_VERIFIED`.

## Tier 1B — Tripo creature preset retarget: default non-humanoid lane

Use Tripo for animals, non-humanoid monsters, and creature body plans for:

- rig check;
- automatic skeleton/skin weights;
- locomotion presets;
- common combat actions;
- common hit reactions;
- common defeat/fall actions;
- common gestures and ambient motions;
- batch retargeting of up to the provider's current documented limit.

Every creature ticket must first search the live preset list before commissioning a custom motion. Tripo biped presets may be retained only as diagnostic comparisons unless the owner explicitly approves a humanoid exception after side-by-side proof.

Examples that may be covered directly or approximately by the documented library:

- idle, walk, run, turn;
- jump, dive, climb, swim;
- slash, shoot, front kicks, fire;
- hurt and directional hit reactions;
- fall, `defeat_02`, `defeat_03`;
- cast-a-spell;
- flee, frightened, sob, cry, complain;
- lift-heavy, dig, shovel, chop;
- greetings, celebrations, sitting, waiting and other ambient gestures.

A preset is accepted only after normal-speed gameplay-camera and close deformation QA.

A direct creature Tripo preset that passes the full technical, runtime, gameplay-camera, and owner acceptance gate does **not** require duplicate Houdini/Blender production.

## Tier 2 — Derived custom variants from provider presets

Use Houdini KineFX, Blender, or another approved DCC automation layer to derive additional game-specific clips from a Mixamo humanoid base motion or Tripo creature base motion.

This tier may vary an already covered and owner-approved semantic; it may not close a master-list `MISSING` row. Missing humanoid actions route directly to original Tier 3 authoring under the owner-locked rule above.

Allowed transformations include:

- left/right mirroring;
- timing and speed changes;
- root-motion removal or adjustment;
- directional rotation;
- limb masking;
- additive torso/head/arm layers;
- impact recoil and follow-through changes;
- weapon/socket alignment;
- IK hand/foot constraints;
- fixed wall/chain constraints;
- blend-to-ragdoll or ragdoll-to-authored transitions;
- clip trimming, looping and recovery cleanup;
- contact/VFX/SFX/gameplay event markers.

For simple deterministic transformations, one approved DCC lane may be sufficient.

When the derived motion requires substantial interaction, constraint, acting, weapon, or silhouette work, the owner-locked **dual-pipeline bakeoff** applies:

- one Houdini KineFX candidate;
- one Blender candidate;
- blind AI review;
- owner side-by-side verdict;
- experiment registry update.

See `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`.

## Tier 3 — Bespoke custom-motion lane

Use this when no Tripo preset is close enough to the required silhouette, timing, interaction, or constrained movement.

Possible sources:

- a verified provider custom-motion feature exposed to the owner's account;
- an owner-approved text/video-to-motion or motion-capture provider;
- AI-authored Houdini KineFX animation scripts;
- AI-authored Blender rig/animation scripts;
- procedural IK/physics/constraint authoring;
- recorded or licensed motion capture;
- limited manual cleanup after an automated first pass.

### Mandatory dual-pipeline rule

Every Tier 3 custom animation must produce two independent candidates from the same locked brief and canonical rig:

1. `HOUDINI_KINEFX`
2. `BLENDER`

The two candidates use the same source motion/reference, duration, FPS, root-motion contract, constraints, markers, review cameras, runtime export settings, and acceptance criteria.

An independent coordinator blinds the labels, an independent AI reviewer scores the candidates, and the owner chooses the winner, tie, category split, rework, or new route.

The winner becomes the canonical runtime clip. The loser and its source scripts are preserved as experiment data.

No pipeline may be retired automatically. Aggregate evidence is reviewed after 10, 25, 50, 100, and each additional 50 bakeoffs. A global retirement proposal normally requires at least 25 representative samples, category coverage, a 75% owner-decided win rate, a material time/failure advantage, and explicit owner approval.

See:

- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- `config/animation-bakeoff-policy.json`
- `templates/animation-bakeoff-record.template.json`

The resulting winning motion is retargeted/baked onto the accepted canonical rig and then enters the normal animation QA contract.

## Tier 4 — Runtime procedural motion

Some reactions should not be separate baked clips at all.

Use runtime systems for:

- look-at and aim offsets;
- foot placement;
- hand attachment;
- wall/chain constraints;
- small hit impulses;
- knockback direction;
- ragdoll deaths and blends;
- additive breathing/idle motion;
- weapon recoil;
- surface/terrain adaptation.

Procedural motion combines with authored/preset clips and is still server/gameplay-state driven where authoritative behavior matters.

Runtime procedural motion does not eliminate the dual-pipeline bakeoff when a custom authored base clip is still required.

---

# Death and hit-reaction strategy

SoulDrifter needs many visible outcomes, but that does not require one fully unique provider-generated clip for every combination.

Use a layered library:

1. Tripo preset deaths/falls/defeats as baseline clips;
2. mirrored and directionally rotated variants;
3. front/back/left/right hit-reaction presets where available;
4. damage-severity additive layers;
5. weapon/spell-specific impulses;
6. final ragdoll or physics-assisted collapse where appropriate;
7. class/monster/boss signature deaths only where their silhouette genuinely requires bespoke motion.

This creates many distinct results while keeping the authored library manageable.

For every bespoke signature death not acceptably covered by Tripo presets, run the Houdini KineFX versus Blender bakeoff and store the result.

---

# Class and ability animation routing

For every requested animation, the animation-demand record must include:

```json
{
  "animationId": "slayer-feinting-cut",
  "requiredMotion": "off-hand feint followed by low diagonal dagger cut",
  "scope": "CURRENT_487_CORE | DEFERRED_HIGHER_LEVEL",
  "interactionConstraints": [],
  "providerPresetSearchCompleted": true,
  "candidatePresets": [],
  "presetMatchScore": 0.0,
  "route": "MIXAMO_HUMANOID | MIXAMO_DERIVED | TRIPO_CREATURE | TRIPO_CREATURE_DERIVED | VERIFIED_PROVIDER_CUSTOM | DUAL_DCC_BAKEOFF | PROCEDURAL_RUNTIME",
  "dualBakeoffRequired": true,
  "bakeoffRecordPath": "",
  "rigFamily": "canonical-humanoid",
  "contactMarkers": [],
  "coverageStatus": "CANDIDATE | DIRECT_PROVIDER_PASS | DERIVED_PASS | CUSTOM_PASS | PROCEDURAL_PASS | MISSING | REWORK | REJECTED",
  "downloadReceipt": "PENDING | PASS | FAIL",
  "floorRootPreflight": "PENDING | PASS | FAIL",
  "ownerApproval": "PENDING"
}
```

Do not label a motion `VERIFIED_PROVIDER_CUSTOM` unless a live authenticated provider capability check proves that custom-motion input is supported.

Do not label a Tier 3 motion complete until both DCC candidates have been produced or one lane has a documented unrecoverable technical blocker.

---

# Chained skeleton fixture

The chained skeleton is not proof that Tripo is useless for animation. Tripo remains responsible for:

- rig checking;
- rigging/skin weights;
- testing available emotional/hurt/defeat/ambient presets;
- exporting the rigged body and any useful base motion.

The exact requirement—wrists/ankles constrained to wall anchors while the torso twists and pulls—is unlikely to be satisfied by an unconstrained generic preset alone.

Required routing:

1. query the live Tripo preset list;
2. test the closest useful candidates such as hurt, frightened, complain, sob, defeat, or another verified ambient preset;
3. lock the accepted Tripo rig and source/base motion for both DCC lanes;
4. create one Houdini KineFX constrained-struggle candidate;
5. create one Blender constrained-struggle candidate;
6. keep chain simulation/attachments separate from the skeleton body in both lanes;
7. export both through the same Three.js review scene;
8. blind the A/B labels;
9. run independent AI comparison;
10. present the side-by-side review to the owner;
11. integrate the owner-selected winner;
12. update the animation bakeoff registry.

If the authenticated Tripo account exposes a verified custom-motion feature, it may provide the common source motion or a third comparison candidate, but it does not remove the owner-directed Houdini-versus-Blender bakeoff for this pilot.

The final accepted clip may be classified `TRIPO_PRESET_DERIVED + DUAL_DCC_BAKEOFF`, which remains an AI-first Tripo-led production path.

---

# Acceptance

No animation enters the runtime library until it passes:

- rig/deformation QA;
- deterministic frame-zero floor/root preflight on the accepted bind/rest state, frame zero, and first animated frame;
- recorded actor bounds, root/pelvis transforms, lowest intended contact, floor plane, planted-foot continuity, and any baseline correction;
- automatic rejection of unexplained initial floating/penetration, root or pelvis spikes, or dependence on an ad hoc scene Y-offset while preserving intentional jumps, falls, knockback, stairs, and other authored vertical motion;
- source-download acceptance proving browser completion, current-path byte count, SHA-256, and successful Blender import rather than a partial cache artifact;
- a labeled neutral accepted-body chat preview and an exact owner `APPROVE`, `REJECT`, or `CHANGE` receipt for the candidate and hash before BREACH-V2 queueing;
- normal-speed gameplay-camera proof;
- contact and recovery timing;
- root-motion contract;
- socket/weapon/chain constraint proof;
- loop/transition proof where applicable;
- VFX/SFX/gameplay marker alignment;
- both combat modes when gameplay-related;
- Three.js GLB playback;
- grounding proof in the actual accepted BREACH-V2 real-game preview with representative locomotion, combat, reaction, and death playback; unit math and isolated loaders are supporting checks only;
- real-GPU performance;
- provenance and rollback;
- dual-pipeline comparison when required;
- independent verification.

Rerun the complete candidate library preflight after any exporter, scale, rest-pose, root-motion, or retarget-profile change. Repair shared grounding failures in the normalization/export pipeline, not with per-scene placement guesses.
