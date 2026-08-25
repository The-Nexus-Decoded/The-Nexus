# SoulDrifter Production Harness — Complete Source Bundle
This bundle preserves the full extracted text source in a single GitHub-friendly file. Each section records its original relative path.

---

## `source/ARCHITECTURE_DECISION.md`

SHA-256: `05a21655d1b3bc98a77620c1a3f67dc151c2ecf55067d20a26a684d787d67663`

```markdown
# Architecture Decision — Multi-LLM Production Harness

SoulDrifter uses a **model-agnostic shared production harness**.

M3, Claude, ChatGPT/Codex, and future workers do not own separate project truth.
They are adapters onto the same repository-resident requirements, state, runbooks, matrices,
completion ledger, evidence, and verification gates.

## Persistent roles
1. Production Orchestrator
2. Requirement Compiler
3. Independent Verifier

## Dynamic specialists
- Level / World Builder
- Houdini Automation Worker
- Three.js Runtime Integrator
- Character / Asset / Rigging Worker
- Animation / Combat Worker
- VFX / Materials Worker
- Gameplay / AI Worker
- Performance / Real-GPU Verifier

The repo is the memory, the ledger is the progress record, the verifier is the completion authority,
and the worktree is the isolation boundary.
```

---

## `source/AUTO_DISCOVER_WORKSPACE.md`

SHA-256: `7fc44daf01f29cdae8c06e68cdde77985b1166b739da6e9a48cdfe0a06e008f2`

```markdown
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

## 3. Enumerate ALL existing worktrees

From the canonical checkout:

```powershell
git worktree list --porcelain
```

Parse every:
- worktree path;
- HEAD;
- branch;
- detached state;
- locked state.

This list is authoritative for local ticket workspace discovery.

## 4. Match worktrees to tickets

For ticket `#N`, prefer an existing worktree whose branch matches:
- `codex/N-*`
- another branch explicitly linked by the live issue/PR
- a worktree whose `.agent-state/N/` record identifies the ticket

If an open PR exists, its live GitHub head branch is an important mapping signal.

Example known live branches at harness creation:
- issue #448 / PR #449 -> `codex/448-souldrifter-first-breach-models`
- issue #451 / PR #460 -> `codex/451-souldrifter-breach-v2`

Do not hard-code these forever; refresh from GitHub during onboarding/audit.

## 5. Inspect candidate state before reusing it

For each candidate worktree:

```powershell
git branch --show-current
git status --short
git log -5 --oneline
git rev-parse HEAD
```

Then inspect:
- `.agent-state/<issue>/`
- ticket handoff docs;
- recent relevant commits;
- live issue comments;
- related PR head SHA.

Classify:
- `EXISTING_ACTIVE_WORKTREE`
- `EXISTING_DIRTY_WORKTREE`
- `EXISTING_STALE_WORKTREE`
- `EXISTING_CONFLICTED_WORKTREE`
- `NO_EXISTING_WORKTREE`

Do not overwrite or reset unexplained work.

## 6. Only create a new worktree as a last resort

A new worktree may be created only if:
- no valid existing worktree matches the ticket;
- the orchestrator confirms the ticket needs implementation;
- branch naming is reconciled with existing remote branches;
- doing so will not duplicate another agent's in-progress work.

---

# Global audit workspace

The GLOBAL-AUDIT is read-only and may run from the canonical main checkout.

It should discover every worktree and map:
- issue -> branch -> local worktree -> PR -> current HEAD -> dirty/clean status

before routing any worker chats.

---

# Worker workspace rule

A worker is not told to "pick a workspace."

The orchestrator gives it the discovered path:

```text
ticket: #451
branch: codex/451-souldrifter-breach-v2
worktree: <path discovered by git worktree list>
```

The worker verifies that mapping in its Context Receipt and continues the existing work.

---

# Cross-model rule

M3, Claude Code, and Codex use the same discovery procedure.

Do not make model-specific duplicate worktrees unless explicitly required.

The existing git worktree belongs to the ticket, not to the LLM that originally created it.
```

---

## `source/CURRENT_AUDIT_2026-08-22.md`

SHA-256: `874159852686856111c723777ba68d66509098022c46b05ea9f46f7a7477dd95`

```markdown
# Current Pipeline Audit — 2026-08-22

This file records concrete examples that motivated Production Harness v2.

## #448 — body/rig/animation pipeline

### Expected base-body foundation
Independent contract:
- 4 ancestries: Human, Elf, Dwarf, Halfling
- 2 presentations: masculine, feminine
- 3 profiles: Slim, Athletic, Heavy
- expected base-body rows: 24

### Current registered body-anchor intake
The current `body-anchor-intake.json` records 12 body anchors:
- Human masculine Heavy
- Human feminine Heavy
- Elf masculine Heavy
- Elf feminine Heavy
- Dwarf masculine Heavy
- Dwarf feminine Heavy
- all six Halfling presentation/profile combinations

### Missing expected rows
- Human masculine Slim
- Human masculine Athletic
- Human feminine Slim
- Human feminine Athletic
- Elf masculine Slim
- Elf masculine Athletic
- Elf feminine Slim
- Elf feminine Athletic
- Dwarf masculine Slim
- Dwarf masculine Athletic
- Dwarf feminine Slim
- Dwarf feminine Athletic

This is a **matrix-completeness failure** even if every row currently present passes its own validation.

### Modular-character correction
Do not solve this by generating fused ancestry × class actors.

Base bodies stay gear-independent. Calling identity is assembled from separate:
- clothing;
- armor;
- weapons;
- shields/off-hands;
- sheaths;
- hair;
- accessories;
- VFX.

Base-body sources reject fused class outfits, weapons, pedestals and display stands.

### Current rigging
For First Breach humanoids, use the current Mixamo route after clean topology. Mixamo success is not acceptance; required bone chains and close deformation must pass.

Creatures use the creature-rig lane rather than being forced through Mixamo.

Future paid auto-rig provider: Tripo, disabled until explicit owner approval/budget.

## #451 — BREACH-V2

The pipeline failure class is an **edge without a complete connection**.

A door/gate requirement must expand to:
- source aperture;
- frame/socket;
- door/gate;
- open/closed collision;
- corridor;
- destination aperture/socket;
- navigation continuity;
- real-player-radius clearance;
- actual player traversal;
- both-direction visual proof.

A door mesh alone can never satisfy the requirement.

## Cross-ticket lesson

Green unit tests are necessary but not sufficient.

A ticket is not complete until:
1. the expected requirement/matrix is independently generated;
2. every expected row exists;
3. every critical row is VERIFIED by an independent agent;
4. fresh runtime/visual evidence exists;
5. deterministic done gate passes.
```

---

## `source/FIRST_24_HOURS_EXECUTION.md`

SHA-256: `f06cba5d0799177b889f852f41147ef7bdb6e9602f203fb1f50e1aaa08c97f7a`

```markdown
# First 24 Hours — Recommended Execution

## 0–2 hours
Run one orchestrator audit session. Do not start ten implementation chats first.

Deliver:
- live open-ticket inventory;
- open PR mapping;
- stale vs valid classification;
- dependency graph;
- worktree/file collision map;
- NOW/NEXT/BLOCKED/OWNER DECISION board.

## 2–4 hours
Normalize ticket contracts and ledgers for the highest-priority work.

## 4–12 hours
Start only parallel-safe worker chats.

Likely lanes:
- character/Tripo pilot
- First Breach world/connector QA
- runtime combat architecture
- VFX inventory/specification
- NPC/dialogue-head pilot
- monster regenerate/compare pilot

## 12–18 hours
Independent verifier chats test completed increments.

## 18–24 hours
Only verified work enters the owner-review queue.
Do not merge/deploy from audit or producer sessions.
```

---

## `source/M3_BOOTSTRAP_PROMPT.md`

SHA-256: `71fc82eab8a082bcb163b4d5d6533494060b204a72c02c3b7c798bf658a99752`

```markdown
# M3 Bootstrap — Current Entry Point

Use:
- `START_HERE.md`
- `OPENING_PROMPTS.md`
- `adapters/m3/BOOTSTRAP.md`

Do not use an older Mixamo-first bootstrap.
```

---

## `source/M3_FIRST_RUN_PROMPT.md`

SHA-256: `1540c38aed39174987040566c61d93dc8d339acbc57c129aba17adf3ec09f644`

```markdown
# M3 First-Run Prompt — Auto-Discovery Version

Paste this into the first MiniMax Code task from whatever current project/session it opens in:

```text
You are onboarding MiniMax Code to the existing SoulDrifter production work.

Do not ask the owner to manually select or recreate ticket workspaces unless automatic discovery fails.

Do not implement, merge, deploy, close tickets, reset branches, discard local changes, or spend provider credits yet.

Locate the SoulDrifter Multi-LLM Master Harness. Read:
1. ONBOARDING.md
2. AUTO_DISCOVER_WORKSPACE.md
3. START_HERE.md

Automatically discover the existing The-Nexus checkout and all current git worktrees. Use `git rev-parse`, `git remote -v`, and `git worktree list --porcelain`. Inspect current branches/status/HEADs without modifying them.

Map existing local worktrees to live GitHub issues and PR head branches. Reuse existing in-progress worktrees. Do not create duplicate worktrees for tickets that are already underway.

Verify live GitHub access to The-Nexus-Decoded/The-Nexus and read current open SoulDrifter PR/issue state.

The M3 sidebar contains built-in Agent Team presets. Do not assume what Explore, Worker, Coder, Verifier, or General can do from their names. Inspect only settings/details actually exposed by the product, and perform one harmless read-only dispatch to prove a subagent can access the discovered repository/harness.

Return:
1. SOULDRIFTER ONBOARDING RECEIPT
2. WORKTREE MAP: issue -> branch -> worktree path -> PR -> HEAD -> clean/dirty
3. any conflicts/blockers

If and only if onboarding PASSes, continue with the GLOBAL-AUDIT from OPENING_PROMPTS.md.

Do not begin ticket implementation during this first task.
```
```

---

## `source/M3_TEAM_SETUP.md`

SHA-256: `203d4d93d84c132ea2ce98a5432af8b142019a13012df011e4105c3b775e7bb7`

```markdown
# M3 Agent-Team Setup

## Recommended architecture: hybrid

Do **not** create one giant game-development agent containing every detail.
Do **not** keep twenty permanent workers alive either.

Use one persistent leader plus a small number of specialists that are spawned/routed by ticket type.

### Persistent roles

1. **Production Orchestrator**
2. **Requirement Compiler**
3. **Independent Verifier**

### Spawn as needed

4. **Level / World Builder**
5. **Houdini Automation Worker**
6. **Three.js Runtime Integrator**
7. **Character Asset / Rigging Worker**
8. **Animation & Combat Presentation Worker**
9. **VFX / Materials Worker**
10. **Gameplay / Quest / AI Worker**
11. **Performance / Real-GPU QA Worker**

The Orchestrator selects workers from the ticket's needs. A worker may implement multiple contiguous substeps when that is more coherent, but it may not self-verify its own completion.

## Context loading

Every agent working on SoulDrifter must read, in order:

1. Game `AGENTS.md`.
2. The GitHub issue and all current comments.
3. The relevant zone/dungeo