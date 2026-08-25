# Universal Game Production Workflow

## Phase -1 — Session fast start or full bootstrap

Every session begins with `SESSION_FAST_START.md`.

- If the cached workstation/toolchain receipt is valid, use it and continue.
- If a required lane is missing, stale, failed or newly selected, bootstrap only that lane through `ONBOARDING.md` and `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`.
- Do not reinstall every provider/DCC/engine in every chat.
- Immediately before a paid provider operation, refresh balance/pricing/allowance and obtain exact owner approval.

## Phase A — Global project audit

The first orchestrator session:

1. validates `project-profile.json` and the project overlay;
2. discovers existing worktrees/branches;
3. reads open tickets/PRs/comments;
4. classifies work as continue, revalidate, rework, superseded, blocked, owner-decision or close-candidate;
5. builds dependency, provider, file-collision and parallel-safety maps;
6. identifies the smallest complete vertical slice.

The audit does not broadly implement tickets.

## Phase 0 — Ticket intake

For the assigned ticket:

- fetch live issue/comments/PR/reviews/head;
- reconcile local worktree/branch/head without discarding unexplained work;
- load `.agent-state/<ticket>/`;
- create/update ticket contract, completion ledger, evidence manifest, handoff and work claim;
- load only selected genre/platform/engine/provider modules.

## Phase 1 — Requirement compilation

Convert prose into explicit, testable contracts.

Examples:

- **Procedural level edge:** logical edge type -> source socket/boundary -> constructive destination placement -> shared boundary/opening/connector -> elevation -> collision/nav/real-controller traversal -> evidence.
- **3D asset:** concept/reference -> approved provider task -> controlled download -> segmentation/edit -> topology/material -> rig/animation -> LOD/collision/sockets -> runtime -> device/performance -> provenance/rollback.
- **Custom animation:** provider preset search -> routing classification -> common brief -> two candidates when required -> blind review -> owner verdict -> winner integration -> registry data.
- **Gameplay action:** input -> state/resource/cooldown -> animation/contact -> VFX/audio -> target reaction -> network/save -> UI -> scheduler modes -> QA.

## Phase 2 — Baseline audit

Before editing:

- run current tests/runtime;
- identify genuinely verified work;
- identify claims without proof;
- capture current visual/performance evidence;
- freeze valid regions/components to prevent unnecessary rebuilds;
- produce an atomic defect/requirement list.

## Mandatory procedural-layout gate

For generated rooms, buildings, roads, tracks, platforms or zones, read `PROCEDURAL_LEVEL_TOPOLOGY_POLICY.md`.

Required architecture:

```text
logical graph
-> constructive edge-by-edge spatial embedding
-> canonical shared boundaries/openings
-> actual-geometry plan/section validation
-> runtime geometry/collision/navigation
-> dressing/FX
```

The generator must not place independently sealed modules and connect them after placement.

For each edge:

1. choose a legal source socket/boundary;
2. choose explicit connection semantics;
3. choose a compatible destination socket/orientation;
4. calculate the connector/shared boundary;
5. place the destination relative to that edge;
6. validate overlap, clearance, elevation, boundary, surface/volume, collision and navigation;
7. accept the destination only when the complete edge passes;
8. otherwise retry or backtrack;
9. reject the variant when legal embedding cannot be found.

Before dressing, generate diagnostics from the actual embedded geometry and pass automated topology checks, applicable AI/vision review and required owner/design review.

## Phase 3 — Implementation in dependency order

### Level/world

`logical graph -> constructive embedding/backtracking -> actual-geometry plan/section gate -> canonical boundaries/openings -> shared shell/surfaces -> connectors/elevation transitions -> collision/nav -> real-controller traversal -> interactions/encounters -> dressing -> materials/lighting -> VFX/audio -> performance -> QA`

### 3D asset

`toolchain lane check -> exact quote/approval -> concept/reference -> provider 3D generation/import -> segmentation/mesh processing -> topology/UV/material -> rig -> animation -> sockets/LOD/collision -> export -> runtime -> performance -> QA`

### Custom animation

`preset/custom capability search -> route selection -> locked common inputs -> configured candidate lanes -> automated gates -> blind AI review -> blinded owner verdict -> winner integration -> registry update -> independent verification`

### Code/runtime feature

`data/schema -> service/state machine -> runtime integration -> UI/input -> save/network -> observability -> tests -> target-device proof`

## Phase 4 — Producer checks

A producer:

- commits atomic increments;
- runs automated/runtime checks;
- stores fresh evidence;
- updates ledger/handoff;
- records provider task/cost/provenance when applicable;
- stops at `IMPLEMENTED_UNVERIFIED`.

The producer may not self-verify or merge/deploy without authorization.

## Phase 5 — Independent verification

The verifier:

- re-derives requirements from source truth;
- tests the exact current commit;
- rejects stale/producer-only evidence;
- uses real target devices/render APIs where required;
- returns PASS, FAIL or NEEDS_EVIDENCE per requirement;
- alone may move rows to `VERIFIED`.

For procedural levels, the verifier checks the actual-geometry diagnostic and traverses each required physical edge with the real controller/input. Debug teleport/pathfinding alone is not proof.

For animation bakeoffs, the reviewer/verifier must not be either candidate producer.

## Phase 6 — Owner-ready gate

A ticket becomes owner-ready only when:

- all critical rows are VERIFIED;
- topology records/invariants pass where applicable;
- provider/toolchain/spend receipts are valid;
- provenance/licenses/rollback are complete;
- target-device performance passes;
- required owner creative verdicts are stored;
- tests/build/package/release checks pass;
- no unresolved blockers remain.

## Phase 7 — Runtime/portability decisions

A project keeps its accepted runtime stable through the vertical slice.

The universal core does not prescribe a default lateral browser-engine migration.

A runtime comparison requires a project-overlay-defined problem, named candidates, representative slice, metrics, budget and owner approval.

If an approved future native/full-engine target is needed, preserve DCC/provider sources, neutral assets/caches/manifests and target-specific derivatives so the new target reuses expensive work rather than restarting.

## Phase 8 — Release

Release remains project-overlay controlled and may require branch promotion, signing/store/hosting, migrations, canary/rollback, monitoring, security/license review and explicit owner authorization.

## Phase 9 — Handoff and resume

Before a session ends:

- commit or clearly preserve dirty work;
- update ledger/evidence/handoff;
- record next atomic requirement and blockers;
- stop dev servers/provider pollers;
- preserve provider task IDs/download hashes;
- preserve topology/animation/portability records when applicable;
- leave enough state for another model to resume without chat history.
