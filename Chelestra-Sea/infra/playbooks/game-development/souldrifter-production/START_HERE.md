# SoulDrifter Multi-LLM Master Harness — START HERE

**Context version:** `2026-08-25-master-v13`

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
   - `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
   - `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
   - `config/zone-environment-completion-policy.json`
   - `templates/zone-environment-completion-record.template.json`
5. For procedural/randomized or traversal-heavy levels, also read:
   - `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
   - `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
   - `config/dungeon-topology-policy.json`
   - `config/spatial-connection-policy.json`
   - `templates/dungeon-topology-record.template.json`
   - `templates/spatial-connection-record.template.json`
6. For primary 3D-source images, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
7. For Houdini work, read `HOUDINI_APPRENTICE_POC_POLICY.md`.
8. For animation/rigging, read `ANIMATION_PROVIDER_ROUTING.md`; for custom motions also read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` and its policy/template.
9. For runtime/portability decisions, read `BROWSER_RUNTIME_ROADMAP.md`.
10. Read repository `AGENTS.md`.
11. Read this file, `PROJECT_CANON_INDEX.md` and `WORKFLOW.md`.
12. Read the assigned issue and every current comment.
13. Read related PR(s), all comments/reviews and live head.
14. Read `.agent-state/<issue>/ticket-contract.json`, `completion-ledger.json`, `evidence-manifest.json` and `handoff.json` when present.
15. Read the ticket kickoff under `kickoffs/` when one exists.
16. Inspect actual worktree/branch/recent commits.
17. Return Session + Context Receipts before editing.

## Session Receipt — every chat

```text
SOULDRIFTER SESSION RECEIPT
contextVersion: 2026-08-25-master-v13
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
  environmentStaging: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  collisionInteractionDestruction: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
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
contextVersion: 2026-08-25-master-v13
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
environmentStagingPolicyLoaded: yes/no/not-required
collisionInteractionDestructionPolicyLoaded: yes/no/not-required
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

---

# Canonical zone/environment completion order

Every zone/environment follows this stage order:

```text
0. design and purpose contract
1. topology and connection solver
2. shared shell / surfaces / traversal volumes
3. semantic environment staging and prop placement
4. prop-complete real-character walkthrough / collision discovery
5. collision implementation and regression
6. interaction / pickup / destruction
7. final integrated environment walkthrough
8. independent environment verification
9. separate zone-population / gameplay ticket
```

Important distinctions:

- Structural collision intent and navigation may be derived from topology during shell construction.
- **Final collision acceptance happens only after the full intended prop set is placed.**
- An empty-shell traversal cannot prove the staged level is collision-safe.
- Environment staging and gameplay population are separate.
- Chests, furniture, paintings, statues, crates, wall fixtures and environmental storytelling belong in the environment ticket.
- Live NPCs/monsters, random encounters, patrols, quests, production loot/drop tables and population tuning belong in the later population ticket.

Every placed object must have collision, interaction and destruction classification before the prop-complete walkthrough.

---

# Environment staging rule

A space must be staged according to what it is.

Examples:

- a house needs believable sleeping, storage, food/hearth, seating, lighting and personal-use areas;
- a shop needs counters, display/stock, storage, signage, work space and customer circulation;
- a workshop needs tools, stations, raw materials, storage, waste and safety systems;
- a dungeon/crypt needs appropriate cages, chains, remains, rubble, altars, braziers, containers, wall art, warnings, hidden-route candidates, breakable clutter and evidence of its occupants;
- a biome pocket or mega-zone needs terrain landmarks, local subregions, routes, streaming cells and environmental systems—not uniform prop scatter.

Placement order:

```text
structural fixtures
-> functional furniture/equipment
-> containers and cover
-> wall/ceiling/hanging objects
-> environmental storytelling
-> small clutter
-> hidden/secret candidates
```

Do not collision-test before the staged prop set is frozen.

---

# Collision, interaction and destruction rule

The prop-complete walkthrough uses the actual playable controller/model and discovers:

- missing collision on visible solids;
- invisible blockers;
- collider/mesh mismatch;
- tunneling;
- camera clipping;
- props that trap or block the player;
- click-to-move/WASD disagreement;
- large-body visual clipping.

Then collision is repaired and regression-tested before interaction/destruction acceptance.

SoulDrifter uses a **maximum-destructibility environment**:

- ordinary nonstructural props should be destructible or detachable where practical;
- chests/containers must open and transfer contents correctly;
- pickups must transfer once without duplication;
- crates, barrels, furniture, pottery, bones, loose cover and noncritical wall fixtures should break/detach when allowed;
- iron/steel structures, progression-critical doors, structural shell and required quest mechanisms are protected by default;
- quest/story destruction requires an explicit authored `QUEST_DESTRUCTIBLE` state;
- every object must have a working contract or an explicit protection/noninteraction reason.

Final environment acceptance requires a full staged walkthrough with collision, interactions, destruction, persistence and performance all active together.

---

# Procedural topology and traversal rule

A generated level is a graph of **spatial nodes**, not necessarily rectangular rooms. A node may be a chamber, cavern, shaft, water volume, underwater tunnel, air pocket, biome pocket, labyrinth, mega-zone or transforming living-dungeon region.

Required architecture:

```text
logical graph and explicit traversal contracts
-> constructive edge-by-edge spatial embedding
-> canonical boundaries, surfaces and volumes
-> actual-geometry plan/section/volume/state diagnostics
-> shared shell and structural movement intent
-> environment staging
-> prop-complete collision/interaction/destruction gates
```

Do not render sealed modules first and connect them afterward.

Every edge declares connection type, physical/nonphysical status, movement mode, medium, directionality, geometry/surface/volume, collision/navigation ownership, controller/camera/animation transitions, resources/hazards, recovery, AI, persistence and evidence.

Use top-down diagnostics for horizontal connections, sections/elevations for vertical routes, 3D volume/slice evidence for water/air-pocket routes, and state sequences for moving or living-dungeon topology.

Debug warp, pathfinding and a visible doorway are never sufficient proof.

### Current First Breach classification

The current First Breach contains **no magical teleport or `PORTAL_TRANSFER` edge**.

Its route gates, physical corridors, stairs/landings and walk-through Soulwell water veil are continuous physical connections. Code or mesh labels containing `portal` do not change the traversal type.

The randomized branch is generated after the player selects Wayfarer or Oathbreaker and before selected gallery meshes render:

```text
fixed Soul Well + vestibule + Threshold Plaza
-> player selects route
-> deterministic selected-route graph
-> choose 3–5 legal archetypes/order
-> solve socket-to-socket topology and canonical boundaries
-> validate and backtrack
-> freeze plan
-> render one shared shell
-> audit/freeze existing staging
-> prop-complete walkthrough
-> collision and interaction/destruction verification
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