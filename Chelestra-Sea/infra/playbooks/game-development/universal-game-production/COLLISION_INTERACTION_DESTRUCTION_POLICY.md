# Universal Collision, Interaction, and Destruction Policy

## Purpose

Topology, navigation, collision, interaction and destruction are separate runtime systems and require separate proof.

After the intended environment staging is frozen:

```text
prop-complete walkthrough / collision discovery
-> collision implementation and regression
-> interaction / pickup / destruction
-> final integrated environment walkthrough
-> independent verification
```

A route graph cannot prove collision. An empty-shell walkthrough cannot prove the staged environment. A breakable-looking mesh cannot prove destruction.

---

# Prop-complete collision discovery

Use the actual project controller or approved representative gameplay profile in the fully staged environment.

Find:

- visible solids with missing collision;
- invisible blockers;
- collider/mesh mismatch;
- tunneling;
- stateful door/gate mismatch;
- camera clipping;
- props that trap/block the player;
- input/path-system disagreement;
- body/animation clipping;
- destroyed-state collider failures.

This is a defect-discovery pass, not final acceptance.

---

# Collision profiles

Test every profile used by the project, such as:

- canonical player capsule/controller;
- largest supported body visual/profile;
- NPC/companion profile;
- large-creature or vehicle profile;
- camera collision;
- projectile, melee sweep and physics-prop layers.

The visible model and gameplay collider remain aligned.

## Positive collision

Visible solids that should block must block.

## Negative collision

Intended openings, traversal lanes, interaction approaches, destroyed footprints and camera paths must remain clear.

Both are mandatory.

---

# Base collision/object classes

Projects may extend these classes:

- `STRUCTURAL_SOLID`
- `STATEFUL_THRESHOLD`
- `INTERACTABLE_CONTAINER`
- `DESTRUCTIBLE_SOLID_PROP`
- `PROTECTED_PROP_OR_STRUCTURE`
- `QUEST_DESTRUCTIBLE`
- `PICKUP_TRIGGER`
- `SOFT_OR_COSMETIC_NONBLOCKING`
- `HAZARD_OR_SPECIAL_VOLUME`

Every object declares one explicit collision class and its applicable interaction/destruction state.

---

# Maximum-destructibility option

A project may select `MAXIMUM_DESTRUCTIBILITY`.

This does not mean every structural wall, floor, door or progression object is breakable.

The reusable rule is:

> Every placed object has a working interaction/destruction contract or an explicit protection/noninteraction reason.

Common defaults:

- ordinary nonstructural props: destructible/detachable;
- containers: interactable first, optional destruction behavior;
- structural metal/stone and progression mechanisms: protected;
- story/quest destruction: explicit `QUEST_DESTRUCTIBLE` state.

Use bounded debris, pooling, cleanup, LOD/culling and target-device budgets.

---

# Interaction contract

Every interactable records:

- prompt/ID;
- range, approach volume, facing/line-of-sight;
- allowed player states;
- animation/events/audio/VFX;
- state machine;
- collision updates;
- inventory/loot/result;
- repeated-use behavior;
- save/reload persistence;
- multiplayer authority when applicable;
- mobile/accessibility input;
- failure/recovery.

Minimum representative proof normally includes:

- open a container;
- transfer one test item once;
- pick up an item once without duplication;
- operate a stateful threshold;
- reload and verify state.

---

# Destruction contract

Every destructible records:

- durability/break trigger;
- permitted damage/contact sources;
- material/resistance class;
- intact/damaged/destroyed states;
- fracture/debris strategy;
- collision/nav update timing;
- loot/drop result;
- audio/VFX/animation;
- cleanup/pooling;
- persistence/respawn;
- network authority;
- route/quest soft-lock analysis.

The intact mesh may not remain with removed collision, and the destroyed object may not retain an invisible intact collider.

---

# Final integrated walkthrough

Run the complete intended environment and prove:

- topology and route continuity;
- positive and negative collision;
- no prop/camera/body clipping;
- representative container and pickup behavior;
- representative destruction categories;
- protected-object behavior;
- collision clearing/debris cleanup;
- save/reload;
- target-device performance;
- no runtime/state/asset errors;
- independent repetition on the exact commit.

---

# Population/gameplay boundary

After the environment is verified, a separate project phase/ticket normally handles:

- NPC/creature spawns;
- patrols and AI;
- encounters/random encounters/respawn;
- quests/dialogue/objectives;
- production loot/drop tables;
- population persistence/network behavior.

That phase may not silently alter verified topology, staging or collision. Required changes reopen the relevant environment gates.

## Done rule

The environment is complete only when the fully staged space has verified collision, interactions, destruction, persistence, performance and independent real-controller proof.