# SoulDrifter Browser Runtime and Portability Roadmap

## Owner-locked current direction

SoulDrifter remains a **browser-first, mobile-compatible game**.

Current POC/runtime:

- Three.js;
- browser delivery with no required installation;
- desktop and mobile-browser support;
- WebGL/WebGPU feature detection and scalable quality tiers;
- Houdini as the procedural/FX authoring source;
- engine-neutral asset preservation.

Do not migrate the current #451/#448 POC work to another runtime while the First Breach vertical slice is unfinished.

## Post-POC browser-engine evaluation

After the current First Breach POC round is complete and independently verified, create a separate evaluation ticket for **Babylon.js**.

The evaluation compares the same representative SoulDrifter slice in Three.js and Babylon.js without replacing the canonical branch during the experiment.

Required comparison criteria:

- desktop-browser and mobile-browser compatibility;
- WebGL fallback and WebGPU path;
- startup/download size and streaming behavior;
- frame rate, memory, draw calls and thermal behavior on representative phones;
- water, particles, fog, volumetrics and post-processing;
- skeletal animation and retargeting;
- physics/character-controller integration;
- UI/input/accessibility integration;
- asset loading, GLB compatibility and material fidelity;
- developer tooling/debugging;
- implementation effort and migration risk;
- offline/PWA options if selected later;
- multiplayer/runtime architecture compatibility.

Possible outcomes:

- remain on Three.js;
- adopt Babylon.js for future work;
- use Babylon.js only for a later project/mode;
- retain a renderer/runtime adapter boundary and continue evaluating.

No migration happens automatically. The owner approves any runtime change after side-by-side evidence.

## Long-term non-browser targets

Unreal and Unity remain **long-term optional targets**, not current production priorities.

The project does not build or maintain a parallel Unreal/Unity client during the current browser POC.

However, every expensive Houdini/model/animation/FX source must be preserved so a future native/full-engine version can reuse the work rather than restart.

## Engine-neutral preservation contract

For every accepted asset/effect, preserve when applicable:

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
  web-babylon-evaluation/
  unreal-future/
  unity-future/
```

Not every format is required for every asset; the asset contract selects the appropriate neutral representations.

## Houdini source-of-truth rule

Houdini source graphs, scripts, parameters, seeds and caches are preserved as master authoring data.

The browser runtime receives optimized representations such as:

- GLB/static or skinned meshes;
- PBR textures;
- flow/foam/normal/displacement maps;
- flipbooks/sprite sheets;
- VAT;
- point/transform data;
- baked animation;
- runtime metadata.

A future Babylon.js, Unreal or Unity target should re-integrate these preserved sources/neutral outputs rather than recreate the artistic/procedural work.

## License/provenance rule

Current Apprentice-derived SoulDrifter artifacts remain marked `APPRENTICE_NONCOMMERCIAL` and `NONCOMMERCIAL_POC`.

When Houdini Indie or another production license becomes the active lane, rebuild/re-export clean licensed production derivatives from documented source data/settings. Preserve the Apprentice material as prototype history and reference; do not silently relabel it commercial-ready.

## Current priority

```text
1. Finish and verify First Breach in Three.js
2. Finish the browser/mobile vertical slice
3. Run Babylon.js evaluation on the same representative content
4. Make an owner-approved browser-runtime decision
5. Keep Unreal/Unity portability as a maintained long-term asset-preservation requirement
```
