# TICKET — BREACH-V2: Starting Zone rebuild (Level 01, the Breach) — true-3D, flat-map-first

**GitHub issue:** #451 · **Branch:** `codex/451-souldrifter-breach-v2` (cut from `qa` @ `a34fbfe9`, asset inventory transferred from `codex/450` @ `493fda26`)
**Runbook:** `docs/DUNGEON_BUILD_RUNBOOK.md` (read fully before starting)
**Style benchmark:** the Heartvale outdoor build on branch `codex/heartvale-outdoor`
**Chat brief:** work this ticket end-to-end; commit each sub-step; if the turn limit hits, the chat is resumed and continues the same ticket.
**Work location (owner directive 2026-08-20):** ALL code and worktrees live on the **H: drive** — C: is space-constrained. Use the ready worktree at `H:\CodexData\.codex\worktrees\breach\The-Nexus-breach-v2` or create one under `H:\CodexData\.codex\worktrees\<id>\` from the main checkout at `H:\Projects\AI_Tools_And_Information\The-Nexus` (`git worktree add` — no fresh full clone, no re-downloading history). Do NOT clone into `C:\Users\…\workspace`.

## 1. Precedence (what rules what)

1. **Owner rulings (2026-08-20) are the top authority** — including V14
   (Soul Well = small silvery two-way travel pool) and V15 (visual direction
   is TRUE 3D; isometric framing dropped).
2. **This ticket + `DUNGEON_BUILD_RUNBOOK.md`** govern topology, workflow,
   and acceptance.
3. **`LEVEL_01.md` / `GAME_BIBLE.md` / the #450 handoff** supply canon cast,
   tutorial beats, systems, and fidelity/licensing constraints **only where
   they do not conflict with 1–2**. The V2 topology in this ticket overrides
   older topology wording.
4. The rejected #450 Houdini scene, the old concept image, and earlier
   compositions are **not design references**. Historical failure lessons
   (§7) are required reading.

**Camera note (conflict resolution):** the #450 handoff lists
"isometric/orthographic presentation" as a carryover constraint. Owner
ruling V15 supersedes it: match the Heartvale outdoor build's true-3D look.
**"True 3D" means the same stack and visual language as the Heartvale zone
preview: Three.js with a perspective 3D camera, PBR materials, real-time
lighting + AO, continuous geometry with the gameplay grid hidden
underneath** — the dungeon should feel like walking from the Heartvale
meadow straight into a cave. What DOES carry over from the old rule: the
failure lesson behind it — the logical gameplay grid must stay hidden under
a visually continuous environment; no visible repeated floor/wall cells at
gameplay distance.

## 2. Goal

Rebuild the starting zone (Level 01, the Breach) as a true-3D indoor zone
matching the Heartvale outdoor standard, flat-map-first, reusing the
transferred 3D AI Studio asset inventory. The current Level 01 keeps working
untouched until the owner signs off on the replacement (runbook §6.2).

## 3. Layout (owner-specified topology, canon cast mapped in)

1. **Realm-Lock Vestibule / training room** (fixed) — the start area. The
   player **awakens from the Soul Well**: a small circular pool of silvery,
   glowing, machine-like liquid (V14 — the two-way realm-travel substance),
   with a credible player-emergence point. Tutorial beats in this room:
   - **Wellkeeper Ilyra** presents the Chronicle of Returning and the
     SoulDrifter mission
   - **Memory Loom** (the TRUE loom — an altar/statue substitute is invalid):
     allocate exactly 3 stat points, 1 ancestry boon, 1 base-calling
     discipline
   - **Wayfarer's Coffer** + starter equipment inspection
   - **True training effigy**: rehearse level-one actions
2. **Two doors** — two separate physical exits: **Wayfarer (easy path)** and
   **Oathbreaker (hard path)** — difficulty presets, not separate maps.
   **Breach Scout Orren** and **Arena Warden Brannoc** occupy the safe
   threshold plaza before the doors (guide beat before the choice).
3. **Randomized middle** — each path runs its own seeded room pool:
   **exactly 3–5 connected gallery chambers per run** (canon count), drawn
   only from the chosen path's pool (easy rooms never appear on the hard
   path). Hard path: tighter rooms, denser spawns, better loot table.
4. **Convergence → Ashen Lock** (fixed boss suite) — both paths rejoin at
   the ante-room, then the boss room: **the Cinderbound Warden**, the one
   boss of the starting zone, with difficulty/reward following the chosen
   preset. Architecture must not preclude boss sets later (higher dungeons
   roll e.g. 3 of 6), but BREACH-V2 ships exactly one.
5. **First Memory + exit Connector** — the First Memory is recovered once,
   then the route opens out of the Breach into **Heartvale hv-1 (Soul Well
   Basin)**. The transition must read as one continuous world with the
   outdoor build (lighting, materials, scale) — the player's first outdoor
   moment.

Corruption language: breach corruption (silvery/machinic accents +
breachling growth) is densest at the Ashen Lock and fades toward the
Vestibule, which reads cleanest. Mortal-tier only (levels 1–19).

## 4. Asset manifest (transferred to this branch 2026-08-20)

| Asset set | Location | Contents |
|---|---|---|
| Source environment models | `docs/3d-ai-studio/source-models/environment/` | 37 GLBs (42.5 MiB) |
| Optimized runtime models | `public/assets/3d/environment/dungeon-kit/` | 37 GLBs (3.6 MiB) |
| Reference sheets | `docs/3d-ai-studio/reference-sheets/environment/` | 37 PNGs |
| Floor/wall PBR maps | `public/assets/textures/environment/first-breach/` | 8 JPG maps |
| Runtime prop catalog | `src/game/environment/DungeonPropCatalog.ts` | 38 logical IDs + placement metadata |
| Prop loader | `src/game/environment/DungeonPropKit.ts` | Three.js loading/prep hooks |
| Soul Well runtime behavior | `src/game/environment/rooms/SoulwellChamber.ts` | reusable pool behavior |
| Provenance/credits | `docs/3d-ai-studio/dungeon-completion-kit-register.json` | 16 completion assets, hashes, credits |
| Fidelity + licensing rules | `docs/FIRST_BREACH_REBUILD_RUNBOOK.md`, `docs/HOUDINI_FIRST_BREACH_PIPELINE.md` | required reading |
| GLB optimizer | `scripts/optimize-dungeon-kit.py` | reusable |

Known gaps (build these custom or defer): `hanging-brazier` reuses
`floor-brazier.glb`; `sack-bundle-cluster`, `rope-coil-and-hook`,
`loose-books-and-scrolls-pile` never existed; no banner/painting/relief
family; **the Memory Loom, training effigy, Soul Well liquid, and First
Memory are custom gameplay landmarks — not in the 38-prop kit.**

## 5. Hard constraints (carryover, non-negotiable)

- **Credits:** balance 819, hard minimum 800. **No paid provider operation
  (generation, texture, rig, animation, remesh, purchase, retry) without a
  new exact-cost owner approval.** Do not regenerate existing assets merely
  to change level design.
- **Licensing:** Houdini Apprentice is non-commercial; `.hipnc` cannot run
  in the browser. Shipping assets need an approved licensed Houdini or
  Blender export path; Three.js is the runtime.
- **Fidelity:** preserve source GLB geometry + PBR channels 1:1 through
  Houdini and Three.js (base color/normal/metallic/roughness/occlusion/
  emissive/opacity/UVs/factors; glTF combined maps: G=roughness, B=metallic).
  Intentional recolors require separately named/versioned variants + owner
  approval.
- **Characters/monsters:** #448 / draft PR #449 own Ilyra/Orren/Brannoc
  faces, monsters, rigs. **Do not regenerate them under #451.**
- **Build budget:** production 150 MiB cap enforced; document renderer
  statistics (the rejected scene hit 2,211 draw calls / 3.78 M triangles —
  stay far under).

## 6. Randomization rules (from the #450 failure record — binding)

- Layout seed controls topology/chambers/encounters; dressing seed may vary
  environment detail. Same seed → same result. **Keep seed `4182` as the
  direct comparison seed.**
- Randomization selects **legal room configurations / placement sockets** —
  never scatters arbitrary large objects into open cells.
- `roomId` is NOT exact spatial membership (passage cells inherit adjacent
  room IDs — that bug put room props in passages). Use exact zone/polygon
  membership.
- Mandatory story objects stay semantically fixed; nothing may block doors,
  NPCs, spawns, combat space, quest objects, or the boss/reward route on ANY
  seed. Validate sparse, median, and dense representative seeds.
- Placement metadata minimum: zoneId, roomId, type, facing/normal, footprint
  + height, clearance, blocking, allowed/forbidden tags, distances from
  doors/paths/spawns/interactions/combat centers.

## 7. Failure lessons (do not repeat)

Visible repeated floor/wall cells (read as tile map) · generic boundary-cell
placement · roomId leakage · Loom/effigy substituted with wrong assets ·
gates unconvincing · assets hidden/off-camera/too dark/mis-scaled · skirmish
and boss views collapsing to black · scatter instead of legal configurations
· viewport/Houdini/Three.js mismatch · full scripted iterations before the
owner approved a visual direction.

## 8. Deliverables (in order)

1. **Flat map** of the whole starting zone (runbook §1): Vestibule with Soul
   Well pool / Ilyra / Loom / coffer / effigy, threshold plaza + two doors,
   the full EASY and HARD room pools (every room at true size), Ashen Lock
   suite, First Memory + exit Connector, spawn/loot/prop tables, meter scale
   bar. PNG master in the workspace, 1600px WebP in repo.
2. **Dungeon registry** — rooms, paths, pools, boss set (1), tables, seed
   policy (runbook §3).
3. **Seeded generator** + §4 invariants as vitest: reachability on a seed
   sweep (incl. 4182), 3–5 chambers per run, pool separation, door/socket
   integrity, no blocked criticals.
4. **Houdini build** of the interior (one continuous shell per runbook §5),
   LOD glTF exports, textures/materials to the outdoor standard.
5. **Runtime exports** to `public/data/dungeons/breach-v2/`.
6. **Runtime preview** at `?dungeonPreview=breach-v2` (+ `&seed=`) with
   review hooks; probe renders: Vestibule (Soul Well pool readable), an
   easy-path run, a hard-path run (different seed), Ashen Lock, the exit
   Connector view into Heartvale.
7. **Session handoff doc** + independent review gate (runbook §7) BEFORE the
   owner is shown.

## 9. Acceptance

- All runbook §8 "Done =" criteria, plus: `yarn test`, `yarn typecheck`,
  `yarn build`, `yarn verify:release`, `git diff --check` pass; zero console
  errors / failed asset requests / missing textures; documented renderer
  stats; darkness never blocks navigation, enemy readability, or required
  interactions.
- Two doors are physically distinct and functionally correct; easy vs hard
  is meaningful on multiple seeds; First Memory awarded exactly once.
- Soul Well reads and functions as the small silvery glowing pool (V14).
- Source/Houdini/Three.js material identity preserved for every used model.
- The exit-into-Heartvale moment reads as one continuous world.
- Owner plays the preview and signs off. Only then does replacing the
  current Level 01 get scheduled (separate ticket, behind a flag).

## 10. Explicit non-goals (this ticket)

- No replacement of Level 01 in the main flow (sign-off first).
- No character/monster/face/rig regeneration (#448 / PR #449 own that).
- No multiplayer wiring (mp base layer lands separately; the registry just
  must not contradict world-frame meters).
- No new boss content beyond the Cinderbound Warden.
- No paid provider operations of any kind without exact-cost approval.
