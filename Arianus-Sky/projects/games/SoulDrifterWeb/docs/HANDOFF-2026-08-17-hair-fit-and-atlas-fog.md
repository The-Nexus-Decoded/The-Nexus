# Handoff — 2026-08-17 — Hair fit finish + Atlas fog activation + v14 deploy

**For:** Codex (next session) · **From:** Kimi session · **Branch:** `codex/435-3d-asset-pipeline` @ `6cd669d1` (pushed)
**Game:** `Arianus-Sky/projects/games/SoulDrifterWeb` (The First Breach vertical slice)

---

## 1. Ground truth about this worktree

- The live game source is THIS worktree (`H:\CodexData\.codex\worktrees\fe93\The-Nexus-fleet-normalization`), not the older `The-Nexus-souldrifter-browser` checkout. The old checkout is stale (pre-PR-#431) — do not edit it.
- The repo root is the fleet monorepo; the game is at `Arianus-Sky/projects/games/SoulDrifterWeb`.
- Dev server: `node node_modules/vite/bin/vite.js --port 5174 --strictPort --host 127.0.0.1` from `SoulDrifterWeb`. Playwright probes use `http://127.0.0.1:5174/?debugSeed=2215682322`.
- ⚠️ **A long-running Vite process from 2026-08-16 was left serving a frozen in-memory snapshot** (files added after its start never served; `?t=` invalidation stamp frozen). It was killed 2026-08-17. If the game ever "ignores" your edits, check for a stale server on 5174 first (`netstat -ano | grep 5174`).
- ⚠️ Something ran git operations in this worktree at 2026-08-17 02:17 (branch checkout touched `main.ts`, `World3D.ts`, `presentation.ts`). Run `git status` before branching. Still uncommitted and NOT yours truly's: `SoulDrifterWeb/README.md` (modified), `SoulDrifterWeb/docs/3D_AI_STUDIO_CHARACTER_PIPELINE.md` (untracked) — in-flight work from another session, left untouched.

## 2. What shipped this session

### Commit `2c23401a` — shaved bald-cap fix + atlas Explore click fix
- **`src/game/presentation.ts`**: `applyModularAppearance` now calls `applyScalpVariant()`. The head texture `T_Superhero_Male_Ligh_ScalpSilver` paints the crown silver so buzzed/parted read as stubble — but on `shaved` it rendered as a silver bald-cap (the "horseshoe hair" complaint). Fix ships `T_Superhero_Male_Ligh_ScalpSkin.png` (skin-toned scalp) and swaps `material.map` per style: `shaved` → skin scalp; everything else → silver. Guards: async texture load race (`model.userData.scalpShaved`), silver map preserved in `material.userData.silverScalpMap` for restore. Detection matches material name `/human_skin/i` or map name `/ScalpSilver/i`.
- **New assets** (identical copies, both GLBs share the head texture):
  - `public/assets/3d/characters/human-shadowknight/T_Superhero_Male_Ligh_ScalpSkin.png`
  - `public/assets/3d/characters/elf-shadowknight-v2/T_Superhero_Male_Ligh_ScalpSkin.png`
- **`public/lore-atlas/app.js`**: `attachZoomPan`'s `pointerdown` called `stage.setPointerCapture()`, which retargets the subsequent `click` to the stage — silently eating every click on the **Explore/Lore view toggle and all map markers**. The fog-of-war Explore view could never activate; every prior "fog test" screenshot was actually the Lore view. Fix: skip capture when `e.target.closest("button, a, input, select, textarea, .marker")`.

### Commit `6cd669d1` — hair coverage fit
- The authored `SK_Hair_Buzzed` / `SK_Hair_Parted` shells stopped short of the nape and sat narrow on the skull → jagged bald patch on the lower back of the head, scalp band at the hairline.
- They are **skinned meshes** (`skin: 0` in the GLB) — node transforms are ignored at render. `fitHairCoverage()` in `presentation.ts` therefore rewrites **bind-space vertices**, expanding about the head bounding-box center: buzzed ×1.12 (dy −0.004, dz −0.004), parted ×1.10 (dy −0.004, dz −0.005). Runs once per geometry (`geometry.userData.coverageFit`), safe with `SkeletonUtils.clone` (shares geometry). `SK_Hair_Long` needed no fit.

## 3. How the scalp texture was made (pipeline note)

`T_Superhero_Male_Ligh_ScalpSkin.png` was generated, not hand-painted:

1. Crown UV triangles come from `crown_uvs.json` (produced by `dump_crown_uvs.py` — head polys with world z > 1.735).
2. Mask = crown triangles, expanded into adjacent silver-ish pixels (`R−B < 45`, BFS ≤ 90 px) then dilated (MaxFilter 11) to cover the anti-aliased grey paint rim. First attempts without the wide rim left a desaturated halo — the boundary ring must be true skin (R−B ≈ 88) or diffusion inherits grey.
3. Fill = full-res Laplacian diffusion (Jacobi iterations, ~1200) from the boundary — seamless, no flat-color patch.
4. Script: `souldrifter-thalenyr/playtest/repaint_scalp.py` in the Kimi workspace (`C:\Users\olawal\Documents\kimi\workspace`). Output also archived at `C:\Users\olawal\.codex\cache\souldrifter-3d-pipeline\custom-human-shadowknight\T_Superhero_Male_Ligh_ScalpSkin.png` next to the Blender source.

If the head texture is ever re-authored in Blender, regenerate or re-apply this variant or `shaved` regresses.

## 4. Atlas fog behavior (canonical, per DIR-4/4a)

- Sealed realms: full smoke + "🔒 is sealed" overlay, nothing interactive.
- Unlocked realm (Thalenyr): smoke veil, holes burned around explored/completed POIs (`computeHoles`: completed r=12, explored r=10, rumored r=6 faint, Soul Well always r=8), blurred `?` pins, `??? — uncharted` list rows, toast on fogged-pin click.
- Game state syncs via `src/game/atlasSync.ts` → `localStorage["souldrifter.atlasState.v1"]`; the iframe live-refreshes on storage events. Never demote locks/reveals there.
- "Preview All" / "Game State" review controls render only when NOT embedded (`window.self === window.top` check).

## 5. Verification (all done this session)

- `tsc --noEmit` clean after both commits.
- Playwright probes (scripts in `C:\Users\olawal\Documents\kimi\workspace\souldrifter-thalenyr\playtest\`): `hair-recheck.mjs` (creation preview vs in-game vs paper doll, per style), `atlas-fog-test.mjs` (in-game embed: Thalenyr explore fog + Arianus sealed). Captures under `playtest/hair-recheck/` and `playtest/atlas-fog/`.
- All 4 styles × beard verified matching across creation/in-game/doll. Fog verified standalone (`/lore-atlas/index.html`) and in the game iframe.

## 6. Deploy state

- **Branch pushed**: `codex/435-3d-asset-pipeline` → `origin` (`The-Nexus-Decoded/The-Nexus`) @ `6cd669d1`.
- **GitHub Pages** (`The-Nexus-Decoded.github.io`, repo cloned at `workspace\tmp-pages-deploy`): pushed `dcce95d` = v14, **game at root**. ⚠️ `npm run build` ends with `scripts/prepare-sites-build.mjs`, which rewrites `dist/client/index.html` into a `/play` redirect for the Cloudflare worker deploy — **that output breaks GitHub Pages** (Pages 404s `/play`; the live site sat broken like this since ~Aug 15). For Pages, deploy the raw `vite build` output instead.
- **Dist zip**: `workspace\souldrifter-first-breach-v12-dist.zip` (worker-deploy format, matches v11 convention).

## 7. Known rough edges / next candidates

- **Sideburn flaps**: the buzzed shell has chunky authored flaps in front of the ears at close zoom; invisible at gameplay camera, mildly scruffy in the doll. True fix is a Blender edit (`human-shadowknight-source-v3.blend`, pipeline dir above).
- **Silver-only palette**: hair/brows/beard are always `SK_hair_silver` — no color choice exists in creation. If variety is wanted, tint hair materials by lerp (same pattern as skin tone in `cloneActorMaterial`).
- **Legacy callings** (warrior/mage/etc. `.gltf` models) have no `SK_Hair_*` meshes — appearance choices only affect shadowknight avatars. Silent no-op elsewhere.
- **Elf v2** model shares the same head texture and hair-fit code paths; ear visibility is toggled via `SK_PointEar_*` for the legacy elf model only.
- `dist/client` chunk warning (>500 kB) — cosmetic, not addressed.

## 8. Quick resume checklist

1. `git status` (see §1 warnings) → `git log --oneline -3` should start at `6cd669d1`.
2. Kill anything on :5174, start fresh vite from `SoulDrifterWeb`.
3. Run `playtest/hair-recheck.mjs "shaved,cropped"` and `playtest/atlas-fog-test.mjs` for a 5-minute smoke test.
