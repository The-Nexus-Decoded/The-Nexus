
---

## `source/skills/requirement-expansion/SKILL.md`

SHA-256: `6f1f9ba019b105422cb7d13c65f051af7d32dbe8b8db373a365607dc54603d8f`

```markdown
---
name: requirement-expansion
description: Expand prose deliverables into dependency-aware, testable contracts.
---
Ask what must exist, connect, react, persist, replicate, render, sound, perform and be proven. Hidden dependencies become explicit rows.
```

---

## `source/skills/save-migration/SKILL.md`

SHA-256: `b033e9a1d30fe0a5659a440ab727d6e429542b7b3cb6b3f10bacea0a3f768199`

```markdown
---
name: save-migration
description: Version save data and prove creation, load, migration, corruption recovery and rollback compatibility.
---
Never silently discard player state because schemas changed.
```

---

## `source/skills/session-context-receipt/SKILL.md`

SHA-256: `67e93000d34b945205bdade6da646cd1c88701d4f2f0fd6563c62cbf85a76834`

```markdown
---
name: session-context-receipt
description: Reconstruct project context and prove it before editing.
---
Read START_HERE, project profile, overlay, ticket/PR/state, branch/worktree and selected modules. Produce/store the Context Receipt. Fail closed when stale or incomplete.
```

---

## `source/skills/spatial-connectivity/SKILL.md`

SHA-256: `3deda1b1018a94308fb262ec84ec9ebd7a8f66e898c56db90fd1d8da0be84684`

```markdown
---
name: spatial-connectivity
description: Validate rooms, roads, corridors, portals, tracks, flight paths and navigable relationships as connected graphs.
---
Object existence never proves traversable connectivity.
```

---

## `source/skills/ticket-intake/SKILL.md`

SHA-256: `20c603248f3a910b34f09c1175a61c64ae8e473deaabfa1fe1de7e8b29f6e159`

```markdown
---
name: ticket-intake
description: Start or resume one ticket from live issue/PR/repo state.
---
Read all current comments, identify latest direction, load ticket state, inspect branch/worktree and baseline before editing.
```

---

## `source/skills/vertical-slice/SKILL.md`

SHA-256: `6b8cf45df6aa229f3b3a02af2599e4fea029bd680cdc859255789560ad3a638c`

```markdown
---
name: vertical-slice
description: Prove the riskiest complete player loop before scaling content production.
---
Include start, interaction/gameplay, feedback, failure/recovery, save/reload, target device and performance baseline.
```

---

## `source/skills/visual-audio-qa/SKILL.md`

SHA-256: `7c4f0bce284cfba5380838763248436046fa0c531d4a4d793464799a1cd5cf7a`

```markdown
---
name: visual-audio-qa
description: Independently review fresh visual/audio evidence at player-relevant distance and on target output conditions.
---
Wide + close, normal speed, current commit, correct platform, no stale evidence.
```

---

## `source/skills/workspace-auto-discovery/SKILL.md`

SHA-256: `26cd818223b64a1996686ad81469770c2cd2220306e09cae1aa393f91b43316a`

```markdown
---
name: workspace-auto-discovery
description: Find and reuse existing repositories/worktrees instead of duplicating in-progress work.
---
Use git top-level, remotes, worktree list, branch/status/HEAD, tracker mapping and handoff state. New worktrees are a last resort.
```

---

## `source/templates/PROJECT_OVERLAY.template.md`

SHA-256: `516d85340a8d4bf330f8eddde9a3be8b1deca0259ccdf1a0928726f9d53ba261`

```markdown
# <Project> Overlay

## Canon priority
1. latest owner direction
2. current code/data
3. approved project docs/issues
4. this overlay
5. universal core examples

## Project identity
- title:
- player promise:
- art direction:
- engines/tools:
- platforms:
- selected modules:

## Binding mechanics

## Paths/worktrees

## Provider and spending rules

## Performance targets

## Release/deploy rules
```

---

## `source/templates/completion-ledger.template.json`

SHA-256: `43f83587064f648a8b4b322b1645f6e702dfdd0a095bd81a89adc844a01f239e`

```json
{
  "schemaVersion": 1,
  "ticket": 0,
  "ticketStatus": "NOT_STARTED",
  "requirements": [
    {
      "id": "REQ-001",
      "description": "Atomic requirement",
      "priority": "critical",
      "dependencies": [],
      "modules": [],
      "producer": null,
      "status": "NOT_STARTED",
      "automatedChecks": [],
      "runtimeChecks": [],
      "evidence": [],
      "verifier": null,
      "verification": {
        "status": "NOT_RUN",
        "commit": null,
        "notes": null
      },
      "blockers": []
    }
  ]
}
```

---

## `source/templates/context-receipt.template.json`

SHA-256: `3448f4095d5803e20d8c4e3fe88d7e4f9beb0ed2af39d1522740e0c180c4d4a2`

```json
{
  "schemaVersion": 1,
  "contextVersion": "2026-08-23-universal-game-v1",
  "platform": "",
  "role": "",
  "projectId": "",
  "ticket": "",
  "repository": "",
  "branch": "",
  "worktree": "",
  "projectProfileLoaded": false,
  "projectOverlayLoaded": false,
  "selectedModules": [],
  "latestTicketDirectionChecked": false,
  "blockingConflicts": [],
  "plannedScope": ""
}
```

---

## `source/templates/project-profile.template.json`

SHA-256: `e361f367a9b2f975067d51757a6bbbc999df18c572af01e7d6094340e81733cd`

```json
{
  "schemaVersion": 1,
  "projectId": "new-game",
  "title": "New Game",
  "repository": {
    "identity": "owner/repository",
    "mainCheckoutHint": "",
    "tracker": "GitHub"
  },
  "engines": [
    {
      "name": "Three.js",
      "version": "",
      "role": "runtime"
    }
  ],
  "platforms": [
    "web-desktop"
  ],
  "gameModes": [
    {
      "id": "main",
      "name": "Main Game",
      "camera": "TBD",
      "dimension": "3D",
      "multiplayer": "single-player",
      "modules": [
        "3D_GAME",
        "MOBILE_WEB"
      ]
    }
  ],
  "selectedModules": [
    "3D_GAME",
    "MOBILE_WEB"
  ],
  "overlay": {
    "root": ".project-harness",
    "canonIndex": ".project-harness/PROJECT_CANON_INDEX.md"
  },
  "performanceBudgets": {
    "targetFps": 60,
    "notes": "Set per target platform"
  },
  "providers": {
    "paidOperationsRequireApproval": true,
    "budgetLedger": ".agent-state/provider-budget.json"
  },
  "release": {
    "ownerApprovalRequired": true
  }
}
```

---

## `source/templates/provider-budget.template.json`

SHA-256: `526311f8a6dc1598df75322cac3bdab9ed18f79e39343e5f94fc807388a44fa2`

```json
{
  "schemaVersion": 1,
  "currency": "credits",
  "startingBalance": 0,
  "protectedFloor": 0,
  "approvedSpend": 0,
  "actualSpend": 0,
  "operations": []
}
```
