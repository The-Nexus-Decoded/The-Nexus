# SoulDrifter Multi-LLM Master Harness — START HERE

**Context version:** `2026-08-24-master-v7`

This is the mandatory entry point for every SoulDrifter production session:

- MiniMax M3 / Code Agent Team
- Claude / Claude Code
- ChatGPT / Codex
- future LLM workers

## Core principle

**Chat memory is not project state. The repository is project state.**

Every session reconstructs ticket context from repository state, but it does **not** reinstall and fully revalidate the workstation toolchain on every new chat.

## Bootstrap frequency

### Full machine/toolchain onboarding

Run once per workstation, then again only when the cached receipt is missing, expired, invalidated, or a major tool/license/secret changes.

The full bootstrap installs/verifies Tripo SDK/API access, Houdini, Blender, Three.js/GLB tools, real-GPU validation, media tools, controlled staging, and provider receipts.

### New-chat fast start

Every new chat performs the short process in `SESSION_FAST_START.md`:

- find/reuse the assigned worktree;
- load the cached toolchain receipt;
- verify its context/schema/age and required secret names without exposing values;
- fetch the live issue/PR/comments/head;
- load `.agent-state/<issue>/`;
- return a Session Receipt and Context Receipt.

Do not repeat package installation, full Houdini/Blender smoke suites, or full provider discovery unless an invalidation trigger fires.

### Before a paid provider operation

Even with a valid cached receipt, perform a live Tripo balance/pricing refresh and obtain exact owner approval immediately before the charged operation.

## Mandatory startup order

0. Read `SESSION_FAST_START.md` and `config/onboarding-cache-policy.json`.
1. Auto-discover/reuse the existing ticket worktree through `AUTO_DISCOVER_WORKSPACE.md`.
2. Load the persistent production toolchain receipt.
3. If the receipt is missing/stale/invalid, run the full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` bootstrap. Otherwise use the cached PASS.
4. For any animation/rigging ticket, read `ANIMATION_PROVIDER_ROUTING.md`; for required custom motions also read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` and its policy/template.
5. Read the game repository's binding `AGENTS.md`.
6. Read this file and `PROJECT_CANON_INDEX.md`.
7. Read `WORKFLOW.md`.
8. Read the assigned GitHub issue and **every current comment**.
9. Read its related PR(s), every PR comment/review, and the live head state.
10. Read `.agent-state/<issue>/ticket-contract.json`, `completion-ledger.json`, `evidence-manifest.json`, and `handoff.json` when present.
11. Read the ticket kickoff under `kickoffs/` when one exists.
12. Read only the specialist source-bundle/game-repository runbooks required by the ticket.
13. Inspect the actual worktree/branch and recent commits.
14. Return a Session Receipt and Context Receipt before editing.

## Required receipts

### Session Receipt — every chat

```text
SOULDRIFTER SESSION RECEIPT
contextVersion: 2026-08-24-master-v7
platform: <M3|Claude Code|ChatGPT/Codex|other>
ticket: <issue>
branch: <branch>
worktree: <path>
localHead: <sha>
liveHead: <sha>
toolchainReceiptId: <id>
toolchainReceiptGeneratedAt: <timestamp>
toolchainReceiptStatus: CACHED_PASS | REFRESH_REQUIRED | BLOCKED
requiredLanes:
  hostLlmImageGeneration: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  tripo3D: CACHED_PASS | LIVE_REFRESH_PASS | NOT_REQUIRED
  houdini: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  blender: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  threejs: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  realGpu: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
providerSpendPlannedThisSession: yes/no
fullBootstrapRequired: yes/no
blockingIssues: []
```

### Full onboarding/toolchain receipts — first time or invalidation only

The full receipts from `ONBOARDING.md` and `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` are stored locally under:

`H:\CodexData\souldrifter-toolchain\receipts\`

They must never contain secret values and must not be committed.

### Context Receipt — every chat

```text
CONTEXT RECEIPT
contextVersion: 2026-08-24-master-v7
model: <m3|claude|chatgpt-codex|other>
role: <orchestrator|requirement-compiler|worker|verifier|performance-verifier>
ticket: #<number or GLOBAL-AUDIT>
branch: <branch>
localHead: <sha>
liveHead: <sha>
worktree: <absolute path>
gameRoot: Arianus-Sky/projects/games/SoulDrifterWeb
sessionReceipt: PASS/BLOCKED
cachedToolchainReceipt: PASS/REFRESH_REQUIRED/BLOCKED
animationRoutingLoaded: yes/no/not-required
bakeoffPolicyLoaded: yes/no/not-required
requiredFilesRead:
  - AGENTS.md
  - START_HERE.md
  - SESSION_FAST_START.md
  - assigned ticket/PR
  - ...
ticketStateLoaded: <yes/no/new>
latestOwnerDirectionChecked: yes
blockingConflicts: <none or list>
plannedScope: <one concise paragraph>
```

No valid Session Receipt + Context Receipt means no implementation.

## Provider boundaries

### Concept/reference images

Use the active LLM's built-in image generator first. Do not spend Tripo credits on 2D concept or multiview image generation during normal production when ChatGPT/Codex/M3/Claude can generate the references.

### Tripo 3D

Use the official Tripo v3 SDK/API for approved 3D generation, upload/download, segmentation, mesh completion/decimation, rig checking, rigging, preset animation retargeting, and any separately verified first-party custom-motion feature.

The official JavaScript/TypeScript SDK is `@vastai/tripo-sdk`, with global v3 base URL `https://openapi.tripo3d.ai/v3`. Persistent configuration lives in `config/tripo-provider.json`; the read-only connection check lives in `scripts/tripo/tripo-readonly-check.mjs`; the one-time bootstrap writes its receipt beneath `H:\CodexData\souldrifter-toolchain\`.

An official CLI is optional and may be installed only after the authenticated Tripo console or current first-party documentation identifies the exact package/installer, publisher, version, and health/auth commands. Do not install the older unverified generic `tripo-cli` package.

### Custom animation

A direct Tripo preset that passes does not need duplicate DCC production.

Every required custom motion not adequately covered by Tripo—plus substantial constrained, interaction, class-specific, weapon-specific, boss, signature-death, or acting motion—produces both:

1. Houdini KineFX candidate;
2. Blender candidate.

The candidates use identical locked inputs, pass the same gates, receive blind AI comparison, then receive the owner's blinded A/B verdict. The winner enters runtime; both source packages and metrics remain in the bakeoff registry.

## One session / one responsibility

- **Orchestrator:** audits, validates cached onboarding/toolchain state, routes work, and does not self-verify implementation.
- **Worker:** owns one ticket in one worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- **Verifier:** independently re-derives requirements and alone may mark them `VERIFIED`.

## Current production direction

- Real-time combat is the default; turn-based is optional over the same simulation.
- Host-LLM image generation is the default concept/reference lane.
- Tripo is the primary 3D generation/processing/rigging/preset-animation lane after connection proof.
- Geometry-changing operations occur before final rigging.
- Playable characters remain modular.
- Houdini Apprentice is prototype/non-commercial; Houdini Indie becomes the production/export lane after the planned upgrade and clean revalidation.
- Three.js remains runtime; real-GPU validation is mandatory.
- Current phase remains First Breach / Heartvale / Levels 1–9.

## Conflict rule

Latest explicit owner direction, binding game `AGENTS.md`, current runtime/code, and current GitHub ticket/PR state outrank older harness text.

If older playbook commands conflict with current official provider documentation, current official documentation wins and the conflict is recorded.

When uncertain, mark `OWNER_DECISION_REQUIRED`; do not silently choose.