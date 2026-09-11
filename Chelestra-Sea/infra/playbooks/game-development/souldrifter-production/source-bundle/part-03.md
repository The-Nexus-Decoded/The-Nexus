rlying skill/resource/cooldown/status contract.
```

## Shortest safe prompt after installation

```text
SoulDrifter issue #<ISSUE>, role=<ROLE>. Read START_HERE.md and follow it exactly. Return a Context Receipt before editing. Work only this ticket/worktree and stop at IMPLEMENTED_UNVERIFIED.
```
```

---

## `source/PROJECT_CANON_INDEX.md`

SHA-256: `d6f5208241679fd0f5b48ef22f507ad0c5078dd0e8e9c8649ed51766f09517d5`

```markdown
# Project Canon Index

## Priority order

1. Latest explicit owner direction
2. Binding repository `AGENTS.md`
3. Current runtime/code contracts
4. Locked/current SoulDrifter docs and approved GitHub issue decisions
5. This master harness
6. Recovered Lifepaper/Book-of-Life historical material
7. Death Gate source inspiration within current-phase restrictions
8. New proposals

A lower-priority source never silently overrides a higher-priority source.

## Core harness
- `START_HERE.md`
- `WORKFLOW.md`
- `ARCHITECTURE_DECISION.md`
- `agents/`
- `skills/`
- `scripts/check-completion.mjs`

## Character / asset / animation / combat
- `docs/01_MASTER_PLAYBOOK.md`
- `docs/02_ANIMATION_MATRIX.md`
- `docs/03_TRIPO_COVERAGE_AND_CUSTOM_GAPS.md`
- `docs/05_COMBAT_REACTIONS_AND_DEATHS.md`
- `docs/07_NPC_DIALOGUE_HEADS.md`
- `docs/08_GEAR_AND_LOOT_PIPELINE.md`
- `docs/10_ANCESTRY_ABILITIES_AND_ANIMATION.md`
- `docs/11_CODE_DERIVED_ANIMATION_DEMAND.md`
- `docs/12_FULL_3D_ONLINE_ACTION_RPG_ANIMATION_AUDIT.md`
- `docs/13_HIT_REACTION_ARCHITECTURE.md`
- `docs/14_VFX_PARTICLE_MATRIX.md`
- `docs/15_RUNTIME_ANIMATION_SYSTEM_REQUIREMENTS.md`
- `docs/16_SKILL_SOURCE_AND_LORE_PRECEDENCE_RULEBOOK.md`
- `docs/17_REACTIVE_COMBAT_CHAIN_SYSTEM.md`
- `docs/18_CLASS_RESOURCES_AND_COOLDOWNS.md`
- `docs/19_SUMMONER_PET_COMMAND_AND_AUTOCAST_SYSTEM.md`
- `docs/20_DUAL_COMBAT_MODE_ARCHITECTURE.md`

## Machine-readable current direction
- `config/current-phase-scope.json`
- `config/character-matrix.json`
- `config/ancestry-ability-matrix.json`
- `config/current-class-core-actions.json`
- `config/owner-directed-skill-updates.json`
- `config/class-combat-chains.json`
- `config/class-resource-model.json`
- `config/combat-mode-policy.json`
- `config/animation-demand-sources.json`

## Current code-derived class rule

Current runtime/canon has two core Level-1 class actions per calling.
The owner wants **three starter active abilities per class**.

The third ability must be found in approved source or proposed through the source-grounded skill process,
then owner-approved before paid production/canonical lock.

## Summoner owner direction

- Replace the generic starter wisp direction with **Lesser Driftling**.
- Driftling is a magical shaped creature, not a natural Beast summon.
- Progression family: Lesser -> Minor -> Major Driftling.
- Later specialization space includes Elemental, Necromantic, and Beast Summoning.
- Summoner has a separate pet bar.
- Pet abilities support manual execution and per-ability autocast.
- Pet cooldown/resource/status rules are identical whether manual or autocast.
```

---

## `source/README.md`

SHA-256: `7530ea5a75d4149e33cc48f8c808628c6bbb50c7b4c1e72aad5a3f9fb256f98f`

```markdown
# SoulDrifter Multi-LLM Master Harness

Shared by MiniMax M3, Claude, ChatGPT/Codex, and future workers.

## Start
Read **`START_HERE.md`**.

## Recommended first move
Run one Production Orchestrator global audit using `OPENING_PROMPTS.md`.
Do not open many implementation chats until the audit has mapped dependencies and worktree/file conflicts.

Then fan out only parallel-safe tickets:
**one chat = one role + one ticket + one branch/worktree**.

Every session must reconstruct context from the repo and produce a Context Receipt.
Implementation workers stop at `IMPLEMENTED_UNVERIFIED`.
Independent verification is required before `OWNER_READY`.

## Current direction
- Tripo-first new asset production; Mixamo legacy/fallback.
- Modular playable characters.
- NPC segmentation permitted.
- Monster regenerate/compare.
- First Breach/Heartvale/Levels 1–9 current phase.
- Real-time combat default; optional turn-based scheduler over the same simulation.
- Reactive chains + cooldowns + class resources.
- Lesser Driftling starter summon with separate manual/autocast pet bar.
- No deployment without owner authorization.

## v2 onboarding gate

Before the global audit, every platform must pass `ONBOARDING.md`.

This verifies:
- correct The-Nexus workspace;
- correct Git remote/repository;
- live GitHub read access;
- branch/worktree state and freshness;
- M3 built-in agent preset discovery/context propagation.

Do not assume MiniMax's built-in Explore/Worker/Coder/Verifier/General presets have any particular hidden settings from their labels.

## v3 automatic worktree discovery

The owner does not need to manually choose each ticket workspace.

All models must first run `AUTO_DISCOVER_WORKSPACE.md` / `scripts/discover-souldrifter-workspaces.ps1`,
enumerate existing git worktrees, match them to live issues/PR branches, and reuse in-progress work.

Never create a duplicate ticket worktree merely because a different LLM is taking over the ticket.
```

---

## `source/START_HERE.md`

SHA-256: `af95954ea3311679c41a819a028f7a3b77fc76edf5e246be7cb83d2f675af8b9`

```markdown
# SoulDrifter Multi-LLM Master Harness — START HERE

**Context version:** `2026-08-23-master-v1`

This is the mandatory entry point for every SoulDrifter production session:
- MiniMax M3 / Code Agent Team
- Claude / Claude Code
- ChatGPT / Codex
- future LLM workers

## Core principle

**Chat memory is not project state. The repository is project state.**

Every session reconstructs context from the same files before editing.

## Mandatory startup order

0. If this model/platform has not passed onboarding, read `ONBOARDING.md` and `AUTO_DISCOVER_WORKSPACE.md` first. Auto-discover existing worktrees; do not ask the owner to select ticket workspaces unless discovery fails. Produce a PASS onboarding receipt.

1. Read the game repository's binding `AGENTS.md`.
2. Read this file.
3. Read `config/context-version.json`.
4. Read `PROJECT_CANON_INDEX.md`.
5. Read `WORKFLOW.md`.
6. Read `docs/01_MASTER_PLAYBOOK.md`.
7. Read `config/current-phase-scope.json`.
8. Read the GitHub issue assigned to this session **and every current comment**.
9. Read its related PR(s), if any.
10. Read `.agent-state/<issue>/ticket-contract.json`, `completion-ledger.json`,
    `evidence-manifest.json`, and `handoff.json` when they exist.
11. Read only the specialist runbooks/skills required by the ticket, plus anything they reference.
12. Inspect the actual worktree/branch and recent commits. Never trust claims without checking files/runtime.

## Context Receipt — REQUIRED BEFORE EDITING

Before modifying anything, output/store:

```text
CONTEXT RECEIPT
contextVersion: 2026-08-23-master-v1
model: <m3|claude|chatgpt-codex|other>
role: <orchestrator|requirement-compiler|worker|verifier|performance-verifier>
ticket: #<number or GLOBAL-AUDIT>
branch: <branch>
worktree: <absolute path>
gameRoot: Arianus-Sky/projects/games/SoulDrifterWeb
requiredFilesRead:
  - AGENTS.md
  - START_HERE.md
  - ...
ticketStateLoaded: <yes/no/new>
latestOwnerDirectionChecked: yes
blockingConflicts: <none or list>
plannedScope: <one concise paragraph>
```

No valid Context Receipt = no implementation work.

## One session / one responsibility

### Orchestrator session
May audit all tickets and route work.
It should not become the implementation worker for every ticket.

### Worker session
Owns one GitHub ticket in one dedicated worktree.
Do not opportunistically fix unrelated tickets.

### Verifier session
Must be independent from the producer whose work it verifies.

## Completion rule

`IMPLEMENTED_UNVERIFIED` is the highest status an implementation worker may grant itself.

Only an independent verifier may move requirements to `VERIFIED`.

Only the full done gate may move the ticket to `OWNER_READY`.

## Current production direction

- Real-time combat is the default.
- Turn-based combat is optional and shares the same authoritative combat simulation.
- Tripo is the primary new asset-generation / segmentation / retopo / rigging / baseline-animation lane.
- Mixamo is legacy/fallback reference only, not the primary future production path.
- Playable characters use modular base bodies + separate gear.
- NPCs may use full-outfit generation + segmentation.
- Monsters are regenerated/compared or preserved only after new-harness QA.
- Current phase is First Breach / Heartvale / Levels 1–9.
- Do not leak late Sartan/Patryn/Labyrinth/rune/possibility systems into current starter content.
- Summoner starter magical creature is the **Lesser Driftling**; later Driftling tiers are Minor and Major.
- Reactive combat requires setup/opening/payoff relationships, class resources, cooldowns, visible target reactions, and shared contact markers.

## Conflict rule

If an older harness file conflicts with newer `docs/`, `config/`, owner-directed updates,
or current repository canon, the newer/current source wins.

When uncertain, mark `OWNER_DECISION_REQUIRED`; do not silently choose.
```

---

## `source/TICKET_ROUTING_CURRENT.md`

SHA-256: `45c6bc3aad3bc0ddcd7e68395c762dd4fd91cf17300732539e14c8d7efd8dec5`

```markdown
# Current SoulDrifter Ticket Routing

This is the recommended first-pass routing for the currently active work.

| Ticket | Primary workers | Mandatory verifier focus |
|---|---|---|
| #448 Production characters/models | Character/Rigging + Animation + Runtime | expected asset matrix, modular body contract, Mixamo deformation, runtime action matrix |
| #451 BREACH-V2 | Level/World + Houdini + Runtime | portal/corridor connectivity, room enclosure, traversal, all-room visual matrix |
| #452 Anwel village | Level/World + Houdini + Runtime | streets read spatially, roofs/steps/chimneys/windows, grounded props, PBR, entrance accessibility |
| #453 Water | VFX/Materials + Runtime | confluences, banks, real depth/swimming, shader/readability, runtime movement |
| #454 Terrain | World + VFX/Materials + Runtime | PBR ground, palette, near-field vegetation, phone-width proof |
| #455 Waystones | World/Houdini + Runtime | data-driven road junction placement, readability, grounding/clearance |
| #456 Wildlife | Gameplay AI + Animation + Runtime | biome legality, deterministic spawn, water/road/building exclusions, state transitions |
| #457 Named NPC polish | Character/Rigging + Animation + Runtime | canonical shared rig, identity consistency, modular clothing, face/deformation |
| #458 Monster rig polish | Character/Rigging + Animation + VFX + Runtime | full action matrix, deformation, markers, terminal states |
| #459 Playable Heartvale | Gameplay + Character + Animation + Runtime | full talk→quest→combat→reward loops, mobile interaction |

The orchestrator may add workers, but may not remove the independent verifier.
```

---

## `source/WORKFLOW.md`

SHA-256: `7606d2fdf8c2fa4053aca8b4e0f15bee46dff6e58ac25d11ac59e039cedaae06`

```markdown
# SoulDrifter Ticket Workflow — Multi-LLM

## Phase A — Global audit before large parallel execution

The first orchestrator session enumerates every open SoulDrifter issue and related open PR.

Classify each:
- `CONTINUE_VALID`
- `REVALIDATE`
- `REWORK_REQUIRED`
- `SUPERSEDED_OR_LEGACY`
- `BLOCKED`
- `OWNER_DECISION_REQUIRED`
- `CLOSE_CANDIDATE_AFTER_VERIFICATION`

Compare existing work to binding rules, latest owner comments, current runtime/canon,
this harness, current phase rules, Tripo/modular-character direction, and combat/VFX rules.

The global audit creates the execution map; it does not implement every ticket.

## Phase 0 — Session startup
Follow `START_HERE.md` and create a Context Receipt.

## Phase 1 — Ticket intake
Fetch issue + all comments + linked PRs, confirm worktree, inspect current files,
and create/update `.agent-state/<issue>/ticket-contract.json`.

## Phase 2 — Requirement expansion
Expand hidden dependencies into explicit testable rows.