# SoulDrifter Production Toolchain Preflight

**Status:** mandatory before any production ticket edits, asset generation, Houdini build, animation, VFX, or runtime integration.

This preflight closes a gap in the earlier consolidated harness: workspace/GitHub onboarding alone is not enough. A session must prove that every tool required by its ticket is installed, authenticated, documented, writable, and able to complete a safe smoke check before production starts.

## Core rule

**No toolchain receipt, no production work.**

The agent may install/configure routine tooling when it has shell/package-manager permission. It asks the owner only for genuine human-only gates such as browser/device authorization, billing approval, an OS elevation prompt the agent cannot complete, or a secret that must remain outside chat.

Never print, paste, commit, screenshot, or log secret values.

---

# Gate 1 — Workspace, Git, GitHub, and storage

Prove:

- correct The-Nexus checkout/worktree;
- correct issue/PR branch and live GitHub access;
- no unexplained dirty changes;
- H: drive workspace and controlled staging folders are writable;
- enough free disk space for source, derivatives, caches, renders, and downloaded provider outputs;
- provider outputs will be copied immediately into controlled storage and registered with hashes/provenance.

Required evidence:

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
git remote -v
git worktree list --porcelain
```

---

# Gate 2 — Tripo connection: API/SDK first, optional provider CLI, optional MCP

## Do not assume connection from documentation alone

Tripo is not considered connected until the current workstation/session completes a live, read-only authenticated call and records a sanitized result.

## Supported connection lanes

### A. Official Tripo v3 JavaScript/TypeScript SDK — preferred for SoulDrifter/Three.js automation

Use the official package:

```text
@vastai/tripo-sdk
```

The agent must:

1. verify Node.js and the project package manager;
2. install/pin the SDK in an isolated tooling package or approved project tool directory;
3. confirm `TRIPO_API_KEY` exists in OS/local secret storage without printing it;
4. call the SDK's read-only balance endpoint;
5. record SDK version, API base URL, account/balance read success, and timestamp;
6. verify the methods required by the ticket exist: generation, upload/download, segmentation, low-poly/decimation, rig check, rigging, retargeting, task polling, and immediate download.

### B. Official Python SDK — acceptable for Houdini/Python integration

Use:

```text
pip install tripo3d
```

Pin the version in the project tooling environment and run the same read-only credential/balance check.

### C. Provider-supplied CLI — only after exact first-party discovery

The older draft playbook named a generic `tripo-cli` package without proving that it was the current official provider CLI. That instruction is superseded.

If the owner's Tripo account/console exposes a first-party CLI and says the LLM can install it, the agent must:

1. open the current provider instructions from the authenticated Tripo console;
2. record the exact package/repository/installer, version, publisher, checksum/signature when available, and official documentation location;
3. install that exact first-party CLI;
4. run its documented version, authentication, and health commands;
5. perform a read-only account/balance/task-list call;
6. never invent `doctor`, `login`, `docs`, or MCP commands unless the current official CLI documents them.

Do not install similarly named third-party packages merely because they appear in a package registry.

### D. Official Tripo MCP — optional, not automatically equivalent to full API automation

The official `tripo-mcp` project is currently an alpha integration centered on Blender + the Tripo Blender add-on. Use it only if the current host supports MCP and the complete Blender/add-on/MCP chain passes a read-only tool-discovery test.

MCP failure must not block the official SDK/API lane.

## Tripo preflight receipt

```text
TRIPO PREFLIGHT
lane: <js-sdk|python-sdk|official-cli|mcp>
packageOrTool: <name>
version: <version>
apiBase: <url>
secretPresent: yes/no (never print value)
authenticatedRead: PASS/FAIL
balanceRead: PASS/FAIL
currentBalance: <number or redacted policy result>
capabilitiesVerified:
  textToImage: yes/no
  textToModel: yes/no
  imageToModel: yes/no
  multiviewToModel: yes/no
  upload: yes/no
  download: yes/no
  segmentation: yes/no
  lowPolyOrDecimate: yes/no
  rigCheck: yes/no
  rig: yes/no
  retarget: yes/no
blockingIssues: []
result: PASS|BLOCKED
```

No charged provider task may run during preflight.

---

# Gate 3 — Provider pricing, credit, and spend control

Before every charged operation:

1. read the current official pricing/credit schedule;
2. query account balance;
3. quote each requested operation separately;
4. state expected and maximum credits;
5. state whether a retry would incur another charge;
6. obtain explicit owner approval for that exact pilot/batch;
7. record task IDs, actual cost, output URLs, download hashes, and remaining balance.

A broad statement such as “use Tripo” is not approval for a paid batch.

---

# Gate 4 — Image/concept provider

For workflows that begin with a concept image or multi-view images, prove one approved image-generation lane is available in the current agent environment.

Possible lanes:

- Tripo v3 text-to-image/image-to-multiview through the authenticated SDK/API;
- an approved OpenAI Images API integration with its key held in secret storage;
- owner-supplied reference images;
- another owner-approved provider.

Record:

- provider/model/version;
- prompt/reference provenance;
- output dimensions/format;
- controlled local path and hash;
- whether the image is a concept reference or a canonical source artifact.

Do not assume a local Codex chat has the same image-generation tools as ChatGPT.

---

# Gate 5 — Houdini installation, Python/HOM, license, and production format

The agent must detect and record:

- Houdini version/build;
- executable paths (`hmaster`, `hython`, and approved batch/export tools);
- Python/HOM import success;
- current license category;
- current scene/HDA format;
- SideFX Labs availability/version if required;
- glTF/FBX/Alembic/VAT/texture-sheet export capabilities needed by the ticket;
- a harmless scripted scene/export smoke test.

## Apprentice now

Houdini Apprentice is acceptable for learning and non-commercial prototypes and exposes virtually the Houdini FX feature set, including particles/Pyro/Vellum/KineFX. Its restrictions remain binding: non-commercial use, `.hipnc`/`.hdanc`, 1080p render cap, watermarked non-`.picnc` renders, no third-party renderers, and no Houdini Engine production use.

## Indie upgrade next week

Houdini Indie does not primarily add a new particle/FX feature tier; it enables a limited-commercial production pipeline with Indie file formats, unrestricted render resolution, supported third-party renderers, command-line/Engine workflows, and commercial export within Indie eligibility.

Before switching production to Indie:

1. install/activate the Indie license and record it;
2. create clean `.hiplc`/`.hdalc` production scenes/assets;
3. do not load non-commercial HDAs/assets that would downgrade the Indie session;
4. rebuild/re-export production deliverables from source scripts/data under Indie;
5. keep Apprentice `.hipnc` files as prototype/reference only unless SideFX explicitly converts them;
6. re-run the full export/runtime validation gate under Indie.

## Houdini receipt

```text
HOUDINI PREFLIGHT
versionBuild: <value>
license: <Apprentice|Indie|other>
sceneFormat: <hipnc|hiplc|hip>
hython: PASS/FAIL
houImport: PASS/FAIL
labs: <version/not-required>
requiredExports: <list + PASS/FAIL>
prototypeOnly: yes/no
commercialPipelineReady: yes/no
blockingIssues: []
result: PASS|BLOCKED
```

---

# Gate 6 — Blender/Tripo add-on/MCP when used

If the selected Tripo MCP lane requires Blender:

- detect Blender version/path;
- install and pin the official Tripo Blender add-on;
- verify add-on enablement;
- verify MCP server launch and tool discovery;
- run a read-only or no-charge connection probe;
- record the exact local output/staging folder.

If Blender/MCP is not needed for the ticket, mark this gate `NOT_REQUIRED` rather than pretending it passed.

---

# Gate 7 — Three.js/runtime/web asset toolchain

Prove:

- Node/package-manager versions match the project;
- dependencies install cleanly in the existing worktree;
- GLB loading and animation playback work;
- any glTF compression/optimization tools are installed and pinned;
- browser automation can launch against the real GPU;
- renderer string, WebGL limits, texture-unit limit, draw calls, triangles, textures, and memory can be captured;
- software rendering is rejected for final visual acceptance.

The GTX 1080 Ti/ANGLE D3D11 path must remain part of the current First Breach acceptance gate.

---

# Gate 8 — Audio/media tooling when required

For animated fixtures, dialogue, VFX, or cinematic evidence, prove the required tools exist:

- audio source/recording/generation approval;
- WAV/OGG conversion;
- loop and loudness validation;
- FFmpeg or equivalent for evidence capture/transcode;
- runtime audio loader/playback.

Audio and animation events must be authored as separate runtime contracts.

---

# Gate 9 — Asset registry, provenance, rollback, and acceptance

Before a generated asset enters runtime:

- preserve original provider output;
- preserve prompt/reference/task/model/version/cost/license data;
- checksum every source and derivative;
- complete segmentation/mesh editing/retopo before final rigging;
- validate topology, scale, origin, materials, LOD, collision, rig/deformation, animation markers, and browser performance;
- publish only the accepted derivative to the runtime tree;
- keep a rollback path.

Provider task success is never asset acceptance.

---

# Final production toolchain receipt

```text
SOULDRIFTER PRODUCTION TOOLCHAIN RECEIPT
workspaceGitHub: PASS/FAIL
storage: PASS/FAIL
tripoApiSdk: PASS/FAIL/NOT_REQUIRED
tripoOfficialCli: PASS/FAIL/NOT_EXPOSED
tripoMcp: PASS/FAIL/NOT_REQUIRED
imageProvider: PASS/FAIL/NOT_REQUIRED
houdini: PASS/FAIL
houdiniLicense: <Apprentice|Indie|other>
blender: PASS/FAIL/NOT_REQUIRED
threejsRuntime: PASS/FAIL
realGpuEvidence: PASS/FAIL
audioMedia: PASS/FAIL/NOT_REQUIRED
assetRegistry: PASS/FAIL
creditQuoteGate: PASS/FAIL
blockingIssues: []
result: PASS|BLOCKED
```

A ticket may begin only when every lane it actually requires is `PASS` and every unused lane is explicitly `NOT_REQUIRED`.