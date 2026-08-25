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

## Phase 1 — Requirement compilation

Convert prose into explicit testable contracts.

Examples:

- **Procedural spatial edge:** source node/socket/surface/volume -> connection type -> constructive destination placement -> canonical ownership -> movement/camera/resource/failure contract -> real traversal -> evidence.
- **Aquatic route:** water/depth/air volumes -> entry/exit -> swim/dive controller -> oxygen/drowning/current -> air pockets -> camera/lighting -> save/reload/recovery -> evidence.
- **Vertical route:** stairs/climb/lift/drop geometry -> mount/travel/dismount -> animation/camera/stamina -> fall/recovery -> AI support -> evidence.
- **Living/mega-zone:** region/state graphs -> local subgraphs/streaming -> atomic collision/nav changes -> relocation safety -> persistence -> evidence.
- **3D asset:** concept/reference -> approved provider task -> controlled download -> segmentation/edit -> topology/material -> rig/animation -> LOD/collision/sockets -> runtime -> device/performance -> provenance/rollback.
- **Custom animation:** provider preset search -> routing -> common brief -> configured candidates -> blind review -> owner verdict -> winner integration -> registry.
- **Gameplay action:** input -> state/resource/cooldown -> animation/contact -> VFX/audio -> target reaction -> network/save -> UI -> scheduler modes -> QA.

## Phase 2 — Baseline audit

Before editing:

- run current tests/runtime;
- identify genuinely verified work and unsupported claims;
- capture visual/performance evidence;
- freeze valid regions/components;
- produce an atomic defect/requirement list.

## Mandatory procedural topology and traversal gate

For generated or traversal-heavy levels, read:

- `PROCEDURAL_LEVEL_TOPOLOGY_POLICY.md`;
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`;
- `config/procedural-level-topology-policy.json`;
- `config/spatial-connection-policy.json`.

Required architecture:

```text
logical graph + explicit traversal contracts
-> constructive edge-by-edge spatial embedding
-> canonical boundaries, surfaces and volumes
-> actual-geometry plan/section/volume/state validation
-> runtime geometry/collision/navigation/controller states
-> gameplay/dressing/FX
```

For each edge:

1. choose a legal source socket, boundary, surface, path or volume;
2. choose explicit connection type, movement mode, medium, directionality and state contract;
3. choose a compatible destination socket/orientation/state;
4. calculate the shared boundary, path/spline, surface or volume;
5. derive the destination transform from that edge;
6. validate overlap, clearance, elevation/depth, surface/volume, collision, navigation, camera, resources, hazards and recovery;
7. accept the destination only when the complete edge passes;
8. otherwise retry or backtrack;
9. reject the variant when legal embedding cannot be found.

Before dressing, generate diagnostics from actual solved data:

- top-down plan for horizontal routes;
- section/elevation for vertical routes;
- 3D volume/slice for water/air-pocket routes;
- state graph/timeline for moving or transforming topology;
- region/streaming map plus local subgraphs for mega-zones.

Pass automated checks, applicable AI/vision review and required owner/design review.

## Phase 3 — Implementation in dependency order

### Level/world

`logical graph -> traversal contracts -> constructive embedding/backtracking -> plan/section/volume/state gate -> canonical boundaries/surfaces/volumes -> runtime surfaces/water/shell -> collision/nav/controller states -> real-input traversal -> interactions/encounters -> dressing -> materials/lighting -> VFX/audio -> performance -> QA`

### 3D asset

`toolchain lane check -> exact quote/approval -> concept/reference -> provider generation/import -> segmentation/mesh processing -> topology/UV/material -> rig -> animation -> sockets/LOD/collision -> export -> runtime -> performance -> QA`

### Custom animation

`preset/custom capability search -> route selection -> locked common inputs -> configured candidate lanes -> automated gates -> blind AI review -> blinded owner verdict -> winner integration -> registry -> independent verification`

### Code/runtime feature

`data/schema -> service/state machine -> runtime integration -> UI/input -> save/network -> observability -> tests -> target-device proof`

## Phase 4 — Producer checks

A producer commits atomic increments, runs automated/runtime checks, stores fresh evidence, updates ledger/handoff, records provider provenance, and stops at `IMPLEMENTED_UNVERIFIED`.

The producer may not self-verify or merge/deploy without authorization.

## Phase 5 — Independent verification

The verifier re-derives requirements, tests the exact commit, rejects stale/producer-only evidence, uses target devices/render APIs, and returns PASS, FAIL or NEEDS_EVIDENCE.

For spatial connections, use the real movement mode and failure/recovery path:

- walk/click-to-move;
- crouch/crawl;
- climb/mantle/ladder;
- jump/platform/rope;
- swim/dive/oxygen/air pockets;
- vehicle/transport;
- true transfer activation/arrival when applicable.

Debug teleport/pathfinding alone is not proof.

For animation bakeoffs, the reviewer/verifier must not be either candidate producer.

## Phase 6 — Owner-ready gate

A ticket becomes owner-ready only when:

- all critical rows are VERIFIED;
- topology and spatial-connection records pass where applicable;
- movement, camera, resource, hazard and recovery contracts are proven;
- provider/toolchain/spend receipts are valid;
- provenance/licenses/rollback are complete;
- target-device performance passes;
- required owner creative verdicts are stored;
- tests/build/package/release checks pass;
- no unresolved blockers remain.

## Phase 7 — Runtime/portability decisions

Keep the accepted runtime stable through the vertical slice.

The universal core does not prescribe a default lateral browser-engine migration.

A runtime comparison requires a project-overlay-defined problem, named candidates, representative slice, metrics, budget and owner approval.

For an approved future native/full-engine target, preserve DCC/provider sources, neutral assets/caches/manifests and target derivatives so the new target reuses expensive work.

## Phase 8 — Release

Release remains project-overlay controlled and may require branch promotion, signing/store/hosting, migrations, canary/rollback, monitoring, security/license review and explicit owner authorization.

## Phase 9 — Handoff and resume

Before a session ends:

- commit or clearly preserve dirty work;
- update ledger/evidence/handoff;
- record next atomic requirement and blockers;
- stop dev servers/provider pollers;
- preserve provider task IDs/download hashes;
- preserve topology, spatial-connection, animation and portability records;
- leave enough state for another model to resume without chat history.