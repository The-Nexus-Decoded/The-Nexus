# Universal AI Game Production Playbook

Use this package for any game genre or platform. It provides a reusable multi-LLM production core, project profiles, genre/platform/engine/provider modules, asset pipelines, testing, networking, releases, and independent verification.

## Start

Read `START_HERE.md`.

`PLAYBOOK_V2_CORRECTIONS.md` supersedes conflicting or incomplete parts of the original `PLAYBOOK.md` v1.

The harness now separates:

1. **one-time workstation/toolchain onboarding**;
2. **fast per-chat session startup**;
3. **live pre-spend provider refresh**.

New chats do not reinstall and fully revalidate every tool. They load the cached receipt, fetch current ticket state, and verify only the lanes selected by the project/ticket.

## Core files

- `PLAYBOOK.md` — original genre-agnostic playbook
- `PLAYBOOK_V2_CORRECTIONS.md` — mandatory corrections and supersession rules
- `START_HERE.md` — per-session entry point
- `ONBOARDING.md` — one-time/invalidated workstation bootstrap
- `SESSION_FAST_START.md` — short process for each new chat
- `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` — reusable provider/DCC/engine/device checks
- `WORKFLOW.md` — dependency-ordered multi-LLM production lifecycle
- `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` — fair dual-candidate animation comparison
- `config/onboarding-cache-policy.json` — receipt age/invalidation policy
- `config/animation-bakeoff-policy.json` — custom-animation experiment policy
- `templates/animation-bakeoff-record.template.json` — project experiment record
- `providers/tripo/` — reusable official Tripo v3 SDK/API module
- `scripts/providers/tripo/` — no-charge connection/bootstrap helpers
- `source-bundle/` — original complete extracted harness source

## Universal provider policy

- Use the active LLM image generator for concept/reference images when available.
- Use selected 3D providers for 3D operations, not unnecessary 2D-image spending.
- Provider connection is proven once with a live sanitized authenticated check and cached receipt.
- Paid operations always require current balance/pricing and exact owner approval.
- Provider outputs enter controlled storage immediately and require provenance, hashes, runtime QA and rollback.
- CLI/MCP integrations are optional and must be exact first-party tools, not guessed packages.

## Universal custom-animation policy

When a project enables it, custom animations not adequately covered by an accepted provider preset receive two candidates—by default Houdini KineFX and Blender—under identical inputs, automated gates, blind AI review, and blinded owner A/B selection. Both candidates and metrics are retained so routing decisions become evidence-based.

A direct provider preset that passes all acceptance gates does not require duplicate DCC production.

## Project boundary

This folder remains project-agnostic. Project-specific lore, mechanics, branches, paths, budgets, provider account values, ticket ordering, and owner decisions belong in each project's profile/overlay.