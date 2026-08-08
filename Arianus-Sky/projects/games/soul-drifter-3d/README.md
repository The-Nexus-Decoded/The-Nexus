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

## What's in this milestone (v0.1)

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
