# SoulDrifter Animation Import and Audit Contract

Last audited: 2026-08-09

## Non-negotiable import route

Every compatible humanoid action uses the same route that fixed Siphon Cleave:

1. Export the animation from Mixamo on the canonical SoulDrifter humanoid rig.
2. Convert the untouched action to a standalone GLB. Do not reconstruct poses, pelvis motion, feet, or weapon arcs by hand.
3. Verify the source hash and exact skeleton compatibility.
4. Bind the raw bone curves to the live cloned actor.
5. Apply an explicit, documented source-frame window. Trimming selects source samples; it does not resample or rewrite bone motion.
6. For in-place actions, normalize only the top-level armature X/Z translation. Preserve bone curves, authored vertical motion, rotation, and scale.
7. Let the runtime controller own weapon state, crossfade, contact marker, recovery, and grounding.
8. Capture at least five rendered phases on the real game model. Numeric checks alone cannot approve an animation.

The authoritative implementation is `src/game/animationPacks.ts`. Embedded model clips are compatibility fallbacks, not the preferred playable-humanoid path.

## Runtime speed tuning

Playback speed is resolved centrally in `src/game/animationTuning.ts`:

`base action rate x global x race x calling x race/calling x animation x animation/calling`

The current static document is `public/config/animation-tuning.json`. A future admin service can provide the same versioned JSON through `VITE_ANIMATION_TUNING_URL`; changing speed does not require re-exporting a model or animation pack. Values are clamped to a safe `0.20x-2.50x` range.

## Active animation audit

Evidence root: `.planning/debug/artifacts/mobile-hud-avatar-regressions/active-animation-audit/`

| Semantic clip | Intended state | Rendered verdict | Notes |
|---|---|---|---|
| `IdleRelaxed` | Sheathed | PASS | Relaxed living idle; no T-pose/scarecrow stance. |
| `WalkBaseline` | Sheathed | PASS | Readable gait and weight transfer. |
| `RunBaseline` | Sheathed | PASS | Full-body run; deterministic sampler now invokes the same grounding boundary as runtime. |
| `DrawSword` | Sheathed to drawn | PASS | Hand/body transition and ready state are readable. |
| `SheatheSword` | Drawn to sheathed | PASS | Returns weapon to hip before hands-free interaction. |
| `WeaponStrikeBaseline` | Drawn | PASS | Raw Mixamo Stable Sword Inward Slash, source frames 17-36; compact horizontal basic cut, planted stance, clean recovery. |
| `SiphonCleaveBaseline` | Drawn | PASS | Raw Mixamo outward slash, approved broad waist-height sweep. |
| `UnarmedPunch` | Hidden | PASS | Clear weight shift, contact, and recovery. |
| `UnarmedKick` | Hidden | PASS | Lead-foot kick with support-foot grounding. |
| `CastWard` | Drawn | PASS | Weapon-channel buff: sword remains in hand; free hand/body perform the ward. |
| `CastSummon` | Sheathed | PASS | Hands-free Recover/summoning channel. |
| `CastProjectile` | Sheathed | PASS | Hands-free two-arm release. |
| `DoorOpenInward` | Sheathed | PASS | Empty-hand inward reach/push. |
| `DoorOpenOutward` | Sheathed | PASS | Empty-hand outward reach/push. |
| `PickupWaist` | Sheathed | PASS | Waist-height inspect/pickup. |
| `PickupGround` | Sheathed | PASS | Full ground reach and return. |
| `PullLever` | Sheathed | PASS | Empty-hand lever pull. |
| `HitReactionMixamo` | Preserve combat state | PASS | Short readable full-body impact reaction. |
| `DeathBaseline` | Defeat hold | PASS | One-way imported collapse plus runtime terminal tip, grounding, and hold; body remains visibly on the floor until recall. |

All 19 clips selected their semantic action, rendered without console/request/HTTP errors, and passed their required weapon-state and grounding checks. Core public action/resource gates remain separate from deterministic pose inspection.

## Rejection rules

Reject the candidate if any rendered phase shows a T-pose, unsupported floating, sliding whole-body translation, a weapon in the wrong socket/state, a weapon crossing the head/torso unintentionally, a phantom shield/support arm, an unreadable contact, or a recovery that does not return to the appropriate idle state.

Do not approve a clip from a Mixamo preview alone. Approval is for the imported clip on the actual live model, with the game weapon socket, grounding, camera, and crossfade active.
