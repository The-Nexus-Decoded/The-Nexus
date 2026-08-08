# SoulDrifter — AI Build Handoff Document

## Project Overview
**SoulDrifter** is a tile-based tactical RPG inspired by the Death Gate Cycle, built per the spec from Discord `#games-vr` channel. Isometric presentation, real-time exploration, animated turn-based combat with reaction timing, four realms with unique physics laws.

---

## Current Build State

| Property | Value |
|---|---|
| **Project Root** | `C:\Users\olawal\Documents\kimi\workspace\deathgate-rpg` |
| **Stack** | React 19 + TypeScript + Vite + Tailwind CSS |
| **Build Status** | ✅ Clean — `npm run build` passes |
| **Dev Server** | `npm run dev` |
| **Version** | v0.6 — Ultima VI/VII Visual Pass |

---

## What's New in v0.6 (this session)

Art direction pass modeled on the Ultima VI decompiled source (`ergonomy-joe/u6-decompiled`) and the Ultima VII engine (Exult, `exult/exult`).

### 1. Terrain — U7-style flat + dither
- Floors dropped the smooth modern gradients for **flat base tones with deterministic VGA-style dither patches** (two-tone stipple), like the original 8×8 ground tiles.
- Per-terrain detail: flagstone seams (floor_stone), plank lines (wood), grass blades + occasional flowers, sand ripples, kelp root mats, dirt/ash mounds.

### 2. Terrain transitions (the big one)
- New `EdgeTransitions` system: every tile inspects its 4 neighbors.
- **Shorelines**: water tiles adjacent to land draw animated foam crests + bubbles along the shared edge.
- **Wet band**: land next to water gets a dark soaked edge.

### 3. Walls — tall block construction
- Walls are now proper raised blocks: top face + two side faces (~40px tall), brick courses, staggered vertical joints, and ambient-occlusion shadow at the base. Rune walls get a glowing inset sigil; breached walls get a crack.

### 4. Water animation
- Drifting wave-crest groups (`animateTransform` translate) on all three water types, brighter shallow palette — the modern equivalent of U6's palette-cycled water (`_0e tile anim` flag / `GR_27` palette animation in the decompiled source).

### 5. Grounding shadows
- Elliptical blurred drop shadows under all units and entities — units now sit *on* the world instead of floating.

### 6. Gump UI chrome + fonts
- Cinzel (titles) + IM Fell English (dialog) via Google Fonts.
- `.gump-panel` (dark wood/stone, double gold border, inset shadows) applied to dialog, combat log, party HUD, shop, inventory, settings, victory/defeat, tooltip, objective tracker, action bars.

---

## What's New in v0.5 (this session)

### 1. Player Profiles & Persistence
- Save store is now `souldrifter_profiles_v1`: multiple named profiles (`ProfileRecord { meta, save }`), autosaved on character creation and on every save tick.
- Title screen lists **Saved Souls** (name, class, level) — click to load, hover ✕ to delete. "Continue Your Drift" loads the most recent.
- **Unique usernames**: character creation rejects a name that already exists (case-insensitive) and points the player to load that soul instead.
- `SaveData` bumped to version 3.

### 2. WASD / Arrow-Key Movement
- Hold-to-walk keyboard movement in exploration (150 ms step timer), alongside click-to-walk. Ignored while typing, in combat, dialogs, or shops. Unit layer slides smoothly between tiles via CSS `left/top` transitions.

### 3. Visual Overhaul (Ultima-style direction)
- `IsoWorld` rewritten: deterministic per-tile texture speckles, SVG gradient floors/walls with catch-lights and brick seams, realm-specific ambient particles (`particleRise`/`particleDrift`), vignette.
- Richer `PlayerArt` sprite (34×42, race skin tones, hair, eyes, class gear) and gradient enemy sprites.
- Action animations: `anim-lunge` (attacks), `anim-cast` (spells), `anim-hit` (flinch), `unit-bob` idle sway — driven by `state.actionFx` (auto-clears after 480 ms).
- New `.sd-btn` button style (beveled, bordered, glow hover) applied to title/creation flows.

### 4. Nexus Lore Weave
- Soul Keeper & Realm Scholar dialogs now reference the Sundering, Naga (corrupted Sartan souls seeding entropy), and the Wind Walkers — sourced from `Arianus-Sky/data/lore/zone1_entries.json` in The-Nexus repo.

### 5. Source Control
- Game deployed to The-Nexus repo at `Arianus-Sky/projects/games/soul-drifter-tactics` on branch `sky/soul-drifter-tactics`.

---

## Critical Fix in v0.4

**Blank world view**: `IsoWorld` outer container used `w-full h-full` inside a `min-h-screen` parent — height collapsed to 0 and `overflow-hidden` clipped the entire tile render (HUD was fine, world was invisible). Fixed to `absolute inset-0`. Also removed the hardcoded `server.port: 3000` from `vite.config.ts` so preview tooling can assign ports.

## What's New in v0.4 (this session)

### 1. Chelestra — Realm of Sea (4 new maps)
World-travel graph is now: Spawn Chamber → Corridor → Arena → Caldera (Pryan), and Corridor → **Tide Gate** → Sunken Approach → Lumenhollow → Drowned Chapel / Current Trench.

| Map | Size | Content |
|---|---|---|
| Sunken Approach | 12×9 | Entry: kelp beds, shallows, deep channel, 2 Tide Lurkers, Sunken Memory |
| **Lumenhollow** (underwater town) | 13×10 | Elder (quest giver), Tide Market (shop), Salty Drift inn (rest 10g → full heal), Tide Priestess (lore), moat + bridge, lumen lamps |
| Drowned Chapel | 12×11 | Dungeon: 2 Drowned Acolytes + **Chapel Warden** boss, flooded font, pews (cover), Tide Essence, Drowned Memory |
| Current Trench | 14×8 | Gauntlet: two riptide lanes, dividing deep, 3 Reef Stalkers, Sunken Strongbox (+45g) |

### 2. Realm Law Mechanics
- **Light & vision**: fog-of-war reveal radius shrinks by 1 underwater (`visionRadius()`)
- **Current drag**: `current_lane` tiles push units 1 tile west — in exploration on entry, and in combat at turn start (`beginTurnFor`)

### 3. Town Systems
- **Shop**: `SHOP_STOCK` in classes.ts, `state.shop`, `openShop/closeShop/buyItem` actions, `ShopPanel` UI (5 items incl. new Pearl of Clarity — cleanses all conditions)
- **Inn**: 10g → full HP/MP restore + condition cleanse
- **Elder quest chain**: speak → cleanse the Drowned Chapel (kill Chapel Warden) → return for 60g + Greater Soul Vial (tracked via `elder_reward` objective)
- **Treasure**: `item`-type entity (Sunken Strongbox, one-time +45g)

### 4. New Enemies & Abilities
- Tide Lurker (melee), Drowned Acolyte (tide_hex root + ink_cloud mark), Reef Stalker (init 15, move 6), Chapel Warden boss (tidal_slam AoE)
- Enemy AoE is now generalized: any `radius`-shape enemy ability splashes all players in area (was hardcoded to magma_slam)
- New water damage type with blue floaters

### 5. New Terrain
floor_sand, floor_coral, floor_kelp (half cover), wall_coral, water_shallow, water_deep (blocks), current_lane, glow_coral — all with animated SVG art

---

## Key Files (unchanged layout)

| File | Purpose |
|---|---|
| `src/soul-drifter/game/types.ts` | Types incl. new TerrainType/EnemyId/AbilityId members, `shop` field |
| `src/soul-drifter/game/combat.ts` | Pure engine: BFS, shapes, damage, AI planner |
| `src/soul-drifter/game/state.tsx` | Provider: combat, AI, reactions, current drag, vision law, shop/inn/quest |
| `src/soul-drifter/components/Game.tsx` | All screens incl. ShopPanel |
| `src/soul-drifter/components/IsoWorld.tsx` | Renderer — now `absolute inset-0` |
| `src/soul-drifter/data/classes.ts` | Classes, races, abilities, enemies, items, SHOP_STOCK, realms, terrain |
| `src/soul-drifter/data/maps.ts` | 8 maps, entity tables, enemy spawn tables |

## Known Issues / TODO (next session)

| Issue | Priority | Notes |
|---|---|---|
| Party recruitment | High | Engine supports it; still one character |
| Abarrach (Realm of Stone) maps | High | Last realm: sound & death, death-pressure mechanic |
| Line abilities hit through walls | Medium | No LoS check in shapeTiles |
| More town depth | Medium | Lumenhollow could use quest boards, rumors, more shops (gear) |
| Explored tiles not persisted | Low | Fog resets on load |
| Equipment stats | Low | equipment[] is cosmetic |
| `src/pages/*`, `src/components/GameWorld.tsx` legacy files | Low | Unused; safe to delete |

---

**Compiled:** 2026-08-08 (v0.4)
**Builder:** Kimi (Moonshot AI)


---

## What's New in v0.3 (this session)

### 1. Real Combat Engine (was stub)
- Initiative-based turn order (party + engaged enemies), round counter
- BFS pathfinding movement with cyan range highlights; move + action per turn
- Ability targeting with valid-tile highlights + affected-area preview (orange) for all shapes: single, line, cone, arc, radius, self
- Damage resolution: attack vs defense, staggered (+50%), marked (+25%), defending (halved)
- Conditions: burning (5 dmg/turn), staggered, marked, rooted, stunned (skip turn), defending, anchored, oath_guard
- Class resources (fury / color_channel / devotion / focus / oath_charge) gate abilities, regen +10/turn
- Enemy AI: paths toward nearest player, picks highest-damage in-range ability, bosses use signature skills
- Victory → XP / gold / loot panel with level-ups; defeat → fracture screen → reform at Soul Well (−25% gold)
- Retreat action returns player to map spawn

### 2. Reaction Timing Minigame
- Enemy attacks open a timing bar (SPACE / click in the bright zone) → damage cut to 25%
- Modes: Full Timing (1400ms), Wide Timing (2200ms), Auto Resolve (40% block), No Timing Bonus

### 3. Paladin Class (5th, per Game Bible)
- Kit: Thor's Hammer (radius thunder stun), Oath Guard (intercept brace), Vow Field (heal aura), Cleanse Strike
- Resources: oath_charge; heavy armor, high HP/defense

### 4. Race System
- Human / Elf / Dwarf / Halfling with non-locking stat modifiers and traits (per bible ancestry rules)
- Character creation flow: Title → Name → **Race** → Class → 5-question Ultima-style quiz

### 5. New Realm Map: Caldera Descent (Pryan)
- 14×12 fire-realm dungeon: lava river (10 dmg + burning when crossed), obsidian bridge, heat shimmer tiles, boss chamber
- New enemies: Cinder Imp ×2 (fire_bolt, burning), Magma Beetle (tanky), Ember Golem (boss, magma_slam AoE)
- Pryan Realm Gate in the arena stays sealed until `defeat_sentinel` objective is cleared
- Ember Essence + Scorched Memory lore pickups

### 6. Items, Gold, Save/Load
- Consumables: Lesser/Greater Soul Vial, Channel Tonic, Ember Draught (cures burning); enemy loot drops
- Inventory panel (usable in combat as your action, or freely in exploration)
- Autosave to localStorage (`souldrifter_save_v2`) on map transitions, victories, pickups, exit; "Continue Your Drift" on title screen; manual Save in settings

### 7. Renderer Upgrades
- Enemy unit sprites (imp, beetle, golem, dummies, sentinel) with HP bars and boss scale
- Floating damage/heal numbers (`damageFloat` animation), realm-tinted backgrounds
- Move-range / target / affected-preview tile highlights; new terrain art (basalt, obsidian, ash, lava, heat shimmer)

---

## Key Files

| File | Purpose |
|---|---|
| `src/soul-drifter/game/types.ts` | All types incl. RaceDef, ItemDef, Floater, ReactionPrompt, CombatRewards, SaveData |
| `src/soul-drifter/game/combat.ts` | Pure engine: BFS range/path, ability shapes, damage calc, enemy AI planner |
| `src/soul-drifter/game/state.tsx` | Provider: combat loop, AI scheduling, reactions, leveling, loot, save/load |
| `src/soul-drifter/components/Game.tsx` | Title/race/class/quiz flow, PartyHUD, TurnOrderStrip, CombatBar, CombatLog, ReactionOverlay, InventoryPanel, CombatResultPanel |
| `src/soul-drifter/components/IsoWorld.tsx` | Iso renderer: terrain art, unit/enemy sprites, highlights, floaters |
| `src/soul-drifter/data/classes.ts` | 5 classes, 4 races, abilities, enemies, items, realms, terrain, condition info |
| `src/soul-drifter/data/maps.ts` | 4 maps, entity tables, enemy spawn tables, `createCharacter(class, name, race, mods)` |

---

## Combat Flow Reference

1. Exploration: click a hostile → `engageEnemy()` engages all hostiles within Chebyshev 3 of it. Stepping adjacent to a hostile also auto-engages.
2. `beginCombatState()` sorts participants by initiative; `beginTurnFor()` ticks burning, regens resource, skips stunned/dead, computes player move range.
3. Player turn: click cyan tile to move → click ability → click highlighted target tile (orange preview on hover) → End Turn.
4. Enemy turns run via provider `useEffect` + `runEnemyTurn()`; attacks vs. players open `ReactionOverlay` in timing modes.
5. `checkCombatEnd()` grants rewards, marks `defeatedUnitIds` (dead enemies never respawn), clears objectives.

## Leveling
- `xpToNext(level) = level * 80`. Level up: +12 maxHP, +6 maxMP, +1 attack, +1 defense on even levels, full heal.

## Known Issues / TODO (next session)

| Issue | Priority | Notes |
|---|---|---|
| Party recruitment | High | Engine supports multiple members; only one character is created |
| Chelestra / Abarrach maps | High | Realm defs exist; needs maps, water/nullwater mechanics, death-pressure |
| Line abilities hit through walls | Medium | No LoS check in `shapeTiles` line/cone; add LoS from TERRAIN_DEFS.blocksLoS |
| Enemy AoE vs. player reactions | Medium | magma_slam bypasses reaction prompt (intentional, could be revisited) |
| Explored tiles not persisted | Low | Fog resets on load |
| Equipment system | Low | equipment[] is cosmetic strings; no stat gear |
| Subclasses/paths | Low | Bible defines full matrix (Berserker, Luminist, Oathguard, etc.) |
| `src/pages/*`, `src/components/GameWorld.tsx` legacy files | Low | Unused by App.tsx; safe to delete after confirming |

## How to Continue

```bash
cd deathgate-rpg
npm run dev        # dev server
npm run build      # production build (tsc -b && vite build)
```

### Adding an enemy
1. Add `EnemyDef` to `ENEMIES` in `classes.ts` (with xpReward/goldReward/loot)
2. Add spawn entry to `MAP_ENEMY_SPAWNS` in `maps.ts`
3. Add sprite art in `EnemyArt` in `IsoWorld.tsx`

### Adding a class ability
1. Add to `AbilityId` union in `types.ts`, `ABILITIES` in `classes.ts`, class `abilities` in `CLASS_BASES` in `maps.ts`
2. Status effects resolve automatically if they use existing condition names

---

**Compiled:** 2026-08-07 (v0.3)
**Builder:** Kimi (Moonshot AI)
