r",
      "defensive": "Hold the Breach"
    },
    "summoner": {
      "signature": "Call Lesser Wisp",
      "defensive": "Binding Circle"
    },
    "asura": {
      "signature": "Mind Prick",
      "defensive": "Black Thread"
    },
    "slayer": {
      "signature": "Backstab",
      "defensive": "Shadowstep"
    },
    "shadowknight": {
      "signature": "Siphon Cleave",
      "defensive": "Cinder Guard"
    }
  },
  "rule": "These are mandatory current animation/VFX contracts. A third starter active ability requires explicit owner-approved source, not silent invention."
}
```

---

## `source/config/current-phase-scope.json`

SHA-256: `033914e67499e10d3460b90db60567998ab7b9b3bded066ef87f692ae86309a6`

```json
{
  "schemaVersion": 1,
  "currentProductionPhase": "first_breach_heartvale_level_1_9",
  "allowedDesignDomains": [
    "mortal_weapon_combat",
    "basic_class_magic",
    "low_tier_healing_and_wards",
    "basic_shaping_and_summoning",
    "limited_class_appropriate_necromancy",
    "movement_and_traversal",
    "world_interactions",
    "grounded_creature_behaviors",
    "hit_reactions_and_deaths",
    "environmental_tactics"
  ],
  "deferredUntilLater": [
    "sartan_high_magic",
    "patryn_high_magic",
    "aether_scribed_runes",
    "flesh_forged_runes",
    "probability_magic",
    "possibility_weaving",
    "labyrinth_combat_systems",
    "nexus_endgame_systems",
    "ancient_power_boss_magic",
    "realm_breaking_effects"
  ],
  "rule": "Current agents must not borrow or downscale deferred systems into Level 1–9 content unless the owner explicitly approves it."
}
```

---

## `source/config/hard-trial-skill-matrix.json`

SHA-256: `e5bac3ab17e6dab6ab071925e9d1d5a8b4ca2a32e6eef159847dfdd15fda5d39`

```json
{
  "schemaVersion": 1,
  "source": "src/game/tutorialChoices.ts hardTrialSkillName()",
  "skills": {
    "warrior": "Breach Reversal",
    "mage": "Fracture Spark",
    "priest": "Last-Light Reprieve",
    "sharpshooter": "Realm-Piercing Shot",
    "paladin": "Oath of the First Lock",
    "summoner": "Echoed Companion",
    "asura": "Black Resonance",
    "slayer": "Sundering Execution",
    "shadowknight": "Gravefire Riposte"
  },
  "gate": "Only animate/implement when actually granted/active in gameplay. Preserve as future animation demand otherwise."
}
```

---

## `source/config/owner-directed-skill-updates.json`

SHA-256: `cf5ab1d317f6b56d0341eb7a7cf33fdedd836a069e7d0fae998658783313a7ea`

```json
{
  "schemaVersion": 1,
  "slayer": {
    "starterActive1": {
      "name": "Backstab",
      "classification": "PRESERVED_LIFEPAPER_AND_CURRENT_CANON"
    },
    "starterActive2": {
      "name": "Shadowstep",
      "classification": "CURRENT_CANON"
    },
    "starterActive3": {
      "name": "Feinting Cut",
      "classification": "ORIGINAL_PROPOSAL",
      "status": "PENDING_SOURCE_RESEARCH_AND_OWNER_APPROVAL",
      "constraints": [
        "mortal dagger technique",
        "no poison/venom at starter tier",
        "no high-level magical assassination",
        "should create or exploit an opening"
      ]
    },
    "laterThemes": [
      "poison",
      "flank",
      "silence",
      "pursuit",
      "wounded-target execution"
    ]
  },
  "summoner": {
    "currentCodeSignature": "Call Lesser Wisp",
    "ownerDirectedReplacement": "Conjure Lesser Driftling",
    "replacementStatus": "OWNER_DIRECTION_PENDING_CODE_MIGRATION",
    "progressionFamily": [
      "Lesser Driftling",
      "Minor Driftling",
      "Major Driftling"
    ],
    "advancedSpecializationSpace": [
      "Elemental Summoning",
      "Necromantic Summoning",
      "Beast Summoning"
    ],
    "rule": "Driftling is magical shaping and does not consume any advanced specialization identity."
  }
}
```

---

## `source/config/ticket-routing.json`

SHA-256: `a6e50f365fe796db4b20c806abcc18b0a42b78efe1b31277bc91e190661fc5d9`

```json
{
  "schemaVersion": 1,
  "routes": {
    "448": [
      "requirement-compiler",
      "character-rigging-worker",
      "animation-combat-worker",
      "threejs-runtime-integrator",
      "independent-verifier",
      "performance-real-gpu-verifier"
    ],
    "451": [
      "requirement-compiler",
      "level-world-builder",
      "houdini-automation-worker",
      "threejs-runtime-integrator",
      "independent-verifier",
      "performance-real-gpu-verifier"
    ],
    "452": [
      "requirement-compiler",
      "level-world-builder",
      "houdini-automation-worker",
      "threejs-runtime-integrator",
      "independent-verifier"
    ],
    "453": [
      "requirement-compiler",
      "vfx-material-worker",
      "threejs-runtime-integrator",
      "independent-verifier",
      "performance-real-gpu-verifier"
    ],
    "454": [
      "requirement-compiler",
      "vfx-material-worker",
      "level-world-builder",
      "threejs-runtime-integrator",
      "independent-verifier"
    ],
    "455": [
      "requirement-compiler",
      "level-world-builder",
      "houdini-automation-worker",
      "threejs-runtime-integrator",
      "independent-verifier"
    ],
    "456": [
      "requirement-compiler",
      "gameplay-ai-worker",
      "animation-combat-worker",
      "threejs-runtime-integrator",
      "independent-verifier"
    ],
    "457": [
      "requirement-compiler",
      "character-rigging-worker",
      "animation-combat-worker",
      "threejs-runtime-integrator",
      "independent-verifier"
    ],
    "458": [
      "requirement-compiler",
      "character-rigging-worker",
      "animation-combat-worker",
      "vfx-material-worker",
      "threejs-runtime-integrator",
      "independent-verifier"
    ],
    "459": [
      "requirement-compiler",
      "gameplay-ai-worker",
      "character-rigging-worker",
      "animation-combat-worker",
      "threejs-runtime-integrator",
      "independent-verifier"
    ]
  }
}
```

---

## `source/docs/01_MASTER_PLAYBOOK.md`

SHA-256: `d27ab56d1ae75864fa7d5ab7cf8796aac8285eaeed0ac270e21649a7951e361f`

```markdown
# 01 — Master Playbook

## Objective

Rebuild the SoulDrifter playable-character, NPC, monster, combat-animation, and spell-VFX pipelines
around a modular, verifiable production system.

## Primary content domains

1. Base bodies
2. Faces / skin-appearance families
3. Hair
4. Accessories
5. Modular gear
6. Weapons / off-hands
7. NPC-specific outfit generation + segmentation
8. Monster regeneration / comparison
9. Animation library
10. Spell / combat VFX
11. Hit reactions / death variants
12. Talking NPC portrait heads

## Character modularity contract

### Playable characters

Playable actors are assembled from reusable libraries:

`Base body + head/face + hair + accessories + gear kit + weapon/off-hand + animation set + VFX set`

### NPCs

NPCs may be:
- assembled from modular pieces, or
- generated as full clothed characters and segmented

### Monsters

Monsters follow:
`concept / source -> generate or preserve -> segment -> retopo -> rig -> animate -> compare -> runtime verify`

## Playable base-body library

### Races
- Human
- Elf
- Dwarf
- Halfling (if still active in this pipeline; can be staged later if needed)

### Presentation / appearance families
The user requested appearance diversity families described as:
- Black
- White
- Asian
- Indian

These should be treated as **appearance / facial-feature families**, not as new races.
They apply to playable character customization where culturally appropriate.

### Body profiles
- Slim
- Athletic
- Heavyset

**Heavyset** means:
- broader frame
- thicker limbs
- larger bones / more imposing silhouette
- not obese
- no oversized gut
- not a comic “fat” body

## Face / head library

For each playable race / presentation family:
- 4–5 facial feature presets
- neutral expression basis
- compatible with dialogue head system
- animation-ready face rig target if supported
- brow / beard / facial-hair compatibility where appropriate

## Hair library

Target:
- 10 masculine hairstyles
- 10 feminine hairstyles

Hair should be:
- separate
- reusable
- tintable if needed
- clipped / verified against starter gear

## Accessories library

Target optional attachables:
- earrings
- facial tattoos
- body tattoos / markings
- scar variants
- facial hair sets
- maybe simple piercings later

Accessories should be separate if feasible.

## Equipment policy

### Playable characters
Do **not** generate fused class bodies.

Instead:
- generate naked / underwear base bodies
- generate gear separately
- assemble in engine

### NPCs
Segmentation is allowed and useful.
If a generated full-outfit NPC yields excellent clothing pieces, those pieces may become:
- NPC-only outfit
- lootable special set
- boss-specific drop
- reusable gear asset after cleanup

## Class / race / weapon animation rule

- Race should generally **not** change the move grammar
- Class determines special attack / casting movement
- Weapon family determines basic attack family
- Monster family determines creature action family

## Animation library strategy

### Tier 1: Tripo covered
Use Tripo for:
- idle
- walk
- run
- turn
- jump
- climb
- swim
- generic slash / shoot / cast
- hurt / fall
- basic emotes

### Tier 2: Custom SoulDrifter required
Create custom animations for:
- door / chest / lever interaction variations
- weapon draw / sheath
- class-specific casts
- class-specific starter skills
- combo attacks
- knockback / stagger intensity ladders
- multiple deaths by cause / direction
- boss / special monster moves
- dialogue portrait head talk loops
- loot / interact / push / pull specifics

## Acceptance philosophy

Every asset / animation / VFX element must pass:
1. design fit
2. topology / technical fit
3. runtime fit
4. gameplay fit
5. visual proof
6. independent verification
```

---

## `source/docs/02_ANIMATION_MATRIX.md`

SHA-256: `f458a71e1b0997d58fc0e69358e8902e3e965242730d20a0a332e588b50d3cb2`

```markdown
# 02 — Animation Matrix

This file lists the required animation groups for SoulDrifter.

## A. Shared locomotion animations (all playable races/classes)

### Core locomotion
- idle_combat_off
- idle_combat_on
- walk_forward
- walk_backward
- strafe_left
- strafe_right
- run_forward
- sprint_forward
- turn_left_in_place
- turn_right_in_place
- stop_soft
- stop_hard
- crouch_idle (optional later)
- crouch_move (optional later)

### Jump / fall / landing
- jump_start
- jump_loop
- jump_land_soft
- jump_land_hard
- fall_loop
- knock_launch_fall
- get_up_from_ground

### Traversal
- climb_ladder_up
- climb_ladder_down
- climb_ledge_up
- climb_ledge_down
- climb_vine_or_rope
- climb_tree_or_trunk (if used)
- shimmy_sideways (optional later)

### Water
- swim_idle
- swim_forward
- swim_turn_left
- swim_turn_right
- dive_under
- surface_up
- drowning_loop
- drowning_death

## B. Universal interaction animations

### Generic interactions
- interact_short_press
- interact_long_channel
- inspect_object
- pickup_ground
- pickup_from_container
- loot_corpse
- kneel_interact
- place_object
- use_waystone
- activate_rune
- harvest_herb
- mine_ore
- chop_resource (if relevant)

### Door / gate interactions
- open_small_door_inward
- open_small_door_outward
- open_heavy_door_push
- open_heavy_door_pull
- open_double_door
- open_portcullis_or_gate_mechanism
- lockpick_door (later)
- force_open_door (later)

### Container interactions
- open_small_chest
- open_large_chest
- open_sarcophagus
- open_crate_or_barrel
- close_container
- inspect_found_item

### Lever / puzzle interactions
- pull_lever_high
- pull_lever_low
- push_button_or_plate
- rotate_valve
- push_object
- pull_object
- lift_object_small
- insert_key_or_item

## C. Weapon-family base combat animations

### Unarmed
- unarmed_idle
- unarmed_light_1
- unarmed_light_2
- unarmed_heavy
- unarmed_dash
- unarmed_block_or_guard
- unarmed_react

### One-handed sword / blade
- sword1h_idle
- sword1h_draw
- sword1h_sheath
- sword1h_light_1
- sword1h_light_2
- sword1h_light_3
- sword1h_heavy
- sword1h_lunge
- sword1h_runni