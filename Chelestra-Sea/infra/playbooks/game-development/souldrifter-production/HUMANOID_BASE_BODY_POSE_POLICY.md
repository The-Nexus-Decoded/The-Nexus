# SoulDrifter Humanoid Base-Body Pose Policy

## Purpose

Prevent the modular character pipeline from accepting a humanoid body from only one static pose and then discovering shoulder, wrist, hand, seam, clothing, or rigging failures later.

The owner requires **both a strict T-pose and a relaxed A-pose** for the first Human masculine and Human feminine POC pilots. The same dual-pose gate applies to later production body families unless a ticket explicitly records an approved exception.

## Core rule: one identity, two required pose proofs

Each pilot represents one canonical body asset and identity—not two unrelated bodies.

```text
one accepted body source/identity
-> strict T-pose technical proof
-> relaxed A-pose technical and visual proof
-> same geometry, proportions, materials, head seam and rig
```

Do not independently regenerate the T-pose and A-pose as different-looking people and call them one modular body.

A second paid 3D generation for the alternate pose is not implied. The default is one canonical mesh/rig demonstrated in both poses. A separate generation/comparison requires its own exact-cost owner approval.

---

# 1. Required source/reference package

For each of the first two Human pilots, prepare:

1. a full-body strict T-pose reference;
2. a full-body relaxed A-pose reference;
3. consistent front, left, rear and right identity/proportion guidance when the active provider workflow uses multiview inputs;
4. the same face/body identity, build, presentation, underwear, materials and scale across both poses.

The T-pose and A-pose images may be created from the same locked design brief and selected visual identity. They are not separate character designs.

Every image remains subject to the complete-asset/no-pedestal gate:

- entire head, hands, fingertips, legs and feet visible;
- generous margin around the full arm span and feet;
- one subject only;
- no pedestal, plinth, stand, platform, rock, throne or display base;
- no fused hair, class clothing, armor, boots, gloves, weapon, shield, belt, jewelry, backpack or permanent accessory;
- modest opaque neutral underwear only;
- no text, labels, UI frame, decorative border or unrelated prop.

For full arm-span T-pose references, use framing/aspect ratio that preserves every fingertip. A portrait crop or 3:4 frame that clips either hand is an automatic failure.

---

# 2. Strict T-pose contract

The strict T-pose is the topology, symmetry, hand, wrist, seam and rig-intake inspection pose.

Required:

- torso upright and centered;
- head level and facing forward;
- arms extended horizontally at approximately 90 degrees from the torso;
- shoulders level, not shrugged, collapsed or unnaturally pulled backward;
- elbows straight but not hyperextended;
- forearms rotated consistently around the forearm axis;
- palms readable from the intended technical review camera when requested;
- wrists neutral and inline with the forearms;
- no upward/downward “stop-sign” wrist bend used merely to expose the palms;
- all fingers present, separated and readable enough for reconstruction and skinning review;
- thumbs distinct and anatomically connected;
- legs straight with usable spacing;
- feet flat, fully visible and aligned consistently;
- no asymmetrical body twist unless explicitly required by anatomy.

Hard T-pose failures:

- cropped fingertips;
- palms made visible through a 90-degree wrist bend;
- fused or missing fingers;
- bent elbows masquerading as a T-pose;
- arms above/below the horizontal contract without approval;
- shoulder collapse, extreme clavicle lift or armpit webbing;
- left/right scale or limb-length mismatch;
- extra limbs or mirrored anatomy.

---

# 3. Relaxed A-pose contract

The A-pose is the production-rest, shoulder-deformation, clothing-fit and natural-silhouette inspection pose.

Required:

- same accepted body mesh/identity as the T-pose;
- torso upright and centered;
- shoulders relaxed and anatomically natural;
- arms lowered symmetrically, normally about 30–45 degrees from the torso;
- usable space between upper arms and torso for retopology, weighting and clothing fit;
- elbows and wrists neutral;
- hands and fingers visible, complete and nonintersecting;
- no hand/body or arm/torso clipping;
- legs and feet in the same accepted neutral stance unless the rig contract specifies a documented production stance;
- stable head/neck seam and no material or normal discontinuity caused by the pose conversion.

The A-pose must expose problems that a rigid T-pose can hide, including:

- shoulder volume collapse;
- armpit tearing or pinching;
- clavicle deformation;
- upper-arm twisting;
- elbow/wrist distortion;
- hand and finger weighting failure;
- head/neck seam gaps;
- clothing and armor collision near the shoulder, torso and hips.

---

# 4. Required 3D evidence

After the canonical body is generated, technicalized and rigged, capture both poses from the exact same accepted derivative:

```text
T-pose front / left / rear / right
A-pose front / left / rear / right
```

Also capture:

- close shoulders and armpits in both poses;
- close elbows, forearms, wrists, hands and fingers;
- head/neck seam;
- hips, knees, ankles and feet;
- wireframe/topology view where useful;
- material/normal continuity;
- body measurements and bounding box;
- rig/bone hierarchy and skin-weight report;
- exact source, derivative and evidence hashes.

Both pose sets must survive a clean export and fresh re-import before acceptance.

---

# 5. Relationship to rigging and animation

The selected technical bind/rest pose is recorded explicitly in the asset manifest. Neither “T-pose” nor “A-pose” is assumed from a filename.

Regardless of the final bind pose:

- the accepted rig must reproduce both required poses;
- the T-pose must remain available as a technical inspection/calibration action;
- the A-pose must remain available as a natural rest/fit inspection action;
- conversion between them must not change body identity or geometry version;
- animation retargeting must document its expected source and destination rest poses;
- clothing, armor, hair and equipment fit checks must include the A-pose and relevant animated extremes.

A provider-generated skeleton is not accepted merely because it can stand in one pose.

---

# 6. First Human POC gate

Required pilots:

1. Human adult masculine — `ATHLETIC_MUSCULAR`;
2. Human adult feminine — `ATHLETIC_MUSCULAR`.

For **each** pilot, owner review requires:

- approved strict T-pose source/reference;
- approved relaxed A-pose source/reference;
- accepted canonical 3D body;
- strict T-pose 3D proof;
- relaxed A-pose 3D proof;
- same-identity/hash lineage between pose proofs;
- no-pedestal/full-body pass;
- shoulder/wrist/hand/finger deformation pass;
- fresh export/re-import pass;
- owner verdict.

The remaining six Human bodies remain blocked until both pilots pass the dual-pose gate. Elf and Dwarf remain blocked until the complete eight-body Human baseline passes.

---

# 7. Machine-readable record

Every pilot/body ledger should include:

```json
{
  "posePolicy": "SOULDRIFTER_HUMANOID_T_AND_A_V1",
  "canonicalAssetId": "",
  "sourceIdentityId": "",
  "bindPose": "T_POSE | A_POSE | OTHER_APPROVED",
  "sourceReferences": {
    "strictTPose": { "path": "", "sha256": "", "status": "PENDING" },
    "relaxedAPose": { "path": "", "sha256": "", "status": "PENDING" }
  },
  "threeDProof": {
    "strictTPose": { "action": "", "evidence": [], "status": "NOT_RUN" },
    "relaxedAPose": { "action": "", "evidence": [], "status": "NOT_RUN" },
    "sameCanonicalMeshAndRig": false,
    "freshReimportPass": false
  },
  "ownerVerdict": "PENDING",
  "runtimePromotionAllowed": false
}
```

## Done rule

A modular humanoid body is not accepted from an A-pose-only image, a T-pose-only image, or a structural skeleton report alone.

It is accepted only when the same canonical body and rig pass both the strict T-pose and relaxed A-pose visual, topology, deformation, export/re-import and owner-review gates.