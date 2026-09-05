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

- supported Studio/browser, API/SDK, official CLI and MCP lanes;
- which credentials, credits and quotas are separate;
- active-lane selection and fallback order;
- official SDK/API/package/repository;
- version and region/base URL;
- secret environment-variable name without exposing the value;
- live read-only authenticated call when available;
- capabilities needed by the project;
- controlled download/staging paths;
- task polling/retry behavior;
- price/balance/allowance/spend gate;
- provenance, hashes and rollback;
- optional CLI/MCP discovery from exact first-party documentation.

A blocked API/CLI lane must not block an authenticated Studio/browser lane when the project overlay permits it.

The connection result is stored in a sanitized persistent receipt and referenced by future sessions.

## 3. Primary 3D-source images use a multi-candidate full-asset bakeoff

Read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.

The project profile selects the actual candidate models/providers. A recommended important-asset comparison uses:

- two Studio/provider image models;
- two host-LLM image candidates.

Before generation, verify each active account/session, model label, allowance/quota and whether the operation is free or charged.

Every primary image intended for 3D generation must show the **complete asset in frame**. This applies to characters, creatures, weapons, items, armor, furniture, architecture, doors, fixtures, vehicles and environment set pieces.

No cropped critical geometry, supports, attachments or extremities. Close-ups are supplemental `DETAIL_REFERENCE_ONLY` and cannot be the sole primary source.

Compare candidates, preserve prompts/settings/hashes and record the owner-selected source before downstream paid 3D work.

## 4. Tripo is a reusable 3D provider module, not universal hard-coding

The universal harness includes a selectable Tripo provider module under `providers/tripo/`.

Projects must distinguish:

- authenticated Studio browser lane;
- API/SDK lane;
- separately documented official CLI lane;
- optional MCP lane.

Do not assume their credentials or balances are shared.

The official JavaScript/TypeScript SDK lane currently uses:

- package: `@vastai/tripo-sdk`;
- Node.js 18+;
- global API base: `https://openapi.tripo3d.ai/v3`;
- secret name: `TRIPO_API_KEY`;
- read-only proof: authenticated `getBalance()`;
- no charged task during bootstrap.

Use Tripo for approved 3D generation/import, upload/download, segmentation, mesh completion/decimation, rig check, rigging and preset animation retargeting.

Do not install similarly named CLI packages by guesswork. An official CLI is optional and must be discovered from current first-party documentation or the authenticated provider console.

The official Tripo MCP is optional and does not replace the core provider receipt unless the project explicitly makes it authoritative and proves equivalent capabilities.

## 5. Geometry-changing stages precede rigging

Universal 3D order:

```text
approved full-asset concept/reference
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

## 7. Houdini Apprentice can be the full-FX non-commercial POC lane

Read `HOUDINI_LICENSE_MODE_POLICY.md`.

Houdini Apprentice exposes virtually the Houdini FX feature set for personal/non-commercial work. When a project's declared and reviewed usage mode is genuinely `NONCOMMERCIAL_POC`, the pipeline should use the full features exposed by the installed build—including particles, Pyro, FLIP/procedural water, Vellum, RBD, KineFX, terrain, lighting, materials, shaders, fog and volumetrics—rather than lowering the creative target solely because the license is free.

The restrictions remain binding:

- non-commercial use and file formats;
- no mixing into Indie/commercial Houdini pipelines;
- no Apprentice-created HDA through Houdini Engine;
- render-resolution/wordmark restrictions;
- no third-party renderers;
- exact exporter/output limitations.

A free public app is not automatically non-commercial if it promotes a business, supports paid client work, solicits investment, monetizes related services or feeds a commercial production pipeline. Record the project's usage-mode attestation and pause if uncertain.

Smoke-test the exact runtime representation. If the effect works but the final exporter is restricted, preserve the full-fidelity POC source and schedule a clean Indie/commercial rebuild/export rather than prematurely replacing the effect with a crude placeholder.

Houdini Indie is the limited-commercial production lane when the project qualifies. A license upgrade invalidates the cached Houdini receipt and requires clean licensed scene/asset formats, contamination checks and fresh export/runtime validation.

Indie primarily changes production/commercial/file-format/render/Engine capabilities; it is not primarily a new particle/FX-feature tier.

## 8. Toolchain preflight is lane-selective

A documentation ticket should not wait for Blender or a 3D provider.

A 3D asset ticket should require its provider, DCC, runtime and target-device lanes.

A custom-animation ticket should require rig source, both configured candidate lanes, comparison/evidence tooling and runtime review.

Unused lanes are `NOT_REQUIRED`; missing required lanes are `BLOCKED`.

## 9. Paid provider work always has a live gate

A cached authenticated receipt proves connectivity, not current price or blanket authorization.

Immediately before every charged task:

1. identify the active provider lane;
2. live balance/allowance read for that lane;
3. current official pricing;
4. exact operation/model/version;
5. expected and maximum cost;
6. retry-cost disclosure;
7. explicit owner approval;
8. task submission;
9. actual cost/task ID/download hash/remaining balance record.

## 10. Representative vertical-slice pipeline proof

Before content scaling, every project must prove at least one complete representative production path:

```text
creative brief
-> full-asset image/reference bakeoff
-> selected provider/DCC production
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
- provider adapter/lane contracts;
- full-asset image bakeoff and framing rules;
- DCC license-mode/runtime preflight;
- animation bakeoff rules;
- asset/provenance/rollback;
- ticket/verification workflow.

Project overlays own:

- exact providers/models enabled;
- account/region/path/budget/quota values;
- project usage mode and license attestation;
- art/canon/mechanics;
- exact animation categories and comparison lanes;
- ticket ordering;
- target device budgets;
- release authority.

## 12. Flat layouts are architectural topology contracts

Every indoor level, outdoor zone, building, dungeon, route network and
multi-elevation play space begins with a **complete architectural flat
layout**. This is a measured construction document for the whole playable
area, not a concept image, mood board or collection of independent room
rectangles.

The pre-build layout package must show, in one shared coordinate frame:

- the complete footprint of every fixed area and every possible generated
  branch or pooled variant;
- dimensioned room, corridor, road, path and exterior boundaries;
- canonical wall centerlines/thicknesses and a stable ID for every boundary;
- which adjacent spaces own each side of a shared boundary;
- every opening, doorway, gate and connector, including clear width, frame,
  door swing or gate travel, and reserved traversal clearance;
- stairs, ramps, landings, slopes, floor elevations, rise/run direction and
  section/elevation callouts wherever plan view alone is ambiguous;
- continuous walkable surfaces, collision boundaries, navigation routes and
  source/destination aperture alignment;
- scale, orientation, datum, grid and any engine/world-frame conversion.

Geometry generation uses a canonical shared-boundary graph or equivalent
unioned footprint. When two spaces are adjacent, their common edge is
resolved once:

- `WALL` emits one shared wall, never one closed-shell wall per space;
- `OPEN` emits no wall from either side and preserves continuous floor,
  ceiling, collision and navigation;
- `DOOR`, `GATE` or `CONNECTOR` cuts one dimensioned aperture in that shared
  boundary and assigns one visual/collision/state owner;
- an elevation change emits the specified stair, ramp or landing transition
  rather than overlapping floors or an unexplained step.

Do not build levels by generating sealed room boxes and placing them beside
sealed corridor boxes. Do not rely on 3D dressing, fog, darkness or a door
asset to hide unresolved topology.

### Mandatory topology gate before 3D construction

The flat layout and its machine-readable adjacency/boundary representation
must be reviewed before registry derivation, shell generation, dressing,
lighting, VFX or audio begins. Reject the layout if any check fails:

1. the whole playable layout and all possible branches are not visible and
   traceable end to end;
2. an adjacency exists geometrically but is absent or contradictory in the
   connection graph;
3. coincident, parallel or near-duplicate walls occupy one shared boundary;
4. a wall crosses a declared opening, corridor centerline, stair, landing or
   other walkable surface;
5. a connection has a floor, ceiling, wall, collision or elevation gap;
6. a door/gate has more than one geometry or collision owner;
7. any required route is disconnected at the design, collision or navigation
   layer.

Acceptance evidence includes the complete plan at readable scale, enlarged
connection details, section/elevation views for vertical transitions,
automated topology checks, and real-input runtime traversal through every
connector after implementation. A room-by-room screenshot set cannot replace
the whole-layout topology proof.
