# First Breach Quest Dialogue Video Bakeoff Runbook

**Status:** Required execution plan for the First Breach quest redesign

**Functional owner:** The-Nexus issue #428

**Environment baseline:** Preserve the approved First Breach/BREACH-V2 topology, assets, traversal repairs and performance work

## Purpose

Choose the production method for visible speaking-NPC video before generating the full First Breach quest-video inventory.

The pilot compares two paths:

- **Path A — provider speaking NPC:** Kling Avatar, or the currently approved equivalent, driven from approved reference renders of the canonical NPC;
- **Path B — in-house speaking NPC:** the actual approved production NPC mesh, materials, wardrobe, rig and facial system rendered in Blender or the canonical game runtime.

MiniMax H3 provides the shared story, memory or flashback footage used by both paths. H3 is not a third talking-NPC candidate and is not used as disposable motion reference for this pilot.

The bakeoff must finish before either speaking-NPC method is scaled across the level.

## Scope boundary

This is future quest and narrative work under issue #428. It does not reopen the completed First Breach environment rebuild and does not authorize changes to dungeon topology, approved environment assets, collision repairs, door behavior, fog-of-war behavior or camera/performance fixes unless a quest implementation exposes a verified regression.

The runbook is planning authority only. It does not authorize provider spend, deployment or release promotion.

## Pilot beat

Use Wellkeeper Ilyra for the first bakeoff after all of the following are production-locked:

- her canonical production 3D model and materials;
- her face, wardrobe and required props;
- her approved voice;
- the final issue-#428 script and narrative-state contract;
- the quest dialogue-video player and external media manifest contract.

The intended pilot is an 8–15 second beat in which Ilyra explains why the player awakened and what the Soul Well or Chronicle of Returning means. Issue #428 owns the final wording and canon.

Do not base the production decision on a capsule, generic avatar, temporary NPC, stale model or unapproved legacy asset. If Ilyra is not production-ready when implementation begins, use the first approved named First Breach tutorial NPC that satisfies the same readiness gates and record why the pilot changed.

## Locked comparison package

Before either path is produced, create one comparison package containing:

- exact script and final voice master;
- emotional direction, pace, gaze and eyeline;
- shot duration, framing, lens intent, lighting and background intent;
- canonical front, three-quarter and profile NPC renders;
- model/material/wardrobe/prop version hashes;
- caption file and fallback dialogue;
- one shared H3 story/flashback insert when the beat requires it;
- desktop and mobile quest-video box specifications;
- compression and delivery targets;
- maximum approved provider cost and the approval record;
- blinded review identifiers that do not reveal the production path.

Both paths use the same package. Do not improve the script, voice, edit, lighting brief or H3 insert for only one candidate.

## Shared presentation edit

The preferred pilot edit is:

1. the canonical NPC visibly delivers the opening line;
2. the same H3 story, memory or flashback insert plays in both candidates;
3. the NPC returns or the shared voice track concludes over the insert;
4. the same captions, audio mix, poster, controls and quest-state transition are used.

This structure tests the speaking-NPC method without also testing two different story videos. If the approved beat contains no flashback, omit the H3 insert from both paths.

## Path A — provider speaking NPC

1. Export the approved canonical reference pack from the actual NPC design.
2. Confirm the current Kling Avatar/equivalent model, supported controls, displayed price and account balance.
3. Record the exact expected and maximum cost, then obtain owner approval immediately before any paid submission.
4. Generate three attempts when the provider supports repeated attempts.
5. Reject preset or stock avatars and any result that changes the NPC identity, face, body, wardrobe or required props.
6. Preserve prompts, references, task IDs, settings, attempts, failures, credits, elapsed time and downloaded masters.
7. Apply only documented cleanup that can be repeated for later quest videos.

## Path B — actual 3D NPC

1. Use the same approved NPC mesh, materials, wardrobe and props used by the game.
2. Prepare or reuse the production facial rig, visemes/lip-sync, gaze and expression controls.
3. Render the locked shot in Blender or the canonical runtime.
4. Produce three takes when practical so repeatability can be measured against Path A.
5. Preserve editable scene, rig, facial data, animation, render settings, failures and masters.
6. Record human setup, animation, cleanup and render time separately.
7. Identify reusable work: rig improvements, facial presets, lighting scene, camera template, export preset and automation.

## Controlled integration test

Transcode both passing candidates to identical delivery classes and integrate them, one at a time, into the same quest-video component and quest state.

Verify for each candidate:

- desktop and supported mobile-browser playback;
- captions, pause, skip, replay and volume behavior;
- input, camera and audio restoration after playback;
- watched, skipped, completed and re-entry persistence;
- network timeout and missing-media fallback without quest soft lock;
- versioned external object-storage or CDN delivery;
- no full video payload in the zone GLB, zone module, base bundle or always-preloaded graph;
- bounded cache behavior and stale-media invalidation;
- download bytes, start delay, decode behavior, peak memory and playback smoothness;
- the player remains correctly positioned and the quest can continue.

## Hard rejection gates

Reject a candidate before scoring when:

- the NPC is not recognizably canonical;
- face, body, wardrobe or required prop identity drifts materially;
- speech is missing, reordered or corrupted;
- lip-sync, gaze or facial deformation is unusable at normal speed;
- visible temporal, mesh or compositing artifacts break the shot;
- the target mobile or desktop delivery variant fails;
- media failure blocks quest progression;
- captions, text fallback, provenance, rights or rollback records are missing;
- the full video is bundled with the First Breach zone;
- the candidate cannot be reproduced from recorded inputs.

## Comparison and decision

Score every passing candidate using `QUEST_DIALOGUE_VIDEO_POLICY.md` and its 100-point rubric. In addition to the rubric, report these raw values beside the score:

- provider credits or compute cost;
- human setup and cleanup hours;
- wall-clock turnaround;
- accepted seconds per attempt;
- exported master and delivery sizes;
- mobile start delay, peak memory and observed playback failures;
- reusable assets or automation produced by the path.

Run a blinded owner side-by-side review only after the objective evidence is recorded. The review labels must not reveal which video came from Kling or the actual 3D model.

The owner-approved winner becomes the First Breach default. The other path remains a documented fallback. H3 remains the story/flashback/cinematic lane regardless of which speaking-NPC path wins.

## First Breach rollout inventory

After the pilot decision, audit the live issue-#428 quest graph and record every exact production quest ID before bulk generation. Do not invent IDs from design prose.

At minimum, the audit must cover narrative beats for:

- the player's awakening and race-specific memory or identity explanation;
- Ilyra, the Chronicle of Returning and the Soul Well;
- tutorial NPC introductions, motives and player questions;
- the meaning and consequences of the route choice;
- room-specific lore that is actually promoted into a quest;
- miniboss setup and foreshadowing;
- the first Soul Connection and the First Breach exit.

Every production quest ID receives its own `QUEST_INTRO_VIDEO` or `QUEST_CUTSCENE` record, external media entry, captions and text fallback. Shared footage may be reused only when the record explains why it introduces that exact quest and the owner approves the reuse.

## Rollout rule after the bakeoff

If Path A wins:

- lock the canonical NPC reference-render recipe;
- lock provider model/mode, prompt structure, performance direction and voice pipeline;
- retain the actual 3D render path as fallback for drift, provider outage or pricing changes.

If Path B wins:

- turn the pilot scene into a reusable dialogue-render template;
- standardize facial/viseme, gaze, lighting, camera, render and export presets;
- retain the provider path as fallback for schedule or capacity constraints.

For either result:

- produce one quest video at a time until two consecutive videos pass without a material pipeline change;
- do not bulk-spend or bulk-render from an unproven template;
- reopen the bakeoff after a material NPC-rig, provider, pricing, renderer, player or target-device change;
- keep all full-resolution narrative media outside the zone package.

## Completion evidence

The First Breach bakeoff is complete only when the issue/PR evidence includes:

- locked comparison package and canonical asset hashes;
- provider quote and owner spend approval when Path A incurred cost;
- all attempts and rejection reasons;
- both accepted masters and identical delivery variants;
- automated gate results and runtime integration evidence;
- desktop and mobile playback evidence;
- bundle, network-failure, cache and quest-progression proof;
- scorecards, raw cost/labor/performance values and blinded owner verdict;
- selected default, documented fallback and rollout template;
- an exact audited inventory of remaining First Breach quest-video beats.

Until this evidence exists, report the bakeoff as `PLANNED` or `IN_PROGRESS`, never `OWNER_READY`.
