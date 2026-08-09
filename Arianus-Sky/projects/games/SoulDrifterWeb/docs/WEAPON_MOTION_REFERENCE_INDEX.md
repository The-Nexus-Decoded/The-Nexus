# SoulDrifter Weapon Motion Reference Index

This index is the mandatory research gate before any weapon stance, locomotion set, attack, defense, skill, or spell-focus animation is authored. It complements [`ANIMATION_PRODUCTION_PIPELINE.md`](ANIMATION_PRODUCTION_PIPELINE.md).

The rule is simple: identify the exact weapon family, grip, skill tier, stance, force path, footwork, and recovery from credible human references before touching the rig. A convenient mocap clip must never decide what a SoulDrifter skill becomes.

## Required reference packet

Every new weapon action must record:

1. exact SoulDrifter weapon and skill ID;
2. one-handed, hand-and-a-half, two-handed, paired, weapon-and-shield, or focus grip;
3. beginner, trained, specialized, or supernatural tier;
4. two or more credible stance/movement references, including at least one video or motion sequence when available;
5. the specific guard, anticipation, active motion, follow-through, and recovery being adapted;
6. what is kept from the reference and what is deliberately stylized;
7. source URL, publisher/author, access date, license/usage status, and local source hash when media is downloaded;
8. close front, close side, and gameplay-camera static grip/guard proof before full animation;
9. normal-speed and slow runtime proof after retargeting.

Reference material informs body mechanics. It does not grant permission to redistribute somebody else's video, model, rig, or mocap. Downloaded media remains outside shipping assets unless its license explicitly permits inclusion.

## Current SoulDrifter weapon inventory

This inventory comes from the current character and class documentation. It prevents an animation from being designed for a generic label such as `sword`, `staff`, or `gun` when the actual equipment, grip, and class context are more specific.

### Starter implements

| Calling | Level-1 implement | Required first motion packet |
| --- | --- | --- |
| Warrior | plain iron longsword | one-handed beginner sword guard, basic cut, basic thrust, block, and recovery |
| Mage | ashwood practice staff | two-handed physical staff idle/strike packet and a separate staff-assisted mortal casting packet |
| Priest | plain wooden mace | one-handed mace guard, compact strike, ward gesture, and recovery |
| Sharpshooter | rough shortbow | beginner shortbow stance, nock, draw, anchor, loose, follow-through, and safe return |
| Paladin | plain iron shortsword plus battered wooden shield | sword-and-shield guard, shield cover, compact cut/thrust, block, and recovery; never reuse the free-offhand sword packet |
| Summoner | unadorned binding rod | rod grip, command gesture, summon release, channel, interruption, and recovery |
| Asura | plain ritual knife | one-handed ritual-knife guard plus separate mortal curse and close-strike gestures |
| Slayer | paired worn daggers | paired forward-grip guard, alternating strikes, defensive hand roles, and recovery |
| Shadowknight | battered iron longsword | one-handed beginner stab, one-handed Siphon sweep, guard/buff, and recovery |

These are starter defaults, not equipment locks. The universal learnable families currently named in the progression rules are **sword, staff, axe, hammer/mace, bow, dagger/knife, spear/polearm, and focus/rod**. Shields are a distinct off-hand family. Crossbows, thrown tools, traps, bells, charms, spell discs, prisms, rings, and command tokens require their own interaction or casting packets when they produce a visible action.

### Planned and conditional equipment

| Family or implement | Documented class uses | Scope decision |
| --- | --- | --- |
| Heavy sword, blade-spear, impact spear, axe-blade | Warrior paths | Planned advanced martial gear; exact proportions and one/two-hand grip must be chosen per item. |
| Prism, wand, spell disc, rings, short staff | Mage paths | Planned casting implements; physical attacks and spell-channel gestures are separate motion families. |
| Holy bow, staff, bell, charm, short mace | Priest paths | Planned devotional gear; each must preserve Priest body language rather than inherit Mage casting. |
| Bow, crossbow, traps, command whistle/token | Sharpshooter paths | Planned ranged/utility gear; bow and crossbow are not animation-compatible. |
| Hammer, mace, shield, heavy spear, oath blade | Paladin paths | Planned oath-martial gear; weapon-and-shield packets remain separate from two-hand packets. |
| Daggers and short blades | Slayer paths | Planned execution gear; paired, single, forward, and reverse grips are separate packets. |
| Unarmed, hand wraps, simple staff | planned Monk expansion | Future class space only; block animation until Monk's stance language, rules, resources, and exact real-world reference disciplines are approved. |
| Firearms | none in the current starter roster | Future-only and blocked until the world's technology level and exact firearm family are approved. |

## Current Shadowknight decisions

### Starter Weapon Strike

- Weapon: battered iron longsword used one-handed at beginner level.
- Motion family: compact one-handed thrust/stab.
- Start: balanced stance, knees slightly bent, weapon-side foot modestly forward, right wrist aligned with forearm, sword held slightly forward in a blade-forward guard.
- Action: raise/align the point on a slight across-body line that remains readable from the isometric camera, make a short controlled thrust with modest knee, hip, shoulder, and elbow contribution, then recover quickly to guard.
- Free hand: visible balance/guard gesture; it does not pretend to grip the hilt.
- Forbidden: overhead chop, two-handed power cut, face-crossing blade, limp dangling wrist, huge lunge, flourish, rune effect, or advanced magical technique.

Primary stance/grip reference: [Wychwood Single-handed Sword: Basics](https://wychwood.wikidot.com/fighting-sword). It describes a balanced slightly-forward stance, bent knees, a relaxed wrist aligned with the forearm, and a single-handed on-guard position. Its reenactment contact rules are safety rules, not SoulDrifter hit design.

Supplemental thrust/recovery reference: [British Fencing Step Lunge](https://ef-api.britishfencing.com/games/step-lunge/) and [British Fencing glossary](https://www.britishfencing.com/glossary-of-terms/). Use these only for readable extension, balance, and rapid recovery; the starter attack is shorter and less athletic than a full sport-fencing lunge.

### Siphon Cleave

- Weapon: the same starter longsword, one-handed.
- Motion family: compact-to-wide frontal sweep with a draining release marker.
- Start: its own valid one-handed guard, distinct from Weapon Strike, with firm right-hand hilt control and the free hand visible.
- Action: controlled cross-body sweep driven by hips and shoulders, blade leading through the frontal arc, balanced far-side follow-through, then recovery.
- Forbidden: reusing the stab, dangling the sword like a cane, hiding the free hand behind the torso, backward falling hinge, or using particles to conceal an unreadable sweep.

The same Wychwood single-sword reference establishes the one-handed grip, aligned wrist, balanced stance, and whole-blade control. The recorded body-mechanics trial is Federico Malagutti HEMA's [Arming Sword Basics 2 - Medieval one handed Sword](https://www.youtube.com/watch?v=kp1ieHPIRmw), `5:43.5-5:46.5` (Exercises chapter). Retain its continuous one-hand grip, bent-knee planted load, coordinated hilt/shoulder/hip drive, far-side follow-through, and centered recovery. Reject its higher diagonal blade plane, travel distance, and unrelated free-hand gesture.

The Siphon attack line instead follows ARMA's [horizontal crosscut taxonomy](https://www.thearma.org/MSsup.htm) (right-to-left or left-to-right) and [whole-body cut mechanics](https://www.thearma.org/essays/howacutworks.htm): the hilt advances while the point travels a circular arc through coordinated footwork, body motion, grip, and follow-through. SoulDrifter keeps the feet planted/in-place and adds the free hand's inward life-draw, but must not reduce the cut to a wrist-only swing.

Biomechanics reference: [ARMA, "How a Cut Works"](https://thearma.org/essays/howacutworks.htm). For this animation, retain its core mechanics: the hilt advances, the point travels through a controlled circular arc, the edge leads, and footwork, hips, torso, shoulder, arm, grip, follow-through, and recovery contribute together. Do not copy its text, images, or media into the game; it is a copyrighted reference-only source.

Motion taxonomy reference: [ARMA medieval swordsmanship supplement](https://thearma.org/MSsup.htm). It distinguishes horizontal right-to-left and left-to-right crosscuts from rising, descending, and straight-thrust actions. Siphon uses the horizontal crosscut family, then stylizes the far-side recovery and restrained drain release for SoulDrifter. Accessed 2026-08-08; reference-only use.

Recorded human-motion candidate: [Federico Malagutti HEMA, "Arming Sword Basics 2 - Medieval one handed Sword"](https://www.youtube.com/watch?v=kp1ieHPIRmw). This is not approved merely because it exists. The animator must visually review it, record the exact useful timestamp or trial, identify the compatible one-handed guard/cut/recovery mechanics, and reject any passage whose weapon, hand count, attack line, or intensity conflicts with the beginner Siphon brief. Reference-only; no video or audio may ship with the game.

Current source-motion implementation: Mixamo `Stable Sword Outward Slash`, acquired without skin at 30 FPS with no keyframe reduction and preserved at SHA-256 `38589E534D2C47F5F095BC08CDA0C4853607D3BB86F8EDABFC5802F9C3BF0DE9`. It is retargeted through evaluated armature-space pose matrices as `SiphonCleaveSource`, grounded in the runtime, and bound only to Siphon Cleave. The separately acquired Mixamo `One Hand Sword Combo` (SHA-256 `9F933921AE56053D54ADBAE1D2CF0E3CF1F9552B6989C45C1521D6A8706FE0B2`) remains unbound and reserved for a future advanced multi-hit skill; it is explicitly forbidden as Weapon Strike or beginner Siphon Cleave.

### Emergency unarmed fallback

If the weapon is missing, hidden by a disarm/broken-item state, or later reaches zero durability, the resource-free basic alternates a compact source cross punch and a simple lead-foot snap kick. Weapon-required skills remain blocked. Current source motions are Mixamo `Cross Punch` (stored as `UnarmedPunch`, SHA-256 `828EE7B8F1687D23446EC3261F0875C2E9C8EF25F8E80AB3546F09A7F2D338B6`) and `Kicking` / male front snap kick (stored as `UnarmedKick`, SHA-256 `61CFADB201AF522BCDDA4F4518363E8EA84EF580F486DCA3B3A92E4419DD5CA7`). This emergency family does not define the future Monk class's discipline, stance, or skill tree.

## Weapon-family research map

| Family | Current SoulDrifter examples | Reference starting points | Research status and animation gate |
| --- | --- | --- | --- |
| One-handed sword with free offhand | Shadowknight starter longsword; Warrior starter longsword | [Wychwood single sword](https://wychwood.wikidot.com/fighting-sword); [British Fencing beginner movement](https://www.britishfencing.com/explore-fencing-app/); [ARMA cut biomechanics](https://thearma.org/essays/howacutworks.htm) | Starter stab stance and mechanics are approved as a reference baseline. Every cut, thrust, counter, and advancing action still needs its own packet. |
| One-handed sword and shield | Paladin starter shortsword and battered shield | [Liber de Arte Dimicatoria / MS I.33](https://wiktenauer.com/wiki/Liber_de_Arte_Dimicatoria); [Wiktenauer arming-sword index](https://www.wiktenauer.com/wiki/Arming_Sword) | Research started. Block animation until the exact shield size, guard, sword line, shield cover, foot lead, and recorded human sequence are selected. Never bolt a shield onto the free-offhand sword animation. |
| Hand-and-a-half / two-handed sword | Future advanced longsword or greatsword skills | [Wychwood bastard sword](https://wychwood.wikidot.com/fighting-bastard); [Fiore source index](https://wiktenauer.com/wiki/Index%3AFlos_Duellatorum_%28Pisani_Dossi_MS%29) | Do not reuse for beginner one-handed skills. Prove hand order, hilt length, contact continuity, and blade clearance. |
| Staff | Mage practice staff; physical staff use by other classes | [English Quarterstaff reconstruction from Silver and Swetnam](https://www.hroarr.com/manuals/01-polearms/Staff/Quarterstaff/Quarterstaff.pdf); [BADC staff curriculum](https://www.badc.org.uk/_files/ugd/5b072b_e1b9ecbb2de243308bbdb6610afc9ad5.pdf); [Fiore source index](https://wiktenauer.com/wiki/Index%3AFlos_Duellatorum_%28Pisani_Dossi_MS%29) | Research baseline logged. Select a specific guard and recorded sequence for each thrust, sweep, block, or cast. Keep physical staff technique separate from magic-channeling gestures. |
| Bow | Sharpshooter rough shortbow | [World Archery Level 1 coaching manual](https://extranet.worldarchery.sport/documents/index.php/Coaches/Accreditation/Coaching_Levels/MANUAL_COACHING_LEVEL_1.pdf); [World Archery coaching resources](https://www.worldarchery.sport/sport/education/coaching) | Prove stance, bow-hand shoulder, draw-side elbow, anchor, release, and follow-through. Adapt draw weight and tempo to the character, race, and bow. |
| Crossbow | Future Sharpshooter equipment | No action-specific reference approved yet. | Block production until the exact crossbow mechanism, spanning state, ready stance, aim, trigger, recoil/settling, and reload sequence are chosen. Do not reuse bow draw/anchor motion. |
| Spear | Cross-class spear use; future polearm skills | [Wychwood spear fighting](https://wychwood.wikidot.com/fighting-spear-vik); [Fiore pole/staff source index](https://wiktenauer.com/wiki/Index%3AFlos_Duellatorum_%28Pisani_Dossi_MS%29) | Lock one-hand-plus-shield versus two-hand grip before choosing motion. Staff and spear are not interchangeable after the point enters the mechanics. |
| Axe / poleaxe | Shadowknight, Warrior, and other trained axe use | [Le Jeu de la Hache manuscript and translation](https://wiktenauer.com/wiki/Le_Jeu_de_la_Hache_%28MS_Fran%C3%A7ais_1996%29) | This source is for poleaxe mechanics. A one-handed axe needs its own reference packet; do not shrink a poleaxe animation and call it finished. |
| Dagger / ritual knife | Slayer daggers; Asura ritual knife | [Fiore dagger source](https://www.wiktenauer.com/wiki/Fiore_de%27i_Liberi); [Fiore image collection](https://wiktenauer.com/wiki/Fiore_de%27i_Liberi/Images) | Separate forward, reverse, paired, ritual, and grappling contexts. Each needs close-range footwork and free-hand intent. |
| Unarmed / hand wraps | Planned Monk expansion | No discipline or action-specific reference approved yet. | Block production until the Monk class pass chooses the exact strike, guard, footwork, counter, fall/recovery, and credible human-motion sources. Do not assemble a generic mixture of unrelated martial arts. |
| Hammer / mace | Warrior/Paladin hammer; Priest wooden mace | No approved action-specific source yet. | Block production until a credible one-handed or two-handed hammer/mace reference is logged for the exact skill. Do not substitute axe or sword wrist paths. |
| Focus / rod | Summoner binding rod; magical focuses | No single real-world martial source applies. Use recorded actor gesture, conducting, ritual, or stage-magic reference selected for the class and spell. | Define grip, gaze, breath, free-hand language, release direction, and recovery before VFX. The body telegraph must identify the spell family without particles. |
| Firearm | Future setting-dependent gun skills; not in the current starter loadouts | [U.S. Army TC 3-22.9 overview](https://www.army.mil/article/168953/mcoe_publishes_tc_3_22_9_rifle_and_carbine) | Research the exact firearm and stance if this family is approved for the setting. Do not reuse bow, crossbow, or generic two-handed aiming animations. |

## Stop conditions

Animation work does not start when:

- the exact weapon subtype or grip is undecided;
- the only reference is a game animation copied by eye;
- the reference uses a different weapon balance, hand count, shield/offhand, or skill tier;
- there is no clear guard and recovery;
- the rig or weapon model cannot reproduce the reference grip without intersection;
- the source/license is unknown;
- the action brief contradicts the intended beginner or progression tier.

When one of these conditions appears, fix the design/reference/asset boundary first. Do not compensate with wrist guesses, particle effects, playback speed, or camera angles.
