# First Breach Production Model Program

Status: active requirements; first paid workflow comparison complete under [The-Nexus #448](https://github.com/The-Nexus-Decoded/The-Nexus/issues/448)

Rollback baseline: `e0b3d9d8b6ef893373e7aab6253441b6f3da108a`

Branch: `codex/448-souldrifter-first-breach-models`

## Priority and boundary

This is the primary SoulDrifter production workstream after the stable First Breach mechanics/HUD baseline. It replaces placeholder and generic actors with original 3D AI Studio source models, proves the permanent playable-humanoid foundation, and revalidates the current level around the accepted rigs.

The playable-character foundation is game-wide. It is proved in the First Breach but must remain reusable in every later room, zone, class, equipment tier, and multiplayer surface.

The non-player production batch is intentionally Level 1 only:

- Wellkeeper Ilyra, Breach Scout Orren, and Arena Warden Brannoc;
- the training effigy/Sentinel;
- the current Breachling base family and Level 1 variants;
- the Cinderbound Warden;
- the nine starter calling presentations and their C-tier weapons.

This batch does not generate open-world trees, grass, walls, terrain, buildings, biome kits, higher-tier equipment, later-realm monsters, or the broader Labyrinth/four-realm bestiary. Those require later tickets when the outdoor game begins.

## Source and ownership rule

Every new body, head source, hair geometry family, clothing/armor geometry family, weapon family, named NPC, creature, prop, and environment piece begins as an owner-reviewed ChatGPT reference image containing one complete isolated subject. That exact image is then submitted to 3D AI Studio Image-to-3D. Single-image is the default; owner-approved hero creatures may use four separate identity-matched views after the strict view gate below. Direct text-to-3D was retired for new production work after the Breachling/Warden comparison showed unacceptable style and identity drift. No production actor is accepted by renaming or recoloring a generic substitute.

Beginning with the 2026-08-18 fidelity correction, every new source uses one complete canonical specification. The identity, silhouette, proportions, anatomy and joint logic, face, materials and palette, role/lore read, required details, and forbidden traits are copied verbatim into every ChatGPT generation. Only the camera or output suffix may change. Shorthand such as “same creature,” “preserve the reference,” or a delta-only edit prompt cannot replace the full specification. A reference image is supporting evidence, not permission to omit requirements.

This rule is prospective. Existing paid outputs are preserved and judged by their actual owner-visible result and technical intake; missing retrospective prompt parity alone does not trigger a rebuild. A paid source is regenerated only for a concrete visual or technical blocker. The rejected two-headed Warden is one such blocker. The unconverted upright Breachling images cost no 3D Studio credits and are being corrected before submission.

3D AI Studio is the source generator, not the last production step. Every accepted source still requires:

1. untouched download and task/credit/license provenance;
2. Blender cleanup and deformation-friendly retopology;
3. UV/PBR bake and controlled material variants;
4. canonical rig comparison or documented retarget profile;
5. facial deformation where required;
6. equipment sockets, coverage masks, and LODs;
7. animation, gameplay-camera, room, and performance acceptance;
8. an approved shipping hash distinct from the untouched source hash.

## 3D AI Studio project and lineage provenance

Production work for this program belongs to the 3D AI Studio project `SoulDrifter`, Git branch `codex/448-souldrifter-first-breach-models`, issue #448, and starting commit `5ddcf96bba3e7393998de46a62ef51ee602c1f83`.

3D AI Studio exposes automatic model/derivative lineage rather than a manually named Git-style asset branch. Git remains the reviewed source of truth. Every accepted generation records its 3D AI Studio project, provider operation and model version, task ID, credit receipt, ChatGPT prompt/edit hashes, exact approved source-image hash, automatic derivative lineage where applicable, untouched-export hash, processed-export hash, and the Git commit that consumed it. A floating or generic `latest` reference cannot supply production assets.

## Generation operation by asset type

All production categories use the same image-first path. Most assets use one owner-reviewed ChatGPT image of one isolated subject on a clean plain background followed by one Prism 3.1 single-image conversion. Humanoid sources use a neutral front A- or T-pose with clear limbs and flat feet. Riggable creatures use a neutral custom-rig stance that preserves their canonical anatomy; forcing a hunched predator upright to imitate a humanoid A-pose is a source failure. Weapons, armor, clothing, props, and environment modules use a neutral unobstructed product orientation. A contact sheet, multiple figures, inset views, action pose, automatic multi-view crop, fused equipment set, or conflicting camera view is invalid input.

The Breachling family and Cinderbound Warden have an explicit owner decision permitting four-view Prism 3.1 Multi-Image conversion. Front, exact 90-degree left, true rear, and exact 90-degree right must be four separate identity-matched files. A side view fails if it is three-quarter, exposes the opposite eye/cheek, front chest, palm, or the top/front of both feet. A rear view fails if it exposes any face, throat/chest/front core, palms, kneecaps/front shins, toe tops, or front-facing weapon surface. It must instead prove rear skull/head shell, spine/scapulae, rear pelvis/tail root, backs of limbs, and species-appropriate hamstrings, hocks, Achilles, heels, or paw anatomy. Any contradiction blocks submission and spends zero provider credits.

On 2026-08-17 the owner authorized all required issue #448 single-image conversions without per-task approval pauses and requested notification when the account balance falls below 2,000 credits. Every ChatGPT source is still shown in chat before conversion, and live settings, charge, task ID, receipt, and source hash are recorded for every task. Direct text-to-3D, remesh, rigging, paid animation, runtime promotion, merge, and deployment are outside this authorization.

The historical 2026-08-17 comparison and subsequent Breachling/Warden tests established the rule:

- text-to-3D task `ef7a7258`: Prism 3.1 with Ultra texture quality, 40 credits, one coherent Human athletic source candidate, retained for non-shipping intake and downstream evaluation;
- multi-view image-to-3D task `304b62b1`: Prism 3.1 with Ultra texture quality, 45 credits, three unwanted figures caused by contaminated composite crops, rejected;
- total comparison: 85 credits, account balance 3,557 to 3,472, with no remesh, rig, export promotion, or runtime replacement.
- direct text-to-3D later produced one visually useful but incorrectly posed Breachling and one rejected armored-human Warden; these are provenance/style references only and cannot supply production geometry.

The later controlled body batch is recorded in [`body-anchor-intake.json`](./body-anchor-intake.json). Twelve accepted visual sources and their twelve owner-reviewed input images are preserved outside the shipping tree. They are grandfathered paid source candidates: their actual output is reviewed without automatically purchasing replacements. Each untouched GLB is a single unrigged mesh with roughly 727k-767k vertices and 1.41M-1.49M triangles, so none is eligible for direct runtime promotion. Account balance after the batch was 2,472 credits.

## Permanent playable-character foundation

### Body and head families

The Level 1 proof covers four playable ancestries with adult masculine and feminine body families:

| Ancestry | Required body proof | Identity boundary |
| --- | --- | --- |
| Human | masculine and feminine | grounded, adaptable, lowest raw ancestry baseline; never visually treated as the default or superior body |
| Elf | masculine and feminine | lean adult proportions, real face, readable pointed ears, strongest magic aptitude |
| Dwarf | masculine and feminine | compact adult proportions, broad grounded frame, never caricatured; Mage and Shadowknight remain unavailable |
| Halfling | masculine and feminine | small adult proportions, readable hands/feet/face, never childlike or chibi; Mage and Shadowknight remain unavailable |

The Human pilot establishes the canonical meter scale, ground plane, head seam, hair cap, material slots, face landmarks, ear/nose sockets, body coverage regions, and facial-rig contract. The remaining bodies conform to that game-wide contract or declare a versioned retarget/conform profile.

### Character-creation body profiles

Every compatible adult ancestry/presentation family supports three visibly distinct character-creation body profiles:

| Profile | Silhouette contract |
| --- | --- |
| Slim | lean, narrow, wiry, and healthy; never frail, adolescent, or starved |
| Athletic | balanced capable adventurer build; the initial Human topology and fit pilot |
| Heavy | broad, substantial, and powerful with believable soft tissue; never comic relief or caricature |

These are versioned shape/conform profiles on the same compatible topology and canonical skeleton, not unrelated rigs. Identity, animation names, sockets, facial controls, and saved-character IDs remain stable when the body profile changes. Armor and clothing must pass skinning, coverage, clipping, and locomotion QA on all three profiles before that item ships.

Body profile is appearance-only in this program. It does not change ancestry statistics, calling eligibility, movement speed, hit boxes, or combat balance unless a later approved systems ticket explicitly adds such rules.

### Character-creation appearance library

The current production minimum is:

- four adult facial-feature families per compatible head topology: African diaspora/Black, East Asian, South Asian/Indian, and European;
- at least six equally canonical skin-tone material families, including deep, dark, medium-deep, medium, tan/olive, and light/pale coverage;
- at least six masculine-presenting and six feminine-presenting hair geometry families, with cross-presentation availability whenever fit QA passes;
- modular brows, facial hair, sideburns, scars, tattoos/paint, nose rings/studs, and earrings;
- ancestry markers that remain readable without changing morality, class, rarity, or power;
- locally rendered headshots from the exact approved runtime assembly.

Every facial-feature family is available across Human, Elf, Dwarf, and Halfling character creation, and across masculine/feminine presentation and Slim/Athletic/Heavy body profiles. Fantasy ancestry remains a separate layer for features such as ear form, stature, and ancestry-specific proportions; it never determines the player's real-world facial-feature family. Skin tone, hair, facial hair, adornments, body profile, calling, and statistics are also independent selections. No family is the default, canonical, rare, morally coded, or mechanically advantaged choice.

These are respectful reusable head variants or deformation profiles on compatible head topologies, not caricatures and not duplicated full-body models. Each family needs representative reference review, equivalent detail and material quality, identical facial-animation coverage, and fit validation with every supported ancestry marker before release. Character-creation data stores a stable `facialFeatureFamilyId` independently from `ancestryId`, `skinToneId`, `bodyProfileId`, and presentation.

Character creation, gameplay, paper doll, saved profile, and headshot rendering must resolve the same asset IDs. A portrait cannot depict hair, skin, facial structure, adornment, armor, or weapon that the world actor does not have.

### Starter calling assemblies

All nine Level 1 callings use the shared worn C-tier outfit with separate modest identity layers:

| Calling | Calling layer | Separate starter weapon package |
| --- | --- | --- |
| Warrior | leather bracer and restrained shoulder guard | plain iron longsword |
| Mage | faded mantle, sash, and component pouch | ashwood practice staff |
| Priest | devotional stole and modest forearm guard | plain wooden mace |
| Sharpshooter | leather bracer, belt pouch, and quiver | shortbow, string, arrows, and quiver |
| Paladin | battered light shoulder/chest protection | iron shortsword and wooden shield |
| Summoner | binding sash, token loops, and ritual pouch | binding rod |
| Asura | dark practical wraps and restrained ritual holder | ritual knife |
| Slayer | light leather bracers and paired sheaths | paired worn daggers |
| Shadowknight | worn common layer without advanced runes or grave-iron | battered longsword finish |

The weapon, sheath, off-hand, clothing, armor, hair, and body remain independently replaceable. Higher-level weapons and armor are not part of this ticket.

## First Breach NPC model and conversation-face proof

### Named NPC source models

Ilyra, Orren, and Brannoc each receive a new original ChatGPT single-subject source image based on the approved existing character direction and updated lore requirements, followed by single-image conversion. Their image briefs lock age range, ancestry/physiology, facial identity, body proportions, C-tier clothing, role silhouette, and permitted accessories before any paid task.

The in-world actor and the conversation close-up must use the same approved body/head identity. A separate illustration may remain as loading or historical art, but it cannot silently replace the live character during dialogue.

### Reusable facial rig

The three NPCs prove one reusable browser facial-animation contract:

- neutral, blink, squint, and eye-direction controls;
- brow raise/lower and asymmetric concern/emphasis controls;
- jaw open/close and controlled cheek/lip deformation;
- a compact speech-viseme set covering silence, closed lips, lip/teeth, tongue/teeth, alveolar, velar, affricate, sibilant, nasal, rhotic, and open/rounded vowel groups;
- restrained expression presets such as attentive, concerned, stern, encouraging, and alarmed;
- timestamped gaze, expression, and viseme cues stored separately from the model;
- automatic blink and attentive idle when no voice track is playing;
- text-only accessibility fallback that uses authored idle/emphasis cues without fabricating speech audio.

Recorded voiceovers are processed into deterministic cue tracks. The audio timeline is authoritative for lip-sync; dialogue text is authoritative for captions. The same cue/event system must later work for additional NPCs without rebuilding the conversation UI.

### Conversation presentation acceptance

For every named NPC:

1. Begin conversation from the actual in-world actor.
2. Transition to a close-up or framed 3D face without identity, material, hair, or accessory changes.
3. Keep eye focus and blinks alive before and after each line.
4. Play recorded voice with synchronized viseme and expression cues.
5. Preserve captions, skip, replay, mute, and reduced-motion behavior.
6. Return to the same in-world actor and pose without replacing the model.
7. Pass desktop and narrow-layout performance without duplicating textures or skeleton state unnecessarily.

## First Breach creature models

### Training construct

The training effigy/Sentinel is a purpose-built construct with readable command geometry. It must support idle activation, rotate/face, locomotion when used as a mobile Sentinel, guard/block, punish/attack, hit reaction, stagger, shutdown/defeat, and terminal inactive state. Rigid components use a mechanical hierarchy rather than unnecessary humanoid skin deformation.

### Breachling family

The Breachling is an original Level 1 hunched-predator family, not a scaled player avatar, upright humanoid, Dragonkin, or Dragonborn. It is a compact roughly four-foot ambush predator. Its permanent resting anatomy is a low stalking hunch: the spine hinges forward about 40 degrees from a rear-set pelvis, the upper back forms a rounded predatory arch, shoulders sit ahead of the hips, the neck and large head project low and forward, the forearms are long and nearly reach the ground, and the short powerful legs remain bent and digitigrade with low hocks, Achilles, heel pads, and broad feet. The huge broad non-human hinged maw has a deep cavity, layered irregular teeth, and a visible tongue. Its production face requires separate `jaw-open`, `jaw-close`, and `snarl` controls. A neutral source stance must preserve this anatomy instead of straightening it into a humanoid rig pose.

One approved base anatomy and creature rig supports the current encounter assemblies:

- Breachling;
- Breachling Stalker, as the existing creature name and not the Slayer specialization;
- Oathbound Breachling;
- Breachling Ravager.

Every tier receives its own owner-reviewed render while preserving the same hunched anatomy, proportions, joint layout, skeleton, and shared animation set. The base is pale ash/grey with small ridges; the Stalker is darker slate/smoke, leaner, and longer-ridged; the Oathbound is earth-brown/ochre with thicker overlapping grown keratin scutes and heavier chest/forearms; the Ravager is cinder-red/rust with the densest grown osteoderms, enlarged horns, spikes, bone ridges, and claws. All defensive plating grows biologically from the hide. Metal plates, straps, buckles, rivets, leather garments, and a knight/soldier read are forbidden. Required motion coverage is spawn/awaken, idle, locomotion, turn, selected-target reaction, jaw/snarl threat display, telegraph, normal attack, variant attack where present, hit, stagger, death/defeat, and terminal hold.

Every creature design brief must be complete before image generation: silhouette; locomotor and attack anatomy; joint logic; facial and jaw mechanics; surface/material hierarchy; threat language; scale; palette; encounter role; rig controls; VFX/SFX sockets; variants; forbidden reads; and normal isometric-camera readability. A generic humanoid body with cosmetic monster parts is rejected.

### Cinderbound Warden

The Cinderbound Warden is the unique mechanical/golem boss, not a biological monster, Breachling, armored human, knight, or Paladin. It is built from interlocking charred-basalt and oxidized-bronze plates around a visible ember core, with a towering triangular shoulder silhouette, a faceless iron mask and vertical amber sensor slit, heavy articulated hands, a circular soul-tax mechanism in the left palm, and an integrated obsidian sweep-blade in the right forearm. It uses a purpose-built rigid mechanical hierarchy with plate joints rather than humanoid skin deformation or a handheld sword. Its silhouette, scale, materials, weapon/limb logic, and three seeded pattern tells must read from the normal isometric camera. Required coverage includes idle pressure, locomotion, turn, normal attack, heavy telegraph, cinder sweep, ash call, soul tax, hit, stagger, defeat/death, and terminal hold.

Prism multi-view task `445fd16b-4006-4c18-a54a-fed2a63da955` spent 45 credits and is rejected for production: the ambiguous rear reference repeated front-facing palm/core/limb cues, and the generated model produced a duplicate two-head/two-front silhouette with no convincing live furnace flame. Its untouched GLB remains preserved for provenance and must not be deleted without exact owner confirmation. The replacement source must model a hollow furnace cage and core cavity. Moving fire is a separate runtime effect attached to `VFX_CoreFlame`; it is not baked static provider geometry.

Creature rigs do not need to share the humanoid skeleton when anatomy would suffer. They do need the same action-contract structure, event markers, grounding, target facing, VFX/SFX sockets, provenance, performance budgets, and visual-QA evidence.

## Animation and validation matrix

### Playable humanoid coverage

The accepted humanoid foundation must pass:

- idle, walk, run, turn, target-facing, hit, stagger, death, terminal hold, recall/recovery;
- draw, sheath, unarmed idle, punch, kick, block, and empty-hand interaction;
- one-handed sword, staff, mace, bow, sword/shield, rod/focus, ritual knife, and paired-dagger guards and starter actions;
- every implemented Level 1 calling signature and defense;
- door, coffer, Memory Loom, Soul Well, pickup, lever, and dialogue transitions used in the current slice.

### Required surfaces and rooms

Every accepted character assembly is checked in character creation, paper doll, gameplay camera, and close inspection. The complete asset set then passes:

1. Realm-Lock Vestibule and character refinement;
2. Ilyra conversation and Chronicle handoff;
3. starter coffer/equip and action rehearsal;
4. Wayfarer/Oathbreaker door choice;
5. Orren and Brannoc conversation-face proofs;
6. training construct/Sentinel rehearsal;
7. Fractured Galleries Breachling encounter;
8. Ashen Lock Cinderbound Warden encounter;
9. player and enemy defeat/terminal states;
10. First Memory pickup and level completion.

Normal-speed gameplay-camera video is the authoritative visual proof. Close-up video verifies face, grip, clipping, materials, and deformation. Tests also require zero failed asset requests, zero page exceptions, bounded memory growth, and acceptable draw-call/triangle/texture budgets.

## Credit-gated execution sequence

### Stage 0: free preparation

- Approve the exact Level 1 register and source hierarchy.
- Prepare one complete canonical specification per isolated asset and record its full prompt/edit hash. Repeat the entire identity/anatomy/material/role/required/forbidden block in every generation; only the camera/output suffix may change.
- Score the output against silhouette, proportions, anatomy/joints, face/identity, materials/palette, role/lore read, pose/view, required details, and forbidden traits before owner review.
- Inspect the 3D AI Studio connector read-only and record currently exposed operations/models.
- Obtain a live credit estimate for one task without submitting it, if the connector supports estimates.
- Record the maximum approved cost separately for every paid task or tightly bounded batch.

### Stage 1: humanoid pilot

- Preserve the twelve accepted image-first body anchors and their exact source images using [`body-anchor-intake.json`](./body-anchor-intake.json).
- Retain text-to-3D task `ef7a7258` as a historical Human athletic comparison candidate until the topology pilot is selected.
- Clean, retopologize, bake, compare Prism versus the current skeleton, and prove baseline locomotion/unarmed/facial deformation.
- Stop if identity, topology, head seam, rig, hands, face, or animation economics fail.

### Stage 2: creature pilot

- Present the canonical low-hunched huge-maw Breachling source set and complete creature/rig brief.
- Pass exact front, 90-degree left, true rear, and 90-degree right through the contradiction gate, then submit those four exact hashed files as one Prism 3.1 Multi-Image conversion inside the phase authorization.
- Prove cleanup, creature rig, locomotion, attack, hit, death, terminal hold, and gameplay-camera readability.
- Stop before variants or Warden generation if the creature boundary fails.

### Stage 3: controlled expansion

After both pilots pass, continue the authorized asset-type-specific queue in this order:

1. counterpart Human body and Human appearance library;
2. Elf, Dwarf, and Halfling body pairs and fit profiles;
3. starter clothing/calling layers and eight weapon packages;
4. Ilyra, Orren, and Brannoc source models and facial-rig conforming;
5. Breachling variants, training construct, and Cinderbound Warden;
6. final Level 1 animation/room integration.

The standing authorization covers the required owner-reviewed ChatGPT-source conversions for issue #448, including the owner-approved strict four-view Breachling and Warden conversions. It does not approve direct text-to-3D, remesh, rigging, animation purchases, runtime promotion, QA merge, or production deployment. A task that consumes an unexpected credit amount stops the batch immediately.

## Rollback and promotion

The public baseline at `e0b3d9d8b6ef893373e7aab6253441b6f3da108a` remains independently deployable until the complete new model set passes QA. New assets live on this dedicated branch and enter `qa` only through reviewed commits/PRs.

Runtime resolution must retain an explicit fallback manifest while the branch is in development. Promotion removes a placeholder only after its production replacement passes on every required surface. It never deletes the rollback release or rewrites old saved character identities silently.

## Current authorization and notification point

The approved 85-credit Human comparison and the twelve-model image-first body-anchor batch are complete and preserved. The owner has authorized required issue #448 ChatGPT-image-to-3D source generation without individual approval pauses. Before each submission, Codex still shows the source image in chat and records its complete canonical prompt/edit hashes, exact file hash, exclusion list, model/version, settings, live cost, task ID, and credit receipt. Codex notifies the owner when the account balance falls below 2,000 credits; the last live-verified balance after the rejected 45-credit Warden task was 2,347.

This authorization does not include direct text-to-3D, remesh, rigging, animation purchases, QA merge, or deployment. Single-image mode requires exactly one isolated subject on a plain background; riggable actors require a neutral full-body stance with unobstructed limbs that preserves canonical anatomy. Multi-view requires a separate owner decision, four separate identity-matched files, and the strict side/rear contradiction gate. A contact sheet is never valid input.
