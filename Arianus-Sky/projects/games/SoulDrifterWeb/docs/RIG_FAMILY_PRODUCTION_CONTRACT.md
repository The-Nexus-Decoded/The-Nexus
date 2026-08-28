# SoulDrifter Rig Family Production Contract

Issue: `#448`  
Branch: `codex/448-souldrifter-first-breach-models`  
Locked by owner direction: 2026-08-20

This contract covers every currently preserved playable body source and every First Breach monster. It does not authorize new paid generation, cloud deletion, higher-level equipment, a new per-character animation pipeline, or promotion of an unverified rig.

## Core rule

A skeleton and its animation library are reusable. Skin weights are mesh-specific.

- Bind each distinct mesh topology once.
- Transfer weights only between meshes proven to share compatible topology and vertex correspondence.
- Add corrective weighting for extreme proportions instead of forcing one generic weight map onto heavy, dwarf, or halfling bodies.
- Keep hair, rigid armor, weapons, shields, quivers, and similar equipment modular. Attach them to versioned bones or sockets; do not rerig the body for an equipment change.
- Acquire or author each motion archetype once per compatible skeleton family, then bind the shared clip per actor at runtime.

## Rig families

### 1. Canonical humanoid

Target: the canonical 65-bone SoulDrifter runtime skeleton.

The currently preserved source inventory contains 12 distinct full-body meshes:

| Ancestry | Presentation | Profiles currently preserved |
|---|---|---|
| Human | Masculine | Heavy |
| Human | Feminine | Heavy |
| Elf | Masculine | Heavy |
| Elf | Feminine | Heavy |
| Dwarf | Masculine | Heavy |
| Dwarf | Feminine | Heavy |
| Halfling | Masculine | Slim, athletic, heavy |
| Halfling | Feminine | Slim, athletic, heavy |

The first bind proof is `body-human-masculine-heavy-v001`. It goes through Mixamo once, then through a fresh local skeleton, skin, and deformation audit. The returned result is not a shipping asset until shoulders, armpits, elbows, wrists, fingers, hips, groin, knees, and ankles pass close and normal-speed review.

Corrective weighting requirements:

- Heavy: preserve shoulder and upper-arm volume, arm/torso clearance, abdomen/hip folding, and thigh/groin separation.
- Dwarf: preserve broad-shoulder twist, short-limb elbow planes, and compressed hip-to-knee motion.
- Halfling: use a documented short-limb retarget profile and verify knee, ankle, hand, and foot scale.
- Any topology-compatible derivative may inherit transferred weights, but it still requires deformation proof.

### 2. Breachling family

Target: `breachling-family-rig-v1`, shared by Breachling, Stalker, Oathbound, and Ravager.

Required hierarchy and controls:

- permanently low, forward-hinged spine and rear-set pelvis;
- long weight-bearing arms and four-finger hands;
- short digitigrade legs with explicit knee/hock/ankle planes;
- jaw open, jaw close, and snarl controls;
- one versioned tail chain rooted continuously at the sacrum;
- optional tier-specific secondary chains only when they do not change the shared primary bone map.

The base and Stalker already have preserved 3D sources. Oathbound and Ravager currently have complete four-view sources and must become local topology-compatible variants without new provider spend. All four share one locomotion, turn, telegraph, attack, hit, stagger, death, and terminal-hold library.

### 3. Cinderbound Warden

Target: `warden-rigid-rig-v1`.

Reuse the existing 17-bone rigid LOD0 proof. Connected plates receive rigid component assignments; stone and metal must not bend like flesh. The production hierarchy must cover weighted piston locomotion, shoulder rings, opening rib plates, the left soul-tax palm, the integrated right claw-blade, and chest-core shutdown. Eye glow and core flame remain material/VFX semantics rather than soft geometry deformation.

### 4. Training Effigy Sentinel

Target: `sentinel-rigid-rig-v1`.

Use a simple rigid hinge hierarchy. A reduced Warden hierarchy may be reused only if component segmentation, pivots, and hinge axes pass. Otherwise the Sentinel receives its own smaller rigid skeleton; it does not inherit biological humanoid weights.

## Shared validation gate

No rig is promoted until it passes:

1. skeleton and bone-map validation;
2. fresh-import skin and weight validation;
3. close deformation or rigid-component review;
4. normal-speed locomotion, combat, hit, and defeat review;
5. root, floor, foot-contact, and logical-tile checks;
6. attachment and clipping checks for hair, starter clothing, armor, and weapons;
7. gameplay-camera and smallest-viewport readability;
8. tests, typecheck, production build, and browser smoke.

## Complete character-creation delivery

Rigging is the dependency gate for the complete modular character creator, not the end of the work. The shipping selector must resolve the same stable asset IDs in character creation, gameplay, paper doll, saves, and local headshot rendering.

Required independent selections:

- ancestry: Human, Elf, Dwarf, or Halfling;
- presentation: masculine or feminine without locking compatible hair or adornments;
- body profile: Slim, Athletic, or Heavy on a compatible ancestry/presentation body;
- facial-feature family: African diaspora/Black, East Asian, South Asian/Indian, or European, each with identical expression coverage and no mechanical or moral meaning;
- skin tone: at least deep, dark, medium-deep, medium, tan/olive, and light/pale material families;
- hairstyle: all 12 preserved source meshes, plus meshless shaved/bald when the scalp passes, offered cross-presentation wherever fit QA passes;
- hair color: 11 reusable natural material presets from black and browns through red, blonde, grey, and silver-white, independent from hairstyle geometry;
- modular brows, facial hair, sideburns, scars, tattoos/paint, nose rings/studs, and earrings;
- the shared worn C-tier clothing family and one mundane Level 1 weapon assembly per calling.

The canonical Human head establishes `head-seam-v1`, face deformation landmarks, the hair-cap boundary, ear/nose/facial-hair sockets, and the reusable facial rig. The four facial-feature families are local conform or deformation profiles on that compatible topology, not four new skeletons or duplicated full bodies. Human, Elf, Dwarf, and Halfling ancestry markers remain independent layers. Ilyra, Orren, and Brannoc use the same facial-control and head-seam contract so NPC dialogue does not become a separate rigging system.

Hair color is a runtime material parameter. It must never multiply the 12 hairstyle meshes into color-specific geometry files. Helmets either hide hair or select an authored tucked variant, and every style must pass scalp coverage, ear clearance, shoulder/collar motion, weapon clearance, and smallest-viewport review.

## Execution order

1. Human masculine heavy Mixamo bind and local deformation proof.
2. Canonical humanoid mapping and corrective-weight templates.
3. Remaining 11 preserved body-source binds or verified topology transfers.
4. Breachling-family base rig, then Stalker/Oathbound/Ravager variants.
5. Warden pilot integration and full mechanism controls.
6. Sentinel reduced-hierarchy decision and rigid bind.
7. Canonical head seam, four face families, skin materials, hair/adornment fitting, and the complete appearance data model/UI.
8. Shared starter clothing/weapon assemblies, animation-pack/runtime integration, and full evidence package.
