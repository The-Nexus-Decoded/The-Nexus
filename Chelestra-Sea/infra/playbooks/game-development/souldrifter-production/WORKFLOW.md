# SoulDrifter Ticket Workflow — Multi-LLM

## Phase -1 — Session fast-start / toolchain state

Normal chats use `SESSION_FAST_START.md` and cached machine/toolchain receipts.

Run full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` only when a required lane is missing, stale or invalidated. Paid provider work still receives a live balance/pricing/approval refresh immediately before submission.

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

Compare existing work to binding rules, latest owner comments, current runtime/canon, this harness, current phase rules, verified provider/tool lanes, modular-character direction, custom-animation bakeoff policy and combat/VFX rules.

The global audit creates the execution map; it does not implement every ticket.

## Phase 0 — Session startup

Follow `START_HERE.md`, return the Session Receipt and Context Receipt, and load live ticket/PR state before editing.

## Phase 1 — Ticket intake

Fetch issue + all comments + linked PRs, confirm worktree, inspect current files, and create/update `.agent-state/<issue>/ticket-contract.json`.

## Phase 2 — Requirement expansion

Expand hidden dependencies into explicit testable rows.

Examples:

- a door requires a source aperture, frame, collision state, connector, destination aperture, player traversal and evidence;
- a generated asset requires provider lane, quote/approval, source/provenance, controlled download, geometry processing before rig, deformation, animation, runtime, performance and rollback;
- a custom animation not acceptably covered by Tripo requires one Houdini KineFX candidate, one Blender candidate, identical common inputs, automated gates, blind AI review, owner verdict, winner integration and experiment-registry update;
- a new combat ability requires source research, mechanics, chain/status, cooldown/resource, animation, VFX/SFX markers, target reaction, both combat modes, UI state and authoritative fields;
- a randomized room edge requires logical edge semantics, source socket/aperture, shared-boundary ownership, connector geometry, destination socket/aperture, elevation, collision/nav continuity and real-controller traversal.

## Mandatory procedural architectural gate

Read `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md` and `config/dungeon-topology-policy.json` for every procedural/randomized dungeon change.

The generator must use:

```text
logical run graph
-> constructive edge-by-edge spatial embedding
-> canonical shared boundaries/apertures
-> accepted top-down architectural plan
-> one shared shell
-> collision/navigation
-> 3D dressing and FX
```

It must not place independently sealed room boxes at slot centers and attach corridors/doors afterward.

### Constructive growth

For each edge:

1. choose a legal source socket on accepted geometry;
2. choose the exact connection type;
3. select a compatible destination socket/orientation;
4. calculate shared boundary or connector;
5. place the destination room relative to that connector;
6. validate overlap, clearance, elevation, boundaries, floor/ceiling, collision and nav;
7. accept the room only when the full edge is valid;
8. otherwise retry or backtrack;
9. reject the generated result if legal embedding cannot be found.

### Connection semantics

Every edge is explicit:

- direct open adjacency;
- shared-wall door/gate adjacency;
- physical corridor;
- magical/teleport portal;
- vertical transition.

A portal-transfer edge creates no fake corridor. A physical connection cannot pass by pointing at coordinates or by pathfinding through missing geometry.

### Top-down gate

Every generated route/seed produces a diagnostic top-down plan from the **actual embedded geometry** showing room polygons, canonical boundaries, apertures, doors/gates, corridor polygons/centerlines, elevation, clearance/nav, logical edges, physical matches and error overlays.

Required before shell dressing:

1. automated topology invariants;
2. independent AI/vision review;
3. owner design verdict for the initial generator architecture or major changes.

Hard failures include:

- duplicate/coincident shared walls;
- independently closed adjacent room shells;
- corridors ending at intact walls;
- missing destination apertures;
- overlapping rooms/floors/ceilings;
- orphan portals/doors;
- navigation connected while rendered geometry is blocked;
- unsupported elevation changes;
- any required logical edge without one complete physical resolution.

## Phase 3 — Baseline audit

Identify genuinely complete work, unproven claims, stale/legacy work, baseline tests and fresh evidence.

For #451, audit the current slot-center/box-shell generator rather than assuming its layout data is architecturally valid.

## Phase 4 — Claim and isolation

One worker session = one issue + one branch + one worktree.

Record high-conflict/shared-file claims. If claims overlap, serialize or assign an explicit integration owner.

For a dual animation bakeoff, Houdini and Blender producers may work in isolated source subdirectories/worktrees, but one integration owner controls the canonical runtime action ID and final winner integration.

## Phase 5 — Dependency-order implementation

World:

`logical graph -> constructive embedding/backtracking -> top-down actual-geometry proof -> canonical boundaries/openings -> shared shell -> connectors/elevation transitions -> collision/nav -> real-input traversal -> dressing -> materials/lighting -> Houdini/Three.js FX -> performance/mobile -> QA`

Character/animated asset:

`toolchain state -> exact quote/approval -> concept/reference -> generation/input -> segmentation/mesh processing -> texture/material -> rig check -> rig -> deformation -> Tripo preset search -> direct preset OR custom-animation routing -> modular attachments -> runtime assembly -> gameplay proof -> performance`

Custom animation not covered by Tripo:

`lock common brief/rig/source motion -> Houdini KineFX candidate + Blender candidate -> automated admissibility gates -> blind independent AI review -> owner A/B review -> label reveal -> winner integration -> loser preservation -> experiment registry -> independent verification`

Combat:

`source/canon -> mechanics -> chain/status -> resource/cooldown -> animation route/bakeoff -> VFX/SFX -> runtime contact -> target reaction -> both combat modes -> QA`

## Phase 6 — Producer checks

Worker runs checks, captures evidence, updates ledger, commits and stops at `IMPLEMENTED_UNVERIFIED`.

A Houdini or Blender producer may not declare its candidate the bakeoff winner.

## Phase 7 — Blind comparison and independent verification

For required custom-animation bakeoffs:

1. a coordinator randomizes candidate labels;
2. an independent AI reviewer scores both candidates without pipeline labels;
3. the owner reviews the blinded side-by-side result;
4. labels are revealed only after the verdict is recorded;
5. the selected winner enters normal independent runtime verification.

For level topology, the verifier independently derives the expected graph, checks the actual-geometry top-down plan, and physically traverses each required edge without warp.

For all other requirements, the verifier independently re-derives expectations and returns PASS / FAIL / NEEDS_EVIDENCE.

## Phase 8 — Deterministic done gate

Fail if critical rows are not VERIFIED, dependencies/evidence/tests are missing, producer self-verifies, expected matrices are incomplete, topology records/invariants are missing, provider/toolchain receipts are missing, owner-only spend approval is absent, required animation bakeoff records are missing, GPU proof is missing, combat modes diverge, or rollback/provenance is incomplete.

## Phase 9 — Owner-ready

After machine + verifier gates, provide fresh evidence and mark `OWNER_READY`.

Never merge/deploy without owner authorization.

## Phase 10 — Handoff

Commit, update ledger/handoff, store next atomic requirement/blockers, stop dev server/provider pollers, preserve exact task IDs/output paths, update topology and animation experiment registries, and record runtime-portability assets when applicable.

The next chat resumes from repository state, not chat history.