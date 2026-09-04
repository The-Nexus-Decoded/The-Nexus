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

The accepted Tripo body is the proportion authority. A generated body's face is a temporary neutral placeholder while body-source acceptance prioritizes the approved silhouette, anatomy, strict palms-down T-pose, clean neck region, and rigging readability. After the body is accepted, create exactly one matching base head for each body type by segmenting that exact Tripo body at a recorded, versioned neck seam. Preserve the body's accepted scale and coordinate frame, rest rig, and head/neck bone names, hierarchy, rest transforms, and skinning boundaries.

Tripo mesh segmentation only separates geometry. It does not provide facial topology, facial rigging, shape keys, visemes, blink, gaze, jaw motion, or expressions. After segmentation, Blender must establish and validate compatible facial edge flow, ordered vertices, jaw and eye rigging, phoneme/viseme shapes, blink and gaze controls, and expression blending before the head is animation-ready. Face variants derive from this compatible topology; they do not introduce incompatible vertex order, neck seams, or alternate facial-control systems.

Facial motion is reference-driven, not guessed. Before sculpting or revising blink, gaze, jaw, lip, viseme, speech, or expression motion, build a real-performance packet from real actor footage, facial-motion-capture footage, or authoritative training material. Record publisher, URL, retrieval date, exact video time ranges, view, and observed eyelid, eye, brow, cheek, jaw, lip, teeth, and tongue mechanics. The current minimum baseline is [Epic's official MetaHuman performance-capture video](https://www.youtube.com/watch?v=d3k9rfA9xjs), [Epic's video-capture guidelines](https://dev.epicgames.com/documentation/metahuman/metahuman-animator-video-capture-guidelines-in-unreal-engine), [Epic's identity-take guidelines](https://dev.epicgames.com/documentation/metahuman/metahuman-animator-identity-take-guidelines-in-unreal-engine), [Epic's expression-calibration examples](https://dev.epicgames.com/documentation/en-us/metahuman/expressions-for-likeness-calibration), and [Faceware's recommended range-of-motion shapes](https://support.facewaretech.com/faceware-recommended-rom-shape-list).

The facial self-review gate compares neutral, half/full blink, eight-direction gaze, jaw open, lips part, and every speech viseme at normal speed from front, profile, and three-quarter views. Blink must close cleanly without squinting or deforming the eyeball. Lip separation and jaw drop remain independently controllable. Jaw, chin, lower lip, cheeks, mouth cavity, teeth, and tongue move coherently without tearing or penetration. Reject the candidate before owner review when the reference comparison fails; an exported shape key, one still, or one camera angle is not acceptance proof.

The same canonical animated 3D head must appear on the body in the world, character creator, NPC close-up, quest UI, and dialogue UI. Do not author a second portrait-only or dialogue-only face, head mesh, skeleton, or facial-animation library. An isolated UI presentation instance is allowed only when it references the same canonical body-matched head, materials, skeleton, facial controls, and animation assets. Hair and facial hair remain separate toggleable geometry, and skin tone remains a material-driven variant rather than a separately generated head.

Adult age presentation is also derived from the one body-matched base head. Blender creates topology-compatible `YOUNG_ADULT`, `MIDDLE_AGED`, and `ELDER` morph presets plus age-specific skin maps for wrinkles, folds, spots, and roughness, with modular hair and facial-hair greying. Every preset preserves vertex order, the versioned neck seam, body scale, jaw/eye rig, visemes, expressions, and the same world/NPC/dialogue identity. Do not buy or generate separate Tripo heads for adult age presets.

A true child is not an adult age preset. Children are a separate NPC-only character family and are not exposed in the current player creator. They require child body proportions, a matching Tripo-derived head and versioned seam, a child-safe rig, independent clothing fit, camera/collision framing, and a restricted age-appropriate animation set. Suitable adult motions may be retargeted only after the child rig passes its own validation. Never shrink the adult mesh or morph the adult age slider into a child.

The legacy appearance extraction pack and the issue #487 cap/shell candidates shown in the 2026-08-29 live review are `OWNER_REJECTED / QUARANTINED`. Their rigid scalp caps, exposed bands, floating facial hair, missing strand response, and ear/neck/torso intersections make them invalid even for temporary owner review. Their geometry must remain absent from the runtime provider GLB and creator discovery. Rebuild hair and facial hair against the exact canonical head using the modular-appearance gate in `HUMANOID_FACIAL_FIT_PIPELINE.md`; a clean-shaven/bald fail-closed creator is the required interim state.

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

## Paid mesh-segmentation gate for the body-matched head

Tripo's official billing table observed on **2026-08-29** lists **Mesh Segmentation at 40 credits**. This is current provider evidence, not a permanent price pin. Refresh the visible or official price immediately before the action, return the exact-cost receipt, and obtain action-time owner approval for that exact body, operation, and maximum charge. Submit one segmentation task only; never auto-retry, silently duplicate, or segment a merely similar body. This policy update does not authorize any paid operation.

Official references:

- [Tripo billing](https://platform.tripo3d.ai/docs/billing)
- [Tripo model editing and mesh segmentation](https://platform.tripo3d.ai/docs/editing)

The request and receipt must bind the operation to the accepted body's asset ID, source task/model ID, SHA-256, body type, scale/axis/origin contract, and neck-seam version. Preserve and hash the untouched segmented output and every returned part. A successful segmentation receipt proves geometry separation only; it cannot be used as facial-control or animation-readiness evidence.

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
-> define and record the body type's versioned neck seam
-> refresh the live Tripo mesh-segmentation price and obtain exact-cost action-time owner approval
-> segment the exact accepted Tripo body once; hash the untouched output and returned parts
-> preserve the accepted body scale/coordinate frame, rest rig, and head/neck bone hierarchy and transforms
-> establish compatible Blender facial topology, jaw/eye rigging, shape keys, visemes, blink, gaze, and expressions
-> validate one canonical body-matched animated head in world, creator, NPC close-up, quest, and dialogue presentations
-> derive Young Adult, Middle-Aged, and Elder presets from that head without changing vertex order or seam
-> keep hair/facial hair modular and skin tone material-driven
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
  "bodyMatchedHead": {
    "bodyType": "",
    "bodyProportionAuthoritySha256": "",
    "neckSeamVersion": "",
    "segmentation": {
      "providerOperation": "TRIPO_MESH_SEGMENTATION",
      "officialPriceObservedCredits": 40,
      "priceObservedAt": "2026-08-29",
      "priceSource": "https://platform.tripo3d.ai/docs/billing",
      "refreshedExpectedCredits": 0,
      "maximumApprovedCredits": 0,
      "ownerApprovalReceipt": "",
      "sourceTaskOrModelId": "",
      "sourceSha256": "",
      "untouchedOutputSha256": "",
      "automaticRetry": false,
      "status": "PENDING | PASS | FAIL"
    },
    "preservedRig": {
      "bodyScaleAndCoordinateFrame": false,
      "restRig": false,
      "headNeckBoneHierarchyAndTransforms": false
    },
    "facialControls": {
      "authoringTool": "BLENDER",
      "compatibleVertexOrder": false,
      "jawEyeRig": "PENDING | PASS | FAIL",
      "visemes": "PENDING | PASS | FAIL",
      "blinkGaze": "PENDING | PASS | FAIL",
      "expressions": "PENDING | PASS | FAIL",
      "performanceReference": {
        "sources": [],
        "timeRangesAndObservedMechanics": "path",
        "normalSpeedMultiAngleEvidence": [],
        "selfReview": "PENDING | PASS | FAIL"
      }
    },
    "adultAgePresets": ["YOUNG_ADULT", "MIDDLE_AGED", "ELDER"],
    "sameHeadEverywhereVerified": false,
    "status": "PENDING | PASS | FAIL"
  },
  "appearance": {
    "hairAndFacialHair": "MODULAR",
    "skinTone": "MATERIAL_DRIVEN",
    "legacyAppearancePack": "PROVISIONAL_PILOT | OWNER_QA_PENDING"
  },
  "childFamily": {
    "playerCreatorEnabled": false,
    "separateNpcBodyHeadContractRequired": true,
    "adultScaleOrAgeMorphAllowed": false
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
- the head is segmented from the exact accepted body at the recorded seam, and body scale, rest rig, and head/neck bone hierarchy/transforms remain unchanged;
- the same canonical animated head is proven in world, creator, NPC close-up, quest, and dialogue views;
- facial topology, jaw/eye rigging, visemes, blink, gaze, and expression blending pass independently of the segmentation receipt;
- adult age presets preserve vertex order, seam, scale, rig, visemes, and expressions; and
- any child character uses its own NPC-only body/head/rig contract rather than an adult resize or age morph.

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
- Do not submit Tripo mesh segmentation without a refreshed exact price and action-time owner approval tied to the exact accepted body; the current observed price is 40 credits, not standing authorization.
- Do not treat segmentation as facial-control authoring or accept a head before the Blender topology, shape-key, viseme, blink, gaze, jaw, and expression contract passes.
- Do not author or present facial motion without a real-performance reference packet, recorded mechanics, normal-speed multi-angle comparison, and self-review pass.
- Do not substitute a portrait-only or dialogue-only head for the canonical body-matched animated head.
- Do not generate separate Tripo heads for Young Adult, Middle-Aged, or Elder presets.
- Do not create a child by shrinking or morphing an adult body; children use a separate NPC-only family contract.
- Do not restore or relabel the owner-rejected appearance extraction pack. Only a fresh exact-head rebuild with new multi-angle, motion, collision, tint, greying, fresh-import, and owner-review evidence may enter the runtime provider GLB.
- Do not accept a pose-only lookalike as proof of the same identity.
- Do not allow an image model to invent clothing, gear, props, supports, or anatomy that becomes fused source geometry.
- Do not use an A-pose render to hide a failed T-pose rig or a T-pose render to skip A-pose deformation review.
- Do not continue to batch production when either pose fails on a pilot.
- Any exception requires an issue-linked owner decision naming the body, provider limitation, alternate method, cost effect, topology/identity safeguards, and rollback path.
