# Universal Game Production Workflow

## Phase -1 — Session fast start or full bootstrap

Every session begins with `SESSION_FAST_START.md`.

- If the cached workstation/toolchain receipt is valid, use it and continue.
- If a required lane is missing, stale, failed, or newly selected, bootstrap only that lane through `ONBOARDING.md` and `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`.
- Do not reinstall every provider/DCC/engine in every chat.
- Immediately before a paid provider operation, always refresh balance/pricing and obtain exact owner approval.

## Phase A — Global project audit

The first orchestrator session for a project:

1. validates `project-profile.json` and the project overlay;
2. discovers existing worktrees/branches;
3. reads all open tickets/PRs/comments;
4. classifies work as continue, revalidate, rework, superseded, blocked, owner-decision, or close-candidate;
5. builds dependency, provider, file-collision, and parallel-safety maps;
6. identifies the smallest complete vertical slice.

The audit does not broadly implement tickets.

## Phase 0 — Ticket intake

For the assigned ticket:

- fetch live issue/comments/PR/reviews/head;
- reconcile local worktree/branch/head without discarding unexplained work;
- load `.agent-state/<ticket>/`;
- create/update ticket contract, completion ledger, evidence manifest, handoff, and work claim;
- load only selected genre/platform/engine/provider modules.

## Phase 1 — Requirement compilation

Convert prose into explicit, testable contracts.

Examples:

- **Level connection:** source aperture -> portal/frame -> connector geometry -> destination aperture -> collision/nav/player traversal -> evidence.
- **3D asset:** concept/reference -> approved provider task -> controlled download -> segmentation/edit -> topology/material -> rig/animation -> LOD/collision/sockets -> runtime -> device/performance -> provenance/rollback.
- **Custom animation:** provider preset search -> routing classification -> common brief -> two candidates when required -> blind review -> owner verdict -> winner integration -> registry data.
- **Gameplay action:** input -> state/resource/cooldown -> animation/contact -> VFX/audio -> target reaction -> network/save -> UI -> both relevant scheduler modes -> QA.

## Phase 2 — Baseline audit

Before editing:

- run current tests/runtime;
- identify genuinely verified work;
- identify claims without proof;
- capture current visual/performance evidence;
- freeze valid regions/components to prevent unnecessary rebuilds;
- produce an atomic defect/requirement list.

## Phase 3 — Implementation in dependency order

### Level/world

`design graph -> map/layout -> registry -> shells/openings -> connectors -> collision/nav -> interactions/encounters -> dressing -> materials/lighting -> VFX/audio -> runtime traversal -> performance -> QA`

### 3D asset

`toolchain lane check -> exact quote/approval -> host-LLM concept/reference -> provider 3D generation/import -> segmentation/mesh processing -> topology/UV/material -> rig -> animation -> sockets/LOD/collision -> export -> runtime -> performance -> QA`

### Custom animation

`preset/custom capability search -> route selection -> locked common inputs -> Houdini KineFX candidate + Blender candidate (when policy requires) -> automated gates -> blind AI review -> blinded owner verdict -> winner integration -> registry update -> independent verification`

### Code/runtime feature

`data/schema -> service/state machine -> runtime integration -> UI/input -> save/network -> observability -> tests -> target-device proof`

## Phase 4 — Producer checks

A producer:

- commits atomic increments;
- runs automated and runtime checks;
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
- returns PASS, FAIL, or NEEDS_EVIDENCE per requirement;
- alone may move rows to `VERIFIED`.

For animation bakeoffs, the reviewer/verifier must not be either candidate producer.

## Phase 6 — Owner-ready gate

A ticket becomes owner-ready only when:

- all critical rows are VERIFIED;
- provider/toolchain/spend receipts are valid;
- provenance/licenses/rollback are complete;
- target-device performance passes;
- required owner creative verdicts are stored;
- tests/build/package/release checks pass;
- no unresolved blockers remain.

## Phase 7 — Release

Release remains project-overlay controlled and may require:

- branch promotion policy;
- signing/store/hosting configuration;
- migrations;
- canary/rollback;
- analytics/crash/error monitoring;
- security/license review;
- explicit owner authorization.

## Phase 8 — Handoff and resume

Before a session ends:

- commit or clearly preserve dirty work;
- update ledger/evidence/handoff;
- record next atomic requirement and blockers;
- stop dev servers/provider pollers;
- preserve provider task IDs/download hashes;
- leave enough state for another model to resume without chat history.
