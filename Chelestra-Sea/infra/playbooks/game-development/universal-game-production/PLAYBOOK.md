**UNIVERSAL AI GAME  
PRODUCTION PLAYBOOK**

A genre-agnostic multi-LLM pipeline for designing, building, testing,
and releasing any type of game

| **Universal Core + Genre/Platform Modules + Project Overlay + Independent Verification** |
|------------------------------------------------------------------------------------------|

For MiniMax M3 • Claude Code • ChatGPT/Codex • Future LLM teams

Version 1.0 • August 2026

# Executive Summary

This playbook separates reusable game-production process from
project-specific design. The universal core can support a shooter,
action game, flight simulator, management sim, mobile puzzle game,
multiplayer strategy title, or several nested games inside one product.

The existing SoulDrifter playbook should remain separate. SoulDrifter
contains valuable project-specific canon, combat rules, character
pipelines, asset IDs, branch/worktree mappings, and acceptance criteria.
Moving those details into a universal guide would weaken both systems.

The recommended architecture is a stable universal harness plus a small
project profile and overlay for each game. Multi-LLM workers read the
same repository state, not separate chat memories, and independent
verification prevents partial work from being called complete.

## The separation rule

| **Layer**              | **Contains**                                                  | **Examples**                                                           |
|------------------------|---------------------------------------------------------------|------------------------------------------------------------------------|
| Universal core         | Reusable workflow, agents, skills, schemas, QA, release gates | Ticket compiler, asset registry, verifier, worktree discovery          |
| Genre/platform modules | Mechanic-specific requirements loaded only when applicable    | Shooter, flight sim, strategy, 2D, VR, multiplayer                     |
| Project overlay        | Game-specific truth and production policy                     | Canon, exact mechanics, art direction, paths, budgets, owner decisions |
| Ticket state           | Current work and proof                                        | Contracts, ledger, evidence, handoff, blockers                         |

## Recommended use

- Keep SoulDrifter on its existing project-specific harness.
- Install the universal harness once in a shared or template location.
- For each new game, create a project profile, select modules, and add a project overlay.
- Run a global audit, prove a vertical slice, then fan work out to parallel-safe agents.
- Require independent verification and machine done gates before owner-ready or release-ready status.

# Contents

1. Architecture: Universal Core and Project Overlays
2. Multi-LLM Agent Team
3. Project Profile and Module Selection
4. End-to-End Production Lifecycle
5. Game Design and Vertical Slice
6. Code and Runtime Architecture
7. 2D and 3D Asset Pipelines
8. Animation, Interactions, VFX and Audio
9. Gameplay AI, Physics and Simulation
10. Networking, Saves and Backend
11. UI, Input and Accessibility
12. QA, Performance and Release
13. Genre and Platform Modules
14. Nested Games and Mini-Games
15. Starting a New Project
16. Relationship to SoulDrifter

# 1. Architecture: Universal Core and Project Overlays

A generic game pipeline must be broad without becoming vague. The solution is composition: reusable core process plus modules and an overlay.

## Universal core responsibilities

- Workspace/Git/tracker onboarding and auto-discovery
- Context receipts and repository-based state
- Requirement compilation and dependency graphs
- Agent roles, parallel work claims, handoffs and independent verification
- Asset/action/evidence schemas
- QA, performance, networking, save, release and live-ops gates

## Project overlay responsibilities

- The exact player promise and game rules
- Canon, story, factions, classes, vehicles, weapons or economy
- Engine paths, folders, worktrees and runtime constraints
- Art/audio direction and naming conventions
- Provider accounts, cost gates and licensing rules
- Target-device budgets and release authorization

> **Do not flatten project detail into the universal core.** A shooter should not inherit RPG equipment assumptions. A flight simulator should not inherit humanoid combat matrices. A project selects only the modules it actually needs.

# 2. Multi-LLM Agent Team

The same harness works across M3, Claude Code and ChatGPT/Codex because model-specific tools are adapters, not sources of truth.

| **Role** | **Primary responsibility** | **Completion authority** |
|---|---|---|
| Production Orchestrator | Audit, dependencies, worktrees, routing, risk/budget and owner-ready queue | Cannot self-verify production work |
| Requirements/Canon Auditor | Convert tickets and design into atomic contracts | Defines expected work; does not prove implementation |
| Specialist Workers | Implement design, code, assets, animation, VFX, AI, networking, audio or release work | Stop at IMPLEMENTED_UNVERIFIED |
| Independent Verifier | Re-derive requirements and test current commit/evidence | Only role that marks VERIFIED |
| Performance/Device Verifier | Validate real target renderer/device/network/performance | Required for platform-sensitive acceptance |

## Shared-context mechanism

1. Read START_HERE and context version.
2. Load project profile and overlay.
3. Fetch live ticket/comments/PR.
4. Load ticket contract, ledger, evidence and handoff.
5. Verify branch/worktree.
6. Return Context Receipt.
7. Only then edit.

# 3. Project Profile and Module Selection

A project profile replaces the assumption that every game is an RPG. It describes what the game actually contains.

## Minimum profile fields

- Project/repository identity
- Engine/toolchain and languages
- Platforms and input methods
- One or more game modes
- Selected genre and platform modules
- Project overlay/canon index
- Performance budgets
- Provider and spending rules
- Save/network/release model

## Game modes

One product can contain several modes. Each mode selects its own modules while sharing chosen host systems.

| **Example mode** | **Camera/dimension** | **Modules** | **Shared host systems** |
|---|---|---|---|
| Main world | Third-person 3D | Action/adventure, narrative | Account, save, inventory, UI shell |
| Flight mode | Cockpit/external 3D | Flight/vehicle sim, nested mini-game | Shared profile and rewards |
| Card table | 2D/3D hybrid | Card/turn-based, nested mini-game | Same economy and quest state |

# 4. End-to-End Production Lifecycle

1. Onboard and auto-discover existing work.
2. Validate project profile and overlay.
3. Audit open work and classify tickets.
4. Compile requirements and expected matrices.
5. Define and prove vertical slice.
6. Implement in dependency order.
7. Pilot AI/provider pipelines before batching.
8. Integrate into the actual runtime.
9. Run automated, visual, device and performance checks.
10. Independent verification.
11. Owner-ready gate.
12. Release gate, observability and rollback.

## Dependency-order examples

- 3D actor: design → model → topology → texture → rig → animation → sockets/LOD → runtime → gameplay proof
- Shooter weapon: data → model/sockets → aim/recoil → animation → hit logic → VFX/audio → UI → network → QA
- Aircraft: physics specification → input/control surfaces → instruments/camera → terrain/weather → damage/AI → telemetry → device QA
- Management simulation: data model → tick/update architecture → agents/economy → UI → saves/migrations → scale/performance

# 5. Game Design and Vertical Slice

The vertical slice is the most important anti-waste gate. It proves the riskiest complete loop before content scaling.

## Vertical-slice contract

- Player goal and start state
- Core action/control and camera
- Feedback and game feel
- Success/failure and recovery
- Save/reload or session recovery
- One representative production asset pipeline
- Target platform/device execution
- Performance baseline and debug instrumentation

> **Scale only after proof.** Do not spend a full provider subscription on hundreds of assets until one complete generated/processed asset works in the target runtime and passes visual/performance QA.

# 6. Code and Runtime Architecture

- Data-driven registries for actions, assets, levels, vehicles, units or cards
- Stable state machines and explicit transitions
- Clear engine/tool/runtime boundaries
- Input abstraction and remapping
- Camera modes as contracts
- Error handling, retries and fallback assets
- Debug snapshots, telemetry and deterministic reproduction
- Tests around schemas and high-risk integration boundaries

## Action contracts

An action contract can represent a sword attack, gunshot, flight control event, unit command, card play, crafting action, or puzzle interaction. It records input, timing, resource/cooldown, animation, VFX/audio, state changes and network ownership.

# 7. 2D and 3D Asset Pipelines

## 2D

Concept/style → clean source → layers/slices → sprite/skeletal animation → atlas/export → compression/filtering → runtime integration → responsive/device QA.

## 3D

Reference/design → model/generate → segment/edit → topology/retopo → UV/texture/material → rig/animation if needed → LOD/collision/sockets → export → runtime/import → performance/visual QA.

## Universal asset registry

- Expected asset ID and category
- Source/provider/provenance/license
- Technical metrics and budgets
- Status and runtime slot
- Evidence and promotion gate
- Existing-versus-new comparison when replacing assets

# 8. Animation, Interactions, VFX and Audio

## Animation

- Semantic action intent
- Anticipation, active/contact/release and recovery
- Root motion and displacement policy
- IK, contacts, additive layers and deformation
- Equipment/prop/socket events
- Transitions and interruption/cancel rules
- Normal-speed runtime and target-camera proof

## Interactions

- Actor/prop animation and alignment
- Collision/state transition
- Prompt and failure feedback
- Audio/VFX event markers
- Save/network consequence
- Clean exit/recovery

## VFX/audio

- Telegraph and contact readability
- Pooling and performance tiers
- Spatial audio and bus priority
- Target-device reduced-quality fallbacks
- Shared event markers so gameplay, animation, VFX and sound agree

# 9. Gameplay AI, Physics and Simulation

Simulation-heavy genres need explicit fidelity and performance levels. Decide whether the project is arcade, assisted, systemic, or study-simulation before implementing physics or AI.

- Update frequency and deterministic state
- Physics layers/collision ownership
- Navigation, steering and pathfinding
- Behavior/state machines and sensors
- Vehicles/control surfaces and damage models
- Agent/economy simulation at scale
- Debug views, telemetry and reproducible seeds
- Level-of-detail for simulation, not only graphics

# 10. Networking, Saves and Backend

- Authoritative ownership and trust boundaries
- Replication, prediction, reconciliation and lag strategy
- Lobbies/parties/match/session lifecycle
- Reconnect and failure recovery
- Identity, persistence and entitlements
- Save schema versioning and migrations
- Anti-cheat/duplication/moderation/security
- Observability, scaling and incident response

> **One source of authoritative truth.** The same action should not have unrelated offline, turn-based, real-time and multiplayer definitions. Use shared contracts with scheduler/network adapters where possible.

# 11. UI, Input and Accessibility

- Keyboard/mouse, controller, touch, HOTAS/wheel, VR hands as selected
- Remapping, dead zones, sensitivity and input prompts
- Responsive UI and safe areas
- Readable HUD and actionable errors
- Contrast, text scaling, subtitles, motion reduction and assist modes
- Localization expansion and bidirectional layout planning when applicable
- Tutorial/onboarding that teaches actual systems

# 12. QA, Performance and Release

## Test layers

- Unit/schema/contract tests
- Integration and end-to-end gameplay loops
- Visual/audio evidence
- Real target devices and render APIs
- Network and adverse-condition tests
- Save/migration/backward-compatibility tests
- Performance/thermal/memory/loading/soak tests
- Accessibility and input matrix

## Completion authority

Workers stop at IMPLEMENTED_UNVERIFIED. The independent verifier checks the current commit and fresh evidence. A machine done gate rejects missing critical rows, unresolved dependencies, self-verification, stale evidence and remaining blockers.

## Release

- Build and packaging
- Migrations and environment configuration
- Signing/store/hosting checks
- Analytics/crash/error observability
- Rollback/canary plan
- Asset/license/provenance review
- Owner approval

# 13. Genre and Platform Modules

| **Module** | **Adds to the requirement compiler** |
|---|---|
| Action/Adventure/RPG | Character movement, interactions, combat, progression, quests, equipment |
| FPS/TPS Shooter | Aim, weapons, recoil/ballistics, cover, hit validation, netcode |
| Flight/Vehicle Simulation | Physics fidelity, controls, cockpit/instruments, weather/terrain, telemetry |
| Racing | Vehicle handling, tracks/laps, timing, AI, collisions, replays |
| Strategy/Tactics | Deterministic rules, pathfinding, fog, economy, large-agent performance |
| Builder/Management/Sandbox | Placement, simulation agents, production chains, time controls, persistence |
| Survival/Crafting | Resources, inventory, recipes, status, building, persistence |
| Platformer/Puzzle | Movement feel, collisions, checkpoints, puzzle solvability/reset |
| Fighting/Sports | Frame/input rules, hitboxes, scoring, rollback, training/replay |
| Card/Board/Turn-Based | Rules engine, legal actions, turns/phases, seeds, logs/reconnect |
| Multiplayer/Social | Sessions, replication, chat/moderation, backend/security |
| Narrative/Adventure | Dialogue/story state, cinematics, voice/subtitles/localization |
| 2D / 3D / Mobile-Web / Desktop / VR | Presentation and platform constraints loaded independently |

# 14. Nested Games and Mini-Games

A game can contain other game types without forcing the entire project into one genre. Define every subgame as a mode with explicit shared and isolated systems.

## Required nested-mode contract

- Entry/exit and failure recovery
- State, inventory, currency and reward transfer
- Input/camera/UI switch
- Pause/time/network behavior
- Separate mechanics and module set
- Save/checkpoint behavior
- Performance and asset-loading boundary
- Anti-exploit rules

Example: an action-adventure game may contain a high-fidelity aircraft simulator. The flight mode loads Flight/Vehicle Simulation and perhaps VR modules while the host retains identity, quest, save and reward state.

# 15. Starting a New Project

1. Copy/reference the universal harness.
2. Create `project-profile.json`.
3. Choose genre and platform modules.
4. Create project overlay and canon index.
5. Pass onboarding and auto-discover repository/worktrees.
6. Run global audit.
7. Define vertical slice and first requirement contracts.
8. Pilot providers/assets.
9. Integrate and independently verify.
10. Scale production.

## Suggested first prompt

You are the Production Orchestrator for project `<PROJECT_ID>`. Read START_HERE.md, validate project-profile.json and the project overlay, return a Context Receipt, then perform the global audit. Do not implement until the audit produces the dependency and parallel-safety map.

# 16. Relationship to SoulDrifter

SoulDrifter should keep its existing detailed harness. That project has specific classes, combat modes, Driftling design, Tripo decisions, asset matrices, GitHub branches, Level 1 scope and owner directions that do not belong in a generic guide.

## Recommended relationship

- Universal core supplies shared workflow and reusable skills.
- SoulDrifter overlay supplies all SoulDrifter-specific canon and production rules.
- A future shooter gets a different overlay and shooter modules.
- A future flight simulator gets a different overlay and flight/VR modules.
- No project-specific overlay overwrites another.

# Final Production Principle

> **Show, prove, and verify.** The purpose of the harness is not to produce more documents. It is to make AI teams finish complete, connected, target-platform-ready game features without relying on memory or optimistic summaries.
