# Universal Game Production — Session Fast Start

## Purpose

Every new M3, Claude Code, ChatGPT/Codex, or other agent session loads cached machine/toolchain state instead of repeating full onboarding.

## Per-session checks

1. Discover/reuse assigned branch/worktree.
2. Read `START_HERE.md` and context version.
3. Load project profile and overlay.
4. Load cached workstation/toolchain receipt.
5. Check receipt schema, age and invalidation triggers.
6. Verify required tool roots/locks and required secret **names** without printing values.
7. Fetch live ticket/comments/PR/head.
8. Load `.agent-state/<ticket>/` and work claims.
9. Load only selected genre/platform/engine/provider modules.
10. Return Session Receipt and Context Receipt.

## Do not repeat every chat

Unless invalidated, do not repeat:

- package installation;
- full provider capability discovery;
- full Houdini/Blender/engine export smoke suites;
- full real-device/GPU baseline suite;
- controlled storage creation;
- account authorization.

## Live refreshes that still happen when needed

- Paid provider operation: current balance/pricing + exact approval.
- External API auth failure: refresh provider receipt.
- Engine/DCC/license upgrade: refresh affected lane.
- Ticket requires a lane not previously bootstrapped: bootstrap that lane only.

## Session receipt

```text
UNIVERSAL GAME SESSION RECEIPT
contextVersion: <version>
projectId: <id>
platform: <agent host>
ticket: <id>
branch: <branch>
worktree: <path>
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

## Project-lane rule

A chat checks only lanes required by its ticket.

Examples:

- documentation ticket: provider/DCC lanes `NOT_REQUIRED`;
- gameplay-code ticket: engine/runtime lanes only;
- 3D asset ticket: selected 3D provider + DCC + runtime/device lanes;
- custom animation ticket: rig provider + both configured animation-candidate lanes + runtime review lane;
- paid provider task: live pre-spend refresh always required.