# SoulDrifter Heartvale Levels 2–10 Campaign Runbook

**Status:** Binding planning and production contract
**Owner direction recorded:** 2026-09-04
**Primary content ticket:** #498

## Purpose

Heartvale is the first complete outdoor campaign chapter after the First Breach. It must not feel like the player leaves the dungeon and is dropped into a decorative map with unrelated errands.

The chapter begins with a live rescue at the Soul Well Basin, introduces Heartvale through an actual-map atlas reveal, teaches the core game systems through play, develops local factions and peoples, and advances one coherent mystery from level 2 to level 10.

The complete chapter contains:

```text
10 main quests
10 authored side quests
10 discoverable optional quests/activities
= 30 total quest records
```

The main path plus required encounters and exploration must reach the chapter finale without grinding and without requiring all side or optional quests.

---

# 1. Responsibility split

## #442 — progression runtime

Owns:

- versioned level 1–10 XP curve and later extension;
- First Breach and Heartvale reward budget;
- idempotent XP/currency/item/reputation/unlock awards;
- level rewards, skill/talent cadence and readiness signals;
- save migration and duplicate-prevention;
- main-only, mixed-path and completionist progression simulations;
- under-level catch-up and over-level side-content policy.

## #459 — reusable playable quest infrastructure

Owns the proof slice for:

- swappable NPC actors;
- dialogue UI;
- quest offer/accept/objective/turn-in/reward states;
- quest markers and log;
- hostile spawns and combat completion;
- persistence, mobile/browser operation and both combat modes.

Recommended proof subset:

```text
HV-MQ-01 Trouble at the Basin
HV-MQ-02 The Vale Revealed
HV-MQ-03 The Road to Anwel
one representative side quest
```

## #498 — Heartvale chapter content and integration

Owns:

- opening rescue and atlas reveal;
- all 30 quest records and prerequisite graph;
- scripts, objectives, cutscene beats and location integration;
- tutorial routing and player choices;
- faction and world-state consequences;
- complete level-2-through-10 chapter playthrough.

## Inventory child ticket

A dedicated inventory ticket owns the 20-slot shared-capacity runtime, quest-slot reservations, item-claim behavior and expansion-token entitlements.

## Faction/global-campaign child ticket

A dedicated campaign-state ticket owns the Heartvale faction registry, reputation tiers and the global readiness contribution model used by later realms.

## #428 / #429 / #430 — lore and canon

These tickets own campaign/lore research, source classification, Thalenyr continuity and owner canon approval. #498 implements only approved project canon.

---

# 2. Overarching SoulDrifter campaign spine

## Owner-locked high-level objective

The mortal peoples are living in the aftermath of the disappearance, defeat or imprisonment of ancient master civilizations. Mortal societies have gained freedom and built their own governments, factions, trade systems, religions and military powers, but the old forces may eventually return.

The player’s long-form objective is not merely to clear disconnected zones. The player must become powerful enough—and help the realms become stable, knowledgeable and organized enough—to negotiate with, resist, contain or compete with the returning powers on equal footing.

Every major region contributes to six persistent readiness vectors:

1. **Personal Power** — levels, skills, gear, combat mastery and class growth.
2. **Recovered Knowledge** — memories, history, lost mechanisms, warnings and enemy understanding.
3. **Alliances and Faction Influence** — trusted people, institutions, settlements, rulers and military support.
4. **Realm Stability** — safe settlements, repaired routes, functioning water/food/trade systems and contained threats.
5. **Infrastructure and Access** — Soul Connections, waystones, roads, ports, gates, supply chains and fast-travel networks.
6. **Resources and Authority** — materials, currency, crafting capacity, political legitimacy and the player’s chosen style of leadership or control.

Every main quest must advance the Heartvale crisis and tag at least one readiness vector. Side and optional quests may deepen one or more vectors without becoming mandatory.

## Heartvale’s campaign role

Heartvale is the player’s first practical lesson in how the wider game works:

- local problems are connected to larger realm instability;
- different peoples and factions interpret the same crisis differently;
- power comes from combat, knowledge, trade, alliances and infrastructure—not combat grinding alone;
- choices affect reputation and later support;
- a regional victory is one step toward preparing for the eventual return, not the end of the world story.

The Heartvale finale contains or redirects one early wound in the realm. It reveals the next regional direction and records the player’s first meaningful readiness/faction consequences.

## Source-inspired continuity and public-release boundary

Private research may track source-book events and continuity as `SOURCE_REFERENCE`. Implemented game material must still distinguish:

- `SOURCE_REFERENCE` — internal research and high-level inspiration;
- `OWNER_LOCKED` — explicit owner direction;
- `PROJECT_CANON` — approved original SoulDrifter expression;
- `PROPOSAL` — not yet approved;
- `UNKNOWN_CONFLICT` — unresolved;
- `DESIGN_QUESTION` — requires owner/gameplay decision.

For any public or monetized release, do not reproduce protected dialogue, scenes, character biographies, distinctive names or closely copied plot sequences without a license. Preserve the owner’s overarching premise through original SoulDrifter terminology, characters, factions, events and presentation.

---

# 3. Heartvale population and faction gate

## Confirmed local peoples

- Human presence is confirmed.
- Drakkin presence is confirmed.

Do not automatically make Elves the third Heartvale people. One or two additional local peoples remain `OWNER_DECISION_REQUIRED` and must be reconciled with #443, #428 and #430 before production population or faction assets are locked.

## Faction design rules

- A race is not one monolithic faction.
- Factions may be mixed-race while retaining a cultural majority or historical origin.
- Heartvale should expose 3–4 local power centers, but the exact names and membership require owner/canon approval.
- The player learns the faction system in Heartvale without being permanently locked out of half the chapter from one early choice.
- Main quests usually advance broad Heartvale stability; side and optional quests may shift individual faction reputation more strongly.
- Reputation effects must be visible and persisted.

## Working faction slots — proposals, not final canon

1. `HV-FACTION-BASIN-WARDENS` — protectors and maintainers of the Soul Well and immediate basin.
2. `HV-FACTION-ANWEL-COMPACT` — village leadership, craftspeople, farmers and merchants.
3. `HV-FACTION-DRAKKIN-WAYGUARD` — Drakkin-led travelers/wardens focused on dangerous routes, old threats and martial readiness.
4. `HV-FACTION-ROOTWARDEN-CIRCLE` — mixed local keepers of old groves, memory sites, watercourses and ecological balance.

The display names, leaders, race mix, politics and final count remain owner/canon gates.

## Reputation contract

Each faction record requires:

```text
factionId
version
name/status
member-peoples and cultural origin
starting disposition
tier thresholds
quest/event reputation sources
conflicts and alliances
vendor/service unlocks
dialogue and quest variants
world-state consequences
chapter-finale response
later-region carryover
```

Recommended early tiers:

```text
Unknown
Recognized
Trusted
Allied
```

Hostile or permanently excluded states should not be introduced in the level-2-to-10 chapter unless explicitly approved.

---

# 4. Level progression contract

```text
First Breach start: Level 1
First Breach completion / Heartvale arrival: Level 2
Opening rescue + orientation: advances toward or reaches Level 3
Heartvale campaign body: Levels 3–10
Heartvale finale: Level 10 readiness / next-region unlock
```

Use normal XP and one idempotent catch-up policy rather than blindly setting a level.

The main quest path plus normal required encounters/exploration must reach the finale at or near level 10. Side and optional quests provide extra XP in-band and increasingly shift toward gear, materials, currency, recipes, reputation, lore and convenience when completed above band.

No required main quest may depend on:

- grinding random enemies;
- completing all side/optional quests;
- one random drop without pity/fallback;
- buying inventory capacity;
- a paid item or token;
- a permanently killable story NPC;
- one specific class, profession or ancestry;
- swimming/climbing when the current player cannot access a valid alternate route.

---

# 5. Opening sequence

## `HV-MQ-01 — Trouble at the Basin`

Trigger:

- First Breach completed;
- First Memory awarded exactly once;
- player crosses the physical First Breach-to-Heartvale zone seam;
- arrival checkpoint and rollback state recorded.

Sequence:

1. A short skippable shot establishes daylight, the Soul Well Basin and the player’s arrival.
2. The camera reveals one or more local NPCs under attack while Wellkeeper Sef is occupied stabilizing the Soul Well.
3. Control returns quickly; the player joins the live encounter using real-time combat by default or tactical/turn-based when selected.
4. The player helps save the NPCs and learns targeting, basic attacks, class actions, hit reactions, healing/consumables where relevant, loot/pickup and post-combat interaction.
5. Required NPCs cannot permanently die. Player defeat resets to a safe checkpoint.
6. Survivors thank the player, establish the immediate disturbance and direct the player to Sef.
7. All rewards and tutorial flags are idempotent.

## `HV-MQ-02 — The Vale Revealed`

After the rescue:

- Sef explains the Soul Well, Heartvale, nearby settlements, current dangers and why the incidents may be connected.
- The camera transitions to an atlas-style overview generated from the accepted Heartvale map and stable location IDs.
- It reveals only known destinations, major roads and public landmarks; secrets remain hidden.
- The view returns to the player with the map/journal entry unlocked.

Player-facing choices:

1. **Help at the Basin** — surface local rescue, salvage and gathering work.
2. **Learn to gather and trade** — surface materials, inventory, selling, equipment comparison and upgrade tutorials.
3. **Point me toward Anwel** — immediately begin the road/town main quest.

These choices change recommendations and dialogue emphasis, not permanent access. A player may go directly to Anwel and return later without soft-locking tutorials or rewards.

---

# 6. Main campaign — 10 quests

| ID | Working title | Band | Story/system purpose | Prerequisite | Readiness vectors |
|---|---|---:|---|---|---|
| `HV-MQ-01` | **Trouble at the Basin** | 2 | Arrival rescue, combat, loot, checkpoint and immediate stakes | First Breach complete | Power, Alliances |
| `HV-MQ-02` | **The Vale Revealed** | 2–3 | Sef briefing, actual-map atlas reveal, journal and route choice | MQ-01 | Knowledge, Access |
| `HV-MQ-03` | **The Road to Anwel** | 3 | Roads, waystones, gathering samples, hazards and town arrival | MQ-02 | Access, Stability |
| `HV-MQ-04` | **A Village Under Strain** | 3–4 | Services, inventory/vendor/equipment tutorial, local factions and linked shortages | MQ-03 | Alliances, Resources |
| `HV-MQ-05` | **Tracks Beyond the Fields** | 4–5 | Wildlife/monster behavior, tracking, protect livestock and find first shared clue | MQ-04 | Power, Stability |
| `HV-MQ-06` | **The Orchard Remembers** | 5–6 | Memory/root disturbance, lore investigation and alternate combat/noncombat path | MQ-05 | Knowledge, Stability |
| `HV-MQ-07` | **Cargo on Dark Water** | 6–7 | Trade route, cargo recovery/escort and water/shoreline traversal with accessible alternative | MQ-06 | Resources, Access |
| `HV-MQ-08` | **Proof in the Ruins** | 7–8 | Search/interact/destruction in ruins, identify a common Echo-Wound signature | MQ-07 | Knowledge, Power |
| `HV-MQ-09` | **Hold the Old Road** | 8–9 | Multi-faction route defense/repair, reliable waystone/checkpoint/fast-travel unlock | MQ-08 | Alliances, Access, Stability |
| `HV-MQ-10` | **The Vale’s First Wound** | 9–10 | Chapter approach, major encounter, contain/redirect the wound, consequence choice and next-region unlock | MQ-09 | All six vectors |

Final origin, villain, ancient mechanism and consequence options remain `PROPOSAL` until #428/#430 and owner approval.

---

# 7. Authored side quests — 10

Side quests are NPC-authored stories with dialogue, state and meaningful local consequences. They are optional but more substantial than world activities.

| ID | Working title | Unlock | Purpose | Reward emphasis |
|---|---|---|---|---|
| `HV-SQ-01` | **Rill’s Scattered Flock** | MQ-02 | Tracking, non-hostile wildlife, escort/follow and threat avoidance | food/materials, trust |
| `HV-SQ-02` | **Hull’s Broken Line** | MQ-02 | Gather/repair, barricades, destructible vs protected objects | consumables, defense item |
| `HV-SQ-03` | **Salvage Rights** | MQ-02 | Searchable containers, pickup, shared inventory and safe destruction | upgrade materials |
| `HV-SQ-04` | **The Orchard’s Blight** | MQ-04 | Harvesting, herbs, environmental condition and starter restorative | recipe/gathering unlock |
| `HV-SQ-05` | **A Fletcher’s Measure** | MQ-04 | Equipment comparison, ammunition/ranged basics, craft-or-buy choice | weapon/ammo upgrade |
| `HV-SQ-06` | **Bonn’s Missing Grazer** | MQ-05 | Tracks, terrain clues and rescue/lure/fight choice | currency, reputation |
| `HV-SQ-07` | **Pell’s Sunken Crate** | MQ-06 | Wading/swimming or shoreline/tool alternative | trade goods, water gear |
| `HV-SQ-08` | **Mira’s Fair Price** | MQ-04 | Buy/sell, valuation, compare/equip and vendor safeguards | currency, vendor discount |
| `HV-SQ-09` | **Owyn’s Roadside Mercy** | MQ-06 | Healing/support, status recovery and nonviolent dialogue resolution | blessing/support item, lore |
| `HV-SQ-10` | **The Broken Waystone** | MQ-03 or MQ-09 prelude | Repair/attune travel marker, map pin and return-travel rules | fast-travel convenience |

Side quests remain available after direct travel to Anwel unless world state logically transforms them. A transformed quest receives an alternate state/version rather than silently disappearing.

---

# 8. Discoverable optional quests/activities — 10

Optional quests are discovered through exploration, objects, rumors, faction boards or environmental events. They cannot be required prerequisites for the main chain.

| ID | Working title | Discovery | Purpose | Reward emphasis |
|---|---|---|---|---|
| `HV-OQ-01` | **A Better Pack** | Anwel packmaker/vendor after MQ-04 | Gather/craft or earn the first inventory-expansion token; teach capacity and reservations | first +5-slot entitlement or token |
| `HV-OQ-02` | **Stones That Remember** | inspect old markers/reliefs | Lore collection and historical contradictions | journal lore, Knowledge |
| `HV-OQ-03` | **The Wayguard’s Measure** | Drakkin-led faction contact | Optional duel/trial, block/dodge/resource use and faction introduction | reputation, class-appropriate reward |
| `HV-OQ-04` | **Quiet Water, Deep Teeth** | shoreline rumor/incident | Fishing or gathering plus water-hazard awareness and alternate solution | food/materials, water consumable |
| `HV-OQ-05` | **The Hidden Cellar** | destructible clue or local rumor | Secret discovery, protected vs breakable structure and contained loot space | cache, exploration XP |
| `HV-OQ-06` | **The Long Way Around** | blocked minor route | Alternate traversal using bridge, climb, tool or repair path | shortcut, Access |
| `HV-OQ-07` | **Echoes on the Wind** | waystone circuit | Timed or ordered navigation challenge and fast-travel reinforcement | travel convenience, currency |
| `HV-OQ-08` | **The Unclaimed Banner** | abandoned camp | Choose which local power receives recovered authority/supplies | faction reputation and variant dialogue |
| `HV-OQ-09` | **The Beast That Would Not Fight** | unusual creature encounter | Read behavior and solve by calming, luring, healing or combat only as fallback | companion/wildlife lore, materials |
| `HV-OQ-10` | **A Name from Before** | memory shard/ruin | Recover one personal or realm-memory fragment tying Heartvale to the wider return-preparation arc | lore, Knowledge, future hook |

Optional activities require clear discovery and completion state, save/reload support and late-completion behavior.

---

# 9. Dependency graph

```text
FIRST BREACH COMPLETE
        |
      MQ-01
        |
      MQ-02
        |---------------- SQ-01 / SQ-02 / SQ-03
        |
      MQ-03 ---------------- SQ-10 / OQ-02 / OQ-07
        |
      MQ-04 -------- SQ-04 / SQ-05 / SQ-08 / OQ-01 / OQ-03
        |
      MQ-05 -------- SQ-06 / OQ-09
        |
      MQ-06 -------- SQ-09 / OQ-04 / OQ-06
        |
      MQ-07 -------- SQ-07 / OQ-05
        |
      MQ-08 -------- OQ-08 / OQ-10
        |
      MQ-09
        |
      MQ-10 -> HEARTVALE COMPLETE / NEXT REGION
```

The runtime stores this as a typed DAG. Tests reject cycles, missing prerequisites, orphan objectives, duplicate reward IDs, required-main dependencies on side/optional content and impossible state combinations.

---

# 10. Inventory and quest-item contract

## Base capacity

```text
base backpack capacity: 20 slots
quest items and regular physical items share the same capacity
```

Equipped gear uses equipment slots. Currency, reputation, learned recipes, map knowledge and abstract permissions do not consume backpack slots. Physical quest objects do consume slots.

## Quest-slot reservation

There is no invisible unlimited quest bag.

When a quest will require one or more physical quest items:

1. calculate the maximum simultaneously held required count;
2. reserve that many visible slots at quest acceptance;
3. count the reservation against the same 20-slot capacity;
4. prevent ordinary items from occupying reserved slots;
5. convert reservations into real quest items when collected;
6. release reservations when the items are turned in, consumed, abandoned or safely reacquired under the quest contract.

A quest cannot be accepted when its required reservation would exceed capacity unless the UI provides a safe clear-space/management step. The player must never discover hours later that a mandatory item cannot be collected.

## Full-inventory behavior

- Noncritical world drops remain in their loot container/world claim state until collected or expire under an explicit rule.
- Item rewards that cannot fit enter a visible `PENDING_REWARD_CLAIM` state and cannot be used until space is freed.
- Critical quest collection uses the reservation system; it must not silently drop, disappear or block the main story.
- Critical quest items cannot be sold, salvaged, destroyed or discarded unless the quest defines a tested reacquisition path.
- Abandoning a quest releases or removes its reserved/quest items deterministically.

## Stacking

Stackable materials consume one slot per stack. Stack limits are data-driven and require balance review. Equipment and unique quest objects normally occupy individual slots unless explicitly designed otherwise.

## Expansion tokens

Inventory expansion is entitlement-based:

```text
one Inventory Expansion Token
-> +5 backpack slots
```

Recommended POC evaluation tiers:

```text
20 base
25
30
35
40
```

The final maximum and token pricing remain owner/business decisions.

`HV-OQ-01 A Better Pack` should teach the system and may award the first +5 expansion entitlement or token through play. Additional tokens may later be earned, granted or sold, but:

- the main Heartvale campaign must be completable with the base 20 slots and quest reservations;
- no mandatory quest, class or core combat power is locked behind a paid expansion;
- a purchased expansion is quality-of-life capacity, not a hidden damage/stat advantage;
- the entitlement should be account-wide unless the owner explicitly chooses character-specific capacity;
- token purchases and entitlements must be idempotent, auditable and restorable;
- the inventory token is not automatically the same thing as any future community/crypto token;
- the POC does not assign real-money value, transferability or blockchain behavior without a separate approved legal/product ticket.

## Inventory UX

Required:

- visible `used / capacity` count;
- 20-slot base grid and expanded rows/slots;
- visible quest reservations;
- full-inventory warning before quest acceptance/turn-in;
- compare/equip/unequip;
- sort/filter/search where practical;
- protected-item warning;
- vendor and salvage safeguards;
- pending-reward claim UI;
- mobile touch targets and controller/keyboard operation;
- save/reload and reconnect-safe state.

---

# 11. Systems taught across Heartvale

Across the 30 quests, Heartvale must teach and verify:

- movement, camera, map and waypoint use;
- real-time default combat and alternate tactical/turn-based combat;
- targeting, attacks, class abilities, cooldowns and resources;
- hit reactions, defeat, checkpoint and recovery;
- dialogue, quest acceptance and choice presentation;
- containers, pickup, 20-slot inventory and quest reservations;
- equipment, comparison, buying, selling and safe salvage;
- gathering and material categories;
- one starter craft/upgrade path without making crafting mandatory;
- destructible, interactable and protected objects;
- roads, waystones, discovery and fast travel;
- wildlife, hostile creatures and environmental hazards;
- water/shoreline rules with accessible alternative paths;
- quest prerequisites, optional objectives and turn-in;
- factions and visible reputation changes;
- lore/journal/map discovery;
- save/reload, re-entry and reward idempotency;
- chapter completion and next-region readiness.

Tutorial flags are idempotent. Players who skip the local tutorial route retain condensed help in the journal/UI.

---

# 12. Quest narrative media

Every production quest receives a video introduction or in-engine cutscene narrative beat under `QUEST_DIALOGUE_VIDEO_POLICY.md`.

Do not create 30 expensive external provider videos by default.

## Major campaign beats

Fuller cutscene/story treatment:

- MQ-01 arrival/rescue;
- MQ-02 atlas reveal;
- MQ-06 major discovery;
- MQ-08 proof/revelation;
- MQ-10 finale/consequence.

## Standard main quests

Short in-engine camera/dialogue sequences with authored blocking, canonical NPC identity, expressions, voice timing and environmental context.

## Side quests

Concise 4–10 second in-engine vignette, animated dialogue beat or equivalent media introduction showing the actual problem.

## Optional quests

A discoverable world beat, object vision, rumor vignette, journal animation or short in-engine scene may satisfy the media contract when it clearly introduces the quest.

All tiers require captions, skip, replay where appropriate, reduced-motion support, mobile/desktop framing, text fallback, versioned state and no progression lock when video fails.

---

# 13. Quest record requirements

Every quest record includes:

```text
questId
version
chapterId
classification: MAIN | SIDE | OPTIONAL
recommendedLevelMin/Max
prerequisiteExpression
start/turn-in actor or discovery source
location/socket IDs
objective graph and optional objectives
failure/recovery behavior
combat-mode compatibility
party/co-op attribution
XP/currency/item/reputation/unlock event IDs
world-state reads/writes
readiness-vector contributions
faction reputation deltas
inventory reservations and reward-slot requirements
tutorial flags
map/waypoint reveal rules
video/cutscene record ID
captions/fallback ID
save migration version
repeatability/abandon/reacquire rules
evidence and verifier status
```

Every award and state transition uses stable idempotency keys. Reloading, replaying dialogue or cutscenes, re-entering triggers, reconnecting or changing combat modes cannot duplicate XP, currency, items, reputation, capacity tokens or unlocks.

---

# 14. Acceptance gates

The chapter is not owner-ready until:

1. exactly 10 main, 10 side and 10 optional records exist with stable IDs;
2. the quest DAG has no cycles, missing prerequisites, orphan objectives or required dependency on optional content;
3. MQ-01 rescue and MQ-02 atlas reveal work in both combat modes, desktop and mobile;
4. the atlas is generated from accepted map/location data and does not reveal secrets;
5. the main path reaches the level-10 target without grinding or mandatory optional quests;
6. main-only, mixed and completionist simulations stay within approved pacing;
7. faction reputation is visible, persisted and tied to actual quest choices;
8. Human and Drakkin presence is represented while additional Heartvale peoples remain owner-approved rather than assumed;
9. base 20-slot inventory can complete the entire main campaign through quest reservations and safe reward claiming;
10. no quest item is lost, sold, destroyed or duplicated incorrectly;
11. inventory expansion tokens are idempotent, restorable and never required for the main path;
12. all rewards, tutorials, cutscenes and world-state writes survive save/reload and re-entry without duplication;
13. every quest has the required narrative media beat, captions, skip/replay and nonblocking fallback;
14. population uses stable environment sockets without moving accepted roads/buildings/props ad hoc;
15. performance, browser/mobile, accessibility and real-GPU gates pass;
16. an independent verifier completes a fresh start-to-finale run and representative side/optional paths;
17. the owner approves the chapter story, faction map, finale consequence and next-region hook.

No merge or deployment occurs without owner authorization.
