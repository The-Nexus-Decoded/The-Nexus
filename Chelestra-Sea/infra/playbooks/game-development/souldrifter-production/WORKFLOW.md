# SoulDrifter Ticket Workflow — Multi-LLM

## Phase -1 — Production toolchain preflight

Before audit or implementation, execute `ONBOARDING.md` and `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`.

The session must prove the required repository, provider, Houdini, Blender, runtime, GPU, storage, secret, and asset-registry lanes are actually available. Documentation alone is not a connection test.

## Phase A — Global audit before large parallel execution

The first orchestrator session enumerates every open SoulDrifter issue and related open PR.

Classify each:

- `CONTINUE_VALID`
- `REVALIDATE`
- `REWORK_REQUIRED`
- `SUPERSEDED_OR_LEGACY`
- `BLOCKED`
- `OWNER_DECISION_REQUIRED`
- `CLOSE_CANDIDATE_AFTER_VERIFICATION`

Compare existing work to binding rules, latest owner comments, current runtime/canon, this harness, current phase rules, the verified Tripo/modular-character direction, custom-animation bakeoff policy, and combat/VFX rules.

The global audit creates the execution map; it does not implement every ticket.

## Phase 0 — Session startup

Follow `START_HERE.md`, complete onboarding/toolchain receipts, and create a Context Receipt.

## Phase 1 — Ticket intake

Fetch issue + all comments + linked PRs, confirm worktree, inspect current files, and create/update `.agent-state/<issue>/ticket-contract.json`.

## Phase 2 — Requirement expansion

Expand hidden dependencies into explicit testable rows.

Examples:

- a door requires a source aperture, frame, collision state, connector, destination aperture, player traversal, and evidence;
- a generated asset requires provider connection, quote/approval, source/provenance, controlled download, segmentation/retopo before rig, deformation, animation, runtime, performance, and rollback;
- a custom animation not acceptably covered by Tripo requires one Houdini KineFX candidate, one Blender candidate, a fair common-input contract, automated gates, blind AI review, owner verdict, winner integration, and experiment-registry update;
- a new combat ability requires source research, mechanics, chain/status, cooldown/resource, animation, VFX/SFX markers, target reaction, both combat modes, UI state, and authoritative fields.

## Phase 3 — Baseline audit

Identify genuinely complete work, unproven claims, stale/legacy work, baseline tests, and fresh evidence.

## Phase 4 — Claim and isolation

One worker session = one issue + one branch + one worktree.

Record high-conflict/shared-file claims. If claims overlap, serialize or assign an explicit integration owner.

For a dual animation bakeoff, Houdini and Blender producers may work in isolated source subdirectories or dedicated animation worktrees, but one integration owner controls the canonical runtime action ID and final winner merge.

## Phase 5 — Dependency-order implementation

World:

`map/topology -> registry -> shells/openings -> connectors -> collision/nav -> dressing -> materials/lighting -> VFX -> runtime traversal -> performance -> QA`

Character/animated asset:

`toolchain preflight -> exact quote/approval -> concept/reference -> generation/input -> segmentation where needed -> mesh completion/retopo/low-poly -> texture/material -> rig check -> rig -> deformation -> Tripo preset search -> direct preset OR custom-animation routing -> modular attachments -> runtime assembly -> gameplay proof -> performance`

Custom animation not covered by Tripo:

`lock common brief/rig/source motion -> Houdini KineFX candidate + Blender candidate -> automated admissibility gates -> blind independent AI review -> owner A/B review -> label reveal -> winner integration -> loser preservation -> experiment registry -> independent verification`

Combat:

`source/canon -> mechanics -> chain/status -> resource/cooldown -> animation route/bakeoff -> VFX/SFX -> runtime contact -> target reaction -> both combat modes -> QA`

## Phase 6 — Producer checks

Worker runs checks, captures evidence, updates ledger, commits, and stops at `IMPLEMENTED_UNVERIFIED`.

A Houdini or Blender producer may not declare its own candidate the bakeoff winner.

## Phase 7 — Blind comparison and independent verification

For required custom-animation bakeoffs:

1. a coordinator randomizes candidate labels;
2. an independent AI reviewer scores both candidates without pipeline labels;
3. the owner reviews the blinded side-by-side result;
4. labels are revealed only after the verdict is recorded;
5. the selected winner enters normal independent runtime verification.

For all other requirements, the verifier independently re-derives expectations and returns PASS / FAIL / NEEDS_EVIDENCE.

## Phase 8 — Deterministic done gate

Fail if critical rows are not VERIFIED, dependencies/evidence/tests are missing, producer self-verifies, expected matrices are incomplete, provider/toolchain receipts are missing, owner-only spend approval is absent, required animation bakeoff records are missing, GPU proof is missing, combat modes diverge, or rollback/provenance is incomplete.

## Phase 9 — Owner-ready

After machine + verifier gates, provide fresh evidence and mark `OWNER_READY`.

Never merge/deploy without owner authorization.

## Phase 10 — Handoff

Commit, update ledger/handoff, store next atomic requirement/blockers, stop dev server/provider pollers, preserve exact task IDs/output paths, and update the animation bakeoff registry when applicable.

The next chat resumes from repository state, not chat history.