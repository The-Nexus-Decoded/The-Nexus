from the current design and your new
creative brief.

**5.** Write/standardize the Houdini Python facade (inspect, build,
validate, render, export).

**6.** Rebuild one district or dungeon segment at blockout level.

**7.** Run graph, building, geometry, collision and navigation
validators before detailing.

**8.** Add procedural detail and asset generation only after the
blockout passes.

**9.** Route new creatures/characters through automated rigging and
browser animation tests.

**10.** Create/bake the required VFX and bind them to gameplay events in
Three.js.

**11.** Generate diagnostic renders and let a vision-capable agent issue
scoped repair tickets.

**12.** Export GLB + metadata, load the build in Three.js, and run
traversal/animation/VFX/performance smoke tests.

**13.** Freeze accepted regions and repeat the same loop on the next
region.

# 15. Minimum Acceptance Criteria for the Next Level

- All required graph nodes and edges exist and critical traversal probes
  pass.

- No enclosed building is missing a roof/floor/required entrance.

- No required room is unreachable; stairs/elevators/climbs resolve
  vertical connections.

- No blocker collision/navigation failure exists on the critical path.

- Diagnostic aerial + ground renders show no obvious broken
  geometry/placement.

- Every new animated character has a validated rig and can play required
  clips in Three.js.

- Every required VFX event triggers at the correct socket/time/world
  position and cleans itself up.

- GLB + metadata load without blocking runtime errors.

- Scene remains inside the configured performance budget.

- All blocker failures are cleared; remaining minor polish items are
  explicitly tracked.

# 16. Compute / Tooling Notes

| **Component**       | **Practical note**                                                                                                                                                              |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Houdini Apprentice  | Fine for prototyping the agentic/procedural approach, but it is non-commercial and has pipeline/export restrictions.                                                            |
| Houdini Indie       | Practical commercial target for this pipeline; keeps Houdini procedural/FX capabilities while enabling production use/export under Indie eligibility.                           |
| AniGen local        | Published implementation requires NVIDIA GPU with at least 18GB VRAM; RTX 3090 is listed as verified hardware.                                                                  |
| WorldClaw reference | Published experiments used 4x NVIDIA H20 GPUs. Do not treat that as a requirement for your system; it is evidence that the paper is research-scale, not a small local baseline. |
| Cloud model agents  | Keep orchestration models API-based initially; route roles independently so you can compare quality/cost/latency.                                                               |
| Houdini workload    | Procedural generation/sim can be CPU/RAM intensive while local image/3D/rigging models benefit heavily from VRAM.                                                               |

# 17. Starter Pack Included With This Document

The companion ZIP contains the Markdown agent instructions and example
JSON state files so you can drop them into a repository and adapt them
to your current tool wrapper.

- README.md — architecture overview and implementation target.

- AGENTS.md — top-level autonomous-agent operating rules.

- WORLD_SCHEMA.md — world/region/dungeon/building/asset contracts.

- HOUDINI_AGENT.md — Houdini Python facade and generation rules.

- VALIDATION_PLAYBOOK.md — structural/visual/runtime acceptance gates.

- RIGGING_ANIMATION.md — Tripo/Meshy/AniGen/UniRig routing and
  validation.

- VFX_PIPELINE.md — gameplay/VFX separation and Houdini-to-Three.js
  representations.

- THREEJS_INTEGRATION.md — GLB/metadata/runtime/debug contract.

- PROMPT_NEXT_LEVEL.md — ready-to-paste instructions for the next level
  rebuild.

- world_spec.example.json and validation_report.example.json — examples
  of agent-owned state.

# 18. Current References (verified August 21, 2026)

- [<u>WorldClaw project page — Agentic 3D open-world generation at
  scale</u>](https://tencent-hunyuan.github.io/Hunyuan3D-WorldClaw/)

- [<u>WorldClaw paper — arXiv
  2608.05248</u>](https://arxiv.org/abs/2608.05248)

- [<u>SideFX Labs Building Generator
  4.0</u>](https://www.sidefx.com/docs/houdini/nodes/sop/labs--building_generator-4.0.html)

- [<u>SideFX Labs Lot
  Subdivision</u>](https://www.sidefx.com/docs/houdini/nodes/sop/labs--lot_subdivision.html)

- [<u>SideFX Labs 2D Wave Function
  Collapse</u>](https://www.sidefx.com/docs/houdini/nodes/sop/labs--2d_wavefunctioncollapse.html)

- [<u>SideFX PDG</u>](https://www.sidefx.com/products/houdini/pdg/)

- [<u>SideFX Houdini Python /
  HOM</u>](https://www.sidefx.com/docs/houdini/hom/index.html)

- [<u>Tripo Auto Rig
  API</u>](https://developers.tripo3d.ai/en/docs/animations-rig)

- [<u>Meshy documentation</u>](https://docs.meshy.ai/en)

- [<u>AniGen —
  VAST-AI-Research</u>](https://github.com/VAST-AI-Research/AniGen)

- [<u>UniRig paper</u>](https://arxiv.org/abs/2504.12451)

- [<u>Three.js documentation</u>](https://threejs.org/docs/)

- [<u>Three.js
  SkinnedMesh</u>](https://threejs.org/docs/pages/SkinnedMesh.html)

# Bottom Line

**Do not spend your time writing a more detailed prompt for every
village, dungeon, roof or corridor. Spend the effort once on the agent
state, Houdini facade and validation loop. After that, the AI should
manufacture its own detailed internal specification from your creative
direction and prove that the generated level actually works before it
tells you it is finished.**
