# NPC System

## Authoritative actor rule

NPCs are full game actors, not dialogue props with bespoke shortcuts. They use the same command, skill, equipment, status-effect, animation-event, inventory, and targeting boundaries as player characters.

Every NPC action must be represented by a registered skill or command, including:

- weapon and unarmed attacks;
- spells, healing, summons, and channels;
- buffs, debuffs, cleanses, wards, and reactions;
- class-resource actions and recovery;
- actor-created weather, hazards, terrain effects, and realm-pressure changes;
- movement, interactions, dialogue actions, and item use.

AI chooses among those commands. It may not apply damage, healing, control, or weather through an invisible NPC-only shortcut. The same validator resolves range, line of sight, resource cost, cooldown, equipment requirement, target legality, telegraph, contact event, and result.

## Skill ownership and control

An NPC's available command set is assembled from its ancestry, class, level, role, equipment, learned skills, temporary statuses, story state, and rank. Elite and boss NPCs may have secondary or phase-specific abilities that are hidden from normal inspection, but those abilities still exist in the authoritative skill registry.

Charm, possession, domination, recruitment, or similar control effects expose the legal controllable subset of the NPC's real command set. Control does not replace the NPC's abilities with generic player skills. Restrictions such as intelligence, loyalty, phase locks, story protection, or unmanageable boss powers must be explicit data and produce a readable reason.

## Real equipment and appearance

Anything that reads as equipment on an NPC must be a real item instance in that NPC's equipped inventory:

- clothing and robes;
- armor and helmets;
- weapons, shields, focuses, and ammunition containers;
- tools, jewelry, packs, and visible carried objects.

The visible mesh is mounted from the equipped item definition. Painted-on gear, permanent placeholder weapons, and decorative meshes that imply an item the NPC does not own are prohibited. Cosmetic shape variants may exist, but they must reference the real underlying item instance.

On defeat or transfer, loot rules resolve each item explicitly as transferable, damaged, broken, bound, quest-protected, or destroyed. A visible item may not silently cease to exist merely because the NPC died.

## Model policy

Named NPCs use their reviewed canonical race, body, head, hair, clothing, and role assembly. A temporary third-party or Mixamo character is permitted only when no canonical model exists, the source and license are recorded, the runtime asset passes local audit, and a replacement ticket is linked. A generic placeholder must never overwrite an existing canonical named-NPC model.

Current First Breach state and blockers:

- Wellkeeper Ilyra has the correct reviewed older-human/Wellkeeper source identity, but the runtime uses a static retopology compromise pending the tracked textured-rig merge. It is not final animation acceptance.
- Breach Scout Orren is on the shared 65-bone elf rig, but the current spatial color segmentation and primitive role layers do not satisfy the reviewed clothed scout reference. It is a technical deformation placeholder, not an accepted character model.
- Arena Warden Brannoc is on the shared 65-bone dwarf rig, but the current spatial color segmentation and single primitive apron do not satisfy the reviewed clothed dwarf reference. It is a technical deformation placeholder, not an accepted character model.
- Runtime emissive/tint treatment must never recolor named-NPC skin or clothing as a skill effect. Authored materials remain authoritative unless an actual status skill applies a temporary, scoped visual layer.

Until rebuilt canonical assemblies pass the acceptance gate, an audited Mixamo character may be used as an explicitly labeled visual placeholder when it reads closer to the role. The placeholder may not be described as the canonical NPC, and the reviewed identity source remains the replacement target.

## Acceptance gates

An NPC is not complete until automated and visual tests confirm its correct model identity, equipped-item presentation, neutral/idle pose, locomotion where applicable, every combat command it can choose, hit/death behavior, loot resolution, dialogue interaction, and gameplay-camera silhouette.
