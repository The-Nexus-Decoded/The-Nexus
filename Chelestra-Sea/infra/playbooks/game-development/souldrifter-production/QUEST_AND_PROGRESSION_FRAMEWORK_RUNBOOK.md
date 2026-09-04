# SoulDrifter Quest and Progression Framework Runbook

Status: Binding production contract
Owner direction: 2026-09-04 / environment-first-v2
Program epic: #501

## Purpose and current precedence

Build the full reusable quest, reward, leveling, inventory, faction, persistence, authoring, simulation and player-UX system while delivering a real Heartvale 3D first pass early.

The latest owner direction supersedes the old framework-first sequencing:

```text
recover and redesign the existing Heartvale outdoor section
-> reconstruct environment, buildings, landscape and water
-> fresh Tripo Human NPCs and usable existing creature placement
-> provisional in-world quest loop using minimum real framework interfaces
-> integrated 3D review
-> expand/harden the full reusable framework
-> owner final content review
-> 30-quest Heartvale rollout and later-region reuse
```

Read `HEARTVALE_ENVIRONMENT_FIRST_HANDOFF.md` and the revised #501 kickoff for spatial production, exact source locations, model routing and the first-pass scope. This runbook retains the entire framework capability contract; environment-first does not mean abandoning it or building a disposable parallel engine.

The owner may revise names, dialogue, roles, reward numbers, prerequisites, faction names, story causes and finale choices later. These remain versioned data/content rather than hard-coded services. Provisional local test content is allowed before final canon approval.

## 1. Ticket ownership

| Ticket | Ownership |
|---|---|
| #501 | Integrated design/production coordination, dependencies and acceptance |
| #509 | Existing Heartvale section overhaul, spatial/quest sockets and environment integration; reconcile #452–#455 |
| #510 | Fresh Tripo Human quest cast, complete cast coverage, placement and staged animation |
| #456 | Creature asset/animation source library and review ledger |
| #492/#493/#494/#495 | Population, legal terrain/navigation, behavior and staged creature runtime integration |
| #502 | Versioned definitions, safe expressions, objective DAG compiler and lint |
| #503 | Quest lifecycle/runtime, prerequisites, events and instances |
| #504 | Objective/action adapters |
| #505 | Persistence, idempotency, migration, simulator and developer inspector |
| #506 | Dialogue, offers/turn-in, journal, tracker, map/markers and accessible quest UX |
| #442 / #507 | Progression parent / XP curves, award coordination, level state, ledger and migration |
| #508 | Level choices, skills/talents, character sheet, respec and readiness UX |
| #499 | 20-slot shared inventory, quest reservations, pending claims and capacity entitlements |
| #500 | Human Heartvale factions and reusable reputation/readiness state |
| #459 | Early provisional quest loop in rebuilt Heartvale, then complete framework integration proof |
| #498 | Full draft campaign and later owner-approved 10 main, 10 side, 10 optional content |

One concern, branch, worktree and PR per implementation worker. Shared map/renderer/type changes have an explicit serialization owner. Preserve current work; do not overwrite other agents to synchronize them.

## 2. Canonical delivery order

### Stage 0 — recovery and spatial audit

Use cached fast-start, live issues/comments/PRs and actual repository/worktree data. Classify existing implementation as REUSE, REFACTOR_BEHIND_INTERFACE, MIGRATE_CONTENT_ONLY, LEGACY_REFERENCE, REJECT or OWNER_DECISION_REQUIRED. Record local-only artifacts separately from pushed files. Capture current outdoor renders; historical defects are not automatically current defects.

Publish the section layout/route plan, asset availability ledger, placement socket contract, event/reward seams and file ownership. The first sessions are #501 lead, #509 environment and #510 NPC cast. After the bounded receipt, proceed with authorized local work rather than returning only more plans.

### Stage 1 — reconstructed environment and placement

#509 reworks the whole existing Heartvale section coherently, with the Basin -> road/ford -> Anwel -> fields/river loop delivered first. Use topology/graybox, semantic staging, prop-complete collision/nav, interactions/destruction, lighting/audio/readability/performance/recovery and population-ready gates.

#510 produces new Tripo Human identities for all distinct required quest participants, opening cast first. #495 consumes exact usable #456 assets through #492/#493 legal placement. Good meshes without full motion are allowed as MESH_ONLY_PREVIEW; rejected/quarantined assets are not. Later AI/animation completeness remains under #494/#495 and the asset lane.

Keep the Basin treeless grassland, the outdoor Soul Well a silvery machinic pool, the ordinary river distinct, and the accepted map/First Breach seam intact. Human-only is a local social-population rule, not a rewrite of player ancestry eligibility.

### Stage 2 — provisional playable loop

#459 proves rescue/combat, dialogue/actual-map orientation, townward travel and one side task. Names/text/tuning may be provisional. Use existing functional systems behind minimum #502/#503/#507 interfaces; no second temporary quest engine and no direct award writes from rendering/UI.

Reserve all draft cast/quest space now, but do not confuse placement with functional objectives. Isolate provisional saves/rewards. Missing animation polish is acceptable only with honest limitations; core completion/retry/reward behavior must work for anything called playable.

### Stage 3 — full framework implementation

After the integrated environment-first pilot is reviewable, expand #502, #503 and #507 in separate worktrees with frozen shared interfaces. Then #504/#505/#499, followed by #506/#508/#500 and remaining gateways. Design/interfaces and necessary thin implementations may run earlier where they directly support the first pass; do not delay environment work for unrelated framework completeness.

### Stage 4 — full technical proof and content approval

Re-run the #459 four-quest proof against the complete framework. The owner separately approves final quest names, prose, NPC roles, story cause, prerequisites/branching, numeric rewards, faction details and finale/next-region consequences. Then finish #498's 30 approved records. A first-loop acceptance does not waive the whole-section, complete-cast or full-framework obligations.

## 3. Immutable definitions and mutable instances

QuestDefinition is compiled/versioned immutable data:

```text
questId/version/chapterId/classification
localization keys
visibility/availability/acceptance/completion expressions
start and turn-in sources
objective DAG, branches and choices
failure/recovery/abandon/reacquire/repeat policy
reward bundle references and inventory reservations
faction/readiness/world-state reads and writes
map/marker/dialogue/media references
level/readiness recommendations and party attribution
save migration metadata and content hash
```

QuestInstance is player/party-specific state:

```text
instanceId, questId, definitionVersion
lifecycle state and active/completed/failed objective nodes
progress counters and selected branches/choices
reservation, pending claim and reward transaction references
completion/repeat/cooldown history
last processed event sequence, idempotency ledger references
migration history
```

Text/name changes do not reset valid instances. Structural graph changes require explicit migration.

## 4. Lifecycle

```text
LOCKED, HIDDEN, AVAILABLE, OFFERED, ACCEPTED, ACTIVE,
READY_TO_TURN_IN, COMPLETED, FAILED_RECOVERABLE, FAILED_FINAL,
ABANDONED, EXPIRED, SUSPENDED
```

Use an explicit transition table, stable event/idempotency keys, deterministic rejection reasons and atomic local state updates. Completion cannot directly pay rewards. Recoverable failure defines checkpoint/retry; abandon/reacquire cleans inventory reservations through #499. Changed world state may select an alternate version, not silently erase content. Instances survive zone unload/re-entry.

## 5. Safe conditions

Use a typed expression tree, never unrestricted eval or content-authored JavaScript/network/filesystem access.

Predicates:

```text
QUEST_STATE, OBJECTIVE_STATE, PLAYER_LEVEL, PLAYER_CLASS, PLAYER_ANCESTRY,
INVENTORY_HAS, INVENTORY_SPACE, EQUIPPED_ITEM, FACTION_REPUTATION,
READINESS_VALUE, WORLD_FLAG, LOCATION_DISCOVERED, TUTORIAL_FLAG,
PARTY_STATE, TIME_OR_EVENT_WINDOW, AND/OR/NOT/comparisons
```

Diagnostics explain blocked visibility/acceptance/progress/completion. Static validation proves what it can; uncertain dynamic conditions require fixtures/simulation rather than false claims of universal satisfiability.

## 6. Objective graphs and adapters

Operators: SEQUENCE, AND, OR, COUNT, OPTIONAL, BRANCH, PLAYER_CHOICE.

Standard adapter types:

```text
TALK, KILL, DAMAGE, DEFEAT_BOSS, COLLECT, DELIVER, INTERACT, USE_ITEM,
EQUIP, CRAFT, GATHER, DISCOVER_LOCATION, ENTER_AREA, FOLLOW_ROUTE, ESCORT,
DEFEND, SURVIVE, REPAIR, DESTROY, ACTIVATE, PUZZLE_STATE, PLAYER_CHOICE,
CUTSCENE_OR_VIDEO, FACTION_THRESHOLD, WORLD_STATE, CUSTOM_SCRIPTED_ADAPTER
```

Custom adapters are typed registered allowlisted code. Index routing by event/target/location and subscribe only for active objectives; no full quest scan every frame. Optional nodes never block required completion. Repeated/late/out-of-order events do not duplicate progress. Branch selection and retry resets are explicit.

Both real-time and tactical combat emit the same event contract. Pet/summon/assist/party/environmental credit is an explicit policy. Media skip/fallback/replay, escort/home/terrain recovery and inventory protection each need real adapters, not one-off renderer conditionals.

## 7. Canonical gameplay events

```text
eventId, eventType, schemaVersion, sourceSystem
player/actor/party IDs
zone/location/socket and target/entity/item/faction IDs
quantity/value, combatMode, worldStateVersion
logical/game time, causationId, correlationId, idempotencyKey
validated payload
```

Distinguish observed gameplay evidence from UI requests. Validate attribution and event ordering at the appropriate authority boundary; the offline POC does not establish secure online authority.

## 8. Awards and progression gateway

#507 owns AwardTransactionService. Quests/UI/renderers never directly mutate rewarded XP, money, inventory, reputation, readiness or unlocks.

Bundles may contain XP/level advancement, currency, items/pending claims, skills/talents/attributes, capacity entitlements, faction reputation, readiness/world-state changes, map/travel/service unlocks and tutorial flags.

Outcomes:

```text
APPLIED, ALREADY_APPLIED, PENDING_EXTERNAL_CLAIM,
REJECTED_VALIDATION, RETRYABLE_FAILURE, NONRETRYABLE_FAILURE
```

Local state commits once or not at all within its transaction boundary. Cross-gateway effects use durable outbox/receipts and idempotent recovery, not an unsupported claim of global atomicity. Never report a quest fully paid when required effects silently failed. Pending item claims are visible, unusable until claimed and cannot repay twice.

## 9. Leveling

Keep level/current XP/lifetime XP, versioned curve/cap, exact thresholds, multi-level gains, pending choices, deterministic migration and reward provenance. Support levels 1–20 and extension without hard-coded content assumptions. Planning data targets level1 First Breach -> level2 Heartvale arrival -> around3 orientation -> around10 finale through XP/catch-up, not arbitrary level setting.

#508 provides data-driven automatic/choice rewards, skill/talent/attribute growth, later specialization hooks, durable multi-level choice queues, respec and explainable readiness. Consume #443 ancestry/class contracts; do not resolve old ancestry conflicts independently. Readiness uses level plus approved gear/skill/story conditions and distinguishes warnings from hard access rules.

Final numbers remain owner-reviewable data. Main-only, mixed, completionist, under-level and over-level paths must be simulated; no required grinding or all-side-quest completion.

## 10. Inventory

#499 owns 20 base physical slots shared by regular and physical quest items, counted visible quest reservations, protected items/reacquisition, full-inventory pending rewards and +5 capacity entitlements. No unlimited invisible quest bag or mandatory purchased capacity. Quest definitions declare simultaneous reservation and reward-capacity needs, respecting stack sizes and atomic consumption/claim behavior.

## 11. Factions and realm state

#500 owns Human-only local Heartvale factions and reusable reputation/readiness. Six vectors: PERSONAL_POWER, RECOVERED_KNOWLEDGE, ALLIANCES_AND_FACTION_INFLUENCE, REALM_STABILITY, INFRASTRUCTURE_AND_ACCESS, RESOURCES_AND_AUTHORITY. They initially describe narrative/world readiness, not hidden stat multipliers.

Definitions declare reads/writes; validated gateways apply them idempotently. Drakkin/other peoples arrive in later regions. Working faction names remain proposals.

## 12. Persistence, migration and simulation

#505 owns versioned snapshots, content hashes/definition versions, event/idempotency ledgers, pending transaction recovery, safe migration mappings, deterministic headless simulation and development-only inspector/event injection.

Simulate main-only, mixed, completionist, skipped tutorials, direct-to-town, late side quests, abandon/reacquire, defeat/retry, inventory-full, reward failure/retry, duplicate/out-of-order events, every lifecycle save/reload, and under/over-level paths.

Never silently reset progress on a definition change. Test missing actors/objects/locations, failed media, browser crash, conflicting tabs, corrupted saves and migration rollback. Future server/party authority has explicit interfaces; building a full backend is not a prerequisite for this local POC.

Debug mutation tools use validated runtime APIs and are excluded/securely disabled in production.

## 13. Player-facing UX

#506 owns projection-driven offer/accept/blocked explanations, canonical NPC dialogue, journal/history, tracked HUD objectives, map/world/search-area markers, branch/choice views, abandon/reacquire, reward previews/committed receipts, pending claims, level-up handoff, faction/readiness displays and captions/skip/replay/fallback.

All surfaces share canonical projections. UI dispatches validated commands, not direct state mutations. Keep desktop, controller where supported, touch/mobile, readable contrast/text, focus restoration, reduced motion and color-independent status. Bound notification queues/marker cost and lazily load heavy media.

## 14. Compiler hard failures

Reject duplicate IDs, required graph cycles/unreachable nodes, missing references, required main depending on optional content, demonstrably contradictory conditions, missing recovery/idempotency/migration rules, unbounded required random drops, quest physical items without reservation/reacquisition, paid items/capacity required by main content, nonhuman Heartvale social actors, missing required media captions/skip/fallback and unsafe executable content.

Chapter-specific restrictions belong to data-driven validation profiles, not hard-coded Heartvale imports inside the generic runtime.

## 15. Acceptance

The environment-first milestone needs a runnable rebuilt map, fresh Tripo Human NPCs, legal usable creature placement, an honest animation-gap ledger and working provisional quests; it is not proof of all final framework capabilities.

Full framework acceptance still requires:

1. A generic sample chapter compiles/runs without Heartvale imports.
2. Names/dialogue change without service-code changes.
3. Lifecycle/graph/adapter behavior is deterministic and tested.
4. Both combat modes progress the same instances.
5. Award coordination applies once or exposes recoverable failure.
6. Save/reload/re-entry/replay/migration preserves progress and prevents duplicates.
7. Inventory-full/protected quest items and faction/readiness writes pass.
8. Dialogue/journal/HUD/map/markers agree with one state.
9. Simulations cover major routes and failures; debugging explains blocked conditions.
10. Four #459 representative quests pass desktop/mobile real-GPU evidence against the full framework.
11. Independent verification precedes owner-ready status.
12. The owner reviews #498 content separately from technical framework acceptance.

No merge or deployment without owner authorization. No provider purchase or unspecified credit expenditure is authorized by this runbook. The new NPC production lane uses the current scoped spend gates; pure framework work requires no paid 3D generation.
