# SoulDrifter Multi-LLM Onboarding

**This gate happens before GLOBAL-AUDIT or any ticket implementation.**

Onboarding has two independent halves:

1. repository/workspace/session onboarding;
2. production toolchain/provider onboarding.

Passing only the Git/GitHub half is not enough.

## Authoritative local workspace

Main repository checkout:

`H:\Projects\AI_Tools_And_Information\The-Nexus`

SoulDrifter game root:

`H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\projects\games\SoulDrifterWeb`

Ticket worktrees belong under:

`H:\CodexData\.codex\worktrees\<issue>\...`

Repository:

`The-Nexus-Decoded/The-Nexus`

## Hard rules

- Do not create a fresh clone when the existing checkout/worktree is available.
- Do not silently use another copy of The-Nexus.
- Do not work from Downloads/Desktop/temp copies.
- Do not put multiple ticket workers in the same worktree.
- One ticket = one branch + one dedicated worktree.
- Never write credentials/tokens into the repo, prompt, screenshots, evidence, or logs.
- Do not begin production work until `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` passes for every tool required by the ticket.

---

# Gate A — Automatic workspace/worktree discovery

Read `AUTO_DISCOVER_WORKSPACE.md`.

Every model/session must:

1. inspect its current directory for an existing The-Nexus checkout/worktree;
2. locate the canonical local The-Nexus checkout if needed;
3. run `git worktree list --porcelain`;
4. discover existing ticket worktrees/branches;
5. map ticket -> local worktree -> branch -> live PR/issue;
6. reuse in-progress worktrees instead of creating duplicates;
7. prove the SoulDrifter game root and harness are accessible.

Minimum evidence:

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
git remote -v
git worktree list --porcelain
```

If no valid checkout/worktree can be discovered:

`BLOCKED_WORKSPACE_DISCOVERY`

---

# Gate B — GitHub connection verification

Prove live read access to:

`The-Nexus-Decoded/The-Nexus`

The session must retrieve repository metadata, its assigned issue, all current comments, related PRs/reviews, and the live branch/head state.

Do not assume local Git authentication proves GitHub issue/PR integration, or vice versa.

If live reads fail:

`BLOCKED_GITHUB_CONNECTION`

---

# Gate C — Sync/freshness and work preservation

Before edits:

- identify the remote/upstream;
- fetch refs when permitted;
- compare local and live heads;
- inspect uncommitted changes;
- do not reset, clean, discard, or overwrite unexplained work;
- load ticket handoff/ledger/evidence state.

A clean `git status` alone does not prove freshness.

---

# Gate D — Platform/agent discovery

## MiniMax M3

Built-in sidebar agents such as Explore, Worker, Coder, Verifier, and General are product defaults unless explicitly customized.

Do not infer hidden prompts/tools from their names. Inspect only observable settings and run one harmless read-only dispatch to prove that a subagent can access the selected repository, live GitHub context, and `START_HERE.md`.

## Claude Code and ChatGPT/Codex

Both must prove the exact same repository/worktree, live GitHub, context-version, ticket-state, and no-conflicting-work-claim gates.

Model-specific memory is an adapter, not project truth.

---

# Gate E — Production toolchain/provider preflight

Read and execute:

`PRODUCTION_TOOLCHAIN_PREFLIGHT.md`

This includes, when required by the ticket:

- Tripo API/SDK connection and authenticated read;
- exact first-party CLI discovery/installation if the provider exposes one;
- optional Tripo MCP/Blender add-on verification;
- current provider pricing/balance/credit gate;
- image/concept provider;
- Houdini version/Python/HOM/license/export path;
- Apprentice-versus-Indie production-format rules;
- Blender and add-ons;
- Three.js/runtime/GLB optimization;
- real-GPU browser validation;
- audio/media tooling;
- asset registry, provenance, rollback, and controlled storage.

A provider is not “connected” because its name appears in a runbook. It must pass a live sanitized connection check.

---

# Gate F — Context Receipt

After onboarding passes, follow `START_HERE.md` and produce the ticket Context Receipt.

---

# Combined onboarding receipt

```text
SOULDRIFTER ONBOARDING RECEIPT
contextVersion: <version>
platform: <M3|Claude Code|ChatGPT/Codex>
workspaceRoot: <path>
repositoryTopLevel: <path>
repositoryIdentity: The-Nexus-Decoded/The-Nexus
repositoryRemote: <remote>
branch: <branch>
localHead: <sha>
liveHead: <sha>
worktree: <path>
gitStatusReviewed: yes/no
remoteFreshnessReviewed: yes/no
githubLiveRead: PASS/FAIL
harnessEntryPointRead: yes/no
agentContextPropagationTested: <yes/no/not-applicable>
productionToolchainReceipt: PASS/BLOCKED
tripoConnection: PASS/FAIL/NOT_REQUIRED
houdiniConnection: PASS/FAIL/NOT_REQUIRED
threejsRuntime: PASS/FAIL/NOT_REQUIRED
realGpu: PASS/FAIL/NOT_REQUIRED
blockingIssues: []
result: PASS|BLOCKED
```

No PASS means no audit, implementation, provider spend, or asset production.