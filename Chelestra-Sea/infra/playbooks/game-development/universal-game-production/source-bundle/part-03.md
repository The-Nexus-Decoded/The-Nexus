05 — 3D Asset Pipeline

Reference/design -> model/generate -> segment/edit -> topology/retopo -> UV/texture/material -> rig if needed -> animation -> LOD/collision/sockets -> export -> runtime/import -> performance/visual QA.

Geometry-changing stages occur before final rig/animation. Provider success never equals game readiness.
```

---

## `source/docs/06_ANIMATION_AND_INTERACTION.md`

SHA-256: `a3cd6bc7e6c8cdbdfc167596a2664a055e4b2ea60090dd1b5cea742e8c6b0456`

```markdown
# 06 — Animation and Interaction

Actions need semantic intent, anticipation, active/contact/release, recovery, root policy, equipment contacts, event markers, transitions, reactions, audio/VFX hooks and runtime proof.

Interactions additionally require prop alignment, collision/state transition, UI prompt, save/network consequence and failure recovery.
```

---

## `source/docs/07_VFX_AND_MATERIALS.md`

SHA-256: `d0198c78e0b13abc516bf0fedf8004de86e398427862e035cc70cf1b7a20bcfa`

```markdown
# 07 — VFX, Lighting and Materials

Effects reinforce gameplay telegraphs and contacts. Define sockets, phases, pooling, lights, decals, shaders, target-device fallback, color/readability and performance budgets.
```

---

## `source/docs/08_AUDIO_MUSIC_VOICE.md`

SHA-256: `abe0516974ac92c63a1de4c31490f9f93a8e0d00db5d3a1042a939828cd85fd8`

```markdown
# 08 — Audio, Music and Voice

Define buses, priority/ducking, spatialization, SFX event markers, music states, voice/subtitle pipeline, localization, loudness, accessibility and memory/streaming budgets.
```

---

## `source/docs/09_UI_UX_INPUT_ACCESSIBILITY.md`

SHA-256: `5bf21c0823636c179b88c4aa0ca3c1b1e49d2c4296039b1275bfbfab098a10dc`

```markdown
# 09 — UI, UX, Input and Accessibility

Define information architecture, HUD, menus, feedback, loading/error states, keyboard/mouse/controller/touch/remapping, safe areas, contrast, text scaling, subtitles, motion reduction and assist options.
```

---

## `source/docs/10_GAMEPLAY_AI_PHYSICS_SIMULATION.md`

SHA-256: `32ed21d8b6c0f5dd6164fe5b329f8d62b3a39e6daebca9cc8498057aed4d5b15`

```markdown
# 10 — Gameplay AI, Physics and Simulation

Define simulation fidelity, state/update frequency, navigation/steering, behaviors, sensors, decision rules, physics layers, determinism, debug views, performance scaling and edge-case recovery.
```

---

## `source/docs/11_NETWORKING_MULTIPLAYER_BACKEND.md`

SHA-256: `b947e21e4cfff7ec72d73c82f3430a06337bde3e4a6af82a50d55cf185c41756`

```markdown
# 11 — Networking, Multiplayer and Backend

Define authoritative ownership, replication, prediction, reconciliation, tick/snapshot model, matchmaking/session lifecycle, persistence, identity, security, abuse controls, reconnect and observability.
```

---

## `source/docs/12_SAVE_DATA_PROGRESSION_ECONOMY.md`

SHA-256: `2eefd700ccea8ac8888672f1cc5b83f85a9429d909efb92e947678aea2014103`

```markdown
# 12 — Save Data, Progression and Economy

Version every persisted schema. Define checkpoints, cloud/local authority, migration, rollback, corruption recovery, economy sources/sinks, loot/rewards, entitlements and anti-duplication boundaries.
```

---

## `source/docs/13_TESTING_QA_PERFORMANCE.md`

SHA-256: `f210ad857f2fd2ef9d76cf0722c3c312b5c9f60d0931588eb5dcf71f0a79fb4f`

```markdown
# 13 — Testing, QA and Performance

Use unit, contract, integration, end-to-end, visual, audio, device, performance, network, migration and soak tests.

Evidence must be tied to the current commit and intended platform/renderer.
```

---

## `source/docs/14_BUILD_RELEASE_DEPLOYMENT.md`

SHA-256: `6717819a2506220665df2bf0c1ca3144ac6ae9c9d726ca02120dc2b2c5843cd3`

```markdown
# 14 — Build, Release and Deployment

Define environments, secrets, CI/CD, versioning, packaging, signing, migrations, store/hosting workflow, canary/QA, rollback, artifact budgets and release approval.
```

---

## `source/docs/15_LIVE_OPS_ANALYTICS_SECURITY.md`

SHA-256: `b53265a9c4891aabccbee69b13078a6ffb5b18b7ea76e22782e7578b9de15047`

```markdown
# 15 — Live Ops, Analytics and Security

Define telemetry questions before instrumenting. Include crash/error logs, performance metrics, funnels, experiments, remote config, patches, moderation, privacy, anti-cheat, incident response and data retention.
```

---

## `source/docs/16_NESTED_GAME_MODES_AND_MINIGAMES.md`

SHA-256: `cd5dfaf57b2605f3840c9502097f65d2934d3dbc6706635ffd0b8478a658fb62`

```markdown
# 16 — Nested Game Modes and Mini-Games

Treat each subgame as a mode with its own module set and runtime contract. Explicitly define shared identity/save/inventory/UI/network systems and isolated mechanics/input/camera/physics/assets.
```

---

## `source/docs/17_AI_PROVIDER_ROUTING.md`

SHA-256: `fe867a55f58ad890a24a7bc6c65d09d2675de06547d87f4e21a1fe955f9853af`

```markdown
# 17 — AI Provider and Tool Routing

Choose tools per task, not brand loyalty. Maintain provider-neutral downstream contracts and provenance/cost ledgers. Pilot before batch, compare against existing assets, and require runtime acceptance.
```

---

## `source/docs/18_COMPLETION_AND_VERIFICATION.md`

SHA-256: `06ffdfa578446ed52086ff73c202033bffaa994881eb38f7bfb151a8e1875499`

```markdown
# 18 — Completion and Verification

Implementation is not completion. Producer stops at IMPLEMENTED_UNVERIFIED. Independent verifier validates requirements, evidence, target device, performance, saves/network and project overlay rules. Machine done gate prevents skipped rows.
```

---

## `source/docs/19_PROJECT_OVERLAY_AND_CANON.md`

SHA-256: `5379ffafe056834514c8e729204df2096de2d69571992f315b6c376a24f4a60f5`

```markdown
# 19 — Project Overlay and Canon

The overlay records project-specific truth and wins over generic examples. It should link to current code/data sources, art/technical bibles, owner decisions, provider policies and selected module variants.
```

---

## `source/docs/20_UNIVERSAL_CHECKLIST.md`

SHA-256: `c7ab53e38c81838ad02a44e0f0c049cfc69749e110ca6301b1028e18fc3f81d8`

```markdown
# 20 — Universal Game Checklist

For each feature ask:
- Does the design contract exist?
- Is it data/state-authoritative?
- Does input/control work?
- Does camera/presentation work?
- Are assets/audio/VFX integrated?
- Are reactions/failure/recovery implemented?
- Does it save/replicate where required?
- Does it work on target platforms/devices?
- Does it meet performance/accessibility?
- Is evidence fresh and independently verified?
```

---

## `source/examples/flight-sim-project-profile.json`

SHA-256: `d3f78472ae46a8a42b596711bac84a774184c89444f0fb3c735fc8284f48328d`

```json
{
  "schemaVersion": 1,
  "projectId": "flight-sim",
  "title": "Flight Simulator Example",
  "repository": {
    "identity": "owner/repository",
    "mainCheckoutHint": "",
    "tracker": "GitHub"
  },
  "engines": [
    {
      "name": "Three.js",
      "role": "runtime"
    },
    {
      "name": "Houdini",
      "role": "terrain/airports"
    }
  ],
  "platforms": [
    "desktop",
    "vr"
  ],
  "gameModes": [
    {
      "id": "flight",
      "name": "Flight",
      "camera": "cockpit/external",
      "dimension": "3D",
      "multiplayer": "optional",
      "modules": [
        "3D_GAME",
        "FLIGHT_VEHICLE_SIM",
        "DESKTOP_CONSOLE",
        "VR_XR"
      ]
    }
  ],
  "selectedModules": [
    "3D_GAME",
    "FLIGHT_VEHICLE_SIM",
    "DESKTOP_CONSOLE",
    "VR_XR"
  ],
  "overlay": {
    "root": ".project-harness",
    "canonIndex": ".project-harness/PROJECT_CANON_INDEX.md"
  },
  "performanceBudgets": {
    "targetFps": 60,
    "notes": "Set per target platform"
  },
  "providers": {
    "paidOperationsRequireApproval": true,
    "budgetLedger": ".agent-state/provider-budget.json"
  },
  "release": {
    "ownerApprovalRequired": true
  }
}
```

---

## `source/examples/nested-game-modes-project-profile.json`

SHA-256: `1eeb38bd033a704b4f10ac98a5dc3ff6d936d691183321289306683c417970bf`

```json
{
  "schemaVersion": 1,
  "projectId": "multi-mode-world",
  "title": "Nested Game Modes Example",
  "repository": {
    "identity": "owner/repository",
    "mainCheckoutHint": "",
    "tracker": "GitHub"
  },
  "engines": [
    {
      "name": "Three.js",
      "version": "",
      "role": "runtime"
    }
  ],
  "platforms": [
    "web-desktop"
  ],
  "gameModes": [
    {
      "id": "world",
      "name": "Main World",
      "camera": "third-person",
      "dimension": "3D",
      "multiplayer": "single-player",
      "modules": [
        "3D_GAME",
        "ACTION_ADVENTURE_RPG",
        "NARRATIVE_ADVENTURE"
      ]
    },
    {
      "id": "flight",
      "name": "Aircraft Simulation",
      "camera": "cockpit/external",
      "dimension": "3D",
      "multiplayer": "single-player",
      "modules": [
        "3D_GAME",
        "FLIGHT_VEHICLE_SIM",
        "NESTED_MINIGAME"
      ]
    },
    {
      "id": "cards",
      "name": "In-World Card Game",
      "camera": "table",
      "dimension": "2D/3D hybrid",
      "multiplayer": "single-player",
      "modules": [
        "CARD_BOARD_TURN_BASED",
        "NESTED_MINIGAME"
      ]
    }
  ],
  "selectedModules": [
    "3D_GAME",
    "ACTION_ADVENTURE_RPG",
    "NARRATIVE_ADVENTURE",
    "FLIGHT_VEHICLE_SIM",
    "CARD_BOARD_TURN_BASED",
    "NESTED_MINIGAME"
  ],
  "overlay": {
    "root": ".project-harness",
    "canonIndex": ".project-harness/PROJECT_CANON_INDEX.md"
  },
  "performanceBudgets": {
    "targetFps": 60,
    "notes": "Set per target platform"
  },
  "providers": {
    "paidOperationsRequireApproval": true,
    "budgetLedger": ".agent-state/provider-budget.json"
  },
  "release": {
    "ownerApprovalRequired": true
  }
}
```

---

## `source/examples/shooter-project-profile.json`

SHA-256: `6d751c51233490a755d5b919bbdd1530643a9202e8fd59c1d2e10bae9e47eefe`

```json
{
  "schemaVersion": 1,
  "projectId": "arena-shooter",
  "title": "Arena Shooter Example",
  "repository": {
    "identity": "owner/repository",
    "mainCheckoutHint": "",
    "tracker": "GitHub"
  },
  "engines": [
    {
      "name": "Three.js",
      "role": "runtime"
    },
    {
      "name": "Houdini",
      "role": "procedural assets"
    }
  ],
  "platforms": [
    "web-desktop"
  ],
  "gameModes": [
    {
      "id": "arena",
      "name": "Arena Combat",
      "camera": "first-person",
      "dimension": "3D",
      "multiplayer": "online",
      "modules": [
        "3D_GAME",
        "SHOOTER_FPS_TPS",
        "MULTIPLAYER_SOCIAL",
        "MOBILE_WEB"
      ]
    }
  ],
  "selectedModules": [
    "3D_GAME",
    "SHOOTER_FPS_TPS",
    "MULTIPLAYER_SOCIAL",
    "MOBILE_WEB"
  ],
  "overlay": {
    "root": ".project-harness",
    "canonIndex": ".project-harness/PROJECT_CANON_INDEX.md"
  },
  "performanceBudgets": {
    "targetFps": 60,
    "notes": "Set per target platform"
  },
  "providers": {
    "paidOperationsRequireApproval": true,
    "budgetLedger": ".agent-state/provider-budget.json"
  },
  "release": {
    "ownerApprovalRequired": true
  }
}
```

---

## `source/genre_modules/ACTION_ADVENTURE_RPG.md`

SHA-256: `5255c5603f670c9cb5d1b8cdc4e5709dce70b2e0e98edd79622e0d525f0fecbe`

```markdown
# Module — Action / Adventure / RPG

Use for real-time or turn-based character-driven exploration/combat/progression.

Key contracts:
- movement/camera/game feel;
- interactions and traversal;
- combat actions, cooldowns/resources/status/reactions;
- character/enemy animation;
- quests/dialogue/progression/equipment/economy;
- encounter and level connectivity;
- save migrations and content scaling.

Do not load this module merely because a game has an avatar. Load only when these systems apply.
```

---

## `source/genre_modules/BUILDER_MANAGEMENT_SANDBOX.md`

SHA-256: `b272c9287e15d880293e175b7a92238c9774456706a0c9b554a79bfb097352db`

```markdown
# Module — Builder / Management / Sandbox

Key contracts:
- placement/grid/freeform construction;
- simulation agents and schedules;
- economy, production chains and inventories;
- time controls and speed changes;
- persistence of large e