# SoulDrifter Web Architecture

## Product Shape

SoulDrifter Web is an original browser RPG with the visual composition and world density of early isometric immersive RPGs. It does not emulate or load Ultima data.

## Browser Stack

- Three.js 0.185 for WebGL rendering, PBR materials, skeletal animation, ray picking, fog, lighting, effects, and scene lifecycle
- TypeScript for game code and data contracts
- Vite for local development and static production builds
- Vitest for deterministic character, equipment, action, tutorial, and dungeon-generation tests
- Blender/glTF for original characters, equipment, creatures, props, and animation interchange
- HTML/CSS for accessible dialogue, character creation, tutorial, action-bar, and responsive phone UI

## Exult-Inspired Patterns Reimplemented for SoulDrifter

| Research pattern | SoulDrifter implementation |
| --- | --- |
| Tiles, chunks, and superchunks | data-authored logical tiles grouped into streaming regions |
| Shapes and frames | original object definitions with animation/state frames |
| NPC schedules | server-ready schedule components driven by world time |
| Eggs/triggers | typed region, proximity, weather, audio, spawn, quest, and teleport triggers |
| Gumps | SoulDrifter-styled HTML/Canvas panels for containers, paperdolls, dialogue, and books |
| Paperdolls | modular class/race/equipment layers with authoritative equipped-item data |
| Usecode | original event/quest scripting contracts, never copied Ultima scripts |
| Multi-map support | four realm maps plus Soul Well hub and breach instances |

## First-Level Runtime

The first level uses a procedural data definition to prove the runtime before adopting a visual map editor.

Core layers:

1. orthographic three-quarter camera, ray picking, zoom, and limited rotation
2. tile occupancy and pathfinding
3. world objects and interactions
4. actor visuals and animation
5. exploration/combat state machine
6. shared combat simulation with real-time pulse and tactical-turn schedulers
7. quest state and inventory
8. UI bridge

## Multiplayer Direction

Multiplayer is not required for the first level, but the client must avoid owning authoritative future state.

- World positions, combat results, inventory changes, and quest flags will move behind commands/events.
- A future authoritative TypeScript server will communicate through WebSockets.
- Browser networking will use the SoulDrifter protocol, not the Ultima Online protocol.
- ClassicUO and ServUO may be studied for networking behavior only under their licenses.
- Official or downloaded UO client data is never a runtime dependency.

## Rendering Direction

The production target is an original real-time 3D isometric world with the density and object readability of classic immersive RPGs:

- orthographic three-quarter camera over a tile-authored navigation grid
- fully modeled characters, creatures, clothing, equipment, architecture, and props
- glTF skeletal animation with grounded feet, crossfades, auto-facing, and in-place locomotion synchronized to tile travel
- PBR masonry and flagstones, height-aware occlusion, real shadows, fog, animated lights, particles, and realm effects
- class/equipment silhouettes that remain readable at default zoom, with close inspection available
- equipment data independent from the model so later visual layers can reflect every equipped item

The first slice ships an original Elf Shadowknight GLB and original/CC0-derived environment materials. Motion-capture clips may be retargeted to the shared humanoid skeleton, but character proportions, starter gear, timing, contacts, and class-specific attack choreography remain SoulDrifter-authored.

## Combat Scheduling Invariant

Both combat styles read and write one authoritative encounter state: actor grid positions, hit points, Stability, class resource, cooldowns, targets, inventory, trial difficulty, and rewards.

- Real-time is the default. Cooldown-ready player actions may resolve continuously while enemies advance on paced pulses. All active enemies can pursue, but only one adjacent standard enemy strikes per pulse.
- Tactical Turns pauses hostile scheduling during orders and resolves the enemy round only after a committed player action.
- Combat-style selection updates the world state immediately and is locked only while an encounter is active.
- Invalid or out-of-range rehearsal animations never spend resources or deal damage.
