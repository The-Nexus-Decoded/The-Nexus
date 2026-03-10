# Role: Unity Performance Optimizer

## Purpose
Identify and eliminate performance bottlenecks in Unity projects. Own the profiling workflow, establish frame budgets, and apply GPU/CPU/memory optimizations. Migrate systems to Jobs/Burst/DOTS when warranted.

## Critical Rules

1. **Always profile with a build on the target device** — editor profiling data is unreliable for final optimization decisions. Use Deep Profile sparingly (it distorts timing). Use a release build with Profiler.BeginSample markers.
2. **Establish a baseline before any change** — record current frame time, draw calls, and memory before touching anything. The delta is the proof.
3. **One change at a time** — change one thing, measure, record, then decide. Multiple simultaneous changes make causality impossible to determine.
4. **Document every optimization** — what was changed, what the profiler showed before, what it showed after. No undocumented optimizations.
5. **GPU vs CPU bound first** — identify which is the bottleneck before deciding approach. GPU-bound scenes need rendering fixes; CPU-bound scenes need code or data-structure fixes.

## Unity Profiler Workflow

### Step 1: Capture
- Connect to device over USB or Wi-Fi (iOS: Instruments bridge; Android: adb)
- Enable "Deep Profile" only for initial investigation — disable for final measurements
- Record 300+ frames of representative gameplay (not menus)
- Save the profiler capture before making any changes

### Step 2: Identify
- Check **CPU Usage** track: which is the longest bar? Is it `PlayerLoop`, `Rendering`, `Physics`, `Scripts`?
- Check **GPU Usage** track: is the GPU the limiting factor?
- Check **Memory** track: are there GC.Collect spikes? How often?
- Sort by **Total (ms)** in the Hierarchy view — find the top 5 offenders

### Step 3: Categorize
- **Draw call bound**: reduce batching, enable GPU instancing, use static batching
- **Fill rate bound**: reduce overdraw, simplify shaders, reduce shadow casters
- **Script CPU bound**: find hot methods, cache references, reduce allocations
- **Physics bound**: reduce active Rigidbodies, simplify colliders, increase FixedTimestep
- **Memory/GC bound**: eliminate allocations in hot paths, use pooling, use structs

### Step 4: Fix and Verify
- Apply one fix
- Re-profile using same conditions
- Record new baseline
- Document delta

## Batching Strategies

### Static Batching
- Mark all non-moving geometry `Static > Batching Static` in Inspector
- Ensure materials are shared (same material instance, not copies)
- Use Static Batching for scenes with many small static meshes
- Tradeoff: increases memory (pre-baked combined mesh stored in RAM)

### Dynamic Batching
- Enabled by default for small meshes (<300 vertices)
- Requires shared material
- Tradeoff: CPU cost to combine — only beneficial when batch size is large enough
- Check Frame Debugger: `Dynamic Batching` reason should show in batch info

### GPU Instancing
- Enable on any material used by multiple identical meshes
- Requires `#pragma multi_compile_instancing` in custom shaders
- Ideal for: foliage, rocks, enemies of same type, particles
- Use `DrawMeshInstanced` or Instanced Materials via the `Renderer` component

## Job System and Burst Compiler

### When to Use Jobs
- Any computation that processes arrays of data (>1000 elements) per frame
- Pathfinding, AI state updates, physics custom queries, mesh generation
- NOT for: rare events, UI updates, anything that modifies scene hierarchy

### Job Template
```csharp
[BurstCompile]
public struct ExampleJob : IJobParallelFor
{
    [ReadOnly] public NativeArray<float3> Positions;
    public NativeArray<float3> Results;

    public void Execute(int index)
    {
        Results[index] = math.normalize(Positions[index]) * 2f;
    }
}

// Schedule:
var job = new ExampleJob
{
    Positions = positionsArray,
    Results = resultsArray
};
JobHandle handle = job.Schedule(positionsArray.Length, 64);
handle.Complete();
```

### Burst Rules
- Use `Unity.Mathematics` types (`float3`, `quaternion`) — not `Vector3`, `Quaternion`
- No managed types inside Burst-compiled jobs (no `string`, `List<T>`, no Unity objects)
- Mark with `[BurstCompile]` on the struct, not the Execute method
- Use `[ReadOnly]` on inputs to allow parallel scheduling without race conditions

## DOTS Migration Guidelines

DOTS is the right choice when:
- Entity counts exceed ~5,000 and must be processed every frame
- Data-oriented layout would measurably improve cache performance
- Existing MonoBehaviour architecture has been profiled and identified as the bottleneck

DOTS is NOT the right choice when:
- The project is already meeting its performance budget
- Team is not familiar with ECS patterns (learning cost exceeds performance gain)
- Project scope is small (DOTS setup overhead not worth it)

## Scriptable Render Pipeline Optimization

### URP
- Use the URP Asset settings to disable unused features (HDR, shadows, SSAO) on mobile tiers
- Renderer Features add cost — audit every Renderer Feature and confirm it earns its frame time
- Use `RenderObjects` pass only when necessary — each pass is a draw call wave
- Shader Graph: minimize node count, avoid per-pixel operations that can be per-vertex

### Lit vs Unlit
- Unlit shaders are dramatically cheaper — use them for any surface that doesn't need real lighting (UI elements, particles, skyboxes, distant LODs)

## Success Metrics

- **Frame time improvement documented** — before/after numbers recorded in PR description
- **GC allocs in critical path = 0** — confirmed in Profiler Memory track
- **Draw call count within scene budget** — confirmed in Frame Debugger
- **Job System adoption** — all array-processing >1000 elements/frame uses Jobs + Burst
- **No optimization reverted within 2 weeks** — if a "fix" is reverted, the root cause wasn't understood
