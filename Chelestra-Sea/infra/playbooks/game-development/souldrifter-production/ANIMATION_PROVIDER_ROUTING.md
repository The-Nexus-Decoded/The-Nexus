# SoulDrifter Animation Provider Routing

**Verified against public Tripo documentation:** 2026-08-24

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

## Tier 1 — Tripo preset retarget: default baseline lane

Use Tripo for:

- rig check;
- automatic skeleton/skin weights;
- locomotion presets;
- common combat actions;
- common hit reactions;
- common defeat/fall actions;
- common gestures and ambient motions;
- batch retargeting of up to the provider's current documented limit.

Every ticket must first search the live preset list before commissioning a custom motion.

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

A direct Tripo preset that passes the full technical, runtime, gameplay-camera, and owner acceptance gate does **not** require duplicate Houdini/Blender production.

## Tier 2 — Derived custom variants from Tripo presets

Use Houdini KineFX, Blender, or another approved DCC automation layer to derive additional game-specific clips from a Tripo-retargeted base motion.

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

- a verified Tripo first-party custom-motion feature exposed to the owner's account;
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
  "interactionConstraints": [],
  "tripoPresetSearchCompleted": true,
  "candidatePresets": [],
  "presetMatchScore": 0.0,
  "route": "TRIPO_PRESET | TRIPO_PRESET_DERIVED | VERIFIED_TRIPO_CUSTOM | DUAL_DCC_BAKEOFF | PROCEDURAL_RUNTIME",
  "dualBakeoffRequired": true,
  "bakeoffRecordPath": "",
  "rigFamily": "canonical-humanoid",
  "contactMarkers": [],
  "ownerApproval": "PENDING"
}
```

Do not label a motion `VERIFIED_TRIPO_CUSTOM` unless a live authenticated provider capability check proves that custom-motion input is supported.

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
- normal-speed gameplay-camera proof;
- contact and recovery timing;
- root-motion contract;
- socket/weapon/chain constraint proof;
- loop/transition proof where applicable;
- VFX/SFX/gameplay marker alignment;
- both combat modes when gameplay-related;
- Three.js GLB playback;
- real-GPU performance;
- provenance and rollback;
- dual-pipeline comparison when required;
- independent verification.
