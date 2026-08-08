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
- real-time action-bar combat by default, with player-selectable tactical turns

## Visual direction

- Elevated orthographic three-quarter camera with close zoom, limited rotation, and a dense tile-authored 3D world.
- Fully modeled real-time 3D characters, equipment, creatures, architecture, and modular environment pieces, with strong silhouettes and richer animation than the historical references.
- Aged obsidian, dark iron, parchment, and restrained bronze frame the interface; soul-cyan and magic colors communicate supernatural state.
- Modern lighting, particles, weather, ambient animation, screen-space highlights, and responsive sound add richness without sacrificing tile readability.
- Characters use skeletal eight-direction-compatible locomotion, grounded feet, auto-facing, readable combat poses, and equipment-reflective model layers. Blender/glTF remains the production interchange.
- Every final environment, character, icon, effect, animation, and sound is original or explicitly licensed for this project.

## Magic is SoulDrifter magic

The browser edition must not inherit Ultima Online's reagent inventory, spell-circle progression, spell names, incantations, targeting rules, or mana balance.

SoulDrifter abilities are assembled and learned through its own systems:

- **Runes** define an action's core verb or force.
- **Sigils** shape delivery, area, duration, binding, chaining, or protection.
- **Color alignment** changes affinity, visuals, secondary effects, and realm interactions.
- **Soul Resonance** governs attunement, risk, and access to deeper effects.
- **Soul Essence** supports recovery, crafting, awakening, and selected progression costs.

The first playable implements all nine calling signatures and defenses as small demonstrations. They are not UO spells and consume cooldown, focus, or action resources—not reagents.

## Dual combat contract

The player can choose a combat style without changing the world, story, character build, inventory, or ability definitions.

### Tactical Turns

- Movement and abilities consume action points.
- Initiative and readable enemy intent support deliberate positioning.
- The world pauses for the encounter while ambient visual animation continues.
- Timed reaction windows, such as active block, preserve physical immediacy.

### Real-Time Action Bar

- This is the default combat style.
- Movement remains direct and enemies act continuously.
- The same abilities appear on a cooldown-driven action bar.
- Position, facing, range, interruption, and active defense matter.
- Combat speed can be reduced for accessibility without converting the build or campaign.

### Shared simulation invariant

Both modes use the same combatants, stats, ability definitions, damage rules, status effects, encounter data, rewards, and saved character state. Only the scheduler and resource presentation change. Content must never be authored twice just to support the two modes.

## First playable: The First Breach

The vertical slice begins in a ruined Soul Well complex:

1. Weave a named character from four ancestries, nine callings, and four remembered choices.
2. Awaken in the enlarged Realm-Lock Vestibule beside a damaged, animated Soul Well.
3. Hear ancestry/calling-specific lore from Wellkeeper Ilyra, then use the Memory Loom to place three final stat points, choose one ancestry boon, and choose one base-calling discipline.
4. Open the Wayfarer's Coffer for battered C-tier gear and rehearse the illustrated signature, defense, and recovery actions on the training effigy.
5. Choose the Wayfarer or Oathbreaker door after finishing Ilyra's questions, starter imprint, and coffer. Both voiced choices enter the same seeded three-to-five-chamber Fractured Galleries crawl and Ashen Lock miniboss room; the door changes encounter composition, Realm Pressure, and rewards.
6. Learn the two combat schedulers from Breach Scout Orren and the level-one combat contract from Arena Warden Brannoc before crossing the encounter threshold.
7. Defeat three standard Breachlings or five Oathbreaker variants, manage finite health/Stability/recovery resources, break the Cinderbound Warden, and claim the First Memory plus the selected trial reward.

The level proves the camera, navigation, destructible/marked object interactions, inventory feedback, fog, environmental effects, shared combat simulation, two schedulers, SoulDrifter magic identity, branching NPC dialogue, starter character refinement, two difficulty presets on one randomized crawl, tutorial checkpoints, and local story persistence. The current Realm-Lock environment, 36 starter portraits, custom Elf Shadowknight model, three guides, Breachlings, and Warden are original prototype assets. Production-quality mocap retargeting and complete equipment layers remain separate work.

Character, gear, dialogue, and persistence details are specified in `CHARACTER_AND_STORY_SYSTEM.md`.

## Multiplayer direction

The first playable is local, but gameplay code must keep simulation state separate from rendering and interface state. Later multiplayer work should use a server-authoritative simulation with client prediction only where appropriate. Existing open-source clients or server emulators may be studied for architectural lessons when their licenses permit it; their data files, proprietary protocols, art, writing, and game rules are not the foundation of SoulDrifter.

## Asset intake rule

Every imported item must be recorded in `third-party-assets.json` with source, author, license, modification notes, and proof location. If the license or ownership cannot be verified, the asset stays out of the repository. Similar-looking original work must be produced from SoulDrifter briefs and original source files, not by tracing, recoloring, or editing proprietary Ultima assets.
