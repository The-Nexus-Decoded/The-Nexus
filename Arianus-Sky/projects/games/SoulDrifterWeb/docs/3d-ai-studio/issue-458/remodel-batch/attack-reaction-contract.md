# Attack-to-Reaction Contract — issue 458

Plan of record for the owner's requirement, as narrowed by the owner on 2026-09-04:

> "Not every attack. Every **special** attack. A normal hit, a punch, the bites, a swipe of a sword, those are
> things like that. But the special attacks, projectiles, energy weapons."

So there are two tiers, and only one of them is bespoke work:

**Tier 1, normal hits — one shared reaction set, not per-attack work.** Claws, bites, sword swings, punches, staff
and mace blows and every other single-contact melee strike all draw from the same directional flinch set: light and
heavy, front, back, left and right. Authoring that set once serves every melee attack in the game. Rows below marked
`melee` are Tier 1 unless they say otherwise. A heavy melee strike escalates to the shared knockdown, which is also
authored once.

**Tier 2, special attacks — a bespoke reaction each.** Projectiles, beams, energy weapons, area attacks and drains.
When the acid spit connects the human is covered and screaming. The beam gets a sustained burn. The area attacks and
the drain each get their own read. These are the rows marked `projectile`, `beam`, `area` and `drain`, and they are
where the animation budget goes.

Arrows: an arrow that hits stays visible in the body **briefly**, so the player sees where it went in, then clears.
It is not a permanent attachment and targets never accumulate into pincushions.

**The human NPC is the first target to complete. Player-side attacks come later.** That ordering is reflected in the
table below: section A (creature attacks landing on the human) is the deliverable; section B (player attacks landing on
creatures) is scoped but deferred.

Every row carries a measured number or a file and line. Where a pairing is uncertain it is marked `UNCERTAIN` with the
reason, not guessed.

---

## 0. Three findings that reshape the work before any clip is authored

**0.1 — In Breach v2 the human plays no receiving animation at all, and cannot.**
`src/game/dungeons/breach-v2-human-foundation-actor.ts:22-37` declares exactly 14 approved actions (idle, walk, run,
and eleven greatsword clips); line 38 freezes them and the loader filters the 400-clip library down to that set. A
case-insensitive grep for `hit|death|react|damage` across that entire file returns **zero matches** (verified). The
actor exposes `root`, `model`, `animationNames`, `setMoving` and `play` — there is no damage entry point. All 45
receiving-side human clips installed in
`public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb` (24 reactions + 21
deaths) are loaded into the browser and discarded. **Until this actor gains a hit/death path, every human reaction in
this contract is unreachable in the game.** This is item R1 and it blocks the entire human side.

**0.2 — In Breach v2 the human only ever holds a greatsword, so the first deliverable is one response family, not five.**
The 14 approved actions are greatsword-only. Human reaction clips are bound per weapon family at
`src/review/weapon-lab/human-review-catalog.js:152-159`; `twoHandSword` binds only the `greatsword` group
(`:122-128`), which is five `GreatSword__GreatSwordImpact*` clips plus two `TwoHandedSwordDeath` clips — **all frontal,
all non-directional, no heavy variant**. Completing the human as the first target means completing the `twoHandSword`
response family. The other four families are review-lab scope.

**0.3 — The project record says POISON, never acid. "Acid" does not exist in this project.**
A case-insensitive grep for `acid` across `docs/`, `src/` and `tests/` (`.md`, `.ts`, `.json`) returns **zero hits**
(verified). The authoritative motion spec calls it poison:
`issue-458-motion-composer-v1/actions/breachling/spit.mjs:15` — `note: 'poison spit released at jaw-wide frame;
travels ~3 cells'`. The review tool types it poison: `combat-review-contact-resolver.ts:85` assigns
`damageType: "poison"` for emitter `base-spit`, and `combat-review-types.ts:87` is
`"physical" | "fire" | "ice" | "poison" | "arcane"` — **there is no `acid` member**.
The owner's acid framing is a **new design decision, not a recovery of an existing spec.** It is adopted below because
the owner stated it, but it is flagged at D1 as needing an explicit rename-or-add ruling, because it costs a change to a
frozen enum and to the composer spec that generates `composer-mob-packs.ts`.

---

## 1. The attack-to-reaction table

Kind values: **melee** (single contact point) · **projectile** (released body, flight) · **beam** (directed, held) ·
**area** (arc or radial, no single incoming direction) · **drain** (sustained channel).

Source values, exactly three:
**MIXAMO** — human clips; this project sources 100% of human motion from mixamo.com
(`third-party-assets.json` id `issue-435-lab-animations`, sha256 `6b06fcf0…a7c7d793`). No human reaction has ever
been authored here; the only authored human motion is the 12 `GapAuthored__*` clips, none of which is a reaction.
**COMPOSER** — creature clips built by `issue-458-motion-composer-v1`.
**RUNTIME** — a system, not a clip (stuck arrow, acid pool, decal, status, knockdown state).

### Section A — creature attacks landing on the HUMAN (first target, do these)

Contact times are from the composer packs and the warden effect timelines. The human target family in the shipped
dungeon is `twoHandSword` for every row (see 0.2).

| Attacker | Attack — clip, duration, contact | Kind | Reaction the target must play | Target family | Exists today | Source |
|---|---|---|---|---|---|---|
| Breachling (all 8 bodies) | `ClawAttack` 1.300s, contact 0.383s, window 0.323–0.483s | melee | Light directional flinch, 4 sides | `twoHandSword` | **NO** — family has only 5 frontal `GreatSwordImpact*`, no side, no light/heavy split | MIXAMO |
| Breachling (all 8) | `BiteAttack` 1.450s, contact 0.483s, window 0.423–0.583s | melee | Medium directional flinch, 4 sides | `twoHandSword` | **NO** — same gap | MIXAMO |
| Breachling (all 8) | `LungeAttack` 1.300s, contact 0.450s, window 0.390–0.550s | melee | **Knockdown** + prone hold + getup (owner: heavy attacks knock down). Classifier reads it heavy (`lunge` token, `combat-review-controller.ts:194`) | `twoHandSword` | **NO** — zero clips match `/knock\|prone\|getup\|rise/` in the 400-clip library | MIXAMO + RUNTIME (R8 knockdown state) |
| Breachling (all 8) | `TailWhip` 1.750s, contact 0.817s, window 0.757–0.917s | melee **arc** | **Knockdown**, swept-leg read. Heavy (`tail` token). The tool reduces the sweep to one tail-tip point, so a plain flinch under-represents it | `twoHandSword` | **NO** | MIXAMO + RUNTIME (R8) |
| Breachling (legacy 4 bodies) | `SpitAttack` 1.200s, release 0.450s, flight 0.750s, range 5.25 m = three 1.75 m cells | projectile | **Acid impact flinch → "covered and screaming" sustained loop → recovery.** The owner's headline case. Three clips, not one | `twoHandSword` | **NO** — no burn/acid/poison reaction on any human clip; every installed reaction is a one-shot, longest 1.800s | MIXAMO ×3 + RUNTIME (R3 status, R6 body overlay, R7 pool) |
| Breachling (4 four-view bodies) | `SpitAttack` — **never fires** | projectile | *(same as above once emission works)* | `twoHandSword` | **BLOCKED** — `createReviewProjectiles` refuses to emit for `body === "fourview"` (`combat-review-projectiles.ts:164-167`); 40 matrix rows unavailable | COMPOSER (author mouth verts + head basis per four-view pack) |
| Warden (both bodies) | `BladeSweep` — wayfarer 2.000s impact 1.033s / oathbreaker 1.800s impact 0.930s. 100° frontal cone, 2.40 m / 2.60 m | melee **arc** | Directional flinch. Single impact, `lingerSeconds: 0` — a flinch is correct here, unlike the other warden attacks | `twoHandSword` | **NO** — no sided greatsword reaction | MIXAMO |
| Warden (both bodies) | `CinderSweep` — wayfarer 2.800s impact 1.600s / oathbreaker 2.333s impact 1.333s. 160° arc, 3.10 m / 3.36 m, `lingerSeconds: 2.5` (`breach-v2-warden-effects.ts:95`) | **area** | **Knockback/stagger, then a burning loop for the 2.5 s residue window.** Not a flinch — there is a ground scorch that keeps burning after the clip ends | `twoHandSword` | **NO** — no knockback, no burning loop; zero clips match `/burn\|fire\|flame/` in the library | MIXAMO ×2 + RUNTIME (R3 burning status, R7 residue damage) |
| Warden (both bodies) | `AshCall` — wayfarer 3.600s impact 2.067s / oathbreaker 3.667s impact 2.105s. **360° radial**, 3.40 m / 3.68 m, `lingerSeconds: 1.2` (`:105`) | **area** | **Non-directional** crouch-shield or knockdown. Omnidirectional: there is no incoming direction to flinch away from, so the sided picker is meaningless here | `twoHandSword` | **NO** | MIXAMO + RUNTIME (R8) |
| Warden (both bodies) | `PalmFire` 3.000s, impact 1.733s, **held active 1.733–2.600s** (0.867 s). Aim locks at release; 0.90 m / 0.975 m radius around the locked point | **beam** | **Sustained burn**: entry flinch at 1.733s, then a burning-under-beam loop held for 0.867 s, then recovery. One impact event but the beam is visually held | `twoHandSword` | **NO** — no looping "taking damage" pose exists on any body, human or creature | MIXAMO ×2 + RUNTIME (R3) |
| Warden **Wayfarer only** | `SoulTax` 4.000s, **active 1.733–3.467s** (1.733 s of continuous siphon), impact 2.933s, **7.00 m** radius — the longest reach any actor has. Raises the hit test **twice** (`breach-v2-warden-effects.ts:594-595`) | **drain** | **Channelled pull**: dragged/held toward the boss for 1.733 s, then release. Two hit events per play, so the reaction must survive a re-trigger without restarting | `twoHandSword` | **NO** | MIXAMO + RUNTIME (R3, R9 re-trigger guard) |
| Warden **Wayfarer only** | `FurnaceShutdown` 4.000s | *(not an attack)* | **NONE — excluded by design.** Its hit test returns `false` unconditionally (`breach-v2-warden-effects.ts:402`). It is a self-state vulnerability window. Do not assign a victim reaction | — | n/a | — |

**Deaths for the human.** `twoHandSword` binds only `GreatSword__TwoHandedSwordDeath` 2.433s and `Death2` 2.633s
(`human-review-catalog.js:126-127`), both non-directional. A directional death set, an acid death and a burning death
are all missing. Listed once here rather than repeated per row.

### Section B — player attacks landing on CREATURES (scoped, deferred)

Collapsed to **distinct clips**, because the reaction is chosen from the clip name and byte-identical clips produce
byte-identical reactions. Shortsword and mace are the same three `ProMeleeAxe` clips (`human-review-catalog.js:224-229`
and `:237-242`); the damage character is carried entirely by the attached mesh. Listing them twice would be padding.

Severity below is the **classifier's** verdict, not a motion description: `combat-review-controller.ts:194` tests
`/jump|spin|heavy|smash|overhead|slam|charge|lunge|tail/i` against `${attack.id} ${attack.label} ${attack.clipName}` —
**the label feeds the regex too**, which is why `MeleeAttack360Low` labelled "Spinning strike" reads heavy while
`GreatSwordAttack` reads light.

| Attacker | Attack — clip, duration | Kind | Severity (classifier) | Reaction the target must play | Target family | Exists today | Source |
|---|---|---|---|---|---|---|---|
| Human greatsword | `GreatSword__GreatSwordAttack` 1.233s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human greatsword | `GreatSwordSlash` 1.300s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human greatsword | `GreatSwordSlash2` 3.567s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human greatsword | `GreatSwordSlash3` 1.867s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human greatsword | `GreatSwordHighSpinAttack` 1.900s | melee arc | **heavy** (`spin`) | Heavy directional stagger | Breachling / Warden | **NO** — `RecieveHitHeavy` exists but no heavy-sided variant on any body | COMPOSER |
| Human greatsword | `GreatSwordJumpAttack` 2.200s | melee | **heavy** (`jump`) | **Knockdown** | Breachling / Warden | **NO** — heaviest Breachling reaction "sits back", never leaves its feet (`receive-hit.mjs:1-12`) | COMPOSER + RUNTIME (R8) |
| Human 1H melee (shortsword, mace, both dagger sets) | `ProMeleeAxe__StandingMeleeAttackDownward` 2.300s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human 1H melee | `…AttackHorizontal` 2.433s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human 1H melee | `…AttackBackhand` 3.200s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human dagger / staff | `…MeleeAttack360Low` 2.533s | melee arc | **heavy** (label "Spinning strike") | Heavy directional stagger | Breachling / Warden | **NO** — no heavy-sided clip | COMPOSER |
| Human staff | `…MeleeAttack360High` 3.200s | melee arc | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human dagger | `…MeleeRunJumpAttack` 3.700s | melee | **heavy** (`jump`) | **Knockdown** | Breachling / Warden | **NO** | COMPOSER + RUNTIME (R8) |
| Human staff | `Interactions__…StaffButtSmash` 3.033s | melee | **heavy** (`smash`) | Heavy stagger | Breachling / Warden | Breachling has `RecieveHitHeavy` 1.300s (lab only), Warden **NO** | COMPOSER |
| Human staff | `GapAuthored__StaffDiagonalStrike` 1.800s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human staff | `GapAuthored__StaffHorizontalStrike` 1.800s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human staff | `ProMagic__Standing2HMagicAttack01` 2.733s | melee *(mis-typed)* | light | Directional flinch | Breachling / Warden | **UNCERTAIN** — semantically a spell but the tool measures the physical staff tip; there is no projectile binding for the staff loadout (`combat-review-projectiles.ts:50` requires `loadoutId === "rod"`). Reaction pairing depends on ruling D4 | COMPOSER |
| Human staff | `ProMagic__Standing2HMagicAreaAttack01` 3.000s | **area** | light *(wrong)* | **Non-directional** knockback. This is the human's one area attack and the classifier calls it light | Breachling / Warden | **NO** — and the classifier cannot express it | COMPOSER + RUNTIME (R9 severity fix) |
| Human bow | `GapAuthored__BowReleaseFromNock` ~1.733s, release phase 0.30, 6 m range, 0.65 m drop | projectile | light | Pierce flinch **+ arrow stays stuck in the body** (owner requirement) | Breachling / Warden | **NO** reaction; the stick mechanism exists but is review-only | COMPOSER + RUNTIME (R5 stuck projectile) |
| Human bow | `GapAuthored__BowThreeArrowMultishot` 5.033s, release phase 0.58, spread −0.075/0/+0.075 rad | projectile ×3 | light | **Three independent impacts**, each with its own contact and its own stuck arrow. Not one reaction | Breachling / Warden | **NO** | COMPOSER + RUNTIME (R5, R9 re-trigger guard) |
| Human bow | `GapAuthored__BowCloseRangeStrike` 3.033s | melee | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human fire wand | `ProMagic__Standing1HCastSpell01` 2.300s, release 1.518s | projectile | light | **Fire impact + burning loop.** Resolver already types this `damageType: "fire"` (`combat-review-contact-resolver.ts:86`) | Breachling / Warden | **NO** — zero `/fire\|burn\|flame/` clips on any creature body | COMPOSER + RUNTIME (R3) |
| Human fire wand | `ProMagic__Standing1HMagicAttack01` 2.333s, release 0.677s | projectile | light | Fire impact + burning loop | Breachling / Warden | **NO** | COMPOSER + RUNTIME (R3) |
| Human fire wand | `ProMagic__Standing1HMagicAttack02` 2.233s, release 0.447s | projectile | light | Fire impact + burning loop | Breachling / Warden | **NO** | COMPOSER + RUNTIME (R3) |
| Human ritual knife | `ProMagic__Standing1HMagicAttack01` / `02` | melee (knife tip) | light | Directional flinch | Breachling / Warden | Breachling **PARTIAL**, Warden **NO** | COMPOSER |
| Human unarmed magic | `ProMagic__Standing1HMagicAttack01` / `02` | — | — | **NONE ASSIGNABLE** — structurally unresolvable: `deriveHumanStrikeWindow` needs a `primary` socket (`combat-review-contact-profiles.ts:89-91`), the projectile path needs `loadoutId === "rod"` (`:50`), and no production code constructs the `{kind:"bones"}` strike surface that `combat-review-contact-profiles.ts:12` declares | — | n/a | RUNTIME (R10) before any pairing is possible |
| Human staff | `GapAuthored__StaffForwardThrust` 1.500s | melee | — | **UNMEASURED** — a real thrust that lands, but `human-review-catalog.js:448` has no `/Thrust/` token so it classifies "interaction" and is filtered out of the spar matrix (`combat-review-controller.ts:446`). No window, no contact, no reaction | Breachling / Warden | n/a | RUNTIME (R11 semantic fix) first |

**Breachling "PARTIAL" means exactly this:** `RecieveHit` 0.800s, `RecieveHitHeavy` 1.300s, `RecieveHitLeft` 0.850s,
`RecieveHitRight` 0.850s, `RecieveHitBack` 0.850s all exist in the eight review-lab GLBs — verified by reading
`breachling-base-fourview-composer-v8.glb` (15 clips) and `breachling-oathbound-fourview-composer-q4.glb` (15 clips).
They exist in **none** of the four shipped runtime bodies: `breachling-base.glb` (12 clips) and
`breachling-ravager.glb` (12 clips) carry only `RecieveHit 0.767s` and `Death` (2.800s / 1.500s) — verified directly
from the GLB JSON chunks. `breach-v2-breachlings.ts:52-55` correspondingly lists only `RecieveHit`. **The directional
work is done and pinned in the lab and has never reached the game.** This is a promotion, not new authoring, and it is
the single highest-leverage creature item (C1).

**Warden "NO" means there is one clip for everything.** Verified from the GLBs: `cinderbound-warden.glb` 15 clips —
`HitReact 0.600s`, `DeathCollapse 3.600s`; `greater-cinderbound-warden.glb` 13 clips — `HitReact 0.600s`,
`DeathCollapse 3.000s`. No direction, no severity, on either body. `breach-v2-wardens.ts` `setDamageFraction` plays
that one 0.600 s clip for every hit the boss ever takes, driven purely by HP fraction.

**No Warden attack has ever been measured.** `composerPackForDefinition` matches only
`/^breachling-(base|stalker|oathbound|ravager)(-4v)?$/` and its own doc comment states "Wardens and humans have no
composer pack" (`composer-pack-lookup.ts:8-16`, verified). `REVIEWED_STRIKE_SOURCES` keys only `breachling-base` and
`breachling-oathbound`. All 20 Warden attack rows resolve `unavailable`. Section A's warden rows are therefore
specified from the **effect timelines**, which are real and running, not from tool measurements.

**`SoulTax` is invisible to the review tool.** `mob-review-actor.ts:18-27` (verified) has no regex matching `SoulTax`,
so it falls through to `"interaction"`; the spar matrix admits only `attack`, `cast`, or a projectile binding
(`combat-review-controller.ts:446`, verified). The one sustained attack in the game is excluded from the attack sweep.

---

## 2. RUNTIME systems that do not exist and must be built

| ID | System | What it needs |
|---|---|---|
| **R1** | **Human receiving-side path in Breach v2** | A `beginHit(direction, severity, damageType)` and `beginDeath(direction)` on `breach-v2-human-foundation-actor.ts`, and reaction/death names added to `BREACH_V2_HUMAN_FOUNDATION_ACTIONS` (`:22-37`) so they survive the `APPROVED_ACTIONS` filter. **Blocks the entire human side.** |
| **R2** | **Damage type on the gameplay contract** | `CombatEngine.damage(target, amount)` (`src/game/combat.ts:43`) is a bare scalar with one modifier (`guard ? ceil(amount*0.45)`). It needs a type parameter. `ReviewDamageType` (`combat-review-types.ts:87`) is review-evidence only and is not a gameplay contract; `ANIMATION_PRODUCTION_PIPELINE.md:206-216` does not list a damage type among the required contract fields. |
| **R3** | **Status-effect system** | Does not exist in any form. Needs a registry, an application point at the contract marker (`ANIMATION_PRODUCTION_PIPELINE.md:226-229` already specifies *where*: "At the contract event marker: apply damage/healing/resource/status/summon/ward results"), a duration and tick, a victim-clip binding, and an expiry/cleanse rule. `GAME_BIBLE.md:1064` lists it as unbuilt: "Data-driven unit, class, ability, status, reaction, encounter, and tile definitions." |
| **R4** | **Spit projectile collision and damage** | `spawnPoison` (`breach-v2-breachlings.ts:438-449`, verified) creates one 0.08 m sphere at 6.5 m/s with `remainingSeconds: 1.4` and **no collision test, no damage call, no impact**. It flies up to ~9.1 m and is removed. Recorded as a known absence at `issue-458-base-breachling-motion-repair.md:464-467`. |
| **R5** | **Stuck projectile, brief** | The mechanism already exists and is correct — `combat-review-impact-anchor.ts` binds a hit to a barycentric point on a named triangle plus the projectile's local offset/quaternion, and re-samples the deformed triangle every frame so it rides the skin (`:55-58`, `:101-103`, `:124`). It is **review-only**: verified importers are `combat-review-controller.ts`, `combat-review-projectiles.ts` and one test — **nothing in `src/game/` imports it.** Needs promotion into the game path plus a lifetime/limit policy. Applies to arrows; see D3 for whether fire and acid should stick. |
| **R6** | **Victim body overlay ("covered in acid")** | No system paints a substance onto a character. There is no decal system at all: a grep for `decal` across `src/` returns 0 hits, and `three/examples/jsm/geometries/DecalGeometry.js` is present in `node_modules` and never imported. Needs either a skinned overlay material layer or projected decals on the victim mesh. |
| **R7** | **Ground residue / acid pool, and area-impact damage wiring** | Two halves. (a) The linger mechanism already exists — `lingerSeconds` (`breach-v2-warden-effects.ts:63`, `CinderSweep: 2.5` at `:95`, `AshCall: 1.2` at `:105`) with `startLinger` and a per-frame decay, and the flat-disc scorch precedent in `cinderbound-warden-vfx.ts`. A spit pool can copy it. (b) The wiring does not exist: the geometric hit test is computed correctly and **thrown away** — `breach-v2-preview.ts:4718-4722` (verified) records the impact to diagnostics and returns, with its own comment calling the event advisory. |
| **R8** | **Knockdown state machine** | `knockdown` and `get-up` are two strings in `motionArchetypes.ts:103-104` and `:134-135` (verified: those are the **only** four occurrences in `src/`) with no clip, no state and no caller. `prone` and `ragdoll` return zero hits repo-wide. Needs a down state, a prone duration, a getup transition and an input lockout. Required by four attacks in section A and two in section B. |
| **R9** | **Reaction-picker fixes in `CombatReviewController`** | Three defects, all verified in source. (a) **No fallback**: `:202-204` return `null` when no sided clip exists and the caller at `:288` applies only `if (pick)`, so the panel silently keeps the previous reaction — this produces exactly **48 of the 488** pinned fixture rows (verified by counting rows whose reason contains "reaction clip in the"). (b) **Severity unreachable for sided hits**: `:202-204` return *before* the heavy branch at `:205`, so no heavy-left/right/back reaction can ever be selected — author heavy-directional clips without this fix and they are dead assets. (c) **Re-trigger guard**: `SoulTax` raises two hit events and `BowThreeArrowMultishot` three; a reaction must not restart on each. |
| **R10** | **Bone-based strike surface** | `ReviewStrikeSurface` declares a `{kind:"bones"}` case (`combat-review-contact-profiles.ts:12`) that **no production code constructs** — it appears only in two test files. Unarmed attacks are structurally unresolvable until this is built. |
| **R11** | **Semantic classifier gaps** | (a) `human-review-catalog.js:448` has no `/Thrust/` token, so `GapAuthored__StaffForwardThrust` is filtered out of the matrix; any future `Thrust`/`Stab` clip hits the same wall. (b) `mob-review-actor.ts:18-27` has no `SoulTax` match, so the game's only drain is classified `interaction` and excluded. |
| **R12** | **Direction from bearing, not contact point** | `classifyContactDirection` (`:185-191`, verified) reads only the contact **position** in the defender's frame — never the attacker's bearing. The pinned fixture measures **9 back and 9 left** contacts against **240 front** and 31 right; the matrix doc attributes 6 four-view rows to legitimate over-the-back or through-the-feet contacts landing while the attacker stands in front. Any authored back reaction will be mis-triggered until this is classified by bearing or contact normal. |
| **R13** | **Warden strike surfaces for the review tool** | Prerequisite for measuring any Warden reaction at all. No warden entry in `REVIEWED_STRIKE_SOURCES` and no composer pack. Separately, the runtime effect volumes never run in the review pairing: `mobs-stage.ts` drives effects from `update()` but the review path calls `stage.pose()` only. |


### 2.1 Owner rulings applied to this section, 2026-09-04

**R5 is short-lived, not persistent.** The arrow is parented at the measured hit point so the shaft reads as having
gone into the body, held for a beat while the target reacts, then removed. Owner: they stay "briefly... you see where
the arrows penetrate the body", explicitly not a pincushion. So R5 needs a lifetime and a fade, and needs no
accumulation policy, no per-target arrow budget and no save-state.

**Tier 1 collapses a lot of R-work into one asset.** The directional flinch set and the knockdown are each authored
once and shared by every melee attack, so the size of this queue is set by the Tier 2 specials plus the shared sets,
not by the number of attacks in the game.

---

## 3. Status effects

### 3.1 What the docs support

`GAME_BIBLE.md:208-217` defines the complete "Universal Tactical Concepts" vocabulary: **Guard, Stagger, Mark, Ward,
Bind, Corruption, Soul Fracture, Realm Pressure, Conduit**. `:898` repeats the canonical set as "ward, mark, bind,
stagger, corruption, and Soul Fracture states". **Burning is not in it. Acid is not in it.** The two `burning` mentions
at `:441` and `:444` are Mage colour-formula names ("Red + Blue: burning containment ring"), not statuses.

Poison in the Bible is flavour and tiles, not a creature status: `:238` lists "poison" among Abarrach-Stone realm
hazards, `:272` defines a `Poison Fissure` tile, and `:582` defines `Venom Cut` — "delayed damage and healing
reduction" — which is a **Slayer player skill**, not something a Breachling does. That is the closest analogue in the
entire project. No poison stack, tick, duration, stacking rule, cleanse rule or resistance rule is written down
anywhere.

**None of it is implemented.** There is no status data structure, registry, enum or application path in `src/game`.

### 3.2 What the owner has asked for

- **Acid** — the spit covers the human, who screams. Not in the record (0 grep hits); the record says poison.
- **Burning** — implied by "when the beam hits". `PalmFire`, `CinderSweep` (2.5 s residue) and `AshCall` (1.2 s
  residue) all land on the player and the resolver already types wand contacts `"fire"`.
- **Knockdown** — "heavy attacks should knock targets down". Covered as R8, a state rather than a status.
- **Stuck arrows** — a persistent attachment, not a status. Covered as R5.

### 3.3 Minimum set for acid and burning to read on a victim

Two statuses, each needing five things. This is the floor, not a wish list.

| | **ACID** | **BURNING** |
|---|---|---|
| Applied by | Breachling `SpitAttack` (release 0.450s, flight 0.750s) | Warden `PalmFire`, `CinderSweep`, `AshCall`; human fire wand ×3 |
| 1. Type on the contract | `acid` — **new**; `ReviewDamageType` has no such member (see D1) | `fire` — already exists in `ReviewDamageType` and is already assigned at `combat-review-contact-resolver.ts:86` |
| 2. Duration + tick | Needs a number. **None exists** — no doc assigns the spit any damage value, cooldown or duration | Should key off `lingerSeconds`, which is already authored: `CinderSweep 2.5`, `AshCall 1.2`, `PalmFire 0` (beam is held for its 0.867 s active window instead) |
| 3. Victim clip | Impact flinch + **sustained writhe/scream loop** + recovery — 3 clips (MIXAMO) | Impact flinch + **burning loop** + recovery — 3 clips (MIXAMO) |
| 4. Body VFX | Overlay on the victim mesh (R6) | Overlay on the victim mesh (R6) |
| 5. Ground residue | Acid pool (R7), copying the `lingerSeconds` + flat-disc pattern | Scorch already exists for the Warden; reuse it |

**The loop clip is the hard part and it is the same problem for both.** There is **no looping "taking continuous
damage" pose anywhere in the project**, on any body. Every human reaction installed is a one-shot and the longest is
`ProMeleeAxe__StandingReactLargeFromRight` at 1.800s. The review tool cannot even express a sustained response: its cue
kind is constrained to `"none" | "reaction" | "death"` (`combat-review-controller.ts:388`). Making acid and burning
read on a victim is therefore not "add two statuses" — it is **add a sustained-reaction category that does not exist**.

---

## 4. Dependency order

### Blocks everything on the human side
**R1 (human receiving-side path)** → nothing else on the human side is observable until this lands. 45 clips are
already loaded and discarded.

### Critical path to the owner's headline case (acid spit on the human)
```
R1  human hit/death path
 └─ R4  spit projectile collision  ──┐
 └─ R2  damage type on contract    ──┼─ R3  status system
                                     │
    M1  acid flinch + writhe loop + recovery (MIXAMO — BLOCKED, see §5)
                                     │
                                     ├─ R6  victim body overlay
                                     └─ R7  acid pool + area damage wiring
```
`R4` and `R2` are independent of each other and can run in parallel. `R3` needs both. `M1` is an owner-supplied asset
and can be requested on day one — it does not wait for any code.

### Critical path to the creature side
```
C1  promote RecieveHit{Heavy,Left,Right,Back} from the 8 lab GLBs onto the 4 shipped bodies
 └─ update breach-v2-breachlings.ts:52-55 action list
     └─ wire a damage path for Breachlings (they currently have none — no call site plays RecieveHit or Death)
```
`C1` is a promotion of existing, pinned, authored clips — **the cheapest high-value item in the whole ticket** and it
has no upstream dependency.

### Must land before authoring heavy-directional clips, or those clips are dead on arrival
```
R9b  severity ordering in pickReactionClip  →  author RecieveHitHeavy{Left,Right,Back} (COMPOSER)
R12  direction from bearing                 →  author any back reaction (human or creature)
```
Authoring first and fixing the picker second wastes the authoring.

### Must land before any Warden reaction can be measured
```
R13  warden strike surfaces  →  R11b  SoulTax semantic  →  warden rows enter the spar matrix
```
Note this gates *measurement*, not *authoring*: the Warden effect timelines in section A are real and running, so
Warden victim reactions can be authored against them without waiting for R13.

### Runs in parallel with everything (no dependencies)
- **R9a** — picker fallback. Fixes 48 of 488 fixture rows on its own; pure controller change.
- **R11a** — add `/Thrust/` to the human semantic regex.
- **R5** — promote `combat-review-impact-anchor.ts` into the game path. Self-contained; the hard part is already built and tested.
- **R8** — knockdown state machine. Independent of clips; the clips can arrive later.
- **Four-view spit emission** (COMPOSER) — unblocks 40 matrix rows and needs a new field on `ComposerMobPack`, whose current `spit` shape (`composer-mob-packs.ts:12`) carries only `releaseSeconds` and `endSeconds`.
- **R10** — bone strike surface for unarmed. Only unarmed magic depends on it.

### Deliberately last
Section B (player attacks on creatures) in full. Per the owner, player-side attacks come later. `C1` is the exception
and should be pulled forward because it is nearly free.

---

## 5. Reaction library — authored here, by body archetype

**Superseded 2026-09-04.** This section previously listed nine Mixamo downloads as blocked on the owner. That was
wrong. Owner ruling:

> "Mixamo doesn't cover everything. It has reaction animations, yes, but for special attacks, like the acid attack,
> like the beam attack from the boss, you just have to do an animation for that specific model, or maybe just a
> general animation that works for every model. Just a burning body. That way we have one animation that works across
> every creature of the same type. Humanoids would just have a burning animation for when the fire attack hits them.
> Acid, we replace them with that and then go back to the correct scene. But it would be better to have a specific
> animation for that particular body type."

Nothing here is blocked. Mixamo stays the source for ordinary human motion it already covers; every **special**
reaction is authored by the procedural composer, exactly as creature motion already is.

### 5.1 The library is keyed by archetype and damage type, not by model

One reaction serves every body that shares a skeleton archetype, so the count is set by archetypes times special
damage types rather than by the number of creatures in the game.

| Archetype | Skeleton | Rig the shipped pack is authored on | Bodies it covers |
|---|---|---|---|
| `humanoid` | Human Foundation rig, 65 joints | `human-foundation-pilot-runtime-4k.glb` | the human NPC, and any future humanoid |
| `warden` | Cinderbound rig, 18 joints, no digits or toes | `wayfarer-cinderbound-warden-fourview-v12.glb` | the Wayfarer four-view body |
| `breachling` | quadruped rig, 30 joints - 24 canonical plus six front toes | `breachling-base-fourview-composer-v8.glb` | the base four-view body |

**Measured correction, 2026-09-04.** The "bodies it covers" column above used to
read "both Warden bodies" and "all four Breachlings". It does not, and the numbers
say why. Joint NAMES are shared across an archetype; BIND POSES are not. Against
the rig each pack is authored on, `oathbreaker-greater-cinderbound-warden-fourview-v7.glb`
differs by up to 0.229 in a quaternion component and 0.681 in an inverse bind
matrix entry; `breachling-ravager-fourview-composer-v4.glb` (34 joints) and
`breachling-oathbound-fourview-composer-q4.glb` (38) differ by up to 1.462 of
quaternion component, and `breachling-stalker-fourview-composer-v5.glb` (26) has
no `front_toe1L..3L/R` at all and is refused outright by `assertReactionClipsBind`.
An absolute-rotation pack forces its own rig's rest pose onto whatever it plays
on, so a sibling body needs its own build from the same authoring, not a second
row in the receipt. `REACTION_RIG_LINEAGE` in `reviewed-reaction-receipt.ts` is
where each archetype's rig is pinned, and every pack row is checked against it.

| Damage type | Reaction shape | Driven by |
|---|---|---|
| `acid` | impact recoil, then a sustained clawing-at-the-body loop, then recovery | Breachling spit |
| `burn` | impact flinch, then a sustained burning writhe, then recovery | Warden Palm Fire, Cinder Sweep |
| `concussive` | knocked off the feet, prone hold, get up | Ash Call, Lunge, Tail Whip, heavy melee |
| `drain` | pulled toward the caster, resisting, released | Soul Tax |

That is three archetypes times four types, and the loop and recovery segments are shared within a type, so the real
authoring load is far below the 12 cells implies.

### 5.2 Sequencing rule

A special reaction takes the body over from whatever it was doing, plays impact, holds the loop for as long as the
effect lasts, then hands control back to the clip the actor would otherwise be in. Owner: "replace them with that and
then go back to the correct scene." The loop is separate from the impact so a 0.867 s beam and a 2.5 s residue can
both drive the same asset for different durations.

### 5.3 What Mixamo is still good for

The Tier 1 directional flinch set, the sided greatsword reactions and the directional deaths are ordinary human motion
that Mixamo does cover. Those remain a download rather than authoring work, and they are the only rows still waiting
on an asset from outside. They are convenience, not a blocker: the composer can author them too if preferred.

### 5.4 Per-body refinement

The archetype clip is the floor, not the ceiling. Where a body reads badly on the shared clip, it gets its own
override under the same reaction name, the way the composer already builds per-variant packs. Start shared, specialise
where it looks wrong.


### 5.5 Corrections after adversarial review, 2026-09-04

A reviewer re-derived the severity rows against the pinned combat fixture and found two of them wrong. Both are
recorded here rather than quietly edited, because they change which tier the work lands in.

**Severity is classified from the label, not the clip name, so identical clips are not identical rows.**
`classifyAttackSeverity` reads the attack id, label and clip name together. The same
`ProMeleeAxe__StandingMeleeAttack360Low` is measured **light** in seven fixture rows under the staff, whose label is
"One-hand low sweep", and **heavy** in ten rows under the dagger, labelled "Spinning strike". Collapsing them into one
row assigned heavy to both and routed the staff's sweep to a heavy stagger the tool never asks for. Section B rows
must therefore be keyed by clip **and** label.

**`GreatSword__GreatSwordAttack` is heavy, not light.** Its label is "Pommel butt smash" and the fixture measures it
heavy in eight rows.

**The spit is called poison everywhere in the project.** The word "acid" appears nowhere in any document, source file
or type. `ReviewDamageType` offers physical, fire, ice, poison and arcane. The owner asks for acid, so either the type
gains an `acid` member and the spit moves onto it, or the existing poison type is what acid means here. Left as an
open decision rather than changed unilaterally, because the damage type is written into every registered pack.

**The victim's burning reaction is not blocked.** An earlier version of this document listed it as a Mixamo download
the owner had to supply. Under the archetype ruling in section 5 it is authored here, and it is the next piece of
work rather than a dependency on anyone.

---

## 6. Open decisions the owner must rule on

| ID | Decision | Why it cannot be settled from the files |
|---|---|---|
| **D1** | **Acid: rename poison, or add a sixth type?** | The record is uniformly poison (`spit.mjs:15`, `combat-review-contact-resolver.ts:85`). `ReviewDamageType` (`combat-review-types.ts:87`) has five members and no `acid`. A rename touches the composer spec that **generates** `composer-mob-packs.ts` ("GENERATED … do not edit by hand"); adding a sixth member leaves two substances where the docs describe one. |
| **D2** | **Is the spit a blob or a stream?** | No doc states either. `spit.mjs:15` says "the projectile" (singular) and both implementations build one sphere — runtime 0.08 m (`breach-v2-breachlings.ts:285-286`), review 0.008 m stretched 1.6× on Z. The owner's "stream of viscous material" framing has no equivalent on record. The precedent for a held emission is `PalmFire`, which `warden-effects.md` attributes to an explicit owner instruction ("it should be a SOLID BEAM"); there is no such line for the spit. |
| **D3** | **Which projectiles stick?** | The owner named arrows. Fire and acid are fluid/energy and arguably should not persist as geometry — but `combat-review-impact-anchor.ts` is type-agnostic and will happily anchor any of them. |
| **D4** | **Is the staff's `Standing2HMagicAttack01` a spell or a stick?** | It is semantically a spell but the tool measures the physical staff tip, because there is no projectile binding for the staff loadout. Its victim reaction pairing depends on which it is. |
| **D5** | **If Mixamo has no "covered and screaming" loop, what substitutes?** | M1 is the owner's headline case and the one asset most likely not to exist off the shelf. |
| **D6** | **May `ProSwordAndShield__SwordAndShieldImpact/2/3` be bound to the one-hand families?** | They are installed, unbound and would fix 32 measured GAP rows without a download. `human-review-catalog.js:145-147` calls the existing `genericDeath` group "explicitly generic candidates, not silent sword/shield or shooter substitutions and not equipment-approved" — so this needs an equipment-approval ruling, not a code change. |
| **D7** | **Should the four-view Warden rebuilds preserve the shipped clip durations?** | They do not: Oathbreaker `BladeSweep` 1.800s → 2.000s, `CinderSweep` 2.333s → 2.800s, `AshCall` 3.667s → 3.600s. Because effect specs are rescaled onto the real duration, every window and hit-radius timing differs (e.g. `CinderSweep` impact 1.333s → 1.600s). Design question, reported as a fact. |
| **D8** | **`DeathShatter` is declared but unauthored.** | `breach-v2-warden-effects.ts:31` includes `"DeathShatter"` in `CinderboundWardenEffectClip` (verified). No Warden GLB contains it — `cinderbound-warden.glb` has 15 clips and `greater-cinderbound-warden.glb` 13, and `DeathShatter` is in neither (verified). It is guarded as optional, so this is a declared-but-unauthored second death, not a load failure. |

---

## 7. Provenance

Independently verified during this pass, from source and from GLB JSON chunks rather than from documentation:
`combat-review-controller.ts` direction/severity/picker (`:185-206`) and spar filter (`:446`); `combat.ts:43`;
`combat-review-types.ts:87`; `combat-review-contact-resolver.ts:80-90`; `breach-v2-human-foundation-actor.ts:22-38`
plus its empty `hit|death|react|damage` grep; `breach-v2-breachlings.ts:52-59` and `:438-449`;
`breach-v2-preview.ts:4718-4722`; `breach-v2-warden-effects.ts:31,63,75-143,402,411`; `mob-review-actor.ts:18-27`;
`composer-pack-lookup.ts:8-16`; `human-review-catalog.js:121-159`; `combat-review-impact-anchor.ts:55-62` and its
importer list; `motionArchetypes.ts:103-104,134-135`; the zero-hit `acid` grep across `docs/`, `src/`, `tests/`.

GLB clip inventories read directly from the binary JSON chunks: `breachling-base.glb` (12 clips),
`breachling-ravager.glb` (12), `cinderbound-warden.glb` (15), `greater-cinderbound-warden.glb` (13),
`breachling-base-fourview-composer-v8.glb` (15), `breachling-oathbound-fourview-composer-q4.glb` (15). Durations are
the maximum sampler input-accessor max, i.e. the last keyframe time.

Matrix figures recomputed directly over `tests/fixtures/combatReviewBreachlingMatrix.json`: **488 rows**; direction
front 240 / right 31 / back 9 / left 9 / null 199; severity light 217 / heavy 72 / null 199; **48** rows carrying a
"no … reaction clip in the … response set" reason. That fixture is asserted row-for-row against a live run by
`tests/combatReviewBreachlingMatrix.test.ts:294`, so it is the tool's own measurement rather than a summary. The
matrix suite itself was **not** re-run (it takes roughly an hour serially).

Files under the concurrent-edit ownership list — `breach-v2-wardens.ts`, `breach-v2-warden-effects.ts`,
`cinderbound-warden-vfx.ts`, `reviewed-warden-receipt.ts`, `tests/breachV2Warden*`, and the artifacts warden lanes —
were **read only**. Line numbers in those files may have moved; cite the function or constant names.
No git command was run and nothing was committed.

---

## 8. Open motion defects in the shipped humanoid reaction packs

Found by an independent skeptic that re-derived everything from the shipped GLBs
with its own glTF parser, FK and slerp — no three.js, no lane code. The packs
themselves verified clean: byte lengths and hashes match their pins, joint names
and index order match the runtime body exactly, inverse bind matrices differ by 0,
and the loops close bit-exactly. These are quality and honesty defects, not
integrity ones.

**D1 — 45 of 65 joints carry no motion at all.** All 40 finger joints, the 4 toe
joints and HeadTop_End are constant at the bind rotation across every clip in all
three packs; only 20 joints move. A burning body with rigid fingers is the worst
case of this. Authoring finger and toe motion is open work.

> **CLOSED 2026-09-04, revisions `poison-r4` / `burn-r2` / `kd-r14`.** The composer
> gained digit and metatarsophalangeal authoring (`humanoid-adapter.mjs`
> `poseDigits` / `poseToe`, `warden-composer.mjs` `digits` / `toeRoll`), and all
> nine clips were re-authored on it. **52 of 65 joints now carry motion in every
> clip**, up from 20. The 13 that remain at the bind rotation are exactly the 13
> Mixamo END SITES — ten fingertips (`*4`), two `Toe_End`, `HeadTop_End` — which
> were measured to own **zero skin weight on every mesh of this body**
> (`tools/probe-humanoid-digits.mjs`), so a track on any of them could not move a
> vertex. Every joint that owns skin is animated. Per-clip finger travel (widest
> angle from key 0, median over the 30 finger joints): PoisonImpact 42.1 deg,
> PoisonLoop 18.7, PoisonRecover 37.6, BurnFlare 42.5, BurnBurn 36.7,
> BurnRecover 39.3, Knockdown 27.6, ProneHold 0.8 (deliberately near-still — the
> body is not moving), GetUp 15.7. Flexion and abduction axes are measured on the
> rig at load, not taken from Mixamo's local axes; the digit floor guard exists but
> its applied scale is 1.0000 on every frame of all nine clips.

**D2 — the seam metric was reported on a frozen joint.** Every row of both seam
tables named `mixamorig:LeftHandPinky3` as the worst bone at 0.0475 deg, which is
why five structurally different joins returned the same number. Measured over the
20 joints that actually move, the real worst is 0.0018 deg. The packs are better
than they were reported to be; the metric has since been corrected in the contract
comments, and any future seam claim must exclude frozen joints or it measures its
own sampler.

> **Root cause identified 2026-09-04.** It is not that the joint was frozen so much
> as WHY that produced a number: the source rig's own bind quaternions are float32
> and not exactly unit, so `acos(|q · q|)` on a constant track reads as an angle
> against ITSELF — 0.0475 deg on `LeftHandPinky3`, 0.0486 on `RightHandRing3`. The
> three lane verifiers and `tools/measure-humanoid-pack.mjs` now normalise before
> comparing, which removes the artefact whether or not the joint moves.
> On the re-authored packs, over the **52** joints that now move: idle→impact and
> recover→idle 0.0000–0.0016 deg, impact→loop and loop→recover 0.0018 deg (burn) /
> 0.0047 deg (poison), loop→loop 0.0000 deg on all three sets.

**D3 — the entry gap is real and the blend is unjustified.** `BurnFlare[0]` is
74.0916 deg from the pinned body's bind pose on `mixamorig:LeftArm` with 13.882 mm
of hips offset, and 90 to 152 deg from the shipped library idles. The controller
crosses that in `cue.blendSeconds`, default 0.1 s — about 900 deg/s, against
`BurnBurn`'s own median frame step of 2.1555 deg at 60 fps, i.e. 129 deg/s. The
default is 7x faster than the clip's fastest ordinary motion. It may still be the
right read for an impact, but it was never measured against the gap and should be.
The two seam-table rows that reported this join as 0.0475 deg were comparing
against the composer's internally baked arm-rest neutral, which exists in no
shipped byte.

> **CLOSED 2026-09-04. The blend is now derived from the gap, per set, and pinned.**
> Measured with `issue-458-motion-composer-v1/tools/reaction-entry-gap.mjs` on the
> shipped packs of all three archetypes, reading exported keyframe tracks with
> normalised quaternions (so D2's artefact cannot appear). D3's own numbers
> reproduce exactly: `BurnFlare[0]` is 89.9848 deg from `ProLongbow__UnarmedIdle01`,
> 94.4821 from `IdleStandingRelaxed` and 151.9755 from `ProLongbow__StandingIdle01`.
>
> The gap was re-measured against what a defender is ACTUALLY holding, not one
> frame of one clip: the worst per-joint angle over the whole period of every guard
> clip its own catalog offers, and - now that D5 is wired - over the whole period of
> a running set, because a preempt cuts wherever it cuts.
>
> | set | archetype | guard -> impact[0] | preempt -> impact[0] | recover[end] -> guard | impact peak rate | recover peak rate |
> |---|---|---|---|---|---|---|
> | poison | humanoid | 151.9755 deg / 501.39 mm | 86.5758 deg | 151.9755 deg | 754.2 deg/s | 231.6 deg/s |
> | poison | warden | 65.7954 deg / 20.89 mm | 81.0170 deg | 65.7954 deg | 657.1 deg/s | 184.3 deg/s |
> | poison | breachling | 46.9677 deg / 12.07 mm | 126.2847 deg | 46.9677 deg | 1386.6 deg/s | 563.7 deg/s |
> | burning | humanoid | 151.9755 deg / 501.39 mm | 92.1456 deg | 151.9755 deg | 770.8 deg/s | 417.5 deg/s |
> | burning | warden | 65.7954 deg / 20.89 mm | 81.0170 deg | 65.7954 deg | 753.3 deg/s | 277.8 deg/s |
> | burning | breachling | 46.9677 deg / 12.07 mm | 98.5787 deg | 46.9677 deg | 1508.8 deg/s | 854.3 deg/s |
> | knockdown | humanoid | 151.9755 deg / 501.39 mm | 92.1456 deg | 151.9755 deg | 431.0 deg/s | 672.7 deg/s |
> | knockdown | warden | 65.7954 deg / 20.89 mm | 76.7128 deg | 65.7954 deg | 408.5 deg/s | 877.5 deg/s |
> | knockdown | breachling | 46.9677 deg / 12.07 mm | 126.2847 deg | 46.9677 deg | 1597.0 deg/s | 873.1 deg/s |
>
> Guard rows are the worst over every guard clip the archetype offers - nine loadout
> stances for the humanoid, `Idle` and `CombatIdle` for the Warden and the
> Breachling - sampled at 60 Hz across each clip's whole period.
>
> **The rule, both ways.** A pop is a transition faster than any motion the animation
> itself contains, so the blend must satisfy `gap / blend <= the entered clip's own
> peak authored rate`. That is a FLOOR, and it is the whole answer to "should an
> impact be fast": it should be as fast as it can be without being the fastest thing
> on screen. The CEILING is the second at which the impact clip has laid down half of
> all the angular motion it ever lays down - a crossfade still running past that
> point holds the old pose over most of the new clip and the hit turns to mush.
>
> **One blend cannot serve all three sets, and that is measured, not preference.**
> Knockdown's floor is 0.2138 s (92.1456 deg into a `Knockdown` whose peak is only
> 431.0 deg/s) and burning's ceiling is 0.1500 s. The intersection is empty, so the
> defaults are per set:
>
> | set | entry floor | entry ceiling | **entry pinned** | exit floor | **exit pinned** |
> |---|---|---|---|---|---|
> | poison | 0.1233 s | 0.1833 s | **0.125 s** | 0.3570 s | **0.360 s** |
> | burning | 0.1196 s | 0.1500 s | **0.120 s** | 0.2368 s | **0.240 s** |
> | knockdown | 0.2138 s | 0.2500 s | **0.215 s** | 0.0750 s | **0.075 s** |
>
> Pinned values are the floor rounded UP to a 5 ms grid, so tidying a number can
> never drop it below its own floor. The old 0.1 s default was under the floor of all
> three sets, and the old hard-coded 0.12 s hand-back was under two of three exits -
> the Warden's poison settle needs 0.357 s to stay inside `PoisonRecover`'s own
> 184.3 deg/s. Both live in `reaction-contract.ts` as
> `REACTION_SETS[id].entryBlendSeconds` / `.exitBlendSeconds`, are checked against
> `REACTION_BLEND_MEASUREMENT` at module load, are re-derived and asserted by
> `tests/reactionEntryBlend.test.ts`, and stay adjustable per review through the
> panel's Blend in / Blend out fields (`CombatReviewController.setReactionBlend`,
> which does not unmeasure the contact the way a manual cue does). The sequence tail
> grew from a flat 0.25 s to `max(0.25 s, exit blend)`, because a tail shorter than
> the settle silently clamped the blend it claimed to be playing.
>
> **D3a, opened by this measurement: the humanoid packs and the humanoid library are
> in different root spaces.** The humanoid guard column above is 152 deg and 501 mm
> against the Warden's 66 deg / 21 mm and the Breachling's 47 deg / 12 mm, and the
> reason is not that the human moves more. Measured by FK on the shipped bytes:
> `BurnFlare[0]`, `PoisonImpact[0]` and `Knockdown[0]` all stand with the soles at
> y = -0.500 rig units and a body-forward yaw of +90.0 deg, while
> `GreatSword__GreatSwordIdle[0]` stands with the soles at y = -0.003 and a yaw of
> -8.2 deg (`ProLongbow__UnarmedIdle01` -1.4 deg). The composer's humanoid neutral is
> the runtime body's own bind hips - origin-centred, facing the composer's yaw 0,
> world +X - and every clip in the shipped, frozen
> `human-foundation-pilot-animation-library.glb` is floor-referenced and faces world
> +Z. Playing a humanoid reaction pack next to a library idle therefore drops the body
> 497 mm and spins it about 90 deg at the moment of impact. The mobs do not have this
> because their bodies' own clips and their packs came out of the same composer.
> **No blend length fixes a half-metre teleport.** It is a re-author of the humanoid
> nine against the library's floor-and-facing convention, and until that is done the
> humanoid guard and exit rows are recorded as evidence but marked
> `guardComparable: false` and excluded from the derivation, so a defect cannot
> silently set the product's blend. The honest preempt rows still set the floor for
> two of the three sets, so the exclusion is not doing the work.

**D4 — planted-foot skate in BurnBurn.** Max toe lift is 46.0 mm on a 0.9891 m rig
with 30.4 mm of horizontal travel while planted. That is a weight-shift shuffle
with a slide in it, not the planted steps it was described as.

> **CLOSED 2026-09-04, revision `burn-r2`. Fixed by making the step a real step,
> not by repairing the plant.** The lift went 0.075 → 0.20 authoring units on the
> lead steps and 0.055 → 0.16 on the returns, the swings are 60 ms longer, the
> knee folds deeper, the heel comes off earlier and further before each step
> (`preHeel` 0.18 s, `heelOff` 24–26 deg), the standing heel roll dropped 16 → 3
> deg and moved onto the foot that is NOT about to step, and the foot is no longer
> one rigid plate — `toeRoll` articulates the metatarsophalangeal joint off the
> foot plan's own roll.
>
> Measured on the shipped bytes with `tools/measure-humanoid-pack.mjs`, in
> millimetres on the 0.9891 m rig. Toe clearance — the height reached by the LOWEST
> point of the toe skin, which is the metric that reproduces the 46.0 mm above —
> **left 47.1 → 85.7, right 42.1 → 79.7**. Foot skate, defined as the worst
> accumulated horizontal travel of any single vertex over one unbroken run of
> frames in which that vertex stays within 4 mm (actor) of the floor —
> **left 8.72 → 2.19, right 3.98 → 2.34** — and the worst single-frame step of a
> contact vertex fell from 7.19 to 1.15 (left) and 2.65 to 0.61 (right). The 30.4 mm
> figure above was not reproduced by this metric at this contact band, and the
> metric is band-sensitive: widen the contact band to 14.6 mm (rig) and the old
> pack reads 13.4 (left) / 26.1 (right) against the new pack's 11.7 / 9.4. At that
> width the band stops describing contact, which is why the 4 mm reading is the one
> quoted.
> The same treatment was applied to `PoisonLoop` (toe clearance left 40.6 → 69.7,
> right 32.7 → 62.1; skate left 1.48 → 2.61, right 5.74 → 4.62).

**D5 — the precedence machinery has no runtime path.** `recordReactionHit`,
`cutReactionToDeath` and `clearReactionTimeline` are called by nothing outside
tests; the panel exposes no command for them and `resolveContact` only ever builds
a single-plan timeline through `applyReactionHit`. The precedence design is sound
and tested, but it is not reachable in the product yet. Either wire it or stop
describing it as behaviour.

> **CLOSED 2026-09-04 by wiring it, not by cutting it.** Cutting was the cheaper
> option and it was the wrong one: the owner asked to SEE reactions, precedence only
> means anything when two hits land together, and the rules were already written and
> tested - the only thing missing was a way in. `CombatReviewPanel` now carries a
> "Second hit into the running reaction" block, visible exactly while a set is
> running: a set picker over `REACTION_SET_IDS`, a "Lands at" time seeded from the
> running plan's loop start, and three buttons - **Land second hit**
> (`recordReactionHit`), **Cut to death here** (`cutReactionToDeath`) and **Clear
> reaction** (`clearReactionTimeline`).
>
> The timeline says what happened to each hit rather than leaving the reviewer to
> infer it. Under the control is an ordered history built from the timeline the
> controller already owns: every plan with its start, its set, its loop periods, the
> later hits that re-armed it ("impact not replayed") and the hit that cut it; then
> every absorbed hit with its own reason - lower precedence than the running set, or
> landing before the running plan started. The two `reaction-preempt-*` /
> `reaction-absorbed-*` sequence events that already existed now have a visible
> counterpart.
>
> A preempt is also an entry, so it is crossed at the preempting set's own measured
> blend (D3) while the plan it cut keeps its own pinned number.
>
> A refusal stays a refusal: a death cut before the reaction starts still throws
> `A death before the reaction is not a cut`, and the panel shows it without
> half-applying it. Driven end to end through the panel's own DOM in
> `tests/reactionEntryBlend.test.ts` - preempt, absorb, re-arm, death cut, clear.
---

## 9. Registration, 2026-09-04: all three archetypes installed

The Warden and Breachling nine exist, so the receipt no longer holds those rows
open. `REVIEWED_REACTION_PACKS` now carries all three archetypes, and every number
below was hashed and parsed on the installed file rather than copied from a build
log.

| Archetype | File | Bytes | sha256 | Rig it carries | Joints |
|---|---|---|---|---|---|
| `humanoid` | `humanoid-reactions-poison-r4.glb` | 3,364,176 | `2d7bdfaacac3ee9650f292d64d9c8d4a583c9396be47a66658953cfadba51363` | `human-foundation-pilot-runtime-4k.glb` | 65 |
| `humanoid` | `humanoid-reactions-burn-r2.glb` | 3,403,688 | `246b46a6867b499961908cd5977335206df593d90be0c7f5f15f43cdb224030f` | same | 65 |
| `humanoid` | `humanoid-reactions-kd-r14.glb` | 3,442,812 | `c40fa8ab8615fbc2c81418645942e9192c2679f49f35b6cf0353e252afa8eb34` | same | 65 |
| `warden` | `warden-reactions-r3.glb` | 22,228,284 | `ac58bc6ff929821a4585a661c4297ad85dca4890ad212c997d603e359b744662` | `wayfarer-cinderbound-warden-fourview-v12.glb` | 18 |
| `breachling` | `breachling-reactions-quad-r4.glb` | 15,195,976 | `03c168b14e16f7df1df7304e12a1b1a335bfd190997c724219bcc683b0416cd4` | `breachling-base-fourview-composer-v8.glb` | 30 |

What "carries the rig" means here is exact, not approximate: each pack's own skin
was compared joint for joint against the body GLB named beside it, and the maximum
absolute difference is 0.000e+0 on bind translation, bind rotation, bind scale and
every inverse bind matrix entry, in the same joint order. That is why the joint
count is an archetype property and not a constant - 65, 18 and 30 are three
different skeletons, and `prepareReviewedReactionPacks` now rejects a row whose
`rigSourceSha256` or `jointCount` is not its own archetype's.

**Both-ways clip enforcement and the union rule are unchanged.** An archetype is
registered only when its packs together carry exactly the nine contract clips with
none claimed twice - three files for the humanoid, one each for the Warden and the
Breachling - and at load a file must contain every clip its receipt claims and no
clip it does not. The pinned joint count is now checked against the parsed skin as
well, so a re-export that gained or dropped bones is refused before a clip is bound.

**Selection.** A defender's archetype is read from its catalog family and nothing
else: `reactionArchetypeForFamily` maps `human` to `humanoid`, `warden` to
`warden`, `breachling` to `breachling`, and `MOB_CATALOG` gives every Warden and
Breachling definition its own family. `CombatReviewController` now asks the receipt
whether that archetype has the set installed before it reads any duration off the
defender, so a special set is reachable only through the defender's own registered
pack; a defender whose archetype has no pack falls back to the ordinary directional
flinch picker instead of half-playing another rig's motion. The lab-side loader is
addressed the same way - `loadReactionPacksForFamily(family, ...)` - so no call
site spells out an archetype.

**Still open.** Mob review actors do not yet install their pack's clips: the
Breachling and Warden stages play their own body's animation set through the shared
dungeon runtime, so the registration above is reachable by the contract and the
loader but not yet by a Warden or Breachling actor on the stage. That wiring, and
the per-variant builds the measured correction in section 5.1 calls for, are the
next pieces.

---

## 9. Archetype reaction sets: shipped, pinned, and NOT yet reachable

The warden and breachling nine-clip sets are authored, pinned and independently
verified for integrity - hashes, byte lengths, joint names and index order all
re-derived from the shipped bytes by a skeptic using its own parser. Three
skeptics then refuted the lane's own claims. What follows is what they found, so
nobody reads the pins as proof the feature works.

**D6 - a mob defender still cannot receive an archetype set. Two blockers, not
one.** The first is disclosed: `combat-review-studio.js:79` passes
`includeReactionPack` only to the human factory, so mob review actors never
install pack clips at all. The second was undisclosed and is now FIXED here:
`mob-review-actor.ts` classified all nine contract clip names as `"interaction"`,
because it matched by regex and not one of PoisonImpact, PoisonLoop,
PoisonRecover, BurnFlare, BurnBurn, BurnRecover, Knockdown, ProneHold or GetUp
matches any of its patterns. `combat-review-controller.ts` only reads a reaction's
duration from an action whose semantic is `"reaction"`, so every archetype set
would have fallen through to the flinch picker even after the first blocker was
closed. It now matches by contract, the same way the human actor does. **The first
blocker remains open: until mob actors install pack clips, these two packs are
inert.** The test that was offered as proof of archetype resolution is a fixture,
not the live path.

**D7 - the poison entry blend was derived from a transition the runtime forbids.
FIXED here.** The floor took the wider of a guard entry and a preempting entry.
Poison is the lowest precedence and `reactionSetPreempts` requires strictly
greater, so poison is never entered by preempting a running set - yet that
impossible term was the single binding term in its floor. Excluding transitions
the precedence table forbids takes poison from 0.125 s to 0.105 s, which the
module-load guard now derives independently.

**D8 - the breachling pack ships the exact defect D4 names, unmeasured.** In
`breachling-reactions-quad-r4.glb`, `GetUp` teleports the planted right rear foot
154.9 mm horizontally in one 1/60 s frame, and 145.1 mm back two frames later,
while the foot stays inside the 4 mm contact band throughout and then locks dead
still. The same rig's shipped reviewed body has zero rear-foot events of this kind
across all sixteen of its clips. **This pack should not be relied on until that is
re-authored**, and it is committed only because it is currently unreachable.
