# SoulDrifter Mixamo replacement animation acquisition

Status: active acquisition plan for issue #448
Catalog snapshot: 2026-08-20
Target branch: `codex/448-souldrifter-first-breach-models`
Release target: `qa` only after owner review; this document authorizes no merge or deployment.

## Decision record

The first heavy masculine human and dwarf downloads are **provisional reduced-hand
rigs**, not canonical production templates. Both audits found a 41-bone Mixamo
armature with only thumb and index chains. Their meshes are structurally useful
and fully weighted, but visible preview movement does not compensate for missing
middle, ring, and pinky articulation.

The production humanoid gate is now explicit:

- `Standard Skeleton (65)` selected during auto-rigging; never the reduced
  `3 Chain Fingers (49)` option, which shares a driver across the middle,
  ring, and pinky fingers;
- all five digits present on both hands with complete three-bone chains;
- one armature rooted at `mixamorig:Hips` and no unweighted vertices;
- no more than four normalized influences per runtime vertex after cleanup; and
- passing weapon-grip, bow-draw, and spellcasting deformation proof.

No 41-bone download may be promoted to the shared canonical skeleton. It can be
kept as provenance or used to compare body weights, but each production body
must be downloaded or locally repaired against the validated 65-bone hierarchy.

Rigging this template does **not** skin every body automatically. Its skeleton and all approved animation curves are reusable. Each remaining humanoid mesh still requires one skin bind or weight transfer plus deformation QA.

## Body-bind queue

| Order | Body | Bind route | Corrective QA focus |
| ---: | --- | --- | --- |
| 1 | Human masculine heavy | Re-rig or locally repair to validated 65-bone hierarchy | hands, shoulders, hips |
| 2 | Human feminine heavy | Candidate for first validated 65-bone template | hands, shoulders, chest, hips |
| 3 | Elf masculine heavy | Transfer/bind | shoulders, ears/head clearance, hips |
| 4 | Elf feminine heavy | Transfer/bind | shoulders, chest, ears/head clearance |
| 5 | Dwarf masculine heavy | Re-rig or locally repair reduced 41-bone download | hands, shoulder width, short limbs, hips, knees |
| 6 | Dwarf feminine heavy | Transfer plus corrective weights | shoulder width, short limbs, chest, knees |
| 7 | Halfling masculine slim | Transfer plus corrective weights | elbows, knees, stride length |
| 8 | Halfling feminine slim | Transfer plus corrective weights | elbows, knees, stride length |
| 9 | Halfling masculine athletic | Transfer plus corrective weights | shoulders, hips, stride length |
| 10 | Halfling feminine athletic | Transfer plus corrective weights | shoulders, hips, stride length |
| 11 | Halfling masculine heavy | Transfer plus corrective weights | belly/hip volume, elbows, knees |
| 12 | Halfling feminine heavy | Transfer plus corrective weights | chest/belly/hip volume, elbows, knees |

Every body must pass idle, walk, run, crouch, jump/land, overhead reach, one-handed attack, two-handed grip, bow draw, casting, hit, and death poses before it is registered for play.

## Current Mixamo catalog evidence

The audit script queried Mixamo's current `Motion,MotionPack` catalog directly and retained the complete result before applying discovery tags.

| Catalog group | Results |
| --- | ---: |
| All motions and packs | 2,484 |
| Combat | 605 |
| Adventure | 384 |
| Sport | 287 |
| Dance | 147 |
| Fantasy | 180 |
| Superhero | 36 |
| Skinning Test | 11 |

Generated local audit artifacts are intentionally outside the repository at `H:\CodexData\.codex\tmp\issue-448-mixamo-catalog-2026-08-20`. They include the full source snapshot, the broad SoulDrifter candidate index, and per-family counts. Keyword tags are discovery aids, not approvals.

## Replacement policy

1. The 19 clips listed as active in `ANIMATION-IMPORT-AUDIT.md` are historical baselines and are deprecated as final game motion at the owner's direction.
2. Do not delete a fallback until its replacement is downloaded, normalized, bound, visually approved in runtime, and referenced by a stable semantic action ID.
3. Download animation-only FBX files using `Without Skin`, 30 FPS, no keyframe reduction, and in-place mode when Mixamo offers it.
4. Never ship Mixamo's preview character or a weapon baked into an animation file.
5. Runtime weapon models attach to canonical hand/back/hip sockets. The animation supplies body mechanics only.
6. A Mixamo preview is not approval. Approval requires the exact SoulDrifter body, real runtime weapon, isometric camera, grounding, contact/release marker, crossfade, and normal/slow playback proof.
7. A motion pack is a discovery and coverage shortcut. Only the accepted children are downloaded and registered; duplicate, firearm, modern-phone, dance, acrobatic, or unsuitable skill-tier motions are excluded.

## Acquisition batches

### Batch A: neutral locomotion and traversal

Primary discovery packs:

| Pack | Mixamo ID | Motions | Intended coverage |
| --- | --- | ---: | --- |
| Male Locomotion Pack | `bd8ac609-e3ca-4ef3-8782-a05cd6deebe3` | 10 | idle, walk, run, strafes, 90-degree turns, jump |
| Basic Locomotion Pack | `c9d58d72-b96c-11e4-a802-0aaa78deedf9` | 7 | alternate walk/strafe/turn/jump candidates |
| Action Adventure Pack | `c9d5840a-b96c-11e4-a802-0aaa78deedf9` | 22 | start/stop, fall, roll, landing, cover/crouch movement |

Required semantic surface:

`idle-neutral`, `idle-alert`, `walk-forward`, `walk-backward`, `strafe-left`, `strafe-right`, `jog-forward`, `run-forward`, `sprint-forward`, `move-start`, `move-stop`, `turn-left-90`, `turn-right-90`, `turn-180`, `crouch-idle`, `crouch-walk`, `sneak-walk`, `step-up`, `step-down`, `jump-start`, `jump-loop`, `land`, `vault-low`, `climb-ledge`, `ladder-up`, `ladder-down`, `swim-idle`, and `swim-forward`.

Known traversal candidates include:

| Semantic ID | Mixamo candidate | Mixamo ID |
| --- | --- | --- |
| `vault-low` | Vault Over Box | `c9c8bc4d-b96c-11e4-a802-0aaa78deedf9` |
| `climb-ledge` | Freehang Climb | `c9c9ce91-b96c-11e4-a802-0aaa78deedf9` |
| `climb-ledge` alternate | Climbing / Pulling Up To A Ledge | `c9c803b5-b96c-11e4-a802-0aaa78deedf9` |
| `ladder-up` start | Start Climbing Ladder | `c9c8e009-b96c-11e4-a802-0aaa78deedf9` |
| `ladder-up` loop | Climbing Ladder | `c9c95e7a-b96c-11e4-a802-0aaa78deedf9` |
| `ladder-up` exit | Climbing To Top | `c9c9611b-b96c-11e4-a802-0aaa78deedf9` |
| `ladder-down` | Climbing Down | `c9c84593-b96c-11e4-a802-0aaa78deedf9` |
| `swim-idle` | Treading Water | `c9c858e6-b96c-11e4-a802-0aaa78deedf9` |
| `swim-forward` | Swimming To Edge | `c9c809b5-b96c-11e4-a802-0aaa78deedf9` |

### Batch B: world, inventory, social, and life-cycle actions

| Semantic ID | Primary candidate | Mixamo ID |
| --- | --- | --- |
| `door-open` inward | Opening Door Inwards | `c9ca099c-b96c-11e4-a802-0aaa78deedf9` |
| `door-open` outward | Open Door Outwards | `c9ca4de1-b96c-11e4-a802-0aaa78deedf9` |
| `door-close` | Closing / Cabinet Door | `c9c6d55d-b96c-11e4-a802-0aaa78deedf9` |
| `chest-open` | Opening A Lid | `c9c6d6e6-b96c-11e4-a802-0aaa78deedf9` |
| `pickup-ground` | Picking Up Object | `c9c6c5eb-b96c-11e4-a802-0aaa78deedf9` |
| `pickup-waist` | Lifting / Pick Up Object And Examine | `c9c6fe3b-b96c-11e4-a802-0aaa78deedf9` |
| `drop-item` | Dropping | `c9c8208c-b96c-11e4-a802-0aaa78deedf9` |
| `lever-use` | Pulling Lever | `c9c8524e-b96c-11e4-a802-0aaa78deedf9` |
| `carry-idle` | Box Idle | `c9cd8d90-b96c-11e4-a802-0aaa78deedf9` |
| `carry-walk` | Box Walk Arc | `c9cd8e51-b96c-11e4-a802-0aaa78deedf9` |
| `conversation-idle` | Talking / General Conversation | `c9c88301-b96c-11e4-a802-0aaa78deedf9` |
| `conversation-gesture` | Talking / Asking A Question | `c9c6de72-b96c-11e4-a802-0aaa78deedf9` |
| `drink` | Drinking | `c9c63255-b96c-11e4-a802-0aaa78deedf9` |
| `sleep-idle` light | Sleeping Idle | `c9ccd3a9-b96c-11e4-a802-0aaa78deedf9` |
| `sleep-idle` deep | Sleeping Idle | `c9ccd46a-b96c-11e4-a802-0aaa78deedf9` |
| `sleep-idle` bed | Laying Sleeping | `c9ce6e3b-b96c-11e4-a802-0aaa78deedf9` |

The final Batch B selection must also fill `place-item`, `push-heavy`, `pull-heavy`, `switch-use`, `read-object`, `sit-down`, `sit-idle`, `stand-up`, `sleep-down`, `wake-up`, `eat`, `equip-weapon`, `unequip-weapon`, `point`, `wave`, `nod`, `shake-head`, `kneel`, `stand-from-kneel`, four-direction hit reactions, and knockdown/get-up. Each non-terminal action needs at least one primary and one visually reviewed alternate before final approval.

### Complete death-family ledger

Death is a situational family, not one front/back fallback. The current catalog contains **42 unique Mixamo death motions** after deduplication by Mixamo motion ID. Every one is retained in [`animation/mixamo-death-ledger.json`](animation/mixamo-death-ledger.json), including standing, crouched, prone/grounded, walking, running, directional, knockback/explosion, electric, projectile, sword-and-shield, greatsword, bow, zombie, and mutant-authored takes.

Each ledger record owns a stable `death.mixamo.*` action ID plus direction, posture, damage type, weapon-family, download settings, acquisition state, and runtime-review state. Cataloging does not mean automatic promotion: clips are downloaded and reviewed individually, but none can silently disappear merely because it was authored for a firearm, undead preview, or different damage source. A source-specific take can be approved for its exact situation, adapted locally, or rejected with evidence.

Runtime selection follows the most specific valid pool in this order:

1. current posture and movement state;
2. incoming impact direction;
3. damage type and knockback force;
4. equipped weapon compatibility; and
5. a randomized eligible take with immediate-repeat suppression.

This produces varied deaths without choosing a crouched headshot while standing, a bow fall with an incompatible hand state, or a small collapse for an explosive launch. The 42-entry ledger is regenerated from the preserved catalog snapshot with `scripts/build-mixamo-death-ledger.mjs`.

### Batch C: one-handed sword and unarmed

The current Mixamo library is sparse for a clean one-handed sword with a free offhand. These are candidates, not a complete family:

| Role | Candidate | Mixamo ID |
| --- | --- | --- |
| basic controlled cut | Stable Sword Inward Slash | `c9c72f80-b96c-11e4-a802-0aaa78deedf9` |
| advanced combo | One Hand Sword Combo | `c9cdaeb2-b96c-11e4-a802-0aaa78deedf9` |
| draw transition | Draw Sword 1 | `c9cca2dc-b96c-11e4-a802-0aaa78deedf9` |
| draw transition alternate | Draw Sword 2 | `c9cca398-b96c-11e4-a802-0aaa78deedf9` |
| sheathe transition | Sheath Sword 1 | `c9ccbe7e-b96c-11e4-a802-0aaa78deedf9` |
| sheathe transition exit | Sheath Sword 2 | `c9ccbf3a-b96c-11e4-a802-0aaa78deedf9` |
| drawn locomotion | Run With Sword | `c9c9e46f-b96c-11e4-a802-0aaa78deedf9` |

Required one-handed sword contracts are beginner guard, idle, forward/back/strafe locomotion, draw, sheathe, horizontal cut, descending cut, rising cut, thrust, block/parry, advancing attack, retreating counter, hit reactions, and recovery. Missing actions require local authoring from credible one-handed reference; greatsword or sword-and-shield curves must not be relabeled.

Unarmed requires separate idle/guard, jab, cross, front kick, block, dodge, hit reactions, knockdown/get-up, and controlled starter combo candidates. It is a fallback family, not the future Monk class style.

### Batch D: sword-and-shield and greatsword

These are complete Mixamo-ready combat families and should be harvested before inventing replacements.

| Family | Pack | Mixamo ID | Motions |
| --- | --- | --- | ---: |
| sword-and-shield | Pro Sword and Shield Pack | `081399c1-a024-4cfd-8b49-d3d6d9ab2945` | 51 |
| sword-and-shield alternate | Sword and Shield Pack | `c9d590fe-b96c-11e4-a802-0aaa78deedf9` | 49 |
| two-handed sword | Great Sword Pack | `c9d58f41-b96c-11e4-a802-0aaa78deedf9` | 51 |

The sword-and-shield acceptance set must include guard idle, walk/run/back/strafe/turn, draw/sheathe, block start/loop/end, blocked and unblocked impacts, compact cut, cross cut, low cut, jump attack, shield/hilt melee, crouch variants, casting/power-up, and front/back deaths. Shield coverage and sword line are evaluated together.

The greatsword set must include idle, locomotion, draw/sheathe, block start/loop/end, downward/power/low/combo cuts, crouch cut, high spin, jump attack, slide attack, hilt melee, hit reactions, cast/power-up, and deaths. Advanced attacks never replace beginner one-handed actions.

### Batch E: axe, longbow, and magic

| Family | Pack | Mixamo ID | Motions |
| --- | --- | --- | ---: |
| one-handed melee axe | Pro Melee Axe Pack | `d9c1f16c-b22b-4678-b5ce-597153bb25b1` | 47 |
| longbow complete | Pro Longbow Pack | `69f801b8-bd75-4a61-800c-3ff0171d6a78` | 39 |
| longbow aim subset | Longbow Aiming Pack | `db350904-3eb0-46b5-b654-b460de686f75` | 8 |
| longbow locomotion subset | Longbow Locomotion Pack | `17a16d6d-c4e3-4c59-a7b3-b582a4c5f383` | 12 |
| spell actions | Magic Spell Pack | `c319b7d5-948f-42a7-a299-ec71f9eb5660` | 13 |
| magic locomotion | Magic Locomotion Pack | `60afeeae-cf08-4914-9fec-958b2f02be4d` | 16 |
| magic compact subset | Lite Magic Pack | `56e378c7-43ac-4d98-9252-a9c155ad8d24` | 14 |

Axe coverage includes idle, equip/disarm, guard/block, walk/run/back/turn, backhand/upward, downward, horizontal, high/low 360 attacks, three combos, jump attack, hit reactions, and taunts.

Longbow coverage includes unarmed and bow idles, equip/disarm, nock/draw, aim/overdraw, loose/recoil, aimed walk in four directions, non-aimed locomotion, dodge in four directions, land/fall, melee escape, hit reactions, and deaths. The actual bow and arrow attach at runtime sockets.

Magic coverage is separated by semantic intent rather than treated as one generic cast:

- one-hand projectile, sweep, upward release, curse, ward, and command;
- two-hand forward blast, area-ground release, area-pull release, sustained channel, summon, heal, buff, and recovery;
- focus/rod variants with persistent prop grip and free-hand gesture; and
- interruption, recoil, fail, recovery, and locomotion states.

### Batch F: sparse families requiring a local authored post-pass

| Family | Useful Mixamo seeds | Mixamo coverage verdict | Required local work |
| --- | --- | --- | --- |
| paired daggers | Double Dagger Stab `c9c69305-b96c-11e4-a802-0aaa78deedf9`; Dual Weapon Combo `c9cdb1c3-b96c-11e4-a802-0aaa78deedf9` | Sparse | forward-grip idle, alternating light chain, cross cut, lunge, dodge attack, block/parry, recovery |
| ritual knife | Knife Idle `c9c61ec1-b96c-11e4-a802-0aaa78deedf9`; foregrip stab `c9c61d25-b96c-11e4-a802-0aaa78deedf9`; reverse-grip stab `c9c61df2-b96c-11e4-a802-0aaa78deedf9` | Sparse | ritual stance, curse/channel, free-hand intent, compact strike and recovery |
| physical staff | Smash With Rifle/Staff and staff-tip spin only | Inadequate | two-hand guard, thrust, sweep, overhead strike, block, spin recovery, staff-assisted casts |
| mace/hammer | No true current Mixamo family | Gap | one-hand Priest mace and Paladin/Warrior hammer families from weapon-correct reference; axe wrist paths are forbidden as final |
| spear/polearm | Bayonet Stab `c9c6c767-b96c-11e4-a802-0aaa78deedf9` is the only clear seed | Gap | two-hand spear guard, thrust, sweep, butt strike, block, advance/retreat, recovery; separate one-hand-plus-shield family |
| crossbow | No true current Mixamo family | Gap | ready, aim, trigger, settle, lower, spanning/reload appropriate to exact mechanism; bow draw cannot be reused |
| focus/rod | Magic body-language seeds | Partial | class-specific persistent grip and release language for Summoner, Asura, Mage, and Priest |

Local authoring means preserving the accepted canonical skeleton and retargetable action contract while adjusting or creating motion curves in Blender. It does not mean rerigging every body or purchasing another generated model.

## Class and weapon routing

| Calling | Starter family | Initial runtime motion set |
| --- | --- | --- |
| Warrior | one-handed longsword | one-hand free-offhand beginner set; advanced greatsword/axe later |
| Mage | two-handed practice staff | authored physical staff plus staff-assisted magic set |
| Priest | one-handed wooden mace | authored mace set plus Priest ward/heal gesture set |
| Sharpshooter | shortbow | longbow body mechanics adapted and validated for shortbow timing |
| Paladin | shortsword and shield | sword-and-shield pack subset |
| Summoner | binding rod | persistent rod grip plus command/summon/channel/recovery |
| Asura | ritual knife | knife seed plus authored ritual/curse/close-strike set |
| Slayer | paired daggers | paired-dagger seeds plus authored alternating combo family |
| Shadowknight | one-handed longsword | one-hand beginner strike, Siphon sweep, weapon-channel ward, recovery |

Button and combo bindings consume stable semantic IDs such as `combat.sword.light.1`, `combat.sword.light.2`, `combat.sword.heavy`, `combat.sword.thrust`, `combat.sword.block`, `combat.sword.parry`, and `combat.sword.dodge-attack`. Vendor names and hashes remain provenance metadata; gameplay code never binds directly to a Mixamo display name.

## Acquisition and acceptance sequence

1. Preserve the full catalog snapshot and selected candidate IDs.
2. Visually compare at least two candidates per required action on the accepted heavy human.
3. Download approved clips `Without Skin` into an external intake directory.
4. Record source ID, display name, download settings, SHA-256, intended semantic ID, root policy, and rejection notes.
5. Normalize accepted clips without rewriting skeletal curves.
6. Run real-animation deformation QA on the heavy template.
7. Bind/transfer the remaining eleven humanoid bodies.
8. Run the same representative clip suite on all twelve bodies.
9. Attach runtime weapons and validate grip, clearance, grounding, contact/release markers, crossfades, and gameplay-camera readability.
10. Replace deprecated runtime mappings only after the new semantic action passes.

The work is complete only when the runtime registry has no accidental dependence on Mixamo display names, all starter callings have their weapon/cast families, every core world action has a passing clip or an explicit locally authored replacement, every body passes deformation QA, and the old 19 clips are no longer authoritative.
