# Universal AI Game Production Playbook

Use this package for any game genre or platform. It provides a reusable multi-LLM production core, project profiles, genre/platform/engine/provider modules, asset pipelines, testing, networking, releases and independent verification.

## Start

Read `START_HERE.md`.

`PLAYBOOK_V2_CORRECTIONS.md` supersedes conflicting or incomplete parts of the original `PLAYBOOK.md` v1.

The harness separates:

1. **one-time workstation/toolchain onboarding**;
2. **fast per-chat session startup**;
3. **live pre-spend provider refresh**.

New chats do not reinstall and fully revalidate every tool. They load cached receipts, fetch current ticket state and verify only the lanes selected by the project/ticket.

## Core files

- `PLAYBOOK.md` — original genre-agnostic playbook
- `PLAYBOOK_V2_CORRECTIONS.md` — mandatory corrections and supersession rules
- `START_HERE.md` — per-session entry point
- `ONBOARDING.md` — one-time/invalidated workstation bootstrap
- `SESSION_FAST_START.md` — short process for each new chat
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` — reusable provider/DCC/engine/device checks
- `PROCEDURAL_LEVEL_TOPOLOGY_POLICY.md` — graph-first constructive spatial generation
- `BROWSER_RUNTIME_PORTABILITY_POLICY.md` — stable browser runtime plus optional native-port preservation
- `IMAGE_REFERENCE_BAKEOFF_POLICY.md` — multi-candidate image comparison and full-asset framing
- `HOUDINI_LICENSE_MODE_POLICY.md` — Apprentice POC, Indie and commercial license-mode routing
- `WORKFLOW.md` — dependency-ordered multi-LLM production lifecycle
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` — fair dual-candidate animation comparison
- `config/onboarding-cache-policy.json` — receipt age/invalidation policy
- `config/procedural-level-topology-policy.json` — machine-readable topology invariants
- `config/animation-bakeoff-policy.json` — custom-animation experiment policy
- `templates/procedural-level-topology-record.template.json` — generated-layout evidence record
- `templates/animation-bakeoff-record.template.json` — animation experiment record
- `providers/tripo/` — reusable Tripo provider module
- `scripts/providers/tripo/` — no-charge connection/bootstrap helpers
- `source-bundle/` — original complete extracted harness source

## Universal procedural-level policy

Generated levels, buildings, roads, tracks, platforms and zones use:

```text
logical graph
-> constructive edge-by-edge embedding
-> canonical shared boundaries/openings
-> actual-geometry plan/section validation
-> runtime geometry/collision/navigation
-> dressing/FX
```

Do not place independently sealed modules and connect them after the fact. Resolve each edge before accepting the destination, retry/backtrack invalid placements, emit shared boundaries once and require real-controller proof. Debug warp/pathfinding alone is not physical connectivity evidence.

## Universal image policy

Projects define candidate image lanes, but important primary 3D references should compare multiple candidates before downstream 3D work.

Every primary 3D-source image must show the **entire asset in frame**. This applies to characters, creatures, weapons, items, armor, furniture, architecture, doors, fixtures, vehicles and environment set pieces. Cropped close-ups are supplemental only.

## Universal provider policy

- Distinguish Studio/browser, API/SDK, official CLI and MCP lanes.
- Do not assume credentials, quotas or credits are shared.
- A blocked API/CLI lane does not automatically block an allowed authenticated Studio/browser lane.
- Provider connection is proven once with a live sanitized check and cached receipt.
- Paid operations always require current balance/pricing/allowance and exact owner approval.
- Provider outputs enter controlled storage immediately and require provenance, hashes, runtime QA and rollback.
- CLI/MCP integrations are optional and must be exact first-party tools, not guessed packages.

## Universal Houdini policy

A genuine non-commercial POC may use the full FX features exposed by Houdini Apprentice. The free license is not itself a reason to reduce particles, water, Pyro, Vellum, KineFX, lighting, materials, shaders, terrain or volumetrics to crude placeholders.

Apprentice restrictions still apply. Every project declares its usage mode and smoke-tests the exact runtime/export representation.

## Universal custom-animation policy

When enabled, custom animations not adequately covered by an accepted provider preset receive two candidates—by default Houdini KineFX and Blender—under identical inputs, automated gates, blind AI review and blinded owner A/B selection. Both candidates and metrics are retained for evidence-based routing.

A direct provider preset that passes all acceptance gates does not require duplicate DCC production.

## Universal browser/runtime portability policy

The universal core does not prescribe a default lateral migration from one browser engine to another after a POC.

Projects should improve their accepted browser runtime unless their overlay defines a concrete unsolved requirement, named candidates, comparison slice, metrics, budget and owner approval.

If browser delivery later cannot satisfy approved requirements, evaluate a native/installed engine as a separate phase. Preserve DCC/provider sources, neutral assets/caches/manifests and target-specific derivatives so the future target reuses the expensive work instead of starting over.

## Project boundary

This folder remains project-agnostic. Project-specific lore, mechanics, branches, paths, budgets, provider account values, runtime choice, ticket ordering, usage-mode classification and owner decisions belong in each project's profile/overlay.
