# Universal Game Production Harness — Complete Source Bundle
This bundle preserves the full extracted text source in a single GitHub-friendly file. Each section records its original relative path.

---

## `source/ARCHITECTURE_DECISION.md`

SHA-256: `2e4997815799630eb1d223ab6648d4343efec35707c99c3b073f714387bc9d12`

```markdown
# Architecture Decision — Universal Core + Project Overlay

## Decision

Use a two-layer system:

### Universal core
Contains reusable process:
- onboarding;
- multi-LLM roles;
- requirement compilation;
- ticket state;
- asset/action contracts;
- QA and verification;
- release gates;
- provider routing;
- genre/platform modules.

### Project overlay
Contains game-specific truth:
- title and canon;
- gameplay rules;
- selected genres/modes;
- engines and paths;
- assets and naming;
- art direction;
- control scheme;
- networking model;
- budgets;
- issue tracker and release rules.

## Why

A universal harness prevents rebuilding process for every game.
A project overlay prevents one game's lore/mechanics from contaminating another.

## Nested games

A project may define several `gameModes`, each with its own module set. Example:
- open-world shell;
- flight simulator mode;
- tactical card mini-game;
- racing challenge.

Each subgame shares the host project's accounts, saves, inventory, input, UI shell, and release process where appropriate, while keeping its own mechanics/QA profile.
```

---

## `source/AUTO_DISCOVER_WORKSPACE.md`

SHA-256: `9d8a374af97b9564286ed63b5ecb3df1d29b8517f3a6707852f774426f97e142`

```markdown
# Auto-Discover Existing Game Workspaces

## Goal

Reuse existing branches/worktrees and in-progress work. Do not fresh-clone or duplicate a ticket workspace merely because a different LLM takes over.

## Procedure

1. Inspect the current directory with git.
2. Locate the canonical checkout if the current directory is not one.
3. Run `git worktree list --porcelain`.
4. Match worktrees to live ticket/PR branches.
5. Inspect each candidate's HEAD, branch, status, handoff, and ticket state.
6. Classify candidates as active, dirty, stale, conflicted, or unmatched.
7. Create a worktree only when no valid existing ticket worktree exists.

The worktree belongs to the **ticket/project**, not to M3, Claude, or Codex.
```

---

## `source/FIRST_24_HOURS.md`

SHA-256: `21c2a4a61056e471d1d63851518f1c9d60a13aa9841abe79714308aea262f864`

```markdown
# First 24 Hours for a New Game Project

## Hours 0–2
- install/reference universal core;
- create project profile;
- select modules;
- create overlay/canon index;
- pass onboarding.

## Hours 2–5
- define the target player experience;
- identify riskiest mechanics;
- define vertical slice;
- compile first ticket contracts.

## Hours 5–12
- build one complete loop with placeholder assets;
- prove controls, camera, state, save, and platform execution;
- establish performance baseline.

## Hours 12–18
- start production asset/provider pilots;
- integrate one complete production-quality example per pipeline;
- verify on target device/runtime.

## Hours 18–24
- independent QA;
- prioritize NOW/NEXT/BLOCKED;
- fan out only after the vertical-slice contracts and integration boundaries are proven.
```

---

## `source/ONBOARDING.md`

SHA-256: `445ee7765a55d9c4773d300235533ae7697ac81deb0bc06c74abe5e7fe396323`

```markdown
# Universal Game Project Onboarding

This gate occurs before global audit or implementation.

## 1. Auto-discover the existing workspace

Do not ask the owner to manually recreate workspaces unless discovery fails.

Verify:
- repository top level;
- configured remote/repository identity;
- existing branches/worktrees;
- current dirty/clean state;
- project profile and overlay paths;
- live issue/PR access where available.

Use `scripts/discover-game-workspaces.ps1` on Windows or equivalent git commands:

```text
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short
git worktree list --porcelain
```

## 2. Validate the project profile

Run:

```text
node scripts/check-project-profile.mjs <path-to-project-profile.json>
```

The profile must identify:
- engines/tools;
- platforms;
- selected genre/platform modules;
- game modes;
- performance targets;
- project overlay/canon paths;
- provider/spending rules.

## 3. Verify platform agent behavior

For M3 built-in agent presets, Claude subagents, Codex workers, or other team systems:
- inspect only capabilities the product actually exposes;
- perform one harmless read-only dispatch;
- require every subagent to read `START_HERE.md` and return a Context Receipt;
- never assume context inheritance from the agent's display name.

## 4. Onboarding receipt

```text
UNIVERSAL GAME ONBOARDING RECEIPT
platform: <platform>
workspaceRoot: <path>
repositoryIdentity: <identity>
projectProfile: <path>
projectOverlay: <path>
liveTrackerRead: PASS/FAIL
existingWorktreesMapped: yes/no
subagentContextTest: PASS/FAIL/not-applicable
blockingIssues: []
result: PASS|BLOCKED
```

No PASS = no global audit.
```

---

## `source/OPENING_PROMPTS.md`

SHA-256: `385c3861ffff596b9e1fb68e02db7bb8b8547896738f44e28a33de524cc2d08a`

```markdown
# Universal Opening Prompts

## Global audit

```text
You are the Production Orchestrator for project <PROJECT_ID>.

Do not implement yet.
Read the repository instructions and Universal AI Game Production Harness beginning with START_HERE.md. Load and validate project-profile.json and the project overlay. Return a Context Receipt.

Audit every open project issue and related PR. Classify each as CONTINUE_VALID, REVALIDATE, REWORK_REQUIRED, SUPERSEDED_OR_LEGACY, BLOCKED, OWNER_DECISION_REQUIRED, or CLOSE_CANDIDATE_AFTER_VERIFICATION.

Identify current state, stale claims, dependencies, module-specific requirements, parallel safety, worktree mapping, provider/budget risks, recommended worker/verifier, and the next atomic action.

Do not merge, deploy, close tickets, or broadly implement during this audit.
Finish with NOW / NEXT / BLOCKED / OWNER DECISION.
```

## Worker

```text
Work project <PROJECT_ID> ticket #<TICKET> as role <ROLE>.
Read START_HERE.md, project-profile.json, project overlay, live ticket/comments/PR, and ticket state. Return a Context Receipt before editing.

Use only the modules selected for this project/mode. Work one ticket in one worktree. Implement in dependency order, run checks, capture evidence, update the ledger/handoff, and stop at IMPLEMENTED_UNVERIFIED.
```

## Verifier

```text
Independently verify project <PROJECT_ID> ticket #<TICKET>.
Read START_HERE.md, the profile/overlay, live ticket/PR, producer commits, ledger and evidence. Re-derive requirements independently and actively search for missing behavior, stale evidence, placeholders, device failures, performance regressions, save/network divergence, and incomplete matrices.

Return PASS, FAIL, or NEEDS_EVIDENCE per requirement. Do not self-assign as producer in the same verification pass.
```
```

---

## `source/PROJECT_PROFILE_GUIDE.md`

SHA-256: `1361c892019c8ddb5df665cc0126a86c23f15301758ed6001ef915bd6e92fe8e`

```markdown
# Project Profile Guide

Every game creates one `project-profile.json` using `templates/project-profile.template.json`.

## Key concepts

### Project
The complete product/repository.

### Game mode
A playable mode or nested game with its own mechanics, camera, input, modules, and QA matrix.

### Module
Reusable genre/platform requirements layered onto a mode.

### Overlay
Project-specific canon and production rules.

## Example mode combinations

- third-person shooter + multiplayer + desktop;
- 2D platformer + mobile/web;
- flight simulator + desktop + VR;
- management sim + strategy + multiplayer;
- open-world game containing a flight mode and card mini-game.

## Avoid

Do not describe a project only as `genre = RPG` or `genre = shooter`.
Select all mechanics that actually apply. A game can combine several modules.
```

---

## `source/README.md`

SHA-256: `4f8b6382a123b400ce102fee46be0d114ced2f8d56def11eb7de47a9caf6ac3b`

```markdown
# Universal AI Game Production Harness v1

A genre-agnostic, model-agnostic production system for building **any type of game** with AI-assisted teams.

It supports:
- 2D and 3D games;
- web, mobile, desktop, console-oriented, and XR projects;
- single-player and multiplayer;
- shooters, RPGs, action-adventure, simulation, flight, racing, strategy, management, platformers, puzzles, fighting, sports, card/board games, and nested mini-games;
- MiniMax M3, Claude Code, ChatGPT/Codex, and future LLM workers.

## This does not replace project-specific playbooks

The universal harness is the **core operating system**.

Each game adds:
1. a `project-profile.json`;
2. selected genre/platform modules;
3. a project-specific overlay containing canon, mechanics, art direction, paths, provider rules, and acceptance criteria.

The existing SoulDrifter harness remains separate and authoritative for SoulDrifter. It may reference this universal core later, but it is not overwritten by this package.

## Start

Read `START_HERE.md`.

## Main architecture

`Universal Core + Genre Modules + Platform Modules + Project Overlay + Ticket State + Independent Verification`

## Deliverables in this package

- reusable agent definitions;
- reusable skills;
- genre and platform modules;
- project-profile schema/templates;
- completion and evidence ledgers;
- workspace discovery and onboarding;
- M3/Claude/Codex adapters;
- universal QA, performance, networking, save, release, and live-ops gates.
```

---

## `source/SEPARATION_FROM_SOULDRIFTER.md`

SHA-256: `a5c9726ebd36dd92640e560bc6ea17841a2bc41aa84be6eb6974375a6f2495cb`

```markdown
# Separation from SoulDrifter

The SoulDrifter harness remains a separate project-specific system.

This universal package:
- does not replace SoulDrifter canon;
- does not rename its skills/classes/assets;
- does not change its current branches/tickets;
- does not remove its detailed RPG/character/combat rules.

Recommended long-term arrangement:

```text
/shared-harnesses/universal-game/
/projects/SoulDrifter/.project-harness/
/projects/NewShooter/.project-harness/
/projects/FlightSim/.project-harness/
```

Each project overlay may reference the universal core's version, but project-specific truth remains local to the project.
```

---

## `source/START_HERE.md`

SHA-256: `5f8cee6f89b293aaa86ccf89a92857515048bb9e6d3a69f68875a3c58c44f37d`

```markdown
# START HERE — Universal AI Game Production Harness

**Context version:** `2026-08-23-universal-game-v1`

## Core principle

**Chat memory is not project state. The repository is project state.**

Every session reconstructs context from the same files before editing.

## Startup order

1. Read the repository's binding agent instructions (`AGENTS.md`, `CLAUDE.md`, or equivalent).
2. Read `ONBOARDING.md` when this platform/workspace has not passed onboarding.
3. Read this file.
4. Read `config/context-version.json`.
5. Read the game's `project-profile.json`.
6. Read the game's project overlay/canon index.
7. Read `WORKFLOW.md`.
8. Read the assigned issue/ticket and all current comments.
9. Read ticket state under `.agent-state/<ticket>/` when present.
10. Read only the selected genre/platform modules and specialist skills required by the ticket.
11. Inspect the actual branch/worktree and recent commits.
12. Produce a Context Receipt before editing.

## Required Context Receipt

```text
GAME PRODUCTION CONTEXT RECEIPT
contextVersion: 2026-08-23-universal-game-v1
platform: <M3|Claude Code|ChatGPT/Codex|other>
role: <orchestrator|auditor|worker|verifier>
projectId: <id>
ticket: <number or GLOBAL-AUDIT>
repository: <owner/repo or local identity>
branch: <branch>
worktree: <absolute path>
projectProfileLoaded: yes/no
projectOverlayLoaded: yes/no
selectedModules:
  - <module>
latestTicketDirectionChecked: yes/no
blockingConflicts: <none or list>
plannedScope: <concise scope>
```

No valid receipt = no implementation.

## R