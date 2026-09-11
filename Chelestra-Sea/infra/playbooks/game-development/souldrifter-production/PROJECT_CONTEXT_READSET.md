# SoulDrifter — Mandatory Project Catch-up Readset

Revision: soul-context-v1
Scope: EVERY new SoulDrifter agent, including #510 NPC production, #502 framework code, #512 testing/environment work, and independent reviewers.

## Why this is required

A ticket-only prompt, the title PROJECT_CANON_INDEX, or a valid machine/toolchain receipt is not sufficient project catch-up. The agent must read the actual lore/game-design and production sources before choosing designs, writing code, preparing generation prompts or making canon claims. This document is a source-reading contract, not a replacement game bible and not evidence that an agent has already read its sources.

## 0. Resolve the source roots and current state

Repository: `The-Nexus-Decoded/The-Nexus`.

Roots used below:

- **SEA** = `Chelestra-Sea/infra/playbooks/game-development/`
- **U** = `SEA/universal-game-production/`
- **S** = `SEA/souldrifter-production/`
- **G** = `Arianus-Sky/projects/games/SoulDrifterWeb/`

The published reading package is on `infra/game-production-playbooks` unless a newer live project decision explicitly replaces that source. Resolve that ref to a commit and record it. Do not assume it is on main/qa or present in an older feature worktree. Read from the correct ref without checking an active worker out to it or merging unrelated infrastructure work.

The gameplay base is separately resolved from live QA/PR/worktree state. Preserve an existing assigned branch and local-only work. A remote QA commit does not contain all current #512 WIP merely because #511 merged. Verify the completed checkpoint receipts instead of repeating the whole backup or treating an old unmerged comment as current.

Read governing AGENTS.md files from repository root through the target path before writing. Claude also reads applicable CLAUDE.md, `.claude/handoffs/souldrifter-game-research-transition.md`, and S `handoffs/CLAUDE-GAME-RESEARCH-TRANSITION.md`. All hosts still load this same shared readset; lore catch-up is NOT exclusive to Claude or research agents.

## 1. Common SEA production reading — all roles

Read these files in full, following their current mandatory references:

**Shared/general production**
- SEA `README.md` and `LOCAL_SYNC.md`.
- U `README.md`, `START_HERE.md`, `PLAYBOOK.md`, `PLAYBOOK_V2_CORRECTIONS.md`, `WORKFLOW.md`.
- U `PROJECT_CONTEXT_LOADING_POLICY.md`.

**SoulDrifter overlay**
- S `START_HERE.md`, `SESSION_FAST_START.md`, `PROJECT_CANON_INDEX.md`, `WORKFLOW.md`, `CURRENT_DIRECTION.md`.
- S `AUTO_DISCOVER_WORKSPACE.md`, `ONBOARDING.md`, `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` and `config/onboarding-cache-policy.json`.
- S `BROWSER_RUNTIME_ROADMAP.md`.

Reading onboarding/preflight instructions is mandatory context; EXECUTING installs/full smoke tests is conditional on the actual toolchain cache. Never reinstall all tools just because the new agent has to learn the project. Conversely, a cached installation does not exempt a new agent from reading lore.

Follow correction/supersession rules. Universal production methods remain genre-agnostic; SoulDrifter-specific lore, mechanics, usage modes and owner constraints come from the project overlay and approved sources.

## 2. Common game, lore and mechanical reading — all roles

Read the actual full contents of these G-relative files, using the accepted source ref plus applicable newer owner decisions:

1. `docs/GAME_BIBLE.md` — source provenance, historical concepts, SoulDrift/Soul Essence/player identity, realm structure, cultures/visual language, classes/ancestries, game loop, constraints and locked decisions.
2. `docs/CHARACTER_AND_STORY_SYSTEM.md` — character identity, starting equipment, guides/NPCs, persistent dialogue/story state and implementation boundaries.
3. `docs/DEATH_GATE_MAGIC_REFERENCE.md` — source-derived magic distinctions, mortal versus advanced traditions and source/adaptation boundaries.
4. `docs/CLASS_PROGRESSION_CODEX.md` — calling identities, weapon/magic traditions, starter-versus-later progression, exclusions and specialization constraints.
5. `docs/LEVEL_01.md` — Soul Well/First Breach prologue and transition into the outdoors.
6. `docs/BROWSER_GAME_DESIGN.md` — browser presentation/gameplay constraints, reconciling historical directions with current SEA rules.
7. `docs/ARCHITECTURE.md` — current technical/data boundaries and the systems a worker must not duplicate.

The file paths above were found through the existing #430 and Claude handoff context maps and the QA documentation tree. File existence does not prove every historical sentence is current. For example, an older tile/visual premise or population/ancestry/count rule may conflict with later owner instructions. An agent must report the specific source/decision and applicable supersession; do not rebuild old design assumptions simply because GAME_BIBLE or an archive contains them.

Also read live issue bodies AND all relevant current decision comments for:

- #428: global campaign, separate realm identities, ancient-return preparation, local crises, ruler/faction outcomes and persistent world state.
- #429: source/canon/proposal classification, lore-research scope and approval boundaries.
- #430: Thalenyr / Verdant Echo origin, geographical relationships, atlas/gazetteer, settlements, fixed-dungeon context and source links.
- #442 and #443: current progression and player ancestry/calling constraints.

Follow source pointers from those records to relevant actual lore packets, map companions, NPC biographies, approved visual references and source notes. Do not stop after reading the ticket that names them. Read-only access to protected atlas sources is not permission to regenerate or edit those files.

## 3. Historical Book-of-Life/Lifepaper/Discord and specialist sources

Read S `source-bundle/README.md`. The verified bundle is `part-01.md` through `part-19.md`, a path-ordered archive of source files with original paths/hashes. It is historical, not a newer workflow override. For example, `source/ARCHITECTURE_DECISION.md` is embedded in part-01; do not falsely report reading a nonexistent current top-level ARCHITECTURE_DECISION.md.

Build/read the embedded source index and load the COMPLETE relevant source-file blocks, spanning chunks when necessary. For an existing indexed Book-of-Life/Lifepaper class, starter-skill or lore requirement, read its original supplied source/approved extraction and the recorded owner decision before proposing replacements. If the source is on an allowed local drive/Discord export rather than GitHub, record the actual path/version and read coverage. A fresh agent must not assert it has read the source just because another agent's synopsis exists.

Do not blindly reread all 19 chunks in every continuing chat. Use source identity and retained context to reload changed/applicable blocks. A lore research task may require a much larger source read than a code adapter, but ALL workers must complete the common game/lore packet above. Missing originals are explicitly MISSING_SOURCE; do not fabricate canon or fetch unrelated material to fill gaps.

Houdini workers additionally read S `houdini-threejs-playbook/README.md` and the relevant complete part-01 through part-03 sections, with current SEA corrections taking precedence over historical commands.

## 4. Current Heartvale campaign and implementation overlay

All Heartvale workers, including asset-only #510 and code-only #502, read:

- S `HEARTVALE_LEVELS_2_10_CAMPAIGN_RUNBOOK.md` and `config/heartvale-campaign-policy.json`.
- S `HEARTVALE_ENVIRONMENT_FIRST_HANDOFF.md`.
- S `QUEST_AND_PROGRESSION_FRAMEWORK_RUNBOOK.md` and `config/quest-progression-framework-policy.json`.
- S `kickoffs/ISSUE-498-HEARTVALE-CAMPAIGN-KICKOFF.md` and `kickoffs/ISSUE-501-QUEST-PROGRESSION-FRAMEWORK-KICKOFF.md`.
- Live #498/#499/#500/#501 owner decisions; assigned ticket and dependency comments; PR #511 post-merge checkpoint receipts.
- The latest #509/#512 audit/handoff and active file claims. Inspect actual local source when the report is not pushed, without modifying another worker's worktree.

Required G source families, read in the scope needed to understand this region:

- `docs/THALENYR_SCALE_AND_SECTIONS.md`, `docs/HEARTVALE_ZONE_DESIGN.md`, `docs/HEARTVALE_ZONE_TICKETS.md`;
- `server/sections.mjs`, `public/data/zones/heartvale/layout.json`, `public/data/zones/heartvale/heartvale-npcs.json`;
- current quest, item, faction, spawn and actor registries, with actual paths discovered from the current implementation;
- active map/lore keyed descriptions linked by #430 and region docs;
- checkpoint manifest/rollback and the latest local environment audit reports where recorded.

Known local #512 report names to discover and read when present:
`HEARTVALE-512-FULL-AUDIT.md`, `HEARTVALE-512-ZONE-AUDIT.md`, `HEARTVALE-512-ROADS-AUDIT.md`, `HEARTVALE-512-MATERIAL-WATER-AUDIT.md`, plus current verification/asset-inventory handoffs. A reported local commit/path must be verified; do not claim it exists on QA unless fetched there.

Reconcile these constraints from their current sources rather than memorizing a numeric snapshot:

- Thalenyr is the first world; Heartvale is the Human-only early region. Later nonhuman locations and playable/test-avatar choices are separate contracts.
- The overarching story connects regions to power, knowledge, alliances, stability and preparation for returning ancient powers; starter content must not import late-game rune/boss powers by accident.
- Existing Soul Well, settlement, biome, road/river and landmark meanings constrain NPC dress, roles, locations and environmental storytelling.
- Real-time is default, with the same quest/combat state supporting the approved tactical mode.
- Draft quest names, causes, faction titles and reward numbers remain owner-reviewable; preserve stable IDs.
- Derive live inventory capacity/progression rules from latest decisions and implementation. If older campaign policy and current game docs differ, report the exact conflict; do not silently reset newer work to an old number.
- Current #512 work may overlap #509 environment ownership. A separate agent cannot assume the historic 'avatar-only' scope still describes the active file claims.

## 5. Role-specific production reading — additive, not a substitute for lore

### #510 / Human NPC or other asset production

Read S `IMAGE_REFERENCE_BAKEOFF_POLICY.md`, `HUMANOID_BASE_BODY_POSE_POLICY.md`, `ANIMATION_PROVIDER_ROUTING.md`, `CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`, `QUEST_DIALOGUE_VIDEO_POLICY.md`, `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`, `ZONE_PRODUCTION_QUALITY_GATES.md`; U `IMPORTED_ASSET_RUNTIME_PRESENTATION_GATE.md`; and their referenced configuration/record templates. Read current Tripo provider configuration, license/DCC policy for the tools used, and live asset/approval/spend records in #435/#448/#456/#458/#487/#510 as applicable.

For each NPC design brief record: stable actor/role ID, lore and source pointers, regional culture/visual language, vocation/social role, relationships/faction/quest function, approved versus provisional facts, dress/equipment restrictions, face/body identity, intended place/activity, technical pose/rig/material/runtime requirements and owner gates. 'Human guard' by itself is not a lore-grounded design brief.

Use fresh Tripo identities under #510, complete full-body/no-pedestal inputs and a consistent gameplay/dialogue head. Apply the humanoid T/A-pose policy to the relevant base-body/rig work; do not waive or invent pose capabilities. Mesh-only preview permission is distinct from production-animation approval. Verify costs and serialize provider access; no automatic charged tasks or final canon approval follows from this readset.

Asset-only production can proceed without editing the active map. Final coordinates/placement consume the corrected versioned map/socket contract.

### #502 / quest schema and compiler

Read S framework runbook/policy, `templates/quest-definition.template.json`, `templates/quest-instance.template.json`, `templates/heartvale-quest-record.template.json`, quest-dialogue/media policy/config/template, and live #502/#503/#507/#499/#500 contracts. Inspect existing runtime state/registry/save interfaces before inventing another schema.

Translate lore into references and validation constraints, not hard-coded names/coordinates or new canon. Use temporary fixture text where authorized; do not reauthor the entire campaign. Current real-time/tactical, faction, inventory, reward idempotency and content-revision rules must be represented by the appropriate contracts. Scope remains the owner-approved pilot interfaces while environment work proceeds.

### #509/#512 / environment, controller or test-avatar work

Read S `ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`, `ZONE_PRODUCTION_QUALITY_GATES.md`, `ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`, `COLLISION_INTERACTION_DESTRUCTION_POLICY.md`, `SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`, procedural topology policy where relevant, and all selected policy configs/record templates; U imported-asset presentation gate; S `TEST_AVATAR_ASSET_SELECTION_POLICY.md` for #512.

Read the actual map semantics, current local audit, save/identity/controller contracts and current accepted assets. No-pill visible rendering does not remove physics. Test-avatar appearance does not change story population/canon. Do not regenerate protected atlas outputs or reset checkpoints to resolve a unrelated tooling mismatch.

### Research, verification and other roles

Research reads the complete source corpus required for its actual question under #428/#429/#430 and distinguishes SOURCE_CANON/SOURCE_REFERENCE from PROJECT_CANON, OWNER_LOCKED, PROPOSAL, INFERENCE and UNKNOWN_CONFLICT. Verifiers independently read the same applicable source set and exact candidate commit; a producer's receipt alone is insufficient. Other workers select the production modules their task uses after the common packet, not instead of it.

## 6. Source/decision receipt required before substantive work

Create or update `.agent-state/<ticket>/context-sources.json` in the assigned worktree, or the already-established equivalent ledger if one exists. Do not create parallel progress systems merely for this rule. Record:

```text
sourceId, resolvedPathOrUrl, docsRefOrImplementationRef, commitOrBlobOrFileHash
coverage: FULL | named complete sections | MISSING | TRUNCATED
classification/authority, applicable role, readThisSessionOrRetainedContext
constraintsExtracted, supersededBySourceId, unresolvedConflicts
```

The first response must provide a brief SOURCE-BACKED comprehension packet:

1. World/prologue/region relationship and overarching campaign purpose.
2. Relevant people, factions, NPC roles, cultures, visual language and local place meanings.
3. Starter versus advanced magic/classes and relevant gameplay constraints.
4. Actual SEA production order, applicable tools/provider limits and quality gates.
5. Latest accepted base versus active local-only work, checkpoint status and worker/file ownership.
6. Specific proposals, legacy conflicts, missing sources and next owner approvals.
7. Exact planned scope and evidence required to pass it.

Do not use a fabricated all-green checklist. Reading just this file, an index, a filename, a partial tool response or another agent's summary cannot produce CONTEXT_READY. Complete missing text with further reads. Machine scripts may verify paths/hashes/declarations but do not prove comprehension.

If a shared prerequisite is missing, mark CONTEXT_BLOCKED. If only a separable task lacks a source/approval, mark CONTEXT_READY_LIMITED and identify what can proceed. Preserve ongoing work, catch up without resets, and then continue authorized execution rather than endlessly writing new plans.

## 7. Reusable kickoff footer

Every SoulDrifter kickoff must load this full readset and the actual common/role sources before work. It cannot replace this requirement with 'read relevant docs' or 'use cached onboarding.' On subsequent turns with retained source content, compare hashes/live decisions and reload changes; on a new agent chat, load the common context again. Tool installation and project comprehension are separate gates.
