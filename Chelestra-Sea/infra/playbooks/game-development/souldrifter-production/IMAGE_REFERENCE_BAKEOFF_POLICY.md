# SoulDrifter Image Reference Bakeoff Policy

## Purpose

Create stronger 2D source/reference images for downstream 3D generation without wasting paid 3D-provider credits or accepting cropped/incomplete assets.

## Active image lanes

For each important new 3D-source image, generate four candidates when the required lanes are available:

1. Tripo Studio — Nano Banana
2. Tripo Studio — Nano Banana Pro
3. ChatGPT/OpenAI image candidate A
4. ChatGPT/OpenAI image candidate B

The exact Studio model labels and the account's current free/bonus image allowance must be verified in the authenticated Studio UI. Do not assume the Studio quota from public pricing or API state.

If one lane is unavailable, record it and produce the strongest available comparison set. Do not use paid Tripo 3D credits merely to compensate for a missing image lane.

## Studio/API separation

Tripo Studio image allowances, Studio 3D credits, API credits and CLI credentials may be separate.

Before the image bakeoff:

- verify Studio login/session;
- verify active plan/subscription;
- verify current Studio image allowance/bonus quota;
- verify Nano Banana and Nano Banana Pro are selectable;
- record sanitized allowance status without exposing credentials.

Use Studio image generation first while the owner-provided free/bonus allowance is active. API/CLI unavailability must not block Studio browser use.

## Full-asset framing — mandatory

Every primary source/reference image intended for 3D generation must show the **complete asset in frame**, not merely characters.

Apply to:

- characters and creatures;
- skeletons and corpses;
- weapons, shields and tools;
- armor, clothing and accessories;
- furniture and containers;
- doors, gates and architectural modules;
- statues, altars and fixtures;
- vehicles and mounts;
- environmental props and set pieces;
- any other object intended for 3D generation.

Requirements:

- entire asset visible;
- no cropped head, feet, limbs, blade tip, handle, base, supports, chains, straps, attachment points or other critical geometry;
- clear readable silhouette;
- sufficient negative space around the object;
- neutral or purposeful view suitable for 3D interpretation;
- simple background unless environmental context is required;
- full attachment/support relationship visible for mounted/hanging fixtures;
- no text, frame, UI chrome, watermark-like decorative border or extra unrelated objects unless explicitly required.

For a chained skeleton, show the whole skeleton from skull to feet plus the full chain, shackle and wall-anchor relationship.

## Supplemental detail images

Close-ups, material studies, ornament crops and alternate details are allowed only as:

`DETAIL_REFERENCE_ONLY`

They supplement but never replace the primary full-asset image.

## Prompt contract

Every image prompt should include an explicit framing block such as:

```text
Show the complete asset fully inside the frame with generous empty margin on every side. Do not crop any part of the object or its attachments. The entire silhouette, base/supports and connection points must be visible. Use a clean unobstructed background and no unrelated objects.
```

For multi-view sets, keep scale, design, proportions, materials and attachment points consistent across views.

## Comparison process

A coordinator:

1. creates the same locked design brief for all four candidates;
2. records provider/model/seed/settings when exposed;
3. stores each original image and hash;
4. rejects any candidate that violates full-asset framing before aesthetic scoring;
5. blinds the provider labels for an independent AI comparison when practical;
6. scores silhouette, completeness, 3D interpretability, topology clarity, material clarity, consistency and style fit;
7. presents the best candidates to the owner;
8. stores owner selection and reasons;
9. uses only the approved full-asset source for downstream Tripo 3D work.

## Required record

```json
{
  "assetId": "",
  "briefVersion": "",
  "primary3DSource": true,
  "fullAssetRequired": true,
  "candidates": [
    {
      "provider": "TRIPO_STUDIO_NANO_BANANA | TRIPO_STUDIO_NANO_BANANA_PRO | CHATGPT_IMAGE",
      "path": "",
      "sha256": "",
      "fullAssetPass": false,
      "notes": ""
    }
  ],
  "selectedCandidate": "",
  "ownerApproval": "PENDING",
  "tripo3DTaskAuthorized": false
}
```

## Acceptance

No source image proceeds to 3D generation unless:

- the entire asset is visible;
- required attachments/support context is visible;
- the silhouette is clear;
- no critical geometry is cropped;
- selected design is consistent with the asset contract;
- the owner or authorized reviewer approves it.