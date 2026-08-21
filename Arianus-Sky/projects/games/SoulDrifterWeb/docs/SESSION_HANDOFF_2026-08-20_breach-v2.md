# SESSION HANDOFF — 2026-08-20 — BREACH-V2 (issue #451)

Branch: `codex/451-souldrifter-breach-v2` · Worktree: `H:\CodexData\.codex\worktrees\breach\The-Nexus-breach-v2`
Builder: Kimi (this session) · Contract: `docs/DUNGEON_BUILD_RUNBOOK.md` + `docs/TICKET-BREACH-V2.md`

## State: deliverables 1–6 complete, review gate reached

| # | Deliverable | Status | Commit |
|---|-------------|--------|--------|
| 1 | Flat map (whole zone, true meters, all pools/tables, scale bar, kit placement, wall-art sockets) | ✅ v3 pushed | `cfbbcd99` |
| 2 | Dungeon registry (`src/game/dungeons/breach-v2-registry.mjs`, derived measured-only from the map) | ✅ | `270a224e`, `c24e5545` |
| 3 | Seeded generator + §4 invariants (vitest, 500-seed sweep ×2 paths, seed 4182 pinned) | ✅ | `d879ea38` |
| 4 | Houdini build (continuous shell + kit, Apprentice 22.0.368 headless) | ✅ prototype | `c60dc575` |
| 5 | Runtime exports (`public/data/dungeons/breach-v2/` + wall-art textures) | ✅ | `ecb135da` |
| 6 | Runtime preview `?dungeonPreview=breach-v2` + probe renders | ✅ | `d5832c7c` |
| 7 | Session handoff + review gate | this doc + `docs/REVIEW-2026-08-20-breach-v2.md` | — |

Checks at HEAD: `npm run typecheck` green · `npm test` 171/171 green · `npm run verify:release` ok ·
`git diff --check` clean. Level 01 untouched (preview lives behind the flag).

## How to review (local, never deploy)

```powershell
cd H:\CodexData\.codex\worktrees\breach\The-Nexus-breach-v2\Arianus-Sky\projects\games\SoulDrifterWeb
npm ci; npm run dev   # then open:
```

- `http://127.0.0.1:5173/?dungeonPreview=breach-v2&seed=4182&path=wayfarer&cam=vestibule` — the training room (Soul Well pool, Loom, atlas wall map)
- `&cam=plaza` — the two doors (cyan Wayfarer / ember Oathbreaker) + Orren/Brannoc markers
- `&cam=gallery` / `&cam=boss` / `&cam=exit` / `&cam=overview`
- `&path=oathbreaker` — the hard path; `&seed=7` (3 chambers) / `&seed=1` (4) / `&seed=2` (5)
- drag to orbit, wheel to zoom (the wall maps stay readable at close zoom — §5A bar)

Probe evidence (10-shot matrix, swiftshader headless): `workspace\souldrifter-thalenyr\playtest\breach-v2\`
(`<seed>-<path>-<cam>.png` + `probe-report-*.json`), probe script `breach-v2-probe.mjs` there.

Houdini review scene: `source-assets/houdini/breach-v2-apprentice.hipnc` (open with
`H:\Program Files\Side Effects Software\Houdini 22.0.368\bin\hmaster.exe`; prototype/review only —
Apprentice is non-commercial; shipping needs the licensed export path per runbook §6.8).
Rebuild: `node --experimental-strip-types scripts/houdini/export-breach-v2-layout.mjs 4182 wayfarer <out.json>`
then `hython scripts/houdini/build-breach-v2-apprentice.py <layout.json> <hip> <obj> . <workspace>`.

## Owner visual feedback applied (2026-08-20, second pass)

- Ashen Lock enlarged 24×18 → 30×22 m; **glowing rune circle** (ring + 12 rune marks,
  pulsing ember) at the seeded boss anchor socket.
- Soul Well rebuilt per owner: raised octagonal **stone basin** built into the ground,
  recessed **silvery shimmering water** (liquid, not neon), stone emergence step, smaller
  shard. Ilyra moved clear of the basin rim.
- Wall-map accent lights so the atlas/section/zone maps read at zoom (§5A).
- Walk mode: `&cam=walk` — WASD/arrows on the generator's own walkable cells (collision
  proven by the invariant suite), drag look, wheel zoom, Q/E rotate, shift sprint.
  Default preview stays the vestibule orbit preset; in-game walking waits for QA deploy.
- The whole level is open for the owner in the Houdini GUI (hmaster, crash-safe env vars):
  `source-assets/houdini/breach-v2-apprentice.hipnc`.

## Owner note 2026-08-20 (viewing surfaces)

- The level is open in the Houdini GUI (hmaster on the worktree scene) — crash-safe
  env vars used (HOUDINI_VULKAN_VIEWER_MULTITHREADING=0, HOUDINI_OCL_DEVICETYPE=CPU,
  HOUDINI_OCL_OGL_INTEROP=0).
- The live preview server runs detached on `http://127.0.0.1:5173/?dungeonPreview=breach-v2`
  (batch: `workspace\souldrifter-thalenyr\playtestreach-v2-preview-server.bat`;
  stop it by closing that window or killing the node process on port 5173).
- Walking the zone in-engine is game scope after QA deploy — not preview scope.

## Open issues (owner rulings needed)

1. **Build size:** RESOLVED by owner ruling 2026-08-21 — QA and production have a
   permanent 500,000,000-byte ceiling with a 475,000,000-byte preferred ceiling.
   Both `dist` and `dist-pages` are checked after runtime-asset pruning.
2. **Kit triangle density:** REAL-GPU probe reads 0.49–1.23 M tris (143–536 calls),
   53–61 fps — far under the rejected #450 scene. Instancing remains an optional follow-up.
   Do not regenerate assets (credit rules) — runtime-level optimization only.
3. **Corridors between chambers are dim** (no fixtures there by design); rooms carry the light.
   If the owner wants lit corridors, add sconce sockets to the registry.
4. **NPC/enemy/boss markers** are small ghosted placeholders by design (`&markers=0` hides
   them) — #448 / PR #449 own Ilyra/Orren/Brannoc faces, monsters, rigs.
5. **Wall art:** all named sockets ship real textures — the three map masters plus 11
   procedural in-house banners/reliefs/painting/scroll (zero credits, recorded in
   third-party-assets.json). Book/scroll props sit at correct elevations.
6. **Preview is visual review only** — gameplay wiring (interactions, combat, tutorial flow)
   stays in Level 01; replacing it is the separate post-sign-off ticket behind a flag.

## Next sub-steps if resumed

- Deliverable 7 follow-through: independent review gate (fresh session, brief in the REVIEW doc).
- Owner tests the draft PR in QA; do not merge until that approval arrives.
- Add-on A art production on local GPU (reliefs/banners/book covers) once the owner approves the look.
