# First Breach MVP Dependency Map

## MVP definition

A player can create/select a valid character, load into the First Breach, complete the vestibule/starter setup, choose Wayfarer or Oathbreaker, traverse 3–5 physically connected gallery chambers, defeat the Cinderbound Warden, receive the First Memory/reward exactly once, reach the Heartvale exit connector, and save/reload without breaking or duplicating the run.

## Locked order

### Gate 1 — #451 / PR #460: dungeon first

Finish/fix the existing BREACH-V2 environment, physical route graph, traversal, boss/reward/exit spine, and real-GPU acceptance. Use existing rollback actors. Do not rebuild from scratch.

Why first: #448 needs stable rooms, cameras, sockets, collisions, encounters, and thresholds for final character/monster validation. New actors cannot repair an orphan door or missing corridor.

### Gate 2 — #448 / PR #449: production actors through the new Tripo-first pipeline

After #451 is stable: modular playable bodies, heads/faces/hair/accessories/gear, starter kits, Ilyra/Orren/Brannoc MVP assemblies, Breachlings/Effigy/Warden, rigs/animations, runtime swaps, and room-by-room validation.

Revalidate the older PR against the current Tripo-first and modular-character playbook before continuing paid production.

### Gate 3 — #439: final combat animation/targeting acceptance

Finish rig-dependent attacks, class actions, creature actions, hit reactions, death completion, facing/readability, and shared gameplay/VFX/SFX markers after accepted #448 assets exist.

### Gate 4 — #445: MVP UI/combat feedback

Audit what already landed and complete only remaining First Breach needs: action icons, cooldowns, class resources, statuses/openings/chain-ready cues, target information, inventory/paper doll/dialogue, and narrow viewport.

### Gate 5 — #442 minimum progression slice

Do not block the First Breach on the full Level 1–20 system. MVP needs idempotent boss/First Memory rewards, minimum XP/progression state if awarded, save/reload, no duplicates, and exit readiness. Broader progression continues afterward.

### Gate 6 — audit/closure candidates

Revalidate #443, #440, #437, #450, and #435 against the actual merged state and current playbook. Close/supersede only after verification and owner approval.

## Not First Breach blockers

- #452–#456 Heartvale environment systems
- #459 playable Heartvale quest slice after the exit
- #457 named NPC post-MVP polish
- #458 monster post-MVP polish
- #444 later Stalker specialization
- long-term campaign/world tickets

## Immediate parallelism

During the first #451 fix pass, parallelize only read-only requirement/graph/test-plan work. Avoid multiple writers in the breach-v2 generator/layout/preview, registry/fixtures, dungeon runbook, and shared material/runtime loaders. Fan out more broadly after #451 independently verifies.
