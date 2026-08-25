# START HERE — Universal AI Game Production Harness

**Context version:** `2026-08-25-universal-game-v4`

## Core principle

**Chat memory is not project state. The repository is project state.**

The universal core supports any game genre/platform through project profiles, modules, provider adapters, and project overlays.

`PLAYBOOK_V2_CORRECTIONS.md` supersedes conflicting or incomplete portions of the original `PLAYBOOK.md` v1.

## Onboarding frequency

### Full machine/toolchain bootstrap

Run once per workstation/template environment, then only when a cached receipt is missing, expired, invalidated, or a major tool/license/provider/secret changes.

### Every new chat

Use `SESSION_FAST_START.md` to:

- discover/reuse the assigned worktree;
- load the cached toolchain receipt;
- validate receipt schema/age and required tool roots;
- fetch live ticket/PR/comments/head;
- load project profile, overlay and ticket state;
- return a Session Receipt and Context Receipt.

Do not reinstall providers, DCCs, engine tools, or repeat full smoke suites in every chat.

### Before any paid provider operation

Refresh live balance/pricing/allowance for the active provider lane and obtain exact owner approval immediately before the charged operation, even when the cached connection receipt is valid.

## Startup order

1. Read `SESSION_FAST_START.md` and `config/onboarding-cache-policy.json`.
2. Read the repository's binding agent instructions (`AGENTS.md`, `CLAUDE.md`, or equivalent).
3. Discover/reuse the assigned branch/worktree.
4. Load the cached production-toolchain receipt.
5. If invalid, run full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`; otherwise use the cached PASS.
6. Read this file, `PLAYBOOK.md`, and `PLAYBOOK_V2_CORRECTIONS.md`.
7. Read the game's `project-profile.json` and project overlay/canon index.
8. Read `WORKFLOW.md`.
9. Load selected genre/platform/engine/provider modules only.
10. If creating primary 3D-source images, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
11. If using Houdini, read `HOUDINI_LICENSE_MODE_POLICY.md`.
12. For Tripo projects, load `providers/tripo/README.md` and the project-specific provider config derived from `providers/tripo/tripo-provider.template.json`.
13. For custom animation, read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`, `config/animation-bakeoff-policy.json`, and the bakeoff record template when enabled by the project profile.
14. Read assigned issue/ticket and all current comments/PR reviews.
15. Load ticket state under `.agent-state/<ticket>/`.
16. Inspect actual branch/worktree and recent commits.
17. Return a Session Receipt and Context Receipt before editing.

## Session Receipt

```text
GAME PRODUCTION SESSION RECEIPT
contextVersion: 2026-08-25-universal-game-v4
platform: <M3|Claude Code|ChatGPT/Codex|other>
projectId: <id>
ticket: <number or GLOBAL-AUDIT>
repository: <identity>
branch: <branch>
worktree: <path>
localHead: <sha>
liveHead: <sha>
toolchainReceiptId: <id>
toolchainReceiptStatus: CACHED_PASS | REFRESH_REQUIRED | BLOCKED
projectUsageMode: NONCOMMERCIAL_POC | EDUCATIONAL | LIMITED_COMMERCIAL_INDIE | FULL_COMMERCIAL | UNKNOWN
selectedModules:
  - <genre/platform/engine/provider module>
providerSpendPlanned: yes/no
fullBootstrapRequired: yes/no
blockingIssues: []
```

## Context Receipt

```text
GAME PRODUCTION CONTEXT RECEIPT
contextVersion: 2026-08-25-universal-game-v4
platform: <M3|Claude Code|ChatGPT/Codex|other>
role: <orchestrator|auditor|worker|verifier>
projectId: <id>
ticket: <number or GLOBAL-AUDIT>
repository: <owner/repo or local identity>
branch: <branch>
worktree: <absolute path>
projectProfileLoaded: yes/no
projectOverlayLoaded: yes/no
sessionReceipt: PASS/BLOCKED
imagePolicyLoaded: yes/no/not-required
houdiniLicensePolicyLoaded: yes/no/not-required
selectedModules:
  - <module>
latestTicketDirectionChecked: yes/no
blockingConflicts: <none or list>
plannedScope: <concise scope>
```

No valid Session Receipt + Context Receipt means no implementation.

## Reusable image/reference policy

Follow `IMAGE_REFERENCE_BAKEOFF_POLICY.md` for primary 3D-source images.

Projects may configure different candidate models/providers, but every primary source must show the **entire asset in frame**. This applies to characters, creatures, items, architecture, fixtures, vehicles and environment set pieces. Cropped close-ups are supplemental only.

## Reusable provider policy

- Separate Studio/browser, API/SDK, official CLI and MCP lanes.
- Do not assume their credentials, credits or quotas are shared.
- Use the best active/funded lane selected by the project overlay.
- A blocked API/CLI lane must not block an allowed authenticated Studio/browser lane.
- Provider modules must prove a live sanitized authenticated connection once and cache the receipt.
- Paid tasks always require current price/balance/allowance refresh and exact approval.
- Geometry-changing operations occur before final rigging.
- Provider success is not asset acceptance.

## Houdini license-mode policy

Follow `HOUDINI_LICENSE_MODE_POLICY.md`.

A genuine non-commercial POC may use the full FX features exposed by Houdini Apprentice; the free license is not itself a reason to reduce water, particles, Pyro, Vellum, KineFX, lighting, materials, shaders, terrain or volumetrics to crude placeholders.

Apprentice license/output restrictions still apply. A free public app is not automatically non-commercial when tied to business promotion, client work, investment solicitation, monetization or a commercial production pipeline.

Projects must smoke-test the exact runtime/export representation. If final export is restricted, preserve the high-fidelity POC source and schedule a clean licensed rebuild/export rather than silently lowering the creative target.

## Custom-animation comparison policy

When enabled by the project profile:

- direct accepted provider presets may ship without duplicate DCC production;
- custom motions not adequately covered by provider presets produce both a Houdini KineFX and Blender candidate by default;
- both use identical locked inputs;
- an independent AI review is blinded;
- the owner makes the blinded A/B decision;
- both results and metrics are retained until evidence supports category-specific or global routing changes.

Projects may replace Houdini/Blender with other named lanes through their overlay, but the fair dual-candidate/blind-review/data-collection contract remains reusable.

## Role boundary

- **Orchestrator:** audits, routes, coordinates, and owns the execution board.
- **Worker:** implements one ticket in one worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- **Verifier:** independently re-derives requirements and alone may mark them `VERIFIED`.

## Generic-core boundary

Do not write project-specific lore, class names, proprietary mechanics, asset IDs, provider account values, branches or ticket paths into the universal core. Put them in the project overlay and project-specific provider config.