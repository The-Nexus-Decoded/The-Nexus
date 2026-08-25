# Universal AI Game Production Playbook — v2 Corrections

**Supersedes conflicting or incomplete portions of `PLAYBOOK.md` v1.**

This correction package applies to every game genre/platform. Game-specific details still belong in each project overlay.

## 1. Onboarding is persistent, not repeated in every chat

The v1 wording could be read as requiring full onboarding every session. The corrected architecture is:

```text
ONE-TIME WORKSTATION/TOOLCHAIN BOOTSTRAP
-> cached sanitized receipt outside Git
-> FAST START for every new chat
-> lane-specific refresh only when invalidated
-> live price/balance/approval immediately before paid provider work
```

Every chat still verifies its ticket, branch/worktree, live comments/head, state files and cached receipt. It does not reinstall SDKs, DCCs, engines, add-ons or repeat full device smoke suites without an invalidation trigger.

Required files:

- `ONBOARDING.md`
- `SESSION_FAST_START.md`
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`
- `config/onboarding-cache-policy.json`

## 2. A provider is not connected because it appears in documentation

Every selected provider module must define and prove:

- official SDK/API/package/repository;
- version and region/base URL;
- secret environment-variable name without exposing the value;
- live read-only authenticated call;
- capabilities needed by the project;
- controlled download/staging paths;
- task polling/retry behavior;
- price/balance/spend gate;
- provenance, hashes and rollback;
- optional CLI/MCP discovery from exact first-party documentation.

The connection result is stored in a sanitized persistent receipt and referenced by future sessions.

## 3. Host-LLM image generation precedes paid 3D-provider image generation

When the active M3, Claude, ChatGPT/Codex or other host can create concept/reference images, use that lane first.

A 3D provider's 2D image features are disabled by default to avoid unnecessary credits. A project overlay may authorize an exception with an exact reason and cost.

The 3D provider then consumes approved text/image/multiview references for 3D generation and downstream processing.

## 4. Tripo is a reusable 3D provider module, not universal hard-coding

The universal harness includes a selectable Tripo v3 provider module under `providers/tripo/`.

Current official default lane:

- package: `@vastai/tripo-sdk`;
- Node.js 18+;
- global API base: `https://openapi.tripo3d.ai/v3`;
- secret name: `TRIPO_API_KEY`;
- read-only proof: authenticated `getBalance()`;
- no charged task during bootstrap.

Use Tripo for approved 3D generation/import, upload/download, segmentation, mesh completion/decimation, rig check, rigging and preset animation retargeting.

Do not install similarly named CLI packages by guesswork. An official CLI is optional and must be discovered from current first-party documentation or the authenticated provider console.

The official Tripo MCP is optional and currently uses a Blender/add-on workflow; MCP does not replace the core SDK/API receipt unless the project explicitly makes it authoritative and proves equivalent capabilities.

## 5. Geometry-changing stages precede rigging

Universal 3D order:

```text
host-LLM concept/reference
-> 3D provider generation/import
-> segmentation/mesh completion/retopo/low-poly
-> UV/material/texture
-> scale/origin/pivot
-> rig check
-> rig/skin
-> animation
-> sockets/LOD/collision
-> runtime
-> device/performance/visual QA
```

If a provider operation strips skeletal/animation data, it must occur before final rigging.

## 6. Custom-animation routing is evidence-driven

First search the selected provider's live preset/custom-motion capabilities.

- A direct preset that passes full acceptance may ship without duplicate DCC production.
- Simple deterministic edits may use one approved lane when the project policy allows.
- Every bespoke or substantial constrained/interaction/class/weapon/boss/signature-death/acting motion uses the project-enabled dual-pipeline bakeoff.

Default reusable bakeoff lanes:

1. Houdini KineFX
2. Blender

Both use the same model, rig, source motion/brief, duration, FPS, root-motion rules, constraints, markers, cameras, runtime export and production budget.

An independent coordinator blinds the labels. An independent AI reviewer scores them. The owner makes the blinded A/B decision. Both candidates and metrics are preserved.

Required files:

- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- `config/animation-bakeoff-policy.json`
- `templates/animation-bakeoff-record.template.json`

Aggregate results are reviewed at defined checkpoints. No pipeline retires automatically.

## 7. Houdini Apprentice and Indie are license/pipeline states

Houdini Apprentice exposes virtually the Houdini FX feature set for learning/non-commercial work, including procedural modeling, particles/dynamics, Pyro, Vellum and KineFX. Its restrictions make it a prototype lane.

Houdini Indie is the limited-commercial production lane when the project qualifies. A license upgrade invalidates the cached Houdini receipt and requires:

- current license proof;
- clean Indie scene/asset formats;
- detection/removal of non-commercial asset contamination;
- fresh scripted import/export/runtime smoke tests;
- revalidation of Engine/batch/third-party-renderer requirements selected by the project.

Do not claim that Indie primarily adds new particle features; it primarily changes production/commercial/file-format/render/Engine capabilities while retaining Houdini FX-class tools.

## 8. Toolchain preflight is lane-selective

A documentation ticket should not wait for Blender or a 3D provider.

A 3D asset ticket should require its provider, DCC, runtime and target-device lanes.

A custom-animation ticket should require rig source, both configured candidate lanes, comparison/evidence tooling and runtime review.

Unused lanes are `NOT_REQUIRED`; missing required lanes are `BLOCKED`.

## 9. Paid provider work always has a live gate

A cached authenticated receipt proves connectivity, not current price or blanket authorization.

Immediately before every charged task:

1. live balance read;
2. current official pricing;
3. exact operation/model/version;
4. expected and maximum cost;
5. retry-cost disclosure;
6. explicit owner approval;
7. task submission;
8. actual cost/task ID/download hash/remaining balance record.

## 10. Representative vertical-slice pipeline proof

Before content scaling, every project must prove at least one complete representative production path:

```text
creative brief
-> concept/reference
-> provider/DCC production
-> processing/rig/animation where required
-> runtime integration
-> target-device proof
-> provenance/rollback
-> independent verification
```

The pilot belongs at the appropriate end of the feature's dependency sequence—not inside machine onboarding and not before core topology/gameplay blockers are fixed.

## 11. Universal versus project-specific boundaries

Universal core owns:

- persistent onboarding/caching;
- provider adapter contracts;
- image/provider role boundaries;
- DCC/engine/runtime preflight;
- animation bakeoff rules;
- asset/provenance/rollback;
- ticket/verification workflow.

Project overlays own:

- exact providers enabled;
- account/region/path/budget values;
- art/canon/mechanics;
- exact animation categories and comparison lanes;
- ticket ordering;
- target device budgets;
- release authority.
