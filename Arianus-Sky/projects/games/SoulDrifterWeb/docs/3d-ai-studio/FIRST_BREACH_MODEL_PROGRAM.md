# First Breach Production Model Program

Status: active production-source program; Breachling multi-view POC owner-selected under [The-Nexus #448](https://github.com/The-Nexus-Decoded/The-Nexus/issues/448)

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

Every new body, head source, hair geometry family, clothing/armor geometry family, weapon family, named NPC, creature, prop, and environment piece begins as an owner-reviewed ChatGPT reference image containing one complete isolated subject. That approved source is then routed through the asset-appropriate 3D AI Studio Image-to-3D path. A clean single image remains suitable for simple or symmetric subjects. Bespoke monsters and other asymmetric hero actors use four separately art-directed, identity-matched ChatGPT views after the strict view gate below. Meshy 7 Multi-image remains the accepted Breachling-family provider; corrected Prism 3.1 Multi-Image is the accepted Cinderbound Warden source after it preserved the mechanical silhouette and emissive design at a practical topology budget. Direct text-to-3D was retired for new production work after the Breachling/Warden comparison showed unacceptable style and identity drift. No production actor is accepted by renaming or recoloring a generic substitute.

Beginning with the 2026-08-18 fidelity correction, every new source uses one complete canonical specification. The identity, silhouette, proportions, anatomy and joint logic, face, materials and palette, role/lore read, required details, and forbidden traits are copied verbatim into every ChatGPT generation. Only the camera or output suffix may change. Shorthand such as “same creature,” “preserve the reference,” or a delta-only edit prompt cannot replace the full specification. A reference image is supporting evidence, not permission to omit requirements.

This rule is prospective. Existing paid outputs are preserved and judged by their actual owner-visible result and technical intake; missing retrospective prompt parity alone does not trigger a rebuild. A paid source is regenerated only for a concrete visual or technical blocker. The rejected two-headed Warden is one such blocker. The rejected upright Breachling images remain historical evidence; the corrected four-view v5 set and owner-preferred Meshy source candidate supersede them without deleting provenance.

The 2026-08-18 beast-tail decision is also prospective and anatomical: a hunched or quadrupedal beast body receives one functional counterbalance tail unless its complete creature brief explains why that species cannot have one. The tail must continue from the sacrum, remain separate from the legs, taper naturally, preserve the spine/ridge logic, and use a riggable tail chain. The owner-selected tailless base Breachling remains the workflow POC that proved custom four-view Meshy reconstruction, but it is not the final family anatomy. Base, Stalker, Oathbound, and Ravager production sources must converge on one tail-enabled shared Breachling rig.

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

All production categories use the same image-first principle, but not a single provider model. Simple and symmetric assets can use one owner-reviewed ChatGPT image followed by Prism 3.1 single-image conversion. Bespoke asymmetric monsters and hero actors use four separate owner-reviewed views followed by the provider that best preserves that asset's accepted silhouette, anatomy, topology budget, and material read; the current bindings are Meshy 7 Multi-image for Breachlings and Prism 3.1 Multi-Image for the Warden. Humanoid sources use a neutral front A- or T-pose with clear limbs and flat feet. Riggable creatures use a neutral custom-rig stance that preserves their canonical anatomy; forcing a hunched predator upright to imitate a humanoid A-pose is a source failure. Weapons, armor, clothing, and ordinary props use a neutral unobstructed product orientation. A composite contact sheet, multiple figures, inset views, action pose, fused equipment set, or conflicting camera view is invalid provider input.

The Breachling family and Cinderbound Warden have an explicit owner decision permitting four-view conversion. Front, exact 90-degree left, true rear, and exact 90-degree right must be four separate identity-matched files. A side view fails if it is three-quarter, exposes the opposite eye/cheek, front chest, palm, or the top/front of both feet. A rear view fails if it exposes any face, throat/chest/front core, palms, kneecaps/front shins, toe tops, or front-facing weapon surface. It must instead prove rear skull/head shell, spine/scapulae, rear pelvis/tail root, backs of limbs, and species-appropriate hamstrings, hocks, Achilles, heels, or paw anatomy. Any contradiction blocks submission. Prism rejected the external Breachling view set under provider policy even after the safer rear correction and automatically refunded those attempts, so that exact Breachling Prism route is not retried. Provider choice is asset-specific: Meshy 7 for the accepted Breachling source family and corrected Prism 3.1 Multi-Image for the Warden.

### Multi-view source construction standard

The supported multi-view paths follow the provider's [Image-to-3D fixed-view contract](https://docs.3daistudio.com/3d-generation/image-to-3d) and [Character Sheet workflow](https://docs.3daistudio.com/image-studio/character-sheet):

1. Generate one full-resolution canonical actor image with ChatGPT in Codex. Do not purchase the canonical design image inside 3D AI Studio.
2. Approve and hash that source before any paid provider operation.
3. For a bespoke monster or asymmetric hero actor, create and approve four separate ChatGPT views from the same full canonical specification. The Breachling POC proved this preserves custom proportions better than asking the Character Sheet Generator to infer the other views from one image.
4. For a simpler humanoid or NPC proof, the Character Sheet Generator with GPT Image 2 medium remains a fast fallback. Treat its generated sheet only as a staging master and inspect identity, proportions, anatomy, appendage count, asymmetric placement, materials, camera angle, and true-rear evidence before splitting it.
5. Whether authored separately or split from a generated sheet, keep four separate high-resolution panels labelled `front`, `left`, `back`, and `right`. The composite sheet is never uploaded to Image-to-3D.
6. Upload each panel into its matching multi-view slot. Meshy 7 Multi-image is the selected path for bespoke monsters; Prism remains an evaluated fallback only where its policy accepts the inputs. Left and right are character-relative, not viewer-relative guesses.
7. Keep subject scale, framing, background, lighting, neutral pose, and ground height consistent across all four panels. The provider explicitly warns that inconsistent lighting, distance, or background confuses reconstruction.
8. Generate the 3D model only after all four panels pass the contradiction gate. Rotate the completed mesh through front, both sides, back, top, and underside before accepting it.

For an object with an obvious functional front, that front is the canonical zero-degree view: a chest uses its latch/front panel, a chair uses its seating/front direction, a weapon uses the readable presentation side, and a machine uses its control/front face. For a simple symmetric object with no meaningful hidden structure, one clean three-quarter source is preferred over an unnecessary four-view job. Complex asymmetric hard-surface objects may use fixed four-view reconstruction, but they use an object turnaround generated and split outside the character-specific tool. Wings, tails, blades, horns, handles, doors, lids, cables, and other asymmetric parts must remain on the same object-relative side in every panel.

Clean white or transparent source backgrounds are uploaded directly. Background-removal credits are not spent merely to make a local file addressable to the connector; browser upload of the exact approved file is the required intake path.

On 2026-08-17 the owner authorized all required issue #448 single-image conversions without per-task approval pauses. On 2026-08-18 the owner first introduced and later explicitly removed the temporary credit floor so the bounded #448 source library could be completed. Every ChatGPT source is still shown in chat before conversion, and live settings, charge, task ID, receipt, and source hash are recorded for every task. Unexpected provider pricing still stops the batch. Direct text-to-3D, remesh, rigging, paid animation, runtime promotion, merge, and deployment remain outside this authorization.

The historical 2026-08-17 comparison and subsequent Breachling/Warden tests established the rule:

- text-to-3D task `ef7a7258`: Prism 3.1 with Ultra texture quality, 40 credits, one coherent Human athletic source candidate, retained for non-shipping intake and downstream evaluation;
- multi-view image-to-3D task `304b62b1`: Prism 3.1 with Ultra texture quality, 45 credits, three unwanted figures caused by contaminated composite crops, rejected;
- total comparison: 85 credits, account balance 3,557 to 3,472, with no remesh, rig, export promotion, or runtime replacement.
- direct text-to-3D later produced one visually useful but incorrectly posed Breachling and one rejected armored-human Warden; these are provenance/style references only and cannot supply production geometry.

The 2026-08-18 Breachling multi-view POC compared both source-construction methods and both accepted reconstruction paths:

- Character Sheet task `b3c21a78-3c79-442b-b383-ae3a7eb5bcd6-0` generated four views from the approved front for 6 credits. Its side views inflated the torso/hip mass, so it is a fallback rather than the bespoke-monster default.
- Character Sheet views to Prism task `1bea1354-38aa-45e1-a2b8-827d01ecdfb5` completed for 40 credits, but produced a 760,487-vertex, 1,477,224-triangle, unrigged source.
- The corrected custom front/left/rear/right set to Meshy task `7ad8a98c-8984-4091-a71c-ed053295e156` completed for 45 credits. The owner selected it because it best preserved the lean trunk, long forearms, permanent low crouch, and predator threat read.
- The Character Sheet views to the same Meshy 7 engine task `d16c2f59-1213-4339-8741-14ecdc3e01f3` completed for 45 credits, proving the source views—not merely the engine—caused the bulkier, rounder result.
- Both Meshy outputs are approximately two million triangles and all three POC GLBs have zero skins and zero animations. The selected output is a source candidate only; retopology, bake, rig, animation, and gameplay acceptance remain mandatory.
- The later rust-red tailed Stalker set used the selected custom-four-view path in Meshy task `4f473756-9660-48d1-a6f7-14d6de55524a`. Its untouched GLB is a 60,994,784-byte single mesh with 1,005,742 vertices, 1,905,366 triangles, three PBR textures, zero skins, zero morph targets, and zero animations. Front/left/rear/right local renders confirm one head, one sacrum-rooted tail, intact limbs and jaw, and no duplicated rear face. It remains a provisional source candidate pending final owner review and the later retopology/rig gate.
- The tail-corrected pale ash-grey base set then repeated the complete canonical identity and anatomy specification in all four view prompts and used the same Meshy path in task `2897ca72-80fa-4872-ae65-98a088a7d63c`. Its untouched 52,772,424-byte GLB is one mesh with 859,345 vertices, 1,648,748 triangles, base-color/metallic-roughness/normal PBR textures, zero skins, zero morph targets, and zero animations. Front/left/rear/right local renders confirm one head, one continuous sacrum-rooted tail, intact limbs and jaw, the permanent low hunting posture, and no duplicated rear face. It supersedes the tailless base POC as the provisional production source while preserving that earlier task as the workflow comparison proof.
- Full-spec tail-enabled Oathbound and Ravager v3 source sets are now complete in exact front/left/rear/right order. The Oathbound uses deep moss/verdigris hide, ochre mineral accents, and thicker grown scutes; the Ravager uses blackened-cinder hide, non-emissive ember-red mineral fissures, and the densest family-grown spikes and osteoderms. All eight files passed the source anomaly gate for one head, one tail, low-hunched shared anatomy, clean rear surfaces, and no manufactured armor. The owner subsequently closed the #448 creature-generation queue after the corrected Warden, so these two higher variants remain preserved four-view concepts rather than additional paid conversions in this branch.

The later controlled body batch is recorded in [`body-anchor-intake.json`](./body-anchor-intake.json). Twelve accepted visual sources and their twelve owner-reviewed input images are preserved outside the shipping tree. They are grandfathered paid source candidates: their actual output is reviewed without automatically purchasing replacements. Each untouched GLB is a single unrigged mesh with roughly 727k-767k vertices and 1.41M-1.49M triangles, so none is eligible for direct runtime promotion. Account balance after the batch was 2,472 credits.

The modular source batch is recorded under `appearanceReferenceLibrary` and `modularSourceConversions` in [`first-breach-model-register.json`](./first-breach-model-register.json). It preserves eight representative facial references covering four cross-ancestry families and two presentations, twelve hairstyle references, ten starter weapon/off-hand sources, and four starter wearable sources. Facial references are deformation and material targets for the canonical head rather than separate paid head models. Simple modular assets use Meshy 7 Smart Topology in single-image low-poly mode with 2K PBR textures; this is an asset-specific source conversion, not a change to the Prism requirement for hero actors such as the Warden. Every result remains outside the shipping tree pending Blender part separation, conforming, retopology/bake, sockets, coverage masks, and camera/clipping QA. The generated ritual knife is explicitly rejected because the provider invented a split blade; the accepted worn dagger is the Level 1 Asura/Slayer fallback.

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

Ilyra, Orren, and Brannoc each now have a preserved original ChatGPT single-subject full-body source based on the approved existing character direction and updated lore requirements, a separately preserved matching frontal conversation-face reference, and a single-image Prism 3.1 conversion. Their image briefs lock age range, ancestry/physiology, facial identity, body proportions, C-tier clothing, role silhouette, and permitted accessories before the paid task. Each result passed front/rear anomaly review and remains an untouched source pending retopology, canonical rigging, and facial conforming; none is a runtime drop-in.

- Ilyra: task `02c05b91-3da0-49bf-8337-f019bbedee33`, mature Human Wellkeeper, silver crown/forward braids, faded blue-grey pilgrim layers, keys and pouch.
- Orren: task `a00a1818-57cd-4953-90a5-b62ac934b30d`, medium-brown male Elf scout, pointed ears, near-black topknot, green scarf, and worn leather field layers.
- Brannoc: task `74ff6706-6833-451d-b542-4c2e75ab007c`, mature male Dwarf Arena Warden, swept-back silver hair, large multi-braided beard, and brown leather over faded blue-grey training layers.

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

The Breachling is an original Level 1 hunched-predator family, not a scaled player avatar, upright humanoid, Dragonkin, or Dragonborn. It is a compact roughly four-foot ambush predator. Its permanent resting anatomy is a low stalking hunch: the spine hinges forward about 40 degrees from a rear-set pelvis, the upper back forms a rounded predatory arch, shoulders sit ahead of the hips, the neck and large head project low and forward, the forearms are long and nearly reach the ground, and the short powerful legs remain bent and digitigrade with low hocks, Achilles, heel pads, and broad feet. One long muscular counterbalance tail continues from the sacrum, is thick at the root, tapers smoothly, carries the diminishing dorsal ridge, and remains separate from both legs. The huge broad non-human hinged maw has a deep cavity, layered irregular teeth, and a visible tongue. Its production face requires separate `jaw-open`, `jaw-close`, and `snarl` controls. A neutral source stance must preserve this anatomy instead of straightening it into a humanoid rig pose.

One approved base anatomy and creature rig supports the current encounter assemblies:

- Breachling;
- Breachling Stalker, as the existing creature name and not the Slayer specialization;
- Oathbound Breachling;
- Breachling Ravager.

Every tier receives its own owner-reviewed render while preserving the same hunched anatomy, tail chain, proportions, joint layout, skeleton, and shared animation set. The base is pale ash/grey with small ridges. The Stalker is leaner and longer-ridged, with deep rust-red/dark crimson scales, burgundy joints, near-black horn/ridge/claw tips, and amber eyes. The Oathbound moves to deep moss/verdigris green with ochre accents, thicker overlapping grown keratin scutes, and heavier chest/forearms. The Ravager is blackened cinder/obsidian with ember-red accents and the densest grown osteoderms, enlarged horns, spikes, bone ridges, and claws. All defensive plating grows biologically from the hide. Metal plates, straps, buckles, rivets, leather garments, and a knight/soldier read are forbidden. Required motion coverage is spawn/awaken, idle, locomotion, turn, selected-target reaction, jaw/snarl threat display, telegraph, normal attack, variant attack where present, hit, stagger, death/defeat, and terminal hold.

Every creature design brief must be complete before image generation: silhouette; locomotor and attack anatomy; joint logic; facial and jaw mechanics; surface/material hierarchy; threat language; scale; palette; encounter role; rig controls; VFX/SFX sockets; variants; forbidden reads; and normal isometric-camera readability. A generic humanoid body with cosmetic monster parts is rejected.

### Cinderbound Warden

The Cinderbound Warden is the unique mechanical/golem boss, not a biological monster, Breachling, armored human, knight, or Paladin. It is built from interlocking charred-basalt and oxidized-bronze plates around a visible ember core, with a towering triangular shoulder silhouette, a faceless iron mask carrying two distinct red glowing eyes, heavy articulated hands, a circular soul-tax mechanism in the left palm, and an integrated oversized obsidian claw/sweep-blade in the right forearm. It uses a purpose-built rigid mechanical hierarchy with plate joints rather than humanoid skin deformation or a handheld sword. Its silhouette, scale, materials, weapon/limb logic, and three seeded pattern tells must read from the normal isometric camera. Required coverage includes idle pressure, locomotion, turn, normal attack, heavy telegraph, cinder sweep, ash call, soul tax, hit, stagger, defeat/death, and terminal hold.

The rejected original Prism and later Meshy Warden remain provenance only. The owner rejected the Meshy candidate because it flattened the required red eyes and furnace glow and weakened the claw-arm read. The accepted replacement combines front v3 with two distinct red eyes and a bright open furnace, exact left profile v3, true rear v2, and exact right profile v3. Prism 3.1 Multi-Image task `b249e29c-7ead-45da-85f0-3f996eaf8f90` converted those four sources. The preserved 8,002,660-byte GLB has one head, two readable red eyes, a bright caged ember furnace, an oversized integrated curved claw-blade, a distinct soul-tax palm, a solid mechanical rear with no second face or core, intact load-bearing limbs, and no floating duplicate body. At 144,490 triangles with no skin or animations, it is the accepted production source for later rigid part segmentation, retopology, emissive materials, `VFX_CoreFlame`, mechanical rigging, and gameplay proof rather than a runtime drop-in.

The offline Blender 4.5.12 LTS technicalization pilot `sd-creature-cinderbound-warden-rigid-lod0-pilot-v006.glb` proves that the accepted Prism source can survive a rigid mechanical hierarchy and a practical first LOD without repeating the rejected Meshy drift. It retains one mesh, three materials, 80,399 triangles, one skin, 17 joints, the right integrated claw-blade, the left soul-tax palm, two explicit red emissive eye meshes, three embedded core-ember meshes, one front furnace, and a solid rear. The four-view proof rejects any export that hides the claw, duplicates the core, or turns the eyes and furnace into unlit dark paint. This external pilot is still non-shipping: `Warden_RigidProof` only validates rigid assignment, while the authored boss action set, animated `VFX_CoreFlame`, gameplay-camera clipping/performance proof, and runtime promotion remain required.

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
- Pass exact front, 90-degree left, true rear, and 90-degree right through the contradiction gate, then submit those four exact hashed files as one Meshy 7 Multi-image conversion inside the phase authorization.
- Preserve owner-preferred task `7ad8a98c-8984-4091-a71c-ed053295e156` as the source-construction workflow proof; do not repeat the policy-blocked Prism path and do not rig its now-superseded tailless anatomy as the final family body.
- Preserve rust-red tailed Stalker task `4f473756-9660-48d1-a6f7-14d6de55524a` as the first tail-enabled family source candidate. Its four exact hashes, prompt/edit lineage, untouched export, PBR slots, and four local inspection renders are recorded in the model register.
- Preserve tail-corrected base task `2897ca72-80fa-4872-ae65-98a088a7d63c` as the provisional production source and retain its exact four hashes, untouched export, PBR slots, and four local inspection renders in the model register.
- Preserve the complete full-spec Oathbound and Ravager v3 four-view sets as future concepts; the owner closed further #448 monster conversion after the accepted Warden.
- Treat the owner-selected creature sources as proof of the source-construction path, not proof of runtime readiness. Continue only the approved character-appearance, starter-equipment, and provenance queue.
- Defer cleanup, creature rig, locomotion, attack, hit, death, terminal hold, and gameplay-camera proof to the technicalization gate after the required source library is complete.

### Stage 3: controlled expansion

After the source-construction pilots pass, continue the authorized source-only queue in this order:

1. counterpart Human body and Human appearance library;
2. Elf, Dwarf, and Halfling body pairs and fit profiles;
3. starter clothing/calling layers and eight weapon packages;
4. Ilyra, Orren, and Brannoc source models and facial-rig conforming;
5. Breachling variants, training construct, and Cinderbound Warden;
6. source-library anomaly and provenance audit.

### Stage 4: technicalization and runtime proof

After the required source library is complete, obtain the separate authorization for retopology, bake, rigging, animation, and runtime integration. Prove the canonical humanoid rig first, then the shared Breachling rig and Warden mechanical hierarchy, then the named-NPC facial rig. Only after those gates pass may the branch replace a runtime placeholder and begin final Level 1 animation/room revalidation.

The standing authorization covers the required owner-reviewed ChatGPT-source conversions for issue #448, including the owner-approved strict four-view Breachling and Warden conversions. It does not approve direct text-to-3D, remesh, rigging, animation purchases, runtime promotion, QA merge, or production deployment. A task that consumes an unexpected credit amount stops the batch immediately.

## Rollback and promotion

The public baseline at `e0b3d9d8b6ef893373e7aab6253441b6f3da108a` remains independently deployable until the complete new model set passes QA. New assets live on this dedicated branch and enter `qa` only through reviewed commits/PRs.

Runtime resolution must retain an explicit fallback manifest while the branch is in development. Promotion removes a placeholder only after its production replacement passes on every required surface. It never deletes the rollback release or rewrites old saved character identities silently.

## Current authorization and notification point

The approved 85-credit Human comparison and the twelve-model image-first body-anchor batch are complete and preserved. The owner has authorized the remaining bounded issue #448 ChatGPT-image-to-3D source generation without individual approval pauses and removed the temporary credit floor. Before each submission, Codex still shows the source image in chat and records its complete canonical prompt/edit hashes, exact file hash, exclusion list, model/version, settings, live cost, task ID, and credit receipt. An unexpected provider charge still stops the batch immediately.

This authorization does not include direct text-to-3D, remesh, rigging, animation purchases, QA merge, or deployment. Single-image mode requires exactly one isolated subject on a plain background; riggable actors require a neutral full-body stance with unobstructed limbs that preserves canonical anatomy. Multi-view requires a separate owner decision, four separately stored identity-matched files, and the strict side/rear contradiction gate. Separately art-directed ChatGPT views are preferred for bespoke monsters; a Character Sheet staging master is a fallback for simpler humanoid/NPC proof. A composite contact sheet is staging evidence only and is never valid Image-to-3D input.
