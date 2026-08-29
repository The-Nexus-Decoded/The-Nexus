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

Complete the full master-list audit and current-scope gap fill before presenting the review UI as exhaustive. Classify core and lower-level pilot requirements as `CURRENT_487_CORE`; search Mixamo first for every humanoid row, then use Blender only for verified provider gaps, derived variants, cleanup, contacts, transitions, or game-specific motion. Every current-core row needs a valid ingested candidate or explicit blocker before exhaustive review begins.

Future class-specific spellcasting identities are `DEFERRED_HIGHER_LEVEL` and do not block issue #487. Shared Mixamo magic variants can serve as generic pilot candidates, but they do not close future class-identity rows.

A Mixamo in-app Download click is not source acceptance. Require a browser completion receipt with the current resolved path, byte count, SHA-256, and successful Blender import. Small or truncated cache artifacts are failed transfers and must never be promoted, retargeted, or counted as candidates.

The exhaustive first-pilot decisions become the canonical semantic names, provider choices, transition/loop rules, contact/weapon rules, root-motion policy, and owner acceptance baseline for later foundation bodies. Those bodies reuse the decisions and source clips, then receive their own proportion-specific retarget, floor/contact correction, bake, and deformation/runtime QA.

### Real-person video reference gate

Before acquiring or creating any humanoid animation, search YouTube or another video source for a real person performing that exact action. Record the URL, publisher, retrieval date, time range, and observed mechanics: stance, balance, weight transfer, feet, hips, shoulders, hands or grip, contacts, anticipation, duration, follow-through, and recovery. Provider names and memory are not references.

If an exact fantasy action does not exist, build and record a reference packet from the closest real physical components. No Mixamo selection, derived edit, Blender/Houdini authoring, or procedural generation may begin until this packet exists. The candidate provenance must link back to it, and any candidate that contradicts it returns to `REWORK` or `REJECTED` before owner preview.

Preview at the intended game rate and compare candidate duration with the real-person reference. Do not time-compress deliberate interactions to make the preview shorter. Record source duration, candidate duration, and playback rate; rushed or unnaturally fast candidates return to `REWORK`.

For any object- or surface-dependent action, include a correctly scaled proxy object or environment contact in the neutral-body preview. Hand placement, leverage, contact timing, clearance, and object response must be visible. A body-only mime does not pass the owner-preview gate for lift, carry, place, doors, locks, valves, mining, chopping, climbing, or comparable interactions.

### Candidate preview and owner-verdict gate

Every newly generated, provider-derived, DCC-derived, custom, or procedural animation candidate follows this order:

1. generate the candidate and record its source, transform, hashes, semantic row, loop/one-shot intent, and preview contract;
2. render the candidate on the neutral accepted body and post the labeled preview in the active Codex chat;
3. record the owner's `APPROVE`, `REJECT`, or `CHANGE` verdict for that exact candidate and hash; and
4. queue only owner-approved candidates for the BREACH-V2 exhaustive runtime review.

A generated or structurally valid GLB is not accepted coverage and must not enter the BREACH-V2 queue before the neutral-body chat preview and owner verdict exist. Rejected candidates remain preserved as provenance. Changed candidates return to generation and repeat the gate.

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
