# SoulDrifter Ticket Workflow — Multi-LLM

## Phase -1 — Session fast-start / toolchain state

Normal chats use `SESSION_FAST_START.md` and cached machine/toolchain receipts.

Run full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` only when a required lane is missing, stale or invalidated. Paid provider work still receives a live balance/pricing/approval refresh immediately before submission.

## Phase A — Global audit

The first orchestrator session enumerates open SoulDrifter issues and related PRs, then classifies each as continue, revalidate, rework, superseded, blocked, owner-decision or close-candidate.

The audit builds dependency, provider, file-collision and parallel-safety maps. It does not broadly implement tickets.

## Phase 0 — Session startup

Follow `START_HERE.md`, return the Session Receipt and Context Receipt, and load live issue/PR state before editing.

## Phase 1 — Ticket intake

Fetch issue + all comments + linked PRs, confirm the worktree, inspect current files, and create/update `.agent-state/<issue>/ticket-contract.json`.

## Phase 2 — Requirement expansion

Expand hidden dependencies into explicit testable rows.

Examples:

- **Door/gate:** source aperture -> frame/leaf -> state/collision -> destination clearance -> real traversal -> evidence.
- **Procedural spatial edge:** source node/socket/surface/volume -> explicit connection type -> destination placement -> canonical boundaries/surfaces/volumes -> movement/camera/resource contract -> real traversal -> evidence.
- **Underwater tunnel:** water volume -> entry transition -> swim/dive controller -> oxygen/drowning -> current/hazard -> air pocket or emergence point -> camera/lighting -> save/reload -> recovery -> evidence.
- **Climb/ladder:** mount point -> climb surface/spline -> animation/camera/stamina -> interruption/fall -> dismount/top-out -> AI support -> evidence.
- **Living dungeon/mega-zone:** before/after or region graph -> streaming/local subgraphs -> atomic collision/nav state -> player relocation safety -> persistence -> evidence.
- **Generated asset:** provider lane -> quote/approval -> source/provenance -> controlled download -> geometry processing before rig -> deformation -> animation -> runtime -> performance -> rollback.
- **Custom animation:** Tripo preset search -> Houdini KineFX candidate + Blender candidate when required -> blind AI review -> owner verdict -> winner integration -> experiment record.
- **Combat ability:** source/canon -> mechanics -> chain/status -> cooldown/resource -> animation/VFX/SFX -> target reaction -> both combat modes -> UI -> QA.

## Mandatory topology and traversal gate

For every procedural/randomized or traversal-heavy level, read:

- `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`;
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`;
- `config/dungeon-topology-policy.json`;
- `config/spatial-connection-policy.json`.

Required architecture:

```text
logical graph + explicit traversal contracts
-> constructive edge-by-edge spatial embedding
-> canonical boundaries, surfaces and volumes
-> actual-geometry plan/section/volume/state diagnostics
-> runtime geometry/collision/navigation/movement states
-> gameplay/dressing/FX
```

The generator must not place independently sealed modules and connect them after placement.

### Constructive growth

For each edge:

1. choose a legal source socket, surface, path or volume;
2. choose the exact connection type, movement mode, medium and directionality;
3. select a compatible destination socket/orientation/state;
4. calculate the shared boundary, connector path/spline, surface or volume;
5. derive the destination transform from that connection;
6. validate overlap, clearance, elevation/depth, surfaces/volumes, collision, navigation, camera, resources, hazards and recovery;
7. accept the destination only when the complete edge passes;
8. otherwise retry or backtrack;
9. reject the variant when legal embedding cannot be found.

### Supported traversal families

The full catalog includes:

- open adjacency, doors/gates, corridors, crawlspaces and secret/destructible passages;
- stairs, ramps, ladders, climbing, mantling, lifts, drops, ropes and moving platforms;
- jumps, bridges, balance paths and platform sequences;
- wading, surface swimming, underwater tunnels, dive shafts, air pockets, currents, waterfalls and boats;
- biome transitions, labyrinths, mega-zones and living-dungeon transformations;
- vehicles, streaming boundaries, true portal transfers and non-Euclidean connections.

A physical edge cannot pass by pointing at coordinates or pathfinding through missing geometry. A true transfer edge is explicitly nonphysical and creates no fake corridor.

### Diagnostic requirements

Generate diagnostics from actual solved data:

- plan/top-down for horizontal routes;
- section/elevation for vertical routes;
- 3D volume/slice views for water and air-pocket routes;
- state graphs/timelines for moving or transforming topology;
- region/streaming maps and local subgraphs for mega-zones.

Required before dressing:

1. automated topology/traversal invariants;
2. applicable independent AI/vision review;
3. owner design verdict for initial generator architecture or major changes.

### Current First Breach

The current First Breach contains no magical teleport/`PORTAL_TRANSFER` edge. Its route gates, corridors, stairs/landings and Soulwell exit veil are physical continuous connections.

Generate the selected randomized branch after the player chooses Wayfarer or Oathbreaker and before gallery meshes render.

## Phase 3 — Baseline audit

Identify genuinely complete work, unproven claims, stale/legacy work, baseline tests and fresh evidence.

For #451, audit the current slot-center/closed-box generator rather than assuming its layout data is architecturally valid.

## Phase 4 — Claim and isolation

One worker session = one issue + one branch + one worktree.

Serialize overlapping high-conflict files or assign an explicit integration owner.

For animation bakeoffs, Houdini and Blender producers work in isolated source areas; one integration owner controls the canonical runtime action ID and winner integration.

## Phase 5 — Dependency-order implementation

### World/level

`logical graph -> traversal contracts -> constructive embedding/backtracking -> plan/section/volume/state gate -> canonical boundaries/surfaces/volumes -> shared shell/terrain/water -> collision/nav/controller states -> real-input traversal -> interactions/encounters -> dressing -> materials/lighting -> Houdini/Three.js FX -> performance/mobile -> QA`

### Character/animated asset

`toolchain state -> quote/approval -> concept/reference -> generation/input -> segmentation/mesh processing -> texture/material -> rig check -> rig -> deformation -> Tripo preset search -> direct preset OR custom-animation routing -> modular attachments -> runtime assembly -> gameplay proof -> performance`

### Custom animation

`lock common brief/rig/source motion -> Houdini KineFX + Blender candidates -> automated gates -> blind AI review -> owner A/B review -> label reveal -> winner integration -> loser preservation -> registry -> independent verification`

### Combat

`source/canon -> mechanics -> chain/status -> resource/cooldown -> animation route/bakeoff -> VFX/SFX -> runtime contact -> target reaction -> both combat modes -> QA`

## Phase 6 — Producer checks

The worker runs checks, captures evidence, updates ledger/state, commits and stops at `IMPLEMENTED_UNVERIFIED`.

A producer may not declare its own work verified or its own animation candidate the winner.

## Phase 7 — Independent verification

For level topology, the verifier independently derives the expected graph and connection contracts, inspects actual diagnostics, and uses the real movement mode for every required edge:

- walk/click-to-move;
- crouch/crawl;
- climb/mantle/ladder;
- jump/platform/rope;
- swim/dive/oxygen/air pockets;
- ride/transport;
- true transfer activation/arrival when applicable.

Debug warp never proves connectivity.

For custom-animation bakeoffs, a coordinator blinds labels, an independent AI reviewer scores both, the owner records the A/B verdict, labels are revealed, and the winner enters normal verification.

All other requirements receive PASS / FAIL / NEEDS_EVIDENCE.

## Phase 8 — Deterministic done gate

Fail if critical rows are not VERIFIED, dependencies/evidence/tests are missing, producer self-verifies, topology or spatial-connection records are incomplete, movement/resource/recovery contracts are untested, provider/toolchain receipts are missing, owner-only spend approval is absent, animation bakeoff records are missing, GPU proof is missing, combat modes diverge, or rollback/provenance is incomplete.

## Phase 9 — Owner-ready

After machine + verifier gates, provide fresh evidence and mark `OWNER_READY`.

Never merge/deploy without owner authorization.

## Phase 10 — Handoff

Commit, update ledger/evidence/handoff, record next atomic requirement/blockers, stop dev servers/provider pollers, preserve provider task IDs/output paths, and update topology, spatial-connection, animation and portability records.

The next chat resumes from repository state, not chat history.