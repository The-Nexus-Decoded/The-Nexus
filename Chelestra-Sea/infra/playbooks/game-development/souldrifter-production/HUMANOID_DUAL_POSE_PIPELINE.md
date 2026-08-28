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
Generate exactly one complete adult humanoid base body for 3D character production and animation rigging. Show the entire body from the top of the head to the soles of both feet, centered fully inside the frame with generous empty margin on every side. Use a strict symmetrical T-pose: torso upright and facing forward, both arms straight out horizontally at shoulder height, elbows straight, wrists neutral, hands open, every finger visible and separated, legs straight and slightly apart, and both feet flat and fully visible. Use a bald or neutral close-scalp head, modest opaque neutral underwear only, an unobstructed clean background, even lighting, and a clear readable silhouette. Preserve the exact requested ancestry, adult presentation, body build, proportions, and body identity.
```

Append this locked rejection block:

```text
Do not generate a portrait, bust, cropped body, seated pose, action pose, contrapposto, A-pose, bent or lowered arms, crossed limbs, hidden hands, clenched fists, fused fingers, missing fingers, extra fingers, duplicate limbs, mirrored anatomy, multiple people, child proportions, mannequin stand, pedestal, plinth, platform, turntable base, statue base, throne, rock, scenery, text, labels, UI, frame, watermark-like decoration, hair obscuring the body, class outfit, shirt, pants, robe, dress, armor, belt, boots, gloves, weapon, shield, sheath, quiver, jewelry, tattoo, backpack, permanent accessory, or any prop fused to or touching the body. Do not interpret Thick/Large-Framed as obese, belly-heavy, or as having a protruding gut.
```

An A-pose image created by an image model is supplemental review material only. It must be reference-conditioned from the selected identity, labeled `DETAIL_REFERENCE_ONLY`, and must never seed a separate 3D body. The production A-pose artifact comes from posing the accepted canonical rigged mesh.

## Mandatory production order

```text
locked humanoid identity/body brief
-> four-candidate strict T-pose full-body image bakeoff when required
-> full-body/no-pedestal/no-fused-gear rejection gate
-> owner source selection
-> exact charged-operation approval when applicable
-> one canonical 3D body generation or approved mesh intake
-> untouched source download, task receipt, and source hash
-> anomaly, topology, symmetry, scale, and full-body inspection
-> geometry cleanup, part separation, retopology/decimation, UV/PBR work
-> scale/origin/axis/pivot and modular-seam normalization
-> canonical rig/skin or documented retarget in T-pose
-> save and hash the normalized T-pose artifact
-> derive A-pose from the same mesh and skeleton
-> save and hash the normalized A-pose artifact
-> dual-pose deformation and modular-fit QA
-> preset/custom animation production
-> runtime assembly, gameplay proof, performance proof, and independent verification
```

All geometry-changing operations happen before final skin-weight acceptance. After the dual-pose gate, a geometry or topology change invalidates both pose proofs, skin weights, modular-fit proof, and downstream animation evidence.

If a provider requires an A-pose input, re-pose the accepted canonical mesh through the documented rig/DCC lane. Do not purchase or generate a second body. Preserve the provider-native bind/rest state in provenance and still deliver the normalized T-pose and A-pose artifacts.

## Required identity and provenance record

Each humanoid ledger entry must include:

```json
{
  "canonicalBodyId": "",
  "canonicalMeshSourceHash": "",
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
- auto-rig markers and required canonical bone chains are placeable and valid.

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
- Do not accept a pose-only lookalike as proof of the same identity.
- Do not allow an image model to invent clothing, gear, props, supports, or anatomy that becomes fused source geometry.
- Do not use an A-pose render to hide a failed T-pose rig or a T-pose render to skip A-pose deformation review.
- Do not continue to batch production when either pose fails on a pilot.
- Any exception requires an issue-linked owner decision naming the body, provider limitation, alternate method, cost effect, topology/identity safeguards, and rollback path.
