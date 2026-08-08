# SoulDrifter Browser Game Design

Status: authoritative browser-edition override  
Edition: first playable vertical slice

## Document precedence

`GAME_BIBLE.md` remains the source of truth for SoulDrifter's world, realms, lore, classes, factions, characters, runes, sigils, color magic, quests, and progression concepts.

This document overrides only the browser edition's presentation, controls, combat delivery, technical architecture, and asset policy. Where the older bible says the parallel edition is exclusively low-poly 3D or exclusively turn-based, this browser design takes precedence.

## Product statement

Build a new, standalone SoulDrifter RPG for modern browsers. Its readable, object-dense isometric world should evoke the feeling of exploring a hand-authored 1990s immersive RPG, especially the spatial clarity of *Ultima VII* and the social-world readability of classic *Ultima Online*. It is not an Ultima port, shard, reskin, or rules clone.

SoulDrifter owns the setting and game rules:

- Soul Resonance, Soul Essence, runes, sigils, glyphs, and color-aligned magic
- the existing SoulDrifter realms, classes, factions, lore, characters, and quests
- object interaction, systemic environments, exploration, dialogue, and party play
- player-selectable tactical turns or real-time action-bar combat

## Visual direction

- Fixed elevated isometric camera with a dense, handcrafted tile world.
- High-resolution painterly sprites and modular environment pieces, with strong silhouettes and more animation than the historical references.
- Aged obsidian, dark iron, parchment, and restrained bronze frame the interface; soul-cyan and magic colors communicate supernatural state.
- Modern lighting, particles, weather, ambient animation, screen-space highlights, and responsive sound add richness without sacrificing tile readability.
- Characters use eight-direction movement and readable combat poses. Production sprites may be drawn directly or rendered from original Blender models into sprite frames.
- Every final environment, character, icon, effect, animation, and sound is original or explicitly licensed for this project.

## Magic is SoulDrifter magic

The browser edition must not inherit Ultima Online's reagent inventory, spell-circle progression, spell names, incantations, targeting rules, or mana balance.

SoulDrifter abilities are assembled and learned through its own systems:

- **Runes** define an action's core verb or force.
- **Sigils** shape delivery, area, duration, binding, chaining, or protection.
- **Color alignment** changes affinity, visuals, secondary effects, and realm interactions.
- **Soul Resonance** governs attunement, risk, and access to deeper effects.
- **Soul Essence** supports recovery, crafting, awakening, and selected progression costs.

The first playable uses Rune Slash and Anchor Guard as small demonstrations. They are not UO spells and consume cooldown, focus, or action resources—not reagents.

## Dual combat contract

The player can choose a combat style without changing the world, story, character build, inventory, or ability definitions.

### Tactical Turns

- Movement and abilities consume action points.
- Initiative and readable enemy intent support deliberate positioning.
- The world pauses for the encounter while ambient visual animation continues.
- Timed reaction windows, such as active block, preserve physical immediacy.

### Real-Time Action Bar

- Movement remains direct and enemies act continuously.
- The same abilities appear on a cooldown-driven action bar.
- Position, facing, range, interruption, and active defense matter.
- Combat speed can be reduced for accessibility without converting the build or campaign.

### Shared simulation invariant

Both modes use the same combatants, stats, ability definitions, damage rules, status effects, encounter data, rewards, and saved character state. Only the scheduler and resource presentation change. Content must never be authored twice just to support the two modes.

## First playable: The First Breach

The vertical slice begins in a ruined Soul Well complex:

1. Awaken beside a damaged Soul Well.
2. Learn click-to-move and inspect the environment.
3. Open the Runebound Coffer and recover a starter sigil.
4. Pass through a torch-lit hall into a sealed training arena.
5. Choose Tactical Turns or Real-Time Action Bar.
6. Defeat the Hollow Sentinel using Rune Slash, Anchor Guard, movement, and active block.
7. Release the captive Soul Essence to complete the slice.

The level proves the camera, navigation, object interactions, inventory feedback, environmental effects, shared combat simulation, two schedulers, and SoulDrifter magic identity. It intentionally uses procedural original placeholder art until production sprites are approved.

## Multiplayer direction

The first playable is local, but gameplay code must keep simulation state separate from rendering and interface state. Later multiplayer work should use a server-authoritative simulation with client prediction only where appropriate. Existing open-source clients or server emulators may be studied for architectural lessons when their licenses permit it; their data files, proprietary protocols, art, writing, and game rules are not the foundation of SoulDrifter.

## Asset intake rule

Every imported item must be recorded in `third-party-assets.json` with source, author, license, modification notes, and proof location. If the license or ownership cannot be verified, the asset stays out of the repository. Similar-looking original work must be produced from SoulDrifter briefs and original source files, not by tracing, recoloring, or editing proprietary Ultima assets.
