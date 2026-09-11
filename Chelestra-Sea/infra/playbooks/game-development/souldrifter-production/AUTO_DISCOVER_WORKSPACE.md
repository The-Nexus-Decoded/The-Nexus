# Auto-Discover Existing SoulDrifter Workspace / Worktrees

## Goal

The owner should not have to manually select or recreate workspaces for in-progress SoulDrifter tickets.

Before creating anything, the agent must discover and reuse the existing local checkout/worktrees.

## Repository identity

Expected repository:
`The-Nexus-Decoded/The-Nexus`

Known main checkout location:
`H:\Projects\AI_Tools_And_Information\The-Nexus`

Known ticket worktree root:
`H:\CodexData\.codex\worktrees\`

These are discovery hints, not permission to create duplicate clones.

---

# Discovery order

## 1. Inspect the current process workspace

Run:

```powershell
git rev-parse --show-toplevel
git branch --show-current
git remote -v
git status --short
```

If this is already a recognized The-Nexus checkout/worktree, use it as the starting discovery anchor.

## 2. Find the canonical local The-Nexus checkout

Check the known root:

`H:\Projects\AI_Tools_And_Information\The-Nexus`

If it is a valid git checkout and its remote identifies `The-Nexus-Decoded/The-Nexus`, use it as the canonical discovery root.

Do not fresh-clone if this checkout exists.

## 3. Enumerate all existing worktrees

From the canonical checkout:

```powershell
git worktree list --porcelain
```

Parse every worktree path, HEAD, branch, detached state, and locked state.

This list is authoritative for local ticket workspace discovery.

## 4. Match worktrees to tickets

For ticket `#N`, prefer an existing worktree whose branch matches:

- `codex/N-*`;
- another branch explicitly linked by the live issue/PR;
- a worktree whose `.agent-state/N/` record identifies the ticket.

If an open PR exists, its live GitHub head branch is an important mapping signal.

Known examples at this harness revision:

- issue #448 / PR #449 -> `codex/448-souldrifter-first-breach-models`;
- issue #451 / PR #460 -> `codex/451-souldrifter-breach-v2`.

Refresh these from GitHub; do not hard-code them forever.

## 5. Inspect candidate state before reuse

For each candidate worktree:

```powershell
git branch --show-current
git status --short
git log -5 --oneline
git rev-parse HEAD
```

Then inspect `.agent-state/<issue>/`, handoff docs, recent commits, live issue comments, and the related PR head SHA.

Classify the worktree as:

- `EXISTING_ACTIVE_WORKTREE`;
- `EXISTING_DIRTY_WORKTREE`;
- `EXISTING_STALE_WORKTREE`;
- `EXISTING_CONFLICTED_WORKTREE`;
- `NO_EXISTING_WORKTREE`.

Do not overwrite or reset unexplained work.

## 6. Create a new worktree only as a last resort

A new worktree may be created only if:

- no valid existing worktree matches the ticket;
- the orchestrator confirms the ticket needs implementation;
- branch naming is reconciled with existing remote branches;
- doing so will not duplicate another agent's in-progress work.

---

# Global audit workspace

The GLOBAL-AUDIT is read-only and may run from the canonical main checkout.

It maps issue -> branch -> local worktree -> PR -> current HEAD -> dirty/clean status before routing worker chats.

# Worker workspace rule

A worker is not told to pick a workspace. The orchestrator provides the discovered ticket branch/worktree, and the worker verifies it in the Context Receipt.

# Cross-model rule

M3, Claude Code, and Codex use the same discovery procedure.

The existing git worktree belongs to the ticket, not to the LLM that originally created it.