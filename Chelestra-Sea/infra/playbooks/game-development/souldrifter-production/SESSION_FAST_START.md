# SoulDrifter Session Fast Start

Context-loading amendment: soul-context-v1

## Purpose

A full workstation/provider installation is **not** repeated for every new M3, Claude Code, or Codex chat. However, every new agent MUST load the project's actual lore, game bible, SEA runbooks and applicable source documents. Cached tools do not mean cached understanding.

**Mandatory before substantive work: read `PROJECT_CONTEXT_READSET.md` completely and load its underlying common sources and applicable role additions.** This is part of fast start, not an optional research step. Reading only this document, START_HERE, a ticket, an index or another agent's summary cannot satisfy it.

The full bootstrap configures a machine once and writes a persistent local toolchain receipt. New chats perform a short tool freshness check, reconstruct actual project context and assigned ticket state, and then execute the authorized task.

## Four separate gates

### 1. Machine/toolchain bootstrap — once or when invalidated

Run the relevant bootstrap when the workstation has no valid receipt or an applicable invalidation trigger occurs. Read the onboarding/preflight instructions even when installations need not be repeated.

Shared tools may include:

- verified official Tripo SDK/API integration;
- optional first-party Tripo CLI only when actually exposed and verified;
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

These are local machine state; never commit secret-bearing receipts to Git.

### 2. Mechanical session fast start — every new chat

1. Discover/reuse the assigned worktree without resetting existing work.
2. Resolve and record the documentation ref/commit separately from gameplay base and local/remote head.
3. Read the harness context version and persistent toolchain receipt.
4. Verify receipt freshness, required tool roots/locks and required secret names without exposing values.
5. Fetch live assigned issue/PR/comments/reviews and dependency/work-claim state.
6. Load `.agent-state/<issue>/` or the current established equivalent.
7. Verify completed checkpoint evidence; do not rerun the whole backup merely because an old comment says it was blocked.

This mechanical check should take seconds to a few minutes. It is not the whole project reading requirement.

### 3. Project comprehension — every genuinely new agent

Follow `PROJECT_CONTEXT_READSET.md` and the universal `PROJECT_CONTEXT_LOADING_POLICY.md`.

Read BOTH SEA roots:

- `Chelestra-Sea/infra/playbooks/game-development/universal-game-production/`
- `Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/`

Then read actual G-relative lore/design files, not just PROJECT_CANON_INDEX:

```text
docs/GAME_BIBLE.md
docs/CHARACTER_AND_STORY_SYSTEM.md
docs/DEATH_GATE_MAGIC_REFERENCE.md
docs/CLASS_PROGRESSION_CODEX.md
docs/LEVEL_01.md
docs/BROWSER_GAME_DESIGN.md
docs/ARCHITECTURE.md
```

G is `Arianus-Sky/projects/games/SoulDrifterWeb/` at the verified relevant implementation/source ref. Load live #428/#429/#430 decisions, progression/ancestry constraints, required regional lore/map companions, applicable historical Book-of-Life/Lifepaper/Discord/source-bundle blocks and the role-specific policies/configs/templates in the readset.

All Heartvale workers also load current campaign/framework runbooks, actual map/section/NPC sources and latest #509/#512 audits. Do not treat an unpushed local report as a QA file. In particular, asset-only #510 needs cultural/NPC-role/lore constraints and code-only #502 needs the shared world/mechanical context; neither may skip this gate.

Record exact sources/refs/hashes/read coverage and current decisions in the established context ledger. Explain the relevant world/region, visual identity, current-phase restrictions, mechanics, production sequence and boundaries. Flag legacy conflicts and missing sources. No assumption that code behavior or an older book-derived proposal is approved canon.

Return Session and Context Receipts with CONTEXT_READY, CONTEXT_READY_LIMITED (explicit separated scope), or CONTEXT_BLOCKED. Do not claim READ/PASS from filenames, excerpts, another agent's receipt or a green install check.

In a continuing session with retained source content, refresh changes and affected dependencies rather than rereading unchanged files. In a new chat, load the common context and selected role reads again. No installation or expensive tool validation is implied by reading documents.

### 4. Pre-spend/provider refresh — before charged operations

Immediately before charged provider work:

- verify active Studio/browser, API/SDK or official CLI lane separately;
- read live authenticated balance, allowance and current operation cost;
- quote expected/max credits and check the current applicable approval;
- serialize shared provider access and submit only within approval;
- reconcile the actual charge afterward.

A cached toolchain or context receipt does not authorize spend. A blocked/unfunded API does not force a reinstall or block an independently verified funded Studio lane.

## Session Receipt

```text
SOULDRIFTER SESSION RECEIPT
contextVersion: <current harness version>
contextReadsetRevision: soul-context-v1
platform: <M3|Claude Code|ChatGPT/Codex|other>
ticket: <issue>
docsRef: <resolved ref>
docsCommit: <actual commit>
branch: <branch>
worktree: <path>
implementationBase: <verified ref/sha>
localHead: <sha>
liveHead: <sha>
toolchainReceiptId: <id>
toolchainReceiptGeneratedAt: <timestamp>
toolchainReceiptStatus: CACHED_PASS | REFRESH_REQUIRED | BLOCKED
contextSourceLedger: <actual path>
commonLoreAndDesignRead: COMPLETE | INCOMPLETE
seaProductionRead: COMPLETE | INCOMPLETE
roleSourceRead: COMPLETE | INCOMPLETE
latestOwnerDecisionsChecked: yes/no
contextStatus: CONTEXT_READY | CONTEXT_READY_LIMITED | CONTEXT_BLOCKED
requiredLanes:
  tripoStudio: CACHED_PASS | LIVE_REFRESH_PASS | NOT_REQUIRED
  tripoApiSdk: CACHED_PASS | UNFUNDED | UNAVAILABLE | NOT_REQUIRED
  tripoOfficialCli: CACHED_PASS | UNFUNDED | NOT_EXPOSED | NOT_REQUIRED
  houdini: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  blender: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  threejs: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
  realGpu: CACHED_PASS | REFRESH_REQUIRED | NOT_REQUIRED
providerSpendPlannedThisSession: yes/no
fullBootstrapRequired: yes/no
blockingIssues: []
```

These are source/decision declarations, not machine proof of comprehension. Independent review still checks that actual work follows them.

## Full-bootstrap invalidation triggers

Refresh the affected lane when:

- receipt is missing, unreadable, expired or schema-invalid;
- operating system/workstation identity changes;
- a required package/lock/tool root is missing or changed unexpectedly;
- a required provider credential is absent or its live authentication fails;
- provider API base/region or official CLI changes;
- Houdini version/license changes, including Apprentice-to-Indie;
- Blender major version/add-on set changes;
- Node/Python major version changes;
- Three.js/runtime lock or real-GPU/browser route changes;
- a cached tool check fails;
- the owner requests clean re-onboarding.

Do not expand one unavailable provider into full workstation reinstallation. Reading a new lore document invalidates affected context, not tool installation.

## Ticket-lane rule

A chat does not EXECUTE verification for tools it will not use. It still reads the common project lore/design/runbook packet and the applicable role instructions.

Examples:

- documentation/schema ticket: provider/DCC execution NOT_REQUIRED, common context still required;
- topology repair: cached runtime/GPU checks plus world/map/topology context;
- animated fixture: current applicable provider/DCC/animation policies and receipts;
- paid task: live pre-spend refresh regardless of cached startup.

## Historical #451 ordering

The chained-skeleton pilot followed the core dungeon correction and independent verification; onboarding itself did not authorize generation. For current status and scope, fetch live #451/PR #460 and later owner decisions. Do not reopen completed work from this historical schedule.

## Proceed, do not endlessly re-plan

Preserve current work while repairing context. After the applicable receipts, source decisions and execution gates pass, proceed with authorized work. Stop only affected scope when sources, approval or access are genuinely missing. No source reset, provider charge, merge or deployment is authorized by completing catch-up.
