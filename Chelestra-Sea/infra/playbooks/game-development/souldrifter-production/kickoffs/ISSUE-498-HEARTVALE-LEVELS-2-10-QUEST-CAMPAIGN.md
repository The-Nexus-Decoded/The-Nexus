# SoulDrifter #498 — Heartvale Levels 2–10 Campaign Kickoff

## Mission

Build the complete early-game Heartvale campaign after the First Breach:

```text
Level 1 First Breach
-> Level 2 Heartvale arrival and live rescue
-> Level 3 regional orientation
-> Levels 3–10 connected Heartvale storyline
-> ten main quests
-> ten side/optional quests
-> Heartvale chapter finale and next-region readiness
```

This is not twenty unrelated errands. Every main quest advances one chapter story. Side quests teach or deepen systems, locations, people and consequences without becoming mandatory for the main path.

Issue #498 is the campaign-content authority. Issue #442 owns progression runtime and numeric reward balance. Issue #459 owns the reusable quest/NPC/combat infrastructure pilot.

---

# 1. Mandatory fast start

Normal sessions use cached fast-start rather than reinstalling the workstation toolchain.

Read in order:

1. repository root `CLAUDE.md` when using Claude;
2. every governing `AGENTS.md`;
3. `../START_HERE.md`;
4. `../SESSION_FAST_START.md`;
5. `../PROJECT_CANON_INDEX.md`;
6. `../WORKFLOW.md`;
7. this kickoff;
8. issue #498 and every current owner comment;
9. issue #442 and every current owner comment;
10. issue #459 and every current owner comment;
11. issues #428, #429 and #430 for story/canon boundaries;
12. issues #451 and PR #460 for the First Breach-to-Heartvale seam;
13. issues #452–#456 for the accepted Heartvale environment systems;
14. issue #448/PR #449 and current character/NPC work when actor identity is relevant;
15. the current quest/dialogue video policy and record template;
16. the current zone/environment, collision, interaction, destruction, performance, recovery and device policies.

Required policy files:

- `../QUEST_DIALOGUE_VIDEO_POLICY.md`
- `../config/quest-dialogue-video-policy.json`
- `../templates/quest-dialogue-video-record.template.json`
- `../config/heartvale-level-2-10-campaign-policy.json`
- `../templates/heartvale-level-2-10-campaign-record.template.json`
- `../ZONE_ENVIRONMENT_COMPLETION_PIPELINE.md`
- `../ZONE_PRODUCTION_QUALITY_GATES.md`
- `../ENVIRONMENT_STAGING_PROP_PLACEMENT_POLICY.md`
- `../COLLISION_INTERACTION_DESTRUCTION_POLICY.md`
- `../SPATIAL_CONNECTION_TRAVERSAL_CATALOG.md`
- `../BROWSER_RUNTIME_ROADMAP.md`

Load `.agent-state/442/`, `.agent-state/459/`, `.agent-state/498/` and linked ticket state when present.

Do not trust remembered branch names, old screenshots or stale issue summaries. Fetch live bases, heads, comments, reviews and changed files.

---

# 2. Work ownership and PR boundaries

## #442 — progression runtime

Owns:

- XP curve and thresholds;
- current/lifetime XP;
- level-up rewards;
- skill/talent/attribute cadence;
- one idempotent award service;
- chapter catch-up rules;
- character-sheet and level-up UI;
- save schema and migration;
- party/co-op attribution policy;
- recommended-level and readiness signals.

Does not own the twenty quest scripts, encounter placement or Heartvale story writing.

## #459 — quest-system vertical slice

Owns the reusable proof for:

- Heartvale player movement/camera;
- model-swappable NPC actors;
- interaction prompts and dialogue UI;
- quest offer/accept/objective/turn-in/reward states;
- quest log and tracked markers;
- hostile spawn/kill/reward integration;
- save/reload and idempotence;
- desktop/mobile real-GPU proof.

Its original two-to-three quests remain a focused infrastructure test. Do not expand the old branch blindly into the full campaign.

## #498 — campaign content and integration

Owns:

- opening arrival/rescue sequence;
- actual-map-derived atlas reveal;
- three onboarding route choices;
- ten linked main quests;
- ten side/optional quests;
- typed prerequisite/objective DAG;
- scripts and narrative beats;
- approved location/NPC/socket use;
- reward categories supplied to #442;
- tutorial distribution;
- world-state consequences;
- complete chapter playthrough and evidence.

## Canon work

#428/#429/#430 and the owner approve the chapter cause, antagonist, final consequence and next-region hook. `Echo Wound` and `The Vale's First Wound` are working proposals until approved.

---

# 3. Branch and worktree rule

Do not assume `codex/459-heartvale-npc-quests` is the implementation base. It was created as an earlier pilot branch and may be behind the accepted First Breach, Heartvale, character and playbook state.

At kickoff:

1. fetch all remotes;
2. identify the latest accepted Heartvale integration commit;
3. identify accepted dependencies from #451/#460, #452–#456, #459, #442 and actor work;
4. report conflicts;
5. create or reuse one #498 branch/worktree from the approved base;
6. do not rebase, reset, overwrite or cherry-pick active work by assumption.

Suggested branch only after base approval:

`codex/498-heartvale-level-2-10-campaign`

One worker session owns one issue/branch/worktree. Producer and independent verifier are different sessions.

---

# 4. Progression target

Use this planning target until #442 locks exact numbers:

```text
First Breach starts: Level 1
First Breach completion / Heartvale arrival: Level 2
Opening rescue + atlas orientation: Level 3
Heartvale remainder: Levels 3–10
Heartvale finale: Level 10 readiness and next-region unlock
```

Rules:

- use normal XP and an idempotent catch-up award rather than arbitrary level assignment;
- the main path plus its required encounters/exploration reaches the finale without grinding;
- all ten side quests are optional;
- side quests provide level-appropriate XP plus equipment, materials, currency, recipes, reputation, lore or convenience;
- over-level side rewards may convert toward non-XP value;
- no reward duplicates after reload, reconnect, cutscene replay, trigger re-entry or combat-mode change;
- exact XP numbers, curves and level rewards require #442 owner review.

---

# 5. Mandatory opening

## `HV-MQ-01 — Trouble at the Basin`

Trigger only after:

- First Breach completion;
- First Memory/reward granted exactly once;
- physical First Breach-to-Heartvale zone seam crossed.

Sequence:

1. short, skippable daylight establishing shot of the Soul Well Basin;
2. reveal Shepherdess Rill and Sergeant Hull under attack;
3. Wellkeeper Sef is occupied stabilizing the Soul Well and cannot resolve the fight;
4. return control promptly;
5. player joins a real encounter in real-time default or selected tactical mode;
6. teach targeting, basic/class actions, hit response, consumable/recovery and pickup through play;
7. if defeated, return to a safe checkpoint without corrupting required NPC state;
8. Sef, Rill and Hull acknowledge the rescue and recent disturbances;
9. grant one-time objective and reward events.

The opening must not be a noninteractive movie followed by another tutorial. The player acts quickly and the scene uses the real combat simulation.

## `HV-MQ-02 — The Vale Revealed`

After MQ-01:

1. Sef explains the Soul Well, Heartvale and the immediate regional problem;
2. transition to an atlas-style camera/map presentation derived from the accepted Heartvale map data;
3. reveal only known locations/routes such as the Soul Well Basin, Anwel, Vaeldor, Lockroot, Erboug, Thalen's Heir, the World Tree/Old Fen area and approved roads/waystones when present in the actual current map;
4. do not expose secret or unexplored detail;
5. create the map/journal entry;
6. return control with three choices.

Choices:

- `HELP_AT_THE_BASIN`
- `LEARN_GATHERING_AND_TRADE`
- `GO_DIRECTLY_TO_ANWEL`

The choice controls recommendations and presentation—not permanent access. Players may skip local lessons, reach Anwel and return later. Skipping may not create a tutorial, equipment, quest or progression soft lock.

---

# 6. Main quest roster

| ID | Working title | Band | Primary NPCs | Purpose |
|---|---|---:|---|---|
| `HV-MQ-01` | Trouble at the Basin | 2 | Sef, Rill, Hull | Arrival rescue, real combat, recovery and pickup |
| `HV-MQ-02` | The Vale Revealed | 2–3 | Sef, Cael | Atlas reveal, journal/map and route choice |
| `HV-MQ-03` | The Road to Anwel | 3 | Cael | Roads, waystones, travel, discovery and optional gathering |
| `HV-MQ-04` | A Village Under Strain | 3–4 | Droma, Mira, Anes, Bonn | Town services, buy/sell/equip and linked local problems |
| `HV-MQ-05` | Tracks Beyond the Fields | 4–5 | Bonn, Anes, Rill | Tracking, wildlife/monster behavior and field combat |
| `HV-MQ-06` | The Orchard Remembers | 5–6 | Old Fen, Owyn | Lore/exploration, memory/root disturbance and mixed solutions |
| `HV-MQ-07` | Cargo on Dark Water | 6–7 | Pell, Mira | Trade route, escort/recovery and water/shoreline path |
| `HV-MQ-08` | Proof in the Ruins | 7–8 | Ils, Cael | Search/destruction/interaction, evidence and revelation |
| `HV-MQ-09` | Hold the Old Road | 8–9 | Hull, Owyn, Cael | Route defense/repair and reliable travel unlock |
| `HV-MQ-10` | The Vale's First Wound | 9–10 | Core Heartvale cast | Finale, consequence choice and next-region readiness |

Main quests cannot depend on optional quests, a profession, an unbounded random drop, destructible progression-critical geometry or a permanently killable story NPC.

---

# 7. Side and optional quest roster

| ID | Working title | Unlock | NPC | Primary system/reward |
|---|---|---|---|---|
| `HV-SQ-01` | Rill's Scattered Flock | MQ-02 | Rill | Tracking, wildlife, escort; food/materials/trust |
| `HV-SQ-02` | Hull's Broken Line | MQ-02 | Hull | Gather/repair and destructible/protected objects |
| `HV-SQ-03` | Salvage Rights | MQ-02 | Ils | Containers, pickups, inventory and safe destruction |
| `HV-SQ-04` | The Orchard's Blight | MQ-04 | Old Fen | Harvesting, herbs and starter restorative recipe |
| `HV-SQ-05` | A Fletcher's Measure | MQ-04 | Anes | Equipment comparison and craft-or-buy choice |
| `HV-SQ-06` | Bonn's Missing Grazer | MQ-05 | Bonn | Tracking, terrain clues and rescue/lure/combat choice |
| `HV-SQ-07` | Pell's Sunken Crate | MQ-06 | Pell | Water/shoreline interaction and trade goods |
| `HV-SQ-08` | Mira's Fair Price | MQ-04 | Mira | Buy/sell/equip/value and vendor confidence |
| `HV-SQ-09` | Owyn's Roadside Mercy | MQ-06 | Owyn | Healing/support, dialogue and nonviolent resolution |
| `HV-SQ-10` | The Broken Waystone | MQ-03 | Cael | Map pin, waystone and return/fast-travel rules |

SQ-07 requires an accessible shoreline/tool/rope/companion alternative until swimming is production-ready for every supported player/input profile.

---

# 8. Required DAG

```text
FIRST BREACH COMPLETE
        |
     MQ-01
        |
     MQ-02
        |---------------- SQ-01 / SQ-02 / SQ-03
        |
     MQ-03 ---------------- SQ-10
        |
     MQ-04 -------- SQ-04 / SQ-05 / SQ-08
        |
     MQ-05 -------- SQ-06
        |
     MQ-06 -------- SQ-09
        |
     MQ-07 -------- SQ-07
        |
     MQ-08
        |
     MQ-09
        |
     MQ-10 -> HEARTVALE COMPLETE / NEXT REGION
```

Implement as typed data. Automated checks fail on cycles, duplicate IDs/reward events, unresolved prerequisites, required-to-optional dependency, orphan objectives, impossible state expressions or unreachable quests.

---

# 9. Systems taught through play

Across the twenty quests, prove:

- movement, camera, map, journal, waypoints and location discovery;
- real-time default and tactical/turn-based combat on one simulation;
- targeting, class actions, cooldowns and class resources;
- hit reaction, defeat, checkpoint and recovery;
- dialogue, choice and NPC state;
- containers, pickups and inventory;
- equipment comparison, equip/unequip, buying and selling;
- gathering and material categories;
- one starter upgrade/craft path without making crafting mandatory;
- destructible, interactable and protected environmental objects;
- roads, waystones and fast travel;
- wildlife, hostile creatures and hazards;
- water traversal when available;
- prerequisites, optional objectives, tracking, turn-in and rewards;
- lore/journal discovery;
- save/reload, abandon/reacquire and zone re-entry;
- chapter completion and readiness.

Tutorial flags are idempotent. Players who skip a lesson retain concise help in the journal/UI.

---

# 10. Cutscene and quest-video tiers

Every production quest receives a narrative beat, but do not create twenty expensive provider videos by default.

## Tier A — major campaign beats

- MQ-01
- MQ-02
- MQ-06
- MQ-08
- MQ-10

May use fuller in-engine or external sequences after exact owner approval.

## Tier B — standard main quests

Short in-engine camera/dialogue sequences with authored blocking, expressions, voice timing and environment context.

## Tier C — side quests

Concise 4–10 second in-engine vignette, animated dialogue beat or equivalent problem reveal.

Every tier requires captions, skip, mobile/desktop framing, reduced-motion handling, nonblocking text fallback and replay where appropriate. Externally hosted media uses a versioned lazy-load manifest and stays outside the base zone bundle. Visible named speakers use the canonical NPC identity.

---

# 11. Quest runtime record

Every quest records:

```text
questId and version
chapter/classification
recommended level band
prerequisite expression
start and turn-in NPC IDs
location and stable socket IDs
objective DAG and optional objectives
failure and recovery
both combat modes
party/co-op attribution
XP and reward event IDs
world-state reads/writes
tutorial flags
map/waypoint reveals
cutscene/video/caption/fallback IDs
save migration
abandon/reacquire/repeat policy
evidence and verifier status
```

Use the campaign policy and record template supplied with this kickoff.

---

# 12. Implementation sequence

## Phase 0 — read-only audit and canon/progression contract

- load current issues, PRs, code, data and accepted map/environment state;
- identify the current Heartvale base rather than trusting old #459;
- approve or replace the working story cause;
- lock #442 curve/reward assumptions;
- produce the campaign record and dependency map.

## Phase 1 — #459 infrastructure proof

Prove 2–3 representative quests end to end before loading all twenty. Include one combat quest, one interaction/gather/delivery quest and one mixed/escort/exploration quest.

## Phase 2 — opening sequence

Build MQ-01 and MQ-02 first. They are the chapter's integration pilot for:

- zone seam;
- cutscene-to-control transition;
- protected story NPCs;
- real combat modes;
- checkpoint recovery;
- one-time rewards;
- actual-map atlas;
- route recommendations and skip-safe tutorials.

Do not proceed to the full campaign until these pass independent verification.

## Phase 3 — Anwel onboarding act

Implement MQ-03–MQ-04 and SQ-01–SQ-05/SQ-08 as their locations and dependencies permit.

## Phase 4 — investigation act

Implement MQ-05–MQ-08 and SQ-06–SQ-09.

## Phase 5 — defense/finale act

Implement MQ-09–MQ-10 and any remaining optional content, chapter consequences and next-region handoff.

## Phase 6 — full regression and balance simulation

Test:

- main-only route;
- local-help-first route;
- gathering/trade-first route;
- direct-to-Anwel route;
- completionist route;
- delayed side quests;
- abandon/reacquire;
- defeat/recovery;
- save/reload at every main stage;
- both combat modes;
- representative classes/body sizes;
- desktop/mobile;
- repeat trigger/cutscene/reconnect idempotence;
- final level/readiness and no-grind behavior.

## Phase 7 — independent verification and owner review

Producer stops at `IMPLEMENTED_UNVERIFIED`. A separate verifier tests the exact commit and returns per-requirement PASS/FAIL/NEEDS_EVIDENCE. No merge/deploy without owner approval.

---

# 13. First response required from a new session

Before editing, return:

```text
HEARTVALE #498 SESSION RECEIPT
platform: <M3|Claude Code|ChatGPT/Codex|other>
role: <orchestrator|442-worker|459-infrastructure-worker|498-content-worker|verifier>
issue: <442|459|498>
branch: <branch>
base: <base>
worktree: <absolute path>
localHead: <sha>
liveHead: <sha>
contextVersion: <START_HERE version>
cachedToolchainReceipt: PASS | REFRESH_REQUIRED | BLOCKED
issuesAndPrsFetched: yes/no
agentStateLoaded: yes/no
questVideoPolicyLoaded: yes/no
campaignPolicyLoaded: yes/no
heartvaleEnvironmentBase: <commit/unknown>
firstBreachSeamBase: <commit/unknown>
paidMediaPlanned: yes/no
blockingIssues: []
```

Then provide:

1. live dependency/branch/worktree audit;
2. #442/#459/#498 responsibility confirmation;
3. old #459 branch disposition;
4. current Heartvale map/NPC/socket inventory;
5. canon conflict and owner-decision report;
6. proposed XP/reward simulation inputs without locking unapproved numbers;
7. opening rescue/atlas technical plan;
8. quest DAG/schema plan;
9. cutscene/video tier and cost plan;
10. environment/population dependencies;
11. test/evidence plan;
12. next owner gate.

No valid receipt means no implementation.

---

# 14. Hard stops

- no use of the stale #459 branch without a current-state audit;
- no silent promotion of `Echo Wound` or another proposal to canon;
- no required main quest depending on optional content;
- no combat grinding requirement;
- no duplicate rewards;
- no permanently killable required NPC;
- no decorative atlas contradicting actual map data;
- no water-only route without an accessible fallback until water gameplay is verified;
- no twenty external provider videos by assumption;
- no paid media/model/provider operation without live quote and owner approval;
- no producer self-verification;
- no merge or deployment without owner approval.

---

# 15. Copy/paste opening prompt

```text
Start SoulDrifter issue #498 using:

Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/
kickoffs/ISSUE-498-HEARTVALE-LEVELS-2-10-QUEST-CAMPAIGN.md

Read it completely and follow its mandatory reading list. Fetch all live
issues/comments and linked PRs/reviews/heads. Discover the current accepted
Heartvale base and correct worktree; do not assume the old #459 branch is current.

Select one role: ORCHESTRATOR, 442-WORKER, 459-INFRASTRUCTURE-WORKER,
498-CONTENT-WORKER or INDEPENDENT-VERIFIER.

Return the Heartvale #498 Session Receipt and complete first-response audit
before editing.

Respect the split:
- #442 progression runtime and numeric rewards
- #459 reusable 2-3 quest infrastructure proof
- #498 opening rescue, atlas reveal, 10 main quests, 10 side quests and chapter integration

Do not spend, merge, deploy or canonize the working Echo Wound proposal.
```
