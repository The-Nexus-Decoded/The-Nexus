# Universal Game Production — Session Fast Start

Context-loading amendment: project-context-v1

## Purpose

Every new M3, Claude Code, ChatGPT/Codex, or other agent session loads cached machine/toolchain state instead of repeating full installation. This does NOT allow skipping the project's lore, design bible, visual/mechanical constraints or runbooks.

Read `PROJECT_CONTEXT_LOADING_POLICY.md` and the selected project's complete `PROJECT_CONTEXT_READSET` or equivalent. Follow their underlying source-reading requirements before substantive work. A project profile title, issue summary or cached tool receipt is not sufficient context.

## Per-session checks

1. Discover/reuse assigned branch/worktree and governing instructions; preserve ongoing work.
2. Read `START_HERE.md`, playbook corrections and context version.
3. Resolve the project profile/overlay and its actual reading contract; record documentation ref separately from implementation base.
4. Read the common project lore/design/runbook sources in full and the selected role additions. Follow mandatory references; do not claim reading from filenames or truncated excerpts.
5. Reconcile source canon, owner decisions, proposals, implementation and historical supersessions with a source/decision ledger.
6. Load cached workstation/toolchain receipt and check schema, age and invalidation triggers.
7. Verify required tool roots/locks and required secret names without printing values.
8. Fetch live ticket/comments/PR/reviews/head; load `.agent-state/<ticket>/` and work claims.
9. Load selected genre/platform/engine/provider modules and actual affected source/asset/test contracts.
10. Return Session and Context Receipts, including source coverage and a source-backed comprehension summary. Missing core context blocks work; separable limitations must be explicit.

On continuing turns with retained source content, re-read changes and affected dependencies. A genuinely new agent loads the common project context again; another chat's memory does not transfer through a cached installation receipt.

## Do not repeat every chat

Unless invalidated, do not repeat:

- package installation;
- full provider capability discovery;
- full Houdini/Blender/engine export smoke suites;
- full real-device/GPU baseline suite;
- controlled storage creation;
- account authorization.

Reading setup instructions is not permission to execute setup again. Required project comprehension is separate from all of the above.

## Live refreshes when needed

- Paid provider operation: current balance/pricing and valid exact/scoped approval.
- External API auth failure: refresh the affected provider lane.
- Engine/DCC/license upgrade: refresh that lane.
- Newly needed unconfigured tool: bootstrap that lane only.
- Source/owner decision change: refresh affected context; do not reinstall the toolchain.

## Session receipt

```text
UNIVERSAL GAME SESSION RECEIPT
contextVersion: <version>
projectId: <id>
platform: <agent host>
ticket: <id>
docsRefAndCommit: <actual source>
projectReadset: <resolved path/version>
sourceCoverageLedger: <actual path>
commonDesignAndLoreRead: COMPLETE | INCOMPLETE
roleReadsetStatus: COMPLETE | INCOMPLETE
contextStatus: CONTEXT_READY | CONTEXT_READY_LIMITED | CONTEXT_BLOCKED
branch: <branch>
worktree: <path>
implementationBase: <ref/sha>
localHead: <sha>
liveHead: <sha>
toolchainReceiptId: <id>
toolchainReceiptGeneratedAt: <timestamp>
toolchainReceiptStatus: CACHED_PASS | REFRESH_REQUIRED | BLOCKED
requiredModules:
  - <module + status>
providerSpendPlanned: yes/no
fullBootstrapRequired: yes/no
blockingIssues: []
```

A receipt records evidence/coverage and declared comprehension; it is not an automatic proof that every requirement was understood. Independent verification still checks resulting work.

## Project-lane rule

A chat executes only tool lanes required by its ticket. Every role still reads the common project context.

- Documentation/schema: provider/DCC execution may be NOT_REQUIRED, project design context may not.
- Gameplay code: runtime tools plus relevant product/lore/mechanical contracts.
- 3D assets: world/culture/visual context plus provider/DCC/runtime review modules.
- Custom animation: character/action context plus approved rig and candidate/review lanes.
- Paid task: live pre-spend refresh is always required.

The universal core does not embed any particular game's canon. Genre-specific lore and current execution order come from the verified project readset. Once context and authorization gates pass, proceed with work rather than generating repeated planning-only handoffs.
