pt.

---

# Proposed Level-1 resource behavior

These are system-design starting points and require gameplay tuning.

## Warrior — Fury

Build:
- basic weapon contact;
- taking a meaningful hit;
- successful guard/counter;
- creating stagger.

Spend:
- enhanced bash/cleave/counter effects.

Behavior:
- starts low;
- builds through engagement;
- slowly decays outside combat.

## Mage — Channel

Build/recover:
- passive regeneration;
- Recover/rest;
- basic staff/focus action where appropriate.

Spend:
- spell actions.

Behavior:
- traditional finite casting resource, but named **Channel**;
- should force spell choice without leaving Mage helpless;
- basic weapon action always remains available.

## Priest — Devotion

Build:
- meaningful heal/ward success;
- protecting allies/self;
- certain basic spiritual actions.

Spend:
- stronger healing/warding/offensive holy effects.

Behavior:
- rewards actually fulfilling the Priest role.

## Sharpshooter — Focus

Build:
- maintaining line of sight;
- accurate hits;
- marking;
- controlled movement/brief aim windows.

Lose/reduce:
- heavy interruption;
- reckless movement where applicable.

Spend:
- precision follow-ups / advanced shots.

## Paladin — Oath

Build:
- guarding;
- protecting;
- taking pressure meant for allies;
- successful oath actions.

Spend:
- stronger Oath Hammer / protection / stun effects.

## Summoner — Command

Build:
- Lesser Driftling successful actions;
- binding targets;
- maintaining summon coherence.

Spend:
- direct summon commands;
- enhanced creature actions;
- reposition / defensive commands.

Do not make the summon useless when Command is empty.
It retains a basic autonomous behavior.

## Asura — Instability

**Instability is a danger meter, not normal mana.**

Actions increase Instability.

Higher Instability can:
- strengthen some effects;
- increase backlash risk;
- make control harder.

The player manages the threshold rather than simply filling/spending a conventional bar.

Starter implementation must stay readable and not become random punishment.

## Slayer — Edge

Build:
- attacking flank/back;
- successful Feinting Cut opening;
- successful Shadowstep reposition;
- avoiding an attack at close timing;
- exploiting exposed targets.

Spend:
- stronger execution/payoff effects.

The resource rewards intelligent positioning.

## Shadowknight — Gravefire

Build:
- life drain;
- surviving guarded impacts;
- certain successful melee pressure.

Spend:
- defensive reinforcement;
- empowered drain;
- later gravefire abilities.

---

# Cooldown philosophy

SoulDrifter is an action RPG.

Do **not** use one giant MMO global cooldown.

Use:
1. animation/action recovery;
2. individual skill cooldowns;
3. resource costs/requirements;
4. chain/opening windows;
5. enemy reactions/telegraphs.

## Basic attack
Basic attacks should generally be governed by:
- weapon-family animation duration;
- recovery;
- combo timing.

The current prototype uses **720 ms** for Weapon Strike.
Treat that as prototype evidence, not a universal permanent value.

## Starter ability cooldown targets

Initial tuning ranges:

| Ability type | Typical Level-1 cooldown |
| --- | ---: |
| frequent simple attack | 2–4 s |
| setup/opener | 4–7 s |
| payoff/signature | 4–8 s |
| mobility/escape | 6–10 s |
| strong defense | 7–12 s |
| summon/re-summon | 15–30 s |
| major utility/control | 8–15 s |

Exact values are per-skill and must be playtested.

## Starter-class first tuning draft

Not final balance:

| Class | Current action | Initial CD direction |
| --- | --- | ---: |
| Warrior | Cleaving Strike | ~5 s |
| Warrior | Anchor Guard | ~8 s |
| Warrior | Driving Bash proposal | ~6 s |
| Mage | Cinder Bolt | ~3 s |
| Mage | Blue Ward | ~9–10 s |
| Priest | Consecrated Dart | ~3–4 s |
| Priest | Mending Ward | ~9 s |
| Sharpshooter | Twin Shot | ~4 s |
| Sharpshooter | Evasive Mark | ~8 s |
| Paladin | Oath Hammer | ~6 s |
| Paladin | Hold the Breach | ~9–10 s |
| Summoner | Conjure Lesser Driftling | ~20 s / death-resummon logic |
| Summoner | Binding Circle | ~9 s |
| Summoner | Driftling command proposal | ~5–7 s |
| Asura | Mind Prick | ~4 s |
| Asura | Black Thread | ~8 s |
| Slayer | Backstab | ~6 s |
| Slayer | Shadowstep | ~8 s |
| Slayer | Feinting Cut proposal | ~5 s |
| Shadowknight | Siphon Cleave | ~5 s |
| Shadowknight | Cinder Guard | ~9 s |

Numbers are **BALANCE_DRAFT**, never canon merely because they appear here.

---

# Anti-spam requirements

A skill cannot be spammed simply because:
- resource remains;
- animation is short;
- the player clicks quickly.

Every active skill needs:
- `cooldownMs`
- `resourceCost` / `resourceDelta`
- `stabilityCost` if used
- `windupMs`
- `contactOrReleaseMarker`
- `recoveryMs`
- `cancelWindow`
- `chainTags`
- `openingConsumed`
- `targetRestrictions`

---

# UI requirements

For every skill:
- radial cooldown wipe or equivalent;
- numeric cooldown optional for short CDs;
- unavailable tint;
- resource-cost feedback;
- insufficient-resource state;
- chain-ready highlight;
- opening-state indicator on target;
- class resource bar with correct name.

The player should immediately understand:
**what is ready, what is blocked, what can chain, and why.**

---

# Multiplayer / authoritative requirement

Server-authoritative production combat must own:
- cooldown ready times;
- class resource;
- Stability;
- opening states;
- RNG/seed for chance-based effects;
- contact result;
- target facing/turn state;
- damage;
- death.

Animation and client UI predict/present the action but cannot independently mint:
- resources;
- cooldown resets;
- successful Feints;
- Backstab openings.

For a 30% Feint turn, use authoritative seeded resolution so clients agree.
```

---

## `source/docs/19_SUMMONER_PET_COMMAND_AND_AUTOCAST_SYSTEM.md`

SHA-256: `d3f7ebcc7ab1830da5d1c5960937afe64f88ba16e004b483c961b089eea657a7`

```markdown
# 19 — Summoner Pet Command / Autocast System

## Goal

The Summoner controls an active magical companion through a **separate pet combat bar**.

Starter summon:
**Lesser Driftling**

Progression:
- Lesser Driftling
- Minor Driftling
- Major Driftling

The Driftling is magical shaping and is not Beast, Elemental, or Necromantic specialization.

## Separate pet bar

When a summon is active, show:
- Attack / Assist
- Follow
- Stay / Hold
- Recall
- Passive
- Defensive
- Aggressive (optional)
- pet abilities
- pet HP/resource
- per-ability autocast indicators

The player's normal class bar remains separate.

## Manual vs autocast

Manual click/tap:
- immediately requests that pet ability;
- obeys cooldown/resource/range/status rules.

Autocast:
- may be enabled per eligible pet ability;
- obeys the exact same action contract;
- never bypasses cooldown/resource/status/target rules.

For touch/mobile, expose a visible AUTO toggle or long-press menu rather than relying on right-click.

## Pet resource

Recommended Lesser Driftling resource:
**Mana**

Rules:
- basic attack costs 0 Mana;
- magical pet abilities consume Mana;
- Mana regenerates;
- pet Mana is separate from Summoner `Command`;
- dismiss/resummon cannot freely refill Mana or erase cooldowns.

## Summoner resource

Summoner keeps:
**Command**

Command represents directing/binding/empowering the summon.

Two coordinated resources:
- Summoner Command
- Driftling Mana

## Reactive owner → pet chains

Example:
`Binding Circle -> Bound -> Driftling conditional payoff attack`

Conditional pet abilities may require:
- Bound
- Marked
- OffBalance
- minimum Command
- minimum Mana
- owner recently cast a named action
- owner/pet range condition
- target is casting
- target is attacking owner

## Autocast AI

Each autocast ability defines:
- priority;
- minimum resource reserve;
- target rule;
- required target state;
- emergency threshold;
- whether it may consume a setup state;
- whether it may interrupt a current action.

A player can disable autocast on valuable payoff skills to save them for manual timing.

## Command modes

### Passive
Never initiates attacks without explicit commands.

### Defensive
Responds to threats to owner/pet.

### Aggressive
May seek valid nearby enemies.

### Follow
Maintains owner proximity.

### Stay
Holds position and uses only locally valid actions.

## Animation requirements

Lesser Driftling:
- summon materialization
- dismiss/dissolve
- idle
- locomotion
- combat idle
- basic attack
- magical attack
- conditional payoff
- hit light
- hit heavy
- stagger
- death 1
- death 2
- recall/return if needed

## Dual combat-mode behavior

The pet system uses the same ability contracts in both modes.

### Real-time — DEFAULT
- pet AI/autocast runs continuously;
- cooldowns tick continuously;
- enemies continue attacking;
- pet reacts according to command mode and autocast rules.

### Turn-based — OPTIONAL
- planning pauses combat;
- player may issue owner and pet commands deliberately;
- pet autocast is evaluated by the turn scheduler when its action opportunity arrives;
- the same cooldown/resource/status rules still apply;
- manual commands always override normal autocast priority when valid.

The pet must not have separate balance tables for each combat mode.
```

---

## `source/docs/20_DUAL_COMBAT_MODE_ARCHITECTURE.md`

SHA-256: `2c51b924f94f563e57095677dd5de3c63a9938273b881d974087c0fac4162df8`

```markdown
# 20 — Dual Combat Mode Architecture

## Locked product rule

SoulDrifter supports two combat modes:

1. **Real-time — DEFAULT**
2. **Turn-based — OPTIONAL**

The default experience is real-time action combat.

Turn-based exists for players who prefer slower, deliberate tactical play.

## Critical architecture rule

Do **not** build two separate combat games.

Build one authoritative combat simulation containing:
- skills;
- animation contracts;
- cooldowns;
- class resources;
- Stability;
- status effects;
- setup/opening/payoff chains;
- pet abilities;
- hit resolution;
- enemy AI actions;
- damage/healing;
- death/loot.

Then place two schedulers over the same simulation.

---

# Real-time mode — DEFAULT

Time advances continuously.

Rules:
- enemies keep moving/pursuing/attacking;
- player cannot pause to wait for a turn;
- cooldowns tick continuously;
- class resources regenerate/build/decay according to their rules;
- opening windows expire in real combat time;
- pet autocast evaluates continuously;
- reaction/animation locks matter;
- positioning happens continuously.

The player succeeds through:
- timing;
- movement;
- target reading;
- cooldown judgment;
- reactive chains;
- resource management.

This is the primary balancing and presentation target.

---

# Turn-based mode — OPTIONAL

Planning pauses the combat scheduler while the player chooses.

After an action is committed:
- its windup/action/recovery resolves;
- simulation combat time advances;
- cooldown clocks advance by simulation time;
- statuses/opening windows advance;
- enemy/pet scheduled actions resolve according to the same timeline;
- control returns to the player at the next valid decision point.

This avoids inventing:
- separate "3-turn cooldowns";
- separate damage values;
- different skill costs;
- different class resources.

A 5-second cooldown remains a 5-second combat cooldown.
Turn-based mode advances the same combat clock in discrete action slices instead of wall-clock time.

---

# Why this matters

The same Slayer chain should work in both modes:

`Feinting Cut -> Feinted/Exposed -> Backstab`

Real-time:
- player sees opening;
- must react before it expires.

Turn-based:
- opening remains represented on the combat timeline;
- player gets the deliberate decision window;
- committing Backstab advances time and consumes the opening normally.

Same skill. Same rules. Different pacing.

---

# Enemy AI

## Real-time
AI evaluates continuously/pulsed:
- pursue;
- attack;
- telegraph;
- reposition;
- defend;
- use abilities.

## Turn-based
The same AI decision policy runs when the enemy receives a scheduled action opportunit