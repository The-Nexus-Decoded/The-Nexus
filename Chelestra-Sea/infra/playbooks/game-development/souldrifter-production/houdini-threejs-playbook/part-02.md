 surfaces.

- Wave Function Collapse: useful for adjacency-driven modular
  arrangements, but must be constrained by the global gameplay graph.

- PDG/TOPs: batch dozens/hundreds of generation, LOD, collision, texture
  and export jobs while tracking dependencies and minimizing recompute.

## Building contract: enough constraint without manual wall authoring

{  
"building_id": "market_inn_04",  
"archetype": "inn",  
"floors": 2,  
"footprint_class": "medium_irregular",  
"roof": {"required": true, "style": "steep_gable"},  
"interior": {  
"required": true,  
"rooms": \["taproom", "kitchen", "stairs", "bedrooms"\],  
"all_rooms_reachable": true  
},  
"gameplay": \["loot", "ambush_cover", "upper_floor_vantage"\]  
}

The generator is free to choose exact coordinates, wall segments and
modules. Validation enforces the important invariants: roof coverage,
floor/wall closure, entrances, stair connections and room reachability.

# 6. Dungeon Generation: Graph First, Geometry Second

A dungeon should begin as gameplay topology. If the AI decides Room A
connects to Room B, that relationship must exist as a traversable
corridor/door/vertical traversal mechanic. This turns “forgot to connect
the rooms” from a visual mistake into a failed invariant.

START -\> ENTRY -\> GUARD HALL -\> BRANCH  
\| / \\  
\| ARMORY PRISON  
\| \\ /  
+------\> GREAT HALL -\> BOSS  
\|  
SECRET LOOP

- Assign room archetypes based on gameplay beats.

- Place room blockouts with spatial constraints.

- Assign connection sockets.

- Route corridors between required sockets.

- Run reachability and player-clearance tests before detail.

- Solve vertical traversal explicitly (stairs/elevators/climbs/drops).

- Only after topology passes: detail rooms/corridors, set dressing,
  secrets, locks and encounters.

# 7. Houdini/Python Execution Contract

SideFX’s Houdini Object Model exposes the \`hou\` Python package, and
\`hython\` provides a command-line Python environment. This is the right
interface for an AI-driven pipeline because the agent can inspect nodes,
parameters and scene state rather than relying on brittle mouse/keyboard
automation.

inspect_scene()  
load_world_spec(path)  
build_terrain(region_ids=None)  
build_roads(region_ids=None)  
subdivide_lots(region_id)  
build_building_masses(region_id)  
detail_buildings(region_id)  
build_dungeon(dungeon_id)  
place_assets(region_id)  
build_colliders(region_id)  
run_geometry_checks(region_id=None)  
render_diagnostics(region_id=None)  
export_glb(region_id=None)  
save_checkpoint(label)

## Engineering rules for agent-written Houdini code

- Idempotent: same command + same input should not duplicate
  nodes/assets.

- Scoped: each operation targets explicit region/entity IDs.

- Seeded: procedural variation must be reproducible.

- Inspectable: node paths and generated geometry carry stable names/IDs.

- Cached: expensive simulation/generation results are cached and
  dependency-tracked.

- Reversible: checkpoints exist before destructive operations.

- Minimal: repairs rebuild only affected dependencies.

# 8. 2D / Prompt to 3D Asset Production

concept / prompt / reference  
\|  
v  
3D GENERATION PROVIDER  
\|  
v  
NORMALIZE SCALE + AXES  
\|  
v  
CLEANUP / REMESH / UV / PBR  
\|  
+--\> STATIC ASSET -\> LOD + COLLIDER -\> REGISTRY  
\|  
+--\> ANIMATED ASSET -\> AUTO-RIG -\> ANIMATION -\> VALIDATE -\>
REGISTRY

## Asset quality gates

- Correct real-world/game scale.

- Correct up/forward axes.

- Reasonable topology and no catastrophic holes/non-manifold issues for
  the intended use.

- PBR texture set and material naming normalized.

- LOD strategy defined for repeated/large assets.

- Collider representation defined separately where useful.

- Asset ID and provenance stored so it can be regenerated/replaced
  later.

# 9. Automated Rigging and Animation

Manual rigging should become the exception. The rigging agent first
classifies the mesh, chooses a provider, validates the rig with stress
poses/animations, and only then marks it ready.

| **Option**          | **Where it fits**                                                             | **Important current details**                                                                                                                                    |
|---------------------|-------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Tripo Auto Rig      | Strong API-first default for humanoids and RPG creatures                      | v2.5 supports quadruped, hexapod, octopod, avian, serpentine and aquatic types; GLB/FBX output; Mixamo-compatible naming available; rig-check recommended.       |
| Meshy               | Convenient rigging/animation service, especially standard/stylized characters | Current product advertises humanoid, biped, quadruped and stylized-character auto-rigging; API ecosystem supports rig/animation workflows.                       |
| AniGen              | Local image -\> rigged 3D asset generation                                    | Outputs rigged mesh.glb and skeleton.glb; published code requires Linux + NVIDIA GPU with at least 18GB VRAM; verify third-party licenses before commercial use. |
| UniRig              | Open/research automatic skeleton + skinning for diverse models                | Paper reports a unified skeleton+skinning model across varied categories; useful to benchmark as a local provider.                                               |
| Houdini KineFX/APEX | Post-rig processing, custom controls, retargeting/cleanup                     | Best used as a programmable downstream rig/animation layer rather than requiring all skeleton inference to be handcrafted.                                       |

## Canonical animation package

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

For each rig, store provider/version, bone naming, scale, axes, rest
pose, root-motion policy and clip map. Run at least idle, locomotion and
an action clip in Three.js before acceptance.

# 10. VFX / Spell / Particle Production

Do not make Houdini simulations the gameplay authority. Gameplay code
owns projectile movement, cast timing, hit timing and damage. VFX
subscribes to those events and renders them.

| **Use Houdini for**                                                                                                                       | **Use Three.js runtime for**                                                                                                              |
|-------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| Pyro look development; debris/fracture source; flow/trail fields; flipbook generation; procedural spell meshes; impact masks/SDF textures | GPU particles/quads; shader noise/distortion; animated emissive meshes; trails/ribbons; flipbooks; light pulses; decals; instanced debris |
| High-cost source simulation that can be baked once                                                                                        | Effects repeated constantly during combat and needing low latency                                                                         |

ABILITY SPEC  
-\> VFX SPEC  
-\> choose runtime vs baked components  
-\> Houdini creates source/baked assets if needed  
-\> export textures/meshes/metadata  
-\> Three.js binds to gameplay events  
-\> capture + inspect + profile  
-\> repair

# 11. Three.js Runtime Contract

Prefer GLB as the canonical interchange format. Three.js supports
skinned assets via SkinnedMesh, and AnimationMixer handles clip
playback/blending. A rig is not accepted simply because it exists inside
the GLB; it must play correctly in the browser.

exports/village_market/  
region.glb  
region.metadata.json  
colliders.glb  
nav.graph.json  
interactions.json  
vfx/  
textures/

- Resolve scene node names/IDs to gameplay entities.

- Load/attach collision and navigation representations.

- Register interactables and transitions.

- Register animation mixers for skinned actors.

- Register VFX sockets and event hooks.

- Apply instancing, LOD and region activation/streaming rules.

- Expose debug APIs so an agent can teleport, capture, show
  colliders/nav and run traversal probes.

# 12. Validation: The Part That Fixes the Roof and Corridor Problem

The system should maintain separate validation gates. A successful
script, Houdini cook, exported GLB or pretty screenshot is insufficient
by itself.

| **Gate**             | **Blocking examples**                                                                                |
|----------------------|------------------------------------------------------------------------------------------------------|
| Schema/state         | Duplicate IDs, missing referenced region/asset, missing build version/seed.                          |
| Graph/reachability   | Spawn cannot reach boss/exit; required room edge has no traversable path.                            |
| Building/geometry    | Missing roof, wall/floor hole, blocked door, stairs do not reach next floor, room overlap.           |
| Collision/navigation | Player capsule cannot pass critical doorway/corridor; bridge collider missing.                       |
| Visual render        | Floating assets, road ends, scale mismatch, impossible window/door, bad repetition, broken lighting. |
| Rig/animation        | Weight explosion, bad root, detached limbs, clip missing, browser animation failure.                 |
| VFX                  | Wrong socket, wrong hit position/timing, excessive overdraw, effect never cleans up.                 |
| Three.js runtime     | Missing resources, console errors, metadata mismatch, failed traversal smoke test.                   |
| Performance          | Excessive draw calls/triangles/textures/skinned meshes/particles or frame-time regression.           |

## Diagnostic render set

- Top/aerial overview to catch global connections and road/lot failures.

- Oblique overview to catch building mass/roof/terrain issues.

- Ground-level views along critical paths.

- Hero landmark views for intended sightlines.

- Dungeon corridor/room samples.

- Optional ID/mask, depth, normal, wireframe and collision views when
  diagnosing failures.

## Scoped repair packet

{  
"failure_id": "VAL-2041",  
"severity": "BLOCKER",  
"region_id": "deep_mine",  
"entity_ids": \["room_08", "corridor_08_09", "room_09"\],  
"invariant": "required_graph_edge_is_traversable",  
"evidence": "navigation probe cannot pass corridor midpoint",  
"allowed_scope": "corridor_08_09 and its two door sockets",  
"required_retests": \["graph", "collision", "nav", "ground_render"\]  
}

# 13. Suggested Repository / Agent Layout

/ai-production/  
AGENTS.md  
README.md  
WORLD_SCHEMA.md  
HOUDINI_AGENT.md  
VALIDATION_PLAYBOOK.md  
RIGGING_ANIMATION.md  
VFX_PIPELINE.md  
THREEJS_INTEGRATION.md  
config/  
pipeline.yaml  
budgets.yaml  
providers.yaml  
state/  
world_spec.json  
asset_registry.json  
build_manifest.json  
validation_report.json  
tools/  
houdini/  
facade.py  
validators.py  
exporters.py  
rigging/  
tripo.py  
meshy.py  
anigen.py  
unirig.py  
threejs/  
browser_checks.ts  
metadata.ts  
builds/  
renders/  
exports/

# 14. Implementation Sequence for Your Next Level Redo

**1.** Snapshot the current level and mark everything that already
works.

**2.** Create the world/region/entity manifest from the existing scene.

**3.** Add stable IDs to the regions/buildings/rooms/paths the AI is
allowed to manipulate.

**4.** Build the connectivity graph 