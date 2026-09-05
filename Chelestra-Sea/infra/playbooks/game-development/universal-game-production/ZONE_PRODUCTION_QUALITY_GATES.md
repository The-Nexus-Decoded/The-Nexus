# Universal Zone Production Quality Gates

## Purpose

This policy covers production checks that are commonly missed after topology, props, collision, and interactions are implemented. It applies to any playable environment: interiors, outdoor regions, dungeons, settlements, tracks, water routes, streamed areas, and transforming worlds.

Projects may mark an irrelevant gate `NOT_REQUIRED`; required gates may not be silently skipped.

## Required quality gates

### Graybox playability, scale, pacing, and camera

Before expensive art, traverse the accepted layout at real movement speeds. Validate dimensions, route times, pacing, visibility, camera profiles, occlusion, interaction approaches, combat space, and the largest supported actor profile. Reserve checkpoint, spawn, patrol, quest, dialogue, and cinematic envelopes without adding final population.

### Zone seams and adjacent-region contracts

Define entry and exit transforms, world scale and orientation, return behavior, save and checkpoint anchors, loading or streaming behavior, state transfer, companion transfer, and a safe fallback when the destination cannot load.

### Asset intake and technical readiness

Before staging, each asset must prove provenance and license, units and scale, axes, pivot, bounds, normals, UVs, materials and textures, compression, LOD and culling class, collider strategy, interaction and destruction anchors, required state variants, animation markers, performance class, manifest ID, and rollback source.

### Physics, surfaces, and hazards

Define friction, slopes, surface tags, movement modifiers, water and current behavior, environmental effect volumes, moving platforms, projectile and melee layers, debris behavior, telegraphs, and recovery rules.

### Look development, lighting, atmosphere, and wayfinding

Validate materials, texture density, lighting, shadows, exposure, decals, fog, water, weather, particles, post effects, landmarks, exits, interaction readability, state readability, and low-light or color-accessible cues. Atmosphere may not hide structural, collision, or missing-content defects. Geometry changes reopen staging and collision checks.

### Audio and acoustics

Define ambience, localized emitters, music transitions, reverb, wall and door occlusion, attenuation, surface footsteps, interaction and destruction cues, water transitions, concurrency, loop quality, browser or mobile resume behavior, and visual or caption alternatives for critical audio-only information.

### Performance, streaming, loading, and memory

Capture budgets at graybox, post-staging, post-interaction, post-lookdev, and final integration. Measure download and entry time, draw calls, triangles, textures and texture units, CPU and GPU frame time, memory, lights and shadows, particles and overdraw, animations, physics, navigation, audio, save size, shader stutter, and representative mobile thermal behavior. Use LOD, instancing, batching, compression, culling, streaming, pooling, bounded debris, and scalable quality tiers as needed.

### Failure recovery, checkpoints, out-of-bounds, and soft locks

Test checkpoint and save restoration, zone re-entry, stuck recovery, attempts to escape the playable boundary, dynamic-state recovery, lost required items, blocked routes, interrupted transitions, version or seed migration, and fallback behavior for missing assets or state.

### Device, input, camera, and accessibility

Validate required browsers and devices, keyboard and mouse, controller, touch, viewport orientation and safe areas, interaction target size and priority, camera collision and recentering, reduced motion and camera shake, readable prompts and contrast, color-independent cues, captions, and recovery after input or app interruption.

### Online state when applicable

Define authority and synchronization for procedural layout, doors, mechanisms, containers, pickups, destruction, hazards, moving geometry, late join, reconnect, contention, relevance, and version mismatch. A local proof may defer the live network test, but should not choose a state model that cannot later synchronize.

### Population-readiness handoff

Before population work starts, revalidate spawn envelopes, patrol and return paths, actor-size routes, encounter and telegraph spaces, cover and line of sight, dialogue and cinematic anchors, item drop regions, AI and player navigation agreement, destruction effects, and population streaming cells. Provide stable socket IDs and a dependency commit without adding the final population.

### Observability and reproducibility

Provide zone, version, seed, and route identifiers; topology, collision, navigation, interaction, and hazard overlays; performance counters; target renderer and device; deterministic reproduction commands; manifests; save fixtures; failed-request and shader capture; dynamic-state evidence; and a defect ledger. Release builds must disable or protect development controls.

### Final experience and pacing review

Review orientation, believability, repetition, empty travel, traversal fatigue, spatial rhythm, interaction density, visual and audio fatigue, secret discoverability, environmental storytelling, and enjoyment across repeated runs or variants. Technical correctness alone is not owner-ready.

## Reopen rules

A change reopens the lowest affected gate and all dependent gates. Topology transforms reopen topology onward. Large props reopen staging, collision, interaction, look development, performance, and final review. Collider changes reopen collision onward. Dynamic destruction changes reopen interaction, post-destruction collision, performance, recovery, and final review. Lighting, fog, and particles reopen readability, performance, device checks, and final review. New actor-size requirements reopen graybox, population-readiness, and affected collision tests.

## Integration

Use this policy with the zone completion pipeline, procedural topology policy, spatial traversal catalog, staging policy, collision and interaction policy, and project-specific budgets.

## Done rule

A zone is complete only when every required gate has current evidence and independent verification. A connected navigation graph, attractive screenshots, green tests, or one successful walkthrough cannot substitute for the complete gate set.