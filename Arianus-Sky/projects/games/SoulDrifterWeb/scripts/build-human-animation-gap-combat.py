"""Build issue-487 combat/weapon/reaction gap candidates from the 400-clip GLB.

The immutable Human pilot library remains untouched.  This script samples
named actions from that verified Mixamo-standard rig, applies deterministic
timing/pose derivatives, exports a supplement GLB, and re-imports the result.
Every output is deliberately labeled as an unreviewed source-derived
candidate; runtime grounding, equipment contact, deformation, and owner
acceptance remain separate gates.

Run with the cached Blender receipt:

    blender --background --python scripts/build-human-animation-gap-combat.py -- \
      --source-glb public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb \
      --output-glb public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-gap-combat-candidates.glb \
      --report public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-gap-combat-candidates.provenance.json
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import struct
import sys
from typing import Any

import bpy
from mathutils import Matrix, Quaternion, Vector


EXPECTED_SOURCE_SHA256 = "6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793"
EXPECTED_SOURCE_ACTIONS = 400
EXPECTED_BONES = 65
EXPECTED_ROOT = "mixamorig:Hips"
FPS = 30
FINGERPRINT_SAMPLES = 17
MAXIMUM_REST_DIFFERENCE = 0.001
NEUTRAL_ACTION = "ProLongbow__UnarmedIdle01"


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-glb", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--report", required=True)
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def stable_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"))
    return sha256(payload.encode("utf-8")).hexdigest().upper()


def segment(
    action: str,
    start: float = 0.0,
    end: float = 1.0,
    *,
    reverse: bool = False,
    speed: float = 1.0,
) -> dict[str, Any]:
    return {
        "action": action,
        "startFraction": start,
        "endFraction": end,
        "reverse": reverse,
        "speed": speed,
    }


def candidate(
    name: str,
    requirements: list[str],
    sources: list[dict[str, Any]],
    transform: str,
    *,
    modifiers: dict[str, Any] | None = None,
    events: dict[str, float] | None = None,
    hold_last_frames: int = 0,
) -> dict[str, Any]:
    return {
        "name": name,
        "requirementIds": requirements,
        "segments": sources,
        "transform": transform,
        "modifiers": modifiers or {},
        "events": events or {},
        "holdLastFrames": hold_last_frames,
    }


def candidate_specs() -> list[dict[str, Any]]:
    neutral_left = {"neutralizeGroups": ["left_arm"]}
    right_grip = {"fingerCurl": {"hands": ["Right"], "degrees": 38}}
    both_grip = {"fingerCurl": {"hands": ["Left", "Right"], "degrees": 32}}
    specs = [
        candidate(
            "GapCombat__NonterminalKnockdownBackwardCandidate",
            ["locomotion.knockdown.get-up"],
            [segment("ProMagic__StandingReactDeathBackward", 0.0, 0.72, speed=1.08)],
            "trim terminal death before terminal hold to form recoverable knockdown",
            events={"impact": 0.22, "grounded": 0.94},
            hold_last_frames=6,
        ),
        candidate(
            "GapCombat__NonterminalGetUpBackwardCandidate",
            ["locomotion.knockdown.get-up"],
            [segment("ProMagic__StandingReactDeathBackward", 0.0, 0.72, reverse=True, speed=0.88)],
            "reverse recoverable knockdown segment into grounded get-up",
            events={"leaveGround": 0.12, "standing": 0.96},
        ),
        candidate(
            "GapCombat__UnarmedJabCandidate",
            ["combat.unarmed.jab-cross"],
            [segment("ProLongbow__StandingMeleePunch", 0.05, 0.72, speed=1.24)],
            "compact source punch timing with explicit closed-fist derivative",
            modifiers={"fingerCurl": {"hands": ["Left", "Right"], "degrees": 58}},
            events={"contact": 0.43, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__UnarmedCrossCandidate",
            ["combat.unarmed.jab-cross"],
            [segment("ProLongbow__StandingMeleePunch", 0.0, 0.92, speed=0.92)],
            "heavier source punch timing with torso weight-transfer accent",
            modifiers={
                "fingerCurl": {"hands": ["Left", "Right"], "degrees": 58},
                "boneRotations": {"mixamorig:Spine2": [0.0, 0.0, -8.0]},
                "rotationEnvelope": "bell",
            },
            events={"contact": 0.52, "recovered": 0.97},
        ),
        candidate(
            "GapCombat__UnarmedBlockGuardCandidate",
            ["combat.unarmed.block"],
            [segment("ProMagic__StandingBlockIdle", 0.05, 0.95, speed=1.0)],
            "equipment-neutral guard derivative with closed hands and lowered magic silhouette",
            modifiers={
                "fingerCurl": {"hands": ["Left", "Right"], "degrees": 42},
                "boneRotations": {
                    "mixamorig:LeftForeArm": [0.0, 0.0, -10.0],
                    "mixamorig:RightForeArm": [0.0, 0.0, 10.0],
                },
                "rotationEnvelope": "constant",
            },
            events={"guardEstablished": 0.08, "guardReleased": 0.92},
        ),
        candidate(
            "GapCombat__UnarmedImpactRecoveryCandidate",
            ["combat.unarmed.impact-recovery"],
            [
                segment("ProMagic__StandingReactSmallFromFront", 0.0, 0.92, speed=1.1),
                segment("ProMagic__StandingReactSmallFromFront", 0.0, 0.65, reverse=True, speed=0.92),
            ],
            "equipment-neutral front impact followed by deterministic balanced recovery",
            modifiers={"fingerCurl": {"hands": ["Left", "Right"], "degrees": 28}},
            events={"impact": 0.16, "balanceRecovered": 0.94},
        ),
        candidate(
            "GapCombat__OneHandSwordGuardCandidate",
            ["combat.sword-one-hand.guard-idle"],
            [segment("ProSwordAndShield__SwordAndShieldIdle", 0.06, 0.94)],
            "sword guard with shield-side chain replaced by neutral free-offhand reference",
            modifiers={**neutral_left, **right_grip},
            events={"guardEstablished": 0.06},
        ),
        candidate(
            "GapCombat__OneHandSwordThrustCandidate",
            ["combat.sword-one-hand.thrust"],
            [segment("ProSwordAndShield__SwordAndShieldAttack3", 0.04, 0.82, speed=1.04)],
            "compact sword-and-shield attack derivative with neutral free offhand",
            modifiers={**neutral_left, **right_grip},
            events={"windup": 0.18, "contact": 0.49, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__OneHandSwordHorizontalCutCandidate",
            ["combat.sword-one-hand.horizontal-cut"],
            [segment("ProMeleeAxe__StandingMeleeAttackHorizontal", 0.03, 0.88, speed=1.08)],
            "one-hand horizontal source cut compacted for beginner sword semantics",
            modifiers={**neutral_left, **right_grip},
            events={"windup": 0.17, "contact": 0.51, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__OneHandSwordDrawHipCandidate",
            ["combat.sword-one-hand.draw-sheath"],
            [segment("ProSwordAndShield__DrawSword1", 0.0, 1.0, speed=1.0)],
            "hip draw with shield-side chain replaced by neutral free offhand",
            modifiers={**neutral_left, **right_grip},
            events={"socketRelease": 0.37, "gripEstablished": 0.58},
        ),
        candidate(
            "GapCombat__OneHandSwordSheathHipCandidate",
            ["combat.sword-one-hand.draw-sheath"],
            [segment("ProSwordAndShield__SheathSword1", 0.0, 1.0, speed=1.0)],
            "hip sheath with shield-side chain replaced by neutral free offhand",
            modifiers={**neutral_left, **right_grip},
            events={"socketAligned": 0.58, "gripReleased": 0.77},
        ),
        candidate(
            "GapCombat__ShieldBashCandidate",
            ["combat.sword-shield.shield-bash"],
            [segment("ProSwordAndShield__SwordAndShieldImpact", 0.0, 0.82, speed=1.12)],
            "shield-led impact source with deterministic short forward drive",
            modifiers={
                "fingerCurl": {"hands": ["Left", "Right"], "degrees": 34},
                "rootOffsetBodyHeights": [0.0, -0.11, 0.0],
                "rootOffsetEnvelope": "bell",
            },
            events={"shieldContact": 0.47, "recovered": 0.95},
        ),
        candidate(
            "GapCombat__GreatswordDrawBackCandidate",
            ["combat.greatsword.draw-stow"],
            [segment("GreatSword__DrawAGreatSword1", 0.0, 1.0)],
            "two-hand greatsword back draw source normalized to candidate contract",
            modifiers=both_grip,
            events={"socketRelease": 0.34, "supportGrip": 0.69},
        ),
        candidate(
            "GapCombat__GreatswordStowBackCandidate",
            ["combat.greatsword.draw-stow"],
            [segment("GreatSword__DrawAGreatSword1", 0.0, 1.0, reverse=True, speed=0.9)],
            "reverse verified back-draw path into matching back-stow candidate",
            modifiers=both_grip,
            events={"socketAligned": 0.66, "gripReleased": 0.88},
        ),
        candidate(
            "GapCombat__AxeRetainedDeathCandidate",
            ["combat.axe.death"],
            [segment("ProMagic__StandingReactDeathForward", 0.0, 1.0, speed=0.96)],
            "terminal forward collapse with right-hand axe grip retained",
            modifiers={"fingerCurl": {"hands": ["Right"], "degrees": 48}},
            events={"impact": 0.14, "terminal": 0.96},
            hold_last_frames=10,
        ),
        candidate(
            "GapCombat__BowDrawCancelCandidate",
            ["combat.bow.cancel"],
            [segment("ProLongbow__StandingDrawArrow", 0.08, 0.78, reverse=True, speed=0.9)],
            "reverse drawn-bow source segment to return arrow and settle without disarming bow",
            modifiers=both_grip,
            events={"tensionReleased": 0.22, "arrowReturned": 0.67, "idle": 0.96},
        ),
        candidate(
            "GapCombat__MagicInterruptCandidate",
            ["combat.magic.interrupt-cancel"],
            [
                segment("ProMagic__Standing2HCastSpell01", 0.0, 0.43, speed=1.0),
                segment("ProMagic__Standing2HCastSpell01", 0.0, 0.43, reverse=True, speed=1.18),
            ],
            "begin cast then reverse before release into balanced interrupt recovery",
            modifiers={"fingerCurl": {"hands": ["Left", "Right"], "degrees": 18}},
            events={"castBegins": 0.08, "interrupted": 0.49, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__MagicChannelLoopCandidate",
            ["combat.magic.channel"],
            [
                segment("ProMagic__Standing2HCastSpell01", 0.28, 0.61, speed=0.82),
                segment("ProMagic__Standing2HCastSpell01", 0.28, 0.61, reverse=True, speed=0.82),
            ],
            "ping-pong sustained middle-cast segment for interruptible channel review",
            events={"loopStart": 0.0, "channelPeak": 0.5, "loopEnd": 1.0},
        ),
        candidate(
            "GapCombat__SpellBlowbackCandidate",
            ["reaction.spell.blowback"],
            [segment("ProMagic__StandingReactDeathBackward", 0.0, 0.78, speed=1.15)],
            "trimmed nonterminal backward spell reaction with authored displacement",
            modifiers={
                "rootOffsetBodyHeights": [0.0, 0.34, 0.0],
                "rootOffsetEnvelope": "ramp",
                "jitter": {"bones": ["mixamorig:Spine1", "mixamorig:Spine2"], "degrees": 3.0, "cycles": 3.0},
            },
            events={"spellImpact": 0.09, "airborne": 0.27, "grounded": 0.94},
            hold_last_frames=5,
        ),
        candidate(
            "GapCombat__SpellKnockdownCandidate",
            ["reaction.spell.knockdown"],
            [segment("ProMagic__StandingReactDeathForward", 0.0, 0.73, speed=1.08)],
            "trim terminal forward reaction before terminal hold for recoverable spell knockdown",
            modifiers={"jitter": {"bones": ["mixamorig:Spine2"], "degrees": 2.0, "cycles": 2.0}},
            events={"spellImpact": 0.12, "grounded": 0.94},
            hold_last_frames=6,
        ),
        candidate(
            "GapCombat__SpellGetUpCandidate",
            ["reaction.spell.get-up"],
            [segment("ProMagic__StandingReactDeathForward", 0.0, 0.73, reverse=True, speed=0.86)],
            "reverse recoverable spell knockdown into prone-to-standing recovery",
            events={"leaveGround": 0.11, "standing": 0.96},
        ),
        candidate(
            "GapCombat__StaffGripIdleCandidate",
            ["combat.staff.grip-idle"],
            [segment("GreatSword__GreatSwordIdle", 0.05, 0.95)],
            "two-hand weapon idle retained as long-staff grip candidate",
            modifiers=both_grip,
            events={"gripEstablished": 0.0},
        ),
        candidate(
            "GapCombat__StaffBlockCandidate",
            ["combat.staff.guard-block"],
            [segment("GreatSword__GreatSwordBlocking", 0.0, 0.9, speed=1.0)],
            "two-hand weapon block retained as staff cross-body contact candidate",
            modifiers=both_grip,
            events={"guardEstablished": 0.14, "staffContact": 0.48, "recovered": 0.94},
        ),
        candidate(
            "GapCombat__StaffDrawBackCandidate",
            ["combat.staff.draw-stow"],
            [segment("GreatSword__DrawAGreatSword1", 0.0, 1.0, speed=0.92)],
            "back draw path retargeted semantically for long staff",
            modifiers=both_grip,
            events={"socketRelease": 0.33, "supportGrip": 0.7},
        ),
        candidate(
            "GapCombat__StaffStowBackCandidate",
            ["combat.staff.draw-stow"],
            [segment("GreatSword__DrawAGreatSword1", 0.0, 1.0, reverse=True, speed=0.84)],
            "reverse long-weapon draw path for staff back-stow",
            modifiers=both_grip,
            events={"socketAligned": 0.67, "gripReleased": 0.89},
        ),
        candidate(
            "GapCombat__StaffThrustCandidate",
            ["combat.staff.melee-family"],
            [segment("Interactions__HumanMasculineAthleticMuscularStaffButtSmash", 0.0, 0.82, speed=1.08)],
            "compact existing staff butt-smash path as forward thrust candidate",
            modifiers=both_grip,
            events={"windup": 0.16, "staffContact": 0.5, "recovered": 0.95},
        ),
        candidate(
            "GapCombat__StaffSweepCandidate",
            ["combat.staff.melee-family"],
            [segment("GreatSword__GreatSwordSlash3", 0.03, 0.88, speed=1.04)],
            "two-hand horizontal weapon slash retimed as broad staff sweep",
            modifiers=both_grip,
            events={"windup": 0.16, "staffContact": 0.52, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__StaffButtStrikeCandidate",
            ["combat.staff.melee-family"],
            [segment("Interactions__HumanMasculineAthleticMuscularStaffButtSmash", 0.0, 1.0)],
            "existing same-body staff-butt source normalized with explicit grip and event markers",
            modifiers=both_grip,
            events={"windup": 0.18, "staffContact": 0.55, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__StaffOverheadStrikeCandidate",
            ["combat.staff.melee-family"],
            [segment("ProMeleeAxe__StandingMeleeAttackDownward", 0.0, 0.9, speed=0.94)],
            "downward melee source converted to two-hand staff overhead candidate",
            modifiers=both_grip,
            events={"windup": 0.2, "staffContact": 0.58, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__StaffRecoveryCandidate",
            ["combat.staff.melee-family"],
            [segment("GreatSword__GreatSwordImpact", 0.0, 0.76, reverse=True, speed=0.86)],
            "reverse two-hand impact settling path into staff recovery candidate",
            modifiers=both_grip,
            events={"recoveryBegins": 0.05, "guardRestored": 0.94},
        ),
        candidate(
            "GapCombat__StaffChannelLoopCandidate",
            ["combat.staff.channel-cast"],
            [
                segment("GreatSword__GreatSwordCasting", 0.24, 0.68, speed=0.8),
                segment("GreatSword__GreatSwordCasting", 0.24, 0.68, reverse=True, speed=0.8),
            ],
            "two-hand weapon casting middle segment retained as staff-assisted channel loop",
            modifiers=both_grip,
            events={"loopStart": 0.0, "channelPeak": 0.5, "loopEnd": 1.0},
        ),
        candidate(
            "GapCombat__StaffCastReleaseCandidate",
            ["combat.staff.channel-cast"],
            [segment("GreatSword__GreatSwordCasting", 0.0, 1.0, speed=0.94)],
            "two-hand weapon cast retained as staff-assisted lower-level release candidate",
            modifiers=both_grip,
            events={"channelEstablished": 0.3, "release": 0.66, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__MaceGuardCandidate",
            ["combat.mace.lower-level"],
            [segment("ProMeleeAxe__StandingIdle", 0.05, 0.95)],
            "one-hand axe idle reused only as impact-weapon mace guard candidate",
            modifiers=right_grip,
            events={"guardEstablished": 0.0},
        ),
        candidate(
            "GapCombat__MaceCompactStrikeCandidate",
            ["combat.mace.lower-level"],
            [segment("ProMeleeAxe__StandingMeleeAttackDownward", 0.08, 0.82, speed=1.16)],
            "shortened one-hand impact strike with explicit mace contact and recovery",
            modifiers=right_grip,
            events={"windup": 0.16, "maceContact": 0.49, "recovered": 0.95},
        ),
        candidate(
            "GapCombat__MaceBlockCandidate",
            ["combat.mace.lower-level"],
            [segment("ProMeleeAxe__StandingBlockIdle", 0.0, 0.9)],
            "one-hand impact-weapon block retained as mace block candidate",
            modifiers=right_grip,
            events={"guardEstablished": 0.08, "weaponContact": 0.48, "recovered": 0.94},
        ),
        candidate(
            "GapCombat__KnifeGuardCandidate",
            ["combat.knife.lower-level"],
            [segment("ProLongbow__UnarmedIdle01", 0.05, 0.95)],
            "unarmed guard compacted with right-hand forward knife grip",
            modifiers={
                "fingerCurl": {"hands": ["Right"], "degrees": 46},
                "boneRotations": {"mixamorig:RightForeArm": [0.0, 0.0, -12.0]},
                "rotationEnvelope": "constant",
            },
            events={"guardEstablished": 0.0},
        ),
        candidate(
            "GapCombat__KnifeCloseStrikeCandidate",
            ["combat.knife.lower-level"],
            [segment("ProMeleeAxe__StandingMeleeAttackBackhand", 0.12, 0.68, speed=1.34)],
            "compact backhand source limited to close ritual-knife range",
            modifiers={
                "neutralizeGroups": ["left_arm"],
                "fingerCurl": {"hands": ["Right"], "degrees": 46},
                "blendGroupsToNeutral": {"right_arm": 0.28, "spine": 0.18},
            },
            events={"windup": 0.14, "knifeContact": 0.48, "recovered": 0.95},
        ),
        candidate(
            "GapCombat__KnifeCurseGestureCandidate",
            ["combat.knife.lower-level"],
            [segment("ProMagic__Standing1HCastSpell01", 0.05, 0.9, speed=0.94)],
            "one-hand lower-level cast with persistent right-hand knife grip",
            modifiers=right_grip,
            events={"curseCommand": 0.43, "release": 0.68, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__PairedDaggersGuardCandidate",
            ["combat.daggers.paired"],
            [segment("ProLongbow__UnarmedIdle01", 0.05, 0.95)],
            "unarmed combat idle with both hands converted to forward dagger grips",
            modifiers={"fingerCurl": {"hands": ["Left", "Right"], "degrees": 46}},
            events={"guardEstablished": 0.0},
        ),
        candidate(
            "GapCombat__PairedDaggersAlternatingStrikeCandidate",
            ["combat.daggers.paired"],
            [segment("ProMeleeAxe__StandingMeleeComboAttackVer1", 0.04, 0.88, speed=1.18)],
            "multi-hit melee source with both hands converted to paired dagger grips",
            modifiers={"fingerCurl": {"hands": ["Left", "Right"], "degrees": 46}},
            events={"rightContact": 0.31, "leftContact": 0.59, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__RodGripIdleCandidate",
            ["combat.rod.lower-level"],
            [segment("ProMagic__StandingIdle02", 0.05, 0.95)],
            "one-hand magic idle with persistent focus-rod grip",
            modifiers=right_grip,
            events={"gripEstablished": 0.0},
        ),
        candidate(
            "GapCombat__RodCommandCandidate",
            ["combat.rod.lower-level"],
            [segment("Interactions__HumanMasculineAthleticMuscularPointGesture", 0.0, 1.0)],
            "same-body command gesture with right-hand focus-rod grip",
            modifiers=right_grip,
            events={"command": 0.52, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__RodSummonReleaseCandidate",
            ["combat.rod.lower-level"],
            [segment("ProMagic__Standing1HMagicAttack01", 0.0, 0.92, speed=0.94)],
            "one-hand magic release with retained focus-rod grip",
            modifiers=right_grip,
            events={"summonRelease": 0.61, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__RodChannelLoopCandidate",
            ["combat.rod.lower-level"],
            [
                segment("ProMagic__Standing1HCastSpell01", 0.27, 0.62, speed=0.82),
                segment("ProMagic__Standing1HCastSpell01", 0.27, 0.62, reverse=True, speed=0.82),
            ],
            "ping-pong one-hand cast middle segment with persistent focus-rod grip",
            modifiers=right_grip,
            events={"loopStart": 0.0, "channelPeak": 0.5, "loopEnd": 1.0},
        ),
        candidate(
            "GapCombat__RodInterruptRecoveryCandidate",
            ["combat.rod.lower-level"],
            [
                segment("ProMagic__Standing1HCastSpell01", 0.0, 0.44),
                segment("ProMagic__Standing1HCastSpell01", 0.0, 0.44, reverse=True, speed=1.14),
            ],
            "begin one-hand rod cast then reverse before release into recovery",
            modifiers=right_grip,
            events={"interrupted": 0.5, "recovered": 0.96},
        ),
        candidate(
            "GapCombat__BurningDeathCandidate",
            ["death.status-elemental"],
            [segment("ProMagic__StandingReactDeathBackward", 0.0, 1.0, speed=1.08)],
            "backward terminal source with fading torso/arm convulsion for burning review",
            modifiers={
                "jitter": {
                    "bones": ["mixamorig:Spine1", "mixamorig:Spine2", "mixamorig:LeftArm", "mixamorig:RightArm"],
                    "degrees": 5.0,
                    "cycles": 5.0,
                }
            },
            events={"statusPeak": 0.34, "terminal": 0.96},
            hold_last_frames=10,
        ),
        candidate(
            "GapCombat__FreezingDeathCandidate",
            ["death.status-elemental"],
            [segment("ProMagic__StandingReactDeathForward", 0.0, 1.0, speed=0.62)],
            "slow forward terminal source with extended rigid end hold for freezing review",
            modifiers={"fingerCurl": {"hands": ["Left", "Right"], "degrees": 18}},
            events={"freezeLock": 0.62, "terminal": 0.9},
            hold_last_frames=24,
        ),
        candidate(
            "GapCombat__ElectricalDeathCandidate",
            ["death.status-elemental"],
            [segment("ProMagic__StandingReactDeathLeft", 0.0, 1.0, speed=1.28)],
            "left terminal source with high-frequency spine/limb impulse for electrical review",
            modifiers={
                "jitter": {
                    "bones": ["mixamorig:Spine2", "mixamorig:LeftForeArm", "mixamorig:RightForeArm"],
                    "degrees": 7.0,
                    "cycles": 9.0,
                }
            },
            events={"statusPeak": 0.28, "terminal": 0.96},
            hold_last_frames=8,
        ),
        candidate(
            "GapCombat__PoisonDeathCandidate",
            ["death.status-elemental"],
            [segment("ProMagic__StandingReactDeathRight", 0.0, 1.0, speed=0.68)],
            "slow right terminal source with sustained torso curl for poison review",
            modifiers={
                "boneRotations": {
                    "mixamorig:Spine1": [10.0, 0.0, -5.0],
                    "mixamorig:Spine2": [7.0, 0.0, 5.0],
                },
                "rotationEnvelope": "ramp",
            },
            events={"statusPeak": 0.55, "terminal": 0.96},
            hold_last_frames=12,
        ),
        candidate(
            "GapCombat__VoidDeathCandidate",
            ["death.status-elemental"],
            [segment("ProLongbow__StandingDeathBackward01", 0.0, 1.0, speed=0.9)],
            "backward terminal source with inward shoulder collapse for void review",
            modifiers={
                "boneRotations": {
                    "mixamorig:LeftShoulder": [0.0, 0.0, -12.0],
                    "mixamorig:RightShoulder": [0.0, 0.0, 12.0],
                    "mixamorig:Spine2": [8.0, 0.0, 0.0],
                },
                "rotationEnvelope": "ramp",
            },
            events={"statusPeak": 0.52, "terminal": 0.96},
            hold_last_frames=12,
        ),
    ]
    names = [spec["name"] for spec in specs]
    if len(names) != len(set(names)):
        raise RuntimeError("Candidate specification contains duplicate names")
    return specs


def validate_armature(armature: bpy.types.Object, source: Path) -> None:
    if len(armature.data.bones) != EXPECTED_BONES:
        raise RuntimeError(f"{source.name}: expected {EXPECTED_BONES} bones, got {len(armature.data.bones)}")
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if roots != [EXPECTED_ROOT]:
        raise RuntimeError(f"{source.name}: unexpected root bones {roots}")


def rest_pose(armature: bpy.types.Object) -> dict[str, tuple[float, ...]]:
    return {
        bone.name: tuple(round(value, 7) for row in bone.matrix_local for value in row)
        for bone in armature.data.bones
    }


def rest_difference(
    authority: dict[str, tuple[float, ...]],
    candidate_pose: dict[str, tuple[float, ...]],
) -> float:
    if authority.keys() != candidate_pose.keys():
        missing = sorted(authority.keys() - candidate_pose.keys())
        extra = sorted(candidate_pose.keys() - authority.keys())
        raise RuntimeError(f"Bone-name mismatch; missing={missing}, extra={extra}")
    return max(
        abs(left - right)
        for name in authority
        for left, right in zip(authority[name], candidate_pose[name])
    )


def set_frame(frame: float) -> None:
    integer = math.floor(frame)
    bpy.context.scene.frame_set(integer, subframe=frame - integer)
    bpy.context.view_layer.update()


def disable_nla(armature: bpy.types.Object) -> None:
    armature.animation_data_create()
    for track in armature.animation_data.nla_tracks:
        track.mute = True
    armature.animation_data.action = None


def evaluate_action(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    frame: float,
) -> dict[str, Matrix]:
    armature.animation_data.action = action
    set_frame(frame)
    return {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}


def sample_frames(action: bpy.types.Action, count: int = FINGERPRINT_SAMPLES) -> list[float]:
    start, end = [float(value) for value in action.frame_range]
    if count <= 1 or math.isclose(start, end):
        return [start]
    return [start + (end - start) * index / (count - 1) for index in range(count)]


def action_pose_hash(armature: bpy.types.Object, action: bpy.types.Action) -> str:
    digest = sha256()
    digest.update(action.name.encode("utf-8"))
    for frame in sample_frames(action):
        digest.update(struct.pack("<d", frame))
        matrices = evaluate_action(armature, action, frame)
        for name in sorted(matrices):
            digest.update(name.encode("utf-8"))
            for row in matrices[name]:
                for value in row:
                    digest.update(struct.pack("<f", round(float(value), 6)))
    return digest.hexdigest().upper()


def bone_group(armature: bpy.types.Object, group: str) -> list[str]:
    names = [bone.name for bone in armature.pose.bones]
    groups = {
        "left_arm": [
            "mixamorig:LeftShoulder",
            "mixamorig:LeftArm",
            "mixamorig:LeftForeArm",
            "mixamorig:LeftHand",
            *[name for name in names if name.startswith("mixamorig:LeftHand") and name != "mixamorig:LeftHand"],
        ],
        "right_arm": [
            "mixamorig:RightShoulder",
            "mixamorig:RightArm",
            "mixamorig:RightForeArm",
            "mixamorig:RightHand",
            *[name for name in names if name.startswith("mixamorig:RightHand") and name != "mixamorig:RightHand"],
        ],
        "spine": ["mixamorig:Spine", "mixamorig:Spine1", "mixamorig:Spine2"],
    }
    if group not in groups:
        raise KeyError(f"Unknown bone group {group}")
    return [name for name in groups[group] if name in armature.pose.bones]


def blend_matrix(source: Matrix, reference: Matrix, weight: float) -> Matrix:
    source_location, source_rotation, source_scale = source.decompose()
    reference_location, reference_rotation, reference_scale = reference.decompose()
    location = source_location.lerp(reference_location, weight)
    rotation = source_rotation.slerp(reference_rotation, weight)
    scale = source_scale.lerp(reference_scale, weight)
    return Matrix.LocRotScale(location, rotation, scale)


def envelope(kind: str, progress: float) -> float:
    if kind == "constant":
        return 1.0
    if kind == "ramp":
        return progress
    if kind == "bell":
        return math.sin(math.pi * progress)
    raise ValueError(f"Unknown envelope {kind}")


def modify_pose(
    armature: bpy.types.Object,
    matrices: dict[str, Matrix],
    neutral: dict[str, Matrix],
    modifiers: dict[str, Any],
    progress: float,
    body_height: float,
) -> dict[str, Matrix]:
    result = {name: matrix.copy() for name, matrix in matrices.items()}
    for group in modifiers.get("neutralizeGroups", []):
        for name in bone_group(armature, group):
            result[name] = neutral[name].copy()
    for group, weight in modifiers.get("blendGroupsToNeutral", {}).items():
        for name in bone_group(armature, group):
            result[name] = blend_matrix(result[name], neutral[name], float(weight))

    curl = modifiers.get("fingerCurl")
    if curl:
        for hand in curl["hands"]:
            prefix = f"mixamorig:{hand}Hand"
            for name in result:
                if not name.startswith(prefix) or name == prefix:
                    continue
                degrees = float(curl["degrees"]) * (0.55 if "Thumb" in name else 1.0)
                result[name] = result[name] @ Matrix.Rotation(math.radians(degrees), 4, "Z")

    rotation_factor = envelope(modifiers.get("rotationEnvelope", "constant"), progress)
    for name, degrees_xyz in modifiers.get("boneRotations", {}).items():
        if name not in result:
            raise RuntimeError(f"Modifier references missing bone {name}")
        rotation = Quaternion((1.0, 0.0, 0.0, 0.0))
        for axis, degrees in zip(
            (Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), Vector((0.0, 0.0, 1.0))),
            degrees_xyz,
        ):
            rotation @= Quaternion(axis, math.radians(float(degrees) * rotation_factor))
        result[name] = result[name] @ rotation.to_matrix().to_4x4()

    root_offset = modifiers.get("rootOffsetBodyHeights")
    if root_offset:
        factor = envelope(modifiers.get("rootOffsetEnvelope", "ramp"), progress)
        matrix = result[EXPECTED_ROOT].copy()
        matrix.translation += Vector(root_offset) * body_height * factor
        result[EXPECTED_ROOT] = matrix

    jitter = modifiers.get("jitter")
    if jitter:
        wave = math.sin(progress * float(jitter["cycles"]) * math.tau)
        fade = math.sin(math.pi * min(progress / 0.92, 1.0))
        angle = math.radians(float(jitter["degrees"]) * wave * fade)
        for name in jitter["bones"]:
            if name in result:
                result[name] = result[name] @ Matrix.Rotation(angle, 4, "X")
    return result


def timeline_for(spec: dict[str, Any], actions: dict[str, bpy.types.Action]) -> list[tuple[str, float]]:
    timeline: list[tuple[str, float]] = []
    for segment_index, item in enumerate(spec["segments"]):
        action = actions[item["action"]]
        action_start, action_end = [float(value) for value in action.frame_range]
        start = action_start + (action_end - action_start) * float(item["startFraction"])
        end = action_start + (action_end - action_start) * float(item["endFraction"])
        if item["reverse"]:
            start, end = end, start
        samples = max(2, int(round(abs(end - start) / float(item["speed"]))) + 1)
        frames = [start + (end - start) * index / (samples - 1) for index in range(samples)]
        if segment_index:
            frames = frames[1:]
        timeline.extend((item["action"], frame) for frame in frames)
    if not timeline:
        raise RuntimeError(f"{spec['name']}: empty timeline")
    timeline.extend([timeline[-1]] * int(spec["holdLastFrames"]))
    return timeline


def key_pose(armature: bpy.types.Object, matrices: dict[str, Matrix], frame: int) -> None:
    for bone in armature.pose.bones:
        bone.matrix_basis = matrices[bone.name]
        location, rotation, scale = bone.matrix_basis.decompose()
        bone.location = location
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = rotation
        bone.scale = scale
        bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone.name)
        bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)


def import_source(path: Path) -> tuple[bpy.types.Object, dict[str, bpy.types.Action]]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"{path.name}: expected one armature, got {len(armatures)}")
    armature = armatures[0]
    validate_armature(armature, path)
    actions = {action.name: action for action in bpy.data.actions}
    if len(actions) != EXPECTED_SOURCE_ACTIONS:
        raise RuntimeError(f"{path.name}: expected {EXPECTED_SOURCE_ACTIONS} actions, got {len(actions)}")
    disable_nla(armature)
    return armature, actions


def attach_candidate_tracks(armature: bpy.types.Object, actions: list[bpy.types.Action]) -> None:
    armature.animation_data_create()
    armature.animation_data.action = None
    for track in list(armature.animation_data.nla_tracks):
        armature.animation_data.nla_tracks.remove(track)
    for action in actions:
        action.use_fake_user = True
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, int(action.frame_range[0]), action)
        strip.action_frame_start = action.frame_range[0]
        strip.action_frame_end = action.frame_range[1]


def relative_path(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def display_label(action_name: str) -> str:
    value = action_name.removeprefix("GapCombat__").removesuffix("Candidate")
    words: list[str] = []
    current = ""
    for character in value:
        if current and character.isupper() and not current[-1].isupper():
            words.append(current)
            current = character
        else:
            current += character
    if current:
        words.append(current)
    return " ".join(words)


def preview_contract(spec: dict[str, Any], frames: int) -> dict[str, Any]:
    name = spec["name"]
    events = spec["events"]
    loop = ("loopStart" in events and "loopEnd" in events) or any(
        token in name for token in ("IdleCandidate", "GuardCandidate")
    )
    duration = frames / FPS
    if loop:
        recommended_duration = max(4.0, min(8.0, duration * 2.0))
    else:
        recommended_duration = max(2.5, min(8.0, duration + 1.0))
    if any(token in name for token in ("Death", "Knockdown", "GetUp", "Blowback")):
        framing = "neutral accepted-body full-body three-quarter view with the floor and complete displacement visible"
    elif any(token in name for token in ("Draw", "Stow", "Sheath", "Grip", "Staff", "Sword", "Mace", "Knife", "Dagger", "Rod", "Bow", "Shield")):
        framing = "neutral accepted-body full-body three-quarter view, hands and equipment sockets unobstructed"
    else:
        framing = "neutral accepted-body full-body gameplay three-quarter view, hands and feet visible"
    return {
        "playIntent": "LOOP" if loop else "ONE_SHOT",
        "recommendedDurationSeconds": round(recommended_duration, 2),
        "recommendedCameraFraming": framing,
        "chatPreviewRequired": True,
        "ownerVerdictRequiredBeforeBreachV2": True,
    }


def main() -> None:
    args = parse_args()
    source = Path(args.source_glb).resolve()
    output = Path(args.output_glb).resolve()
    report_path = Path(args.report).resolve()
    repository_root = Path.cwd().resolve()
    script_path = Path(__file__).resolve()
    for path in (source, script_path):
        if not path.is_file():
            raise FileNotFoundError(path)
    if file_sha256(source) != EXPECTED_SOURCE_SHA256:
        raise RuntimeError("Immutable source-library SHA-256 drifted")
    output.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    specs = candidate_specs()
    armature, source_actions = import_source(source)
    source_action_names = sorted({item["action"] for spec in specs for item in spec["segments"]})
    missing = sorted(set(source_action_names) - set(source_actions))
    if missing:
        raise RuntimeError(f"Required source actions are missing: {missing}")
    authority_pose = rest_pose(armature)
    body_height = max(bone.tail_local.z for bone in armature.data.bones) - min(
        bone.head_local.z for bone in armature.data.bones
    )
    if body_height <= 0:
        raise RuntimeError(f"Invalid armature height {body_height}")
    neutral_action = source_actions[NEUTRAL_ACTION]
    neutral = evaluate_action(armature, neutral_action, float(neutral_action.frame_range[0]))
    source_hashes = {
        name: action_pose_hash(armature, source_actions[name]) for name in source_action_names
    }

    records: list[dict[str, Any]] = []
    generated_actions: list[bpy.types.Action] = []
    for index, spec in enumerate(specs, start=1):
        timeline = timeline_for(spec, source_actions)
        output_action = bpy.data.actions.new(spec["name"])
        output_action.use_fake_user = True
        generated_actions.append(output_action)
        for output_frame, (source_name, source_frame) in enumerate(timeline, start=1):
            sampled = evaluate_action(armature, source_actions[source_name], source_frame)
            progress = (output_frame - 1) / max(1, len(timeline) - 1)
            matrices = modify_pose(
                armature,
                sampled,
                neutral,
                spec["modifiers"],
                progress,
                body_height,
            )
            armature.animation_data.action = output_action
            key_pose(armature, matrices, output_frame)
        armature.animation_data.action = None
        event_frames = {
            name: 1 + round(fraction * (len(timeline) - 1))
            for name, fraction in spec["events"].items()
        }
        transform_plan = {
            "description": spec["transform"],
            "segments": spec["segments"],
            "modifiers": spec["modifiers"],
            "holdLastFrames": spec["holdLastFrames"],
            "eventFrames": event_frames,
        }
        preview = preview_contract(spec, len(timeline))
        records.append(
            {
                "name": spec["name"],
                "displayLabel": display_label(spec["name"]),
                "derivedActionName": spec["name"],
                "requirementIds": spec["requirementIds"],
                "semanticRowIds": spec["requirementIds"],
                "status": "UNREVIEWED_SOURCE_DERIVED_CANDIDATE",
                "sourceActions": [
                    {
                        **item,
                        "sampledPoseSha256": source_hashes[item["action"]],
                        "sampleCount": FINGERPRINT_SAMPLES,
                    }
                    for item in spec["segments"]
                ],
                "transformPlan": transform_plan,
                "transformPlanSha256": stable_hash(transform_plan),
                "preExportSampledPoseSha256": action_pose_hash(armature, output_action),
                "frameRange": [float(value) for value in output_action.frame_range],
                "frames": len(timeline),
                "fps": FPS,
                "events": event_frames,
                "playIntent": preview["playIntent"],
                "recommendedPreview": preview,
                "remainingGates": [
                    "NEUTRAL_ACCEPTED_BODY_CHAT_PREVIEW",
                    "OWNER_APPROVE_REJECT_OR_CHANGE",
                    "NORMAL_SPEED_VISUAL_REVIEW",
                    "HAND_AND_WEAPON_CONTACT_REVIEW",
                    "MESH_DEFORMATION_REVIEW",
                    "BREACH_V2_RUNTIME_GROUNDING",
                    "OWNER_ACCEPTANCE",
                ],
            }
        )
        print(f"COMBAT_GAP_PROGRESS={index}/{len(specs)} {spec['name']}")

    attach_candidate_tracks(armature, generated_actions)
    bpy.context.scene.render.fps = FPS
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
        export_frame_step=1,
        export_skins=True,
        export_def_bones=False,
        export_leaf_bone=False,
        export_materials="NONE",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
    )

    expected_names = sorted(action.name for action in generated_actions)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(output))
    reimport_armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(reimport_armatures) != 1:
        raise RuntimeError(f"Output re-import expected one armature, got {len(reimport_armatures)}")
    reimport_armature = reimport_armatures[0]
    validate_armature(reimport_armature, output)
    reimport_actions = {action.name: action for action in bpy.data.actions}
    if sorted(reimport_actions) != expected_names:
        missing_names = sorted(set(expected_names) - set(reimport_actions))
        extra_names = sorted(set(reimport_actions) - set(expected_names))
        raise RuntimeError(f"Output action mismatch; missing={missing_names}, extra={extra_names}")
    disable_nla(reimport_armature)
    maximum_rest_difference = rest_difference(authority_pose, rest_pose(reimport_armature))
    if maximum_rest_difference > MAXIMUM_REST_DIFFERENCE:
        raise RuntimeError(f"Output rest skeleton drifted by {maximum_rest_difference:.8f}")
    reimport_hashes = {
        name: action_pose_hash(reimport_armature, reimport_actions[name]) for name in expected_names
    }
    for record in records:
        record["reimportSampledPoseSha256"] = reimport_hashes[record["name"]]

    required_ids = sorted({requirement for record in records for requirement in record["requirementIds"]})
    output_receipt = {
        "path": relative_path(output, repository_root),
        "bytes": output.stat().st_size,
        "sha256": file_sha256(output),
        "actionCount": len(expected_names),
    }
    report = {
        "schemaVersion": 1,
        "issue": 487,
        "status": "UNREVIEWED_SOURCE_DERIVED_CANDIDATES",
        "acceptanceClaim": "NONE",
        "generator": {
            "path": relative_path(script_path, repository_root),
            "sha256": file_sha256(script_path),
            "blenderVersion": bpy.app.version_string,
            "blenderBuildHash": bpy.app.build_hash.decode("utf-8"),
            "blenderBuildDate": bpy.app.build_date.decode("utf-8"),
            "blenderBuildTime": bpy.app.build_time.decode("utf-8"),
        },
        "sourceLibrary": {
            "path": relative_path(source, repository_root),
            "bytes": source.stat().st_size,
            "sha256": file_sha256(source),
            "actionCount": EXPECTED_SOURCE_ACTIONS,
            "selectedSourceActionCount": len(source_action_names),
            "selectedSourceActions": [
                {
                    "name": name,
                    "sampledPoseSha256": source_hashes[name],
                    "sampleCount": FINGERPRINT_SAMPLES,
                }
                for name in source_action_names
            ],
        },
        "skeleton": {
            "family": "mixamo-standard-65",
            "boneCount": EXPECTED_BONES,
            "rootBones": [EXPECTED_ROOT],
            "bodyHeightArmatureUnits": body_height,
            "reimportStatus": "PASS",
            "reimportBoneCount": len(reimport_armature.data.bones),
            "reimportRootBones": [
                bone.name for bone in reimport_armature.data.bones if bone.parent is None
            ],
            "maximumRestDifference": maximum_rest_difference,
            "maximumAllowedRestDifference": MAXIMUM_REST_DIFFERENCE,
        },
        "output": output_receipt,
        "requirementIds": required_ids,
        "candidateCount": len(records),
        "candidates": records,
        "promotionOrder": [
            "GENERATE_SOURCE_DERIVED_CANDIDATE",
            "RENDER_NEUTRAL_ACCEPTED_BODY_CHAT_PREVIEW",
            "OWNER_APPROVE_REJECT_OR_CHANGE",
            "QUEUE_ONLY_OWNER_APPROVED_CANDIDATES_FOR_BREACH_V2_EXHAUSTIVE_REVIEW",
        ],
        "globalRemainingGates": [
            "GAP_LEDGER_INTEGRATION",
            "NEUTRAL_ACCEPTED_BODY_CHAT_PREVIEW",
            "OWNER_APPROVE_REJECT_OR_CHANGE",
            "NORMAL_SPEED_EXHAUSTIVE_REVIEW",
            "EQUIPMENT_SOCKET_AND_CONTACT_PROOF",
            "MESH_DEFORMATION_PROOF",
            "BREACH_V2_REAL_GAME_GROUNDING",
            "INDEPENDENT_VERIFICATION",
            "OWNER_ACCEPTANCE",
        ],
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        "ISSUE_487_COMBAT_GAP_CANDIDATES="
        + json.dumps(
            {
                "candidateCount": len(records),
                "requirementCount": len(required_ids),
                "outputSha256": output_receipt["sha256"],
                "reimport": "PASS",
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
