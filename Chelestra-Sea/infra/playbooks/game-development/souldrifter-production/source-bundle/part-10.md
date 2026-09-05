trine;
- mortal vs rune-magic limits;
- ancestry constraints;
- PvP/readability requirements;
- animation budget;
- VFX budget;
- current content tier.

Classification: `ORIGINAL_PROPOSAL`.

It remains a proposal until owner approval.

---

## Required skill research record

Every proposed or revised skill gets:

```json
{
  "skillId": "slayer-feinting-cut",
  "classification": "ORIGINAL_PROPOSAL",
  "currentCanonSearch": "completed",
  "lifepaperSearch": "completed",
  "deathGateSourceSearch": "completed",
  "sourceNotes": [],
  "reasonExistingSourcesWereInsufficient": "",
  "class": "slayer",
  "levelBand": "1-9",
  "weaponFamily": "dagger",
  "animationRequired": true,
  "vfxRequired": true,
  "ownerApproval": "pending"
}
```

No research record = no new skill production.

---

# Skill tier discipline

A source-inspired technique still has to fit the player's current power.

## Levels 1–9
- mortal movement
- martial technique
- direct small magic
- simple shaping
- restrained necromancy where class-appropriate
- low-particle effects
- readable one-stage actions

Do not import a dramatic high-level book event into Level 1 because it looks exciting.

## Levels 10–19
- specialization identity
- stronger school-specific magic
- more complex tactical sequences

## Levels 20+
- rune awakening where permitted
- higher magical complexity

---

# Class example: Slayer

## Preserved source identity
**Backstab** — preserved from recovered Lifepaper material.

## Current canonical Level-1 pair
- Backstab
- Shadowstep

## Third starter action
Current proposal:
**Feinting Cut**

Classification:
`ORIGINAL_PROPOSAL`

Reason:
- no second preserved Lifepaper Slayer attack suitable for the starter slot has been found;
- poison/venom belongs later in Slayer progression;
- Feinting Cut strengthens the existing flank/opening identity using mortal dagger technique.

The research gate remains active: if a stronger source-supported mortal technique is found in
approved Death Gate research, compare it against Feinting Cut before owner lock.

---

# Summoner example

Current code:
**Call Lesser Wisp**

Owner-directed pipeline replacement:
**Conjure Lesser Driftling**

Status:
`OWNER_DIRECTION_PENDING_CODE_MIGRATION`

Driftling family:
- Lesser Driftling — starter
- Minor Driftling — later
- Major Driftling — later

The Driftling is a magical shaped creature, not a natural beast, elemental, or undead summon.
That keeps advanced Summoner specializations open for:
- Elemental Summoning
- Necromantic Summoning
- Beast Summoning

Future agents must not accidentally classify the Lesser Driftling as a Beast Summoner creature.

---

# Research behavior for all LLMs

M3, Claude, and ChatGPT/Codex all follow the same gate.

An agent may specialize:
- one agent searches current code/canon;
- one searches recovered historical material;
- one performs Death Gate source research;
- one proposes/adjudicates the final gameplay adaptation.

But the final result is written into **one shared skill research record** in the repository.

No model's chat memory is authoritative.
The repository record is authoritative.
```

---

## `source/docs/17_REACTIVE_COMBAT_CHAIN_SYSTEM.md`

SHA-256: `5bc6e0ca102a82ac977d72c13fb67878699cb415e56ee5b20f4cfd16ac580773`

```markdown
# 17 — Reactive Combat / Chaining System

## Goal

SoulDrifter combat must not become:
`press every skill whenever it lights up`.

Each starting class has three active starter abilities.
At least **two of the three must have a meaningful relationship**:

`SETUP / REACTION -> OPENING STATE -> PAYOFF`

The relationship can be:
- one action creating positional advantage;
- a successful block enabling a counter;
- a mark enabling a follow-up;
- a ward storing energy for the next attack;
- a bind enabling a summon attack;
- a feint turning/exposing a target;
- a class resource threshold changing the payoff.

The system should reward timing, enemy reading, positioning, and reaction.

---

## Universal rules

### 1. Every class has a starter combat loop

Each class defines:
- Basic weapon action
- Starter Skill A
- Starter Skill B
- Starter Skill C
- Class resource
- At least one chain relationship
- At least one defensive/repositioning answer
- Individual cooldowns
- Animation/recovery locks

### 2. Chains are opportunities, not mandatory scripts

Do not force one exact rotation.

A player can use skills independently when sensible, but smart chaining is better.

### 3. Openings have short windows

Typical Level-1 opening window:
**2.0–4.0 seconds**.

Exact values are balance parameters.

### 4. Enemy type matters

Standard enemies:
- can turn;
- become off-balance;
- be confused/feinted;
- be staggered;
- expose backs/flanks.

Elites:
- reduced duration/chance.

Bosses:
- cannot be permanently turned or trivialized;
- may expose a vulnerability through telegraph/counter mechanics instead.

### 5. Random effects need a deterministic fallback

If a skill has a chance to produce a dramatic opening, failure should not make the button worthless.

Example:
**Feinting Cut**
- always applies a short `Feinted` or `OffBalance` condition;
- proposed 30% chance against ordinary enemies to make them turn/misdirect, physically exposing the back;
- bosses resist forced turning;
- Backstab gains its full positional payoff when the back is actually exposed.

The 30% value is a starting tuning target, not production-locked balance.

---

# Starter class chain directions

These are a mixture of current canon relationships and proposed mechanics.
Any new third skill name remains subject to the source-grounded skill rulebook.

## Warrior

Current:
- Cleaving Strike
- Anchor Guard

Proposed third:
- **Driving Bash** — working name / source research required

Suggested chain:
`Driving Bash -> Off Balance -> Cleaving Strike`

Alternative reactive chain:
`successful Anchor Guard -> Counter Opening -> Cleaving Strike`

The final design may support both.

The Warrior should feel like:
**create imbalance -> hit the opening hard**.

## Mage

Current:
- Cinder Bolt
- Blue Ward

Suggested chain:
`Blue Ward successfully absorbs an attack -> Stored Channel -> next Cinder Bolt is empowered`

Possible effects:
- reduced cast time;
- small damage bonus;
- increased stagger;
- small secondary burst.

Do not make the starter Mage dependent on high-tier rune or probability systems.

Third active:
`TBD through source-grounded class pass`.

## Priest

Current:
- Consecrated Dart
- Mending Ward

Suggested chain:
`Mending Ward successfully absorbs/heals meaningful damage -> Benediction window -> Consecrated Dart gains a small enhanced effect`

Possible enhanced effect:
- stronger anti-dark impact;
- tiny ally pulse;
- increased stagger against corrupted target.

Third active:
`TBD through source-grounded class pass`.

## Sharpshooter

Current:
- Twin Shot
- Evasive Mark

Suggested chain:
`Evasive Mark -> Marked Target -> Twin Shot receives precision/payoff bonus`

The class should reward:
**reposition -> establish line -> punish opening**.

Third active:
`TBD through source-grounded class pass`.

## Paladin

Current:
- Oath Hammer
- Hold the Breach

Suggested chain:
`successful Hold the Breach -> Oathful Counter -> Oath Hammer gains stronger stagger/stun`

This makes blocking an active decision rather than passive mitigation.

Third active:
`TBD through source-grounded class pass`.

## Summoner

Owner direction:
- **Conjure Lesser Driftling**
- Binding Circle

Recommended third:
- **Driftling Command attack**, exact name/source pass TBD

Suggested chain:
`Binding Circle -> Bound/Slowed Target -> Driftling command attack receives leap/pounce or bonus impact`

The Summoner is not simply casting direct-damage spells.
The player creates conditions for the magical creature to exploit.

Driftling progression:
- Lesser Driftling
- Minor Driftling
- Major Driftling

Do not classify the Driftling as Beast Summoning.

## Asura

Current:
- Mind Prick
- Black Thread

Suggested chain:
`Black Thread -> Threaded Target -> Mind Prick exploits the thread`

Possible payoff:
- increased mental stagger;
- short interrupt;
- increased instability pressure.

Third active:
`TBD through source-grounded class pass`.

## Slayer

Current:
- Backstab
- Shadowstep

Current proposed third:
- **Feinting Cut**

Owner-directed reactive mechanic:

`Feinting Cut -> Feinted / confused / turned target -> Backstab`

Proposed first tuning:
- always applies a short minor opening to ordinary targets;
- approximately **30% chance** to cause an ordinary enemy to turn/misdirect and expose their back;
- elites have reduced susceptibility;
- bosses resist forced turning;
- actual exposed back enables the strongest Backstab payoff.

Shadowstep provides the other way to create positional advantage.

So Slayer has multiple routes:
- Feint successfully -> Backstab
- Shadowstep behind target -> Backstab
- naturally catch enemy facing another direction -> Backstab

## Shadowknight

Current:
- Siphon Cleave
- Cinder Guard

Suggested chain:
`Cinder Guard absorbs meaningful hit -> Banked Ember / Gravefire -> Siphon Cleave gains enhanced drain or pressure`

This makes the Shadowknight deliberately take/guard pressure and answer with life-drain.

Third active:
`TBD through source-grounded class pass`.

---

# Reaction-state vocabulary

Starter state candidates:
- `OffBalance`
- `Exposed`
- `Feinted`
- `Marked`
- `Bound`
- `StoredChannel`
- `Benediction`
- `CounterOpening`
- `Threaded`
- `BankedEmber`

Each state must define:
- source skill;
- duration;
- valid targets;
- boss/elite resistance;
- consuming skills;
- whether it stacks;
- multiplayer replication;
- visual indicator;
- animation reaction if any.

Do not invent hidden one-off booleans per skill.

---

# Animation implications

Reactive combat requires animation support.

For each chain prove:
1. setup animation;
2. target reaction;
3. opening is visually readable;
4. follow-up animation;
5. contact marker;
6. payoff reaction;
7. clean recovery.

Example Slayer:
Feinting Cut cannot merely set `enemy.exposed = true`.
The target must visibly misread/recoil/turn enough that the player can see the opportunity.

---

# Verification

A starter class fails combat QA if:
- three abilities are unrelated buttons;
- optimal play is cooldown-spam;
- no visual opening exists;
- reaction state is invisible;
- chain window cannot reasonably be executed;
- bosses can be permanently stun/turn locked;
- cooldown/resource UI gives no feedback;
- damage occurs before the animation contact marker.
```

---

## `source/docs/18_CLASS_RESOURCES_AND_COOLDOWNS.md`

SHA-256: `df97574b7b9b801961d3cbb202da86b6a837de7b4694c4bb64d439484ee199ef`

```markdown
# 18 — Class Resources, Cooldowns, and Anti-Spam Rules

## Current prototype

The current browser slice already has:
- a free basic Weapon Strike;
- universal Stability;
- a generic numeric class-resource meter displayed using the calling's resource name;
- hardcoded cooldown/recovery timers for basic/signature/defense.

This is a useful prototype, but production needs **class-specific resource rules**.

---

# Universal combat resources

## Health
Normal vitality/HP.

## Stability
Universal combat composure / poise / channel endurance.

Stability may be spent or damaged by:
- guarding;
- powerful techniques;
- interruption;
- heavy enemy attacks;
- certain spells.

Low Stability increases vulnerability to:
- stagger;
- interrupt;
- guard break.

Stability is **not** a replacement for each class's unique resource.

---

# Current class resource identities

These already exist in the current class registry:

| Class | Resource |
| --- | --- |
| Warrior | Fury |
| Mage | Channel |
| Priest | Devotion |
| Sharpshooter | Focus |
| Paladin | Oath |
| Summoner | Command |
| Asura | Instability |
| Slayer | Edge |
| Shadowknight | Gravefire |

Do not silently rename them to generic Mana/Rage without owner approval.

Mage **Channel** is the current mana-like magical resource conce