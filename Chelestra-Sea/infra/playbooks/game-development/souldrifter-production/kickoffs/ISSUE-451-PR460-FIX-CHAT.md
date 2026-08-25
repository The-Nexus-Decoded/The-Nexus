# SoulDrifter #451 / PR #460 — Fix Existing BREACH-V2

## Mission

Continue and fix the existing BREACH-V2 implementation. Preserve accepted First Breach content, room archetypes, art direction, environmental staging, gameplay and progression, but repair and verify the procedural generator and the complete zone-environment pipeline at their roots.

The environment portion is complete only when the player can travel continuously from Soul Well/vestibule through the selected route, 3–5 connected gallery spaces, Cinderbound Warden, First Memory and the Heartvale exit inside the complete staged environment, with correct collision, interactions, destruction, readability, performance and recovery.

This is not a replacement level and is not #448 character/monster production.

## Live target

- Issue: `#451`
- Draft PR: `#460`
- Branch: `codex/451-souldrifter-breach-v2`
- Base: `qa`
- Recorded worktree: `H:\CodexData\.codex\worktrees\breach\The-Nexus-breach-v2`
- Game root: `Arianus-Sky/projects/games/SoulDrifterWeb`
- Comparison seed: `4182`

Re-check live PR head and rediscover/reuse the existing worktree before editing. Never reset or discard unexplained work.

## Production authority

Read from `infra/game-production-playbooks`:

- `START_HERE.md`
- `SESSION_FAST_START.md`
- `WORKFLOW.md`
- `ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`
- `ZONE_PRODUCTION_QUALITY_GATES.md`
- `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
- `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
- `PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
- the matching configs/templates
- `BROWSER_RUNTIME_ROADMAP.md`
- live ticket/PR comments and current implementation files

SEA playbooks govern workflow. SKY contains runtime implementation/data/assets/tests.

---

# Route selection triggers topology generation

The corrected lifecycle is:

```text
PRE-CHOICE
load/render only fixed Soul Well + vestibule + Threshold Plaza

PLAYER CHOOSES WAYFARER OR OATHBREAKER
-> lock seed + selected path
-> choose 3–5 legal room archetypes/order
-> build selected-route logical graph
-> assign explicit physical connection contracts
-> solve complete selected-route topology
-> place each next space from a validated source socket/connection
-> resolve canonical shared walls, apertures, corridors and elevations
-> validate/backtrack and freeze accepted topology

ONLY AFTER TOPOLOGY PASSES
-> graybox/scale/camera sanity check
-> generate one shared shell and interiors
-> audit technical readiness of assets
-> audit/fix/freeze environmental staging
-> run prop-complete collision walkthrough
-> repair/verify collision, physics, nav and hazards
-> verify interaction/pickup/destruction/dynamic state
-> reconcile lookdev, lighting, wayfinding and audio
-> run performance/streaming/loading pass
-> verify recovery, out-of-bounds, device/input/accessibility
-> revalidate population-ready sockets
-> run final integrated environment walkthrough
```

Except in explicit preview/fixture tests, the unselected randomized branch does not need to render. Its route gate remains sealed.

## Room archetypes are templates, not sealed boxes

A gallery archetype provides footprint/shape variants, legal sockets, allowed orientations, floor/ceiling/elevation requirements, encounter/dressing sockets and clearance constraints.

It does not arrive as an independently closed four-wall box that is pushed against another box.

For each edge, derive the destination transform from a valid source/destination socket and complete physical connection. Do not place rooms at unrelated slot centers and connect coordinates afterward.

---

# Current First Breach connection types

The current First Breach contains no magical teleport or `PORTAL_TRANSFER` edge.

Allowed current families:

- `DIRECT_OPEN_ADJACENCY`;
- `DOOR_GATE_THRESHOLD`;
- `PHYSICAL_CORRIDOR_OR_PASSAGE`;
- `STAIRS_RAMP_OR_LANDING`;
- the Soulwell exit water veil as a doorless physical walk-through effect threshold.

The word `portal` in old code/mesh/effect names does not make an edge a teleport.

---

# Canonical topology gate

The accepted topology creates canonical boundary IDs before shell rendering.

- a closed shared wall renders once;
- an open span renders no wall;
- a door/gate span renders wall only outside its aperture;
- duplicate co-planar walls are forbidden;
- floors/ceilings have deterministic shared ownership or union;
- shell generation consumes the boundary inventory.

For every tested seed/path, generate diagnostics from actual solved topology showing spaces, boundaries, openings/gates, corridors, clearance/nav, elevation, physical edge resolution and errors.

Invalid arrangements retry/backtrack/reject; they are not hidden with darkness, fog, doors or props.

---

# Existing staging and assets

The branch already contains chests, crates, barrels, furniture, statues, cover, paintings, banners, wall fixtures, cages, chains, remains, lighting, water and FX.

Do not restart valid work.

1. Audit assets for scale, axes, pivot, materials/textures, LOD/culling, collider strategy, interaction/destruction anchors, provenance and rollback.
2. Preserve valid placements.
3. Fix only floating, intersecting, obstructive, semantically wrong or unclassified objects.
4. Assign every object collision, interaction, destruction and performance class.
5. Freeze the accepted staged environment before collision discovery.

---

# Prop-complete collision, physics and hazard gate

Walk the actual playable character/controller through the fully staged level and identify:

- visible solids with missing collision;
- invisible blockers;
- collider/mesh mismatch;
- door/gate state mismatch;
- tunneling;
- camera/model clipping;
- props that trap or obstruct;
- WASD/click-to-move disagreement;
- largest-body clipping;
- wrong friction/slope/surface behavior;
- bad water/current/moving-platform/hazard behavior where applicable.

Test positive and negative collision. After repairs, repeat the complete routes and representative object probes.

---

# Interaction, pickup, destruction and dynamic state

Minimum proof:

- open a chest/coffer and receive one deterministic test item exactly once;
- verify open-state lid/collision clearance;
- pick up a dropped item once without duplication;
- operate doors/gates through intended states;
- break representative crates/boxes, barrels/furniture and allowed wall props;
- clear destroyed collision and bound debris;
- prove protected iron/structural/progression objects reject damage;
- preserve open/looted/destroyed state through save/reload;
- prove no interaction/destruction state soft-locks the route.

SoulDrifter uses maximum destructibility: ordinary nonstructural props are destructible/detachable where practical; structural/progression objects are protected unless explicitly `QUEST_DESTRUCTIBLE`.

---

# Remaining quality gates

After interaction/destruction geometry is stable, complete the gates in `ZONE_PRODUCTION_QUALITY_GATES.md`.

## Lookdev, lighting and wayfinding

Verify materials, texture density, lighting, shadows, exposure, fog, particles, water and post effects while keeping routes, exits, interactions and object states readable. Atmosphere may not hide defects.

## Audio and acoustics

Verify ambience, localized emitters, reverb, wall/door occlusion, attenuation, footsteps, interaction/destruction cues, music/state transitions, loop quality and browser/mobile resume behavior.

## Performance, streaming and loading

Measure bundle/entry time, draw calls, triangles, materials/textures/texture units, frame time, memory, lights/shadows, particles/overdraw, animations, physics/nav/audio, shader stutter and representative mobile thermal behavior. Test slow network, cache miss, background/resume and repeated entry.

## Recovery and out-of-bounds

Test checkpoint/save/respawn/re-entry, stuck recovery, boundary escape attempts, fall-through/void, debris/door/script soft locks, dynamic-state recovery and missing-state/load fallback.

## Device/input/accessibility

Test required desktop/mobile browsers, keyboard/mouse/controller/touch, camera collision/recenter/zoom, viewports/safe areas, target sizes, readable/color-independent prompts, reduced motion/shake/flash and captions where required.

## Population-readiness handoff

Revalidate final spawn envelopes, patrol/leash paths, actor-size clearance, encounter/telegraph spaces, cover/LOS, quest/dialogue/cinematic anchors, drop-safe regions and stable socket IDs. Do not add new population in this gate.

---

# Final integrated environment walkthrough

For Wayfarer and Oathbreaker:

- traverse every physical edge with WASD and click-to-move;
- inspect both sides of thresholds and all prop clusters;
- test representative containers, pickups, destructibles and protected objects;
- complete at least one no-warp run through boss, First Memory and exit;
- save/reload/re-enter after dynamic changes;
- test required camera/device/input profiles;
- use real GPU/ANGLE D3D11;
- record performance, failed requests, shader errors and console/state errors;
- review orientation, believability, repetition, travel fatigue, interaction density and enjoyment.

Permanent regressions include:

- open gate with intact wall behind it;
- navigation connected while geometry is blocked;
- player passing through staged props;
- invisible collider after a prop is destroyed;
- atmosphere hiding a required route;
- debris or state changes soft-locking progression.

---

# Separate population/gameplay ticket boundary

After the environment package is independently verified, use a separate ticket for NPC/monster spawning, patrols/AI, random encounters, respawn tuning, quest actors/dialogue/objectives, production loot/drop tables and population persistence.

The later ticket consumes verified sockets/routes/APIs and may not silently move props or weaken collision.

Existing minimal boss/progression content required for the current MVP remains in #451. Do not expand population systems merely to finish the environment correction.

---

# Work order

```text
Phase -1  cached session fast-start
Phase 0   current generator/topology/graybox/assets/staging audit
Phase 1   route-selection graph/topology solver
Phase 2   canonical boundaries/corridors/shared shell/zone seam
Phase 3   asset readiness + staging audit/freeze
Phase 4   prop-complete collision defect inventory
Phase 5   collision/physics/nav/hazard repair and regression
Phase 6   interaction/pickup/destruction/dynamic-state proof
Phase 7   lookdev/wayfinding/audio reconciliation
Phase 8   performance/streaming/loading pass
Phase 9   recovery/OOB/device/accessibility checks
Phase 10  population-readiness handoff
Phase 11  final integrated walkthrough/experience review
Phase 12  independent core-environment verification
FINAL     chained-skeleton Tripo/Houdini/Blender pilot after exact spend approval
Phase 14  independent pilot/full regression
LATER     separate population/random-encounter/quest ticket
```

The chained-skeleton pilot remains last and cannot delay core environment gates.

Babylon.js work remains outside #451. After First Breach and the first playable Heartvale section are complete/verified in Three.js, a separate isolated Babylon.js port may compare exactly those two sections.

## Future/resumed worker summary

```text
Preserve valid work. Do not use nav, coordinates, empty-shell traversal or survey warp as final proof.

Complete the full zone gate record from topology through final experience review. Producer stops at IMPLEMENTED_UNVERIFIED. Do not merge or deploy.
```
