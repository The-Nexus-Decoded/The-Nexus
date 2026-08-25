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

# Gate 2 — Host/Studio concept-reference image lanes

Follow the current project image-source policy recorded in the project overlay and provider receipts.

Every primary 3D-source image must show the **complete asset in frame**:

- full character/creature body;
- full weapon/item/prop;
- full fixture/environment object plus required attachment context;
- no cropped critical geometry;
- clear silhouette and negative space.

Cropped close-ups are supplemental `DETAIL_REFERENCE_ONLY`, never the sole primary 3D source.

Record provider/model, prompt/reference provenance, dimensions, controlled path, hash and selection/rejection status.

---

# Gate 3 — Tripo 3D provider connection and lane routing

Read `config/tripo-provider.json` and the latest owner/provider policy.

Tripo access may exist in distinct lanes:

- API/SDK;
- verified official CLI;
- authenticated Studio browser.

Do not assume Studio and API/CLI credentials, credits or quotas are interchangeable.

At full bootstrap and when invalidated:

1. check whether API/SDK credentials exist;
2. make a no-charge authenticated read when possible;
3. check whether API/SDK has usable paid credits/tokens;
4. inspect any exact first-party CLI exposed by the authenticated provider;
5. verify Studio browser login, subscription/plan, usable 3D tools and any account-specific allowances;
6. select the active lane:
   - `API_SDK_PRIMARY` when authenticated and funded;
   - `OFFICIAL_CLI_PRIMARY` when separately authenticated/funded and documented;
   - `STUDIO_BROWSER_PRIMARY` when API/CLI are unavailable or unfunded but Studio is active.

A blocked API/CLI lane must not block the project when the authenticated Studio browser lane is usable.

The older unverified generic `tripo-cli` package remains prohibited unless current first-party Tripo documentation identifies that exact package.

## Tripo 3D capabilities

Verify through the active lane as applicable:

- text/image/multiview-to-model;
- upload/download;
- segmentation;
- mesh completion/decimation;
- rig check;
- rigging;
- preset animation retargeting;
- task status/history;
- controlled immediate download;
- balance/allowance visibility.

No charged task may run during connection preflight.

---

# Gate 4 — Tripo pricing, quotas and spend control

Before every charged 3D operation:

1. identify the active Tripo lane;
2. refresh live balance/credits/allowance for that lane;
3. read current price/cost shown for each operation;
4. state expected and maximum cost;
5. disclose retry cost;
6. obtain exact owner approval;
7. submit only the approved task;
8. record task ID, actual cost, immediate download hashes and remaining balance.

A general instruction to use Tripo is not approval for a paid task or retry.

---

# Gate 5 — Animation capability and routing

Read:

- `ANIMATION_PROVIDER_ROUTING.md`;
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` when custom animation is required.

Verify the live Tripo rig version and preset library available through the active lane. Do not claim arbitrary text-to-animation unless authenticated first-party evidence proves it.

Direct accepted Tripo presets may ship after QA.

Every required custom motion not adequately covered by Tripo—and every substantial constrained/interaction/class/weapon/boss/signature-death/acting motion—must produce:

- Houdini KineFX candidate;
- Blender candidate;
- identical locked inputs;
- automated gates;
- blind AI review;
- blinded owner A/B verdict;
- winner integration;
- both candidates/metrics preserved.

---

# Gate 6 — Houdini Apprentice non-commercial POC lane

Read `HOUDINI_APPRENTICE_POC_POLICY.md`.

## Current owner-declared mode

SoulDrifter is currently treated as a free, non-commercial POC/playground. Record the owner's attestation and whether any commercial, client, monetization, investment-promotion or business-marketing use exists or is uncertain.

A free public app is not automatically non-commercial merely because users are not charged. If project purpose changes or is ambiguous, pause and verify the appropriate SideFX license.

## Feature policy

When the project remains genuinely non-commercial, **do not restrict visual fidelity merely because the installed license is Apprentice**.

Detect and use all required FX features exposed by the installed Apprentice build, including where appropriate:

- particles;
- Pyro;
- FLIP/procedural water;
- Vellum;
- RBD/destruction;
- KineFX;
- procedural terrain/environment tools;
- lighting, materials, shaders, fog and volumetrics;
- Solaris/Karma or other Apprentice-permitted render paths;
- CHOPs and simulation caches;
- baked runtime representations such as textures, flow maps, flipbooks, VAT, caches and meshes when supported.

Do not replace realistic water, lighting, particles, shading or animation with crude placeholders until the agent proves that the required feature/export is genuinely unavailable or impractical.

## Detect and record

- version/build;
- `hmaster`/`hython` paths;
- `hou` import;
- KineFX/particles/Pyro/FLIP/Vellum/lighting/shader availability;
- current license;
- scene/HDA format;
- SideFX Labs if required;
- allowed renderer path;
- exact required export/bake path;
- harmless deterministic FX + export smoke test.

## Apprentice restrictions remain binding

Record and enforce:

- non-commercial use only;
- `.hipnc` / `.hdanc` / other non-commercial formats;
- no mixing with Indie/commercial pipelines;
- no Apprentice-created HDA use through Houdini Engine/Engine Indie;
- no Houdini Engine browser/runtime production path;
- 1920×1080 Houdini render limit;
- wordmarked non-`.picnc` renders;
- no third-party renderers;
- node-locked license behavior;
- exact export restrictions of the installed build.

Three.js remains runtime. Houdini Apprentice is an authoring/simulation tool, not a browser runtime.

Smoke-test the exact required GLB/FBX/OBJ/Alembic/VAT/texture/flipbook/cache representation. If the exporter is restricted, preserve the full-fidelity POC source, document the allowed prototype output and defer the final conversion/export to Indie rather than silently downgrading the effect.

Every Apprentice-derived artifact must be marked non-commercial and must require a clean Indie rebuild/re-export before commercial use.

## Planned Indie upgrade

The Indie upgrade invalidates the cached Houdini receipt. It primarily establishes the limited-commercial/export/Engine/rendering lane; it is not required to unlock the core FX toolset already exposed by Apprentice.

After Indie activation:

- create clean `.hiplc` / `.hdalc` sources;
- prevent non-commercial HDAs from downgrading the session;
- rebuild/re-export from source data/scripts/settings;
- revalidate command-line, Engine, renderer and export paths;
- rerun Three.js and real-GPU QA.

Do not assume an Indie purchase automatically makes Apprentice-created assets commercial-ready.

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
- record Houdini license tier and non-commercial/commercial readiness;
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
imageSourceLanes: <list + status>
tripoActiveLane: API_SDK_PRIMARY | OFFICIAL_CLI_PRIMARY | STUDIO_BROWSER_PRIMARY | BLOCKED
tripoApiSdk3D: PASS/UNFUNDED/UNAVAILABLE/NOT_REQUIRED
tripoOfficialCli: PASS/UNFUNDED/NOT_EXPOSED/NOT_REQUIRED
tripoStudioBrowser: PASS/FAIL/NOT_REQUIRED
houdini: PASS/FAIL/NOT_REQUIRED
houdiniLicense: APPRENTICE_NONCOMMERCIAL | INDIE | OTHER
projectUsageMode: NONCOMMERCIAL_POC | COMMERCIAL | UNKNOWN
fullFxFeaturesAllowedForPoc: yes/no
requiredHoudiniExport: <value>
houdiniExportSmokeTest: PASS/FAIL/NOT_REQUIRED
blender: PASS/FAIL/NOT_REQUIRED
threejsRuntime: PASS/FAIL/NOT_REQUIRED
realGpuEvidence: PASS/FAIL/NOT_REQUIRED
audioMedia: PASS/FAIL/NOT_REQUIRED
assetRegistry: PASS/FAIL
blockingIssues: []
result: PASS|BLOCKED
```

Store it outside Git under `H:\CodexData\souldrifter-toolchain\receipts\` and load it through `SESSION_FAST_START.md`.