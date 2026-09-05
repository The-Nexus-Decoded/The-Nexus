# Body replacement — what it actually changes in this build

**Question this document answers:** the #458 critique recommends replacing
`human-foundation-pilot-runtime-4k.glb` as the player body, on two blocking grounds (welded
underwear in a single mesh and atlas; no twist joints anywhere). It also claims replacement is
cheap — *"Any Mixamo-compatible humanoid drops straight in and all 400 clips keep working…
~2–4 days."* This document tests that claim against the build we have today, by name, file, line
and number.

**Scope and method.** Read-only sweep across five lenses (asset pins, authored reaction clips,
weapon grips, tests and fixtures, game runtime). Nothing was modified; no git was run; the test
suite was **not** executed — every predicted failure below is read off an assertion, not observed.
New measurements taken for this document were made by parsing the GLBs directly and are marked
**(measured here)**. Figures inherited from the lens sweeps are attributed where they matter.

---

## The answer

**The 400-clip animation library really does drop in, and that is the largest single cost avoided
— but it is close to the only thing that does.** Everything this project *authored on top of* that
library is pinned to this specific mesh and has to be rebuilt: three reaction packs that each embed
a complete copy of the body, roughly 180 hand-measured weapon-grip numbers, a 488-row contact
matrix, and six IK-solved staff clips. The mechanical part — about 25 checksum, byte-length and
joint-count pins across 12 files — is half a day and genuinely trivial.

**The honest total is 16–22 working days** for one person who already knows this toolchain, of
which roughly 6–8 days is weapon grips and roughly 5 days is the three reaction packs. If you are
willing to ship the game with a degraded review lab, a **narrower 8–11 day path** gets a correct
body on screen holding weapons correctly; the difference is the lab's measured guarantees, not the
game.

**The critique's "2–4 days, re-tune the nine weapon grips" is the cost of getting a body on
screen.** It is not the cost of restoring what has been built on top of this one. Even its narrow
claim is understated: the grip re-tune alone measures at 6–8 days, because 33 of the calibration
numbers are hand-local socket offsets in metres for which no sweep tool exists.

**And the drop-in has a limit nobody has stated.** Every one of the 400 clips carries a position
track on all 65 joints — 26,000 translation channels — and those tracks write the *source rig's*
bone offsets over whatever body they are bound to, every frame. Today that is invisible because the
two rigs are the same skeleton (**measured here:** the 25,600 non-Hips channels deviate from the
body's own bind offsets by a mean worst-frame of **0.1624 %**, max **0.4198 %**). Bind a
differently-proportioned body and those channels overwrite its skeleton with the old one's, so the
new proportions never render. There is a cheap, permanent fix — see
[Strip the translation tracks once](#the-one-cheap-permanent-win).

---

## What "drop-in" means precisely, and where it stops

### What the guarantee actually rests on

Three facts, all confirmed:

1. Joint **names and order** are identical between body and library — **measured here:**
   `skins[0].joints` name sequences compare equal, 65 entries each.
2. Every animation channel targets a node that exists in the body skeleton (0 strays, main session).
3. Bind agreement: mean bone-length disagreement **0.1209 %**, worst **0.9789 %** on
   `mixamorig:Hips` (main session, first-hand).

`bindCompatibleAnimationClip` (`src/game/animationPacks.ts:160-175`) resolves each track by exact
name, then by the last path segment, then by an `*Armature` suffix, and **throws** if any node is
missing. That is a genuine fail-closed naming contract: it shouts rather than drifting.

### The limit: the clips carry the skeleton, not just the motion

**Measured here**, across all 400 clips:

| channel type | total | varying | constant |
|---|---|---|---|
| translation | 26,000 | 24,902 | 1,098 |
| rotation | 26,000 | 25,255 | 745 |
| scale | 26,000 | 22,932 | 3,068 |

Scale is numerically inert — mean worst `|scale − 1|` = **6.405e-7**, max **1.740e-5**. Rotation is
the motion. **Translation is the problem:** it is present on all 65 joints in every clip, and its
values are the source rig's bone offsets. `prepareClip`
(`src/game/dungeons/breach-v2-human-foundation-actor.ts:117-145`) rewrites **only** the Hips track;
the other 64 pass into `THREE.AnimationMixer` untouched and are written to `bone.position` every
frame.

So the library does not *read* the body's skeleton dimensions — it *overwrites* them. The mesh then
skins against inverse bind matrices taken from its own bind, producing a mismatch equal to the bind
disagreement. Today: sub-half-a-percent, invisible. On a body with genuinely different proportions:
the full difference, every frame, in every clip.

This also means a purchased body's *proportions* may not survive even when its *names* do. Whether
they do depends entirely on how the replacement's clips are sourced — see the shopping list.

### What does NOT get the guarantee

| asset | clips | why it is excluded |
|---|---|---|
| **3 humanoid reaction packs** — `humanoid-reactions-{poison-r4, burn-r2, kd-r14}.glb`, 10,210,676 B | 9 | **Measured here:** each pack *embeds the body itself* — 1 mesh, 15,342 verts, 65 joints, 1 image, joint order matching the body exactly. They are the body with clips appended. Pinned by `rigSourceSha256` (`reviewed-reaction-receipt.ts:199, 208, 217`) and composed against this mesh's measured floor, foot-skin contact sets, capsule proxies and back relief |
| **`locomotion-extras.glb`**, 327,056 B | 5 | `scripts/verify-weapon-lab-locomotion.mjs:24` asserts `deepEqual(extraDoc.nodes, originalDoc.nodes)` — a **byte-exact** node hierarchy and rest-transform match. Not editable; must be re-exported |
| **6 `GapAuthored__Staff*` clips** | 6 | **Correction to the earlier sweep:** these are *not* spliced library clips. `src/review/weapon-lab/staff-moves.js:16-24` holds a hand-authored `DEFINITIONS` table of hips-relative hand targets (~210 numbers), solved through an 18-iteration two-link CCD (`solveArm`, `:33-51`) and clamped to `reach * 0.96` measured off the body's own arm chain. Body-coupled |
| **~180 weapon-grip numbers** | — | Measured against this hand's phalanx lengths and bind pose |
| **488 contact-matrix rows** | — | The human mesh *is* the contact surface in 264 rows and the strike probe in 224 |

**What genuinely is free:** the 400 stock clips, and **7 of the 13** `GapAuthored__*` clips — the
bow, greatsword-sheathe and swim-dive entries, which are pure track-splices of library clips
(`buildBowAimRunForward`, `human-review-actor.js:461-481`, filters upper-body tracks from one clip
onto another and rescales by duration). They inherit whatever body-agnosticism the library has.

---

## Everything that changes

### MECHANICAL — re-pin or re-record by a documented procedure

Derivable from the new file with `sha256sum` and a joint count. No judgement.

| what | count | where | effort |
|---|---|---|---|
| sha256 + byte-length pins | 8 literals | `tests/fixtures/weapon-lab-baseline.json:7`; `reviewed-reaction-receipt.ts:82, 199, 208, 217`; `third-party-assets.json:60-61`; `issue-435-lab-asset-map.json:97-98`; `issue-458/human-foundation/asset-receipt.json` | 1 h |
| joint-count (`65`) assertions | 11 sites | `verify-weapon-lab-staff.mjs:38`; `verify-weapon-lab-locomotion.mjs:34`; `humanReviewActor.test.js:101`; `humanWeaponCalibration.test.ts:135`; `reactionPack.test.ts:77, 218, 233, 349, 351`; `animationPacks.test.ts:127`; `reviewed-reaction-receipt.ts:83` | 1 h |
| asset URL / path constants | 6 sites | `human-review-catalog.js:5-6`; `breach-v2-human-foundation-actor.ts:16, 18`; `runtime-asset-manifest.json:19-20` | 15 min |
| `2.06` height literals | 6 source + 6 test | `breach-v2-human-foundation-actor.ts:207, 491`; `World3D.ts:1047`*; `verify-weapon-lab-staff.mjs:36`; `breachV2HumanFoundationActor.test.ts:50, 118, 128, 165, 191`; `humanWeaponCalibration.test.ts:132` | 1 h |
| asset-map row count + `protectedPaths` agreement | 2 gates | `weaponLabRelease.test.js:107, 110` | 30 min |
| 56 fingertip millimetre pins | 56 values | `humanReviewActor.test.js:275-296, 340-343` — printed by `tools/grip-tip-pins.mjs` | 2 h, **after** grips re-solve |

\* `World3D.ts:1047` is plausibly a coincidence of value, not a shared constant — it routes to
`human-shadowknight.glb` via `avatarIdentity.ts`, a separate lineage. Verify before changing.

**Subtotal: ~25 literals across 12 files, half a day.** No tool in the repo regenerates them;
`issue-435-lab-asset-map.json` and `runtime-asset-manifest.json` are hand-maintained and must be
edited in lockstep or `weaponLabRelease.test.js:110` fails.

### TOOL-DERIVABLE — re-run an existing harness

| what | scale | tool | effort |
|---|---|---|---|
| Library translation tracks: strip or re-bake | 25,600 channels | new one-off script (precedent: `scripts/replace-glb-animation.mjs`) | 1–2 d incl. re-validation |
| `locomotion-extras.glb` re-export | 5 clips | Mixamo export on the new rig | 0.5–1 d |
| 3 humanoid reaction packs | 9 clips, 10.2 MB | `build-humanoid.mjs` / `-burning` / `-knockdown`, all accept `--rig <path.glb>` | 2–4 d, high variance |
| 488-row contact matrix | 488 rows | `MATRIX_RECORD=<path> npx vitest run tests/combatReviewBreachlingMatrix.test.ts` (documented at `combatReviewBreachlingMatrix.test.ts:29-32`) | 1 d compute |
| Finger curls, 4 of 5 digits | ~75 angles, 10 grip sets | `grip-curl-sweep.mjs` → `grip-pick-curls.mjs`, ~90 browser runs | 1 d compute + 0.5 d driving |
| `gripFraction` | 6 values | `weapon-audit.mjs --gripFractionBias` + `grip-calibration-measure.mjs` | 0.5 d |
| 24 humanoid blend-measurement numbers | + 2 pinned entry blends | `tools/reaction-entry-gap.mjs --archetype humanoid` | 0.5 d |
| GetUp leg keys | ~160 key pairs | `solve-humanoid-getup-legs.mjs` (needs its hard-coded rig path and `PATH` ankle heights updated first) | 0.5 d |

> **Toolchain risk, stated plainly.** The composer lives at
> `H:/CodexData/.codex/artifacts/issue-458-motion-composer-v1/` — **verified: outside the
> repository, unversioned, with absolute `H:/CodexData/...` paths hard-coded.** The SoulDrifterWeb
> project has no `tools/` directory at all. If that folder is lost, the reaction-pack and
> blend-measurement rows stop being tool-derivable and become from-scratch re-authoring. Back it up
> or vendor it before starting.

### HAND-AUTHORED — someone has to make judgement calls

This is the real cost.

| what | count | where | effort |
|---|---|---|---|
| Hand-local socket offsets (metres) | 33 numbers, 11 attachments | `human-review-catalog.js:259-370`; duplicated at `humanWeaponCalibration.ts:8`, `staff-grip.js:95, 113`, `verify-weapon-lab-staff.mjs:43` | 1.5–2.5 d |
| Thumb curls + thumb IK targets | 6 + 3 | `human-review-catalog.js`; `human-review-actor.js:1987, 1994`. **No optimiser exists** — `grip-pick-curls.mjs:16` covers Index/Middle/Ring/Pinky only; `--thumb` is a fixed input | 1–1.5 d |
| Contact / closure thresholds (metres) | ~12 | `human-review-actor.js:930, 939, 946, 985-987, 1342, 1670`; `staff-grip.js:94, 153` | 0.5 d |
| Optimiser acceptance band | `BAND = [0, 12]` | `grip-pick-curls.mjs:17` — this body's finger flesh radius is baked into the objective function | 0.5 d |
| `PRONE_ROOT` + prone arm/leg angles | y/pitch/roll + ~20 angles | `actions/humanoid/prone-pose.mjs:32, 46-70` — pitch −85 encodes *"shoulder-blade skin sits 38 mm deeper than buttock skin"*; whole clip holds 4.03 mm of floor margin | 1–1.5 d |
| GetUp hip curve + press lifts | 14 keys + 2 amplitudes | `knockdown.mjs:344, 355, 376, 381` | 1–2 d |
| 6 staff clip definitions | ~210 numbers | `staff-moves.js:16-24` | 1 d |
| Collision capsule radii | 7 values | `lib/humanoid-adapter.mjs:128` — scaled by height only, **girth-blind** | 0.5 d |
| Hardcoded proportion constants | 5 | `breachling-mouths.ts:84, 86, 88`; `breach-v2-preview.ts:127-128, 5686` | 0.5 d |
| Greatsword calibration + support CCD | 22 numbers | `humanWeaponCalibration.ts:7-17, 56-98` | 0.5 d |
| GAP-row re-triage | 243 rows | confirm each failure has the same cause on the new body | 1–2 d |
| Measurement documentation | 1,674 lines | `combat-review-matrix.md` (877), `attack-reaction-contract.md` (732), `asset-receipt.json` (65) — line counts verified here | 1–2 d |
| Licence provenance | 1 entry | `third-party-assets.json:60-61` — a new provider needs a new licence line, not an edited hash. **Nothing tests this**, so it rots silently | 0.5 d + a call |

### Totals

| path | scope | estimate |
|---|---|---|
| **Ship path** | pins + library + grips + height reconciliation. Correct body on screen, weapons held correctly, degraded review lab | **8–11 days** |
| **Full parity** | + reaction packs, contact matrix, GAP re-triage, documentation | **16–22 days** |
| Twist-joint payoff | rewrite 5 grip solver sites to distribute roll; widen `verify-weapon-lab-staff.mjs:117-118` | **+2–3 days** |

---

## Migration sequence

Dependencies are real here; several steps invalidate work done before them.

**0 — Before you buy anything.** Probe the candidate body against the contract below. A 20-line
GLB parse answers every question in the shopping list and costs nothing. Also back up or vendor
`issue-458-motion-composer-v1/`.

**1 — Settle the height, once, everywhere.** `TARGET_HEIGHT_METERS` is already `1.8`
(`human-review-catalog.js:551`) while the game is still `2.06` at
`breach-v2-human-foundation-actor.ts:207, 491`. **No test asserts the constant**, so nothing catches
the divergence. Also fix `HUMANOID_HEIGHT = 2.06` at `lib/humanoid-adapter.mjs:131` — it is stale
both in value and in the line number it cites. *This must come first: any grip or clip work done
before the height is settled is thrown away.*

**2 — Strip the library's non-Hips translation tracks** (see below). Do it before the matrix
re-record, not after; it moves the library sha, which cascades into `locomotion-extras.glb`'s
`deepEqual` gate and the baseline pins.

**3 — Snapshot the current state. ⚠ IRREVERSIBLE POINT.** Re-recording the 488-row matrix
overwrites the only record of current contact behaviour. Copy
`tests/fixtures/combatReviewBreachlingMatrix.json` aside first. Likewise keep the old body file —
the critique's own advice, *"keep it as the motion-test mannequin until the replacement lands"*, is
right for a second reason: the shipped pack bytes are the only surviving record of the tuned
composer constants.

**4 — Drop in the body, re-pin mechanically.** The build fails first, not the tests:
`prune-runtime-assets.mjs` runs as the last step of `npm run build` and throws
`Runtime build is missing protected assets` if a `protectedPaths` entry is absent. **Keep the
filename** and this costs nothing.

**5 — Re-export `locomotion-extras.glb`** from Mixamo on the new rig. Gated by a byte-exact
`deepEqual`; not editable by hand.

**6 — Re-solve the grips.** Sockets and thumb first (hand-authored, no tool), then the curl sweep,
then print the 56 fingertip pins. Order matters: the pins only *pass their own quality bars* once
the curls are right.

**7 — Rebuild the three reaction packs. ⚠ Use new revision numbers** (`-r5`, `-r3`, `-r15`), never
reuse a filename — the `rN` convention is what makes a bad revision recoverable. Note the load-time
trap: `reviewed-reaction-receipt.ts:123` throws `pinned against the wrong rig` in a top-level
`export const`, so between steps 4 and 7 the weapon lab **cannot be imported at all** — this is an
import-time crash, not a test failure. Expect the six standing clips to pass first try and the
three floor clips (Knockdown, ProneHold, GetUp) to need most of the week.

**8 — Re-derive the blend measurements.** `reaction-contract.ts:277-298` is a module-load IIFE that
throws if a pinned blend disagrees with the table. The humanoid row **sets two of the three entry
blends** (burning `92.1456 / 770.8 = 0.11954 → 0.12`; knockdown `92.1456 / 431 = 0.21379 → 0.215`),
so this fires for certain. Until it is updated, every module importing `reaction-contract` throws —
that is the whole review lab, not just the reaction tests.

**9 — Re-record the matrix, re-triage the 243 GAP rows, rewrite the docs.**

---

## The one cheap, permanent win

**Strip the 25,600 non-Hips translation channels from the library.** Bone translations on a rigid
skeleton are bind data, not motion; Mixamo bakes them anyway. Removing them lets each body's *own*
bind offsets survive, which is what retargeting is supposed to mean.

**Measured here, the cost of doing this on the current body:** worst per-joint local displacement
**6.6804e-5 rig units** on `mixamorig:RightHandIndex2` — **0.1377 mm at 2.06 m, 0.1203 mm at
1.80 m**. Sub-0.15 mm, across all 400 clips.

Be honest about one consequence: the fingertip pins assert to ±0.05 mm
(`toBeCloseTo(x, 1)`), so a 0.14 mm shift **does** move some of them. Those 56 values are being
re-recorded anyway. In exchange the library becomes body-agnostic permanently, and every future
body swap costs nothing on the animation side. Do it once, during this migration.

---

## Shopping list — what a replacement must satisfy

Give this to whoever sources the body.

### Skeleton contract — non-negotiable

1. **All 65 `mixamorig:`-prefixed joints, exact names.** Enforced in at least five independent
   places: `animationPacks.ts:113-127` (throws on any missing node), `rigCheck` in the external
   composer (`lib/humanoid-adapter.mjs:179-181`), `verify-weapon-lab-locomotion.mjs:33` (collects
   bones by `name.startsWith('mixamorig')` — a differently-named rig collects **zero**),
   `verify-weapon-lab-staff.mjs:40`, and the hard-coded chain
   `Hips / LeftUpLeg / LeftLeg / LeftFoot` at `combat-review-locomotion.ts:78-79`.
2. **A root node matching `/(?:hips|armature)$/i` carrying a position track.** `prepareClip:119-125`
   throws `has no locomotion-root position track` otherwise.
3. **No duplicate right-hand naming.** `breach-v2-human-foundation-actor.ts:152-176` accepts
   `mixamorig:RightHand` *or* `hand_r` and throws `socket is ambiguous` if a rig ships both.
4. **Four-segment finger chains**, `<side>Hand<Finger>{1,2,3,4}` — 21 joints per hand, 42 of the 65.
   The grip harness's `boneKey` and every `…4` fingertip reference depend on it.
5. **Twist joints must be leaf/sibling bones, never inserted into the existing chain.**
   **Measured here:** `mixamorig:LeftForeArm`'s only child is `mixamorig:LeftHand`. Inserting a
   twist bone between them re-parents the hand and invalidates the library's translation tracks for
   the hand plus all 20 finger joints on that side — in all 400 clips. Parent the twist bone to the
   forearm as an additional child. Extra joints are otherwise harmless: no clip drives them, and
   `animationPacks.ts` only requires that clip nodes exist on the body, not the reverse.
6. **Preserve `definitionId: "human-foundation-pilot"`** (`human-review-actor.js:2649`). Three
   runtime branches gate on that string — `combat-review-locomotion.ts:70`,
   `combat-review-projectiles.ts:85, 89`. Free to keep; 4 mechanical edits if renamed.

### Proportions — the decisive question

**Either** match the current rig's bone offsets (so the library's baked translations remain a
no-op), **or** accept that the library must be stripped or re-baked. Ask the vendor for the bind
skeleton and diff it before purchase. If step 2 of the migration is done, this constraint
disappears — which is the argument for doing it.

Also note the arm: **measured previously**, forearm 0.3472 vs upper arm 0.2669 rig units — the
forearm is **30.1 % longer**, where anatomy wants ~20 % shorter. Every grip and support-hand IK
number was fitted against that. A corrected arm is an improvement that *costs* a re-fit.

### Mesh and material

7. **Separate garment submeshes**, not one welded mesh — the primary #458 blocker. Note this is
   **new capability, not repaired capability**: the game has no equipment-slot machinery to hide,
   swap or tint a submesh today (`stripImportedHelpers` clones every material once per actor and
   there is exactly one actor). Budget for that code.
8. **A texture set per slot**, not one atlas with garment texels welded in (currently 24.1 % of
   covered texels).
9. **Base colour + metallicRoughness + normal, with tangents.** None exist today.
10. **Fingers separate with clearance** — the critique measured 7–10 mm and called the hands the one
    part of the budget spent well. Do not accept a mitten hand.

### Budget

**Measured here:** `dist` is **449,053,661 B** against `preferredMaxBytes` 475,000,000 and
`maxBytes` 500,000,000 — **24.7 MiB of preferred headroom, 48.6 MiB to the hard ceiling**
(`runtimeAssetBudget.test.js:28-29`). Retiring the old body frees 2.4 MB. But each reaction pack
embeds a full body copy *including the 4k atlas* (**measured here:** 1 image each), so a modular
body with several atlases multiplies by three across the packs. A multi-atlas body plus a re-baked
library shipping alongside the old one during transition **exceeds the preferred ceiling on its
own.** Plan the transition to avoid ever holding both.

---

## What gets better

Not everything here is cost. Concretely, what *disappears* rather than being repaired:

1. **Clothing and armour become possible at all.** Today the underwear is welded into one mesh and
   one atlas — there is no swap to implement. This is the blocking ground, and replacement is the
   only thing that removes it.
2. **The 998-island unwrap, the ~2,500 triangles misallocated to the head, the missing
   normal/roughness/AO set and the missing tangents** are all sidestepped rather than fixed. The
   critique's own list of what fixing-in-place would require ends with *"nothing of the original
   survives except the silhouette."*
3. **The reaction packs' guard-space defect gets fixed for free.** `reaction-contract.ts:142-156`
   records that humanoid pack clips stand with soles at y = −0.500 rig units facing +90° while
   library guard clips stand at y = −0.003 facing −8.2° — a **497 mm teleport at the moment of
   impact**, currently worked around by excluding those rows from the derivation
   (`guardComparable: false`). The packs are being rebuilt anyway. This is the natural moment, and
   there will not be a cheaper one.
4. **The height divergence gets forced into the open and resolved once.** Right now the lab is
   1.8 m, the game is 2.06 m, the catalog comment claims they agree, and no test asserts the
   constant. That is a live bug today, independent of this decision.
5. **Three proportion constants get re-derived against a real measurement instead of staying
   wrong.** `BREACHLING_SPIT_TARGET_HEIGHT_METERS = 1.15` aims acid **40.2 cm below** the chest
   (measured at 1.5516 m), at hip height. `BREACHLING_SPIT_PLAYER_HEIGHT_METERS = 1.8` leaves the
   top **24.7 cm** of the body unhittable. `PLAYER_CAPSULE_HEIGHT = 1.69` lets **31.7 cm** of head
   through a portcullis the game declares passable. All three are wrong today and none of them will
   be looked at otherwise.
6. **The library becomes body-agnostic permanently** if step 2 is taken — every future swap costs
   nothing on the animation side.
7. **Twist joints fix the forearm-roll collapse** (0.208 of bind cross-section) — **but only if the
   grip solvers are rewritten.** Five sites write the hand quaternion directly and distribute
   nothing to the forearm (`staff-grip.js:54, 100, 130, 157`; `humanWeaponCalibration.ts:96`), and
   `verify-weapon-lab-staff.mjs:106, 135` deliberately drives the staff wrist through a full 180°
   roll. Adding twist bones without that rewrite buys nothing. Counted as +2–3 days above.

---

## Where this sweep is uncertain

Stated so the estimate can be discounted honestly.

- **The test suite was not run.** Every predicted failure is read off an assertion. A green run
  could still surprise us; more likely, additional failures exist that no one read.
- **The composer was not executed.** That `build-humanoid.mjs --rig <new.glb>` works on a different
  body is inferred from reading it and `humanoid-adapter.mjs`, not from running it. The reaction
  pack estimate (2–4 days) carries the most variance of any line here — the knockdown lane took
  **14 revisions** to reach contract on the current body.
- **Whether a purchased body's bone offsets match the current rig is unknown**, and it is the single
  cheapest thing to find out. It decides between "library drops in untouched" and "library must be
  stripped or re-baked". Probe before buying.
- **The 488-row matrix wall-clock** is derived from the 600,000 ms per-pair timeout × 44 pairs
  (7.3 h worst case), not observed.
- **Three earlier lens findings were corrected while writing this**, which suggests others may need
  it: the runtime lens's claim that only Hips varies and 64 channels are constant came from a
  5-clip sample and is false library-wide (24,902 of 26,000 translation channels vary); the
  authored-clip lens's claim that all 13 `GapAuthored__*` clips are body-agnostic is true for 7 and
  false for the 6 staff clips; and the documentation total was cited as 1,874 lines on a
  265-line figure for `asset-receipt.json`, which is 65 lines. Spot-check any figure here that a
  decision turns on.
- **`World3D.ts:1047`'s `human: 2.06`** may be an intentionally separate isometric-presentation
  value on a different avatar path. It is listed as mechanical, but confirm before touching it.
- **Effort assumes one person who already knows this toolchain.** Someone learning it should expect
  materially more, particularly on the three floor clips.

---

*Read-only analysis. No source, asset, test or other document was modified in producing this;
no git command was run. New measurements were taken by parsing the shipped GLBs directly.*
