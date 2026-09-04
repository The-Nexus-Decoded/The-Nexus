# SoulDrifter #498 — Heartvale Levels 2–10 Campaign Kickoff

## Purpose

Mandatory repository-backed catch-up and execution entry point for any M3, Claude Code, ChatGPT/Codex or other session working on the complete Heartvale early-game chapter.

The chapter is:

```text
First Breach completion / Level 2 arrival
-> live Soul Well Basin rescue
-> actual-map atlas reveal
-> 10 main quests
-> 10 authored side quests
-> 10 discoverable optional quests
-> Level 10 finale and next-region readiness
```

Chat history is not authoritative. Fetch live repository, issue, PR, worktree and `.agent-state` state before editing.

---

# 1. Mandatory reading

Read in this order:

1. `../START_HERE.md`
2. `../SESSION_FAST_START.md`
3. `../PROJECT_CANON_INDEX.md`
4. `../WORKFLOW.md`
5. `../HEARTVALE_LEVELS_2_10_CAMPAIGN_RUNBOOK.md`
6. `../QUEST_DIALOGUE_VIDEO_POLICY.md`
7. `../config/heartvale-campaign-policy.json`
8. `../templates/heartvale-quest-record.template.json`
9. `../config/quest-dialogue-video-policy.json`
10. `../templates/quest-dialogue-video-record.template.json`
11. governing repository/project `AGENTS.md`
12. root `CLAUDE.md` and the Claude transition handoff when using Claude.

Fetch the full live state and every current comment for:

- #428 — campaign/lore/world state;
- #429 — research/source/copyright classification;
- #430 — Thalenyr atlas/continuity;
- #442 — XP/level/reward progression;
- #443 — ancestry/calling/body matrix;
- #451 and PR #460 — First Breach exit and current production reality;
- #452–#456 — Heartvale environment systems;
- #459 — reusable playable quest/NPC/combat proof;
- #498 — complete campaign content/integration;
- #499 — shared inventory and expansion entitlements;
- #500 — faction reputation and realm readiness.

Inspect actual current Heartvale map, NPC, quest, spawn, environment-socket, save, inventory, progression, dialogue, combat and cutscene code/data/tests before proposing implementation.

---

# 2. Responsibility split

```text
#442 = progression runtime and reward budget
#459 = reusable 2–3 quest infrastructure proof
#498 = all 30 quest records, story, objectives and chapter integration
#499 = 20-slot shared inventory, reservations and expansion tokens
#500 = human faction reputation and readiness vectors
#428/#429/#430 = lore research, classification and canon approval
```

Do not collapse all work into one branch merely because the systems interact. Define dependency contracts and use one issue/branch/worktree per implementation concern.

---

# 3. Owner-locked chapter contract

## Levels

```text
First Breach starts: Level 1
Heartvale arrival: Level 2
Rescue + orientation: toward/reaches Level 3
Heartvale body: Levels 3–10
Finale: Level 10 readiness / next-region unlock
```

Use XP and an idempotent catch-up rule; do not blindly hard-set levels.

## Quest count

```text
10 MAIN
10 SIDE
10 OPTIONAL
30 TOTAL
```

The main path plus required encounters/exploration reaches level 10 without grinding, all side quests, all optional quests or a purchased capacity expansion.

## Opening

- player physically crosses the accepted First Breach-to-Heartvale seam;
- a short skippable arrival shot establishes the basin;
- human local NPCs are under attack;
- the player regains control and helps save them in the selected combat mode;
- required NPCs cannot permanently die;
- defeat resets to a safe checkpoint;
- Sef provides the regional briefing;
- an atlas view is generated from accepted Heartvale map/location data;
- the player may help locally, learn gathering/trade or go directly to Anwel;
- routes alter recommendations, not permanent access.

---

# 4. Global campaign direction

Every region contributes to preparing mortal societies for the possible return of ancient powers. The player builds:

1. personal power;
2. recovered knowledge;
3. alliances and faction influence;
4. realm stability;
5. infrastructure and access;
6. resources and authority.

Heartvale must visibly introduce this structure. It is not a collection of unrelated tutorials.

Private research may track source-book history as `SOURCE_REFERENCE`. Public/monetized implementation uses approved original SoulDrifter expression unless rights are obtained. Keep owner-locked direction, project canon, proposals and conflicts separate.

---

# 5. Human-only population/faction gate

Heartvale is **human-only** for this chapter and POC.

- Every resident, named quest NPC, merchant, guard, traveler, faction member and social actor is Human.
- Drakkin are not in Heartvale; they are introduced later in other locations.
- Elves, Dwarves, Halflings and other peoples are also not local Heartvale NPCs in this chapter.
- Do not insert dragons, dragonkin, Drakkin cameos, nonhuman visitors or nonhuman quest givers by assumption.
- Hostile wildlife and breach-born monsters remain allowed, but no dragon/Drakkin creature or character is introduced here without a later explicit owner change.

Heartvale should present 3–4 approved **human** local power centers. It demonstrates that multiple factions and political interests can exist within one people. Race and faction remain separate concepts globally, but Heartvale’s factions are all human.

The working faction IDs/names in the runbook are proposals only. The Roadwarden faction and `HV-OQ-03` must use human Heartvale characters—not Drakkin.

---

# 6. Inventory gate

```text
base backpack = 20 slots
physical quest items and normal physical items share capacity
1 expansion entitlement/token = +5 slots
```

Required quest items reserve visible counted slots at quest acceptance. There is no unlimited hidden quest bag.

The base 20 slots plus reservations must complete the main campaign. Full-inventory rewards use a visible pending-claim state rather than disappearing or duplicating. Critical quest items cannot be sold/destroyed without a tested reacquisition route.

The first +5 expansion may be taught/earned through `HV-OQ-01 A Better Pack`. This is not automatically connected to a community/crypto token, and no real-money or blockchain implementation belongs in the POC without a separate approved ticket.

---

# 7. Implementation order

```text
A. Read-only audit and current-base discovery
B. Lock approved story and human faction decisions
C. Validate every Heartvale social actor as HUMAN
D. Define typed 30-quest DAG and stable IDs
E. #442 level/reward simulations and APIs
F. #459 reusable opening/infrastructure proof
G. #499 inventory capacity/reservation proof
H. #500 human faction/readiness proof
I. Implement #498 main quest chain in level bands
J. Implement side quests
K. Implement optional quests
L. Integrate narrative media/cutscenes
M. Complete save/re-entry/reconnect/idempotency tests
N. Desktop/mobile/both-combat-mode playthrough
O. Independent verification
P. Owner story/gameplay verdict
```

Do not populate against a stale or unverified environment. Consume stable actor, encounter, cinematic, quest-object and drop sockets from the accepted Heartvale dependency commit.

---

# 8. Required first response

Before editing, return:

1. Session Receipt and Context Receipt.
2. Current issue/PR/branch/worktree/base/head map.
3. Current accepted Heartvale environment dependency and stable socket inventory.
4. Existing quest/progression/inventory/faction/save implementation audit.
5. Canon/source/proposal/conflict report.
6. Human-only NPC/population validation plan, including removal or rejection of any stale Drakkin/nonhuman Heartvale assumptions.
7. 30-quest DAG validation report.
8. Main-only, mixed and completionist progression simulation plan.
9. Inventory reservation/expansion implementation plan.
10. Human faction/readiness model.
11. Opening rescue and atlas implementation plan.
12. Narrative-media routing and any spend gates.
13. Exact branch/worktree split and file-collision map.
14. Tests, evidence and independent-verification plan.
15. Owner decisions required before implementation.

## Hard stops

- no automatic canonization of proposals;
- no Drakkin or other nonhuman Heartvale social population;
- no paid provider task without exact live approval;
- no required quest depending on optional content or paid capacity;
- no source-book protected text/scene copying into public implementation;
- no work in another ticket’s active worktree;
- no self-verification;
- no merge or deploy without owner approval.

---

# 9. Copy/paste opening prompt

```text
Start SoulDrifter Heartvale campaign issue #498 using:

Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/
kickoffs/ISSUE-498-HEARTVALE-CAMPAIGN-KICKOFF.md

Read it completely and follow its mandatory reading/live-state list.
Use cached fast-start and discover the latest accepted Heartvale base,
branch and worktree. Do not rely on chat memory or the stale #459 branch.

Return the required Session Receipt, Context Receipt and complete
first-response audit before editing.

Owner-locked counts:
- 10 main quests
- 10 side quests
- 10 optional quests
- 30 total

Heartvale begins around level 2 and ends around level 10. The opening is
a live Soul Well Basin rescue followed by an atlas view generated from
the accepted map.

Heartvale is HUMAN-ONLY for this chapter and POC. Every resident,
quest NPC, merchant, guard, traveler and faction member is Human.
Drakkin are introduced in later locations, not Heartvale. Do not add
Drakkin, dragons, dragonkin, Elves, Dwarves, Halflings or other social
NPC peoples to Heartvale without a later explicit owner change.

Base backpack capacity is 20 shared physical-item slots. Quest items
reserve counted slots. One expansion token/entitlement adds five slots,
but the main path cannot require a purchase.

Do not spend, merge, deploy, canonize proposals or copy protected source
material into public implementation.
```
