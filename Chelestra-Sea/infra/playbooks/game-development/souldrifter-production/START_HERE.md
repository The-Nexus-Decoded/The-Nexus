# SoulDrifter Multi-LLM Master Harness — START HERE

**Context version:** `2026-08-25-master-v8`

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

The full bootstrap verifies Tripo Studio/API/CLI lanes, Houdini, Blender, Three.js/GLB tools, real-GPU validation, media tools, controlled staging, and provider receipts.

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

Even with a valid cached receipt, identify the active Tripo lane, refresh its live balance/pricing/allowance, and obtain exact owner approval immediately before the charged operation.

## Mandatory startup order

0. Read `SESSION_FAST_START.md` and `config/onboarding-cache-policy.json`.
1. Auto-discover/reuse the existing ticket worktree through `AUTO_DISCOVER_WORKSPACE.md`.
2. Load the persistent production toolchain receipt.
3. If the receipt is missing/stale/invalid, run the full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` bootstrap. Otherwise use the cached PASS.
4. For any primary 3D-source image task, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
5. For any Houdini task, read `HOUDINI_APPRENTICE_POC_POLICY.md`.
6. For any animation/rigging ticket, read `ANIMATION_PROVIDER_ROUTING.md`; for required custom motions also read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md` and its policy/template.
7. Read the game repository's binding `AGENTS.md`.
8. Read this file and `PROJECT_CANON_INDEX.md`.
9. Read `WORKFLOW.md`.
10. Read the assigned GitHub issue and **every current comment**.
11. Read its related PR(s), every PR comment/review, and the live head state.
12. Read `.agent-state/<issue>/ticket-contract.json`, `completion-ledger.json`, `evidence-manifest.json`, and `handoff.json` when present.
13. Read the ticket kickoff under `kickoffs/` when one exists.
14. Read only the specialist source-bundle/game-repository runbooks required by the ticket.
15. Inspect the actual worktree/branch and recent commits.
16. Return a Session Receipt and Context Receipt before editing.

## Required receipts

### Session Receipt — every chat

```text
SOULDRIFTER SESSION RECEIPT
contextVersion: 2026-08-25-master-v8
platform: <M3|Claude Code|ChatGPT/Codex|other>
ticket: <issue>
branch: <branch>
worktree: <path>
localHead: <sha>
liveHead: <sha>
toolchainReceiptId: <id>
toolchainReceiptGeneratedAt: <timestamp>
toolchainReceiptStatus: CACHED_PASS | REFRESH_REQUIRED | BLOCKED
projectUsageMode: NONCOMMERCIAL_POC | COMMERCIAL | UNKNOWN
requiredLanes:
  imageReferenceBakeoff: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  tripoStudio: CACHED_PASS | LIVE_REFRESH_PASS | NOT_REQUIRED
  tripoApiSdk: CACHED_PASS | UNFUNDED | UNAVAILABLE | NOT_REQUIRED
  tripoOfficialCli: CACHED_PASS | UNFUNDED | NOT_EXPOSED | NOT_REQUIRED
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
contextVersion: 2026-08-25-master-v8
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
imagePolicyLoaded: yes/no/not-required
houdiniPocPolicyLoaded: yes/no/not-required
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

## Image/reference policy

For important 3D-source references, follow `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.

When the authenticated Tripo Studio image allowance is active, the default comparison is:

1. Tripo Studio Nano Banana;
2. Tripo Studio Nano Banana Pro;
3. ChatGPT/OpenAI image candidate A;
4. ChatGPT/OpenAI image candidate B.

Verify the exact Studio model labels and current allowance in the live Studio UI.

Every primary reference must show the **entire asset in frame**—not only characters. This applies to creatures, weapons, armor, props, doors, furniture, vehicles, fixtures, architectural modules and environment set pieces. Cropped detail images are supplemental only.

## Tripo 3D policy

Tripo may be operated through separate Studio, API/SDK and official CLI lanes. Do not assume that their credentials, quotas or credits are shared.

Select the active lane from live evidence:

- `API_SDK_PRIMARY` when the API is authenticated and funded;
- `OFFICIAL_CLI_PRIMARY` when a first-party CLI is separately authenticated/funded;
- `STUDIO_BROWSER_PRIMARY` when API/CLI are unavailable or unfunded but Studio is active.

A blocked API/CLI lane must not block Studio browser production.

Use Tripo for approved 3D generation, upload/download, segmentation, mesh completion/decimation, rig checking, rigging, preset animation retargeting, and any separately verified first-party custom-motion feature.

Do not install the old unverified generic `tripo-cli` package.

## Houdini Apprentice POC policy

SoulDrifter is currently owner-declared as a free, non-commercial POC/playground. Read `HOUDINI_APPRENTICE_POC_POLICY.md`.

When that classification remains accurate, do **not** artificially restrict the prototype to basic effects. Use the full FX tools exposed by Houdini Apprentice—including particles, Pyro, FLIP/procedural water, Vellum, KineFX, RBD, procedural terrain, lighting, materials, shaders, fog and volumetrics—when they improve the POC.

Apprentice restrictions still apply: non-commercial use, non-commercial file formats, no mixing with Indie/commercial pipelines, no Apprentice HDA through Houdini Engine, render limits/wordmarks, no third-party renderers and exact exporter restrictions.

A free public app is not automatically non-commercial if it promotes a business, supports paid work, solicits investment or feeds a commercial production pipeline. If usage changes or is uncertain, pause and verify the license.

Three.js remains runtime. Smoke-test every required export/bake representation. If Apprentice blocks the final exporter, preserve the full-fidelity POC source and defer the clean production export/rebuild to Indie rather than lowering the effect before proving the restriction.

## Custom animation

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
- Four-candidate full-asset image bakeoff is the default important 3D-reference lane.
- Tripo is the primary 3D generation/processing/rigging/preset-animation provider through whichever authenticated/funded lane is active.
- Geometry-changing operations occur before final rigging.
- Playable characters remain modular.
- Houdini Apprentice may use its full available FX feature set for the current genuine non-commercial POC; Indie becomes necessary when limited-commercial/Engine/export/rendering requirements or project purpose demand it.
- Three.js remains runtime; real-GPU validation is mandatory.
- Current phase remains First Breach / Heartvale / Levels 1–9.

## Conflict rule

Latest explicit owner direction, binding game `AGENTS.md`, current runtime/code, and current GitHub ticket/PR state outrank older harness text.

If older playbook commands conflict with current official provider/license documentation, current official documentation wins and the conflict is recorded.

When uncertain, mark `OWNER_DECISION_REQUIRED`; do not silently choose.