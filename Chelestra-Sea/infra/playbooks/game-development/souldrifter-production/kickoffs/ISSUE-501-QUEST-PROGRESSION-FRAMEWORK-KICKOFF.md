# SoulDrifter #501 — Full Quest and Progression Framework Kickoff

## Mission

Build the reusable quest and leveling framework before the owner approves the final Heartvale quest names, scripts, details and reward numbers.

```text
framework
-> four-quest Heartvale proof
-> owner content approval
-> full 30-quest Heartvale rollout
```

Final content is not required to begin framework implementation. Use generic fixtures and temporary localization keys.

---

# 1. Mandatory reading and live state

Use cached fast-start. Read:

1. `../START_HERE.md`
2. `../SESSION_FAST_START.md`
3. `../PROJECT_CANON_INDEX.md`
4. `../WORKFLOW.md`
5. `../QUEST_AND_PROGRESSION_FRAMEWORK_RUNBOOK.md`
6. `../config/quest-progression-framework-policy.json`
7. `../templates/quest-definition.template.json`
8. `../templates/quest-instance.template.json`
9. `../HEARTVALE_LEVELS_2_10_CAMPAIGN_RUNBOOK.md`
10. `../QUEST_DIALOGUE_VIDEO_POLICY.md`
11. every governing `AGENTS.md`
12. root `CLAUDE.md` and Claude transition handoff when using Claude.

Fetch every current comment and linked PR state for:

```text
#501 #502 #503 #504 #505 #506
#442 #507 #508
#459 #498 #499 #500
#443 #451 and PR #460
```

Inspect actual current First Breach/Heartvale quest-like, tutorial, dialogue, interaction, combat, save, inventory, map, marker, progression and character-sheet code/tests.

Do not trust remembered branches. Discover the current accepted base and each ticket worktree.

---

# 2. Required first response

Before editing, return:

1. Session Receipt and Context Receipt.
2. Current issue/PR/base/branch/worktree/head map.
3. Existing implementation inventory classified as `REUSE`, `REFACTOR_BEHIND_INTERFACE`, `MIGRATE_CONTENT_ONLY`, `LEGACY_REFERENCE`, `REJECT`, or `OWNER_DECISION_REQUIRED`.
4. Shared type/interface package proposal.
5. File-collision and serialization map.
6. Canonical event catalog.
7. Quest definition and expression contract.
8. Runtime lifecycle and objective graph contract.
9. Award transaction contract with #507.
10. Persistence/idempotency/migration approach.
11. Inventory and faction gateway contracts.
12. UX projection/command contract.
13. Test/simulation/independent-verification plan.
14. Exact work that can begin before final Heartvale content approval.
15. Owner decisions that are truly required now.

No valid receipts means no implementation.

---

# 3. Parallel execution plan

## Start immediately after interface review

### Lane A — #502

Quest definitions, safe expressions, DAG compiler and content lint.

### Lane B — #503

Runtime lifecycle, quest instances, event router and condition evaluator. Use test doubles until #502 types are accepted.

### Lane C — #507

Progression kernel, XP curves, atomic award transaction, idempotency and migration.

These lanes may run in separate chats/worktrees after the orchestrator publishes the shared contract and confirms nonoverlapping files.

## Start second

- #504 objective adapters
- #505 persistence/simulator/debug tools
- #499 inventory reservations/claims

## Start third

- #506 quest UX
- #508 level-up/character-sheet UX
- #500 faction/readiness

## Integration proof

Use #459 only after foundation interfaces pass. Prove four representative quests; do not author all #498 content.

---

# 4. Content-independent requirements

- No Heartvale-specific logic in framework classes.
- Names, prose and localization are data keys.
- Objective/reward/faction/inventory/map/media references use stable IDs.
- Both combat modes emit the same quest events.
- Quest completion does not directly mutate rewards.
- Every meaningful transition and reward is idempotent.
- Save definition and mutable instance state separately.
- Structural content changes require migration rather than silent reset.
- Full inventory cannot lose or duplicate required items/rewards.
- UI consumes canonical projections and dispatches validated commands.
- Debug tools use real runtime APIs and are disabled in production.
- Future party/server authority seams are specified without delaying the local POC.

---

# 5. Hard stops

- Do not wait for final quest names/details to build framework code.
- Do not hard-code temporary Heartvale prose into services/components.
- Do not load all 30 Heartvale quests into #459.
- Do not combine every framework lane into one giant PR.
- Do not edit another ticket's active worktree.
- Do not merge or deploy.
- Do not self-verify producer work.
- No paid provider task is required or authorized for this framework.

---

# 6. Copy/paste orchestrator prompt

```text
Start SoulDrifter issue #501 using:

Chelestra-Sea/infra/playbooks/game-development/souldrifter-production/
kickoffs/ISSUE-501-QUEST-PROGRESSION-FRAMEWORK-KICKOFF.md

Read it completely and follow its mandatory live-state list.
Use cached fast-start and discover the current accepted game base and all
existing ticket branches/worktrees.

Return the Session Receipt, Context Receipt, implementation audit,
shared-interface contract, file-collision map, execution lanes and test
plan before editing.

The owner will approve Heartvale quest names, prose and details later.
Build a content-agnostic, data-driven framework now.

First parallel implementation lanes after contract review:
- #502 quest definition/compiler
- #503 quest runtime/event engine
- #507 progression/award kernel

Do not spend, merge, deploy, self-verify or put all 30 Heartvale quests
into the old #459 branch.
```
