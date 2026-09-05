# Universal Game Production Toolchain Preflight

## Frequency and scope

Run the full preflight once per workstation/template environment and cache the receipt. Re-run only invalidated or newly selected lanes.

No ticket may use a tool/provider lane until that lane is PASS. Unused lanes are explicitly `NOT_REQUIRED`.

## Gate 1 — Repository/tracker/storage

Verify:

- correct repo/worktree/ticket branch;
- live tracker/PR access;
- no unexplained dirty work;
- writable controlled staging;
- adequate disk space;
- source/derivative/download/evidence folders;
- asset-registry and rollback path.

## Gate 2 — Image/reference generation

Read `IMAGE_REFERENCE_BAKEOFF_POLICY.md` when the ticket creates primary 3D-source images.

The project profile defines the candidate lanes. A recommended important-asset comparison uses two studio/provider image models and two host-LLM image candidates.

Before generation:

- verify each active account/session and allowance/quota;
- distinguish Studio/browser quotas from API/CLI credits;
- record provider/model/version/settings/provenance;
- obtain exact approval for any paid image operation.

Every primary 3D-source image must show the **complete asset in frame**. This applies to characters, creatures, items, weapons, armor, furniture, architecture, doors, fixtures, vehicles and environment set pieces. Cropped close-ups are supplemental only.

## Gate 3 — 3D provider adapter

Each selected provider module must prove:

- all supported access lanes, such as Studio browser, API/SDK and official CLI;
- which credentials/credits/quotas are separate;
- active lane selection and fallback order;
- official SDK/API/package/repository;
- version and base URL/region;
- secret presence without exposing value;
- live read-only authenticated call when available;
- balance/account/allowance read when available;
- generation/upload/download/task-polling capabilities;
- required mesh-processing/rig/animation capabilities;
- controlled immediate download;
- provider URL expiry behavior;
- exact pricing/spend gate;
- provenance, hashes and rollback.

A blocked API/CLI lane must not block an authenticated Studio/browser lane when the project profile permits browser operation.

Provider success is not asset acceptance.

## Gate 4 — Official CLI/MCP

CLI/MCP are optional modules, not assumed capabilities.

Install only exact first-party packages/installers documented by the authenticated provider or official repository. Record publisher, version, commands and read-only proof.

Do not install similarly named third-party packages by guesswork.

MCP does not replace core SDK/API proof unless the project profile explicitly defines MCP as the authoritative provider lane and it passes equivalent authentication/capability tests.

## Gate 5 — DCC tools and license modes

For each selected DCC, record:

- version/build/path;
- Python/scripting availability;
- license category;
- project usage mode;
- file formats;
- required add-ons/plugins;
- import/export capabilities;
- harmless deterministic smoke test;
- commercial/prototype restrictions.

### Houdini

Read `HOUDINI_LICENSE_MODE_POLICY.md`.

When a project is genuinely `NONCOMMERCIAL_POC`, Houdini Apprentice may use the full FX features exposed by the installed build. Do not artificially replace particles, Pyro, FLIP/procedural water, Vellum, RBD, KineFX, terrain, lighting, materials, shaders, fog or volumetrics with crude placeholders merely because the license is free.

Apprentice restrictions still apply: non-commercial use/formats, no mixing into Indie/commercial pipelines, no Apprentice HDA through Houdini Engine, render/renderer restrictions and exact exporter limitations.

A free public app is not automatically non-commercial when it promotes a business, supports paid client work, solicits investment, monetizes related services or feeds a commercial production pipeline. Record the owner's project-use attestation and pause if the classification is uncertain.

Smoke-test the exact runtime/export representation. If the feature works but final export is restricted, preserve the full-fidelity POC source and schedule a clean licensed rebuild/export rather than lowering the creative target before proving the restriction.

### Blender

Record version, Python, add-ons, armature/action/NLA/constraint capabilities and GLB/FBX export proof.

## Gate 6 — Engine/runtime

Verify selected runtime/engine dependencies, asset loaders, animation playback, compression/optimization, test automation, logging, performance instrumentation and target-device execution.

## Gate 7 — Real target device/GPU

Final visual/performance acceptance must use actual target hardware/render APIs, not software emulation unless the project profile explicitly targets software rendering.

Record renderer/device, limits, performance metrics, console/errors and evidence capture.

## Gate 8 — Audio/media

When required, verify audio-generation/source policy, conversion, loudness/loop validation, spatial playback, video/evidence capture and transcode tooling.

## Gate 9 — Provider spend refresh

Immediately before every charged operation:

1. identify the active provider access lane;
2. live authenticated balance/allowance read for that lane;
3. current official price read;
4. expected and maximum cost;
5. retry-cost disclosure;
6. exact owner approval;
7. submit only approved operation;
8. record task ID, actual cost, result, download hash and remaining balance/allowance.

## Gate 10 — Provenance and license readiness

For every generated/baked asset, record:

- source/provider/tool/version;
- project usage mode;
- DCC license tier;
- source and export formats;
- commercial/non-commercial readiness;
- Engine/runtime compatibility;
- whether clean licensed rebuild/export is required;
- hashes, evidence and rollback.

## Cached toolchain receipt

```text
UNIVERSAL GAME PRODUCTION TOOLCHAIN RECEIPT
schemaVersion: <version>
receiptId: <id>
generatedAt: <timestamp>
stateRoot: <path>
repositoryTracker: PASS/FAIL
projectUsageMode: NONCOMMERCIAL_POC | EDUCATIONAL | LIMITED_COMMERCIAL_INDIE | FULL_COMMERCIAL | UNKNOWN
imageReferenceLanes:
  - <lane + PASS/FAIL/NOT_REQUIRED>
providerModules:
  - <module + active lane + PASS/FAIL/NOT_REQUIRED>
dccModules:
  - <module + license + PASS/FAIL/NOT_REQUIRED>
engineRuntimeModules:
  - <module + PASS/FAIL/NOT_REQUIRED>
realTargetDevices:
  - <device + PASS/FAIL/NOT_REQUIRED>
audioMedia: PASS/FAIL/NOT_REQUIRED
assetRegistryRollback: PASS/FAIL
blockingIssues: []
result: PASS|BLOCKED
```

Store the sanitized receipt outside Git and reference it by ID/path from sessions.