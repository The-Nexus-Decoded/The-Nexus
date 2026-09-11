volving worlds;
- tools/undo/redo/blueprints;
- explainable simulation UI;
- performance at scale;
- mod/data-driven boundaries where planned.
```

---

## `source/genre_modules/CARD_BOARD_TURN_BASED.md`

SHA-256: `20f1b0ab0ef460a06ce06d32a9a96fe80a53d23c5a17eef6096c26b978091563`

```markdown
# Module — Card / Board / Turn-Based

Key contracts:
- deterministic rules engine;
- legal action validation;
- turn/phase scheduler;
- deck/piece state and randomness seeds;
- undo/replay/logging where allowed;
- AI search/evaluation;
- network authority and reconnection;
- information clarity and animation that never obscures rules.
```

---

## `source/genre_modules/FIGHTING_SPORTS.md`

SHA-256: `a1c3f0053cde89ef0e043095b3796384dc708022ba448b48e01658d411fa11df`

```markdown
# Module — Fighting / Sports

Key contracts:
- input buffering and move/state rules;
- frame/timing/contact data;
- collision/hitboxes/hurtboxes;
- stamina/momentum/rounds/scoring;
- camera and presentation;
- training/debug tools;
- opponent AI;
- rollback/deterministic networking where applicable;
- replay and anti-cheat.
```

---

## `source/genre_modules/FLIGHT_VEHICLE_SIM.md`

SHA-256: `959da7414b429b96a0f81ef1cdbfd41beb8c263d08674fc77f93e4cb47e1d5ae`

```markdown
# Module — Flight / Vehicle Simulation

Key contracts:
- physics fidelity level (arcade, assisted, study-sim);
- controls, curves, dead zones, HOTAS/controller/keyboard/touch;
- aerodynamic/vehicle model, engines, fuel/energy, damage;
- instruments, cockpit interaction, HUD, cameras;
- terrain/airspace/traffic/weather streaming;
- autopilot/AI/navigation;
- tutorials and assists;
- replay/telemetry;
- deterministic/network model if multiplayer;
- VR comfort/performance when selected.
```

---

## `source/genre_modules/MULTIPLAYER_SOCIAL.md`

SHA-256: `9e0511e7937943944d8f40e53d6c0db414e22cd106dcbcc43fe1f77c112532b0`

```markdown
# Module — Multiplayer / Social

Key contracts:
- identity/auth/accounts;
- lobbies, parties, matchmaking and session lifecycle;
- authority/replication/prediction/reconciliation;
- reconnect/host migration where relevant;
- chat/voice/social presence;
- moderation/report/block/mute;
- privacy, abuse and security boundaries;
- backend scalability and observability.
```

---

## `source/genre_modules/NARRATIVE_ADVENTURE.md`

SHA-256: `4136e4a8db433ce08abf20c27f94191e4e3aac8f5b195e7bc1aff171bc09398b`

```markdown
# Module — Narrative / Adventure

Key contracts:
- dialogue/story state;
- branching conditions and consequences;
- cinematic/camera staging;
- facial/body performance;
- subtitles/voice/localization;
- save/checkpoint compatibility;
- content authoring tools and validation;
- spoiler/variant delivery rules when online.
```

---

## `source/genre_modules/NESTED_MINIGAME.md`

SHA-256: `bcf3073023adb51c29ecd7918fbf636c8ffcd4b4f3c2f3a0b5e20864faef0ce1`

```markdown
# Module — Nested Mini-Game / Game Within a Game

Key contracts:
- host-to-subgame entry/exit;
- state/inventory/currency transfer;
- input/camera/UI mode switch;
- pause/time/network behavior;
- separate module/profile for the subgame;
- save/recovery if the subgame crashes or disconnects;
- shared vs isolated asset/runtime budgets;
- reward and anti-exploit rules.
```

---

## `source/genre_modules/PLATFORMER_PUZZLE.md`

SHA-256: `aeea8d24b1cbbd47599d10d61cfe344f79f0ea9b01880ebc97703d45560b3f7a`

```markdown
# Module — Platformer / Puzzle

Key contracts:
- movement feel, acceleration, jump arcs, coyote time/input buffering;
- collision and moving platforms;
- camera framing;
- checkpoints/death/retry;
- puzzle state/reset/solvability;
- telegraph/readability;
- speedrun/replay hooks where planned;
- controller/touch accessibility.
```

---

## `source/genre_modules/RACING.md`

SHA-256: `6cfe86b405346209df1f3c623f02de810432f0afffcf2089a877befc7e575529`

```markdown
# Module — Racing

Key contracts:
- vehicle handling tiers;
- tracks/checkpoints/laps/penalties;
- starts, pits, resets, respawns;
- race AI and overtaking;
- collision/damage;
- timing/leaderboards/ghosts/replays;
- camera and speed feedback;
- online synchronization and anti-cheat;
- wheel/controller/touch support.
```

---

## `source/genre_modules/SHOOTER_FPS_TPS.md`

SHA-256: `5c9985a9ea983aaec734aed493dd544fdd19bef7bc916250e14f76a02a836d30`

```markdown
# Module — FPS / TPS Shooter

Key contracts:
- first/third-person camera and aim;
- weapon families, fire modes, ammo/reload/swap;
- recoil/spread/ballistics/hitscan/projectiles;
- hit zones, damage, armor, reactions, death;
- cover, movement, vault/slide/crouch where applicable;
- muzzle/impact VFX and positional audio;
- enemy combat AI;
- authoritative network hit validation, lag compensation and anti-cheat boundaries;
- input latency and high-refresh performance.
```

---

## `source/genre_modules/STRATEGY_TACTICS.md`

SHA-256: `c2b783e97243b97433a698942b44ecb5f1f85a24b88d1a99b7d85878b4df5b65`

```markdown
# Module — Strategy / Tactics

Key contracts:
- deterministic rules engine;
- selection/commands/control groups;
- pathfinding, formations, fog, line of sight;
- resources/economy/build queues;
- unit AI and tactical states;
- turn/tick scheduling;
- large-agent performance;
- replays/saves/network determinism;
- information-dense UI and accessibility.
```

---

## `source/genre_modules/SURVIVAL_CRAFTING.md`

SHA-256: `d4315f39e60d7d27432cbb7232f6ad5dc2e1f431f08de710c2357eff022646af`

```markdown
# Module — Survival / Crafting

Key contracts:
- gathering/resources/spawns;
- inventory/weight/durability;
- recipes/crafting stations;
- hunger/thirst/temperature/status;
- building/placement;
- world persistence and respawn;
- loot tables and progression;
- co-op authority/duplication protection when online.
```

---

## `source/platform_modules/2D_GAME.md`

SHA-256: `e3af35e4b609c5c4e4d6d9f3b5baabceeb489b1cb5b22012424ee86e540a28e6`

```markdown
# Platform/Presentation Module — 2D Game

Covers sprites, skeletal 2D animation, tilemaps, parallax, atlases, pixel-perfect policy, camera scaling, collision shapes, draw batching and asset filtering/compression.
```

---

## `source/platform_modules/3D_GAME.md`

SHA-256: `e820a18ebbf65a9a3bd62ceb62440d461341d22ecff42eda81d8970a547c5d4f`

```markdown
# Platform/Presentation Module — 3D Game

Covers world scale/axes, cameras, lighting, materials, LODs, occlusion, collision, navigation, rigs, animation, streaming, GPU budgets and asset import contracts.
```

---

## `source/platform_modules/DESKTOP_CONSOLE.md`

SHA-256: `a3874aaa9fcc790731bc15ea413daf842009120ee7c3c8ba67d35cbc3c259d52`

```markdown
# Platform Module — Desktop / Console-Oriented

Covers controller/keyboard/mouse, scalable graphics, display modes, save locations, packaging/signing, patching, platform services and device certification planning where relevant.
```

---

## `source/platform_modules/MOBILE_WEB.md`

SHA-256: `235da7dee2d3987f2c7da9aea502f398cc7db95303bf2edd580a591290077378`

```markdown
# Platform Module — Mobile / Web

Covers touch, responsive UI, browser/device compatibility, memory limits, loading/caching, network variability, thermal throttling, battery, installability, offline/reconnect and reduced-quality fallbacks.
```

---

## `source/platform_modules/VR_XR.md`

SHA-256: `bb5b76a0e5341eb5c8ba81171be873237113625e109d737d6f8a18901e3113e1`

```markdown
# Platform Module — VR / XR

Covers locomotion comfort, interaction reach, hand/controller tracking, scale, stereo rendering, high frame-rate targets, foveation, motion sickness, seated/standing options and safe boundaries.
```

---

## `source/schemas/action-contract.schema.json`

SHA-256: `8179f3cbe44c6edd4f6c164513cc2e5fc67685e638f01451a0b5901102afe30f`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Action Contract",
  "type": "object",
  "required": [
    "actionId",
    "owner",
    "timing",
    "markers"
  ],
  "properties": {
    "actionId": {
      "type": "string"
    },
    "owner": {
      "type": "string"
    },
    "input": {
      "type": "object"
    },
    "timing": {
      "type": "object"
    },
    "markers": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "resource": {
      "type": "object"
    },
    "cooldownMs": {
      "type": "number"
    },
    "animation": {
      "type": "object"
    },
    "vfx": {
      "type": "object"
    },
    "audio": {
      "type": "object"
    },
    "network": {
      "type": "object"
    }
  }
}
```

---

## `source/schemas/asset-record.schema.json`

SHA-256: `ea805e3ab995b5ce39365e0d2c4d7a4c8f79d5fd572b38fa5d6440d185cec052`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Asset Registry Record",
  "type": "object",
  "required": [
    "assetId",
    "category",
    "status",
    "runtimePromotionAllowed"
  ],
  "properties": {
    "assetId": {
      "type": "string"
    },
    "category": {
      "type": "string"
    },
    "provider": {
      "type": "string"
    },
    "source": {
      "type": "object"
    },
    "technical": {
      "type": "object"
    },
    "runtimeSlot": {
      "type": "string"
    },
    "status": {
      "type": "string"
    },
    "runtimePromotionAllowed": {
      "type": "boolean"
    },
    "evidence": {
      "type": "array"
    }
  }
}
```

---

## `source/schemas/feature-contract.schema.json`

SHA-256: `9c2e8ca1d3998def7231d13407965f43a3596b4e25b3fbcf2cd9c8df30c85ec5`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Feature Contract",
  "type": "object",
  "required": [
    "id",
    "description",
    "priority",
    "dependencies",
    "status"
  ],
  "properties": {
    "id": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "priority": {
      "enum": [
        "critical",
        "high",
        "normal",
        "low"
      ]
    },
    "dependencies": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "modules": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "status": {
      "enum": [
        "NOT_STARTED",
        "IN_PROGRESS",
        "IMPLEMENTED_UNVERIFIED",
        "BLOCKED",
        "VERIFIED",
        "OWNER_READY",
        "OWNER_APPROVED"
      ]
    },
    "automatedChecks": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "runtimeChecks": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "evidence": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "producer": {
      "type": [
        "string",
        "null"
      ]
    },
    "verifier": {
      "type": [
        "string",
        "null"
      ]
    }
  }
}
```

---

## `source/schemas/project-profile.schema.json`

SHA-256: `b0a213bc39c54c2f68a33a1119af856f23e08ec9a413415f4f89ce381485e8e3`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Universal Game Project Profile",
  "type": "object",
  "required": [
    "schemaVersion",
    "projectId",
    "title",
    "repository",
    "engines",
    "platforms",
    "gameModes",
    "selectedModules",
    "overlay"
  ],
  "properties": {
    "schemaVersion": {
      "type": "integer"
    },
    "projectId": {
      "type": "string",
      "minLength": 1
    },
    "title": {
      "type": "string",
      "minLength": 1
    },
    "repository": {
      "type": "object",
      "required": [
        "identity"
      ],
      "properties": {
        "identity": {
          "type": "string"
        },
        "mainCheckoutHint": {
          "type": "string"
        },
        "tracker": {
          "type": "string"
        }
      }
    },
    "engines": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": [
          "name"
        ],
        "properties": {
          "name": {
            "type": "string"
          }