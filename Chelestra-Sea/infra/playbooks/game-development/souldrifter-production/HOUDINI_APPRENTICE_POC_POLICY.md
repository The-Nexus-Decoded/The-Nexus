# SoulDrifter Houdini Apprentice — Non-Commercial POC Policy

## Current project mode

The owner currently classifies SoulDrifter as a **free, non-commercial proof of concept / playable playground**:

- no paid access;
- no sale of the game;
- no client delivery;
- no monetized production release;
- used for experimentation, learning, internal review, and letting people play with the prototype.

This is an owner-supplied project classification, not an automatic legal conclusion. A free download/site can still become commercial if it is used to promote a business, solicit investment, sell related services/assets, support paid client work, or feed a commercial production pipeline. If the project purpose changes or is uncertain, pause and confirm the appropriate license with SideFX.

## Owner-locked production rule

For the current genuinely non-commercial POC phase, **do not artificially restrict Houdini Apprentice to simple effects**.

Use the full set of FX tools exposed by the installed Apprentice build when they improve the prototype, including as applicable:

- particles;
- Pyro/fire/smoke;
- FLIP and procedural water work;
- Vellum cloth, soft bodies, grains and constraints;
- RBD/destruction;
- KineFX rigging, retargeting, IK and animation processing;
- SOP/DOP/LOP procedural workflows;
- Solaris/Karma or other renderers included and allowed by the Apprentice license;
- lighting, materials, shaders, fog, volumetrics and look development;
- terrain, erosion, scattering and procedural environment tools;
- CHOPs, motion processing and simulation caches;
- VAT, flow maps, normal maps, sprite/flipbook sheets, baked textures and other runtime representations when supported by the installed license/export path.

The free license tier is **not** a reason to replace realistic water, lighting, particles, materials or animation with crude placeholders when the underlying feature is available in Apprentice.

## Apprentice restrictions that still apply

Using the game as a free POC does not remove SideFX's technical/license restrictions. The pipeline must still respect:

- non-commercial use only;
- Apprentice/non-commercial file formats such as `.hipnc` and `.hdanc`;
- no mixing Apprentice assets into an Indie/commercial Houdini pipeline;
- Houdini Digital Assets created in Apprentice cannot be used with Houdini Engine or Houdini Engine Indie;
- no Houdini Engine production/runtime integration through the Apprentice license;
- maximum 1920×1080 Houdini renders;
- wordmarked output when rendering to formats other than `.picnc`;
- no third-party renderers under Apprentice;
- node-locked/non-floating license behavior;
- any exact export limitations of the installed Apprentice build.

Do not attempt to bypass license restrictions through file renaming, conversion hacks, or another DCC.

## Three.js runtime integration during POC

Three.js remains the runtime. Houdini does not run in the browser.

The POC pipeline may use Apprentice to author and simulate content, then export/bake supported non-commercial derivatives for the prototype. Each ticket must smoke-test the exact representation and exporter under the installed Apprentice build rather than assuming it is available.

Possible prototype representations include, when supported:

- static meshes;
- OBJ or another permitted geometry interchange;
- texture maps and masks;
- flow/velocity maps;
- normal/displacement maps;
- sprite sheets/flipbooks;
- point caches or mesh sequences;
- vertex animation textures;
- baked skeleton animation;
- precomputed particle or trail data;
- runtime metadata consumed by Three.js.

If FBX, glTF/GLB, VAT, USD, Alembic, command-line export or another required output is disabled/restricted under Apprentice, record the actual blocker and route the final conversion through an allowed non-commercial path or wait for Indie. Do not silently downgrade the visual target without first proving the restriction.

## Asset/license provenance

Every Houdini-derived source and output created during the Apprentice phase must record:

```json
{
  "houdiniLicense": "APPRENTICE_NONCOMMERCIAL",
  "projectUsageMode": "NONCOMMERCIAL_POC",
  "sourceFormat": "hipnc|hdanc|usdnc|other",
  "exportFormat": "",
  "commerciallyReusable": false,
  "engineCompatible": false,
  "requiresIndieRebuildBeforeCommercialUse": true
}
```

Apprentice-created source/HDAs/exports remain in the POC lane. Do not later treat them as commercial-ready merely because Houdini Indie was purchased.

## Planned Houdini Indie upgrade

The planned Indie upgrade is still useful, but it is **not required to unlock the core FX feature set**. It primarily establishes a limited-commercial production/export/Engine/rendering lane and removes key Apprentice restrictions.

When Indie is activated:

1. invalidate the cached Houdini receipt;
2. record the Indie license and current eligibility;
3. create clean `.hiplc` / `.hdalc` production scenes/assets;
4. prevent `.hipnc` / `.hdanc` assets from auto-loading into the Indie session;
5. rebuild/re-export production deliverables from source data, scripts and documented settings under Indie;
6. revalidate command-line/Engine/export/render paths;
7. re-run Three.js and real-GPU QA;
8. keep the old Apprentice artifacts as non-commercial prototype evidence/rollback only.

Do not assume a normal Indie purchase automatically converts all Apprentice files into commercial-ready assets. If conversion is needed, follow current SideFX policy/support guidance.

## Preflight receipt fields

```text
HOUDINI POC PREFLIGHT
projectUsageMode: NONCOMMERCIAL_POC
ownerAttestationRecorded: yes/no
commercialPromotionOrClientUse: yes/no/unknown
versionBuild: <value>
license: APPRENTICE_NONCOMMERCIAL
featureAvailability:
  particles: PASS/FAIL
  pyro: PASS/FAIL
  flipWater: PASS/FAIL
  vellum: PASS/FAIL
  kinefx: PASS/FAIL
  lightingShaders: PASS/FAIL
  karmaOrAllowedRenderer: PASS/FAIL
requiredExportRepresentation: <value>
exportSmokeTest: PASS/FAIL/NOT_RUN
houdiniEngineRequired: yes/no
houdiniEngineAvailable: no
prototypeOnly: yes
blockingIssues: []
result: PASS|BLOCKED
```

## Decision rule

- If the project remains genuinely non-commercial and the needed feature/export works in Apprentice: use it.
- If a feature exists but the final exporter is restricted: prototype the effect and document the Indie conversion/export step.
- If the project becomes commercial, promotional, client-funded or monetized: stop relying on Apprentice outputs and move the affected lane to an appropriate license before continuing.