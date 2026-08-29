"""Author issue-487 combat, weapon, reaction, and spell candidates from rest.

This builder imports the verified Mixamo-standard Human pilot container only to
obtain its 65-bone rest skeleton.  It removes every imported action before any
frame is evaluated.  All output motion is created here from original key poses,
Blender IK targets, virtual equipment/contact constraints, and deterministic
timing.  It never samples, copies, reverses, splices, overlays, or relabels a
Mixamo/source clip.

Run with the cached Blender receipt:

    blender --background --python scripts/build-human-animation-authored-combat-spell.py -- \
      --rest-rig-glb public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb \
      --only StaffThrust \
      --output-glb H:/CodexData/souldrifter-toolchain/evidence/487/animation-candidates/combat-spell/combat-staff-thrust-v8/candidate.glb \
      --report H:/CodexData/souldrifter-toolchain/evidence/487/animation-candidates/combat-spell/combat-staff-thrust-v8/provenance-report.json
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


EXPECTED_REST_RIG_SHA256 = "B86F7378ADA29FF11E0FBC030D438FE241B8D4A74C47AFD37CC8ACED28C5FF81"
EXPECTED_IMPORTED_ACTIONS = 0
EXPECTED_BONES = 65
EXPECTED_ROOT = "mixamorig:Hips"
FPS = 30
MAXIMUM_REST_DIFFERENCE = 0.001
MAXIMUM_IK_TARGET_ERROR = 0.018
MAXIMUM_PLANTED_FOOT_ERROR = 0.018
MAXIMUM_FLOOR_ERROR = 0.012
MAXIMUM_STAFF_GRIP_ERROR = 0.006
MAXIMUM_STAFF_AXIS_DELTA_DEGREES = 5.0
MAXIMUM_BONE_QUATERNION_DELTA_DEGREES = 45.0
MINIMUM_STAFF_TIP_TO_TORSO_TRAVEL_RATIO = 2.0
FINGERPRINT_SAMPLES = 17
QUARANTINE_ROOT = Path(
    r"H:\CodexData\souldrifter-toolchain\evidence\487\animation-candidates\combat-spell"
).resolve()

LEFT_HAND = "mixamorig:LeftHand"
RIGHT_HAND = "mixamorig:RightHand"
LEFT_FOOT = "mixamorig:LeftFoot"
RIGHT_FOOT = "mixamorig:RightFoot"
LEFT_TOE = "mixamorig:LeftToeBase"
RIGHT_TOE = "mixamorig:RightToeBase"


REFERENCE_LIBRARY: dict[str, dict[str, str]] = {
    "boxing": {
        "title": "FightCamp - How to Punch: Jab & Cross Beginner Boxing Tutorial",
        "url": "https://www.youtube.com/watch?v=YsFK1MMDQgk",
        "timeRange": "00:00-end; jab and cross instruction and demonstrations",
    },
    "stage_fall": {
        "title": "Weapons of Choice - Stage Falls and Rolls for Actors",
        "url": "https://weaponsofchoice.com/the-textbook-of-stage-combat/foundations-of-staged-violence/unarmed-stage-combat/falls/",
        "timeRange": "Back fall, side fall, and forward fall sections (static reference)",
    },
    "technical_stand": {
        "title": "Ricardo Liborio - Technical Stand Up",
        "url": "https://www.blackbeltdrills.com/brazilian-jiu-jitsu-1/videos/liborio-technical-stand-up",
        "timeRange": "00:00-02:52",
    },
    "sword": {
        "title": "HEMA 101 - Meyer's Longsword Guards and Cuts",
        "url": "https://www.hema101.com/post/meyer-s-longsword-101-chapters-1-4",
        "timeRange": "Guards and cuts sections; horizontal-cut embedded clip begins at 00:36",
    },
    "sword_draw": {
        "title": "Shogo - How To Draw And Sheath A Katana",
        "url": "https://www.youtube.com/watch?v=K32WUvb_6Tc",
        "timeRange": "00:00-end; draw, controlled blade path, and sheath demonstrations",
    },
    "staff_grip": {
        "title": "UltimateTraining - Bo Staff Class for Complete Beginners",
        "url": "https://www.youtube.com/watch?v=FSNDsw1U6oc",
        "timeRange": "08:18-12:54; traditional grip and front stance",
    },
    "staff_overhead": {
        "title": "UltimateTraining - Bo Staff Class for Complete Beginners",
        "url": "https://www.youtube.com/watch?v=FSNDsw1U6oc",
        "timeRange": "12:55-17:59; overhead front strike",
    },
    "staff_sweep": {
        "title": "UltimateTraining - Bo Staff Class for Complete Beginners",
        "url": "https://www.youtube.com/watch?v=FSNDsw1U6oc",
        "timeRange": "18:51-22:21; rib-level horizontal strike and stance",
    },
    "staff_thrust": {
        "title": "UltimateTraining - Bo Staff Class for Complete Beginners",
        "url": "https://www.youtube.com/watch?v=FSNDsw1U6oc",
        "timeRange": "24:26-27:59; straight front thrust and recovery",
    },
    "archery_letdown": {
        "title": "Genesis Bow Owner's Manual",
        "url": "https://nj.gov/dep/fgw/pdf/education/nasp_genesis_manual.pdf",
        "timeRange": "PDF p.4, letting-down sequence (static reference)",
    },
    "knife": {
        "title": "Pekiti Tirsia International - Advanced Hand vs Knife, Part 2",
        "url": "https://pekiti.com/en-ca/blogs/news/pti-advanced-hand-vs-knife-part-2",
        "timeRange": "Embedded hammer-grip slash and thrust demonstrations (full clips)",
    },
    "mime": {
        "title": "Trinity College London - Guidance on Mime",
        "url": "https://learn.trinitycollege.co.uk/hubfs/Drama/DRAMA_2020_ACTING/PDFS/Guidance%20on%20mime.pdf",
        "timeRange": "PDF p.2, fixed-point and unseen-object response exercises",
    },
    "conducting": {
        "title": "The Conducting Manual of the Basic Music Course",
        "url": "https://www.churchofjesuschrist.org/bc/content/shared/english/pdf/callings/music/conducting-course/33619_eng.pdf",
        "timeRange": "Cutoff, release, preparation, and sustained-beat gesture diagrams",
    },
    "stage_reaction": {
        "title": "American Theatre Wing - Fight Direction Master Class",
        "url": "https://americantheatrewing.org/video/fight-direction-dave-anzuelo-master-class-series/",
        "timeRange": "00:00-end; staged action, readable reaction, balance, and recovery",
    },
}


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--rest-rig-glb", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--only", help="Build one authored slug, for example StaffThrust")
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def stable_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"))
    return sha256(payload.encode("utf-8")).hexdigest().upper()


def key(
    at: float,
    *,
    root: tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotations: dict[str, tuple[float, float, float]] | None = None,
    hands: dict[str, tuple[float, float, float]] | None = None,
    feet: dict[str, tuple[float, float, float]] | None = None,
    foot_pitches: dict[str, float] | None = None,
    grounding: str = "PLANTED",
    grip: int = 36,
    hands_follow_root: bool = True,
) -> dict[str, Any]:
    return {
        "at": at,
        "root": list(root),
        "rotations": {name: list(value) for name, value in (rotations or {}).items()},
        "hands": {name: list(value) for name, value in (hands or {}).items()},
        "feet": {name: list(value) for name, value in (feet or {}).items()},
        "footPitchDegrees": dict(foot_pitches or {}),
        "grounding": grounding,
        "gripDegrees": grip,
        "handsFollowRoot": hands_follow_root,
    }


def interpolate_number(start: float, end: float, amount: float) -> float:
    return start + (end - start) * amount


def interpolate_tuple(
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    amount: float,
) -> tuple[float, float, float]:
    return tuple(interpolate_number(a, b, amount) for a, b in zip(start, end))


def smoothstep(amount: float) -> float:
    clamped = max(0.0, min(1.0, amount))
    return clamped * clamped * (3.0 - 2.0 * clamped)


def staff_thrust_v8_keys() -> list[dict[str, Any]]:
    """Author v8 from clean rest with a readable load, drive, impact, and recovery."""
    duration = 48
    phases = [
        {"frame": 1, "left": (0.125, 0.160, -0.320), "right": (-0.150, 0.070, -0.110), "root": (-0.005, -0.065, -0.040), "hips": (3.0, 0.0, 2.0), "spine": (4.0, 0.0, 2.0), "spine1": (3.0, 0.0, 1.0), "spine2": (2.0, 0.0, 1.0), "heelPitch": 0.0},
        {"frame": 5, "left": (0.125, 0.162, -0.320), "right": (-0.150, 0.070, -0.110), "root": (-0.005, -0.068, -0.040), "hips": (3.0, 0.0, 2.0), "spine": (4.0, 0.0, 2.0), "spine1": (3.0, 0.0, 1.0), "spine2": (2.0, 0.0, 1.0), "heelPitch": 0.0},
        {"frame": 11, "left": (0.130, 0.150, -0.310), "right": (-0.180, 0.050, -0.110), "root": (-0.012, -0.105, 0.000), "hips": (6.0, 0.0, -5.0), "spine": (6.0, 0.0, -3.0), "spine1": (4.0, 0.0, -2.0), "spine2": (2.0, 0.0, -1.0), "heelPitch": 0.0},
        {"frame": 15, "left": (0.135, 0.140, -0.300), "right": (-0.191, 0.035, -0.112), "root": (-0.015, -0.130, 0.020), "hips": (8.0, 0.0, -8.0), "spine": (7.0, 0.0, -5.0), "spine1": (5.0, 0.0, -4.0), "spine2": (3.0, 0.0, -3.0), "heelPitch": 0.0},
        {"frame": 19, "left": (0.145, 0.160, -0.325), "right": (-0.112, 0.077, -0.177), "root": (-0.008, -0.118, -0.030), "hips": (8.0, 0.0, -4.0), "spine": (7.0, 0.0, -3.0), "spine1": (5.0, 0.0, -2.0), "spine2": (3.0, 0.0, -1.0), "heelPitch": 10.0},
        {"frame": 22, "left": (0.140, 0.170, -0.350), "right": (-0.067, 0.103, -0.230), "root": (0.000, -0.105, -0.105), "hips": (10.0, 0.0, 6.0), "spine": (8.0, 0.0, 4.0), "spine1": (5.0, 0.0, 3.0), "spine2": (3.0, 0.0, 2.0), "heelPitch": 18.0},
        {"frame": 25, "left": (0.138, 0.168, -0.345), "right": (-0.069, 0.101, -0.225), "root": (0.000, -0.112, -0.110), "hips": (10.0, 0.0, 5.0), "spine": (8.0, 0.0, 4.0), "spine1": (5.0, 0.0, 3.0), "spine2": (3.0, 0.0, 2.0), "heelPitch": 18.0},
        {"frame": 31, "left": (0.150, 0.165, -0.335), "right": (-0.101, 0.084, -0.190), "root": (-0.004, -0.105, -0.065), "hips": (7.0, 0.0, 4.0), "spine": (6.0, 0.0, 3.0), "spine1": (4.0, 0.0, 2.0), "spine2": (2.0, 0.0, 1.0), "heelPitch": 10.0},
        {"frame": 39, "left": (0.125, 0.162, -0.325), "right": (-0.145, 0.071, -0.112), "root": (-0.006, -0.075, -0.043), "hips": (4.0, 0.0, 3.0), "spine": (4.0, 0.0, 3.0), "spine1": (3.0, 0.0, 2.0), "spine2": (2.0, 0.0, 1.0), "heelPitch": 2.0},
        {"frame": 44, "left": (0.125, 0.160, -0.320), "right": (-0.150, 0.070, -0.110), "root": (-0.005, -0.065, -0.040), "hips": (3.0, 0.0, 2.0), "spine": (4.0, 0.0, 2.0), "spine1": (3.0, 0.0, 1.0), "spine2": (2.0, 0.0, 1.0), "heelPitch": 0.0},
        {"frame": 48, "left": (0.125, 0.160, -0.320), "right": (-0.150, 0.070, -0.110), "root": (-0.005, -0.065, -0.040), "hips": (3.0, 0.0, 2.0), "spine": (4.0, 0.0, 2.0), "spine1": (3.0, 0.0, 1.0), "spine2": (2.0, 0.0, 1.0), "heelPitch": 0.0},
    ]
    result: list[dict[str, Any]] = []
    for frame in range(1, duration + 1):
        for phase_index in range(len(phases) - 1):
            start = phases[phase_index]
            end = phases[phase_index + 1]
            if start["frame"] <= frame <= end["frame"]:
                span = end["frame"] - start["frame"]
                amount = smoothstep((frame - start["frame"]) / span) if span else 0.0
                break
        else:
            raise RuntimeError(f"Staff Thrust v8 has no phase for frame {frame}")
        root = interpolate_tuple(start["root"], end["root"], amount)
        left_hand = interpolate_tuple(start["left"], end["left"], amount)
        right_hand = interpolate_tuple(start["right"], end["right"], amount)
        rotations = {
            bone_name: interpolate_tuple(start[phase_name], end[phase_name], amount)
            for bone_name, phase_name in (
                ("mixamorig:Hips", "hips"),
                ("mixamorig:Spine", "spine"),
                ("mixamorig:Spine1", "spine1"),
                ("mixamorig:Spine2", "spine2"),
            )
        }
        heel_pitch = interpolate_number(start["heelPitch"], end["heelPitch"], amount)
        result.append(
            key(
                (frame - 1) / (duration - 1),
                root=root,
                rotations=rotations,
                hands={LEFT_HAND: left_hand, RIGHT_HAND: right_hand},
                feet={
                    LEFT_FOOT: (0.170, -0.4438, -0.190),
                    RIGHT_FOOT: (-0.170, -0.4438, 0.190),
                },
                foot_pitches={RIGHT_FOOT: heel_pitch},
                grip=62,
                hands_follow_root=False,
            )
        )
    if len(result) != duration:
        raise RuntimeError("Staff Thrust v8 must constrain both grips on every frame")
    return result


GUARD_HANDS = {LEFT_HAND: (0.16, 0.25, -0.14), RIGHT_HAND: (-0.16, 0.25, -0.14)}
HIGH_GUARD_HANDS = {LEFT_HAND: (0.13, 0.34, -0.13), RIGHT_HAND: (-0.13, 0.34, -0.13)}
STAFF_GUARD_HANDS = {LEFT_HAND: (0.17, 0.24, -0.13), RIGHT_HAND: (-0.15, 0.22, -0.10)}
SWORD_GUARD_HANDS = {LEFT_HAND: (0.15, 0.25, -0.10), RIGHT_HAND: (-0.12, 0.23, -0.18)}
STAFF_THRUST_FEET = {
    LEFT_FOOT: (0.16, -0.4438, -0.18),
    RIGHT_FOOT: (-0.16, -0.4438, 0.18),
}


def motion(
    slug: str,
    requirement: str,
    label: str,
    duration: int,
    play_intent: str,
    reference_key: str,
    mechanics: str,
    keys: list[dict[str, Any]],
    events: dict[str, float],
    *,
    virtual_prop: str = "NONE",
    grip_hands: list[str] | None = None,
    floor_bones: list[str] | None = None,
) -> dict[str, Any]:
    if keys[0]["at"] != 0.0 or keys[-1]["at"] != 1.0:
        raise ValueError(f"{slug}: authored keys must span 0..1")
    return {
        "name": f"AuthoredCombatSpell__{slug}Candidate",
        "displayLabel": label,
        "requirementIds": [requirement],
        "durationFrames": duration,
        "playIntent": play_intent,
        "referenceKey": reference_key,
        "mechanics": mechanics,
        "keyframes": keys,
        "events": events,
        "contactContract": {
            "virtualProp": virtual_prop,
            "gripHands": grip_hands or [],
            "floorBones": floor_bones or [],
        },
    }


def authored_specs() -> list[dict[str, Any]]:
    spine_back = {"mixamorig:Spine": (-10, 0, 0), "mixamorig:Spine1": (-14, 0, 0), "mixamorig:Spine2": (-10, 0, 0)}
    spine_forward = {"mixamorig:Spine": (12, 0, 0), "mixamorig:Spine1": (16, 0, 0), "mixamorig:Spine2": (10, 0, 0)}
    crouch = {"mixamorig:LeftUpLeg": (22, 0, 0), "mixamorig:RightUpLeg": (22, 0, 0), "mixamorig:LeftLeg": (-35, 0, 0), "mixamorig:RightLeg": (-35, 0, 0)}
    specs: list[dict[str, Any]] = []
    add = specs.append

    add(motion("NonterminalKnockdownBackward", "locomotion.knockdown.get-up", "Nonterminal Knockdown Backward", 64, "ONE_SHOT", "stage_fall", "Deep rear step absorbs momentum; hips descend before the spine rolls; chin stays tucked and the terminal pose remains recoverable.", [key(0, hands=GUARD_HANDS), key(.16, root=(0,.03,.03), rotations=spine_back, hands=HIGH_GUARD_HANDS, grounding="AIRBORNE"), key(.48, root=(0,-.16,.10), rotations={**spine_back, **crouch}, hands=GUARD_HANDS, grounding="AIRBORNE"), key(.78, root=(0,-.34,.13), rotations={"mixamorig:Hips": (-62,0,0), **spine_back}, hands=GUARD_HANDS, grounding="FLOOR_CONTACT"), key(1, root=(0,-.40,.14), rotations={"mixamorig:Hips": (-78,0,0), "mixamorig:Spine1": (-18,0,0)}, hands=GUARD_HANDS, grounding="FLOOR_CONTACT")], {"impact":.16,"seatContact":.78,"grounded":1.0}, floor_bones=[EXPECTED_ROOT,"mixamorig:Spine"]))
    add(motion("NonterminalGetUpBackward", "locomotion.knockdown.get-up", "Nonterminal Get Up Backward", 72, "ONE_SHOT", "technical_stand", "From a protected supine base, one hand posts, the opposite leg shields, hips clear, and the actor rises without presenting the head.", [key(0, root=(0,-.40,.14), rotations={"mixamorig:Hips":(-78,0,0),"mixamorig:Spine1":(-18,0,0)}, hands={LEFT_HAND:(.24,.02,-.02),RIGHT_HAND:(-.10,.18,-.10)}, grounding="FLOOR_CONTACT"), key(.24, root=(.03,-.31,.10), rotations={"mixamorig:Hips":(-48,0,14),**crouch}, hands={LEFT_HAND:(.25,-.02,.00),RIGHT_HAND:(-.08,.22,-.14)}, grounding="FLOOR_CONTACT"), key(.52, root=(0,-.18,.04), rotations=crouch, hands=GUARD_HANDS, grounding="PLANTED"), key(.78, root=(0,-.06,0), rotations={"mixamorig:LeftUpLeg":(10,0,0),"mixamorig:RightUpLeg":(10,0,0)}, hands=GUARD_HANDS), key(1, hands=GUARD_HANDS)], {"postEstablished":.24,"hipsClear":.52,"standing":1.0}, floor_bones=[LEFT_FOOT,RIGHT_FOOT]))

    add(motion("UnarmedJab", "combat.unarmed.jab-cross", "Unarmed Jab", 30, "ONE_SHOT", "boxing", "Lead shoulder protects the chin; lead fist travels straight while the rear hand stays home; extension snaps back to guard.", [key(0,hands=GUARD_HANDS,grip=58), key(.28,rotations={"mixamorig:Spine2":(0,0,4)},hands=GUARD_HANDS,grip=58), key(.52,hands={LEFT_HAND:(.05,.29,-.29),RIGHT_HAND:GUARD_HANDS[RIGHT_HAND]},grip=62), key(.72,hands=GUARD_HANDS,grip=58), key(1,hands=GUARD_HANDS,grip=58)], {"windup":.28,"contact":.52,"recovered":1.0}, grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("UnarmedCross", "combat.unarmed.jab-cross", "Unarmed Cross", 36, "ONE_SHOT", "boxing", "Rear hip and shoulder rotate through a straight rear-hand line while the lead hand protects; weight returns to a stable guard.", [key(0,hands=GUARD_HANDS,grip=58), key(.24,rotations={"mixamorig:Hips":(0,0,-8),"mixamorig:Spine2":(0,0,-10)},hands=GUARD_HANDS,grip=58), key(.55,root=(0,0,-.018),rotations={"mixamorig:Hips":(0,0,13),"mixamorig:Spine2":(0,0,15)},hands={LEFT_HAND:GUARD_HANDS[LEFT_HAND],RIGHT_HAND:(-.04,.29,-.25)},grip=62), key(.78,rotations={"mixamorig:Spine2":(0,0,4)},hands=GUARD_HANDS,grip=58), key(1,hands=GUARD_HANDS,grip=58)], {"load":.24,"contact":.55,"recovered":1.0}, grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("UnarmedBlockGuard", "combat.unarmed.block", "Unarmed Block Guard", 48, "LOOP", "boxing", "Forearms close the centerline, elbows remain bent, hands protect the head, and the base breathes without losing coverage.", [key(0,hands=HIGH_GUARD_HANDS,grip=48), key(.5,root=(0,-.008,0),rotations={"mixamorig:Spine1":(2,0,0)},hands={LEFT_HAND:(.12,.35,-.14),RIGHT_HAND:(-.12,.35,-.14)},grip=48), key(1,hands=HIGH_GUARD_HANDS,grip=48)], {"guardEstablished":0,"loopApex":.5,"loopEnd":1.0}, grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("UnarmedImpactRecovery", "combat.unarmed.impact-recovery", "Unarmed Impact Recovery", 44, "ONE_SHOT", "stage_reaction", "Impact travels through chest, hips step off-line to catch balance, and the actor regains guard rather than freezing in the hit pose.", [key(0,hands=GUARD_HANDS), key(.18,root=(.02,.01,.02),rotations={"mixamorig:Spine1":(-12,0,-10),"mixamorig:Spine2":(-16,0,-14)},hands=HIGH_GUARD_HANDS), key(.48,root=(.055,-.04,.025),rotations={"mixamorig:Spine1":(-6,0,-7)},hands=GUARD_HANDS), key(.76,root=(.02,-.01,.01),hands=GUARD_HANDS), key(1,hands=GUARD_HANDS)], {"impact":.18,"balanceStep":.48,"recovered":1.0}, grip_hands=[LEFT_HAND,RIGHT_HAND]))

    add(motion("OneHandSwordGuard", "combat.sword-one-hand.guard-idle", "One Hand Sword Guard", 54, "LOOP", "sword", "Point and strong side cover the centerline; sword hand stays in front of the hip while the free hand guards without crossing the blade path.", [key(0,hands=SWORD_GUARD_HANDS,grip=44), key(.5,root=(0,-.006,0),rotations={"mixamorig:Spine2":(1,0,3)},hands={LEFT_HAND:(.16,.26,-.10),RIGHT_HAND:(-.12,.235,-.185)},grip=44), key(1,hands=SWORD_GUARD_HANDS,grip=44)], {"guardEstablished":0,"loopEnd":1.0}, virtual_prop="ONE_HAND_SWORD",grip_hands=[RIGHT_HAND]))
    add(motion("OneHandSwordThrust", "combat.sword-one-hand.thrust", "One Hand Sword Thrust", 42, "ONE_SHOT", "sword", "Point leads the hand; the sword arm extends with a compact lunge and recovers behind the guard rather than overreaching.", [key(0,hands=SWORD_GUARD_HANDS,grip=46), key(.25,root=(0,-.01,.015),rotations={"mixamorig:Spine2":(0,0,-6)},hands=SWORD_GUARD_HANDS,grip=46), key(.54,root=(0,-.035,-.035),rotations={"mixamorig:Spine2":(4,0,6)},hands={LEFT_HAND:(.14,.25,-.11),RIGHT_HAND:(-.05,.29,-.25)},grip=48), key(.76,hands=SWORD_GUARD_HANDS,grip=46), key(1,hands=SWORD_GUARD_HANDS,grip=46)], {"windup":.25,"pointContact":.54,"recovered":1.0}, virtual_prop="ONE_HAND_SWORD",grip_hands=[RIGHT_HAND]))
    add(motion("OneHandSwordHorizontalCut", "combat.sword-one-hand.horizontal-cut", "One Hand Sword Horizontal Cut", 46, "ONE_SHOT", "sword", "The blade leads a level arc; torso and hips turn together, the hand crosses at chest height, and the cut decelerates into guard.", [key(0,hands=SWORD_GUARD_HANDS,grip=48), key(.23,rotations={"mixamorig:Hips":(0,0,-10),"mixamorig:Spine2":(0,0,-14)},hands={LEFT_HAND:(.14,.25,-.08),RIGHT_HAND:(-.28,.29,-.02)},grip=48), key(.55,rotations={"mixamorig:Hips":(0,0,12),"mixamorig:Spine2":(0,0,16)},hands={LEFT_HAND:(.13,.25,-.09),RIGHT_HAND:(.10,.29,-.14)},grip=48), key(.78,rotations={"mixamorig:Spine2":(0,0,5)},hands=SWORD_GUARD_HANDS,grip=48), key(1,hands=SWORD_GUARD_HANDS,grip=48)], {"windup":.23,"cutCrossesCenter":.55,"recovered":1.0}, virtual_prop="ONE_HAND_SWORD",grip_hands=[RIGHT_HAND]))
    add(motion("OneHandSwordDrawHip", "combat.sword-one-hand.draw-sheath", "One Hand Sword Draw Hip", 60, "ONE_SHOT", "sword_draw", "The hand finds the hip grip, clears the blade along the scabbard axis, then rotates into guard only after the point clears.", [key(0,hands={LEFT_HAND:(.12,.22,-.03),RIGHT_HAND:(-.13,.08,.01)},grip=18), key(.22,hands={LEFT_HAND:(.12,.21,-.02),RIGHT_HAND:(-.14,.07,.015)},grip=46), key(.55,rotations={"mixamorig:Spine2":(0,0,-8)},hands={LEFT_HAND:(.13,.23,-.05),RIGHT_HAND:(-.24,.18,-.02)},grip=48), key(.78,hands={LEFT_HAND:(.14,.24,-.08),RIGHT_HAND:(-.15,.23,-.14)},grip=48), key(1,hands=SWORD_GUARD_HANDS,grip=48)], {"gripEstablished":.22,"socketClear":.55,"guardEstablished":1.0}, virtual_prop="ONE_HAND_SWORD",grip_hands=[RIGHT_HAND]))
    add(motion("OneHandSwordSheathHip", "combat.sword-one-hand.draw-sheath", "One Hand Sword Sheath Hip", 68, "ONE_SHOT", "sword_draw", "The point deliberately finds the hip scabbard mouth, alignment is held before insertion, and the grip releases only after the blade seats.", [key(0,hands=SWORD_GUARD_HANDS,grip=48), key(.28,hands={LEFT_HAND:(.13,.23,-.04),RIGHT_HAND:(-.22,.17,-.015)},grip=48), key(.52,rotations={"mixamorig:Spine2":(0,0,-6)},hands={LEFT_HAND:(.12,.21,-.02),RIGHT_HAND:(-.145,.075,.015)},grip=48), key(.74,hands={LEFT_HAND:(.12,.22,-.03),RIGHT_HAND:(-.13,.07,.01)},grip=44), key(1,hands={LEFT_HAND:(.15,.24,-.08),RIGHT_HAND:(-.15,.20,-.05)},grip=18)], {"socketAligned":.52,"bladeSeated":.74,"gripReleased":1.0}, virtual_prop="ONE_HAND_SWORD",grip_hands=[RIGHT_HAND]))
    add(motion("ShieldBash", "combat.sword-shield.shield-bash", "Shield Bash", 40, "ONE_SHOT", "stage_reaction", "Shield-side shoulder, hip, and short step drive as one unit; elbow stays behind the shield center and recovery returns coverage.", [key(0,hands={LEFT_HAND:(.15,.28,-.17),RIGHT_HAND:SWORD_GUARD_HANDS[RIGHT_HAND]},grip=42), key(.24,root=(0,-.02,.025),rotations={"mixamorig:Spine2":(0,0,8)},hands={LEFT_HAND:(.18,.27,-.13),RIGHT_HAND:SWORD_GUARD_HANDS[RIGHT_HAND]},grip=42), key(.52,root=(0,-.025,-.04),rotations={"mixamorig:Hips":(0,0,-8),"mixamorig:Spine2":(0,0,-12)},hands={LEFT_HAND:(.10,.28,-.24),RIGHT_HAND:SWORD_GUARD_HANDS[RIGHT_HAND]},grip=44), key(.76,hands={LEFT_HAND:(.14,.28,-.18),RIGHT_HAND:SWORD_GUARD_HANDS[RIGHT_HAND]},grip=42), key(1,hands={LEFT_HAND:(.15,.28,-.17),RIGHT_HAND:SWORD_GUARD_HANDS[RIGHT_HAND]},grip=42)], {"load":.24,"shieldContact":.52,"recovered":1.0}, virtual_prop="SHIELD_AND_SWORD",grip_hands=[LEFT_HAND,RIGHT_HAND]))

    add(motion("GreatswordDrawBack", "combat.greatsword.draw-stow", "Greatsword Draw Back", 78, "ONE_SHOT", "sword_draw", "Dominant hand reaches the back grip while the support hand stabilizes; torso leans to clear the long blade before the second hand joins.", [key(0,hands={LEFT_HAND:(.12,.20,.02),RIGHT_HAND:(-.17,.34,.08)},grip=22), key(.22,rotations={"mixamorig:Spine2":(-4,0,-8)},hands={LEFT_HAND:(.13,.20,.02),RIGHT_HAND:(-.19,.36,.10)},grip=48), key(.55,rotations={"mixamorig:Spine2":(-3,0,8)},hands={LEFT_HAND:(.08,.24,-.06),RIGHT_HAND:(-.26,.29,.00)},grip=48), key(.78,hands={LEFT_HAND:(.10,.25,-.12),RIGHT_HAND:(-.12,.25,-.14)},grip=48), key(1,hands={LEFT_HAND:(.10,.25,-.16),RIGHT_HAND:(-.10,.25,-.16)},grip=48)], {"backGrip":.22,"bladeClear":.55,"supportGrip":1.0}, virtual_prop="GREATSWORD",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("GreatswordStowBack", "combat.greatsword.draw-stow", "Greatsword Stow Back", 84, "ONE_SHOT", "sword_draw", "Support hand releases first; dominant hand guides the point to the back socket, holds alignment, then seats and releases without a reversed draw shortcut.", [key(0,hands={LEFT_HAND:(.10,.25,-.16),RIGHT_HAND:(-.10,.25,-.16)},grip=48), key(.24,hands={LEFT_HAND:(.13,.22,-.06),RIGHT_HAND:(-.20,.28,-.04)},grip=48), key(.5,rotations={"mixamorig:Spine2":(-3,0,-8)},hands={LEFT_HAND:(.13,.20,.02),RIGHT_HAND:(-.20,.34,.08)},grip=48), key(.72,hands={LEFT_HAND:(.13,.21,.01),RIGHT_HAND:(-.18,.36,.10)},grip=44), key(1,hands={LEFT_HAND:(.15,.24,-.08),RIGHT_HAND:(-.15,.20,-.04)},grip=18)], {"supportRelease":.24,"socketAligned":.5,"bladeSeated":.72,"gripReleased":1.0}, virtual_prop="GREATSWORD",grip_hands=[RIGHT_HAND]))
    add(motion("AxeRetainedDeath", "combat.axe.death", "Axe Retained Death", 92, "ONE_SHOT", "stage_fall", "Weapon hand remains closed; knees and hip absorb the collapse before the torso reaches the floor, keeping the axe path away from the body.", [key(0,hands={LEFT_HAND:GUARD_HANDS[LEFT_HAND],RIGHT_HAND:(-.13,.24,-.16)},grip=52), key(.18,root=(0,-.03,.02),rotations={"mixamorig:Spine2":(10,0,7)},hands={LEFT_HAND:(.17,.22,-.05),RIGHT_HAND:(-.16,.19,-.10)},grip=52), key(.48,root=(.03,-.19,.08),rotations={**crouch,"mixamorig:Spine1":(20,0,10)},hands={LEFT_HAND:(.18,.12,-.02),RIGHT_HAND:(-.15,.12,-.08)},grounding="AIRBORNE",grip=52), key(.76,root=(.06,-.35,.11),rotations={"mixamorig:Hips":(48,0,18),"mixamorig:Spine1":(20,0,0)},hands={LEFT_HAND:(.20,.02,.00),RIGHT_HAND:(-.14,.16,-.08)},grounding="FLOOR_CONTACT",grip=52), key(1,root=(.07,-.40,.12),rotations={"mixamorig:Hips":(45,0,20),"mixamorig:Spine1":(15,0,0)},hands={LEFT_HAND:(.20,.00,.01),RIGHT_HAND:(-.13,.18,-.10)},grounding="FLOOR_CONTACT",grip=52)], {"fatalImpact":.18,"kneeCollapse":.48,"terminal":1.0}, virtual_prop="ONE_HAND_AXE",grip_hands=[RIGHT_HAND],floor_bones=[EXPECTED_ROOT,"mixamorig:Spine"]))
    add(motion("BowDrawCancel", "combat.bow.cancel", "Bow Draw Cancel", 58, "ONE_SHOT", "archery_letdown", "String hand returns slowly along the draw line while bow arm remains controlled; no dry-fire release occurs and both hands settle safely.", [key(0,hands={LEFT_HAND:(.05,.28,-.27),RIGHT_HAND:(-.12,.29,.00)},grip=34), key(.22,hands={LEFT_HAND:(.04,.29,-.28),RIGHT_HAND:(-.18,.30,.04)},grip=38), key(.5,hands={LEFT_HAND:(.05,.29,-.25),RIGHT_HAND:(-.10,.29,-.06)},grip=36), key(.78,hands={LEFT_HAND:(.10,.27,-.18),RIGHT_HAND:(-.13,.27,-.11)},grip=34), key(1,hands=GUARD_HANDS,grip=30)], {"fullDraw":.22,"tensionReleased":.5,"arrowReturned":.78,"idle":1.0}, virtual_prop="BOW_AND_ARROW",grip_hands=[LEFT_HAND,RIGHT_HAND]))

    add(motion("MagicInterrupt", "combat.magic.interrupt-cancel", "Magic Interrupt", 48, "ONE_SHOT", "conducting", "A clear preparatory lift is cut off by a sharp wrist closure; torso recoils and hands return to a protected neutral without a release beat.", [key(0,hands=GUARD_HANDS,grip=16), key(.3,rotations={"mixamorig:Spine2":(-4,0,0)},hands={LEFT_HAND:(.13,.34,-.20),RIGHT_HAND:(-.13,.34,-.20)},grip=12), key(.5,root=(.015,-.02,.02),rotations={"mixamorig:Spine2":(-12,0,9)},hands={LEFT_HAND:(.09,.30,-.10),RIGHT_HAND:(-.11,.27,-.06)},grip=34), key(.76,hands=HIGH_GUARD_HANDS,grip=20), key(1,hands=GUARD_HANDS,grip=16)], {"castBegins":.3,"interrupted":.5,"recovered":1.0}, grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("MagicChannelLoop", "combat.magic.channel", "Magic Channel Loop", 72, "LOOP", "mime", "Two fixed hand points contain an unseen volume while breath and torso supply a continuous pulse; start and end poses match for interruption-safe looping.", [key(0,hands={LEFT_HAND:(.12,.30,-.21),RIGHT_HAND:(-.12,.30,-.21)},grip=10), key(.25,root=(0,-.006,0),rotations={"mixamorig:Spine2":(-3,0,3)},hands={LEFT_HAND:(.14,.32,-.22),RIGHT_HAND:(-.10,.29,-.22)},grip=8), key(.5,rotations={"mixamorig:Spine2":(-5,0,0)},hands={LEFT_HAND:(.13,.34,-.23),RIGHT_HAND:(-.13,.34,-.23)},grip=8), key(.75,root=(0,-.006,0),rotations={"mixamorig:Spine2":(-3,0,-3)},hands={LEFT_HAND:(.10,.29,-.22),RIGHT_HAND:(-.14,.32,-.22)},grip=8), key(1,hands={LEFT_HAND:(.12,.30,-.21),RIGHT_HAND:(-.12,.30,-.21)},grip=10)], {"loopStart":0,"pulseA":.25,"channelPeak":.5,"pulseB":.75,"loopEnd":1.0}, virtual_prop="MIMED_MAGIC_VOLUME",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("SpellBlowback", "reaction.spell.blowback", "Spell Blowback", 62, "ONE_SHOT", "stage_reaction", "Hands lead the failed release, chest opens under the recoil, center of mass travels backward and briefly airborne, then the body reaches controlled floor contact.", [key(0,hands={LEFT_HAND:(.12,.32,-.22),RIGHT_HAND:(-.12,.32,-.22)},grip=12), key(.14,root=(0,.04,.06),rotations=spine_back,hands={LEFT_HAND:(.22,.38,-.10),RIGHT_HAND:(-.22,.38,-.10)},grounding="AIRBORNE",grip=20), key(.4,root=(0,.09,.16),rotations={"mixamorig:Spine1":(-22,0,0),"mixamorig:Spine2":(-20,0,0)},hands={LEFT_HAND:(.30,.31,.02),RIGHT_HAND:(-.30,.31,.02)},grounding="AIRBORNE",grip=22), key(.74,root=(0,-.27,.24),rotations={"mixamorig:Hips":(-58,0,0),"mixamorig:Spine1":(-20,0,0)},hands={LEFT_HAND:(.23,.05,.02),RIGHT_HAND:(-.23,.05,.02)},grounding="FLOOR_CONTACT",grip=22), key(1,root=(0,-.39,.25),rotations={"mixamorig:Hips":(-78,0,0)},hands={LEFT_HAND:(.22,.01,.02),RIGHT_HAND:(-.22,.01,.02)},grounding="FLOOR_CONTACT",grip=22)], {"spellImpact":.14,"airborneApex":.4,"floorContact":.74,"grounded":1.0}, floor_bones=[EXPECTED_ROOT,"mixamorig:Spine"]))
    add(motion("SpellKnockdown", "reaction.spell.knockdown", "Spell Knockdown", 66, "ONE_SHOT", "stage_fall", "The spell folds the torso forward; a long diagonal step controls descent, forearm and thigh share contact, and the head remains clear of the floor.", [key(0,hands=GUARD_HANDS,grip=16), key(.16,root=(0,-.02,-.01),rotations=spine_forward,hands={LEFT_HAND:(.14,.23,-.20),RIGHT_HAND:(-.14,.23,-.20)},grip=20), key(.48,root=(-.05,-.20,.08),rotations={**crouch,"mixamorig:Spine1":(28,0,-12)},hands={LEFT_HAND:(.20,.06,-.05),RIGHT_HAND:(-.10,.14,-.12)},grounding="AIRBORNE",grip=20), key(.76,root=(-.09,-.34,.10),rotations={"mixamorig:Hips":(58,0,-22),"mixamorig:Spine1":(24,0,0)},hands={LEFT_HAND:(.23,.01,-.01),RIGHT_HAND:(-.07,.08,-.07)},grounding="FLOOR_CONTACT",grip=20), key(1,root=(-.10,-.40,.11),rotations={"mixamorig:Hips":(76,0,-24),"mixamorig:Spine1":(18,0,0)},hands={LEFT_HAND:(.22,.00,0),RIGHT_HAND:(-.06,.05,-.04)},grounding="FLOOR_CONTACT",grip=20)], {"spellImpact":.16,"descent":.48,"floorContact":.76,"grounded":1.0}, floor_bones=[EXPECTED_ROOT,"mixamorig:Spine"]))
    add(motion("SpellGetUp", "reaction.spell.get-up", "Spell Get Up", 76, "ONE_SHOT", "technical_stand", "The caster rolls to a protected side, posts one hand, brings a knee under the center of mass, and regains a guarded stance before exposing the casting hands.", [key(0,root=(-.10,-.40,.11),rotations={"mixamorig:Hips":(76,0,-24),"mixamorig:Spine1":(18,0,0)},hands={LEFT_HAND:(.22,.00,0),RIGHT_HAND:(-.06,.05,-.04)},grounding="FLOOR_CONTACT",grip=18), key(.23,root=(-.06,-.32,.08),rotations={"mixamorig:Hips":(50,0,-12),**crouch},hands={LEFT_HAND:(.24,-.01,0),RIGHT_HAND:(-.09,.18,-.10)},grounding="FLOOR_CONTACT",grip=18), key(.5,root=(0,-.18,.03),rotations=crouch,hands=GUARD_HANDS,grounding="PLANTED",grip=18), key(.76,root=(0,-.05,0),rotations={"mixamorig:LeftUpLeg":(9,0,0),"mixamorig:RightUpLeg":(9,0,0)},hands=HIGH_GUARD_HANDS,grip=18), key(1,hands=GUARD_HANDS,grip=16)], {"postEstablished":.23,"kneeUnderBody":.5,"guardRecovered":1.0}, floor_bones=[LEFT_FOOT,RIGHT_FOOT]))

    # Staff actions share a physical grip line, but every timeline is authored independently.
    add(motion("StaffGripIdle", "combat.staff.grip-idle", "Staff Grip Idle", 60, "LOOP", "staff_grip", "Hands divide the staff around its center, elbows remain soft, and breath shifts the weapon without changing grip spacing.", [key(0,hands=STAFF_GUARD_HANDS,grip=44), key(.5,root=(0,-.006,0),rotations={"mixamorig:Spine2":(1,0,2)},hands={LEFT_HAND:(.175,.245,-.135),RIGHT_HAND:(-.145,.225,-.105)},grip=44), key(1,hands=STAFF_GUARD_HANDS,grip=44)], {"loopStart":0,"breathApex":.5,"loopEnd":1.0}, virtual_prop="STAFF",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("StaffBlock", "combat.staff.guard-block", "Staff Block", 38, "ONE_SHOT", "staff_grip", "Both hands raise the staff as one barrier, shoulders stay down, and the impact is absorbed through elbows and stance before guard returns.", [key(0,hands=STAFF_GUARD_HANDS,grip=46), key(.3,hands={LEFT_HAND:(.18,.39,-.12),RIGHT_HAND:(-.16,.36,-.12)},grip=46), key(.52,root=(0,-.025,.01),rotations={"mixamorig:Spine2":(-8,0,0)},hands={LEFT_HAND:(.19,.40,-.13),RIGHT_HAND:(-.17,.37,-.13)},grip=48), key(.76,hands=STAFF_GUARD_HANDS,grip=46), key(1,hands=STAFF_GUARD_HANDS,grip=46)], {"guardRaised":.3,"weaponContact":.52,"recovered":1.0}, virtual_prop="STAFF",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("StaffDrawBack", "combat.staff.draw-stow", "Staff Draw Back", 70, "ONE_SHOT", "staff_grip", "Rear hand finds the back socket, front hand receives the staff after the long end clears, and both grips settle before combat stance.", [key(0,hands={LEFT_HAND:(.13,.21,.02),RIGHT_HAND:(-.18,.34,.09)},grip=20), key(.22,hands={LEFT_HAND:(.13,.21,.02),RIGHT_HAND:(-.19,.36,.10)},grip=46), key(.52,rotations={"mixamorig:Spine2":(-4,0,8)},hands={LEFT_HAND:(.10,.23,-.04),RIGHT_HAND:(-.27,.28,.01)},grip=46), key(.76,hands={LEFT_HAND:(.17,.24,-.11),RIGHT_HAND:(-.15,.22,-.09)},grip=46), key(1,hands=STAFF_GUARD_HANDS,grip=46)], {"backGrip":.22,"socketClear":.52,"supportGrip":.76,"guardEstablished":1.0}, virtual_prop="STAFF",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("StaffStowBack", "combat.staff.draw-stow", "Staff Stow Back", 76, "ONE_SHOT", "staff_grip", "Front hand releases and guides the shaft; rear hand aligns the long end to the back socket, seats it, then releases in a separately authored path.", [key(0,hands=STAFF_GUARD_HANDS,grip=46), key(.26,hands={LEFT_HAND:(.12,.22,-.04),RIGHT_HAND:(-.25,.27,.00)},grip=46), key(.5,rotations={"mixamorig:Spine2":(-4,0,-8)},hands={LEFT_HAND:(.13,.21,.02),RIGHT_HAND:(-.19,.35,.09)},grip=46), key(.74,hands={LEFT_HAND:(.14,.22,.01),RIGHT_HAND:(-.18,.36,.10)},grip=42), key(1,hands=GUARD_HANDS,grip=18)], {"supportRelease":.26,"socketAligned":.5,"staffSeated":.74,"gripReleased":1.0}, virtual_prop="STAFF",grip_hands=[RIGHT_HAND]))
    staff_thrust = motion(
        "StaffThrust",
        "combat.staff.melee-family",
        "Staff Thrust",
        48,
        "ONE_SHOT",
        "staff_thrust",
        "A fresh v8 straight thrust opens in a readable neutral low guard, then "
        "chambers the rear hand beside the hip/lower ribs while the hips and shoulders "
        "load over a lowered base. The rear leg drives, heel releases, hips unwind, and "
        "both closed hands accelerate the shaft on its long axis: the rear hand pushes "
        "and feeds while the front hand guides. A decisive extension and brief impact "
        "settle precede a controlled recoil into the original guard. Both feet remain "
        "planted without translation and the staff remains below the head and neck.",
        staff_thrust_v8_keys(),
        {
            "guardReady": 0.0,
            "rearwardLoad": 14 / 47,
            "drive": 18 / 47,
            "hardExtension": 21 / 47,
            "impactSettle": 24 / 47,
            "recoil": 30 / 47,
            "readyRecovered": 1.0,
        },
        virtual_prop="STAFF",
        grip_hands=[LEFT_HAND, RIGHT_HAND],
    )
    staff_thrust["denseStaffContinuity"] = {
        "frontTipHand": LEFT_HAND,
        "maximumAxisDeltaDegrees": MAXIMUM_STAFF_AXIS_DELTA_DEGREES,
        "maximumHandToGripError": MAXIMUM_STAFF_GRIP_ERROR,
        "maximumBoneQuaternionDeltaDegrees": MAXIMUM_BONE_QUATERNION_DELTA_DEGREES,
        "minimumTipToTorsoTravelRatio": 1.4,
        "minimumGripDistance": 0.20,
        "maximumGripDistance": 0.42,
        "maximumConsecutiveGripDistanceDelta": 0.035,
        "minimumRearHandFeedDistance": 0.0,
        "minimumRearHandAxialDrive": 0.12,
        "minimumStaffTipTravel": 0.18,
        "minimumTorsoTravel": 0.08,
        "minimumTipAxialTravelFraction": 0.75,
        "minimumRearHandForwardFromTorso": 0.0,
        "guardChamberFrames": [1, 15],
        "minimumGuardChamberElbowDegrees": 60.0,
        "maximumGuardChamberElbowDegrees": 100.0,
    }
    add(staff_thrust)
    add(motion("StaffSweep", "combat.staff.melee-family", "Staff Sweep", 48, "ONE_SHOT", "staff_sweep", "Hips turn with a level rib-height staff arc; hands maintain ordering on the shaft and the strike decelerates past center before recovery.", [key(0,hands=STAFF_GUARD_HANDS,grip=48), key(.22,rotations={"mixamorig:Hips":(0,0,-12),"mixamorig:Spine2":(0,0,-15)},hands={LEFT_HAND:(.26,.25,-.04),RIGHT_HAND:(-.10,.22,.02)},grip=48), key(.56,rotations={"mixamorig:Hips":(0,0,14),"mixamorig:Spine2":(0,0,18)},hands={LEFT_HAND:(.06,.25,-.17),RIGHT_HAND:(-.27,.23,-.05)},grip=48), key(.8,hands=STAFF_GUARD_HANDS,grip=48), key(1,hands=STAFF_GUARD_HANDS,grip=48)], {"windup":.22,"sweepContact":.56,"recovered":1.0}, virtual_prop="STAFF",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("StaffButtStrike", "combat.staff.melee-family", "Staff Butt Strike", 38, "ONE_SHOT", "staff_thrust", "The rear end travels on a short direct line powered by a compact hip turn; the front hand checks reach and returns the shaft to guard.", [key(0,hands=STAFF_GUARD_HANDS,grip=48), key(.24,rotations={"mixamorig:Spine2":(0,0,8)},hands={LEFT_HAND:(.20,.24,-.12),RIGHT_HAND:(-.12,.22,-.08)},grip=48), key(.5,root=(0,-.02,-.02),rotations={"mixamorig:Spine2":(0,0,-12)},hands={LEFT_HAND:(.12,.25,-.15),RIGHT_HAND:(-.05,.23,-.25)},grip=48), key(.74,hands=STAFF_GUARD_HANDS,grip=48), key(1,hands=STAFF_GUARD_HANDS,grip=48)], {"load":.24,"buttContact":.5,"recovered":1.0}, virtual_prop="STAFF",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("StaffOverheadStrike", "combat.staff.melee-family", "Staff Overhead Strike", 52, "ONE_SHOT", "staff_overhead", "Hands lift the staff without shrugging, stance steps under a vertical arc, and the rear hand draws down to stop the strike at target height.", [key(0,hands=STAFF_GUARD_HANDS,grip=48), key(.28,hands={LEFT_HAND:(.15,.43,-.04),RIGHT_HAND:(-.13,.40,.01)},grip=48), key(.58,root=(0,-.03,-.025),rotations={"mixamorig:Spine2":(8,0,0)},hands={LEFT_HAND:(.13,.25,-.26),RIGHT_HAND:(-.12,.22,-.17)},grip=48), key(.78,hands={LEFT_HAND:(.15,.24,-.17),RIGHT_HAND:(-.14,.22,-.12)},grip=48), key(1,hands=STAFF_GUARD_HANDS,grip=48)], {"highGuard":.28,"overheadContact":.58,"recovered":1.0}, virtual_prop="STAFF",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("StaffRecovery", "combat.staff.melee-family", "Staff Recovery", 44, "ONE_SHOT", "staff_grip", "After overextension the rear foot and hips re-center first, hands re-establish equal leverage, then breathing returns to guard.", [key(0,root=(0,-.03,-.04),rotations={"mixamorig:Spine2":(10,0,8)},hands={LEFT_HAND:(.08,.25,-.25),RIGHT_HAND:(-.15,.22,-.16)},grip=48), key(.3,root=(.02,-.04,-.015),rotations={"mixamorig:Spine2":(5,0,4)},hands={LEFT_HAND:(.12,.24,-.18),RIGHT_HAND:(-.16,.22,-.12)},grip=48), key(.62,root=(.01,-.015,0),hands=STAFF_GUARD_HANDS,grip=48), key(1,hands=STAFF_GUARD_HANDS,grip=48)], {"balanceStep":.3,"gripRecovered":.62,"guardRecovered":1.0}, virtual_prop="STAFF",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("StaffChannelLoop", "combat.staff.channel-cast", "Staff Channel Loop", 72, "LOOP", "mime", "Staff remains a fixed vertical focus while the upper hand and torso orbit a small unseen volume; grip spacing and loop seam remain stable.", [key(0,hands={LEFT_HAND:(.14,.35,-.18),RIGHT_HAND:(-.06,.20,-.13)},grip=44), key(.25,rotations={"mixamorig:Spine2":(-3,0,4)},hands={LEFT_HAND:(.16,.36,-.19),RIGHT_HAND:(-.05,.20,-.13)},grip=44), key(.5,rotations={"mixamorig:Spine2":(-5,0,0)},hands={LEFT_HAND:(.14,.38,-.20),RIGHT_HAND:(-.06,.20,-.13)},grip=44), key(.75,rotations={"mixamorig:Spine2":(-3,0,-4)},hands={LEFT_HAND:(.12,.36,-.19),RIGHT_HAND:(-.07,.20,-.13)},grip=44), key(1,hands={LEFT_HAND:(.14,.35,-.18),RIGHT_HAND:(-.06,.20,-.13)},grip=44)], {"loopStart":0,"pulseA":.25,"channelPeak":.5,"pulseB":.75,"loopEnd":1.0}, virtual_prop="STAFF_FOCUS",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("StaffCastRelease", "combat.staff.channel-cast", "Staff Cast Release", 56, "ONE_SHOT", "conducting", "A sustained staff focus resolves into a distinct forward release beat; support hand retains the shaft and both hands recover without losing weapon control.", [key(0,hands={LEFT_HAND:(.14,.35,-.18),RIGHT_HAND:(-.06,.20,-.13)},grip=44), key(.28,rotations={"mixamorig:Spine2":(-6,0,0)},hands={LEFT_HAND:(.15,.39,-.20),RIGHT_HAND:(-.06,.20,-.13)},grip=44), key(.56,root=(0,-.02,-.02),rotations={"mixamorig:Spine2":(5,0,0)},hands={LEFT_HAND:(.06,.31,-.26),RIGHT_HAND:(-.05,.20,-.15)},grip=44), key(.78,hands={LEFT_HAND:(.13,.30,-.20),RIGHT_HAND:(-.06,.20,-.13)},grip=44), key(1,hands=STAFF_GUARD_HANDS,grip=44)], {"focusPeak":.28,"spellRelease":.56,"recovered":1.0}, virtual_prop="STAFF_FOCUS",grip_hands=[LEFT_HAND,RIGHT_HAND]))

    add(motion("MaceGuard", "combat.mace.lower-level", "Mace Guard", 52, "LOOP", "sword", "Mace stays close enough for leverage, weapon-side elbow remains bent, and free hand covers while the stance breathes.", [key(0,hands=SWORD_GUARD_HANDS,grip=52), key(.5,root=(0,-.006,0),rotations={"mixamorig:Spine2":(1,0,2)},hands={LEFT_HAND:(.16,.25,-.10),RIGHT_HAND:(-.13,.24,-.17)},grip=52), key(1,hands=SWORD_GUARD_HANDS,grip=52)], {"loopStart":0,"breathApex":.5,"loopEnd":1.0}, virtual_prop="MACE",grip_hands=[RIGHT_HAND]))
    add(motion("MaceCompactStrike", "combat.mace.lower-level", "Mace Compact Strike", 42, "ONE_SHOT", "sword", "Short shoulder-loaded arc keeps the heavy head near the body until hip rotation accelerates it; the elbow bends again during recovery.", [key(0,hands=SWORD_GUARD_HANDS,grip=54), key(.24,rotations={"mixamorig:Hips":(0,0,-8),"mixamorig:Spine2":(0,0,-12)},hands={LEFT_HAND:(.14,.25,-.09),RIGHT_HAND:(-.24,.31,-.01)},grip=54), key(.54,rotations={"mixamorig:Hips":(0,0,10),"mixamorig:Spine2":(0,0,14)},hands={LEFT_HAND:(.13,.25,-.10),RIGHT_HAND:(.06,.25,-.17)},grip=54), key(.78,hands=SWORD_GUARD_HANDS,grip=54), key(1,hands=SWORD_GUARD_HANDS,grip=54)], {"load":.24,"maceContact":.54,"recovered":1.0}, virtual_prop="MACE",grip_hands=[RIGHT_HAND]))
    add(motion("MaceBlock", "combat.mace.lower-level", "Mace Block", 38, "ONE_SHOT", "sword", "Weapon forearm rises diagonally to meet the attack with structure while the free hand protects; knees absorb impact and guard reforms.", [key(0,hands=SWORD_GUARD_HANDS,grip=54), key(.3,hands={LEFT_HAND:(.14,.31,-.10),RIGHT_HAND:(-.08,.38,-.12)},grip=54), key(.52,root=(0,-.025,.005),rotations={"mixamorig:Spine2":(-7,0,0)},hands={LEFT_HAND:(.13,.32,-.11),RIGHT_HAND:(-.07,.39,-.13)},grip=54), key(.76,hands=SWORD_GUARD_HANDS,grip=54), key(1,hands=SWORD_GUARD_HANDS,grip=54)], {"blockRaised":.3,"weaponContact":.52,"recovered":1.0}, virtual_prop="MACE",grip_hands=[RIGHT_HAND]))
    add(motion("KnifeGuard", "combat.knife.lower-level", "Knife Guard", 50, "LOOP", "knife", "Knife hand stays compact near the ribs with point forward; free hand leads the protective frame and neither arm crosses the blade line.", [key(0,hands={LEFT_HAND:(.14,.29,-.17),RIGHT_HAND:(-.13,.22,-.13)},grip=52), key(.5,root=(0,-.006,0),rotations={"mixamorig:Spine2":(1,0,-2)},hands={LEFT_HAND:(.15,.30,-.18),RIGHT_HAND:(-.13,.225,-.135)},grip=52), key(1,hands={LEFT_HAND:(.14,.29,-.17),RIGHT_HAND:(-.13,.22,-.13)},grip=52)], {"loopStart":0,"breathApex":.5,"loopEnd":1.0}, virtual_prop="KNIFE",grip_hands=[RIGHT_HAND]))
    add(motion("KnifeCloseStrike", "combat.knife.lower-level", "Knife Close Strike", 34, "ONE_SHOT", "knife", "A compact hammer-grip thrust uses a short body step, keeps the weapon elbow connected, and retracts immediately behind the free-hand frame.", [key(0,hands={LEFT_HAND:(.14,.29,-.17),RIGHT_HAND:(-.13,.22,-.13)},grip=56), key(.22,rotations={"mixamorig:Spine2":(0,0,-8)},hands={LEFT_HAND:(.15,.29,-.18),RIGHT_HAND:(-.18,.23,-.08)},grip=56), key(.5,root=(0,-.02,-.025),rotations={"mixamorig:Spine2":(3,0,8)},hands={LEFT_HAND:(.13,.28,-.17),RIGHT_HAND:(-.06,.25,-.26)},grip=58), key(.72,hands={LEFT_HAND:(.14,.29,-.17),RIGHT_HAND:(-.13,.22,-.13)},grip=56), key(1,hands={LEFT_HAND:(.14,.29,-.17),RIGHT_HAND:(-.13,.22,-.13)},grip=56)], {"load":.22,"knifeContact":.5,"recovered":1.0}, virtual_prop="KNIFE",grip_hands=[RIGHT_HAND]))
    add(motion("KnifeCurseGesture", "combat.knife.lower-level", "Knife Curse Gesture", 58, "ONE_SHOT", "mime", "Knife stays controlled at the weapon-side ribs while the free hand establishes an unseen fixed point, circles it, and closes into a distinct curse release.", [key(0,hands={LEFT_HAND:(.14,.29,-.17),RIGHT_HAND:(-.13,.22,-.13)},grip=48), key(.28,hands={LEFT_HAND:(.12,.35,-.23),RIGHT_HAND:(-.13,.22,-.13)},grip=42), key(.56,rotations={"mixamorig:Spine2":(-4,0,4)},hands={LEFT_HAND:(.05,.34,-.26),RIGHT_HAND:(-.13,.22,-.13)},grip=42), key(.78,hands={LEFT_HAND:(.11,.29,-.21),RIGHT_HAND:(-.13,.22,-.13)},grip=46), key(1,hands={LEFT_HAND:(.14,.29,-.17),RIGHT_HAND:(-.13,.22,-.13)},grip=48)], {"curseFocus":.28,"curseRelease":.56,"weaponGuardRecovered":1.0}, virtual_prop="KNIFE_AND_MAGIC_FOCUS",grip_hands=[RIGHT_HAND,LEFT_HAND]))
    add(motion("PairedDaggersGuard", "combat.daggers.paired", "Paired Daggers Guard", 52, "LOOP", "knife", "Both daggers cover separate lines with bent elbows and offset hands; the breathing loop preserves clearance between weapon paths.", [key(0,hands={LEFT_HAND:(.15,.27,-.16),RIGHT_HAND:(-.15,.23,-.14)},grip=54), key(.5,root=(0,-.006,0),hands={LEFT_HAND:(.16,.275,-.165),RIGHT_HAND:(-.145,.235,-.145)},grip=54), key(1,hands={LEFT_HAND:(.15,.27,-.16),RIGHT_HAND:(-.15,.23,-.14)},grip=54)], {"loopStart":0,"breathApex":.5,"loopEnd":1.0}, virtual_prop="PAIRED_DAGGERS",grip_hands=[LEFT_HAND,RIGHT_HAND]))
    add(motion("PairedDaggersAlternatingStrike", "combat.daggers.paired", "Paired Daggers Alternating Strike", 52, "ONE_SHOT", "knife", "Lead dagger thrusts and retracts before the rear dagger crosses; hips alternate, hands never collide, and both weapons finish on independent guard lines.", [key(0,hands={LEFT_HAND:(.15,.27,-.16),RIGHT_HAND:(-.15,.23,-.14)},grip=56), key(.24,rotations={"mixamorig:Spine2":(0,0,8)},hands={LEFT_HAND:(.05,.28,-.29),RIGHT_HAND:(-.15,.23,-.14)},grip=56), key(.45,hands={LEFT_HAND:(.15,.27,-.16),RIGHT_HAND:(-.15,.23,-.14)},grip=56), key(.68,rotations={"mixamorig:Spine2":(0,0,-9)},hands={LEFT_HAND:(.15,.27,-.16),RIGHT_HAND:(-.05,.26,-.29)},grip=56), key(.86,hands={LEFT_HAND:(.15,.27,-.16),RIGHT_HAND:(-.15,.23,-.14)},grip=56), key(1,hands={LEFT_HAND:(.15,.27,-.16),RIGHT_HAND:(-.15,.23,-.14)},grip=56)], {"leadContact":.24,"leadRetracted":.45,"rearContact":.68,"recovered":1.0}, virtual_prop="PAIRED_DAGGERS",grip_hands=[LEFT_HAND,RIGHT_HAND]))

    add(motion("RodGripIdle", "combat.rod.lower-level", "Rod Grip Idle", 54, "LOOP", "conducting", "Rod hand remains a stable baton axis while the free hand and breath make small readable preparation changes.", [key(0,hands={LEFT_HAND:(.14,.27,-.16),RIGHT_HAND:(-.13,.25,-.17)},grip=42), key(.5,root=(0,-.006,0),rotations={"mixamorig:Spine2":(-2,0,2)},hands={LEFT_HAND:(.145,.28,-.17),RIGHT_HAND:(-.13,.255,-.175)},grip=42), key(1,hands={LEFT_HAND:(.14,.27,-.16),RIGHT_HAND:(-.13,.25,-.17)},grip=42)], {"loopStart":0,"breathApex":.5,"loopEnd":1.0}, virtual_prop="ROD",grip_hands=[RIGHT_HAND]))
    add(motion("RodCommand", "combat.rod.lower-level", "Rod Command", 44, "ONE_SHOT", "conducting", "Rod lifts in a clear preparatory beat, traces a decisive command line, stops on the beat, then returns without a casting flourish.", [key(0,hands={LEFT_HAND:(.14,.27,-.16),RIGHT_HAND:(-.13,.25,-.17)},grip=42), key(.28,hands={LEFT_HAND:(.14,.28,-.17),RIGHT_HAND:(-.12,.38,-.14)},grip=42), key(.56,root=(0,-.015,-.012),rotations={"mixamorig:Spine2":(3,0,0)},hands={LEFT_HAND:(.13,.27,-.17),RIGHT_HAND:(-.03,.31,-.27)},grip=44), key(.78,hands={LEFT_HAND:(.14,.27,-.16),RIGHT_HAND:(-.13,.27,-.18)},grip=42), key(1,hands={LEFT_HAND:(.14,.27,-.16),RIGHT_HAND:(-.13,.25,-.17)},grip=42)], {"preparation":.28,"commandBeat":.56,"recovered":1.0}, virtual_prop="ROD",grip_hands=[RIGHT_HAND]))
    add(motion("RodSummonRelease", "combat.rod.lower-level", "Rod Summon Release", 60, "ONE_SHOT", "mime", "Free hand builds an unseen volume below the rod, both hands lift the focus, and the rod hand releases upward while the free hand anchors the result.", [key(0,hands={LEFT_HAND:(.14,.27,-.16),RIGHT_HAND:(-.13,.25,-.17)},grip=40), key(.26,rotations={"mixamorig:Spine2":(5,0,0)},hands={LEFT_HAND:(.12,.22,-.20),RIGHT_HAND:(-.12,.30,-.20)},grip=38), key(.54,rotations={"mixamorig:Spine2":(-5,0,0)},hands={LEFT_HAND:(.10,.34,-.24),RIGHT_HAND:(-.10,.38,-.24)},grip=38), key(.72,root=(0,-.02,-.015),hands={LEFT_HAND:(.08,.31,-.25),RIGHT_HAND:(-.04,.38,-.25)},grip=40), key(1,hands={LEFT_HAND:(.14,.27,-.16),RIGHT_HAND:(-.13,.25,-.17)},grip=40)], {"focusBuilt":.26,"summonPeak":.54,"summonRelease":.72,"recovered":1.0}, virtual_prop="ROD_AND_MAGIC_FOCUS",grip_hands=[RIGHT_HAND,LEFT_HAND]))
    add(motion("RodChannelLoop", "combat.rod.lower-level", "Rod Channel Loop", 68, "LOOP", "conducting", "Rod hand holds a steady beat axis while the free palm draws a four-part pulse; the first and last poses are identical.", [key(0,hands={LEFT_HAND:(.12,.31,-.22),RIGHT_HAND:(-.12,.29,-.20)},grip=38), key(.25,hands={LEFT_HAND:(.15,.33,-.23),RIGHT_HAND:(-.12,.30,-.20)},grip=38), key(.5,rotations={"mixamorig:Spine2":(-3,0,0)},hands={LEFT_HAND:(.12,.36,-.24),RIGHT_HAND:(-.12,.31,-.21)},grip=38), key(.75,hands={LEFT_HAND:(.09,.33,-.23),RIGHT_HAND:(-.12,.30,-.20)},grip=38), key(1,hands={LEFT_HAND:(.12,.31,-.22),RIGHT_HAND:(-.12,.29,-.20)},grip=38)], {"loopStart":0,"pulseA":.25,"channelPeak":.5,"pulseB":.75,"loopEnd":1.0}, virtual_prop="ROD_AND_MAGIC_FOCUS",grip_hands=[RIGHT_HAND,LEFT_HAND]))
    add(motion("RodInterruptRecovery", "combat.rod.lower-level", "Rod Interrupt Recovery", 48, "ONE_SHOT", "conducting", "The free-hand channel collapses first, rod wrist closes the cutoff, torso catches balance, and both hands return to guarded control.", [key(0,hands={LEFT_HAND:(.12,.33,-.23),RIGHT_HAND:(-.12,.30,-.20)},grip=38), key(.24,root=(.015,-.015,.01),rotations={"mixamorig:Spine2":(-9,0,8)},hands={LEFT_HAND:(.08,.29,-.12),RIGHT_HAND:(-.10,.27,-.13)},grip=46), key(.52,hands={LEFT_HAND:(.12,.29,-.16),RIGHT_HAND:(-.12,.26,-.16)},grip=42), key(.76,hands={LEFT_HAND:(.14,.27,-.16),RIGHT_HAND:(-.13,.25,-.17)},grip=42), key(1,hands={LEFT_HAND:(.14,.27,-.16),RIGHT_HAND:(-.13,.25,-.17)},grip=42)], {"interrupted":.24,"balanceCaught":.52,"recovered":1.0}, virtual_prop="ROD",grip_hands=[RIGHT_HAND]))

    death_specs = [
        ("BurningDeath","Burning Death", "Heat drives repeated opening/closing recoil through chest and arms before the knees fail into a controlled side-back fall.", [(0,0,0),(-14,0,8),(16,0,-8),(-20,0,6)], (58,0,18)),
        ("FreezingDeath","Freezing Death", "Motion progressively loses range; elbows and spine lock asymmetrically, then the rigid body tips as one controlled unit.", [(0,0,0),(-4,0,0),(-8,0,0),(-10,0,0)], (72,0,-8)),
        ("ElectricalDeath","Electrical Death", "Short alternating impulses travel across shoulders and spine before muscular control releases into the fall.", [(0,0,0),(-16,0,13),(15,0,-13),(-18,0,10)], (62,0,15)),
        ("PoisonDeath","Poison Death", "Center folds around the abdomen, one hand searches for support, and balance decays gradually into a forward-side collapse.", [(0,0,0),(12,0,5),(20,0,-8),(28,0,-12)], (66,0,-20)),
        ("VoidDeath","Void Death", "Shoulders and hands pull toward an unseen center, stance narrows under inward tension, then the body loses support into a backward diagonal fall.", [(0,0,0),(-8,0,0),(-16,0,0),(-22,0,0)], (-68,0,22)),
    ]
    for slug, label, mechanics, beats, terminal_hips in death_specs:
        add(motion(slug, "death.status-elemental", label, 96, "ONE_SHOT", "stage_reaction", mechanics, [key(0,hands=GUARD_HANDS,grip=28), key(.18,rotations={"mixamorig:Spine2":beats[1]},hands=HIGH_GUARD_HANDS,grip=32), key(.36,root=(.015,-.03,.025),rotations={"mixamorig:Spine1":beats[2],"mixamorig:Spine2":beats[2]},hands={LEFT_HAND:(.20,.25,-.05),RIGHT_HAND:(-.20,.25,-.05)},grip=38), key(.58,root=(-.03,-.18,.08),rotations={**crouch,"mixamorig:Spine1":beats[3]},hands={LEFT_HAND:(.18,.10,-.02),RIGHT_HAND:(-.16,.12,-.04)},grounding="AIRBORNE",grip=40), key(.8,root=(-.06,-.34,.12),rotations={"mixamorig:Hips":terminal_hips,"mixamorig:Spine1":beats[3]},hands={LEFT_HAND:(.20,.02,.01),RIGHT_HAND:(-.13,.05,-.02)},grounding="FLOOR_CONTACT",grip=42), key(1,root=(-.07,-.40,.13),rotations={"mixamorig:Hips":terminal_hips,"mixamorig:Spine1":beats[3]},hands={LEFT_HAND:(.20,.00,.01),RIGHT_HAND:(-.12,.02,-.01)},grounding="FLOOR_CONTACT",grip=42)], {"statusOnset":.18,"statusPeak":.36,"collapse":.58,"floorContact":.8,"terminal":1.0}, floor_bones=[EXPECTED_ROOT,"mixamorig:Spine"]))

    names = [spec["name"] for spec in specs]
    if len(specs) != 50 or len(names) != len(set(names)):
        raise RuntimeError(f"Expected 50 unique authored specs, got {len(specs)} / {len(set(names))}")
    return specs


def validate_armature(armature: bpy.types.Object, source: Path) -> None:
    if len(armature.data.bones) != EXPECTED_BONES:
        raise RuntimeError(f"{source.name}: expected {EXPECTED_BONES} bones, got {len(armature.data.bones)}")
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if roots != [EXPECTED_ROOT]:
        raise RuntimeError(f"{source.name}: unexpected root bones {roots}")


def rest_pose(armature: bpy.types.Object) -> dict[str, tuple[float, ...]]:
    return {bone.name: tuple(round(value, 7) for row in bone.matrix_local for value in row) for bone in armature.data.bones}


def rest_difference(authority: dict[str, tuple[float, ...]], candidate: dict[str, tuple[float, ...]]) -> float:
    if authority.keys() != candidate.keys():
        raise RuntimeError("Rest skeleton bone-name set drifted")
    return max(abs(a - b) for name in authority for a, b in zip(authority[name], candidate[name]))


def set_frame(frame: float) -> None:
    integer = math.floor(frame)
    bpy.context.scene.frame_set(integer, subframe=frame - integer)
    bpy.context.view_layer.update()


def action_pose_hash(armature: bpy.types.Object, action: bpy.types.Action) -> str:
    digest = sha256(action.name.encode("utf-8"))
    start, end = [float(v) for v in action.frame_range]
    samples = [start + (end - start) * i / (FINGERPRINT_SAMPLES - 1) for i in range(FINGERPRINT_SAMPLES)]
    armature.animation_data.action = action
    for frame in samples:
        set_frame(frame)
        digest.update(struct.pack("<d", frame))
        for bone in sorted(armature.pose.bones, key=lambda item: item.name):
            digest.update(bone.name.encode("utf-8"))
            for row in bone.matrix_basis:
                for value in row:
                    digest.update(struct.pack("<f", round(float(value), 6)))
    armature.animation_data.action = None
    return digest.hexdigest().upper()


def import_rest_rig(path: Path) -> tuple[bpy.types.Object, int]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"{path.name}: expected one armature, got {len(armatures)}")
    armature = armatures[0]
    validate_armature(armature, path)
    imported_action_count = len(bpy.data.actions)
    if imported_action_count != EXPECTED_IMPORTED_ACTIONS:
        raise RuntimeError(f"Expected {EXPECTED_IMPORTED_ACTIONS} quarantined actions, got {imported_action_count}")
    for obj in bpy.context.scene.objects:
        if obj.animation_data:
            obj.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    if len(bpy.data.actions) != 0:
        raise RuntimeError("Source-action purge failed")
    armature.data.pose_position = "REST"
    bpy.context.view_layer.update()
    armature.data.pose_position = "POSE"
    for bone in armature.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
        bone.rotation_mode = "QUATERNION"
    bpy.context.view_layer.update()
    return armature, imported_action_count


def bone_depth(bone: bpy.types.PoseBone) -> int:
    depth = 0
    current = bone.parent
    while current:
        depth += 1
        current = current.parent
    return depth


def local_to_world(armature: bpy.types.Object, value: list[float] | tuple[float, float, float]) -> Vector:
    lateral, vertical, depth = value
    rig_local = Vector((-depth, vertical, -lateral))
    return armature.matrix_world @ rig_local


def authored_to_rig_vector(value: list[float] | tuple[float, float, float]) -> Vector:
    lateral, vertical, depth = value
    return Vector((-depth, vertical, -lateral))


def make_empty(name: str, world_location: Vector) -> bpy.types.Object:
    empty = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(empty)
    empty.location = world_location
    return empty


def install_ik(armature: bpy.types.Object) -> dict[str, dict[str, Any]]:
    definitions = {
        LEFT_HAND: (3, (0.28, 0.20, 0.18)),
        RIGHT_HAND: (3, (-0.28, 0.20, 0.18)),
        LEFT_FOOT: (3, (0.06, -0.24, -0.28)),
        RIGHT_FOOT: (3, (-0.06, -0.24, -0.28)),
    }
    controls: dict[str, dict[str, Any]] = {}
    for bone_name, (chain_count, pole_local) in definitions.items():
        is_foot = bone_name in {LEFT_FOOT, RIGHT_FOOT}
        ik_bone_name = (
            "mixamorig:LeftLeg"
            if bone_name == LEFT_FOOT
            else "mixamorig:RightLeg"
            if bone_name == RIGHT_FOOT
            else bone_name
        )
        target_point = (
            armature.data.bones[bone_name].head_local
            if bone_name in {LEFT_FOOT, RIGHT_FOOT}
            else armature.data.bones[bone_name].tail_local
        )
        target = make_empty(f"AuthoredIKTarget__{bone_name}", armature.matrix_world @ target_point)
        if bone_name in {LEFT_FOOT, RIGHT_FOOT}:
            target.rotation_mode = "QUATERNION"
            target.rotation_quaternion = (
                armature.matrix_world.to_3x3()
                @ armature.pose.bones[bone_name].matrix.to_3x3()
            ).to_quaternion()
        pole = make_empty(f"AuthoredIKPole__{bone_name}", local_to_world(armature, pole_local))
        constraint = armature.pose.bones[ik_bone_name].constraints.new("IK")
        constraint.name = f"AuthoredIK__{bone_name}"
        constraint.target = target
        constraint.pole_target = pole
        constraint.chain_count = 2 if is_foot else chain_count
        constraint.use_tail = True
        constraint.use_rotation = False
        constraint.use_stretch = False
        constraint.influence = 0.0
        chain_bone = armature.pose.bones[ik_bone_name]
        for _ in range(constraint.chain_count):
            chain_bone.ik_stretch = 0.0
            if chain_bone.parent is None:
                break
            chain_bone = chain_bone.parent
        rotation_constraint = None
        if is_foot:
            rotation_constraint = armature.pose.bones[bone_name].constraints.new("COPY_ROTATION")
            rotation_constraint.name = f"AuthoredFootRotation__{bone_name}"
            rotation_constraint.target = target
            rotation_constraint.owner_space = "WORLD"
            rotation_constraint.target_space = "WORLD"
            rotation_constraint.mix_mode = "REPLACE"
            rotation_constraint.influence = 0.0
        controls[bone_name] = {
            "bone": armature.pose.bones[ik_bone_name],
            "target": target,
            "pole": pole,
            "poleLocal": pole_local,
            "constraint": constraint,
            "rotationConstraint": rotation_constraint,
            "restRotation": target.rotation_quaternion.copy() if is_foot else None,
        }
    return controls


def reset_pose(armature: bpy.types.Object, controls: dict[str, dict[str, Any]]) -> None:
    for control in controls.values():
        control["constraint"].influence = 0.0
        if control["rotationConstraint"]:
            control["rotationConstraint"].influence = 0.0
    for bone in armature.pose.bones:
        bone.matrix_basis = Matrix.Identity(4)
        bone.rotation_mode = "QUATERNION"
    bpy.context.view_layer.update()


def apply_rotation(bone: bpy.types.PoseBone, degrees_xyz: list[float]) -> None:
    rotation = Quaternion((1.0, 0.0, 0.0, 0.0))
    for axis, degrees in zip((Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1))), degrees_xyz):
        rotation @= Quaternion(axis, math.radians(float(degrees)))
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = rotation


def apply_finger_grip(armature: bpy.types.Object, degrees: float) -> None:
    for bone in armature.pose.bones:
        if not (bone.name.startswith("mixamorig:LeftHand") or bone.name.startswith("mixamorig:RightHand")):
            continue
        if bone.name in {LEFT_HAND, RIGHT_HAND}:
            continue
        amount = degrees * (0.52 if "Thumb" in bone.name else 1.0)
        # Mixamo finger bones run along local Y and the palm normal is local Z;
        # flexion around local X wraps the fingers around a held shaft. Rotating
        # around Z abducts the fingers and leaves an implausible open palm.
        bone.matrix_basis @= Matrix.Rotation(math.radians(amount), 4, "X")


def configure_pose(armature: bpy.types.Object, controls: dict[str, dict[str, Any]], pose: dict[str, Any], floor_world_z: float) -> tuple[dict[str, Matrix], dict[str, float]]:
    reset_pose(armature, controls)
    root = armature.pose.bones[EXPECTED_ROOT]
    root.location = authored_to_rig_vector(pose["root"])
    for bone_name, degrees in pose["rotations"].items():
        if bone_name not in armature.pose.bones:
            raise RuntimeError(f"Authored pose references missing bone {bone_name}")
        apply_rotation(armature.pose.bones[bone_name], degrees)
    apply_finger_grip(armature, float(pose["gripDegrees"]))

    hand_targets: dict[str, Vector] = {}
    for bone_name, local_target in pose["hands"].items():
        pole_local = controls[bone_name]["poleLocal"]
        controls[bone_name]["pole"].location = local_to_world(
            armature,
            tuple(
                float(pole_local[index]) + float(pose["root"][index])
                for index in range(3)
            ),
        )
        authored_target = tuple(
            float(local_target[index])
            + (float(pose["root"][index]) if pose["handsFollowRoot"] else 0.0)
            for index in range(3)
        )
        world_target = local_to_world(armature, authored_target)
        controls[bone_name]["target"].location = world_target
        controls[bone_name]["constraint"].influence = 1.0
        hand_targets[bone_name] = world_target.copy()

    foot_targets: dict[str, Vector] = {}
    if pose["grounding"] == "PLANTED":
        for bone_name in (LEFT_FOOT, RIGHT_FOOT):
            if bone_name in pose["feet"]:
                world_target = local_to_world(armature, pose["feet"][bone_name])
            else:
                world_target = armature.matrix_world @ armature.data.bones[bone_name].head_local
            controls[bone_name]["target"].location = world_target
            controls[bone_name]["target"].rotation_quaternion = (
                Quaternion(Vector((0.0, 1.0, 0.0)), math.radians(float(pose["footPitchDegrees"].get(bone_name, 0.0))))
                @ controls[bone_name]["restRotation"]
            )
            controls[bone_name]["constraint"].influence = 1.0
            if controls[bone_name]["rotationConstraint"]:
                controls[bone_name]["rotationConstraint"].influence = 1.0
            foot_targets[bone_name] = world_target.copy()
    bpy.context.view_layer.update()

    if pose["grounding"] == "FLOOR_CONTACT":
        evaluated = armature.evaluated_get(bpy.context.evaluated_depsgraph_get())
        minimum = min((evaluated.matrix_world @ bone.head).z for bone in evaluated.pose.bones)
        floor_correction = floor_world_z - minimum
        root.location.y += floor_correction
        if pose["handsFollowRoot"]:
            world_correction = armature.matrix_world.to_3x3() @ Vector((0.0, floor_correction, 0.0))
            for bone_name in hand_targets:
                controls[bone_name]["target"].location += world_correction
                hand_targets[bone_name] += world_correction
        bpy.context.view_layer.update()

    evaluated = armature.evaluated_get(bpy.context.evaluated_depsgraph_get())
    matrices = {bone.name: bone.matrix.copy() for bone in evaluated.pose.bones}
    errors: dict[str, float] = {}
    for bone_name, target in hand_targets.items():
        actual = evaluated.matrix_world @ evaluated.pose.bones[bone_name].tail
        errors[f"hand:{bone_name}"] = (actual - target).length
    for bone_name, target in foot_targets.items():
        actual = evaluated.matrix_world @ evaluated.pose.bones[bone_name].head
        errors[f"foot:{bone_name}"] = (actual - target).length
    minimum = min((evaluated.matrix_world @ bone.head).z for bone in evaluated.pose.bones)
    errors["floorDelta"] = minimum - floor_world_z
    return matrices, errors


def key_matrices(
    armature: bpy.types.Object,
    controls: dict[str, dict[str, Any]],
    matrices: dict[str, Matrix],
    frame: int,
    quaternion_state: dict[str, Quaternion],
) -> None:
    for control in controls.values():
        control["constraint"].influence = 0.0
        if control["rotationConstraint"]:
            control["rotationConstraint"].influence = 0.0
    bpy.context.view_layer.update()
    for bone in sorted(armature.pose.bones, key=bone_depth):
        parent = bone.parent
        if parent:
            basis = bone.bone.convert_local_to_pose(
                matrices[bone.name],
                bone.bone.matrix_local,
                parent_matrix=matrices[parent.name],
                parent_matrix_local=parent.bone.matrix_local,
                invert=True,
            )
        else:
            basis = bone.bone.convert_local_to_pose(
                matrices[bone.name], bone.bone.matrix_local, invert=True
            )
        location, rotation, _scale = basis.decompose()
        rotation.normalize()
        previous_rotation = quaternion_state.get(bone.name)
        if previous_rotation is not None and rotation.dot(previous_rotation) < 0.0:
            rotation.negate()
        quaternion_state[bone.name] = rotation.copy()
        # The imported skinned mesh expects child-bone translation and scale to
        # remain at their bind-pose defaults.  Baking evaluated IK translation
        # or scale into those channels produces limb stretching even when the
        # armature-only re-import check passes.  Root motion belongs on Hips;
        # all other authored deformation is rotational.
        bone.location = location if bone.name == EXPECTED_ROOT else Vector((0.0, 0.0, 0.0))
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = rotation
        bone.scale = Vector((1.0, 1.0, 1.0))
        if bone.name == EXPECTED_ROOT:
            bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone.name)


def action_fcurves(action: bpy.types.Action) -> list[bpy.types.FCurve]:
    if action.is_action_layered:
        return [
            curve
            for layer in action.layers
            for strip in layer.strips
            for slot in action.slots
            if strip.type == "KEYFRAME" and strip.channelbag(slot) is not None
            for curve in strip.channelbag(slot).fcurves
        ]
    return list(action.fcurves)


def set_linear_interpolation(action: bpy.types.Action) -> None:
    # glTF animation plays linearly. Bezier quaternion-component overshoot can
    # flip an IK-authored limb between correct sparse keys, so authored curves
    # must match the exported playback contract before frame sampling.
    for curve in action_fcurves(action):
        for keyframe in curve.keyframe_points:
            keyframe.interpolation = "LINEAR"


def quaternion_delta_degrees(first: Quaternion, second: Quaternion) -> float:
    dot = max(-1.0, min(1.0, abs(first.dot(second))))
    return math.degrees(2.0 * math.acos(dot))


def validate_dense_staff_continuity(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    spec: dict[str, Any],
) -> dict[str, Any]:
    contract = spec.get("denseStaffContinuity")
    if not contract:
        raise RuntimeError(f"{spec['name']}: dense staff contract is missing")
    if len(spec["keyframes"]) != spec["durationFrames"]:
        raise RuntimeError(
            f"{spec['name']}: expected one constrained grip pose per frame, got "
            f"{len(spec['keyframes'])} for {spec['durationFrames']} frames"
        )
    armature.animation_data_create()
    armature.animation_data.action = action
    for track in armature.animation_data.nla_tracks:
        track.mute = True

    samples: list[dict[str, Any]] = []
    maximum_grip_error = 0.0
    worst_grip_frame = 1
    worst_grip_hand = LEFT_HAND
    maximum_axis_delta = 0.0
    worst_axis_transition = [1, 1]
    maximum_bone_delta = 0.0
    worst_bone_transition = [1, 1]
    worst_bone_name = EXPECTED_ROOT
    minimum_grip_distance = math.inf
    maximum_grip_distance = 0.0
    maximum_grip_distance_delta = 0.0
    worst_grip_distance_transition = [1, 1]
    minimum_rear_hand_forward_offset = math.inf
    minimum_rear_hand_forward_frame = 1
    chamber_elbow_angles: list[tuple[int, float]] = []
    previous_axis: Vector | None = None
    previous_grip_distance: float | None = None
    previous_rotations: dict[str, Quaternion] = {}
    forward = armature.matrix_world.to_3x3() @ Vector((1.0, 0.0, 0.0))
    forward.normalize()
    chamber_start, chamber_end = contract["guardChamberFrames"]

    for frame, pose in enumerate(spec["keyframes"], start=1):
        if set(pose["hands"]) != {LEFT_HAND, RIGHT_HAND}:
            raise RuntimeError(f"{spec['name']}: frame {frame} does not constrain both staff grips")
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        evaluated = armature.evaluated_get(bpy.context.evaluated_depsgraph_get())
        actual_hands: dict[str, Vector] = {}
        for hand_name in (LEFT_HAND, RIGHT_HAND):
            actual = evaluated.matrix_world @ evaluated.pose.bones[hand_name].tail
            expected = local_to_world(armature, pose["hands"][hand_name])
            error = (actual - expected).length
            actual_hands[hand_name] = actual
            if error > maximum_grip_error:
                maximum_grip_error = error
                worst_grip_frame = frame
                worst_grip_hand = hand_name
        axis_vector = actual_hands[LEFT_HAND] - actual_hands[RIGHT_HAND]
        if axis_vector.length_squared < 1e-10:
            raise RuntimeError(f"{spec['name']}: collapsed staff axis at frame {frame}")
        grip_distance = axis_vector.length
        minimum_grip_distance = min(minimum_grip_distance, grip_distance)
        maximum_grip_distance = max(maximum_grip_distance, grip_distance)
        if previous_grip_distance is not None:
            grip_distance_delta = abs(grip_distance - previous_grip_distance)
            if grip_distance_delta > maximum_grip_distance_delta:
                maximum_grip_distance_delta = grip_distance_delta
                worst_grip_distance_transition = [frame - 1, frame]
        previous_grip_distance = grip_distance
        axis = axis_vector.normalized()
        if previous_axis is not None:
            axis_delta = math.degrees(previous_axis.angle(axis))
            if axis_delta > maximum_axis_delta:
                maximum_axis_delta = axis_delta
                worst_axis_transition = [frame - 1, frame]
        previous_axis = axis.copy()

        current_rotations = {
            bone.name: bone.matrix.to_quaternion().normalized()
            for bone in evaluated.pose.bones
        }
        if previous_rotations:
            for bone_name, rotation in current_rotations.items():
                delta = quaternion_delta_degrees(previous_rotations[bone_name], rotation)
                if delta > maximum_bone_delta:
                    maximum_bone_delta = delta
                    worst_bone_transition = [frame - 1, frame]
                    worst_bone_name = bone_name
        previous_rotations = current_rotations
        torso = evaluated.matrix_world @ evaluated.pose.bones["mixamorig:Spine1"].head
        rear_hand_forward_offset = (actual_hands[RIGHT_HAND] - torso).dot(forward)
        if rear_hand_forward_offset < minimum_rear_hand_forward_offset:
            minimum_rear_hand_forward_offset = rear_hand_forward_offset
            minimum_rear_hand_forward_frame = frame
        shoulder = evaluated.matrix_world @ evaluated.pose.bones["mixamorig:RightArm"].head
        elbow = evaluated.matrix_world @ evaluated.pose.bones["mixamorig:RightForeArm"].head
        wrist = evaluated.matrix_world @ evaluated.pose.bones[RIGHT_HAND].head
        upper_arm = shoulder - elbow
        forearm = wrist - elbow
        if upper_arm.length_squared < 1e-10 or forearm.length_squared < 1e-10:
            raise RuntimeError(f"{spec['name']}: collapsed rear-arm segment at frame {frame}")
        rear_elbow_degrees = math.degrees(upper_arm.angle(forearm))
        if chamber_start <= frame <= chamber_end:
            chamber_elbow_angles.append((frame, rear_elbow_degrees))
        samples.append(
            {
                "axis": axis,
                "frontHand": actual_hands[LEFT_HAND],
                "rearHand": actual_hands[RIGHT_HAND],
                "torso": torso,
                "gripDistance": grip_distance,
                "rearHandForwardFromTorso": rear_hand_forward_offset,
                "rearElbowDegrees": rear_elbow_degrees,
            }
        )

    if maximum_grip_error > contract["maximumHandToGripError"]:
        raise RuntimeError(
            f"{spec['name']}: per-frame grip error {maximum_grip_error:.6f} at frame "
            f"{worst_grip_frame} on {worst_grip_hand} exceeds "
            f"{contract['maximumHandToGripError']:.6f}"
        )
    if maximum_axis_delta > contract["maximumAxisDeltaDegrees"]:
        raise RuntimeError(
            f"{spec['name']}: consecutive staff-axis delta {maximum_axis_delta:.3f} degrees "
            f"at frames {worst_axis_transition} exceeds "
            f"{contract['maximumAxisDeltaDegrees']:.3f}"
        )
    if maximum_bone_delta > contract["maximumBoneQuaternionDeltaDegrees"]:
        raise RuntimeError(
            f"{spec['name']}: consecutive quaternion delta {maximum_bone_delta:.3f} degrees "
            f"on {worst_bone_name} at frames {worst_bone_transition} exceeds "
            f"{contract['maximumBoneQuaternionDeltaDegrees']:.3f}"
        )
    if minimum_grip_distance < contract["minimumGripDistance"]:
        raise RuntimeError(
            f"{spec['name']}: minimum two-hand grip distance {minimum_grip_distance:.6f} "
            f"is below {contract['minimumGripDistance']:.6f}"
        )
    if maximum_grip_distance > contract["maximumGripDistance"]:
        raise RuntimeError(
            f"{spec['name']}: maximum two-hand grip distance {maximum_grip_distance:.6f} "
            f"exceeds {contract['maximumGripDistance']:.6f}"
        )
    if maximum_grip_distance_delta > contract["maximumConsecutiveGripDistanceDelta"]:
        raise RuntimeError(
            f"{spec['name']}: consecutive two-hand grip-distance delta "
            f"{maximum_grip_distance_delta:.6f} at frames "
            f"{worst_grip_distance_transition} exceeds "
            f"{contract['maximumConsecutiveGripDistanceDelta']:.6f}"
        )
    if minimum_rear_hand_forward_offset < contract["minimumRearHandForwardFromTorso"]:
        raise RuntimeError(
            f"{spec['name']}: rear hand crosses the torso back plane by "
            f"{minimum_rear_hand_forward_offset:.6f} at frame "
            f"{minimum_rear_hand_forward_frame}; required at least "
            f"{contract['minimumRearHandForwardFromTorso']:.6f} forward clearance"
        )
    if len(chamber_elbow_angles) != chamber_end - chamber_start + 1:
        raise RuntimeError(
            f"{spec['name']}: incomplete rear-elbow chamber sampling; "
            f"checked {len(chamber_elbow_angles)} frames"
        )
    minimum_chamber_elbow_frame, minimum_chamber_elbow = min(
        chamber_elbow_angles, key=lambda item: item[1]
    )
    maximum_chamber_elbow_frame, maximum_chamber_elbow = max(
        chamber_elbow_angles, key=lambda item: item[1]
    )
    if minimum_chamber_elbow < contract["minimumGuardChamberElbowDegrees"]:
        raise RuntimeError(
            f"{spec['name']}: rear elbow closes to {minimum_chamber_elbow:.3f} degrees "
            f"at frame {minimum_chamber_elbow_frame}; required at least "
            f"{contract['minimumGuardChamberElbowDegrees']:.3f}"
        )
    if maximum_chamber_elbow > contract["maximumGuardChamberElbowDegrees"]:
        raise RuntimeError(
            f"{spec['name']}: rear elbow opens to {maximum_chamber_elbow:.3f} degrees "
            f"at frame {maximum_chamber_elbow_frame}; required no more than "
            f"{contract['maximumGuardChamberElbowDegrees']:.3f}"
        )

    event_frames = {
        name: 1 + round(value * (spec["durationFrames"] - 1))
        for name, value in spec["events"].items()
    }
    load = samples[event_frames["rearwardLoad"] - 1]
    extension = samples[event_frames["hardExtension"] - 1]
    rear_hand_feed = load["gripDistance"] - extension["gripDistance"]
    if rear_hand_feed < contract["minimumRearHandFeedDistance"]:
        raise RuntimeError(
            f"{spec['name']}: rear hand feeds only {rear_hand_feed:.6f} along the "
            f"guided staff; required at least {contract['minimumRearHandFeedDistance']:.6f}"
        )
    rear_hand_axial_drive = (extension["rearHand"] - load["rearHand"]).dot(load["axis"])
    if rear_hand_axial_drive < contract["minimumRearHandAxialDrive"]:
        raise RuntimeError(
            f"{spec['name']}: rear-hand axial drive {rear_hand_axial_drive:.6f} is below "
            f"{contract['minimumRearHandAxialDrive']:.6f}"
        )
    load_front_tip = load["frontHand"] + load["axis"] * 0.9
    # The rear grip is the drive point while the front hand is a loose guide.
    # Grip contraction therefore represents the shaft feeding through the
    # front palm, rather than a telescoping prop or a stationary staff.
    extension_front_tip = (
        extension["frontHand"]
        + extension["axis"] * (0.9 + rear_hand_feed)
    )
    tip_displacement = extension_front_tip - load_front_tip
    tip_travel = tip_displacement.length
    torso_travel = (extension["torso"] - load["torso"]).length
    travel_ratio = tip_travel / max(torso_travel, 1e-8)
    axial_fraction = abs(tip_displacement.dot(load["axis"])) / max(tip_travel, 1e-8)
    if tip_travel < contract["minimumStaffTipTravel"]:
        raise RuntimeError(
            f"{spec['name']}: staff-tip travel {tip_travel:.6f} is below the "
            f"readability minimum {contract['minimumStaffTipTravel']:.6f}"
        )
    if torso_travel < contract["minimumTorsoTravel"]:
        raise RuntimeError(
            f"{spec['name']}: torso travel {torso_travel:.6f} is below the "
            f"weight-transfer minimum {contract['minimumTorsoTravel']:.6f}"
        )
    if travel_ratio < contract["minimumTipToTorsoTravelRatio"]:
        raise RuntimeError(
            f"{spec['name']}: staff-tip/torso travel ratio {travel_ratio:.3f} is below "
            f"{contract['minimumTipToTorsoTravelRatio']:.3f}"
        )
    if axial_fraction < contract["minimumTipAxialTravelFraction"]:
        raise RuntimeError(
            f"{spec['name']}: only {axial_fraction:.3f} of staff-tip travel is axial; "
            f"required at least {contract['minimumTipAxialTravelFraction']:.3f}"
        )
    return {
        "status": "PASS",
        "framesChecked": spec["durationFrames"],
        "bothHandsConstrainedEveryFrame": True,
        "quaternionHemisphereContinuity": True,
        "maximumHandToGripError": maximum_grip_error,
        "maximumHandToGripErrorFrame": worst_grip_frame,
        "maximumHandToGripErrorHand": worst_grip_hand,
        "maximumStaffAxisAngularDeltaDegrees": maximum_axis_delta,
        "maximumStaffAxisAngularDeltaFrames": worst_axis_transition,
        "maximumBoneQuaternionDeltaDegrees": maximum_bone_delta,
        "maximumBoneQuaternionDeltaFrames": worst_bone_transition,
        "maximumBoneQuaternionDeltaBone": worst_bone_name,
        "minimumTwoHandGripDistance": minimum_grip_distance,
        "maximumTwoHandGripDistance": maximum_grip_distance,
        "maximumConsecutiveGripDistanceDelta": maximum_grip_distance_delta,
        "maximumConsecutiveGripDistanceDeltaFrames": worst_grip_distance_transition,
        "minimumRearHandForwardFromTorso": minimum_rear_hand_forward_offset,
        "minimumRearHandForwardFromTorsoFrame": minimum_rear_hand_forward_frame,
        "minimumGuardChamberRearElbowDegrees": minimum_chamber_elbow,
        "minimumGuardChamberRearElbowFrame": minimum_chamber_elbow_frame,
        "maximumGuardChamberRearElbowDegrees": maximum_chamber_elbow,
        "maximumGuardChamberRearElbowFrame": maximum_chamber_elbow_frame,
        "rearHandFeedDistance": rear_hand_feed,
        "rearHandAxialDrive": rear_hand_axial_drive,
        "staffTipTravel": tip_travel,
        "minimumRequiredStaffTipTravel": contract["minimumStaffTipTravel"],
        "torsoTravel": torso_travel,
        "minimumRequiredTorsoTravel": contract["minimumTorsoTravel"],
        "staffTipToTorsoTravelRatio": travel_ratio,
        "staffTipAxialTravelFraction": axial_fraction,
    }


def validate_action_contract(spec: dict[str, Any], action: bpy.types.Action, pose_evidence: list[dict[str, Any]]) -> dict[str, Any]:
    required_hand_bones = set(spec["contactContract"]["gripHands"]) | {
        bone_name
        for bone_name in spec["contactContract"]["floorBones"]
        if bone_name in {LEFT_HAND, RIGHT_HAND}
    }
    hand_errors = [
        value
        for item in pose_evidence
        for name, value in item["errors"].items()
        if name.startswith("hand:") and name.removeprefix("hand:") in required_hand_bones
    ]
    foot_errors = [value for item in pose_evidence for name, value in item["errors"].items() if name.startswith("foot:")]
    floor_errors = [abs(item["errors"]["floorDelta"]) for item in pose_evidence if item["grounding"] == "FLOOR_CONTACT"]
    max_hand = max(hand_errors, default=0.0)
    max_foot = max(foot_errors, default=0.0)
    max_floor = max(floor_errors, default=0.0)
    if max_hand > MAXIMUM_IK_TARGET_ERROR:
        worst = max(
            (
                (value, item["frame"], name)
                for item in pose_evidence
                for name, value in item["errors"].items()
                if name.startswith("hand:")
                and name.removeprefix("hand:") in required_hand_bones
            ),
            default=(0.0, 0, "hand:none"),
        )
        raise RuntimeError(
            f"{spec['name']}: hand IK error {worst[0]:.6f} "
            f"at frame {worst[1]} on {worst[2]}"
        )
    if max_foot > MAXIMUM_PLANTED_FOOT_ERROR:
        worst = max(
            (
                (value, item["frame"], name)
                for item in pose_evidence
                for name, value in item["errors"].items()
                if name.startswith("foot:")
            ),
            default=(0.0, 0, "foot:none"),
        )
        raise RuntimeError(
            f"{spec['name']}: planted foot error {worst[0]:.6f} "
            f"at frame {worst[1]} on {worst[2]}"
        )
    if max_floor > MAXIMUM_FLOOR_ERROR:
        raise RuntimeError(f"{spec['name']}: floor normalization error {max_floor:.6f}")
    event_frames = {name: 1 + round(value * (spec["durationFrames"] - 1)) for name, value in spec["events"].items()}
    if any(frame < 1 or frame > spec["durationFrames"] for frame in event_frames.values()):
        raise RuntimeError(f"{spec['name']}: event outside authored range")
    return {
        "frameRange": [float(v) for v in action.frame_range],
        "eventFrames": event_frames,
        "maximumHandIkTargetError": max_hand,
        "maximumPlantedFootError": max_foot,
        "maximumFloorContactError": max_floor,
        "status": "PASS",
    }


def attach_tracks(armature: bpy.types.Object, actions: list[bpy.types.Action]) -> None:
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


def preview_contract(spec: dict[str, Any]) -> dict[str, Any]:
    duration = spec["durationFrames"] / FPS
    if spec["playIntent"] == "LOOP":
        recommended = max(4.0, min(8.0, duration * 2.0))
    else:
        recommended = max(2.5, min(8.0, duration + 1.0))
    if any(token in spec["name"] for token in ("Death", "Knockdown", "GetUp", "Blowback")):
        framing = "neutral accepted-body full-body three-quarter view with floor and complete displacement visible"
    elif spec["contactContract"]["virtualProp"] != "NONE":
        framing = "neutral accepted-body full-body three-quarter view with hands, prop proxy, sockets, and contact path unobstructed"
    else:
        framing = "neutral accepted-body full-body gameplay three-quarter view with hands and feet visible"
    return {
        "playIntent": spec["playIntent"],
        "recommendedDurationSeconds": round(recommended, 2),
        "recommendedCameraFraming": framing,
        "chatPreviewRequired": True,
        "ownerVerdictRequiredBeforeBreachV2": True,
    }


def main() -> None:
    args = parse_args()
    rest_rig_path = Path(args.rest_rig_glb).resolve()
    output_path = Path(args.output_glb).resolve()
    report_path = Path(args.report).resolve()
    script_path = Path(__file__).resolve()
    repository_root = Path.cwd().resolve()
    for staged_path in (output_path, report_path):
        try:
            relative_staged_path = staged_path.relative_to(QUARANTINE_ROOT)
        except ValueError as error:
            raise RuntimeError(
                f"Unapproved animation candidates must stage under {QUARANTINE_ROOT}; "
                f"refusing {staged_path}"
            ) from error
        if len(relative_staged_path.parts) < 2:
            raise RuntimeError(
                f"Animation candidates require a candidate-id directory below "
                f"{QUARANTINE_ROOT}; refusing {staged_path}"
            )
    for path in (rest_rig_path, script_path):
        if not path.is_file():
            raise FileNotFoundError(path)
    if file_sha256(rest_rig_path) != EXPECTED_REST_RIG_SHA256:
        raise RuntimeError("Rest-rig container SHA-256 drifted")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    specs = authored_specs()
    if args.only:
        requested_name = f"AuthoredCombatSpell__{args.only}Candidate"
        specs = [spec for spec in specs if spec["name"] == requested_name]
        if not specs:
            raise RuntimeError(f"Unknown authored action slug: {args.only}")
    armature, purged_action_count = import_rest_rig(rest_rig_path)
    authority_pose = rest_pose(armature)
    controls = install_ik(armature)
    floor_world_z = min((armature.matrix_world @ bone.tail_local).z for bone in armature.data.bones)
    body_height = max((armature.matrix_world @ bone.tail_local).z for bone in armature.data.bones) - floor_world_z
    if body_height <= 0:
        raise RuntimeError(f"Invalid rest-rig body height {body_height}")

    records: list[dict[str, Any]] = []
    actions: list[bpy.types.Action] = []
    for index, spec in enumerate(specs, start=1):
        action = bpy.data.actions.new(spec["name"])
        action.use_fake_user = True
        actions.append(action)
        armature.animation_data_create()
        armature.animation_data.action = action
        pose_evidence: list[dict[str, Any]] = []
        quaternion_state: dict[str, Quaternion] = {}
        for pose in spec["keyframes"]:
            frame = 1 + round(pose["at"] * (spec["durationFrames"] - 1))
            matrices, errors = configure_pose(armature, controls, pose, floor_world_z)
            armature.animation_data.action = action
            key_matrices(armature, controls, matrices, frame, quaternion_state)
            pose_evidence.append({"frame": frame, "at": pose["at"], "grounding": pose["grounding"], "errors": errors})
        set_linear_interpolation(action)
        validation = validate_action_contract(spec, action, pose_evidence)
        if spec.get("denseStaffContinuity"):
            validation["denseStaffContinuity"] = validate_dense_staff_continuity(
                armature, action, spec
            )
        armature.animation_data.action = None
        reference = {**REFERENCE_LIBRARY[spec["referenceKey"]], "mechanicsObserved": spec["mechanics"]}
        plan = {
            "authoringMethod": "ORIGINAL_BLENDER_KEYFRAMES_WITH_IK",
            "keyframes": spec["keyframes"],
            "events": validation["eventFrames"],
            "contactContract": spec["contactContract"],
            "reference": reference,
        }
        records.append({
            "name": spec["name"],
            "displayLabel": spec["displayLabel"],
            "requirementIds": spec["requirementIds"],
            "semanticRowIds": spec["requirementIds"],
            "status": "UNREVIEWED_ORIGINALLY_AUTHORED_CANDIDATE",
            "sourceActions": [],
            "sourceClipUse": "NONE",
            "authoringPlan": plan,
            "authoringPlanSha256": stable_hash(plan),
            "preExportSampledPoseSha256": action_pose_hash(armature, action),
            "frames": spec["durationFrames"],
            "fps": FPS,
            "events": validation["eventFrames"],
            "playIntent": spec["playIntent"],
            "physicalAnalogReferences": [reference],
            "contactValidation": validation,
            "recommendedPreview": preview_contract(spec),
            "remainingGates": [
                "NEUTRAL_ACCEPTED_BODY_WITH_CONTEXT_PROP_CHAT_PREVIEW",
                "OWNER_APPROVE_REJECT_OR_CHANGE",
                "NORMAL_SPEED_VISUAL_REVIEW",
                "HAND_AND_WEAPON_CONTACT_REVIEW",
                "MESH_DEFORMATION_REVIEW",
                "BREACH_V2_RUNTIME_GROUNDING",
                "OWNER_ACCEPTANCE",
            ],
        })
        print(f"AUTHORED_COMBAT_SPELL_PROGRESS={index}/{len(specs)} {spec['name']}")

    for control in controls.values():
        control["bone"].constraints.remove(control["constraint"])
        if control["rotationConstraint"]:
            foot_bone = armature.pose.bones[
                LEFT_FOOT if "Left" in control["rotationConstraint"].name else RIGHT_FOOT
            ]
            foot_bone.constraints.remove(control["rotationConstraint"])
        bpy.data.objects.remove(control["target"], do_unlink=True)
        bpy.data.objects.remove(control["pole"], do_unlink=True)
    attach_tracks(armature, actions)
    bpy.context.scene.render.fps = FPS
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
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

    expected_names = sorted(action.name for action in actions)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # glTF stores animation time in seconds. Import at the authored FPS so
    # frame-indexed contact/event validation is not silently rescaled to
    # Blender's 24 FPS factory default.
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=str(output_path))
    reimport_armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(reimport_armatures) != 1:
        raise RuntimeError(f"Output re-import expected one armature, got {len(reimport_armatures)}")
    reimport_armature = reimport_armatures[0]
    validate_armature(reimport_armature, output_path)
    reimport_actions = {action.name: action for action in bpy.data.actions}
    if sorted(reimport_actions) != expected_names:
        missing = sorted(set(expected_names) - set(reimport_actions))
        extra = sorted(set(reimport_actions) - set(expected_names))
        raise RuntimeError(f"Output action mismatch; missing={missing}, extra={extra}")
    reimport_armature.animation_data_create()
    for track in reimport_armature.animation_data.nla_tracks:
        track.mute = True
    maximum_rest_difference = rest_difference(authority_pose, rest_pose(reimport_armature))
    if maximum_rest_difference > MAXIMUM_REST_DIFFERENCE:
        raise RuntimeError(f"Output rest skeleton drifted by {maximum_rest_difference:.8f}")
    reimport_hashes = {name: action_pose_hash(reimport_armature, reimport_actions[name]) for name in expected_names}
    specs_by_name = {spec["name"]: spec for spec in specs}
    for record in records:
        record["reimportSampledPoseSha256"] = reimport_hashes[record["name"]]
        spec = specs_by_name[record["name"]]
        if spec.get("denseStaffContinuity"):
            record["contactValidation"]["reimportDenseStaffContinuity"] = (
                validate_dense_staff_continuity(
                    reimport_armature,
                    reimport_actions[record["name"]],
                    spec,
                )
            )

    required_ids = sorted({requirement for record in records for requirement in record["requirementIds"]})
    output_receipt = {
        "path": relative_path(output_path, repository_root),
        "bytes": output_path.stat().st_size,
        "sha256": file_sha256(output_path),
        "actionCount": len(expected_names),
        "stagingOnly": True,
    }
    report = {
        "schemaVersion": 1,
        "issue": 487,
        "status": "UNREVIEWED_ORIGINALLY_AUTHORED_COMBAT_SPELL_CANDIDATES",
        "acceptanceClaim": "NONE",
        "independentVisualReview": "REWORK",
        "ownerReview": "NOT_PRESENTED",
        "promotion": "QUARANTINED",
        "rejectedSourceDerivedPackIntegration": "NONE",
        "generator": {
            "path": relative_path(script_path, repository_root),
            "sha256": file_sha256(script_path),
            "blenderVersion": bpy.app.version_string,
            "blenderBuildHash": bpy.app.build_hash.decode("utf-8"),
            "blenderBuildDate": bpy.app.build_date.decode("utf-8"),
            "blenderBuildTime": bpy.app.build_time.decode("utf-8"),
        },
        "restRig": {
            "path": relative_path(rest_rig_path, repository_root),
            "bytes": rest_rig_path.stat().st_size,
            "sha256": file_sha256(rest_rig_path),
            "importedActionCount": purged_action_count,
            "purgedBeforeFirstFrameEvaluation": True,
            "sourceActionNamesRead": False,
            "sourceActionFramesEvaluated": 0,
            "sourceClipReuse": "PROHIBITED_AND_NOT_USED",
        },
        "skeleton": {
            "family": "mixamo-standard-65",
            "boneCount": EXPECTED_BONES,
            "rootBones": [EXPECTED_ROOT],
            "bodyHeightArmatureUnits": body_height,
            "floorWorldZ": floor_world_z,
            "reimportStatus": "PASS",
            "reimportBoneCount": len(reimport_armature.data.bones),
            "maximumRestDifference": maximum_rest_difference,
            "maximumAllowedRestDifference": MAXIMUM_REST_DIFFERENCE,
        },
        "output": output_receipt,
        "requirementIds": required_ids,
        "candidateCount": len(records),
        "candidates": records,
        "promotionOrder": [
            "GENERATE_ORIGINALLY_AUTHORED_CANDIDATE",
            "RENDER_NEUTRAL_ACCEPTED_BODY_WITH_CONTEXT_PROP_CHAT_PREVIEW",
            "OWNER_APPROVE_REJECT_OR_CHANGE",
            "QUEUE_ONLY_OWNER_APPROVED_CANDIDATES_FOR_BREACH_V2_EXHAUSTIVE_REVIEW",
        ],
        "globalRemainingGates": [
            "NEUTRAL_ACCEPTED_BODY_WITH_CONTEXT_PROP_CHAT_PREVIEWS",
            "OWNER_APPROVE_REJECT_OR_CHANGE",
            "NORMAL_SPEED_EXHAUSTIVE_REVIEW",
            "EQUIPMENT_SOCKET_AND_CONTACT_VISUAL_PROOF",
            "MESH_DEFORMATION_PROOF",
            "BREACH_V2_REAL_GAME_GROUNDING",
            "INDEPENDENT_VERIFICATION",
            "OWNER_ACCEPTANCE",
        ],
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("ISSUE_487_AUTHORED_COMBAT_SPELL=" + json.dumps({
        "candidateCount": len(records),
        "requirementCount": len(required_ids),
        "outputSha256": output_receipt["sha256"],
        "reimport": "PASS",
    }, sort_keys=True))


if __name__ == "__main__":
    main()
