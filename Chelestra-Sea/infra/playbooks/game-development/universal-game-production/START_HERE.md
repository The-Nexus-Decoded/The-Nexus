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

## Role boundary

- **Orchestrator:** audits, routes, coordinates, and owns the execution board.
- **Worker:** implements one ticket in one worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- **Verifier:** independently re-derives requirements and alone may mark them `VERIFIED`.

## Generic-core boundary

Do not write game-specific lore, class names, proprietary mechanics, or asset IDs into the universal core.
Put those in the project overlay.
