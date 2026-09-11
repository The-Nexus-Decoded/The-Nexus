identical
```

---

## `source/docs/09_24_HOUR_M3_DEPLOYMENT_PLAN.md`

SHA-256: `e007f666510821fa67b5081c17326fafe0d0e5cf50ae6e048ed75d4f4501cf8a`

```markdown
# 09 — 24-Hour M3 Deployment Plan

## Hour 0–2: install the new contracts
1. Copy this package into the SoulDrifter repo / M3 workspace.
2. Add references from the existing harness / README.
3. Add new docs to the orchestration context.
4. Confirm race/class legality is sourced from issue #443 rules.
5. Freeze current “old pipeline” docs as legacy reference only.

## Hour 2–4: generate the required matrices
M3 should create:
- playable body matrix
- face / appearance family matrix
- hairstyle matrix
- accessory matrix
- starter gear matrix
- class ability animation matrix
- spell VFX matrix
- NPC segmentation candidate list
- monster compare/rebuild list

## Hour 4–8: establish Tripo pilot lane
Run a pilot on:
1. one base body
2. one hairstyle
3. one face preset
4. one starter mage kit
5. one starter warrior kit
6. one NPC fully clothed
7. one monster

## Hour 8–12: animation baseline pass
Get baseline motion coverage for:
- locomotion
- generic interactions
- generic combat
- generic cast
- hurt / death
- one dialogue head pilot

## Hour 12–16: identify custom-gap queue
Generate the missing custom queue:
- weapon draw/sheath
- class-specific casts
- starter abilities
- hit reaction ladder
- death variants
- world interactions
- monster signatures

## Hour 16–20: runtime proof
Load pilot assets into Three.js and prove:
- body assembly works
- gear assembly works
- animations play correctly
- NPC head portrait works
- hit reactions trigger
- a basic spell VFX path works

## Hour 20–24: lock work order
Prioritize:
1. first-level playable classes
2. first-level NPCs
3. first-level monsters
4. first-level spell VFX
5. first-level interaction richness

Then create the first execution batch for M3.

## Important rule
Do not batch-generate everything blindly on day 1.
Pilot first, verify, then scale.
```

---

## `source/docs/10_ANCESTRY_ABILITIES_AND_ANIMATION.md`

SHA-256: `752cfccd713c01a5ffbc15aa16196bc551427e4929800eb7e70e864f9d3048e3`

```markdown
# 10 — Ancestry Abilities / Boons / Animation Contract

## Why this exists

SoulDrifter has ancestry-specific gameplay beyond body appearance.
The current implementation has three ancestry-related layers:

1. **Inherent ancestry talent** — always present.
2. **Selectable Memory Loom ancestry boon** — exactly one of two choices.
3. **Ancestry/calling resonance** — small combination bonuses; only the currently approved/implemented set is canonical. The proposed full 36-combination expansion remains owner-review-only.

These must not be confused with class skills.

## Current inherent talents

- Human — **Adaptive Training**
- Elf — **Long Memory**
- Dwarf — **Stone Anchor**
- Halfling — **Hidden Route**

### Animation rule for inherent talents

Always-on talents generally should **not** consume a unique full-body animation.
Use one or more of:
- passive UI icon state
- subtle persistent VFX
- contextual proc VFX
- additive posture layer
- short contextual animation only when the talent creates an actual action

## Current selectable ancestry boons

### Human
- **Many Roads**
- **Hard-Won Habit**

### Elf
- **Unbroken Recollection**
- **Ghost Step**

### Dwarf
- **Forgeheart**
- **Deep Anchor**

### Halfling
- **Overlooked Route**
- **Small Defiance**

## Important current-state fact

Today these choices are primarily implemented as stat modifiers / learned skill identities.
They are not all currently authored as active button-press abilities.

Therefore M3 must NOT spend custom animation production automatically.

Before animation production, each boon receives:

`abilityType = passive | proc | active | utility`

and:

`activationContract = none | automatic | player_input | contextual`

## Suggested animation treatment if later promoted to active abilities

These are **production-direction suggestions**, not claims that the mechanics are already implemented:

- **Many Roads** — adaptive stance shift / quick re-center; subtle
- **Hard-Won Habit** — short fortification / recover pose
- **Unbroken Recollection** — focused recall / perception gesture
- **Ghost Step** — unique short phase-step / evasive displacement
- **Forgeheart** — rooted heat-bank / brace motion
- **Deep Anchor** — strong low-center brace with ground response
- **Overlooked Route** — scan / inspect / route-reveal gesture
- **Small Defiance** — fear-resist / identity-brace pose

## Race reuse rule

Do not create separate basic locomotion libraries per ancestry just because the body proportions differ.

Use:
- one canonical humanoid motion contract
- per-body retarget / conform profile
- ancestry-specific abilities only where mechanics require them
- optional subtle stance/personality layers later

## Verification

For any ancestry action that becomes active:
1. action ID exists in gameplay data;
2. animation contract exists;
3. VFX/SFX markers exist where relevant;
4. cooldown/resource/state mechanics exist;
5. runtime button/trigger calls the action;
6. effect resolves on the shared marker;
7. character returns cleanly to locomotion;
8. independent visual QA passes.
```

---

## `source/docs/11_CODE_DERIVED_ANIMATION_DEMAND.md`

SHA-256: `b96417326a2d49faa52debfacb1d943397cac040c3b95b38ecfc0e1779fbfee2`

```markdown
# 11 — Code-Derived Animation Demand

## Rule

The animation queue is not manually maintained as the sole source of truth.

M3 must derive animation demand from the current game data and compare it to the production manifest.

## Demand sources

### 1. Weapon family
Examples:
- one-handed blade
- mace/axe
- staff
- bow
- shield
- unarmed
- future two-handed / polearm / dual-wield families

### 2. Current class core actions
Current code defines a signature + defensive skill for every starting calling:

| Calling | Signature | Defensive |
| --- | --- | --- |
| Warrior | Cleaving Strike | Anchor Guard |
| Mage | Cinder Bolt | Blue Ward |
| Priest | Consecrated Dart | Mending Ward |
| Sharpshooter | Twin Shot | Evasive Mark |
| Paladin | Oath Hammer | Hold the Breach |
| Summoner | Call Lesser Wisp | Binding Circle |
| Asura | Mind Prick | Black Thread |
| Slayer | Backstab | Shadowstep |
| Shadowknight | Siphon Cleave | Cinder Guard |

These 18 actions are **mandatory current motion/VFX contracts**.

### 3. Selectable base-calling disciplines
There are two Memory Loom discipline choices per calling.
Many are passive or rule modifiers, so classify before animating.

### 4. Ancestry
- inherent talent
- one of two selectable boons
- approved ancestry/calling resonance behavior

### 5. Oathbreaker / hard-trial skills
The code reserves one hard-trial skill identity per calling.
These become animation demand only if/when actually granted and active.

### 6. Progression / specialization
Future level-up skills and specialization skills add rows automatically.

## Three-starter-active-ability goal

The owner wants **three special starter attacks/abilities per class**.

Current code already provides two core active class skills per calling.
Therefore:

- Slot A = current signature skill
- Slot B = current defensive skill
- Slot C = **TBD_OWNER_APPROVED**

M3 must not silently invent Slot C and call it canon.

For each class, it should:
1. search approved progression/codex material for a suitable level-one action;
2. propose one only if no approved action exists;
3. mark it `PROPOSAL`;
4. wait for owner approval before production spending or runtime binding.

## Machine gate

The expected animation manifest should be regenerated from code after changes.

A green animation test that checks only existing files is insufficient.
The expected set and actual set must be compared.
```

---

## `source/docs/12_FULL_3D_ONLINE_ACTION_RPG_ANIMATION_AUDIT.md`

SHA-256: `38808a1b7a0a68a1d5802e7356aeed3c03bb2e65965c6767721ee9b6d62dfb67`

```markdown
# 12 — Full 3D Online Action-RPG Animation / Presentation Audit

This is the broad audit intended to catch entire categories before production.

Not every item belongs in the First Breach. Each row should be tagged:
- NOW
- SOON
- LATER
- NOT PLANNED

## 1. Locomotion
- idle exploration
- idle combat
- walk forward/back
- strafes
- run
- sprint
- acceleration / stop
- turn in place
- slope/stair adaptation
- crouch if supported
- exhausted / low-health locomotion if desired

## 2. Dodging / defense
- dodge left/right/back
- forward evade
- block
- heavy block
- parry
- guard break
- shield bash
- interrupt
- stagger recovery

## 3. Traversal
- jump
- falling loop
- soft/hard land
- ledge mantle
- ladder up/down
- rope/vine climb
- tree/trunk climb if supported
- vault low obstacle
- swim idle/forward/turn
- dive
- surface
- wade transitions
- drowning loop/death

## 4. Weapon state
- draw
- sheath
- weapon swap
- unarmed fallback
- disarm reaction
- retrieve/re-equip if used
- one-hand family
- shield family
- bow family
- staff family
- future two-hand / dual-wield / polearm / crossbow

## 5. Combat attacks
- basic chain
- heavy
- running attack
- lunge
- AoE swing
- ranged aim/release
- cast quick/power/channel
- class signature
- class defense
- third starter ability
- ancestry active ability where applicable
- specialization actions later

## 6. Contact / reactions
- light/medium/heavy hit
- 4 cardinal directions
- block response
- parry response
- cast interrupt
- small/large knockback
- knockdown
- get-up
- elemental/status overlays
- critical hit response
- armor/shield break reaction if implemented

## 7. Death / defeat
- directional physical
- heavy launch
- spell blast
- burn/freeze/shock variants if used
- fall death
- drowning
- execution/boss special later
- monster 2–3 family deaths minimum
- boss bespoke death

## 8. Interaction
- door inward/outward
- heavy push/pull door
- double door
- gate/portcullis mechanism
- chest
- crate/barrel
- sarcophagus
- pickup floor/waist
- corpse loot
- lever high/low
- button/plate
- wheel/valve
- insert key/ritual item
- push/pull object
- lift/carry object
- waystone/rune
- inspect/read
- sit
- rest
- sleep if ever used
- potion drink
- food use
- scroll/book read
- equip/unequip presentation if visible

## 9. Multiplayer/social
- wave
- point
- bow
- cheer
- laugh
- cry
- angry
- kneel
- sit
- dance (later)
- trade gesture (optional)
- revive/help-up
- downed crawl/idle if co-op downed state exists
- duel/PvP ready state if used

## 10. NPC ambient life
For cities/villages:
- converse
- listen
- point
- sit
- lean
- drink/eat
- read
- sweep
- smith hammering
- vendor presentation
- guard idle
- patrol
- fisher action
- carry box/sack
- workbench/crafting actions as needed

This matters because a visually detailed village with frozen NPCs still reads unfinished.

## 11. Crafting / gathering (if/when systems exist)
- mining
- chopping
- harvesting
- fishing
- cooking
- smithing
- alchemy
- enchanting / inscription
- crafting bench

## 12. Monsters
Per family:
- spawn/emerge
- idle variants
- patrol
- aggro
- chase
- attack 1
- attack 2
- special
- telegraph
- recover
- hit light/heavy
- stagger
- knockback
- death 1/2/3
- corpse/loot transition
- phase/enrage where relevant

## 13. Bosses
- entrance / reveal
- idle
- phase transition
- enrage
- telegraph set
- interruption
- summon/add call
- shield/armor break
- signature attacks
- recovery windows
- bespoke death
- post-death loot/reward presentation

## 14. Facial / dialogue
- blink
- gaze
- listening
- talk soft/normal/emphasis
- nod/shake
- anger/fear/sad/happy/surprise
- visemes later
- portrait lighting/camera

## 15. Camera / feedback — not skeletal animation but required
- hit stop
- camera shake tiers
- controller/mobile haptic hooks if supported
- damage flash
- directional damage indicator
- lock-on / target cue
- critical hit feedback
- boss telegraph screen-space readability

## 16. Procedural / additive systems to reduce clip explosion

Do NOT solve everything wi