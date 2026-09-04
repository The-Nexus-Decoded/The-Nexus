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

| Archetype | Skeleton | Bodies it covers |
|---|---|---|
| `humanoid` | Human Foundation rig | the human NPC, and any future humanoid |
| `warden` | 18-bone Cinderbound rig | Wayfarer and Greater Wardens, both bodies each |
| `breachling` | 24-bone quadruped rig plus toes | all four Breachlings, legacy and four-view |

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
