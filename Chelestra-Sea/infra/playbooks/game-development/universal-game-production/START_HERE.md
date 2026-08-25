# START HERE — Universal AI Game Production Harness

**Context version:** `2026-08-25-universal-game-v7`

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
    - `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
    - `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
    - `config/zone-environment-completion-policy.json`
    - `templates/zone-environment-completion-record.template.json`
11. For procedural/generated or traversal-heavy levels, also read:
    - `PROCEDURAL_LEVEL_TOPOLOGY_POLICY.md`
    - `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
    - `config/procedural-level-topology-policy.json`
    - `config/spatial-connection-policy.json`
    - `templates/procedural-level-topology-record.template.json`
    - `templates/spatial-connection-record.template.json`
12. For primary 3D-source images, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
13. For Houdini, read `HOUDINI_LICENSE_MODE_POLICY.md`.
14. For Tripo, load `providers/tripo/README.md` and project-specific config derived from its template.
15. For custom animation, read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`, its policy and record template when enabled.
16. For browser/native runtime decisions, read `BROWSER_RUNTIME_PORTABILITY_POLICY.md`.
17. Read assigned ticket and all comments/PR reviews.
18. Load `.agent-state/<ticket>/`.
19. Inspect actual branch/worktree and recent commits.
20. Return Session + Context Receipts before editing.

## Session Receipt

```text
GAME PRODUCTION SESSION RECEIPT
contextVersion: 2026-08-25-universal-game-v7
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
  - <genre/platform/engine/provider module>
providerSpendPlanned: yes/no
fullBootstrapRequired: yes/no
blockingIssues: []
```

## Context Receipt

```text
GAME PRODUCTION CONTEXT RECEIPT
contextVersion: 2026-08-25-universal-game-v7
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
environmentStagingPolicyLoaded: yes/no/not-required
collisionInteractionDestructionPolicyLoaded: yes/no/not-required
proceduralTopologyPolicyLoaded: yes/no/not-required
spatialConnectionCatalogLoaded: yes/no/not-required
imagePolicyLoaded: yes/no/not-required
houdiniLicensePolicyLoaded: yes/no/not-required
animationBakeoffPolicyLoaded: yes/no/not-required
runtimePortabilityPolicyLoaded: yes/no/not-required
selectedModules:
  - <module>
latestTicketDirectionChecked: yes/no
blockingConflicts: <none or list>
plannedScope: <concise scope>
```

No valid Session Receipt + Context Receipt means no implementation.

---

# Universal zone/environment completion order

```text
0. design and purpose contract
1. topology and connection/traversal solver
2. shared shell, surfaces and traversal volumes
3. environment staging and prop placement
4. prop-complete real-controller walkthrough / collision discovery
5. collision implementation and regression
6. interaction, pickup and destruction
7. final integrated environment walkthrough
8. independent environment verification
9. separate population/gameplay phase or ticket
```

Rules:

- the intended environment-prop set is placed before final collision verification;
- empty-shell traversal cannot substitute for the prop-complete pass;
- navigation/pathfinding cannot substitute for collision;
- collision must pass before interaction/destruction acceptance;
- the complete environment must be independently verified before population scaling;
- later population changes that alter topology, prop placement or collision reopen the relevant environment gates.

Environment staging normally owns fixtures, furniture, containers, art, cover, debris, clues and destructibility classification. The later population phase normally owns live NPCs/creatures, patrols, encounters, quests, production loot/drop tables and population persistence.

Every placed object has collision, interaction, destruction and performance classification or an explicit reason why a category does not apply.

---

# Procedural topology and traversal policy

A generated level is a graph of **spatial nodes**, not necessarily rectangular rooms. A node may be an architectural space, cavern, shaft, water volume, air pocket, biome pocket, labyrinth, mega-zone, moving platform region or transforming living-world state.

Required architecture:

```text
logical graph + explicit traversal contracts
-> constructive edge-by-edge spatial embedding
-> canonical boundaries, surfaces and volumes
-> actual-geometry plan/section/volume/state validation
-> shared shell and structural movement intent
-> environment staging
-> prop-complete collision/interaction/destruction gates
```

Every edge declares connection type, movement mode, medium, directionality, state requirements, geometry/surface/volume, collision/navigation ownership, controller/animation/camera transitions, resources/hazards/recovery, persistence/streaming and verification.

Use top-down plans for horizontal routes, sections/elevations for vertical routes, 3D volume/slice evidence for aquatic routes, state sequences for moving/transforming topology and region/streaming maps for mega-zones.

Do not place sealed modules first and connect them after the fact. Resolve each edge before accepting the destination, retry/backtrack invalid placements, and require real-controller proof. Debug warp/pathfinding alone is not connectivity evidence.

---

# Environment staging policy

Every spatial node receives a purpose profile so it reads as the kind of place it represents.

Examples include dwellings, shops, workshops, temples, dungeons/ruins and biome/mega-zones. The profile defines expected functional categories and circulation.

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

Use semantic zones, authored sockets or deterministic placement rules. Avoid random asset scatter.

---

# Collision, interaction and destruction policy

The prop-complete walkthrough uses the actual project controller/profile and finds missing collision, invisible blockers, collider/mesh mismatch, tunneling, stateful-threshold errors, camera clipping, prop traps and body/input disagreement.

Both positive and negative collision are required:

- intended solids block;
- intended openings, approaches and destroyed footprints remain clear.

Projects may enable maximum destructibility. The reusable rule is:

> Every placed object has a working interaction/destruction contract or an explicit protection/noninteraction reason.

Representative acceptance includes opening a container, transferring a test item once, picking up an item without duplication, operating a threshold, destroying allowed categories, verifying protected objects, clearing destroyed collision, saving/reloading state, and staying within target-device debris/performance budgets.

---

# Image/reference policy

Projects may configure different candidate image models/providers, but every primary 3D-source image must show the **entire asset in frame**. Cropped close-ups are supplemental only.

# Provider policy

- Separate Studio/browser, API/SDK, official CLI and MCP lanes.
- Do not assume credentials, credits or quotas are shared.
- Use the best active/funded lane selected by the project overlay.
- A blocked API/CLI lane must not block an allowed authenticated Studio/browser lane.
- Cache live sanitized connection proof.
- Refresh pricing/balance and approval before paid work.
- Finish geometry-changing operations before final rigging.
- Provider success is not asset acceptance.

# Houdini license-mode policy

A genuine non-commercial POC may use the full FX features exposed by Houdini Apprentice; the free license is not itself a reason to reduce water, particles, Pyro, Vellum, KineFX, lighting, materials, shaders, terrain or volumetrics to crude placeholders.

Apprentice restrictions still apply. Smoke-test the exact runtime/export representation and preserve high-fidelity source for a clean licensed rebuild/export if necessary.

# Custom-animation comparison policy

When enabled:

- direct accepted provider presets may ship without duplicate DCC production;
- custom motions not adequately covered by provider presets produce two candidates—by default Houdini KineFX and Blender;
- both use identical locked inputs;
- independent AI review and owner A/B selection are blinded;
- both candidates and metrics are retained for evidence-based routing.

# Browser runtime and portability policy

The universal core does not prescribe a lateral browser-engine migration after a POC.

Projects should improve their accepted browser runtime unless the overlay defines a concrete unsolved requirement, named candidates, comparison slice, metrics, budget and owner approval.

If browser delivery later cannot satisfy approved product requirements, evaluate a native/installed engine as a separate phase. Preserve DCC/provider sources, neutral assets/caches/manifests and target-specific derivatives so the future target reuses expensive work rather than starting from zero.

Portability means controlled re-integration, not zero engine-specific work.

## Role boundary

- **Orchestrator:** audits, routes and cannot self-verify production work.
- **Worker:** implements one ticket/worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- **Verifier:** independently re-derives requirements and alone may mark them `VERIFIED`.

## Generic-core boundary

Do not put project-specific lore, mechanics, asset IDs, provider account values, branches, ticket paths or runtime decisions into the universal core. Put them in the project profile/overlay.