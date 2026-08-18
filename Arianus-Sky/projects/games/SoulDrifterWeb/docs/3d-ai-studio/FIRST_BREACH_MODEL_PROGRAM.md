# First Breach Production Model Program

Status: active requirements and pre-generation work under [The-Nexus #448](https://github.com/The-Nexus-Decoded/The-Nexus/issues/448)  
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

Every new body, head source, hair geometry family, clothing/armor geometry family, weapon family, named NPC, and First Breach creature begins as an owner-approved 3D AI Studio task. No production actor is accepted by renaming or recoloring a generic humanoid substitute.

3D AI Studio is the source generator, not the last production step. Every accepted source still requires:

1. untouched download and task/credit/license provenance;
2. Blender cleanup and deformation-friendly retopology;
3. UV/PBR bake and controlled material variants;
4. canonical rig comparison or documented retarget profile;
5. facial deformation where required;
6. equipment sockets, coverage masks, and LODs;
7. animation, gameplay-camera, room, and performance acceptance;
8. an approved shipping hash distinct from the untouched source hash.

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

### Character-creation appearance library

The current production minimum is:

- three adult facial structure families per compatible head topology: soft/round, angular/high-cheek, and broad/strong;
- at least six equally canonical skin-tone material families, including deep, dark, medium-deep, medium, tan/olive, and light/pale coverage;
- at least six masculine-presenting and six feminine-presenting hair geometry families, with cross-presentation availability whenever fit QA passes;
- modular brows, facial hair, sideburns, scars, tattoos/paint, nose rings/studs, and earrings;
- ancestry markers that remain readable without changing morality, class, rarity, or power;
- locally rendered headshots from the exact approved runtime assembly.

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

Ilyra, Orren, and Brannoc each receive a new original 3D AI Studio source model based on the approved existing character direction and updated lore requirements. Their source sheets lock age range, ancestry/physiology, facial identity, body proportions, C-tier clothing, role silhouette, and permitted accessories before any paid task.

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

The Breachling is an original Level 1 creature family, not a scaled player avatar. One approved base anatomy and creature rig may support the current encounter assemblies:

- Breachling;
- Breachling Stalker, as the existing creature name and not the Slayer specialization;
- Oathbound Breachling;
- Breachling Ravager.

Variants may reuse the accepted creature skeleton, locomotion, and common materials, but each assembly needs a readable gameplay silhouette and authored differences. Required motion coverage is spawn/awaken, idle, locomotion, turn, selected-target reaction, telegraph, normal attack, variant attack where present, hit, stagger, death/defeat, and terminal hold.

### Cinderbound Warden

The Cinderbound Warden receives a unique purpose-built source model and cannot ship as the current Paladin fallback. Its silhouette, scale, materials, weapon/limb logic, and three seeded pattern tells must read from the normal isometric camera. Required coverage includes idle pressure, locomotion, turn, normal attack, heavy telegraph, cinder sweep, ash call, soul tax, hit, stagger, defeat/death, and terminal hold.

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
- Prepare consistent multi-view source sheets and prompts.
- Inspect the 3D AI Studio connector read-only and record currently exposed operations/models.
- Obtain a live credit estimate for one task without submitting it, if the connector supports estimates.
- Record the maximum approved cost separately for every paid task or tightly bounded batch.

### Stage 1: humanoid pilot

- Present masculine and feminine Human source sheets for owner selection.
- After exact approval, submit one Human body/head/neutral-underlayer candidate only.
- Clean, retopologize, bake, compare Prism versus the current skeleton, and prove baseline locomotion/unarmed/facial deformation.
- Stop if identity, topology, head seam, rig, hands, face, or animation economics fail.

### Stage 2: creature pilot

- Present the original Breachling base source sheet and creature-motion brief.
- After a separate exact approval, submit one Breachling source candidate only.
- Prove cleanup, creature rig, locomotion, attack, hit, death, terminal hold, and gameplay-camera readability.
- Stop before variants or Warden generation if the creature boundary fails.

### Stage 3: controlled expansion

After both pilots pass, separately approve:

1. counterpart Human body and Human appearance library;
2. Elf, Dwarf, and Halfling body pairs and fit profiles;
3. starter clothing/calling layers and eight weapon packages;
4. Ilyra, Orren, and Brannoc source models and facial-rig conforming;
5. Breachling variants, training construct, and Cinderbound Warden;
6. final Level 1 animation/room integration.

No stage implies approval for the next stage. A task that consumes an unexpected credit amount stops the batch immediately.

## Rollback and promotion

The public baseline at `e0b3d9d8b6ef893373e7aab6253441b6f3da108a` remains independently deployable until the complete new model set passes QA. New assets live on this dedicated branch and enter `qa` only through reviewed commits/PRs.

Runtime resolution must retain an explicit fallback manifest while the branch is in development. Promotion removes a placeholder only after its production replacement passes on every required surface. It never deletes the rollback release or rewrites old saved character identities silently.

## Immediate next approval point

No paid operation is currently approved. Before the first 3D AI Studio call, the owner receives:

- the exact Human pilot source sheet and prompt;
- the exact connector operation and model/version;
- the live expected and maximum credit cost;
- the requested output formats;
- the stop conditions and local intake destination.

The Breachling pilot receives its own later approval envelope.
