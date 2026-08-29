# SoulDrifter Quest Dialogue Video Policy

**Status:** Binding project-production policy
**Owner direction recorded:** 2026-08-29

## Purpose

Every production SoulDrifter quest must introduce or advance its story with authored video. Quest video is narrative media presented by the dialogue/quest interface or as a cutscene; it is not a replacement for the live 3D NPC, quest state machine or playable world.

This policy also defines the required pilot for choosing how a visible speaking NPC is produced:

1. provider-generated speaking video using the canonical NPC as the identity reference;
2. an in-house render using the actual approved 3D NPC model.

The two paths must be tested against the same locked inputs before either becomes the default.

## Hard quest contract

`EVERY_PRODUCTION_QUEST_REQUIRES_VIDEO_INTRO_OR_CUTSCENE` is true.

For every production quest ID:

- provide at least one `QUEST_INTRO_VIDEO` or `QUEST_CUTSCENE` narrative beat;
- associate the media with the exact quest and narrative-state version;
- allow the player to replay it after first viewing;
- provide captions and a text fallback;
- preserve quest progression when video delivery or playback fails;
- verify desktop and supported mobile-browser presentation;
- record provenance, provider/model, generation inputs, rights, duration, hashes and owner acceptance.

A quest-chain introduction does not silently satisfy every child quest. Each production quest records its own video beat. A child quest may intentionally reuse an earlier clip only when its record explains why that clip introduces the child quest and the owner accepts the reuse.

## Narrative-video routing

### MiniMax H3 story lane

Use MiniMax H3 for authored story media such as:

- flashbacks and recovered memories;
- historical events and realm lore;
- narrated explanations of what happened or where the player is;
- dreams, visions, chronicles and magical projections;
- quest introductions and transitions whose content is not required to be live interactive 3D;
- later full-screen cinematics.

H3 output is finished audiovisual media. It is not a reusable skeletal-animation source and should not be spent on disposable motion reference unless an owner-approved experiment explicitly requires that use.

### Live 3D NPC lane

The NPC encountered by the player remains the canonical runtime 3D character. Normal interaction, navigation, gestures, combat state and quest-state behavior stay in the game runtime.

### Visible speaking-NPC video lane

When the video itself shows the quest NPC speaking, use the approved bakeoff below. Stock or preset avatars may not replace the canonical NPC identity. A provider candidate must begin from approved renders or reference material of the actual NPC design.

## External media storage contract

Full quest-video payloads must be stored outside the zone package and outside the normal zone asset bundle.

The zone/runtime package may contain only:

- the versioned media manifest;
- small poster/thumbnail assets when budgeted;
- captions or localization metadata when intentionally bundled;
- fallback dialogue text;
- playback and quest-state code.

The full MP4/WebM media is delivered from versioned external object storage or a media CDN and loaded only when needed. Do not embed full videos in a zone GLB, zone TypeScript module, base application bundle or always-preloaded asset graph.

Every manifest entry records:

- `questId` and `narrativeBeatId`;
- media kind and narrative-state version;
- desktop and mobile delivery variants;
- versioned remote URL or asset key;
- codec, resolution, duration, byte length and content hash;
- poster, caption and fallback-text references;
- provider/model or in-house source provenance;
- rights/license and owner-verdict references;
- preload policy, cache policy and replay availability.

Runtime requirements:

- lazy-load the selected video when the player approaches or starts the narrative beat;
- never preload every quest video with the zone;
- provide a bounded cache separate from the immutable zone bundle;
- provide loading, retry, timeout and offline/failure states;
- fall back to captioned dialogue without blocking acceptance or completion of the quest;
- pause or appropriately duck game audio while respecting the player's volume settings;
- restore input, focus, camera and audio state after playback;
- expose pause, replay, skip, captions and volume controls;
- preserve watched/skipped/completed state across save and re-entry;
- prevent autoplay rules or a failed remote request from soft-locking progression.

## Canonical talking-NPC bakeoff

### Test purpose

Determine whether named quest-NPC speaking videos should default to provider-generated animation or the actual in-house 3D model. This is a production-method comparison, not a comparison of different scripts, voices or NPC designs.

### Locked common inputs

Both candidates use:

- the same named NPC and approved canonical appearance;
- the same final voice track and exact script;
- the same 8–15 second target duration;
- the same emotional direction, eyeline and performance brief;
- materially comparable framing, background and lighting intent;
- the same caption text and delivery formats;
- the same target desktop and mobile playback box;
- three generated/rendered attempts when the lane supports repeated attempts, so temporal consistency can be measured.

### Candidate A — provider avatar video

- Use Kling Avatar or the currently approved equivalent provider lane.
- Use canonical NPC reference renders; do not select a generic/preset avatar as a substitute.
- Record the provider, exact displayed model/version, mode, settings, attempts, failures, credits and elapsed time.
- Preserve the accepted source references, prompt/direction, task ID and downloaded master.
- A paid attempt requires the normal live price/balance quote and exact owner approval immediately before submission.

### Candidate B — actual 3D NPC

- Use the approved production NPC mesh, materials, wardrobe, rig and facial/lip-sync system.
- Render in Blender or the canonical game runtime according to the locked shot brief.
- Record rig/facial preparation time, animation and cleanup time, render time, failures and final export settings.
- Preserve editable source, animation/facial data and the rendered master.

### Automated hard failures

Reject a candidate when any of these occur:

- it is not recognizably the canonical NPC;
- face, body, wardrobe or required prop identity drifts materially during the shot;
- dialogue is missing, reordered or audibly corrupted;
- lip synchronization or facial deformation is unusable at normal speed;
- visible mesh/temporal artifacts break the intended presentation;
- provenance, rights, task/source records or rollback are missing;
- captions or the text fallback are missing;
- either target delivery variant fails in the supported quest-video player;
- media delivery blocks or corrupts quest progression.

### Scored comparison

Score every passing candidate out of 100:

| Dimension | Weight |
|---|---:|
| Canonical identity, wardrobe and prop fidelity | 25 |
| Lip-sync, expression, gaze and emotional performance | 15 |
| Match to SoulDrifter runtime art direction | 15 |
| Temporal consistency across attempts | 10 |
| Editability, repeatability and future reuse | 10 |
| Provider/compute cost per accepted second | 10 |
| Human production and cleanup time | 10 |
| Compression, mobile playback and visual clarity | 5 |

Record objective metrics first, then run a blinded side-by-side owner review. Do not reveal which candidate used the provider until the owner records the visual verdict.

### Decision rule

- The owner-approved winner becomes the default for recurring named quest-NPC speaking videos.
- H3 remains the default story/flashback/cinematic lane regardless of the talking-NPC bakeoff result.
- The losing path remains an allowed fallback; it is not deleted or globally retired from one test.
- Reopen the bakeoff when a material provider, rig, facial-animation, rendering, pricing or target-platform change invalidates the result.

## Acceptance evidence

Every quest-video record includes:

- quest and narrative-beat identifiers;
- media manifest entry and external-storage proof;
- source/provenance and owner approvals;
- desktop and mobile playback evidence;
- captions, skip, replay and failure-fallback evidence;
- network-failure proof showing the quest remains playable;
- bundle evidence showing full media was not added to the zone package;
- watched/skipped/re-entry persistence evidence;
- performance and memory observations;
- bakeoff record when a visible speaking NPC is involved.

No quest is `OWNER_READY` until its required narrative video beat and fallback pass this contract.
