# SoulDrifter Starter Perk Vetting Matrix

Status: **OWNER REVIEW REQUIRED — DO NOT TREAT THE 36 COMBINATION PERKS AS APPROVED**  
Scope: levels 1–19, Ilyra's training-hall Memory Loom, all 4 ancestries × 9 starting callings

## Why this document exists

The opening build already contains two selectable ancestry boons and two selectable class disciplines per character. It also contains twelve automatic favored ancestry/calling resonance bonuses. Lord Xar asked for the entire system to be visible in one place before more perks are invented or wired.

This matrix separates three layers that should never be blurred together:

1. **Inherent ancestry talent** — always present; establishes culture/body-plan identity without forcing a class.
2. **Memory Loom choices** — choose one ancestry boon and one mortal base-calling discipline after completing Ilyra's Chronicle of Returning.
3. **Ancestry/calling resonance** — an automatic small bonus for the exact combination. This is where certain ancestries can produce a stronger or more distinctive version of a calling without making any combination invalid.

No level-one perk uses visible Sartan probability song or Patryn body/equipment runes. Those traditions begin around levels 20–30 and remain mutually exclusive. Starting perks use mortal weapon training, human wizardry, practical necromancy, color formulas, faith, fieldcraft, and class resources.

## Source reconciliation

The historical Discord work was recovered from Git commit `20e9925c` on `feature/souldrifters-race-class-perk`, not recreated from memory.

| Historical material | Original value | Current treatment |
| --- | --- | --- |
| Original starting classes | Warrior, Mage, Priest, Sharpshooter, Summoner, Paladin, Asura, Slayer | All eight remain starting callings by owner direction; Shadowknight is the ninth owner-added calling. |
| Original class skills | Berserker, Meteor Swarm, Holy Arrow, Multishot, Summon Minion, Thor's Hammer, Mindburn, Backstab | Preserved as progression identities. Several are too powerful for a level-one action and therefore have smaller mortal precursors in the browser slice. |
| Original races | Human, Elf, Dwarf plus realm-specific Durnai/Titan and later Patryn/Sartan | Human, Elf, Dwarf start now; Halfling is the approved fourth browser ancestry. Durnai, Titan, Patryn, and Sartan remain later-world/awakening decisions. |
| Original race “perks” | Human/Elf Potion of Swiftness; Dwarf Spear of Fire | These were realm drops/items, not balanced ancestry passives. Preserve them as Arianus/Pryan rewards rather than silently turning consumables into racial biology. |
| Original probabilities | Weighted random classes | Rejected for current character creation. Players choose their calling. |

## Training-hall selection order

1. Speak with Wellkeeper Ilyra.
2. Complete every page of the illustrated Chronicle of Returning.
3. Ilyra reveals the returned character's ancestry, calling, and present task.
4. At the Memory Loom, place exactly three stat points.
5. Choose one ancestry boon from the selected ancestry's two options.
6. Choose one base-calling discipline from the selected calling's two options.
7. Receive the approved automatic ancestry/calling resonance perk.
8. Open the Wayfarer's Coffer, equip a usable weapon, and choose a trial door.

Closing the storybook early, skipping the imprint, leaving the coffer unopened, or unequipping/breaking the main-hand weapon keeps the trial doors locked.

## Inherent ancestry talents

| Ancestry | Always-on talent | Current direction |
| --- | --- | --- |
| Human | Versatile Training | +1 Insight, +1 Will; adaptable secondary training |
| Elf | Long Memory | +1 Finesse, +2 Insight; precision and remembered formulas |
| Dwarf | Stone Anchor | +1 Might, +2 Vitality; armor, conduits, forced-movement resistance |
| Halfling | Hidden Route | +2 Finesse, +1 Will; cover, rescue, consumables, route discovery |

## Selectable ancestry boons

Choose exactly one. These eight choices are already implemented, but their numbers remain open to balance review.

| Ancestry | Choice A | Effect | Choice B | Effect |
| --- | --- | --- | --- | --- |
| Human | Many Roads | +1 Insight, +1 Will; adapt when encounter rules change | Hard-Won Habit | +1 Vitality, +1 Finesse; turn hardship into survival |
| Elf | Unbroken Recollection | +1 Insight, +1 Will; recover details erased by the Sundering | Ghost Step | +2 Finesse; move before unstable geometry settles |
| Dwarf | Forgeheart | +1 Might, +1 Vitality; bank hostile heat without losing control | Deep Anchor | +2 Vitality; resist stagger, displacement, and fracture |
| Halfling | Overlooked Route | +1 Finesse, +1 Insight; find useful paths and objects | Small Defiance | +2 Will; resist fear and Realm Pressure |

## Selectable base-calling disciplines

Choose exactly one. These eighteen choices are already implemented. They are mortal level-one foundations, not final specializations.

| Calling | Choice A | Effect | Choice B | Effect |
| --- | --- | --- | --- | --- |
| Warrior | Vanguard Drill | +1 Might, +1 Vitality; stronger opening pressure | Measured Counter | +1 Finesse, +1 Will; guard into counterattack |
| Mage | Stable Formula | +1 Insight, +1 Resonance; reduce early shaping mistakes | Risked Channel | +2 Resonance; fragile, higher spell ceiling |
| Priest | First Mercy | +1 Will, +1 Vitality; practical healing | Consecrated Guard | +1 Will, +1 Resonance; protective wards |
| Sharpshooter | Clear Line | +1 Finesse, +1 Insight; read firing lanes | Held Breath | +2 Insight; trade speed for first-shot precision |
| Paladin | Mortal Bastion | +1 Vitality, +1 Will; practical defense before later Sartan-only ascension | Measured Judgment | +1 Might, +1 Will; controlled force |
| Summoner | Firm Binding | +1 Resonance, +1 Will; keep lesser forms coherent | Lesser True Name | +1 Insight, +1 Resonance; precise command over summon count |
| Asura | Black Thread Control | +1 Will, +1 Resonance; contain practical curse backlash | Cruel Insight | +2 Insight; read weakness at the cost of safer instinct |
| Slayer | First Opening | +1 Finesse, +1 Might; exploit an exposed flank | Exit Wound | +1 Finesse, +1 Will; survive after committing |
| Shadowknight | Grave-Iron Discipline | +1 Vitality, +1 Will; armor, restraint, longer Cinder Guard | Hungry Ember | +1 Might, +1 Resonance; stronger mortal life-drain pressure |

## All 36 ancestry/calling resonance proposals

**Balance rule for approval:** the automatic starting implementation is only **+1 attribute**. The “future expression” describes the identity to test later; it is not permission to ship extra percentages, cooldowns, free casts, or resource generation without another balance pass.

Legend:

- **Existing favored** — already represented in `RACE_CALLING_BONUSES`; safest candidates to retain.
- **New proposal** — created to complete the matrix; requires explicit owner approval before code.

### Human combinations

| Combination | Resonance perk | Start effect | Future expression | Status |
| --- | --- | --- | --- | --- |
| Human Warrior | Adaptive Drill | +1 Might | First weapon-family swap in an encounter suffers less untrained penalty. | Existing favored |
| Human Mage | Improvised Formula | +1 Insight | Recover a small portion of a failed mortal color channel once per rest. | New proposal |
| Human Priest | Many Faiths | +1 Will | Swapping between healing and warding preserves a little Devotion. | Existing favored |
| Human Sharpshooter | Field Opportunist | +1 Insight | Inspecting cover briefly reveals the clearest firing lane. | New proposal |
| Human Paladin | Common Cause | +1 Will | Guarding a different ancestry strengthens the next oath action. | New proposal |
| Human Summoner | Flexible Command | +1 Insight | Reissuing a lesser summon command has reduced recovery delay. | New proposal |
| Human Asura | Contradictory Soul | +1 Resonance | Carry one additional hostile memory thread before backlash escalates. | Existing favored |
| Human Slayer | Borrowed Method | +1 Finesse | The first attack after changing weapon family gains a small accuracy floor. | New proposal |
| Human Shadowknight | Mortal Ember | +1 Will | Cinder Guard loses less duration when Gravefire is empty. | New proposal |

### Elf combinations

| Combination | Resonance perk | Start effect | Future expression | Status |
| --- | --- | --- | --- | --- |
| Elf Warrior | Remembered Form | +1 Finesse | Repeating a disciplined weapon action improves its next timing window. | New proposal |
| Elf Mage | Formula Memory | +1 Insight | The last successful mortal color pairing is easier to prepare again. | Existing favored |
| Elf Priest | Ancestral Canticle | +1 Will | A cleanse also reveals the afflicted target's oldest active curse. | New proposal |
| Elf Sharpshooter | Long Sight | +1 Finesse | Marking a distant target retains accuracy through one obstruction change. | Existing favored |
| Elf Paladin | Oath Without End | +1 Will | Protection on the same ally gains steadier duration, not more burst. | New proposal |
| Elf Summoner | True Naming | +1 Resonance | One lesser shaped ally keeps coherence longer when out of command range. | Existing favored |
| Elf Asura | Grief Archivist | +1 Insight | Identify the source family of a hostile memory or curse on inspection. | New proposal |
| Elf Slayer | Patient Blade | +1 Finesse | Remaining unseen for a full beat improves the first flank's control. | New proposal |
| Elf Shadowknight | Ashen Recollection | +1 Resonance | Life drained from a previously marked foe stabilizes the soul-coal more efficiently. | New proposal |

### Dwarf combinations

| Combination | Resonance perk | Start effect | Future expression | Status |
| --- | --- | --- | --- | --- |
| Dwarf Warrior | Forge Circuit | +1 Might | Guard pressure transfers cleanly between body, armor, and mundane weapon. | Existing favored |
| Dwarf Mage | Runestone Geometry | +1 Insight | Ground-based mortal formulas are harder to displace. | New proposal |
| Dwarf Priest | Hearth Anvil | +1 Vitality | Healing received while braced also repairs a small amount of Stability. | New proposal |
| Dwarf Sharpshooter | Braced Shot | +1 Might | Firing without moving reduces pushback and aim disruption. | New proposal |
| Dwarf Paladin | Stone Oath | +1 Vitality | Nearby allies resist forced movement while the Paladin holds position. | Existing favored |
| Dwarf Summoner | Crafted Vessel | +1 Resonance | Lesser forms bound to a crafted focus lose coherence more slowly. | New proposal |
| Dwarf Asura | Tomb-Sense | +1 Will | Detect practical necromancy and disturbed remains before contact. | New proposal |
| Dwarf Slayer | Undercut | +1 Might | Flanking a larger target applies stronger stagger than raw damage. | New proposal |
| Dwarf Shadowknight | Ember Sepulcher | +1 Vitality | Grave-iron banks stolen vitality with less decay between encounters. | Existing favored |

### Halfling combinations

| Combination | Resonance perk | Start effect | Future expression | Status |
| --- | --- | --- | --- | --- |
| Halfling Warrior | Low Center | +1 Vitality | Bracing against a larger enemy reduces forced movement. | New proposal |
| Halfling Mage | Pocket Formula | +1 Insight | One prepared mortal formula occupies less field space without gaining power. | New proposal |
| Halfling Priest | Hearth Mercy | +1 Will | The first rescue heal in an encounter resolves more quickly. | Existing favored |
| Halfling Sharpshooter | Low Profile | +1 Finesse | Low cover blocks less of the Halfling's own firing line. | Existing favored |
| Halfling Paladin | Small Shield, Wide Shelter | +1 Will | Intercepts can protect an adjacent ally without increasing aura size. | New proposal |
| Halfling Summoner | Companion's Friend | +1 Resonance | Lesser summons reposition around the caster with fewer pathing conflicts. | New proposal |
| Halfling Asura | Unassuming Mind | +1 Will | The first hostile mind effect is slower to identify the Halfling as its source. | New proposal |
| Halfling Slayer | Hidden Knife | +1 Finesse | Overlooked angles count as cleaner execution routes. | Existing favored |
| Halfling Shadowknight | Banked Spark | +1 Will | A small amount of Gravefire persists after using a defensive action. | New proposal |

## Recommended decisions for Lord Xar

Review these separately; approving one does not approve the others:

1. Keep or rename the eight implemented ancestry boon choices.
2. Keep or rename the eighteen implemented base-calling disciplines.
3. Confirm whether all 36 combinations receive a unique resonance, or only the twelve existing favored pairings.
4. Confirm the twelve existing favored pairings and their +1 attribute directions.
5. Approve, revise, or reject the twenty-four new resonance names and identity descriptions.
6. Decide whether a combination resonance is automatic or becomes a third selectable Memory Loom choice.

## Recommended implementation after approval

- Store approved content as data, not conditional UI prose.
- Keep effect math separate from display copy.
- Tag every effect with `levelMin`, `source`, `status`, and a version.
- Render active, locked, and later-specialization effects distinctly in the paper doll.
- Add one unit test per approved resonance and a full 36-combination coverage test.
- Do not add Sartan/Patryn visual language to any level-one perk.

