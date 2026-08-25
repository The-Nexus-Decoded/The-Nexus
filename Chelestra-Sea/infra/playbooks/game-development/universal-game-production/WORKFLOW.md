# Universal Game Production Workflow

## Phase -1 — Session fast start or full bootstrap

Every session begins with `SESSION_FAST_START.md`.

- Use valid cached workstation/toolchain receipts.
- Bootstrap only missing, stale, failed or newly selected lanes.
- Do not reinstall every provider/DCC/engine in every chat.
- Immediately before paid provider work, refresh balance/pricing/allowance and obtain exact owner approval.

## Phase A — Global project audit

The first orchestrator session validates the project profile/overlay, discovers worktrees, reads open tickets/PRs/comments, classifies work, maps dependencies/providers/file collisions, and identifies the smallest complete vertical slice.

The audit does not broadly implement tickets.

## Phase 0 — Ticket intake

For the assigned ticket:

- fetch live issue/comments/PR/reviews/head;
- reconcile local worktree/branch/head without discarding unexplained work;
- load `.agent-state/<ticket>/`;
- create/update ticket contract, completion ledger, evidence manifest, handoff and work claim;
- load only selected modules.

For zone/environment work, load:

- `ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`;
- `ZONE_PRODUCTION_QUALITY_GATES.md`;
- `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`;
- `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`;
- their config and record template.

## Phase 1 — Requirement compilation

Convert prose into explicit testable contracts.

Examples:

- **Zone seam:** source/destination -> transforms/facing -> loading/streaming -> save/respawn -> state/audio/lighting handoff -> failure fallback.
- **Graybox:** movement/timing -> dimensions -> camera -> combat/interaction space -> actor profiles -> spawn/patrol/quest reservations -> owner verdict.
- **Procedural spatial edge:** source -> connection type -> constructive destination placement -> canonical ownership -> movement/camera/resource/failure contract -> real traversal -> evidence.
- **Asset intake:** provenance/license/rollback -> units/axes/pivot -> geometry/material/textures -> LOD/culling/compression -> collider -> interaction/destruction anchors -> registry acceptance.
- **Staging:** purpose profile -> semantic zones -> placement order -> object classification -> clearance/performance audit -> frozen staged environment.
- **Collision/physics:** prop-complete controller walkthrough -> defect inventory -> positive/negative collision -> surfaces/hazards/camera/body -> repair -> regression.
- **Interaction/dynamic state:** prompt/range -> state machine -> animation/events -> collision/nav update -> result/inventory -> persistence -> recovery -> evidence.
- **Lookdev/audio:** material/lighting/atmosphere/wayfinding -> reverb/occlusion/attenuation -> cues/accessibility -> performance.
- **Performance/streaming:** staged checkpoints -> optimization -> slow network/cache/resume/re-entry -> final device budget.
- **Recovery:** save/respawn/re-entry -> stuck/out-of-bounds -> dynamic-state recovery -> version/fallback -> no soft lock.
- **Population readiness:** spawn/patrol/actor-size/encounter/quest/drop envelopes -> stable socket manifest -> dependency commit.
- **3D asset:** concept/reference -> approved provider task -> controlled download -> processing -> topology/material -> rig/animation -> LOD/collision/sockets -> runtime -> performance -> provenance/rollback.
- **Custom animation:** provider preset search -> configured candidates -> blind review -> owner verdict -> winner integration -> registry.

## Phase 2 — Baseline audit

Before editing:

- run current tests/runtime;
- identify genuinely verified work and unsupported claims;
- capture visual/performance evidence;
- freeze valid regions/components;
- produce an atomic defect/requirement list.

---

# Mandatory zone/environment gate order

```text
0.  design/canon/budget/zone-seam contract
1.  topology and connection/traversal solver
2.  graybox playability/scale/pacing/camera/socket reservation
3.  shell/surfaces/volumes/world seams
4.  asset intake and technical readiness
5.  staging and prop placement
6.  prop-complete collision discovery
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

Hard rules:

- graybox passes before expensive art;
- assets pass technical intake before staging;
- intended props are placed before final collision verification;
- empty-shell traversal and navigation do not substitute for staged collision;
- collision/physics/hazards precede interaction/dynamic-state acceptance;
- atmosphere cannot hide defects;
- performance/recovery/device checks precede final walkthrough;
- population envelopes are reserved early and revalidated late;
- environment verification precedes population scaling;
- changes reopen the lowest affected gate and all dependent gates.

## Environment versus population boundary

Environment phase normally owns design/budgets/seams, topology/graybox/shell, asset intake, environmental props, collision/physics/hazards, base interactions/destruction, lookdev/audio, performance/streaming, recovery/device/accessibility/network contract, population-readiness handoff, deterministic test contents and environment verification.

Population/gameplay phase normally owns live NPC/creature spawns, patrols/AI, encounters/random encounters/respawn tuning, quests/dialogue/objectives, production loot/drop tables and population persistence/network behavior.

---

# Mandatory procedural topology and traversal gate

For generated/traversal-heavy levels, use:

```text
logical graph + explicit traversal contracts
-> constructive edge-by-edge embedding
-> canonical boundaries/surfaces/volumes
-> actual-geometry diagnostics
-> graybox acceptance
-> shared shell
-> asset intake/staging
-> prop-complete collision/interaction/quality gates
```

For each edge, select a legal source, explicit connection type/movement mode/medium/directionality, compatible destination, connector geometry/surface/volume and complete camera/resource/recovery contract. Accept only when the whole edge passes; otherwise retry/backtrack/reject.

Use top-down plans for horizontal routes, sections/elevations for vertical routes, 3D volume/slice views for aquatic routes, state graphs for dynamic topology and region maps for mega-zones.

## Phase 3 — Implementation in dependency order

### Level/world environment

`design/seams/budgets -> topology/traversal -> graybox -> shell/surfaces/volumes -> asset intake -> staging -> prop-complete walkthrough -> collision/physics/nav/hazards -> interaction/destruction/state -> lookdev/wayfinding -> audio -> performance/streaming -> recovery/OOB -> device/accessibility/network -> population-readiness -> final experience walkthrough -> independent verification`

### Later population/gameplay

`verified environment dependency commit + stable sockets -> NPC/creature spawns -> patrols/AI -> encounters -> quests/dialogue/objectives -> production loot/drop tables -> population persistence -> gameplay verification`

### 3D asset

`toolchain lane -> quote/approval -> concept/reference -> provider generation/import -> processing -> topology/UV/material -> rig -> animation -> sockets/LOD/collision -> export -> runtime -> performance -> QA`

### Custom animation

`preset/custom search -> route -> locked common inputs -> candidate lanes -> gates -> blind AI review -> owner verdict -> winner integration -> registry -> verification`

### Code/runtime feature

`data/schema -> service/state machine -> runtime -> UI/input -> save/network -> observability -> tests -> target-device proof`

## Phase 4 — Producer checks

A producer commits atomic increments, runs automated/runtime checks, stores fresh evidence, updates ledger/handoff, records provider provenance, and stops at `IMPLEMENTED_UNVERIFIED`.

Environment producers record a distinct status for every required zone gate.

## Phase 5 — Independent verification

The verifier re-derives requirements, tests the exact commit, rejects stale/producer-only evidence, uses target devices/render APIs, and returns PASS, FAIL or NEEDS_EVIDENCE.

For zones, verify topology/seams, graybox assumptions, asset/staging set, real-controller collision/physics/hazards, interactions/destruction/persistence, lookdev/audio, performance/streaming, recovery/OOB, devices/inputs/accessibility, population-readiness and final experience.

For spatial edges, use the real movement mode and failure/recovery path. Debug teleport/pathfinding alone is not proof.

For animation bakeoffs, the reviewer/verifier must not be either candidate producer.

## Phase 6 — Owner-ready gate

A ticket becomes owner-ready only when all critical rows and required zone gates are independently VERIFIED; provider/toolchain/spend receipts and provenance/rollback are complete; target-device performance passes; owner creative/experience verdicts are stored; tests/build/package/release checks pass; and no blockers remain.

## Phase 7 — Runtime/portability decisions

Keep the accepted runtime stable through the vertical slice. Runtime comparisons require a project-overlay-defined problem, candidates, representative slice, metrics, budget and owner approval.

Preserve DCC/provider sources, neutral assets/caches/manifests and target derivatives for future integrations.

## Phase 8 — Release

Release remains project-overlay controlled and may require branch promotion, signing/store/hosting, migrations, canary/rollback, monitoring, security/license review and explicit owner authorization.

## Phase 9 — Handoff and resume

Before a session ends:

- commit or preserve dirty work;
- update ledger/evidence/handoff;
- record next atomic requirement/blockers;
- stop dev servers/provider pollers;
- preserve provider task IDs/download hashes;
- preserve topology, spatial-connection, zone-environment, animation and portability records;
- leave enough state for another model to resume without chat history.