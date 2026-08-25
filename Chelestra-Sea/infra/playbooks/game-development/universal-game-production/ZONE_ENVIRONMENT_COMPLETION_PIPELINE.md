# Universal Zone Environment Completion Pipeline

## Purpose

This is the reusable stage order for completing a playable environment before population/encounter production scales.

## Canonical order

```text
0. design and purpose contract
1. topology and connection/traversal solver
2. shared shell, surfaces and traversal volumes
3. environment staging and prop placement
4. prop-complete walkthrough / collision discovery
5. collision implementation and regression
6. interaction, pickup and destruction
7. final integrated environment walkthrough
8. independent environment verification
9. separate population/gameplay phase or ticket
```

No later stage substitutes for an earlier stage.

---

# Gate 0 — Design and purpose

Define:

- environment purpose and experience;
- fixed/generated regions;
- spatial-node and connection types;
- target devices/performance;
- space-purpose profiles;
- interaction/destruction direction;
- population-scope boundary.

# Gate 1 — Topology and traversal

Use the procedural-topology and spatial-connection policies.

Prove graph, constructive embedding, boundaries/openings, traversal contracts, diagnostics and invariants.

# Gate 2 — Shell, surfaces and volumes

Create runtime geometry from the accepted topology:

- shell/terrain/floors/ceilings;
- apertures/connectors/vertical transitions;
- water/climb/hazard volumes where applicable;
- structural collision/navigation intent;
- streaming/culling regions.

# Gate 3 — Staging and prop placement

Use `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`.

Place and classify all intended environmental fixtures, furniture, containers, cover, wall objects, storytelling and clutter before the collision walkthrough.

# Gate 4 — Prop-complete collision discovery

Walk the actual controller/profile through the complete staged environment and create a defect inventory.

# Gate 5 — Collision implementation/regression

Repair positive/negative collision, mesh/collider/state alignment, camera/body issues and navigation agreement. Repeat all routes.

# Gate 6 — Interaction/pickup/destruction

Use `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`.

Implement representative containers, pickups, stateful mechanisms, destruction categories, protected objects, collision changes, persistence and performance.

# Gate 7 — Final integrated walkthrough

Run all environment systems together on target devices/render paths and verify no topology, collision, interaction, persistence or performance regression.

Producer stops at `IMPLEMENTED_UNVERIFIED`.

# Gate 8 — Independent environment verification

An independent verifier repeats the complete environment acceptance on the exact commit.

Required status: `ENVIRONMENT_VERIFIED`.

# Gate 9 — Separate population/gameplay phase

After environment verification, implement project-specific:

- NPC/creature population;
- patrols/AI;
- encounters/random encounters/respawn;
- quests/dialogue/objectives;
- production loot/drop tables;
- population persistence/network state.

That phase consumes the verified environment and may not silently alter its topology/staging/collision.

## Machine-readable files

- `config/zone-environment-completion-policy.json`
- `templates/zone-environment-completion-record.template.json`

## Done rule

A zone is environment-complete only after the fully staged environment has verified topology, collision, interactions, destruction, persistence, performance and independent real-controller proof.