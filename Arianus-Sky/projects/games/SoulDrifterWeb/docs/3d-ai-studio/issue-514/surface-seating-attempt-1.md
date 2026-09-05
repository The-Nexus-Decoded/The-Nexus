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
