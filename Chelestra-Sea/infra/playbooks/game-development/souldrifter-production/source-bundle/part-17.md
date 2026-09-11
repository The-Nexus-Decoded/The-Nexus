her explicit mechanics. Never consider two rooms “connected” just because both exist.

For enclosed buildings, validate roof, wall/floor closure, entrances, stair connections, and room reachability.

## Assets

Reuse existing approved assets where possible. For new assets, create a tracked asset-registry entry with source, scale, orientation, materials, LODs, collider, rig, and animation status.

## Rigging

Do not default to manual rigging. Route generated characters/creatures through an automated rigging provider when compatible. Validate the resulting rig and animation in Three.js before accepting it.

## VFX

Separate gameplay collision/timing from visuals. Use Houdini for procedural/baked source content and Three.js-friendly GPU/runtime forms for frequent combat effects. Validate socket attachment, timing, impact position, readability, cleanup, and performance.

## Mandatory validation

Do not claim completion because scripts ran or Houdini cooked successfully.

Run:
- schema/state checks;
- graph/reachability checks;
- building completeness checks;
- geometry/collision/nav checks;
- diagnostic render review from aerial + ground viewpoints;
- rig/animation checks;
- VFX checks;
- GLB load check in Three.js;
- browser traversal/playtest smoke tests;
- performance checks.

When something fails, create a focused repair task containing the failing IDs, evidence, allowed change scope, and required re-tests. Patch the smallest failing area and preserve accepted areas.

## Definition of done

The level is done only when all blocking validation failures are cleared and the final state, manifests, diagnostic renders, GLB exports, and Three.js integration are updated.

## My level change request

[PASTE MY CREATIVE DESCRIPTION HERE]

---
```

---

## `legacy-source/README.md`

SHA-256: `6040f7ac921fb49b5de0322812e7249ac182e96b9811e036fdb4e39715dccc86`

```markdown
# AI-Driven Action RPG Production Pipeline

**Target stack:** AI coding/reasoning agents + Houdini (Python/HOM) + Three.js + automated 3D generation/rigging + render/playtest validation.

## Goal

You should be able to give the system a creative-direction prompt such as:

> Rebuild this ruined mountain village as a dark-fantasy combat level. Keep the existing boss arena, add a market district, 30–50 explorable buildings, two vertical traversal routes, a mine that becomes the dungeon entrance, and hidden shortcuts that loop back to the central plaza.

The user should **not** describe every wall, roof, corridor, or socket. The agent expands the brief into internal structured plans, drives Houdini through Python, validates the result visually and structurally, repairs failures, exports GLB assets, and integrates them into Three.js.

## Core rule

**Prompt at the world-design level. Generate detail internally. Validate before accepting.**

The system follows:

1. Understand the requested gameplay and visual intent.
2. Inspect the current level/project before editing.
3. Create a structured world/level plan internally.
4. Create a connectivity/navigation graph before detailed geometry.
5. Build coarse-to-fine through Houdini rather than polygon-by-polygon prompting.
6. Generate or reuse assets through an asset registry.
7. Auto-rig characters/creatures when possible.
8. Generate/bake VFX in forms appropriate for Three.js.
9. Render diagnostic views.
10. Run structural validators and visual review.
11. Load the result in Three.js and playtest/inspect it.
12. Repair only the failing regions/components.
13. Freeze accepted regions so later edits do not destroy them.

## Recommended agent roles

- **Director / Orchestrator:** owns the goal, state, budgets, and task routing.
- **World Planner:** converts creative intent into regions, landmarks, routes, encounter beats, and constraints.
- **Houdini Builder:** operates Houdini through Python/HOM; does not invent game design unless asked.
- **Asset Agent:** creates/retrieves 3D assets, normalizes scale/materials/LODs, and maintains the asset registry.
- **Rigging + Animation Agent:** rigs, validates skeletons/weights, retargets clips, and packages animation-ready GLBs.
- **VFX Agent:** creates spell/impact/environment effects and selects runtime vs baked representation.
- **Validation Agent:** runs graph, geometry, collision, visual, navigation, and performance checks.
- **Three.js Integration Agent:** loads/exported content, wires animations/VFX/gameplay metadata, and runs the browser scene.
- **Repair Agent:** receives explicit validation failures and makes minimal targeted corrections.

## Files in this starter pack

- `AGENTS.md` — top-level instructions for an autonomous production agent.
- `WORLD_SCHEMA.md` — internal world/level state contracts.
- `HOUDINI_AGENT.md` — Houdini Python execution contract and tool conventions.
- `VALIDATION_PLAYBOOK.md` — mandatory structural, visual, playtest, and performance gates.
- `RIGGING_ANIMATION.md` — auto-rigging and animation pipeline.
- `VFX_PIPELINE.md` — Houdini/Three.js spell and effects workflow.
- `THREEJS_INTEGRATION.md` — GLB, animation, metadata, loading, and runtime integration rules.
- `PROMPT_NEXT_LEVEL.md` — a ready-to-use prompt for your next level rebuild.
- `world_spec.example.json` — example internal world state.
- `validation_report.example.json` — example validation/repair report.

## Reference architecture

Tencent's August 2026 WorldClaw paper is useful as an architectural reference: it uses a coarse-to-fine agentic pipeline that turns an open-ended prompt into a structured scene specification, establishes globally coherent terrain, populates regions with editable objects, then uses render-based agents for refinement. The published experimental stack used Claude Opus 4.8, GPT-Image-2, SAM3/SAM3D, Hunyuan3D and Blender 5.1.1 on four NVIDIA H20 GPUs. Treat this as design inspiration, not as a required dependency.

## First implementation target

Do **not** automate an entire game immediately. Apply this framework to one existing level:

- preserve known-good sections;
- create a machine-readable level manifest;
- generate the level graph;
- rebuild one district/dungeon segment;
- validate it;
- load it in Three.js;
- then expand the same pipeline outward.
```

---

## `legacy-source/RIGGING_ANIMATION.md`

SHA-256: `eb8696504ae4fc630b836a4182f2bf053e675404b1c7ad3c3a802dae9a42ba05`

```markdown
# RIGGING_ANIMATION.md — Automated Character / Creature Pipeline

## Objective

Remove manual rigging from the normal asset path. Manual intervention becomes an exception for hero assets or failed edge cases.

## Routing logic

### Tripo Auto Rig
Good default when you want an API-driven pipeline and GLB output.

Current API characteristics (August 2026):
- accepts GLB/GLTF/FBX/OBJ/STL inputs;
- biped model plus a v2.5 non-humanoid model;
- non-humanoid rig types include quadruped, hexapod, octopod, avian, serpentine, and aquatic;
- can output GLB or FBX;
- can use Tripo-native or Mixamo-compatible bone naming;
- run rig-check first.

Recommended flow:

```text
static mesh
 -> normalize orientation/scale
 -> rig-check
 -> choose rig type
 -> auto-rig
 -> validation poses
 -> animation assignment/retargeting
 -> GLB
```

### Meshy
Useful for automated rigging/animation, particularly humanoids/stylized characters. Treat provider capabilities as swappable behind a common adapter.

### AniGen
Use when starting from a strong single character/creature image and local generation is desirable. AniGen produces a rigged `mesh.glb` plus `skeleton.glb` and is designed around shape+skeleton+skinning generation together.

Published implementation notes:
- Linux tested;
- NVIDIA GPU with at least 18GB VRAM required;
- verified on RTX 3090 and A800-class GPUs;
- CUDA dependencies required;
- source is MIT, but third-party components have additional licensing restrictions; review them before commercial deployment.

### UniRig
Useful research/open pipeline for automatic skeleton + skinning on diverse models. Keep as an optional local provider and benchmark it against your generated creatures.

## Provider abstraction

```python
class RigProvider:
    def classify(self, mesh_path) -> dict: ...
    def rig(self, mesh_path, rig_type, out_format="glb") -> str: ...
    def validate(self, rigged_path) -> dict: ...
```

The world/asset agent should not depend on a vendor-specific response format.

## Skeleton standards

Store for every rig:
- provider;
- provider model/version;
- rig type;
- bone naming standard;
- up/forward axes;
- unit scale;
- rest pose;
- root-motion policy;
- animation clip mapping.

## Validation poses

At minimum render/test:
- rest pose;
- crouch/bend;
- extreme limb extension;
- locomotion frame;
- attack/action pose.

Detect:
- collapsed limbs;
- detached vertices;
- severe candy-wrapper deformation;
- inverted joint behavior;
- moving root when clip should be in-place;
- missing expected bones/sockets.

## Animation package

Canonical baseline clip names:

```text
idle
walk
run
turn_left
turn_right
attack_01
attack_02
cast_01
hit_front
death
```

Creature-specific clips can extend this vocabulary.

## Three.js runtime

Use GLB as the canonical interchange format where possible. Three.js `GLTFLoader` imports rigged content and `SkinnedMesh` uses skeleton plus skin indices/weights; use `AnimationMixer` to play and blend clips.

## Retargeting

Prefer shared skeleton standards for character families so motion can be reused. If using provider-specific skeletons, create a retarget map once and persist it in the asset registry.
```

---

## `legacy-source/THREEJS_INTEGRATION.md`

SHA-256: `59b0f83cc94782d97246d6a4b25aa856d3f7b9b7b52485606175052976c69888`

```markdown
# THREEJS_INTEGRATION.md — Runtime Contract

## Canonical interchange

Prefer `.glb` for scene assets, props, and rigged characters because it packages geometry/material/animation data cleanly for the browser pipeline.

## Export package

```text
exports/<region_id>/
  region.glb
  region.metadata.json
  colliders.glb            # optional separate collision package
  nav.graph.json
  interactions.json
  vfx/
  textures/
```

## Metadata example

```json
{
  "region_id": "village_market",
  "entities": {
    "door_inn_04": {
      "node_name": "Door_Inn_04",
      "type": "door",
      "interaction": "open",
      "target_region": null
    },
    "mine_gate": {
      "node_name": "MineGate",
      "type": "transition",
      "target_region": "deep_mine"
    }
  }
}
```

## Loading rules

1. Load GLB.
2. Resolve node/entity IDs to gameplay components.
3. Build/attach colliders.
4. Register interactables.
5. Register animation mixers for skinned actors.
6. Register VFX sockets/attachment points.
7. Apply LOD/instancing rules.
8. Start validation smoke test.

## Animation

Three.js provides `SkinnedMesh` for skeleton-skinned geometry and `AnimationMixer` for animation playback/blending. Do not assume that a GLB containing a rig is usable until clips play in the browser.

## Scene optimization

For villages/cities:
- instance repeated props/modules;
- merge static geometry where it reduces draw calls without destroying culling;
- use LODs for buildings/vegetation;
- avoid unique high-resolution materials for every object;
- stream or activate regions when possible;
- limit simultaneously active skinned characters;
- separate collision geometry from render geometry when useful.

## Browser validation hooks

Expose debug commands to the agent:

```js
world.debug.captureOverview()
world.debug.captureEntity(id)
world.debug.teleportTo(nodeId)
world.debug.runTraversal(fromId, toId)
world.debug.showColliders(true)
world.debug.showNav(true)
world.debug.profile(10) // representative sample window
```

The exact implementation is project-specific, but the capability should exist. The validation agent needs deterministic inspection points.

## Runtime acceptance

A region is not accepted until:
- it loads;
- critical entity IDs resolve;
- required traversal smoke tests pass;
- r