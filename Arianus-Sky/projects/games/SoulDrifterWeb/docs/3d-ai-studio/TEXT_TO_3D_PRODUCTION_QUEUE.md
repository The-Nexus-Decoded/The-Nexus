# SoulDrifter Text-to-3D Production Queue

Status: active under [The-Nexus #448](https://github.com/The-Nexus-Decoded/The-Nexus/issues/448)

Default operation: 3D AI Studio text-to-3D

Approved starting preset: Prism 3.1 with Ultra texture quality, subject to a fresh live-price check and provenance record before every paid submission

Authorization: all text-to-3D models required by issue #448 are approved for generation. Notify the owner if the account balance drops below 1,000 credits. Image-to-3D and other paid processing remain outside this authorization.

Machine-readable anchor batch: [`text-to-3d-anchor-batch.json`](text-to-3d-anchor-batch.json)

## Locked production order

1. Complete the eight adult ancestry/presentation base anchors.
2. Export, clean, retopologize, and normalize the accepted anchors to the canonical humanoid rig.
3. Build the shared C-tier starter underlayer, calling layers, armor pieces, and separate weapon packages.
4. Build the character-selection appearance library: three facial structures, six or more skin tones, hair families, facial hair, scars, tattoos/paint, piercings, sideburns, and runtime-matched headshots.
5. Build Ilyra, Orren, Brannoc, the reusable conversation-face rig, the training construct, the Breachling family, and the Cinderbound Warden.
6. Revalidate animations, character creation, paper doll, dialogue, combat, defeat states, rooms, browser budgets, and the complete First Breach playthrough.

The eight anchors are ancestry/presentation topology and proportion sources, not class-locked characters. Slim, Athletic, and Heavy are versioned shape/conform profiles on each compatible topology and canonical skeleton. Calling identity comes from modular clothing, armor, weapons, hair, materials, and effects rather than a fused race/calling body model.

## Phase 1: base ancestry anchors

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

The seven-anchor batch completed at 40 credits per task, spending 280 credits and leaving a 3,192-credit balance. Every candidate remains non-shipping until owner visual review and intake gates pass.

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

One text-to-3D prompt generates one isolated garment, armor piece, weapon, or accessory source. Bodies and equipment are never requested as one fused generation.

## Phase 4: character-selection appearance library

For every compatible body/head contract:

- three adult face structures: soft/round, angular/high-cheek, and broad/strong;
- at least six equally canonical skin-tone materials;
- at least six masculine-presenting and six feminine-presenting hairstyle families, cross-presented wherever fit QA passes;
- modular brows, facial hair, sideburns, scars, tattoos/paint, nose rings/studs, and earrings;
- ancestry-specific ears and physiology without class, morality, rarity, or power meaning;
- local headshots rendered from the exact runtime head, skin, hair, adornment, clothing, and equipment assembly.

Heads, hair, and adornments conform to the accepted body/head seam and expression landmarks. They do not create new unrelated skeletons.

## Phase 5: First Breach NPCs and creatures

The current level then receives original text-to-3D sources for:

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

## Image-to-3D exception

Image-to-3D is not part of the normal queue. It is opened only when the owner selects a specific pre-existing visual design that should be reproduced in SoulDrifter. The request needs its own credit approval and four clean, isolated, identity-matched front/left/back/right files. Composite sheets and automatic fallback from a failed text prompt are prohibited.

## Batch and credit gates

- No paid task runs unless its exact prompt, model, settings, and live cost are recorded and it falls inside the issue #448 text-to-3D authorization.
- Notify the owner when the account balance drops below 1,000 credits.
- Batch generation does not imply approval for remesh, rigging, variants, animation, or another batch.
- Stop the batch if the service reports a different total, a task duplicates, or the first result exposes a prompt-wide defect.
- Every result remains outside `public/assets` until source provenance, cleanup, rig, animation, performance, and owner visual review pass.
