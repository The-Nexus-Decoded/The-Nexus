# Universal Game Production — Houdini License Mode Policy

## Purpose

Separate **feature availability** from **license/output restrictions** so projects do not unnecessarily reduce visual fidelity while also avoiding invalid commercial or mixed-license pipelines.

This file is universal. The project profile/overlay declares the actual usage mode and allowed license tier.

## Required project usage mode

Every project using Houdini must declare one:

- `NONCOMMERCIAL_POC`
- `EDUCATIONAL`
- `LIMITED_COMMERCIAL_INDIE`
- `FULL_COMMERCIAL`
- `UNKNOWN_REQUIRES_REVIEW`

A project being free to users is not automatically non-commercial. Business promotion, client work, investment solicitation, paid related services, monetization or use inside a commercial production pipeline may change the appropriate license analysis.

This policy is an operational guardrail, not legal advice. When project purpose is uncertain, confirm with SideFX before relying on Apprentice outputs.

## Apprentice non-commercial POC lane

When the project is genuinely `NONCOMMERCIAL_POC`, do not artificially limit the prototype to basic Houdini effects.

Use the full FX features exposed by the installed Apprentice build when appropriate, including:

- particles;
- Pyro/fire/smoke;
- FLIP and procedural water;
- Vellum;
- RBD/destruction;
- KineFX;
- terrain/erosion/scattering;
- lighting, materials, shaders, fog and volumetrics;
- Solaris/Karma or other render paths permitted by the license;
- CHOPs, procedural animation and simulation caches;
- baked runtime representations supported by the installed build.

The free tier is not itself a reason to replace realistic water, lighting, shading, cloth, particles, destruction or animation with crude placeholders.

## Apprentice restrictions remain binding

The project must still enforce current SideFX restrictions, including as applicable:

- non-commercial use only;
- non-commercial scene/asset formats such as `.hipnc` / `.hdanc`;
- no mixing with Indie/commercial Houdini pipelines;
- no Apprentice-created HDA use through Houdini Engine or Engine Indie;
- render-resolution and wordmark restrictions;
- no third-party renderers;
- node-locked/non-floating behavior;
- exact exporter/output limitations of the installed build.

Never bypass restrictions by renaming files or using another DCC as a laundering step.

## Runtime/export policy

Houdini is an authoring/simulation tool; the target game/runtime receives baked/exported representations.

Every selected representation must pass an actual smoke test under the installed license:

- static mesh/interchange;
- textures, masks and material maps;
- flow/velocity/normal/displacement maps;
- sprite sheets/flipbooks;
- VAT;
- point/mesh caches;
- baked skeleton animation;
- metadata/procedural data consumed by the engine;
- another project-approved runtime representation.

If the required exporter is restricted under Apprentice:

1. preserve the high-fidelity non-commercial source;
2. record the actual restriction;
3. produce any allowed POC representation;
4. defer clean production export/rebuild to Indie/commercial;
5. do not lower the creative target before proving the restriction.

## Provenance fields

```json
{
  "projectUsageMode": "NONCOMMERCIAL_POC",
  "houdiniLicense": "APPRENTICE_NONCOMMERCIAL",
  "sourceFormat": "hipnc|hdanc|usdnc|other",
  "commerciallyReusable": false,
  "houdiniEngineCompatible": false,
  "requiresLicensedRebuildBeforeCommercialUse": true
}
```

## Indie/commercial transition

A license upgrade invalidates the cached Houdini receipt.

For Apprentice-to-Indie transition:

1. record the new license and eligibility;
2. create clean limited-commercial source formats such as `.hiplc` / `.hdalc`;
3. prevent non-commercial HDAs from auto-loading and downgrading the session;
4. rebuild/re-export from documented source data/scripts/settings;
5. revalidate command-line, Houdini Engine, renderer and exporter paths;
6. rerun runtime/device QA;
7. preserve Apprentice artifacts as non-commercial prototype history only.

Do not assume purchasing Indie automatically makes Apprentice-created sources/HDAs/exports commercial-ready.

## Preflight record

```text
HOUDINI LICENSE MODE RECEIPT
projectUsageMode: <mode>
ownerAttestationRecorded: yes/no
commercialPromotionOrClientUse: yes/no/unknown
versionBuild: <value>
license: <value>
featureAvailability:
  particles: PASS/FAIL/NOT_REQUIRED
  pyro: PASS/FAIL/NOT_REQUIRED
  flipWater: PASS/FAIL/NOT_REQUIRED
  vellum: PASS/FAIL/NOT_REQUIRED
  kinefx: PASS/FAIL/NOT_REQUIRED
  lightingShaders: PASS/FAIL/NOT_REQUIRED
requiredRuntimeRepresentation: <value>
exportSmokeTest: PASS/FAIL/NOT_REQUIRED
houdiniEngineRequired: yes/no
commercialReady: yes/no
blockingIssues: []
result: PASS|BLOCKED
```

## Decision rule

- Genuine non-commercial POC + feature/export works: use Apprentice at full available fidelity.
- Feature works but production exporter is restricted: prototype now, schedule clean licensed export/rebuild later.
- Commercial/Indie/full-commercial project: use the corresponding licensed lane.
- Unknown project purpose: pause license-dependent production until reviewed.