# Universal Zone Environment Completion Pipeline

## Purpose

This is the reusable stage order for completing a playable environment before population/encounter production scales.

Read with `ZONE_PRODUCTION_QUALITY_GATES.md`, the procedural-topology policy, spatial-connection catalog, staging policy and collision/interaction/destruction policy.

## Canonical order

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
12. recovery/checkpoints/out-of-bounds/soft locks
13. device/input/camera/accessibility/network contract
14. population-readiness revalidation and handoff
15. final integrated walkthrough and experience review
16. independent environment verification
17. separate population/gameplay phase or ticket
```

No later stage substitutes for an earlier stage. An irrelevant gate is explicitly `NOT_REQUIRED`; a required gate is never silently skipped.

## Gate summaries

### Gate 0 — Design, budgets and seams

Define environment purpose, fixed/generated regions, spatial and traversal types, target devices, performance budgets, space-purpose profiles, interaction/destruction direction, actor profiles, population boundary and adjacent-zone entry/exit/loading/save contracts.

### Gate 1 — Topology and traversal

Prove logical graph, constructive embedding, canonical boundaries/openings/surfaces/volumes, explicit movement contracts, diagnostics and invariants.

### Gate 2 — Graybox playability

Traverse at real movement speed before expensive art. Validate dimensions, pacing, route timing, camera fit, combat/readability space and required actor profiles. Reserve checkpoint, spawn, patrol, encounter, quest, dialogue and cinematic envelopes.

### Gate 3 — Shell, surfaces, volumes and seams

Create runtime shell/terrain, connectors, vertical transitions, traversal/hazard volumes, structural collision/nav intent, entry/exit geometry and streaming/culling regions.

### Gate 4 — Asset intake

Every asset proves provenance/license/rollback, units/scale/axes/pivot, geometry/material/textures, compression/LOD/culling, collider strategy, interaction/destruction anchors/states and target-runtime compatibility.

### Gate 5 — Staging and prop placement

Stage the place according to its purpose and classify every object before collision discovery.

Freeze stable object/render-owner/collider IDs and reconcile the asset-catalog -> placement-registry -> generated/authored-layout -> runtime/render/collider contract chain. Every override is explicit and approved; every render root is blocking, nonblocking, traversable, VFX-only or inherited-owner.

### Gate 6 — Prop-complete collision discovery

Walk the actual controller/body/camera through the complete staged environment and create a defect inventory.

Build that inventory from the same complete live spatial authority used by gameplay, including shell, thresholds, props, landmarks, special volumes and every reachable dynamic or lifecycle state.

### Gate 7 — Collision, physics, nav and hazards

Repair positive/negative collision, surface physics, water/moving-platform behavior, hazards, stateful thresholds, camera/body alignment and navigation agreement.

Reconcile final post-fit render world transforms/bounds with runtime proxies, then prove shared state across movement, NPC navigation, LOS/occlusion, projectile/melee/physics, interaction, camera and proof hooks. Execute the production movement primitive/body/timestep through axis, diagonal, corner, sliding and continuous swept-segment cases; endpoint, grid and path success are insufficient.

### Gate 8 — Interaction and dynamic state

Implement containers, pickups, mechanisms, destruction/protection classes, collision/nav state changes, persistence, debris and moving/transforming states.

Door, object and volume transitions update render, collision and every spatial-query consumer atomically for intact, damaged, destroyed, disabled, open, closed and removed states.

### Gate 9 — Lookdev and wayfinding

Validate materials, lighting, shadows, exposure, fog, water, weather, particles, post effects, landmarks, exits, interactions and state readability. Atmosphere may not hide defects.

### Gate 10 — Audio/acoustics

Validate ambience, music, reverb, obstruction/occlusion, attenuation, footsteps, interaction/destruction/hazard cues, water transitions, concurrency and device/browser resume behavior.

### Gate 11 — Performance/streaming/loading

Track staged budgets and validate loading, draw calls, geometry, textures, frame time, memory, lights/shadows, particles/overdraw, animations, physics/nav/audio, shader stutter, mobile behavior, quality tiers and repeated entry.

### Gate 12 — Recovery and soft locks

Test save/checkpoint/respawn/re-entry, stuck recovery, boundary exploits, dynamic-state recovery, missing-state/load fallback, required-item protection and no progression soft locks.

### Gate 13 — Device/input/accessibility/network

Validate required devices, browsers, inputs, viewports, camera, prompts, contrast/color-independent cues, reduced motion, captions and interruption recovery. Define network authority/state when applicable.

### Gate 14 — Population-readiness handoff

Revalidate final spawn/patrol/leash/actor-size/encounter/cover/LOS/quest/cinematic/drop envelopes and provide stable socket IDs plus a dependency commit without adding final population.

### Gate 15 — Final integrated walkthrough and experience review

Run every system together on target profiles and review orientation, believability, repetition, dead travel, spatial rhythm, interaction density, fatigue, storytelling and enjoyment.

Producer stops at `IMPLEMENTED_UNVERIFIED`.

### Gate 16 — Independent verification

An independent verifier repeats the complete environment acceptance on the exact commit.

Required status: `ENVIRONMENT_VERIFIED`.

### Gate 17 — Separate population/gameplay phase

After environment verification, implement project-specific NPC/creature population, patrols/AI, encounters, respawn tuning, quests/dialogue/objectives, production loot/drop tables and population state.

That phase consumes the verified environment and may not silently alter topology, staging or collision. Required environment changes reopen the affected gates.

## Reopen rule

Changes reopen the lowest affected gate and every dependent gate. See `ZONE_PRODUCTION_QUALITY_GATES.md` for examples.

## Machine-readable files

- `config/zone-environment-completion-policy.json`
- `templates/zone-environment-completion-record.template.json`

## Done rule

A zone is complete only when every required gate has current evidence and independent verification. A connected navigation graph, attractive screenshots, green tests or one successful walkthrough cannot substitute for the complete gate set.
