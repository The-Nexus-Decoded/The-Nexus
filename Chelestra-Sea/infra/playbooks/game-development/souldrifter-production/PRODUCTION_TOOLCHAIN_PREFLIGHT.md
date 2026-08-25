# SoulDrifter Production Toolchain Preflight

## Frequency

This is a **full workstation/toolchain bootstrap**, not a process repeated from zero in every chat.

Run it:

- once when the workstation has no valid cached receipt;
- when `SESSION_FAST_START.md` reports an invalidation trigger;
- after a major provider/DCC/runtime/license/secret change;
- for a newly required lane that was never bootstrapped.

Every normal chat loads the cached receipt. Immediately before a paid provider operation, it refreshes live balance/pricing and exact approval without rerunning the full toolchain suite.

## Core rule

A ticket-required lane must have a valid cached PASS or a fresh PASS. Unused lanes are `NOT_REQUIRED`.

The agent may install/configure routine tooling when shell/package-manager permissions allow. Ask the owner only for human-only authorization, billing approval, blocked elevation prompts, or secrets that must remain outside chat.

Never print, paste, commit, screenshot, or log secret values.

---

# Gate 1 — Workspace, Git, GitHub and storage

Prove:

- correct The-Nexus checkout/worktree/branch;
- live issue/PR access;
- no unexplained dirty work;
- H: drive staging/download/evidence roots are writable;
- adequate disk space;
- asset registry/provenance/rollback paths exist.

Required local evidence:

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
git remote -v
git worktree list --porcelain
```

---

# Gate 2 — Host-LLM concept/reference image lane

Use ChatGPT/Codex/M3/Claude native image generation first when available.

Record tool availability, prompt/reference provenance, model/version when exposed, dimensions, controlled path and hash.

Tripo 2D image credits remain disabled by default. An exception requires a specific owner reason and exact cost approval.

---

# Gate 3 — Tripo v3 3D provider connection

## Official reusable configuration

- provider config: `config/tripo-provider.json`
- one-time installer/check: `scripts/tripo/bootstrap-tripo.ps1`
- read-only authenticated check: `scripts/tripo/tripo-readonly-check.mjs`
- official SDK: `@vastai/tripo-sdk`
- official repository: `https://github.com/VAST-AI-Research/tripo-js-sdk`
- global v3 base: `https://openapi.tripo3d.ai/v3`
- secret name: `TRIPO_API_KEY`
- local tool root: `H:\CodexData\souldrifter-toolchain\tripo-v3\`
- local receipt: `H:\CodexData\souldrifter-toolchain\receipts\tripo-provider.json`

## One-time Tripo bootstrap

Run from the playbook checkout:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\tripo\bootstrap-tripo.ps1
```

The script:

1. verifies Node.js 18+ and npm;
2. verifies `TRIPO_API_KEY` is present without displaying it;
3. creates controlled local tool/download/task folders;
4. installs and locks the official `@vastai/tripo-sdk` package;
5. makes a no-charge authenticated `getBalance()` call;
6. verifies required SDK methods;
7. writes a sanitized persistent receipt.

It does **not** submit a charged generation task.

## Required Tripo capabilities

Verify:

- text/image/multiview-to-model;
- upload/download;
- segmentation;
- mesh completion/decimation;
- rig check;
- rigging;
- preset animation retargeting;
- task polling/listing;
- balance read.

## CLI/MCP policy

Do not install the older unverified generic `tripo-cli` package.

An official CLI is installed only when the authenticated Tripo console or current first-party documentation identifies the exact package/installer, publisher, version and health/auth commands.

MCP is optional and does not replace SDK/API proof.

## Cached Tripo receipt

Normal chats read the local receipt and verify:

- receipt schema/age;
- tool root/package lock still exists;
- `TRIPO_API_KEY` name is still present;
- no invalidation trigger fired.

They do not reinstall the SDK or rerun full capability discovery.

---

# Gate 4 — Tripo pricing and spend control

Before every charged 3D operation:

1. live authenticated balance;
2. current official pricing;
3. expected/max credits for each operation;
4. retry-cost disclosure;
5. exact owner approval;
6. submit approved task only;
7. record task ID, actual cost, URLs, immediate download hashes and remaining balance.

A general instruction to use Tripo is not approval for a paid task/batch.

---

# Gate 5 — Animation capability and routing

Read `ANIMATION_PROVIDER_ROUTING.md`.

Verify the live Tripo rig version and preset library. Do not claim arbitrary text-to-animation unless authenticated first-party evidence proves it.

Direct accepted Tripo presets may ship after QA.

Every required custom motion not adequately covered by Tripo—and every substantial constrained/interaction/class/weapon/boss/signature-death/acting motion—must follow `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`:

- Houdini KineFX candidate;
- Blender candidate;
- identical locked inputs;
- automated gates;
- blind AI review;
- blinded owner A/B verdict;
- winner integration;
- both candidates/metrics preserved.

---

# Gate 6 — Houdini

Detect and record:

- version/build;
- `hmaster`/`hython` paths;
- `hou` import;
- KineFX/required nodes;
- current license;
- scene/HDA format;
- SideFX Labs if required;
- GLB/FBX/Alembic/VAT/texture export capabilities;
- harmless deterministic smoke test.

Apprentice is prototype/non-commercial but includes particles/Pyro/Vellum/KineFX. The planned Indie upgrade invalidates the cached Houdini receipt and requires clean `.hiplc`/`.hdalc`, license, command-line/Engine/export and runtime revalidation.

---

# Gate 7 — Blender

Detect and record:

- Blender version/path;
- Python access;
- required add-ons;
- armature/constraint/action/NLA capabilities;
- import of the canonical rig;
- GLB/FBX export preserving the same skeleton/action contract;
- harmless deterministic smoke test.

---

# Gate 8 — Three.js/runtime and real GPU

Verify:

- project Node/package-manager versions;
- GLB/model/animation loading;
- compression/optimization tools;
- browser automation;
- renderer/device/WebGL limits;
- draw calls, triangles, textures and memory;
- real NVIDIA GTX 1080 Ti / ANGLE D3D11 path for current acceptance;
- software rendering rejected for final evidence;
- console/network/shader checks.

---

# Gate 9 — Audio/media

When required, verify approved audio source/generation, WAV/OGG conversion, loudness/loop checks, runtime spatial playback, concurrency and FFmpeg/evidence capture.

---

# Gate 10 — Asset registry/provenance/rollback

Before generated assets enter runtime:

- preserve concept/reference and untouched provider outputs;
- preserve prompts/task/model/version/cost/license;
- checksum every source/derivative;
- finish segmentation/geometry processing before final rig;
- validate topology, scale, pivot, materials, LOD, collision, rig/deformation, animation markers and runtime performance;
- publish accepted derivative only;
- retain rollback.

Provider success is not acceptance.

---

# Persistent receipt

```text
SOULDRIFTER PRODUCTION TOOLCHAIN RECEIPT
schemaVersion: <version>
receiptId: <id>
generatedAt: <timestamp>
workspaceGitHub: PASS/FAIL
storage: PASS/FAIL
hostLlmImageGeneration: PASS/FAIL/NOT_REQUIRED
tripoApiSdk3D: PASS/FAIL/NOT_REQUIRED
tripoOfficialCli: PASS/FAIL/NOT_EXPOSED
tripoMcp: PASS/FAIL/NOT_REQUIRED
houdini: PASS/FAIL/NOT_REQUIRED
houdiniLicense: <Apprentice|Indie|other>
blender: PASS/FAIL/NOT_REQUIRED
threejsRuntime: PASS/FAIL/NOT_REQUIRED
realGpuEvidence: PASS/FAIL/NOT_REQUIRED
audioMedia: PASS/FAIL/NOT_REQUIRED
assetRegistry: PASS/FAIL
blockingIssues: []
result: PASS|BLOCKED
```

Store it outside Git under `H:\CodexData\souldrifter-toolchain\receipts\` and load it through `SESSION_FAST_START.md`.