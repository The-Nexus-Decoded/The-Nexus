# Quest Engine — Heartvale (JSON-DB, live-modifiable, debuggable)

Branch: `codex/heartvale-outdoor` · Owner request: a fully-fledged quest engine built from the ground up — modular, debuggable, real-time, GM/AI-agent-drivable, with a JSON-file database until a backend lands.

## Architecture

```
src/game/questdb/
  schema.ts     JSON DB contracts + validation (definitions, overrides, templates)
  templates.ts  Seeded dynamic quest instances (daily rotation, GM one-offs)
  engine.ts     QuestEngine — the modular runtime (state, events, debug log)
  gm.ts         GM / AI-agent command surface (append-only audited overrides)
  jsonStore.ts  Browser side of the JSON DB (fetch + live localStorage overlay)

scripts/questdb/
  export-heartvale-questdb.mjs  TS content -> JSON DB ("migration" generator)
  questgm.mjs                   CLI for GM/AI commands against the overrides file

public/data/
  heartvale-questdb.json          Definitions DB (14 authored quests, 3 templates)
  heartvale-quest-overrides.json  Live overrides DB (audited, starts empty)
```

Three documents, three lifetimes:

1. **Definitions DB** — authored in typed TS (`zoneHeartvale.ts`), materialized to JSON by the export script, committed. This is the seeded "migration".
2. **Overrides DB** — append-only GM/AI modifications. Never edits definitions; later revisions win; every entry carries revision, author, reason, timestamp. When a real backend lands, these two JSON documents are the exact payloads to store.
3. **Player state** — per-player quest log/progression/phasing in `zoneState.ts`. GM tools never touch it.

## Live modification (GM or AI agent)

CLI (writes the committed overrides file):

```powershell
node --experimental-strip-types scripts/questdb/questgm.mjs `
  --command '{"op":"objective.patch","questId":"q-mudclaw-toll","objectiveId":"cull","patch":{"count":8}}' `
  --author gm-olawal --reason "mudclaw week"
node --experimental-strip-types scripts/questdb/questgm.mjs --audit
```

Browser session (same `gm.ts` semantics): apply through `applyGmCommand`, persist with `saveLiveOverrides()` (localStorage overlay), export for the CLI with `exportLiveOverrides()`.

Operations: `quest.patch` (name/summary/rewards/expiry), `objective.patch` (counts/labels), `quest.retire`, `quest.inject` (full validated definition — live events), `template.retire`.

## Real-time and dynamic quests

- **Daily rotation**: templates instantiate with `seed = hash(templateId:date)` — the same daily for every player (shared world), non-generic because slots draw from lore-flavored pools (monsters, named places, echo-law flavor lines).
- **Expiry**: instances carry `expiresAt`; `engine.tick(now)` retires expired, uncompleted quests (completed ones stay completed forever).
- **Live injection**: `engine.injectLive(quest)` for one-off GM/AI events; persisted separately through the overrides surface.

## Debug surface

- Bounded (200) in-memory event log: offers, accepts, progress, ready, completions, expiries, template instantiations, override applications.
- `engine.debugSnapshot()` — full JSON dump: every quest with live status and origin (`authored` | `template` | `gm`), retired ids, the event log.
- `auditTrail(overrides)` — human-readable GM change history.

## Engine API (used by the runtime zone and future server)

`offeredBy(npcId)` · `turnableAt(npcId)` · `accept(id)` · `event(kind, targetId, amount)` → ids newly ready · `turnIn(id, at)` → rewards + world mutation · `rotateDailies(date)` · `tick(now)` · `injectLive(quest)` · `state`/`restore(state)` · `setOverrides(db)` · `debugSnapshot()`

## Tests

`tests/questEngine.test.ts` (17 tests): schema validation, template determinism (same date = same instance for all players), reward scaling, expiry, override patch/retire/inject + audit, engine flow, daily rotation idempotence, live injection, mid-session overrides, bounded debug log, persistence round-trip.
