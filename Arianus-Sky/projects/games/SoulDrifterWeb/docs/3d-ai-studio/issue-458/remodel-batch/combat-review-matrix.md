# Combat Review matrix — four-view Breachling bodies vs the human, every weapon set (issue 458, lane L4b)

Measured through the game's own review tool: Motion Forge → Combat Review (`weapon-lab.html`), driven
headlessly by the same controller the panel uses (`COMBAT_REVIEW_DEFINITIONS`, `createCombatReviewActorLoader`,
`CombatReviewController.runSparMatrix` / `resolveContact`) against the exact pinned GLB bytes
(SHA-256 verified, real skin, rig and clips; only image decoding is stubbed on the CPU host).

- Suite: `tests/combatReviewBreachlingMatrix.test.ts`. The measured table is pinned as
  `tests/fixtures/combatReviewBreachlingMatrix.json` (488 rows, 44 pairs) and asserted row-for-row, so any asset,
  pack or tool change fails on the exact pair. A second independent run reproduced every row bit-for-bit.
- Bodies: `breachling-base-4v`, `breachling-stalker-4v`, `breachling-oathbound-4v`, `breachling-ravager-4v`
  (packs `COMPOSER_MOB_PACKS_FOURVIEW`, resolved through `composerPackForDefinition`), plus the four legacy
  composer bodies against the greatsword set as the comparison baseline.
- Weapon sets (all ten registered `LOADOUTS`): `longswordTwoHand` (greatsword), `shortswordOnly`, `staff`, `mace`,
  `bow`, `rod` (fire wand), `unarmedMagic`, `knife` (ritual knife), `daggerSingle`, `daggers` (paired).
- Both directions per pair: every Breachling attack (`BiteAttack`, `ClawAttack`, `LungeAttack`, `TailWhip`,
  `SpitAttack`) against the human, and every human attack, cast and source-bound ranged release of the set
  against the Breachling; plus a "death" row per direction (the first landing attack re-measured with the
  receiving side's Death clip).
- Per row: the strike window and its profile id (a Breachling window must be the registered composer pack
  revision, asserted by the suite; a human melee window is measured from the clip, a ranged window is the
  source-bound release binding), the measured mesh contact (`hit` at the confirmed sequence time / `miss` with the
  nearest in-window approach over every spacing tried, and the spacing it occurred at / `unavailable` with the
  tool's reason), the centre-to-centre spacing at which it landed (the spar ladder: the fitted spacing, then
  1.6, 1.4, 1.2, 1.0, 0.85, 0.7 m, then 2.5, 3.0, 3.5, 4.0, 4.5 m for attacks that carry the attacker past a
  close target), the side/weight the tool classified in the defender's frame, the clip it scheduled on the
  receiving side, the effect binding, and the verdict.
- Verdict rule (computed by the suite, not by hand): **PASS** only if a mesh contact was confirmed, the receiving
  response was scheduled exactly at the measured contact time (death: terminal), the scheduled clip actually
  expresses the measured side/weight (left/right/back clip for a sided hit; heavy clip for a heavy frontal hit;
  a plain light clip for a light frontal hit), the effect is bound (surface-anchored impact for melee; projectile
  stopped at the measured surface anchor with its damage type for ranged), the contact did not land behind the
  defender's root while the attacker stands in front, and the contact was not already present on the window's
  opening sample (a strike surface that touches the target the instant the window opens cannot be told from a
  body overlap at that spacing). Anything else is **GAP** with the measured reason. Nothing is marked PASS that
  was not sampled.
- Runtime: about 60–80 s per melee pair and 200–290 s per bow pair (the 36k-triangle Breachling skin is
  refitted at 120 Hz for every sample). The full file is ~1 h serial; record or verify it in parallel chunks with
  `MATRIX_BODIES=<id,...> MATRIX_LOADOUTS=<id,...>` (both comma lists), and re-record after an intentional change
  with `MATRIX_RECORD=<path>.json`, then merge the chunks into the fixture in catalog order.

## Headline

- Four-view bodies: **203 PASS / 234 GAP of 437 rows** (Breachling attacks 115 / 125 of 240; human attacks
  88 / 109 of 197). Legacy greatsword baseline: 19 PASS / 32 GAP of 51.
- Every Breachling `BiteAttack` and `ClawAttack` on every four-view body lands on every weapon set (80/80 contacts,
  front, at 1.2–1.85 m, all surface-anchored). The 33 Bite/Claw GAPs are all response-set gaps on the human side
  (the shortsword/mace and dagger sets carry only "Large" reactions; the greatsword set only one impact clip), not
  contact failures.
- `LungeAttack` lands on the Ravager against every set (10/10) but misses on the Stalker and Oathbound against
  every set (20/20) and on the base body against six of ten; `TailWhip` lands on the base (9/10) and Ravager (10/10)
  but misses on the Oathbound everywhere and reaches the Stalker only at 0.7 m (5/10), and then behind the
  defender's root at ankle height.
- `SpitAttack` is unavailable on all four four-view bodies (40 rows): the packs register no mouth vertices or aim
  and the tool now refuses to reuse the legacy base mouth basis (which produced a silently wrong aim, see fix 2).
- Human side: the fire wand's `MagicAttack02` bolt, the staff's low sweep/downward/horizontal strikes, the dagger
  and mace strikes and the greatsword jump attack land on the four-view bodies; the greatsword slashes, the
  bow's fixed flight and the upward-pitched casts mostly do not reach a 1.0–1.3 m tall quadruped (see gaps G and E).

<!-- generated sections start -->

## Summary counts


| Body | All rows | Breachling attacks (reaction + death) | Human attacks (reaction + death) |
|---|---|---|---|
| `breachling-base-4v` | 49 PASS / 59 GAP (108) | 34 PASS / 26 GAP (60) | 15 PASS / 33 GAP (48) |
| `breachling-stalker-4v` | 44 PASS / 65 GAP (109) | 22 PASS / 38 GAP (60) | 22 PASS / 27 GAP (49) |
| `breachling-oathbound-4v` | 43 PASS / 67 GAP (110) | 22 PASS / 38 GAP (60) | 21 PASS / 29 GAP (50) |
| `breachling-ravager-4v` | 67 PASS / 43 GAP (110) | 37 PASS / 23 GAP (60) | 30 PASS / 20 GAP (50) |
| `breachling-base` (legacy, greatsword only) | 6 PASS / 7 GAP (13) | 4 PASS / 2 GAP (6) | 2 PASS / 5 GAP (7) |
| `breachling-stalker` (legacy, greatsword only) | 2 PASS / 10 GAP (12) | 2 PASS / 4 GAP (6) | 0 PASS / 6 GAP (6) |
| `breachling-oathbound` (legacy, greatsword only) | 3 PASS / 10 GAP (13) | 3 PASS / 3 GAP (6) | 0 PASS / 7 GAP (7) |
| `breachling-ravager` (legacy, greatsword only) | 8 PASS / 5 GAP (13) | 3 PASS / 3 GAP (6) | 5 PASS / 2 GAP (7) |
| **Four-view total** | 203 PASS / 234 GAP (437) | 115 PASS / 125 GAP (240) | 88 PASS / 109 GAP (197) |
| **Legacy total** | 19 PASS / 32 GAP (51) | 12 PASS / 12 GAP (24) | 7 PASS / 20 GAP (27) |

GAP rows by cause (four-view bodies):

| Cause | Rows |
|---|---|
| miss | 116 |
| spit-unavailable | 40 |
| response-set | 38 |
| unbound | 24 |
| opening-sample | 10 |
| behind-root | 5 |
| response-set+behind-root | 1 |

## Tool fixes made in this lane (`src/review/weapon-lab`)

1. **Composer-pack Spit binding used the wrong flight end** (`combat-review-projectiles.ts`,
   `reviewProjectileBinding`). The binding took release `0.45 s` + the legacy `0.80 s` flight = `1.25 s`, but every
   composer-pack `SpitAttack` clip (legacy and four-view alike) is `1.200 s`, so `validateReviewContactProfile`
   rejected the profile ("Contact interval must lie inside the selected attack clip") before any Spit could be
   measured. The binding now honours the pack's own registered `spit.endSeconds` (1.20 s → a 0.75 s flight to the
   same three-cell plane) and states the flight length in its evidence. Existing expectations in
   `tests/combatReviewController.test.ts` and `tests/combatReviewProjectiles.test.ts` were updated to the pack value.
   The legacy Spit now lands on the human at 2.2–2.55 m on all four legacy bodies (PASS).
2. **Four-view Spit emission failed silently with a wrong aim** (`combat-review-projectiles.ts`,
   `createReviewProjectiles`). The Spit emitter builds its origin from the pinned legacy base mouth vertices
   `22577 / 2004` and a head basis frozen from the `1ddbd4` GLB. On the remodelled meshes those IDs are arbitrary
   rendered vertices, so the tool emitted from an off-centre point with a garbage pitch (measured at the release
   frame, actor frame: base-4v origin 0.18 m off the mid-line, pitched 12° down; stalker-4v pitched **57° up**;
   oathbound-4v 17° down; ravager-4v 29° down; the legacy base is 15° up from a centred snout point). The emitter now
   fails closed for `body: "fourview"` packs with the reason *"The four-view body has no authored spit mouth vertices
   or aim; the pinned legacy mouth basis is not reused; not a miss."* — the panel shows it as "Emission unavailable"
   instead of a false flight.
3. **Human weapon strikes were measured on the wrong object** (`combat-review-contact-profiles.ts`,
   `deriveHumanStrikeWindow` and `createReviewStrikeProbe`). Both read `socket.prepared.visual` — the shared,
   unattached weapon template that sits at the world origin — instead of `socket.visual`, the clone attached under
   the hand bone. The strike probe therefore never moved (its 96 probe points stayed in a fixed box
   `[-0.12,-0.16,-0.05]..[0.12,0.88,0.06]` through every frame of every clip) and the "tip speed peak" window was
   the grip's own speed against a static centre. Every human melee "hit" the tool had ever reported was the static
   template intersecting a target placed close enough to overlap the human (legacy base at 0.85 m: contact on the
   opening sample of all six greatsword clips); the four-view bodies, being shorter, never overlapped and "missed"
   everything. Both functions now use the attached clone; the probe follows the swing and the windows are real.
4. **Far-tip estimate degenerated for centre-gripped weapons** (same file). The tip was estimated as
   `2·centre − grip` of the weapon's bounds, which for a staff held at its middle is the hand itself, so
   `GapAuthored__StaffDiagonalStrike` measured the wrong phase and the derived windows were noisy. The tip is now
   the rendered weapon vertex farthest from the grip on the first frame, followed rigidly through the clip.
5. **Spar ladder** (`combat-review-controller.ts`, `runSparMatrix`). The retry ladder jumped from the fitted
   spacing straight to 1.2 m, skipping the band (1.4–1.6 m) where most four-view Claw/Bite contacts land; it now
   tries 1.6 and 1.4 m first. It also only ever moved closer, so attacks that carry the attacker past a close
   target (greatsword jump attack, dagger run-jump, high spin) could never be measured; it now continues outward
   to 2.5, 3.0, 3.5, 4.0 and 4.5 m. The greatsword jump attack lands at 2.5–3.0 m on three of the four bodies
   because of this. A row now reports the spacing at which the attack landed (a miss reports the closest spacing
   tried); the ladder is exposed as `CombatReviewController.sparSeparationLadder(fittedMeters)`. The attack list
   also skipped source-bound ranged releases whose clip name has no melee semantic (bow release/multishot are
   "interaction" clips); any action with a `reviewProjectileBinding` is now included.
6. **Suite-side rules** (`tests/combatReviewBreachlingMatrix.test.ts`): the nearest in-window approach of a miss
   is measured at every ladder spacing and reported with the spacing it occurred at; a contact on the window's
   opening sample is a GAP (overlap, not a swing); a "back" contact with the attacker standing in front is a GAP.

No pack registrations, receipts or assets were changed (packs are generated; see gap A for the Spit mouth/aim).

## Gaps that need an owner or animation decision

Counts are four-view rows (out of 234 GAP rows); the exact rows are in the per-body tables below.

- **A. Four-view Spit has no authored mouth or aim — 40 rows.** Every `SpitAttack` on every four-view body is
  "unavailable". The composer lane must register spit mouth vertices and a head-basis aim for each four-view pack
  (as the legacy packs do); the legacy base mouth basis cannot be reused (fix 2). *Decision: author the four-view
  spit emission in the packs.*
- **B. Four-view LungeAttack misses the human — 26 rows.** The registered strike vertices (three tips on the right
  forepaw) pass 53–90 mm outside the human's silhouette on the base and Oathbound at 1.4–1.6 m, and 162–257 mm
  short on the Stalker at 0.7–1.0 m. It lands only where the human's ready stance is wider (staff/wand/unarmed/knife
  stances on the base body, contact on the human's right arm) and on the Ravager (every set, 1.6–2.1 m, front or
  right, heavy). *Decision: re-solve the lunge reach for the base/Stalker/Oathbound four-view rigs (or register both
  forepaws as strike vertices).*
- **C. Four-view TailWhip — 16 misses + 5 behind-root contacts.** The Oathbound tail passes 123–260 mm short at
  0.85 m on every set; the Stalker tail reaches only at 0.7 m and then sweeps through the human's feet to a point
  0.25 m behind the root at 0.10–0.20 m height (five sets), or misses by 22 mm (five sets). The base and Ravager
  tails land (right/heavy or front/heavy at 0.7–1.0 m). *Decision: raise/lengthen the Oathbound and Stalker tail
  sweeps, or accept the tail as a very close-range attack.*
- **D. Human response sets cannot express the measured hit — 39 rows.** `twoHandSword` carries a single
  `GreatSword__GreatSwordImpact` (no left/right/back/heavy): 5 sided or heavy hits (base TailWhip right; Ravager
  Claw right, Lunge right, TailWhip right; Stalker TailWhip back). `oneHandMeleeProxy` (shortsword, mace) and
  `dagger` sets carry only `StandingReactLarge*` clips: all 32 light frontal Bite/Claw hits get a large gut
  reaction. `bow` carries only `ReactSmallFromFront/Headshot`: the Ravager's heavy Lunge and TailWhip get a small
  reaction. *Decision: add sided/heavy/light reactions to those sets, or accept the substitution.*
- **E. Human ranged fixed flights overfly a low target — 14 rows.** The bow arrow leaves at 1.72 m pitched −4.6°
  with 0.65 m drop over 6 m, so it clears the 0.99–1.18 m base/Stalker heads at every spacing up to 4.5 m (nearest
  134–197 mm at 4.5 m) and only drops into the taller Oathbound (4.0 m, left) and Ravager (4.5 m, front); the
  three-arrow multishot misses all four (82–281 mm at 4.5 m). The fire wand's `Standing1HCastSpell01` bolt leaves
  pitched **55° up** and `Standing1HMagicAttack01` +11° from 1.56 m (nearest 632–974 mm); only
  `Standing1HMagicAttack02` (−23°) lands (all four bodies, 1.6 m, PASS). *Decision: allow review aim depression
  toward a low target, or accept that the source cast/aim poses are authored for human-height targets.*
- **F. Human actions with no strike surface — 24 rows.** Unarmed magic (12 rows: no weapon, no projectile binding
  for the three unarmed casts/attacks), `Standing1HCastSpell01` with the ritual knife and
  `Standing2HCastSpell01` with the staff (8 rows: "cast" semantic, no weapon window is derived for a cast), and
  `GapAuthored__StaffHorizontalStrike` (4 rows: the authored move's tip speed never reaches the 1.5 m/s strike
  threshold, so no window is derived). *Decision: author a fist/hand strike surface or a spell projectile for
  unarmed casts, decide whether a "cast" with a held weapon is a strike, and give the authored horizontal strike
  an explicit strike key.*
- **G. Human melee clips authored for human-height targets — 60 miss rows.** Greatsword `Slash`, `Slash2`,
  `Slash3`, `HighSpinAttack` sweep at 0.75–2.0 m and pass 10–163 mm above or beside the 1 m bodies (they do land
  on the 1.30 m Ravager and, at 2.5 m, the Stalker/Oathbound with `Slash2`); the pommel `GreatSwordAttack` tip
  never drops below 1.2 m; the dagger `RunJumpAttack` comes down about 5 m ahead, beyond the 4.5 m ladder (nearest
  29–546 mm at 4.5 m); shortsword/mace `Downward`/`Horizontal` pass 19–275 mm short on the base/Oathbound; the
  ritual-knife `MagicAttack01/02` 90–368 mm; the staff `ButtSmash` and `360High` 169–442 mm; bow
  `CloseRangeStrike` 70–198 mm. *Decision: accept (the human set was matched against human-height opponents) or
  author low strikes for quadruped targets.*
- **H. Contact already present when the window opens — 10 rows.** `GreatSwordAttack` on the Stalker, Oathbound
  and Ravager at 0.7–0.85 m (their 1.04–1.85 m bodies overlap the human at the ladder's closest steps) and
  `GapAuthored__StaffDiagonalStrike` on all four bodies at 0.85–1.2 m (the authored strike is already on the target
  80 ms before its speed peak). *Decision: give the derived window an earlier start or explicit strike keys, and
  floor the spar ladder at the target's half-length rather than 0.7 m.*
- **I. Contact behind the defender's root with the attacker in front — 6 rows.** The Stalker tail (five sets, see
  C) and the greatsword jump attack on the Ravager at 2.5 m (the human comes down on the Ravager's back, 2.74 m
  from its root). The classifier reads the contact point, so a legitimate over-the-back hit is scheduled as a
  `RecieveHitBack`. *Decision: classify by attacker bearing (or contact normal) instead of contact point.*

## Differences against the legacy bodies (greatsword pair, tables at the end)

- **Bite/Claw.** The four-view bodies land both attacks squarely in front on all four variants (PASS), where the
  legacy Stalker bite passes through the human to a point behind its root, the legacy Oathbound bite lands on the
  human's right and the legacy Ravager bite on its left (all GAP). The four-view Ravager claw lands on the right.
- **Lunge.** The legacy Stalker and Oathbound lunges land (right/heavy at 1.4 m, GAP only for the greatsword
  response set); their four-view remodels miss (211 mm and 90 mm). Base and Ravager behave alike in both
  lineages (base misses by 19–84 mm, Ravager lands at 1.6 m).
- **Tail whip.** Legacy: base/Oathbound/Stalker land at 1.0–1.2 m, Ravager misses by 20 mm. Four-view: base and
  Ravager land at 0.85 m, Oathbound misses by 260 mm, Stalker reaches only behind the root at 0.7 m.
- **Spit.** All four legacy packs carry an authored mouth and land at 2.2–2.55 m (PASS); no four-view pack does.
- **Human attacks.** The greatsword jump attack lands at 2.5–3.0 m on the four-view base, Stalker and Ravager and
  the legacy base and Ravager; `Slash2` lands on the four-view Stalker/Oathbound/Ravager and the legacy Ravager;
  the four-view Ravager also takes `Slash3` and `HighSpin` (as the legacy Ravager does). Every other greatsword clip
  misses both lineages. The `GreatSwordAttack` "hits" on the Stalker/Oathbound/Ravager (both lineages, 0.7–0.85 m)
  are opening-sample overlaps, not swings (gap H).
- **Overall (greatsword only).** Four-view 19 PASS / 33 GAP of 52 rows vs legacy 19 PASS / 32 GAP of 51; the
  four-view bodies gain the front-facing bites and the jump/slash contacts and lose the Spit, the Stalker/Oathbound
  lunge and the Oathbound tail.

## Body geometry at the fitted spacing (Combat Review placement, defender at yaw 180°, greatsword pair)

| Body | Height (m) | Length (m) | Fitted spacing (m) | Composer pack |
|---|---:|---:|---:|---|
| breachling-base (legacy) | 0.92 | 1.63 | 2.20 | composer-v95 |
| breachling-base-4v | 0.99 | 0.98 | 1.90 | composer-v8 |
| breachling-stalker-4v | 1.06 | 1.04 | 1.90 | composer-v5 |
| breachling-oathbound-4v | 1.18 | 1.45 | 2.05 | composer-q4 |
| breachling-ravager-4v | 1.30 | 1.85 | 2.35 | composer-v4 |

Human Foundation pilot: 1.94 m tall, 1.27 m deep with the greatsword idle stance. Other stances fit at
1.75–1.85 m (magic, dagger, one-hand) or 1.80–2.25 m (bow).

## Measured tables

### Breachling attack landing map (four-view bodies)

Cell: spacing at which the attack landed (m) and the side/weight the tool classified; `miss` with nearest approach; `n/a` unavailable. Verdict in brackets.

#### `breachling-base-4v`

| Attack | Greatsword | Shortsword | Staff | Mace | Bow | Fire wand | Unarmed magic | Ritual knife | Single dagger | Paired daggers |
|---|---|---|---|---|---|---|---|---|---|---|
| BiteAttack | 1.2 m front/light [PASS] | 1.4 m front/light [GAP] | 1.6 m front/light [PASS] | 1.4 m front/light [GAP] | 1.4 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.4 m front/light [GAP] | 1.4 m front/light [GAP] |
| ClawAttack | 1.4 m front/light [PASS] | 1.6 m front/light [GAP] | 1.75 m front/light [PASS] | 1.6 m front/light [GAP] | 1.6 m front/light [PASS] | 1.75 m front/light [PASS] | 1.75 m front/light [PASS] | 1.75 m front/light [PASS] | 1.6 m front/light [GAP] | 1.6 m front/light [GAP] |
| LungeAttack | miss, 84 mm @ 1.4 m [GAP] | miss, 55 mm @ 1.4 m [GAP] | 1.4 m right/heavy [PASS] | miss, 55 mm @ 1.4 m [GAP] | miss, 81 mm @ 0.7 m [GAP] | 1.4 m right/heavy [PASS] | 1.4 m right/heavy [PASS] | 1.4 m right/heavy [PASS] | miss, 55 mm @ 1.4 m [GAP] | miss, 55 mm @ 1.4 m [GAP] |
| TailWhip | 0.85 m right/heavy [GAP] | 0.7 m right/heavy [PASS] | 0.7 m right/heavy [PASS] | 0.7 m right/heavy [PASS] | miss, 35 mm @ 0.7 m [GAP] | 0.7 m right/heavy [PASS] | 0.7 m right/heavy [PASS] | 0.7 m right/heavy [PASS] | 0.7 m right/heavy [PASS] | 0.7 m right/heavy [PASS] |
| SpitAttack | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] |

#### `breachling-stalker-4v`

| Attack | Greatsword | Shortsword | Staff | Mace | Bow | Fire wand | Unarmed magic | Ritual knife | Single dagger | Paired daggers |
|---|---|---|---|---|---|---|---|---|---|---|
| BiteAttack | 1.2 m front/light [PASS] | 1.4 m front/light [GAP] | 1.6 m front/light [PASS] | 1.4 m front/light [GAP] | 1.4 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.4 m front/light [GAP] | 1.4 m front/light [GAP] |
| ClawAttack | 1.6 m front/light [PASS] | 1.75 m front/light [GAP] | 1.75 m front/light [PASS] | 1.75 m front/light [GAP] | 1.85 m front/light [PASS] | 1.75 m front/light [PASS] | 1.75 m front/light [PASS] | 1.75 m front/light [PASS] | 1.75 m front/light [GAP] | 1.75 m front/light [GAP] |
| LungeAttack | miss, 211 mm @ 1 m [GAP] | miss, 162 mm @ 0.85 m [GAP] | miss, 189 mm @ 0.7 m [GAP] | miss, 162 mm @ 0.85 m [GAP] | miss, 257 mm @ 0.7 m [GAP] | miss, 189 mm @ 0.7 m [GAP] | miss, 189 mm @ 0.7 m [GAP] | miss, 189 mm @ 0.7 m [GAP] | miss, 162 mm @ 0.85 m [GAP] | miss, 162 mm @ 0.85 m [GAP] |
| TailWhip | 0.7 m back/heavy [GAP] | miss, 22 mm @ 0.7 m [GAP] | 0.7 m back/heavy [GAP] | miss, 22 mm @ 0.7 m [GAP] | miss, 24 mm @ 1.4 m [GAP] | 0.7 m back/heavy [GAP] | 0.7 m back/heavy [GAP] | 0.7 m back/heavy [GAP] | miss, 22 mm @ 0.7 m [GAP] | miss, 22 mm @ 0.7 m [GAP] |
| SpitAttack | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] |

#### `breachling-oathbound-4v`

| Attack | Greatsword | Shortsword | Staff | Mace | Bow | Fire wand | Unarmed magic | Ritual knife | Single dagger | Paired daggers |
|---|---|---|---|---|---|---|---|---|---|---|
| BiteAttack | 1.4 m front/light [PASS] | 1.6 m front/light [GAP] | 1.6 m front/light [PASS] | 1.6 m front/light [GAP] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [GAP] | 1.6 m front/light [GAP] |
| ClawAttack | 1.6 m front/light [PASS] | 1.8 m front/light [GAP] | 1.85 m front/light [PASS] | 1.8 m front/light [GAP] | 1.6 m front/light [PASS] | 1.85 m front/light [PASS] | 1.85 m front/light [PASS] | 1.85 m front/light [PASS] | 1.8 m front/light [GAP] | 1.85 m front/light [GAP] |
| LungeAttack | miss, 90 mm @ 1.4 m [GAP] | miss, 53 mm @ 1.4 m [GAP] | miss, 124 mm @ 1.6 m [GAP] | miss, 53 mm @ 1.4 m [GAP] | miss, 87 mm @ 1.6 m [GAP] | miss, 124 mm @ 1.6 m [GAP] | miss, 124 mm @ 1.6 m [GAP] | miss, 124 mm @ 1.6 m [GAP] | miss, 53 mm @ 1.4 m [GAP] | miss, 53 mm @ 1.4 m [GAP] |
| TailWhip | miss, 260 mm @ 0.85 m [GAP] | miss, 216 mm @ 0.85 m [GAP] | miss, 123 mm @ 0.85 m [GAP] | miss, 216 mm @ 0.85 m [GAP] | miss, 256 mm @ 0.7 m [GAP] | miss, 123 mm @ 0.85 m [GAP] | miss, 123 mm @ 0.85 m [GAP] | miss, 123 mm @ 0.85 m [GAP] | miss, 216 mm @ 0.85 m [GAP] | miss, 216 mm @ 0.85 m [GAP] |
| SpitAttack | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] |

#### `breachling-ravager-4v`

| Attack | Greatsword | Shortsword | Staff | Mace | Bow | Fire wand | Unarmed magic | Ritual knife | Single dagger | Paired daggers |
|---|---|---|---|---|---|---|---|---|---|---|
| BiteAttack | 1.4 m front/light [PASS] | 1.6 m front/light [GAP] | 1.6 m front/light [PASS] | 1.6 m front/light [GAP] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [PASS] | 1.6 m front/light [GAP] | 1.6 m front/light [GAP] |
| ClawAttack | 1.4 m right/light [GAP] | 1.4 m front/light [GAP] | 1.4 m front/light [PASS] | 1.4 m front/light [GAP] | 1.4 m front/light [PASS] | 1.4 m front/light [PASS] | 1.4 m front/light [PASS] | 1.4 m front/light [PASS] | 1.4 m front/light [GAP] | 1.4 m front/light [GAP] |
| LungeAttack | 1.6 m right/heavy [GAP] | 2.1 m front/heavy [PASS] | 1.6 m front/heavy [PASS] | 2.1 m front/heavy [PASS] | 1.6 m front/heavy [GAP] | 1.6 m front/heavy [PASS] | 1.6 m front/heavy [PASS] | 1.6 m front/heavy [PASS] | 2.1 m front/heavy [PASS] | 1.6 m front/heavy [PASS] |
| TailWhip | 0.85 m right/heavy [GAP] | 1 m front/heavy [PASS] | 1 m front/heavy [PASS] | 1 m front/heavy [PASS] | 1 m front/heavy [GAP] | 1 m front/heavy [PASS] | 1 m front/heavy [PASS] | 1 m front/heavy [PASS] | 1 m front/heavy [PASS] | 1 m front/heavy [PASS] |
| SpitAttack | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] | n/a [GAP] |

### Full per-body tables (every measured row)

#### `breachling-base-4v` — 49 PASS / 59 GAP (108)

| Weapon set | Attacker | Row | Action | Window (profile) | Contact | Side/weight | Response clip | Effect | Verdict | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| Greatsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.447 s @ 1.2 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.367 s @ 1.4 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | miss (nearest 84 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.9, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 84 mm at 1.4 m |
| Greatsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Greatsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | hit 0.805 s @ 0.85 m | right heavy | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no right reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.447 s @ 1.2 m | front light | `TwoHandedSwordDeath` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | miss (nearest 47 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 47 mm at 0.7 m |
| Greatsword | human | reaction | `GreatSwordSlash` | 0.620–0.820 s (`human-weapon-measured:GreatSword__GreatSwordSlash:0.62-0.82`) | miss (nearest 163 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 163 mm at 1.2 m |
| Greatsword | human | reaction | `GreatSwordSlash2` | 1.653–1.853 s (`human-weapon-measured:GreatSword__GreatSwordSlash2:1.6533-1.8533`) | miss (nearest 29 mm @ 2.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 29 mm at 2.5 m |
| Greatsword | human | reaction | `GreatSwordSlash3` | 0.779–0.979 s (`human-weapon-measured:GreatSword__GreatSwordSlash3:0.779-0.979`) | miss (nearest 112 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 112 mm at 1.2 m |
| Greatsword | human | reaction | `GreatSwordHighSpinAttack` | 0.370–0.570 s (`human-weapon-measured:GreatSword__GreatSwordHighSpinAttack:0.37-0.57`) | miss (nearest 123 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 123 mm at 0.85 m |
| Greatsword | human | reaction | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | hit 1.200 s @ 3 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | death | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | hit 1.200 s @ 3 m | front heavy | `Death` | surface-anchored physical impact | **PASS** |  |
| Shortsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.463 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Shortsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.366 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Shortsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | miss (nearest 55 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 55 mm at 1.4 m |
| Shortsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Shortsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | hit 0.779 s @ 0.7 m | right heavy | `StandingReactLargeFromRight` | surface-anchored physical impact | **PASS** |  |
| Shortsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.463 s @ 1.4 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | reaction | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | miss (nearest 54 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 54 mm at 1 m |
| Shortsword | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 275 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 275 mm at 1.2 m |
| Shortsword | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | miss (nearest 19 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 19 mm at 1.2 m |
| Staff | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.428 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.378 s @ 1.75 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | hit 0.482 s @ 1.4 m | right heavy | `StandingReactSmallFromRight` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Staff | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | hit 0.802 s @ 0.7 m | right heavy | `StandingReactSmallFromRight` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.428 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `HumanMasculineAthleticMuscularStaffButtSmash` | 0.937–1.137 s (`human-weapon-measured:Interactions__HumanMasculineAthleticMuscularStaffButtSmash:0.9367-1.1367`) | miss (nearest 442 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 442 mm at 0.85 m |
| Staff | human | reaction | `StandingMeleeAttack360High` | 1.014–1.214 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360High:1.0143-1.2143`) | miss (nearest 283 mm @ 1.6 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 283 mm at 1.6 m |
| Staff | human | reaction | `StandingMeleeAttack360Low` | 0.870–1.070 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.87-1.07`) | hit 0.929 s @ 1.6 m | right light | `RecieveHitRight` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StandingMeleeAttackDownward` | 0.770–0.970 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.77-0.97`) | hit 0.837 s @ 1.4 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 1.056 s @ 1 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `Standing2HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Staff | human | reaction | `Standing2HMagicAttack01` | 1.080–1.280 s (`human-weapon-measured:ProMagic__Standing2HMagicAttack01:1.0796-1.2796`) | miss (nearest 17 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 17 mm at 1 m |
| Staff | human | reaction | `Standing2HMagicAreaAttack01` | 1.203–1.403 s (`human-weapon-measured:ProMagic__Standing2HMagicAreaAttack01:1.2033-1.4033`) | hit 1.315 s @ 0.7 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StaffDiagonalStrike` | 0.587–0.787 s (`human-weapon-measured:GapAuthored__StaffDiagonalStrike:0.5867-0.7867`) | hit 0.587 s @ 1 m | front light | `RecieveHit` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.587 s): the strike surface already touches the target when the window opens, so a body overlap at 1 m cannot be told from a landed swing |
| Staff | human | reaction | `StaffHorizontalStrike` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Staff | human | death | `StandingMeleeAttack360Low` | 0.870–1.070 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.87-1.07`) | hit 0.929 s @ 1.6 m | right light | `Death` | surface-anchored physical impact | **PASS** |  |
| Mace | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.463 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Mace | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.366 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Mace | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | miss (nearest 55 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 55 mm at 1.4 m |
| Mace | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Mace | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | hit 0.779 s @ 0.7 m | right heavy | `StandingReactLargeFromRight` | surface-anchored physical impact | **PASS** |  |
| Mace | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.463 s @ 1.4 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Mace | human | reaction | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | miss (nearest 44 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 44 mm at 1 m |
| Mace | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 249 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 249 mm at 1.4 m |
| Mace | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.029 s @ 1.4 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Mace | human | death | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.029 s @ 1.4 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.458 s @ 1.4 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.371 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | miss (nearest 81 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.8, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 81 mm at 0.7 m |
| Bow | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Bow | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | miss (nearest 35 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.8, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 35 mm at 0.7 m |
| Bow | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.458 s @ 1.4 m | front light | `StandingDeathBackward01` | surface-anchored physical impact | **PASS** |  |
| Bow | human | reaction | `BowReleaseFromNock` | 0.520–1.733 s (`bow:GapAuthored__BowReleaseFromNock`) | miss (nearest 197 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 197 mm at 4.5 m |
| Bow | human | reaction | `BowThreeArrowMultishot` | 2.919–5.033 s (`bow:GapAuthored__BowThreeArrowMultishot`) | miss (nearest 281 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 281 mm at 4.5 m |
| Bow | human | reaction | `BowCloseRangeStrike` | 0.903–1.103 s (`human-weapon-measured:GapAuthored__BowCloseRangeStrike:0.9033-1.1033`) | miss (nearest 197 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 197 mm at 0.7 m |
| Fire wand | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.428 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.378 s @ 1.75 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | hit 0.482 s @ 1.4 m | right heavy | `StandingReactSmallFromRight` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Fire wand | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | hit 0.802 s @ 0.7 m | right heavy | `StandingReactSmallFromRight` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.428 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Fire wand | human | reaction | `Standing1HCastSpell01` | 1.518–2.300 s (`wand-fire:ProMagic__Standing1HCastSpell01`) | miss (nearest 974 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 974 mm at 0.7 m |
| Fire wand | human | reaction | `Standing1HMagicAttack01` | 0.677–2.333 s (`wand-fire:ProMagic__Standing1HMagicAttack01`) | miss (nearest 843 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 843 mm at 0.7 m |
| Fire wand | human | reaction | `Standing1HMagicAttack02` | 0.447–2.233 s (`wand-fire:ProMagic__Standing1HMagicAttack02`) | hit 0.854 s @ 1.6 m | front light | `RecieveHit` | fire-spell projectile fire · stopped at surface anchor | **PASS** |  |
| Fire wand | human | death | `Standing1HMagicAttack02` | 0.447–2.233 s (`wand-fire:ProMagic__Standing1HMagicAttack02`) | hit 0.854 s @ 1.6 m | front light | `Death` | fire-spell projectile fire · stopped at surface anchor | **PASS** |  |
| Unarmed magic | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.428 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.378 s @ 1.75 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | hit 0.482 s @ 1.4 m | right heavy | `StandingReactSmallFromRight` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Unarmed magic | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | hit 0.802 s @ 0.7 m | right heavy | `StandingReactSmallFromRight` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.428 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | human | reaction | `Standing1HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Unarmed magic | human | reaction | `Standing1HMagicAttack01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Unarmed magic | human | reaction | `Standing1HMagicAttack02` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Ritual knife | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.428 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.378 s @ 1.75 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | hit 0.482 s @ 1.4 m | right heavy | `StandingReactSmallFromRight` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Ritual knife | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | hit 0.802 s @ 0.7 m | right heavy | `StandingReactSmallFromRight` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.428 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | human | reaction | `Standing1HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Ritual knife | human | reaction | `Standing1HMagicAttack01` | 0.753–0.953 s (`human-weapon-measured:ProMagic__Standing1HMagicAttack01:0.7533-0.9533`) | miss (nearest 368 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 368 mm at 1.4 m |
| Ritual knife | human | reaction | `Standing1HMagicAttack02` | 0.482–0.682 s (`human-weapon-measured:ProMagic__Standing1HMagicAttack02:0.4825-0.6825`) | miss (nearest 299 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 299 mm at 1.2 m |
| Single dagger | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.463 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Single dagger | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.366 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Single dagger | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | miss (nearest 55 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 55 mm at 1.4 m |
| Single dagger | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Single dagger | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | hit 0.779 s @ 0.7 m | right heavy | `StandingReactLargeFromRight` | surface-anchored physical impact | **PASS** |  |
| Single dagger | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.463 s @ 1.4 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 287 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 287 mm at 1.2 m |
| Single dagger | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | miss (nearest 44 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 44 mm at 1.2 m |
| Single dagger | human | reaction | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.967 s @ 1.4 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeRunJumpAttack` | 1.679–1.879 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeRunJumpAttack:1.6787-1.8787`) | miss (nearest 546 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 546 mm at 4.5 m |
| Single dagger | human | death | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.967 s @ 1.4 m | front heavy | `Death` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.463 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Paired daggers | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v8:ClawAttack`) | hit 0.366 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Paired daggers | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v8:LungeAttack`) | miss (nearest 55 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 55 mm at 1.4 m |
| Paired daggers | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Paired daggers | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v8:TailWhip`) | hit 0.779 s @ 0.7 m | right heavy | `StandingReactLargeFromRight` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v8:BiteAttack`) | hit 0.463 s @ 1.4 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 287 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 287 mm at 1.2 m |
| Paired daggers | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | miss (nearest 44 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 44 mm at 1.2 m |
| Paired daggers | human | reaction | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.967 s @ 1.4 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeRunJumpAttack` | 1.679–1.879 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeRunJumpAttack:1.6787-1.8787`) | miss (nearest 546 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 546 mm at 4.5 m |
| Paired daggers | human | death | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.967 s @ 1.4 m | front heavy | `Death` | surface-anchored physical impact | **PASS** |  |

#### `breachling-stalker-4v` — 44 PASS / 65 GAP (109)

| Weapon set | Attacker | Row | Action | Window (profile) | Contact | Side/weight | Response clip | Effect | Verdict | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| Greatsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.527 s @ 1.2 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.386 s @ 1.6 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 211 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.9, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 211 mm at 1 m |
| Greatsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Greatsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | hit 0.871 s @ 0.7 m | back heavy (attacker in front) | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no back reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact"; contact landed behind the defender root (-0.18, 0.10, -0.25) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing |
| Greatsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.527 s @ 1.2 m | front light | `TwoHandedSwordDeath` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | hit 0.084 s @ 0.7 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.084 s): the strike surface already touches the target when the window opens, so a body overlap at 0.7 m cannot be told from a landed swing |
| Greatsword | human | reaction | `GreatSwordSlash` | 0.620–0.820 s (`human-weapon-measured:GreatSword__GreatSwordSlash:0.62-0.82`) | miss (nearest 17 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 17 mm at 1.2 m |
| Greatsword | human | reaction | `GreatSwordSlash2` | 1.653–1.853 s (`human-weapon-measured:GreatSword__GreatSwordSlash2:1.6533-1.8533`) | hit 1.795 s @ 2.5 m | right light | `RecieveHitRight` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordSlash3` | 0.779–0.979 s (`human-weapon-measured:GreatSword__GreatSwordSlash3:0.779-0.979`) | miss (nearest 10 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 10 mm at 1.2 m |
| Greatsword | human | reaction | `GreatSwordHighSpinAttack` | 0.370–0.570 s (`human-weapon-measured:GreatSword__GreatSwordHighSpinAttack:0.37-0.57`) | miss (nearest 84 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 84 mm at 0.7 m |
| Greatsword | human | reaction | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | hit 1.149 s @ 3 m | right heavy | `RecieveHitRight` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | death | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | hit 0.084 s @ 0.7 m | front heavy | `Death` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.084 s): the strike surface already touches the target when the window opens, so a body overlap at 0.7 m cannot be told from a landed swing |
| Shortsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.471 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Shortsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.387 s @ 1.75 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Shortsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 162 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 162 mm at 0.85 m |
| Shortsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Shortsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | miss (nearest 22 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 22 mm at 0.7 m |
| Shortsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.471 s @ 1.4 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | reaction | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | hit 0.897 s @ 1.4 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 166 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 166 mm at 1.2 m |
| Shortsword | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.037 s @ 1.4 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | death | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | hit 0.897 s @ 1.4 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.395 s @ 1.75 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 189 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 189 mm at 0.7 m |
| Staff | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Staff | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | hit 0.845 s @ 0.7 m | back heavy (attacker in front) | `StandingReactSmallFromBack` | surface-anchored physical impact | **GAP** | contact landed behind the defender root (-0.26, 0.20, -0.28) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing |
| Staff | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `HumanMasculineAthleticMuscularStaffButtSmash` | 0.937–1.137 s (`human-weapon-measured:Interactions__HumanMasculineAthleticMuscularStaffButtSmash:0.9367-1.1367`) | miss (nearest 328 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 328 mm at 0.7 m |
| Staff | human | reaction | `StandingMeleeAttack360High` | 1.014–1.214 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360High:1.0143-1.2143`) | miss (nearest 207 mm @ 1.6 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 207 mm at 1.6 m |
| Staff | human | reaction | `StandingMeleeAttack360Low` | 0.870–1.070 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.87-1.07`) | hit 0.949 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StandingMeleeAttackDownward` | 0.770–0.970 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.77-0.97`) | hit 0.828 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 1.050 s @ 0.85 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `Standing2HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Staff | human | reaction | `Standing2HMagicAttack01` | 1.080–1.280 s (`human-weapon-measured:ProMagic__Standing2HMagicAttack01:1.0796-1.2796`) | hit 1.227 s @ 1 m | left light | `RecieveHitLeft` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `Standing2HMagicAreaAttack01` | 1.203–1.403 s (`human-weapon-measured:ProMagic__Standing2HMagicAreaAttack01:1.2033-1.4033`) | hit 1.262 s @ 0.7 m | left light | `RecieveHitLeft` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StaffDiagonalStrike` | 0.587–0.787 s (`human-weapon-measured:GapAuthored__StaffDiagonalStrike:0.5867-0.7867`) | hit 0.587 s @ 0.85 m | front light | `RecieveHit` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.587 s): the strike surface already touches the target when the window opens, so a body overlap at 0.85 m cannot be told from a landed swing |
| Staff | human | reaction | `StaffHorizontalStrike` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Staff | human | death | `StandingMeleeAttack360Low` | 0.870–1.070 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.87-1.07`) | hit 0.949 s @ 1.6 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Mace | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.471 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Mace | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.387 s @ 1.75 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Mace | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 162 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 162 mm at 0.85 m |
| Mace | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Mace | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | miss (nearest 22 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 22 mm at 0.7 m |
| Mace | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.471 s @ 1.4 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Mace | human | reaction | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | hit 0.898 s @ 1.4 m | right light | `RecieveHitRight` | surface-anchored physical impact | **PASS** |  |
| Mace | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 118 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 118 mm at 1.4 m |
| Mace | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.020 s @ 1.4 m | left light | `RecieveHitLeft` | surface-anchored physical impact | **PASS** |  |
| Mace | human | death | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | hit 0.898 s @ 1.4 m | right light | `Death` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.466 s @ 1.4 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.406 s @ 1.85 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 257 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 257 mm at 0.7 m |
| Bow | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Bow | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | miss (nearest 24 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 24 mm at 1.4 m |
| Bow | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.466 s @ 1.4 m | front light | `StandingDeathBackward01` | surface-anchored physical impact | **PASS** |  |
| Bow | human | reaction | `BowReleaseFromNock` | 0.520–1.733 s (`bow:GapAuthored__BowReleaseFromNock`) | miss (nearest 134 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 134 mm at 4.5 m |
| Bow | human | reaction | `BowThreeArrowMultishot` | 2.919–5.033 s (`bow:GapAuthored__BowThreeArrowMultishot`) | miss (nearest 219 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 219 mm at 4.5 m |
| Bow | human | reaction | `BowCloseRangeStrike` | 0.903–1.103 s (`human-weapon-measured:GapAuthored__BowCloseRangeStrike:0.9033-1.1033`) | miss (nearest 98 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 98 mm at 0.7 m |
| Fire wand | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.395 s @ 1.75 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 189 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 189 mm at 0.7 m |
| Fire wand | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Fire wand | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | hit 0.845 s @ 0.7 m | back heavy (attacker in front) | `StandingReactSmallFromBack` | surface-anchored physical impact | **GAP** | contact landed behind the defender root (-0.26, 0.20, -0.28) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing |
| Fire wand | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Fire wand | human | reaction | `Standing1HCastSpell01` | 1.518–2.300 s (`wand-fire:ProMagic__Standing1HCastSpell01`) | miss (nearest 845 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 845 mm at 0.7 m |
| Fire wand | human | reaction | `Standing1HMagicAttack01` | 0.677–2.333 s (`wand-fire:ProMagic__Standing1HMagicAttack01`) | miss (nearest 664 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 664 mm at 0.7 m |
| Fire wand | human | reaction | `Standing1HMagicAttack02` | 0.447–2.233 s (`wand-fire:ProMagic__Standing1HMagicAttack02`) | hit 0.843 s @ 1.6 m | front light | `RecieveHit` | fire-spell projectile fire · stopped at surface anchor | **PASS** |  |
| Fire wand | human | death | `Standing1HMagicAttack02` | 0.447–2.233 s (`wand-fire:ProMagic__Standing1HMagicAttack02`) | hit 0.843 s @ 1.6 m | front light | `Death` | fire-spell projectile fire · stopped at surface anchor | **PASS** |  |
| Unarmed magic | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.395 s @ 1.75 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 189 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 189 mm at 0.7 m |
| Unarmed magic | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Unarmed magic | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | hit 0.845 s @ 0.7 m | back heavy (attacker in front) | `StandingReactSmallFromBack` | surface-anchored physical impact | **GAP** | contact landed behind the defender root (-0.26, 0.20, -0.28) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing |
| Unarmed magic | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | human | reaction | `Standing1HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Unarmed magic | human | reaction | `Standing1HMagicAttack01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Unarmed magic | human | reaction | `Standing1HMagicAttack02` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Ritual knife | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.395 s @ 1.75 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 189 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 189 mm at 0.7 m |
| Ritual knife | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Ritual knife | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | hit 0.845 s @ 0.7 m | back heavy (attacker in front) | `StandingReactSmallFromBack` | surface-anchored physical impact | **GAP** | contact landed behind the defender root (-0.26, 0.20, -0.28) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing |
| Ritual knife | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | human | reaction | `Standing1HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Ritual knife | human | reaction | `Standing1HMagicAttack01` | 0.753–0.953 s (`human-weapon-measured:ProMagic__Standing1HMagicAttack01:0.7533-0.9533`) | miss (nearest 311 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 311 mm at 1.4 m |
| Ritual knife | human | reaction | `Standing1HMagicAttack02` | 0.482–0.682 s (`human-weapon-measured:ProMagic__Standing1HMagicAttack02:0.4825-0.6825`) | miss (nearest 186 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 186 mm at 1.2 m |
| Single dagger | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.471 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Single dagger | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.387 s @ 1.75 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Single dagger | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 162 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 162 mm at 0.85 m |
| Single dagger | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Single dagger | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | miss (nearest 22 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 22 mm at 0.7 m |
| Single dagger | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.471 s @ 1.4 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 193 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 193 mm at 1.2 m |
| Single dagger | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.037 s @ 1.4 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.967 s @ 1.4 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeRunJumpAttack` | 1.679–1.879 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeRunJumpAttack:1.6787-1.8787`) | miss (nearest 505 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 505 mm at 4.5 m |
| Single dagger | human | death | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.037 s @ 1.4 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.471 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Paired daggers | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v5:ClawAttack`) | hit 0.387 s @ 1.75 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Paired daggers | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v5:LungeAttack`) | miss (nearest 162 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 162 mm at 0.85 m |
| Paired daggers | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Paired daggers | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v5:TailWhip`) | miss (nearest 22 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.75, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 22 mm at 0.7 m |
| Paired daggers | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v5:BiteAttack`) | hit 0.471 s @ 1.4 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 193 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 193 mm at 1.2 m |
| Paired daggers | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.037 s @ 1.4 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.967 s @ 1.4 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeRunJumpAttack` | 1.679–1.879 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeRunJumpAttack:1.6787-1.8787`) | miss (nearest 505 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 505 mm at 4.5 m |
| Paired daggers | human | death | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.037 s @ 1.4 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |

#### `breachling-oathbound-4v` — 43 PASS / 67 GAP (110)

| Weapon set | Attacker | Row | Action | Window (profile) | Contact | Side/weight | Response clip | Effect | Verdict | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| Greatsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.543 s @ 1.4 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.368 s @ 1.6 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 90 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (2.05, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 90 mm at 1.4 m |
| Greatsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Greatsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 260 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (2.05, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 260 mm at 0.85 m |
| Greatsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.543 s @ 1.4 m | front light | `TwoHandedSwordDeath` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | hit 0.084 s @ 0.85 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.084 s): the strike surface already touches the target when the window opens, so a body overlap at 0.85 m cannot be told from a landed swing |
| Greatsword | human | reaction | `GreatSwordSlash` | 0.620–0.820 s (`human-weapon-measured:GreatSword__GreatSwordSlash:0.62-0.82`) | miss (nearest 155 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 155 mm at 1.2 m |
| Greatsword | human | reaction | `GreatSwordSlash2` | 1.653–1.853 s (`human-weapon-measured:GreatSword__GreatSwordSlash2:1.6533-1.8533`) | hit 1.833 s @ 2.5 m | left light | `RecieveHitLeft` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordSlash3` | 0.779–0.979 s (`human-weapon-measured:GreatSword__GreatSwordSlash3:0.779-0.979`) | miss (nearest 88 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 88 mm at 1.4 m |
| Greatsword | human | reaction | `GreatSwordHighSpinAttack` | 0.370–0.570 s (`human-weapon-measured:GreatSword__GreatSwordHighSpinAttack:0.37-0.57`) | miss (nearest 39 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 39 mm at 0.85 m |
| Greatsword | human | reaction | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | miss (nearest 50 mm @ 3 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 50 mm at 3 m |
| Greatsword | human | death | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | hit 0.084 s @ 0.85 m | front heavy | `Death` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.084 s): the strike surface already touches the target when the window opens, so a body overlap at 0.85 m cannot be told from a landed swing |
| Shortsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.541 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Shortsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.367 s @ 1.8 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Shortsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 53 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.8, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 53 mm at 1.4 m |
| Shortsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Shortsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 216 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.8, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 216 mm at 0.85 m |
| Shortsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.541 s @ 1.6 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | reaction | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | miss (nearest 31 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 31 mm at 1.2 m |
| Shortsword | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 90 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 90 mm at 1 m |
| Shortsword | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.022 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | death | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.022 s @ 1.6 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.479 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.373 s @ 1.85 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 124 mm @ 1.6 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 124 mm at 1.6 m |
| Staff | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Staff | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 123 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 123 mm at 0.85 m |
| Staff | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.479 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `HumanMasculineAthleticMuscularStaffButtSmash` | 0.937–1.137 s (`human-weapon-measured:Interactions__HumanMasculineAthleticMuscularStaffButtSmash:0.9367-1.1367`) | miss (nearest 287 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 287 mm at 0.7 m |
| Staff | human | reaction | `StandingMeleeAttack360High` | 1.014–1.214 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360High:1.0143-1.2143`) | miss (nearest 72 mm @ 1.6 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 72 mm at 1.6 m |
| Staff | human | reaction | `StandingMeleeAttack360Low` | 0.870–1.070 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.87-1.07`) | hit 0.932 s @ 1.6 m | right light | `RecieveHitRight` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StandingMeleeAttackDownward` | 0.770–0.970 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.77-0.97`) | hit 0.887 s @ 1 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 1.050 s @ 1 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `Standing2HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Staff | human | reaction | `Standing2HMagicAttack01` | 1.080–1.280 s (`human-weapon-measured:ProMagic__Standing2HMagicAttack01:1.0796-1.2796`) | hit 1.271 s @ 1.2 m | left light | `RecieveHitLeft` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `Standing2HMagicAreaAttack01` | 1.203–1.403 s (`human-weapon-measured:ProMagic__Standing2HMagicAreaAttack01:1.2033-1.4033`) | hit 1.295 s @ 1 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StaffDiagonalStrike` | 0.587–0.787 s (`human-weapon-measured:GapAuthored__StaffDiagonalStrike:0.5867-0.7867`) | hit 0.587 s @ 0.85 m | front light | `RecieveHit` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.587 s): the strike surface already touches the target when the window opens, so a body overlap at 0.85 m cannot be told from a landed swing |
| Staff | human | reaction | `StaffHorizontalStrike` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Staff | human | death | `StandingMeleeAttack360Low` | 0.870–1.070 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.87-1.07`) | hit 0.932 s @ 1.6 m | right light | `Death` | surface-anchored physical impact | **PASS** |  |
| Mace | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.541 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Mace | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.367 s @ 1.8 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Mace | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 53 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.8, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 53 mm at 1.4 m |
| Mace | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Mace | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 216 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.8, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 216 mm at 0.85 m |
| Mace | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.541 s @ 1.6 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Mace | human | reaction | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | miss (nearest 29 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 29 mm at 1 m |
| Mace | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 76 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 76 mm at 1.4 m |
| Mace | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.022 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Mace | human | death | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.022 s @ 1.6 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.524 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.361 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 87 mm @ 1.6 m) |  |  |  | **GAP** | no contact at any spar spacing (1.95, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 87 mm at 1.6 m |
| Bow | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Bow | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 256 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.95, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 256 mm at 0.7 m |
| Bow | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.524 s @ 1.6 m | front light | `StandingDeathBackward01` | surface-anchored physical impact | **PASS** |  |
| Bow | human | reaction | `BowReleaseFromNock` | 0.520–1.733 s (`bow:GapAuthored__BowReleaseFromNock`) | hit 1.326 s @ 4 m | left light | `RecieveHitLeft` | arrow projectile physical · stopped at surface anchor | **PASS** |  |
| Bow | human | reaction | `BowThreeArrowMultishot` | 2.919–5.033 s (`bow:GapAuthored__BowThreeArrowMultishot`) | miss (nearest 128 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 128 mm at 4.5 m |
| Bow | human | reaction | `BowCloseRangeStrike` | 0.903–1.103 s (`human-weapon-measured:GapAuthored__BowCloseRangeStrike:0.9033-1.1033`) | miss (nearest 70 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 70 mm at 0.7 m |
| Bow | human | death | `BowReleaseFromNock` | 0.520–1.733 s (`bow:GapAuthored__BowReleaseFromNock`) | hit 1.326 s @ 4 m | left light | `Death` | arrow projectile physical · stopped at surface anchor | **PASS** |  |
| Fire wand | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.479 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.373 s @ 1.85 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 124 mm @ 1.6 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 124 mm at 1.6 m |
| Fire wand | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Fire wand | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 123 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 123 mm at 0.85 m |
| Fire wand | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.479 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Fire wand | human | reaction | `Standing1HCastSpell01` | 1.518–2.300 s (`wand-fire:ProMagic__Standing1HCastSpell01`) | miss (nearest 809 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 809 mm at 0.7 m |
| Fire wand | human | reaction | `Standing1HMagicAttack01` | 0.677–2.333 s (`wand-fire:ProMagic__Standing1HMagicAttack01`) | miss (nearest 632 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 632 mm at 0.7 m |
| Fire wand | human | reaction | `Standing1HMagicAttack02` | 0.447–2.233 s (`wand-fire:ProMagic__Standing1HMagicAttack02`) | hit 0.829 s @ 1.6 m | front light | `RecieveHit` | fire-spell projectile fire · stopped at surface anchor | **PASS** |  |
| Fire wand | human | death | `Standing1HMagicAttack02` | 0.447–2.233 s (`wand-fire:ProMagic__Standing1HMagicAttack02`) | hit 0.829 s @ 1.6 m | front light | `Death` | fire-spell projectile fire · stopped at surface anchor | **PASS** |  |
| Unarmed magic | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.479 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.373 s @ 1.85 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 124 mm @ 1.6 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 124 mm at 1.6 m |
| Unarmed magic | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Unarmed magic | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 123 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 123 mm at 0.85 m |
| Unarmed magic | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.479 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | human | reaction | `Standing1HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Unarmed magic | human | reaction | `Standing1HMagicAttack01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Unarmed magic | human | reaction | `Standing1HMagicAttack02` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Ritual knife | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.479 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.373 s @ 1.85 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 124 mm @ 1.6 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 124 mm at 1.6 m |
| Ritual knife | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Ritual knife | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 123 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 123 mm at 0.85 m |
| Ritual knife | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.479 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | human | reaction | `Standing1HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Ritual knife | human | reaction | `Standing1HMagicAttack01` | 0.753–0.953 s (`human-weapon-measured:ProMagic__Standing1HMagicAttack01:0.7533-0.9533`) | miss (nearest 166 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 166 mm at 1.2 m |
| Ritual knife | human | reaction | `Standing1HMagicAttack02` | 0.482–0.682 s (`human-weapon-measured:ProMagic__Standing1HMagicAttack02:0.4825-0.6825`) | miss (nearest 98 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 98 mm at 1.2 m |
| Single dagger | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.541 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Single dagger | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.367 s @ 1.8 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Single dagger | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 53 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.8, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 53 mm at 1.4 m |
| Single dagger | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Single dagger | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 216 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.8, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 216 mm at 0.85 m |
| Single dagger | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.541 s @ 1.6 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 100 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 100 mm at 1 m |
| Single dagger | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.034 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.976 s @ 1.6 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeRunJumpAttack` | 1.679–1.879 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeRunJumpAttack:1.6787-1.8787`) | miss (nearest 29 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 29 mm at 4.5 m |
| Single dagger | human | death | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.034 s @ 1.6 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.541 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Paired daggers | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-q4:ClawAttack`) | hit 0.369 s @ 1.85 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Paired daggers | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-q4:LungeAttack`) | miss (nearest 53 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 53 mm at 1.4 m |
| Paired daggers | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Paired daggers | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-q4:TailWhip`) | miss (nearest 216 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.85, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 216 mm at 0.85 m |
| Paired daggers | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-q4:BiteAttack`) | hit 0.541 s @ 1.6 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | miss (nearest 100 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 100 mm at 1 m |
| Paired daggers | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.034 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.976 s @ 1.6 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeRunJumpAttack` | 1.679–1.879 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeRunJumpAttack:1.6787-1.8787`) | miss (nearest 29 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 29 mm at 4.5 m |
| Paired daggers | human | death | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.034 s @ 1.6 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |

#### `breachling-ravager-4v` — 67 PASS / 43 GAP (110)

| Weapon set | Attacker | Row | Action | Window (profile) | Contact | Side/weight | Response clip | Effect | Verdict | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| Greatsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.431 s @ 1.4 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.375 s @ 1.4 m | right light | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no right reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.454 s @ 1.6 m | right heavy | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no right reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Greatsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.829 s @ 0.85 m | right heavy | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no right reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.431 s @ 1.4 m | front light | `TwoHandedSwordDeath` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | hit 0.084 s @ 0.7 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.084 s): the strike surface already touches the target when the window opens, so a body overlap at 0.7 m cannot be told from a landed swing |
| Greatsword | human | reaction | `GreatSwordSlash` | 0.620–0.820 s (`human-weapon-measured:GreatSword__GreatSwordSlash:0.62-0.82`) | miss (nearest 64 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 64 mm at 1.4 m |
| Greatsword | human | reaction | `GreatSwordSlash2` | 1.653–1.853 s (`human-weapon-measured:GreatSword__GreatSwordSlash2:1.6533-1.8533`) | hit 1.792 s @ 2.5 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordSlash3` | 0.779–0.979 s (`human-weapon-measured:GreatSword__GreatSwordSlash3:0.779-0.979`) | hit 0.954 s @ 1.4 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordHighSpinAttack` | 0.370–0.570 s (`human-weapon-measured:GreatSword__GreatSwordHighSpinAttack:0.37-0.57`) | hit 0.569 s @ 1 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | hit 1.228 s @ 2.5 m | back heavy (attacker in front) | `RecieveHitBack` | surface-anchored physical impact | **GAP** | contact landed behind the defender root (0.21, 0.79, 2.74) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing |
| Greatsword | human | death | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | hit 0.084 s @ 0.7 m | front heavy | `Death` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.084 s): the strike surface already touches the target when the window opens, so a body overlap at 0.7 m cannot be told from a landed swing |
| Shortsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.447 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Shortsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.339 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Shortsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.454 s @ 2.1 m | front heavy | `StandingReactLargeGut` | surface-anchored physical impact | **PASS** |  |
| Shortsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Shortsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.916 s @ 1 m | front heavy | `StandingReactLargeGut` | surface-anchored physical impact | **PASS** |  |
| Shortsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.447 s @ 1.6 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | reaction | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | hit 0.900 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 0.973 s @ 1.4 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.028 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Shortsword | human | death | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | hit 0.900 s @ 1.6 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.442 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.344 s @ 1.4 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.526 s @ 1.6 m | front heavy | `StandingReactLargeFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Staff | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.899 s @ 1 m | front heavy | `StandingReactLargeFromFront` | surface-anchored physical impact | **PASS** |  |
| Staff | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.442 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `HumanMasculineAthleticMuscularStaffButtSmash` | 0.937–1.137 s (`human-weapon-measured:Interactions__HumanMasculineAthleticMuscularStaffButtSmash:0.9367-1.1367`) | miss (nearest 169 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 169 mm at 0.7 m |
| Staff | human | reaction | `StandingMeleeAttack360High` | 1.014–1.214 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360High:1.0143-1.2143`) | hit 1.078 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StandingMeleeAttack360Low` | 0.870–1.070 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.87-1.07`) | hit 0.929 s @ 1.6 m | right light | `RecieveHitRight` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StandingMeleeAttackDownward` | 0.770–0.970 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.77-0.97`) | hit 0.812 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 1.058 s @ 1.2 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `Standing2HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Staff | human | reaction | `Standing2HMagicAttack01` | 1.080–1.280 s (`human-weapon-measured:ProMagic__Standing2HMagicAttack01:1.0796-1.2796`) | miss (nearest 31 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 31 mm at 1.2 m |
| Staff | human | reaction | `Standing2HMagicAreaAttack01` | 1.203–1.403 s (`human-weapon-measured:ProMagic__Standing2HMagicAreaAttack01:1.2033-1.4033`) | hit 1.345 s @ 0.85 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Staff | human | reaction | `StaffDiagonalStrike` | 0.587–0.787 s (`human-weapon-measured:GapAuthored__StaffDiagonalStrike:0.5867-0.7867`) | hit 0.587 s @ 1.2 m | front light | `RecieveHit` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.587 s): the strike surface already touches the target when the window opens, so a body overlap at 1.2 m cannot be told from a landed swing |
| Staff | human | reaction | `StaffHorizontalStrike` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Staff | human | death | `StandingMeleeAttack360High` | 1.014–1.214 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360High:1.0143-1.2143`) | hit 1.078 s @ 1.6 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Mace | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.447 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Mace | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.339 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the oneHandMeleeProxy response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Mace | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.454 s @ 2.1 m | front heavy | `StandingReactLargeGut` | surface-anchored physical impact | **PASS** |  |
| Mace | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Mace | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.916 s @ 1 m | front heavy | `StandingReactLargeGut` | surface-anchored physical impact | **PASS** |  |
| Mace | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.447 s @ 1.6 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Mace | human | reaction | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | hit 0.890 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Mace | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 0.975 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Mace | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.024 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Mace | human | death | `StandingMeleeAttackDownward` | 0.820–1.020 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackDownward:0.82-1.02`) | hit 0.890 s @ 1.6 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.343 s @ 1.4 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Bow | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.409 s @ 1.6 m | front heavy | `StandingReactSmallFromFront` | surface-anchored physical impact | **GAP** | no front heavy reaction clip in the bow response set; tool kept "ProLongbow__StandingReactSmallFromFront" |
| Bow | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Bow | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.905 s @ 1 m | front heavy | `StandingReactSmallFromFront` | surface-anchored physical impact | **GAP** | no front heavy reaction clip in the bow response set; tool kept "ProLongbow__StandingReactSmallFromFront" |
| Bow | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.439 s @ 1.6 m | front light | `StandingDeathBackward01` | surface-anchored physical impact | **PASS** |  |
| Bow | human | reaction | `BowReleaseFromNock` | 0.520–1.733 s (`bow:GapAuthored__BowReleaseFromNock`) | hit 1.371 s @ 4.5 m | front light | `RecieveHit` | arrow projectile physical · stopped at surface anchor | **PASS** |  |
| Bow | human | reaction | `BowThreeArrowMultishot` | 2.919–5.033 s (`bow:GapAuthored__BowThreeArrowMultishot`) | miss (nearest 82 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 82 mm at 4.5 m |
| Bow | human | reaction | `BowCloseRangeStrike` | 0.903–1.103 s (`human-weapon-measured:GapAuthored__BowCloseRangeStrike:0.9033-1.1033`) | hit 1.027 s @ 0.7 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Bow | human | death | `BowReleaseFromNock` | 0.520–1.733 s (`bow:GapAuthored__BowReleaseFromNock`) | hit 1.371 s @ 4.5 m | front light | `Death` | arrow projectile physical · stopped at surface anchor | **PASS** |  |
| Fire wand | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.442 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.344 s @ 1.4 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.526 s @ 1.6 m | front heavy | `StandingReactLargeFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Fire wand | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.899 s @ 1 m | front heavy | `StandingReactLargeFromFront` | surface-anchored physical impact | **PASS** |  |
| Fire wand | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.442 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Fire wand | human | reaction | `Standing1HCastSpell01` | 1.518–2.300 s (`wand-fire:ProMagic__Standing1HCastSpell01`) | miss (nearest 825 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 825 mm at 0.7 m |
| Fire wand | human | reaction | `Standing1HMagicAttack01` | 0.677–2.333 s (`wand-fire:ProMagic__Standing1HMagicAttack01`) | miss (nearest 677 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 677 mm at 0.7 m |
| Fire wand | human | reaction | `Standing1HMagicAttack02` | 0.447–2.233 s (`wand-fire:ProMagic__Standing1HMagicAttack02`) | hit 0.754 s @ 1.6 m | front light | `RecieveHit` | fire-spell projectile fire · stopped at surface anchor | **PASS** |  |
| Fire wand | human | death | `Standing1HMagicAttack02` | 0.447–2.233 s (`wand-fire:ProMagic__Standing1HMagicAttack02`) | hit 0.754 s @ 1.6 m | front light | `Death` | fire-spell projectile fire · stopped at surface anchor | **PASS** |  |
| Unarmed magic | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.442 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.344 s @ 1.4 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.526 s @ 1.6 m | front heavy | `StandingReactLargeFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Unarmed magic | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.899 s @ 1 m | front heavy | `StandingReactLargeFromFront` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.442 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Unarmed magic | human | reaction | `Standing1HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Unarmed magic | human | reaction | `Standing1HMagicAttack01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Unarmed magic | human | reaction | `Standing1HMagicAttack02` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Ritual knife | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.442 s @ 1.6 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.344 s @ 1.4 m | front light | `StandingReactSmallFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.526 s @ 1.6 m | front heavy | `StandingReactLargeFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Ritual knife | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.899 s @ 1 m | front heavy | `StandingReactLargeFromFront` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.442 s @ 1.6 m | front light | `StandingReactDeathBackward` | surface-anchored physical impact | **PASS** |  |
| Ritual knife | human | reaction | `Standing1HCastSpell01` | unbound (`—`) | unavailable |  |  |  | **GAP** | No explicit strike surface and active interval are bound to this action; not a miss. |
| Ritual knife | human | reaction | `Standing1HMagicAttack01` | 0.753–0.953 s (`human-weapon-measured:ProMagic__Standing1HMagicAttack01:0.7533-0.9533`) | miss (nearest 90 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 90 mm at 1.2 m |
| Ritual knife | human | reaction | `Standing1HMagicAttack02` | 0.482–0.682 s (`human-weapon-measured:ProMagic__Standing1HMagicAttack02:0.4825-0.6825`) | miss (nearest 97 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 97 mm at 1 m |
| Single dagger | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.447 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Single dagger | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.339 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Single dagger | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.454 s @ 2.1 m | front heavy | `StandingReactLargeGut` | surface-anchored physical impact | **PASS** |  |
| Single dagger | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Single dagger | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.916 s @ 1 m | front heavy | `StandingReactLargeGut` | surface-anchored physical impact | **PASS** |  |
| Single dagger | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.447 s @ 1.6 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 0.957 s @ 1.2 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.042 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.964 s @ 1.6 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Single dagger | human | reaction | `StandingMeleeRunJumpAttack` | 1.679–1.879 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeRunJumpAttack:1.6787-1.8787`) | miss (nearest 428 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 428 mm at 4.5 m |
| Single dagger | human | death | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 0.957 s @ 1.2 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.447 s @ 1.6 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Paired daggers | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v4:ClawAttack`) | hit 0.339 s @ 1.4 m | front light | `StandingReactLargeGut` | surface-anchored physical impact | **GAP** | no front light reaction clip in the dagger response set; tool kept "ProMeleeAxe__StandingReactLargeGut" |
| Paired daggers | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v4:LungeAttack`) | hit 0.422 s @ 1.6 m | front heavy | `StandingReactLargeGut` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | unavailable |  |  |  | **GAP** | The four-view body has no authored spit mouth vertices or aim; the pinned legacy mouth basis is not reused; not a miss. |
| Paired daggers | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v4:TailWhip`) | hit 0.916 s @ 1 m | front heavy | `StandingReactLargeGut` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v4:BiteAttack`) | hit 0.447 s @ 1.6 m | front light | `HumanMasculineAthleticMuscularDeathBack` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 0.957 s @ 1.2 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeAttackBackhand` | 0.981–1.181 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackBackhand:0.9811-1.1811`) | hit 1.042 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeAttack360Low` | 0.903–1.103 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttack360Low:0.9033-1.1033`) | hit 0.964 s @ 1.6 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Paired daggers | human | reaction | `StandingMeleeRunJumpAttack` | 1.679–1.879 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeRunJumpAttack:1.6787-1.8787`) | miss (nearest 428 mm @ 4.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 428 mm at 4.5 m |
| Paired daggers | human | death | `StandingMeleeAttackHorizontal` | 0.946–1.146 s (`human-weapon-measured:ProMeleeAxe__StandingMeleeAttackHorizontal:0.9463-1.1463`) | hit 0.957 s @ 1.2 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |

#### `breachling-base` — 6 PASS / 7 GAP (13)

| Weapon set | Attacker | Row | Action | Window (profile) | Contact | Side/weight | Response clip | Effect | Verdict | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| Greatsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v95:BiteAttack`) | hit 0.547 s @ 1.4 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v95:ClawAttack`) | hit 0.357 s @ 1.4 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v95:LungeAttack`) | miss (nearest 19 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (2.2, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 19 mm at 1.2 m |
| Greatsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | hit 0.639 s @ 2.2 m | front light | `GreatSwordImpact` | poison-spit projectile poison · stopped at surface anchor | **PASS** |  |
| Greatsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v95:TailWhip`) | hit 0.821 s @ 1 m | right heavy | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no right reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v95:BiteAttack`) | hit 0.547 s @ 1.4 m | front light | `TwoHandedSwordDeath` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | miss (nearest 101 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 101 mm at 0.7 m |
| Greatsword | human | reaction | `GreatSwordSlash` | 0.620–0.820 s (`human-weapon-measured:GreatSword__GreatSwordSlash:0.62-0.82`) | miss (nearest 190 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 190 mm at 1.4 m |
| Greatsword | human | reaction | `GreatSwordSlash2` | 1.653–1.853 s (`human-weapon-measured:GreatSword__GreatSwordSlash2:1.6533-1.8533`) | miss (nearest 114 mm @ 2.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 114 mm at 2.5 m |
| Greatsword | human | reaction | `GreatSwordSlash3` | 0.779–0.979 s (`human-weapon-measured:GreatSword__GreatSwordSlash3:0.779-0.979`) | miss (nearest 104 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 104 mm at 1.4 m |
| Greatsword | human | reaction | `GreatSwordHighSpinAttack` | 0.370–0.570 s (`human-weapon-measured:GreatSword__GreatSwordHighSpinAttack:0.37-0.57`) | miss (nearest 207 mm @ 1 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 207 mm at 1 m |
| Greatsword | human | reaction | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | hit 1.261 s @ 3 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | death | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | hit 1.261 s @ 3 m | front heavy | `Death` | surface-anchored physical impact | **PASS** |  |

#### `breachling-stalker` — 2 PASS / 10 GAP (12)

| Weapon set | Attacker | Row | Action | Window (profile) | Contact | Side/weight | Response clip | Effect | Verdict | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| Greatsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v24:BiteAttack`) | hit 0.423 s @ 1.4 m | back light (attacker in front) | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no back reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact"; contact on the window's opening sample (0.423 s): the strike surface already touches the target when the window opens, so a body overlap at 1.4 m cannot be told from a landed swing; contact landed behind the defender root (-0.04, 0.84, -0.03) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing |
| Greatsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v24:ClawAttack`) | hit 0.362 s @ 1.6 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v24:LungeAttack`) | hit 0.518 s @ 1.4 m | right heavy | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no right reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | hit 0.767 s @ 2.45 m | front light | `GreatSwordImpact` | poison-spit projectile poison · stopped at surface anchor | **PASS** |  |
| Greatsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v24:TailWhip`) | hit 0.889 s @ 1.2 m | front heavy | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no front heavy reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v24:BiteAttack`) | hit 0.423 s @ 1.4 m | back light (attacker in front) | `TwoHandedSwordDeath` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.423 s): the strike surface already touches the target when the window opens, so a body overlap at 1.4 m cannot be told from a landed swing; contact landed behind the defender root (-0.04, 0.84, -0.03) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing |
| Greatsword | human | reaction | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | miss (nearest 38 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 38 mm at 0.85 m |
| Greatsword | human | reaction | `GreatSwordSlash` | 0.620–0.820 s (`human-weapon-measured:GreatSword__GreatSwordSlash:0.62-0.82`) | miss (nearest 247 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 247 mm at 1.4 m |
| Greatsword | human | reaction | `GreatSwordSlash2` | 1.653–1.853 s (`human-weapon-measured:GreatSword__GreatSwordSlash2:1.6533-1.8533`) | miss (nearest 120 mm @ 3 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 120 mm at 3 m |
| Greatsword | human | reaction | `GreatSwordSlash3` | 0.779–0.979 s (`human-weapon-measured:GreatSword__GreatSwordSlash3:0.779-0.979`) | miss (nearest 180 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 180 mm at 1.4 m |
| Greatsword | human | reaction | `GreatSwordHighSpinAttack` | 0.370–0.570 s (`human-weapon-measured:GreatSword__GreatSwordHighSpinAttack:0.37-0.57`) | miss (nearest 160 mm @ 1.2 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 160 mm at 1.2 m |
| Greatsword | human | reaction | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | miss (nearest 101 mm @ 3 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 101 mm at 3 m |

#### `breachling-oathbound` — 3 PASS / 10 GAP (13)

| Weapon set | Attacker | Row | Action | Window (profile) | Contact | Side/weight | Response clip | Effect | Verdict | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| Greatsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v14:BiteAttack`) | hit 0.437 s @ 1.4 m | right light | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no right reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v14:ClawAttack`) | hit 0.355 s @ 1.6 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v14:LungeAttack`) | hit 0.530 s @ 1.4 m | right heavy | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no right reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | hit 0.700 s @ 2.35 m | front light | `GreatSwordImpact` | poison-spit projectile poison · stopped at surface anchor | **PASS** |  |
| Greatsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v14:TailWhip`) | hit 0.819 s @ 1 m | right heavy | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no right reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v14:BiteAttack`) | hit 0.437 s @ 1.4 m | right light | `TwoHandedSwordDeath` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | hit 0.084 s @ 0.7 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.084 s): the strike surface already touches the target when the window opens, so a body overlap at 0.7 m cannot be told from a landed swing |
| Greatsword | human | reaction | `GreatSwordSlash` | 0.620–0.820 s (`human-weapon-measured:GreatSword__GreatSwordSlash:0.62-0.82`) | miss (nearest 237 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 237 mm at 1.4 m |
| Greatsword | human | reaction | `GreatSwordSlash2` | 1.653–1.853 s (`human-weapon-measured:GreatSword__GreatSwordSlash2:1.6533-1.8533`) | miss (nearest 34 mm @ 2.5 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 34 mm at 2.5 m |
| Greatsword | human | reaction | `GreatSwordSlash3` | 0.779–0.979 s (`human-weapon-measured:GreatSword__GreatSwordSlash3:0.779-0.979`) | miss (nearest 167 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 167 mm at 1.4 m |
| Greatsword | human | reaction | `GreatSwordHighSpinAttack` | 0.370–0.570 s (`human-weapon-measured:GreatSword__GreatSwordHighSpinAttack:0.37-0.57`) | miss (nearest 98 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 98 mm at 0.85 m |
| Greatsword | human | reaction | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | hit 1.302 s @ 1.4 m | back heavy (attacker in front) | `RecieveHitBack` | surface-anchored physical impact | **GAP** | contact landed behind the defender root (0.35, 0.88, 2.28) although the attacker stands in front; the classifier reads the contact point, not the attacker bearing |
| Greatsword | human | death | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | hit 0.084 s @ 0.7 m | front heavy | `Death` | surface-anchored physical impact | **GAP** | contact on the window's opening sample (0.084 s): the strike surface already touches the target when the window opens, so a body overlap at 0.7 m cannot be told from a landed swing |

#### `breachling-ravager` — 8 PASS / 5 GAP (13)

| Weapon set | Attacker | Row | Action | Window (profile) | Contact | Side/weight | Response clip | Effect | Verdict | Reason |
|---|---|---|---|---|---|---|---|---|---|---|
| Greatsword | breachling | reaction | `BiteAttack` | 0.423–0.583 s (`composer-v20:BiteAttack`) | hit 0.426 s @ 1.6 m | left light | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no left reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | reaction | `ClawAttack` | 0.323–0.483 s (`composer-v20:ClawAttack`) | hit 0.360 s @ 1.6 m | front light | `GreatSwordImpact` | surface-anchored physical impact | **PASS** |  |
| Greatsword | breachling | reaction | `LungeAttack` | 0.390–0.550 s (`composer-v20:LungeAttack`) | hit 0.419 s @ 1.6 m | front heavy | `GreatSwordImpact` | surface-anchored physical impact | **GAP** | no front heavy reaction clip in the twoHandSword response set; tool kept "GreatSword__GreatSwordImpact" |
| Greatsword | breachling | reaction | `SpitAttack` | 0.450–1.200 s (`base-spit:SpitAttack`) | hit 0.716 s @ 2.55 m | front light | `GreatSwordImpact` | poison-spit projectile poison · stopped at surface anchor | **PASS** |  |
| Greatsword | breachling | reaction | `TailWhip` | 0.757–0.917 s (`composer-v20:TailWhip`) | miss (nearest 20 mm @ 0.7 m) |  |  |  | **GAP** | no contact at any spar spacing (2.55, 1.6, 1.4, 1.2, 1, 0.85, 0.7, 3, 3.5, 4, 4.5 m); nearest in-window approach 20 mm at 0.7 m |
| Greatsword | breachling | death | `BiteAttack` | 0.423–0.583 s (`composer-v20:BiteAttack`) | hit 0.426 s @ 1.6 m | left light | `TwoHandedSwordDeath` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordAttack` | 0.084–0.284 s (`human-weapon-measured:GreatSword__GreatSwordAttack:0.0844-0.2844`) | miss (nearest 26 mm @ 0.85 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 26 mm at 0.85 m |
| Greatsword | human | reaction | `GreatSwordSlash` | 0.620–0.820 s (`human-weapon-measured:GreatSword__GreatSwordSlash:0.62-0.82`) | miss (nearest 86 mm @ 1.4 m) |  |  |  | **GAP** | no contact at any spar spacing (1.6, 1.4, 1.2, 1, 0.85, 0.7, 2.5, 3, 3.5, 4, 4.5 m); nearest in-window approach 86 mm at 1.4 m |
| Greatsword | human | reaction | `GreatSwordSlash2` | 1.653–1.853 s (`human-weapon-measured:GreatSword__GreatSwordSlash2:1.6533-1.8533`) | hit 1.837 s @ 2.5 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordSlash3` | 0.779–0.979 s (`human-weapon-measured:GreatSword__GreatSwordSlash3:0.779-0.979`) | hit 0.960 s @ 1.6 m | front light | `RecieveHit` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordHighSpinAttack` | 0.370–0.570 s (`human-weapon-measured:GreatSword__GreatSwordHighSpinAttack:0.37-0.57`) | hit 0.570 s @ 1.2 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | reaction | `GreatSwordJumpAttack` | 1.127–1.327 s (`human-weapon-measured:GreatSword__GreatSwordJumpAttack:1.1275-1.3275`) | hit 1.219 s @ 3 m | front heavy | `RecieveHitHeavy` | surface-anchored physical impact | **PASS** |  |
| Greatsword | human | death | `GreatSwordSlash2` | 1.653–1.853 s (`human-weapon-measured:GreatSword__GreatSwordSlash2:1.6533-1.8533`) | hit 1.837 s @ 2.5 m | front light | `Death` | surface-anchored physical impact | **PASS** |  |

### Legacy comparison (greatsword pair, four-view vs legacy body)

#### base

| Row | Action | Four-view (`breachling-base-4v`) | Legacy (`breachling-base`) |
|---|---|---|---|
| breachling reaction | `BiteAttack` | hit @ 1.2 m, front/light, `GreatSwordImpact` [PASS] | hit @ 1.4 m, front/light, `GreatSwordImpact` [PASS] |
| breachling reaction | `ClawAttack` | hit @ 1.4 m, front/light, `GreatSwordImpact` [PASS] | hit @ 1.4 m, front/light, `GreatSwordImpact` [PASS] |
| breachling reaction | `LungeAttack` | miss (84 mm @ 1.4 m) [GAP] | miss (19 mm @ 1.2 m) [GAP] |
| breachling reaction | `SpitAttack` | unavailable [GAP] | hit @ 2.2 m, front/light, `GreatSwordImpact` [PASS] |
| breachling reaction | `TailWhip` | hit @ 0.85 m, right/heavy, `GreatSwordImpact` [GAP] | hit @ 1 m, right/heavy, `GreatSwordImpact` [GAP] |
| breachling death | `BiteAttack` | hit @ 1.2 m, front/light, `TwoHandedSwordDeath` [PASS] | hit @ 1.4 m, front/light, `TwoHandedSwordDeath` [PASS] |
| human reaction | `GreatSwordAttack` | miss (47 mm @ 0.7 m) [GAP] | miss (101 mm @ 0.7 m) [GAP] |
| human reaction | `GreatSwordSlash` | miss (163 mm @ 1.2 m) [GAP] | miss (190 mm @ 1.4 m) [GAP] |
| human reaction | `GreatSwordSlash2` | miss (29 mm @ 2.5 m) [GAP] | miss (114 mm @ 2.5 m) [GAP] |
| human reaction | `GreatSwordSlash3` | miss (112 mm @ 1.2 m) [GAP] | miss (104 mm @ 1.4 m) [GAP] |
| human reaction | `GreatSwordHighSpinAttack` | miss (123 mm @ 0.85 m) [GAP] | miss (207 mm @ 1 m) [GAP] |
| human reaction | `GreatSwordJumpAttack` | hit @ 3 m, front/heavy, `RecieveHitHeavy` [PASS] | hit @ 3 m, front/heavy, `RecieveHitHeavy` [PASS] |
| human death | `GreatSwordJumpAttack` | hit @ 3 m, front/heavy, `Death` [PASS] | hit @ 3 m, front/heavy, `Death` [PASS] |

#### stalker

| Row | Action | Four-view (`breachling-stalker-4v`) | Legacy (`breachling-stalker`) |
|---|---|---|---|
| breachling reaction | `BiteAttack` | hit @ 1.2 m, front/light, `GreatSwordImpact` [PASS] | hit @ 1.4 m, back/light, `GreatSwordImpact` [GAP] |
| breachling reaction | `ClawAttack` | hit @ 1.6 m, front/light, `GreatSwordImpact` [PASS] | hit @ 1.6 m, front/light, `GreatSwordImpact` [PASS] |
| breachling reaction | `LungeAttack` | miss (211 mm @ 1 m) [GAP] | hit @ 1.4 m, right/heavy, `GreatSwordImpact` [GAP] |
| breachling reaction | `SpitAttack` | unavailable [GAP] | hit @ 2.45 m, front/light, `GreatSwordImpact` [PASS] |
| breachling reaction | `TailWhip` | hit @ 0.7 m, back/heavy, `GreatSwordImpact` [GAP] | hit @ 1.2 m, front/heavy, `GreatSwordImpact` [GAP] |
| breachling death | `BiteAttack` | hit @ 1.2 m, front/light, `TwoHandedSwordDeath` [PASS] | hit @ 1.4 m, back/light, `TwoHandedSwordDeath` [GAP] |
| human reaction | `GreatSwordAttack` | hit @ 0.7 m, front/heavy, `RecieveHitHeavy` [GAP] | miss (38 mm @ 0.85 m) [GAP] |
| human reaction | `GreatSwordSlash` | miss (17 mm @ 1.2 m) [GAP] | miss (247 mm @ 1.4 m) [GAP] |
| human reaction | `GreatSwordSlash2` | hit @ 2.5 m, right/light, `RecieveHitRight` [PASS] | miss (120 mm @ 3 m) [GAP] |
| human reaction | `GreatSwordSlash3` | miss (10 mm @ 1.2 m) [GAP] | miss (180 mm @ 1.4 m) [GAP] |
| human reaction | `GreatSwordHighSpinAttack` | miss (84 mm @ 0.7 m) [GAP] | miss (160 mm @ 1.2 m) [GAP] |
| human reaction | `GreatSwordJumpAttack` | hit @ 3 m, right/heavy, `RecieveHitRight` [PASS] | miss (101 mm @ 3 m) [GAP] |
| human death | `GreatSwordAttack` | hit @ 0.7 m, front/heavy, `Death` [GAP] | — |

#### oathbound

| Row | Action | Four-view (`breachling-oathbound-4v`) | Legacy (`breachling-oathbound`) |
|---|---|---|---|
| breachling reaction | `BiteAttack` | hit @ 1.4 m, front/light, `GreatSwordImpact` [PASS] | hit @ 1.4 m, right/light, `GreatSwordImpact` [GAP] |
| breachling reaction | `ClawAttack` | hit @ 1.6 m, front/light, `GreatSwordImpact` [PASS] | hit @ 1.6 m, front/light, `GreatSwordImpact` [PASS] |
| breachling reaction | `LungeAttack` | miss (90 mm @ 1.4 m) [GAP] | hit @ 1.4 m, right/heavy, `GreatSwordImpact` [GAP] |
| breachling reaction | `SpitAttack` | unavailable [GAP] | hit @ 2.35 m, front/light, `GreatSwordImpact` [PASS] |
| breachling reaction | `TailWhip` | miss (260 mm @ 0.85 m) [GAP] | hit @ 1 m, right/heavy, `GreatSwordImpact` [GAP] |
| breachling death | `BiteAttack` | hit @ 1.4 m, front/light, `TwoHandedSwordDeath` [PASS] | hit @ 1.4 m, right/light, `TwoHandedSwordDeath` [PASS] |
| human reaction | `GreatSwordAttack` | hit @ 0.85 m, front/heavy, `RecieveHitHeavy` [GAP] | hit @ 0.7 m, front/heavy, `RecieveHitHeavy` [GAP] |
| human reaction | `GreatSwordSlash` | miss (155 mm @ 1.2 m) [GAP] | miss (237 mm @ 1.4 m) [GAP] |
| human reaction | `GreatSwordSlash2` | hit @ 2.5 m, left/light, `RecieveHitLeft` [PASS] | miss (34 mm @ 2.5 m) [GAP] |
| human reaction | `GreatSwordSlash3` | miss (88 mm @ 1.4 m) [GAP] | miss (167 mm @ 1.4 m) [GAP] |
| human reaction | `GreatSwordHighSpinAttack` | miss (39 mm @ 0.85 m) [GAP] | miss (98 mm @ 0.85 m) [GAP] |
| human reaction | `GreatSwordJumpAttack` | miss (50 mm @ 3 m) [GAP] | hit @ 1.4 m, back/heavy, `RecieveHitBack` [GAP] |
| human death | `GreatSwordAttack` | hit @ 0.85 m, front/heavy, `Death` [GAP] | hit @ 0.7 m, front/heavy, `Death` [GAP] |

#### ravager

| Row | Action | Four-view (`breachling-ravager-4v`) | Legacy (`breachling-ravager`) |
|---|---|---|---|
| breachling reaction | `BiteAttack` | hit @ 1.4 m, front/light, `GreatSwordImpact` [PASS] | hit @ 1.6 m, left/light, `GreatSwordImpact` [GAP] |
| breachling reaction | `ClawAttack` | hit @ 1.4 m, right/light, `GreatSwordImpact` [GAP] | hit @ 1.6 m, front/light, `GreatSwordImpact` [PASS] |
| breachling reaction | `LungeAttack` | hit @ 1.6 m, right/heavy, `GreatSwordImpact` [GAP] | hit @ 1.6 m, front/heavy, `GreatSwordImpact` [GAP] |
| breachling reaction | `SpitAttack` | unavailable [GAP] | hit @ 2.55 m, front/light, `GreatSwordImpact` [PASS] |
| breachling reaction | `TailWhip` | hit @ 0.85 m, right/heavy, `GreatSwordImpact` [GAP] | miss (20 mm @ 0.7 m) [GAP] |
| breachling death | `BiteAttack` | hit @ 1.4 m, front/light, `TwoHandedSwordDeath` [PASS] | hit @ 1.6 m, left/light, `TwoHandedSwordDeath` [PASS] |
| human reaction | `GreatSwordAttack` | hit @ 0.7 m, front/heavy, `RecieveHitHeavy` [GAP] | miss (26 mm @ 0.85 m) [GAP] |
| human reaction | `GreatSwordSlash` | miss (64 mm @ 1.4 m) [GAP] | miss (86 mm @ 1.4 m) [GAP] |
| human reaction | `GreatSwordSlash2` | hit @ 2.5 m, front/light, `RecieveHit` [PASS] | hit @ 2.5 m, front/light, `RecieveHit` [PASS] |
| human reaction | `GreatSwordSlash3` | hit @ 1.4 m, front/light, `RecieveHit` [PASS] | hit @ 1.6 m, front/light, `RecieveHit` [PASS] |
| human reaction | `GreatSwordHighSpinAttack` | hit @ 1 m, front/heavy, `RecieveHitHeavy` [PASS] | hit @ 1.2 m, front/heavy, `RecieveHitHeavy` [PASS] |
| human reaction | `GreatSwordJumpAttack` | hit @ 2.5 m, back/heavy, `RecieveHitBack` [GAP] | hit @ 3 m, front/heavy, `RecieveHitHeavy` [PASS] |
| human death | `GreatSwordAttack` | hit @ 0.7 m, front/heavy, `Death` [GAP] | — |
| human death | `GreatSwordSlash2` | — | hit @ 2.5 m, front/light, `Death` [PASS] |

