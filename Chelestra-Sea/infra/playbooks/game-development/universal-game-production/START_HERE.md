# START HERE — Universal AI Game Production Harness

**Context version:** `2026-08-25-universal-game-v5`

## Core principle

**Chat memory is not project state. The repository is project state.**

The universal core supports any game genre/platform through project profiles, modules, provider adapters and project overlays.

`PLAYBOOK_V2_CORRECTIONS.md` supersedes conflicting or incomplete portions of the original `PLAYBOOK.md` v1.

## Onboarding frequency

### Full machine/toolchain bootstrap

Run once per workstation/template environment, then only when a cached receipt is missing, expired, invalidated or a major tool/license/provider/secret changes.

### Every new chat

Use `SESSION_FAST_START.md` to discover/reuse the worktree, load cached receipts, validate required lanes, fetch live ticket/PR state, load project/ticket context and return Session + Context Receipts.

Do not reinstall providers, DCCs, engines or repeat full smoke suites in every chat.

### Before paid provider work

Refresh live balance/pricing/allowance for the active lane and obtain exact owner approval immediately before the charged operation.

## Startup order

1. Read `SESSION_FAST_START.md` and `config/onboarding-cache-policy.json`.
2. Read binding repository agent instructions.
3. Discover/reuse the assigned branch/worktree.
4. Load cached production-toolchain receipts.
5. If invalid, run full `ONBOARDING.md` + `PRODUCTION_TOOLCHAIN_PREFLIGHT.md`; otherwise use cached PASS.
6. Read this file, `PLAYBOOK.md` and `PLAYBOOK_V2_CORRECTIONS.md`.
7. Read the game's `project-profile.json` and project overlay/canon index.
8. Read `WORKFLOW.md`.
9. Load selected genre/platform/engine/provider modules only.
10. For procedural/generated levels, read:
    - `PROCEDURAL_LEVEL_TOPOLOGY_POLICY.md`
    - `config/procedural-level-topology-policy.json`
    - `templates/procedural-level-topology-record.template.json`
11. For primary 3D-source images, read `IMAGE_REFERENCE_BAKEOFF_POLICY.md`.
12. For Houdini, read `HOUDINI_LICENSE_MODE_POLICY.md`.
13. For Tripo, load `providers/tripo/README.md` and project-specific config derived from its template.
14. For custom animation, read `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`, its policy and record template when enabled.
15. For browser/native runtime decisions, read `BROWSER_RUNTIME_PORTABILITY_POLICY.md`.
16. Read assigned ticket and all comments/PR reviews.
17. Load `.agent-state/<ticket>/`.
18. Inspect actual branch/worktree and recent commits.
19. Return Session + Context Receipts before editing.

## Session Receipt

```text
GAME PRODUCTION SESSION RECEIPT
contextVersion: 2026-08-25-universal-game-v5
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
contextVersion: 2026-08-25-universal-game-v5
platform: <M3|Claude Code|ChatGPT/Codex|other>
role: <orchestrator|auditor|worker|verifier>
projectId: <id>
ticket: <number or GLOBAL-AUDIT>
repository: <identity>
branch: <branch>
worktree: <path>
projectProfileLoaded: yes/no
projectOverlayLoaded: yes/no
sessionReceipt: PASS/BLOCKED
proceduralTopologyPolicyLoaded: yes/no/not-required
imagePolicyLoaded: yes/no/not-required
houdiniLicensePolicyLoaded: yes/no/not-required
animationBakeoffPolicyLoaded: yes/no/not-required
runtimePortabilityPolicyLoaded: yes/no/not-required
selectedModules:
  - <module>
latestTicketDirectionChecked: yes/no
blockingConflicts: <none or list>
plannedScope: <concise scope>
```

No valid Session Receipt + Context Receipt means no implementation.

## Procedural level topology policy

For generated rooms, buildings, roads, platforms, tracks or zones:

```text
logical graph
-> constructive edge-by-edge spatial embedding
-> canonical shared boundaries/openings
-> actual-geometry plan/section validation
-> runtime geometry/collision/navigation
-> dressing/FX
```

Do not place independently sealed modules and connect them after the fact. Resolve each edge before accepting the destination module, retry/backtrack invalid placements, emit shared boundaries once, and require real-controller proof. Debug warp/pathfinding alone is not connectivity evidence.

## Image/reference policy

Projects may configure different candidate image models/providers, but every primary 3D-source image must show the **entire asset in frame**. Cropped close-ups are supplemental only.

## Provider policy

- Separate Studio/browser, API/SDK, official CLI and MCP lanes.
- Do not assume credentials, credits or quotas are shared.
- Use the best active/funded lane selected by the project overlay.
- A blocked API/CLI lane must not block an allowed authenticated Studio/browser lane.
- Cache live sanitized connection proof.
- Refresh pricing/balance and approval before paid work.
- Finish geometry-changing operations before final rigging.
- Provider success is not asset acceptance.

## Houdini license-mode policy

A genuine non-commercial POC may use the full FX features exposed by Houdini Apprentice; the free license is not itself a reason to reduce water, particles, Pyro, Vellum, KineFX, lighting, materials, shaders, terrain or volumetrics to crude placeholders.

Apprentice restrictions still apply. Smoke-test the exact runtime/export representation and preserve high-fidelity source for a clean licensed rebuild/export if necessary.

## Custom-animation comparison policy

When enabled:

- direct accepted provider presets may ship without duplicate DCC production;
- custom motions not adequately covered by provider presets produce two candidates—by default Houdini KineFX and Blender;
- both use identical locked inputs;
- independent AI review and owner A/B selection are blinded;
- both candidates and metrics are retained for evidence-based routing.

## Browser runtime and portability policy

The universal core does **not** prescribe a lateral browser-engine migration after a POC.

Projects should improve their accepted browser runtime unless the overlay defines a concrete unsolved requirement, named candidates, comparison slice, metrics, budget and owner approval.

There is no default named browser-engine comparison candidate in the universal core.

If browser delivery later cannot satisfy approved product requirements, evaluate a native/installed engine as a separate phase. Preserve DCC/provider sources, neutral assets/caches/manifests and target-specific derivatives so the future target reuses the expensive work rather than starting from zero.

Portability means controlled re-integration, not zero engine-specific work.

## Role boundary

- **Orchestrator:** audits, routes and cannot self-verify production work.
- **Worker:** implements one ticket/worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- **Verifier:** independently re-derives requirements and alone may mark them `VERIFIED`.

## Generic-core boundary

Do not put project-specific lore, mechanics, asset IDs, provider account values, branches, ticket paths or runtime decisions into the universal core. Put them in the project profile/overlay.
