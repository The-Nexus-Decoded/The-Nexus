# Universal Game Production — Full Workstation Onboarding

## Frequency

This is a **one-time workstation/template bootstrap**, not a per-chat checklist.

Run it again only when the cached receipt is invalidated by a major change such as:

- workstation/OS change;
- receipt expiry/schema change;
- provider SDK/API/region/authentication change;
- DCC/engine major-version or license change;
- Node/Python major-version change;
- GPU/browser/device-path change;
- project owner requests a clean re-onboarding.

Normal chats use `SESSION_FAST_START.md`.

## Gate A — Repository, tracker and worktrees

Prove the selected repository/worktree, live ticket/PR access, freshness, writable storage, and work preservation.

Never create duplicate worktrees or discard unexplained changes.

## Gate B — Persistent toolchain state

Create a project-agnostic local toolchain root outside Git, for example:

`H:\CodexData\game-production-toolchain\`

Store sanitized receipts beneath:

`H:\CodexData\game-production-toolchain\receipts\`

Receipts include versions, paths, capability checks, timestamps and IDs—but never secret values.

## Gate C — Selected provider modules

Load only provider adapters selected by the project profile.

Each provider module must define:

- official SDK/API/package/repository;
- region/base URL;
- secret environment-variable names;
- read-only authenticated test;
- capabilities;
- local staging/download paths;
- price/balance/spend gate;
- task polling/retry rules;
- provenance/hash/rollback requirements;
- optional official CLI/MCP discovery rules.

A provider's name in a playbook is not connection proof.

## Gate D — DCC/engine/runtime modules

Verify only tools selected by the project profile, such as:

- Houdini/Houdini KineFX;
- Blender;
- Unity/Unreal/Godot/Three.js or another runtime;
- glTF/FBX/USD/VAT/compression tools;
- real target GPU/device/browser;
- audio/video/media utilities;
- local AI/image/motion providers.

## Gate E — Platform/agent context propagation

For M3, Claude Code, ChatGPT/Codex or another host, run one harmless read-only subagent/tool dispatch proving repository, harness, profile and ticket access.

## Full onboarding receipt

```text
UNIVERSAL GAME TOOLCHAIN ONBOARDING RECEIPT
schemaVersion: <version>
workstationId: <sanitized id>
repositoryAndTracker: PASS/FAIL
persistentStateRoot: <path>
selectedProviderModules:
  - <module + PASS/FAIL>
selectedDccEngineModules:
  - <module + PASS/FAIL>
realTargetDevices:
  - <device + PASS/FAIL>
agentContextPropagation: PASS/FAIL/NOT_APPLICABLE
receiptPath: <path>
blockingIssues: []
result: PASS|BLOCKED
```

After PASS, all future chats use the cached receipt until invalidated.