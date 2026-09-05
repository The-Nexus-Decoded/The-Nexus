
3. runtime behavior;
4. visual quality;
5. negative/edge cases;
6. performance/device constraints;
7. tests and build;
8. evidence freshness.

## Special checks
- search for orphan doors/corridors/rooms;
- inspect every required asset matrix row;
- inspect missing roofs/ceilings and inaccessible entrances;
- inspect base character assets for fused gear/pedestals/inconsistent pose;
- run real-player traversal, not coordinate-only checks;
- ensure real-GPU evidence where relevant.

## Authority
Only this role can mark producer rows VERIFIED.
```

---

## `source/agents/10-performance-real-gpu-verifier.md`

SHA-256: `f88b942989f00183a8321df8e8aa94023f6feaa457b21cfd117b44affda6e590`

```markdown
# Agent: Performance / Real-GPU QA

## Mission
Catch failures hidden by software renderers or broad screenshots.

## Responsibilities
- verify hardware renderer (ANGLE/D3D11 or intended real GPU);
- abort on SwiftShader/llvmpipe for acceptance;
- collect draw calls, triangles, textures, frame time, memory where available;
- capture desktop + phone-width checks;
- watch console/shader compile errors;
- validate material texture-unit/shadow-light budgets.

## Reminder
A passing headless/software render is not proof of production GPU behavior.
```

---

## `source/config/ancestry-ability-matrix.json`

SHA-256: `d8948d9cb7839956a48cf02cf79bf2c19fd259a120da42b15603f3c4ad2516b3`

```json
{
  "schemaVersion": 1,
  "source": "src/game/tutorialChoices.ts and src/game/character.ts",
  "policy": {
    "deriveFromCode": true,
    "fullBodyAnimationRequiredOnlyForActiveActions": true,
    "passiveTraitsUseVfxUiOrAdditivePoseUnlessMechanicsChange": true
  },
  "ancestries": {
    "human": {
      "inherentTalent": "Adaptive Training",
      "boons": [
        {
          "id": "human-versatility",
          "name": "Many Roads",
          "currentType": "passive/stat modifier",
          "animationNeed": "none_or_subtle_proc"
        },
        {
          "id": "human-survivor",
          "name": "Hard-Won Habit",
          "currentType": "passive/stat modifier",
          "animationNeed": "none_or_subtle_proc"
        }
      ]
    },
    "elf": {
      "inherentTalent": "Long Memory",
      "boons": [
        {
          "id": "elf-memory",
          "name": "Unbroken Recollection",
          "currentType": "passive/stat modifier",
          "animationNeed": "focus/remember pose only if promoted to active"
        },
        {
          "id": "elf-ghoststep",
          "name": "Ghost Step",
          "currentType": "passive/stat modifier today",
          "animationNeed": "unique dash/phase animation if promoted to active"
        }
      ]
    },
    "dwarf": {
      "inherentTalent": "Stone Anchor",
      "boons": [
        {
          "id": "dwarf-forgeheart",
          "name": "Forgeheart",
          "currentType": "passive/stat modifier",
          "animationNeed": "brace/heat-bank animation if promoted to active"
        },
        {
          "id": "dwarf-anchor",
          "name": "Deep Anchor",
          "currentType": "passive/stat modifier",
          "animationNeed": "grounded brace animation if promoted to active"
        }
      ]
    },
    "halfling": {
      "inherentTalent": "Hidden Route",
      "boons": [
        {
          "id": "halfling-hidden",
          "name": "Overlooked Route",
          "currentType": "passive/stat modifier",
          "animationNeed": "scan/inspect gesture if promoted to active utility"
        },
        {
          "id": "halfling-courage",
          "name": "Small Defiance",
          "currentType": "passive/stat modifier",
          "animationNeed": "fear-resist/brace animation if promoted to active"
        }
      ]
    }
  }
}
```

---

## `source/config/animation-demand-sources.json`

SHA-256: `9d7a4cd1034aca4f2b15e4b53d881e8973d126f04101c0246ec8e0dbce0fa876`

```json
{
  "schemaVersion": 1,
  "sources": [
    "weapon-family registry",
    "src/game/character.ts CALLINGS signatureSkill",
    "src/game/character.ts CALLINGS defensiveSkill",
    "src/game/tutorialChoices.ts RACE_BOONS",
    "src/game/tutorialChoices.ts CALLING_PERKS",
    "src/game/tutorialChoices.ts hardTrialSkillName",
    "approved progression/specialization data",
    "interaction registry",
    "monster action registry",
    "NPC dialogue/ambient registry"
  ],
  "rule": "M3 regenerates expected animation demand from authoritative data and diffs against the animation manifest."
}
```

---

## `source/config/character-matrix.json`

SHA-256: `3127b5393545fcde8d93009308c01190345c617567676643b82c5acb8559a9da`

```json
{
  "schemaVersion": 1,
  "baseBodyContract": {
    "ancestries": [
      "human",
      "elf",
      "dwarf",
      "halfling"
    ],
    "presentations": [
      "masculine",
      "feminine"
    ],
    "bodyProfiles": [
      "slim",
      "athletic",
      "heavy"
    ],
    "expectedCount": 24,
    "fusedClassGearAllowed": false,
    "pedestalAllowed": false,
    "fusedWeaponsAllowed": false,
    "neutralCoverage": "project-approved modest neutral underlayer/coverage only",
    "bodyProfileSemantics": {
      "slim": "lean/skinny",
      "athletic": "normal athletic/muscular heroic build",
      "heavy": "broad large-framed big-boned/buff/thick; not obese and no oversized gut"
    }
  },
  "modularCallingKits": {
    "expectedCount": 9,
    "note": "Calling kits attach to base bodies; they are not separate fused race/class body meshes."
  },
  "rigging": {
    "primaryNewProductionProvider": "tripo",
    "customProvider": "blender_houdini_kinefx_or_other_custom",
    "legacyFallbackProvider": "mixamo",
    "paidBatchRequiresOwnerApproval": true
  },
  "appearanceCustomization": {
    "appearanceFamilies": [
      "Black",
      "White",
      "Asian",
      "Indian"
    ],
    "facialFeaturePresetsPerRaceFamilyTarget": "4-5",
    "masculineHairTarget": 10,
    "feminineHairTarget": 10,
    "optionalAccessories": [
      "earrings",
      "face tattoos",
      "body tattoos",
      "scars",
      "facial hair",
      "piercings"
    ]
  }
}
```

---

## `source/config/class-combat-chains.json`

SHA-256: `5c42442e399fe011644eb31daa73c537314c1c80dede0c8ede36a84604415a91`

```json
{
  "schemaVersion": 1,
  "status": "DESIGN_DRAFT",
  "globalRule": "Every starter class has three active abilities; at least two form a readable setup/reaction/payoff relationship.",
  "classes": {
    "warrior": {
      "chain": [
        "Driving Bash (proposal)",
        "OffBalance",
        "Cleaving Strike"
      ],
      "alternateReactiveChain": [
        "Anchor Guard success",
        "CounterOpening",
        "Cleaving Strike"
      ]
    },
    "mage": {
      "chain": [
        "Blue Ward absorbs hit",
        "StoredChannel",
        "Cinder Bolt"
      ]
    },
    "priest": {
      "chain": [
        "Mending Ward meaningful protection",
        "Benediction",
        "Consecrated Dart"
      ]
    },
    "sharpshooter": {
      "chain": [
        "Evasive Mark",
        "Marked",
        "Twin Shot"
      ]
    },
    "paladin": {
      "chain": [
        "Hold the Breach success",
        "OathfulCounter",
        "Oath Hammer"
      ]
    },
    "summoner": {
      "chain": [
        "Binding Circle",
        "Bound",
        "Lesser Driftling command attack"
      ]
    },
    "asura": {
      "chain": [
        "Black Thread",
        "Threaded",
        "Mind Prick"
      ]
    },
    "slayer": {
      "chain": [
        "Feinting Cut",
        "Feinted / possible forced turn",
        "Backstab"
      ],
      "forcedTurnChanceVsStandardEnemyDraft": 0.3,
      "rules": [
        "always provide a minor fallback opening",
        "elites have reduced susceptibility",
        "bosses resist forced facing changes",
        "Shadowstep can independently create positional Backstab opportunity"
      ]
    },
    "shadowknight": {
      "chain": [
        "Cinder Guard absorbs hit",
        "BankedEmber / Gravefire",
        "Siphon Cleave"
      ]
    }
  }
}
```

---

## `source/config/class-resource-model.json`

SHA-256: `4de1035bbbf4e486b20e0357a47b9eda459dd26971d9fe6ad4a5324f9de43b22`

```json
{
  "schemaVersion": 1,
  "status": "DESIGN_DRAFT_EXCEPT_RESOURCE_NAMES_FROM_CURRENT_CODE",
  "universal": {
    "health": "HP",
    "stability": {
      "purpose": "poise/channel/composure",
      "separateFromClassResource": true
    }
  },
  "classes": {
    "warrior": {
      "resource": "Fury",
      "type": "builder_spender"
    },
    "mage": {
      "resource": "Channel",
      "type": "spend_regen"
    },
    "priest": {
      "resource": "Devotion",
      "type": "role_builder_spender"
    },
    "sharpshooter": {
      "resource": "Focus",
      "type": "precision_builder_spender"
    },
    "paladin": {
      "resource": "Oath",
      "type": "protection_builder_spender"
    },
    "summoner": {
      "resource": "Command",
      "type": "summon_command_builder_spender"
    },
    "asura": {
      "resource": "Instability",
      "type": "danger_meter"
    },
    "slayer": {
      "resource": "Edge",
      "type": "positional_builder_spender"
    },
    "shadowknight": {
      "resource": "Gravefire",
      "type": "drain_guard_builder_spender"
    }
  },
  "rule": "Basic weapon action remains available even when class resource is empty."
}
```

---

## `source/config/combat-mode-policy.json`

SHA-256: `1d053bb4f29990c35d4a69ce63c8024ebefd84dda372f2171007653412898616`

```json
{
  "schemaVersion": 1,
  "defaultCombatMode": "real-time",
  "supportedModes": [
    "real-time",
    "turn-based"
  ],
  "architecture": "single_authoritative_simulation_two_schedulers",
  "realTime": {
    "isDefault": true,
    "clock": "continuous",
    "enemyAI": "continuous_or_pulsed",
    "cooldowns": "continuous_combat_time",
    "petAutocast": "continuous"
  },
  "turnBased": {
    "isDefault": false,
    "clock": "paused_during_player_planning_then_advanced_by_action_resolution",
    "enemyAI": "same_policy_on_scheduled_action_opportunity",
    "cooldowns": "same_ms_values_on_simulation_clock",
    "petAutocast": "evaluated_on_pet_action_opportunity"
  },
  "sharedContracts": [
    "skills",
    "cooldowns",
    "class_resources",
    "stability",
    "status_effects",
    "reactive_chains",
    "pet_abilities",
    "hit_markers",
    "damage_healing",
    "death_loot"
  ],
  "rule": "Do not create separate balance tables or duplicate skills for turn-based combat."
}
```

---

## `source/config/context-version.json`

SHA-256: `4953886a6fa6f76b67b501c99f011f13601bf230358cd86685d9c9135b1abd87`

```json
{
  "schemaVersion": 1,
  "contextVersion": "2026-08-23-master-v3",
  "entryPoint": "START_HERE.md",
  "compatibleModels": [
    "minimax-m3",
    "claude",
    "chatgpt-codex",
    "other"
  ],
  "requiredCoreFiles": [
    "AUTO_DISCOVER_WORKSPACE.md",
    "ONBOARDING.md",
    "START_HERE.md",
    "PROJECT_CANON_INDEX.md",
    "WORKFLOW.md",
    "config/current-phase-scope.json",
    "docs/01_MASTER_PLAYBOOK.md",
    "docs/17_REACTIVE_COMBAT_CHAIN_SYSTEM.md",
    "docs/18_CLASS_RESOURCES_AND_COOLDOWNS.md",
    "docs/19_SUMMONER_PET_COMMAND_AND_AUTOCAST_SYSTEM.md",
    "docs/20_DUAL_COMBAT_MODE_ARCHITECTURE.md"
  ],
  "rule": "Auto-discover and reuse existing ticket worktrees; onboarding + context receipt must pass before audit/implementation."
}
```

---

## `source/config/current-class-core-actions.json`

SHA-256: `9edcec1d64c297cbc3af2bec4cc71454ea922779f07c471d09a204ec74891c26`

```json
{
  "schemaVersion": 1,
  "source": "src/game/character.ts",
  "classes": {
    "warrior": {
      "signature": "Cleaving Strike",
      "defensive": "Anchor Guard"
    },
    "mage": {
      "signature": "Cinder Bolt",
      "defensive": "Blue Ward"
    },
    "priest": {
      "signature": "Consecrated Dart",
      "defensive": "Mending Ward"
    },
    "sharpshooter": {
      "signature": "Twin Shot",
      "defensive": "Evasive Mark"
    },
    "paladin": {
      "signature": "Oath Hamme