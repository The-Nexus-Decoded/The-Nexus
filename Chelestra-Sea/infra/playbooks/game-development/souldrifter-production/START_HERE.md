# SoulDrifter Multi-LLM Master Harness — START HERE

**Context version:** `2026-08-25-master-v12`

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

Every new chat uses `SESSION_FAST_START.md` to discover/reuse the worktree, load cached receipts, fetch live issue/PR state, load `.agent-state/<issue>/`, and return Session + Context Receipts.

Do not repeat package installation, provider discovery, full Houdini/Blender smoke suites or full GPU baselines unless invalidated.

### Before paid provider work

Identify the active Tripo lane, refresh live balance/pricing/allowance and obtain exact owner approval immediately before the charged operation.

## Mandatory startup order

0. Read `SESSION_FAST_START.md` and `config/onboarding-cache-policy.json`.
1. Auto-discover/reuse the ticket worktree through `AUTO_DISCOVER_WORKSPACE.md`.
2. Load persistent toolchain/provider receipts.
3. Run full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` only when required.
4. For procedural/randomized or traversal-heavy levels, read:
   - `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
   - `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
   - `config/dungeon-topology-policy.json`
   - `config/spatial-connection-policy.json`
   - `templates/dungeon-topology-record.template.json`
   - `templates/spatial-connection-record.template.json`
5. For primary 3D-source images, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
6. For Houdini work, read `HOUDINI_APPRENTICE_POC_POLICY.md`.
7. For animation/rigging, read `ANIMATION_PROVIDER_ROUTING.md`; for custom motions also read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` and its policy/template.
8. For runtime/portability decisions, read `BROWSER_RUNTIME_ROADMAP.md`.
9. Read repository `AGENTS.md`.
10. Read this file, `PROJECT_CANON_INDEX.md` and `WORKFLOW.md`.
11. Read the assigned issue and every current comment.
12. Read related PR(s), all comments/reviews and live head.
13. Read `.agent-state/<issue>/ticket-contract.json`, `completion-ledger.json`, `evidence-manifest.json` and `handoff.json` when present.
14. Read the ticket kickoff under `kickoffs/` when one exists.
15. Inspect actual worktree/branch/recent commits.
16. Return Session + Context Receipts before editing.

## Session Receipt — every chat

```text
SOULDRIFTER SESSION RECEIPT
contextVersion: 2026-08-25-master-v12
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
  spatialTraversalContracts: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
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
contextVersion: 2026-08-25-master-v12
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
spatialConnectionCatalogLoaded: yes/no/not-required
imagePolicyLoaded: yes/no/not-required
houdiniPocPolicyLoaded: yes/no/not-required
animationRoutingLoaded: yes/no/not-required
browserRuntimeRoadmapLoaded: yes/no/not-required
latestOwnerDirectionChecked: yes/no
blockingConflicts: []
plannedScope: <concise scope>
```

No valid Session Receipt + Context Receipt means no implementation.

## Procedural topology and traversal rule

A generated level is a graph of **spatial nodes**, not necessarily rectangular rooms. A node may be a chamber, cavern, shaft, water volume, underwater tunnel, air pocket, biome pocket, labyrinth, mega-zone or transforming living-dungeon region.

Required architecture:

```text
logical graph and explicit traversal contracts
-> constructive edge-by-edge spatial embedding
-> canonical boundaries, surfaces and volumes
-> actual-geometry plan/section/volume/state diagnostics
-> runtime geometry/collision/navigation/movement states
-> gameplay/dressing/FX
```

Do not render sealed modules first and connect them afterward.

Every edge declares:

- connection type;
- physical or nonphysical;
- movement mode and medium;
- directionality and lock/state requirements;
- source/destination geometry, surface or volume;
- collision/navigation ownership;
- controller, animation and camera transitions;
- stamina/oxygen/hazard/failure/recovery rules;
- AI/companion, save/reload, streaming and network behavior where applicable.

Use top-down diagnostics for horizontal connections, sections/elevations for vertical routes, 3D volume/slice evidence for water/air-pocket routes, and state sequences for moving or living-dungeon topology.

Debug warp, pathfinding and a visible doorway are never sufficient proof.

### Current First Breach classification

The current First Breach contains **no magical teleport or `PORTAL_TRANSFER` edge**.

Its route gates, physical corridors, stairs/landings and walk-through Soulwell water veil are continuous physical connections. Code or mesh labels containing `portal` do not change the traversal type.

The randomized branch is generated after the player selects Wayfarer or Oathbreaker and before selected gallery-room meshes render:

```text
fixed Soul Well + vestibule + Threshold Plaza
-> player selects route
-> deterministic selected-route graph
-> choose 3–5 legal archetypes/order
-> solve socket-to-socket topology and canonical boundaries
-> validate and backtrack
-> freeze plan
-> render one shared shell
-> collision/navigation/gameplay/dressing/FX
```

## Image/reference policy

For important 3D-source references, use the four-candidate bakeoff when live lanes are available:

1. Tripo Studio Nano Banana;
2. Tripo Studio Nano Banana Pro;
3. ChatGPT/OpenAI candidate A;
4. ChatGPT/OpenAI candidate B.

Verify live model labels/allowance. Every primary source shows the **entire asset in frame**, including supports and attachments. Cropped images are supplemental `DETAIL_REFERENCE_ONLY`.

## Tripo 3D policy

Studio browser, API/SDK and official CLI are separate lanes with potentially different credentials/credits.

- `API_SDK_PRIMARY` when authenticated/funded;
- `OFFICIAL_CLI_PRIMARY` only when first-party and separately authenticated/funded;
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

- Three.js remains canonical while completing the First Breach and first playable Heartvale POC sections.
- No Babylon.js work begins inside #451, #448 or the unfinished Heartvale slice.
- After both sections are complete and independently verified, create an isolated Babylon.js port of exactly those two sections for side-by-side comparison.
- Keep Three.js intact and canonical until the owner records the A/B verdict.
- Unreal-versus-Unity remains a separate future option only if an installed/native edition is needed.
- Preserve source and neutral assets so every port reuses existing work.

## Roles and completion

- Orchestrator routes and cannot self-verify implementation.
- Worker owns one ticket/worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- Verifier independently re-derives requirements and alone may mark `VERIFIED`.

## Conflict rule

Latest owner direction, binding `AGENTS.md`, current runtime/code and live ticket/PR state outrank older harness text.

Current official provider/license documentation outranks obsolete commands. Record conflicts; mark uncertainty `OWNER_DECISION_REQUIRED`.