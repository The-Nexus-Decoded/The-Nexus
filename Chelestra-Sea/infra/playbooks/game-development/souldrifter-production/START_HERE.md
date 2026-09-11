# SoulDrifter Multi-LLM Master Harness — START HERE

**Base harness context version:** `2026-09-02-master-v15`
**Required shared context/narrative amendment:** `2026-09-05-narrative-v1`

Mandatory entry point for M3, Claude Code, ChatGPT/Codex and future SoulDrifter workers.

## Core principle

**Chat memory is not project state. The repository is project state.**

Every session reconstructs ticket context from repository state. It does not reinstall and fully revalidate the workstation toolchain in every chat.

## Common authority — not a Claude-only handoff

The specification templates, lore/source map, setup instructions, build runbooks, toolchain policies and project workflow already belong to the shared SEA production system. Host handoffs are adapters, not separate sources of project truth.

Before substantive work EVERY role/host must read:

- `PROJECT_CONTEXT_READSET.md` and its actual common game-bible/lore/design/SEA sources plus role additions;
- `CURRENT_DIRECTION.md`;
- `NARRATIVE_AUTONOMY_AND_DGC_CONTINUITY_POLICY.md`;
- `templates/quest-narrative-revision-record.template.json` when authoring, compiling or verifying quest/narrative revisions.

An index, a cached tool receipt, a kickoff summary or another agent's READ flag does not satisfy the underlying source reading. Follow the references, complete truncated sections and record source refs/hashes/coverage. The common readset includes GAME_BIBLE, character/story, magic reference, class progression, First Breach, browser/architecture, #428/#429/#430 decisions, actual region/map/NPC sources and relevant Book-of-Life/Lifepaper/Discord/archive blocks. None of that is reserved for Claude or research workers.

### Latest narrative delegation

The owner wants an identifiable **unofficial fan continuation of The Death Gate Cycle**, with frequent source-backed callbacks to its named places, characters, events and history across quests, dialogue, environmental objects, journals and later consequences. Do not automatically anonymize those references or reduce the project to generic inspiration.

Within assigned content scope, agents may revise draft quests to fit the lore and advance the continuing storyline without asking for each edit. Preserve owner locks, stable identities, chapter purpose/counts, supported mechanics, progression budgets, saves and worker boundaries. Record the reason/source, test the revision and submit a batched change digest for final owner review. Major canon/timeline changes, direct book-character cameos/fates, unsupported mechanics, material budget changes and irreversible migrations still require escalation.

This delegation supersedes older blanket draft-preapproval and source-name-removal wording for the current development lane. It does not authorize copying protected passages, claiming official canon/endorsement, new provider charges, public release, merge or deployment. The policy separates verified book facts from owner continuation premises, project canon, working drafts and rumors; rights/release status must be checked separately.

## Production-document authority

Current production workflow comes from:

- `Chelestra-Sea/infra/playbooks/game-development/universal-game-production/`
- `Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/`

`Arianus-Sky/projects/games/SoulDrifterWeb/` is the runtime/data/asset/test implementation target and contains indexed underlying design/lore sources. Do not duplicate them into divergent copies merely to centralize navigation. Legacy SKY runbooks may inform implementation but cannot override the current SEA harness.

## Bootstrap frequency

### Full machine/toolchain onboarding

Run once per workstation, then only when cached receipts are missing, expired or invalidated by a major tool/license/secret/runtime change.

### New-chat fast start

Every new chat uses `SESSION_FAST_START.md` to discover/reuse the worktree, load cached tool receipts, load actual common project context, fetch live issue/PR state, load `.agent-state/<issue>/`, and return Session + Context Receipts.

Do not repeat package installation, provider discovery, full Houdini/Blender smoke suites or full GPU baselines unless invalidated. This does not exempt a new agent from learning the project.

### Before paid provider work

Identify the active Tripo lane, refresh live balance/pricing/allowance and obtain the required current scoped/exact owner approval immediately before the charged operation.

## Mandatory startup order

0. Read governing repository/worktree instructions, `SESSION_FAST_START.md`, `PROJECT_CONTEXT_READSET.md`, `CURRENT_DIRECTION.md`, `NARRATIVE_AUTONOMY_AND_DGC_CONTINUITY_POLICY.md` and `config/onboarding-cache-policy.json`. Complete underlying common sources before substantive design/implementation.
1. Auto-discover/reuse the ticket worktree through `AUTO_DISCOVER_WORKSPACE.md`; record documentation ref separately from implementation base and local head.
2. Load persistent toolchain/provider receipts.
3. Read `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`; execute full or affected-lane setup only when required.
4. Claude/Claude Code sessions must additionally read:
   - `handoffs/CLAUDE-GAME-RESEARCH-TRANSITION.md`
   - repository bridge `.claude/handoffs/souldrifter-game-research-transition.md`
   - root `CLAUDE.md`
   These are adapter additions, not exclusive owners of lore context. Ticket-specific SoulDrifter base/branch/worktree instructions take precedence over generic branch conventions where the governing instructions allow; report conflicts rather than retarget active work silently.
5. For every zone/environment ticket, read:
   - `ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`
   - `ZONE_PRODUCTION_QUALITY_GATES.md`
   - `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
   - `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
   - `config/zone-environment-completion-policy.json`
   - `templates/zone-environment-completion-record.template.json`
6. For every imported 3D asset, and every controlled threshold that stages one, read:
   - [`IMPORTED_ASSET_RUNTIME_PRESENTATION_GATE.md`](../universal-game-production/IMPORTED_ASSET_RUNTIME_PRESENTATION_GATE.md)
   - [`templates/imported-asset-runtime-presentation-record.template.json`](../universal-game-production/templates/imported-asset-runtime-presentation-record.template.json)
7. For procedural/randomized or traversal-heavy levels, also read:
   - `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
   - `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
   - `config/dungeon-topology-policy.json`
   - `config/spatial-connection-policy.json`
   - `templates/dungeon-topology-record.template.json`
   - `templates/spatial-connection-record.template.json`
8. For primary 3D-source images, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
9. For playable humanoid body generation, technicalization or rigging, read `HUMANOID_BASE_BODY_POSE_POLICY.md`.
10. For Houdini work, read `HOUDINI_APPRENTICE_POC_POLICY.md`.
11. For animation/rigging, read `ANIMATION_PROVIDER_ROUTING.md`; for custom motions also read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` and its policy/template. Reconcile newer live producer decisions before running a lane.
12. For runtime/portability decisions, read `BROWSER_RUNTIME_ROADMAP.md`.
13. For quest/narrative work, read current campaign/framework/media runbooks and configs/templates, the shared narrative policy and companion revision record; keep core engine schemas genre-independent.
14. Read this file, `PROJECT_CANON_INDEX.md` and `WORKFLOW.md`; reconcile historical content with the shared amendment and current decisions rather than treating any filename as automatically current.
15. Read the assigned issue and every current comment.
16. Read related PR(s), all comments/reviews and live head.
17. Read `.agent-state/<issue>/ticket-contract.json`, `completion-ledger.json`, `evidence-manifest.json`, `handoff.json` and context-source ledger when present.
18. Read the ticket kickoff under `kickoffs/` when one exists; its scope does not waive common sources.
19. Inspect actual worktree/branch/recent commits and neighboring work claims.
20. Return source-backed Session + Context Receipts before substantive work. Then proceed within authorization rather than endlessly replanning.

## Session Receipt — every chat

```text
SOULDRIFTER SESSION RECEIPT
contextVersion: 2026-09-02-master-v15
sharedAmendment: 2026-09-05-narrative-v1
platform: <M3|Claude Code|ChatGPT/Codex|other>
ticket: <issue>
docsRefAndCommit: <actual source>
contextSourceLedger: <actual path/ref>
commonLoreAndRunbooksRead: COMPLETE | INCOMPLETE
narrativePolicyRead: COMPLETE | INCOMPLETE
contextStatus: CONTEXT_READY | CONTEXT_READY_LIMITED | CONTEXT_BLOCKED
branch: <branch>
worktree: <path>
implementationBase: <ref/sha>
localHead: <sha>
liveHead: <sha>
toolchainReceiptId: <id>
toolchainReceiptStatus: CACHED_PASS | REFRESH_REQUIRED | BLOCKED
projectUsageMode: NONCOMMERCIAL_POC | COMMERCIAL | UNKNOWN
requiredLanes:
  claudeTransition: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  zoneEnvironmentPipeline: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  zoneQualityGates: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  environmentStaging: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  collisionInteractionDestruction: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  importedAssetPresentation: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  proceduralTopology: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  spatialTraversalContracts: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  imageReferenceBakeoff: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  humanoidDualPose: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
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
contextVersion: 2026-09-02-master-v15
sharedAmendment: 2026-09-05-narrative-v1
model: <actual model/host>
role: <research|orchestrator|requirement-compiler|worker|verifier|performance-verifier>
ticket: #<number or GLOBAL-AUDIT>
branch: <branch>
localHead: <sha>
liveHead: <sha>
worktree: <absolute path>
gameRoot: Arianus-Sky/projects/games/SoulDrifterWeb
sessionReceipt: PASS/BLOCKED
cachedToolchainReceipt: PASS/REFRESH_REQUIRED/BLOCKED
commonLoreDesignAndRunbooks: <source refs/coverage>
worldRegionCultureAndPhaseSummary: <source-backed concise understanding>
narrativeAutonomyScope: <assigned files and allowed revisions>
bookFactVsContinuationConflicts: []
claudeTransitionLoaded: yes/no/not-required
zoneEnvironmentPipelineLoaded: yes/no/not-required
zoneQualityGatesLoaded: yes/no/not-required
environmentStagingPolicyLoaded: yes/no/not-required
collisionInteractionDestructionPolicyLoaded: yes/no/not-required
importedAssetPresentationGateLoaded: yes/no/not-required
proceduralTopologyPolicyLoaded: yes/no/not-required
spatialConnectionCatalogLoaded: yes/no/not-required
imagePolicyLoaded: yes/no/not-required
humanoidDualPosePolicyLoaded: yes/no/not-required
houdiniPocPolicyLoaded: yes/no/not-required
animationRoutingLoaded: yes/no/not-required
browserRuntimeRoadmapLoaded: yes/no/not-required
latestOwnerDirectionChecked: yes/no
blockingConflicts: []
plannedScope: <concise scope>
```

No valid Session Receipt + Context Receipt means no implementation. Reading this entry point alone does not produce either receipt; load the actual required sources. Scripts may check recorded evidence but do not certify understanding.

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

A change reopens the lowest affected gate and every dependent gate. Current scoped pilot sequencing comes from the live program; generic ordering does not erase newer owner-approved staged work.

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

Do not restart valid #451 content merely to follow the corrected order. Reconcile and preserve accepted work, then fill the missing gates. Historical plans are not current status; fetch the latest PR/ticket evidence.

---

# Image/reference policy

For important 3D-source references, use the configured four-candidate bakeoff when live lanes are available. The prior baseline lists:

1. Tripo Studio Nano Banana;
2. Tripo Studio Nano Banana Pro;
3. ChatGPT/OpenAI candidate A;
4. ChatGPT/OpenAI candidate B.

Verify live model labels/allowance and any newer approved image-provider routing before generation. Every primary source shows the **entire asset in frame**, including supports and attachments. Cropped images are supplemental `DETAIL_REFERENCE_ONLY`.

# Humanoid T-pose and A-pose policy

For the first Human masculine and feminine #487 POC pilots, and later body families unless explicitly exempted, require both:

- strict T-pose source/reference and 3D proof;
- relaxed A-pose source/reference and 3D proof.

Both must use the same canonical body identity, mesh, proportions, materials, head seam and rig. The strict T-pose uses horizontal arms, forearm roll and neutral inline wrists—not stop-sign wrist bending—to expose readable separated fingers. The relaxed A-pose proves natural shoulders, armpits, clothing fit and production-rest deformation.

A-pose-only or T-pose-only acceptance is forbidden. This does not automatically authorize a second paid generation; the default is one canonical body/rig demonstrated in both poses.

# Tripo 3D policy

Studio browser, API/SDK and official CLI are separate lanes with potentially different credentials/credits.

- `API_SDK_PRIMARY` when authenticated/funded;
- `OFFICIAL_CLI_PRIMARY` only when first-party and separately authenticated/funded;
- `STUDIO_BROWSER_PRIMARY` when API/CLI are unavailable/unfunded but Studio is active.

A blocked API/CLI lane must not block Studio. Use Tripo for approved 3D generation, mesh processing, rigging, preset animation and verified custom motion. Do not install the old unverified generic `tripo-cli` package.

# Houdini Apprentice POC policy

Read the live license/usage receipt; the documented owner baseline is `NONCOMMERCIAL_POC`. Use the full FX tools exposed by the actual license—particles, Pyro, FLIP/procedural water, Vellum, RBD, KineFX, terrain, lighting, materials, shaders, fog and volumetrics—when they improve the POC.

Apprentice restrictions still bind where Apprentice is used. Three.js receives supported baked/exported representations. If a final exporter is restricted, preserve the full-fidelity source and follow the documented licensed rebuild/export route rather than lowering the creative target before proving the restriction.

# Custom animation

A direct accepted Tripo preset does not need duplicate DCC production.

The shared baseline for substantial custom motion not adequately covered by Tripo is:

1. Houdini KineFX candidate;
2. Blender candidate;
3. identical locked inputs;
4. automated gates;
5. blind AI comparison;
6. blinded owner A/B verdict;
7. winner integration;
8. preservation of both packages/metrics.

Read the latest scoped animation-provider policy and owner-approved producer decisions before executing this baseline. Do not revive rejected clips or ignore a newer specific workflow.

# Browser runtime direction

SoulDrifter remains browser-first and mobile-browser compatible.

- Three.js remains canonical while completing First Breach and the first playable Heartvale POC section.
- No Babylon.js work begins inside #451, #448 or the unfinished Heartvale slice.
- After both sections are complete and independently verified, create an isolated Babylon.js port of exactly those two sections for side-by-side comparison.
- Keep Three.js intact and canonical until the owner records the A/B verdict.
- Unreal-versus-Unity remains a separate future option only if an installed/native edition is needed.
- Preserve source and neutral assets so every port reuses existing work.

# Roles and completion

- Research analysts classify sources and may improve assigned narrative proposals under the shared delegation; they do not silently canonize them or implement another role's systems.
- Content workers may make source-backed reversible draft improvements within scope and report them for batched owner review.
- Orchestrators route and cannot self-verify implementation.
- Workers own one ticket/worktree and stop at `IMPLEMENTED_UNVERIFIED`.
- Verifiers independently re-derive requirements and alone may mark `VERIFIED`; final owner acceptance remains separate.

## Conflict rule

Latest explicit owner direction, governing repository constraints, actual runtime/code contracts and live ticket/PR state must be reconciled before following older harness text. Operational restrictions and current implementation behavior are not automatic proof of source-book or project-canon approval.

The `2026-09-05-narrative-v1` policy records the specific current delegation and callback direction. If another file contains an unresolved conflicting lock, report the exact affected decision rather than silently anonymizing the project or changing its canon. Current official provider/license documentation outranks obsolete commands. Record genuine uncertainty as `OWNER_DECISION_REQUIRED`; routine delegated draft changes do not need a new approval for every edit.
