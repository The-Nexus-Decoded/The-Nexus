# SoulDrifter Quest and Progression Framework Runbook

**Status:** Binding framework-production contract
**Owner direction recorded:** 2026-09-04
**Framework epic:** #501

## Purpose

Build a reusable quest, reward, leveling, inventory, faction, persistence, authoring, simulation, and player-UX framework before locking the complete Heartvale quest prose and details.

The owner may revise quest names, dialogue, NPC roles, reward numbers, prerequisites, faction names, story causes, and finale choices later. Those revisions must be data/content changes rather than framework-code rewrites.

```text
framework first
-> four-quest integration proof
-> owner content review
-> 30 approved Heartvale quest records
-> later regions reuse the same framework
```

---

# 1. Ticket ownership

| Ticket | Ownership |
|---|---|
| #501 | Framework orchestration, dependencies, integration and final acceptance |
| #502 | Versioned quest/chapter definitions, safe expressions, objective DAG compiler and content lint |
| #503 | Quest lifecycle runtime, prerequisite evaluation, event routing and quest instances |
| #504 | Standard objective/action adapter registry |
| #505 | Persistence, idempotency, migrations, simulator and developer inspector |
| #506 | Dialogue, offer/turn-in, journal, tracker, map/markers, rewards and accessible UX |
| #442 | Parent progression epic |
| #507 | #442A XP curve, atomic award transaction, level state, ledger and save migration |
| #508 | #442B level rewards, choices, skills/talents, character sheet, respec and readiness UX |
| #499 | Twenty-slot shared inventory, quest reservations, pending claims and expansion entitlements |
| #500 | Human Heartvale factions, reputation and realm-readiness state |
| #459 | Four-quest Heartvale integration proof after framework gates |
| #498 | Full Heartvale content only after owner review |

One issue owns one concern, branch, worktree, and PR. Shared interfaces are frozen deliberately; workers do not edit another ticket's active worktree.

---

# 2. Canonical build order

## Wave 0 — framework audit and interface map

1. Read current master harness and all live issues/comments/PRs.
2. Inspect current First Breach tutorial, quest-like, interaction, combat, save, map, dialogue, inventory and progression code.
3. Classify existing code:

```text
REUSE
REFACTOR_BEHIND_INTERFACE
MIGRATE_CONTENT_ONLY
LEGACY_REFERENCE
REJECT
OWNER_DECISION_REQUIRED
```

4. Produce the dependency graph, file-collision map, canonical event catalog, and shared interface package plan.
5. Do not implement Heartvale's final prose or all 30 quests.

## Wave 1 — foundation, parallel after interface review

- #502 quest definition/compiler
- #503 runtime state machine/event router
- #507 progression/award kernel

## Wave 2 — runtime completeness

- #504 objective adapters
- #505 persistence/idempotency/simulator
- #499 inventory reservations and claims

## Wave 3 — player-facing and world integration

- #506 quest UX
- #508 progression rewards/character sheet
- #500 faction/readiness
- dialogue, map, cutscene/media, combat and environment gateways

## Wave 4 — small vertical proof

#459 proves:

```text
1 opening combat/rescue quest
1 dialogue + map/orientation quest
1 travel/exploration quest
1 representative side quest
```

Use stable IDs and temporary localization text where final prose is unapproved.

## Wave 5 — owner content gate

The owner reviews:

- final quest names and summaries;
- dialogue/scripts;
- NPC identities and roles;
- story cause and chapter title;
- prerequisite and branching details;
- exact reward values;
- faction names and effects;
- finale consequence and next-region hook.

Only after that gate does #498 author/load all 10 main, 10 side, and 10 optional quests.

---

# 3. Immutable definitions and mutable instances

## `QuestDefinition`

Immutable, compiled, versioned content containing:

```text
questId/version/chapterId/classification
localization keys
visibility/availability/acceptance/completion expressions
start and turn-in sources
objective DAG
branch and choice definitions
failure/recovery/abandon/reacquire/repeat policy
reward bundle references
inventory reservations
faction/readiness/world-state reads and writes
map/marker/dialogue/media references
level/readiness recommendations
party/co-op attribution policy
save migration metadata
content hash
```

## `QuestInstance`

Player- or party-specific mutable state containing:

```text
instanceId
questId/definitionVersion
lifecycle state
active/completed/failed objective nodes
progress counters
selected branches/choices
reservation and pending-claim references
pending/applied reward transaction references
completion/repeat/cooldown history
last processed event sequence
idempotency ledger references
migration history
```

Definitions may be renamed or reworded without resetting valid instances. Structural definition changes require explicit migration.

---

# 4. Lifecycle state machine

Minimum states:

```text
LOCKED
HIDDEN
AVAILABLE
OFFERED
ACCEPTED
ACTIVE
READY_TO_TURN_IN
COMPLETED
FAILED_RECOVERABLE
FAILED_FINAL
ABANDONED
EXPIRED
SUSPENDED
```

Rules:

- transitions are declared in a typed transition table;
- every transition has a stable event and idempotency key;
- invalid transitions return a reason and do not mutate state;
- completion cannot pay rewards directly;
- recoverable failure defines a deterministic retry/checkpoint path;
- abandon/reacquire cleans up inventory reservations and quest objects through #499;
- changed world state can select an alternate definition/version rather than silently deleting content;
- cross-zone instances remain active through unload/re-entry.

---

# 5. Safe condition/expression system

Content uses a typed expression tree, never arbitrary JavaScript or `eval`.

Supported predicate families include:

```text
QUEST_STATE
OBJECTIVE_STATE
PLAYER_LEVEL
PLAYER_CLASS
PLAYER_ANCESTRY
INVENTORY_HAS
INVENTORY_SPACE
EQUIPPED_ITEM
FACTION_REPUTATION
READINESS_VALUE
WORLD_FLAG
LOCATION_DISCOVERED
TUTORIAL_FLAG
PARTY_STATE
TIME_OR_EVENT_WINDOW
AND / OR / NOT / comparisons
```

Compiler diagnostics must explain which predicate blocks visibility, acceptance, progress, or completion.

---

# 6. Objective graph and adapter registry

Objective graphs support:

```text
SEQUENCE
AND
OR
COUNT
OPTIONAL
BRANCH
PLAYER_CHOICE
```

Standard adapters:

```text
TALK
KILL
DAMAGE
DEFEAT_BOSS
COLLECT
DELIVER
INTERACT
USE_ITEM
EQUIP
CRAFT
GATHER
DISCOVER_LOCATION
ENTER_AREA
FOLLOW_ROUTE
ESCORT
DEFEND
SURVIVE
REPAIR
DESTROY
ACTIVATE
PUZZLE_STATE
PLAYER_CHOICE
CUTSCENE_OR_VIDEO
FACTION_THRESHOLD
WORLD_STATE
CUSTOM_SCRIPTED_ADAPTER
```

Custom adapters are typed, registered, allowlisted code. Quest content cannot inject arbitrary executable code.

Adapters subscribe only to needed canonical event types and use indexed routing; they do not scan every quest every frame.

Real-time and tactical/turn-based combat emit the same canonical quest events.

---

# 7. Canonical event contract

Every event includes:

```text
eventId
eventType
schemaVersion
sourceSystem
player/actor/party IDs
zone/location/socket IDs
target/entity/item/faction IDs
quantity/value
combatMode
worldStateVersion
logical/game time
causationId
correlationId
idempotencyKey
validated payload
```

Late, repeated, and out-of-order events must not duplicate progression.

Pet, summon, party, assist, environment, and scripted kill attribution are explicit policies.

---

# 8. Atomic award/progression service

#507 owns one `AwardTransactionService`. Quest, combat, UI, inventory, and faction code never directly mutate rewards.

One transaction may contain:

```text
XP and level progression
currency
items or pending claims
skill/talent/attribute/unlock grants
inventory capacity entitlement
faction reputation
realm-readiness/world-state writes
map/travel/service unlocks
tutorial flags
```

Typed outcomes:

```text
APPLIED
ALREADY_APPLIED
PENDING_EXTERNAL_CLAIM
REJECTED_VALIDATION
RETRYABLE_FAILURE
NONRETRYABLE_FAILURE
```

The transaction commits once or remains visibly recoverable. A quest may not appear fully paid while some required effects silently failed.

---

# 9. Leveling framework

The progression kernel supports:

- current level, current XP and lifetime XP;
- versioned curves and caps;
- exact threshold and multi-level gains;
- pending level-up choices;
- deterministic curve migration;
- source/reward provenance;
- main-only, mixed, completionist, under-level and over-level simulations;
- party attribution interfaces;
- readiness signals using level plus gear, skills, story and approved access state.

Heartvale planning target:

```text
Level 1 First Breach start
Level 2 Heartvale arrival
Level 3 after opening rescue/orientation target
Levels 3–10 campaign
Level 10 finale/readiness
```

This target is achieved through XP/catch-up rules, not arbitrary level assignment. Final numbers remain owner-approved data.

#508 owns data-driven level rewards, skills/talents, choice queues, character sheet, respec, and explainable readiness.

---

# 10. Inventory integration

#499 owns:

```text
20 base physical-item slots
physical quest and normal items share capacity
visible counted quest reservations
pending reward claim when full
protected quest items and reacquisition
+5 capacity entitlement/token
```

No main quest requires purchased capacity. Inventory expansion remains quality of life.

The quest compiler rejects required physical quest-item definitions without capacity/reservation handling.

---

# 11. Faction and realm-readiness integration

#500 owns Human-only Heartvale factions and the reusable reputation/readiness model.

Readiness vectors:

```text
PERSONAL_POWER
RECOVERED_KNOWLEDGE
ALLIANCES_AND_FACTION_INFLUENCE
REALM_STABILITY
INFRASTRUCTURE_AND_ACCESS
RESOURCES_AND_AUTHORITY
```

Quest definitions declare expected reads/writes; runtime applies them only through the atomic award/world-state gateways.

Heartvale social NPCs and faction members are Human only. Drakkin and other peoples are introduced in later locations.

---

# 12. Persistence, migration, and simulation

#505 provides:

- versioned save snapshots;
- quest/progression event and idempotency ledger;
- content-hash and definition-version tracking;
- safe migration mapping;
- pending/retryable transaction recovery;
- deterministic headless simulation;
- developer-only quest inspector and event injection.

Simulations include:

```text
main-only
mixed
completionist
skip tutorials
direct-to-town
late side quest
abandon/reacquire
defeat/recovery
inventory full
reward failure/retry
duplicate/out-of-order events
save/reload at every lifecycle state
under-level and over-level
```

Debug tools call real validated APIs and are disabled outside development builds.

---

# 13. Player-facing UX

#506 owns one canonical projection-driven experience:

- quest offer and blocked-reason view;
- dialogue integration;
- journal/history;
- tracked objective HUD;
- map and world markers/search areas;
- branch/choice presentation;
- abandon/reacquire;
- reward preview and committed-reward receipt;
- pending item claim;
- XP/level summary and level-up handoff;
- faction/readiness effects;
- captions, skip/replay/fallback for narrative media;
- desktop, controller where supported, and touch/mobile accessibility.

UI dispatches validated commands and never directly mutates quest/progression state.

---

# 14. Content compiler hard failures

Reject content with:

- duplicate IDs;
- graph cycles or unreachable required nodes;
- missing references;
- required main dependency on optional content;
- contradictory conditions;
- no recovery path for required recoverable failure;
- missing idempotency keys;
- random required drop without fallback;
- quest item without reservation/reacquisition contract;
- paid capacity/item required by main content;
- non-Human Heartvale social actor;
- missing captions/fallback/skip policy;
- missing save migration version;
- unsafe custom executable content.

---

# 15. Framework acceptance

The framework is not owner-ready until:

1. a generic sample chapter compiles and runs without Heartvale imports;
2. changing quest names/dialogue/localization requires no framework code change;
3. all lifecycle states and graph operators pass;
4. standard objective adapters pass deterministic tests;
5. both combat modes progress the same instances;
6. rewards apply atomically and once;
7. save/reload/re-entry/replay cannot duplicate or erase state;
8. inventory-full and quest-reservation cases pass;
9. faction/readiness writes pass;
10. journal/dialogue/map/markers agree with one canonical projection;
11. deterministic simulations cover major paths and failures;
12. four representative #459 quests pass desktop/mobile real-GPU proof;
13. independent verification passes;
14. the owner can then review #498 content without being asked to approve framework code and story prose simultaneously.

No merge or deployment occurs without owner authorization.
