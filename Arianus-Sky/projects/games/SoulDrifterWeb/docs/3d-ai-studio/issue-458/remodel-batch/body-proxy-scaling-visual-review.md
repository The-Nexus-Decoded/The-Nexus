# Body collision proxies at 1.8 m — OPEN: needs a visual review

**Status: code landed, numbers verified, NOBODY HAS LOOKED AT IT.**
Owner asked to keep this open until the change is reviewed on screen.

## What changed

`src/review/weapon-lab/human-review-actor.js`. The review body's collision proxy
radii were absolute metres measured on the 2.06 m calibration body. The bone
positions they are built from scale with the body, so at
`TARGET_HEIGHT_METERS = 1.8` the proxy stood 14.5% fatter than the body it
represents, and artifacts were being pushed off a torso that was no longer that
wide.

Five tables now spend `BODY_RATIO = TARGET_HEIGHT_METERS / CALIBRATION_HEIGHT_METERS`:

- `BODY_CLEARANCE_CAPSULES` (derived from a plain `CALIBRATION_BODY_CLEARANCE_CAPSULES` literal)
- the four sphere tables, now routed through one `bodyProxySpheres()` helper —
  quiver, harness, greatsword and hand-arrow

The other half of the same change: every socket seat now spends `bodyUnits`,
mounted as well as held. `socketUnits()` is gone. That covers the Spine2 quiver,
its harness, the arrow bundle's own socket and the bow's back-pose IK target.

The two halves only work together. Converting the mounts alone pulls the harness
into the un-shrunk torso spheres (−1.1 to −2.8 mm on all five drawn bow clips);
converting the proxies alone leaves the seats in absolute metres.

## What HAS been verified (CPU-side geometry only)

- `npx tsc --noEmit -p .` clean
- 121 tests pass — `humanReviewActor` (57), `humanWeaponCalibration`,
  `combatReviewLocomotion`, `combatReviewController`, `combatReviewStudio`
- `combatReviewBreachlingMatrix` NOT run (~20 min)
- Weapon audit lane, `--frames 8`, worst p1 weapon-into-body per loadout:

  | loadout | before → after (mm) | arm-agnostic |
  |---|---|---|
  | longswordTwoHand | 42.8 → 35.3 | 23.6 → 4.0 |
  | shortswordOnly | 56.2 → 37.9 | 56.2 → 37.9 |
  | staff | 72.9 → 53.3 | 72.9 → 53.3 |
  | mace | 69.6 → 51.3 | 69.6 → 51.3 |
  | bow | 139.5 → 119.9 | 139.5 → 119.9 |
  | rod / knife / daggerSingle | 18.7→11.1 / 21.8→14.2 / 23.6→16.0 | 0 → 0 |
  | daggers | 41.1 → 33.5 | 41.1 → 33.5 |

  Every delta equals the shrink of the capsule that was reporting worst. The
  geometry did not move; it is measured against a correctly sized body.

- Mounted artifacts on `bow`: quiver 58.1→47.9, harness 116.4→90.5, arrow 66.4→46.9
- Harness sphere clearance on the five drawn bow clips: +7.8 to +12.2 mm
  (was +6.2 to +17.6 before either half)

## What has NOT been verified — THIS IS THE OPEN ITEM

No render. No browser. No frame driven in the Motion Forge. Everything above is
distance arithmetic on bone positions, and a clearance number being positive is
not the same as the quiver looking like it is sitting on a back.

Needs eyes on, at 1.8 m:

1. Quiver and harness seat on the shoulder blade — the strap crossing the
   deltoid, not floating off it and not sunk into the chest.
2. The bow carry-to-back and back-to-hand transitions, where the socket is
   deliberately not in a hand.
3. Arrow bundle in the quiver, and the draw where the shaft leaves it.
4. The worst p1 clips above, which still read 35–120 mm of intrusion after the
   fix — that residual is real geometry, not proxy fat, and needs a judgement
   call on whether it reads as wrong on screen.
5. Greatsword on the back, since `minimumGreatswordBodyClearance` moved too.

Verify against a stable snapshot server on its own Vite port rather than the live
worktree, and drive real frames — a single hidden-pane screenshot renders one
frame and will not show per-frame drift.

## Not done, deliberately

`weaponHandContactMetrics` still uses an absolute 0.024 m digit-contact tolerance
and reports `chainInHand` in world metres. Same latent problem, feeds no gate
today, left as a separate call.

## Harness-side note (not in this repo)

`H:/CodexData/.codex/artifacts/issue-458-motion-composer-v1/tools/weapon-audit-build.mjs`
was updated to lift the calibration literal and scale it by the shipped height
constants, so `lib/weapon-audit-metrics.mjs` measures against the same proxy the
lab uses. That lane is not a git repository, so that edit is not under version
control — rerun `node tools/weapon-audit-build.mjs` there after any change to the
capsule table.

---

# Update — live review done, two findings fixed

A live browser review was run against a frozen `git archive` snapshot of HEAD on
its own Vite port (the worktree could not be used: another session was committing
to it throughout). Verdict came back FAIL, and it was right about the code even
though it was wrong about the cause.

## Found and fixed

**A sixth table of absolute body constants, which this document did not list.**
`updateQuiverHarness()` routed the entire sling from metres measured off the
bones — `shoulderOutboardMeters` 0.075, `frontTorsoDepth` 0.185,
`lowerTorsoDepth` 0.16, `lowerLeft` at −0.17/−0.20, and a dozen more.
`updateGreatswordSheathePreview()` placed all five sheathe waypoints the same
way. Torso depth, shoulder width, waist drop, reach — anatomy, every one. Fixed
by pre-scaling the basis vectors so the fitted literals stay as authored.

**`getArtifactCollisionMetrics` was not a getter.** It called
`enforceMountedArtifactClearance`, which moves sockets on a per-call budget — so
reading the panel corrected an already-corrected pose a second time and displayed
clearances for a frame that was never drawn. The corrector now records its result
and the panel reads it.

## Correction to the review's causation claim

The review reported the sling float as caused by the proxy-radius commit. It was
not. The float waypoints are `chestCenter + constant × axis` — bone position plus
a fixed offset — mathematically invariant under a change to proxy radii and
socket units. Measured directly: with the proxy change reverted the strap's
quiver end sits at z = −0.0987, with it applied −0.0783. That change moved the
strap ~20 mm TOWARD the body.

The float was introduced by the 2.06 → 1.8 m height change in `4e9310681`, which
shrank the body and left these offsets fixed. The proxy work neither caused it
nor fixed it; it stopped the oversized proxy from hiding it.

## Still open

- **Residual weapon-through-body on the worst attack clips** — staff downward
  53 mm, mace underarm 51 mm, bow close strike 120 mm. Confirmed visually as real
  geometry (the staff butt protrudes from the lumbar spine, the mace emerges from
  the buttock). This is an animation decision, not a constant.
- **Off-hand weapons are never body-checked.** `ARTIFACT_CLEARANCE_POLICIES` has
  no `offhand` key, so the second dagger is not gated at all.
- **A visual re-review of THIS fix has not been done.** The sling and back-mount
  changes are verified by measurement only.

## Verification limits worth knowing

- No screenshots exist. The renderer has no `preserveDrawingBuffer`, so canvas
  readback returns a blank frame.
- No before/after side-by-side render — only HEAD was ever served.
- A skin-proximity metric was attempted and discarded as invalid: it measured
  rest-pose vertices, since skinning happens on the GPU. Sphere clearance, which
  the shipped gate uses, is the number to trust.
- `ProLongbow__StandingDeathForward01` is unreachable with bow gear through the
  browser UI (it exists only in catalog mode, where `attachments` is empty). It
  was checked CPU-side instead.
