# Claude Transition Handoff — SoulDrifter Game Research and Production

**Handoff version:** `2026-09-02-claude-v1`

## Purpose

This is the current repository-backed transition package for moving SoulDrifter research, requirement compilation, planning, implementation support, or independent verification into Claude/Claude Code.

It replaces the assumption that the root `CLAUDE.md`, old chat history, old Kimi research prompts, or an individual issue description contains the complete current game-development process.

The root `CLAUDE.md` remains the monorepo-wide instruction file. For SoulDrifter work, this handoff plus the current SoulDrifter production harness, governing `AGENTS.md`, live ticket/PR state, and ticket-specific branch/worktree instructions are also mandatory.

> **Chat memory is not project state. The repository and live GitHub state are project state.**

---

# 1. Instruction precedence

Use this order when sources conflict:

1. latest explicit owner direction;
2. governing repository/project `AGENTS.md`;
3. current runtime/code/data contracts;
4. current live issue/PR decisions and approved project canon;
5. the SoulDrifter production harness;
6. this Claude transition handoff;
7. historical game documents, old branches and rejected experiments;
8. source-book inspiration within the approved copyright boundary;
9. new proposals.

Important Claude-specific warning:

- the root `CLAUDE.md` contains generic monorepo branch rules;
- SoulDrifter tickets frequently use a ticket-specific base such as `qa`, an existing feature branch, or a recorded worktree;
- the exact live issue, PR and governing game `AGENTS.md` determine the correct base/branch/worktree;
- never rebase or retarget an active game branch merely because the generic root document says “always branch from main”;
- first identify the assigned ticket’s current branch, base, worktree and live head, then report any conflict before editing.

---

# 2. Select exactly one Claude role per session

Claude must declare one role before work begins.

## A. Research and continuity analyst

May:

- read and reconcile lore, game-design and production sources;
- build source indexes, contradiction reports, dependency maps and research briefs;
- produce clearly labeled proposals;
- prepare owner decision packets;
- update research-only documents on an assigned branch when authorized.

May not:

- silently promote a proposal into project canon;
- make gameplay balance, implementation or asset-spend decisions outside the assigned ticket;
- modify active implementation branches;
- merge or deploy.

## B. Requirement compiler / orchestrator

May:

- compile owner direction and research into testable requirements;
- enumerate open issues/PRs and construct the dependency/parallelism map;
- create/update ticket contracts, completion ledgers, evidence manifests and handoffs;
- assign isolated worker scopes.

May not:

- self-verify its own implementation;
- combine unrelated tickets merely for convenience;
- authorize provider spend, merge or deployment.

## C. Implementation worker

May:

- own one issue, one branch and one worktree;
- implement only the ticket contract;
- run producer tests and capture evidence;
- stop at `IMPLEMENTED_UNVERIFIED`.

May not:

- work from a second ticket’s active worktree;
- self-mark the work `VERIFIED`;
- merge, deploy or submit paid provider tasks without the required approval.

## D. Independent verifier

May:

- independently re-derive requirements;
- test the exact candidate commit;
- reject stale, producer-only or incomplete evidence;
- return `PASS`, `FAIL` or `NEEDS_EVIDENCE` per requirement.

May not:

- repair the same work it is verifying and then certify it;
- infer completion from a green build alone;
- merge or deploy.

---

# 3. Mandatory Claude startup

Every new Claude session must perform the cached fast-start before research or implementation.

Read in order:

1. repository root `CLAUDE.md`;
2. every governing `AGENTS.md` between repository root and the target project/worktree;
3. this file;
4. `../START_HERE.md`;
5. `../SESSION_FAST_START.md`;
6. `../PROJECT_CANON_INDEX.md`;
7. `../WORKFLOW.md`;
8. `../AUTO_DISCOVER_WORKSPACE.md`;
9. `../config/onboarding-cache-policy.json`;
10. the assigned ticket-specific kickoff under `../kickoffs/`, when present.

Run full `ONBOARDING.md` and `PRODUCTION_TOOLCHAIN_PREFLIGHT.md` only when a required receipt is missing, stale, invalidated or blocked. Do not reinstall the complete toolchain in every chat.

Before any charged provider action, always refresh the active lane, live balance/allowance, current operation price, expected cost, maximum approved retry envelope and owner approval. Cached toolchain receipts do not authorize spend.

## Required live reads

Claude must fetch, not assume:

- the assigned issue body and every current comment;
- linked/dependent issues and every relevant current owner comment;
- linked PR metadata, base, head, reviews, comments and changed files;
- current local and remote heads;
- current worktree and dirty/untracked state;
- `.agent-state/<issue>/` files when present;
- current manifests, schemas, tests and runtime files touched by the ticket.

If any required input is unavailable, report `MISSING_SOURCE` or `OWNER_DECISION_REQUIRED`; do not reconstruct it from memory.

---

# 4. Mandatory SoulDrifter production policies

Load the policies applicable to the assigned lane.

## All game tickets

- `../START_HERE.md`
- `../PROJECT_CANON_INDEX.md`
- `../WORKFLOW.md`
- `../BROWSER_RUNTIME_ROADMAP.md`
- universal imported-asset presentation gate

## Zone/environment work

- `../ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`
- `../ZONE_PRODUCTION_QUALITY_GATES.md`
- `../ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
- `../COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
- zone policy config and record template

## Procedural/traversal work

- `../PROCEDURAL_DUNGEON_TOPOLOGY_POLICY.md`
- `../SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
- topology and spatial-connection configs/templates

## Image/3D/character work

- `../IMAGE_REFERENCE_BAKEOFF_POLICY.md`
- `../HUMANOID_BASE_BODY_POSE_POLICY.md`
- `../config/tripo-provider.json`
- universal imported-asset presentation gate

## Rigging/animation work

- `../ANIMATION_PROVIDER_ROUTING.md`
- `../CUSTOM_ANIMATION_DUAL_PIPELINE_BAKEOFF.md`
- animation policy config and record template

## Quest/dialogue/cinematic work

- `../QUEST_DIALOGUE_VIDEO_POLICY.md`
- quest-dialogue video config/template
- the applicable quest/video kickoff under `../kickoffs/`

---

# 5. Game-research corpus and boundaries

For broad SoulDrifter game research, Claude must inspect the live versions of at least:

## Research/canon tickets

- #428 — campaign, First Breach lore, realm access and persistent world state;
- #429 — research/documentation/copyright classification contract;
- #430 — Thalenyr/Verdant Echo realm atlas, settlements, quest hubs and fixed dungeons;
- #380 — ancestry and magic taxonomy;
- #442 — experience, leveling and progression;
- #443 — ancestry/calling eligibility, stat affinities, presentation and body matrix;
- #444 — Stalker as a later Slayer specialization rather than a tenth starting calling.

## Production tickets that constrain research

- #451 / PR #460 — current First Breach V2 level/environment contract;
- #487, #488 and #489 — current modular character-foundation program and owner gates;
- #435 — Tripo modular body/head/hair/clothing/weapon foundation;
- #448 / PR #449 — First Breach playable-character, NPC and creature integration history;
- #427 and #439 — animation/retargeting and combat-presentation contracts;
- #452–#456 — current Heartvale environment/village/water/terrain/navigation/wildlife work;
- #459 — first playable Heartvale NPC/dialogue/quest/combat slice;
- #457 and #458 — post-MVP named-NPC and monster polish boundaries.

## Repository design sources

At minimum, locate and read the current versions of:

- `Arianus-Sky/projects/games/SoulDrifterWeb/docs/GAME_BIBLE.md`;
- `docs/DEATH_GATE_MAGIC_REFERENCE.md`;
- `docs/CLASS_PROGRESSION_CODEX.md`;
- `docs/CHARACTER_AND_STORY_SYSTEM.md`;
- `docs/LEVEL_01.md`;
- `docs/BROWSER_GAME_DESIGN.md`;
- `docs/ARCHITECTURE.md`;
- current character/3D/animation manifests and ledgers;
- current Heartvale maps/data/section contracts;
- current First Breach V2 generator/registry/runtime contracts;
- complete specialist source bundle indexed by the production harness.

Do not claim a file was read when only its filename or index entry was seen.

## Research classification

Every material research statement must be labeled as one of:

- `OWNER_LOCKED` — explicit current owner decision;
- `SOURCE_CANON` — directly supported by an identified lawful source;
- `PROJECT_CANON` — approved SoulDrifter canon;
- `PROPOSAL` — new material offered for review;
- `INFERENCE` — reasoned connection not directly stated;
- `UNKNOWN_CONFLICT` — missing, ambiguous or contradictory;
- `DESIGN_QUESTION` — requires gameplay/product/owner judgment;
- `IMPLEMENTATION_DEPENDENCY` — code/data/asset work required elsewhere.

## Copyright boundary

Claude may analyze lawfully available books, user notes and repository research for high-level inspiration and consistency. It must not reproduce protected text, closely copy scenes, characters, dialogue or distinctive plot sequences. Original SoulDrifter terminology, locations, factions, histories, encounters and prose remain the production goal.

---

# 6. Current product and runtime direction

- SoulDrifter remains browser-first and mobile-browser compatible.
- Three.js remains the canonical runtime through the First Breach and first playable Heartvale POC.
- Babylon.js is an isolated later A/B port of exactly those accepted sections; it does not interrupt the current MVP and does not replace Three.js automatically.
- Unreal versus Unity remains a later optional installed/native decision only if needed.
- Houdini/Blender/provider source, neutral assets, caches, manifests and target derivatives must be preserved so later ports reuse—not recreate—the expensive work.
- The current owner-declared Houdini mode is noncommercial POC; use the features exposed by Apprentice while preserving its licensing/export restrictions and planning clean Indie rebuild/export where required.

---

# 7. Current zone-construction architecture learned from development

Claude must not return to the original “place boxes, then try to connect them” model.

## Procedural topology

```text
route/branch choice when applicable
-> logical graph with explicit traversal contracts
-> constructive edge-by-edge spatial embedding
-> canonical boundaries, surfaces, apertures and volumes
-> actual-geometry diagnostics
-> graybox playability
-> shared shell
-> technical asset intake
-> semantic staging
-> prop-complete collision and interaction gates
```

For each edge, the destination is positioned from a compatible source socket/surface/volume and the complete connection is validated before acceptance. Invalid candidates retry, backtrack or reject. A visible door, matching coordinate, BFS path, nav result or room warp is not physical connectivity proof.

## First Breach-specific correction

- fixed Soul Well, vestibule and Threshold Plaza may exist before route selection;
- after the player selects Wayfarer or Oathbreaker, build the deterministic selected-route graph;
- choose 3–5 legal room archetypes/order;
- solve and freeze socket-to-socket topology before gallery meshes render;
- emit shared walls once and create explicit openings/corridors;
- First Breach contains no magical teleport/`PORTAL_TRANSFER` edge;
- its gates, corridors, stairs/landings and Soulwell water veil are physical continuous connections.

## Full zone pipeline

Every zone follows:

```text
0. design/canon/budget/zone-seam contract
1. topology and traversal solver
2. graybox scale/pacing/camera/population-socket reservation
3. shared shell/surfaces/volumes/world seams
4. asset intake and technical readiness
5. semantic staging and prop placement
6. prop-complete walkthrough/collision discovery
7. collision/physics/navigation/hazard regression
8. interaction/pickup/destruction/dynamic state
9. lookdev/lighting/atmosphere/wayfinding
10. audio/acoustics
11. performance/streaming/loading/memory
12. checkpoints/recovery/out-of-bounds/soft locks
13. device/input/camera/accessibility/network contract
14. population-readiness revalidation and handoff
15. final integrated walkthrough and experience review
16. independent environment verification
17. separate population/gameplay ticket
```

Key lessons:

- graybox must prove dimensions, pacing and camera before expensive art;
- environment props are staged before final collision walkthrough;
- navigation is not collision;
- the actual player/controller/body/camera must test visible solids and intended open space;
- every object needs collision, interaction, destruction and performance classifications;
- destructibles clear collision and persist state without debris soft-locking routes;
- protected structural/progression objects require explicit reasons;
- atmosphere cannot hide topology or collision defects;
- performance is measured throughout, including mobile heat/memory/loading;
- NPC/monster/quest population is a separate later ticket, but its spaces/sockets are reserved early and revalidated late.

## Traversal is not limited to doors and corridors

The catalog includes direct adjacency, thresholds, passages, stairs, ramps, ladders, climbing/mantling, ropes, lifts, moving platforms, bridges, drops, jumping, wading, swimming, underwater tunnels, air pockets, currents, boats, biome pockets, mega-zones, living/transforming dungeons, streaming seams, vehicles and explicit portal/teleport transfers where a future zone actually uses them.

Use top-down plans, sections/elevations, 3D volume/slice views, state graphs and streaming-region maps according to the traversal type.

---

# 8. Current modular character and Tripo direction

## Character composition

Playable characters remain modular:

```text
body
head
skin material
hair geometry/material
brows/facial hair
scars/tattoos/paint
jewelry/accessories
soft clothing
rigid armor
boots/gloves
weapon/offhand/shield
sheath/quiver/projectile
class effects
animation clips
```

Do not generate one permanently fused full character for every ancestry × calling combination.

## Current kickoff body scope

For the #487/#443/#435 kickoff, the currently locked initial production body set is:

- Human;
- Elf;
- Dwarf;
- adult masculine and adult feminine presentations;
- `SLIM`;
- `MEDIUM_NATURAL`;
- `ATHLETIC_MUSCULAR`;
- `THICK_LARGE_FRAMED` — broad and substantial, not obese, no protruding gut or exaggerated belly.

The first two owner-review pilots are:

- Human masculine `ATHLETIC_MUSCULAR`;
- Human feminine `ATHLETIC_MUSCULAR`.

The remaining Human set and all Elf/Dwarf bodies remain blocked until the required pilot gates pass.

## Mandatory T-pose and A-pose proof

Claude must load `HUMANOID_BASE_BODY_POSE_POLICY.md`.

For each first Human pilot, require:

1. a complete strict T-pose source/reference and 3D technical proof;
2. a complete relaxed A-pose source/reference and 3D technical/visual proof;
3. the same canonical body mesh, identity, proportions, materials, head seam and rig in both poses;
4. neutral wrists and readable separated fingers;
5. no pedestal, platform, display stand, cropped fingertips or fused gear;
6. fresh export/re-import evidence for both poses.

The strict T-pose uses horizontal arms, neutral inline wrists and forearm roll—not “stop-sign” wrist bending—to expose the palms. The A-pose proves natural shoulders, armpits, clothing fit and production-rest deformation.

A single A-pose-only or T-pose-only body does not pass the POC.

## Source-image and no-pedestal gate

Every primary image/3D source shows the complete asset with margin around all geometry. Reject:

- crop or missing hands/feet;
- pedestal, plinth, stand, platform, rock, throne or scenery base;
- multiple figures, duplicate anatomy or mirrored rear face;
- fused hair, clothing, armor, boots, belt, weapon, shield, jewelry, backpack or permanent accessories;
- embedded weapons;
- unrelated props, text, UI or decorative frames.

## Tripo lane selection

Treat Tripo Studio browser, API/SDK and official CLI as separate lanes with potentially separate credentials and credits. Use live evidence. A blocked/unfunded API does not block an active Studio browser lane.

Important image references use the configured four-candidate comparison when available:

1. Tripo Studio Nano Banana;
2. Tripo Studio Nano Banana Pro;
3. ChatGPT/OpenAI A;
4. ChatGPT/OpenAI B.

Reject framing/anatomy failures before aesthetic scoring.

Before each charged operation, return the active lane, operation, model/version, expected credits, maximum approved retry cost, current balance and projected balance. No automatic paid retries.

## Geometry before rigging

```text
source inspection
-> anomaly correction
-> segmentation/part separation when appropriate
-> mesh completion
-> retopology/decimation
-> UV/PBR/material work
-> scale/axis/origin/pivot/socket normalization
-> modular fit/seams
-> final rig and skin
-> deformation and animation QA
-> Three.js runtime proof
```

## Animation routing

- search the live Tripo preset library first;
- accepted direct presets do not require duplicate DCC work;
- derived motions may use one approved DCC for simple deterministic changes;
- substantial custom motions receive Houdini KineFX and Blender candidates using identical inputs, blind AI review and blinded owner selection;
- runtime procedural layers handle look/aim, foot placement, small hit impulses, recoil, constraints and ragdoll blends where appropriate;
- animations share authored gameplay, VFX, SFX, contact and recovery markers;
- both real-time and turn-based combat modes consume the same authoritative action/state contract.

## Current live-state warning

The #487 comments contain newer implementation findings than the original kickoff text. At the time this handoff was prepared:

- the first masculine strict-T image attempts were stopped before Smart Mesh because none passed the neutral-wrist/readable-finger source gate;
- no credits were spent for that stopped gate;
- a later six-style procedural Human hair catalog was rejected by the owner and must not be promoted;
- the proposed replacement hair-card workflow requires its own live tool/license/owner gate.

Claude must fetch the current #487/#435/#489 comments and branch state because these facts may have advanced after this handoff version.

---

# 9. NPC, creature, combat and quest research boundaries

## Named NPCs

Ilyra, Orren and Brannoc must preserve canonical identity across in-world actor, dialogue close-up and any approved video representation. Heads, hair, clothing, accessories and facial controls remain modular where the current accepted architecture requires it. Stock avatars may not replace named canonical identities.

## Creatures

Breachling family, Training Effigy/Sentinel and Cinderbound Warden may use anatomy-specific rigs. MVP requires recognizable models and functional idle, locomotion, turn, telegraph, attack, hit, defeat/death and terminal-state coverage. Expanded polish remains in its later ticket.

## Combat

Research and implementation must preserve:

- class resources and logical cooldowns;
- chained/reactive ability relationships rather than blind skill spam;
- target-facing and readable contact;
- directional/severity hit reactions;
- death/remains/loot state;
- Summoner pet command bar, manual use and autocast state;
- race-specific abilities where present in code/canon;
- the shared authoritative simulation behind real-time default mode and optional turn-based mode.

## Quest/dialogue video

Current policy requires a narrative video or cutscene beat for production quests, external/lazy media delivery rather than bloating the zone package, captions/skip/replay/fallback, and a controlled named-NPC representation bakeoff where the NPC visibly speaks. No provider task proceeds before exact inputs, cost and owner approval.

---

# 10. Research output contract for Claude

For any research assignment, deliver:

1. **Source index** — exact repository files, issues, PRs, lawful external sources and what each supports.
2. **Current-state digest** — implemented, verified, incomplete, rejected, superseded and owner-decision items.
3. **Canon/requirement matrix** — classifications and source pointers.
4. **Contradiction report** — no silent resolution.
5. **Dependency map** — which production tickets/code/assets are affected.
6. **Proposal packet** — alternatives, tradeoffs and recommended option, clearly labeled.
7. **Acceptance implications** — tests/evidence needed if approved.
8. **Owner decision list** — concise decisions that cannot be inferred.
9. **Handoff state** — exact branch/head/worktree/files changed and next atomic step.

Research work does not become implementation or canon until its ticket records the owner-approved decision.

---

# 11. Claude session and context receipts

Before research edits or implementation, return:

```text
CLAUDE SOULDRIFTER SESSION RECEIPT
handoffVersion: 2026-09-02-claude-v1
claudeMode: <Claude chat|Claude Code|other>
role: <research|requirement-compiler|worker|verifier>
ticket: <issue or GLOBAL-RESEARCH-AUDIT>
branch: <branch>
base: <base ref>
worktree: <absolute path>
localHead: <sha>
liveHead: <sha>
repoRootClaudeLoaded: yes/no
governingAgentsLoaded: yes/no
soulDrifterHarnessLoaded: yes/no
ticketKickoffLoaded: yes/no
liveIssuesAndPrsFetched: yes/no
agentStateLoaded: yes/no
requiredProviderLanes: []
paidOperationPlanned: yes/no
blockingConflicts: []
```

Then:

```text
CLAUDE SOULDRIFTER CONTEXT RECEIPT
latestOwnerDirectionChecked: yes/no
sourceFilesRead: []
issuesRead: []
prsRead: []
currentImplementationFacts: []
rejectedOrSupersededFacts: []
unknownOrConflictingFacts: []
assignedScope: <one precise scope>
outOfScope: []
nextOwnerGate: <concise>
```

No valid receipts means no edit, provider operation, merge or deployment.

---

# 12. Required first response from Claude

Before changing anything, Claude must provide:

1. selected role and exact assigned scope;
2. branch/base/worktree/local/live head receipt;
3. mandatory files/issues/PRs successfully read;
4. current-state versus stale/rejected-material summary;
5. latest owner-direction summary relevant to the scope;
6. contradictions and missing sources;
7. implementation/research dependency map;
8. proposed next atomic step;
9. exact tests/evidence that would prove it;
10. any required owner decision or provider-spend gate.

For #487/#443/#435 character work, it must additionally confirm:

- first two Human Athletic/Muscular pilots only;
- both strict T-pose and relaxed A-pose required for each;
- no-pedestal/full-body/no-fused-gear gates;
- remaining Human and Elf/Dwarf batches blocked;
- current live strict-T and hair-workflow state;
- no charged operation without exact approval.

---

# 13. Copy/paste Claude transition prompt

```text
Start the SoulDrifter Claude transition using:

Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/
handoffs/CLAUDE-GAME-RESEARCH-TRANSITION.md

Read it completely. Also read the root CLAUDE.md, every governing AGENTS.md,
START_HERE.md, SESSION_FAST_START.md, PROJECT_CANON_INDEX.md and WORKFLOW.md.

Select exactly one role for this session:
RESEARCH, REQUIREMENT_COMPILER, WORKER or INDEPENDENT_VERIFIER.

Fetch the live assigned issues, every current owner comment, linked PRs/reviews,
current branch/base/head/worktree, .agent-state records and actual repository files.
Do not rely on chat history or issue titles alone.

Return the Claude SoulDrifter Session Receipt, Context Receipt and required
first-response audit before editing, generating assets, opening provider work,
merging or deploying.

For character work, load HUMANOID_BASE_BODY_POSE_POLICY.md: the first Human
masculine and feminine POC bodies require both strict T-pose and relaxed A-pose
proof from the same canonical body/rig. A-pose-only is not accepted.

No paid provider operation, automatic retry, merge or deployment is authorized
by this transition prompt.
```

## Done rule

Claude is ready to receive SoulDrifter work only after it can distinguish current owner decisions and accepted runtime facts from historical plans, rejected experiments and unapproved research—and can name the exact ticket, branch, worktree, evidence contract and next owner gate for its assigned lane.