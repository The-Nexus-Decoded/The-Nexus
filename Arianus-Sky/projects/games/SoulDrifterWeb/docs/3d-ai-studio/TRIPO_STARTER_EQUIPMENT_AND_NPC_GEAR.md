# Tripo Starter Equipment and First Breach NPC Gear

Issue: `The-Nexus #435`

Related production acceptance: `The-Nexus #448`

Generation date: 2026-08-29

## Locked art and asset contract

- Use stylized, hand-painted game art with matte simplified PBR, broad painterly color shapes, and topology-readable silhouettes. Do not use photographic product renders, heroic/endgame decoration, permanent armor, advanced runes, or glow.
- Keep bodies, clothing, armor, weapons, sheaths, harnesses, and props as separate assets.
- The starter clothing pilot targets the adult masculine Human foundation. The current pass does not create a feminine fit.
- Every First Breach NPC garment and identity prop is tagged `npc_gear`. NPC gear is assembled on the NPC actor but is not player loot and is not included in calling starter recipes.
- The one dagger source is duplicated at runtime for the paired set. Do not generate a second asymmetric dagger.
- The quiver is a separate back-carried asset and the arrow is a separate projectile/ammunition asset. The runtime quiver population may instance the approved arrow mesh.

## Player starter library

### Weapons and carry pieces

- plain iron longsword
- ashwood practice staff
- plain wooden mace
- rough shortbow
- separate arrow
- separate quiver
- plain iron shortsword
- battered wooden shield
- unadorned binding rod
- plain ritual knife
- one worn dagger duplicated at runtime
- longsword back scabbard and shoulder harness
- longsword hip scabbard
- shortsword hip scabbard
- mace belt hanger

The staff remains hand-carried. It does not receive a holster.

### Shared starter clothing

- faded Soul-Well robe/chest piece
- close-fitting cloth breeches
- plain cloth shoes
- cloth cap
- fitted leather jerkin
- fitted leather breeches
- leather boots
- leather cap
- cracked starter belt

The cloth family is the Mage and Priest foundation. The leather family is the Warrior, Sharpshooter, Paladin, Slayer, and other melee/field foundation. Calling presentation remains a runtime recipe rather than a fused model.

## First Breach NPC-only wardrobe

The live Level 1 content defines three named NPCs. The Sentinel is a construct, not a fourth NPC.

### Wellkeeper Ilyra

- dignified blue-gray caster hat
- layered blue-gray wellkeeper robe/chest garment
- fitted lower-body under-layer
- belt, pouch, and key-ring accessory
- ankle boots
- wellkeeper staff

### Breach Scout Orren

- forest-green scout cowl and shoulder mantle
- layered leather scout jerkin
- fitted dark scout breeches
- tall strapped scout boots
- cross-body satchel and belt kit
- map-board prop

### Arena Warden Brannoc

- quilted and leather arena-warden chest garment
- paired leather bracers
- fitted reinforced trousers
- heavy dwarf boots
- warden belt and pouch assembly
- blunt training baton/staff

## Fit strategy for body sizes

One universal clothing mesh must not be uniformly scaled across Human, Elf, Dwarf, and Halfling bodies. Uniform scaling changes garment thickness, joint clearance, hem length, and belt/weapon placement.

Use the Human masculine pilot as the master garment source, then produce body-profile conform derivatives:

1. Keep a shared canonical skeleton contract and stable garment names.
2. Conform soft garments to each approved body profile, transfer weights, and repair shoulder, hip, knee, and ankle loops.
3. Create separate fitted derivatives for materially different proportions such as Dwarf and Halfling. These derivatives may share materials and source provenance, but they are distinct runtime meshes.
4. Store body coverage masks with each garment so covered skin or underlayers can be hidden without poke-through.
5. Keep weapon geometry at the canonical world scale. Apply body-specific grip, sheath, and harness socket profiles instead of scaling a sword to the actor.
6. Validate every body-profile derivative in neutral A-pose and T-pose, locomotion, combat, draw/sheath, and damage/destruction states.

## Socket and animation handoff to issue #458

The serialized Blender/runtime pass owns:

- right/left hand grip sockets;
- left-hip longsword and shortsword sheath sockets;
- upper-back diagonal scabbard/harness socket;
- waist mace-hanger socket;
- quiver back socket and arrow draw path;
- sword draw, sheath, sword-and-shield, bow/quiver, staff, mace, rod, and knife clearance;
- clothing skinning, coverage masks, and NPC assembly;
- normal-speed gameplay-camera and close-up clipping proof.

This task must not launch Blender, start the DCC bridge, import/export meshes, rig assets, or author animations.

## 2026-08-29 paid batch receipt and recovery state

- Live pre-batch balance: 21,740 credits.
- Verified operation: Smart Mesh P2.0 Preview, Quad topology, 5,000 polygons, 65 credits per asset.
- Verified texture operation: 30 credits per asset.
- Approved maximum: 42 assets x 95 credits = 3,990 credits.
- Projected full-batch floor: 17,750 credits.
- Submitted Smart Mesh jobs: 22.
- Unsubmitted Smart Mesh jobs: 20.
- Texture jobs submitted: 0.
- Live balance after the 22 mesh charges: 20,310 credits.

The in-app Tripo model workspace then returned `500 Internal Server Error: Error creating WebGL context` even after all Tripo tabs were closed, the queue was allowed to drain, and one clean in-app tab was reopened. No provider API, external Chrome, Playwright process, Blender process, retry mesh, rig, animation, segmentation, or upscale was used. Resume only after the in-app browser's WebGL process is restarted; recheck the live balance and both displayed costs before the next charge.

The exact selected sources, SHA-256 hashes, model IDs, and remaining queue are recorded in `tripo-starter-equipment-ledger.json`. Untouched source images are preserved outside the shipping tree at:

`H:\CodexData\.codex\artifacts\435-tripo-modular-character-foundation\selected-sources`
