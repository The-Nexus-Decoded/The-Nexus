# SoulDrifter Humanoid Dual-Pose Pipeline

## Purpose

Make every humanoid body ready for auto-rigging, retargeting, modular-equipment fitting, deformation review, and custom animation without paying for or maintaining two independently generated bodies.

## Owner-locked rule

Every new or regenerated humanoid must deliver both:

1. a strict symmetrical **T-pose** state; and
2. a relaxed symmetrical **A-pose** state.

These are two required pose states of **one canonical body mesh and one canonical skeleton**. They are not two independently generated character meshes.

```text
1 humanoid body identity
= 1 canonical mesh/topology/material set
+ 1 canonical skeleton
+ 1 T-pose artifact
+ 1 A-pose artifact derived from that same rigged mesh
```

Generating a second body merely to obtain the other pose creates identity, topology, UV, seam, proportion, and equipment-fit drift and is prohibited unless the owner explicitly approves a documented exception.

## Scope

This policy applies to every playable humanoid, humanoid NPC, and other biped intended to use the canonical humanoid animation family. It applies to text-to-image, image-to-3D, text-to-3D, imported meshes, local modeling, auto-rigging, manual rigging, retargeting, and animation production.

Non-humanoid creatures follow their approved species/rig contract and do not inherit this rule automatically.

## Human visual-source contract

Human foundation bodies use realistic adult anatomy, believable faces, grounded proportions, and restrained realistic-fantasy material response. They are not cartoon, chibi, toy-like, miniature, or exaggerated World-of-Warcraft-style characters. Existing high-detail Shadowknight images may be used only as references for realism, facial/anatomical quality, and SoulDrifter material mood. Do not copy their armor, class identity, weapon, silhouette, effects, or finished gear into a base body.

The canonical Human source remains bald or close-scalp, gearless, and clothed only in modest opaque neutral underwear. Hair, class clothing, boots, gloves, armor, belts, jewelry, weapons, effects, and permanent accessories remain separate modular assets.

## Body-first modular-head boundary

Complete and validate the Human body foundations before beginning the dedicated facial/head library. A generated body's face is a temporary neutral placeholder; body-source acceptance prioritizes the approved body silhouette, proportions, anatomy, strict palms-down T-pose, clean neck region, and rigging readability. Technicalization later creates the stable versioned neck/head seam used by the modular head system.

The later facial phase must reuse one compatible gaze, jaw, blink, expression, and viseme contract across the modular head families. NPC dialogue, quest, and conversation UI present a live head-and-shoulders view of the same fully animated 3D NPC asset already used in the world. Do not author a second dialogue-only face, head mesh, skeleton, or facial-animation library. An isolated UI presentation instance is allowed only when it references the same canonical mesh, materials, skeleton, facial controls, and animation assets.

## Owner-locked humanoid provider route

For biped humanoids, Tripo is the canonical Smart Mesh, topology, texture, and PBR source. Export the accepted clean centered T-pose with the Tripo humanoid skeleton and Tripo biped animations excluded. Adobe Mixamo is the default humanoid marker-placement, auto-rigging, skinning, and preset-animation lane.

Before Mixamo rigging, visibly place and verify the chin, wrists, elbows, knees, and groin markers on the front-facing T-pose. Use the full finger-capable standard skeleton unless a recorded runtime-budget exception requires a reduced skeleton. After rigging, validate root/pelvis/spine centering, shoulder and upper-arm orientation, elbows, wrists, fingers, hips, knees, ankles, and feet before previewing any motion. A provider-completed rig is not an accepted rig.

Tripo creature rigging remains the default for animals, non-humanoid monsters, and other non-biped body plans. Those assets follow their species/rig contract rather than the Mixamo humanoid contract.

## What each pose is for

### T-pose: generation and rig calibration

The T-pose is the mandatory primary source and calibration state because it gives the rigging lane unobstructed access to the shoulders, elbows, wrists, hands, fingers, hips, knees, ankles, and body silhouette.

Use it for:

- primary text-to-image or image-to-3D body sources;
- topology, symmetry, and silhouette inspection;
- auto-rig marker placement;
- canonical joint-orientation and retarget calibration;
- skin-weight baselining;
- untouched rig/source receipts.

### A-pose: deformation and fit validation

After the canonical mesh has been rigged, derive the A-pose by rotating that same skeleton. Do not regenerate or remodel the body.

Use it for:

- shoulder and armpit deformation review;
- clavicle, upper-arm, elbow, wrist, and hand weighting review;
- soft-clothing drape and rigid-armor clearance;
- hair, shoulder, sleeve, glove, weapon, and offhand fit checks;
- custom-animation starting-state and transition QA;
- natural relaxed presentation proof.

The standard A-pose is symmetrical, with arms approximately 35-45 degrees below horizontal, elbows nearly straight, hands open and readable, legs neutral, and feet flat. A provider-native rest pose may be retained as provenance, but it does not replace either required normalized pose state.

## Humanoid generation prompt contract

The primary source prompt must explicitly say that the output is a complete animation-ready **body**, not a portrait, bust, costume design, miniature, statue, or finished class character.

Use this locked positive block for every humanoid primary-source candidate:

```text
Generate exactly one complete adult humanoid base body for 3D character production and animation rigging. Show the entire body from the top of the head to the soles of both feet, centered fully inside the frame with generous empty margin on every side. Use a strict symmetrical standard game-rigging T-pose: torso upright and facing forward; both arms straight out horizontally at shoulder height; elbows and wrists straight; both forearms pronated so the palms face directly downward and the backs of the hands face upward; fingers straight, naturally close together, and extended outward in the same direction as each arm; thumbs pointing naturally forward; legs straight and slightly apart; and both feet flat and fully visible. Use a bald or neutral close-scalp temporary head, modest opaque neutral underwear only, an unobstructed clean background, even lighting, and a clear readable silhouette. Preserve the exact requested adult presentation, body build, proportions, and body identity. Facial identity is a replaceable placeholder during this body-first phase.
```

Append this locked rejection block:

```text
Do not generate a portrait, bust, cropped body, seated pose, action pose, contrapposto, A-pose, bent or lowered arms, crossed limbs, palms facing the camera, palms facing upward, stop-sign hands, bent or sideways wrists, exaggerated fan-like finger splaying, hidden hands, clenched fists, fused fingers, missing fingers, extra fingers, duplicate limbs, mirrored anatomy, multiple people, child proportions, mannequin stand, pedestal, plinth, platform, turntable base, statue base, throne, rock, scenery, text, labels, UI, frame, watermark-like decoration, hair obscuring the body, class outfit, shirt, pants, robe, dress, armor, belt, boots, gloves, weapon, shield, sheath, quiver, jewelry, tattoo, backpack, permanent accessory, or any prop fused to or touching the body. Do not interpret Thick/Large-Framed as obese, belly-heavy, or as having a protruding gut.
```

An A-pose image created by an image model is supplemental review material only. It must be reference-conditioned from the selected identity, labeled `DETAIL_REFERENCE_ONLY`, and must never seed a separate 3D body. The production A-pose artifact comes from posing the accepted canonical rigged mesh.

## Four-provider owner source-selection gate

Every humanoid body identity requires an owner-review bakeoff before image-to-3D conversion. Generate exactly one strict-T candidate from each standard live Tripo Studio image lane using the same locked identity/body brief:

1. `Nano Banana 2`;
2. `Nano Banana Pro`;
3. `GPT Image 1.5`;
4. `GPT Image 2`.

The labels above are the live lineup observed on 2026-08-28, not permanent aliases. If a label is removed or materially changed, record provider drift and obtain an issue-linked owner decision before substituting another model. The base `Nano Banana` fast lane remains a fallback rather than a fifth standard candidate.

For every candidate, select one image, a 1:1 square frame, and native `4K Resolution` before submission. A post-generation upscale does not satisfy this source contract. Preserve the untouched full-resolution file and record candidate ID, exact model label, prompt/brief version, generation time, native-4K state, pixel dimensions, SHA-256, displayed cost, actual charge, and hard technical verdict.

Post all four completed images in the active Codex thread, labeled A-D with their provenance and `PASS` or `FAIL` technical notes. Do not silently discard a failed candidate from the owner's comparison. The owner must explicitly select a candidate ID and hash or reject the round. The selected image may advance only if it also passes the strict-T, complete-body, hand/finger, anatomy, background, and no-fused-material gates. If an owner-preferred candidate fails, preserve the preference and generate a corrected replacement round; never send a technically failed source to 3D.

No Smart Mesh upload, charged image-to-3D submission, canonical source designation, or production A-pose work may begin before the four-image thread delivery and exact owner-selection receipt exist. The A-pose remains a same-mesh/same-skeleton derived artifact, not a separate four-image bakeoff.

## Tripo Smart Mesh contract for animated bodies

Every Human body generated in Tripo Studio must use the live **Smart Mesh** generation mode. The submitted-task evidence must visibly capture the exact provider/model label, Smart Mesh selection, topology choice, and face target before the charged action. The live Studio receipt on 2026-08-28 identifies the current lane as **Smart Mesh P2.0 Preview**; that label is observed provider state, not a permanent version pin. If the label changes, re-audit native-quad capability and record the new version before submission. If Smart Mesh is unavailable, disabled, replaced by HD Model, or its setting cannot be proven, stop before submission and request an issue-linked owner exception.

For an animated humanoid:

1. turn on Smart Mesh at generation;
2. choose native **Quad Face** topology for the production mesh;
3. set and record the face target before retopology; never leave an unrecorded `Auto` result as the production budget;
4. finish retopology and any manual hero-character loop correction before PBR texturing, auto-rigging, or skin-weight acceptance;
5. preserve or repair deformation loops at the face, neck, clavicles, shoulders, armpits, elbows, wrists, fingers, pelvis, hips, knees, ankles, and toes;
6. reject non-manifold geometry, internal shells, disconnected debris, fused fingers, collapsing loops, uncontrolled poles, or topology that cannot hold both required poses;
7. record the pre/post face and triangle counts, topology fingerprint, UV version, and any manual repair.

The current Human pilot target is **8,000 quad faces**, with an allowed intake range of **6,000-9,000 quad faces** (approximately 12,000-18,000 triangles) so the base body and head remain inside the existing desktop intake budget. A different target requires a recorded runtime-budget reason. The derived mobile LOD targets 7,000-10,000 triangles and is not the canonical deformation mesh.

Smart Mesh is a required starting topology and production accelerator, not an automatic acceptance verdict. Hero-character edge flow still must pass dual-pose deformation, modular-fit, runtime triangle, and visual inspection. Tripo's official current guidance documents Smart Mesh as native quad topology for editing/rigging/animation and recommends the order `Smart Mesh -> Retopology -> PBR -> Rig` for animated real-time assets.

## Mandatory production order

```text
locked humanoid identity/body brief
-> mandatory four-provider native-4K strict T-pose full-body image bakeoff
-> full-body/no-pedestal/no-fused-gear rejection gate
-> post all four full-resolution candidates in the active Codex thread
-> explicit owner source selection tied to candidate ID and SHA-256
-> exact charged-operation approval when applicable
-> one live-verified Smart Mesh canonical 3D body generation or approved mesh intake
-> untouched source download, task receipt, and source hash
-> anomaly, topology, symmetry, scale, and full-body inspection
-> Quad Face retopology to the recorded budget plus required manual hero-loop repair
-> geometry cleanup, part separation, UV/PBR work
-> scale/origin/axis/pivot and modular-seam normalization
-> export one clean centered skeleton-free T-pose for Mixamo
-> place and capture Mixamo chin/wrist/elbow/knee/groin markers
-> choose the full finger-capable standard skeleton
-> Mixamo auto-rig/skin only after the marker gate passes
-> inspect the complete T-pose skeleton and deformation before animation
-> save and hash the normalized T-pose artifact
-> derive A-pose from the same mesh and skeleton
-> save and hash the normalized A-pose artifact
-> dual-pose deformation and modular-fit QA
-> Mixamo humanoid preset acquisition and custom-animation routing
-> runtime assembly, gameplay proof, performance proof, and independent verification
```

All geometry-changing operations happen before final skin-weight acceptance. After the dual-pose gate, a geometry or topology change invalidates both pose proofs, skin weights, modular-fit proof, and downstream animation evidence.

If a provider requires an A-pose input, re-pose the accepted canonical mesh through the documented rig/DCC lane. Do not purchase or generate a second body. Preserve the provider-native bind/rest state in provenance and still deliver the normalized T-pose and A-pose artifacts.

## Skin-material ancestry gate

- Skin-tone variation is a material/mask family over an accepted UV-preserving body, not a duplicated body-generation lane.
- The Dark Elf blue-white/blue-gray material family is Elf-only.
- Human, Dwarf, Halfling, and every other non-Elf creator/review surface must hide or disable Dark Elf tones.
- The runtime material boundary must independently reject an Elf-only tone for a non-Elf body even if UI validation is bypassed.
- Normal deep/dark Human tones remain distinct from the Elf-only Dark Elf palette.

## Required identity and provenance record

Each humanoid ledger entry must include:

```json
{
  "canonicalBodyId": "",
  "canonicalMeshSourceHash": "",
  "sourceBakeoff": {
    "requiredProviderModels": [
      "Nano Banana 2",
      "Nano Banana Pro",
      "GPT Image 1.5",
      "GPT Image 2"
    ],
    "native4KRequired": true,
    "candidateIds": [],
    "allFourPostedToActiveCodexThread": false,
    "ownerSelectedCandidateId": "",
    "ownerSelectedCandidateSha256": "",
    "ownerSelectionReceipt": "",
    "status": "PENDING | PASS | FAIL"
  },
  "tripoSmartMesh": {
    "required": true,
    "providerModel": "<exact live Smart Mesh label>",
    "capabilityContract": "NATIVE_QUAD_GENERATION",
    "enabledAtSubmission": false,
    "topologyType": "QUAD_FACE",
    "targetQuadFaces": 8000,
    "preRetopologyFaces": 0,
    "postRetopologyFaces": 0,
    "postRetopologyTriangles": 0,
    "settingsEvidencePath": "",
    "status": "PENDING | PASS | FAIL"
  },
  "topologyFingerprint": "",
  "vertexCount": 0,
  "uvLayoutVersion": "",
  "materialSetVersion": "",
  "skeletonFamily": "",
  "skeletonVersion": "",
  "providerNativeRestPose": "T_POSE | A_POSE | OTHER | NONE",
  "tPoseArtifact": {
    "path": "",
    "sha256": "",
    "status": "PENDING | PASS | FAIL"
  },
  "aPoseArtifact": {
    "path": "",
    "sha256": "",
    "derivedFromTPoseRig": false,
    "status": "PENDING | PASS | FAIL"
  },
  "sameCanonicalMeshVerified": false,
  "dualPoseOwnerVerdict": "PENDING"
}
```

Pose artifact hashes may differ because stored transforms differ. The canonical source hash, topology fingerprint, vertex count, UV layout, material set, body identity, proportions, seams, and skeleton must match.

## Acceptance gate

The humanoid fails until both pose states pass.

### T-pose proof

- complete head-to-feet body and every finger visible;
- strict left/right symmetry with arms horizontal at shoulder height;
- no arm, torso, hand, thigh, or accessory occlusion that blocks rig review;
- flat visible feet and stable neutral root;
- correct anatomy, ancestry, presentation, and body-build contract;
- no pedestal, fused gear, hair, clothing, weapon, accessory, or unrelated prop;
- the exact live Smart Mesh model label and Quad Face topology evidence are present;
- the recorded canonical mesh remains inside the approved face/triangle budget;
- hero-character joint loops pass inspection rather than relying on the Smart Mesh label alone;
- Mixamo chin, wrist, elbow, knee, and groin markers are visibly placed and valid;
- the selected Mixamo skeleton is the full finger-capable standard skeleton unless an approved LOD exception is recorded;
- the resulting root, pelvis, spine, head, shoulder, upper-arm, elbow, wrist, finger, hip, knee, ankle, and foot chains pass front, side, and deformation inspection.

### A-pose proof

- derived from the accepted T-pose rig, with no body regeneration;
- same topology fingerprint, vertex count, UVs, materials, seams, proportions, and skeleton;
- symmetrical relaxed arm angle and readable hands/fingers;
- no shoulder collapse, armpit tearing, elbow inversion, wrist twist, hip/knee failure, or foot drift;
- modular hair, garment, armor, glove, weapon, and offhand clearance tested where applicable;
- normal-speed and slow-motion deformation evidence captured before animation acceptance.

No humanoid may be marked rig-ready, animation-ready, modular-fit-ready, `VERIFIED`, or `OWNER_READY` while either pose artifact or its evidence is missing, stale, or derived from a different mesh.

## Counting rule

Track body meshes and pose-state deliverables separately:

```text
N accepted humanoid bodies = N canonical meshes + 2N required pose artifacts
```

For the owner-locked Human baseline:

- first two pilots: 2 canonical meshes and 4 pose artifacts;
- remaining six Humans: 6 canonical meshes and 12 pose artifacts;
- complete eight-body Human baseline: 8 canonical meshes and 16 pose artifacts.

The doubled pose-artifact count does not authorize doubled paid 3D generation.

## Hard stops and exceptions

- Do not submit paid T-pose and A-pose body generations as separate bodies.
- Do not upload or submit a humanoid to Smart Mesh before all four standard source candidates are posted in the active Codex thread and the owner selects an exact technically passing candidate ID and SHA-256.
- Do not submit a Tripo humanoid with Smart Mesh disabled or unproven.
- Do not texture or rig the production body before Quad Face topology and the final face target are accepted.
- Do not accept a pose-only lookalike as proof of the same identity.
- Do not allow an image model to invent clothing, gear, props, supports, or anatomy that becomes fused source geometry.
- Do not use an A-pose render to hide a failed T-pose rig or a T-pose render to skip A-pose deformation review.
- Do not continue to batch production when either pose fails on a pilot.
- Any exception requires an issue-linked owner decision naming the body, provider limitation, alternate method, cost effect, topology/identity safeguards, and rollback path.
