# Issue #487 Equipment Provider Gap Audit

Status: `READ_ONLY_PROVIDER_AUDIT`

Audit date: 2026-08-29

Scope: non-deferred one-hand sword, shield bash, greatsword equipment transfer, staff, mace, rod, knife, and paired-dagger rows.

This document is an isolated provider-selection audit. It does not change the master demand matrix, install an animation, promote a candidate, or claim owner acceptance. The shared coverage JSON and master gap audit remain authoritative for integration state.

## Evidence boundary

- Immutable provider catalog: `public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-catalog.json`
- Source library SHA-256: `6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793`
- Source library size: `32,441,884` bytes
- Immutable source clip count: `400`
- Provider packs represented by this audit: `pro-sword-and-shield-*`, `great-sword-*`, `pro-melee-axe-*`, `pro-magic-*`, `pro-longbow-*`, and `interactions-*`
- Rejected source-derived evidence: `public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-gap-combat-candidates.provenance.json`
- Current original-authored evidence root: `H:/CodexData/souldrifter-toolchain/evidence/487/animation-candidates/combat-spell/`

The catalog proves byte-addressable source discovery. It does not prove that a clip satisfies a SoulDrifter weapon contract. Every result below was classified by weapon, hand count, offhand role, contact mechanics, action line, socket transfer, and recovery—not by provider clip name alone.

## Classification rules

- **Direct full-row candidate:** the provider motion satisfies the complete requested semantic without changing weapon, hand count, offhand role, or contact mechanics.
- **Direct sub-action candidate:** the provider motion exactly covers one named part of a larger row, but cannot close the row by itself.
- **Reference only:** the source may inform timing or body mechanics, but a contract mismatch prevents direct use.
- **Original authoring required:** the missing semantic must be built as a new whole-body action from the accepted zero-action rest rig.
- **Quarantined:** the artifact may be inspected as evidence but is not installed, promoted, or owner-approved.

There are **zero direct full-row provider candidates** across the 15 rows in this audit.

## Direct provider sub-actions

These are accepted only as exact provider-level sub-action matches. They are not complete-row or owner acceptance claims.

| Provider clip | Source pack | Exact sub-action | Uncovered contract |
| --- | --- | --- | --- |
| `GreatSword__DrawAGreatSword1`, `GreatSword__DrawAGreatSword2` | `great-sword-01` | Greatsword draw from back | No matching back-stow motion exists. Reversing the draw is forbidden. |
| `Interactions__HumanMasculineAthleticMuscularStaffButtSmash` | `interactions-02` | Staff butt strike | Does not provide staff grip idle, thrust, sweep, overhead strike, recovery, block, cast, or equipment transfer. |

## Provider-first matrix

| Requirement | Best provider evidence | Classification | Contract decision | Current authored/quarantine state |
| --- | --- | --- | --- | --- |
| `combat.sword-one-hand.guard-idle` | `ProSwordAndShield__SwordAndShieldIdle` (`pro-sword-and-shield-02`) | Reference only | Shield posture violates the visible free-offhand contract. | `combat-one-hand-sword-guard-v1` is `PASS_PROVISIONAL_QUARANTINED`; real BREACH-V2 and owner review remain pending. |
| `combat.sword-one-hand.thrust` | `ProSwordAndShield__SwordAndShieldAttack3` (`pro-sword-and-shield-01`) | Reference only | Shield mechanics and offhand posture cannot become the starter free-hand thrust by relabeling or neutralizing one arm. | Authored v1 self-review rejected it because the sword never becomes a point-led thrust and the body does not form a compact lunge. Reauthor. |
| `combat.sword-one-hand.horizontal-cut` | `ProMeleeAxe__StandingMeleeAttackHorizontal` (`pro-melee-axe-01`) | Reference only | Axe balance and impact path do not satisfy the one-hand sword cut. | Authored v1 independent review rejected its diagonal/overhead read and head/neck crowding. Reauthor. |
| `combat.sword-one-hand.draw-sheath` | `ProSwordAndShield__DrawSword1`, `ProSwordAndShield__SheathSword1` (`pro-sword-and-shield-01`) | Reference only / partial provider basis | Shield-arm posture violates the free-offhand row; exact hip-socket release, alignment, insertion, and grip markers remain required. | Authored draw and sheath v1 were self-review rejected because the scabbard axis crossed the waist and torso. Reauthor or rebuild the socket path. |
| `combat.sword-shield.shield-bash` | `ProSwordAndShield__SwordAndShieldImpact` (`pro-sword-and-shield-02`) | Rejected substitution | An equipped impact/reaction does not prove a shield-led attack or shield-face contact. | The pack-level original candidate is `REWORK / NOT_PRESENTED / QUARANTINED`. Original bash authoring and prop-contact proof remain required. |
| `combat.greatsword.draw-stow` | `GreatSword__DrawAGreatSword1`, `GreatSword__DrawAGreatSword2` (`great-sword-01`) | Direct draw sub-action; stow missing | Draw is available. No source clip supplies a back-stow, and reversing draw is forbidden. | Pack-level original draw/stow candidates remain `REWORK / NOT_PRESENTED / QUARANTINED`; only an original stow can close the row. |
| `combat.staff.grip-idle` | `GreatSword__GreatSwordIdle` (`great-sword-01`) | Rejected substitution | Greatsword balance, hand spacing, and implement geometry do not prove a two-hand practice-staff grip. | Original pack candidate remains quarantined and unapproved. |
| `combat.staff.melee-family` | `Interactions__HumanMasculineAthleticMuscularStaffButtSmash` (`interactions-02`) | Direct butt-strike sub-action | Thrust, sweep, overhead strike, and coherent recovery remain absent from the provider catalog. | Original `combat-staff-thrust-v8` has technical `PASS`, independent `PASS`, owner `NOT_PRESENTED`, `OWNER_REVIEW_READY`, and `runtimeInstalled: false`. Other family actions remain unapproved. |
| `combat.staff.guard-block` | `GreatSword__GreatSwordBlocking` (`great-sword-01`) | Rejected substitution | Sword leverage and contact geometry cannot substitute for staff guard and two-hand block mechanics. | Original pack candidate remains `REWORK / QUARANTINED`. |
| `combat.staff.channel-cast` | `ProMagic__Standing2HCastSpell01`, `ProMagic__Standing2HMagicAttack01` (`pro-magic-01`) | Reference only | Generic two-hand casting does not preserve staff-hand constraints, shaft contact, or an interruptible staff channel. | Original staff channel and release candidates remain `REWORK / QUARANTINED`. |
| `combat.staff.draw-stow` | `GreatSword__DrawAGreatSword1` (`great-sword-01`) | Rejected substitution | The prop, hand spacing, back socket, and clearance path differ; reversed playback is forbidden. | Original staff draw/stow pair remains `REWORK / QUARANTINED`. |
| `combat.mace.lower-level` | `ProMeleeAxe__StandingIdle`, `ProMeleeAxe__StandingBlockIdle`, and `ProMeleeAxe__StandingMeleeAttackDownward` (`pro-melee-axe-01`) | Rejected substitution | Axe edge alignment and cut mechanics do not satisfy mace guard, compact blunt impact, block, and recovery. | Original mace trio remains `REWORK / QUARANTINED`; the weapon-family reference gate is also incomplete. |
| `combat.rod.lower-level` | `ProMagic__Standing1HCastSpell01` (`pro-magic-01`), `Interactions__HumanMasculineAthleticMuscularPointGesture` (`interactions-02`) | Reference only | These do not preserve rod grip or provide command, summon release, channel, interruption, and recovery continuity. | Original rod family remains `REWORK / QUARANTINED`. |
| `combat.knife.lower-level` | `ProLongbow__UnarmedIdle01` (`pro-longbow-02`), `ProMeleeAxe__StandingMeleeAttackBackhand` (`pro-melee-axe-01`), `ProMagic__Standing1HCastSpell01` (`pro-magic-01`) | Rejected substitution | The sources do not establish knife grip, close range, free-hand intent, curse gesture, and recovery as one family. | Original knife family remains `REWORK / QUARANTINED`. |
| `combat.daggers.paired` | `ProLongbow__UnarmedIdle01` (`pro-longbow-02`), `ProMeleeAxe__StandingMeleeComboAttackVer1` (`pro-melee-axe-01`) | Rejected substitution | Neither source proves two forward-grip weapons, alternating hand contacts, defensive hand roles, or paired recovery. | Original paired-dagger guard/strike candidates remain `REWORK / QUARANTINED`. |

## Current authored evidence

The original-authored 50-clip combat/spell pack reports:

- status: `UNREVIEWED_ORIGINALLY_AUTHORED_COMBAT_SPELL_CANDIDATES`
- acceptance claim: `NONE`
- independent visual review: `REWORK`
- owner review: `NOT_PRESENTED`
- promotion: `QUARANTINED`

Individual receipts and evaluations may supersede that pack-level state for one candidate only:

- One-hand Sword Guard v1: provisional visual pass, still quarantined and not runtime/owner accepted.
- One-hand Sword Thrust v1: rejected during self-review.
- One-hand Sword Horizontal Cut v1: rejected during independent review.
- One-hand Sword Draw Hip v1 and Sheath Hip v1: rejected during self-review.
- Staff Thrust v8: technical and independent visual `PASS`; owner `NOT_PRESENTED`; promotion `OWNER_REVIEW_READY`; runtime not installed.

No individual result promotes the remaining actions in its weapon-family row.

## Fail-closed rules

1. The issue #487 `GapCombat` source-derived pack has `acceptanceClaim: NONE`. It is rejected process evidence and is forbidden from runtime integration or further owner review.
2. A `MISSING` semantic cannot be closed by reversing, mirroring, relabeling, trimming, splicing, crossfading, layering, or pose copying from an existing clip.
3. Reversal is not a valid equipment-transfer shortcut. In particular, a greatsword or staff draw cannot be reversed and renamed as a stow.
4. A reference-only clip may inform a new reference packet, but its animation bytes cannot become the missing action through cleanup or limb neutralization.
5. A direct sub-action does not promote its entire family. Each missing guard, strike, block, channel, transfer, and recovery keeps its own gate.
6. Every original candidate remains quarantined until provenance, fresh import, full normal-speed multi-view inspection, equipment/contact proof, BREACH-V2 runtime proof, independent review, and owner acceptance all pass.
7. Provider names never override physical evidence. Wrong prop, hand count, offhand role, socket, contact surface, skill tier, or recovery is a semantic rejection.

## Recommended production order

1. Present the already independently passed Staff Thrust v8 to the owner without installing it.
2. Use the provisional Sword Guard v1 only as the next isolated review candidate; do not treat it as accepted yet.
3. Reauthor the rejected sword thrust, horizontal cut, draw, and sheath from their locked real-person and socket contracts.
4. Author the missing greatsword stow and the remaining staff family as whole-body actions.
5. Complete weapon-specific reference packets before mace, rod, knife, or paired-dagger authoring proceeds.
