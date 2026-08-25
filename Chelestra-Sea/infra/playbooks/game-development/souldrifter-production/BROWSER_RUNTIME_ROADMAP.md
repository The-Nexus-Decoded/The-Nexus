# SoulDrifter Browser Runtime and Native-Port Roadmap

## Owner-locked current direction

SoulDrifter remains a **browser-first, mobile-compatible game**.

Current and planned browser runtime:

- Three.js;
- browser delivery with no required installation;
- desktop and mobile-browser support;
- WebGL fallback and WebGPU feature path where supported;
- scalable graphics/FX quality tiers;
- Houdini as the procedural/FX authoring source;
- engine-neutral asset preservation.

## No Babylon.js migration or evaluation roadmap

Babylon.js is **not** a planned SoulDrifter runtime evaluation, migration target, or post-POC milestone.

Do not:

- create a Babylon.js comparison ticket;
- maintain a Babylon.js target package;
- duplicate the First Breach in Babylon.js;
- delay Three.js work for a browser-engine comparison;
- recommend Babylon.js as the default next step after the POC.

The browser strategy is to continue improving the existing Three.js runtime rather than moving laterally to another browser engine.

A future owner decision may reopen browser-engine research, but no such work is currently authorized.

## Three.js browser-runtime priorities

After the First Breach vertical slice, continue strengthening the existing runtime through targeted improvements rather than a framework rewrite:

- mobile-browser compatibility and touch/input behavior;
- WebGL/WebGPU capability detection;
- GPU particle, water, fog, volumetric and post-processing paths appropriate to device tier;
- shader/material quality tiers;
- asset streaming, compression and loading;
- animation, physics and character-controller performance;
- memory, thermal and battery behavior on representative phones;
- PWA/offline support if approved later;
- multiplayer/runtime architecture compatibility;
- debug, profiling and real-device evidence.

Three.js remains the canonical browser runtime unless the owner explicitly changes that decision.

## Long-term full native/installed port

If the project eventually requires a full installed/native version beyond what the browser target can reasonably deliver, evaluate:

1. Unreal Engine;
2. Unity.

That is a long-term product decision, not a current POC dependency.

A native port would be:

- a separate evaluation/project phase;
- based on a mature, accepted browser vertical slice;
- justified by concrete requirements such as fidelity, world scale, platform distribution, simulation, tooling or performance;
- approved by the owner before implementation;
- built by reusing preserved source and neutral assets rather than recreating them from zero.

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
  unreal-future/
  unity-future/
```

Not every format is required for every asset. The asset contract selects the representations appropriate to the asset/effect.

## Houdini source-of-truth rule

Houdini source graphs, scripts, parameters, seeds and caches are preserved as master authoring data where applicable.

The Three.js browser runtime receives optimized representations such as:

- static/skinned GLB;
- PBR textures;
- flow, foam, normal and displacement maps;
- flipbooks/sprite sheets;
- VAT;
- point/transform data;
- baked animation;
- runtime metadata.

A future Unreal or Unity target should re-integrate/re-export preserved source and neutral outputs rather than recreate the artistic, procedural, simulation and animation work.

## Portability does not mean zero work

The preserved sources remove the need to start over, but each target still needs engine-specific integration:

- Three.js shaders/runtime systems;
- Unreal materials, Niagara, animation and gameplay integration;
- Unity shaders/VFX Graph, animation and gameplay integration;
- engine-specific physics, lighting, UI, loading and packaging.

The goal is **reuse and controlled re-integration**, not a false promise that an engine port requires no target-specific work.

## License/provenance rule

Current Apprentice-derived SoulDrifter artifacts remain marked:

- `APPRENTICE_NONCOMMERCIAL`;
- `NONCOMMERCIAL_POC`.

When Houdini Indie or another production license becomes active, rebuild/re-export clean licensed derivatives from documented source data/settings. Preserve Apprentice material as prototype history and reference; do not silently relabel it commercial-ready.

## Current priority

```text
1. Finish and verify First Breach in Three.js
2. Finish the browser/mobile vertical slice
3. Improve Three.js/WebGL/WebGPU quality and performance as required
4. Preserve engine-neutral source/assets continuously
5. Consider Unreal versus Unity only if a future native/full-engine edition is actually needed
```
