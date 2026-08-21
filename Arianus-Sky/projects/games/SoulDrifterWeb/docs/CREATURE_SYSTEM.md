# Creature and Monster System

## Full actor parity

Monsters, animals, bosses, summons, charmed creatures, and tamed creatures are full actors. They share the player/NPC command pipeline rather than dealing damage through timer-only or animation-only exceptions.

Every offensive, defensive, support, movement, or world-changing behavior is a real skill or command. Examples include claw strike, bite, gore, tail whip, wing buffet, pounce, burrow, breath attack, venom, roar, ward, pack buff, curse, healing molt, summoned hazard, and creature-created weather.

Each skill owns:

- stable ID and display name;
- anatomy, equipment, stance, phase, and status requirements;
- resource cost, cooldown, range, area, and legal targets;
- AI priority and controllability policy;
- readable anticipation, contact, recovery, audio, and effect events;
- damage, healing, buff, debuff, displacement, weather, summon, or terrain results;
- interruption, resistance, immunity, and failure behavior.

An animation does not become an attack merely because it looks aggressive, and an attack may not resolve without its corresponding motion/contact event unless an explicit accessibility or abbreviated-animation mode preserves the same timing contract.

## Creature families and rigs

Reusable skeletons and skills are organized by anatomy family. Variants share compatible locomotion and attacks, while anatomy-changing variants require a new rig or explicit optional chains.

- Breachling family: low-hunched creature rig with digitigrade legs, long weight-bearing arms, four-finger hands, jaw controls, and optional tail chain. Breachling, Stalker, Oathbound, and Ravager variants share the family command library and add variant skills.
- Cinderbound Warden: mechanical rig with rigid plate assignments and articulated pistons, shoulder rings, chest cage, command palm, and integrated blade. Boss phase abilities remain registered commands.
- Training Effigy Sentinel: reduced rigid mechanical hierarchy with hinge-like limbs and a deliberately limited skill set.

Whole-model bobbing or rotation is presentation fallback only and cannot satisfy final limb-attack, locomotion, hit-reaction, or death acceptance.

## Charm, taming, and possession

When control is permitted, the controller receives the creature's actual allowed skills and their real constraints. Taming does not turn an animal into a humanoid class, and charm does not erase anatomy-specific actions. AI-only, boss-only, or unsafe environmental powers may be withheld only through explicit controllability metadata with a readable reason.

This contract allows the same creature to act under hostile AI, friendly AI, direct commands, or future PvP control without maintaining separate fake combat implementations.

## Real creature equipment and loot

Visible worn or carried objects are real item instances. Harnesses, barding, collars, armor plates, weapons, keys, packs, embedded tools, and detachable mechanical components must exist in equipment/inventory data and drive their visible meshes.

Natural anatomy such as claws, horns, teeth, shells, and tails is not equipment, but harvested anatomy is represented by real material items when loot rules allow it.

Defeated creatures leave remains. Remains persist until their available loot is resolved successfully. A full player inventory leaves the remains and items in the world. Each visible equipped item is explicitly transferred, damaged, broken, bound, protected, or destroyed; it is never a decorative placeholder that silently vanishes.

## Acceptance gates

A creature is not complete until its locomotion, every registered attack/support command, telegraph, contact frame, hit reaction, death, corpse persistence, loot, collision, scale, gameplay-camera silhouette, AI use, and any charm/tame command exposure have been tested end to end.
