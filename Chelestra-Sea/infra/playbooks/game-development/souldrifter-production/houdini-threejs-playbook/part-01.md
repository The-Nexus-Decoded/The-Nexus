**Houdini + Python/HOM + Three.js + AI World Generation + Auto-Rigging +
VFX + Validation**

A detailed implementation playbook and agent starter specification  
August 21, 2026

*Design goal: You describe the village, dungeon, city, encounter,
character or spell at the creative-director level. The agent creates the
detailed internal specification and drives the production tools.*

# Executive Summary

The correct target is not a giant prompt that describes every wall,
roof, room and corridor. The target is an agentic production system that
converts a short creative brief into structured internal plans, uses
Houdini as a procedural geometry engine through Python, delegates
specialized 3D/rigging tasks to the right models, and refuses to accept
its own work until structural, visual and runtime validation pass.

- Human input stays high-level: theme, gameplay intent, landmarks,
  combat flow, desired scale, mood and must-have features.

- The AI internally creates regions, graphs, lots, room/building
  contracts, asset tasks and validation requirements.

- Houdini handles repeatable geometry generation, terrain, lot
  subdivision, building detail, WFC-style modular generation, batching
  and simulation.

- Auto-rigging providers or local rigging models remove manual
  skeleton/weight work from the default pipeline.

- Diagnostic renders and Three.js browser playtests are part of the
  generation loop, not an afterthought.

- Failures become scoped repair jobs; accepted regions are frozen so the
  agent does not repeatedly destroy good work.

## What This Solves

| **Failure you are seeing**                       | **Why it happens**                                                             | **Pipeline fix**                                                                                                                |
|--------------------------------------------------|--------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| Rooms exist but do not connect                   | Model optimized local geometry without maintaining global graph constraints    | Create connectivity graph first; every required edge must map to a physical traversable connection and pass a navigation probe. |
| House has no roof / floor / entrance             | Generation lacks an explicit completeness contract and post-build verification | Building contract + geometry validator + diagnostic render.                                                                     |
| AI keeps rebuilding good areas                   | No persistent state or accepted/frozen regions                                 | World/build manifests plus scoped repair permissions.                                                                           |
| Rigging requires manual work                     | Rigging treated as a DCC-only manual step                                      | Route meshes to Tripo/Meshy/AniGen/UniRig adapters, then validate in Three.js.                                                  |
| Particle/VFX work looks wrong or breaks gameplay | Visual effect and gameplay timing are coupled or unvalidated                   | Gameplay events are authoritative; VFX follows events and is tested for attachment, timing, readability and performance.        |
| Village/city prompt becomes enormous             | The prompt is being used as a geometry specification                           | Prompt only creative intent; planner internally creates the detailed structured spec and Houdini solves the geometry.           |

# 1. Reference Architecture: WorldClaw-Style Coarse-to-Fine Generation

Tencent Hunyuan’s WorldClaw paper (August 5, 2026) is a useful reference
because it demonstrates the exact architectural idea needed here: one
open-ended prompt is translated by planning agents into regions,
terrain, assets, materials and spatial relations; a global terrain
foundation is generated; detail-demanding regions are populated; and
render-based agents refine objects, appearance and contacts. The system
outputs explicit, editable assets rather than only a rendered video.

The published experimental stack used Claude Opus 4.8 as the agent
model, GPT-Image-2, SAM3, SAM3D, Hunyuan3D, Blender 5.1.1, and four
NVIDIA H20 GPUs. The important lesson is the orchestration pattern, not
the exact models or Blender dependency. In this playbook, Houdini
becomes the 3D execution engine and Three.js is the runtime target.

YOUR CREATIVE PROMPT  
\|  
v  
DIRECTOR / ORCHESTRATOR  
\|  
+--\> WORLD PLANNER ------------+  
\| \|  
+--\> ASSET / RIG / VFX AGENTS \|  
\| \|  
v \|  
STRUCTURED WORLD STATE \<----------------+  
\|  
v  
HOUDINI / PYTHON BUILD  
\|  
v  
STRUCTURAL VALIDATION  
\|  
v  
DIAGNOSTIC RENDERS -\> VISION REVIEW  
\|  
v  
GLB + METADATA EXPORT  
\|  
v  
THREE.JS LOAD + PLAYTEST + PERF  
\|  
v  
FAILURES -\> SCOPED REPAIR -\> RE-TEST  
\|  
v  
ACCEPT + FREEZE

# 2. Production System Goals and Non-Goals

## Goals

- Build/rebuild villages, cities, dungeons, terrain, interiors and
  encounter spaces from concise creative direction.

- Use the existing project as context rather than regenerating
  everything from scratch.

- Drive Houdini through Python/HOM so the AI can inspect and alter the
  scene programmatically.

- Support generated and existing 3D assets through a single asset
  registry.

- Automate rigging and animation packaging for humanoids and RPG
  creatures wherever possible.

- Produce Three.js-friendly GLB assets and metadata.

- Create spell/VFX content that is visually rich but browser/runtime
  practical.

- Verify correctness through graph tests, geometry checks, diagnostic
  renders and browser playtests.

## Non-goals

- Do not make the human manually write room graphs, building coordinates
  or facade module assignments.

- Do not trust a model’s text claim that a level is correct.

- Do not allow one stochastic regeneration to replace a previously
  accepted region without explicit reason.

- Do not require Houdini to be operated manually for normal pipeline
  execution.

# 3. Agent Roles and Recommended Model Allocation

| **Agent**                 | **Primary job**                                                         | **Best traits / model choice**                                                                                                                    |
|---------------------------|-------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| Director / Orchestrator   | Own goal, state, routing, budgets, retries, acceptance                  | Strong long-horizon reasoning/tool use. Keep swappable; benchmark GPT-5.6 Sol xHigh, Kimi K3 High, and other frontier agents on your actual repo. |
| World Planner             | Regions, landmarks, routes, dungeon graph, encounter pacing, sightlines | Spatial/game-design reasoning; should produce structured plans, not raw geometry.                                                                 |
| Houdini Builder           | HOM/Python execution; procedural terrain/buildings/dungeons; export     | Strong coding/tool reliability and ability to inspect existing networks before editing.                                                           |
| Asset Agent               | Generate/reuse 3D models; clean, normalize, LOD, PBR, colliders         | Good visual asset generation plus deterministic post-processing.                                                                                  |
| Rigging + Animation Agent | Classify rig type, auto-rig, validate skeleton/weights, retarget        | Specialized rig providers + reasoning agent for validation/packaging.                                                                             |
| VFX Agent                 | Spell/impact/environment FX; bake vs runtime decisions                  | Visual reasoning + Houdini procedural skills + Three.js shader/runtime knowledge.                                                                 |
| Validation Agent          | Graph/geometry/collision/render/runtime/perf checks                     | Skeptical inspector; never shares builder’s assumption that generation succeeded.                                                                 |
| Repair Agent              | Patch only the failing scope and re-test                                | Precise code/scene editing with strong constraint following.                                                                                      |

Model policy: do not hardwire the entire pipeline to one model. Put each
model behind a role adapter and log outcomes. The strongest model for
planning may not be the strongest for Houdini Python, 3D visual
judgment, or code repair. The system should be easy to route per task.

# 4. Shared State: The Key to Stopping Repeated AI Mistakes

The system needs persistent machine-readable state. This lets the AI
remember what it built, what is correct, what must remain unchanged, and
what failed. Without it, each prompt becomes a fresh guess.

| **File**               | **Purpose**                                                                                               |
|------------------------|-----------------------------------------------------------------------------------------------------------|
| world_spec.json        | Creative intent expanded into regions, constraints, landmarks, graphs and building/dungeon contracts.     |
| asset_registry.json    | Canonical asset IDs, source/provenance, scale, orientation, PBR, LOD, collider, rig and animation status. |
| build_manifest.json    | Houdini file/HDA versions, seeds, task IDs, generated outputs, git commit/build ID.                       |
| validation_report.json | Blocking/major/minor failures, evidence, allowed repair scope and required re-tests.                      |
| region.metadata.json   | Three.js entity IDs, interactions, transitions, sockets, collider/nav metadata.                           |

{  
"region_id": "village_market",  
"purpose": \["navigation_hub", "combat", "storytelling"\],  
"landmarks": \["market_tower", "forge", "mine_gate"\],  
"building_archetypes": {"residential": 18, "shop": 7, "warehouse": 4},  
"traversal": {"primary_routes": 3, "vertical_routes": 2,
"secret_routes": 2},  
"visual_rules": \["mine_gate_visible_from_market_center"\],  
"status": "planned"  
}

# 5. Village / City Generation Without Giant Prompts

The AI should expand a sentence such as “create a dense ruined mining
village around a central forge with 40 explorable buildings and two
paths to the mine” into an internal plan. The human does not need to
author the expansion.

**1.** Analyze terrain and preserve anchors that already work.

**2.** Choose landmark anchors and sightline goals.

**3.** Generate primary road/path hierarchy connecting required gameplay
nodes.

**4.** Generate secondary streets, footpaths and vertical links.

**5.** Derive blocks/parcels/lots from roads and terrain.

**6.** Assign building archetypes/density by district.

**7.** Generate building masses first and validate traversal/sightlines.

**8.** Convert accepted masses to detailed facades/roofs/interiors using
module libraries/procedural rules.

**9.** Scatter props/vegetation/storytelling assets with density and
exclusion rules.

**10.** Build colliders/nav metadata and run runtime validation.

## Houdini building blocks

- Labs Building Generator 4.0: turns low-resolution blockout volumes
  into detailed modular buildings by identifying floors, walls, corners
  and ledges.

- Labs Lot Subdivision: useful for splitting irregular polygons into
  lots/panels; appropriate for districts/city blocks and modular
  