# SoulDrifter Browser Runtime and Portability Roadmap

## Owner-locked current direction

SoulDrifter remains a **browser-first, mobile-compatible game**.

Current canonical runtime:

- Three.js;
- browser delivery with no required installation;
- desktop and mobile-browser support;
- WebGL fallback and WebGPU feature paths where supported;
- scalable graphics/FX quality tiers;
- Houdini as the procedural/FX authoring source;
- engine-neutral asset preservation.

## Current POC scope stays on Three.js

Do not interrupt, delay, or duplicate the current production work while completing:

1. the First Breach playable level;
2. the first playable Heartvale section reached after the Breach exit.

Both sections must first be complete and independently verified in Three.js, including desktop/mobile-browser behavior, gameplay, assets, animation, FX, loading, save/progression and performance.

Three.js remains canonical until the owner explicitly accepts another result.

## Post-POC Babylon.js comparison

After the **First Breach + first Heartvale section POC** is complete and verified, create a separate isolated Babylon.js port/evaluation branch containing exactly those two representative sections.

This is a controlled comparison, not an automatic migration.

### Required comparison scope

Port the same accepted content and behavior:

- character selection/load-in needed for the slice;
- First Breach start-to-boss-to-exit flow;
- first Heartvale playable section;
- same approved models, rigs, animations and effects;
- same saved state/progression contract;
- same desktop and representative mobile-browser targets;
- equivalent graphics quality tiers.

Do not redesign the game to make one runtime look better. Use the same asset sources, gameplay contracts, cameras, quality targets and test devices.

### Required comparison metrics

- desktop and mobile-browser compatibility;
- WebGL fallback and WebGPU behavior;
- startup/download size and streaming/loading;
- frame rate, frame-time stability, memory, thermal and battery behavior;
- water, particles, fog, volumetrics, lighting and post-processing;
- skeletal animation, retargeting and state transitions;
- physics and character-controller behavior;
- UI, touch, keyboard/mouse and accessibility integration;
- asset-loading reliability and material fidelity;
- debugging/profiling/tooling;
- implementation time, defects and maintenance complexity;
- save/network/runtime architecture compatibility.

### Decision outcomes

After side-by-side evidence, the owner may choose:

- `THREEJS_REMAINS_CANONICAL`;
- `BABYLONJS_WINS_FUTURE_BROWSER_WORK`;
- `KEEP_BOTH_FOR_FURTHER_TESTING`;
- `CATEGORY_SPLIT_OR_SPECIAL_MODE_ONLY`;
- `REJECT_BABYLON_PORT`.

No migration occurs before the verdict. The existing Three.js game remains intact and runnable throughout the experiment.

## Long-term full native/installed port

If the project eventually needs an installed/native edition beyond what the browser target can reasonably deliver, evaluate:

1. Unreal Engine;
2. Unity.

That is a later product phase, not a current POC dependency and not a substitute for the Babylon browser comparison.

Do not build or maintain a parallel Unreal/Unity client during the current browser POC.

## Engine-neutral preservation contract

For every accepted asset/effect, preserve appropriate source and neutral representations:

```text
source/
  houdini scenes/scripts/settings
  blender source
  provider originals
  references/prompts
  simulation caches

neutral/
  USD / Alembic / FBX / glTF / GLB as appropriate
  PBR textures and masks
  skeletons and animation clips
  collision meshes
  sockets/markers
  flow/velocity maps
  VDB/flipbooks
  VAT/point/transform caches
  metadata and manifests

targets/
  web-threejs/
  web-babylon-poc-comparison/
  unreal-future/
  unity-future/
```

Not every format is required for every asset. The asset contract selects the representations appropriate to the asset/effect.

## Houdini source-of-truth rule

Houdini source graphs, scripts, parameters, seeds and caches are preserved as master authoring data where applicable.

The browser runtimes consume optimized representations such as:

- static/skinned GLB;
- PBR textures;
- flow, foam, normal and displacement maps;
- flipbooks/sprite sheets;
- VAT;
- point/transform data;
- baked animation;
- runtime metadata.

The Babylon.js comparison and any future Unreal/Unity port should re-integrate/re-export preserved source and neutral outputs rather than recreate artistic, procedural, simulation and animation work.

## Portability does not mean zero work

Preserved sources prevent starting over, but every target still needs runtime-specific integration for rendering, materials, particles, physics, animation, UI, loading, networking and packaging.

The goal is **reuse and controlled re-integration**.

## License/provenance rule

Current Apprentice-derived SoulDrifter artifacts remain marked:

- `APPRENTICE_NONCOMMERCIAL`;
- `NONCOMMERCIAL_POC`.

When Houdini Indie or another production license becomes active, rebuild/re-export clean licensed derivatives from documented source data/settings. Preserve Apprentice material as prototype history and reference; do not silently relabel it commercial-ready.

## Current priority

```text
1. Finish and verify First Breach in Three.js
2. Finish and verify the first Heartvale playable section in Three.js
3. Freeze a representative two-section POC baseline
4. Port that exact baseline to Babylon.js on an isolated comparison branch
5. Run desktop/mobile-browser side-by-side tests
6. Owner selects the future browser-runtime direction
7. Consider Unreal versus Unity only if a future native/full-engine edition is needed
```
