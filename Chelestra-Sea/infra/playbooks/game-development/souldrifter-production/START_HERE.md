# SoulDrifter Multi-LLM Master Harness — START HERE

**Context version:** `2026-08-25-master-v9`

Mandatory entry point for M3, Claude Code, ChatGPT/Codex and future SoulDrifter workers.

## Core principle

**Chat memory is not project state. The repository is project state.**

Every session reconstructs ticket context from repository state. It does not reinstall and fully revalidate the workstation toolchain in every chat.

## Production-document authority

Current production workflow comes from:

- `Chelestra-Sea/infra/playbooks/game-development/universal-game-production/`
- `Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/`

`Arianus-Sky/projects/games/SoulDrifterWeb/` is the runtime/data/asset/test implementation target. Legacy SKY runbooks may be implementation references but cannot override the current SEA harness.

## Bootstrap frequency

### Full machine/toolchain onboarding

Run once per workstation, then only when cached receipts are missing, expired or invalidated by a major tool/license/secret/runtime change.

### New-chat fast start

Every new chat uses `SESSION_FAST_START.md`:

- discover/reuse assigned worktree;
- load cached receipts;
- verify schema/age/required secret names without exposing values;
- fetch live issue/PR/comments/head;
- load `.agent-state/<issue>/`;
- return Session Receipt + Context Receipt.

Do not repeat package installation, provider discovery, full Houdini/Blender smoke suites or full GPU baselines unless invalidated.

### Before paid provider work

Identify the active Tripo lane, refresh live balance/pricing/allowance and obtain exact owner approval immediately before the charged operation.

## Mandatory startup order

0. Read `SESSION_FAST_START.md` and `config/onboarding-cache-policy.json`.
1. Auto-discover/reuse the existing ticket worktree through `AUTO_DISCOVER_WORKSPACE.md`.
2. Load persistent toolchain/provider receipts.
3. Run full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` only if required.
4. For procedural/randomized levels, read:
   - `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
   - `config/dungeon-topology-policy.json`
   - `templates/dungeon-topology-record.template.json`
5. For primary 3D-source images, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
6. For Houdini work, read `HOUDINI_APPRENTICE_POC_POLICY.md`.
7. For animation/rigging, read `ANIMATION_PROVIDER_ROUTING.md`; for custom motions also read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` and its policy/template.
8. For runtime migration/portability decisions, read `BROWSER_RUNTIME_ROADMAP.md`.
9. Read repository `AGENTS.md`.
10. Read this file, `PROJECT_CANON_INDEX.md` and `WORKFLOW.md`.
11. Read the assigned issue and every current comment.
12. Read related PR(s), all comments/reviews and live head.
13. Read `.agent-state/<issue>/ticket-contract.json`, `completion-ledger.json`, `evidence-manifest.json` and `handoff.json` when present.
14. Read the ticket kickoff under `kickoffs/` when one exists.
15. Inspect actual worktree/branch/recent commits.
16. Return Session Receipt + Context Receipt before editing.

## Session Receipt — every chat

```text
SOULDRIFTER SESSION RECEIPT
contextVersion: 2026-08-25-master-v9
platform: <M3|Claude Code|ChatGPT/Codex|other>
ticket: <issue>
branch: <branch>
worktree: <path>
localHead: <sha>
liveHead: <sha>
toolchainReceiptId: <id>
toolchainReceiptStatus: CACHED_PASS | REFRESH_REQUIRED | BLOCKED
projectUsageMode: NONCOMMERCIAL_POC | COMMERCIAL | UNKNOWN
requiredLanes:
  proceduralTopology: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  imageReferenceBakeoff: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  tripoStudio: CACHED_PASS | LIVE_REFRESH_PASS | NOT_REQUIRED
  tripoApiSdk: CACHED_PASS | UNFUNDED | UNAVAILABLE | NOT_REQUIRED
  tripoOfficialCli: CACHED_PASS | UNFUNDED | NOT_EXPOSED | NOT_REQUIRED
  houdini: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  blender: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  threejs: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  realGpu: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
providerSpendPlannedThisSession: yes/no
fullBootstrapRequired: yes/no
blockingIssues: []
```

## Context Receipt — every chat

```text
CONTEXT RECEIPT
contextVersion: 2026-08-25-master-v9
model: <m3|claude|chatgpt-codex|other>
role: <orchestrator|requirement-compiler|worker|verifier|performance-verifier>
ticket: #<number or GLOBAL-AUDIT>
branch: <branch>
localHead: <sha>
liveHead: <sha>
worktree: <absolute path>
gameRoot: Arianus-Sky/projects/games/SoulDrifterWeb
sessionReceipt: PASS/BLOCKED
cachedToolchainReceipt: PASS/REFRESH_REQUIRED/BLOCKED
proceduralTopologyPolicyLoaded: yes/no/not-required
imagePolicyLoaded: yes/no/not-required
houdiniPocPolicyLoaded: yes/no/not-required
animationRoutingLoaded: yes/no/not-required
browserRuntimeRoadmapLoaded: yes/no/not-required
latestOwnerDirectionChecked: yes/no
blockingConflicts: []
plannedScope: <concise scope>
```

No valid Session Receipt + Context Receipt means no implementation.

## Procedural dungeon rule

The generator must use:

```text
logical graph
-> constructive edge-by-edge spatial embedding
-> canonical shared boundaries/apertures
-> top-down actual-geometry validation
-> one shared shell
-> collision/navigation
-> 3D dressing/FX
```

It must not place independently sealed room boxes and attach corridors/doors afterward.

For every edge, place the next room relative to a validated source socket/connector, resolve source aperture + connector/shared boundary + destination aperture before accepting the room, and retry/backtrack when the placement is invalid.

Shared walls emit once. Open spans emit no wall. Corridors must enter both openings. Portal-transfer edges are explicit nonphysical transitions and do not create fake corridors.

Every seed/route must pass automated invariants, actual-geometry top-down review, AI/vision review and real no-warp traversal. Graph connectivity, coordinates, pathfinding, visible doors and room warps are not sufficient proof.

## Image/reference policy

For important 3D-source references, follow the four-candidate image bakeoff when live lanes are available:

1. Tripo Studio Nano Banana;
2. Tripo Studio Nano Banana Pro;
3. ChatGPT/OpenAI candidate A;
4. ChatGPT/OpenAI candidate B.

Verify exact Studio labels/allowance live. Every primary source must show the **entire asset in frame**, including supports and attachments. Cropped images are supplemental `DETAIL_REFERENCE_ONLY`.

## Tripo 3D policy

Studio browser, API/SDK and official CLI are separate lanes with potentially different credentials/credits.

Select from live evidence:

- `API_SDK_PRIMARY` when authenticated/funded;
- `OFFICIAL_CLI_PRIMARY` only when first-party, separately authenticated/funded;
- `STUDIO_BROWSER_PRIMARY` when API/CLI are unavailable/unfunded but Studio is active.

A blocked API/CLI lane must not block Studio. Use Tripo for approved 3D generation, mesh processing, rigging, preset animation and verified custom motion. Do not install the old unverified generic `tripo-cli` package.

## Houdini Apprentice POC policy

SoulDrifter is currently owner-declared `NONCOMMERCIAL_POC`. Use the full FX tools exposed by Apprentice—particles, Pyro, FLIP/procedural water, Vellum, RBD, KineFX, terrain, lighting, materials, shaders, fog and volumetrics—when they improve the POC.

Apprentice restrictions still bind. Three.js receives supported baked/exported representations. If a final exporter is restricted, preserve the full-fidelity source and schedule clean Indie rebuild/export rather than lowering the creative target before proving the restriction.

## Custom animation

A direct accepted Tripo preset does not need duplicate DCC production.

Every substantial custom motion not adequately covered by Tripo produces:

1. Houdini KineFX candidate;
2. Blender candidate;
3. identical locked inputs;
4. automated gates;
5. blind AI comparison;
6. blinded owner A/B verdict;
7. winner integration;
8. preservation of both packages/metrics.

## Browser runtime direction

SoulDrifter remains browser-first and mobile-browser compatible.

- Three.js remains the current POC/runtime.
- Finish and independently verify the First Breach browser/mobile slice before changing runtimes.
- After that round, evaluate Babylon.js side by side with the same representative content.
- Any migration requires owner approval after evidence.
- Unreal/Unity remain long-term portability targets only.
- Preserve Houdini/Blender/provider sources, neutral assets/caches/manifests and target-specific derivatives so future integrations reuse the work rather than restart.

## Roles and completion

- Orchestrator routes and cannot self-verify implementation.
- Worker owns one ticket/worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- Verifier independently re-derives requirements and alone may mark `VERIFIED`.

## Conflict rule

Latest owner direction, binding `AGENTS.md`, current runtime/code and live ticket/PR state outrank older harness text.

Current official provider/license documentation outranks obsolete commands. Record conflicts; mark uncertainty `OWNER_DECISION_REQUIRED`.