# SoulDrifter Multi-LLM Master Harness — START HERE

**Context version:** `2026-08-24-master-v6`

This is the mandatory entry point for every SoulDrifter production session:

- MiniMax M3 / Code Agent Team
- Claude / Claude Code
- ChatGPT / Codex
- future LLM workers

## Core principle

**Chat memory is not project state. The repository is project state.**

Every session reconstructs context from the same files before editing.

## Mandatory startup order

0. Read `ONBOARDING.md`.
1. Read `AUTO_DISCOVER_WORKSPACE.md` and automatically discover/reuse the existing ticket worktree.
2. Read `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` and prove every provider/tool/runtime lane required by the ticket. A named tool is not considered connected until it passes a live sanitized check.
3. For any animation/rigging ticket, read:
   - `ANIMATION_PROVIDER_ROUTING.md`
   - `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
   - `config/animation-bakeoff-policy.json`
4. Record whether each motion uses:
   - direct Tripo preset;
   - simple Tripo-preset-derived variant;
   - verified Tripo custom motion;
   - mandatory Houdini KineFX versus Blender bakeoff;
   - runtime procedural motion.
5. Read the game repository's binding `AGENTS.md`.
6. Read this file.
7. Read `PROJECT_CANON_INDEX.md`.
8. Read `WORKFLOW.md`.
9. Read the assigned GitHub issue and **every current comment**.
10. Read its related PR(s), every PR comment/review, and the live head state.
11. Read `.agent-state/<issue>/ticket-contract.json`, `completion-ledger.json`, `evidence-manifest.json`, and `handoff.json` when they exist.
12. Read the ticket kickoff under `kickoffs/` when one exists.
13. Read only the specialist source-bundle/game-repository runbooks required by the ticket, plus anything they reference.
14. Inspect the actual worktree/branch, recent commits, installed tools, provider connections, current licenses, and runtime. Never trust claims without checking.

## Two receipts are required before editing

### A. SoulDrifter Onboarding Receipt

Proves:

- correct workspace/worktree/branch;
- live GitHub access;
- fresh local/live heads;
- no unexplained work was reset;
- agent-team context propagation where applicable.

### B. SoulDrifter Production Toolchain Receipt

Proves all ticket-required lanes, including as applicable:

- active host-LLM image-generation capability for concept/reference images;
- Tripo official API/SDK authenticated read for 3D work;
- exact provider-supplied CLI discovery/health check if exposed;
- optional Tripo MCP/Blender add-on chain;
- current balance/pricing/credit gate;
- Tripo preset animation library and rig version;
- any verified first-party Tripo custom-motion capability;
- Houdini version, Python/HOM, license, KineFX, file format, export path;
- Blender version, required add-ons, Python, export path;
- dual-animation bakeoff source/evidence storage;
- Three.js/GLB optimization/runtime;
- real GPU;
- audio/media;
- controlled asset storage, registry, provenance, and rollback.

No valid receipts = no implementation, generation, provider spend, Houdini build, Blender build, animation, VFX, or runtime integration.

## Provider boundaries

### Concept/reference images

Use the active LLM's built-in image generator first. Do not spend Tripo credits on 2D concept or multiview image generation during normal production when ChatGPT/Codex/M3/Claude can generate the required references.

### Tripo

Use Tripo for approved 3D generation, segmentation, mesh processing, rig checking, rigging, preset animation retargeting, any separately verified first-party custom-motion feature, and controlled downloads.

The public Tripo API documents versioned fixed preset animation libraries rather than arbitrary prompt-to-animation. Do not claim arbitrary custom animation until a live authenticated provider capability check proves it.

### Custom animations

A direct Tripo preset that passes the full acceptance gate does not require duplicate DCC production.

Every animation that is not acceptably covered by Tripo—and every substantial constrained/interaction-derived motion—must produce:

1. one Houdini KineFX candidate;
2. one Blender candidate;
3. automated technical checks for both;
4. a blinded independent AI comparison;
5. a blinded owner side-by-side review;
6. a recorded winner/tie/rework verdict;
7. winner integration and independent verification;
8. a machine-readable bakeoff record preserving both candidates.

Aggregate data is reviewed after 10, 25, 50, 100, and each additional 50 completed custom-animation bakeoffs. No pipeline retires automatically; retirement or category routing requires evidence and explicit owner approval.

## Context Receipt — required after onboarding/toolchain preflight

```text
CONTEXT RECEIPT
contextVersion: 2026-08-24-master-v6
model: <m3|claude|chatgpt-codex|other>
role: <orchestrator|requirement-compiler|worker|verifier|performance-verifier>
ticket: #<number or GLOBAL-AUDIT>
branch: <branch>
localHead: <sha>
liveHead: <sha>
worktree: <absolute path>
gameRoot: Arianus-Sky/projects/games/SoulDrifterWeb
onboardingReceipt: PASS/BLOCKED
productionToolchainReceipt: PASS/BLOCKED
animationRoutingLoaded: yes/no/not-required
bakeoffPolicyLoaded: yes/no/not-required
requiredFilesRead:
  - AGENTS.md
  - START_HERE.md
  - ONBOARDING.md
  - PRODUCTION_TOOLCHAIN_PREFLIGHT.md
  - ANIMATION_PROVIDER_ROUTING.md (when applicable)
  - CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md (when applicable)
  - ...
ticketStateLoaded: <yes/no/new>
latestOwnerDirectionChecked: yes
blockingConflicts: <none or list>
plannedScope: <one concise paragraph>
```

## One session / one responsibility

### Orchestrator session

May audit all tickets, verify onboarding/toolchain status, and route work. It should not become the implementation worker for every ticket.

### Worker session

Owns one GitHub ticket in one dedicated worktree. Do not opportunistically fix unrelated tickets.

For a dual animation bakeoff, the Houdini and Blender producers are separate worker responsibilities. One integration owner controls the canonical action ID and winner integration.

### Verifier session

Must be independent from both animation producers and from the implementation producer whose work it verifies.

## Completion rule

`IMPLEMENTED_UNVERIFIED` is the highest status an implementation worker may grant itself.

Neither the Houdini producer nor the Blender producer may declare its own candidate the winner.

Only an independent verifier may move requirements to `VERIFIED`.

Only the full done gate may move the ticket to `OWNER_READY`.

## Current production direction

- Real-time combat is the default.
- Turn-based combat is optional and shares the same authoritative combat simulation.
- Tripo is the primary new 3D asset-generation/segmentation/retopo/rigging/preset-animation lane **after connection preflight passes**.
- Use official Tripo v3 SDK/API or an exact provider-documented first-party CLI. Do not install an unverified similarly named package.
- Use host-LLM image generation for concept/reference images; Tripo 2D image credits are disabled by default.
- Search Tripo's live preset library before commissioning a custom motion.
- Use a direct Tripo preset when it passes full acceptance.
- For every remaining custom motion, run both Houdini KineFX and Blender under the same fair-input contract, then compare blind and gather data.
- Use verified Tripo custom motion as a source or additional candidate when actually available, but it does not cancel an owner-required dual bakeoff.
- Geometry-changing operations occur before final rigging.
- Mixamo is legacy/fallback reference only.
- Playable characters use modular base bodies + separate gear.
- NPCs may use full-outfit generation + segmentation.
- Monsters are regenerated/compared or preserved only after new-harness QA.
- Houdini Apprentice is prototype/non-commercial; Houdini Indie becomes the commercial production/export lane after the planned upgrade and clean Indie revalidation.
- Three.js remains runtime.
- Current phase is First Breach / Heartvale / Levels 1–9.
- Do not leak late Sartan/Patryn/Labyrinth/rune/possibility systems into current starter content.
- Summoner starter magical creature is the Lesser Driftling; later tiers are Minor and Major.
- Reactive combat requires setup/opening/payoff relationships, class resources, cooldowns, visible target reactions, and shared contact markers.

## Conflict rule

Latest explicit owner direction, binding game `AGENTS.md`, current runtime/code, and current GitHub ticket/PR state outrank older harness text.

If an older playbook command conflicts with current official provider documentation, the current official documentation wins and the conflict must be recorded.

When uncertain, mark `OWNER_DECISION_REQUIRED`; do not silently choose.