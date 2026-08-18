# SoulDrifter 3D Studio Production Queue

Status: active under [The-Nexus #448](https://github.com/The-Nexus-Decoded/The-Nexus/issues/448)

> Historical filename: direct text-to-3D is retired for new production assets. This file now tracks the owner-approved ChatGPT image -> 3D AI Studio conversion queue plus historical task provenance.

Default operation: every body, head, NPC, creature, garment, armor piece, weapon, prop, and environment module begins as an owner-reviewed ChatGPT image containing one complete isolated subject, then uses Prism 3.1 single-image conversion. The Breachling family and Cinderbound Warden have a separate owner decision permitting four identity-matched views after the strict view gate. Direct text-to-3D is not a production path.

Approved starting preset: Prism 3.1 with Ultra texture quality, subject to a fresh live-price check and provenance record before every paid submission

Authorization: all required issue #448 owner-reviewed ChatGPT-source conversions may proceed without per-task approval pauses. Show every source image in chat and record its exact hash before conversion. Notify the owner if the account balance drops below 2,000 credits. Direct text-to-3D, remesh, rigging, paid animation, runtime promotion, merge, and deployment remain separate gates.

Prospective full-spec rule: every new generation repeats the complete canonical identity, silhouette, scale/proportions, anatomy/joints, face, materials/palette, role/lore, required-detail, and forbidden-trait block verbatim. Only the camera or output suffix changes. Shorthand and reference-only delta prompts are prohibited. Existing paid models are preserved and judged by their actual visual/technical output; missing retrospective prompt parity does not automatically trigger another purchase.

Machine-readable anchor batch: [`text-to-3d-anchor-batch.json`](text-to-3d-anchor-batch.json)

Accepted image-first intake: [`body-anchor-intake.json`](body-anchor-intake.json)

## Locked production order

1. Complete the eight adult ancestry/presentation base anchors.
2. Export, clean, retopologize, and normalize the accepted anchors to the canonical humanoid rig.
3. Build the shared C-tier starter underlayer, calling layers, armor pieces, and separate weapon packages.
4. Build the character-selection appearance library: four cross-ancestry facial-feature families, six or more skin tones, hair families, facial hair, scars, tattoos/paint, piercings, sideburns, and runtime-matched headshots.
5. Build Ilyra, Orren, Brannoc, the reusable conversation-face rig, the training construct, the Breachling family, and the Cinderbound Warden.
6. Revalidate animations, character creation, paper doll, dialogue, combat, defeat states, rooms, browser budgets, and the complete First Breach playthrough.

The eight anchors are ancestry/presentation topology and proportion sources, not class-locked characters. Slim, Athletic, and Heavy are versioned shape/conform profiles on each compatible topology and canonical skeleton. Calling identity comes from modular clothing, armor, weapons, hair, materials, and effects rather than a fused race/calling body model.

## Phase 1: base ancestry anchors

Current accepted visual-source intake is authoritative in [`body-anchor-intake.json`](body-anchor-intake.json): twelve single-image conversions covering all six Halfling presentation/body-profile combinations plus the masculine/feminine Heavy replacements for Human, Elf, and Dwarf. Their exact twelve source images and twelve untouched GLBs are preserved outside the shipping tree and are not automatically regenerated. The GLBs contain roughly 727k-767k vertices and 1.41M-1.49M triangles each with no skeleton or animations, so all are visual source sculpts awaiting retopology and the canonical rig gate. The verified account balance after this batch was 2,472 credits.

The tables below retain the earlier text-to-3D exploration and rejected correction history. They are not the current shipping candidates.

| Order | Asset ID | Anchor | Status | Paid task |
| --- | --- | --- | --- | --- |
| 1 | `SD-BODY-HUM-M-A-V1` | Human masculine athletic | generated; awaiting untouched export and rig intake | `ef7a7258`, 40 credits |
| 2 | `SD-BODY-HUM-F-A-V1` | Human feminine athletic | generated; awaiting owner review and intake | `1be0b879-e0a8-4cb1-8a08-aa0f5170ae39`, 40 credits |
| 3 | `SD-BODY-ELF-M-A-V1` | Elf masculine athletic | generated; awaiting owner review and intake | `21d5b749-dbbe-47ad-ad13-21868ce05d48`, 40 credits |
| 4 | `SD-BODY-ELF-F-A-V1` | Elf feminine athletic | generated; crossed-leg pose requires review | `8a5fb600-ee6a-45f4-9cbf-d042c2d0e4e5`, 40 credits |
| 5 | `SD-BODY-DWA-M-A-V1` | Dwarf masculine athletic | generated; awaiting owner review and intake | `01b358a6-4abe-4aeb-a6c3-c23b051c0fb0`, 40 credits |
| 6 | `SD-BODY-DWA-F-A-V1` | Dwarf feminine athletic | generated; awaiting owner review and intake | `4231eede-2381-442b-93ba-ecb17e402d80`, 40 credits |
| 7 | `SD-BODY-HAL-M-A-V1` | Halfling masculine athletic | generated; oversized/cartoon proportion risk | `767a48f7-0f42-4907-a110-83b6001c4b47`, 40 credits |
| 8 | `SD-BODY-HAL-F-A-V1` | Halfling feminine athletic | generated; awaiting owner review and intake | `3901733b-35fb-4db5-beb1-df8a67c5e631`, 40 credits |

The existing Human candidate establishes the first visual target but is not a shipping model. The seven remaining prompts deliberately use representative skin tones to test coverage; every accepted ancestry later supports the complete approved skin-tone palette.

The seven-anchor batch completed at 40 credits per task, spending 280 credits and leaving a 3,192-credit balance. Two correction passes then spent 240 credits and left a 2,952-credit balance. Including the original 40-credit Human text pilot, total recorded text-to-3D spend for the anchor program was 560 credits at that historical checkpoint. Image-to-3D tests had then spent 85 credits: 45 for the rejected multi-view comparison and 40 for the coherent single-pose Halfling exception. These balances are historical; the current verified balance is 2,472 credits. Every candidate remains non-shipping until owner visual review and intake gates pass.

### Correction pass

| Asset ID | Result | Paid task |
| --- | --- | --- |
| `SD-BODY-ELF-M-A-V2` | provisional keep; leaner silhouette and stable stance; awaiting owner review | `5661c814-089e-4fd1-b0b1-36b3cb3ee81d`, 40 credits |
| `SD-BODY-ELF-F-A-V2` | stable stance; ears remain oversized; awaiting owner review | `2eb6bf89-a86d-4e08-b4d1-d0795e4832e8`, 40 credits |
| `SD-BODY-HAL-M-A-V2` | rejected before rig intake; oversized head, hands, feet, and shoulders | `c1720aad-df83-448a-9a99-45738af0f6cc`, 40 credits |
| `SD-BODY-HAL-F-A-V2` | rejected before rig intake; silhouette reads as standard human | `037ecf8f-193e-42cb-a7e0-5e509c6ec652`, 40 credits |
| `SD-BODY-HAL-M-A-V3` | rejected before rig intake; clean anatomy but reads as short Human and drifted to T-pose | `f420ca56-0555-4870-adcc-15abbc3589aa`, 40 credits |
| `SD-BODY-HAL-F-A-V3` | rejected before rig intake; clean anatomy but reads as standard Human and drifted to T-pose | `3ac13ff3-daa6-4cc8-95b6-e579834a6980`, 40 credits |
| `SD-BODY-HAL-M-A-IMG-V1` | provisional keep; single-image exception produced one coherent ancestry-readable Halfling without multi-figure contamination | `d8897a78-33b5-4736-80c7-5af34146fb6e`, 40 credits |

The V2 and V3 outcomes establish a prompt-level tradeoff: forcing realistic adult proportions removes Halfling identity, while emphasizing Halfling identity exaggerates head, hand, and foot scale. Further paid rerolls are paused. Intake should preserve the most ancestry-readable V1/V2 source and correct proportions during controlled local cleanup before the shared rig gate.

## Phase 2: canonical rig and body-profile work

After all eight source anchors exist:

1. preserve untouched GLB/FBX downloads, task IDs, settings, credit receipts, and hashes;
2. reject duplicate bodies, fused limbs, unusable hand topology, broken backs, melted faces, or silhouette defects;
3. retopologize accepted sources to compatible deformation topology;
4. normalize meter scale, ground contact, orientation, bind pose, neck seam, material slots, and body coverage regions;
5. compare or retarget each body to the canonical humanoid skeleton;
6. create Slim, Athletic, and Heavy shape/conform profiles without changing gameplay statistics, hit boxes, calling eligibility, sockets, or animation IDs;
7. prove idle, walk, run, turn, target-facing, hit, stagger, death, terminal hold, punch, and kick before equipment expansion.

If the anchor topology cannot support one rig and the required body profiles economically, stop before spending credits on starter gear.

## Phase 3: starter character gear

All gear remains separate from the body:

- shared fitted C-tier starter clothing family;
- Warrior and Shadowknight longsword material variants;
- Mage practice staff;
- Priest wooden mace;
- Sharpshooter shortbow, string, arrows, and quiver;
- Paladin shortsword and wooden shield;
- Summoner binding rod;
- Asura ritual knife;
- Slayer paired daggers and sheaths;
- modular bracers, mantles, stoles, sashes, pouches, guards, quivers, shields, sheaths, and harnesses.

One approved ChatGPT image and one single-image conversion produce one isolated garment, armor piece, weapon, or accessory source. Bodies and equipment are never requested as one fused generation.

## Phase 4: character-selection appearance library

For every compatible body/head contract:

- four adult facial-feature families: African diaspora/Black, East Asian, South Asian/Indian, and European;
- at least six equally canonical skin-tone materials;
- at least six masculine-presenting and six feminine-presenting hairstyle families, cross-presented wherever fit QA passes;
- modular brows, facial hair, sideburns, scars, tattoos/paint, nose rings/studs, and earrings;
- ancestry-specific ears and physiology without class, morality, rarity, or power meaning;
- local headshots rendered from the exact runtime head, skin, hair, adornment, clothing, and equipment assembly.

Heads, hair, and adornments conform to the accepted body/head seam and expression landmarks. They do not create new unrelated skeletons.

Every facial-feature family is available across Human, Elf, Dwarf, and Halfling and across masculine/feminine presentation and Slim/Athletic/Heavy body profiles. Ancestry markers, skin tone, hair, adornments, body profile, calling, and statistics remain independent selections. The implementation uses respectful reusable head variants or deformation profiles with equal facial-animation coverage, never caricatures or duplicated full bodies.

## Phase 5: First Breach NPCs and creatures

The current level then receives original owner-reviewed ChatGPT image-first sources for:

- Wellkeeper Ilyra;
- Breach Scout Orren;
- Arena Warden Brannoc;
- training effigy/Sentinel;
- Breachling base;
- Breachling Stalker;
- Oathbound Breachling;
- Breachling Ravager;
- Cinderbound Warden.

Ilyra, Orren, and Brannoc use the same approved identity for world actor and animated dialogue close-up. Creature sources receive anatomy-appropriate rigs but share the gameplay action, targeting, grounding, hit, death, terminal-state, VFX, and SFX contracts.

The Breachling family is a single compact roughly four-foot hunched-predator anatomy and rig with separate owner-reviewed tier renders. The permanent posture has a forward-hinged spine, rounded predatory arch, shoulders ahead of a rear-set pelvis, low forward head, long near-ground forearms, and short bent digitigrade legs. Upright humanoid, Dragonkin, Dragonborn, heroic-biped, and player-body-with-monster-head reads are forbidden. The base is pale ash/grey; the Stalker is darker slate/smoke; the Oathbound is earth-brown/ochre; and the Ravager is cinder-red/rust. Tier defenses are grown keratin scutes, osteoderms, mineralized bone, or volcanic dermal plating emerging from the hide—never worn metal, leather, straps, buckles, or rivets. The huge broad hinged non-human maw has a deep cavity, layered teeth, visible tongue, and required `jaw-open`, `jaw-close`, and `snarl` controls.

The Cinderbound Warden is a distinct mechanical/golem boss family: articulated charred-basalt and oxidized-bronze plates around an ember core, faceless iron mask with a vertical sensor slit, left-palm soul-tax mechanism, and integrated right-forearm sweep blade. It must never read as a biological Breachling, armored human, knight, Paladin, or wielder of separate swords, and it uses a rigid mechanical hierarchy rather than humanoid skin deformation. Its model supplies a hollow furnace cage/core cavity and named `VFX_CoreFlame` socket; moving fire is a runtime effect.

Prism Multi-Image task `445fd16b-4006-4c18-a54a-fed2a63da955` is a preserved rejected result: 45 credits, balance 2,392 to 2,347, duplicate two-head/two-front construction, contradictory back, and no convincing live core flame. Do not delete it without exact owner confirmation and do not rerun until its replacement front, exact sides, and true rear pass the source gates.

Before any monster image is generated, its brief must define silhouette, anatomy/joint logic, locomotion, attack anatomy, jaw/facial controls, surface/material hierarchy, threat language, scale, palette, encounter role, rig controls, VFX/SFX sockets, tier/encounter variants, forbidden reads, and normal isometric-camera readability.

## Image-to-3D production workflow

Single-image assets use exactly one owner-reviewed, isolated ChatGPT source image on a plain background. Riggable humanoids use a front-facing full-body A- or T-pose with visible joints, clear limbs, and flat feet. Creatures use a neutral custom-rig stance that preserves their canonical posture and anatomy. Objects use a neutral unobstructed production orientation. Composite sheets, inset views, multiple figures, action poses, fused equipment sets, and a single image submitted to the multi-view model are prohibited.

For the owner-approved Breachling and Warden multi-view path, submit four separate identity-matched front/left/rear/right files. Left/right are exact 90-degree profiles, not three-quarter portraits. Rear proves rear skull/head shell, axial structure, rear pelvis, backs of limbs, and species-appropriate rear leg/foot anatomy while showing no face, chest/front core, palms, kneecaps/front shins, toe tops, or front weapon surface. Any contradiction rejects the source set before credits are spent.

## Batch and credit gates

- No paid task runs unless its complete canonical ChatGPT prompt/edit hashes, source-image hash, model, settings, and live cost are recorded and it falls inside the issue #448 authorization.
- Notify the owner when the account balance drops below 2,000 credits.
- Phase authorization includes required source conversions and tier renders, but does not imply approval for remesh, rigging, paid animation, runtime promotion, or another project phase.
- Stop the batch if the service reports a different total, a task duplicates, or the first result exposes a prompt-wide defect.
- Every result remains outside `public/assets` until source provenance, cleanup, rig, animation, performance, and owner visual review pass.
