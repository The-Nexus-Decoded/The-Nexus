# SoulDrifter Multi-LLM Master Harness — START HERE

**Context version:** `2026-08-28-master-v15`

Mandatory entry point for M3, Claude Code, ChatGPT/Codex and future SoulDrifter workers.

## Core principle

**Chat memory is not project state. The repository is project state.**

Every session reconstructs ticket context from repository state. It does not reinstall and fully revalidate the workstation toolchain in every chat.

## Production-document authority

Current production workflow comes from:

- `Chelestra-Sea/infra/playbooks/game-development/universal-game-production/`
- `Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/`

`Arianus-Sky/projects/games/SoulDrifterWeb/` is the runtime/data/asset/test implementation target. Legacy SKY runbooks may inform implementation but cannot override the current SEA harness.

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
4. For every zone/environment ticket, read:
   - `ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`
   - `ZONE_PRODUCTION_QUALITY_GATES.md`
   - `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
   - `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
   - `config/zone-environment-completion-policy.json`
   - `templates/zone-environment-completion-record.template.json`
5. For every imported 3D asset, and every controlled threshold that stages one, read:
   - [`IMPORTED_ASSET_RUNTIME_PRESENTATION_GATE.md`](../universal-game-production/IMPORTED_ASSET_RUNTIME_PRESENTATION_GATE.md)
   - [`templates/imported-asset-runtime-presentation-record.template.json`](../universal-game-production/templates/imported-asset-runtime-presentation-record.template.json)
6. For procedural/randomized or traversal-heavy levels, also read:
   - `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
   - `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
   - `config/dungeon-topology-policy.json`
   - `config/spatial-connection-policy.json`
   - `templates/dungeon-topology-record.template.json`
   - `templates/spatial-connection-record.template.json`
7. For every humanoid source, generation, rigging, retargeting, modular-fit, or animation task, read `HUMANOID_DUAL_POSE_PIPELINE.md`.
8. For primary 3D-source images, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
9. For Houdini work, read `HOUDINI_APPRENTICE_POC_POLICY.md`.
10. For animation/rigging, read `ANIMATION_PROVIDER_ROUTING.md`; for custom motions also read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` and its policy/template.
11. For runtime/portability decisions, read `BROWSER_RUNTIME_ROADMAP.md`.
12. Read repository `AGENTS.md`.
13. Read this file, `PROJECT_CANON_INDEX.md` and `WORKFLOW.md`.
14. Read the assigned issue and every current comment.
15. Read related PR(s), all comments/reviews and live head.
16. Read `.agent-state/<issue>/ticket-contract.json`, `completion-ledger.json`, `evidence-manifest.json` and `handoff.json` when present.
17. Read the ticket kickoff under `kickoffs/` when one exists.
18. Inspect actual worktree/branch/recent commits.
19. Return Session + Context Receipts before editing.

## Session Receipt — every chat

```text
SOULDRIFTER SESSION RECEIPT
contextVersion: 2026-08-28-master-v15
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
  zoneEnvironmentPipeline: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  zoneQualityGates: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  environmentStaging: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  collisionInteractionDestruction: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  importedAssetPresentation: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  proceduralTopology: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  spatialTraversalContracts: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  humanoidDualPose: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
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
contextVersion: 2026-08-28-master-v15
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
zoneEnvironmentPipelineLoaded: yes/no/not-required
zoneQualityGatesLoaded: yes/no/not-required
environmentStagingPolicyLoaded: yes/no/not-required
collisionInteractionDestructionPolicyLoaded: yes/no/not-required
importedAssetPresentationGateLoaded: yes/no/not-required
proceduralTopologyPolicyLoaded: yes/no/not-required
spatialConnectionCatalogLoaded: yes/no/not-required
humanoidDualPosePolicyLoaded: yes/no/not-required
imagePolicyLoaded: yes/no/not-required
houdiniPocPolicyLoaded: yes/no/not-required
animationRoutingLoaded: yes/no/not-required
browserRuntimeRoadmapLoaded: yes/no/not-required
latestOwnerDirectionChecked: yes/no
blockingConflicts: []
plannedScope: <concise scope>
```

No valid Session Receipt + Context Receipt means no implementation.

---

# Canonical zone/environment completion order

Every SoulDrifter zone follows:

```text
0.  design/canon/budget/zone-seam contract
1.  topology and traversal solver
2.  graybox scale/pacing/camera/population-socket reservation
3.  shared shell/surfaces/volumes/world seams
4.  asset intake and technical readiness
5.  semantic staging and prop placement
6.  prop-complete walkthrough/collision discovery
7.  collision/physics/navigation/hazard regression
8.  interaction/pickup/destruction/dynamic state
9.  lookdev/lighting/atmosphere/wayfinding
10. audio/acoustics
11. performance/streaming/loading/memory
12. recovery/checkpoints/out-of-bounds/soft locks
13. device/input/camera/accessibility/network contract
14. population-readiness revalidation and handoff
15. final integrated walkthrough and experience review
16. independent environment verification
17. separate population/gameplay ticket
```

Important distinctions:

- topology and structural collision intent do not prove final collision;
- graybox playability must pass before expensive production art;
- final collision acceptance happens only after the intended prop set is frozen;
- an asset loading successfully does not prove scale, pivot, materials, collision, LOD or provenance;
- imported doors, gates and other controlled thresholds must preserve the reviewed artifact's decorated face, proportions, materials and critical hardware, with separate leaf/frame ownership and close-view proof in every state;
- atmosphere may not hide structural defects;
- performance is measured at multiple checkpoints, not only at the end;
- failure, recovery, save/re-entry and out-of-bounds behavior must be tested;
- final NPC/monster/quest population is separate, but spawn/patrol/encounter/quest envelopes must be reserved and revalidated before handoff;
- a technically correct but confusing, repetitive or exhausting zone is not owner-ready.

A change reopens the lowest affected gate and every dependent gate.

---

# Current First Breach classification

The current First Breach contains **no magical teleport or `PORTAL_TRANSFER` edge**.

Its route gates, corridors, stairs/landings and walk-through Soulwell water veil are continuous physical connections. Code or mesh labels containing `portal` do not change the traversal type.

The selected randomized branch is generated after route choice and before selected gallery meshes render:

```text
fixed Soul Well + vestibule + Threshold Plaza
-> player selects Wayfarer or Oathbreaker
-> deterministic selected-route graph
-> choose 3–5 legal archetypes/order
-> solve socket-to-socket topology/canonical boundaries
-> validate/backtrack and freeze plan
-> render shared shell
-> audit/freeze existing staging
-> prop-complete walkthrough
-> collision/interaction/destruction/quality gates
```

Do not restart valid #451 content merely to follow the corrected order. Reconcile and preserve accepted work, then fill the missing gates.

---

# Image/reference policy

For important 3D-source references, use the four-candidate bakeoff when live lanes are available:

1. Tripo Studio Nano Banana;
2. Tripo Studio Nano Banana Pro;
3. ChatGPT/OpenAI candidate A;
4. ChatGPT/OpenAI candidate B.

Verify live model labels/allowance. Every primary source shows the **entire asset in frame**, including supports and attachments. Cropped images are supplemental `DETAIL_REFERENCE_ONLY`.

Every humanoid follows `HUMANOID_DUAL_POSE_PIPELINE.md`: generate the primary full-body source in a strict T-pose, then derive the required A-pose from that same canonical rigged mesh. One humanoid body means one mesh and two required pose artifacts, never two independently generated bodies.

# Tripo 3D policy

Studio browser, API/SDK and official CLI are separate lanes with potentially different credentials/credits.

- `API_SDK_PRIMARY` when authenticated/funded;
- `OFFICIAL_CLI_PRIMARY` only when first-party and separately authenticated/funded;
- `STUDIO_BROWSER_PRIMARY` when API/CLI are unavailable/unfunded but Studio is active.

A blocked API/CLI lane must not block Studio. Use Tripo for approved 3D generation, mesh processing, rigging, preset animation and verified custom motion. Do not install the old unverified generic `tripo-cli` package.

# Houdini Apprentice POC policy

SoulDrifter is currently owner-declared `NONCOMMERCIAL_POC`. Use the full FX tools exposed by Apprentice—particles, Pyro, FLIP/procedural water, Vellum, RBD, KineFX, terrain, lighting, materials, shaders, fog and volumetrics—when they improve the POC.

Apprentice restrictions still bind. Three.js receives supported baked/exported representations. If a final exporter is restricted, preserve the full-fidelity source and schedule clean Indie rebuild/export rather than lowering the creative target before proving the restriction.

# Custom animation

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

# Browser runtime direction

SoulDrifter remains browser-first and mobile-browser compatible.

- Three.js remains canonical while completing First Breach and the first playable Heartvale POC section.
- No Babylon.js work begins inside #451, #448 or the unfinished Heartvale slice.
- After both sections are complete and independently verified, create an isolated Babylon.js port of exactly those two sections for side-by-side comparison.
- Keep Three.js intact and canonical until the owner records the A/B verdict.
- Unreal-versus-Unity remains a separate future option only if an installed/native edition is needed.
- Preserve source and neutral assets so every port reuses existing work.

# Roles and completion

- Orchestrator routes and cannot self-verify implementation.
- Worker owns one ticket/worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- Verifier independently re-derives requirements and alone may mark `VERIFIED`.

## Conflict rule

Latest owner direction, binding `AGENTS.md`, current runtime/code and live ticket/PR state outrank older harness text.

Current official provider/license documentation outranks obsolete commands. Record conflicts; mark uncertainty `OWNER_DECISION_REQUIRED`.
