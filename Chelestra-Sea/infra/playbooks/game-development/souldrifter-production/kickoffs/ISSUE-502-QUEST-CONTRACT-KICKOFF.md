# #502 — Quest Definition and Compiler Worker Kickoff

Revision: soul-context-v1 / 2026-09-05
Repository: `The-Nexus-Decoded/The-Nexus`

## Mandatory project comprehension

Before coding or choosing fixture rules, read the full shared contract:

`Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/PROJECT_CONTEXT_READSET.md`

Load it from the current `infra/game-production-playbooks` commit. Complete all common SEA production and actual game/lore/design reads plus its #502 role additions. This includes both universal and SoulDrifter playbooks; the actual GAME_BIBLE, CHARACTER_AND_STORY_SYSTEM, DEATH_GATE_MAGIC_REFERENCE, CLASS_PROGRESSION_CODEX, LEVEL_01, BROWSER_GAME_DESIGN and ARCHITECTURE; live #428/#429/#430/#442/#443 decisions; relevant archived source blocks; current Heartvale campaign and map/region context; and the framework/config/template sources. A schema worker is not exempt from knowing the game.

Read governing AGENTS.md, current #502 and every comment, #501 sequencing and #503/#507/#499/#500 interfaces. Read latest #509/#512 audit and file-ownership notes so this parallel worker does not interfere with the active environment work. Claude also reads its bridge/transition sources.

Follow source links to actual content, complete truncated reads, classify conflicts/proposals and record refs/hashes/coverage. A previous summary or cache receipt is not source comprehension. Use the shared context receipt to explain world/region, starter-phase restrictions, mechanics, production rules and exact isolated scope before implementation.

## Workspace and current phase

Use cached toolchain onboarding. Discover/reuse an existing #502 branch/worktree without resetting it; otherwise use an isolated H: worktree from the current accepted QA baseline containing the verified #511 checkpoint. Read documentation from its own ref rather than merging the playbook branch into code. Do not edit #512 or another worker's files, and do not repeat completed backup work merely because an old comment says it was blocked.

Current milestone: minimum coherent reusable definition/validation contracts for the early Heartvale pilot while the environment remains the primary active work. Broader compiler acceptance still belongs to #502 later. Do not build the entire quest system or write final campaign canon under this milestone.

## Owned deliverable

Implement versioned immutable quest/chapter definitions, stable IDs/localization keys, safe prerequisite/condition expressions, objective graph references, actor/location/socket/item/dialogue/media/reward/faction/world-state references, inventory reservation and recovery/migration declarations, and useful validation diagnostics/tests needed by the pilot.

Read actual runtime and #503/#507 contracts before defining duplicate types. Agree ownership of shared schema/interface files. Express region rules through validation profiles, not hard-coded Heartvale names/coordinates in a generic compiler. No unrestricted eval or content-authored executable code.

Use generic clearly provisional fixtures, not invented lore presented as approved content. Final quest names/dialogue/numeric rewards remain owner-reviewable. If inventory capacity, ancestry or progression sources disagree, resolve the latest applicable owner decision and document the conflict rather than hard-coding an old value.

## Evidence and boundaries

Demonstrate a generic chapter compiling without Heartvale imports; editable text without service changes; deterministic IDs/hashes; valid and invalid prerequisite/objective/reference cases; required/optional gating and missing-source diagnostics. Preserve a separate remaining-work list for full compiler scope. Independent review is required for claimed completed milestones.

No environment geometry, avatar/controller, runtime quest-state engine, award service, quest UI, provider generation or final lore authoring belongs in this PR. No spend, merge, deployment, resets or weakening existing tests.

## Start prompt

```text
Start #502 using ISSUE-502-QUEST-CONTRACT-KICKOFF.md from the current
infra/game-production-playbooks branch in the SoulDrifter SEA kickoffs.
Load PROJECT_CONTEXT_READSET.md, the actual common lore/design/runbooks,
and the #502 role sources. Return source coverage, comprehension,
conflicts and isolated scope. Then implement the authorized pilot-sized
quest definition/validation milestone in its own worktree. Preserve the
active #512 environment work and all checkpoints. No new canon, provider
spend, merge or deployment.
```
