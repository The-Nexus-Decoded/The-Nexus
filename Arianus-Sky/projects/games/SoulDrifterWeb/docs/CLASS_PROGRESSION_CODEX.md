# SoulDrifter Class and Magic Progression Codex

Status: locked system rules; individual class trees still require a dedicated design pass

## Progression ladder

Power is earned in layers. A newly awakened character does not begin with reality-changing rune magic.

**Locked starter invariant:** no level 1–19 character can activate Aether-Scribed or Flesh-Forged runes. Starter attacks, buffs, equipment, UI labels, and combat effects must read as mortal martial technique, wizardry, devotion, shaping, elemental craft, or tightly limited necromancy. Rune traditions first unlock through the level 20–29 awakening quest.

| Level band | Access | Design rule |
| --- | --- | --- |
| 1–9: Foundation | weapons, movement, class techniques, direct mortal wizardry, small elemental effects, tightly limited death-working | readable, physical, low-particle, one clear effect at a time |
| 10–19: Specialization | a class branch plus compatible Fire, Air, Stone, Water, Light, Void, Dark, or Death school | specialization changes role and resource loop before it changes spectacle |
| 20–29: Rune Awakening | choose Aether-Scribed or Flesh-Forged access where the class permits it | the two rune traditions are mutually exclusive |
| 30+: Possibility Weaving | alter likelihood, redirect consequences, enforce temporary laws, or select a plausible outcome | never becomes unrestricted wish magic; cost rises with improbability |

Necromancy is a technique family inside Death magic, not a free universal spell list. Shadowknights and some Asura paths can touch its simplest life/death exchanges early. Raising a durable dead mind, binding a soul, or cheating a final death is advanced and carries a severe balance cost.

## Universal weapon doctrine

Weapons are never globally class-locked. Every calling can equip every weapon family and always receives the item's base physical function. Class identity comes from training, learned techniques, and conditional item channels:

- untrained use applies a meaningful handling/damage handicap but never prevents equipping the item
- trained and specialized ranks improve physical efficiency and can be developed through weapon practice or class paths
- a character can use any staff, sword, axe, hammer, bow, dagger, spear, or focus skill they have actually learned, regardless of the calling that first taught it
- each item modifier declares no calling restriction, one allowed calling, or several allowed callings
- item-granted spells use the same explicit activation rule; a dormant spell does not disable the weapon's mundane attacks
- inspection UI shows base damage, current training, active modifiers, dormant modifiers and their required callings, and learnable weapon techniques

Examples: a Basic Fire Staff has 5 base damage, while +10 Power, +20 Fire, and its Kindle Lance channel activate for Mages. Other callings wield it as a staff and may use their own staff techniques. A Sword of the Heavens has 20 base damage for anyone; +30 Holy Power activates for Paladins, while +5 Speed activates for Paladins, Shadowknights, and Warriors.

## Difficulty and leveling pace

SoulDrifter is genuinely demanding but does not use grind as its primary clock.

- Level 1 to 20 targets roughly 14–20 focused hours for a first character, normally spread across at least one week.
- Experience comes mainly from quests, first-time encounters, exploration discoveries, class trials, professions, bosses, and story checkpoints. Repeated low-risk kills have sharply diminishing value.
- Enemies telegraph dangerous actions, but failing positioning, preparation, interrupts, or active defense remains costly.
- Death has a recoverable consequence—lost momentum, damaged stability, or a retrieval problem—not permanent character deletion in the standard mode.
- Tank and armor classes are the most forgiving starters. Fragile casters require range, control, threat reading, and resource planning.
- Casters gain the highest level-30+ ceiling through formula breadth and possibility weaving; their early weakness must never mean useless damage or unplayable solo progression.
- Difficulty modes may tune reaction windows, enemy coordination, recovery cost, and information clarity. They must not silently change class identity or turn enemies into health sponges.

The pacing target is a content and balance contract, not a hard real-time lock. Final XP curves require telemetry and playtesting before production lock.

## The two rune traditions

These are SoulDrifter's original implementation of the air-written versus body-bound distinction that inspired the system.

### Aether-Scribed

- temporary runes drawn through gesture, breath, voice, movement, or a focus
- can be placed in air, on terrain, across allies, or around an object
- flexible chains, group casting, larger areas, and easier cancellation
- vulnerable to interruption, silence, broken geometry, and realm turbulence

### Flesh-Forged

- persistent runes cut, tattooed, branded, forged, woven, or mounted into body and equipment
- rapid activation, personal buffs, survival reactions, and strong weapon/armor integration
- limited by available body/equipment channels, heat, instability, scars, and overload
- removing or rewriting an active circuit is dangerous

### Hard exclusivity invariant

A character may learn only one tradition's exclusive skills. Aether-Scribed-specific and Flesh-Forged-specific nodes cannot coexist in one build. Both traditions may combine with compatible realm and consequence schools such as Fire, Void, Dark, or Death. Respecialization, if allowed, must be a major story process that removes the former exclusive nodes first.

Paladins are Aether-Scribed-only. Their oath orders treat writing coercive power into living flesh as a violation of consent and the protective vow. Flesh-Forged practitioners are not inherently evil; this is a Paladin doctrine, not an objective moral law.

## Base class roster

| Base class | Level-one proof skills | Later design anchors |
| --- | --- | --- |
| Warrior | Cleaving Strike, Anchor Guard | breaker, guardian, berserker, realm weapon paths |
| Mage | Cinder Bolt, Blue Ward | color formulas, field control, realm and Void combinations |
| Priest | Consecrated Dart, Mending Ward | healing, exorcism, foresight, martyrdom, Death opposition |
| Sharpshooter | Twin Shot, Evasive Mark | deadeye, trapper, companion, mobile skirmisher |
| Paladin | Oath Hammer, Hold the Breach | Aether-Scribed oaths, thunder, protection, cleansing |
| Summoner | Call Lesser Wisp, Binding Circle | Binder, Shaper, Namecaller, Wyrmkeeper, Threadweaver |
| Asura | Mind Prick, Black Thread | Void, Dark, curse, mind, and dangerous Death combinations |
| Slayer | Backstab, Shadowstep | poison, flank, silence, pursuit, wounded-target execution |
| Shadowknight | Siphon Cleave, Cinder Guard | Fire plus Death, life-drain, ash curses, grave-iron tanking, lich-knight survival |

Each class receives a separate skill-list and specialization pass before production balance is locked. The current proof implements only two starter actions per class so combat is playable while the full trees remain designable.

### Reserved Slayer advancement: Stalker

The taxonomy decision is locked: Stalker belongs under Slayer and is not a tenth base calling. Its role, skills, unlock level, balance, gear additions, and ancestry affinities remain deliberately undefined until every base calling and specialization family receives one coordinated review. No Stalker runtime unlock or paid specialization asset should be implemented before that review.

### Planned expansion: Monk

Monk is the planned tenth base class, not a replacement or rename for any current calling. Its working space is mortal body discipline, breath, footwork, unarmed/hand-wrap technique, simple staff use, counters, and mobile control. It must receive a dedicated class pass before implementation to define its original SoulDrifter identity, resources, two level-one proof skills, armor rules, weapon interactions, and later specializations without becoming a generic martial-arts stereotype.

At levels 1-19, Monk uses learned mortal technique and does not begin with visible Aether-Scribed or Flesh-Forged runes. At the later awakening tier it may choose one compatible tradition, never both, under the same exclusivity rule as the other non-Paladin classes. Until that pass is approved, Monk is excluded from the current `4 x 9 = 36` ancestry/calling implementation and balance matrix.

## Shadowknight: Fire-Realm lich knight

The Shadowknight is an ash-bound warrior whose body died but whose soul-coal still burns. It steals measured vitality to prevent that ember from going dark.

### Level-one loop

- `Siphon Cleave`: a short weapon strike that returns 40% of dealt damage as vitality, with a minimum two-point return.
- `Cinder Guard`: a scorched defensive posture that reduces the next impact.
- `Gravefire`: resource generated by draining life and surviving guarded impacts.

The starting Shadowknight wears the same faded tunic, plain pants, belt, and boots as every Soul-Well arrival and carries a battered mundane longsword. Its only supernatural visual cue is a faint involuntary soul-coal in the eyes. Grave-iron armor, advanced runes, resurrection, undead armies, and large fire effects are earned later.

### Later specialization examples

- Ash Reaver: Fire + Death damage, life-drain, aggressive Gravefire spending
- Sepulcher Guard: Death tanking, stored vitality, ally interception, delayed collapse
- Grave Sigilist: Aether-Scribed cinder marks placed on weapons, armor, ground, or enemies
- Ember Vessel: Flesh-Forged Fire runes on body and grave-iron, persistent buffs, heat/overload management
- Void Pyre: Fire + Void pressure that consumes space, wards, and enemy resources

Grave Sigilist and Ember Vessel are mutually exclusive because they belong to opposing rune traditions.

## Ancestry and class resonance

Ancestry never locks a class, but it creates real optimization choices. Favored pairings receive one named ancestry passive and one additional attribute point.

- Human: Warrior, Priest, Asura
- Elf: Mage, Sharpshooter, Summoner
- Dwarf: Warrior, Paladin, Shadowknight
- Halfling: Sharpshooter, Priest, Slayer

Non-favored combinations remain fully playable and can produce unusual builds. The bonus should matter without making the remaining 24 combinations traps.

## Major-boss direction

The Worldcoil Serpents are original enormous predators formed where fear, hatred, and collapsed realm laws feed one another. They occupy the large-boss role and require multi-stage positioning, environmental counters, exposed weak points, and story choices. They are not copies of Death Gate dragon-snakes: names, biology, motives, visual language, histories, and encounter mechanics must be SoulDrifter-owned.
