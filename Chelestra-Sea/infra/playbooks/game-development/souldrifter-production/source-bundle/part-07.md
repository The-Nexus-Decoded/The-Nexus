ng_attack
- sword1h_block
- sword1h_parry
- sword1h_hit_confirm_pose

### One-handed axe / mace (if distinct)
- axe1h_idle
- axe1h_draw
- axe1h_sheath
- axe1h_light_1
- axe1h_light_2
- axe1h_heavy
- axe1h_overhead
- axe1h_block

### Staff
- staff_idle
- staff_draw
- staff_sheath
- staff_melee_1
- staff_melee_2
- staff_cast_base
- staff_channel_base
- staff_guard

### Bow / ranged
- bow_idle
- bow_draw_weapon
- bow_nock
- bow_aim
- bow_release
- bow_quickshot
- bow_power_shot
- bow_cancel
- bow_move_aim (optional later)

### Shield / off-hand
- shield_idle
- shield_block
- shield_block_heavy
- shield_bash
- shield_raise
- shield_lower

## D. Class-specific starter skill animations

Each class should launch with:
- base attack family from weapon
- 3 unique starter abilities
- 1 class-specific idle/cast grammar

See `04_CLASS_STARTER_ABILITIES_AND_VFX.md`.

## E. Hit reaction system

### Light hit reactions
- hit_light_front
- hit_light_back
- hit_light_left
- hit_light_right

### Medium hit reactions
- hit_medium_front
- hit_medium_back
- hit_medium_left
- hit_medium_right

### Heavy hit reactions
- hit_heavy_front
- hit_heavy_back
- hit_heavy_left
- hit_heavy_right

### Special reactions
- stagger_short
- stagger_long
- knockback_small
- knockback_large
- knockdown_forward
- knockdown_backward
- block_react
- parry_react
- interrupted_cast_react
- burn_react
- shock_react
- poison_react
- freeze_react (later if used)

## F. Death system

### Shared death variants
- death_front_light
- death_back_light
- death_left
- death_right
- death_heavy_knockback
- death_spell_blast
- death_fall
- death_drown

### Monsters
Target minimum:
- 2–3 death variants per important monster family
- at least one heavy-impact death
- at least one spell / magical death
- at least one collapse / default death

## G. NPC-specific animations

### Ambient
- npc_idle_1
- npc_idle_2
- npc_idle_3
- npc_turn
- npc_point
- npc_wave
- npc_listen
- npc_think

### Dialogue body support
- npc_talk_small
- npc_talk_medium
- npc_talk_emphasis
- npc_nod
- npc_shake_head
- npc_greet
- npc_farewell

## H. Dialogue head portrait animations

See `07_NPC_DIALOGUE_HEADS.md`.

## I. Monster-specific action families

For each monster family, derive:
- idle
- patrol / walk
- run / chase
- basic attack 1
- basic attack 2
- special attack
- hit light
- hit heavy
- death 1
- death 2
- aggro / roar
- recover / reposition (if needed)
```

---

## `source/docs/03_TRIPO_COVERAGE_AND_CUSTOM_GAPS.md`

SHA-256: `e550409255129ecd5a127a30b9eb380f6552223396d284c39870ceaa8cb8e84f`

```markdown
# 03 — Tripo Coverage and Custom Gaps

## Goal

Separate the animation/VFX/interaction work into:
1. what Tripo can likely cover directly
2. what SoulDrifter must author as custom animation / runtime logic

## A. Use Tripo first for

### Common locomotion
- idle
- walk
- run
- turn
- jump
- climb
- swim
- fall
- hurt
- generic slash
- generic shoot
- generic cast
- basic emote / greeting / social

## B. Treat as probable custom work

### Interaction specifics
- different door styles
- chest/sarcophagus/crate-specific opens
- push/pull heavy objects
- placing keys or ritual items
- waystone interaction
- corpse looting with game-specific staging

### Combat specifics
- weapon draw / sheath
- combo attack chains
- shield bash
- weapon-specific heavy attacks
- class-specific cast grammar
- class-specific starter abilities
- interrupt / stagger ladders
- knockback strength variants
- different death causes

### Monster specifics
- signature monster attacks
- boss mechanics
- telegraphed slams
- bite / claw / leap / tail / spit variations

### Dialogue
- portrait-head talk loops
- phoneme-ready mouth movement if feasible
- nod / blink / listen loop set

## C. Animation ownership policy

### Tripo baseline lane
Generate a baseline motion set to bootstrap:
- locomotion
- generic combat
- generic cast
- hurt / death
- social basics

### Custom SoulDrifter lane
Author unique motions for:
- class identity
- combat identity
- interaction richness
- boss identity
- monster identity
- game-specific death richness
- portrait-head presentation

## D. Verification rule

A motion listed as “Tripo-covered” is still **not accepted automatically**.

It must pass:
- skeleton compatibility
- contact / foot planting
- weapon alignment
- hit timing markers
- runtime look
- camera readability
- gameplay use case
```

---

## `source/docs/04_CLASS_STARTER_ABILITIES_AND_VFX.md`

SHA-256: `0131f02bb8642a985655703015b98cc5f894c84f003927dc805ddc855c2c080d`

```markdown
# 04 — Starter Class Abilities / VFX — Current Canon + Proposal Boundary

Current code/canon defines two Level-1 proof actions per calling.
The owner wants three active starter abilities per class.

| Calling | Signature | Defense |
| --- | --- | --- |
| Warrior | Cleaving Strike | Anchor Guard |
| Mage | Cinder Bolt | Blue Ward |
| Priest | Consecrated Dart | Mending Ward |
| Sharpshooter | Twin Shot | Evasive Mark |
| Paladin | Oath Hammer | Hold the Breach |
| Summoner | current code: Call Lesser Wisp; owner replacement: **Conjure Lesser Driftling** | Binding Circle |
| Asura | Mind Prick | Black Thread |
| Slayer | Backstab | Shadowstep |
| Shadowknight | Siphon Cleave | Cinder Guard |

Third actions are not automatically canon.

- Slayer working proposal: **Feinting Cut**; no starter poison/venom.
  It creates an opening and may, at an initial ~30% tuning target against ordinary enemies,
  misdirect/turn them to expose Backstab. Elites resist; bosses cannot be repeatedly forced to turn.
- Summoner third active: Lesser Driftling command/payoff action; exact name/mechanics TBD.
- Warrior: a bash/setup concept is directionally useful but exact skill requires source-grounded design.
- Other classes: `TBD_OWNER_APPROVED`.

Every active ability needs animation, contact/release, VFX/SFX, reaction, cooldown/resource,
chain logic, UI feedback, and real-time + turn-based proof.
```

---

## `source/docs/05_COMBAT_REACTIONS_AND_DEATHS.md`

SHA-256: `77453243872a9d595cfd41787780a082f5177bef10e63b02802e637a91876872`

```markdown
# 05 — Combat Reactions and Deaths

## Objective

Combat must visually respond to impact.
The old “attack swings but target barely reacts” problem is not acceptable.

## A. Hit reaction ladder

Every combat hit should map to a reaction bucket:
- light
- medium
- heavy
- knockback
- knockdown
- spell_stagger
- burn/shock special

Suggested inputs:
- incoming damage as % of max HP
- attack type
- poise / stagger resistance
- critical hit flag
- current animation state
- elite / boss immunity rules

## B. Required reaction coverage

### Players
- light front / back / left / right
- medium front / back / left / right
- heavy front / back / left / right
- block react
- interrupt cast react
- knockback
- knockdown
- get up
- burn react
- shock react

### Standard monsters
At minimum:
- light hit
- heavy hit
- stagger
- knockback or recoil
- death_1
- death_2

### Important monsters / bosses
At minimum:
- light hit
- heavy hit
- stagger
- interrupt
- knockback
- special pain
- death_default
- death_heavy
- death_spell

## C. Death variants

### Player / humanoid deaths
- physical_front
- physical_back
- physical_side
- heavy_knockback
- spell_blast
- fall_death
- drown_death

### Monster deaths
- default collapse
- heavy impact death
- spell death / magical death

## D. Collision and hit-contact rules

Combat needs:
- active frames
- hit volumes
- hurt volumes
- reaction timing markers
- impact event markers
- optional recoil timing
- stop-on-hit or continue-on-cleave policy by attack

## E. First-level guidance

Prefer:
- fewer attacks
- much better reactions

over:
- many attacks
- weak feedback

## F. Verification checklist

Every attack or spell must prove:
1. windup / release readable
2. contact occurs visibly
3. target reaction plays
4. damage number / state aligns
5. VFX aligns with contact
6. reaction intensity fits damage
7. death variant triggers when fatal
```

---

## `source/docs/06_INTERACTIONS_AND_WORLD_ACTIONS.md`

SHA-256: `f9f7e9cffef3b523499dc4efb32a09ac4d14651195aa3181975d0b33900fcf5d`

```markdown
# 06 — Interactions and World Actions

## Goal

List non-combat action animations and runtime interactions an action RPG typically needs.

## Required shared interaction families

### Doors and gates
- open normal door
- open heavy door
- push open obstacle door
- pull open obstacle door
- open gate / mechanism

### Containers
- open chest
- open crate
- open sarcophagus
- loot remains

### Puzzle / dungeon actions
- pull lever
- push switch
- rotate wheel / valve
- place ritual item
- activate waystone / rune
- push movable object
- pull movable object

### Traversal
- climb ladder
- climb ledge
- climb tree / trunk if used
- swim
- drown

### Utility / world
- gather
- inspect
- talk initiate
- kneel / interact
- rest / idle sit (optional)
- revive / help-up (later if used)

## Runtime dependency rule

A world action is not complete unless:
- animation exists
- prop / socket alignment exists
- collision states update
- success / fail game state updates
- camera still reads the action
- event markers fire
- player can exit / recover cleanly

## First-level priority
1. doors / gates
2. chest / corpse looting
3. waystone interaction
4. lever / puzzle action
5. climbing
6. swimming / drowning
```

---

## `source/docs/07_NPC_DIALOGUE_HEADS.md`

SHA-256: `485df36bc0492b497e03004976d451135bbd93230653b4a0e1129b237a1f8a2e`

```markdown
# 07 — NPC Dialogue Heads

## Goal

During NPC conversation, show:
- a 3D animated head portrait
- matching the speaking NPC
- inside / beside the dialogue UI

## Head portrait pipeline

For each important NPC:
1. create or isolate a dialogue head asset
2. rig / animate facial or head performance
3. connect to dialogue state
4. play talk / listen loops based on who is speaking

## Minimum animation set per head

### Idle / listening
- idle_neutral
- blink_loop
- look_small_shift
- listen_loop
- nod_small
- head_tilt

### Talking
- talk_soft
- talk_normal
- talk_emphatic
- smile_small
- frown_small
- surprise_small
- shake_head_no
- nod_yes

## Technical requirements
- stable portrait lighting
- clean silhouette
- no gear clipping in frame
- no body needed unless desired
- low enough poly/material cost for UI runtime

## Verification
Portrait heads pass only if:
- they are clearly the same NPC identity
- talking feels alive, not frozen
- transitions between speaker/listener are clean
- UI integration performs well
```

---

## `source/docs/08_GEAR_AND_LOOT_PIPELINE.md`

SHA-256: `a7b414fd9f3f43e5feed6d918a92c79423de5ac8c0b80ffcccc0968df21e324b`

```markdown
# 08 — Gear and Loot Pipeline

## Equipment slots

Current gameplay docs already include:
- head
- body
- leg
- foot
- main-hand
- off-hand

The new pipeline expects likely expansion to:
- hands / gloves
- waist / belt
- shoulders (later)
- back / cloak (later)
- accessory slots (later)

## Gear-generation strategy

### Playable gear
Generate separately:
- starter chest
- starter legs
- starter boots
- starter gloves
- starter belt
- starter headwear where used
- starter weapon
- starter off-hand

### NPC / boss gear
NPC or boss outfits may be:
- kept as special locked outfits
- segmented into lootable pieces
- converted into rare / epic / legendary gear sets

## Loot rarity system

### Proposed rarity colors
- Grey = basic / poor / broken / common low-value
- Green = uncommon
- Blue = rare
- Purple = epic
- Orange = legendary

## Loot principles
- any eligible monster can have a rarity table
- higher-level monsters have a higher chance to drop better rarity
- first-level scope can keep this simpler while preserving the framework
- a boss / important NPC can drop special set gear

## Level-based item logic
Suggested first-pass rules:
- gear has item level
- monster level influences possible item level range
- stronger monsters have higher chance for higher rarity
- rarity and item level are related but not 