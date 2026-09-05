# Surface-seating the sling — attempt 1, FAILED. Read before attempting again.

Branch `codex/514-gear-surface-fit`. The code was written, measured, and reverted.
The branch carries this document only, and is green.

Do not repeat this approach as written. It measured worse than what it replaced
and it failed the shipped gate.

## What was tried

Measure the torso's own surface once from the actor's skin, then seat each sling
waypoint on it instead of on a hard-coded offset from a bone.

1. `buildTorsoSurfaceProfile(actor)` — walk the skinned mesh with
   `applyBoneTransform`, keep vertices whose dominant skin weight belongs to a
   torso bone (`/hips|spine|neck/`), and bin them in a cylindrical frame around
   the Hips → Neck axis: height band x angular sector, storing a radius per cell.
2. `torsoSurfaceRadius(profile, height, angle)` — O(1) lookup.
3. `seatOnTorso(height, angle)` in `updateQuiverHarness` — place a waypoint at
   `axisPoint + direction x (radius + 8 mm standoff)`.

Height is a fraction of the torso axis and angle is a bearing, so neither carries
metres and neither needs `BODY_RATIO`. That part of the idea is still right.

## Results — every iteration, measured on posed skin

Strap-to-skin distance, `ProLongbow__StandingIdle01` at mid-clip.

| iteration | p10 | p50 | p90 | max |
|---|---|---|---|---|
| **baseline (branch as-is)** | **22.8** | **45.3** | **86.2** | **105.3** |
| 1. seated, max-per-cell, 20x24 bins | 28.3 | 53.9 | 80.4 | 118.5 |
| 2. + seating frame aligned to profile frame | 28.3 | 52.1 | 79.0 | 118.1 |
| 3. + median-per-cell, glutes excluded | 28.3 | 52.1 | 79.0 | 118.0 |
| 4. + coarser 10x12 bins | 32.3 | 55.6 | 79.0 | 105.9 |

Never beat the baseline at p10 or p50. And iteration 4 **fails the shipped test**
`carries the quiver sling over the shoulder instead of through it` —
`ProLongbow__StandingAimOverdraw@0` reports −20.2 mm, i.e. the sling driven
through the body.

## Why it failed — three findings worth keeping

**1. The profile over-reports radius by ~30–40 mm.** It returned a 162 mm chest
radius (157 mm after coarsening) where the true front surface, measured directly
from all skin in a narrow forward window, is **119–130 mm**. Every seated waypoint
therefore started ~30 mm too far out. This is the primary defect and it was never
solved.

**2. The torso is undersampled for this binning.** Only ~1,550 vertices survive
the torso-bone filter. At 20x24 that is ~3 samples per cell, so a cell's "median"
is one arbitrary vertex and the profile inherits its noise — which is why
switching max → median changed the chest radius by *zero* at 20x24 (iteration 3:
the cell held one sample). Coarsening to 10x12 helped the max but not the median.

**3. Dominant-bone filtering is too crude at the boundaries.** `Hips` owns the
glutes and upper thigh, so low bands read leg radius as torso; a height floor of
0.02 only partly helps. Shoulder and lat vertices bleed into the "front" sector
at 15° resolution.

## What the next attempt should do differently

- **Do not bin by angle at this vertex count.** Either raycast the posed mesh per
  waypoint (accurate, but ~12 rays/frame against a non-BVH mesh — measure the
  cost before committing), or fit a smooth cross-section (ellipse per height band)
  rather than a per-sector histogram, which is far more robust to sparse samples.
- **Validate the profile against direct measurement first.** The probe that
  measured true front radius by height (119–130 mm at chest) took minutes and
  would have caught the 30 mm inflation before any waypoint moved. Build that
  check first and assert on it.
- **Note the metric's limit.** "Worst strap point to skin" includes the run out to
  the quiver, which legitimately stands off the back — it never dropped below
  ~140 mm in any iteration and is not a fit signal. Use p50/p90 over the seated
  section, and always run the shipped sling test as the gate.

## Still true, and unchanged by this failure

The diagnosis in the #514 body stands: the sling waypoints are bone offsets that
were never projected onto the surface, and `BODY_RATIO` cannot rescue them because
girth is not a function of height. Surface-seating remains the right idea. This
attempt got the idea right and the measurement wrong.

---

# Attempt 2 — narrowed to the front, still not landed. Ground truth now locked.

Attempt 2 did the thing attempt 1 skipped: built the validator first. It paid for
itself immediately and it is now committed as a permanent test.

## What the validator established

`tests/helpers/torsoGroundTruth.ts` + `tests/torsoSurfaceGroundTruth.test.js` —
every posed vertex, no binning, no bone filtering, median of a narrow window.

| | value |
|---|---|
| torso axis, Hips → Neck | **502 mm** |
| front surface radius, heights 0.15–0.6 | **108–125 mm** |
| front surface radius at the neck (0.9) | 84–88 mm |
| shipped `frontTorsoDepth` | **185 mm** |

**The guess is ~60 mm past the surface.** That is the daylight, quantified. This
is the single most useful number produced across both attempts.

The sides are **not measurable this way and a fix must not try**: the arms hang at
bearing 0 and 180, so a ray along the shoulder line hits a bicep and reports
200–416 mm of "torso". Only the front hemisphere is occlusion-free — which is
convenient, because the front run is the part that visibly floats.

## Why attempt 2 still did not land

A front-only profile (±arc around the sternum, median per height band) was built
in the actor and measured against ground truth band by band, same pose:

| band | height | ground truth | actor profile |
|---|---|---|---|
| 1 | 0.13–0.25 | 108 mm | 141 mm |
| 3 | 0.38–0.50 | 122 mm | 164 mm |
| 4 | 0.50–0.63 | 120 mm | 158 mm |
| 6 | 0.75–0.88 | 98 mm | 128 mm |

Same algorithm, same window, same pose, consistently **~35 mm high**. Arc width
was swept (±60°, ±26°, ±20°, ±12.6°) and the offset survived all of it, so the arc
is not the cause.

**The lead, unresolved:** the profile reports an axis length of **511 mm** where
ground truth measures **502 mm** in the same frame. The profile is being built at
a different pose from the one it is read in — it is built lazily on the first
`updateQuiverHarness`, which runs before the actor is posed by the clip under
test. A 9 mm axis discrepancy does not by itself explain 35 mm of radius, so there
is a second factor still unaccounted for.

Measured gap outcomes, all worse than baseline — reverted, none kept:

| variant | p50 gap |
|---|---|
| baseline | **45.3 mm** |
| ±60° arc | 63.0 mm |
| ±26° arc, 8 bands | 56.9 mm |
| ±12.6° arc, 8 bands | 56.3 mm |

## For attempt 3

1. **Do not write a second measurement implementation.** Both attempts failed the
   same way: a profile in the actor that disagrees with the validator. Have the
   actor call the *same* code the ground-truth helper uses, so the two cannot
   diverge. One implementation, one set of numbers.
2. **Build the profile at a known pose, after `updateMatrixWorld`,** and assert its
   axis length equals the frame's before trusting any radius. That check alone
   would have caught this in one run.
3. Only then replace `frontTorsoDepth` / `lowerTorsoDepth` with the measured
   radius plus a standoff, and gate on both the shipped sling test and the p50
   skin gap.
