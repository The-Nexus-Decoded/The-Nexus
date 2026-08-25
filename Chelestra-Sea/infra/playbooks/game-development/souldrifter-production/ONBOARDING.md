# SoulDrifter Multi-LLM Onboarding

## Execution frequency

This is the **full workstation bootstrap**, not a ritual repeated in every new chat.

Run it:

- once on the production workstation;
- again only when `SESSION_FAST_START.md` or `config/onboarding-cache-policy.json` reports an invalidation trigger;
- after major changes such as the Houdini Apprentice-to-Indie upgrade, Tripo SDK/API-region change, secret/authentication failure, Blender major-version/add-on change, Node/Python major-version change, or real-GPU/browser-path change.

Every normal M3, Claude Code, or Codex chat uses the cached receipts through `SESSION_FAST_START.md`.

## Authoritative local workspace

Main repository checkout:

`H:\Projects\AI_Tools_And_Information\The-Nexus`

SoulDrifter game root:

`H:\Projects\AI_Tools_And_Information\The-Nexus\Arianus-Sky\projects\games\SoulDrifterWeb`

Ticket worktrees belong under:

`H:\CodexData\.codex\worktrees\<issue>\...`

Persistent local toolchain state:

`H:\CodexData\souldrifter-toolchain\`

Repository:

`The-Nexus-Decoded/The-Nexus`

## Hard rules

- Do not create a fresh clone when the existing checkout/worktree exists.
- Do not silently use another The-Nexus copy.
- Do not work from Downloads/Desktop/temp copies.
- One ticket = one branch + one dedicated worktree.
- Never store credentials/tokens in Git, prompts, screenshots, evidence, or logs.
- Full bootstrap configures tools only; it does not submit paid provider tasks or generate ticket assets.
- Ticket-specific provider work still requires exact live pricing/balance and owner approval.

---

# Gate A — Automatic workspace/worktree discovery

Read `AUTO_DISCOVER_WORKSPACE.md` and prove:

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
git remote -v
git worktree list --porcelain
```

Reuse existing in-progress worktrees. Do not reset or discard unexplained work.

---

# Gate B — GitHub connection

Prove live read access to `The-Nexus-Decoded/The-Nexus`, including assigned issue, all comments, related PR/reviews, and live head state.

Local Git authentication does not prove tracker access, and tracker access does not prove the correct local worktree.

---

# Gate C — Persistent production toolchain bootstrap

Execute `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` once for the workstation-required lanes.

This includes:

- active host-LLM image-generation capability where available;
- official Tripo v3 SDK/API installation and authenticated read-only balance check;
- optional exact first-party Tripo CLI discovery, never the old unverified generic `tripo-cli` package;
- optional Tripo MCP/Blender integration;
- Houdini version/build, Python/HOM, KineFX, license, file format, and export smoke test;
- Blender version/Python/add-ons/import/export smoke test;
- Three.js/GLB/runtime tools;
- real-GPU browser path;
- audio/media utilities;
- controlled staging, asset registry, hashes, provenance, and rollback.

The official Tripo provider module is defined in:

- `config/tripo-provider.json`
- `scripts/tripo/tripo-readonly-check.mjs`
- the shared local tool root under `H:\CodexData\souldrifter-toolchain\tripo-v3\`

A provider name in documentation is not a connection. The bootstrap must perform a live sanitized authenticated check and write a local receipt.

---

# Gate D — Platform/agent discovery

## MiniMax M3

Explore, Worker, Coder, Verifier, and General may be product defaults. Do not infer hidden settings from names. Run one harmless read-only dispatch proving repository, harness, and ticket context propagation.

## Claude Code and ChatGPT/Codex

Verify the same repository/worktree, live GitHub, context version, ticket state, and work claims. Model-specific memory is an adapter, not project truth.

---

# Persistent receipt locations

```text
H:\CodexData\souldrifter-toolchain\receipts\production-toolchain.json
H:\CodexData\souldrifter-toolchain\receipts\tripo-provider.json
```

Receipts contain versions, paths, timestamps, capability PASS/FAIL state, and receipt IDs—but never secret values.

## Full onboarding receipt

```text
SOULDRIFTER ONBOARDING RECEIPT
contextVersion: <version>
platform: <M3|Claude Code|ChatGPT/Codex>
workstationId: <sanitized identifier>
workspaceRoot: <path>
repositoryIdentity: The-Nexus-Decoded/The-Nexus
repositoryRemote: <remote>
worktreeDiscovery: PASS/FAIL
githubLiveRead: PASS/FAIL
agentContextPropagation: PASS/FAIL/NOT_APPLICABLE
productionToolchainReceiptId: <id>
productionToolchainReceiptPath: <path>
tripoProviderReceiptId: <id>
houdiniLicense: <Apprentice|Indie|other>
blender: PASS/FAIL
threejsRuntime: PASS/FAIL
realGpu: PASS/FAIL
blockingIssues: []
result: PASS|BLOCKED
```

After this passes, new chats use `SESSION_FAST_START.md`; they do not rerun this full process unless invalidated.