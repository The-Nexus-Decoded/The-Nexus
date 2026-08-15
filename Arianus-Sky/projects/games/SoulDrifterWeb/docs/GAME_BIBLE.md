# SoulDrifter Tile-Based Game Bible

Status: AI-build handoff draft v2  
Created: 2026-08-07  
Source channel: Discord `#games-vr`, channel `1480483545431412877`

## Purpose

This document preserves the established SoulDrifter world, lore, class fantasies, races, realm laws, progression ideas, and visual identity while translating the game from a third-person 3D / future-XR concept into a tile-based tactical RPG.

Default build interpretation:

- fixed three-quarter isometric presentation
- real-time low-poly 3D world, characters, equipment, creatures, and effects
- square-tile maps
- free real-time exploration on tile-authored maps
- real-time action-bar combat by default
- optional tactical turns using the same actors, abilities, resources, and encounter state
- short reaction inputs for readable blocks, counters, and boss telegraphs
- party-based play
- single-player first, with co-op left as a later option

Combat direction is locked: exploration is real time and combat defaults to a real-time action bar. Players may switch to Tactical Turns before an encounter; both schedulers operate on the same simulation and rewards. Every action plays as a complete 3D animation, and valid melee actions automatically face the target. Timed block, dodge, counter, aim, or stabilization inputs add involvement without replacing character statistics.

## Source Provenance

This handoff was synthesized from:

- a complete paginated Discord export containing 10,720 messages
- export range: 2026-03-09 through 2026-04-25
- the later live Discord status window
- current SoulDrifter class, gear, lore, realm, and taxonomy documents

Important source reconciliation:

- The original Discord concept used eight classes and three races.
- Later project decisions cleaned the playable taxonomy into five starting classes.
- Summoner, Asura, and Slayer are not deleted; their fantasies remain as advanced class paths unless Lord Xar explicitly promotes them back to starting classes.
- Human, Elf, and Dwarf are the original race set. Halfling is a later documented extension.
- The historical Discord channel ended with an on-hold instruction. Lord Xar's current direct instructions reactivate design-spec work for this parallel tile-based version; publishing, deployment, and paid production spending remain separate approvals.

## Preservation Guarantee

The tile-based combat and visual adaptation does not replace or discard the existing SoulDrifter content.

Preserve throughout implementation:

- the SoulDrift collision origin and merged-world premise
- Soul Drifter player identity, Soul Essences, soul memory, rebirth, and realm-restoration choices
- all four realm concepts and their gravity, density/heat, light/water, and sound/death laws
- the original eight class identities and the later five-starting-class taxonomy
- every documented subclass path
- Human, Elf, Dwarf, and the documented Halfling extension
- race/class independence and equal treatment of skin tones
- class equipment, magic resources, party roles, gear tiers, and realm materials
- secondary professions, Zone 1, training characters, enemy concepts, quests, bosses, factions, progression, and hub systems
- African-influenced visual culture and the originality/IP boundaries

Only the delivery format is changed: classic isometric low-poly 3D, real-time exploration, and animated hybrid combat with real-time and tactical scheduling options.

## High Concept

SoulDrifter is a party-based fantasy tactical RPG set after two incompatible realities collide. A world built around life, resurrection, seeds, and deferred souls is torn open by wars of magical overreach. Its rifts strike a second broken reality made of divided elemental realms, living rune craft, formal shaping magic, soul memory, and death pressure.

The collision does not destroy either world. It merges them badly.

Seas pour into skies. Mountains remember dead worlds. Forests root through basalt ruins. Contradictory laws of gravity, heat, light, sound, life, and death overlap on the same battlefield. Survivors awaken with memories from more than one reality and become Soul Drifters: living fragments able to cross unstable realm seams, recover Soul Essences, and decide whether the joined worlds should be healed, stabilized, separated, or transformed.

## Player Promise

The player should be able to:

- build a party whose classes are incomplete alone but powerful together
- read class, ancestry, gear tier, and magic source at a glance
- manipulate terrain and realm laws rather than only trading damage
- travel through four dramatically different realms
- recover memories and Soul Essences that alter character builds and story choices
- combine martial runes, five-color magic, devotional light, bonded beasts, oath power, shaping, black magic, and execution tactics
- make meaningful decisions about the fate of the merged realities

## Design Pillars

1. **Realm traversal through physics mastery**  
   Each realm changes how tiles, movement, visibility, hazards, and abilities work.

2. **Party interdependence**  
   Warrior opens, Mage shapes, Priest sustains, Sharpshooter focuses, Paladin stabilizes, and advanced paths exploit special windows.

3. **Readable identity**  
   Silhouette, equipment, color, animation, and tile effects must communicate class and role before exposition.

4. **Soul memory and rebirth**  
   Defeat, respec, class memory, and story progression are grounded in the world's resurrection systems.

5. **Magic has structure and cost**  
   Runes form circuits, colors form formulas, vows impose rules, pets require bonds, shaping requires command, and black magic creates backlash.

6. **Original shipping identity**  
   Death Gate influence is structural inspiration only. Do not ship exact book names, characters, factions, rune diagrams, machines, or plot beats.

7. **Animated combat instead of static chess pieces**
   Characters remain alive through grounded locomotion, combat idles, auto-facing, reactions, weapon handling, spell channels, impacts, and environmental response in either scheduler.

## Core Gameplay Loop

1. Return to the central Soul Well / realm-root hub.
2. Select a realm breach, story route, contract, or expedition.
3. Build a four-character party and equip gear, runes, formulas, pet commands, vows, and consumables.
4. Explore freely in real time, uncover fog, speak to survivors, collect lore, solve realm-law puzzles, and find optional paths.
5. Enter combat seamlessly on the same map when enemies engage or a scripted encounter begins.
6. Fight through the default real-time action bar or preselect Tactical Turns; both resolve the same movement, attacks, spells, reactions, and impacts.
7. Manipulate tiles, elevation, line of sight, hazards, and enemy positioning.
8. Recover Soul Essence, realm materials, memories, class imprints, and equipment.

Inventory uses a UO-inspired separation between equipped paper-doll slots and a carried backpack. Every new soul starts with 30 backpack slots. Equipped items consume no backpack slot; loot, quest rewards, vendor purchases, crafting results, consumables, materials, and unequipped equipment share one capacity-checked collection path. Capacity is expandable through earned slots and future backend-verified account entitlements; details are locked in `docs/INVENTORY_AND_EQUIPMENT_SYSTEM.md`.
9. Decide which systems, settlements, factions, or realm conduits to stabilize.
10. Use recovered memories to unlock skills, subclasses, crafting, and story branches.
11. Re-enter the world with a changed party and altered realm state.

## Tile and Combat Rules

### Grid

- Use square tiles as the default.
- Orthogonal movement costs 1 movement point.
- Diagonal movement is disabled by default or costs more; specific classes may unlock diagonal movement.
- Elevation changes movement, range, cover, falling, and line of sight.
- Map size targets:
  - tutorial: 8x8 to 12x12
  - standard encounter: 12x12 to 20x20
  - boss or traversal encounter: up to 24x24 with staged objectives

### Combat State Model

Combat uses three shared runtime states:

1. `exploration`: the party and world move in real time.
2. `orders`: Tactical Turns pauses hostile scheduling while the active unit selects movement, target, ability, item, stance, or command.
3. `resolution`: actions animate and hostile real-time pulses are scheduled while reaction opportunities may appear.

State transitions:

- Enemy detection, a hostile action, a trap, or a scripted encounter starts the selected combat scheduler.
- All participants retain their visible world positions, then receive logical grid occupancy and initiative.
- In Tactical Turns, a unit completes `orders -> resolution`, then the next valid unit enters `orders`.
- In real time, cooldown-ready player actions and paced enemy pursuit pulses alternate without changing encounter data.
- Victory, retreat, surrender, negotiation, or enemy disengagement returns the same map to `exploration`.
- There is no separate random battle screen and no loading transition for normal encounters.

### Turn Structure

- Units act in a visible initiative order.
- A standard turn grants movement plus one primary action.
- Quick actions, reactions, pet commands, stance changes, or item use depend on class and gear.
- Facing is enabled for Backstab, shields, firing arcs, line attacks, and some reactions.
- A player may preview path, facing, cover, line of sight, affected tiles, estimated outcome, and potential reactions before confirming.
- After confirmation, the action resolves through an uninterrupted real-time animation sequence.
- Reactions include active block, dodge, parry/counter, intercept, opportunity strike, pet intercept, ward response, counterspell, aim timing, and rune stabilization.

### Real-Time Action Bar

- Real-time is the default level-one combat style.
- Enemies autonomously path toward the player, auto-face, and attack on a paced pulse.
- A group may advance together, but only one adjacent standard creature attacks per pulse so animation locks do not create unavoidable pack burst.
- `Weapon Strike` is a universal zero-resource basic action. Class signatures, defenses, recovery actions, and later item skills use their defined cooldowns and resources.
- Selecting or clicking a nearby target auto-faces before contact. Out-of-range actions may still rehearse their animation but deal no damage and spend no Stability, mana, or class resource.
- Combat style is chosen before an encounter and locked until the encounter resolves.

### Real-Time Reaction Layer

The reaction layer adds involvement but must not overpower character statistics or tactical preparation.

- Prompts appear only during defined moments in an action animation.
- A successful input improves an outcome; failure should usually return the normal calculated result rather than automatically causing disaster.
- Character attributes, class skills, status effects, equipment, facing, and difficulty modify reaction-window size.
- Reaction types must match class identity:
  - Warrior: block, parry, counter, or stabilize an overloaded rune circuit.
  - Mage: complete or correct a color formula.
  - Priest: reinforce a ward or time a protective intervention.
  - Sharpshooter: aim, release, reload, or issue a companion follow-up.
  - Paladin: brace, intercept, or release an oath-charged impact.
  - Conjurer: maintain Command Focus when a shaped form is disrupted.
  - Asura: contain backlash or deliberately accept added Instability.
  - Slayer: time a flank strike, evade, or extend an execution chain.
- Enemy attacks may offer block, dodge, parry, ward, or brace prompts when the target has the correct capability.
- Boss reactions use readable tells and never depend on an unseen timing window.

Accessibility and pacing:

- Provide `Full Timing`, `Wide Timing`, `Auto Resolve`, and `No Timing Bonus` reaction modes.
- Allow keyboard, mouse, controller, and touch-friendly input mappings.
- Never require rapid button mashing.
- Provide 1x and 2x combat animation speeds; optionally provide a faster mode after an encounter has been cleared once.
- Allow repeated basic animations to be shortened while signature abilities, first uses, bosses, and story moments retain full presentation.
- Trivial encounters may be auto-resolved only after the player has demonstrated mastery or cleared that encounter family.

### Animated Combat Feel Contract

- Characters maintain combat-ready idle animation between turns.
- Units turn, step, run, brace, aim, cast, recoil, recover, and return to a stable stance rather than sliding or teleporting.
- Movement animations must follow the confirmed path while logical tile occupancy remains authoritative.
- Melee contact, projectile travel, spell travel, impact, reaction, status application, and environmental response must occur in a readable order.
- Attacks may use brief impact emphasis, camera easing, particles, sound, and hit stop, but should not become long repeated cinematics.
- Characters remain at their resolved destination; animations must not visually return them to an old tile.
- Pets, conjurations, hazards, wind, water, vegetation, runes, and realm conduits continue ambient animation while orders are being selected.
- The camera may briefly frame a signature action but must return quickly to the tactical view.
- Combat should feel alive like an animated party battle while preserving the clarity and control of a turn-based tactical RPG.

### Universal Tactical Concepts

- `Guard`: absorbs or reduces frontal pressure.
- `Stagger`: disables reactions and opens execution windows.
- `Mark`: exposes a priority target to ranged and party bonuses.
- `Ward`: prevents or cleanses magical conditions.
- `Bind`: prevents movement, displacement, or ability use.
- `Corruption`: raises black-magic risk and realm instability.
- `Soul Fracture`: weakens revival and memory stability.
- `Realm Pressure`: a map-specific survival clock or escalating hazard.
- `Conduit`: a tile object that channels realm power and can be captured, broken, or redirected.

### Cover and Line of Sight

- Half cover reduces ranged accuracy.
- Full cover blocks normal line of sight.
- High ground improves range or accuracy.
- Light, darkness, smoke, steam, foliage, water, and sound can modify visibility by realm.
- Some abilities target a tile, line, cone, ring, chain, or named unit rather than a simple radius.

## Four Realm Structure

Internal inspiration names may remain in development documents. Shipping-facing names should become original SoulDrifter names before release.

| Realm | Element / Theme | Core Tile Law | Tactical Expression | Materials / Look |
| --- | --- | --- | --- | --- |
| Arianus-Sky | sky, air, scarcity | gravity and flight | wind lanes, floating tiles, falls, lifts, air steps, vertical routes | light cloth, sky crystal, bronze, wind seams, suspended ruins |
| Pryan-Fire | fire, extreme growth, heat | density and heat pressure | heating tiles, softening armor, expanding growth, fire lanes, mass shifts | ember glass, charred wood, heat-scarred metal, dense jungle |
| Chelestra-Sea | water, life, migration | light, vision, and magic suppression | refraction, revealed paths, extinguished runes, currents, flooded lanes | shell, coral, polished bone, water-worn metal, green-blue channels |
| Abarrach-Stone | stone, death, failure | sound and death pressure | acoustic navigation, echo reveals, corpse risk, poison, collapsing basalt | basalt, obsidian, ash, black iron, cold glow |

### Arianus-Sky Tile Mechanics

- `Wind Lane`: pushes units at round end.
- `Lift Tile`: raises a unit or platform one elevation level.
- `Void Edge`: falling hazard unless the unit can anchor, fly, or air-step.
- `Gravity Well`: changes movement cost around a center.
- `Scarcity Cache`: optional resources placed on dangerous side routes.
- Warrior `Anchor Step` resists wind and protects adjacent allies.
- Wind Strider can cross one missing tile or reverse a push.

### Pryan-Fire Tile Mechanics

- `Heat Tile`: gains heat each round; high heat damages or exhausts units.
- `Density Field`: increases or reduces movement and knockback.
- `Growth Tile`: spreads roots or jungle cover when activated.
- `Ember Vein`: powers Red magic but raises Realm Pressure.
- Repeated Warrior hits can soften armor on heated enemies.
- Green magic can redirect growth; Blue magic can contain flame.

### Chelestra-Sea Tile Mechanics

- `Refraction Tile`: bends line attacks or reveals hidden paths.
- `Nullwater`: suppresses active runes and unstable conjurations.
- `Current Tile`: moves units and objects after actions.
- `Living Reef`: heals, blocks, or grows depending on color input.
- White light reveals safe routes.
- Physical skills remain important when magic is suppressed.

### Abarrach-Stone Tile Mechanics

- `Echo Tile`: reveals enemies only after sound is generated.
- `Death Pressure`: increases when units fall or black magic is chained.
- `Poison Fissure`: creates hazardous lanes.
- `Basalt Anchor`: prevents displacement but can trap a unit.
- `Corpse Tile`: usable by Asura/Necromancer paths and cleansable by Priest/Paladin.
- Silence can protect the party from predators while also reducing information.

## World and Lore Bible

### The Collision

The first world believed magic could preserve life after the world could no longer sustain it. Its people created seeds of life, resurrection pools, soul vessels, and rituals that deferred awakening across ages. These systems began as mercy and became prizes in wars of power.

Rival rulers, orders, mages, and sorcerers opened rifts seeking refuge, weapons, power, and control over death. The rifts answered one another and struck the broken elemental reality now called the SoulDrift.

The rifts behaved as wounds, not doors. Landmasses folded together. Magic systems braided. Survivors changed. The Tree of Life bent but did not break, and the first Soul Drifters awakened around its roots carrying memories that belonged to more than one world.

### The SoulDrift

No one agrees whether the SoulDrift is:

- a place between realities
- the scar created by the collision
- a living bridge
- a judgment against magical overreach
- the memory of the worlds trying to become whole

This disagreement should drive factions, faiths, and ending choices.

### Player Identity

The player characters are Soul Drifters: living fragments tied to the realm-root and capable of surviving crossings that fracture ordinary souls.

Their goals evolve from survival to responsibility:

1. awaken and stabilize their own soul memory
2. learn why the realms are colliding
3. recover Soul Essences and repair or redirect conduits
4. confront those profiting from instability
5. decide the final relationship between the merged realities

### The Central Hub

Use a hub built around these translated concepts:

- `Nexus Tree` or `Realm Root`: the living structure binding the merged landmasses
- `Soul Well`: resurrection, recovery, respec, and memory access
- `Memory Chamber`: class imprints, recovered lore, and companion histories
- `Breach Table`: realm/mission selection
- `Forge`: rune slots, gear upgrades, and material crafting
- `Bonding Grounds`: pet training and realm-beast care
- `Ward Hall`: corruption removal and oath management

Final shipping names are not yet locked.

### Narrative Themes

- mercy becoming control
- survival versus stewardship
- memory and identity across rebirth
- responsibility for inherited disasters
- the cost of reshaping reality
- cooperation between incompatible cultures
- whether broken worlds must be restored to what they were

## Race and Ancestry System

### Original First-Pass Races

| Race | Identity | Tile/Animation Expression | Non-locking Affinity |
| --- | --- | --- | --- |
| Human | adaptable realm cultures, broad variation, multiple skin tones | balanced movement and gear fit | flexible training and faster secondary-profession growth |
| Elf | memory, precision, graceful motion, long cultural continuity | clean diagonals, controlled posture, refined range | perception, formula precision, or long-memory bonuses |
| Dwarf | forge culture, compact strength, stone/material expertise | lower center of gravity, knockback resistance | crafting, anchors, armor, and conduit interaction |

### Later Extension

| Race | Identity | Tile/Animation Expression | Non-locking Affinity |
| --- | --- | --- | --- |
| Halfling | improvisation, courage, compact fieldcraft | gap movement, cover use, small-tool speed | stealth, consumables, rescue, and route discovery |

### Ancestry Rules

- Race changes proportions, movement style, gear fit, culture, materials, and relationship to realm pressure.
- Race never forces a class.
- Skin tone never represents rarity, morality, power tier, or stat hierarchy.
- Human variants must support deep, dark, brown, olive, tan, light, and pale skin tones as equally canonical.
- Rune-descended and shaping-descended traditions may later exist as ancestry layers, but their internal inspiration names should not be shipped without an originality review.

## Playable Class Taxonomy

### Starting Classes for the Clean V1 System

| Starting Class | Starting Skill | Tactical Job | Primary Resource | Tile Identity |
| --- | --- | --- | --- | --- |
| Warrior | Rune Slash | frontline, stagger, guard break | Fury + Rune Stability | anchors, impact lines, guard zones, physical rune circuits |
| Mage | Meteor Swarm | color fields, burst, control | color channels / prepared formulas | paints and combines colored tile effects |
| Priest | Holy Arrow | heal, ward, cleanse, anti-dark | devotion / ward charge | safe zones, cleansed tiles, prevention lines |
| Sharpshooter | Multishot | ranged focus, traps, pet commands | Focus + Pet Bond | marks, firing lanes, traps, companion positioning |
| Paladin | Thor's Hammer | tank, stun, oath protection | oath charge / aura | protection auras, intercept zones, thunder impact |

### Preserved Legacy Class Identities

| Original Class | Starting Skill | Current Placement | Promise Preserved |
| --- | --- | --- | --- |
| Summoner | Summon Minion | Mage -> Blue Conjurer unless promoted | shaped or bound magical forms and battlefield control |
| Asura | Mindburn | Mage -> Black/Asura unless promoted | mind pressure, curses, necromancy, dangerous backlash |
| Slayer | Backstab | Warrior -> Slayer unless promoted | stealth, poison, flank, and execution |

This structure keeps every original class idea while avoiding overlapping base identities.

## Class Details

### Warrior

Fantasy:

- physical fighter whose body, weapon, armor, charms, breath, and stance form one rune circuit
- runes are mechanical, dangerous, and practical rather than decorative tattoos
- makes direct contact with hostile realm laws

Tile kit:

- `Rune Slash`: cleaves a line or short arc; damages guard and activates a weapon-rune tile.
- `Guard Split`: heavy hit that breaks armor or shield states.
- `Anchor Step`: creates an adjacent protection zone and resists forced movement.
- `Realm Rush`: moves through a line of tiles; rider changes by realm.
- `Break Rhythm`: interrupts a spell, conduit, or active tile pattern.
- `Berserker Window`: temporary overload for speed and damage at the cost of stability.

Resource rules:

- Fury rises from damage taken, perfect blocks, heavy hits, and hostile realm exposure.
- Rune Stability falls when too many rune effects are chained.
- At zero stability, active runes misfire and cause recoil or disabled gear channels.

Gear:

- blade-spear, heavy sword, axe-blade, impact spear, shield for defensive paths
- medium/heavy segmented armor, wraps, leather, basalt/iron plates, asymmetric mantle
- no generic knight plate, caster staff, firearm, or oversized anime sword

### Mage

Fantasy:

- formula caster who creates behavior by combining disciplined color channels
- base Mage shows all five channels without becoming rainbow noise

Color grammar:

| Color | Meaning | Tile Use |
| --- | --- | --- |
| White | light, reveal, precision, cleanse | reveal fog, cleanse corruption, precision beams |
| Green | growth, earth, living matter | roots, cover, healing growth, terrain creation |
| Red | war, fire, force | heat, burst, weapon ignition, armor pressure |
| Blue | shaping, control, binding, displacement | barriers, pulls, cages, constructed forms |
| Black | death, chaos, curses, Mindburn | corpse tiles, fear, links, backlash damage |

Formula rule:

- one color defines primary power
- a second can define delivery shape
- a third can define a rider effect

Examples:

- Red + Blue: burning containment ring
- Green + Blue: root cage
- White + Green: purification growth
- Black + Red: burning curse
- White + Blue: reveal-and-bind construct

Gear:

- prism, wand, spell disc, rings, short staff, layered wraps, channel bands
- no heavy armor, giant melee weapon, hunter bow, or unstructured mixed effects

### Priest

Fantasy:

- devotional White magic based on vows, care, spiritual authority, and protection
- distinct from technical Mage White

Tile kit:

- `Holy Arrow`: radiant line attack with bonus pressure against corruption and undead.
- `Ward Mend`: restores health and repairs a damaged ward tile.
- `Clean Ground`: removes corruption, corpse pressure, or hostile glyphs.
- `Vow of Shelter`: redirects part of an ally's incoming damage.
- `Last Light`: prevents a fatal hit once, leaving the Priest exhausted.

Gear:

- ward cloth, holy bow, staff, bell, charm, or short mace
- light/medium robes and ceremonial armor panels
- no Paladin plate, necromantic kit, or random five-color formula gear

### Sharpshooter

Fantasy:

- ranged hunter who controls distance, marks prey, sets traps, and fights with one persistent physical companion
- the pet is trained and bonded, not summoned

Tile kit:

- `Multishot`: cone or fan attack that gains value against marked targets.
- `Prey Mark`: exposes a weak point and shares priority information with allies.
- `Command Pet`: harass, pin, interrupt, body-block, retrieve, or scout.
- `Snare Trap`: creates a hidden or visible root tile.
- `Killing Line`: high damage against staggered, rooted, isolated, or marked enemies.

Companion examples:

- Stalker: stealth pressure and interrupt
- Ridgeback: pin and body-block
- Skyhawk: scouting and mark extension
- Ash Hound: chase and burn pressure

Gear:

- bow, crossbow, traps, quiver, travel armor, command whistle/token, pet harness
- firearms only after the world's technology level is approved

### Paladin

Fantasy:

- oath-armored protector who confronts corruption through martial action
- not merely a Priest in heavier armor

Tile kit:

- `Thor's Hammer`: thunder strike on a target tile, with stun or shock spread.
- `Oath Guard`: intercepts attacks aimed at nearby allies.
- `Vow Field`: grants defense or condition resistance inside an aura.
- `Cleanse Strike`: removes corruption through a weapon hit.
- `Hold the Breach`: locks position and prevents enemies crossing adjacent tiles.

Gear:

- hammer, mace, shield, heavy spear, oath blade, warded plate
- oath sigils and thunder/light channels
- no stealth kit, necromantic focus, or generic crusader copy

### Blue Conjurer / Summoner Path

Fantasy:

- names, shapes, binds, and maintains temporary pattern entities
- uses command geometry rather than a physical hunter bond

Resources:

- Threads
- Command Focus

Rules:

- maintain one powerful form or several weak forms
- forms inherit realm modifiers
- broken Command Focus makes forms weaken, destabilize, or become briefly hostile
- other Mage colors can tint conjurations

Examples:

- durable brute form
- ancient wyrm form
- scouting pattern wisp
- binding figure that holds one target

### Asura / Black Path

Fantasy:

- forbidden mind, death, chaos, and curse magic whose power always has a visible cost

Resources:

- Dread
- Instability

Tile kit:

- `Mindburn`: attacks focus and is strongest against casters or elites.
- `Chaos Mark`: causes the next hostile action to misfire or splash.
- `Black Thread`: links two enemies so pressure transfers between them.
- `Panic Bloom`: fear and movement disruption around a tile.
- `Backlash Bargain`: high damage in exchange for Instability.

Rule:

- high Instability increases power and self/friendly-fire risk
- Priest and Paladin can stabilize the Asura without erasing the dark identity

### Slayer Path

Fantasy:

- execution fighter who wins through positioning, stealth, poison, and priority kills

Tile kit:

- `Backstab`: major bonus from the rear or from concealment.
- `Venom Cut`: delayed damage and healing reduction.
- `Shadow Step`: crosses occupied or threatened tiles to reach a flank.
- `Silence Wire`: disables reactions or casting.
- `Reap the Opened`: finisher against wounded, staggered, or isolated targets.

Gear:

- daggers, short blades, poison vials, flexible wraps, climbing/entry tools
- no heavy armor, spear identity, or giant fantasy blades

## Subclass Matrix

### Warrior Paths

- Berserker: assault bruiser, rune overclock, burst at personal risk
- Slayer: execution and anti-elite pressure
- Rune Guard: ally protection and stance locks
- Breaker: posture damage and boss interruption
- Wind Strider: mobility, air steps, dodge counters

### Mage Paths

- Luminist: White reveal, cleanse, precision
- Verdant: Green growth, roots, shields, terrain denial
- Warcaster: Red fire, combat force, armor pressure
- Conjurer: Blue shaping, barriers, grouping, temporary forms
- Asura: Black curses, necromancy, Mindburn, instability
- Prism Caster: planned two-color formulas and combo flexibility

### Priest Paths

- Lightbinder: stable healing and cleanse
- Exorcist: anti-curse, anti-possession, anti-undead
- Oracle: threat-line prediction and damage prevention
- Martyr: transfers pain or corruption from allies
- Sun Archer: Holy Arrow-focused backline offense

### Sharpshooter Paths

- Beastmaster: companion-centered control and damage
- Deadeye: weak-point sniper
- Trapper: snares, mines, and terrain control
- Skirmisher: mobile ranged pressure
- Warden: defensive pet and backline protection

### Conjurer Specializations

- Binder: cages and command patterns
- Shaper: temporary bodies and utility constructs
- Namecaller: costly elite conjurations
- Wyrmkeeper: ancient beast-pattern forms
- Threadweaver: support links between allies, terrain, and constructs

### Paladin Paths

- Oathguard: tank and ally protection
- Thunderhand: stun and impact bruiser
- Banneret: formation and morale support
- Redeemer: cleanse through combat
- Iron Saint: armored emergency healing

### Asura Specializations

- Mindburner: anti-caster and elite disruption
- Necromancer: corpses, chill, life drain
- Hexer: delayed curses and chaos marks
- Void Howler: high-backlash burst
- Grave Saint: forbidden support through death-price exchange

### Slayer Specializations

- Backstabber: classic flank assassin
- Venomblade: poison and bleed
- Shadowstepper: mobility and escape
- Duelist: single-target champion control
- Reaper: wounded-target execution

## Party Synergy

Default first party:

1. Warrior
2. Mage
3. Priest
4. Sharpshooter

Core combo examples:

- Warrior Guard Split -> Sharpshooter Killing Line
- Blue pull -> Red area burst -> Warrior cleave
- Green root cage -> Multishot -> pet pin
- Priest reveal -> Slayer flank -> Backstab
- Paladin Hold the Breach -> Mage field control
- Asura Black Thread -> Warrior area strike
- Priest cleanse -> Asura safely spends more Instability
- Warrior Anchor Step -> Conjurer maintains a long command pattern

## Progression

### Levels 1-10

- Choose one starting class.
- Learn the class's signature skill immediately.
- Gain one mobility, one defense, one utility, and one realm-adaptive skill before level 10.
- Learn a secondary profession through realm training.
- At or near level 10, unlock a subclass trial rather than receiving the subclass automatically.

### Soul Memory

- Class abilities are stored as soul imprints.
- Recovered memories unlock passive traits, dialogue, or alternate skill forms.
- Respec occurs at the Soul Well and has a narrative cost or choice.
- Defeat can create a temporary Soul Fracture that must be healed, accepted, or converted into a risky trait.

### Gear Tiers

| Tier | Meaning | Visual / Mechanical Rule |
| --- | --- | --- |
| C | common / starter | practical, worn, low ornament, one simple modifier |
| B | trained | clearer class silhouette and reliable class synergy |
| A | elite | realm materials, stronger channels, build-defining modifiers |
| S | legendary | iconic silhouette, animated effects, signature rule changes |

Higher rarity means stronger identity, complexity, or specialization. It must not erase base class readability.

## Secondary Professions and Realm Training

| Tradition | Profession | Tile-Based Function |
| --- | --- | --- |
| Vesper | Conjuring / potions | cleanse, stamina, recovery consumables |
| Sherwood | Gardening | food, seedcraft, growth tiles, living materials |
| Thousand Isles | Thievery | stealth routes, locks, smuggling, shadow movement |
| Tul Nielohg Desert | Mechanic | fire weapons, lenses, desert engines |
| Dul'Khan Mountains | Beast Tamer | pet training, mounts, creature handling |
| Moltania | Engineering | forge technology, fortification, devices |
| Netherealm | Dark Magic | curses, life drain, death-risk utility |
| Magincia | Light Magic | blessings, wards, radiant crafting |

Secondary professions add utility and map interaction. They do not overwrite class identity.

## Tutorial and Zone 1 Adaptation

The browser vertical slice uses one connected dungeon crawl:

1. The Realm-Lock Vestibule: character refinement, lore, equipment, and action rehearsal.
2. A safe guide passage followed by one shared Fractured Galleries combat room.
3. One shared Ashen Lock miniboss room and First Memory reward.

### Realm-Lock Vestibule

- The player awakens beside the Soul Well with fragmented memories.
- Teach floor navigation, inspection, movement, facing, interaction, action icons, dry activation, out-of-combat buffs, cooldowns, and finite recovery.
- Ancestry and base calling were already chosen in the Weaving. Wellkeeper Ilyra explains why that specific ancestry/calling returned.
- Ilyra presents the required illustrated Chronicle of Returning. Historical Death Gate events are labeled separately from the original SoulDrifter continuation, and the final page explains the player's shared mission among many resurrected SoulDrifters.
- At the Memory Loom, the player distributes exactly three final stat points, selects one ancestry boon, and selects one base-calling discipline.
- The returned body begins with worn C-tier clothing and a mundane calling weapon already equipped. The Wayfarer's Coffer grants a binding charm and two recovery bands.
- A battered effigy supports safe signature/defense rehearsal.
- The room must visibly function as a damaged trans-realm machine-temple: Soul Well, conduits, realm reliefs, pillars, shelves, cobwebs, braziers, rubble, coffers, ash, and unstable light.

### Paired Trial Doors

- Wayfarer and Oathbreaker are difficulty presets, not separate maps.
- Both physical doors converge on the same guide passage, combat room, and miniboss room.
- Wayfarer activates three light enemies at standard health/damage/pressure.
- Oathbreaker activates all five enemies, applies 1.55x health and 1.22x damage, raises Realm Pressure, upgrades gear, and adds a deterministic chance to awaken a calling-specific skill.

### Guide Passage and Fractured Galleries

- Breach Scout Orren teaches Tactical Turns versus Real-Time Action Bar.
- Arena Warden Brannoc teaches the current calling's level-one signature, defense, and resource contract.
- The passage is safe; combat begins only after crossing the authored room threshold.
- The shared room randomizes dimensions, blockers, dressing, and enemy positions while preserving a completable navigation spine.
- Health, Stability, class resource, cooldowns, and recovery charges carry forward.

### Ashen Lock

- The Cinderbound Warden is the shared miniboss for both paths.
- Its seeded telegraph pattern teaches active defense and resource planning.
- The selected door scales Warden health, damage, Realm Pressure, and the final cache.
- Recovering the First Memory opens the route toward the outdoor starting realm.

### Low-level magic rule

Levels 1–19 use mortal weapon disciplines, human wizardry, practical necromancy, wards, color formulas, lesser bindings, and class resources. Sartan probability song, Patryn body/equipment runes, and mature Void/Dark/Death specialization begin around levels 20–30. No class may combine Sartan-specific and Patryn-specific skills.

The complete starter-perk review surface is `STARTER_PERK_VETTING_MATRIX.md`; unapproved 36-combination resonance proposals are documentation, not shipping balance data.

## Enemy and Encounter Families

### Training and Construct Enemies

- Training Dummy Mk I: stationary target and damage tutorial
- Reactive Dummy: blocks, faces, and punishes poor positioning
- Sentinel Construct: mobile guardian with readable command geometry

### Realm-Corrupted Enemies

- Wind-torn scavengers that move with Arianus lanes
- Heat-swollen predators that gain armor or mass in Pryan
- Nullwater hunters that suppress magic in Chelestra
- Echo predators and corpse-fed constructs in Abarrach

### Faction Enemies

Create original factions around these positions:

- those who want to restore the worlds exactly as they were
- those who profit from permanent instability
- those who worship the SoulDrift as judgment or evolution
- those who want to separate the worlds regardless of casualties
- those who believe a new combined world should replace both old ones

Names, leaders, symbols, and exact histories remain to be written.

## Quest and Mission Types

- Conduit repair: redirect realm energy across a tile network
- Soul recovery: rescue or reconstruct a fractured memory
- Breach defense: hold tiles while a gate stabilizes
- Realm traversal: cross a map dominated by physics hazards
- Hunt: track a marked creature using signs, sound, and companion skills
- Purification: clean corruption without destroying living terrain
- Extraction: escape with a relic while Realm Pressure rises
- Choice encounter: select which settlement or conduit receives limited power
- Boss expedition: multi-stage map with changing realm laws
- Memory trial: character-specific tactical puzzle with altered party rules

## Boss Design Rules

- Bosses should alter the map, not only gain health.
- Every boss needs a realm law, readable preparation tell, counterplay, and party-combo opening.
- Boss stages may rotate or merge realm rules.
- Stagger and guard-break windows should reward Warrior and coordinated play.
- Marks and weak points should reward Sharpshooter.
- Wards and cleanse checks should reward Priest/Paladin.
- Field control should reward Mage/Conjurer.
- Execution phases should reward Slayer without making Slayer mandatory.

## Visual Direction

- fixed three-quarter isometric readability first
- mythic but practical, realm-weathered rather than costume-shop fantasy
- African-influenced geometric textiles, metalwork, beads, bronze details, and cultural patterning where established
- class identity readable at normal isometric gameplay-model scale
- body, weapon, armor, and carried-item magic channels remain visually linked
- realm materials visibly change gear without erasing the class silhouette
- pets and conjurations must be unmistakably different
- dark magic must show cost without coding ethnicity as evil

### Locked Art Target: Classic Isometric Low-Poly 3D

The approved visual direction combines two old-school strengths without copying either game's assets:

- classic Ultima Online-style world presentation: elevated isometric camera, tile-aligned terrain, layered world objects, readable buildings, and dense environmental dressing
- Old School RuneScape-style real-time 3D readability: simple low-poly models, strong silhouettes, restrained texture detail, clear material blocks, and equipment that remains recognizable at gameplay distance

Production interpretation:

- Render characters, creatures, armor, weapons, props, terrain, buildings, and effects as real-time low-poly 3D.
- Keep characters fully rigged and animated rather than converting them to sprites.
- Required animation groups are idle, walk, run or urgent move, basic attack, signature skill, cast or channel, block or evade, hit reaction, downed, death, and interaction.
- Every weapon action, spell, summon, buff, defense, recovery, and class/creature skill must pass the shared [`ANIMATION_PRODUCTION_PIPELINE.md`](ANIMATION_PRODUCTION_PIPELINE.md) gate. The skill owns one actor-agnostic motion/telegraph/event contract reused by compatible PCs, NPCs, enemies, summons, and PvP actors; race, gear, and power tier add layers without changing what the skill communicates before resolution.
- Every weapon pose and action must first pass the source-backed stance and grip research gate in [`WEAPON_MOTION_REFERENCE_INDEX.md`](WEAPON_MOTION_REFERENCE_INDEX.md). Research is selected for the exact weapon subtype, hand count, skill tier, and action; convenient animation clips cannot redefine the class skill.
- Keep movement and interactions on a logical square grid while rendering the floor and world in 3D.
- Use modular 3D equipment anchors so weapons, armor, runes, and class gear remain visibly equipped.
- Use simple baked or low-cost lighting, clear contact shadows, and restrained dynamic effects for magic, weather, hazards, and realm pressure.
- Start with a fixed elevated three-quarter camera. Modest zoom and optional limited rotation may be added if they do not hurt tile readability.
- Environment kits should support elevation, walls, roofs, bridges, water, foliage, conduits, and realm hazards without hiding combat information.
- Use deliberately simple geometry and hand-authored low-resolution textures rather than realistic materials or dense sculpt detail.
- Reserve high-detail illustration for portraits, dialogue, loading art, and major story moments rather than normal gameplay models.

Originality boundary:

- Do not copy RuneScape or Ultima Online models, sprites, textures, UI frames, maps, icons, fonts, sounds, palettes, or named content.
- Match the era, readability, camera language, and production economy while keeping SoulDrifter's own realm materials, rune systems, cultures, silhouettes, and interface.

### Low-Poly 3D and Tile Pipeline

1. Approve a low-poly model sheet and material palette.
2. Build one canonical low-poly model with modular equipment anchors.
3. Rig and animate the model in 3D using a shared humanoid skeleton where practical.
4. Attach modular class, race, and gear variants to the same animation system.
5. Validate feet, shadows, weapon arcs, effect origins, facing, and occupied-tile alignment from gameplay camera distance.
6. Create lower-detail models only if performance testing proves they are needed.
7. Keep collision, pathfinding, and ability targeting on the logical grid even when models animate freely inside their occupied tiles.

### Tile Art Rules

- Each realm needs a clear floor family, hazard family, interactable family, and height-edge family.
- Interactive tiles must be readable without relying only on color.
- Use shape, animation, iconography, and sound for accessibility.
- Rune tiles should show source, direction, and stability state.
- Avoid copying exact rune diagrams from outside IP.

## Audio Direction

- Arianus: wind, suspended metal, cloth, distant machinery, vertical space
- Pryan: layered heat, insects, growth, pressure, cracking material
- Chelestra: filtered resonance, currents, shell/bone percussion, muted magic
- Abarrach: echoes, basalt vibration, distant voices, silence as information
- Ability audio should communicate intent: activation, confirmation, error/backlash
- Sound is gameplay-critical in Abarrach and must have visual accessibility equivalents

## UI and Player Information

Required tactical UI:

- movement and attack range preview
- line-of-sight preview
- facing and reaction indicators
- tile inspection panel
- realm-law meter / Realm Pressure
- turn order
- class resource meters
- pet or conjuration command state
- color-formula preview
- ward, mark, bind, stagger, corruption, and Soul Fracture states
- predicted push/pull path
- accessible non-color indicators for every color-school effect
- clear `exploration`, `orders`, and `resolution` state feedback
- action confirmation and cancel controls before resolution begins
- real-time reaction prompt with timing, input, and success feedback
- reaction-assist setting visible in combat accessibility options
- combat animation speed control
- optional abbreviated-animation and auto-resolve controls when eligible

## Save and State Model

Track:

- party roster and ancestry
- class, subclass, level, and soul memories
- equipment, rune circuits, formulas, vows, pet bond, and professions
- realm conduit state
- faction decisions
- rescued or lost settlements
- breach stability
- boss state
- hub upgrades
- active Soul Fractures
- unlocked lore and endings

## AI Builder Data Contracts

The implementation should be data-driven.

### Class Definition

```json
{
  "id": "warrior",
  "startingSkill": "rune_slash",
  "resources": ["fury", "rune_stability"],
  "roles": ["frontline", "stagger", "guard_break"],
  "allowedEquipment": ["blade_spear", "heavy_sword", "segmented_armor"],
  "subclasses": ["berserker", "slayer", "rune_guard", "breaker", "wind_strider"]
}
```

### Ability Definition

```json
{
  "id": "rune_slash",
  "shape": "arc",
  "range": 1,
  "actionCost": 1,
  "resourceCost": {"rune_stability": 10},
  "damageTags": ["physical", "rune"],
  "tileEffects": ["weapon_rune_residue"],
  "statusEffects": ["guard_damage"]
}
```

### Realm Definition

```json
{
  "id": "arianus_sky",
  "primaryLaw": "gravity",
  "pressureType": "wind_exposure",
  "tileFamilies": ["wind_lane", "lift_tile", "void_edge", "gravity_well"],
  "materials": ["sky_crystal", "bronze", "light_cloth"],
  "classModifiers": ["warrior_wind_stride", "sharpshooter_range_shift"]
}
```

### Unit Definition

```json
{
  "id": "party_member_001",
  "ancestry": "human",
  "classId": "warrior",
  "subclassId": null,
  "level": 1,
  "facing": "north",
  "movement": 4,
  "initiative": 10,
  "equipment": [],
  "abilities": ["rune_slash"],
  "soulMemories": [],
  "conditions": []
}
```

### Encounter Definition

```json
{
  "id": "zone1_sentinel_trial",
  "mapId": "zone1_training_arena",
  "startMode": "scripted_trigger",
  "combatModel": "animated_turn_based",
  "initiativeMode": "individual",
  "reactionMode": "enabled",
  "animationSpeedOptions": [1, 2],
  "victoryConditions": ["defeat_sentinel"],
  "failureConditions": ["party_defeated"],
  "returnToExploration": true
}
```

### Reaction Definition

```json
{
  "id": "warrior_active_block",
  "trigger": "incoming_blockable_impact",
  "input": "confirm",
  "baseWindowMs": 650,
  "assistModes": ["full_timing", "wide_timing", "auto_resolve", "no_timing_bonus"],
  "successEffect": "reduce_damage_and_gain_fury",
  "normalEffect": "resolve_using_guard_stat",
  "criticalEffect": "parry_and_open_counter_window",
  "failureRule": "never_worse_than_normal_without_explicit_curse_or_difficulty_rule"
}
```

## First Playable Vertical Slice

Build only this before expanding:

- one connected three-room crawl using Realm-Lock Vestibule -> shared Fractured Galleries -> shared Ashen Lock
- four playable ancestries and nine playable base callings
- 36 ancestry/calling starter portraits plus one authored animated Elf Shadowknight 3D test model
- one signature ability and one defense per calling
- three final stat points, one ancestry boon, and one base-calling discipline selected with Ilyra's Memory Loom
- basic move, attack, defend, interact, and inspect
- player-selectable Tactical Turns or Real-Time Action Bar on the same simulation
- continuously animated combat-ready characters during orders and resolution
- at least one active block/dodge reaction and one class-specific reaction
- 1x and 2x combat animation speeds
- one safe training effigy, five Breachling actors, and one Cinderbound Warden
- Wayfarer and Oathbreaker presets on one shared room and boss map
- randomized room dimensions, props, enemy placement, Warden pattern, and run seed without breaking reachability
- ancestry/calling-specific Ilyra lore, guide dialogue, checkpoints, voice-over toggle, and IndexedDB character/story persistence
- one First Memory pickup and route-to-open-world hook

Vertical-slice acceptance criteria:

1. The first chamber reads as a populated 3D machine-temple rather than a flat or empty tile box.
2. The player character is grounded, walks, and uses readable signature/defense animations.
3. Ilyra's lore and character-refinement choices reflect the selected ancestry and calling.
4. Low-level abilities use mortal techniques and resources, never borrowed Ultima reagents or spell circles.
5. Both doors converge on one shared encounter map while producing visibly different opposition and rewards.
6. Realm Pressure changes recovery and enemy danger rather than acting as decorative text.
7. Exploration enters and exits combat without loading a separate battle scene.
8. Tactical and real-time modes use the same simulation, combatants, abilities, resources, and rewards.
9. Health, Stability, class resource, and recovery items remain finite across the gallery and miniboss.
10. The player recovers a Soul Essence/First Memory and sees a story consequence.
11. Every confirmed action resolves through readable real-time 3D animation.
12. Random generation preserves a reachable route to every required actor, encounter, and reward.

## Recommended Build Order

1. Grid, pathfinding, elevation, cover, line of sight, and logical occupancy.
2. `exploration -> orders -> resolution` combat state machine and initiative queue.
3. Data-driven unit, class, ability, status, reaction, encounter, and tile definitions.
4. Real-time low-poly character controller, shared animation system, facing, and tile-aligned movement.
5. Action preview, confirmation, animation resolution, impact order, and return to tactical camera.
6. Reaction timing system with accessibility modes and combat-speed options.
7. Spawn Chamber / Corridor / Training Arena map.
8. Warrior, Rune Slash, active block, and rune-stabilization reaction.
9. Mage and one Red/Blue field interaction.
10. Priest and one ward/cleanse interaction.
11. Sharpshooter, Prey Mark, and a simple companion command.
12. Sentinel Construct encounter with readable reaction tells.
13. Soul Essence, memory choice, and hub return.
14. Realm Pressure and Arianus wind tiles.
15. Elf and Dwarf visual/stat variations without class locks.
16. Paladin, subclasses, other realms, and advanced class paths.

## Non-Negotiable Canon Rules for Another AI

- Keep the SoulDrift collision premise.
- Keep the four-realm structure and gravity/density/light/sound gameplay threads.
- Keep Soul Essence, soul memory, rebirth, and realm restoration themes.
- Keep the original class ideas even when represented as subclasses.
- Base Warrior starts with Rune Slash, not Berserker.
- Warrior rune craft connects body, weapon, armor, and items.
- Mage uses five disciplined color channels.
- Priest White is devotional; Mage White is technical/pure light.
- Sharpshooter pets are physical bonded companions, not summons.
- Blue Conjurer forms are shaped/bound magic, not pets.
- Asura power has visible cost and backlash.
- Slayer identity depends on positioning and execution.
- Race never forces a class or assigns morality.
- Preserve African-influenced visual direction without reducing it to generic pattern decoration.
- Realm mechanics must change gameplay.
- Exploration is real time; combat is animated turn based with initiative.
- Confirmed actions resolve as real-time 3D animation on the same world map.
- Timed reactions add bonuses and class expression without replacing stats or tactical decisions.
- Reaction timing must have accessibility automation and wider-window options.
- Keep the classic isometric low-poly 3D visual direction.
- Do not copy exact Death Gate names, runes, factions, characters, or plot beats into shipping content.

## Locked Product Decisions

- Visual presentation: classic isometric real-time low-poly 3D.
- World structure: square-tile-authored maps rendered in 3D.
- Exploration: free movement in real time.
- Combat: initiative-based animated turns on the same map.
- Action presentation: complete real-time movement, attack, spell, impact, and reaction animations.
- Player involvement: optional timed block, dodge, counter, aim, ward, command, and stabilization inputs.
- Accessibility: reaction timing can be widened, automated, or reduced to no timing bonus.
- Lore and content: preserve the established realms, races, classes, subclasses, gear, Soul Essence, soul memory, rebirth, and collision story.

## Open Decisions Requiring Lord Xar

1. Are Summoner, Asura, and Slayer starting classes or advanced paths?
2. Is Halfling included at launch or after Human/Elf/Dwarf?
3. What are the original shipping names for the four realm traditions and the two major rune/shaping ancestry traditions?
4. What is the first realm: Arianus-Sky is the current safest default.
5. What is the single repeated player action that defines the game: current recommendation is `inspect realm law -> manipulate tile -> create a party opening`.
6. Is the story linear, branching by realm order, or hub-based with player-selected breaches?
7. Is permadeath excluded, optional, or transformed into Soul Fracture and memory loss?
8. What exact triangle, texture, lighting, and draw-call budgets should the final real-time low-poly 3D pipeline use? The visual direction itself is locked to classic isometric low-poly 3D.
9. Should limited camera rotation be enabled, or should the elevated camera angle stay fixed?
10. How demanding should reaction timing become at the highest difficulty?

## Current Operational Status

Lord Xar has directly authorized this design-document update and its tile-based, classic isometric low-poly 3D, animated-turn-based direction. This file is approved as build and design input for the parallel SoulDrifter version. Publishing, production deployment, paid asset-generation spending, and overwriting the separate third-person project remain distinct decisions requiring explicit owner authorization.
