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

## Gate 2 — Host-LLM image generation

Use the active LLM's built-in image generator for concept/reference images when available.

Record tool availability, model/version when exposed, prompt/reference provenance, dimensions, controlled path and hash.

Do not spend a 3D provider's credits on 2D image generation by default when the host LLM can create the references. A project overlay may authorize an exception with exact reason/cost.

## Gate 3 — 3D provider adapter

Each selected provider module must prove:

- official SDK/API/package/repository;
- version and base URL/region;
- secret presence without exposing value;
- live read-only authenticated call;
- balance/account read when available;
- generation/upload/download/task-polling capabilities;
- required mesh-processing/rig/animation capabilities;
- controlled immediate download;
- provider URL expiry behavior;
- exact pricing/spend gate;
- provenance, hashes and rollback.

Provider success is not asset acceptance.

## Gate 4 — Official CLI/MCP

CLI/MCP are optional modules, not assumed capabilities.

Install only exact first-party packages/installers documented by the authenticated provider or official repository. Record publisher, version, commands and read-only proof.

Do not install similarly named third-party packages by guesswork.

MCP does not replace core SDK/API proof unless the project profile explicitly defines MCP as the authoritative provider lane and it passes equivalent authentication/capability tests.

## Gate 5 — DCC tools

For each selected DCC, record:

- version/build/path;
- Python/scripting availability;
- license category;
- file formats;
- required add-ons/plugins;
- import/export capabilities;
- harmless deterministic smoke test;
- commercial/prototype restrictions.

### Houdini

Apprentice exposes virtually the FX feature set but remains non-commercial/restricted. Indie is the limited-commercial production lane and requires fresh license/file-format/export validation.

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

1. live authenticated balance read;
2. current official price read;
3. expected and maximum cost;
4. retry-cost disclosure;
5. exact owner approval;
6. submit only approved operation;
7. record task ID, actual cost, result, download hash and remaining balance.

## Cached toolchain receipt

```text
UNIVERSAL GAME PRODUCTION TOOLCHAIN RECEIPT
schemaVersion: <version>
receiptId: <id>
generatedAt: <timestamp>
stateRoot: <path>
repositoryTracker: PASS/FAIL
hostLlmImageGeneration: PASS/FAIL/NOT_REQUIRED
providerModules:
  - <module + PASS/FAIL/NOT_REQUIRED>
dccModules:
  - <module + PASS/FAIL/NOT_REQUIRED>
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