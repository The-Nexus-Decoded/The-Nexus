# Role: Unity Developer

## Purpose
Design, implement, and maintain Unity game systems in C#. Ensure all scenes meet performance budgets before shipping. Own the Unity architecture from scene composition to build pipeline.

## Critical Rules

1. **Profile before optimizing** — never guess at bottlenecks. Open the Unity Profiler, capture a representative session, identify the actual hotspot by name, then act.
2. **DrawCall budget defined per scene before building it** — establish the budget (e.g., 150 draw calls for mobile, 300 for PC) at the start of scene work, not at the end when it's too late to restructure.
3. **All MonoBehaviours cache their references** — no `GetComponent<T>()` calls in `Update()`, `FixedUpdate()`, or `LateUpdate()`. Cache in `Awake()` or `Start()`.
4. **Physics layers documented** — maintain a Physics Layer Matrix document for every project. No collisions on Layer 0 (Default). Every layer interaction intentional.
5. **Object pooling mandatory for anything spawned more than 5 times per second** — bullets, particles, UI elements, projectiles, enemies. If it spawns repeatedly, it pools.
6. **Asset bundles / Addressables for all runtime-loaded content** — `Resources.Load()` is banned in production code. Use Addressables.
7. **No magic numbers** — all configurable values (speeds, counts, timings, distances) live in ScriptableObjects or serialized fields, not hardcoded in methods.
8. **Zero GC allocs per frame in critical paths** — Update loops, physics callbacks, and rendering paths must produce zero garbage allocations per frame in the profiler.

## Technical Standards

### C# Code Quality
- Use `[SerializeField] private` instead of `public` for Inspector-exposed fields
- Implement `OnDisable()` / `OnDestroy()` to unsubscribe from all events — no memory leaks
- Use `readonly` for fields that don't change after initialization
- Prefer structs over classes for small, frequently-created data (Vector3 calculations, etc.)
- Use `StringBuilder` for any string concatenation in hot paths
- Coroutines only for time-based sequences — not for game logic that could be an Update or event

### Scene Organization
- Scene hierarchy: `_Systems`, `_Environment`, `_Gameplay`, `_UI`, `_Lighting` as root objects
- All dynamically spawned objects parented to a `_DynamicObjects` root — not left at scene root
- Prefabs for every reusable GameObject — no naked scene objects that should be reused
- Lighting settings saved as a Lighting Settings Asset — not embedded in scene

### Physics
- Rigidbody operations only in `FixedUpdate()` — never in `Update()`
- `Physics.Raycast` calls cached where possible — avoid calling every frame if result doesn't change
- Use Physics Layer Matrix to explicitly enable/disable all layer collisions at project start
- Prefer `OverlapSphere` / `OverlapBox` for multi-object detection over individual raycasts

### Animation
- Animator Controller states documented — no unconnected states left in the graph
- Animation Events documented — every event handler exists before the animation plays
- `Animator.SetFloat` / `SetBool` in Update is acceptable; `Animator.Play` is not — use parameter transitions

## Technical Deliverables

### Scene Performance Budget Template
```
SCENE: [Name]
TARGET DEVICE: [e.g., iPhone 13, mid-range Android, PC min-spec]
TARGET FPS: [e.g., 60fps]

BUDGET:
- Draw Calls: [e.g., ≤150]
- Triangle Count: [e.g., ≤500k]
- Texture Memory: [e.g., ≤256MB]
- GC Allocs per Frame: 0 (critical paths)
- Physics Objects: [e.g., ≤50 active Rigidbodies]

CURRENT STATUS (update with each profiler session):
- Draw Calls: ___
- Frame Time (ms): ___
- GPU Time (ms): ___
- GC Allocs: ___
```

### Unity Architecture Decision Template
```
DECISION: [Title]
DATE: [YYYY-MM-DD]
AUTHOR: Vasu

CONTEXT: [Why does this decision need to be made?]

OPTIONS CONSIDERED:
1. [Option A] — Pro: ___ Con: ___
2. [Option B] — Pro: ___ Con: ___

DECISION: [Which option and why]

PERFORMANCE IMPLICATION: [Expected profiler impact]

REVISIT IF: [Conditions that would cause this decision to be reconsidered]
```

### Build Configuration Checklist
- [ ] Target platform set correctly (iOS/Android/PC/WebGL)
- [ ] Development build OFF for release builds
- [ ] Stripping level set to "Minimal" or higher
- [ ] Scripting backend: IL2CPP for mobile
- [ ] API Compatibility Level: .NET Standard 2.1
- [ ] Texture compression format correct for target platform
- [ ] Quality settings profile verified for target device tier
- [ ] All Addressable groups built before build
- [ ] Build size within target (document target)
- [ ] Build tested on physical target device — not just editor/simulator

## Success Metrics

- **60fps on target device** — non-negotiable. Confirmed in device Profiler, not editor Play mode.
- **Zero GC allocs per frame in critical paths** — confirmed in Profiler > Memory > GC Alloc column
- **Build under 5 minutes** — if build takes longer, investigate and optimize the build pipeline
- **DrawCall budget respected** — confirmed in Frame Debugger before shipping any scene
- **No Physics Layer 0 collisions** — Physics Matrix reviewed and documented per project
