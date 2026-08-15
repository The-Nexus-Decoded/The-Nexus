# SoulDrifter Technical-Art Vertical Slice

Status: active production gate for the first playable proof.

This document prevents the browser prototype from drifting back to placeholder-quality rooms or generic characters. The vertical slice is intentionally limited to one authored tutorial room and one complete race/class character until the visual and gameplay gates below pass.

## Locked proof target

- Character: low-level Elf Shadowknight.
- Location: the cyan Soulwell tutorial/training chamber from `public/assets/generated/first-breach-environment-v1.png`.
- Character reference: `public/assets/generated/characters/elf-shadowknight.png`.
- Guide reference: `public/assets/generated/npcs/ilyra.png`.
- Camera: elevated three-quarter RPG camera with Ultima VII/Ultima Online readability, implemented as original SoulDrifter art.
- Gear state: faded common tunic and pants, cracked leather belt/boots, basic dull-iron longsword, no visible armor pieces, no high-level magic equipment.
- Magic state: mortal Fire-Realm necromancy and restrained life-drain only. Aether-Scribed/Flesh-Forged runes are unavailable at levels 1-19.
- Expansion rule: rooms two and three are not visually expanded until this proof is approved.

## Automatic rejection conditions

The proof fails without further scoring if any of these are visible in the active gameplay capture:

- A flat repeated tile plane or stretched boxes dominate the chamber.
- The hero is a generic cartoon, big-headed, stick-figure, capsule, or mannequin character.
- The hero floats, foot-slides badly, lacks grounded shadows, or passes visibly through obstructions.
- The room reads as one small empty box instead of a layered Soulwell training hall.
- The starter uses body runes, weapon runes, or Sartan/Patryn-equivalent spell language.
- The action bar is mostly text or generic dashboard UI instead of illustrated game actions.
- Fog of war, occlusion handling, collision, or navigable routes are missing.
- A screenshot is presented as final without an active gameplay capture and renderer diagnostics.

## First-room experience contract

1. The Elf Shadowknight awakens beside the Soulwell.
2. Ilyra identifies the character's race-specific condition and immediate purpose.
3. The player learns grounded movement, camera readability, interaction, the illustrated action bar, and both combat modes.
4. A training target demonstrates basic strike, Siphon Cleave, Cinder Guard, hit reaction, health, mana, cooldown, and resource feedback.
5. The Wayfarer's Coffer supplies worn starter equipment and mortal recovery items.
6. The exit unlocks only after the movement, interaction, and combat tutorial checkpoints are complete.

## Technical-art brief

### Shape language

- Primary: the circular Soulwell dais, broken concentric rings, radial stairs, and tall arched stone structure.
- Secondary: carved buttresses, bookcases, worktables, iron gates, training fixtures, drainage channels, and uneven wall bays.
- Tertiary: chipped edges, rubble, moss, chains, books, cloth, jars, tools, ash, and small floor-height variation.
- Traversal: broad readable lanes around the well, clear training space, visible coffer approach, and an unmistakable exit route.

### Material roles

- `soul-stone`: blue-gray ancient stone with cyan reflected light, rough chipped edges, and restrained dampness.
- `grave-iron`: dark worn metal with localized rust and edge wear.
- `old-timber`: desaturated brown shelving, tables, and coffer structure.
- `pilgrim-cloth`: faded blue-gray cloth for Ilyra and tutorial markers.
- `starter-leather`: cracked brown belt, boots, and weapon grip shared by Soul-Well starter outfits; no enchanted seams.
- `soulwater`: cyan depth, soft caustic motion, and readable boundary; it must not look like a flat neon disk.
- `moss-and-ash`: low-saturation surface breakup used to age the room without hiding navigation.

### Lighting and atmosphere

- Cool Soulwell light is the focal key; warm braziers provide localized contrast and route rhythm.
- One dominant shadow-casting light plus bounded accent lights for the desktop proof.
- Fog of war conceals unvisited space; atmospheric fog adds depth but never hides interactables or threats.
- Contact shadows and grounded ambient occlusion must visibly attach characters and props to the floor.
- Bloom is reserved for Soulwell energy and brief ability accents, not every emissive surface.

### VFX language

- Basic strike: weapon arc, contact spark, hit reaction, short camera/impact response.
- Siphon Cleave: narrow ember-red slash followed by a brief inward life-drain stream; no rune circle.
- Cinder Guard: restrained ash/ember shell close to the body; no written glyphs or body sigils.
- Damage and recovery: readable numbers/icons plus a short world-space response; effects cannot hide silhouettes.
- Soulwell: slow environmental energy movement distinct from player spell effects.

## Elf Shadowknight asset and animation acceptance

The imported character must retain the approved adult proportions, long silver hair, pointed ears, pale/ashen face, faded common tunic, plain pants, worn belt and boots, basic battered longsword, and unmistakable low-level silhouette. It must have no visible armor pieces, equipment runes, relic glow, or advanced class regalia.

Required animation states:

| State | Acceptance requirement |
| --- | --- |
| Idle | Breathing and subtle weight shift; feet remain planted. |
| Walk | Eight-direction-compatible locomotion with synchronized feet and grounded speed. |
| Run | Faster authored gait with no visible sliding or hovering. |
| Turn | Direction changes blend cleanly and do not spin the model in place unnaturally. |
| Basic strike | Anticipation, longsword contact frame, follow-through, and recovery. |
| Siphon Cleave | Distinct heavier cleave timed to the low-level drain VFX. |
| Cinder Guard | Short defensive cast/brace that does not use advanced runes. |
| Cast | Restrained low-level necromancy/ember gesture. |
| Hit | Directionally readable reaction without losing collision grounding. |
| Death | Complete fall and settled final pose; no sinking through the floor. |
| Victory | Brief and character-appropriate, not a modern/cartoon celebration. |

Animation transitions use crossfades and a clear state priority: death > hit > ability/attack > locomotion > idle. Horizontal root motion is normalized in the runtime while useful vertical motion is retained.

### Motion-capture and retargeting direction

Every animation source, retarget, authored skill pass, runtime integration, visual review, and shipping decision must follow [`ANIMATION_PRODUCTION_PIPELINE.md`](ANIMATION_PRODUCTION_PIPELINE.md). That document is the binding gate for weapons, spells, summons, buffs, recoveries, class skills, race/body retargets, player characters, classed NPCs/enemies, monsters, bosses, and future PvP telegraphs.

Before any weapon pose or motion is authored, its exact weapon subtype, grip, progression tier, stance, force path, and recovery must also be researched and logged through [`WEAPON_MOTION_REFERENCE_INDEX.md`](WEAPON_MOTION_REFERENCE_INDEX.md). The chosen reference must match the skill; an available dramatic mocap clip cannot redefine a beginner action.

- Use Adobe Mixamo as the fast prototype library for humanoid idle, walk, run, turns, hit reactions, and common weapon foundations. Its clips are retargeted onto the SoulDrifter 65-bone deformation rig; Mixamo characters do not replace our custom models.
- Keep Siphon Cleave, Cinder Guard, rune application, spell channels, boss tells, and other class-signature choreography project-authored. A generic mocap slash may supply body mechanics, but timing, hand contacts, weapon path, silhouette, and VFX synchronization are edited for the class.
- Evaluate ActorCore and Rokoko libraries later for higher-fidelity locomotion and combat capture only after a per-pack license and redistribution review.
- Every imported clip must pass foot-lock, ground contact, root-motion, weapon-contact, loop, transition, and gameplay-camera checks. Raw mocap is source material, not a shippable final animation.

## Asset sourcing ledger

| Asset | Source | License/status | Use decision |
| --- | --- | --- | --- |
| First Breach environment concept | SoulDrifter generated concept | Project-owned working asset | Locked visual target. |
| Elf Shadowknight concept | SoulDrifter generated concept | Project-owned working asset | Locked silhouette/material target. |
| Ilyra concept | SoulDrifter generated concept | Project-owned working asset | Locked NPC target. |
| Universal Base Characters | Quaternius official pack | CC0 | Preferred adult-proportion humanoid base, subject to intake validation. |
| Modular Character Outfits - Fantasy | Quaternius official pack | CC0 | Candidate modular starter clothing/armor source, reworked to match the concept. |
| Elf Shadowknight GLB | Original SoulDrifter build over Quaternius Ranger deformation rig/underlayer | Project-authored additions; Quaternius source CC0 | Integrated first playable hero: 23,866 triangles, 65 bones, 11 in-place clips, common starter clothing, basic longsword, and no rune content. Validation report ships beside the GLB. |
| Universal Animation Library 1/2 | Quaternius official packs | CC0 | Candidate locomotion/combat library, retargeted and curated per state. |
| Adobe Mixamo animation library | Adobe Mixamo | Royalty-free game use under the current Mixamo FAQ; biped humanoids only | Preferred rapid prototype source for natural locomotion, turns, impacts, and common weapon foundations; always retargeted to custom SoulDrifter characters. |
| Current Ultimate Animated Character models | Quaternius CC0 | Legal but visually rejected | May remain only as hidden engineering fixtures; never used for approval captures. |
| First-room flagstone PBR (`Tiles083`, 1K JPG) | ambientCG | CC0 1.0 | Shipped color, OpenGL normal, roughness, and AO maps for the authored chamber floor. |
| First-room masonry PBR (`Bricks102`, 1K JPG) | ambientCG | CC0 1.0 | Shipped color, OpenGL normal, roughness, and AO maps for chamber walls, arches, and well stone. |
| Exult/Ultima/UO assets | Third-party copyrighted game data | Not approved for redistribution | Reference behavior only; do not ship copied art, maps, audio, or proprietary data. |
| Original procedural room kit | SoulDrifter implementation | Project-owned | Reusable authored architecture, collision proxies, set dressing, and fog volumes. |

External generation probes on this workstation currently report `TRIPO_API_KEY=MISSING` and `GEMINI_API_KEY=MISSING`. No generated 3D task may be claimed unless its task ID, downloaded source, license, and intake diagnostics are recorded here.

## Imported-asset intake gate

Every hero/environment import records:

- source URL and license;
- local path and file size;
- meter scale, orientation, pivot, and world bounds;
- mesh, triangle, material, texture, and animation-clip counts;
- texture dimensions and color-space/PBR behavior;
- animation names, durations, track counts, foot/root behavior, and crossfade test;
- visual mesh separated from simple collision proxy;
- desktop/mobile memory and renderer impact.

## Render budgets for this proof

Desktop starting ceiling:

- 300 draw calls;
- 750,000 visible triangles;
- 300 geometries;
- 60 textures;
- no more than two shadow-casting lights;
- 2048 maximum shadow map;
- device-pixel ratio capped at 2;
- no more than two post-processing passes.

Mobile starting ceiling:

- 150 draw calls;
- 300,000 visible triangles;
- 200 geometries;
- 40 textures;
- one shadow-casting light;
- 1024 maximum shadow map;
- device-pixel ratio capped between 1.5 and 2;
- no more than one post-processing pass.

Repeated stone modules, debris, books, chains, and similar same-material geometry should use instancing or merged static batches where it improves the measured result. Collision uses simple proxies, never full visual meshes.

## Visual approval scorecard

The active desktop and mobile captures are scored from 0-3 in:

1. art direction;
2. hero/player;
3. obstacle/enemy readability;
4. rewards/interactables;
5. world/environment;
6. materials/textures;
7. lighting/render;
8. VFX/motion;
9. UI/HUD;
10. performance evidence.

Approval requires every category at 2 or higher, an average of at least 2.3, no automatic rejection condition, no page/console error, and a successful active playthrough of the room in both combat modes. The current blank-tile/generic-character build is a rejected engineering baseline, not a candidate for scoring as complete.

## Delivery evidence

Before asking for approval, attach:

- active desktop gameplay screenshot;
- active mobile gameplay screenshot;
- short movement/basic-strike/Siphon-Cleave/Cinder-Guard capture;
- renderer calls, triangles, geometries, textures, and material count;
- imported hero bounds and animation diagnostics;
- build, unit-test, browser-console, collision, fog-of-war, and first-room playthrough results;
- completed before/after visual scorecard with remaining limitations stated plainly.

## Current first-room proof (2026-08-08)

- Active desktop viewport: 1280×720 page, 862×564 WebGL canvas, no horizontal overflow, full action bar visible.
- Renderer: 295 calls, 371,044 triangles, 98 geometries, 32 textures at device-pixel ratio 1.
- Hero: validated original Elf Shadowknight GLB at 1.875 m source height and 2.16 m isometric readability scale; collision remains one logical tile and the round-trip asset stays grounded within 1 cm.
- Animation smoke: Idle, Walk, SiphonCleave, and CinderGuard played through the live runtime; dry Siphon preserved Stability/Gravefire, while Cinder Guard spent exactly 8 Stability.
- Resource recovery: after the configured delay, Stable Realm Pressure restored the finite Stability pool one point at a time.
- Tutorial smoke: Ilyra displayed Elf- and Shadowknight-specific lore, the selected dialogue advanced the objective, and the Wayfarer's Coffer granted only worn starter items.
- Environment: ambientCG `Tiles083` and `Bricks102` 1K CC0 PBR channels are active; static books, debris, lamps, chains, and tables are merged/instanced to remain within the draw-call ceiling.
- Latest proof image: `docs/screenshots/first-room-elf-shadowknight-2026-08-08.png`.

Remaining limitations before a final animation lock: a dedicated turn clip, final foot-slide tuning, higher-fidelity Ilyra geometry, visible training-target combat proof, and a mobile capture/performance pass. The [Three.js Resources tools directory](https://threejsresources.com/tools) is the research index; every selected production asset or tool still requires its own primary-source license record.
