# Heartvale Zone Tickets (Section: Heartvale, Map: Thalenyr M-003)

One ticket = one Zone = handable to one agent. Every ticket MUST be executed
under `docs/ZONE_BUILD_RUNBOOK.md` (the zone-building contract) with numbers
from `server/sections.mjs` and `docs/THALENYR_SCALE_AND_SECTIONS.md` (v2
owner-approved cut, 2026-08-19).

World frame: origin at plate top-left, +x east, +z south, meters.
Walk-speed sanity: 1.5 m/s → 1500 m cell ≈ 16.7 min.

Suggested build order: **HV-1 → HV-2 → HV-3 → HV-5 → HV-4 → HV-6 → HV-7**
(start zone first, then its neighbors so seam checks always have a built
neighbor to test against).

---

## ZONE-HV-1 — Soul Well Basin (start zone) · STATUS: in progress (vertical-slice chat)

- **Rect:** x 4980–6240, z 2531.25–2970 (1260 × 439 m)
- **POIs:** Soul Well `(5437.5, 2648.4)` — Breach exit terrace, the zone anchor
- **Neighbors:** hv-2 (N), hv-3 (S), hv-5 (E), hv-6 (W)
- **Scope:** emergence terrace + arrival beat (per the vertical-slice
  runbook), basin terrain, the river running N→S through the zone, road N to
  Anwel and S to Vaeldor, start-area dressing. `markAtlasPoi("thalenyr","soulwell","completed")` on arrival.
- **Connectors:** "Anwel Ford" (river crossing on the N seam ≈ x 5437, z 2531 — coordinate with ZONE-HV-2); "Heir's Road" road crest on the S seam (≈ x 5600, z 2970 — coordinate with ZONE-HV-3).
- **Seam notes:** west edge (x 4980) borders hv-6's MID segment — open wilds
  ground, walkable to the line. East edge (x 6240) borders hv-5 — open field.
- **Multiplayer:** zone id `hv-1`; first zone to get the boundary-detection +
  pre-join crossover client work (reference implementation for all others).
- **Acceptance:** runbook §4–§7; terrace→Anwel and terrace→Vaeldor walks
  cross the N/S seams with no hitch and no loading.

## ZONE-HV-2 — Anwel & Lockroot Reach

- **Rect:** x 4980–6720, z 1552.5–2531.25 (1740 × 979 m)
- **POIs:** Anwel `(5437.5, 2441.4)` (river-town hub: dock edge, 4–6 buildings, greeter + vendor/rumor NPCs, rest point); Lockroot Vaults `(5830.1, 2078.9)` (root-choked exterior + sealed-door stub; interior is a separate follow-up ticket)
- **Neighbors:** hv-1 (S), hv-5 (SE), hv-6 (W)
- **Scope:** Anwel welcome beat → `explored`/`completed`; Lockroot exterior → `rumored`→`explored`; river continues through both POIs per map-reading rules; Lock-Inscription approach trail along the west treeline.
- **Connectors:** "Anwel Ford" (S seam, shared with ZONE-HV-1); "Lockroot trail" (unmarked wilderness crossing to hv-6, no dressing needed).
- **Seam notes:** south edge z 2531.25 meets hv-1 (x 4980–6240) and hv-5 (x 6240–6720) — two different landing zones along one edge; both segments must be seamless.

## ZONE-HV-3 — Vaeldor Crown

- **Rect:** x 4980–6240, z 2970–3375 (1260 × 405 m)
- **POIs:** Vaeldor `(5900.4, 3234.4)` — capital: walls, gate hub, well-stone plaza ("all roads measured from it"), 2 NPCs max, one Lockroot rumor. Interiors deferred.
- **Neighbors:** hv-1 (N), hv-4 (S), hv-6 (W), hv-7 (E)
- **Scope:** capital exterior + gate hub; the meeting-of-the-rivers confluence is IN this zone (south of the city per the plate) — both river branches must align with hv-1/hv-4/hv-7 water at the seams.
- **Connectors:** "Heir's Road" N side (shared with ZONE-HV-1); "Vaeldor Gate Road" S seam ≈ x 5400, z 3375 (shared with ZONE-HV-4); east road toward Greshgarth exits via hv-7 (road stub to the E seam ≈ x 6240, z 3150).
- **Seam notes:** smallest zone — player load will be highest here (capital); expect to see shards `hv-3#2+` in practice.

## ZONE-HV-4 — Thalen's Heir

- **Rect:** x 4980–6240, z 3375–4252.5 (1260 × 878 m)
- **POIs:** Thalen's Heir `(5127.0, 3503.9)` — second settlement, shepherd/weir motif, one NPC song verse hook. `explored` on entry.
- **Neighbors:** hv-3 (N), hv-6 (W), hv-7 (E)
- **Scope:** settlement + river road running S toward Fenward (road exits the section at the S edge z 4252.5 — stub, Fenward Mires is a future section); south wilds dressing.
- **Connectors:** "Vaeldor Gate Road" (N seam, shared with ZONE-HV-3); "Fenward road" (S edge, section exit stub).
- **Seam notes:** the river meanders near the west seam — verify water alignment against hv-6's build in one scene.

## ZONE-HV-5 — Erboug Stones

- **Rect:** x 6240–7680, z 2531.25–2970 (1440 × 439 m)
- **POIs:** Echoing Stones `(6591.8, 2812.5)` — standing-stone ring; Law-of-the-Echo inspect interaction (echo-glow tied to First Memory). `explored` on discovery.
- **Neighbors:** hv-1 (W), hv-2 (NW), hv-7 (S)
- **Scope:** open-field rise + stone ring + field dressing; east edge x 7680 borders the Greshfar Plains (future section) — open ground, road stub toward Greshgarth.
- **Connectors:** field crossings only; "Greshgarth road" E edge stub (coordinate with ZONE-HV-3's east road via hv-7).

## ZONE-HV-6 — West Vale Wilds

- **Rect:** x 4320–4980, z 1552.5–4252.5 (660 × 2700 m) — the long strip
- **POIs:** Lock-Inscription Fragment `(4851.6, 1687.5)` (northern end, riverside; mystery dressing, ties to Lockroot lore)
- **Neighbors:** hv-2 (E, top segment), hv-1 (E, mid), hv-3 (E, lower), hv-4 (E, bottom) — **four landing zones along one edge**; crossing lands by coordinates (`zoneAt`), not by trail.
- **Scope:** forest wilds corridor, wildlife/vermin dressing (mortal-tier, 1–2 encounters max), the river's western bank stretches, Fragment POI.
- **Connectors:** "Anwel Ford" west side (with HV-1/HV-2); otherwise unmarked wilderness crossings along the whole east edge.
- **Seam notes:** west edge x 4320 borders the Thalholt (future section) — deep forest continues; do not wall it.

## ZONE-HV-7 — East March

- **Rect:** x 6240–7680, z 2970–4252.5 (1440 × 1283 m)
- **POIs:** none (wilderness march) — dressing only
- **Neighbors:** hv-3 (W, upper), hv-4 (W, lower), hv-5 (N)
- **Scope:** open march/plains terrain, the east road carrying Vaeldor→Greshgarth traffic (through-road, never dead-ends), light encounter dressing.
- **Connectors:** "Greshgarth road" (runs W→E across the zone; E edge x 7680 exits toward the Greshfar Plains section — stub).

---

## THALENYR-SECTIONS-01 — Cut + ticket the remaining Thalenyr sections · STATUS: BLOCKED

**Blocked until:** the Heartvale slice is fully implemented in-game and the
seamless zone traversal works as designed (owner sign-off after playtest).

**Then:** repeat the Heartvale pipeline for each remaining section of the
M-003 landmass — Thalholt, Gullscar Coast, Fenward Mires, Morvane Highlands,
Greshfar Plains, Korvel Reaches, Kalthorn Spine, Solmir Coast, Mirchain
Isles: measure the painted landmass, draw a POI-safe zone cut (boundaries
through empty terrain), get owner review of the cut visual BEFORE coding,
register zones in `server/sections.mjs`, and write one ticket per zone using
this file as the template.
