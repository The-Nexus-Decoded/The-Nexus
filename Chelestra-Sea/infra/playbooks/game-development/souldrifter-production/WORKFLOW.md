# SoulDrifter Ticket Workflow — Multi-LLM

## Phase -1 — Session fast-start / toolchain state

Normal chats use `SESSION_FAST_START.md` and cached machine/toolchain receipts.

Run full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` only when a required lane is missing, stale or invalidated. Paid provider work still receives a live balance/pricing/approval refresh immediately before submission.

## Phase A — Global audit

The first orchestrator session enumerates open SoulDrifter issues and related PRs, classifies each as continue, revalidate, rework, superseded, blocked, owner-decision or close-candidate, and builds dependency/provider/file-collision/parallel-safety maps.

The audit does not broadly implement tickets.

## Phase 0 — Session startup

Follow `START_HERE.md`, return the Session Receipt and Context Receipt, and load live issue/PR state before editing.

## Phase 1 — Ticket intake

Fetch issue + all comments + linked PRs, confirm the worktree, inspect current files, and create/update `.agent-state/<issue>/ticket-contract.json`.

For every zone/environment ticket, load:

- `ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`;
- `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`;
- `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`;
- the zone completion config/template.

## Phase 2 — Requirement expansion

Expand hidden dependencies into explicit testable rows.

Examples:

- **Door/gate:** source aperture -> frame/leaf -> state/collision -> destination clearance -> real traversal -> evidence.
- **Procedural spatial edge:** source node/socket/surface/volume -> explicit connection type -> destination placement -> canonical boundaries/surfaces/volumes -> movement/camera/resource contract -> real traversal -> evidence.
- **Environment staging:** space-purpose profile -> semantic zones -> structural fixtures -> functional furniture -> containers/cover -> wall/ceiling objects -> storytelling/clutter -> classification -> placement audit.
- **Collision:** prop-complete actual-character walkthrough -> defect inventory -> positive/negative collision -> camera/body-profile checks -> repair -> route regression.
- **Interaction/destruction:** prompt/range -> state machine -> animation/events -> collision update -> inventory/loot -> persistence -> failure/recovery -> evidence.
- **Underwater tunnel:** water volume -> entry transition -> swim/dive controller -> oxygen/drowning -> current/hazard -> air pocket/emergence -> camera/lighting -> save/reload -> recovery -> evidence.
- **Climb/ladder:** mount point -> climb surface/spline -> animation/camera/stamina -> interruption/fall -> dismount/top-out -> AI support -> evidence.
- **Living dungeon/mega-zone:** before/after or region graph -> streaming/local subgraphs -> atomic collision/nav state -> player relocation safety -> persistence -> evidence.
- **Generated asset:** provider lane -> quote/approval -> source/provenance -> controlled download -> geometry processing before rig -> deformation -> animation -> runtime -> performance -> rollback.
- **Custom animation:** Tripo preset search -> Houdini KineFX candidate + Blender candidate when required -> blind AI review -> owner verdict -> winner integration -> experiment record.
- **Combat ability:** source/canon -> mechanics -> chain/status -> cooldown/resource -> animation/VFX/SFX -> target reaction -> both combat modes -> UI -> QA.

---

# Mandatory zone/environment stage order

Every zone/environment uses:

```text
0. design/purpose contract
1. topology and connection solver
2. shared shell, surfaces and traversal volumes
3. environment staging and prop placement
4. prop-complete walkthrough / collision discovery
5. collision implementation and regression
6. interaction, pickup and destruction
7. final integrated environment walkthrough
8. independent environment verification
9. separate zone-population/gameplay ticket
```

Rules:

- final props are placed before the collision walkthrough;
- an empty-shell traversal cannot substitute for the staged collision pass;
- navigation/pathfinding cannot substitute for collision;
- interaction/destruction cannot be accepted before collision passes;
- population/encounters cannot begin before the environment package is verified;
- any later population change that moves props or changes collision reopens the affected environment gates.

## Environment staging versus population

Environment ticket owns:

- shell and environmental fixtures;
- furniture, paintings, statues, chests, containers, crates, barrels, wall objects, cover, ambient remains and clues;
- collision/interaction/destruction classification;
- base chest/pickup/destruction proof using deterministic test contents;
- final environment verification.

Separate population/gameplay ticket owns:

- NPC/monster spawns;
- patrols, random encounters and respawn;
- quest actors/objectives/dialogue;
- production loot/drop tables;
- encounter composition and combat pacing;
- AI population persistence/network behavior.

---

# Mandatory topology and traversal gate

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
-> shared shell and structural movement intent
-> semantic staging
-> prop-complete collision/interaction/destruction gates
```

The generator must not place independently sealed modules and connect them after placement.

### Constructive growth

For each edge:

1. choose a legal source socket, surface, path or volume;
2. choose the exact connection type, movement mode, medium and directionality;
3. select a compatible destination socket/orientation/state;
4. calculate the shared boundary, connector path/spline, surface or volume;
5. derive the destination transform from that connection;
6. validate overlap, clearance, elevation/depth, surfaces/volumes, structural collision/nav intent, camera, resources, hazards and recovery;
7. accept the destination only when the complete edge passes;
8. otherwise retry or backtrack;
9. reject the variant when legal embedding cannot be found.

### Supported traversal families

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

Required before shell/staging acceptance:

1. automated topology/traversal invariants;
2. applicable independent AI/vision review;
3. owner design verdict for initial generator architecture or major changes.

### Current First Breach

The current First Breach contains no magical teleport/`PORTAL_TRANSFER` edge. Its route gates, corridors, stairs/landings and Soulwell exit veil are physical continuous connections.

Generate the selected randomized branch after the player chooses Wayfarer or Oathbreaker and before gallery meshes render.

The branch already contains extensive props. Preserve valid staging, audit/freeze it, then run the prop-complete collision and interaction/destruction sequence.

## Phase 3 — Baseline audit

Identify genuinely complete work, unproven claims, stale/legacy work, baseline tests and fresh evidence.

For #451, audit both:

- the current generator/topology implementation;
- the complete existing prop placement and its collision/interaction/destruction classifications.

## Phase 4 — Claim and isolation

One worker session = one issue + one branch + one worktree.

Serialize overlapping high-conflict files or assign an explicit integration owner.

For animation bakeoffs, Houdini and Blender producers work in isolated source areas; one integration owner controls the canonical runtime action ID and winner integration.

## Phase 5 — Dependency-order implementation

### World/level environment

`design -> topology/traversal contracts -> constructive embedding/backtracking -> diagnostics -> shared shell/surfaces/volumes -> staging/prop placement -> prop-complete walkthrough -> collision repair/regression -> interaction/pickup/destruction -> final integrated environment walkthrough -> independent environment verification`

### Later zone population/gameplay

`verified environment sockets/routes -> NPC/monster spawns -> patrols/AI -> encounters/random encounters -> quests/dialogue/objectives -> production loot/drop tables -> population persistence -> combat/gameplay verification`

### Character/animated asset

`toolchain state -> quote/approval -> concept/reference -> generation/input -> segmentation/mesh processing -> texture/material -> rig check -> rig -> deformation -> Tripo preset search -> direct preset OR custom-animation routing -> modular attachments -> runtime assembly -> gameplay proof -> performance`

### Custom animation

`lock common brief/rig/source motion -> Houdini KineFX + Blender candidates -> automated gates -> blind AI review -> owner A/B review -> label reveal -> winner integration -> loser preservation -> registry -> independent verification`

### Combat

`source/canon -> mechanics -> chain/status -> resource/cooldown -> animation route/bakeoff -> VFX/SFX -> runtime contact -> target reaction -> both combat modes -> QA`

## Phase 6 — Producer checks

The worker runs checks, captures evidence, updates ledger/state, commits and stops at `IMPLEMENTED_UNVERIFIED`.

A producer may not declare its own work verified or its own animation candidate the winner.

For environment work, the producer must record separate statuses for staging, collision, interaction/destruction and the final integrated walkthrough.

## Phase 7 — Independent verification

For environment verification, the verifier:

- checks the accepted topology and connection contracts;
- audits the final prop-complete staging;
- traverses every required route with the actual controller/profile;
- tests visible solids and intended clear spaces;
- tests representative containers, pickups, destructibles and protected objects;
- verifies collision changes after opening/destruction;
- verifies save/reload and debris cleanup;
- checks desktop/mobile and real-GPU performance.

For traversal-specific edges, use the real movement mode:

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

Fail if critical rows are not VERIFIED, dependencies/evidence/tests are missing, producer self-verifies, topology/spatial-connection/zone-completion records are incomplete, staged props are unclassified, the collision pass used an empty shell, interaction/destruction/persistence is untested, provider/toolchain receipts are missing, owner-only spend approval is absent, animation bakeoff records are missing, GPU proof is missing, combat modes diverge, or rollback/provenance is incomplete.

## Phase 9 — Owner-ready

After machine + verifier gates, provide fresh evidence and mark `OWNER_READY`.

Never merge/deploy without owner authorization.

## Phase 10 — Handoff

Commit, update ledger/evidence/handoff, record next atomic requirement/blockers, stop dev servers/provider pollers, preserve provider task IDs/output paths, and update topology, spatial-connection, zone-completion, animation and portability records.

The next chat resumes from repository state, not chat history.