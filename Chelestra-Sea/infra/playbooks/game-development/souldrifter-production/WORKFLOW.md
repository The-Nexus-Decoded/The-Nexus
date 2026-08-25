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
- `ZONE_PRODUCTION_QUALITY_GATES.md`;
- `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`;
- `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`;
- the zone completion config/template.

## Phase 2 — Requirement expansion

Expand hidden dependencies into explicit testable rows.

Examples:

- **Zone seam:** source/destination IDs -> transforms/facing -> loading/streaming -> save/respawn -> state/audio/lighting handoff -> failure fallback.
- **Graybox:** real movement and route timing -> dimensions -> camera fit -> combat/telegraph space -> actor profiles -> spawn/patrol/quest reservations -> owner verdict.
- **Door/gate:** source aperture -> frame/leaf -> state/collision -> destination clearance -> real traversal -> evidence.
- **Procedural spatial edge:** source node/socket/surface/volume -> explicit connection type -> destination placement -> canonical boundaries/surfaces/volumes -> movement/camera/resource contract -> real traversal -> evidence.
- **Asset intake:** provenance/license/hash -> units/scale/axes/pivot -> geometry/material/textures -> LOD/culling/compression -> collision proxy -> interaction/destruction anchors -> registry acceptance.
- **Environment staging:** space-purpose profile -> semantic zones -> structural fixtures -> functional furniture -> containers/cover -> wall/ceiling objects -> storytelling/clutter -> classification -> placement audit.
- **Collision/physics:** prop-complete actual-character walkthrough -> defect inventory -> positive/negative collision -> surfaces/hazards -> camera/body-profile checks -> repair -> route regression.
- **Interaction/destruction:** prompt/range -> state machine -> animation/events -> collision/nav update -> inventory/loot -> persistence -> failure/recovery -> evidence.
- **Lookdev/audio:** materials/lighting/atmosphere/wayfinding -> reverb/occlusion/attenuation -> state cues -> accessibility -> performance.
- **Performance/streaming:** staged checkpoint metrics -> LOD/culling/instancing/compression -> slow-network/cache/resume/re-entry -> final device budget.
- **Recovery:** checkpoint/save/re-entry -> stuck/out-of-bounds -> dynamic-state recovery -> migration/fallback -> no soft lock.
- **Population readiness:** final spawn envelopes -> patrol/leash -> actor-size routes -> encounter/cover/LOS -> quest/cinematic/drop anchors -> stable socket manifest.
- **Generated asset:** provider lane -> quote/approval -> source/provenance -> controlled download -> geometry processing before rig -> deformation -> animation -> runtime -> performance -> rollback.
- **Custom animation:** Tripo preset search -> Houdini KineFX + Blender candidates when required -> blind AI review -> owner verdict -> winner integration -> experiment record.

---

# Mandatory zone/environment stage order

Every zone/environment uses:

```text
0.  design/canon/budget/zone-seam contract
1.  topology and connection/traversal solver
2.  graybox playability/scale/pacing/camera/socket reservation
3.  shared shell/surfaces/volumes/world seams
4.  asset intake and technical readiness
5.  environment staging and prop placement
6.  prop-complete walkthrough/collision discovery
7.  collision/physics/navigation/hazard regression
8.  interaction/pickup/destruction/dynamic state
9.  lookdev/lighting/atmosphere/wayfinding
10. audio/acoustics
11. performance/streaming/loading/memory
12. failure recovery/checkpoints/out-of-bounds/soft locks
13. device/input/camera/accessibility/network contract
14. population-readiness revalidation and handoff
15. final integrated walkthrough and experience review
16. independent environment verification
17. separate zone-population/gameplay ticket
```

Rules:

- graybox playability passes before expensive production art;
- assets pass technical intake before staging;
- final props are placed before the collision walkthrough;
- an empty-shell traversal cannot substitute for staged collision proof;
- navigation/pathfinding cannot substitute for collision;
- interaction/destruction cannot be accepted before collision/physics passes;
- atmosphere cannot hide topology or collision defects;
- performance is measured throughout and receives a dedicated final gate;
- recovery, out-of-bounds, save/re-entry, device/input and accessibility are required where applicable;
- population does not begin before environment verification, but population envelopes must be reserved early and revalidated late;
- changes reopen the lowest affected gate and every dependent gate.

## Environment staging versus population

Environment ticket owns:

- design/budgets/zone seams;
- topology/graybox/shell;
- asset intake;
- environmental fixtures/furniture/containers/art/cover/remains/clues;
- collision/physics/hazards;
- base interactions/destruction/deterministic test contents;
- lookdev/audio/performance/recovery/device checks;
- population-readiness socket handoff;
- independent environment verification.

Separate population/gameplay ticket owns:

- NPC/monster spawns;
- patrols, random encounters and respawn tuning;
- quest actors/objectives/dialogue;
- production loot/drop tables;
- encounter composition/combat pacing;
- AI population persistence/network behavior.

---

# Mandatory topology and traversal gate

For procedural/randomized or traversal-heavy levels, read the topology and spatial-connection policies.

Required architecture:

```text
logical graph + explicit traversal contracts
-> constructive edge-by-edge spatial embedding
-> canonical boundaries/surfaces/volumes
-> actual-geometry diagnostics
-> graybox playability
-> shared shell and structural movement intent
-> asset intake and staging
-> prop-complete collision/interaction/quality gates
```

The generator must not place independently sealed modules and connect them after placement.

For each edge, select a legal source, explicit connection type/movement mode/medium/directionality, compatible destination, connector geometry/surface/volume and complete movement/camera/resource/recovery contract. Accept the destination only when the whole edge passes; otherwise retry/backtrack/reject.

Use top-down plans for horizontal routes, sections/elevations for vertical routes, 3D volume/slice evidence for water/air-pocket routes, state graphs for moving/transforming topology, and region/streaming maps for mega-zones.

### Current First Breach

The current First Breach contains no magical teleport/`PORTAL_TRANSFER` edge. Its gates, corridors, stairs/landings and Soulwell exit veil are physical continuous connections.

Generate the selected randomized branch after the player chooses Wayfarer or Oathbreaker and before gallery meshes render.

The branch already contains extensive props, lookdev and minimal gameplay. Preserve valid work, audit/freeze it, then fill the missing graybox/asset/collision/interaction/quality/recovery/population-readiness gates rather than restarting the level.

## Phase 3 — Baseline audit

Identify genuinely complete work, unproven claims, stale/legacy work, baseline tests and fresh evidence.

For #451, audit:

- generator/topology;
- current scale/camera/pacing assumptions;
- asset registry/technical readiness;
- complete prop placement/classification;
- collision/physics/nav/hazards;
- interactions/destruction;
- lookdev/audio/performance;
- recovery/device/population-readiness status.

## Phase 4 — Claim and isolation

One worker session = one issue + one branch + one worktree.

Serialize overlapping high-conflict files or assign an explicit integration owner.

For animation bakeoffs, Houdini and Blender producers work in isolated source areas; one integration owner controls the canonical runtime action ID and winner integration.

## Phase 5 — Dependency-order implementation

### World/level environment

`design/seams/budgets -> topology/traversal -> graybox -> shell/surfaces/volumes -> asset intake -> staging -> prop-complete walkthrough -> collision/physics/nav/hazards -> interaction/destruction/state -> lookdev/wayfinding -> audio -> performance/streaming -> recovery/OOB -> device/accessibility/network -> population-readiness -> final experience walkthrough -> independent verification`

### Later zone population/gameplay

`verified environment dependency commit + stable sockets -> NPC/monster spawns -> patrols/AI -> encounters/random encounters -> quests/dialogue/objectives -> production loot/drop tables -> population persistence -> combat/gameplay verification`

### Character/animated asset

`toolchain state -> quote/approval -> concept/reference -> generation/input -> segmentation/mesh processing -> texture/material -> rig check -> rig -> deformation -> Tripo preset search -> direct preset OR custom-animation routing -> modular attachments -> runtime assembly -> gameplay proof -> performance`

### Custom animation

`lock common brief/rig/source motion -> Houdini KineFX + Blender candidates -> automated gates -> blind AI review -> owner A/B review -> label reveal -> winner integration -> loser preservation -> registry -> independent verification`

## Phase 6 — Producer checks

The worker runs checks, captures evidence, updates ledger/state, commits and stops at `IMPLEMENTED_UNVERIFIED`.

For environment work, record a separate status for every required zone gate. A producer may not collapse them into one “done” claim.

## Phase 7 — Independent verification

The verifier tests the exact commit and independently re-derives requirements.

For zones, verify:

- topology/connection/zone seams;
- graybox metrics and camera assumptions;
- final asset/staging set;
- real-controller collision/physics/hazards;
- interactions/destruction/state/persistence;
- lookdev/wayfinding/audio;
- performance/streaming/loading;
- recovery/out-of-bounds/save/re-entry;
- required devices/inputs/accessibility;
- population-readiness handoff;
- final experience/pacing.

Debug warp never proves connectivity. Producer-only or stale evidence is rejected.

## Phase 8 — Deterministic done gate

Fail if any required gate is missing, stale or self-verified; if assets/props are unclassified; if collision used an empty shell; if interaction/destruction/recovery is untested; if performance/device evidence is missing; if population-readiness sockets are invalid; if provider/toolchain/spend receipts are missing; or if provenance/rollback is incomplete.

## Phase 9 — Owner-ready

After machine + verifier gates, provide fresh evidence and mark `OWNER_READY`.

Never merge/deploy without owner authorization.

## Phase 10 — Handoff

Commit, update ledger/evidence/handoff, record next atomic requirement/blockers, stop dev servers/provider pollers, preserve provider task IDs/output paths, and update topology, spatial-connection, zone-completion, animation and portability records.

The next chat resumes from repository state, not chat history.