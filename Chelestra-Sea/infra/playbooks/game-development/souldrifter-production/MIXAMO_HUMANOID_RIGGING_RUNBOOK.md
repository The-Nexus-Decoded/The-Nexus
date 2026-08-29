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
- Capture the topology, UV, material, PBR-map, texture-resolution, and provider provenance receipts.
- Preserve the highest-resolution texture set as the offline master; derive runtime mips and material parameters later.

Hard gate: a geometry-only FBX with no UV layer is not the texture master. Obtain and audit the textured/UV-preserving Tripo package before material finalization.

### 4. Mixamo marker placement and rig

- Upload the clean centered skeleton-free T-pose geometry.
- Place and visually verify chin, wrists, elbows, knees, and groin before confirming auto-rigging.
- Use the full finger-capable standard skeleton unless a recorded runtime/LOD exception is approved.
- The accepted skeleton contract is currently 65 bones with `mixamorig:Hips` as the root.
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

- Finish body foundations before the dedicated head library unless the issue explicitly changes the order.
- Use one stable versioned neck/head seam per compatible body family.
- Heads require facial deformation targets/bones for speech and expression; the generated body-source face is temporary.
- Dialogue uses the same live 3D NPC head/shoulders in the conversation UI, not a disconnected portrait render.
- Validate neck seam, jaw, lips, cheeks, eyelids, eyes, brows, speech shapes, and expression blending.

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
