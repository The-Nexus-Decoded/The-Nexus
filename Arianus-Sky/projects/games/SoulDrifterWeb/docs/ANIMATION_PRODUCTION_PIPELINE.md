# SoulDrifter Skill Animation Production Pipeline

This is the mandatory production gate for every weapon action, spell, summon, buff, defense, recovery, interaction, monster ability, class skill, and specialization skill. It applies to every race and body type and to player characters, friendly NPCs, hostile NPCs, classed enemies, bosses, summons, and PvP opponents.

Weapon animation also requires the exact source-backed stance, grip, and weapon-family research packet defined in [`WEAPON_MOTION_REFERENCE_INDEX.md`](WEAPON_MOTION_REFERENCE_INDEX.md) before rig work begins.

The purpose of this pipeline is to prevent animation work from becoming a long sequence of visual guesses and local patches. A clip is not finished because it exports, plays, stays inside its bounds, or has attractive particles. It is finished only when its complete body mechanics, semantic telegraph, gameplay timing, grounding, and normal-speed presentation pass visual review.

## Locked principles

1. **The skill owns the animation contract.** A PC Shadowknight and an NPC Shadowknight using Siphon Cleave resolve the same base contract, motion, telegraph, release marker, hit geometry, VFX/SFX sockets, and recovery timing. Race, body, equipment, specialization, and power tier may add retargeting or style layers without changing what the skill means.
2. **Every action has a recognizable motion signature.** Do not reuse a generic swing, cast, or idle pose with different particles. Weapon Strike, Siphon Cleave, Cinder Guard, Recover, summons, heals, projectiles, channels, and future skills must be distinguishable from body motion before their gameplay effect resolves.
3. **PvP readability starts during anticipation.** Another player must be able to identify the incoming action from the stance, hand or weapon path, timing, and restrained pre-resolution cue soon enough to block, dodge, interrupt, counter, or reposition when the rules allow it.
4. **The whole body participates.** Attacks and casts use appropriate feet, knees, hips, pelvis, spine, shoulders, head, hands, and equipment. An upright torso with moving arms is an automatic failure.
5. **Particles cannot rescue bad choreography.** Visual effects reinforce a readable motion; they do not replace anticipation, contact, release, follow-through, or recovery.
6. **Gameplay distance is authoritative.** Close-up inspection is required, but a motion that disappears or merges into idle from the normal isometric camera fails.
7. **Rejected work never becomes the shipping asset.** Candidates remain isolated until all visual, technical, runtime, and provenance gates pass.
8. **Mixamo is a batch acquisition source, not a per-character production dependency.** Keep one acquisition session open long enough to collect the approved motion set. Upload only the canonical humanoid acquisition rig when a Mixamo preview requires it; do not upload every race/class/equipment combination. Download source motions once, record their provenance and hashes, and store the untouched working library outside the shipping tree. When the returned clip has the same rig names and topology as the shipping character, ship it as a separate animation-only pack and bind it directly at runtime; do not retarget or merge it into the character GLB. Use Blender retargeting only for genuinely different rigs or for an explicitly approved authored post-pass. Race, class, weapon, NPC, enemy, and equipment variants reuse the runtime pack or a documented retarget/style layer. Do not require the owner to repeat browser sign-in, native file-picker, upload, or download work for routine variants.

9. **World interactions require empty hands.** Door, chest, pickup, placement, dialogue, lever, switch, crafting, and similar clips fail if a weapon remains attached to either hand. An armed actor must sheath first, transfer the item to its hip/back socket on the authored event marker, perform the interaction, then optionally redraw. Previewing or downloading an interaction while the visible reference character still holds a weapon is not an acceptable visual gate.
10. **Acquire coherent combat families, not random isolated attacks.** A weapon family must share a believable combat idle, guard, locomotion, basic attack, signature cuts, impact reactions, and recoveries. Do not combine unrelated mocap clips merely because each result contains the word `sword`.
11. **Every weapon family has an unarmed failure state.** If no usable weapon is equipped, durability reaches zero, or a disarm effect succeeds, weapon-only actions cannot swing an invisible prop. The basic action switches to the actor's unarmed family (combat idle, jab/cross, front kick, block, impact, recovery); weapon-required skills are disabled or replaced by an explicitly designed class fallback.
12. **Motion complexity cannot exceed the skill tier.** A downloaded combo, flourish, spin, aerial attack, or multi-hit sequence is never substituted for a beginner basic merely because it looks polished. The First Breach Weapon Strike remains one compact thrust; Siphon Cleave remains one readable outward cut. `One Hand Sword Combo` is retained only as a future multi-hit unlock candidate and is forbidden from both starter bindings.

## Mixamo acquisition and local reuse boundary

Mixamo may accelerate the human-motion foundation, but it must not become a runtime service, build dependency, or recurring manual step.

1. Prepare one neutral canonical humanoid acquisition rig with a stable bone map and no class-specific armor dependency. Use an unarmed, hairless inspection variant for interaction acquisition so hand placement, head motion, and clipping remain visible; hair and equipment are restored later as modular local layers.
2. In one signed-in acquisition session, shortlist and preview coherent motion families by archetype: weapon-ready idle/locomotion, guard, thrust, horizontal cut, advancing slash, overhead chop, rising cut, dodge, hit reaction, death, cast, channel, ward, summon, recovery, and unarmed jab/kick/block. Prefer a consistent pack for the common stance and footwork, then add isolated clips only when they pass the same family-transition gate.
3. Download each accepted source clip once using the permitted settings and preserve its source name, URL, license/terms note, download settings, file size, and SHA-256 hash.
4. Keep the untouched acquired clip in the non-shipping provenance library. Never overwrite it with a retargeted or edited version.
5. Compare the returned skeleton to the shipping actor before editing it. Same-name, same-topology clips take the direct animation-pack path below. Only different skeletons use Blender retargeting and a documented per-body profile for Elf, Human, Dwarf, Drakkin, future Monk bodies, classed NPCs, or compatible enemies.
6. Apply weapon-family grip, equipment sockets, class posture, race proportions, skill timing, and power-tier VFX as deterministic runtime or authored layers. Never rebuild a same-rig clip merely to attach equipment; equipment remains socketed to the shipping actor.
7. Validate every direct pack or retargeted variant through the same numeric and visual gates in this document; shared motion does not waive race/body/equipment review.
8. Return to Mixamo only when the local library lacks a genuinely new motion archetype. A new character, costume, weapon skin, race/class pairing, or NPC is not by itself a reason to upload again.

### Direct same-rig animation-pack path

Use this path when Mixamo returns the uploaded SoulDrifter rig with matching bone names and topology:

1. Convert the untouched returned FBX to a small animation-only GLB and prove the FBX-to-GLB bone trajectories remain equivalent before runtime integration.
2. Keep the character, clothing, armor, hair, and weapon meshes in the stable character GLB. Load the animation-only GLB separately, validate every track target against the cloned actor, and bind the clip to that actor's existing bones.
3. Cache only the downloaded pack promise. Clone and bind the `AnimationClip` per actor so player characters, classed NPCs, and compatible enemies share motion data without sharing mutable mixer state.
4. For an in-place action, normalize only forbidden top-level armature travel. Preserve all skeletal arrays and any authored vertical compensation, orientation, or scale needed for planted feet.
5. Trim unusable anticipation or recovery only by slicing the original keyframe envelope. Do not resample, reconstruct poses, or splice in another attack. The shared motion controller owns the crossfade from and back to the approved idle.
6. Record the raw source hash, animation-pack hash, track count, frame window, FPS, playback rate, contact marker, root policy, and rendered evidence in the provenance sidecar.
7. Test normal and zoomed presentation, no-target rehearsal, valid-target resource changes, weapon socket continuity, grounding, recovery, and the full frozen gameplay regression before promotion.

Do not merge a same-rig Mixamo action into the multi-action character GLB. Blender action slots and first-action export selection can silently export an empty or wrong channel bag even when the preview looks correct. The external pack boundary avoids that failure and lets new approved motions be added without rebuilding the character asset.

### Armed-to-interaction transition contract

The default runtime state path is `weapon drawn -> sheath -> empty-hand interaction -> weapon sheathed`. The weapon stays drawn across attacks, buffs, recovery, targeting, movement, and combat idle. It changes only after an explicit draw/sheath command or an interaction contract that requires empty hands; a rare interaction may explicitly request an automatic redraw. The sheath clip owns the exact socket-transfer marker, and gameplay never teleports a weapon between sockets outside that marker. A hip/back harness is visible only while its compatible sheath or stored weapon is present. Neutral exploration and interaction clips must not carry weapon-grip tension in an otherwise empty hand.

If browser automation cannot pass a local file to Mixamo, treat that as an acquisition-tool defect. Do not turn the defect into a standing owner chore. Preserve the ready-to-upload file at a stable local path, repair the automation separately, and continue all work that can be performed through the local library.

## Required skill-motion contract

Create or update one data contract before wiring gameplay. The contract must remain actor-agnostic and include:

- stable skill/action ID and registry key;
- motion archetype and deterministic clip names/fallbacks;
- weapon family, grip, hand contacts, and equipment sockets;
- playback rate and crossfade duration;
- root-motion policy: in-place, authored displacement, or target-warped;
- intended displacement in meters and logical tiles;
- facing and auto-face policy;
- target/hit shape and reach;
- telegraph interval;
- one shared contact or release marker for gameplay, VFX, and SFX;
- recovery interval and cancel window;
- interruptibility during telegraph, active, and recovery phases;
- left/right foot-contact intervals;
- VFX and SFX attachment sockets;
- race, class/calling, equipment, specialization, and power-tier style layers;
- source, license, retarget, author, review, and version metadata.

Gameplay damage, healing, ward activation, summoning, resource changes, and status effects must resolve from the shared contract marker. Do not fire gameplay immediately and animate afterward. Do not maintain separate player and NPC timing tables.

## Production sequence

### 1. Define semantic intent before touching the rig

Write a short action brief:

- what the actor is doing physically;
- the action's progression tier and intended mechanical complexity;
- what an opponent must recognize before resolution;
- where power or force begins and travels;
- which body part, weapon, focus, or summon owns the silhouette;
- whether feet are planted, step, dash, retreat, rotate, or leave the ground;
- the intended hit/target geometry;
- the expected contact/release moment;
- how the actor regains balance;
- which high-level visual language is forbidden at this tier.

Lock the correct motion family before selecting mocap or posing the rig. Do not turn a simple beginner action into a more advanced technique because a dramatic source clip is available. For example, the starter Shadowknight Weapon Strike is a compact one-handed stab: blade-forward guard, short controlled thrust with modest knee/hip/shoulder drive, then quick recovery. It is not an overhead chop, two-handed power cut, dash, flourish, or magical rune attack. Siphon Cleave is a separate one-handed sweeping/draining action and must have a different silhouette.

Low-level SoulDrifter actions use mortal weapon technique, wizardry, necromancy, breath, posture, and restrained effects. They do not use visible Sartan/Patryn runes, high-level probability magic, or advanced class regalia unless the skill's progression tier explicitly unlocks them.

### 2. Choose a licensed human-motion foundation

Prefer a human motion-capture or recorded-performance reference for mechanics. Project-authored stylization may change timing, hand contacts, weapon path, silhouette, and class personality, but it must retain believable loading, balance, and recovery.

Before importing:

- record the primary source URL/publisher;
- record the exact clip/trial/time range;
- record the license and redistribution limits;
- store a hash for the downloaded source and generated candidate;
- reject a motion whose locomotion/root policy conflicts with the skill;
- keep unapproved source data and working files outside the shipping asset tree.

### 3. Retarget at the shared asset boundary

- First test whether retargeting is required. A matching SoulDrifter/Mixamo skeleton uses the direct animation-pack path above; the following matrix-bake rules apply only when skeleton bases or topology differ, or when an approved authored edit explicitly requires Blender.
- Use the canonical humanoid rig and documented bone map.
- Apply source-rest-to-source-pose global rotation deltas onto target-rest bones; do not blindly copy local Euler values between unrelated bases.
- When a Mixamo FBX round trip preserves SoulDrifter bone names/topology but changes rest-axis bases, bake each evaluated source `PoseBone.matrix` in armature space onto the matching target bone before keying target-local channels. Never copy `matrix_basis` in that case: it recreates the twisted torso, looping arm, and lifted-foot failure even though the source preview is correct.
- Preserve useful rotations through pelvis, legs, spine, shoulders, neck, head, arms, hands, and fingers.
- Remove or constrain only the translation channels forbidden by the skill's root policy.
- For in-place motion, anchor horizontal root travel while preserving or rebuilding vertical pelvis/root compensation needed by bent knees.
- Bake per-frame floor compensation after retargeting.
- Align weapon grips and off-hand contact with IK or explicit post-processing when the source weapon proportions differ.
- Arm and leg IK that must preserve a particular elbow or knee plane requires an explicit pole target or equivalent constraint. Calibrate pole angles per limb from the actual bone roll; do not assume one shared numeric angle bends left and right limbs symmetrically. A hand reaching its target is not sufficient if the unconstrained elbow flares into a T-shape, crosses the torso, or crowds the head. Reject the pose numerically before rendering when shoulder/elbow/hand ordering violates the intended anatomical plane.
- Add a class-authored post-pass when generic mocap lacks the required weapon path, free-hand gesture, guard, summon, or spell release.

### 4. Reject bad poses before runtime integration

For every weapon family, approve a static grip-and-guard proof before authoring or importing the full action. Render close front, close side, and gameplay-camera views that show:

- both hands making anatomically credible contact for a two-handed grip, or the weapon hand firmly controlling the hilt while the free hand takes an intentional guard for a one-handed grip;
- neutral or deliberately loaded wrists rather than a blade dangling from a straight, limp arm;
- elbows bent enough to control the weapon and shoulders positioned for the intended line of attack;
- blade, haft, bow, staff, or focus clear of the actor's legs, torso, hair, and equipment;
- a balanced stance capable of loading, striking, following through, and recovering without changing grips accidentally.

If the canonical rig, hilt length, equipment sockets, or IK constraints cannot support the intended grip, stop and correct that asset boundary or select a physically valid grip. Do not build a swing on top of a broken hold. Once approved, treat hand-to-hilt contact and weapon orientation as continuity constraints across anticipation, active, follow-through, and recovery phases.

Before exporting a weapon pose, project the intended grip-to-tip or grip-to-head vector through the authoritative gameplay camera. Record its screen-space length and angle. Reject vectors that become end-on, vertical when the skill needs a forward line, hidden by the actor, or indistinguishable from another action. Use camera projection math to choose a readable physically valid vector instead of repeatedly guessing three-dimensional wrist rotations.

Render deterministic phase images at approximately 0%, 20%, 40%, 60%, 80%, and 100% at both close and gameplay camera distances.

The phase set must show:

- readable anticipation/load;
- a distinct active/contact or release silhouette;
- whole-body force or channel direction;
- intentional weapon and free-hand positions;
- balanced follow-through;
- controlled recovery that returns cleanly to the locomotion/idle state.

Automatic failures:

- weapon hangs like a loose cane, points into the floor without intentional guard logic, or is controlled from a limp straight wrist;
- the support hand loses a required two-handed grip, clips through the hilt, or hides behind the torso instead of taking an intentional guard;
- hand targets pass while unconstrained elbows flare outside the shoulder/hand silhouette or create an anatomically implausible arm plane;
- arms move while knees, hips, and torso remain upright and inert;
- backward torso hinge or falling-looking lean without explicit action intent;
- broad arms-out or T-like pose instead of an intentional asymmetric gesture;
- sword or focus intersects the body or loses the intended grip;
- spell/buff hand merges into the head, hair, or torso and disappears at gameplay distance;
- feet hover, skate, penetrate, or change logical tile for an in-place action;
- recovery snaps directly to idle or returns to an old position;
- two different skills cannot be distinguished without their particle colors.

Do not continue to runtime wiring until the phase set passes.

### 5. Prove continuous motion, not selected screenshots

For every candidate, record:

- the candidate file byte length and cryptographic hash, plus the byte length/hash of the exact HTTP response loaded by the review browser;
- dense normal-speed runtime video through the actual mixer, crossfade, combat-speed multiplier, and return-to-idle path;
- 25% slow-motion video from the same capture;
- a dense contact sheet covering all transition frames;
- close gameplay-camera proof;
- normal gameplay-camera proof;
- debug samples for active clip name/time, character bounds, floor height, grid position, and event time.

Static phase images are necessary but never sufficient. A hidden lean, lift, snap, grip break, or timing collapse between phase images fails the clip.

No screenshot or video is valid evidence until the browser-loaded response matches the intended candidate byte-for-byte. Cache-bust the asset request, recreate the actor, and record the served hash. If the local and served byte lengths or hashes differ, discard the capture as stale instead of judging or changing the animation.

### 6. Enforce grounding and root-motion measurements

For an in-place humanoid action:

- logical grid X/Y remains unchanged for the entire clip;
- horizontal root travel remains zero except for tiny floating-point noise;
- deterministic posed floor error should remain within approximately 0.015 meters;
- dense runtime/crossfade floor error should remain within approximately 0.025 meters and must be visually imperceptible;
- any visible hovering, sinking, skating, or sliding fails regardless of the numeric threshold;
- contact-foot intervals in the contract must match what the video shows.

Moving attacks require authored displacement that matches both the contract and the logical simulation. A two-tile dash cannot be a stationary clip plus teleport, and a stationary attack cannot drift across the floor.

### 7. Review semantic readability at normal speed

Review the clip without relying on its label:

- Can the skill be named from the body/weapon silhouette before the effect lands?
- Is the telegraph long and clear enough for the intended counterplay?
- Is the active motion distinct from every other skill in the current kit?
- Does the contact/release marker match the visible strike, ward, heal, summon, or projectile release?
- Does the body recover balance naturally?
- Does the motion still read with starter-tier VFX disabled?
- Does it remain readable on the smallest supported viewport?

If the answer is no, fix the choreography or timing. Do not increase particle noise as a substitute.

### 8. Wire one shared actor-agnostic runtime path

- Register the approved contract once by skill/action ID.
- Resolve it through a function that accepts any compatible animated actor.
- Player input, tactical combat, real-time combat, dry-cast rehearsal, classed NPC AI, enemy AI, companions, summons, and PvP replication reference the same skill contract.
- Creature-specific skills may have different rigs and clips, but use the same contract structure and telegraph rules.
- Race/class/equipment variants are layers or retarget profiles, not duplicated combat logic.
- Fallback clip names are temporary compatibility guards, not permission to play an unrelated generic action.

### 9. Synchronize gameplay and presentation

At the contract event marker:

- apply damage/healing/resource/status/summon/ward results;
- emit the matching VFX/SFX/socket events;
- trigger hit reactions or target responses;
- record combat/network events for deterministic simulation.

Cooldowns and action locks use the contract duration and cancel rules. Return to idle or locomotion only after recovery, unless an explicit cancel, hit reaction, death, or higher-priority state interrupts it.

### 10. Validate before installing the shipping asset

Required automated checks:

- rig and bone mapping;
- required clip names and durations;
- root-motion and logical-tile policy;
- floor/foot-contact thresholds;
- weapon/off-hand grip distances;
- normalized telegraph/event/recovery/cancel ordering;
- shared registry uniqueness;
- gameplay/VFX event-marker synchronization;
- actor-agnostic contract usage;
- normal and slow preview generation;
- unit tests, typecheck, production build, and browser smoke test.

Only after those checks and human visual approval:

1. copy the candidate into the shipping asset path;
2. update the source/provenance Markdown and diagnostics/validation JSON;
3. hash the installed asset and confirm it matches the approved candidate;
4. rerun the full test, typecheck, build, and runtime capture suite;
5. commit the exact approved source, contract, asset, tests, and concise evidence.

## Required evidence package

Use a stable per-skill layout such as:

```text
animation-review/<skill-id>/<version>/
  source-and-license.md
  contract.json
  phase-close-00.png ... phase-close-100.png
  phase-gameplay-00.png ... phase-gameplay-100.png
  normal.mp4
  slow-25pct.mp4
  contact-sheet.png
  samples.json
  verdict.md
```

The verdict records PASS/FAIL for whole-body mechanics, grounding, grip, silhouette, semantic telegraph, event timing, recovery, gameplay-distance readability, mobile readability, and actor-sharing. Keep failed artifacts out of shipping directories; retain only the concise evidence needed to explain or reproduce a decision.

## Scaling across weapons, races, and classes

Build reusable motion families rather than duplicating every combination:

- stationary horizontal/frontal sweep;
- advancing slash;
- overhead chop;
- thrust/pierce;
- rising cut;
- 360-degree cleave;
- dash/lunge;
- retreating counter;
- shield bash;
- staff/polearm sweep;
- bow/crossbow shot;
- casting/channeling;
- summoning;
- guard/ward;
- recovery/healing;
- interaction.

Each family supplies human mechanics and root policy. The skill contract supplies semantic timing and geometry. Race/body retarget profiles preserve proportions. Equipment profiles define grips and sockets. Calling/specialization layers define combat personality. Power-tier layers scale amplitude, particles, sound, and environmental response without erasing the base telegraph.

## Systemic-failure checkpoint

If adjacent symptoms reappear—floating feet, arm-only attacks, animation/VFX desynchronization, player/NPC differences, multiple caller-specific speeds, or repeated clip fallbacks—stop patching individual call sites.

Map:

1. every writer: source clip, retarget/export, sanitizer, contract, mixer, caller, scheduler;
2. every reader: actor rig, weapon, gameplay event, VFX/SFX, camera, AI, network/PvP, player;
3. the invariant that should hold;
4. the first boundary where drift enters;
5. the smallest shared fix that enforces the invariant for all actors and modes.

Do not accept a per-character or per-button patch when the same skill or archetype is shared.

## Definition of done for one skill

- [ ] Semantic action brief approved.
- [ ] Source/license/provenance recorded.
- [ ] Review browser payload hash matches the intended candidate hash.
- [ ] Actor-agnostic skill-motion contract complete.
- [ ] Static grip-and-guard proof passes close front, close side, and gameplay views.
- [ ] Whole-body phase silhouettes pass close and gameplay views.
- [ ] No upright arm-only motion, backward hinge, T-pose, or disappearing gesture.
- [ ] Feet/root/grip measurements pass.
- [ ] Normal-speed video passes.
- [ ] 25% slow video and dense contact sheet pass.
- [ ] Telegraph is recognizable before resolution.
- [ ] Gameplay/VFX/SFX resolve at the shared event marker.
- [ ] Player and compatible NPC/enemy paths use the same contract.
- [ ] Mobile and desktop gameplay-camera proof passes.
- [ ] Tests, typecheck, production build, and browser smoke pass.
- [ ] Approved candidate hash matches installed shipping asset.
- [ ] Provenance, diagnostics, and validation files are updated.

If any box is unchecked, the animation is not production-ready.


## Creature animation lessons (issue #458, September 2026)

Owner rule: every lesson below is mandatory for future creature, boss, NPC and
mount animation passes. Do not rediscover them; apply them from the first build.

### Modelling and rigging
- Generate every animated subject from a four-view reference set (see the 3D AI
  Studio runbook). A single-view Tripo model gives skewed heads and jaw hinges.
- Living paws need real toe bones: four front / three rear on the Breachling
  family. Add them with the lane's GLB surgery (`lib/toe-rig.mjs`), never by a
  full Blender re-export; mesh bytes stay untouched, only the skin accessors and
  appended inverse-bind matrices change. Find claws as mesh-connected islands
  outside a wrist-centred sphere; mirrored paws share the left paw's core radius.
- Recalibrate the jaw hinge on every body: 14 degree rest gape about the true
  lateral axis. A transferred jaw rotation on a yawed source (Ravager) twists.
- Check the source forward axis before the first clip: the runtime and Motion
  Forge treat +Z (rotated by placement yaw) as forward. A mesh modelled facing
  +X (the Cinderbound Wardens) walks sideways until a fixed pivot rotation turns
  it onto the convention; correct it once in the shared actor factory, never
  per clip.
- Use anatomical limb poles (elbow back and slightly up, knee forward) kept close
  to the body line, and re-solve the neutral stance so idles, clip endpoints and
  IK share one limb configuration. A lateral pole component of 0.35 put the
  elbows 6-10 cm outside the shoulders and read as splayed, rubbery arms; 0.1
  keeps them under the shoulder like a cat's.
- Keep gait swings low: paw lift 5-6 cm in a walk, 9 cm in a trot, and only a
  shallow fold toward the limb root (fold 0.2-0.3). A high tuck folds the elbow
  past 45 degrees every step, which is the main "rubber arm" impression.
- Skin that hangs below a limb joint (heel/pastern weighted to the shin) must be
  part of the paw contact region, measured on the re-solved neutral, or it
  drags under the floor while the sole sits perfectly planted (Ravager RR).

### Solver
- Two-bone IK must be twist-consistent: build each bone's orientation from the
  limb-plane normal (hip-to-ankle direction x pole), never from the pose the
  solve started from. `setFromUnitVectors` chains flip 180 degrees.
- A planted paw keeps the orientation it landed with; only its height is fitted.
  Swings interpolate body-relative offsets from lift-off to landing, so pivots
  and fast drives never drag a paw out of reach.
- Plan footsteps automatically from per-frame IK feasibility on the posed body,
  plus a twist rule (step once the body has turned more than 50 degrees since
  landing) and flight phases (no landing while nothing is feasible). Hand-timed
  steps do not survive reach solving.
- Keep floor guards separate and narrow: tail guard, head guard (neck/head
  pitch), torso-only body guard, free-limb corrective about a world axis, and a
  direction-agnostic toe guard. A guard that lifts the whole body to save a limb
  locks the legs.
- Limb segments that must rest on the floor (forearms and shins of a collapse)
  are guarded only after the feet are solved; their FK pose before the solve is
  meaningless and lifts the body by whole leg lengths.
- Every floor guard (tail, head, torso, planted limbs) is neutral-aware: its
  margin never exceeds what the body's own neutral pose already has, or the
  first frame of every one-shot is lifted away from the neutral and the
  clip fails its own endpoint gate (the Stalker's low tail did exactly that).
- Bodies with a source-rig defect (a knee placed below its skin, Ravager right
  rear) get a documented per-body floor tolerance and a sink-capacity clamp
  instead of guard pops; the real fix is the remodel.
- Give every limb a fallback pole for the singular configuration (limb line
  parallel to the pole, e.g. a resting sphinx forelimb whose shoulder dropped to
  paw height): the joint goes down so the segment lies on the floor, and the
  limb plane keeps the side it used last frame instead of spinning.
- At free-window edges blend the paw target from the solved IK end to the FK
  end without re-applying lift, follow or curl: those are already inside the
  solved end, and a second lift raises the paw by the whole swing clearance in
  one frame.

### Choreography
- Attacks run 1.2 to 1.6 s: slow anticipation, a strike of 4 to 6 frames on a
  frame boundary, overshoot, recovery. Solve reach against the real 1.75 m
  adjacent-cell target and cap the extra travel; never fake contact at runtime.
- Loops must close exactly (idle breathing, tail spring lag, loop-safe noise).
- A quadruped collapse pivots at the pelvis and settles belly-down with feet
  planted; a lateral roll with planted feet is infeasible for these legs.
- Claws articulate: extend in swing, splay when planted, rake through strikes.
- A leap is not a tall step: open free windows for the rear legs before the
  launch and author the airborne tuck (thighs forward, shins folded); planner
  swings only arc toward a floor landing and leave the legs hanging. Let the
  planner re-plant everything on landing.
- An attack advances with a step, never a glide: authored root travel of about
  a quarter body length plus at most 0.2-0.3 m of reach solve. Sliding the body
  0.8 m to touch a far target reads as skating even when every planted paw
  passes the slide gate. Combat Review finds the true landing range instead.
- Strike surfaces aim at knee height or higher on a human target; a bite or
  swipe at the ankle reads as a slap. Keep the muzzle up at a spit release and
  above the floor at a pounce landing.
- A tail whip turns the body about 140 degrees with the tail extended through
  the target; a full 360 spin on skating paws reads as a pirouette.
- Locomotion cycles: keep vertical head pump under ~10 cm and pelvis bob a few
  centimetres; stacked half-period sines on root, spine, neck and head add up
  to visible jitter.
- Reactions need two or three frames of anticipation before the head drops;
  a 40 cm head fall in two frames reads as a pop.
- A collapse is a side lie, not a crouch: free all four paws once the legs
  buckle, author limp limb FK, roll the body onto one side and let the torso
  guard rest the ribs on the floor; head and neck settle last, then stillness.
  Roll the body about the PELVIS (not the root at the floor), roll to a full
  ~88 degrees, and adduct the limbs to the midline (roll about the body's
  forward axis) or the wide-stance lateral splay points straight into the
  floor and props the corpse up on a foot. The rest guard rests on the
  torso, limbs and paws with the claws posed first and re-applied after every
  rig reset; disable the free-limb correctives and toe curling during the
  collapse, since raising a resting limb lifts the body off the floor with it.

### Gates and review
- Mechanical gates before any visual review: floor, sole-patch slide, IK clamps
  and joint limits on planted limbs, per-frame rotation continuity, capsule
  self-collision, reach at the contact frame, exact neutral or closed-loop ends.
- Then an independent visual critic on contact sheets, then Motion Forge
  (solo, combat pair, interaction), then owner sign-off. Nothing is promoted to
  the dungeon runtime before that chain completes.
- Combat Review measures human weapon strikes from the clip itself (primary
  weapon tip speed peak, 80 ms before to 120 ms after) and sweeps the equipped
  weapon mesh against the target skin; mob strikes use the pack's reach-solved
  tip vertices. On a confirmed hit the defender's reaction is picked from the
  contact side (front/left/right/back in the defender's frame) and the attack
  weight (heavy names: jump, spin, heavy, smash, overhead, slam, charge, lunge,
  tail). "Run every attack" lists every attack of the pairing with its window,
  result, the closest range at which it lands, contact time, side, weight and
  the reaction clip. All of it is review evidence, never gameplay damage.
