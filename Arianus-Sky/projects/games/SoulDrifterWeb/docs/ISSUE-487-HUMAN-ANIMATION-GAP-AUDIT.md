# Issue #487 Human Animation Gap Audit

This audit compares the shared lower-level Human motion master list against the immutable 400-clip pilot library and records later accepted standalone authored assets separately. Candidate-library `coverage` remains historical source provenance; `acceptedCoverage` records accepted runtime motion without rewriting that intake history. `COVERED_NOW` alone does not mean a library clip has passed visual, contact, deformation, root-motion, transition, equipment, or owner acceptance.

Machine-readable implementation record: `public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-coverage.json`. The 2026-08-29 owner-locked harvest split is synchronized there: generic Harvest is retired and the Tree Harvest and Plant Harvest gaps are separate required-now rows.

Validation command: `node scripts/validate-human-animation-gap-manifest.mjs`

## Totals

- Required now: **111**
- Covered now by exact candidates: **63**
- Partial and needing cleanup or derivation: **15**
- Missing now: **33**
- Deferred higher-level/future-setting families: **5**
- Candidate library: **400 clips**, SHA-256 `6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793`

These totals describe the immutable candidate library. They do not subtract later standalone authored acceptances.

## Accepted standalone authored reconciliation

| Required row | Accepted coverage | Installed asset and clip | Remaining requirement |
|---|---|---|---|
| `reaction.spell.blowback` | `COVERED` / `IN_GAME_QA_ACCEPTED` | `public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-spell-impact-knockback-fall.glb` · `AuthoredReaction__SpellImpactKnockbackAndFall` · SHA-256 `6AA99EB932D8DF5FD9A7DF9326482F412863AF86815DC25584292C5DB28C661E` | None for this semantic. Existing side and three-quarter evidence preserves the installed acceptance; gameplay/front/rear evidence is not present, so this reconciliation does not claim a new four-view promotion. |
| `reaction.spell.knockdown` | `COVERED_SHARED` / `IN_GAME_QA_ACCEPTED` | Same exact accepted Spell Impact asset, clip, and SHA-256 `6AA99EB932D8DF5FD9A7DF9326482F412863AF86815DC25584292C5DB28C661E` | None. Sharing is legitimate because the clip visibly ends in a recoverable nonterminal grounded knockdown without death or automatic recovery. |
| `reaction.spell.get-up` | `MISSING` | No accepted asset | Author one generic grounded get-up whose first pose matches the accepted Spell Impact terminal pose and whose last pose is the natural standing gameplay stance. |
| `locomotion.knockdown.get-up` | `PARTIAL` | Knockdown half uses the same accepted Spell Impact asset, clip, and SHA-256 `6AA99EB932D8DF5FD9A7DF9326482F412863AF86815DC25584292C5DB28C661E` | The same generic get-up may close this row and `reaction.spell.get-up` only after exact terminal/start-pose continuity, 65-bone rest-rig, grounding, and BREACH-V2 start/mid/end runtime validation. |
| `npc.listen` | `COVERED` / `IN_GAME_QA_ACCEPTED` | `public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-npc-listen.glb` · `AuthoredUtility__NpcListen` · SHA-256 `23615F625DC7C095D5BABF1358075060A6B69CC93FC7453AEDE88A8595F61DD6` | None. Complete normal-speed gameplay/front/side/rear evidence was independently reviewed. |
| `npc.farewell` | `COVERED` / `IN_GAME_QA_ACCEPTED` | `public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-farewell.glb` · `AuthoredUtility__Farewell` · SHA-256 `760C60A83805918CB4034279998EC85F6A1D41E773F69DF850223DBF013E7F28` | None. Complete normal-speed gameplay/front/side/rear evidence was independently reviewed. |

The accepted assets above retain the exact 65-bone `mixamo-standard-65` rest-rig contract with root `mixamorig:Hips` and zero-action source-rest SHA-256 `B86F7378ADA29FF11E0FBC030D438FE241B8D4A74C47AFD37CC8ACED28C5FF81`. Exact evidence roots and normal-speed video hashes are stored on the corresponding machine rows.

The source-derived pack `public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-gap-combat-candidates.glb`, SHA-256 `36545DA597E49F24AC24349F3B9CDB28216A15F4146D7AABD276C67BEABAFD0C`, contributes **zero coverage**. Its relevant clips derive from Mixamo death actions or reversed death segments, and the owner rejected that method. No death-derived or reversal candidate may substitute for the missing get-up.

## Missing in the immutable candidate library

- `locomotion.knockdown.get-up` — nonterminal knockdown to prone and grounded get-up recovery
- `locomotion.shimmy` — ledge or wall shimmy left and right
- `combat.unarmed.block` — empty-hand guard and block
- `combat.sword-one-hand.guard-idle` — one-handed sword guard with visible free offhand
- `combat.sword-one-hand.horizontal-cut` — one-handed horizontal outward cut with free-hand balance
- `combat.sword-shield.shield-bash` — explicit shield bash with shield-face contact
- `combat.bow.cancel` — safely cancel a drawn bow and return the arrow
- `combat.magic.interrupt-cancel` — cast interruption and balanced cancel recovery
- `reaction.spell.blowback` — nonterminal spell-impact blowback with authored displacement and fall
- `reaction.spell.knockdown` — spell-damage knockdown without death
- `reaction.spell.get-up` — grounded recovery after spell knockdown
- `combat.staff.grip-idle` — two-handed staff grip and ready idle
- `combat.staff.guard-block` — staff guard and two-hand block
- `combat.staff.draw-stow` — draw staff from and stow staff to back
- `combat.mace.lower-level` — one-handed lower-level mace guard, compact strike, block, and recovery
- `combat.knife.lower-level` — one-handed ritual-knife guard, close strike, curse gesture, and recovery
- `combat.daggers.paired` — paired forward-grip idle, alternating strikes, guard, and recovery
- `death.status-elemental` — distinct lower-level burning, freezing, electrical, poison, or void terminal reactions
- `death.drowning` — water struggle, loss of buoyancy, and terminal drown state
- `water.dive` — enter water from standing and transition underwater
- `water.underwater-swim` — underwater locomotion
- `water.surface.open` — surface in open water and return to tread
- `interaction.door.lock-unlock` — lock and unlock a door
- `interaction.lockpick` — kneel or stand at lock and perform lockpicking loop with success/fail exit
- `interaction.valve` — grip and turn valve or wheel
- `interaction.mine` — pickaxe mining loop with contact and recovery
- `interaction.chop` — tool-based wood-chop loop with contact and recovery
- `interaction.lift-carry-place` — lift heavy object, carry loop, and place object
- `interaction.harvest.tree` — ground bucket ready, upward tree-fruit pick, transfer, and collision-free bucket deposit
- `interaction.harvest.plant` — ground bucket ready, natural low bend or hip-hinge plant pick, rise, transfer, and collision-free bucket deposit
- `npc.listen` — attentive listening loop with subtle acknowledgement
- `npc.farewell` — distinct farewell gesture and return to idle

## Partial in the immutable candidate library, requiring cleanup or derivation

- `locomotion.start-stop` — generic walk start and stop transitions
- `locomotion.fall.loop` — equipment-neutral airborne fall loop
- `locomotion.land.running` — land and continue into forward run
- `locomotion.dodge.directional` — forward, backward, left, and right combat dodge
- `locomotion.stairs` — stair ascent and descent with step contacts
- `combat.unarmed.jab-cross` — compact jab or cross with closed fist and full-body weight transfer
- `combat.unarmed.impact-recovery` — unarmed hit reaction with balanced recovery
- `combat.sword-one-hand.draw-sheath` — draw from and sheath to hip without a shield
- `combat.greatsword.draw-stow` — draw from and stow to back
- `combat.axe.death` — axe-specific defeat and terminal collapse
- `combat.magic.channel` — sustained interruptible channel loop
- `combat.staff.melee-family` — staff thrust, sweep, butt strike, overhead strike, and recovery
- `combat.staff.channel-cast` — staff-assisted lower-level cast and channel
- `combat.rod.lower-level` — binding-rod grip, command, summon release, channel, interruption, and recovery
- `interaction.loot-inspect` — loot and inspect object at waist or ground height

## Covered by exact immutable-library candidates

- `locomotion.idle.standing` — neutral living standing idle
- `locomotion.walk.forward` — walk forward
- `locomotion.walk.backward` — walk backward
- `locomotion.strafe.walk` — walking strafe left and right
- `locomotion.run.forward` — run forward
- `locomotion.run.backward` — run backward
- `locomotion.run.lateral` — run left and right
- `locomotion.sprint.forward` — sprint forward
- `locomotion.turn.left-right` — ninety-degree turns in both directions
- `locomotion.crouch.idle` — crouched idle
- `locomotion.crouch.transitions` — stand-to-crouch and crouch-to-stand
- `locomotion.crouch.directional` — crouch walk forward, backward, left, and right
- `locomotion.jump.standing` — standing jump
- `locomotion.jump.running` — running jump
- `locomotion.land.standing` — land and recover to standing idle
- `combat.unarmed.idle` — unarmed combat-ready idle
- `combat.unarmed.front-kick` — simple front kick and grounded recovery
- `combat.sword-shield.idle-movement` — sword-and-shield idle, walk, run, turn, and strafe
- `combat.sword-shield.attack` — compact sword-and-shield attack family
- `combat.sword-shield.block` — shield cover, block start or idle, and impact
- `combat.sword-shield.draw-sheath` — draw and sheath sword while retaining shield control
- `combat.sword-shield.death` — weapon-specific defeat and terminal collapse
- `combat.greatsword.idle-movement` — two-handed sword idle, walk, run, turn, and strafe
- `combat.greatsword.attack` — two-handed attack, slash, and overhead or spin variants
- `combat.greatsword.block` — two-handed sword block and impact
- `combat.greatsword.death` — two-handed sword defeat and terminal collapse
- `combat.axe.idle-movement` — axe-ready idle, walk, run, and turn
- `combat.axe.attack` — horizontal, downward, backhand, and cleave attacks
- `combat.axe.block` — axe block and large block reaction
- `combat.axe.equip-stow` — equip and stow over shoulder or underarm
- `combat.bow.equip-stow` — equip bow from back and stow bow to back
- `combat.bow.nock-draw` — nock and draw arrow
- `combat.bow.aim-release-recoil` — aim, loose arrow, and settle through recoil
- `combat.bow.aim-movement` — aim-walk forward, backward, left, and right
- `combat.bow.hit-death` — bow-equipped hit reactions and terminal deaths
- `combat.magic.shared-idle-cast` — shared lower-level one-hand and two-hand cast foundations
- `combat.magic.shared-attacks` — shared lower-level directional and area magic releases
- `combat.magic.block` — magic guard start, hold, large react, and end
- `reaction.spell.small-directional` — small spell-damage reactions from front, back, left, and right
- `reaction.spell.large-directional` — large spell-damage reactions from front, back, left, and right
- `reaction.stagger` — short, large, and block staggers with recovery
- `death.directional` — front, back, left, and right terminal collapses
- `death.weapon-variety` — multiple sword, shield, greatsword, bow, and rifle terminal silhouettes
- `death.moving-collapse` — collapse while moving
- `traversal.ladder` — ladder mount, climb loop, and dismount to standing
- `traversal.rope` — rope climb using hands and feet
- `traversal.wall` — wall climb up and down
- `traversal.ledge` — hang-to-crouch and ledge pull-up recovery
- `water.swim.idle-forward` — tread water and swim forward
- `water.surface.edge` — swim to edge and climb or settle at edge
- `interaction.door.open-close` — open inward, open outward, and close door with empty hands
- `interaction.chest-container` — open chest and open or close container
- `interaction.lever-button` — pull lever and press button
- `interaction.pickup` — pick up small item and larger object
- `interaction.push` — heavy push start, loop, and stop
- `interaction.pull` — heavy pull start, loop, and stop
- `npc.idle-rest` — standing idle, sitting idle, and resting pose
- `npc.think` — thinking loop and thoughtful nod
- `npc.talk` — small, medium, emphatic, and seated talk variants
- `npc.point` — point forward and directional point gesture
- `npc.wave-greeting` — wave and standing greeting
- `npc.nod-yes-no` — nod yes and shake no
- `npc.beckon` — beckon another actor closer

The generic `interaction.harvest` row and Harvest v1 candidate are `CHANGE/REWORK` and do not count as coverage. Tree Harvest and Plant Harvest are separate current-core requirements. For both, the bucket is a grounded runtime-bound prop, fruit is a runtime-bound item, neither is baked into the animation, and hand/fruit/bucket paths must be collision-free.

Exact candidate clip IDs and every source-library partial/missing reason remain synchronized into the machine-readable manifest. Its executable validator proves the immutable-library totals of 111 required-now rows: 63 covered source candidates, 15 partial rows, and 33 missing rows. Runtime-authored acceptance is recorded independently on reconciled rows so candidate-library provenance and later runtime decisions remain auditable.

## Deferred higher-level or future-setting motion

- `casting.class-signatures` — distinct Mage, Priest, Paladin, Shadowknight, Necromancer, Summoner, and other class or spell-level casting identities
- `combat.advanced-specializations` — advanced spins, aerial attacks, multi-hit combos, signature deaths, and specialization-only weapon techniques
- `combat.firearms.future-setting` — setting-approved firearm equipment, equip/stow, aim, fire, reload, movement, hit, and death family
- `combat.crossbow.future-equipment` — crossbow spanning, ready, aim, trigger, settling, and reload
- `combat.spear-polearm.future-equipment` — approved one-hand or two-hand spear and polearm grip, thrust, sweep, block, and recovery families

The existing rifle candidates remain preserved in the 400-clip library. These five deferred rows do not block the shared lower-level #487 Human pilot.
