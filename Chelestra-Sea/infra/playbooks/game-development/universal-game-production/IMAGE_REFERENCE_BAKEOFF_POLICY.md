# Universal Game Production — Image Reference Bakeoff Policy

## Purpose

Produce complete, 3D-readable source images and compare multiple image-generation lanes before spending downstream 3D-provider credits.

This policy is provider-agnostic. Each project's overlay names the actual candidate models/providers and quota/spend rules.

## Candidate-lane contract

For important primary 3D-source images, the project profile should define two or more candidate lanes. A recommended four-candidate pattern is:

1. provider/studio image model A;
2. provider/studio image model B;
3. host-LLM image candidate A;
4. host-LLM image candidate B.

The project overlay may use Tripo Studio Nano Banana/Nano Banana Pro plus ChatGPT/OpenAI, or completely different providers.

Before generation:

- verify each active account/session and current allowance/quota;
- distinguish Studio/browser quotas from API/CLI credits;
- record whether each candidate is free, allowance-backed or paid;
- obtain exact approval for any charged image operation.

## Full-asset framing — universal hard gate

Every primary image intended for 3D generation must show the **complete asset in frame**.

This applies to all asset categories, including:

- characters and creatures;
- weapons, tools and equipment;
- clothing and armor;
- furniture and containers;
- architecture and modular building pieces;
- doors, gates and windows;
- statues, fixtures and wall-mounted objects;
- vehicles, aircraft and machines;
- plants, rocks and environmental set pieces;
- puzzle pieces and interactive props;
- any other object intended for 3D generation.

Requirements:

- entire asset visible;
- no cropped critical geometry, supports, attachments or extremities;
- clear silhouette;
- adequate negative space;
- consistent proportions/materials across multi-view images;
- simple unobstructed background unless placement context is necessary;
- full mounting/support relationship visible for hanging or attached fixtures;
- no unrelated objects or presentation frame unless explicitly required.

Close-ups are supplemental `DETAIL_REFERENCE_ONLY`; they do not replace the full-asset source.

## Prompt block

```text
Show the complete asset fully inside the frame with generous empty margin on every side. Do not crop any part of the object, supports, attachments or connection points. Keep the entire silhouette visible against a clean unobstructed background.
```

## Comparison and selection

1. Use one locked design brief for all candidates.
2. Store originals, prompts, model/version/seed/settings when exposed, and hashes.
3. Reject framing failures before aesthetic scoring.
4. Compare completeness, silhouette, 3D interpretability, topology clarity, material clarity, view consistency and project style fit.
5. Blind provider labels for independent AI comparison when practical.
6. Present finalists to the owner/authorized creative reviewer.
7. Record the selected source and rejected reasons.
8. Do not start downstream paid 3D generation until the primary full-asset source is accepted.

## Project configuration example

```json
{
  "imageReferenceBakeoff": {
    "enabled": true,
    "candidateCount": 4,
    "candidateLanes": [
      "STUDIO_MODEL_A",
      "STUDIO_MODEL_B",
      "HOST_LLM_A",
      "HOST_LLM_B"
    ],
    "fullAssetFramingRequired": true,
    "detailImagesAreSupplementalOnly": true,
    "ownerSelectionRequired": true
  }
}
```

## Acceptance

A primary source cannot proceed to 3D generation unless the full asset and all critical attachments are visible, the design is internally consistent, provenance is stored, and the selected candidate is approved.