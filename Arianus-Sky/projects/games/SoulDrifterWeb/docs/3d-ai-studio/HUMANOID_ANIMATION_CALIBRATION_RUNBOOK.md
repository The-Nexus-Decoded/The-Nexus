# SoulDrifter Character and Equipment Animation Calibration Runbook

Issue: The-Nexus #435

Applies to: playable characters, NPCs, humanoid monsters, creatures, weapons, shields, ammunition, spell tools, sheaths, and carried equipment.

## Non-negotiable rule

Every accepted animation calibration is unique to the complete character-and-equipment combination being tested. A passing human greatsword grip is not evidence for an elf, dwarf, halfling, zombie, mummy, lich, large-body human, another weapon, or even another greatsword mesh.

Follow the canonical [DRY reuse policy](README.md#dry-reuse-policy): reuse shared tools and immutable source resources, while keeping mutable calibration state and acceptance independent. Reusing a clip or default profile does not give a new character-and-equipment combination `accepted` status; that exact combination still requires its own visual regression pass.

## Calibration identity

Key every calibration record by all of the following fields:

1. Species or creature family, such as human, elf, dwarf, halfling, zombie, mummy, or lich.
2. Body archetype and proportions, including height class, shoulder width, arm length, hand scale, and other skeletal proportions that affect contact.
3. Exact rig identifier and rig revision.
4. Exact animation clip identifier and clip revision.
5. Exact weapon or equipment asset identifier and asset revision.
6. Handedness and equipment combination, such as right-hand sword, sword plus shield, two-hand greatsword, bow plus arrow plus quiver, or dual daggers.
7. Socket role, such as hand, hip, back, shield grip, bow hand, arrow nock, quiver, or projectile release.

The canonical key is:

```text
species/body-archetype/rig-revision/clip-revision/equipment-combination/asset-revision/socket-role
```

Changing any component creates a new calibration identity. Never silently fall back to another identity.

## What must be independently calibrated

- Body-motion selection and timing for each species, creature family, and body archetype, including compatibility checks for any shared clip.
- Right-hand and left-hand finger curls for each exact clip.
- Weapon socket position, rotation, and scale for each exact asset.
- Two-hand IK target and wrist correction for each exact clip and weapon.
- Shield handle placement, forearm relationship, and defensive angle.
- Draw, transfer, release, and recovery timing for bows, arrows, quivers, thrown weapons, and projectiles.
- Hip, back, and sheath transforms for each asset, clip, and body archetype.
- Root-motion handling and review-camera framing for each clip.

Independent calibration means separately keyed values and evidence, not duplicated scripts, algorithms, meshes, or animation source files. Do not share one mutable grip, socket, IK, or sheath state across different clips or loadouts. Deep-copy mutable settings when creating a new unapproved calibration record; immutable resources may remain shared by reference.

## Weapon-specific requirements

- Greatsword: both hands remain attached to their assigned hilt or pommel regions throughout every two-hand combat clip. Draw and sheathe are independent calibrations.
- Shortsword, mace, axe, wand, ritual knife, and dagger: the palm encloses the intended handle, fingers do not cross through the handle or palm, and the asset orientation matches its function.
- Staff: both hands contact the intended shaft regions through jabs, sweeps, blocks, swings, and casting clips. A staff combat clip is not interchangeable with a staff casting clip.
- Sword and shield: the shield must use a real hand grip or historically appropriate grip-and-strap arrangement. A back-carry strap is not a combat-hand socket.
- Bow: the bow hand, string hand, arrow nock, arrow direction, quiver orientation, visible ammunition count, release marker, and projectile path are tested as separate but synchronized components.
- Wand or binding rod: use an actual magical wand or rod asset. Axe-like, cleaver-like, or other mislabeled meshes fail intake and must be withheld.
- Dual wield: each hand has its own weapon asset record, grip, socket, and per-clip calibration. Mirroring a single-hand record is only an initial estimate.

## Visual acceptance pass

For every calibration identity:

1. Load the exact production character, rig, animation clip, and textured equipment assets.
2. Pause and inspect at minimum at normalized times `0.00`, `0.25`, `0.50`, `0.75`, and `0.98`.
3. Add checkpoints at every grip transfer, draw, release, impact, block, sheathe, or hand-contact event.
4. Capture a full-body tracking view so root motion, lunges, jumps, and long attacks remain in frame.
5. Capture close views of each hand from at least two useful angles.
6. Reject visible gaps, floating weapons, inverted assets, fingers through palms, fingers through equipment, hands crossing through each other, detached off-hands, shield-body intersections, and sheath-body intersections.
7. For ranged attacks, verify the hand-held projectile before release, the release marker, the in-flight projectile, its orientation, and the inventory decrement.
8. Switch to at least two unrelated loadouts and return. The previously accepted calibration must be byte-for-byte unchanged and visually identical.
9. Repeat on each required species, body archetype, and rig revision. Passing on one body never approves another.

## Regression gates

Automation must fail when any of these conditions occurs:

- A calibration key omits species, body archetype, rig revision, clip, equipment combination, or asset revision.
- Two different calibration identities reference the same mutable state object.
- Editing one clip changes another clip's grip, socket, IK, sheath, or projectile data.
- A required textured asset is replaced by an untextured placeholder.
- A mislabeled or rejected asset is attached to an animation.
- The selected action label does not match the visible equipment combination or motion.
- A character leaves the full-body review frame during expected root motion.
- An accepted clip lacks both full-body and hand-close visual evidence.

## Acceptance receipt

Store an acceptance receipt for every passing calibration identity containing:

- Composite calibration key.
- Source character, rig, clip, and equipment hashes.
- Grip, socket, IK, sheath, and projectile values.
- Exact frame checkpoints reviewed.
- Paths to full-body and hand-close evidence.
- Automated isolation-test result.
- Reviewer, date, and status: `draft`, `visually-verified`, or `accepted`.

Only `accepted` records may ship. Proxies and copied templates remain `draft` until their exact combination passes this runbook.
