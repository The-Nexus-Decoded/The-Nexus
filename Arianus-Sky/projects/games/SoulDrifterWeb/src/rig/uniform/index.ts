/**
 * One animation library, any human body.
 *
 * The problem this solves: 4 builds x 2 presentations x N races x a 1.5-2.0 m
 * height range, on ONE 400-clip library — not one library per body.
 *
 * The design in four steps:
 *
 *   1. `humanoidSkeletonContract` — what a body must be. 65 joints, fixed
 *      parentage, canonical skin order, the +90-degree-X armature. Extra joints
 *      are explicitly legal, because every one of the library's 26,000 rotation
 *      channels targets one of the 65 and nothing else.
 *
 *   2. `bodyProportionProfile` — one height plus fifteen dimensionless scalars on
 *      the reference skeleton. THE ONE RULE: the whole ground chain shares the
 *      `ground` scalar, which makes standing hip height exactly
 *      `REFERENCE_HIP_HEIGHT * ground` in every pose.
 *
 *   3. `libraryRootMotion` — strip the 51,600 inert position/scale channels
 *      (they stamp the source rig's bone lengths back every frame), divide the
 *      Hips track by the reference standing hip height, and rebind it onto a
 *      root-motion proxy so partial-weight blending stays linear.
 *
 *   4. `groundDropCorrection` — a closed-form, stateless correction that makes
 *      floor contact exact even when a profile deliberately breaks the ground
 *      rule. No plant detection, no hysteresis, no iteration, no dt.
 *
 *   plus `gripAdaptation` — socket offsets become palm fractions; the catalog's
 *      grip fractions and curl angles are left exactly as they are.
 *
 * What a new body costs: sixteen numbers and a mesh. Zero clips, zero library
 * bytes, zero per-weapon recalibration.
 *
 * ---------------------------------------------------------------------------
 * WIRING (the four call sites; none of these files are touched by this module)
 * ---------------------------------------------------------------------------
 * 1. `human-review-actor.js:350` — replace
 *        model.scale.setScalar(TARGET_HEIGHT_METERS / bboxHeight)
 *    with
 *        model.scale.setScalar(metresPerRigUnit(profile))
 *    `Box3.setFromObject` does not skin, so the bbox is the bind-space extent and
 *    is IDENTICAL for every profile — it cannot express a 1.5 m body at all.
 *
 * 2. At load, once for the whole game:
 *        normalizeHumanoidLibrary(clips)
 *    then per body, once:
 *        applyProportionProfile(bones, profile, canonicalizeJointName)
 *        skeleton.calculateInverses()      // REQUIRED: rest translations moved
 *    and add an Object3D named ROOT_MOTION_NODE to the model.
 *
 * 3. Per frame, after `mixer.update()` and before `updateMatrixWorld`:
 *        const correction = solver ? solver.solve(groundQuaternions) : 0;
 *        applyRootMotion(proxy.position, hips.position, metrics, correction);
 *    Build `solver` only when `needsGroundCorrection(profile)`.
 *
 * 4. `human-review-catalog.js` LOADOUT `position: [...]` — replace each literal
 *    with `handSocketOffsetMeters(PALM_SOCKET_FRACTIONS[weapon], profile)`
 *    (or `torsoSocketOffsetMeters` for the Spine2-mounted quiver and scabbard).
 *    Leave `gripEnd`, `gripFraction`, `targetLength` and every curl angle alone —
 *    measured, they do not need to change.
 */

export * from "./humanoidSkeletonContract.ts";
export * from "./bodyProportionProfile.ts";
export * from "./libraryRootMotion.ts";
export * from "./groundDropCorrection.ts";
export * from "./gripAdaptation.ts";
