# Cinderbound Warden attack effects and break-off (issue #458, lane L3)

Status: implemented in the runtime and reviewable in Motion Forge (Mobs & bosses).
Verified against the shipped Tripo exports in
`public/assets/3d/creatures/cinderbound-wardens/` (bone contract `hand_L`,
`lower_arm_L`, `hand_R`, `lower_arm_R`, `chest`, `spine`, `root`, shells
`Breakoff_30_Shoulders` / `Breakoff_60_Forearms` / `Breakoff_90_Thighs`).
The four-view rigs from lane L1 (`H:/CodexData/.codex/artifacts/issue-458-remodel-intake/warden-*/rigged/`)
were not delivered at the time of writing; the effects resolve everything by
those node names, so the same code applies to them once they land (see
"Remaining").

## Where the code lives

| File | Role |
| --- | --- |
| `src/game/vfx/cinderbound-warden-vfx.ts` | Procedural three.js visuals (generated glow/noise `DataTexture`s, shared unit cylinder/ring/disc geometry, inline scrolling-noise shader, `Points` particle clouds, sprites, point lights). No external asset. Every visual has `dispose()`. |
| `src/game/dungeons/breach-v2-warden-effects.ts` | The per-clip effect timeline table (`CINDERBOUND_WARDEN_EFFECT_TIMELINES`), the rescale to the runtime clip (`cinderboundWardenEffectSeconds`), the effect system that drives the visuals from clip time, the hit tests and the event stream. |
| `src/game/dungeons/breach-v2-wardens.ts` | Runtime integration: effect system per actor, furnace light coupling, `setEffectListener`, snapshot `activeEffects` / `breakoff`, improved break-off (ember burst, landing scorch, exposed ember core, damage-heat shader uniform). |
| `src/review/weapon-lab/mobs-stage.ts`, `mobs-panel.ts` | Motion Forge: the Warden stage feeds a fixed target 4.5 m ahead (`WARDEN_EFFECT_PREVIEW_TARGET`, marked with a cyan ring) so the beam/siphon/hit tests have somewhere to go; the diagnostics panel prints the live effect phase. |
| `src/game/dungeons/breach-v2-preview.ts` | Dungeon: impact events are recorded as `warden-effect-impact` diagnostics; each controller strike ("The Warden struck for N") plays the next attack of the seeded pattern. |
| `tests/breachV2WardenEffects.test.ts` | Timing, beam origin/end, aim lock, scrub-without-events, sweep arc hit test, ash ring telegraph/burst, Soul Tax, furnace gutter, 3.9 m scaling, break-off stages, disposal. |

## Timeline table

All frames are the phase frames of
`docs/3d-ai-studio/issue-458/cinderbound-warden-motion-v2/attack-plan.json`
(30 fps, `durationFrames` per clip). A window is stored as
`frame / specFrames` and multiplied by the runtime clip's real duration, so the
Greater Warden export (CinderSweep 70 frames instead of 84, AshCall 110 instead
of 108, BladeSweep 54 instead of 60) keeps every effect on the same phase of
its motion. The previous implementation fired everything at a fixed 0.48 of any
clip; nothing uses that fraction any more.

| Clip (spec frames) | Telegraph | Active | Impact event | Recovery | Ground residue |
| --- | --- | --- | --- | --- | --- |
| PalmFire (90) | 24 `aperture-raise` → 52 `fire-release` | 52 `fire-release` → 78 `lower-aperture` | 52 | 78 → 90 `guard-return` | none |
| CinderSweep (84) | 24 `full-load` → 36 `driving-step` | 36 `driving-step` → 60 `powered-follow-through` | 48 `next-square-contact` | 60 → 84 `guard-return` | scorch fades 2.5 s after the clip leaves |
| AshCall (108) | 30 `vent-open` → 62 `ash-expulsion` | 62 `ash-expulsion` → 78 `vent-hold` | 62 | 78 → 108 `sealed-return` | settling ash 1.2 s |
| SoulTax (120) | 34 `open-palm` → 52 `ring-convergence` | 52 `ring-convergence` → 104 `release` | 88 `drain-pulse` | 104 → 120 `guard-return` | none |
| FurnaceShutdown (120) | 18 `interruption` → 36 `valves-expose` | 36 `valves-expose` → 88 `reignite` | 88 `reignite` (no hit) | 88 → 120 `powered-return` | none |

BladeSweep is the quick integrated-blade cut and carries no fire effect (the
spec calls it a quick sweep, the heavy one is CinderSweep). Wayfarer runtime
seconds for PalmFire: telegraph 0.80 s, beam 1.73 s → 2.60 s, impact 1.73 s.

Events (`telegraph`, `active`, `impact`, `end`) are raised once per play when
the clip time crosses the frame while the action is advancing. Scrubbing or
pausing in Motion Forge shows the frame's effect state but raises no event, so
a reviewer cannot trigger gameplay by dragging the timeline.

## Effects

### PalmFire: solid fire beam from the left palm

Spec: attack-plan `PalmFire` "Left-aperture fire projection", `handTargets.hand_L`
on frames 12 to 78; owner: "there is supposed to be graphics and fire effects
from things like the hand attack; it should be a SOLID BEAM".

* Origin: `hand_L` world position. Palm forward axis = normalize(`hand_L` −
  `lower_arm_L`); it orients the palm ring and the palm light. If the rig has no
  hand the body centre and facing are used.
* Telegraph (frames 24 → 52): palm glow sprite grows in, a ring tightens onto the
  palm, a thin additive "aim thread" runs from the palm to the current target
  (chest height, floor + 0.85 m) and a palm light rises. The aim tracks the
  player during the wind-up.
* Beam (52 → 78): the aim is locked on the fire-release frame and the beam is
  held on that line (a sustained beam that could not be side-stepped would
  defeat the "readable heavy-attack telegraph" of `docs/LEVEL_01.md`). Solid
  white-hot core cylinder (r 0.11 m), scrolling flame sheath (r 0.27 m, inline
  shader on the generated noise texture), wide heat-haze sheath (r 0.46 m, a
  slow shimmering additive veil; there is no post-process refraction in this
  renderer so the haze is an approximation, documented here), 72 embers
  travelling along the beam, impact flare + expanding ring + light at the end.
  The chest furnace light surges 1.4× while the beam is on.
* Impact event on frame 52 with `hit` = target within 0.9 m (× boss scale) of the
  locked end point.
* Damage: applied through the existing run-controller path (see "Damage").

### CinderSweep: arc-shaped fire wave that follows the blade

Spec: `CinderSweep` "Heavy next-square cinder sweep", `next-square-contact` at
frame 48; LEVEL_01 "Cinder Sweep".

* The wave is a two-row ribbon (28 segments) on the floor plane rebuilt each
  frame from the actor centre, inner radius 1.05 m, outer 2.9 m, height 1.15 m,
  from the angle the blade tip had when the `driving-step` began to the blade
  tip's angle this frame (tip = `hand_R` extended 0.55 m along the forearm axis).
  When a scrub lands mid-window the loaded right-side guard (−80°) is assumed as
  the start. A brighter crest ribbon rides the outer edge, 64 embers rise inside
  the arc, and a blade glow sprite sits on the tip through the wind-up and swing.
* Ground scorch: a dark ribbon sector of the swept arc appears at
  `next-square-contact` with an ember rim that dims through the recovery; after
  the clip leaves it fades over 2.5 s (`lingerSeconds`).
* Impact event on frame 48 with `hit` = target within 3.1 m and within ±80° of the
  boss facing.

### AshCall: telegraphed expanding ash ring

Spec: `AshCall` "Furnace vent and ash expulsion", `vent-open` 30, `ash-expulsion`
62, `vent-hold` 78; LEVEL_01 "Ash Call".

* Telegraph (30 → 62): a pulsing orange ring at the full burst radius (3.4 m ×
  scale) with a faint ash-grey fill, so the safe distance is readable before
  anything happens.
* Burst (62 → 78): a ring expands from the body to the telegraph radius with a
  low scrolling heat wall; 150 ash/ember points drift outward and up, then keep
  settling through the recovery and 1.2 s beyond the clip.
* The furnace light rises during the inhale and drops after the expulsion.
* Impact event on frame 62 with `hit` = target inside the burst radius.

### SoulTax: left-palm siphon (design decision)

Spec: `SoulTax` "Left-palm siphon and slowing hold" with `handTargets.hand_L`,
`open-palm` 34, `ring-convergence` 52, `siphon-hold` 70, `drain-pulse` 88,
`release` 104; LEVEL_01 "Soul Tax". The spec names the phases but no look, so:

* Palette is pale soul-light (cyan/violet) rather than fire, to read as a
  different mechanic (drain/slow) from the three fire attacks.
* Telegraph (34 → 52): two additive rings converge onto the open palm along the
  palm axis (the `ring-convergence` phase name taken literally).
* Siphon (52 → 104): 64 soul motes stream from the target's feet along an arc
  into the palm; a slowing ring holds under the target; a palm vortex sprite and
  light pulse. Range test 7 m × scale.
* Drain pulse (88): flash at both ends; `impact` event.
* Wayfarer only: the legacy Greater Warden export has no SoulTax clip.

### FurnaceShutdown: interrupted shutdown vulnerability (design decision)

Spec: `FurnaceShutdown` "Interrupted shutdown vulnerability", `interruption`
18, `valves-expose` 36, `kneel` 54, `vulnerable-hold` 72, `reignite` 88, `rise`
104. Also silent on the look, so:

* Interruption (18 → 36): the chest vent plume (90 embers from the `chest` bone)
  spikes then gutters; the furnace point light falls toward 12 %.
* Valves exposed / kneel / hold (36 → 88): a red pulsing valve glow on the chest
  ("strike here") and a gold vulnerability ring on the floor around the boss.
* Reignite (88 → 104): a flash at the chest, the plume relights and the furnace
  light overshoots to 1.6× before settling. No hit test; the `impact` event at
  frame 88 marks the end of the vulnerability window for the caller.
* Wayfarer only (legacy Greater Warden export has no clip).

## Break-off

Contract kept: `Breakoff_30_Shoulders`, `Breakoff_60_Forearms`,
`Breakoff_90_Thighs` detach at 30 / 60 / 90 % damage (world-space geometry
snapshot, hidden source mesh, tumbling debris with gravity, reset when damage
drops). New:

* Ember burst (`<id>:breakoff-<stage>:embers`): 56 embers, a flash sprite and a
  short light at the shell's centre, 1.4 s, then disposed.
* Landing scorch (`<id>:breakoff-<stage>:scorch`): when the debris settles a dark
  disc sized to the shell footprint (0.45 × the larger horizontal extent,
  minimum 0.2 m) is burnt under it, fading in over 0.4 s; its ember rim cools
  over 6 s. It stays until the damage is reset.
* Exposed core (`<id>:breakoff-<stage>:exposed-core`): four molten seams, a glow
  sprite and a light placed at the shell's world centre and parented to the
  nearest `THREE.Bone` (falls back to the model) so it rides the animation;
  sized in world meters regardless of the inherited bone scale; dims when dead.
* Damage heat uniform: the body materials' `onBeforeCompile` now takes
  `cinderDamageHeat` (0 → 1 with damage, pulsing; 0.25 when dead). The authored
  ember seams burn hotter (`1.65 + heat × 2.2`) and the surrounding warm metal
  begins to glow, so the whole machine reads as breaking open. Presentation tag
  stays `dark-iron-ember-v2`; program cache key bumped.
* Snapshot `breakoff[]` reports `stage`, `settled`, `scorchMark`, `exposedCore`
  per stage for the review panels and tests.

## Damage

Damage numbers stay with `BreachV2RunController` (`enemyStrike`, "The Warden
struck for N"). The runtime raises typed `CinderboundWardenEffectEvent`s with a
geometric `hit`; the dungeon preview records the impact as a
`warden-effect-impact` diagnostic and, when the controller commits a Warden
strike, plays the next attack of the seeded pattern (Cinder Sweep, Ash Call,
Soul Tax, Palm Fire on the Wayfarer; Palm Fire replaces Soul Tax on the legacy
Greater Warden) unless an attack is still mid-swing. Routing the geometric
`hit` back into the controller's damage (and stopping the 1.25 s real-time
cadence from striking on its own) is a gameplay-AI change outside this lane; the
listener already carries everything that change needs.

## Motion Forge review

Weapon Lab → Mobs & bosses → Cinderbound Warden / Greater Cinderbound Warden →
action PalmFire / CinderSweep / AshCall / SoulTax / FurnaceShutdown. Effects
render on the stage root through the shared controller; the cyan floor ring 4.5
m ahead is the target. Scrub the timeline to inspect any frame; the diagnostics
drawer shows `Attack effects: palm-fire active 0.42` etc. Damage break-off is
reviewed in the dungeon Warden combat lab (`?wardenReview=1`) with the 30/60/90
buttons.

## Remaining

* Four-view rigs from lane L1 were not present in
  `H:/CodexData/.codex/artifacts/issue-458-remodel-intake/warden-*/rigged/`
  when this landed; once delivered, re-run
  `npx vitest run tests/breachV2Wardens.test.ts tests/breachV2WardenEffects.test.ts`
  and load them in Motion Forge to confirm `hand_L`/`hand_R` sit on the palms
  of the new bodies (the beam origin and blade tip come straight from those
  nodes).
* Gameplay: feed `hit` from the impact event into the controller strike instead
  of the fixed 1.25 s cadence (see "Damage").
* The heat haze is an additive shimmer sheath, not screen-space refraction.
