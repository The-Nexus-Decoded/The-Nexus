# Universal AI Game Production Playbook

Use this package for any game genre or platform. It provides a reusable multi-LLM production core, project profiles, genre/platform/engine/provider modules, asset pipelines, testing, networking, releases, and independent verification.

## Start

Read `START_HERE.md`.

The harness now separates:

1. **one-time workstation/toolchain onboarding**;
2. **fast per-chat session startup**;
3. **live pre-spend provider refresh**.

New chats do not reinstall and fully revalidate every tool. They load the cached receipt, fetch current ticket state, and verify only selected ticket lanes.

## Core files

- `PLAYBOOK.md` — canonical genre-agnostic playbook
- `START_HERE.md` — per-session entry point
- `ONBOARDING.md` — one-time/invalidated workstation bootstrap
- `SESSION_FAST_START.md` — short process for each new chat
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` — reusable provider/DCC/engine/device checks
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` — fair dual-candidate animation comparison
- `config/onboarding-cache-policy.json` — receipt age/invalidation policy
- `config/animation-bakeoff-policy.json` — custom-animation experiment policy
- `templates/animation-bakeoff-record.template.json` — project experiment record
- `providers/tripo-v3/` — reusable official Tripo v3 SDK/API module
- `source-bundle/` — original complete extracted harness source

## Universal provider policy

- Use the active LLM image generator for concept/reference images when available.
- Use selected 3D providers for 3D operations, not unnecessary 2D-image spending.
- Provider connection is proven once with a live sanitized authenticated check and cached receipt.
- Paid operations always require current balance/pricing and exact owner approval.
- Provider outputs enter controlled storage immediately and require provenance, hashes, runtime QA and rollback.

## Universal custom-animation policy

When a project enables it, animations not adequately covered by an accepted provider preset receive two candidates—by default Houdini KineFX and Blender—under identical inputs, automated gates, blind AI review, and blinded owner A/B selection. Both candidates and metrics are retained so routing decisions become evidence-based.

This folder remains project-agnostic. Project-specific lore, mechanics, branches, paths, budgets and owner decisions belong in each project's overlay.