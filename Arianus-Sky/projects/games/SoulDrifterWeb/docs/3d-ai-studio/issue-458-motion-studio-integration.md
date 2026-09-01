# #458 — Motion Studio integration checkpoint

## Resume checkpoint — 2026-09-01, asset repair terminal blockers

Motion Forge now contains the full independent combat-pair matrix, measured
surface contact and selected reactions, projectile/poison/fire-spell review,
spawnable interaction props, shared chest destruction, and the current human,
mob and boss roster. `c1fdbc9a` installs hash-pinned five-action Stalker and
Ravager packs. `bab7ca4d` adds a source-bound fire-wand release from the actual
wand tip; native 120 Hz review measured contact at about 0.81231 seconds and
played the selected large-front reaction. Independent visual review accepted
that capture as review-tool evidence, with only framing/VFX-occlusion polish
remaining. Combat placement now fits rendered bounds rather than guessed actor
centres, including human/human, human/mob, mob/human, mob/mob, human/boss,
boss/mob and boss/boss combinations.

The clean verification checkpoint is 68 test files / 614 tests, both TypeScript
checks, production build and release-target verification. The release verifies
both review pages and 27 review assets per target; `dist` and `dist-pages` remain
within their preferred size budget. The existing large Three.js chunk warning
remains. No ESLint configuration exists.

Two assets are correctly frozen outside acceptance. Oathbound has four accepted
attacks, but Tail Whip exhausted four materially different elevated detours and
then two narrow rig-clearance repair classes. The frame-98 wall is localized to
23 distal-tail triangles / 35 vertices owned only by `tail003`–`tail005` against
nine human-body triangles. The only all-clear weight transfer moved the wall
patch 18.2166 mm and approved endpoints 6.4039 mm; all topology-preserving local
offsets cleared zero of four witness states. The source stayed unchanged and no
candidate was emitted. The frozen blocker receipt is SHA-256
`9f7726981702486e1e5bb6ae9c7ca125b695faa94c7120ed0322381937b61dac`.

Greater Warden likewise has no promotable candidate. Strictly valid caps/cuffs,
real source-loop collars and exact pivot correction each failed colored PBR
review. Source-exact rest views prove the immutable model lacks finished exterior
interstitial elbow armor: recessed surfaces sit 0.1413373151 m left and
0.2827544706 m right behind the intended closure plane. The surrounding islands
already have rigid one-bone ownership and move coherently after pivot correction;
the missing geometry requires manual artist reconstruction as a two-piece
telescoping cuff or authored bellows/gusset, followed by the full strict,
three-angle PBR and independent-critic gates. The no-promotion blocker receipt is
SHA-256 `38846b4cd3d2513386ec33e4ad08800fb04040c7fc0769468376081e077d3ce0`.
Neither blocker is registered or promoted.

Read-only code review found one must-fix-before-merge major issue: the Wayfarer
Warden authoring plan/verifier describe a proposal/review-only output, while
`2609d4a8` replaced the canonical dungeon asset and runtime preview consumes it.
Per the owner's instruction for this review pass, this finding is documented but
not changed here. No push, merge, deployment, dungeon promotion, paid operation
or issue closure occurred.

## Current review-system extension — 2026-08-31, work continues

Combat Review now has source-bound visible arrow and poison-spit flights on the
same clock as attacker motion, actual moving-surface contact and the selected
response. Native checks covered bow release, flight, contact and response;
three-arrow multishot shows all three actual arrow meshes and one measured stop.
The arrows are still world-fixed after impact and poison-spit trail/splash art is
still provisional. Those limits are not presented as final VFX acceptance.

The prop workspace now loads a source-preserving chest inspection candidate with
a hollow interior, backed floor and lid lining, real lid/hasp subsets, named live
joint controls, and two locally authored rear hinges with plates, knuckles and
rivets. The original embedded PBR image/material bytes and source GLB remain
unchanged. Its original Tripo account receipt was not recovered, so the ledger
keeps it out of cleared shipping assets. Native open/closed controls and separate
offline PBR interior/side views pass their narrow inspection; character hand fit,
collision, fracture and art approval remain open.

An unarmed **Human · Environmental interactions** subject is being added to the
shared actor clock. It filters the existing 405-clip Human Foundation catalog via
the shared locomotion/object predicates and exposes 61 real source actions,
including chest/door opening, climbing and swimming. It does not duplicate or
change source clips and does not expose irrelevant weapon/finger calibration.
An actual-GLB CPU audit sampled 181 frames of each initial interaction path and
confirmed both protected Human Foundation GLBs remained byte-identical. Source
motion availability is not prop contact, climb support, water or physics approval.

Source locomotion capability measurement is also in independent review. It reports
actual authored-forward, authored-backward, in-place or unavailable travel rather
than sliding an in-place creature by a guessed speed. Weighted support remains
unmeasured; no new transport behavior is implied yet. The four creature variants
and both bosses still require their own continuous exports and runtime installation.

## Measured contact and spawnable props — 2026-08-31, work continues

`7e197357` and `8f4d2ce3` connect the shared actual-surface melee scan and its UI.
The four revised base melee attacks have explicit source-pinned strike points
and active windows. A confirmed moving-target contact can opt into a selected
reaction/death clip; miss, unavailable, manual cue and measured response remain
distinct. Calibration/spacing/action changes invalidate the measurement. Blocking
equipment is not yet measured and this is not gameplay damage or full physics.
Native base Claw at 1.75 m contacted the human at 2.448 s; its selected reaction
played afterward. At 4 m the same strike reports a miss and schedules no response.
The fully framed native miss capture includes both actors and the result.

`4f889a3b` adds a shared bounded shadow rig and larger review floor without changing
actor poses. `7c7a9afd` installs the separately licensed Poly Haven tree V4 static
review derivative (398,000 triangles, 26,630,592 bytes, SHA
`131d80fff7c6093076089b519878668d223868ee3119b14738ce631f1ef7c0c4`).
The source's original PBR/leaf image bytes and separate trunk/branch/leaf geometry
are retained; this is a documented lossy mesh reduction, not a Tripo generation.
`9a81ea0b` shares pinned byte/hash verification with creature loading and provides
cached source geometry plus independent prop placements/materials/contact surfaces.
`16f369e1`/`9e67af53` expose spawn/select/position/facing/reset/remove in Combat Review,
reuse the same camera fit and DOM test fixture, and share numeric-input styling.
Up to six props can be placed; hiding combat cancels pending creation and hides
props without losing completed placements. Only named solid meshes are contact
geometry; foliage is excluded. Placement is not gameplay collision or climbing.

Native checks used the existing in-app static server on port 5179: original tree
materials/shadows, live 5.2 m / 90-degree edits without advancing the actor clock,
human-mode hide, restored placement on return, six-instance limit and complete
removal all worked. The latest styled build emitted no new browser errors.
Evidence is under `combat-native-v1` within the external base-repair audit folder.
The source-comparison, package, factory and controls each have separate independent
receipts. Native close-up, performance and complete interaction quality are not
inferred from a static tree screenshot or successful placement test.

Focused checks: factory/loader/intake/mob stages 46 tests independently passed;
prop controls/factory/controller 40 passed; studio wiring/shadows/controls 35 passed.
Typecheck, build and 25-asset release verification pass. The latest served Pages
artifact is 413,354,070 bytes. Its stamp is `16f369e1`, plus the then-uncommitted
five-file hook now committed as `9e67af53`; it is not a clean-stamp build claim.
The earlier full suite was 55 files / 490 tests and predates these final prop and
ranged-metadata additions. No ESLint configuration exists.

The accepted base remains the only newly installed creature animation export.
Both boss shoulder-attachment prototypes passed their narrow external assembly
gate, not overall motion/grounding approval. Oathbound own-arm/contact repair and
Stalker/Ravager own-jaw checks continue externally. `bcfd126d` shares the unchanged
human bow emission constants; ranged simulation activation is still in progress.
The original chest/door audit found fused meshes requiring real articulated parts,
interiors/cut caps and original provider-receipt follow-up. No fake duplicate-lid
or placeholder interaction is accepted. No paid operation, dungeon replacement,
push, merge, deployment or issue closure occurred.

## Earlier manual-cue Combat Review checkpoint — 2026-08-31

The studio now exposes **Combat Review** with independent A/B choices across all
ten human loadouts and six existing creature definitions, shared playback,
scrubbing, spacing/facing, per-actor calibration and motion framing. Commits
`870801c7` and `1cf621bb` install the controller/panel and native studio glue;
`77570a22` adds explicitly labeled source hit/death candidates only to combat
actors. Solo human actions, equipment and raw motion mode remain unchanged.
Responses are currently **manual timing cues, not measured hits**. Measured
contact, projectile/spell trajectories, approach/recovery and prop interactions
are subsequent unfinished phases, not features implied by the selector.

Independent review caught and verified fixes for Play being cancelled by an
aborted camera survey and omitted two-hand constraints during framing.
`1f68c327` makes numeric placement update immediately without duplicate blur
commits. `d1246586` shares native image decoding across review loaders after the
actual in-app GLTF bitmap/blob path failed for both original 8192-pixel boss
textures. Texture bytes are unchanged; missing declared textures now fail the
load before creating a misleading untextured actor. This policy is for current
embedded/same-origin assets, not a custom-header authentication guarantee.

Fresh checks: 74 loader/actual-mob/human tests plus typecheck; build and release
verification pass. The prior full-suite checkpoint was 52 files / 451 tests;
it predates the last response/loader additions and is not presented as their
full-suite result. No ESLint configuration exists. Native review verified both
textured bosses together, immediate 3.85 m separation and facing edits, and
Frame-motion cancellation followed by playback advancing to its terminal frame.
No new error was logged after the corrected build. Boss source rig/grounding/
choreography defects remain visible and unapproved.

The base pilot is still the only newly installed creature animation export.
Oathbound anatomy-specific arm-pivot/skin correction, the remaining variants and
both bosses remain in the independent repair loop. `19deb972` adds reusable
licensed prop intake tooling; an external Tree V3 candidate fixes reduced-mesh
fork cracks but has not been installed or accepted for climbing. Source foliage
fidelity and real interaction behavior remain to be checked. No paid operation,
dungeon promotion, push, merge, deployment or issue closure occurred.

## Active owner goal — expanded 2026-08-31

The owner has requested continued implementation, not a stop after the base
pilot: put the revised animations into the lab for the current creature roster,
review both bosses, and add a full combat and environmental-interaction review
mode. This supersedes the older checkpoint's narrower next-step order below.
Work remains on the existing #458 issue branch; #435 supplies the accepted human
and equipment foundation, and #439 records related combat-presentation contracts.
No new ticket, paid generation, dungeon promotion, or live deployment is implied.

The later owner goal adds parallel builders, a harsh independent visual critic,
and repeated reference-based refinement of animation, contact/physics, materials,
lighting, NPCs, furniture and built review scenes. Apply the building/interior/
street quality wording to the scoped interaction scenes, not as permission to
overwrite other agents' Heartvale or dungeon work. "AAA" is a quality aspiration,
not a certification conferred by test counts, self-review, or a manufactured
"perfect" verdict. Record actual defects and comparisons, including unfavorable
results. Anonymous A/B frames may reduce label bias; recognizable sources and
reviewer familiarity must be disclosed rather than called fully blind.

Primary reference candidates, verified 2026-08-31: [Bruno Simon's live Three.js
portfolio](https://bruno-simon.com/) and its [source](https://github.com/brunosimon/folio-2025)
for browser lighting, interaction and scene coherence; [Rockstar's official GTA VI
media](https://www.rockstargames.com/VI/media) for a separate commercial visual
benchmark, **not** a claimed Three.js game. No comparison result exists yet.
Reference imagery is for analysis, not permission to import game assets.

Implementation proceeds in bounded, tested, committed phases:

1. Install the independently reviewed five-attack base pilot as a separate,
   hash-pinned lab asset. Preserve the forty approved keys, the approved neutral
   holds, and honest labels for untouched source clips and remaining review flags.
2. Adapt the shared authoring/validation pipeline to Stalker, Oathbound, and
   Ravager, and review both Cinderbound Wardens. Verify each actual skeleton,
   rest basis, skin weights, proportions, contacts, and action semantics; a base
   pass or common bone names do not certify another model. Preserve path-specific
   boss skins/powers and the established attack repertoire.
3. Add **Combat Review inside Motion Studio**, retaining solo review. Select
   attacker and defender independently from the human/monster/boss roster,
   including same-family and same-model pairings. Share one deterministic
   timeline for approach, facing, attack, projectile/spell flight, contact,
   reaction, recovery, and defeat. Expose spacing, playback, appropriate rig
   controls, reaction choice, and impact timing/location/direction/type; do not
   turn every hit into one generic flinch or report timer-only damage as contact.
4. Add a reusable spawnable-prop and interaction layer for real textured trees,
   chests, doors, water, and destructible objects. Test opening, breaking,
   climbing, swimming, and other available interactions through actor/prop
   capabilities. Reuse cleared assets and existing clips first. Unsupported
   anatomy or missing source assets must be identified honestly, not replaced
   silently with a fake clip or primitive content asset. Debug collision shapes
   remain explicitly diagnostic, not rendered substitutes for real props.
5. Verify the full pair-selection matrix, deterministic replay/reset, concurrent
   actor isolation, hit/reaction timing, prop state transitions, resource cleanup,
   source-asset preservation, desktop/phone controls, and the built local page.
   Fresh wide/close independent visual review complements automated checks.

Current scope is the six creatures already in the lab and the accepted Human
Foundation/loadouts. Registries and capability profiles must support extension
without copying model-specific controllers, scripts, UI workflows, or tasks.
Use the canonical [DRY reuse policy](README.md#dry-reuse-policy). Broad Heartvale
wildlife work owned by other tickets is not silently absorbed into this branch.

The base export is installed as a separate hash-pinned studio asset. Pilot
typecheck, 356 tests (zero skips), build/release and native playback/scrubbing
checks passed; an independent reviewer cleared ten refitted native wide/side
frames. The detailed repair runbook retains numeric and presentation limitations.
The first shared combat-clock phase is implemented but not yet connected to UI:
absolute actor/prop sampling, eased pose transitions, deterministic loop events,
seek without repeated effects, and terminal death holding. Nine focused tests
pass, including all nine actor-family pair combinations; the combined suite
passes 46 files / 365 tests. These are clock-contract tests, not rendered combat
or spatial-contact acceptance. Human factory extraction, variant retargeting,
boss review, real props and full combat presentation continue in parallel.
The expanded goal is **not complete**. All dungeon
creature assets, accepted human animations, and the existing local server remain
protected; local lab testing is not production or owner animation acceptance.

### Shared actor and contact checkpoint — 2026-08-31

- `dd62534d` extracts the existing human actor/catalog into reusable factories,
  retaining all 405 source clips, ten equipment loadouts, accepted grip/IK and
  authored moves. Two actors have separate skeletons, mixers, materials and
  calibration; raw motion mode no longer inherits equipment finger offsets.
  `d51da61c` updates only the staff verifier's source locations after extraction.
- `d6f18bfc` adds independent mob adapters around the existing MobsStage runtime,
  not a second creature controller. Same-model instances and both boss families
  preserve per-instance placement, sampling, calibration and disposal.
- `ac0d92ec`, `75675dde`, and `ef6636ed` add rendered/deformed-triangle contact
  surfaces, model-specific weighted contact probes, deterministic pose blending,
  and sampled-motion camera bounds. Sibling bones are refreshed and unindexed or
  hidden vertices cannot masquerade as visible contact points. These are shared
  helpers; a sampled probe is not a full continuous two-body physics solver.
- Focused latest verification: 51 tests across actual mob adapters, contact and
  posing pass; typecheck passes. Human extraction's earlier full suite passed
  48 files / 403 tests; subsequent independent actor/contact checks passed 55.
  Staff verification retains all 2,111 sampled frames and six authored moves.
  No ESLint pipeline is configured. No new combined build/native UI acceptance
  is claimed: Combat Review controller/panel integration is still in progress.
- Oathbound adaptation is external-only while its own jaw range and contact
  placement are reviewed. The inherited boss source has confirmed axis, armor
  separation and death-collapse defects; those clips are not called repaired.
  No variant/boss candidate, prop scene, or dungeon update has been installed by
  this checkpoint. The active expanded goal remains unfinished.

## Earlier integration checkpoint — historical evidence

Date: 2026-08-31. Status: local studio and starter-player integration verified; #458 remains OPEN and owner QA pending.

## Scope and source identity

- Destination: `codex/458-pre-codex-fixes-validation` in the existing #458 worktree.
- Imported the scoped #435 QA package from `d24168ffad8eccc5c04603f0838c97ce05e2f77d`, not its inherited V1 playbook/game changes.
- The 24 accepted lab assets retain their receipts in `issue-435-lab-asset-map.json`. The accepted canonical longsword replaces the old #458 sword export.
- Source Human Foundation body and 400-clip library are unchanged. The five locomotion extras and accepted authored lab motions remain available.
- Retired the now-unreferenced 18-clip core GLB, JSON manifest, and its builder. These are recoverable from Git. Historical Markdown handoffs and still-used V1 NPC consumers are retained.
- No new Tripo operation, creature GLB replacement, dungeon layout change, navigation change, or production deployment is included.

## Review entry points

Run `yarn dev --port 5179` from `Arianus-Sky/projects/games/SoulDrifterWeb`, then open `/weapon-lab.html` in the in-app browser. Do not use the game root as the animation review entry point.

- `/weapon-lab.html`: **SoulDrifter Motion Studio**, one shared viewport and playback toolbar.
- `/asset-review.html`: accepted archery asset inspection.
- `/?dungeonPreview=breach-v2&seed=4182&path=wayfarer&cam=isometric&start=H-01&animationReview=1&creatureReview=1&wardenReview=1&diagnostics=1`: actual first-level preview, not a completed combat walkthrough. Repeat with `path=oathbreaker` for that route when integration is ready.

For a built local review use `yarn build`, `yarn verify:release`, then serve `dist-pages` with a local static server. Verify `/release.json` and use the exact studio URL. No development server should remain running after the task.

## Contextual controls

- Human weapons: retains all ten loadout choices and their accepted/proxy labels, including shared walking/running. Arrow inventory and minimum bow range appear only for bows. Support-hand/IK/staff controls appear only where applicable.
- Human motions: source and authored motion catalog, activity/movement filters; no equipment, arrow inventory, or grip tuning.
- Mobs & bosses: four installed Breachling variants and both Warden bosses. The installed model SHA-256 is verified when Web Crypto is available; insecure HTTP explicitly reports size-only validation.
- Breachlings expose 32 real-joint controls: paired forelimbs/paws, hindlimbs/feet, torso/head, jaw and tail. These rigs do not contain individual finger or claw bones.
- Wardens expose 22 real-joint controls. The right-hand bone has no skin weights or useful weighted descendants, so its blade is adjusted via the weighted forearm, not a pretend finger grip.
- Playback: play/pause, restart, timeline, speed, repeat/one-shot and full/side/back/joint cameras. Panel hide/show remains available on desktop and phone-width layouts.

## Draft calibration contract

The studio uses `breach-v2-breachlings.ts` and `breach-v2-wardens.ts`, the same controllers used by the dungeon. A narrowly scoped review placement selects one real actor; it does not run dungeon AI or pathing.

`mob-pose-overlay.ts` restores clean source pose before mixer evaluation and applies additive local-joint offsets afterward. Repeated paused updates must not accumulate offsets. Profiles are isolated by family, exact asset SHA-256, action, and articulation schema.

Use **Export draft** to save changes before reloading the page. **Import draft** accepts only the matching model revision and action, validates finite/bounded controls atomically, and preserves the current pose when invalid. **Reset pose** restores the source clip. Drafts are not baked animation exports and are not automatically applied to gameplay.

**Measure contact** reports the current whole-mesh minimum only. A zero minimum is not proof that every paw or body part has good contact. Existing floor-reference correction is not a contact acceptance certificate.

## Human runtime integration boundary

The first-level adapter now reads the complete accepted library, uses the accepted body/canonical sword and shared greatsword hand calibration, and routes its supported starter actions honestly. It no longer presents a sword as a bow or staff, or the rejected hip-sheathing flow as an accepted action.

This is the starter greatsword/unarmed integration, not all weapon gameplay. All other accepted equipment and authored equip/stow sequences remain in Motion Studio until their full gameplay assembly is integrated. Do not label the restricted runtime action list as all 420 lab motions being production-ready.

### Continuous locomotion correction

The canonical imported rig is locally Z-up. The former normalization treated local Y as height, retaining roughly 0.941 m of forward travel per walking cycle and snapping it back at the loop boundary (about 1.93 m at runtime scale). Runtime-only cloned clips now project root translation onto world-up expressed in the actual parent frame. Navigation retains ownership of horizontal movement; true vertical bob/jump displacement is preserved and source clip arrays are unchanged.

Movement requests retain the same repeating action while walking/running continues. Walk-to-run and run-to-walk transitions preserve normalized cycle phase. One-shot attacks complete and recover directly into the still-requested gait, without an intermediate idle/reset. Snapshot playback telemetry records activation, cycle count, phase and repeat/one-shot mode.

Real 65-bone tests sample more than three cycles of all four armed/unarmed gaits. Maximum seam translations are 1.67 mm (walk), 1.21 mm (run), 2.23 mm (greatsword walk), and 0.38 mm (greatsword run); maximum angular step is below 0.045 radians. These numerical checks complement native dungeon inspection and do not certify all future movement speeds or monster gaits.

### Follow-up: running slowdown / stop transition

Owner request, 2026-08-31: a fast run should finish with a natural slowdown sequence, not switch straight into a stationary pose. This is a requested first-level integration follow-up, **not implemented by this checkpoint**.

- Keep the running cycle continuous while running is requested. On a normal stop, chain **run -> deceleration / run-stop -> idle or armed guard**; settle into walking instead if walking is still requested.
- Match movement speed to the transition so the feet do not slide while the animation brakes. Check stopping distance at navigation destinations, and allow renewed movement to interrupt the stop smoothly.
- First audit the accepted source library and locomotion extras for a usable slowdown/run-stop clip. Availability has not yet been verified; do not claim the existing looping fix provides this separate sequence.
- Verify armed and unarmed stopping in the actual first level, keeping attacks one-shot. This belongs to the first-level movement acceptance checklist, not a separate studio redesign.

## Verification at this checkpoint

- `yarn typecheck`: PASS. No ESLint pipeline is configured for this game package.
- `yarn test --maxWorkers=4`: 44 files / 344 tests PASS. Includes 13 actual-six-GLB stage tests, 7 overlay tests, 13 mode-isolation/recovery tests, and 11 human actor/calibration tests.
- `yarn build` and `yarn verify:release`: PASS. Sites artifact 377,207,450 bytes; Pages artifact 377,197,013 bytes, both below the preferred 475 MB budget. All 24 accepted lab asset receipts verified in both outputs.
- Staff and armed-locomotion numerical verification scripts pass; 400 source clips unchanged, six staff additions retained, ten loadouts retain locomotion choices.
- Native in-app browser: all ten human loadouts, human motion mode, all six mobs, served mob SHA-256, per-action offset isolation, single-shot terminal/replay, panel reopening, and phone-width layout inspected. Actual first-level room loads the accepted human adapter, moves on click navigation, and returns from armed walking to guard on arrival without console errors. This is not the full combat walkthrough.
- Independent review: mode isolation and failed-load recovery findings fixed and covered by tests; desktop renders and bounded human runtime code reviewed. Creature visual defects remain explicit rather than hidden.
- Local visual evidence: `H:/CodexData/.codex/artifacts/issue-458-motion-studio-integration-20260830`. Evidence is not committed into the repository.
- Preserved the pre-existing untracked repository `.planning/` files. No production deployment, QA merge, paid operation, or #458 closure.

## Remaining #458 acceptance gates

1. Review and repair the existing creature/boss source motion and contact defects, using the shared studio. The Warden's detached/floating visual segments and the Breachling contact failures are still visible and not accepted.
2. Complete every actual weapon/loadout's dungeon gameplay assembly, including accepted authored transitions, attacks, ammunition and close-range behavior.
3. Review the remaining NPC migration separately; preserve identity, quests, saves and active V1 consumers until their replacements are proven.
4. Complete uninterrupted entrance-to-boss-and-exit fighting/navigation on both paths, with every supported loadout; add AI/pathing/attack-radius work through its scoped tickets.
5. Fresh independent visual and runtime review, then owner QA. No issue closure or production promotion based on this checkpoint alone.
