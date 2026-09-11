ole boundary

- **Orchestrator:** audits, routes, coordinates, and owns the execution board.
- **Worker:** implements one ticket in one worktree and stops at `IMPLEMENTED_UNVERIFIED`.
- **Verifier:** independently re-derives requirements and alone may mark them `VERIFIED`.

## Generic-core boundary

Do not write game-specific lore, class names, proprietary mechanics, or asset IDs into the universal core.
Put those in the project overlay.
```

---

## `source/WORKFLOW.md`

SHA-256: `f612ad0d2d481b0f253466f1a211dfb00cfba07e18253c4e40f2dfd4ef66d8d7`

```markdown
# Universal Game Production Workflow

## Phase A — Project bootstrap

1. Create/validate `project-profile.json`.
2. Select genre/platform modules.
3. Create the project overlay/canon index.
4. Verify repository/worktrees/tracker access.
5. Run a global audit of existing work.

## Phase B — Global audit

Classify every open ticket/PR:
- `CONTINUE_VALID`
- `REVALIDATE`
- `REWORK_REQUIRED`
- `SUPERSEDED_OR_LEGACY`
- `BLOCKED`
- `OWNER_DECISION_REQUIRED`
- `CLOSE_CANDIDATE_AFTER_VERIFICATION`

Create:
- dependency graph;
- parallel-safety map;
- worktree map;
- provider/budget risk map;
- NOW/NEXT/BLOCKED board.

## Phase C — Requirement compilation

Turn prose into atomic requirements with:
- stable ID;
- source;
- owner;
- dependencies;
- automated checks;
- runtime checks;
- visual/audio evidence;
- device/platform checks;
- verifier criteria.

Expand hidden dependencies. Examples:
- a door implies opening, collision, navigation, interaction, destination, animation, audio, and traversal proof;
- a gun implies model, sockets, aim, recoil, fire modes, ammo, hit logic, animation, VFX, audio, UI, networking, and balance;
- an aircraft implies flight model, controls, instruments, camera, damage, terrain/weather, AI/autopilot, performance, and replay/telemetry where required.

## Phase D — Vertical slice

Build the smallest complete experience that proves the riskiest loops.
Do not batch-produce hundreds of assets before one complete loop works.

## Phase E — Dependency-order implementation

Typical order:

`design contract -> data/schema -> core runtime -> placeholder proof -> production assets -> integration -> tests -> device/performance -> independent QA`

## Phase F — Producer gate

Workers run checks, capture evidence, update the ledger, commit atomically, and stop at `IMPLEMENTED_UNVERIFIED`.

## Phase G — Independent verification

Verifier independently re-derives requirements and returns PASS / FAIL / NEEDS_EVIDENCE.

## Phase H — Done/release gates

A ticket is not done because it builds.
It must pass the project's completion ledger, platform/device matrix, performance budgets, save/network compatibility, and owner/release rules.
```

---

## `source/adapters/chatgpt-codex/BOOTSTRAP.md`

SHA-256: `5db80c4e5b133d23f5727a47ead3bb4b6e9379a81a3a6b1c634ba45e001567fa`

```markdown
# ChatGPT / Codex Adapter

Use repository instructions plus universal core and project overlay. Connected tracker access and local workspace access are separate gates; verify both.
```

---

## `source/adapters/claude/BOOTSTRAP.md`

SHA-256: `70ce2307d65b5fd26492cbb549e8418bedceabc451de5da4199725e8eab89c98`

```markdown
# Claude Code Adapter

Claude-specific instructions point to START_HERE, project-profile.json and the project overlay. Do not create a separate Claude-only canon or ticket state.
```

---

## `source/adapters/m3/BOOTSTRAP.md`

SHA-256: `37872c23f6534ae256da5299d46e7dbb4add2c23cdd8283068d7846c7890adb9`

```markdown
# M3 Adapter

Use the universal root files and project profile/overlay. M3 may create dynamic teams, but every subagent must load START_HERE and return a Context Receipt. Inspect built-in agent capabilities rather than assuming them from labels.
```

---

## `source/agents/00-production-orchestrator.md`

SHA-256: `a825076ecfc4556bc9a18a3c2c836419b1a505d6196e9103db1a9c48ee39f291`

```markdown
# Agent — Production Orchestrator

Owns project audit, dependency graph, worker routing, worktree coordination, budget/risk tracking, verifier assignment, and owner-ready queue.

Never treats worker summaries as proof. Never merges/deploys without project authorization.
```

---

## `source/agents/01-requirements-canon-auditor.md`

SHA-256: `d291a4ba34c74c3f9681c512c248f383ed1bcad8620ca2300225aa7ac59fc7fc`

```markdown
# Agent — Requirements / Canon Auditor

Turns product vision, design docs, tickets, code and current owner decisions into atomic requirement graphs.

Checks for hidden dependencies and detects conflicts between project overlay, code, tickets, and older docs.
```

---

## `source/agents/02-game-design-systems.md`

SHA-256: `e09a2123088d19dc90d11bca5798aa4f6aed99d6b78bbad315db61085d4c6381`

```markdown
# Agent — Game Design / Systems

Defines player loops, rules, progression, economy, difficulty, game feel, balance variables, failure states, telemetry questions, and vertical-slice goals.

Produces data contracts rather than vague prose where possible.
```

---

## `source/agents/03-code-runtime.md`

SHA-256: `eae4b7d325ea2513af118ad7c8d3351d4b0e0981cc3b31b814b009123a7968ed`

```markdown
# Agent — Code / Runtime

Owns engine architecture, state machines, data loading, gameplay integration, input, cameras, rendering boundaries, tests, build health, and runtime debugging.
```

---

## `source/agents/04-2d-art-ui.md`

SHA-256: `42ab88ed48b01db3d3eac75267fdfe1bfc7da81e49211ebe99071ee53f8c1af3`

```markdown
# Agent — 2D Art / UI

Owns concept art, sprites, icons, UI assets, atlases, typography, layout, responsive design, visual consistency, export settings, and accessibility-safe presentation.
```

---

## `source/agents/05-3d-asset.md`

SHA-256: `768c5a6184ca61779748069889393e4d2a8f194d88bbe94e781c9cf42c60f1fe`

```markdown
# Agent — 3D Asset

Owns modeling/generation, topology, UVs, textures, materials, LODs, pivots, scale, sockets, collision, export, provenance, and runtime asset validation.
```

---

## `source/agents/06-animation-technical-art.md`

SHA-256: `1fc518398def010fcebb6a2f5e63f66c3189a5553c9712f5016baacac3542c6b`

```markdown
# Agent — Animation / Technical Art

Owns rigs, retargeting, action contracts, root motion, IK, additive layers, interactions, event markers, deformation QA, runtime mixers/state machines, and animation performance.
```

---

## `source/agents/07-vfx-lighting-materials.md`

SHA-256: `e1ec4a2110e27a046a395096d3d101cbd861dac1b2177eda7dfc6d7b528eff3a`

```markdown
# Agent — VFX / Lighting / Materials

Owns shaders, particles, decals, trails, post-processing, lighting, material budgets, pooling, target-device fallbacks, and gameplay readability.
```

---

## `source/agents/08-gameplay-ai-physics-simulation.md`

SHA-256: `04986b828429075f920439e7ac37ae31e88e244c70c6d4cf3476d6ce24f8820b`

```markdown
# Agent — Gameplay AI / Physics / Simulation

Owns agents, navigation, steering, behavior trees/state machines, physics, vehicles, environmental simulation, determinism, tuning, and debug instrumentation.
```

---

## `source/agents/09-network-backend.md`

SHA-256: `802b05d5b7cd9e5a54dd1690195b44cbceb5763e779e27bfe35ba647106dba6c`

```markdown
# Agent — Networking / Backend

Owns authoritative state, replication, lobbies, matchmaking, persistence, identity, services, anti-cheat boundaries, moderation hooks, scalability, and online failure recovery.
```

---

## `source/agents/10-audio-narrative-localization.md`

SHA-256: `5456ea50808d48ec35bf81d4565ad4abbdd31196bc17af06297c7b996dd7bb36`

```markdown
# Agent — Audio / Narrative / Localization

Owns music, SFX, voice, dialogue, subtitles, narrative data, lip-sync hooks, localization keys, text expansion, accessibility audio, and runtime mixing.
```

---

## `source/agents/11-build-release-liveops.md`

SHA-256: `5016efac45fce51cb538bbae38a9ef5a347f707e073b4e7421f8b9ec9c4b9b09`

```markdown
# Agent — Build / Release / Live Ops

Owns CI/CD, packaging, environments, stores/hosting, versioning, migrations, observability, analytics, crash reporting, rollback, patches, and live configuration.
```

---

## `source/agents/12-independent-verifier.md`

SHA-256: `7d6c54f35783a12e4f5e6793727820ef08d415df2b05fbcf1767676ca3d8961d`

```markdown
# Agent — Independent Verifier

Re-derives requirements, runs fresh tests, inspects current evidence and devices, and attempts to prove the producer wrong.

Only this role may move work from IMPLEMENTED_UNVERIFIED to VERIFIED.
```

---

## `source/agents/13-performance-device-verifier.md`

SHA-256: `3e30bd697aaa804d44e19323aa54a109fe0e4bfcc1f3d9dce7cc32d06a81bc81`

```markdown
# Agent — Performance / Device Verifier

Verifies actual renderer/device/platform, frame time, memory, loading, network conditions, input latency, thermal behavior, GPU/API limits, and fallback quality.
```

---

## `source/config/agent-routing.json`

SHA-256: `a2e33fc308e3f8419c99bd93035e5708f3c6a091bfcd87bce81f640fb639288e`

```json
{
  "schemaVersion": 1,
  "routingHints": {
    "design": [
      "requirements-canon-auditor",
      "game-design-systems",
      "independent-verifier"
    ],
    "2d": [
      "2d-art-ui",
      "code-runtime",
      "independent-verifier"
    ],
    "3d": [
      "3d-asset",
      "animation-technical-art",
      "code-runtime",
      "performance-device-verifier",
      "independent-verifier"
    ],
    "simulation": [
      "gameplay-ai-physics-simulation",
      "code-runtime",
      "performance-device-verifier",
      "independent-verifier"
    ],
    "multiplayer": [
      "network-backend",
      "code-runtime",
      "independent-verifier"
    ],
    "release": [
      "build-release-liveops",
      "independent-verifier"
    ]
  }
}
```

---

## `source/config/context-version.json`

SHA-256: `9feae450bf26d9574f3c29a7968ae63a93ff33f0e2d37bb36dd8777b905e82b0`

```json
{
  "schemaVersion": 1,
  "contextVersion": "2026-08-23-universal-game-v1",
  "entryPoint": "START_HERE.md",
  "compatibleModels": [
    "minimax-m3",
    "claude",
    "chatgpt-codex",
    "other"
  ],
  "rule": "Onboarding, project profile, project overlay and Context Receipt must pass before editing."
}
```

---

## `source/docs/01_GAME_DESIGN_AND_VERTICAL_SLICE.md`

SHA-256: `1b8ad1e4741ff048e9cc92dd37e23693c8ed622163b17d8ff1ead836e29dc988`

```markdown
# 01 — Game Design and Vertical Slice

Define the target player experience, primary loop, session loop, progression loop, failure/recovery, difficulty philosophy and differentiators.

The vertical slice must prove the riskiest complete loop on a target platform. It includes production-representative integration, not only disconnected prototypes.
```

---

## `source/docs/02_REQUIREMENTS_AND_TICKET_COMPILER.md`

SHA-256: `f546f8f2e377846a2a385f93d710387668e4e0f07013645cbdfb2dbdccc6babd`

```markdown
# 02 — Requirements and Ticket Compiler

Every ticket becomes a machine-readable contract. The compiler must derive expected matrices independently, expand hidden dependencies, attach test/evidence requirements and preserve owner decisions.
```

---

## `source/docs/03_CODE_RUNTIME_ARCHITECTURE.md`

SHA-256: `baa48d3e2cf6c1a436274df20919ee32f0d8e6eee5c5fa7a20b34b1b273ed998`

```markdown
# 03 — Code and Runtime Architecture

Define engine boundaries, data schemas, dependency direction, state machines, module loading, input/camera, content registries, debug instrumentation, testing seams and error recovery.

Avoid one-off logic hidden inside scene code when data/action contracts can be shared.
```

---

## `source/docs/04_2D_ASSET_PIPELINE.md`

SHA-256: `454ebfc3e6af34010ab26c9b4b1c660ff0851c56397bd0d3dbed15527ab1833a`

```markdown
# 04 — 2D Asset Pipeline

Concept/style guide -> source generation/authoring -> cleanup -> layers/slices -> animation frames/rig -> atlas/export -> compression/filtering -> runtime integration -> responsive/device QA -> provenance.
```

---

## `source/docs/05_3D_ASSET_PIPELINE.md`

SHA-256: `63702b286a54b97aceaf92c583ba3a8ec511767ed841290b76c52aad1a627bb4`

```markdown
# 