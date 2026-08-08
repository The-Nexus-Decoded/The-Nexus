# SoulDrifter Web Architecture

## Product Shape

SoulDrifter Web is an original browser RPG with the visual composition and world density of early isometric immersive RPGs. It does not emulate or load Ultima data.

## Browser Stack

- Phaser 3.90 for WebGL/Canvas rendering, input, sound, tweens, and scene lifecycle
- TypeScript for game code and data contracts
- Vite for local development and static production builds
- Vitest for deterministic engine tests
- Tiled for authored maps after the procedural first-level proof
- Aseprite and optional Blender renders for production sprite sheets

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

1. isometric projection and picking
2. tile occupancy and pathfinding
3. world objects and interactions
4. actor visuals and animation
5. exploration/combat state machine
6. turn resolution and reactions
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

The production target is high-resolution, painterly isometric sprites with modern effects:

- 2:1 isometric ground diamonds
- eight-direction characters and creatures
- layered equipment and paperdoll art
- height/lift support for walls, roofs, bridges, and flying objects
- dynamic tint, shadow, fog, weather, particles, and realm effects
- readable silhouettes at gameplay scale
- optional normal/depth maps for advanced lighting after the art pipeline is stable

The prototype uses original vector-generated art so mechanics can be evaluated immediately.
