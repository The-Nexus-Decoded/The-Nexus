# SoulDrifter Mixamo Humanoid Rigging Runbook

Status: production contract for issue #487 and later humanoid batches

Provider split: Tripo Smart Mesh for humanoid body geometry/material source; Mixamo for humanoid rigging and source motions; Blender for normalization, retargeting, missing motions, and runtime export

Browser rule: use one existing Codex in-app browser tab at a time for Tripo, Mixamo, or runtime review, plus one local game server; reuse or release both before opening another

## Purpose

This runbook makes the accepted Human pilot repeatable across the 24 foundation bodies:

- 3 initial production ancestries: Human, Elf, and Dwarf;
- 2 sex presentations; and
- 4 body builds.

The 24 bodies are foundation assets, not 24 copies of one skinned character. The same procedure must produce independent receipts, rigs, animation bakes, materials, and runtime validation for every body.

## Non-negotiable rig architecture

Share these across compatible humanoids:

- the canonical Mixamo-compatible 65-bone naming and hierarchy contract;
- the checked-in/cached source-motion library;
- animation semantic names and runtime state-machine contracts;
- weapon and equipment socket semantics; and
- Blender normalization and validation tooling.

Do not share these as one unchanged artifact across all bodies:

- bind pose;
- bone placement or bone lengths;
- skin weights;
- final baked animation files;
- root-motion distance;
- foot-lock/contact correction;
- hand grip and weapon offsets;
- equipment-fit offsets; or
- collision/capsule dimensions.

Humans, Elves, and Dwarves have materially different proportions. Each body therefore receives its own Mixamo rig, proportion-correct bind pose, skinning, per-body retargeted animation exports, and deformation QA. Halflings follow the same body-owned procedure when their separate future batch is enabled. A shared source clip is allowed; an unvalidated shared final bake is not.

## Cache once; bake and validate 24 times

Do not download the same Mixamo source pack 24 times. Capture each useful provider source once as `No Character`, checksum it, record its provider name and license/provenance, and keep it in the issue evidence cache.

For each of the 24 bodies:

1. retarget the approved source library to that body's accepted skeleton;
2. normalize naming, axes, root motion, and loop boundaries;
3. apply proportion-specific contact and socket corrections;
4. bake distinct body-owned FBX/GLB animation outputs;
5. run the complete deformation and runtime audit; and
6. write a body-specific manifest with source and output hashes.

Female bodies use the Mixamo female locomotion pack as their locomotion baseline. Male bodies use the male locomotion pack. Combat and interaction source clips may be shared when their semantics fit, but their final retargeted exports remain body-specific.

## Required execution order

### 1. Session and source receipts

- Confirm issue, branch, worktree, current commit, dirty state, provider balances, and current QA runtime head.
- Reuse the cached Blender/toolchain receipt. Do not reinstall when the receipt and binaries pass validation.
- Start a visible, crash-tolerant MKV recording before provider interaction.
- Reuse one existing Codex in-app browser tab. Do not launch external Chrome, Edge, a hidden browser, or a duplicate provider tab. Keep one local game server active and close/release it before starting another.

### 2. Four-image owner selection gate

- Generate two Nano Banana and two GPT native-resolution strict T-pose candidates.
- Post all four images in the owner thread.
- Record the selected candidate ID and SHA-256.
- Do not submit image-to-3D before the owner selection receipt exists.

### 3. Tripo body source

- Use Smart Mesh and Quad for the canonical game body.
- Preserve realistic anatomy, neutral underwear, clean neck region, full body, and the locked rejection prompt.
- Generate one body only. The A-pose is not a second body generation.
- Treat the exact accepted Tripo body as the proportion authority for its body type. Define and version the neck seam before head extraction.
- After a refreshed price check and exact-cost action-time owner approval, create one matching base head by Tripo mesh segmentation of that exact accepted body. Preserve the source body ID/task, SHA-256, scale, axes, origin, and untouched segmented-output hash.
- Tripo's official billing table observed on 2026-08-29 lists Mesh Segmentation at 40 credits. This is a refresh-required observation, not standing approval or a permanent price pin. Never auto-retry a paid segmentation task.
- Capture the topology, UV, material, PBR-map, texture-resolution, and provider provenance receipts.
- Preserve the highest-resolution texture set as the offline master; derive runtime mips and material parameters later.

Hard gate: a geometry-only FBX with no UV layer is not the texture master. Obtain and audit the textured/UV-preserving Tripo package before material finalization.

Hard gate: mesh segmentation separates geometry only. It does not supply facial topology, shape keys, visemes, blink, gaze, jaw controls, expressions, or an animation-ready head.

### 4. Mixamo marker placement and rig

- Upload the clean centered skeleton-free T-pose geometry.
- Place and visually verify chin, wrists, elbows, knees, and groin before confirming auto-rigging.
- Use the full finger-capable standard skeleton unless a recorded runtime/LOD exception is approved.
- The accepted skeleton contract is currently 65 bones with `mixamorig:Hips` as the root.
- Preserve the accepted rest rig and the head/neck bone names, hierarchy, rest transforms, and body scale while attaching or replacing the body-matched head.
- Verify front-facing pelvis/groin alignment, centered root, straight spine, shoulders, upper arms, elbows, wrists, fingers, hips, knees, ankles, and feet.
- Reject sideways, twisted, skewed, or asymmetrical auto-rigs and correct the markers before rerigging.

### 5. T-pose and A-pose artifacts

- Download and hash the normalized T-pose artifact.
- Derive the A-pose from that exact mesh and skeleton in Blender.
- Keep legs, feet, root, pelvis, and spine unchanged.
- Rotate the upper arms symmetrically to the approved relaxed 35-45 degree below-horizontal range unless a body-specific shoulder/deformation receipt justifies a narrower angle.
- Save and hash both pose artifacts plus a dual-pose Blender source.
- Audit mesh count, vertices, polygons, UV layers, armatures, root bones, Mixamo bone naming, armature modifiers, and actions after export.

### 6. Source-motion capture

Capture useful Mixamo packs as `No Character`. Capture individual clips as `Without Skin`. Preserve the provider filename, normalized semantic name, bytes, SHA-256, and selection settings.

The required source families include:

- male and female locomotion;
- general locomotion, turns, stops, crouch, jumps, falls, and recovery;
- unarmed combat;
- sword and shield;
- greatsword;
- one-handed axe;
- longbow draw, equip, nock, aim, release, recoil, cancel, and stow;
- rifle/firearm aim, fire, reload, movement, hit, and death;
- magic/casting;
- staff grip, idle, melee, channel, guard, draw, and stow;
- hit reactions, stagger, knockback, knockdown, and status reactions;
- multiple directional and special deaths;
- ladder, rope, wall, ledge, stair, and shimmy traversal;
- swimming, diving, surfacing, and drowning;
- doors, locks, chests, containers, levers, buttons, valves, pickup, loot, inspect, harvest, mine, chop, push, pull, and lift; and
- NPC idle, rest, listen, think, talk, point, wave, nod, greeting, and farewell.

Search Mixamo first. A Mixamo provider completion does not automatically pass QA. Use Blender only for verified missing motions, cleanup, contact fixes, transitions, or game-specific actions.

Do not accept a source because the in-app browser Download button was clicked. A failed in-app transfer can leave a small or truncated cache artifact. The download receipt must show browser completion, the current resolved file path, byte count, SHA-256, and a successful Blender import. Never promote partial cache bytes into the source library, retarget pipeline, or manifest.

The current 400-clip Human pilot export is a cached candidate intake pool, not 400 approved game animations and not proof that the required custom gaps were created. Keep it `CANDIDATE_INTAKE_ONLY` until the demand matrix maps every required semantic to a direct-provider, derived, custom, or procedural result and that result passes the pilot review. Spell-damage blowback/falls, the complete staff family, water surface/drowning, lockpicking, mining, chopping, farewell, special reactions, and damage-specific deaths remain explicit gap rows until their own evidence says `PASS`.

Reconcile the full master list and fill the current-scope gaps before presenting the review UI as exhaustive. Search Mixamo first for each humanoid demand; use Blender only after the ledger proves the provider gap or identifies cleanup/derived/game-specific work. Every `CURRENT_487_CORE` row needs a valid imported candidate or an explicit blocker before exhaustive review begins. Future class-specific spellcasting identities are `DEFERRED_HIGHER_LEVEL` and do not block #487; shared Mixamo magic variants remain generic pilot candidates rather than final class-identity animations.

The first Human pilot review is exhaustive. Its accepted semantic names, provider selections, loop/transition decisions, contact and weapon rules, root-motion rules, and owner rejections become the reusable canonical decision set for later bodies. Later bodies reuse those decisions and cached sources, but still require their own proportion-correct retarget, bake, grounding/contact repair, and deformation/runtime QA.

### Real-person video reference gate

Before searching Mixamo or creating a replacement in Blender/Houdini, search YouTube or another video source for a real person performing the exact humanoid action. Save the URL, publisher, retrieval date, exact time range, and a short mechanics brief covering stance, balance, weight transfer, footwork, hip/shoulder sequencing, hand placement or grip, contacts, anticipation, duration, follow-through, and recovery.

A provider title or remembered movement is not adequate evidence. Fantasy actions require recorded real-world analogues for each physical component. Do not generate, derive, retarget, or hand-author a candidate until the reference packet exists and is linked in candidate provenance. Reject or rework technically valid clips that do not match those observed mechanics.

Preview each candidate at its intended in-game speed. Compare and record reference duration, candidate duration, and playback rate. Never accelerate a deliberate interaction merely to shorten acquisition or review; rushed motions return to `REWORK` even when their poses are otherwise usable.

Preview object- and surface-dependent actions with a correctly scaled proxy prop or contact surface. Body-only miming cannot prove hand placement, leverage, contact timing, clearance, or object motion and therefore cannot pass the owner gate for lifts, carries, placement, doors, locks, valves, mining, chopping, climbing, or similar interactions. Keep the proxy strictly review-only: never bake or export it with the animation or character. Runtime objects remain separate entities bound through the approved sockets and contact markers.

### Candidate preview and owner-verdict gate

Every newly generated, provider-derived, DCC-derived, custom, or procedural animation candidate follows this order:

1. generate the candidate and record its source, transform, hashes, semantic row, loop/one-shot intent, and preview contract;
2. render the candidate on the neutral accepted body and post the labeled preview in the active Codex chat;
3. record the owner's `APPROVE`, `REJECT`, or `CHANGE` verdict for that exact candidate and hash; and
4. queue only owner-approved candidates for the BREACH-V2 exhaustive runtime review.

A generated or structurally valid GLB is not accepted coverage and must not enter the BREACH-V2 queue before the neutral-body chat preview and owner verdict exist. Rejected candidates remain preserved as provenance. Changed candidates return to generation and repeat the gate.

### 7. Per-body retarget and normalization

For every body and every accepted semantic clip:

- retarget onto that body's accepted skeleton;
- preserve the body's own rest/bind proportions;
- normalize coordinate system, scale, frame rate, and bone naming;
- separate root-motion and in-place variants where the runtime needs both;
- correct stride distance and planted-foot sliding;
- correct ground height, toe penetration, knee direction, hip drift, and root yaw;
- correct shoulders, elbows, wrists, fingers, and hand closure;
- correct weapon-hand paths and socket alignment;
- preserve loop continuity and event/contact frames;
- bake a body-owned output; and
- record source hash, output hash, Blender version, settings, and QA result.

Before a body-owned clip may enter manual review, run the automated frame-zero floor/root preflight:

1. sample the accepted bind/rest state, frame zero, and the first animated frame;
2. record the floor plane, actor bounds, lowest intended contact, root transform, pelvis transform, and planted-foot contacts;
3. apply one deterministic baseline correction in the export/normalization pipeline while preserving intentional vertical motion;
4. reject initial floating or penetration outside the declared tolerance, unexplained root/pelvis spikes, broken foot-contact continuity, or any output that depends on a scene-specific Y-offset; and
5. scan the complete body-owned library again whenever the exporter, source rest pose, scale, root-motion policy, or retarget profile changes.

Fix a failed shared rule in the normalization pipeline and rerun the scan. Do not accumulate per-room placement guesses that hide bad animation exports.

Do not assume an Elf, Dwarf, or Halfling passes because a Human passed. Shorter limbs and different torso/shoulder proportions require independent contact and deformation validation.

### 8. Texture and material restoration

- Rigging may use geometry-only FBX for provider compatibility.
- Final body assembly must restore the canonical Tripo UV/material source and audited PBR maps.
- Keep the 8K maps as offline masters; generate runtime mips/variants rather than manufacturing 8K textures during play.
- Skin-tone and character-creation variation uses material parameters/masks while preserving authored surface detail.
- Treat ancestry-restricted palettes as hard data and runtime-validation rules, not presentation hints. The Dark Elf blue-white/blue-gray palette is available only to Elf bodies; every Human, Dwarf, Halfling, or other non-Elf selector must hide or disable it, and the material application boundary must reject it even when called directly.
- Do not confuse a normal deep/dark Human skin preset with the separate Elf-only Dark Elf palette.
- Do not mark a body texture-ready when the audited mesh reports zero UV layers.

### 9. Modular head and facial system

- Read and enforce `HUMANOID_FACIAL_FIT_PIPELINE.md`. It is the repeatable fitting contract for every compatible adult humanoid head; a different head size or shape changes the hash-locked per-head landmark correspondence and correctives, not the standardized facial system or output names.
- Finish body foundations before the dedicated head library unless the issue explicitly changes the order.
- Use the accepted Tripo body as the proportion authority and create one matching base head per body type by segmenting that exact body at its stable, versioned neck seam.
- Preserve body scale/coordinate frame, the accepted rest rig, and the head/neck bone names, hierarchy, and rest transforms. Reject a head extracted from a merely similar body.
- In Blender, establish compatible facial topology and ordered vertices, then author and validate jaw/eye rigging, facial shape keys, visemes, blink, gaze, and expression blending. A Tripo segmentation success is not evidence for these controls.
- Keep the exact approved Smart Mesh head as neutral `Basis`; use a separate temporary Blender Rigify authoring rig with `face.skin_eye`, `face.skin_jaw`, and `face.basic_tongue`; bake the complete 52-name ARKit/MediaPipe-compatible expression contract and the 14 non-silent direct Meta-style speech-viseme targets; represent `viseme_sil` as zero speech weights; then strip every generated facial-rig object, bone, driver, constraint, modifier, and action before fresh-import proof of the unchanged 65-bone runtime skeleton. Do not double-drive a direct viseme by layering ARKit jaw or mouth targets over it.
- Seed the standardized vocabulary only from the hash-locked CC0 MakeHuman Community target packs recorded by `HUMANOID_FACIAL_FIT_PIPELINE.md`. Their autogenerated geometry is scaffolding, not acceptance evidence: transfer through one deterministic semantic landmark/surface correspondence per head, correct through the fitted Rigify controls, and self-reject every target that fails reference-driven multi-angle motion review.
- Before authoring or revising any facial motion, create a real-performance reference packet. Use real actor footage, facial-motion-capture footage, or authoritative training material; record the publisher, URL, retrieval date, exact video time ranges, camera view, and observed eyelid, eyeball, brow, cheek, jaw, lip, teeth, and tongue mechanics. Memory, a verbal label, and an isolated sculpt pose are not reference evidence.
- Use [Epic's official MetaHuman performance-capture video](https://www.youtube.com/watch?v=d3k9rfA9xjs), [Epic's video-capture guidelines](https://dev.epicgames.com/documentation/metahuman/metahuman-animator-video-capture-guidelines-in-unreal-engine), [Epic's identity-take guidelines](https://dev.epicgames.com/documentation/metahuman/metahuman-animator-identity-take-guidelines-in-unreal-engine), [Epic's expression-calibration examples](https://dev.epicgames.com/documentation/en-us/metahuman/expressions-for-likeness-calibration), and [Faceware's recommended range-of-motion shapes](https://support.facewaretech.com/faceware-recommended-rom-shape-list) as the minimum current facial-reference baseline. A later implementation may replace or extend these only with an issue-linked reference receipt.
- Compare neutral, half/full blink, eight-direction gaze, jaw open, lips part, and every speech viseme at normal speed from front, profile, and three-quarter views. Blink must produce a complete clean lid seal without squinting or eyeball deformation; lip separation and jaw drop must remain independently controllable; the jaw, chin, lower lip, cheeks, mouth cavity, teeth, and tongue must deform coherently without tearing or penetration.
- Self-reject a facial candidate that fails the reference comparison before owner review. A technically exported shape key, a still image, or a single camera angle is not facial-motion acceptance evidence.
- Derive face variants from this compatible topology. Skin tone stays material-driven; hair and facial hair stay separate, named, toggleable geometry.
- Use the same canonical animated 3D head in the world, player creator, NPC close-up, quest, and dialogue presentation. Do not ship a disconnected portrait or dialogue-only head.
- Derive `YOUNG_ADULT`, `MIDDLE_AGED`, and `ELDER` from the one body-matched base head in Blender. Use topology-preserving morph targets, age skin maps for wrinkles/folds/spots/roughness, and modular hair/facial-hair greying while preserving vertex order, seam, scale, jaw/eye rig, visemes, and expressions. Do not generate separate Tripo heads for adult ages.
- Treat children as a separate NPC-only family outside the current player creator. A child requires child body proportions, a matching Tripo-derived head/seam, a child-safe rig, independent clothing fit, camera/collision framing, and restricted age-appropriate animations. Retarget suitable adult motions only after child-rig validation; never shrink or age-morph the adult mesh into a child.
- Keep the legacy `SK_Hair_Buzzed`, `SK_Hair_Parted`, `SK_Hair_Long`, and `SK_Beard_Full` extraction pack at `PROVISIONAL_PILOT / OWNER_QA_PENDING`; it is temporary review material, not canonical appearance production.
- Validate the neck seam, jaw, lips, cheeks, eyelids, eyes, brows, speech shapes, expression blending, all adult age presets, modular hair/facial-hair clearances, and every required runtime presentation.

### 10. Runtime export and QA dungeon gate

- Export optimized runtime GLB/FBX assets with explicit LOD, materials, skeleton, animation names, sockets, bounds, and collision metadata.
- Integrate the pilot into the SoulDrifter QA branch containing the accepted current dungeon.
- Record the live QA commit before each run; do not describe QA as production.
- Validate spawn, scale, pivot, ground contact, locomotion, combat, deaths, interactions, camera framing, collision/LOS, equipment sockets, dialogue close-up, memory, draw calls, and frame time.
- Prove the rest state and representative locomotion, combat, reaction, and death clips grounded in the actual accepted BREACH-V2 real-game preview. Unit math, isolated Blender playback, and loader-only tests support but do not replace this proof.
- Nothing is promoted to `main` or deployed by this runbook without separate owner authorization.

Current BREACH-V2 QA integration receipt: PR #460 merged to `qa` at `7666af63bac70f8d48c864b4a85122975bdaa4cb` on 2026-08-28. This commit identifies the integration receipt, not a dungeon version label. Later runs must refresh and record the then-current QA head rather than assuming this commit remains current.

## Mandatory per-body output manifest

Every body manifest records at least:

```json
{
  "body_id": "ancestry-sex-build",
  "source_candidate_id": "provider-candidate-id",
  "source_image_sha256": "sha256",
  "tripo_model_id": "provider-model-id",
  "topology_mode": "smart-mesh-quad",
  "texture_master": {
    "resolution": "8K",
    "uv_layers": 1,
    "maps": [],
    "sha256": {}
  },
  "mixamo_character_id": "provider-character-id",
  "skeleton": {
    "family": "mixamo-standard",
    "bones": 65,
    "root": "mixamorig:Hips",
    "marker_receipt": "path"
  },
  "poses": {
    "t_pose": { "path": "path", "sha256": "sha256" },
    "a_pose": { "path": "path", "sha256": "sha256" }
  },
  "body_matched_head": {
    "body_authority_sha256": "sha256",
    "body_type": "ancestry-sex-build",
    "neck_seam_version": "version",
    "segmentation": {
      "operation": "TRIPO_MESH_SEGMENTATION",
      "official_price_observed_credits": 40,
      "official_price_observed_at": "2026-08-29",
      "price_source": "https://platform.tripo3d.ai/docs/billing",
      "refreshed_expected_credits": 0,
      "maximum_approved_credits": 0,
      "owner_approval_receipt": "path",
      "source_task_or_model_id": "provider-id",
      "untouched_output_sha256": "sha256",
      "automatic_retry": false
    },
    "rest_rig_and_head_neck_hierarchy_preserved": true,
    "facial_topology_and_controls": "pass|fail",
    "facial_performance_reference": {
      "sources": [],
      "time_ranges_and_observations": "path",
      "normal_speed_multi_angle_evidence": [],
      "self_review": "pass|fail"
    },
    "same_head_world_creator_npc_quest_dialogue": true,
    "adult_age_presets": ["YOUNG_ADULT", "MIDDLE_AGED", "ELDER"]
  },
  "appearance": {
    "hair_and_facial_hair": "MODULAR",
    "skin_tone": "MATERIAL_DRIVEN",
    "legacy_pack_status": "PROVISIONAL_PILOT|OWNER_QA_PENDING"
  },
  "child_family": {
    "player_creator_enabled": false,
    "separate_body_head_rig_required": true,
    "adult_resize_or_age_morph_allowed": false
  },
  "animation_inventory": {
    "candidate_count": 400,
    "status": "CANDIDATE_INTAKE_ONLY|REVIEW_IN_PROGRESS|APPROVED",
    "review_scope": "CURRENT_487_CORE",
    "deferred_scope": "DEFERRED_HIGHER_LEVEL",
    "required_semantics": 0,
    "approved_semantics": 0,
    "missing_semantics": []
  },
  "animations": [
    {
      "semantic_id": "walk_forward",
      "source_path": "cached-source-path",
      "source_sha256": "sha256",
      "download_receipt": {
        "browser_completed": true,
        "resolved_path": "current-resolved-path",
        "bytes": 0,
        "sha256": "sha256",
        "blender_import": "pass|fail"
      },
      "body_output_path": "body-owned-output-path",
      "body_output_sha256": "sha256",
      "root_motion": "in-place|root-motion",
      "floor_root_preflight": {
        "status": "pass|fail",
        "frame_zero_lowest_contact_m": 0,
        "baseline_correction_m": 0,
        "evidence": "path"
      },
      "qa": "pass|fail"
    }
  ],
  "runtime_qa": {
    "qa_commit": "commit",
    "dungeon": "breach-v2",
    "result": "pass|fail",
    "evidence": []
  }
}
```

## Stop conditions

Stop and repair before continuing when any of these occur:

- wrong or cropped source body;
- independent second body used as A-pose;
- malformed hands, fused fingers, missing limbs, or fused accessories;
- skewed marker placement or skeleton;
- nonstandard/reduced skeleton without an approved exception;
- zero-UV mesh being treated as the texture master;
- a body-matched head segmented from any source other than the exact accepted body at its recorded seam;
- changed body scale/rest rig or changed head/neck bone names, hierarchy, or transforms during head attachment;
- treating Tripo segmentation as facial-control evidence, or missing Blender topology, shape-key, viseme, blink, gaze, jaw, or expression validation;
- authoring or presenting facial motion without a real-performance reference packet, recorded mechanics, normal-speed multi-angle comparison, and self-review pass;
- a separate portrait/dialogue head rather than the canonical animated head;
- an adult age preset produced by a separate Tripo generation, or a child produced by shrinking/age-morphing the adult mesh;
- promoting the legacy appearance pack beyond `PROVISIONAL_PILOT / OWNER_QA_PENDING` without owner QA;
- a paid segmentation attempt without a refreshed exact price, action-time owner approval, or a one-task/no-auto-retry receipt;
- uncorrected foot sliding, root drift, penetration, or joint inversion;
- frame-zero floating, floor penetration, root/pelvis discontinuity, or a clip requiring a scene-specific Y-offset;
- treating the 400-clip candidate intake as a complete or approved animation matrix while required semantics remain missing, rework, or rejected;
- a browser download without a completion receipt, current-path byte count, SHA-256, and successful Blender import, including any small/truncated cache artifact;
- starting exhaustive review before every current-core demand has a valid ingested candidate or explicit blocker;
- queueing a candidate for BREACH-V2 before its labeled neutral accepted-body chat preview and exact owner verdict exist;
- unchanged Human bake reused as a final Dwarf/Halfling/Elf export;
- missing hashes, provenance, provider settings, or body manifest;
- external/duplicate browser use;
- unrecorded credit purchase, subscription change, merge, deployment, or production promotion; or
- a runtime asset that has not passed the current QA dungeon gate.

## Issue #487 pilot evidence roots

- Provider/model evidence: `H:\CodexData\souldrifter-toolchain\evidence\487\`
- Mixamo source packs: `H:\CodexData\souldrifter-toolchain\evidence\487\mixamo\packs\`
- Pilot body outputs: `H:\CodexData\souldrifter-toolchain\evidence\487\mixamo\human-masculine-athletic-muscular\`
- Visible recordings: `H:\CodexData\souldrifter-toolchain\evidence\487\recordings\`
- Cached Blender receipt: `H:\CodexData\souldrifter-toolchain\receipts\production-toolchain.json`

The evidence cache is not a substitute for committed manifests and runtime assets. Before completion, promote the required receipts/manifests into the issue branch, run repository verification, and report the final dirty/clean worktree state.
