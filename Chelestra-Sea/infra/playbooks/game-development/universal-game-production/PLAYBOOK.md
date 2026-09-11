# UNIVERSAL AI GAME PRODUCTION PLAYBOOK

A genre-agnostic multi-LLM pipeline for designing, building, testing, and releasing any type of game.

**Architecture:** Universal Core + Genre/Platform/Engine/Provider Modules + Project Overlay + Ticket State + Independent Verification

For MiniMax M3 • Claude Code • ChatGPT/Codex • Future LLM teams

**Version 1.1 — August 24, 2026**

---

# Executive Summary

This playbook separates reusable game-production process from project-specific design. The same universal core can support shooters, action games, role-playing games, flight simulators, vehicle games, strategy titles, management simulations, puzzle games, mobile/web games, VR/XR, multiplayer products, and nested games inside a larger product.

A project does not inherit mechanics merely because the original pipeline was developed for an action RPG. Each project selects only the modules it requires and stores its own canon, paths, budgets, provider decisions, tools, and owner instructions in a project overlay.

The updated architecture fixes two common failures:

1. **Tool/provider names were treated as if they were already connected.** Now every selected tool lane must pass a live sanitized connection/capability check before use.
2. **Every new chat risked repeating a large onboarding procedure.** Now the workstation/toolchain is bootstrapped once, receipts are cached outside Git, and each new chat performs only a short freshness/ticket-context check.

The production sequence is:

```text
ONE-TIME WORKSTATION/TOOLCHAIN BOOTSTRAP
            |
            v
PERSISTENT SANITIZED RECEIPTS
            |
            v
FAST SESSION START FOR EACH NEW CHAT
            |
            v
LIVE TICKET/PR/WORKTREE CONTEXT
            |
            v
REQUIREMENT CONTRACT + DEPENDENCY PLAN
            |
            v
IMPLEMENTATION / ASSET PRODUCTION
            |
            v
RUNTIME + TARGET-DEVICE PROOF
            |
            v
INDEPENDENT VERIFICATION
            |
            v
OWNER/RELEASE GATE
```

---

# 1. Separation Rule

| Layer | Contains | Examples |
|---|---|---|
| Universal core | Reusable workflow, state, provider/DCC contracts, QA, release gates | Worktree discovery, receipts, asset registry, verifier |
| Genre/platform modules | Mechanic-specific requirement expansions | Shooter, flight sim, strategy, 2D, VR, multiplayer |
| Engine/provider modules | Tool-specific setup and adapters | Unity, Unreal, Godot, Three.js, Tripo, Houdini, Blender |
| Project overlay | Project truth | Canon, mechanics, art direction, paths, budgets, owner decisions |
| Ticket state | Current expected work and proof | Contract, ledger, evidence, handoff, blockers |

Do not flatten project detail into the universal core. A flight simulator should not inherit humanoid classes; a card game should not inherit 3D rigging; a shooter should not inherit RPG equipment assumptions.

---

# 2. Persistent Onboarding and Fast Sessions

## 2.1 Full bootstrap — once per workstation/template

Run `ONBOARDING.md` and `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` once, then cache sanitized receipts outside Git.

The full bootstrap may:

- verify repository/tracker/worktree access;
- install and pin selected provider SDKs;
- authenticate through approved local secret storage;
- perform read-only account/capability checks;
- verify DCC/engine versions, licenses and export paths;
- verify real target devices/GPUs;
- create controlled staging/download/evidence roots;
- verify audio/media tools;
- write receipt IDs, versions, paths and timestamps.

It must not:

- print or commit secrets;
- submit paid tasks merely to prove setup;
- generate ticket assets during onboarding;
- overwrite unexplained project work.

Re-run only when invalidated: missing/expired receipt, provider auth failure, SDK/API-region change, DCC/engine/license change, Node/Python major-version change, target-device change, or explicit owner request.

## 2.2 Fast start — every new chat

Every M3, Claude Code, Codex, or future session reads `SESSION_FAST_START.md` and performs only:

- branch/worktree discovery;
- cached receipt validation;
- required secret-name/tool-root check;
- project-profile/overlay load;
- live ticket/PR/comment/head fetch;
- ticket-state/work-claim load;
- selected-module load;
- Session Receipt + Context Receipt.

No per-chat package installation or full smoke suite unless invalidated.

## 2.3 Live pre-spend refresh

Before every charged provider operation, regardless of cached receipt:

1. live authenticated balance;
2. current official price;
3. expected and maximum cost;
4. retry-cost disclosure;
5. exact owner approval;
6. task ID, actual cost, result, download hash and remaining balance.

---

# 3. Multi-LLM Agent Team

| Role | Responsibility | Authority |
|---|---|---|
| Production Orchestrator | Audit, dependencies, receipts, routing, worktree conflicts, owner-ready queue | Cannot self-verify implementation |
| Requirements/Canon Auditor | Convert design/tickets into atomic contracts and expected matrices | Defines expected work |
| Specialist Worker | Code, level, asset, animation, VFX, audio, AI, networking or release work | Stops at `IMPLEMENTED_UNVERIFIED` |
| Independent Verifier | Re-derive requirements and test current commit/evidence | Only role that marks `VERIFIED` |
| Performance/Device Verifier | Test real target hardware/render/network conditions | Required for platform-sensitive acceptance |
| Blind Comparison Coordinator | Randomize A/B candidates and preserve review integrity | Cannot produce either candidate |

One chat owns one responsibility. One ticket uses one branch/worktree unless an explicit integration owner coordinates isolated sub-lanes.

---

# 4. Project Profile and Module Selection

A project profile should include:

- project/repository identity;
- engine/runtime/languages;
- platforms and inputs;
- game modes;
- genre/platform modules;
- engine/DCC/provider modules;
- project overlay/canon index;
- performance/device budgets;
- provider/spending/license rules;
- save/network/release model;
- custom-animation comparison policy;
- persistent receipt roots and allowed secret names.

One product may contain multiple modes. A third-person adventure can contain a flight simulator, card game, puzzle, or other nested mode while sharing selected account/save/economy systems.

---

# 5. End-to-End Production Lifecycle

1. Fast-start from cached toolchain state; full bootstrap only when required.
2. Validate project profile and overlay.
3. Audit open work and classify tickets.
4. Compile atomic requirements and expected matrices.
5. Define/prove a vertical slice.
6. Pilot provider/asset pipelines before batching.
7. Implement in dependency order.
8. Integrate into the actual runtime.
9. Run automated, visual, audio, device and performance checks.
10. Independently verify current commit and fresh evidence.
11. Owner-ready gate.
12. Release, observability, rollback and live-ops gate.

## Dependency-order examples

- 3D actor: concept/reference → 3D source → segmentation/edit → topology/material → rig → animation → sockets/LOD → runtime → gameplay/device proof.
- Level: map/topology → registry → shells/openings → connectors → collision/nav → dressing → materials/lighting → VFX/audio → runtime traversal → performance → QA.
- Shooter weapon: data → model/sockets → aim/recoil → animation → hit logic → VFX/audio → UI/network → QA.
- Aircraft: physics spec → controls → instruments/camera → world/weather → damage/AI → telemetry/device QA.
- Simulation: data model → tick/update architecture → agents/economy → UI → saves/migrations → scale/performance.

---

# 6. Vertical Slice

The vertical slice proves the riskiest complete loop before content scaling.

Required:

- player goal/start state;
- core control/camera/action;
- feedback/game feel;
- success/failure/recovery;
- save/reload/session recovery;
- one complete representative asset/provider pipeline;
- target-device execution;
- performance/debug baseline;
- provenance/rollback;
- independent verification.

Do not batch hundreds of provider assets before one complete source-to-runtime asset passes.

---

# 7. Provider and Asset Pipeline

## 7.1 Concept/reference images

Use the active host LLM image generator first when available. Record prompt, owner corrections, model/version when exposed, dimensions, controlled path and hash.

A selected 3D provider should not consume credits for ordinary 2D concept generation unless the project overlay explicitly approves an exception.

## 7.2 Provider adapters

Each selected provider module defines:

- official SDK/API/package/repository;
- region/base URL;
- secret environment-variable names;
- read-only authenticated check;
- capabilities;
- local staging/download paths;
- task polling/retries;
- price/balance/spend gate;
- output expiry/download policy;
- provenance/hash/rollback contract;
- optional official CLI/MCP policy.

Never install a similarly named third-party CLI by guessing. Use exact first-party documentation.

## 7.3 Tripo v3 reusable module

The included `providers/tripo-v3/` module uses the official JavaScript/TypeScript SDK `@vastai/tripo-sdk` and v3 API.

Default role:

- text/image/multiview-to-3D;
- upload/download;
- segmentation;
- mesh completion/decimation;
- rig check;
- rigging;
- preset animation retargeting;
- task polling/balance.

Concept images remain host-LLM-first. The module installs once, performs a no-charge authenticated read, writes a cached receipt, and refreshes balance/pricing only before paid tasks.

## 7.4 Universal 3D sequence

```text
concept/reference
-> generate/import 3D source
-> segmentation/edit when required
-> mesh completion/retopo/decimation
-> UV/texture/material
-> scale/origin/pivot
-> rig check
-> rig
-> animation route
-> collision/LOD/sockets
-> export
-> runtime
-> target-device QA
```

Geometry-changing operations occur before final rigging unless the selected provider/DCC contract proves otherwise.

## 7.5 Asset registry

Record:

- expected asset ID/category;
- source/provider/model/version/task/cost;
- prompt/reference/license;
- untouched and derivative hashes;
- technical metrics;
- runtime slot;
- acceptance/evidence;
- rollback;
- existing-versus-new comparison.

Provider task success is never asset acceptance.

---

# 8. Animation, Interactions, VFX and Audio

## 8.1 Animation routing

Every motion is classified as one of:

- direct accepted provider preset;
- simple preset-derived variant;
- verified provider custom motion;
- dual custom-DCC bakeoff;
- runtime procedural motion.

Direct provider presets that pass full acceptance do not require duplicate production.

## 8.2 Dual custom-animation bakeoff

When enabled by the project profile, a custom motion not adequately covered by provider presets receives two independently produced candidates—default lanes:

1. Houdini KineFX;
2. Blender.

Both use the same model/rig/source/brief, duration/FPS, root-motion policy, constraints, markers, scene, cameras, export contract and production budget.

Required process:

```text
lock common inputs
-> Candidate Lane A + Candidate Lane B
-> automated admissibility gates
-> randomize labels
-> blind independent AI scoring
-> blinded owner A/B review
-> store verdict
-> reveal labels
-> integrate winner
-> preserve loser/source/metrics
-> update experiment registry
```

Review aggregate outcomes at 10, 25, 50, 100, then each additional 50 comparisons. No pipeline retires automatically; category/global routing changes require representative evidence and explicit owner approval.

Projects may substitute different candidate lanes, but must preserve the fair-input/blind-review/data contract.

## 8.3 Interaction contract

- actor/prop alignment;
- collision/state transition;
- prompt and failure feedback;
- audio/VFX/gameplay event markers;
- save/network consequence;
- clean interruption/recovery.

## 8.4 VFX/audio

- gameplay events remain authoritative;
- telegraph/contact readability;
- attachment/timing markers;
- pooling and quality tiers;
- spatial audio and concurrency;
- reduced-quality target-device fallbacks;
- target-camera and target-device proof.

---

# 9. DCC and License Policy

DCC modules record version, scripting, license, file formats, plugins/add-ons, import/export and deterministic smoke tests.

## Houdini

Apprentice exposes virtually the FX feature set but remains non-commercial/restricted. Indie is a limited-commercial production lane with different file/license/export behavior. Upgrading licenses invalidates the cached Houdini receipt and requires a clean production-format/export revalidation.

## Blender

Record version, Python, add-ons, armature/constraint/action/NLA capabilities, and GLB/FBX export proof.

Other DCCs can be selected through project modules.

---

# 10. Code and Runtime Architecture

- data-driven registries;
- explicit state machines;
- stable provider/DCC/runtime boundaries;
- input abstraction/remapping;
- camera contracts;
- deterministic reproduction;
- error/retry/fallback behavior;
- debug snapshots/telemetry;
- tests around schemas and high-risk integration boundaries.

An action contract records input, timing, cooldown/resource, animation, VFX/audio, state changes and network ownership whether the action is a sword attack, gunshot, aircraft control, unit command, card play, crafting action or puzzle interaction.

---

# 11. Gameplay AI, Physics and Simulation

Choose arcade, assisted, systemic, or study-simulation fidelity before implementation.

Define:

- update rate/determinism;
- physics/collision ownership;
- navigation/steering;
- behavior/sensors;
- vehicles/control surfaces/damage;
- agent/economy scale;
- simulation LOD;
- telemetry/debug views;
- reproducible seeds.

---

# 12. Networking, Saves and Backend

- authoritative ownership/trust boundaries;
- replication/prediction/reconciliation;
- session/lobby/party lifecycle;
- reconnect/failure recovery;
- identity/persistence/entitlements;
- save schema/migrations;
- anti-cheat/duplication/moderation/security;
- observability/scaling/incidents.

Use shared action contracts with scheduler/network adapters rather than unrelated definitions for offline, turn-based, real-time and multiplayer modes.

---

# 13. UI, Input and Accessibility

- keyboard/mouse/controller/touch/HOTAS/wheel/VR inputs as selected;
- remapping/dead zones/sensitivity;
- responsive UI/safe areas;
- readable HUD/errors;
- contrast/text scale/subtitles/motion reduction/assist modes;
- localization expansion;
- tutorial that teaches actual systems.

---

# 14. QA, Performance and Release

## Test layers

- unit/schema/contract;
- integration/end-to-end gameplay;
- visual/audio evidence;
- real target hardware/render APIs;
- adverse network conditions;
- save/migration/backward compatibility;
- performance/thermal/memory/loading/soak;
- accessibility/input matrix;
- provenance/license/rollback.

Workers stop at `IMPLEMENTED_UNVERIFIED`. Independent verifiers re-derive expectations from current state and alone mark `VERIFIED`.

## Release

- build/package/sign/store/hosting;
- environment/migrations;
- analytics/crash/error observability;
- canary/rollback;
- asset/license/provenance review;
- owner authorization.

---

# 15. Genre and Platform Modules

| Module | Adds |
|---|---|
| Action/Adventure/RPG | Movement, interactions, combat, progression, quests, equipment |
| FPS/TPS Shooter | Aim, weapons, recoil/ballistics, cover, hit validation, netcode |
| Flight/Vehicle Simulation | Physics fidelity, controls, instruments, weather/terrain, telemetry |
| Racing | Handling, tracks/laps, timing, AI, collisions, replays |
| Strategy/Tactics | Rules, pathfinding, fog, economy, large-agent performance |
| Builder/Management/Sandbox | Placement, simulation agents, production chains, persistence |
| Survival/Crafting | Resources, inventory, recipes, status, building |
| Platformer/Puzzle | Movement feel, collision, checkpoints, solvability/reset |
| Fighting/Sports | Frames/inputs, hitboxes, scoring, rollback, replay |
| Card/Board/Turn-Based | Rules engine, legal actions, phases, seeds, logs/reconnect |
| Multiplayer/Social | Sessions, replication, chat/moderation, backend/security |
| Narrative/Adventure | Dialogue/story state, cinematics, voice/subtitles/localization |
| 2D/3D/Mobile/Web/Desktop/VR | Presentation and platform constraints independently selected |

---

# 16. Nested Games and Mini-Games

Each subgame/mode defines:

- entry/exit/failure recovery;
- shared/isolated state, inventory, currency and rewards;
- input/camera/UI switch;
- pause/time/network behavior;
- module set;
- save/checkpoint behavior;
- performance/asset-loading boundary;
- anti-exploit rules.

---

# 17. Starting a New Project

1. Reference/copy universal harness.
2. Create `project-profile.json`.
3. Select genre/platform/engine/provider modules.
4. Create project overlay/canon index.
5. Run one-time workstation/toolchain onboarding if no valid cached receipt exists.
6. Use Session Fast Start for normal chats.
7. Run global audit.
8. Define vertical slice and atomic contracts.
9. Pilot providers/assets.
10. Integrate and independently verify.
11. Scale only after proof.

Suggested first prompt:

```text
You are the Production Orchestrator for project <PROJECT_ID>.
Read START_HERE.md and SESSION_FAST_START.md, load the cached toolchain receipt,
validate project-profile.json and the project overlay, return the Session and
Context Receipts, then perform the global audit. Run full onboarding only when
the cached receipt is missing or invalid. Do not implement until the audit
produces the dependency and parallel-safety map.
```

---

# 18. Relationship to Project-Specific Playbooks

The universal core supplies shared workflow, toolchain/provider contracts, cached onboarding, animation comparison, QA and release principles.

Each project-specific playbook supplies:

- exact canon/mechanics;
- project paths/branches/worktrees;
- selected tools/providers;
- budgets/licensing;
- asset/action matrices;
- ticket order;
- owner decisions.

SoulDrifter remains one such detailed overlay; future shooters, simulators and other games receive different overlays without weakening the universal core.

---

# Final Production Principle

> **Configure once, load quickly, build in dependency order, prove in the real runtime, and verify independently.**
