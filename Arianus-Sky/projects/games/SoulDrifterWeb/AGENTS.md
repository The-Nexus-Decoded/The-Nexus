# SoulDrifter — Agent Bible (READ THIS FIRST)

**Every agent working on this game reads this file before touching anything.**
It is the canonical contract: quality bar, workflow, work locations, and the
never-do rules. It supersedes verbal/chat instructions where they conflict.
Runbooks and tickets extend it; they never replace it.

Repo: `The-Nexus-Decoded/The-Nexus` · Game root: this directory
(`Arianus-Sky/projects/games/SoulDrifterWeb`).

---

## 1. The Quality Bible (owner doctrine 2026-08-20 — non-negotiable)

These exist because each one was violated and caught in review. They apply
to EVERY zone, dungeon, village, prop, and scene you build:

1. **No overlaps, no floaters.** Items must not intersect each other or the
   terrain, and nothing floats. Everything sits on the ground, a foundation,
   or a mount, with correct clearances from doors, paths, spawns, and
   interactions. Verify by inspection at close range, not by assumption.
2. **Everything is properly textured.** Full PBR — diffuse + normal +
   roughness (+ AO where the set has it) — with the CORRECT texture for the
   material. Flat single-color surfaces are not acceptable at any distance
   the player can reach. **If you do not know which texture an item should
   use, ASK (the ticket or the owner) — never guess, never ship flat.**
3. **Complete, not half-done.** Finish every item you place: chimneys seated
   at the ridge with flashing (never spearing through roof slopes), doors
   with steps/stoops and frames (no gaps), windows seated (no voids),
   barrels/crates/benches properly placed (grounded, plausibly grouped,
   never scattered or intersecting). If a feature is started, it is finished
   before you commit.
4. **No placeholder substitutions.** NEVER substitute flat cones, cards,
   capsules, or primitives for real content (crops, plants, NPCs, furniture,
   items). If the real asset doesn't exist, say so and flag it for the
   placeholder tracker — do not fake it silently. Tracked placeholders live
   in `docs/HEARTVALE_PLACEHOLDER_TICKETS.md`.
5. **Evidence, not claims.** A commit message must match its diff. "Done"
   requires fresh renders (BOTH wide and close-up — failures hide at both
   scales) and green tests. Past chats have claimed entire work orders with
   48-line diffs; that is why this rule exists.
6. **It must read at gameplay distance AND at zoom.** Review-gate evidence
   includes street-level/close-up renders, not just beauty shots.
7. **Orientation is functional correctness.** Audit EVERY room and every
   placed asset family from gameplay view plus close front/side views. Doors,
   gates, pictures, reliefs, shelves, racks, statues, furniture, and fixtures
   must present their intended face to the player, sit square to their support,
   and fit the surrounding architecture. Maintain explicit source-axis
   corrections for imported assets. A coordinate, yaw value, or one wide
   screenshot is not proof; record the completed room-by-room inspection.

## 2. Work locations (owner directive — binding)

- **All code and worktrees live on the H: drive.** C: is space-constrained —
  never clone or work in `C:\Users\…\workspace`.
- Main checkout: `H:\Projects\AI_Tools_And_Information\The-Nexus`.
- **One branch + one worktree per ticket:** branch `codex/<issue>-<slug>`
  cut from the base branch the ticket names; worktree at
  `H:\CodexData\.codex\worktrees\<issue>\The-Nexus-<slug>` created with
  `git worktree add` from the main checkout. **Never a fresh full clone**
  (the repo history is > 1 GB — worktrees share it).
- Never commit ticket work to someone else's branch.

## 3. Workflow (how work gets done here)

1. **Tickets are GitHub issues.** Your ticket names your branch base, scope,
   constraints, and acceptance criteria. Read it plus every linked doc
   before starting.
2. **Flat-map-first.** Every zone/dungeon starts as an authored flat map
   showing ALL content (including randomized content) at true meters.
   Registries derive measured-only from the map — never invent numbers.
3. **Runbooks:** `docs/ZONE_BUILD_RUNBOOK.md` (outdoor zones),
   `docs/DUNGEON_BUILD_RUNBOOK.md` (indoor). Follow the taxonomy
   (Map → Section → Zone → Connector) and the world frame
   (`server/sections.mjs` is the scale authority).
4. **Tickets are end-to-end contiguous tasks.** Commit each completed
   sub-step (commit early, commit often — a crashed chat with uncommitted
   work is a process failure). If you hit a turn limit, you will be resumed;
   continue the same ticket from your last commit.
5. **Independent review gate.** Before the owner is shown ANYTHING, a fresh
   session reviews your fresh renders against the review checklist
   (`docs/REVIEW-2026-08-20-heartvale-hv1-v2.md` is the model). You are the
   builder, not the reviewer.
6. **Style direction (owner ruling, 2026-08-29): true 3D** — the Heartvale
   outdoor build is the visual benchmark for Three.js perspective rendering,
   PBR materials, real-time lighting + AO, and continuous geometry. SoulDrifter
   starts in isometric gameplay by default; players may zoom, rotate, or
   explicitly select another camera mode, but runtime navigation must never
   switch away from isometric on its own.

## 4. Never-do rules (hard stops)

- **NEVER deploy** to GitHub Pages / the live site. The owner reviews
  locally first, always.
- **NEVER break Level 01** (the current starting zone) — new starting-zone
  work lives behind preview routes until owner sign-off.
- **NEVER touch `public/lore-atlas/*`** — atlas state changes only via
  `markAtlasPoi()` at runtime.
- **No paid provider operations** (3D generation, textures, rigs, retries)
  without a new exact-cost owner approval. Local-GPU generation is the
  approved path for new art.
- **Asset policy:** original or licensed/CC0 only, recorded in
  `third-party-assets.json`. No Ultima-derived data, ever.
- `npm run typecheck` and `npm test` green at every commit. QA and production
  builds must remain below the permanent 500,000,000-byte ceiling enforced by
  `scripts/runtime-asset-manifest.json`; the 475,000,000-byte preferred ceiling
  preserves deploy-provider headroom (owner ruling 2026-08-21).
- Phone-width responsive + desktop both keep working.
- Never leave a dev server running when your task ends.
- Repo-wide: **never delete .md files** (root CLAUDE.md rule); don't write
  secrets into the repo.

## 5. Approved free asset sources (verify license per asset, record everything)

Pull from these FIRST before generating anything. Rules: prefer **CC0**;
**CC-BY** is fine with a credit entry; **CC-BY-SA / GPL / unknown licenses
need owner approval first**; every asset goes in `third-party-assets.json`
with source URL, license, and hash. No paid provider operations without
exact-cost owner approval; local-GPU generation is the approved path for
custom art. No Ultima-derived data, ever.

| Source | License | Good for |
|---|---|---|
| Poly Haven (polyhaven.com) | CC0 | PBR texture sets, HDRIs, props (already mirrored in `source-assets/polyhaven/`) |
| ambientCG (ambientcg.com) | CC0 | PBR materials/textures |
| Quaternius (quaternius.com) | CC0 | Animated low-poly models — animals, characters, creatures |
| Kenney (kenney.nl) | CC0 | Prop/environment packs, UI |
| Poly Pizza (poly.pizza) | CC0 / CC-BY (check per model) | Low-poly props, animals, furniture |
| Sketchfab (sketchfab.com) | Varies per model — verify (CC0/CC-BY ok; SA needs approval) | Higher-fidelity models |
| OpenGameArt (opengameart.org) | Varies — verify (no GPL without approval) | Sprites, textures, audio |
| Existing repo inventory | already cleared | Dungeon kit (38 IDs), Poly Haven sets, atlas map art — reuse FIRST |

## 6. Where things live (quick map)

| What | Where |
|---|---|
| World scale + zone registry | `server/sections.mjs` (rects, POI anchors, meters) |
| Heartvale layout (roads/rivers/anchors) | `public/data/zones/heartvale/layout.json` |
| Heartvale runtime (style benchmark) | `src/game/zones/heartvale/` — preview `?zonePreview=hv-1` |
| Local PBR texture sets | `source-assets/polyhaven/textures/` |
| Dungeon-kit props (38 IDs) | `src/game/environment/DungeonPropCatalog.ts` |
| Zone/dungeon runbooks | `docs/ZONE_BUILD_RUNBOOK.md`, `docs/DUNGEON_BUILD_RUNBOOK.md` |
| Review model + owner rulings | `docs/REVIEW-2026-08-20-heartvale-hv1-v2.md` |
| Placeholder tracker | `docs/HEARTVALE_PLACEHOLDER_TICKETS.md` |
| Active tickets | GitHub issues #451+ (branch per ticket, §2) |

*If anything in this file conflicts with a chat message, this file wins —
and tell the owner about the conflict.*
