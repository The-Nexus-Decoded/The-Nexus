# Heartvale Environment-First Production Handoff

Version: 2026-09-04 / environment-first-v2
Parent: #501
Immediate production children: #509 (environment), #510 (new Tripo Human NPC cast)

## 1. Latest owner decision

The first deliverable is a substantially reworked, populated, playable Heartvale outdoor section in the actual game. It is not another framework-only planning report.

Order:

```text
recover the current outdoor build and asset state
-> redesign/reconstruct Heartvale's map, buildings, landscape and water
-> place usable existing creatures and newly generated Tripo Human NPCs
-> implement a small provisional quest loop on that real map
-> review the integrated 3D first pass
-> expand/harden the full reusable quest and leveling framework
-> owner approves final story/names/numbers
-> complete the 30-quest chapter
```

This supersedes the older instruction to finish all framework work before touching the outdoor level. It does not authorize a disposable second quest engine. A narrow implementation of the intended definition/state/reward interfaces may support the early playable proof.

## 2. Lead model and runtime

Owner requested GPT-6 Astra at the highest available reasoning setting. Requested API model is `gpt-6-astra`, reasoning `max` where supported by the host and account. Official reference checked 2026-09-04: https://developers.openai.com/api/docs/models/gpt-6-astra . Record the actual selected model/effort in the session receipt. Do not claim that writing this prompt selects a model or that account access has been verified. Report unavailability rather than silently substituting.

Astra is the lead AI, not the game engine. Three.js and browser/mobile delivery remain unchanged. No Babylon/Unity/Unreal migration belongs here.

## 3. Recover the original outdoor design

Repository: `The-Nexus-Decoded/The-Nexus`
Game root: `Arianus-Sky/projects/games/SoulDrifterWeb`
Historical outdoor branch: `codex/heartvale-outdoor`

The original named design/build tasks are in `docs/HEARTVALE_ZONE_TICKETS.md`:

- `ZONE-HV-1 — Soul Well Basin`: first outdoor arrival zone.
- `ZONE-HV-2 — Anwel & Lockroot Reach`: village/first townward region.
- `ZONE-HV-3` through `ZONE-HV-7`: the remaining mapped Heartvale subzones.

These are named document records, not a verified single numbered GitHub parent issue. Searches did not identify a standalone original outdoor PR. Do not label indoor PR #460 as the outdoor build.

Read the live versions of:

- `server/sections.mjs`
- `public/data/zones/heartvale/layout.json`
- `public/data/zones/heartvale/heartvale-npcs.json`
- `docs/THALENYR_SCALE_AND_SECTIONS.md`
- `docs/HEARTVALE_ZONE_TICKETS.md`
- `docs/ZONE_BUILD_RUNBOOK.md`
- `docs/REVIEW-2026-08-20-heartvale-hv1-v2.md`
- current environment implementation, manifests, shaders, collision/navigation and tests.

The historical outdoor checkpoint `43876e05` is a recovery reference only. Never reset current work to it. Discover local-only versus pushed work, fetch current branch heads and compare them with the accepted integration base. Preserve the old renderable baseline and source files. Do not overwrite the active #456 or #487 worktrees.

## 4. Existing domain work to reconcile

| Ticket | Existing responsibility |
|---|---|
| #452 | Anwel streets/buildings, doors/chimneys/windows, garden/crop/jetty/boat quality |
| #453 | River confluences, banks, grazing-angle appearance, depth/current/wade/swim behavior |
| #454 | Terrain palette, grass, ground PBR, vegetation and mobile quality |
| #455 | Map-derived stone waystones and readable destination guidance |
| #456 | Creature meshes, rigs, animation library and source/rejection history |
| #492 | Species/habitat registry and deterministic population selection |
| #493 | Ground/water/road/building/prop/slope legality and movement exclusions |
| #494 | Creature behavior, home ranges and verified animation transitions |
| #495 | Staged wildlife runtime integration and final performance/acceptance |
| #459 | Provisional in-world quest/NPC/encounter integration |

Use existing code and ticket branches when valid. Each concern has one owner. #509 coordinates/reconciles environment work; it does not grant permission for two agents to edit the same files independently.

Historical findings include washed-out water, jagged junctions/banks, flat materials, poorly readable streets, primitive crops and building-detail defects. Later #452 comments corrected some earlier claims: street positions existed but did not visually read as a street. Each finding must be retested as FIXED / STILL_PRESENT / REGRESSED / NOT_VERIFIED using fresh runtime views. Do not repeat historical claims as current observations.

## 5. Rework scope and preserved constraints

Audit and redesign the whole currently authored Heartvale outdoor section as one coherent map. Implement the Basin -> road/ford -> Anwel -> nearby fields/river loop first, then complete the remaining mapped section work. A successful first loop is an intermediate milestone, not permission to claim the whole section finished. New realms and the rest of Thalenyr are out of scope.

Preserve:

- Human-only local social population: residents, named NPCs, merchants, guards, travelers and factions. Wildlife/breach monsters are separate; no Drakkin/dragon cameos. Do not change player ancestry eligibility through this rule.
- The treeless grassy Soul Well Basin; do not insert forest to satisfy a vegetation-density target.
- The outdoor Soul Well as a shallow silvery machine-like liquid pool, not a bucket well. Ordinary river water remains a different system. Preserve the accepted First Breach exit/connection semantics.
- One accepted master map and world coordinate frame; no guessed second map or detached NPC coordinates.
- Continuous terrain/roads/rivers across simulation subzone boundaries; boundaries are not walls.
- True 3D gameplay-scale presentation and the whole-section vista. A streaming redesign requires measured need and review, not blind revival of an older instruction.
- Existing working First Breach, stable identities, provenance and rollback assets.

## 6. Environment production gates

1. Capture current baseline at matching top-down, gameplay, street and river cameras.
2. Redesign the top-down topology and spatial layout, including quest routes, settlements, crossings, safe areas, habitats and gathering regions.
3. Reserve NPC, encounter, quest-object, conversation-camera, cinematic, loot and return-route space before detailed geometry.
4. Graybox with the real controller/camera; prove routes and clearances.
5. Rework landscape, rivers/banks, streets and purpose-specific buildings. Fix foundations, roof/chimney intersections, door steps/openings, windows, material channels, gardens/crops, jetty/boats and prop grounding.
6. Stage props by function; then run the prop-complete collision, camera, navigation and interaction/destruction walkthrough. Keep structural/progression-critical objects protected.
7. Verify water looks correct at close/grazing views and behaves according to its implemented depth/flow/traversal contract. Required routes must have safe land/bridge alternatives until swimming is ready.
8. Verify lighting/audio/wayfinding, device performance, loading, out-of-bounds recovery and First Breach regression.
9. Publish versioned stable placement sockets; populate only after each affected area passes the needed environment gates.
10. Repeat collision/nav/performance checks after adding NPCs, creatures and quest objects.

## 7. Shared placement manifest

Each placement records:

```text
placementId, schemaVersion, mapVersion, dependencyCommit
zoneId, locationId, socketId
localTransform, worldTransform, facing, terrainContact
role, actorSize, footprint, clearanceEnvelope
water/road/building/prop exclusions, slope limit
habitat, homeAnchor, route/path references
actorId or creatureAssetId, sourceHash
questIds, interactionRadius, dialogue/cinematic camera envelope
mesh/material/rig/animation/placement/gameplay review states
```

The map view, atlas reveal, quest markers, NPC placements and habitat queries all derive from this same data. Missing/invalid references are errors, not a cue to place actors wherever they fit visually.

## 8. Existing creature reuse and honest animation states

Read the newest #456 body, ALL subsequent corrections, relevant manifests and the actual producing worktree/artifact files. The remote root `.planning/HANDOFF.json` was not available during this handoff audit; discover real local evidence paths rather than assuming the file or newest models are pushed.

The issue body records historically approved horse/cow pilots. Later model-complete posts include unrigged candidates. Still later comments reject or replace some of those versions. The latest inspected 2026-09-04 dog r3 package is quarantined and the restyling plan changed. Treat each exact hash independently; do not import the folder wholesale or mistake MODEL_COMPLETE for final acceptance.

Maintain separate statuses:

- `MESH_ONLY_PREVIEW`: usable complete mesh/material, legal grounded placement; missing animation explicitly permitted for this owner-review pass.
- `BASIC_ANIMATED_PREVIEW`: specific validated clips are available and used.
- `GAMEPLAY_READY`: required movement, interaction/combat feedback, recovery and persistence actually work.
- `OWNER_ACCEPTED`: independent and owner review completed for the stated scope.
- `REJECTED_OR_QUARANTINED`: not integrated, even as a convenience shortcut.

Use an already-approved animation when possible. A good mesh does not need regeneration solely because motion is missing. No deformed rejected clips, unexplained platforms/helpers or rigid sliding presented as walking. Static ambient placement does not satisfy a moving escort/combat objective. #495 can deliver the partial mesh-placement milestone before the entire #456 library is complete, without closing its later full-animation/AI acceptance.

## 9. New Tripo Human quest cast

#510 owns fresh original NPC production. Prepare a cast-to-quest-to-map coverage table for all 30 draft quests, then deliver the opening cast first. Generate every distinct visible quest character; share the same model/identity for recurring characters. Object-discovered quests may have no giver, explicitly recorded. Do not manufacture 30 unrelated people solely from the quest count.

No stock Mixamo/Quaternius/capsule visuals as the delivered new cast. Existing rig-compatible animation reuse is a separate decision and may be used on the new Tripo model when validated. Clothed NPC generation and appropriate segmentation remain allowed; do not change the modular playable-character contract.

Use current source-image comparison and full-body/no-pedestal rules, verified source/task matching, preserved raw downloads/hashes, geometry/material cleanup before final rigging, runtime bounds/LOD and matching gameplay/dialogue identity. Names and text remain replaceable localization data.

Verify live Studio/API/CLI availability separately. Use a working funded authorized lane, not a presumed API balance. A scope request does not create an unlimited credit budget. Honor existing valid scoped approvals or obtain a current quote/max-cost approval; reconcile every deduction and serialize provider usage with other active jobs. No automatic paid retries, credit purchase or subscription changes.

## 10. Put provisional quests into the rebuilt level

#459 proves four representative tasks: arrival/rescue, dialogue/actual-map orientation, townward travel, and one nearby side task using an existing creature/gathering node/interactable.

Use provisional localization, stable IDs and isolated test saves. Quest names, final lore, faction titles and numeric tuning are not blockers. Start with existing interaction/combat/save surfaces and minimum real implementations of the #502 definition, #503 state/event and #507 award contracts. Expand those same components later; do not build a temporary parallel engine or mutate XP directly from renderer/UI scripts.

The result must distinguish PLACED from INTERACTIVE from QUEST_PLAYABLE. Required objectives need actual completion, failure/retry and one-time reward behavior; nice screenshots alone are insufficient. Support real-time default and tactical-mode events through the same quest contract. Full animation polish may remain deferred, but missing mechanics must be labeled and cannot be marked passed.

## 11. Framework and final content follow

After the environment-first pilot is reviewable, expand/harden #502/#503/#507, then #504/#505/#499 and #506/#508/#500. All existing reusable framework capabilities remain required: safe expressions, branching, repeat/recovery, cross-zone state, coordinated awards, inventory, faction state, migrations, simulation, accessible journal/map/dialogue and both combat modes.

The owner reviews final quest names/details later. #498 remains 10 main, 10 side, 10 optional. Draft cast/placement coverage is allowed before that review; final canon and public release are not automatically approved.

## 12. Handoff receipt and execution

First response: actual model/effort; repository/base/head/worktree; cached tools/provider state; newest owner instructions; current defect ledger; exact usable/rejected asset inventory; map/socket plan; file ownership; initial cast/quest batch; real cost approvals still needed.

After that bounded audit, proceed with authorized non-destructive local implementation. Do not wait for final prose or all animation sets; stop only the affected work at genuine source/access/spend/safety gates and continue independent tasks.

First sessions: #501 lead, #509 environment, #510 Tripo NPC production. #495 consumes creatures with #492/#493. All workers read `kickoffs/ISSUE-501-QUEST-PROGRESSION-FRAMEWORK-KICKOFF.md` and current issue comments. One concern/worktree/PR, separate independent verifier; serialize shared map/renderer/type files.

No merge, deploy, purchase, secret publication or forced branch rewrite is authorized. This handoff records work to execute; it is not evidence that the 3D overhaul or provider generation has already happened.
