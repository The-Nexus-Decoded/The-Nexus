# Map & Art Asset Delivery Convention

Hard-won rule — following it keeps the runtime under the **150 MB build
budget** (`scripts/runtime-asset-manifest.json`). The budget was ~97% full
before the flat travel maps landed; raw PNG art will fail the build gate.

## The pipeline

1. **Masters live outside the repo.** Full-resolution PNG masters (2048×1152
   or larger) are kept in the local workspace
   (`Documents\kimi\workspace\souldrifter-thalenyr\flatmaps\`), never in
   `public/`. They are the archival source for any future re-export.
2. **Ship WebP, not PNG.** Runtime copies are exported at **1600×900, WebP
   q75** (`PIL`: `resize(..., LANCZOS)` → `save(out, quality=75, method=6)`).
   All 22 landmass plates total **3.96 MB** — vs 87.3 MB as PNGs (22×).
3. **Landing paths**:
   `public/lore-atlas/assets/maps/landmasses/<realm>/<landmass-id>.webp`,
   referenced from `detail:` fields in `public/lore-atlas/data.js`.
4. **Never commit "preservation copies"** of superseded art into `public/`.
   Old versions are recoverable from git history; doubled asset trees are
   what broke the budget in the first place.

## Why

- PNG is lossless; painterly art (watercolor, hatching, grain) is
  high-entropy and barely compresses (~7 MB raw → ~4 MB PNG per plate).
- Lossy WebP at display resolution is visually identical in the atlas UI
  (plates render at ~950 CSS px wide) and passes CI.
- The build's prune step deletes declared-optional assets; landmass plates
  are **not** in `excludeGlobs`, so they count fully against the cap.

## Checklist for new map art

- [ ] Master saved to workspace (not the repo)
- [ ] Export: 1600×900 WebP q75 (or smaller if the display slot allows)
- [ ] Copied to the correct `assets/` path; data reference updated
- [ ] `npm run build` passes (budget JSON prints `ok: true`)
- [ ] Total added weight < 1 MB unless the manifest maintainers approve more
