# Shared Game Production Playbooks

This infrastructure location stores two separate but related production systems:

1. **Universal AI Game Production** — a genre-agnostic pipeline for 2D, 3D, web, mobile, desktop, multiplayer, simulation, shooter, strategy, racing, VR/XR and hybrid/nested games.
2. **SoulDrifter Production** — the project-specific multi-LLM harness, lore/source context, character/Tripo pipeline, combat/animation/VFX rules, ticket workflow and current SoulDrifter decisions.

These are the existing shared project foundations, not documentation owned by Claude or a particular chat. The universal playbook remains reusable and free of SoulDrifter-specific canon. SoulDrifter consumes that core while preserving its own lore, tickets, branches, worktrees and acceptance rules.

## Canonical GitHub destination

`Chelestra-Sea/infra/playbooks/game-development/`

Chelestra-Sea is the Nexus realm for networking, communication, integration and fleet/infrastructure orchestration. These playbooks live in infrastructure because they coordinate multiple LLMs, tools, repositories, worktrees, providers and production workflows rather than belonging to one game source folder.

## Start here — any agent host

For any game, read `universal-game-production/START_HERE.md`, its current corrections and `PROJECT_CONTEXT_LOADING_POLICY.md`, then the selected project overlay.

For SoulDrifter, the common route is:

```text
souldrifter-production/START_HERE.md
-> PROJECT_CONTEXT_READSET.md and actual underlying lore/design/runbooks
-> CURRENT_DIRECTION.md
-> NARRATIVE_AUTONOMY_AND_DGC_CONTINUITY_POLICY.md
-> assigned kickoff + live issue/PR/worktree state
-> role-specific policy/config/template reads
-> source-backed context and execution receipts
-> authorized work + independent review
```

The complete tooling/setup instructions, specification templates, build workflow, asset/environment pipelines and verification records remain in the two shared packages. Some underlying lore/game-bible/runtime sources remain at their original indexed project paths; follow the source map rather than create inconsistent duplicate copies.

Claude-specific bridges/handoffs are host adapters to these common sources. Codex, M3 and other agents need the same project context. No source reading is satisfied merely by seeing its filename; cached installations are not cached understanding.

The current SoulDrifter narrative policy authorizes source-backed autonomous draft-quest revisions and identifiable Death Gate Cycle continuity callbacks, with final owner review and separate rights/release controls. That project policy does not impose its lore on unrelated games.

## Local use

Read from the current published documentation ref (`infra/game-production-playbooks` unless a later decision replaces it), resolving its commit. Documentation may not yet be merged into the gameplay base. Read it without switching/resetting another worker's checkout or importing unrelated changes.

When the material is merged or appropriately synchronized locally, it uses the same repository-relative paths. See `LOCAL_SYNC.md`. Do not assume a remote documentation edit has automatically reached every running agent.
