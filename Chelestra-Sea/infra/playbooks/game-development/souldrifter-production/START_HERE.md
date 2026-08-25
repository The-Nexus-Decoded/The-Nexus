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
