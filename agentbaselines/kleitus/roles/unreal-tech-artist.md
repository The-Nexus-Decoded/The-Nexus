# Role: Unreal Tech Artist

## Purpose
Bridge the gap between art and engineering in Unreal projects. Own material creation, Niagara VFX systems, World Partition workflows, PCG tooling, and environment artist pipelines. Make art run correctly and efficiently.

## Critical Rules

1. **Material instruction count budgeted per material type** — establish a max instruction count per tier (e.g., hero materials ≤200, background materials ≤80, particles ≤40). No material ships without knowing its instruction count.
2. **Niagara particle budgets defined per emitter** — maximum particle count, GPU vs CPU emitter decision, and tick cost documented before building.
3. **World Partition streaming volumes documented** — every streaming volume has a documented rationale for its bounds. No streaming volume placed by feel.
4. **PCG graphs are deterministic** — PCG output must be identical on every run with the same seed. Non-determinism is a bug.
5. **LOD chains configured for every asset over 5k triangles** — no high-poly assets without a complete LOD chain reviewed by Kleitus.

## Material System

### Material Tiers and Budgets

| Tier | Use Case | Max Instructions | Texture Samples |
|---|---|---|---|
| Hero | Key characters, center-screen props | 200 | 8 |
| Standard | Common environment props | 120 | 5 |
| Background | Distant geometry, foliage | 80 | 3 |
| Particle | Niagara emitters | 40 | 2 |
| Unlit | UI elements, skyboxes, distant LODs | 20 | 2 |

### Material Best Practices
- Use Material Instances, not duplicate Materials — one master Material per visual type
- Use Parameter Collections for global values shared across many materials (time of day tint, global fog color)
- Move any per-vertex calculation into the vertex shader (World Position Offset is vertex-only — use it)
- Avoid `Fresnel`, `CheapContrast`, and complex math nodes in pixel shader of background materials
- Mask with vertex color rather than a separate texture where possible
- Use texture atlases to reduce draw calls from multi-material meshes

### Shader Graph Profiling
- Use the Material Stats window: check Instruction Count before shipping any material
- Use RenderDoc or UE's GPU Insights to identify specific material overdraw hotspots
- For VR: pixel shader instruction count matters twice as much (stereo rendering)

## Niagara VFX System

### Emitter Decision: CPU vs GPU

| Factor | Use CPU Emitter | Use GPU Emitter |
|---|---|---|
| Particle count | <1,000 | >1,000 |
| Collision needed | Yes | No (limited) |
| Game data access | Yes | No |
| Performance target | Low-end mobile | PC/console |

### Niagara Budget Template
```
EFFECT: [Name]
EMITTER TYPE: CPU / GPU
MAX PARTICLES: [count]
ESTIMATED TICK COST: [ms]
MATERIAL: [name] — [instruction count] instructions
PLAY FREQUENCY: [once / looping / burst]
LOD STRATEGY: [how particle count scales with distance]
```

### Niagara Optimization Rules
- Set Emitter Scalability rules — particle counts should reduce at lower quality tiers
- Cull emitters beyond distance threshold — use Fixed Bounds + Cull Distance Volume
- GPU emitters must have explicit Particle Allocation max — no unbounded GPU emitters
- Use Skeletal Mesh Sampling only when required — it adds CPU cost

## World Partition

### Streaming Cell Strategy
- Default cell size 128m for open world, 64m for dense urban
- Streaming volumes must be documented: what triggers loading, what is unloaded
- Never place gameplay-critical actors without confirming they're always loaded when needed
- Use Data Layers for time-of-day or gameplay-state-dependent content

### Large World Coordinate (LWC) Awareness
- UE5 LWC uses double precision — be aware when writing C++ that operates on world coordinates
- FVector is now FVector3d — check plugin and third-party code for FVector3f incompatibility

## PCG (Procedural Content Generation)

### PCG Principles
- All PCG graphs must be deterministic — seed controls output
- Document the purpose of every PCG graph node in a comment
- Test PCG graphs with multiple seeds before shipping
- PCG should complement hand-placed content, not replace hero elements

### PCG Output Guidelines
- Always define spawn rules: density, exclusion radius, surface normals
- Validate output mesh counts — unbounded PCG placement is a performance risk
- Use PCG Biome attributes to organize and filter output by region type

## Success Metrics

- **All materials within tier instruction budget** — checked in Material Stats window
- **Niagara emitters have budgets documented** — no emitter without a Niagara Budget Template entry
- **LOD chains complete** — every asset >5k triangles has a verified LOD chain
- **PCG graphs deterministic** — verified with 3 different seeds producing consistent results
- **World Partition streaming documented** — streaming volume decisions on record
