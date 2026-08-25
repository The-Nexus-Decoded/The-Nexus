# SoulDrifter Session Fast Start

## Purpose

A full workstation/provider onboarding is **not** repeated for every new M3, Claude Code, or Codex chat.

The full bootstrap configures the machine once and writes a persistent local toolchain receipt. New chats perform a short freshness check, load the cached receipt, load the assigned ticket state, and begin the read-only ticket audit.

## Three separate gates

### 1. Machine/toolchain bootstrap — run once

Run when the workstation has no valid receipt, or when an invalidation trigger occurs.

It installs/verifies the shared production tools, including:

- official Tripo v3 SDK/API integration;
- optional first-party Tripo CLI when the authenticated account exposes one;
- Houdini and current license;
- Blender and required add-ons;
- Three.js/GLB/runtime tools;
- real-GPU browser path;
- audio/media utilities;
- controlled staging and receipt storage.

Default local state root:

`H:\CodexData\souldrifter-toolchain\`

Default persistent receipt:

`H:\CodexData\souldrifter-toolchain\receipts\production-toolchain.json`

Tripo-specific receipt:

`H:\CodexData\souldrifter-toolchain\receipts\tripo-provider.json`

These files are local machine state and must not be committed to Git.

### 2. Session fast start — run in every new chat

The session performs only:

1. discover/reuse the assigned worktree;
2. read the harness context version;
3. read the persistent toolchain receipt;
4. verify the receipt is not invalid/stale;
5. verify required secret names are still present without printing values;
6. verify the required tool roots/package locks still exist;
7. fetch the live issue/PR/comments/head;
8. load `.agent-state/<issue>/`;
9. return a short Session Receipt.

This should take seconds to a few minutes, not repeat package installation, Houdini export smoke tests, Blender setup, or provider capability discovery.

### 3. Pre-spend/provider refresh — run only before a paid provider operation

Immediately before a charged Tripo task:

- make a live authenticated balance read;
- read current pricing;
- quote expected/max credits;
- obtain exact owner approval;
- then submit the approved operation.

This refresh is required even when the machine receipt is valid because prices and account balance can change.

## Session Receipt

```text
SOULDRIFTER SESSION RECEIPT
contextVersion: <version>
platform: <M3|Claude Code|ChatGPT/Codex>
ticket: <issue>
branch: <branch>
worktree: <path>
localHead: <sha>
liveHead: <sha>
toolchainReceiptId: <id>
toolchainReceiptGeneratedAt: <timestamp>
toolchainReceiptStatus: CACHED_PASS | REFRESH_REQUIRED | BLOCKED
requiredLanes:
  tripo3D: CACHED_PASS | LIVE_REFRESH_PASS | NOT_REQUIRED
  houdini: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  blender: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  threejs: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  realGpu: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
providerSpendPlannedThisSession: yes/no
fullBootstrapRequired: yes/no
blockingIssues: []
```

## Full-bootstrap invalidation triggers

Run the complete onboarding again only when one or more of these occur:

- receipt missing or unreadable;
- receipt older than the configured maximum age;
- harness toolchain schema/version changed;
- operating system or workstation identity changed;
- Tripo SDK package/lock is missing or changed unexpectedly;
- `TRIPO_API_KEY` is absent or a live authenticated read fails;
- Tripo API base/region changes;
- an official Tripo CLI is newly installed, removed, or upgraded;
- Houdini version or license changes, including the Apprentice-to-Indie upgrade;
- Blender major version/add-on set changes;
- Node/Python major version changes;
- Three.js/runtime toolchain lock changes;
- real-GPU/browser route changes;
- a cached tool check fails;
- the owner explicitly requests a clean re-onboarding.

## Ticket-lane rule

A chat does not revalidate tools it will not use.

Examples:

- a pure documentation ticket can mark Tripo/Houdini/Blender `NOT_REQUIRED`;
- a dungeon TypeScript topology repair can use cached Three.js/GPU status and defer Tripo/Houdini/Blender execution;
- a generated animated fixture requires live Tripo refresh plus cached-or-refreshed Houdini and Blender lanes;
- a paid Tripo task always requires the pre-spend refresh.

## Current #451 order

For issue #451:

1. configure and verify the shared Tripo/Houdini/Blender toolchain once;
2. store the persistent receipt;
3. fix and independently verify the core dungeon route/gameplay spine;
4. only at the **final pipeline-pilot phase**, run the chained-skeleton asset/animation bakeoff after exact spend approval.

The skeleton is not generated during onboarding and is not an early dungeon-repair task.