th hundreds of standalone clips.

Use:
- aim offsets
- look-at IK
- hand IK / weapon grip
- foot IK / terrain adaptation
- additive hit reactions
- additive recoil
- additive casting hand layers
- upper-body masks
- directional procedural impulses
- physics/ragdoll only for approved heavy/death states

Example:
Instead of 100 bespoke “hit by every spell” clips:
- 12 base directional/intensity reactions
- elemental overlay layer
- impulse magnitude
- VFX/SFX contact family

## 17. Network determinism / online requirement

For an online RPG:
- gameplay effect is authoritative
- animation uses stable action IDs
- contact/release marker is deterministic
- remote clients receive action + timing/seed/state
- cosmetic variation never changes hit timing
- death/loot terminal state cannot diverge between clients
- NPC talk/emote state should be replicable where multiplayer-visible

## First Breach recommended NOW set

Prioritize:
- core locomotion
- weapon family actions used by Level 1
- all 18 current class core actions
- approved active ancestry actions
- hit ladder
- 2–3 deaths
- doors/chests/lever/pickup/loot
- swimming/drowning if Heartvale transition uses water
- named NPC dialogue heads
- first-level monster complete families
- Warden boss full action family
- class spell VFX
- impact feedback / hit stop / camera shake
```

---

## `source/docs/13_HIT_REACTION_ARCHITECTURE.md`

SHA-256: `8bb663612753e1589a1223547759054baf467095dd83169d5359b07acdeba86d`

```markdown
# 13 — Hit Reaction Architecture

## Goal

Make every hit feel physical without creating an impossible number of bespoke animation clips.

## Input dimensions

Reaction resolver considers:
- attack direction relative to target
- damage / max-HP ratio
- stagger/poise damage
- physical vs projectile vs magical
- critical flag
- blocking state
- target mass / boss rules
- current action interruptibility

## Base clip grid

Create a reusable 3 × 4 matrix:

### Intensities
- light
- medium
- heavy

### Directions
- front
- back
- left
- right

Total baseline = 12 reaction clips per compatible humanoid skeleton family.

Then layer:
- small/large procedural impulse
- elemental VFX
- camera/hit-stop strength
- optional additive upper-body recoil
- special knockdown only when threshold crossed

## Extra clips
- block react
- parry react
- interrupted cast
- knockdown forward/backward
- get-up
- airborne launch if used

## Monster policy

Small/simple monsters may use fewer directional clips:
- light recoil
- heavy recoil
- stagger
- knockback
- 2–3 deaths

Important monsters/bosses get more.

## Death resolver

Death variant may consider:
- fatal direction
- fatal damage magnitude
- spell/physical
- airborne/fall
- drowning
- boss-specific terminal state

## Shared marker rule

Animation, gameplay damage, VFX, SFX, hit stop and reaction all bind to the same action contract marker.
```

---

## `source/docs/14_VFX_PARTICLE_MATRIX.md`

SHA-256: `d953798c0e84ea4fb3364ce01ef6a3ebbb501d32990ac92ff6b062c36b59e132`

```markdown
# 14 — VFX / Particle Matrix

## Every active ability needs a VFX contract

Fields:
- ability/action ID
- class or ancestry owner
- cast_start
- cast_loop
- release
- projectile/trail
- impact
- target status
- ground decal
- duration
- color language
- sockets
- light usage
- particle budget
- mobile fallback
- hit-reaction family
- SFX marker
- gameplay marker

## Class visual languages

Use current code colors and lore as starting evidence, then art-direct:
- Warrior — mostly physical/steel/dust
- Mage — formula/color magic, Cinder Bolt / Blue Ward need distinct color identities
- Priest — warm gold/white/pale blue
- Sharpshooter — restrained trails/marks
- Paladin — oath/thunder/protection
- Summoner — binding/summon geometry
- Asura — black-thread / curse language
- Slayer — quick execution/poison/stealth language
- Shadowknight — gravefire/cinder/life-drain

## Ancestry VFX

Passive ancestry identity should be subtle.
Do not cover characters in permanent glowing racial effects.

Use contextual cues:
- Ghost Step → phase trail
- Forgeheart → contained ember/heat response
- Deep Anchor → ground/brace cue
- Overlooked Route → perception highlight
- Small Defiance → brief resolve pulse
only if mechanics are promoted to active/proc actions.

## VFX tiers

### Player readable
Must show:
- anticipation
- release/contact
- impact
- lingering status if relevant

### PvP / online
Enemy-readable telegraph cannot be obscured by cosmetics.

### Mobile
Provide reduced-particle fallback preserving telegraph and impact.

## Performance
Prefer:
- instancing
- pooled particles
- texture atlases
- bounded lights
- deterministic lifetimes
- no unbounded emitter creation
```

---

## `source/docs/15_RUNTIME_ANIMATION_SYSTEM_REQUIREMENTS.md`

SHA-256: `75d15a220c78ea4dd05a73ed079cf7cda0587001c0ad8176f2224b20cfd2e85b`

```markdown
# 15 — Runtime Animation System Requirements

## Animation state machine

Required layers:
1. locomotion base
2. upper-body weapon/cast layer where appropriate
3. additive reaction layer
4. facial/head layer
5. equipment socket state
6. procedural IK / aim / look layer

## Required transitions
- exploration idle ↔ locomotion
- locomotion ↔ combat idle
- combat idle ↔ attack
- attack ↔ recovery
- cast ↔ recovery
- weapon drawn ↔ sheathed
- armed → sheath → interaction
- hit reaction interrupt rules
- knockdown → get-up
- death → terminal
- swim / climb traversal modes

## Socket events
Named markers should drive:
- draw weapon transfer
- sheath weapon transfer
- projectile spawn
- hit window start/end
- VFX start
- SFX
- footstep
- interaction prop attach/detach

## Online
Action contract should be serialized/replicated by stable ID, phase/timing and target context.
Visual-only variation must not change authoritative contact time.

## Validation
For every registered active action:
- action data exists
- animation exists
- clip compatible
- markers valid
- transition graph has entry/exit
- runtime load succeeds
- normal-speed proof exists
```

---

## `source/docs/16_SKILL_SOURCE_AND_LORE_PRECEDENCE_RULEBOOK.md`

SHA-256: `b6a46608056c3a1ebac9ec96ef602798e7e64b07c638450e68f14c45dbc5f31f`

```markdown
# 16 — Skill Source & Lore Precedence Rulebook

## Purpose

Prevent M3, Claude, ChatGPT/Codex, or any future agent from casually inventing a class skill
when SoulDrifter already has an older design, a current canonical action, or useful source
inspiration in the Death Gate Cycle material.

This gate runs **before** new skill naming, animation production, VFX production, balance work,
or paid asset work.

## CURRENT-PHASE SOURCE SCOPE — HARD LIMIT

For the current First Breach / Heartvale / Level 1–9 production pass, agents must stay inside **mortal / low-tier gameplay**.

### Allowed inspiration right now
- ordinary weapon fighting;
- stance, footwork, feints, guards, counters, dodges, pursuit, retreat;
- simple ranged combat;
- practical mortal spellcasting;
- low-tier healing, wards, bindings, shaping, summoning, and necromancy only where already class-appropriate;
- climbing, swimming, doors, levers, containers, traversal, survival;
- mundane or low-magical creature attack/defense behavior;
- grounded environmental tactics such as cover, spacing, choke points, flanking, elevation, and escape.

### Explicitly DEFERRED for later game phases
Do **not** use these to design current starter skills, even if the source material contains them:
- Sartan high magic;
- Patryn high magic;
- Aether-Scribed / Flesh-Forged rune combat;
- probability / possibility manipulation;
- Labyrinth-specific combat systems;
- high-tier Nexus/Seventh Gate mechanics;
- ancient-power boss abilities;
- late-game dragon/serpent-scale magic;
- realm-breaking or reality-altering effects;
- advanced boss-only defenses or magical systems.

These may be indexed in a future-research note, but they must not leak into Level 1–9 skills, animations, VFX, equipment, or encounters.

### Research behavior for current skill gaps

When searching Death Gate source inspiration for a current low-level skill, focus on **general physical or low-magical behavior**:
- how someone moves in a fight;
- how they attack with a weapon;
- how they evade, guard, retreat, pursue, or use terrain;
- simple magical projection/warding/healing/binding ideas that can be reduced to mortal scale;
- how ordinary or magical creatures bite, claw, charge, leap, recoil, flee, or defend.

If a useful source example depends on advanced Sartan/Patryn/Labyrinth mechanics, discard it for the current phase rather than “scaling it down” unless the owner explicitly approves that adaptation.

---

## Source precedence

For every new or missing combat / movement / magic / summon / interaction ability, search in this order.

### 1. CURRENT SOULDRIFTER RUNTIME + LOCKED CANON

Check first:
- `src/game/character.ts`
- `src/game/tutorialChoices.ts`
- active ability/action registries
- `CLASS_PROGRESSION_CODEX.md`
- `CHARACTER_AND_STORY_SYSTEM.md`
- `STARTER_PERK_VETTING_MATRIX.md`
- `GAME_BIBLE.md`
- current owner-approved GitHub issues/comments

If an ability already exists here, **do not replace it merely because another idea seems cooler**.
Improve its animation/VFX/mechanics while preserving its identity unless the owner explicitly changes it.

Classification: `CURRENT_CANON`.

---

### 2. RECOVERED BOOK-OF-LIFE / LIFEPAPER / HISTORICAL GAME MATERIAL

Search recovered project material such as:
- historical SoulDrifters data
- recovered Lifepaper/class documents
- old race/class/perk files
- preserved class-skill tables
- legacy realm-drop / profession systems

Example already confirmed:
- Slayer's preserved defining skill = **Backstab**
- older class identities include Berserker, Meteor Swarm, Holy Arrow, Multishot,
  Summon Minion, Thor's Hammer, Mindburn, Backstab

These old names/mechanics are not automatically level-one balanced.
Preserve their identity and decide whether they belong at:
- starter
- later foundation
- specialization
- item-granted ability
- realm reward
- high-level progression

Classification: `PRESERVED_LIFEPAPER`.

---

### 3. DEATH GATE CYCLE SOURCE-INSPIRATION PASS

If current/recovered SoulDrifter material does not supply the needed action, search the project's
Death Gate source-reference material and any legally supplied book notes/text for high-level
combat and magical inspiration.

For the **current low-level pass**, look only for source-supported ideas that can remain mortal/grounded:

- weapon mechanics, footwork, feints, guards, counters, positioning, retreat, pursuit, and terrain use;
- mensch martial techniques and improvised survival behavior;
- dwarven, elven, human, and other cultural fighting behavior where source-supported;
- creature attack patterns, pursuit behavior, defenses, recoil, flight/flee behavior, and weaknesses;
- simple, low-tier magical projection, healing, warding, binding, concealment, or disruption only when compatible with current class canon;
- physical interactions between magic and weapons that do not require Sartan/Patryn/rune/Labyrinth systems.

Do not mine advanced Sartan, Patryn, Labyrinth, Nexus, rune, probability, or ancient-power combat for current starter actions.

### Copyright / adaptation boundary

Agents may:
- summarize;
- extract high-level mechanics;
- identify themes;
- adapt a combat principle into original SoulDrifter terminology and mechanics.

Agents must not:
- reproduce long book passages;
- copy a protected fight scene beat-for-beat;
- simply transplant a named copyrighted ability/character-specific sequence;
- claim an original SoulDrifter adaptation is official Death Gate canon.

Classification: `DEATH_GATE_ADAPTED`.

The source note should say what concept inspired it without copying protected prose.

---

### 4. ORIGINAL SOULDRIFTER DESIGN

Only after steps 1–3 fail to supply a suitable skill should the agent create a new one.

The proposal must fit:
- class identity;
- level band;
- weapon doc