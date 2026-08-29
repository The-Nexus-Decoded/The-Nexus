# Tripo Studio Visible Recording Runbook

Status: mandatory pilot evidence procedure for SoulDrifter issue #487
Applies to: the Human masculine and feminine Athletic/Muscular pilots, then any later issue-authorized recorded production run

## Purpose

Record a clean, owner-visible account of the real Tripo Studio production path so the pilot can be reviewed now and edited into an instructional video later. The recording proves what was shown and done. It does not approve a charge, validate a model, replace artifact hashes, or authorize a retry.

## Browser and session boundary

Use only one signed-in **Tripo Studio tab inside the Codex in-app browser**. Keep the work visible in that tab while operating it.

- Do not launch a fresh Chrome, Edge, Playwright, Selenium, or other controlled browser profile.
- Do not keep a second Tripo login session open.
- Do not attempt to defeat or automate around Cloudflare, CAPTCHA, bot detection, or human verification.
- Do not copy cookies, session storage, passwords, or authentication tokens into another browser or tool.
- Do not navigate through login, account-security, billing, payment-method, or identity screens while recording.
- If the signed-in in-app tab expires or requires verification, stop. Let the owner restore that same tab before resuming.

If the one allowed tab hits a WebGL initialization/context-loss failure, a persistent blank 3D viewport, or a provider HTTP 500 response, do not keep retrying inside that broken page state. Preserve any non-secret task ID or receipt already visible, close or release the failed tab, and then open exactly one clean replacement Tripo tab in the Codex in-app browser. Reuse the same signed-in account and task; do not resubmit a paid operation, create a second simultaneous Tripo session, open an external automation browser, or leave the failed GPU scene resident. Record the recovery and whether the clean replacement restored the viewport in the session receipt.

The single tab visible to the owner is the production session of record, including a clean replacement opened under the recovery rule above. A separate automation browser reaching Tripo is not equivalent evidence.

## Spend and repository boundaries

Recording is evidence, not spend authorization. Before the first charged click, the active issue ledger must show the exact candidate, visible current balance, exact expected charge, declared maximum charge, projected remaining balance, and the issue-required owner approval.

- A general willingness to use credits does not replace the recorded action-time approval required by the kickoff.
- Submit exactly one approved task. Poll or refresh that task; do not create duplicates.
- Never make an automatic paid retry. A failed, rejected, or incomplete generation returns to diagnosis and a new explicit approval gate.
- Do not batch-generate bodies or submit the remaining baseline while the two pilots are unaccepted.
- Do not generate a separate paid A-pose body. The A-pose is derived from the accepted T-pose mesh and rig.
- Do not modify, update, close, merge, or otherwise touch PR #460.
- Do not merge, deploy, release, or push merely because a recording or Tripo task succeeds.

## Recording safety and quality

Record the pilot workflow at **30 frames per second**. Prefer 1920x1080 capture when the desktop and Tripo controls remain legible; otherwise record the existing Codex app window at its native visible size without rescaling that hides labels.

Before recording:

1. Close or cover unrelated notifications and any panel that could expose private messages or secrets.
2. Disable the microphone. Do not record room audio or narration during the evidence take.
3. Disable system audio unless a later owner-approved instructional edit specifically needs it.
4. Confirm no password manager, clipboard history, email address, payment detail, API key, token, login prompt, password, or 2FA code is visible.
5. Start only after the already authenticated Tripo workspace and the non-secret issue/asset identifier are visible.
6. Keep the cursor movements deliberate and leave each important control readable for at least two seconds.

If any secret or authentication material appears, stop the recording immediately, quarantine that take, and create a clean replacement. Do not retain an unsafe take as normal evidence.

## External evidence location

Video evidence is local external evidence and must not be committed to Git. Create one timestamped UTC directory outside the repository:

```text
H:\CodexData\souldrifter-toolchain\evidence\487\tripo-studio\<YYYYMMDDTHHMMSSZ>\
```

Use these names for each pilot:

```text
human-masculine-athletic-muscular-tripo-pilot.mp4
human-masculine-athletic-muscular-recording-receipt.json
human-feminine-athletic-muscular-tripo-pilot.mp4
human-feminine-athletic-muscular-recording-receipt.json
```

Preserve each MP4 unchanged after its evidence take. Compute its SHA-256 after closing the recorder and record the hash, byte size, UTC start/end times, duration, frame rate, pixel dimensions, and redaction verdict in its receipt. In the repository ledger, store the masculine and feminine MP4 paths, MP4 hashes, receipt paths, and receipt hashes separately under `visibleRecording.pilotTakes`, keyed by the exact pilot asset IDs `human-masculine-athletic-muscular` and `human-feminine-athletic-muscular`. Never overwrite, reuse, or conflate one pilot's evidence with the other. The ledger must not store either video itself.

The overall recording and each keyed pilot take use only these lifecycle statuses: `PENDING`, `IN_PROGRESS`, `PASS`, `REJECTED`, or `INCOMPLETE`.

## Four-provider owner review gate

Before any Smart Mesh upload or image-to-3D submission for a humanoid body, record one four-image strict-T review round in the existing signed-in Codex in-app Tripo tab. Use the same locked body brief and exactly these live image-model lanes observed on 2026-08-28:

1. `Nano Banana 2`;
2. `Nano Banana Pro`;
3. `GPT Image 1.5`;
4. `GPT Image 2`.

For each lane, select one image, 1:1 square framing, and native `4K Resolution` before Generate Image. Capture the exact visible label, 4K switch, displayed cost, and balance. The base `Nano Banana` lane is a fallback and cannot silently replace a standard candidate. If the live labels drift, stop and record the changed lineup before any substitution.

Download and hash every untouched completed candidate. Post all four full-resolution images in the active Codex thread as A-D, each labeled with asset ID, exact model, generation timestamp, dimensions, SHA-256, and technical `PASS` or `FAIL` notes. Do not omit a failed completed candidate from the owner's comparison. Record the thread delivery and the owner's explicit selected candidate ID and hash, or the owner's rejection of the round.

A candidate can become the canonical Smart Mesh source only when it is both owner-selected and technically passing. If the owner prefers a candidate that fails a hard animation-source gate, preserve the preference, explain the defect, and create a corrected replacement review round after any required spend approval. Do not upload the failed image. An image-model A-pose is not part of this four-image set; derive the production A-pose from the accepted canonical rigged mesh.

## Strict-T source frame and hand-axis gate

Generate and edit each Human strict-T source in Tripo Studio at a **1:1 square aspect ratio**. The full horizontal fingertip-to-fingertip span must fit with readable empty margin on both sides while the complete head and both feet also remain visible. Reject 3:4 portrait framing for this lane: the masculine pilot proved that portrait framing can crop the hands even when the torso and feet fit.

Enable Tripo Studio's native **4K Resolution** switch **before every Human source-image submission**. Keep one image selected and visibly confirm the checked 4K switch, active source model, 1:1 ratio, displayed cost, and current balance before clicking Generate Image. A lower-resolution generation followed by the separate paid `4K` upscale action is evidence-only and does not satisfy this native-4K source contract. Do not use it as the canonical Smart Mesh input. Record the generation timestamp, native-4K state, source model, displayed cost, actual charge, and balance change in the receipt.

Before any upload or Smart Mesh configuration, inspect the source at full resolution. Both arms must stay exactly horizontal in a standard game-rigging T-pose. Both forearms are pronated so the palms face directly downward and the backs of the hands face upward; wrists remain straight, neutral, and inline with the forearms. Fingers extend naturally outward in the same direction as each arm without clenched fists, fusion, overlap, or exaggerated fan-like splaying, and the thumbs point naturally forward. Reject palms facing the camera or upward, edge-on hands, bent or sideways wrists, stop-sign hands, fused or unreadable fingers, or any correction that changes the owner-approved body identity.

If Tripo's source-image lane does not produce a source that passes all of those checks, stop that pilot as `INCOMPLETE`, preserve and hash every rejected attempt, and do not upload any candidate to Smart Mesh. A generic autorigging T-pose is not enough when it violates issue #487's stricter source contract.

## Live Smart Mesh version-drift gate

The live Tripo Studio observation on **2026-08-28** showed **Smart Mesh `P2.0 - Preview`**. That is an observed provider label, not a permanent version pin and not permission to assume that a future label has the same capabilities.

At the start of every recorded submission:

1. Show the visible provider/model label in the existing Tripo tab.
2. Show that **Smart Mesh** is selected rather than **HD Model**.
3. Show the topology control set to **Quad Face**.
4. Show the target set to **8,000 quad faces** for the Human pilots.
5. Record the visible label, date/time, topology, target, and capability verdict in the receipt.

If the label is no longer `P2.0 - Preview`, or the controls do not prove native-quad Smart Mesh generation, stop before upload or submission. Perform an issue-linked capability audit confirming native quad output, rig/animation suitability, topology control, and target-face behavior. Record the changed label and audit evidence. Do not silently substitute HD Model, assume compatibility, or submit while the audit is unresolved.

## Topology-routed head-extraction gate

The accepted Tripo body is the proportion authority for its body type. Create a matching base head only from that exact accepted body at its recorded, versioned neck seam. Preserve the accepted body scale, axes, origin, rest rig, UVs, materials, skin weights, and head/neck bone names, hierarchy, and rest transforms. A head from a visually similar body is not interchangeable evidence.

Route by the accepted mesh's proven topology before attempting any provider operation:

- **Quad Smart Mesh:** Tripo Studio's live segmentation control reported `Quad models don't support segmentation yet` on 2026-08-29. Do not click repeatedly, spend credits, convert to HD, remesh, or generate a replacement body. Use the cached Blender toolchain to bisect the exact canonical GLB at the versioned rest-rig neck plane. Emit a body-without-head and matching head, then fail closed unless fresh import proves the source SHA, 65-bone/root contract, UV/material identity, zero embedded actions, and identical body/head seam signatures. The reusable issue #487 builder is `scripts/build-human-foundation-modular-head.py`.
- **Non-Quad mesh with live segmentation support:** use the paid Tripo segmentation gate below. Do not assume support from an older observation; verify the live control first.

Tripo's official billing table observed on **2026-08-29** lists **Mesh Segmentation at 40 credits**. Treat this as current provider evidence, not a permanent price pin or standing spend authorization. Immediately before the operation, refresh the live/official price and return the exact body asset ID, source task/model ID, source SHA-256, operation, expected credits, maximum approved credits, current balance, projected remaining balance, and action-time owner approval. Submit exactly one approved segmentation task and never auto-retry it. This runbook update does not authorize any paid action.

Official references:

- [Tripo billing](https://platform.tripo3d.ai/docs/billing)
- [Tripo model editing and mesh segmentation](https://platform.tripo3d.ai/docs/editing)

For a supported Tripo result, capture and hash the untouched segmented result and each returned part. For the Quad Blender route, hash the canonical source, builder, emitted modular GLB, provenance receipt, and front/side/separated-seam evidence. Record the body type, seam version, scale/axis/origin contract, part names, bytes, and SHA-256 values. Either route proves geometry separation only. It does not create facial edge flow, shape keys, visemes, blink, gaze, jaw controls, expressions, or an animation-ready head; those are separately authored and validated in Blender.

## Required visible capture sequence

Keep one continuous 30fps pilot recording when practical. If a provider wait makes a continuous take unreasonable, use explicitly numbered segments under the same evidence directory and record every segment hash and time range in one receipt. Do not omit a charged action or splice it in a way that hides the submission count.

### 1. Candidate and source provenance

- Show the non-secret issue number, canonical asset ID, and source-candidate ID.
- Show the four-provider review set's A-D labels, active-thread delivery receipt, and exact owner-selected candidate ID and SHA-256.
- Show the selected strict-T source image at readable scale.
- Show the source provider/model label, checked native 4K setting, generation timestamp, and source SHA-256 from the sanitized ledger or receipt.
- Pause long enough to verify one complete realistic adult body, strict T-pose, full uncropped hands/fingers/feet, bald/close scalp, neutral opaque underwear, clean background, and no gear, props, pedestal, text, or anatomy defect.

### 2. Live Tripo production settings

- Show the exact live Tripo provider/model/version label.
- Show **Smart Mesh** selected and **HD Model** not selected.
- Show **Quad Face** and the **8,000** target.
- Show every other material, texture, privacy, and generation option that will affect the task.
- If a setting is hidden in an expandable panel, open it visibly before submission.

### 3. Cost and approval gate

- Show the visible current credit balance without exposing account identity or payment details.
- Show the exact charge displayed for the configured single task.
- Show the issue ledger's expected charge, maximum charge, and projected remaining balance.
- Show the action-time owner approval tied to the asset ID and amount using a sanitized receipt view.
- Do not click the charged action if any value is missing, changed, or above the approved maximum.

### 4. Upload and one submission

- Upload the approved strict-T source from its recorded path.
- Confirm the displayed image is the selected source and has not been cropped, replaced, or altered by the upload control.
- Re-show Smart Mesh, live version, Quad Face, 8,000 target, and displayed cost immediately before the charged click.
- Perform exactly one approved submission.
- Capture the returned task ID and submission time. Keep the task ID visible long enough to read.
- During provider processing, poll, refresh, or reopen that same task only. Never click Generate again to solve a wait.

### 5. Result inspection and untouched intake

- Show the completed task ID and result in both textured and untextured/clay views when available.
- Orbit slowly through front, both sides, back, top/shoulder, hands, pelvis, knees, and feet.
- Inspect for duplicate or missing anatomy, fused fingers, closed armpits, intersections, debris, broken facial structure, bad ground contact, asymmetry, and gear-like fragments.
- Show the visible topology/statistics view proving Quad Face output and record the returned face/triangle counts.
- Download the untouched source result once. Do not overwrite or edit it.
- Show the untouched filename, byte size, and SHA-256 in a sanitized receipt view without revealing unrelated local paths or shell history.

### 5A. Body-matched head extraction

- Show the exact accepted body task/model ID, source SHA-256, body type, and versioned neck seam.
- Show the accepted topology and route decision. For Quad, show the live unsupported verdict once and continue with the no-spend Blender route. For a supported non-Quad mesh, show the refreshed Mesh Segmentation price, current balance, projected balance, and exact action-time owner approval for this one operation.
- Show that the selected source is the exact accepted body, not a similar duplicate or later remesh.
- For a supported non-Quad mesh, perform one approved segmentation task, capture its task ID and submission time, and poll that task without submitting a retry.
- For Quad, run the cached exact-body Blender builder once, record its versioned neck plane, and require matching fresh-import seam signatures before review.
- Show the returned or locally emitted head/body parts and confirm the accepted scale, axes, origin, rest rig, UV/material identity, and head/neck bone contract remain unchanged.
- Download or emit once, then record the untouched output and per-part filenames, byte counts, and SHA-256 values.
- Label this capture `GEOMETRY_SEPARATION_ONLY`; do not claim facial-control or animation readiness.

### 6. T-pose rig and calibration proof

- Show the accepted canonical mesh in its normalized strict T-pose.
- Show the canonical skeleton/rig identity and any provider-native rest-state provenance.
- Inspect facial, neck, clavicle, shoulder, armpit, elbow, wrist, finger, pelvis, hip, knee, ankle, and toe loops before calling Smart Mesh acceptable.
- Show T-pose skinning and calibration checks, including open armpits, straight arms, neutral wrists, separated fingers, level pelvis, forward knees, flat feet, root placement, scale, and ground contact.
- Show the saved T-pose artifact identifier and SHA-256.

### 7. Same-rig A-pose derivation

- Derive the A-pose by rotating the **same accepted skeleton** on the **same canonical mesh**.
- Show that mesh identity, topology, UV/material identity, skeleton identity, and skin weights remain unchanged.
- Use the normalized symmetrical A-pose: arms approximately 35-45 degrees below horizontal, elbows nearly straight, hands open and readable, legs neutral, and feet flat.
- Show the saved A-pose artifact identifier and SHA-256.
- Do not upload, generate, purchase, remesh, or substitute a second body for this step.

### 8. Deformation and modular-fit review

- Show shoulder raise/lower, elbow bend, wrist rotation, finger curl/spread, neck turn, hip flex/abduction, knee bend, ankle flex, and a grounded locomotion sample.
- Show representative neutral underlayer or modular-fit clearance at shoulders, armpits, chest, waist, pelvis, knees, wrists, and ankles without hiding deformation defects.
- Play the acceptance motion once at normal game speed.
- Repeat the critical deformation portion slowly enough to inspect collapses, candy-wrapper twisting, clipping, weight spikes, sliding, or ground penetration.
- Include the gameplay-camera or intended isometric-distance view before ending the take.

## Recording receipt

Each recording receipt must be machine-readable JSON with at least these fields:

```json
{
  "schemaVersion": 1,
  "issue": 487,
  "assetId": "human-masculine-athletic-muscular",
  "browserBoundary": "SINGLE_SIGNED_IN_CODEX_IN_APP_TRIPO_TAB",
  "browserRecovery": {
    "required": false,
    "failure": "NONE | WEBGL_INIT | WEBGL_CONTEXT_LOST | BLANK_VIEWPORT | HTTP_500",
    "failedTabReleasedBeforeReplacement": true,
    "simultaneousTripoTabs": 1,
    "replacementRestoredViewport": true
  },
  "recording": {
    "externalMp4Path": "<absolute external path>",
    "sha256": "<sha256>",
    "bytes": 0,
    "startedAtUtc": "<ISO-8601 UTC>",
    "endedAtUtc": "<ISO-8601 UTC>",
    "durationSeconds": 0,
    "frameRate": 30,
    "width": 1920,
    "height": 1080,
    "microphone": "OFF",
    "secretsVisible": false,
    "redactionVerdict": "PASS"
  },
  "source": {
    "candidateId": "<candidate id>",
    "providerModel": "<source provider/model>",
    "sha256": "<source sha256>"
  },
  "tripo": {
    "observedModelLabel": "P2.0 - Preview",
    "observedAtUtc": "<ISO-8601 UTC>",
    "versionDriftAuditRequired": false,
    "versionDriftAuditVerdict": "NOT_REQUIRED",
    "generationMode": "SMART_MESH",
    "topology": "QUAD_FACE",
    "targetQuadFaces": 8000,
    "returnedQuadFaces": 0,
    "returnedTriangles": 0,
    "taskId": "<task id>",
    "submittedAtUtc": "<ISO-8601 UTC>",
    "untouchedDownloadPath": "<absolute external path>",
    "untouchedDownloadSha256": "<sha256>"
  },
  "bodyMatchedHead": {
    "requiredForThisTake": false,
    "bodyType": "<ancestry-sex-build>",
    "bodyAuthorityTaskOrModelId": "<provider id>",
    "bodyAuthoritySha256": "<sha256>",
    "neckSeamVersion": "<version>",
    "segmentation": {
      "operation": "TRIPO_MESH_SEGMENTATION | BLENDER_QUAD_EXACT_BODY_BISECT",
      "topologyRoute": "SUPPORTED_NON_QUAD_TRIPO | QUAD_BLENDER",
      "providerConstraint": "<live verdict or NOT_APPLICABLE>",
      "officialPriceObservedCredits": 40,
      "officialPriceObservedAt": "2026-08-29",
      "officialPriceSource": "https://platform.tripo3d.ai/docs/billing",
      "refreshedExpectedCredits": 0,
      "maximumApprovedCredits": 0,
      "ownerApprovalReceipt": "<issue-linked receipt>",
      "taskId": "<task id>",
      "automaticRetry": false,
      "untouchedOutputSha256": "<sha256>",
      "returnedParts": [],
      "claimBoundary": "GEOMETRY_SEPARATION_ONLY",
      "bodyAndHeadSeamSignaturesMatch": false
    },
    "bodyScaleAxesOriginPreserved": false,
    "restRigAndHeadNeckHierarchyPreserved": false
  },
  "spendGate": {
    "balanceBefore": 0,
    "expectedCredits": 0,
    "maximumApprovedCredits": 0,
    "actualCredits": 0,
    "projectedBalanceAfter": 0,
    "ownerApprovalReceipt": "<issue-linked receipt>",
    "automaticRetry": false
  },
  "poseArtifacts": {
    "canonicalMeshId": "<mesh id>",
    "skeletonId": "<skeleton id>",
    "tPoseArtifactId": "<artifact id>",
    "tPoseSha256": "<sha256>",
    "aPoseArtifactId": "<artifact id>",
    "aPoseSha256": "<sha256>",
    "aPoseDerivedFromSameRig": true
  },
  "captures": {
    "sourceAndProvider": "PASS",
    "smartMeshVersionQuadAndTarget": "PASS",
    "balanceCostAndApproval": "PASS",
    "singleSubmissionAndTaskId": "PASS",
    "untouchedDownloadAndHash": "PASS",
    "bodyMatchedHeadSegmentation": "NOT_REQUIRED | PASS | FAIL",
    "tPoseCalibration": "PASS",
    "sameRigAPoseDerivation": "PASS",
    "normalAndSlowDeformation": "PASS"
  },
  "prohibitedActions": {
    "paidRetry": false,
    "batchGeneration": false,
    "pr460Modified": false,
    "merged": false,
    "deployed": false
  }
}
```

Use the feminine pilot asset ID for its receipt. Replace zeros and placeholders with observed values; never invent unavailable evidence.

## Final recording acceptance

A pilot recording passes only when:

- it comes from the single signed-in Codex in-app Tripo tab, with any failed tab released before one clean replacement was opened;
- the MP4 is readable, 30fps, externally stored, hashed, and paired with a complete receipt;
- no login, password, 2FA, payment data, token, private message, microphone audio, or other secret is visible;
- the exact live Smart Mesh version, Quad Face selection, 8,000 target, current balance, exact cost, approval, single task ID, and untouched download hash are legible;
- when supported non-Quad head segmentation is part of the take, the refreshed exact Mesh Segmentation cost, action-time approval, exact accepted-body source binding, one-task/no-auto-retry proof, preserved coordinate/rig contract, and untouched per-part hashes are legible;
- when the accepted body is Quad, the unsupported segmentation verdict, no-spend route, exact canonical source SHA, versioned Blender seam, matching body/head seam signatures, preserved coordinate/rig/UV/material contract, and emitted artifact hashes are legible;
- no extraction receipt is presented as facial topology, facial controls, or animation-readiness evidence;
- T-pose calibration and same-mesh/same-rig A-pose derivation are both demonstrated;
- normal-speed and slow deformation review are both present; and
- no paid retry, batch generation, PR #460 change, merge, deployment, or release action occurred.

If any item fails, mark the recording evidence `REJECTED` or `INCOMPLETE`. A recording defect may justify a new no-charge evidence take, but it never authorizes repeating a paid Tripo operation.
