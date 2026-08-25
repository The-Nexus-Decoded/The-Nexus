# Universal Browser Runtime and Asset Portability Policy

## Purpose

Allow a game to remain browser-first/mobile-compatible while preserving expensive procedural, 3D, animation and FX work for later browser-runtime migration or optional native-engine targets.

## Browser-first rule

A project profile may declare:

```text
primaryDelivery: BROWSER
mobileBrowserRequired: true
installationRequired: false
```

The current runtime remains stable until the selected vertical slice is complete and independently verified.

Do not switch rendering/game frameworks mid-slice merely because another engine may have more built-in features.

## Post-slice browser-engine evaluation

A project may schedule a side-by-side evaluation after its POC/vertical slice.

Example browser candidates:

- Three.js;
- Babylon.js;
- PlayCanvas;
- another approved WebGL/WebGPU runtime.

The evaluation uses the same representative scene/assets/gameplay rather than unrelated demos.

Compare:

- desktop/mobile browser support;
- WebGL fallback and WebGPU path;
- startup/download/streaming behavior;
- frame rate, memory and thermal behavior;
- particles, water, fog, volumetrics and post-processing;
- animation, physics, input and UI;
- asset compatibility/material fidelity;
- debugging/tooling;
- implementation effort and migration risk;
- networking/save/runtime compatibility.

A runtime change requires owner approval after evidence. The evaluation branch must not silently replace the canonical runtime.

## Engine-neutral source preservation

Preserve the expensive source work independently of the current runtime.

Recommended structure:

```text
asset-or-effect/
  source/
    houdini/
    blender/
    provider-originals/
    references/
    simulation-caches/
  neutral/
    geometry/
    animations/
    textures-materials/
    collision-sockets/
    volume-point-vat-caches/
    metadata-manifests/
  targets/
    current-browser-runtime/
    alternate-browser-evaluation/
    native-engine-future/
```

Choose only formats appropriate to the asset, such as USD, Alembic, FBX, glTF/GLB, VDB, VAT, flipbooks, point caches, PBR maps, MaterialX or project-specific metadata.

## DCC source-of-truth rule

Houdini/Blender/procedural scripts, parameters, seeds and caches remain master authoring data where applicable.

Runtime packages are derivatives optimized for the selected target.

A later target should re-integrate/re-export preserved work instead of recreating modeling, simulation, animation or art direction from zero.

## Native-engine targets

Unreal, Unity, Godot or another installed/native target may remain long-term options without becoming current production dependencies.

The project profile determines whether any native target is:

- `NOT_PLANNED`;
- `LONG_TERM_PORTABILITY_ONLY`;
- `EVALUATION_PLANNED`;
- `ACTIVE_TARGET`.

Long-term portability means preserving sources/manifests—not maintaining multiple production clients today.

## License/provenance

Preserved source and derivatives retain their original provider/DCC/license classification.

A later engine or commercial license does not automatically convert prototype/non-commercial source into commercial-ready assets. Rebuild/re-export under the appropriate license when required.

## Done rule

Browser-first production and long-term portability are compatible when:

- the current browser target is optimized and independently verified;
- source assets/caches/scripts are preserved;
- neutral contracts/manifests exist;
- target-specific runtime code remains separated;
- later migration is treated as integration/re-export, not a promise of zero work or a reason to restart.