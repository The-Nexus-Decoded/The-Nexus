# SoulDrifter 3D — Death Gate Realms (Babylon.js)

Browser-native 3D rebuild of SoulDrifter on **Babylon.js 8** — no install, runs in a tab.
Ultima VI/VII-style presentation (isometric-orbit camera, flat + dither terrain,
brick-coursed walls, animated water, billboard sprites) with real-time 3D lighting,
shadows, and per-realm fog — and a direct path to Blender glTF assets later.

## Run

```bash
npm install
npm run dev      # dev server
npm run build    # production build (verified clean)
```

## What's in v0.3 (this milestone)

- **Character creation + profiles** (`src/ui/creation.ts`): full title → name →
  race → class → memory flow in the gump style. Profiles persist in localStorage
  (`souldrifter3d_profiles_v1`) with unique-name enforcement; returning drifters
  resume at their last map on refresh. Class picks show the generated class art.
- **4 AI-generated class sprites**: warrior, priest, sharpshooter, paladin
  (`public/sprites/class_*.png`) — the player billboard now matches your class.
- **Walk animation**: two AI-generated stride frames (`player_walk1/2.png`)
  swapped at ~7 fps while moving for the mage/drifter art; class art gets
  procedural hop + bob until its own frames are generated.
- **Dungeon dressing** (`src/realm3d/props.ts`): wall cap trim, corner pillars,
  stone arches with rune-glow lintels over every gate, wall torches with
  flickering point lights (capped per map), rubble near cracked stone, coral
  clusters and kelp strands in Chelestra.
- **Idle motion**: NPCs and enemies breathe/bob in place instead of standing
  as static cutouts.

## What's in v0.2

- **AI-generated character art** (`public/sprites/`): 16 painted JRPG-style sprites —
  player drifter, soul keeper, elder, priestess, scholar, merchant, innkeeper,
  tide lurker, drowned acolyte, reef stalker, chapel warden, rune sentinel, fire imp,
  magma beetle, basalt golem, training dummy. Transparent PNGs, watermark-stripped,
  alpha-cleaned, trimmed and optimized.
- **AI-generated realm sky domes** (`public/sky/`): painted panoramas for Arianus
  (floating islands), Chelestra (bioluminescent deep), Pryan (lava basalt) rendered
  as infinite-distance sky spheres.
- **Fixed upside-down billboards** (`invertY` texture flag).
- Procedural art remains as fallback for gates, essences, chests, memories.

## What's in v0.1

- **True 3D worlds** built from the shared map data (`src/soul-drifter/data/maps.ts`):
  all 8 maps — Arianus (spawn chamber, corridor, arena), Pryan (caldera),
  Chelestra (tide approach, Lumenhollow, drowned chapel, current trench).
- **Procedural Ultima-style textures** (`realm3d/textures.ts`): flagstone, cracked
  stone, planks, grass, sand, kelp, lava, soulwell runes, brick walls — all flat-tone
  + VGA dither, drawn on canvas at load.
- **Animated water** with drifting crests; sunken beds under deep channels.
- **Billboard characters/NPCs/monsters** painted procedurally (`realm3d/sprites.ts`):
  keeper, scholar, elder, merchant, priestess, gates, essences, lurkers, stalkers,
  acolytes, warden, sentinel, imps, beetles, golems.
- **Movement**: WASD/arrows (hold to walk, diagonal without corner-cutting) AND
  click-to-move with 8-dir BFS pathfinding. Camera follows; drag to orbit, wheel to zoom.
- **Interactions**: gates travel between maps (with fade), NPCs give lore dialogs
  (Sundering, Naga, Wind Walkers — from The-Nexus lore), essences/memories/items toast,
  objectives tracker ticks off as you explore.
- **Realm ambience**: per-realm fog density, sky/ground light colors, sun tint
  (Pryan hot, Chelestra teal, Arianus bright).

## Not yet (next milestones)

1. Tactical combat port (the full combat engine is already in `soul-drifter/game/combat.ts`)
2. Character creation + profiles/saves (exists in the 2D version)
3. Shops, inn rest, Elder quest chain logic
4. Realm laws enforced (underwater vision radius, riptide drag, heat hazards)
5. Blender glTF characters/props replacing billboards

## Layout

| Path | Purpose |
|---|---|
| `src/realm3d/game.ts` | Engine orchestrator: scene, camera, lights, fog, travel, dialogs, HUD |
| `src/realm3d/world.ts` | Map grid → 3D meshes (ground, walls, water, glows) |
| `src/realm3d/textures.ts` | Procedural ground/wall textures |
| `src/realm3d/sprites.ts` | Procedural billboard art (characters, NPCs, monsters, gates) |
| `src/realm3d/player.ts` | Player controller: WASD, BFS click-move, name tags, blob shadows |
| `src/soul-drifter/` | Shared game data + combat engine (same as the 2D version) |
