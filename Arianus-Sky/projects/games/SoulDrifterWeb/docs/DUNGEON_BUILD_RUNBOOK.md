# RUNBOOK — Building a Dungeon / Indoor Zone (SoulDrifter world-building contract)

**Status:** owner-approved workflow, 2026-08-20. Applies to every indoor
zone: the starting zone (Level 01, the Breach — see `docs/TICKET-BREACH-V2.md`),
caves, ruins, towers, and all future randomized dungeons.

Companion docs: `docs/3d-ai-studio/README.md` (asset budgets + pipeline),
`docs/3d-ai-studio/3D_AI_STUDIO_CHARACTER_PIPELINE.md` (characters).

---

## 1. The flat-map-first rule (non-negotiable)

Every indoor zone starts with a **flat 2D map**, authored exactly like our
outdoor zone maps, BEFORE any 3D work begins. This is the same discipline
that produced the Thalenyr atlas and the Heartvale section map: art first,
measure from the art, then build.

The flat map shows **ALL content that can exist in the dungeon** — including
content that will be randomized at runtime:

- every fixed room (start/training, boss suite, Connectors)
- every room in every randomization pool, drawn at true relative size
- path/door logic (branches, convergences, one-way gates, locked doors)
- boss set (all possible bosses, and how many appear per run)
- spawn areas, encounter anchors, loot/prop tables, per room or per pool
- scale bar in real meters (indoor zones use the same meters discipline as
  the world frame — no invented local units)

"Randomized" never means "undocumented": if a room, boss, enemy, or prop can
appear in the dungeon, it appears on the flat map and in the registry. The
RNG only chooses *which subset and which order* — never *what exists*.

## 2. Fixed anchors vs randomized middle (the architecture)

Every dungeon has three structural layers:

1. **Fixed start area** — authored room set (e.g. the training room). Same
   every run. Tutorial/beats live here.
2. **Randomized middle** — one or more PATHS, each an ordered sequence of
   rooms drawn from that path's authored **room pool**. Branch points are
   explicit (doors); paths may converge before the boss.
3. **Fixed boss suite** — ante-room + boss room, authored architecture, same
   every run. **Which boss appears** is rolled from the dungeon's boss set.

Path/branch example (the starting zone, from the owner): training room →
**two doors** (easy path / hard path) → each path runs its own randomized
room set → paths converge → boss room (1 boss) → exit Connector.

Boss-set example (higher-level dungeons, from the owner): a dungeon with
**6 possible bosses shows 3 per run**, rolled per seed.

## 3. The dungeon registry (single source of truth)

Like `server/sections.mjs` for the world map, every dungeon has one
registry module (`<dungeon>-registry.mjs`) derived from the flat map:

- room definitions (id, kind, pool, true meter dims, door sockets)
- path definitions (id, difficulty tag, pool, min/max rooms, convergence)
- boss set (ids, per-run count, weights)
- spawn/loot/prop tables per room/pool
- seed policy + validation invariants

The builder never invents numbers that contradict the registry; reviewers
verify the registry against the flat map (measured-only, like POI anchors).

## 4. Seed discipline + validation invariants

- Seeded RNG (mulberry32 lineage, as in `src/game/dungeon.ts`); the seed is
  recorded per run so any layout can be reproduced for support/bugs.
- Invariants covered by vitest (the existing dungeon tests are the pattern):
  - **reachability** — start → boss → exit connected on EVERY seed
  - every objective and encounter reachable (no orphaned content)
  - path difficulty tags honored (easy pool rooms never appear on the hard
    path; boss count matches the set rule)
  - room pool exhaustion rules (no duplicate rooms unless the pool allows)
  - door/socket integrity (every room connects through real door sockets)

## 5. Build pipeline (same as Heartvale, adapted indoors)

1. **Flat map** authored + checked in (source of the registry).
2. **Registry** derived from the map (meters, pools, tables).
3. **Houdini build** — the interior shell + dressing authored from the
   registry as ONE continuous build per floor/level (rooms share walls,
   floors, and light continuity, exactly why Heartvale was authored whole).
4. **Runtime exports** — geometry/LOD glTFs, textures, splat/material maps,
   and the data JSONs (registry instance, spawn tables) to
   `public/data/dungeons/<dungeon-id>/`.
5. **Runtime preview** — `?dungeonPreview=<id>` route with review hooks
   (`window.__dungeonScene` etc.), same pattern as the Heartvale preview.
6. **Assets** — reuse the 3D AI Studio inventory FIRST (see the ticket's
   asset manifest; existing breach work lives on branches
   `codex/448-souldrifter-first-breach-models` and
   `codex/450-houdini-apprentice-first-breach`). Asset policy: original or
   licensed/CC0 only, recorded in `third-party-assets.json`. No
   Ultima-derived data, ever.

## 5A. In-world readable art (owner directive 2026-08-20)

Dungeons should feel lived-in, and walls are lore surfaces. Every dungeon
includes **readable wall art and documents** — paintings, banners, reliefs,
books/scroll piles, and especially **MAPS OF OTHER ZONES** (e.g. the
Thalenyr atlas, the Heartvale section map) that the player can ZOOM INTO AND
ACTUALLY READ. The training room / start area of each dungeon is the
priority location (new players should be able to study the world map there).

Rules:

1. **Local-GPU generation is the approved path for new art assets** — no
   paid provider credits (owner directive). Textures are generated locally,
   recorded in `third-party-assets.json` like any other asset.
2. **Reuse existing map art first** — the atlas/zone map masters already in
   the repo/workspace are zero-cost, canon-accurate wall maps; mount them as
   framed textures.
3. **Texture-based, not 3D-generated:** wall art ships as PBR-textured
   planes/frames (diffuse + normal + roughness), not new 3D models — cheap
   on size and draw calls. Frames may reuse kit geometry.
4. **Readability is the acceptance bar:** the art must stay legible at the
   runtime's closest zoom (texture resolution and texel density sized for
   it — e.g. a 1 m wall map wants ≥ 1024px; label text must be crisp, not
   generated gibberish — compose real labels over generated backgrounds,
   never ask an image model to render text).
5. Wall art is a **prop-socket category** on the flat map (`wall-art`
   sockets with the artwork id named per socket), so it flows through the
   same registry → socket → validation pipeline as every other prop.

## 6. Ground rules (inherited, non-negotiable)

1. **NEVER deploy to GitHub Pages / the live site.** Owner reviews locally.
2. `npm run typecheck` and `npm test` green at every commit. **Never break
   Level 01**: the v2 starting zone is built behind a preview route/flag and
   only replaces the current Level 01 on explicit owner sign-off.
3. Low-level magic boundary (canon): mortal-tier only in the starting zone.
4. Phone-width responsive + desktop both keep working; respect the 3D
   budgets in `docs/3d-ai-studio/README.md`.
5. Commit early, commit often; resume the builder chat on turn limit.
6. Never leave a dev server running when a task ends.
7. Visual direction is **true 3D** (owner ruling 2026-08-20 — the Heartvale
   outdoor look is the benchmark; isometric framing is dropped). The failure
   lesson behind the old isometric rule still binds: the logical gameplay
   grid stays hidden under a visually continuous environment — no visible
   repeated cells at gameplay distance.
8. Houdini Apprentice is non-commercial and `.hipnc` cannot run in the
   browser. Prototype freely, but shipping assets must go through an
   approved licensed Houdini or Blender export path; Three.js is the runtime.
9. No paid provider operation (generation, texture, rig, remesh, purchase,
   retry) without a new exact-cost owner approval.

## 6A. Runtime placement and room-quality gate

Every room must pass this gate in the actual walk camera before review. A
registry coordinate or an orbit screenshot is not proof.

1. **Continuous enclosure:** floors, both wall faces, lintels, and ceilings
   form a sealed interior. Looking up in walk mode shows the dungeon ceiling.
   No seam exposes another room, the world void, or the rest of the dungeon.
2. **Doors and gates:** every room transition has a visible door/gate seated
   squarely in its portal. Its closed face spans the opening (never edge-on),
   it starts closed when progression requires it, opens without clipping the
   wall, and its collision state matches its animation. Test at least one
   X-boundary and one Z-boundary door. Reserve a prop-free clearance envelope
   around every portal; wall art, banners, sconces, statues, and rubble may not
   overlap it.
3. **Wall-mounted assets:** bookshelves, racks, reliefs, paintings, sconces,
   and statues face into the room, sit flush to their supporting wall, and do
   not sit half inside it. Paired statues use the same forward direction.
   Wall dressing is authored with clearance between each footprint: a frame,
   sconce, banner, shelf, or rack may never overlap another wall asset. Do not
   mirror identical coordinates onto the opposite wall; stagger fixtures and
   art so the room reads as an inhabited place rather than a mechanical set.
   Record each imported asset family's source-forward axis and correct it once
   at the loader boundary; never compensate with unexplained per-instance yaw.
   Inspect wall-mounted assets from the front and both sides so a thin edge,
   exposed back, or wall intersection cannot pass as a correct placement.
4. **Lighting has a fixture:** flames originate inside a brazier/sconce/candle,
   never below it or on the floor. Both long walls receive authored light
   sources. Keep visible flames on every fixture but budget dynamic lights
   (normally one distance-culled sconce light on each long wall, two per wall
   in large tutorial rooms, and one brazier light per room) so fixture count
   does not multiply shader cost while important props remain readable.
5. **Surface ownership:** candelabras sit on tables, crates, or stands; rubble
   belongs against a damaged/collapsed wall; books and scrolls sit on shelves,
   tables, or intentional floor-reading areas. Nothing floats, presents a raw
   primitive, or uses placeholder white geometry in an owner build.
6. **Effects:** fire uses an irregular animated flame silhouette plus embers,
   not cones. Water is a continuous liquid surface with ripples/caustics and
   restrained splash particles, not a faceted triangle fan. Pool rims reuse
   the dungeon masonry language.
7. **Start/tutorial room:** provide imported chairs, a desk/table, chests,
   crates/boxes, shelves, and readable lore dressing. Tag representative props
   for future `inspect`, `open`, `move`, and `destroy` tutorials; preserve a
   clear walking lane from spawn to the first gate.
8. **Art content:** paintings and reliefs are newly authored in-world lore art
   based on book themes. Existing canon maps may be reused where readable.
   Never mount development screenshots, code, planning sheets, diagrams, or
   internal game notes as in-world art.
9. **Developer traversal:** dev warps must enter walk mode, place the avatar on
   a nearest valid nav point, and allow walking immediately. Include start,
   every room, boss, and exit targets plus door-open/close helpers; do not make
   testers edit the URL.
10. **Performance proof:** record renderer, draw calls, triangles, textures,
    frame time, and CPU/GPU utilization in a full walk. Local Playwright must
    use installed Edge/Chrome with hardware ANGLE/D3D11 and must abort on
    SwiftShader/llvmpipe. Close browsers in `finally`, enforce case timeouts,
    and never run multiple full matrices concurrently.

The visual pass is performed from player height through the entire seed on
both paths. It is an explicit room matrix, not a representative sample: list
every fixed room and every selected pooled room, then mark wide view, close
view, north/east/south/west wall check, door closed, door open, and traversal
PASS/FAIL. Review screenshots must include each closed doorway before it is
opened, its open state, each room interior, the boss suite, and the exit.
Generated coordinates and automated invariants never replace this inspection.
The owner must not be the first person to find an edge-on door, picture,
alcove, shelf, rack, statue, light fixture, or other misoriented scene asset.

### BREACH-V2 regression lessons (apply to every procedural dungeon)

- Audit **all asset families**, not only portals. BREACH-V2 defects included
  shelves, alcoves, statues, candelabra supports, weapon racks, wall art,
  flame anchors, water splashes, rubble, and the first-memory objective.
- Validate an imported asset's source-forward axis from front and side views
  before adding a global correction. A guessed 90-degree fix can turn a flush
  wall panel into a slab projecting into the room.
- Keep a portal-clearance envelope in generator data. BREACH-V2 route banners
  were technically on the correct wall but occupied the same coordinates as
  the closed door leaves; door-open screenshots alone concealed the defect.
- Give each portal exactly one visual/collision owner. Do not combine a static
  registry door, a procedural placeholder frame, and a runtime door system at
  the same socket. BREACH-V2 choice gates are runtime-owned imported 3D
  portcullises; static dressing never reserves their nav cells.
- For a generated branch choice, both route portals carry animated swirling
  mist. The selected gate must raise into one clean, capsule-width corridor
  that reaches chamber 1; its lighter mist is nonblocking. The unselected gate
  stays lowered behind denser mist and cannot be entered. Reversing the chosen
  path must reverse only gate access, not remove either portal treatment.
- Test branch thresholds with the real player radius at repeated points from
  inside the choice room to beyond the gate. A reachable endpoint cell alone
  is insufficient because an adjacent chest or prop can still block the
  capsule corners.
- Capture portal states only after hinge/lift animation reaches its final
  state. Gate motion must be elapsed-time based, not rendered-frame based;
  automation, mobile browsers, and background tabs may run at 1 FPS.
- Exercise the actual interaction path after every warp: confirm avatar world
  coordinates change to the destination, then confirm WASD and click-to-move
  both change them again. Clicking a gate toggles that gate; clicking nearby
  floor must remain click-to-move and must never close an already-open gate.
  A camera-only warp is a failure.
- Add registry tests for wall-art/fixture footprint clearance and for staggered
  opposing-wall coordinates. A screenshot-only check does not prevent the
  same collision or mirrored-layout defect from returning in another seed.
- Inspect effects from first-person range. Splash tubes, flame cards, and
  particle sprites that look restrained from isometric distance can become
  opaque placeholder shapes at player height.
- Preserve evidence for the exact generated seeds used by QA. At minimum use
  one seed covering every pooled variant across both routes, plus the fixed
  start, convergence, boss, memory, and exit rooms.

## 7. Review gate (mandatory)

Same gate as the outdoor zones: an independent reviewer (fresh session,
reviewer's brief) judges FRESH renders against the flat map and the canon —
renders not intentions, material/shader ceilings named, scale/frame
conformance verified against the registry, findings written to
`docs/REVIEW-<date>-<dungeon-id>.md`. The owner is never the first person
to catch a basic miss.

## 8. Done =

- Flat map + registry checked in and consistent (measured-only).
- `npm run typecheck && npm test` green incl. the §4 invariants on a seed
  sweep.
- Runtime preview live; probe renders: start area, one full easy-path run,
  one full hard-path run (different seeds), boss suite, exit Connector view.
- Review gate (§7) passed; `docs/SESSION_HANDOFF_<date>_<dungeon-id>.md`
  with evidence paths and open issues.
- Report to the owner with the preview URL and exactly what to click.
  **Do not deploy.**
