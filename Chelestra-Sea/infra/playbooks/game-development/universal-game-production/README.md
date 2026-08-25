# Universal AI Game Production Playbook

Use this package for any game genre or platform. It provides a reusable multi-LLM production core, project profiles, provider/DCC/runtime modules, procedural-level rules, asset pipelines, testing, networking, releases and independent verification.

## Start

Read `START_HERE.md`.

`PLAYBOOK_V2_CORRECTIONS.md` supersedes conflicting or incomplete parts of the original `PLAYBOOK.md` v1.

The harness separates:

1. **one-time workstation/toolchain onboarding**;
2. **fast per-chat session startup**;
3. **live pre-spend provider refresh**.

New chats load cached receipts, fetch current ticket state and verify only the selected lanes.

## Core files

- `PLAYBOOK.md` — original genre-agnostic playbook
- `PLAYBOOK_V2_CORRECTIONS.md` — mandatory corrections and supersession rules
- `START_HERE.md` — per-session entry point
- `ONBOARDING.md` — one-time/invalidated workstation bootstrap
- `SESSION_FAST_START.md` — short process for each chat
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` — provider/DCC/engine/device checks
- `PROCEDURAL_LEVEL_TOPOLOGY_POLICY.md` — graph-first constructive spatial generation
- `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md` — ground, vertical, aquatic, biome, mega-zone, dynamic and transfer connection contracts
- `BROWSER_RUNTIME_PORTABILITY_POLICY.md` — stable runtime plus optional future-port preservation
- `IMAGE_REFERENCE_BAKEOFF_POLICY.md` — multi-candidate image comparison and full-asset framing
- `HOUDINI_LICENSE_MODE_POLICY.md` — Apprentice POC, Indie and commercial routing
- `WORKFLOW.md` — dependency-ordered multi-LLM lifecycle
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` — fair dual-candidate animation comparison
- `config/onboarding-cache-policy.json`
- `config/procedural-level-topology-policy.json`
- `config/spatial-connection-policy.json`
- `config/animation-bakeoff-policy.json`
- `templates/procedural-level-topology-record.template.json`
- `templates/spatial-connection-record.template.json`
- `templates/animation-bakeoff-record.template.json`
- `providers/tripo/` — reusable Tripo provider module
- `scripts/providers/tripo/` — no-charge connection/bootstrap helpers
- `source-bundle/` — original extracted harness source

## Universal procedural topology and traversal policy

Generated levels use:

```text
logical graph + explicit traversal contracts
-> constructive edge-by-edge embedding
-> canonical boundaries, surfaces and volumes
-> actual-geometry plan/section/volume/state validation
-> runtime geometry/collision/navigation/controller states
-> gameplay/dressing/FX
```

A spatial node may be a room, cavern, shaft, water volume, air pocket, biome pocket, labyrinth, mega-zone, moving platform region or transforming living-world state.

The traversal catalog covers:

- open, door/gate, corridor, crawlspace and destructible routes;
- stairs, climbing, lifts, drops, ropes and moving platforms;
- jumps, bridges and platform sequences;
- wading, swimming, underwater tunnels, air pockets, currents and boats;
- biome transitions, labyrinths, mega-zones and living topology;
- vehicles, streaming boundaries, true transfers and non-Euclidean links.

Do not place sealed modules and connect them after the fact. Resolve every edge before accepting the destination, retry/backtrack invalid placements and require real-controller proof. Debug warp/pathfinding alone is not connectivity evidence.

## Universal image policy

Projects define candidate image lanes, but important primary 3D references should compare multiple candidates before downstream 3D work.

Every primary 3D-source image shows the **entire asset in frame**. Cropped close-ups are supplemental only.

## Universal provider policy

- Distinguish Studio/browser, API/SDK, official CLI and MCP lanes.
- Do not assume credentials, quotas or credits are shared.
- A blocked API/CLI lane does not automatically block an allowed Studio/browser lane.
- Prove provider connection once with a sanitized live check and cached receipt.
- Paid operations require current balance/pricing/allowance and exact owner approval.
- Provider outputs require controlled storage, provenance, hashes, runtime QA and rollback.
- CLI/MCP tools must be exact first-party integrations.

## Universal Houdini policy

A genuine non-commercial POC may use the full FX features exposed by Houdini Apprentice. The free license is not itself a reason to reduce particles, water, Pyro, Vellum, KineFX, lighting, materials, shaders, terrain or volumetrics to crude placeholders.

Apprentice restrictions still apply. Every project declares its usage mode and smoke-tests the exact runtime/export representation.

## Universal custom-animation policy

When enabled, custom animations not adequately covered by an accepted provider preset receive two candidates—by default Houdini KineFX and Blender—under identical inputs, automated gates, blind AI review and blinded owner selection. Both candidates and metrics are retained.

## Universal runtime portability policy

The universal core does not prescribe a default lateral migration from one browser engine to another.

Projects improve their accepted runtime unless their overlay defines a concrete unsolved requirement, named candidates, comparison slice, metrics, budget and owner approval.

For a future native/installed engine, preserve DCC/provider sources, neutral assets/caches/manifests and target derivatives so the new target reuses expensive work instead of starting over.

## Project boundary

This folder remains project-agnostic. Project-specific lore, mechanics, branches, paths, budgets, provider account values, runtime choice, ticket ordering, usage mode and owner decisions belong in the project profile/overlay.