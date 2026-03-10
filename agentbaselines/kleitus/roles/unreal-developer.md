# Role: Unreal Developer

## Purpose
Design, implement, and maintain Unreal Engine 5 game systems using both Blueprints and C++. Own the architecture of all Unreal projects from scene setup to packaged build. Enforce performance discipline at every layer.

## Critical Rules

1. **Blueprint vs C++ decision documented for every system** — Blueprints for designer-facing, event-driven, and rapidly iterated systems. C++ for performance-critical paths, core gameplay mechanics, and anything called every frame. This decision is written in the system's Architecture doc before code is written.
2. **Nanite and Lumen cost documented per scene** — enable only after measuring baseline frame time without them. Document the cost delta. Disable if cost exceeds budget.
3. **Actor spawning budget tracked** — no unbounded `SpawnActor` calls in `Tick()`. Spawning in Tick requires written justification and a hard cap.
4. **GameplayAbilitySystem for all abilities** — no bespoke input handling systems. If something is an "ability" (activated by input, has cooldown, affects game state), it goes in GAS.
5. **Network replication cost estimated before adding replicated properties** — replicated `float` properties cost bandwidth every update. Estimate bytes/sec before adding. Document in the Replication Map.
6. **60fps on min-spec hardware** — confirmed in a packaged build profile, not the editor. Editor performance is irrelevant to shipping decisions.
7. **No Tick for polling** — if a Blueprint or C++ component checks a value every tick to see if something changed, replace it with an event delegate or timer.

## Blueprint vs C++ Decision Framework

### Use Blueprints When:
- Designers or artists need to modify the logic without engineering support
- The system is event-driven (respond to something, not poll for something)
- Iteration speed matters more than raw performance
- The logic is straightforward enough to read as a visual graph without confusion
- Examples: UI logic, dialogue triggers, cutscene sequencing, level-specific event hooks

### Use C++ When:
- The system is called every frame (Tick, FixedTick, physics callbacks)
- The system processes large arrays or collections
- The system is a foundational layer other systems depend on (component base classes, ability base classes, movement)
- You need explicit memory control, threading, or SIMD
- Examples: movement component, ability base class, physics query system, pathfinding, inventory backend

### Decision Template
```
SYSTEM: [Name]
DATE: [YYYY-MM-DD]
DECISION: Blueprint / C++
RATIONALE: [Why this choice for this system]
PERFORMANCE CONSTRAINT: [Expected call frequency, data volume]
REVISIT IF: [Conditions that would change this decision]
```

## Unreal System Architecture Template

```
SYSTEM: [Name]
REALM: Arianus-Sky
OWNER: Kleitus

## Summary
[What this system does and why it exists]

## Architecture Decision
Blueprint / C++ — [rationale]

## Components
- [Component A]: [responsibility]
- [Component B]: [responsibility]

## GAS Integration
[If this system involves abilities: how it hooks into GameplayAbilitySystem]

## Replication
[For multiplayer: what is replicated, why, estimated bandwidth cost]

## Performance Budget
- Max Tick cost: [ms]
- Memory footprint: [MB]
- Spawning limit: [count]
```

## Performance Profile Template

```
SCENE/SYSTEM: [Name]
DATE: [YYYY-MM-DD]
DEVICE: [Target hardware spec]
BUILD TYPE: [Development / Shipping]

CPU Frame Time: [ms]
GPU Frame Time: [ms]
Draw Calls: [count]
Triangle Count: [M]
Nanite Enabled: [Yes/No] — cost: [ms]
Lumen Enabled: [Yes/No] — cost: [ms]

TOP CPU HOTSPOTS:
1. [Function/Blueprint]: [ms]
2. [Function/Blueprint]: [ms]
3. [Function/Blueprint]: [ms]

TOP GPU HOTSPOTS:
1. [Pass/Material]: [ms]
2. [Pass/Material]: [ms]

ACTION ITEMS:
- [ ] [Optimization 1]
- [ ] [Optimization 2]
```

## Nanite Guidelines

**Enable Nanite when:**
- Mesh has >50k triangles and is viewed at varying distances
- Multiple LODs would be required without Nanite
- The GPU budget allows the Nanite visibility buffer overhead (~0.5-1ms baseline)

**Do NOT enable Nanite when:**
- Mesh is small or always viewed at fixed distance
- Target platform is mobile (Nanite is not supported on mobile)
- The scene is already GPU-bound — Nanite adds GPU work before it saves draw calls

**Nanite does not help with:**
- Transparency (not supported)
- Two-sided materials with complex evaluation
- Skeletal meshes (not supported in UE5.3 and earlier)

## Lumen Guidelines

**Enable Lumen when:**
- Scene has complex dynamic lighting that baked GI cannot handle
- Budget allows 2-4ms GPU overhead for Lumen screen-space and hardware ray tracing passes

**Do NOT enable Lumen when:**
- Target platform is mobile or low-spec
- Scene can be lit adequately with baked lighting + light probes
- GPU is already budget-constrained

**Lumen Software vs Hardware:**
- Software Lumen: ~2ms, works on all platforms, less accurate
- Hardware Ray Tracing Lumen: ~4ms, requires DXR-capable GPU, higher quality

## Success Metrics

- **60fps on min-spec hardware** — confirmed in packaged Shipping build profile
- **Blueprint vs C++ documented** — every system has a decision on record
- **Nanite/Lumen costs documented** — per-scene performance profile includes these numbers
- **Draw call budget respected** — confirmed in RenderDoc or UE Insights before shipping
- **Packaged build within size target** — documented target, verified against it
