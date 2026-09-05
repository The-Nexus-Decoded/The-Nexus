# Universal Browser Runtime and Asset Portability Policy

## Purpose

Allow a game to remain browser-first/mobile-compatible while preserving expensive procedural, 3D, animation and FX work for an optional future native/full-engine target.

## Browser-first rule

A project profile may declare:

```text
primaryDelivery: BROWSER
mobileBrowserRequired: true
installationRequired: false
canonicalBrowserRuntime: <project-selected runtime>
```

The selected browser runtime remains stable until the current vertical slice is complete and independently verified.

Do not switch rendering/game frameworks mid-slice merely because another framework has different built-in features.

## No default lateral browser-engine migration

The universal playbook does not prescribe a post-POC migration from one browser engine/library to another.

A project should normally improve its accepted browser runtime through:

- WebGL/WebGPU capability paths;
- scalable shaders, particles, water, fog and post-processing;
- asset streaming/compression/loading;
- animation and physics optimization;
- mobile memory, thermal and battery work;
- real-device profiling;
- PWA/offline work when selected;
- runtime architecture and tooling improvements.

A lateral browser-runtime comparison may happen only when the project overlay explicitly defines:

- the business/technical problem that the current runtime cannot reasonably solve;
- named candidate runtimes;
- the representative test slice;
- acceptance metrics;
- migration budget/risk;
- owner approval.

There is no default named browser-engine comparison candidate in the universal core.

## Optional future native/full-engine target

When browser delivery can no longer satisfy an approved product requirement, a project may evaluate a native/installed engine as a separate phase.

Common candidates may include Unreal Engine, Unity, Godot or another project-approved engine. The project overlay owns the actual shortlist.

A native evaluation must be based on concrete requirements such as:

- visual/FX fidelity;
- world scale and streaming;
- simulation/physics;
- platform/store distribution;
- console support;
- editor/tooling needs;
- performance;
- networking;
- content-production scale.

Do not maintain a parallel native client during the browser POC unless the owner explicitly approves it.

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
    native-engine-future/
```

Choose formats appropriate to each asset, such as USD, Alembic, FBX, glTF/GLB, VDB, VAT, flipbooks, point caches, PBR maps, MaterialX or project-specific metadata.

## DCC source-of-truth rule

Houdini/Blender/procedural scripts, parameters, seeds and caches remain master authoring data where applicable.

Runtime packages are derivatives optimized for the selected target.

A later target should re-integrate/re-export preserved work instead of recreating modeling, simulation, animation or art direction from zero.

## Target status

The project profile determines whether a non-browser target is:

- `NOT_PLANNED`;
- `LONG_TERM_PORTABILITY_ONLY`;
- `EVALUATION_PLANNED`;
- `ACTIVE_TARGET`.

Long-term portability means preserving sources/manifests—not maintaining multiple production clients today.

## Portability does not mean zero work

Preserved sources avoid recreating expensive creative/procedural work, but each target still needs target-specific integration for rendering, materials, particles, physics, animation, UI, loading, networking and packaging.

The promise is **reuse and controlled re-integration**, not an automatic one-click port.

## License/provenance

Preserved source and derivatives retain their original provider/DCC/license classification.

A later engine or commercial license does not automatically convert prototype/non-commercial source into commercial-ready assets. Rebuild/re-export under the appropriate license when required.

## Done rule

Browser-first production and long-term portability are compatible when:

- the current browser target is optimized and independently verified;
- source assets/caches/scripts are preserved;
- neutral contracts/manifests exist;
- target-specific runtime code remains separated;
- later migration is treated as integration/re-export, not a reason to restart.
