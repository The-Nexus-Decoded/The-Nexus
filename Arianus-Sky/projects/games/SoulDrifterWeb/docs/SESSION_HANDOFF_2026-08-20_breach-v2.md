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

## Open issues (owner rulings needed)

1. **Build size:** RESOLVED by owner ruling 2026-08-20 — no fixed deployment budget for
   now; the prune step reports dist size (155 MB) without failing the build. Budget language
   removed from the runbook/ticket/pipeline docs accordingly.
2. **Kit triangle density:** probe reads 2.5–3.4 M tris (755–1150 calls). Under the rejected
   #450 scene (3.78 M / 2,211) on both axes, but a kit decimation/instancing pass would help.
   Do not regenerate assets (credit rules) — runtime-level optimization only.
3. **Corridors between chambers are dim** (no fixtures there by design); rooms carry the light.
   If the owner wants lit corridors, add sconce sockets to the registry.
4. **NPC/enemy/boss markers** are placeholders by design — #448 / PR #449 own Ilyra/Orren/
   Brannoc faces, monsters, rigs. The Warden is an anchor ring + ember light only.
5. **Wall art:** atlas/section/zone maps are mounted and readable. The remaining reliefs/
   banners/paintings are labeled placeholders pending local-GPU art (Add-on A rule 2 —
   no paid ops). Book/scroll props are texture-based blocks pending local covers.
6. **Preview is visual review only** — gameplay wiring (interactions, combat, tutorial flow)
   stays in Level 01; replacing it is the separate post-sign-off ticket behind a flag.

## Next sub-steps if resumed

- Deliverable 7 follow-through: independent review gate (fresh session, brief in the REVIEW doc).
- Any rework the owner requests from the renders (doors, lighting, corruption density, …).
- Add-on A art production on local GPU (reliefs/banners/book covers) once the owner approves the look.
