# START HERE — Universal AI Game Production Harness

**Context version:** `2026-08-25-universal-game-v8`

## Core principle

**Chat memory is not project state. The repository is project state.**

The universal core supports any game genre/platform through project profiles, modules, provider adapters and project overlays.

`PLAYBOOK_V2_CORRECTIONS.md` supersedes conflicting or incomplete portions of the original `PLAYBOOK.md` v1.

## Onboarding frequency

### Full machine/toolchain bootstrap

Run once per workstation/template environment, then only when a cached receipt is missing, expired, invalidated or a major tool/license/provider/secret changes.

### Every new chat

Use `SESSION_FAST_START.md` to discover/reuse the worktree, load cached receipts, validate required lanes, fetch live ticket/PR state, load project/ticket context and return Session + Context Receipts.

Do not reinstall providers, DCCs, engines or repeat full smoke suites in every chat.

### Before paid provider work

Refresh live balance/pricing/allowance for the active lane and obtain exact owner approval immediately before the charged operation.

## Startup order

1. Read `SESSION_FAST_START.md` and `config/onboarding-cache-policy.json`.
2. Read binding repository agent instructions.
3. Discover/reuse the assigned branch/worktree.
4. Load cached production-toolchain receipts.
5. If invalid, run full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`; otherwise use cached PASS.
6. Read this file, `PLAYBOOK.md` and `PLAYBOOK_V2_CORRECTIONS.md`.
7. Read the game's `project-profile.json` and project overlay/canon index.
8. Read `WORKFLOW.md`.
9. Load selected genre/platform/engine/provider modules only.
10. For every zone/environment ticket, read:
    - `ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`
    - `ZONE_PRODUCTION_QUALITY_GATES.md`
    - `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
    - `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
    - `config/zone-environment-completion-policy.json`
    - `templates/zone-environment-completion-record.template.json`
11. For procedural/generated or traversal-heavy levels, also read:
    - `PROCEDURAL_LEVEL_TOPOLOGY_POLICY.md`
    - `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
    - the matching configs/templates.
12. For primary 3D-source images, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
13. For Houdini, read `HOUDINI_LICENSE_MODE_POLICY.md`.
14. For Tripo, load `providers/tripo/README.md` and project-specific provider config.
15. For custom animation, read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` and its policy/template when enabled.
16. For browser/native runtime decisions, read `BROWSER_RUNTIME_PORTABILITY_POLICY.md`.
17. Read assigned ticket and all comments/PR reviews.
18. Load `.agent-state/<ticket>/`.
19. Inspect actual branch/worktree and recent commits.
20. Return Session + Context Receipts before editing.

## Session Receipt

```text
GAME PRODUCTION SESSION RECEIPT
contextVersion: 2026-08-25-universal-game-v8
platform: <M3|Claude Code|ChatGPT/Codex|other>
projectId: <id>
ticket: <number or GLOBAL-AUDIT>
repository: <identity>
branch: <branch>
worktree: <path>
localHead: <sha>
liveHead: <sha>
toolchainReceiptId: <id>
toolchainReceiptStatus: CACHED_PASS | REFRESH_REQUIRED | BLOCKED
projectUsageMode: NONCOMMERCIAL_POC | EDUCATIONAL | LIMITED_COMMERCIAL_INDIE | FULL_COMMERCIAL | UNKNOWN
selectedModules:
  - <module>
providerSpendPlanned: yes/no
fullBootstrapRequired: yes/no
blockingIssues: []
```

## Context Receipt

```text
GAME PRODUCTION CONTEXT RECEIPT
contextVersion: 2026-08-25-universal-game-v8
platform: <M3|Claude Code|ChatGPT/Codex|other>
role: <orchestrator|auditor|worker|verifier>
projectId: <id>
ticket: <number or GLOBAL-AUDIT>
repository: <identity>
branch: <branch>
worktree: <path>
projectProfileLoaded: yes/no
projectOverlayLoaded: yes/no
sessionReceipt: PASS/BLOCKED
zoneEnvironmentPipelineLoaded: yes/no/not-required
zoneQualityGatesLoaded: yes/no/not-required
environmentStagingPolicyLoaded: yes/no/not-required
collisionInteractionDestructionPolicyLoaded: yes/no/not-required
proceduralTopologyPolicyLoaded: yes/no/not-required
spatialConnectionCatalogLoaded: yes/no/not-required
imagePolicyLoaded: yes/no/not-required
houdiniLicensePolicyLoaded: yes/no/not-required
animationBakeoffPolicyLoaded: yes/no/not-required
runtimePortabilityPolicyLoaded: yes/no/not-required
latestTicketDirectionChecked: yes/no
blockingConflicts: <none or list>
plannedScope: <concise scope>
```

No valid Session Receipt + Context Receipt means no implementation.

---

# Universal zone/environment completion order

```text
0.  design/canon/budget/zone-seam contract
1.  topology and connection/traversal solver
2.  graybox playability/scale/pacing/camera/socket reservation
3.  shared shell/surfaces/volumes/world seams
4.  asset intake and technical readiness
5.  environment staging and prop placement
6.  prop-complete real-controller walkthrough/collision discovery
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
17. separate population/gameplay phase
```

Binding distinctions:

- graybox playability passes before expensive production art;
- zone seams and adjacent-region handoffs are explicit;
- assets pass technical intake before staging;
- final intended props are placed before final collision verification;
- empty-shell traversal and navigation/pathfinding do not substitute for collision;
- collision/physics/hazards pass before interaction/destruction acceptance;
- atmosphere may not hide defects;
- audio/acoustics are part of zone completion;
- performance is measured throughout and receives a dedicated gate;
- recovery, out-of-bounds, save/re-entry and device/accessibility behavior are tested;
- population is separate, but its spatial envelopes are reserved and revalidated;
- final review includes pacing, readability, fatigue and enjoyment;
- changes reopen the lowest affected gate and every dependent gate.

---

# Procedural topology and traversal

A generated level is a graph of spatial nodes, not necessarily rectangular rooms. Nodes may include architecture, caverns, shafts, water/air volumes, biome pockets, labyrinths, mega-zones, moving-platform regions and transforming states.

Required architecture:

```text
logical graph + traversal contracts
-> constructive edge-by-edge embedding
-> canonical boundaries/surfaces/volumes
-> actual-geometry diagnostics
-> graybox acceptance
-> shared shell
-> asset intake/staging
-> prop-complete collision/interaction/quality gates
```

Every edge declares movement mode, medium, directionality, geometry/surface/volume, collision/navigation ownership, controller/camera/animation transitions, resources/hazards/recovery, persistence/streaming/networking and evidence.

Use top-down plans for horizontal routes, sections/elevations for vertical routes, 3D volume/slice evidence for aquatic routes, state sequences for dynamic topology and region maps for mega-zones.

Do not place sealed modules first and connect them afterward. Resolve each edge before accepting the destination, retry/backtrack invalid layouts, and require real-controller proof.

---

# Staging, collision and interaction

Every place receives a purpose profile and semantic placement map. Use authored sockets or deterministic placement, not random asset scatter.

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

The prop-complete walkthrough uses the real controller/body/camera and proves both intended blocking and intended clear space.

Projects may enable maximum destructibility. Every placed object has a working interaction/destruction contract or an explicit protection/noninteraction reason.

Representative proof includes container open, one-time test transfer, pickup without duplication, stateful threshold, allowed destruction, protected object, destroyed-collider clearing, persistence and performance.

---

# Remaining quality systems

`ZONE_PRODUCTION_QUALITY_GATES.md` defines:

- graybox/pacing/camera;
- zone seams;
- asset intake;
- physics/surfaces/hazards;
- lookdev/lighting/wayfinding;
- audio/acoustics;
- performance/streaming/loading/memory;
- recovery/checkpoints/out-of-bounds/soft locks;
- device/input/accessibility/network contract;
- population-readiness;
- observability/reproducibility;
- final experience review.

---

# Shared provider/DCC policies

- Every primary 3D-source image shows the entire asset in frame.
- Studio/browser, API/SDK, official CLI and MCP lanes remain separate; credentials/credits may differ.
- Paid work receives live balance/pricing/approval.
- Geometry-changing operations occur before final rigging.
- A genuine non-commercial POC may use the full FX features exposed by Houdini Apprentice while respecting license/output restrictions.
- Custom animations not adequately covered by an accepted preset may use configured dual-candidate bakeoffs with blinded review.

# Runtime portability

The universal core does not prescribe a lateral browser-engine migration. Projects keep the accepted runtime stable unless their overlay defines a concrete unsolved problem, named candidates, comparison slice, metrics, budget and owner approval.

Preserve DCC/provider sources, neutral assets/caches/manifests and target derivatives for future integrations.

## Role boundary

- Orchestrator audits/routes and cannot self-verify.
- Worker owns one ticket/worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- Verifier independently re-derives requirements and alone may mark `VERIFIED`.

## Generic-core boundary

Project-specific lore, mechanics, account values, branches, ticket paths, budgets and runtime decisions belong in the project profile/overlay.