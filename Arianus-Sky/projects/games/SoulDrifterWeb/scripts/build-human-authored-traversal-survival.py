"""Author issue #487 traversal/survival animation gaps from the clean rest rig.

This builder deliberately imports the animation-free accepted Human runtime GLB,
creates original Blender pose keys, and exports a separate action pack. It never
loads, samples, reverses, splices, overlays, relabels, or otherwise derives motion
from the canonical Mixamo animation library or the rejected gap-candidate packs.

Run with the cached Blender 5.2.1 LTS binary. Unapproved candidates are
written only to the issue evidence quarantine, never to public/assets:

    blender --background --python scripts/build-human-authored-traversal-survival.py -- \
      --rest-glb public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb \
      --candidate-id water-dive-v8 \
      --only AuthoredSurvival__WaterDive
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from hashlib import sha256
import json
from math import cos, pi, sin
from pathlib import Path
import struct
import sys
from typing import Callable

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector


FPS = 30
ROOT = "mixamorig:Hips"
EXPECTED_BONES = 65
EXPECTED_ROOTS = [ROOT]
EXPECTED_REST_SHA256 = "B86F7378ADA29FF11E0FBC030D438FE241B8D4A74C47AFD37CC8ACED28C5FF81"
REFERENCE_PACKET = "docs/HUMAN_AUTHORED_TRAVERSAL_SURVIVAL_REFERENCE_PACKET.md"
CANDIDATE_STAGING_ROOT = Path(
    "H:/CodexData/souldrifter-toolchain/evidence/487/animation-candidates/traversal"
)


@dataclass(frozen=True)
class AuthoredClip:
    name: str
    label: str
    requirement: str
    frames: int
    loop: bool
    airborne: bool
    root_policy: str
    reference_ids: tuple[str, ...]
    mechanics: tuple[str, ...]
    pose: Callable[[float], dict[str, object]]


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--rest-glb", required=True, type=Path)
    parser.add_argument("--candidate-id", required=True)
    parser.add_argument("--only", action="append", default=[])
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def ease_between(value: float, start: float, end: float) -> float:
    if end <= start:
        return float(value >= end)
    return smoothstep((value - start) / (end - start))


def bell(value: float, start: float, peak: float, end: float) -> float:
    if value <= peak:
        return ease_between(value, start, peak)
    return 1.0 - ease_between(value, peak, end)


def degrees(x: float, y: float, z: float) -> tuple[float, float, float]:
    return (x * pi / 180.0, y * pi / 180.0, z * pi / 180.0)


WATER_DIVE_RUN_STEPS = (
    # start, end, support side, support anchor, swing start, swing landing,
    # end of the heel/ball/toe support interval.
    (0.000, 0.135, "RIGHT", 0.18, -0.20, 0.82, 0.095),
    (0.135, 0.280, "LEFT", 0.82, 0.18, 1.55, 0.240),
    (0.280, 0.425, "RIGHT", 1.55, 0.82, 2.35, 0.390),
    (0.425, 0.535, "LEFT", 2.30, 1.55, 3.15, 0.535),
)


def scalar_lerp(left: float, right: float, blend: float) -> float:
    return left + (right - left) * blend


def dense_water_dive_run_pose(t: float) -> dict[str, object]:
    """Solve every run-up frame from gait phase, support, and IK contacts."""
    step = WATER_DIVE_RUN_STEPS[-1]
    for candidate in WATER_DIVE_RUN_STEPS:
        if t < candidate[1] or candidate is WATER_DIVE_RUN_STEPS[-1]:
            step = candidate
            break
    start, finish, support_side, support_anchor, swing_start, swing_end, support_end = step
    phase = max(0.0, min(1.0, (t - start) / max(1e-6, finish - start)))
    support_fraction = (support_end - start) / max(1e-6, finish - start)
    forward = 3.30 * t + 3.30 * t * t
    root_vertical = 0.0
    support_lift = 0.0
    if phase > support_fraction:
        flight = (phase - support_fraction) / max(1e-6, 1.0 - support_fraction)
        support_lift = 0.075 * sin(pi * flight)
        root_vertical = 0.055 + 0.035 * sin(pi * flight)
    swing_ease = smoothstep(phase)
    swing_forward = scalar_lerp(swing_start, swing_end, swing_ease)
    swing_lift = 0.205 * sin(pi * phase)
    stance_ankle = Vector((support_anchor, -0.444 + support_lift, 0.0))
    swing_ankle = Vector((swing_forward, -0.444 + swing_lift, 0.0))
    if support_side == "RIGHT":
        left_ankle = Vector((swing_ankle.x, swing_ankle.y, -0.079))
        right_ankle = Vector((stance_ankle.x, stance_ankle.y, 0.079))
        arm_direction = 1.0
    else:
        left_ankle = Vector((stance_ankle.x, stance_ankle.y, -0.079))
        right_ankle = Vector((swing_ankle.x, swing_ankle.y, 0.079))
        arm_direction = -1.0

    # A cosine piston exchanges arm lead exactly once per step. At mid-pass the
    # hands drop beside the waist so shoulder-to-hand distance keeps the elbows
    # bent instead of collapsing into the acute v7 pose.
    arm_wave = arm_direction * cos(pi * phase)
    hand_height = 0.16 - 0.075 * (1.0 - abs(arm_wave))
    left_hand = Vector((-0.03 + 0.17 * arm_wave, hand_height, -0.14))
    right_hand = Vector((-0.03 - 0.17 * arm_wave, hand_height, 0.14))

    # Heel-to-toe foot pitch changes continuously inside the declared stance.
    stance_pitch = scalar_lerp(-9.0, 18.0, smoothstep(min(1.0, phase / max(0.01, support_fraction))))
    swing_pitch = -12.0 + 22.0 * sin(pi * phase)
    if support_side == "RIGHT":
        left_foot, right_foot = swing_pitch, stance_pitch
    else:
        left_foot, right_foot = stance_pitch, swing_pitch
    torso_lean = 13.0 + 7.0 * (t / WATER_DIVE_RUN_CYCLE_END)
    stride_hint = sin(pi * phase)
    left_knee_hint = 22.0 + (48.0 * stride_hint if support_side == "RIGHT" else 12.0)
    right_knee_hint = 22.0 + (48.0 * stride_hint if support_side == "LEFT" else 12.0)
    lateral = (0.008 if support_side == "LEFT" else -0.008) * sin(pi * phase)
    return {
        "root": (lateral, root_vertical, forward),
        "rotations": {
            ROOT: degrees(torso_lean, 0.0, 0.0),
            "mixamorig:Spine": degrees(5.5, 0.0, 0.0),
            "mixamorig:Spine1": degrees(2.0, 0.0, 0.0),
            "mixamorig:Spine2": degrees(1.0, 0.0, 0.0),
            "mixamorig:Neck": degrees(-5.0, 0.0, 0.0),
            "mixamorig:Head": degrees(-2.0, 0.0, 0.0),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, 0.0),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, 0.0),
            "mixamorig:LeftLeg": degrees(-left_knee_hint, 0.0, 0.0),
            "mixamorig:RightLeg": degrees(-right_knee_hint, 0.0, 0.0),
            "mixamorig:LeftFoot": degrees(left_foot, 0.0, 0.0),
            "mixamorig:RightFoot": degrees(right_foot, 0.0, 0.0),
            "mixamorig:LeftToeBase": degrees(max(0.0, stance_pitch - 8.0), 0.0, 0.0),
            "mixamorig:RightToeBase": degrees(max(0.0, stance_pitch - 8.0), 0.0, 0.0),
        },
        "handTargets": {
            "mixamorig:LeftHand": left_hand,
            "mixamorig:RightHand": right_hand,
        },
        "legTargets": {
            "mixamorig:LeftLeg": left_ankle,
            "mixamorig:RightLeg": right_ankle,
        },
    }


def water_dive_v8_pose(t: float) -> dict[str, object]:
    """Author dense whole-body v8 motion without sampling any source clip."""
    if t <= WATER_DIVE_RUN_CYCLE_END:
        return dense_water_dive_run_pose(t)

    if t < WATER_DIVE_FINAL_PLANT_START:
        hurdle = (t - WATER_DIVE_RUN_CYCLE_END) / (
            WATER_DIVE_FINAL_PLANT_START - WATER_DIVE_RUN_CYCLE_END
        )
        blend = smoothstep(hurdle)
        forward = scalar_lerp(2.7094, 2.96, blend)
        vertical = 0.07 + 0.12 * sin(pi * hurdle)
        return {
            "root": (0.0, vertical, forward),
            "rotations": {
                ROOT: degrees(scalar_lerp(20.0, 23.0, blend), 0.0, 0.0),
                "mixamorig:Spine": degrees(scalar_lerp(5.5, 8.0, blend), 0.0, 0.0),
                "mixamorig:Spine1": degrees(2.0, 0.0, 0.0),
                "mixamorig:Spine2": degrees(1.0, 0.0, 0.0),
                "mixamorig:Neck": degrees(-5.0, 0.0, 0.0),
                "mixamorig:Head": degrees(-2.0, 0.0, 0.0),
                "mixamorig:LeftLeg": degrees(-42.0, 0.0, 0.0),
                "mixamorig:RightLeg": degrees(-78.0, 0.0, 0.0),
                "mixamorig:LeftFoot": degrees(12.0, 0.0, 0.0),
                "mixamorig:RightFoot": degrees(-10.0, 0.0, 0.0),
            },
            "handTargets": {
                "mixamorig:LeftHand": Vector((scalar_lerp(0.14, -0.18, blend), scalar_lerp(0.18, 0.16, blend), -0.12)),
                "mixamorig:RightHand": Vector((scalar_lerp(-0.20, -0.18, blend), scalar_lerp(0.18, 0.16, blend), 0.12)),
            },
            "legTargets": {
                "mixamorig:LeftLeg": Vector((scalar_lerp(2.35, 3.06, blend), -0.36 + 0.12 * sin(pi * hurdle), -0.079)),
                "mixamorig:RightLeg": Vector((scalar_lerp(3.15, 3.15, blend), -0.30 + 0.18 * sin(pi * hurdle), 0.079)),
            },
        }

    if t < WATER_DIVE_TAKEOFF:
        plant = (t - WATER_DIVE_FINAL_PLANT_START) / (
            WATER_DIVE_TAKEOFF - WATER_DIVE_FINAL_PLANT_START
        )
        load = sin(pi * plant)
        arm_drive = ease_between(plant, 0.42, 1.0)
        forward = scalar_lerp(2.96, 3.25, plant)
        vertical = -0.28 * load - 0.07 * plant
        left_hand = Vector((scalar_lerp(-0.20, 0.11, arm_drive), scalar_lerp(0.15, 0.49, arm_drive), scalar_lerp(-0.10, -0.04, arm_drive)))
        right_hand = Vector((scalar_lerp(-0.20, 0.11, arm_drive), scalar_lerp(0.15, 0.49, arm_drive), scalar_lerp(0.10, 0.04, arm_drive)))
        knee_flex = 34.0 + 64.0 * load
        return {
            "root": (0.0, vertical, forward),
            "rotations": {
                ROOT: degrees(23.0 + 12.0 * plant, 0.0, 0.0),
                "mixamorig:Spine": degrees(8.0 + 4.0 * load, 0.0, 0.0),
                "mixamorig:Spine1": degrees(3.0, 0.0, 0.0),
                "mixamorig:Spine2": degrees(1.0, 0.0, 0.0),
                "mixamorig:Neck": degrees(-7.0, 0.0, 0.0),
                "mixamorig:Head": degrees(-3.0, 0.0, 0.0),
                "mixamorig:LeftLeg": degrees(-knee_flex, 0.0, 0.0),
                "mixamorig:RightLeg": degrees(-knee_flex, 0.0, 0.0),
                "mixamorig:LeftFoot": degrees(-24.0 + 12.0 * plant, 0.0, 0.0),
                "mixamorig:RightFoot": degrees(-24.0 + 12.0 * plant, 0.0, 0.0),
                "mixamorig:LeftToeBase": degrees(-10.0, 0.0, 0.0),
                "mixamorig:RightToeBase": degrees(-10.0, 0.0, 0.0),
            },
            "handTargets": {
                "mixamorig:LeftHand": left_hand,
                "mixamorig:RightHand": right_hand,
            },
            "legTargets": {
                "mixamorig:LeftLeg": Vector((3.06, -0.444, -0.079)),
                "mixamorig:RightLeg": Vector((3.15, -0.444, 0.079)),
            },
        }

    flight = (t - WATER_DIVE_TAKEOFF) / (1.0 - WATER_DIVE_TAKEOFF)
    spear = smoothstep(min(1.0, flight / 0.24))
    pitch = scalar_lerp(41.0, 126.0, smoothstep(flight))
    forward = 3.25 + 2.50 * flight
    vertical = 0.05 + 3.60 * flight - 4.47 * flight * flight
    leg_join = scalar_lerp(6.0, 11.0, spear)
    return {
        "root": (0.0, vertical, forward),
        "rotations": {
            ROOT: degrees(pitch, 0.0, 0.0),
            "mixamorig:Spine": degrees(4.0 * (1.0 - spear), 0.0, 0.0),
            "mixamorig:Spine1": degrees(1.0 * (1.0 - spear), 0.0, 0.0),
            "mixamorig:Spine2": degrees(0.0, 0.0, 0.0),
            "mixamorig:Neck": degrees(-3.0 * (1.0 - spear), 0.0, 0.0),
            "mixamorig:Head": degrees(-1.0 * (1.0 - spear), 0.0, 0.0),
            "mixamorig:LeftUpLeg": degrees(5.0 * (1.0 - spear), 0.0, -leg_join),
            "mixamorig:RightUpLeg": degrees(4.0 * (1.0 - spear), 0.0, leg_join),
            "mixamorig:LeftLeg": degrees(-15.0 * (1.0 - spear) - 5.0 * spear, 0.0, 0.0),
            "mixamorig:RightLeg": degrees(-14.0 * (1.0 - spear) - 5.0 * spear, 0.0, 0.0),
            "mixamorig:LeftFoot": degrees(-42.0 - 12.0 * spear, 0.0, 0.0),
            "mixamorig:RightFoot": degrees(-42.0 - 12.0 * spear, 0.0, 0.0),
        },
        "handTargets": {
            "mixamorig:LeftHand": Vector((scalar_lerp(0.10, -0.02, spear), scalar_lerp(0.50, 0.82, spear), scalar_lerp(-0.04, 0.0, spear))),
            "mixamorig:RightHand": Vector((scalar_lerp(0.10, -0.02, spear), scalar_lerp(0.50, 0.82, spear), scalar_lerp(0.04, 0.0, spear))),
        },
        "legTargets": {},
    }


def natural_hands(swing: float = 0.0) -> dict[str, Vector]:
    return {
        "mixamorig:LeftHand": Vector((-0.03 - swing, 0.13, -0.18)),
        "mixamorig:RightHand": Vector((-0.03 + swing, 0.13, 0.18)),
    }


def shimmy_left_pose(t: float) -> dict[str, object]:
    reach_left = 0.5 - 0.5 * cos(4.0 * pi * t)
    reach_right = 0.5 - 0.5 * cos(4.0 * pi * t + pi)
    swing = sin(4.0 * pi * t)
    return {
        "root": (0.035 * sin(2.0 * pi * t), 0.0, -0.82 * t),
        "rotations": {
            ROOT: degrees(2.0 * swing, -7.0 * swing, 0.0),
            "mixamorig:Spine": degrees(0.0, 9.0 * swing, 0.0),
            "mixamorig:Spine2": degrees(0.0, -7.0 * swing, 0.0),
            "mixamorig:LeftUpLeg": degrees(-10.0 * swing, 0.0, 10.0 + 8.0 * swing),
            "mixamorig:RightUpLeg": degrees(8.0 * swing, 0.0, 18.0 - 6.0 * swing),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 36.0 + 12.0 * swing),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 48.0 - 15.0 * swing),
        },
        "handTargets": {
            "mixamorig:LeftHand": Vector((0.03, 0.63 + 0.07 * reach_left, -0.20 - 0.11 * reach_left)),
            "mixamorig:RightHand": Vector((0.02, 0.64 + 0.05 * reach_right, 0.13 - 0.08 * reach_right)),
        },
    }


def shimmy_right_pose(t: float) -> dict[str, object]:
    reach_right = 0.5 - 0.5 * cos(4.0 * pi * t)
    reach_left = 0.5 - 0.5 * cos(4.0 * pi * t + pi)
    swing = sin(4.0 * pi * t + 0.22)
    return {
        "root": (0.028 * sin(2.0 * pi * t + 0.2), 0.0, 0.82 * t),
        "rotations": {
            ROOT: degrees(-2.0 * swing, 8.0 * swing, 0.0),
            "mixamorig:Spine": degrees(0.0, -10.0 * swing, 0.0),
            "mixamorig:Spine2": degrees(0.0, 8.0 * swing, 0.0),
            "mixamorig:LeftUpLeg": degrees(-7.0 * swing, 0.0, 17.0 - 6.0 * swing),
            "mixamorig:RightUpLeg": degrees(11.0 * swing, 0.0, 9.0 + 9.0 * swing),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 46.0 - 14.0 * swing),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 34.0 + 13.0 * swing),
        },
        "handTargets": {
            "mixamorig:LeftHand": Vector((0.02, 0.64 + 0.05 * reach_left, -0.13 + 0.08 * reach_left)),
            "mixamorig:RightHand": Vector((0.03, 0.63 + 0.07 * reach_right, 0.20 + 0.11 * reach_right)),
        },
    }


def underwater_swim_pose(t: float) -> dict[str, object]:
    stroke = 0.5 - 0.5 * cos(2.0 * pi * t)
    kick = sin(2.0 * pi * t)
    return {
        "root": (1.55 * t, -0.62 + 0.055 * sin(2.0 * pi * t), 0.0),
        "rotations": {
            ROOT: degrees(0.0, 0.0, -88.0),
            "mixamorig:Spine": degrees(0.0, 0.0, 8.0 * kick),
            "mixamorig:Spine1": degrees(0.0, 0.0, -5.0 * kick),
            "mixamorig:Neck": degrees(0.0, 0.0, 16.0),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, 18.0 * kick),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, 18.0 * kick),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, -28.0 * kick),
            "mixamorig:RightLeg": degrees(0.0, 0.0, -28.0 * kick),
            "mixamorig:LeftFoot": degrees(0.0, 0.0, 22.0 * kick),
            "mixamorig:RightFoot": degrees(0.0, 0.0, 22.0 * kick),
        },
        "handTargets": {
            "mixamorig:LeftHand": Vector((0.62 - 0.52 * stroke, 0.43 - 0.24 * stroke, -0.055 - 0.24 * stroke)),
            "mixamorig:RightHand": Vector((0.62 - 0.52 * stroke, 0.43 - 0.24 * stroke, 0.055 + 0.24 * stroke)),
        },
    }


def open_water_surface_pose(t: float) -> dict[str, object]:
    rise = smoothstep(t)
    turn_upright = ease_between(t, 0.04, 0.78)
    press = bell(t, 0.02, 0.30, 0.66)
    settle = ease_between(t, 0.58, 1.0)
    kick = sin(5.0 * pi * t)
    kick_effort = 1.0 - 0.68 * settle
    left_press = Vector((
        0.48 - 0.46 * press,
        0.38 - 0.31 * press,
        -0.07 - 0.27 * press,
    ))
    right_press = Vector((
        0.48 - 0.46 * press,
        0.38 - 0.31 * press,
        0.07 + 0.27 * press,
    ))
    # Once the head clears the water, recover to a quiet tread-ready posture.
    # The v1 target returned both hands to a rigid forward reach, which read as
    # a T-pose-like hold instead of a completed surface transition.
    left_hand = Vector((
        scalar_lerp(left_press.x, -0.03, settle),
        scalar_lerp(left_press.y, 0.13, settle),
        scalar_lerp(left_press.z, -0.18, settle),
    ))
    right_hand = Vector((
        scalar_lerp(right_press.x, -0.03, settle),
        scalar_lerp(right_press.y, 0.13, settle),
        scalar_lerp(right_press.z, 0.18, settle),
    ))
    return {
        "root": (0.38 * t, -0.92 + 0.94 * rise, 0.018 * sin(pi * t)),
        "rotations": {
            ROOT: degrees(0.0, 0.0, -68.0 * (1.0 - turn_upright)),
            "mixamorig:Spine": degrees(0.0, 0.0, 12.0 * (1.0 - turn_upright)),
            "mixamorig:Spine1": degrees(0.0, 0.0, -4.0 * (1.0 - turn_upright)),
            "mixamorig:Spine2": degrees(0.0, 0.0, -7.0 * (1.0 - turn_upright)),
            "mixamorig:Neck": degrees(0.0, 0.0, 20.0 * (1.0 - turn_upright)),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, 18.0 * kick * kick_effort),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, -18.0 * kick * kick_effort),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 32.0 * max(0.0, -kick) * kick_effort),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 32.0 * max(0.0, kick) * kick_effort),
            "mixamorig:LeftFoot": degrees(0.0, 0.0, -12.0 * kick * kick_effort),
            "mixamorig:RightFoot": degrees(0.0, 0.0, 12.0 * kick * kick_effort),
        },
        "handTargets": {
            "mixamorig:LeftHand": left_hand,
            "mixamorig:RightHand": right_hand,
        },
    }


def drowning_pose(t: float) -> dict[str, object]:
    # The tired-swimmer reference reads as a prolonged, irregular attempt to
    # keep the face above the surface before effort collapses.  Hold buoyancy
    # through the first half, then let the reach/kick amplitudes decay before
    # the terminal sink begins.  Deliberately use different left/right phases
    # so this never becomes a synchronized exercise stroke.
    effort = max(0.0, 1.0 - ease_between(t, 0.58, 0.90))
    collapse = ease_between(t, 0.56, 0.88)
    sink = ease_between(t, 0.62, 1.0)
    left_reach = sin(10.0 * pi * t + 0.18) * effort
    right_reach = sin(7.0 * pi * t + 1.12) * effort
    left_kick = sin(9.0 * pi * t + 0.62) * effort
    right_kick = sin(7.0 * pi * t + 2.08) * effort
    roll = 0.55 * left_reach - 0.38 * right_reach
    bob = (0.045 * sin(6.0 * pi * t + 0.30) + 0.018 * sin(11.0 * pi * t)) * effort
    return {
        "root": (
            0.045 * sin(3.0 * pi * t) * effort,
            -0.18 - 0.08 * collapse - 1.12 * sink + bob,
            0.032 * sin(4.0 * pi * t + 0.35) * effort,
        ),
        "rotations": {
            ROOT: degrees(3.0 * roll, 8.0 * roll, 4.0 + 34.0 * collapse),
            "mixamorig:Spine": degrees(7.0 * roll, -6.0 * right_reach, -11.0 * collapse),
            "mixamorig:Spine1": degrees(-4.0 * right_reach, 5.0 * left_reach, -7.0 * collapse),
            "mixamorig:Spine2": degrees(-6.0 * roll, 8.0 * right_reach, 6.0 * collapse),
            "mixamorig:Neck": degrees(0.0, -8.0 * roll, -14.0 * collapse),
            "mixamorig:Head": degrees(0.0, 9.0 * roll, 8.0 * collapse),
            "mixamorig:LeftUpLeg": degrees(8.0 * left_kick, 0.0, 17.0 * effort + 5.0 * collapse),
            "mixamorig:RightUpLeg": degrees(-9.0 * right_kick, 0.0, -14.0 * effort + 4.0 * collapse),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 18.0 + 28.0 * max(0.0, left_kick)),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 15.0 + 25.0 * max(0.0, right_kick)),
            "mixamorig:LeftFoot": degrees(0.0, 0.0, 10.0 * left_kick),
            "mixamorig:RightFoot": degrees(0.0, 0.0, 9.0 * right_kick),
        },
        "handTargets": {
            "mixamorig:LeftHand": Vector((
                (0.04 + 0.18 * left_reach) * (1.0 - 0.35 * collapse),
                0.38 + 0.17 * max(0.0, left_reach) * effort - 0.16 * collapse,
                -0.24 - 0.11 * left_reach * effort,
            )),
            "mixamorig:RightHand": Vector((
                (0.02 + 0.17 * right_reach) * (1.0 - 0.35 * collapse),
                0.40 + 0.16 * max(0.0, right_reach) * effort - 0.17 * collapse,
                0.23 + 0.10 * right_reach * effort,
            )),
        },
    }


def npc_listen_pose(t: float) -> dict[str, object]:
    breath = sin(2.0 * pi * t)
    nod = sin(4.0 * pi * t) * (0.5 - 0.5 * cos(2.0 * pi * t))
    return {
        "root": (0.0, 0.008 * breath, 0.012 * sin(2.0 * pi * t + 0.4)),
        "rotations": {
            ROOT: degrees(0.0, 2.0 * breath, 0.0),
            "mixamorig:Spine": degrees(0.0, -2.0 * breath, -2.5),
            "mixamorig:Spine2": degrees(0.0, 1.5 * breath, -3.0),
            "mixamorig:Neck": degrees(0.0, 2.0 * breath, 5.0 * nod),
            "mixamorig:Head": degrees(0.0, -1.5 * breath, 7.0 * nod),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, 2.0 * breath),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, -1.0 * breath),
        },
        "handTargets": natural_hands(0.012 * breath),
    }


def npc_farewell_pose(t: float) -> dict[str, object]:
    raise_hand = bell(t, 0.08, 0.28, 0.88)
    wave = sin(8.0 * pi * t) * raise_hand
    turn = ease_between(t, 0.66, 1.0)
    targets = natural_hands(0.0)
    targets["mixamorig:RightHand"] = Vector((0.08, 0.48 + 0.04 * wave, 0.22 + 0.06 * wave))
    return {
        "root": (0.08 * turn, 0.0, 0.0),
        "rotations": {
            ROOT: degrees(0.0, -14.0 * turn, 0.0),
            "mixamorig:Spine": degrees(0.0, 6.0 * raise_hand - 5.0 * turn, 0.0),
            "mixamorig:Neck": degrees(0.0, 8.0 * raise_hand + 4.0 * turn, 0.0),
            "mixamorig:Head": degrees(0.0, -5.0 * raise_hand, 0.0),
            "mixamorig:RightHand": degrees(0.0, 0.0, 24.0 * wave),
        },
        "handTargets": targets,
    }


def walk_start_pose(t: float) -> dict[str, object]:
    stride = sin(2.0 * pi * (t - 0.12)) * smoothstep(t)
    crouch = bell(t, 0.0, 0.17, 0.38)
    return {
        "root": (0.82 * smoothstep(t), -0.045 * crouch, 0.0),
        "rotations": {
            ROOT: degrees(0.0, 0.0, -5.0 * smoothstep(t)),
            "mixamorig:Spine": degrees(0.0, 0.0, -4.0 * smoothstep(t)),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, 29.0 * stride - 10.0 * crouch),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, -29.0 * stride - 7.0 * crouch),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 40.0 * max(0.0, -stride) + 22.0 * crouch),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 40.0 * max(0.0, stride) + 22.0 * crouch),
        },
        "handTargets": natural_hands(0.11 * stride),
    }


def walk_stop_pose(t: float) -> dict[str, object]:
    travel = 1.0 - (1.0 - t) ** 3
    plant = bell(t, 0.20, 0.53, 0.88)
    settle = ease_between(t, 0.68, 1.0)
    return {
        "root": (0.67 * travel, -0.055 * plant, 0.0),
        "rotations": {
            ROOT: degrees(0.0, 0.0, 7.0 * plant - 7.0 * (1.0 - settle)),
            "mixamorig:Spine": degrees(0.0, 0.0, 6.0 * plant),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, -34.0 * plant),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, 18.0 * plant),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 12.0 * plant),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 48.0 * plant),
            "mixamorig:LeftFoot": degrees(0.0, 0.0, -16.0 * plant),
        },
        "handTargets": natural_hands(-0.10 * plant),
    }


def run_start_pose(t: float) -> dict[str, object]:
    drive = smoothstep(t)
    stride = sin(3.0 * pi * t - 0.45) * drive
    preload = bell(t, 0.0, 0.14, 0.34)
    return {
        "root": (1.86 * t * t, -0.10 * preload, 0.0),
        "rotations": {
            ROOT: degrees(0.0, 0.0, -15.0 * drive + 5.0 * preload),
            "mixamorig:Spine": degrees(0.0, 0.0, -9.0 * drive),
            "mixamorig:Spine2": degrees(0.0, 0.0, -5.0 * drive),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, 44.0 * stride - 18.0 * preload),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, -44.0 * stride - 12.0 * preload),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 62.0 * max(0.0, -stride) + 34.0 * preload),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 62.0 * max(0.0, stride) + 34.0 * preload),
        },
        "handTargets": natural_hands(0.19 * stride),
    }


def run_stop_pose(t: float) -> dict[str, object]:
    travel = 1.0 - (1.0 - t) ** 3
    brace = bell(t, 0.12, 0.46, 0.86)
    recover = ease_between(t, 0.72, 1.0)
    return {
        "root": (1.52 * travel, -0.13 * brace, 0.0),
        "rotations": {
            ROOT: degrees(0.0, 0.0, 18.0 * brace - 12.0 * (1.0 - recover)),
            "mixamorig:Spine": degrees(0.0, 0.0, 13.0 * brace),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, -48.0 * brace),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, 30.0 * brace),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 24.0 * brace),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 66.0 * brace),
            "mixamorig:LeftFoot": degrees(0.0, 0.0, -22.0 * brace),
        },
        "handTargets": natural_hands(-0.20 * brace),
    }


def spell_impact_knockback_fall_pose(t: float) -> dict[str, object]:
    """Receive a chest impact, lose balance, fall, and remain grounded."""
    impact = ease_between(t, 0.055, 0.155)
    recoil = bell(t, 0.055, 0.17, 0.40)
    loss = ease_between(t, 0.14, 0.66)
    settle = ease_between(t, 0.64, 0.88)
    still = ease_between(t, 0.86, 1.0)
    trip = bell(t, 0.14, 0.34, 0.66)

    if t < 0.14:
        root_x = -0.045 * impact
        root_y = 0.0
    elif t < 0.66:
        flight = (t - 0.14) / 0.52
        root_x = -0.045 - 0.98 * smoothstep(flight)
        root_y = 0.19 * sin(pi * flight) - 0.035 * flight
    else:
        grounded = (t - 0.66) / 0.34
        root_x = -1.025 - 0.08 * smoothstep(grounded)
        root_y = -0.035 * (1.0 - still)

    left_fling = Vector((
        -0.04 - 0.08 * loss,
        0.13 + 0.24 * recoil - 0.03 * settle,
        -0.18 - 0.27 * recoil - 0.08 * loss,
    ))
    right_fling = Vector((
        -0.02 - 0.05 * loss,
        0.13 + 0.20 * recoil - 0.02 * settle,
        0.18 + 0.24 * recoil + 0.04 * loss,
    ))
    # End in an asymmetrical but relaxed ground pose; do not transition into a
    # get-up, idle, or automatic recovery inside this reaction clip.
    left_hand = Vector((
        scalar_lerp(left_fling.x, -0.11, settle),
        scalar_lerp(left_fling.y, 0.15, settle),
        scalar_lerp(left_fling.z, -0.43, settle),
    ))
    right_hand = Vector((
        scalar_lerp(right_fling.x, -0.10, settle),
        scalar_lerp(right_fling.y, 0.13, settle),
        scalar_lerp(right_fling.z, 0.40, settle),
    ))
    backward_pitch = 18.0 * recoil + 94.0 * loss - 4.0 * settle
    return {
        "root": (root_x, root_y, 0.035 * sin(pi * loss) * (1.0 - settle)),
        "rotations": {
            ROOT: degrees(3.0 * recoil, -5.0 * trip, backward_pitch),
            "mixamorig:Spine": degrees(2.0 * recoil, 4.0 * trip, -18.0 * recoil + 9.0 * settle),
            "mixamorig:Spine1": degrees(-3.0 * recoil, -5.0 * trip, -12.0 * recoil + 7.0 * settle),
            "mixamorig:Spine2": degrees(2.0 * recoil, 3.0 * trip, -7.0 * recoil + 4.0 * settle),
            "mixamorig:Neck": degrees(0.0, 4.0 * trip, -21.0 * loss + 14.0 * settle),
            "mixamorig:Head": degrees(0.0, -3.0 * trip, -8.0 * loss + 5.0 * settle),
            "mixamorig:LeftUpLeg": degrees(-5.0 * trip, 0.0, -25.0 * trip + 7.0 * settle),
            "mixamorig:RightUpLeg": degrees(7.0 * trip, 0.0, 20.0 * trip - 4.0 * settle),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 48.0 * trip + 9.0 * settle),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 31.0 * trip + 13.0 * settle),
            "mixamorig:LeftFoot": degrees(0.0, 0.0, -12.0 * trip - 2.0 * settle),
            "mixamorig:RightFoot": degrees(0.0, 0.0, 10.0 * trip - 2.0 * settle),
        },
        "handTargets": {
            "mixamorig:LeftHand": left_hand,
            "mixamorig:RightHand": right_hand,
        },
    }


def neutral_fall_pose(t: float) -> dict[str, object]:
    drift = sin(2.0 * pi * t)
    return {
        "root": (0.0, 0.0, 0.0),
        "rotations": {
            ROOT: degrees(2.0 * drift, 3.0 * drift, -88.0),
            "mixamorig:Spine": degrees(0.0, -3.0 * drift, 12.0),
            "mixamorig:Spine2": degrees(0.0, 2.0 * drift, -7.0),
            "mixamorig:Neck": degrees(0.0, 0.0, 24.0),
            "mixamorig:LeftUpLeg": degrees(-8.0, 0.0, 19.0 + 4.0 * drift),
            "mixamorig:RightUpLeg": degrees(8.0, 0.0, 19.0 - 4.0 * drift),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 42.0 + 5.0 * drift),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 42.0 - 5.0 * drift),
        },
        "handTargets": {
            "mixamorig:LeftHand": Vector((0.02, 0.25, -0.43 + 0.02 * drift)),
            "mixamorig:RightHand": Vector((0.02, 0.25, 0.43 - 0.02 * drift)),
        },
    }


def neutral_land_to_run_pose(t: float) -> dict[str, object]:
    impact = bell(t, 0.22, 0.37, 0.58)
    launch = ease_between(t, 0.40, 1.0)
    stride = sin(2.5 * pi * max(0.0, t - 0.42)) * launch
    root_y = 0.68 * (1.0 - ease_between(t, 0.0, 0.36)) - 0.10 * impact
    return {
        "root": (1.62 * smoothstep(t), root_y, 0.0),
        "rotations": {
            ROOT: degrees(0.0, 0.0, -22.0 * (1.0 - impact) - 12.0 * launch),
            "mixamorig:Spine": degrees(0.0, 0.0, 18.0 * impact - 8.0 * launch),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, -32.0 * impact + 38.0 * stride),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, -24.0 * impact - 38.0 * stride),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 62.0 * impact + 55.0 * max(0.0, -stride)),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 58.0 * impact + 55.0 * max(0.0, stride)),
        },
        "handTargets": natural_hands(0.18 * stride - 0.12 * impact),
    }


def dodge_forward_pose(t: float) -> dict[str, object]:
    burst = smoothstep(t)
    crouch = bell(t, 0.02, 0.34, 0.82)
    return {
        "root": (0.92 * burst, -0.12 * crouch, -0.04 * sin(pi * t)),
        "rotations": {ROOT: degrees(0.0, -4.0 * crouch, -22.0 * crouch), "mixamorig:Spine": degrees(0.0, 3.0 * crouch, -12.0 * crouch), "mixamorig:LeftUpLeg": degrees(0.0, 0.0, -38.0 * crouch), "mixamorig:RightUpLeg": degrees(0.0, 0.0, 28.0 * crouch), "mixamorig:LeftLeg": degrees(0.0, 0.0, 48.0 * crouch), "mixamorig:RightLeg": degrees(0.0, 0.0, 62.0 * crouch)},
        "handTargets": natural_hands(-0.18 * crouch),
    }


def dodge_backward_pose(t: float) -> dict[str, object]:
    retreat = smoothstep(t)
    brace = bell(t, 0.03, 0.39, 0.86)
    return {
        "root": (-0.68 * retreat, -0.10 * brace, 0.035 * sin(pi * t)),
        "rotations": {ROOT: degrees(0.0, 5.0 * brace, 18.0 * brace), "mixamorig:Spine": degrees(0.0, -4.0 * brace, 11.0 * brace), "mixamorig:LeftUpLeg": degrees(0.0, 0.0, 31.0 * brace), "mixamorig:RightUpLeg": degrees(0.0, 0.0, -35.0 * brace), "mixamorig:LeftLeg": degrees(0.0, 0.0, 57.0 * brace), "mixamorig:RightLeg": degrees(0.0, 0.0, 43.0 * brace)},
        "handTargets": natural_hands(0.16 * brace),
    }


def dodge_left_pose(t: float) -> dict[str, object]:
    shift = smoothstep(t)
    load = bell(t, 0.02, 0.31, 0.80)
    return {
        "root": (0.08 * sin(pi * t), -0.11 * load, -0.78 * shift),
        "rotations": {ROOT: degrees(-18.0 * load, -9.0 * load, -5.0 * load), "mixamorig:Spine": degrees(11.0 * load, 5.0 * load, 0.0), "mixamorig:LeftUpLeg": degrees(-24.0 * load, 0.0, -18.0 * load), "mixamorig:RightUpLeg": degrees(18.0 * load, 0.0, -8.0 * load), "mixamorig:LeftLeg": degrees(0.0, 0.0, 56.0 * load), "mixamorig:RightLeg": degrees(0.0, 0.0, 38.0 * load)},
        "handTargets": natural_hands(-0.08 * load),
    }


def dodge_right_pose(t: float) -> dict[str, object]:
    shift = smoothstep(t)
    load = bell(t, 0.04, 0.36, 0.84)
    return {
        "root": (0.06 * sin(pi * t), -0.105 * load, 0.80 * shift),
        "rotations": {ROOT: degrees(19.0 * load, 8.0 * load, -4.0 * load), "mixamorig:Spine": degrees(-12.0 * load, -4.0 * load, 0.0), "mixamorig:LeftUpLeg": degrees(-17.0 * load, 0.0, -7.0 * load), "mixamorig:RightUpLeg": degrees(25.0 * load, 0.0, -19.0 * load), "mixamorig:LeftLeg": degrees(0.0, 0.0, 39.0 * load), "mixamorig:RightLeg": degrees(0.0, 0.0, 58.0 * load)},
        "handTargets": natural_hands(0.09 * load),
    }


def stairs_ascend_pose(t: float) -> dict[str, object]:
    cycle = sin(8.0 * pi * t)
    lift_left = max(0.0, cycle)
    lift_right = max(0.0, -cycle)
    return {
        "root": (1.22 * t, 0.72 * t + 0.018 * (1.0 - cos(8.0 * pi * t)), 0.0),
        "rotations": {ROOT: degrees(0.0, 0.0, -8.0), "mixamorig:Spine": degrees(0.0, 0.0, -5.0), "mixamorig:LeftUpLeg": degrees(0.0, 0.0, -42.0 * lift_left + 20.0 * lift_right), "mixamorig:RightUpLeg": degrees(0.0, 0.0, -42.0 * lift_right + 20.0 * lift_left), "mixamorig:LeftLeg": degrees(0.0, 0.0, 68.0 * lift_left), "mixamorig:RightLeg": degrees(0.0, 0.0, 68.0 * lift_right), "mixamorig:LeftFoot": degrees(0.0, 0.0, -22.0 * lift_left), "mixamorig:RightFoot": degrees(0.0, 0.0, -22.0 * lift_right)},
        "handTargets": natural_hands(0.12 * cycle),
    }


def stairs_descend_pose(t: float) -> dict[str, object]:
    cycle = sin(8.0 * pi * t + 0.35)
    lower_left = max(0.0, cycle)
    lower_right = max(0.0, -cycle)
    return {
        "root": (1.16 * t, -0.72 * t - 0.012 * (1.0 - cos(8.0 * pi * t)), 0.0),
        "rotations": {ROOT: degrees(0.0, 0.0, 6.0), "mixamorig:Spine": degrees(0.0, 0.0, 5.0), "mixamorig:LeftUpLeg": degrees(0.0, 0.0, -26.0 * lower_left + 16.0 * lower_right), "mixamorig:RightUpLeg": degrees(0.0, 0.0, -26.0 * lower_right + 16.0 * lower_left), "mixamorig:LeftLeg": degrees(0.0, 0.0, 54.0 * lower_left + 12.0), "mixamorig:RightLeg": degrees(0.0, 0.0, 54.0 * lower_right + 12.0), "mixamorig:LeftFoot": degrees(0.0, 0.0, 30.0 * lower_left), "mixamorig:RightFoot": degrees(0.0, 0.0, 30.0 * lower_right)},
        "handTargets": natural_hands(0.10 * cycle),
    }


def authored_clips() -> list[AuthoredClip]:
    return [
        AuthoredClip("AuthoredTraversal__ShimmyLeft", "Shimmy Left", "locomotion.shimmy", 73, True, True, "LATERAL_ROOT_MOTION_HAND_CONTACT", ("hang-traverse",), ("straight-arm hang", "leftward body swing precedes the moving hand", "following hand closes the gap", "feet remain clear"), shimmy_left_pose),
        AuthoredClip("AuthoredTraversal__ShimmyRight", "Shimmy Right", "locomotion.shimmy", 73, True, True, "LATERAL_ROOT_MOTION_HAND_CONTACT", ("hang-traverse",), ("straight-arm hang", "rightward body swing precedes the moving hand", "following hand closes the gap", "feet remain clear"), shimmy_right_pose),
        AuthoredClip(
            name="AuthoredSurvival__WaterDive",
            label="Water Dive",
            requirement="water.dive",
            frames=88,
            loop=False,
            airborne=True,
            root_policy="AUTHORED_FORWARD_LOCAL_Z_AND_VERTICAL_ENTRY",
            reference_ids=(
                "springboard-full-approach-hurdle",
                "world-aquatics-running-approach",
                "water-head-first-dive",
                "water-jump-submerge-resurface",
            ),
            mechanics=(
                "four accelerating run steps include short legitimate flight phases",
                "elbows remain near ninety degrees through a contralateral arm-leg cycle",
                "hands piston beside the torso instead of staying pinned or raised behind it",
                "heel midfoot and toe contact patches visibly load and push without sliding",
                "penultimate step becomes a one-foot hurdle and two-foot compression plant",
                "hips knees and ankles extend explosively with the arm drive",
                "hands meet overhead with the head tucked between the upper arms",
                "straight joined trailing legs and pointed feet follow a clear airborne arc",
                "hands and head cross the surface before the torso hips and feet",
            ),
            pose=water_dive_v8_pose,
        ),
        AuthoredClip("AuthoredSurvival__UnderwaterSwim", "Underwater Swim", "water.underwater-swim", 73, True, True, "FORWARD_ROOT_MOTION_SUBMERGED", ("water-dolphin-kick",), ("head-spine-hip streamline", "synchronous dolphin kick", "arms sweep out and recover forward", "small depth undulation"), underwater_swim_pose),
        AuthoredClip("AuthoredSurvival__OpenWaterSurface", "Open Water Surface", "water.surface.open", 61, False, True, "VERTICAL_ROOT_MOTION_TO_WATERLINE", ("water-sesa", "water-jump-submerge-resurface"), ("upward body angle", "arms press water down and outward", "alternating kick", "torso returns upright at surface"), open_water_surface_pose),
        AuthoredClip("AuthoredSurvival__Drowning", "Drowning", "death.drowning", 181, False, True, "TERMINAL_VERTICAL_SINK", ("water-tired-swimmer",), ("prolonged irregular asymmetric reaches", "unsynchronized tired kick", "loss of upright buoyancy", "effort decays before terminal sink"), drowning_pose),
        AuthoredClip("AuthoredNpc__Listen", "NPC Listen", "npc.listen", 121, True, False, "IN_PLACE_GROUNDED", ("npc-active-listening",), ("body and feet face speaker", "subtle forward lean", "periodic small nod", "quiet hands and no fidget loop"), npc_listen_pose),
        AuthoredClip("AuthoredNpc__Farewell", "NPC Farewell", "npc.farewell", 76, False, False, "IN_PLACE_GROUNDED_WITH_DEPARTURE_TURN", ("npc-goodbye-wave",), ("dominant hand raises near shoulder", "palm-out repeated wave", "eye-line stays on addressee", "hand lowers as torso begins departure turn"), npc_farewell_pose),
        AuthoredClip("AuthoredLocomotion__WalkStart", "Walk Start", "locomotion.start-stop", 49, False, False, "FORWARD_ROOT_MOTION_GROUNDED", ("gait-initiation-termination",), ("anticipatory weight shift", "first swing leg releases", "stride grows from quiet stance", "center of mass accelerates forward"), walk_start_pose),
        AuthoredClip("AuthoredLocomotion__WalkStop", "Walk Stop", "locomotion.start-stop", 49, False, False, "FORWARD_ROOT_MOTION_GROUNDED", ("gait-initiation-termination",), ("shortened terminal step", "front foot plants", "center of mass returns over support", "knees and torso settle to neutral"), walk_stop_pose),
        AuthoredClip("AuthoredLocomotion__RunStart", "Run Start", "locomotion.start-stop", 37, False, False, "ACCELERATING_FORWARD_ROOT_MOTION", ("nsca-acceleration-deceleration",), ("preload lowers center of mass", "forward torso projection", "rear-leg drive", "stride length and cadence build"), run_start_pose),
        AuthoredClip("AuthoredLocomotion__RunStop", "Run Stop", "locomotion.start-stop", 43, False, False, "DECELERATING_FORWARD_ROOT_MOTION", ("nsca-acceleration-deceleration",), ("hips displace back", "front plant widens braking base", "knees absorb", "torso regains vertical control"), run_stop_pose),
        AuthoredClip("AuthoredReaction__SpellImpactKnockbackAndFall", "Spell Impact Knockback And Fall", "reaction.spell.blowback", 91, False, True, "BACKWARD_ROOT_MOTION_AIRBORNE_TO_GROUNDED", ("nsca-acceleration-deceleration", "parkour-drop-roll"), ("chest impact opens the torso and throws the arms off balance", "feet lose support only after the readable impact reaction", "center of mass travels backward through a short airborne arc", "hips and back meet the floor before the head", "limbs settle without interpenetration or impossible bends", "the terminal pose stays grounded with no automatic recovery"), spell_impact_knockback_fall_pose),
        AuthoredClip("AuthoredTraversal__NeutralFallLoop", "Neutral Fall Loop", "locomotion.fall.loop", 49, True, True, "IN_PLACE_AIRBORNE", ("bodyflight-belly-neutral",), ("belly-to-earth arch", "hips presented to airflow", "knees and elbows flex symmetrically", "small relaxed stability corrections"), neutral_fall_pose),
        AuthoredClip("AuthoredTraversal__NeutralLandToRun", "Neutral Land To Run", "locomotion.land.running", 55, False, True, "AIRBORNE_TO_GROUNDED_FORWARD_ROOT", ("parkour-drop-roll",), ("feet meet impact together", "ankles knees hips collapse immediately", "momentum redirects forward", "recovery exits into running stride"), neutral_land_to_run_pose),
        AuthoredClip("AuthoredLocomotion__DodgeForward", "Dodge Forward", "locomotion.dodge.directional", 31, False, False, "FORWARD_DIRECTIONAL_BURST", ("boxing-push-step-drag", "nsca-acceleration-deceleration"), ("rear foot pushes", "lead foot opens path", "feet do not cross", "trailing foot recovers base"), dodge_forward_pose),
        AuthoredClip("AuthoredLocomotion__DodgeBackward", "Dodge Backward", "locomotion.dodge.directional", 31, False, False, "BACKWARD_DIRECTIONAL_BURST", ("boxing-push-step-drag", "nsca-acceleration-deceleration"), ("lead foot pushes", "rear foot clears first", "hips stay inside base", "lead foot drags back to stance"), dodge_backward_pose),
        AuthoredClip("AuthoredLocomotion__DodgeLeft", "Dodge Left", "locomotion.dodge.directional", 31, False, False, "LEFT_DIRECTIONAL_BURST", ("boxing-push-step-drag", "nsca-acceleration-deceleration"), ("right side pushes", "left foot leads", "feet never cross", "right foot restores stance"), dodge_left_pose),
        AuthoredClip("AuthoredLocomotion__DodgeRight", "Dodge Right", "locomotion.dodge.directional", 31, False, False, "RIGHT_DIRECTIONAL_BURST", ("boxing-push-step-drag", "nsca-acceleration-deceleration"), ("left side pushes", "right foot leads", "feet never cross", "left foot restores stance"), dodge_right_pose),
        AuthoredClip("AuthoredTraversal__StairsAscend", "Stairs Ascend", "locomotion.stairs", 73, True, False, "FORWARD_AND_UPWARD_STEP_ROOT", ("stairs-step-to-gait", "stair-biomechanics"), ("alternating lead foot clears each riser", "greater hip and knee flexion", "stance leg extends body upward", "arms counter-swing without rail dependency"), stairs_ascend_pose),
        AuthoredClip("AuthoredTraversal__StairsDescend", "Stairs Descend", "locomotion.stairs", 73, True, False, "FORWARD_AND_DOWNWARD_STEP_ROOT", ("stairs-step-to-gait", "stair-biomechanics"), ("foot reaches down before loading", "stance knee controls lowering", "greater ankle dorsiflexion", "torso stays controlled over support"), stairs_descend_pose),
    ]


def validate_armature(armature: bpy.types.Object, source: Path) -> None:
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if len(armature.data.bones) != EXPECTED_BONES or roots != EXPECTED_ROOTS:
        raise RuntimeError(
            f"{source.name}: expected {EXPECTED_BONES} bones/{EXPECTED_ROOTS}, "
            f"got {len(armature.data.bones)}/{roots}"
        )


def disable_animation(armature: bpy.types.Object) -> None:
    armature.animation_data_create()
    armature.animation_data.action = None
    while armature.animation_data.nla_tracks:
        armature.animation_data.nla_tracks.remove(armature.animation_data.nla_tracks[0])


def clear_pose(armature: bpy.types.Object) -> None:
    for bone in armature.pose.bones:
        bone.matrix_basis.identity()
        bone.location = Vector((0.0, 0.0, 0.0))
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = Quaternion((1.0, 0.0, 0.0, 0.0))
        bone.scale = Vector((1.0, 1.0, 1.0))


def skinned_mesh_lower_world(meshes: list[bpy.types.Object]) -> float:
    """Return the precise evaluated lower bound, including armature deformation."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    lower = float("inf")
    for mesh_object in meshes:
        evaluated = mesh_object.evaluated_get(depsgraph)
        evaluated_mesh = evaluated.to_mesh()
        try:
            world = evaluated.matrix_world
            for vertex in evaluated_mesh.vertices:
                lower = min(lower, (world @ vertex.co).z)
        finally:
            evaluated.to_mesh_clear()
    if lower == float("inf"):
        raise RuntimeError("Accepted rest rig contains no evaluated mesh vertices")
    return lower


def skinned_group_contact_profile(
    meshes: list[bpy.types.Object],
    bone_names: tuple[str, ...],
    minimum_weight: float = 0.02,
) -> dict[str, object]:
    """Measure a deformed contact patch for the requested foot vertex groups.

    The accepted rig has no topology-changing modifiers, so evaluated vertex
    indices remain aligned with the source mesh vertex-group assignments. This
    records a small sole patch rather than letting one stray lowest vertex make
    a visibly floating foot pass.
    """
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for mesh_object in meshes:
        wanted_group_indices = {
            group.index
            for group in mesh_object.vertex_groups
            if group.name in bone_names
        }
        if not wanted_group_indices:
            continue
        evaluated = mesh_object.evaluated_get(depsgraph)
        evaluated_mesh = evaluated.to_mesh()
        try:
            if len(evaluated_mesh.vertices) != len(mesh_object.data.vertices):
                raise RuntimeError(
                    f"{mesh_object.name}: evaluated topology changed; precise support-foot "
                    "contact cannot be proven"
                )
            world = evaluated.matrix_world
            for source_vertex, evaluated_vertex in zip(
                mesh_object.data.vertices,
                evaluated_mesh.vertices,
                strict=True,
            ):
                if any(
                    assignment.group in wanted_group_indices
                    and assignment.weight >= minimum_weight
                    for assignment in source_vertex.groups
                ):
                    points.append(world @ evaluated_vertex.co)
        finally:
            evaluated.to_mesh_clear()
    if not points:
        raise RuntimeError(
            f"No evaluated vertices were influenced by support groups {bone_names}"
        )
    if len(points) < 4:
        raise RuntimeError(
            f"Support groups {bone_names} matched only {len(points)} vertices"
        )
    sorted_points = sorted(points, key=lambda point: point.z)
    sorted_heights = [point.z for point in sorted_points]
    patch_index = min(3, len(sorted_heights) - 1)
    horizontal_patch = sorted_points[: min(16, len(sorted_points))]
    return {
        "minimumWorldZ": sorted_heights[0],
        "contactPatchWorldZ": sorted_heights[patch_index],
        "contactPatchWorldX": sum(point.x for point in horizontal_patch)
        / len(horizontal_patch),
        "matchedVertexCount": len(points),
        "worldPoints": points,
    }


def skinned_group_lower_world(
    meshes: list[bpy.types.Object],
    bone_names: tuple[str, ...],
    minimum_weight: float = 0.02,
) -> float:
    return float(
        skinned_group_contact_profile(meshes, bone_names, minimum_weight)[
            "minimumWorldZ"
        ]
    )


def skinned_meshes_for(armature: bpy.types.Object) -> list[bpy.types.Object]:
    meshes = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH"
        and any(
            modifier.type == "ARMATURE" and modifier.object == armature
            for modifier in obj.modifiers
        )
    ]
    if not meshes:
        raise RuntimeError(
            f"Accepted runtime armature {armature.name} has no bound skinned mesh"
        )
    return meshes


WATER_DIVE_FINAL_PLANT_START = 0.585
WATER_DIVE_TAKEOFF = 0.690
WATER_DIVE_WATER_ENTRY = 0.950
WATER_DIVE_RUN_CYCLE_END = 0.535
LEFT_HEEL_GROUPS = ("mixamorig:LeftFoot",)
RIGHT_HEEL_GROUPS = ("mixamorig:RightFoot",)
LEFT_FOOT_GROUPS = (
    "mixamorig:LeftFoot",
    "mixamorig:LeftToeBase",
    "mixamorig:LeftToe_End",
)
RIGHT_FOOT_GROUPS = (
    "mixamorig:RightFoot",
    "mixamorig:RightToeBase",
    "mixamorig:RightToe_End",
)
LEFT_TOE_GROUPS = ("mixamorig:LeftToeBase", "mixamorig:LeftToe_End")
RIGHT_TOE_GROUPS = ("mixamorig:RightToeBase", "mixamorig:RightToe_End")


def water_dive_contact_spec(
    side: str,
    phase: str,
    stance_id: str,
) -> dict[str, object]:
    if side == "LEFT":
        groups = {
            "HEEL": LEFT_HEEL_GROUPS,
            "MIDFOOT": LEFT_FOOT_GROUPS,
            "TOE": LEFT_TOE_GROUPS,
        }[phase]
        foot_bone = "mixamorig:LeftFoot"
    else:
        groups = {
            "HEEL": RIGHT_HEEL_GROUPS,
            "MIDFOOT": RIGHT_FOOT_GROUPS,
            "TOE": RIGHT_TOE_GROUPS,
        }[phase]
        foot_bone = "mixamorig:RightFoot"
    return {
        "side": side,
        "phase": phase,
        "stanceId": stance_id,
        "groups": groups,
        "footBone": foot_bone,
    }


def water_dive_contact_specs(t: float) -> tuple[dict[str, object], ...]:
    """Declare v8 support contacts while leaving real run-flight gaps."""
    if t < 0.030:
        return (water_dive_contact_spec("RIGHT", "HEEL", "STRIDE_1_RIGHT"),)
    if t < 0.070:
        return (water_dive_contact_spec("RIGHT", "MIDFOOT", "STRIDE_1_RIGHT"),)
    if t < 0.095:
        return (water_dive_contact_spec("RIGHT", "TOE", "STRIDE_1_RIGHT"),)
    if t < 0.135:
        return ()
    if t < 0.170:
        return (water_dive_contact_spec("LEFT", "HEEL", "STRIDE_2_LEFT"),)
    if t < 0.215:
        return (water_dive_contact_spec("LEFT", "MIDFOOT", "STRIDE_2_LEFT"),)
    if t < 0.240:
        return (water_dive_contact_spec("LEFT", "TOE", "STRIDE_2_LEFT"),)
    if t < 0.280:
        return ()
    if t < 0.320:
        return (water_dive_contact_spec("RIGHT", "HEEL", "STRIDE_3_RIGHT"),)
    if t < 0.360:
        return (water_dive_contact_spec("RIGHT", "MIDFOOT", "STRIDE_3_RIGHT"),)
    if t < 0.390:
        return (water_dive_contact_spec("RIGHT", "TOE", "STRIDE_3_RIGHT"),)
    if t < 0.425:
        return ()
    if t < 0.460:
        return (water_dive_contact_spec("LEFT", "HEEL", "STRIDE_4_LEFT"),)
    if t < 0.500:
        return (water_dive_contact_spec("LEFT", "MIDFOOT", "STRIDE_4_LEFT"),)
    if t < WATER_DIVE_RUN_CYCLE_END:
        return (water_dive_contact_spec("LEFT", "TOE", "STRIDE_4_LEFT"),)
    if t < WATER_DIVE_FINAL_PLANT_START:
        return ()
    if t < 0.610:
        plant_phase = "HEEL"
    elif t < 0.660:
        plant_phase = "MIDFOOT"
    else:
        plant_phase = "TOE"
    if t < WATER_DIVE_TAKEOFF:
        return (
            water_dive_contact_spec("LEFT", plant_phase, "FINAL_PLANT_LEFT"),
            water_dive_contact_spec("RIGHT", plant_phase, "FINAL_PLANT_RIGHT"),
        )
    return ()


def water_dive_support_groups(t: float) -> tuple[tuple[str, ...], ...]:
    return tuple(spec["groups"] for spec in water_dive_contact_specs(t))


def grounding_target(clip: AuthoredClip, t: float, rest_lower: float) -> float | None:
    """Return the authored contact surface for this normalized-time pose."""
    if clip.name == "AuthoredSurvival__WaterDive":
        return rest_lower if water_dive_support_groups(t) else None
    if clip.name == "AuthoredTraversal__NeutralLandToRun":
        return rest_lower if t >= 0.36 else None
    if clip.name == "AuthoredReaction__SpellImpactKnockbackAndFall":
        # Feet begin planted; after the authored loss-of-balance arc, the
        # precise skinned lower bound is baked to the floor for the complete
        # terminal settle. The airborne middle is intentionally untouched.
        return rest_lower if t < 0.14 or t >= 0.66 else None
    if clip.name == "AuthoredTraversal__StairsAscend":
        return rest_lower + 0.72 * t
    if clip.name == "AuthoredTraversal__StairsDescend":
        return rest_lower - 0.72 * t
    if not clip.airborne:
        return rest_lower
    return None


def measure_root_vertical_response(
    armature: bpy.types.Object,
    meshes: list[bpy.types.Object],
) -> float:
    """Measure how Hips local-Y maps to the accepted mesh's world-Z."""
    disable_animation(armature)
    clear_pose(armature)
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    root = armature.pose.bones[ROOT]
    baseline = skinned_mesh_lower_world(meshes)
    root.location.y += 0.05
    bpy.context.view_layer.update()
    shifted = skinned_mesh_lower_world(meshes)
    root.location.y -= 0.05
    bpy.context.view_layer.update()
    response = (shifted - baseline) / 0.05
    if abs(response) < 0.5:
        raise RuntimeError(
            f"Hips local-Y did not produce a usable world-Z response: {response}"
        )
    return response


def ground_authored_contacts(
    armature: bpy.types.Object,
    meshes: list[bpy.types.Object],
    action: bpy.types.Action,
    clip: AuthoredClip,
    rest_lower: float,
    vertical_response: float,
) -> dict[str, object]:
    """Bake contact placement into root keys without altering airborne motion."""
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]
    root = armature.pose.bones[ROOT]
    corrections: list[float] = []
    contact_frames = 0
    for frame in range(1, clip.frames + 1):
        t = (frame - 1) / max(1, clip.frames - 1)
        target = grounding_target(clip, t, rest_lower)
        if target is None:
            continue
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        support_groups = (
            water_dive_support_groups(t)
            if clip.name == "AuthoredSurvival__WaterDive"
            else ()
        )
        if support_groups:
            support_profiles = [
                skinned_group_contact_profile(meshes, groups)
                for groups in support_groups
            ]
            measured_contact = sum(
                float(profile["contactPatchWorldZ"])
                for profile in support_profiles
            ) / len(support_profiles)
        else:
            measured_contact = skinned_mesh_lower_world(meshes)
        correction = (target - measured_contact) / vertical_response
        root.location.y += correction
        root.keyframe_insert("location", frame=frame, group=ROOT)
        bpy.context.view_layer.update()
        corrections.append(correction)
        contact_frames += 1
    return {
        "method": (
            "PRE_EXPORT_HEEL_MIDFOOT_TOE_CONTACT_PATCH_BAKE"
            if clip.name == "AuthoredSurvival__WaterDive"
            else "PRE_EXPORT_PRECISE_SKINNED_MESH_CONTACT_BAKE"
        ),
        "contactFrameCount": contact_frames,
        "rootLocalYToWorldZResponse": vertical_response,
        "maximumAbsoluteRootCorrectionMeters": max(
            (abs(value) for value in corrections), default=0.0
        ),
    }


def expected_speed_range(clip: AuthoredClip) -> tuple[float, float]:
    if clip.name == "AuthoredSurvival__WaterDive":
        return (1.25, 2.50)
    if clip.root_policy.startswith("IN_PLACE"):
        return (0.0, 0.15)
    if clip.name == "AuthoredNpc__Farewell":
        return (0.0, 0.20)
    if "RUN" in clip.root_policy or "BURST" in clip.root_policy:
        return (0.35, 3.25)
    return (0.08, 2.25)


def root_policy_passed(clip: AuthoredClip, delta: Vector) -> bool:
    policy = clip.root_policy
    if clip.name == "AuthoredSurvival__WaterDive":
        return delta.z > 3.50 and delta.y < -0.20 and abs(delta.x) < 0.10
    if policy.startswith("IN_PLACE"):
        return delta.length <= 0.15
    if "BACKWARD" in policy:
        return delta.x < -0.05
    if "LEFT_DIRECTIONAL" in policy:
        return delta.z < -0.05
    if "RIGHT_DIRECTIONAL" in policy:
        return delta.z > 0.05
    if "TERMINAL_VERTICAL_SINK" in policy:
        return delta.y < -0.50
    if "UPWARD" in policy:
        return delta.x > 0.05 and delta.y > 0.20
    if "DOWNWARD" in policy:
        return delta.x > 0.05 and delta.y < -0.20
    if "FORWARD" in policy:
        return delta.x > 0.05
    if "LATERAL_ROOT_MOTION" in policy:
        return abs(delta.z) > 0.25
    if "VERTICAL_ROOT_MOTION" in policy:
        return delta.y > 0.20
    return delta.length < 5.0


def validate_water_dive_framewise(
    armature: bpy.types.Object,
    meshes: list[bpy.types.Object],
    start: int,
    end: int,
    runway_surface: float,
    contact_tolerance: float,
) -> dict[str, object]:
    """Fail closed on v8 running gait, contacts, acceleration, and takeoff."""
    support_samples: list[dict[str, object]] = []
    plant_frames: list[int] = []
    post_takeoff_frames: list[int] = []
    run_flight_samples: list[dict[str, object]] = []
    gait_samples: list[dict[str, object]] = []
    stance_ankle_positions: dict[str, list[float]] = {}
    stance_phase_ankle_positions: dict[str, list[float]] = {}
    stance_phase_patch_positions: dict[str, list[float]] = {}
    stride_phase_sequence: dict[str, list[str]] = {}
    post_takeoff_minimum_clearance = float("inf")
    post_takeoff_maximum_sagittal_asymmetry = 0.0
    clearance_threshold = 0.015
    contact_band = 0.025
    penetration_tolerance = 0.025
    minimum_patch_vertices = 1
    ankle_slide_tolerance = 0.075
    sagittal_asymmetry_tolerance = 3.0 * pi / 180.0
    elbow_angle_minimum = 68.0
    elbow_angle_maximum = 112.0
    maximum_hand_height_above_shoulder = 0.035
    maximum_hand_distance_behind_hips = 0.26

    def world_head(bone_name: str) -> Vector:
        return armature.matrix_world @ armature.pose.bones[bone_name].head

    def elbow_angle(side: str) -> float:
        shoulder = world_head(f"mixamorig:{side}Arm")
        elbow = world_head(f"mixamorig:{side}ForeArm")
        wrist = world_head(f"mixamorig:{side}Hand")
        upper = shoulder - elbow
        lower = wrist - elbow
        if upper.length < 1e-6 or lower.length < 1e-6:
            return 0.0
        return upper.angle(lower) * 180.0 / pi

    for frame in range(start, end + 1):
        t = (frame - start) / max(1, end - start)
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        contact_specs = water_dive_contact_specs(t)

        if t <= WATER_DIVE_RUN_CYCLE_END:
            left_hand = world_head("mixamorig:LeftHand")
            right_hand = world_head("mixamorig:RightHand")
            left_ankle = world_head("mixamorig:LeftFoot")
            right_ankle = world_head("mixamorig:RightFoot")
            left_shoulder = world_head("mixamorig:LeftArm")
            right_shoulder = world_head("mixamorig:RightArm")
            hips = world_head(ROOT)
            leg_lead_delta = left_ankle.x - right_ankle.x
            arm_lead_delta = left_hand.x - right_hand.x
            contralateral_product = leg_lead_delta * arm_lead_delta
            exchange_frame = (
                abs(leg_lead_delta) <= 0.045 or abs(arm_lead_delta) <= 0.035
            )
            contralateral_passed = (
                contralateral_product <= -0.0007 or exchange_frame
            )
            left_elbow = elbow_angle("Left")
            right_elbow = elbow_angle("Right")
            elbow_passed = (
                elbow_angle_minimum <= left_elbow <= elbow_angle_maximum
                and elbow_angle_minimum <= right_elbow <= elbow_angle_maximum
            )
            shoulder_height = (left_shoulder.z + right_shoulder.z) * 0.5
            left_behind = left_hand.x - hips.x
            right_behind = right_hand.x - hips.x
            hand_height_passed = (
                max(left_hand.z, right_hand.z) - shoulder_height
                <= maximum_hand_height_above_shoulder
            )
            behind_bound_passed = (
                min(left_behind, right_behind)
                >= -maximum_hand_distance_behind_hips
            )
            neither_both_pinned_behind = not (
                left_behind < -0.08 and right_behind < -0.08
            )
            gait_samples.append(
                {
                    "frame": frame,
                    "normalizedTime": t,
                    "rootForwardLocalZ": armature.pose.bones[ROOT].location.z,
                    "leftAnkleWorldX": left_ankle.x,
                    "rightAnkleWorldX": right_ankle.x,
                    "leftHandWorldX": left_hand.x,
                    "rightHandWorldX": right_hand.x,
                    "leftHandWorldZ": left_hand.z,
                    "rightHandWorldZ": right_hand.z,
                    "shoulderHeightWorldZ": shoulder_height,
                    "leftHandBehindHipsMeters": left_behind,
                    "rightHandBehindHipsMeters": right_behind,
                    "legLeadDeltaMeters": leg_lead_delta,
                    "armLeadDeltaMeters": arm_lead_delta,
                    "contralateralProduct": contralateral_product,
                    "armExchangeFrame": exchange_frame,
                    "contralateralPassed": contralateral_passed,
                    "leftElbowDegrees": left_elbow,
                    "rightElbowDegrees": right_elbow,
                    "elbowRangePassed": elbow_passed,
                    "handHeightPassed": hand_height_passed,
                    "behindBoundPassed": behind_bound_passed,
                    "neitherBothPinnedBehind": neither_both_pinned_behind,
                }
            )

        if contact_specs:
            contacts: list[dict[str, object]] = []
            for contact_spec in contact_specs:
                profile = skinned_group_contact_profile(
                    meshes,
                    contact_spec["groups"],
                )
                points = profile["worldPoints"]
                patch_error = float(profile["contactPatchWorldZ"]) - runway_surface
                minimum_error = float(profile["minimumWorldZ"]) - runway_surface
                near_surface_count = sum(
                    1
                    for point in points
                    if abs(point.z - runway_surface) <= contact_band
                )
                foot_head = armature.matrix_world @ armature.pose.bones[
                    contact_spec["footBone"]
                ].head
                stance_id = str(contact_spec["stanceId"])
                stance_ankle_positions.setdefault(stance_id, []).append(foot_head.x)
                phase = str(contact_spec["phase"])
                stance_phase_id = f"{stance_id}:{phase}"
                stance_phase_ankle_positions.setdefault(stance_phase_id, []).append(
                    foot_head.x
                )
                stance_phase_patch_positions.setdefault(stance_phase_id, []).append(
                    float(profile["contactPatchWorldX"])
                )
                phases = stride_phase_sequence.setdefault(stance_id, [])
                if not phases or phases[-1] != phase:
                    phases.append(phase)
                contacts.append(
                    {
                        "side": contact_spec["side"],
                        "phase": phase,
                        "stanceId": stance_id,
                        "groups": list(contact_spec["groups"]),
                        "contactPatchErrorMeters": patch_error,
                        "minimumVertexErrorMeters": minimum_error,
                        "nearSurfaceVertexCount": near_surface_count,
                        "matchedVertexCount": profile["matchedVertexCount"],
                        "contactPatchWorldX": profile["contactPatchWorldX"],
                        "ankleWorldX": foot_head.x,
                    }
                )
            support_samples.append(
                {
                    "frame": frame,
                    "normalizedTime": t,
                    "rootForwardLocalZ": armature.pose.bones[ROOT].location.z,
                    "contacts": contacts,
                }
            )
            if t >= WATER_DIVE_FINAL_PLANT_START:
                plant_frames.append(frame)
            continue

        if t < WATER_DIVE_FINAL_PLANT_START:
            left_clearance = (
                skinned_group_lower_world(meshes, LEFT_FOOT_GROUPS) - runway_surface
            )
            right_clearance = (
                skinned_group_lower_world(meshes, RIGHT_FOOT_GROUPS) - runway_surface
            )
            run_flight_samples.append(
                {
                    "frame": frame,
                    "normalizedTime": t,
                    "leftFootClearanceMeters": left_clearance,
                    "rightFootClearanceMeters": right_clearance,
                    "bothFeetMinimumClearanceMeters": min(
                        left_clearance, right_clearance
                    ),
                }
            )
            continue

        if WATER_DIVE_TAKEOFF <= t < WATER_DIVE_WATER_ENTRY:
            post_takeoff_frames.append(frame)
            left_clearance = (
                skinned_group_lower_world(meshes, LEFT_FOOT_GROUPS) - runway_surface
            )
            right_clearance = (
                skinned_group_lower_world(meshes, RIGHT_FOOT_GROUPS) - runway_surface
            )
            post_takeoff_minimum_clearance = min(
                post_takeoff_minimum_clearance,
                left_clearance,
                right_clearance,
            )
            left_up = armature.pose.bones["mixamorig:LeftUpLeg"].matrix_basis.to_euler("XYZ").x
            right_up = armature.pose.bones["mixamorig:RightUpLeg"].matrix_basis.to_euler("XYZ").x
            left_knee = armature.pose.bones["mixamorig:LeftLeg"].matrix_basis.to_euler("XYZ").x
            right_knee = armature.pose.bones["mixamorig:RightLeg"].matrix_basis.to_euler("XYZ").x
            post_takeoff_maximum_sagittal_asymmetry = max(
                post_takeoff_maximum_sagittal_asymmetry,
                abs(left_up - right_up),
                abs(left_knee - right_knee),
            )

    support_maximum_patch_error = max(
        (
            abs(float(contact["contactPatchErrorMeters"]))
            for sample in support_samples
            for contact in sample["contacts"]
        ),
        default=float("inf"),
    )
    support_maximum_penetration = max(
        (
            max(0.0, -float(contact["minimumVertexErrorMeters"]))
            for sample in support_samples
            for contact in sample["contacts"]
        ),
        default=float("inf"),
    )
    support_minimum_patch_vertices = min(
        (
            int(contact["nearSurfaceVertexCount"])
            for sample in support_samples
            for contact in sample["contacts"]
        ),
        default=0,
    )
    expected_support_frames = [
        frame
        for frame in range(start, end + 1)
        if water_dive_contact_specs(
            (frame - start) / max(1, end - start)
        )
    ]
    expected_first_airborne_frame = next(
        frame
        for frame in range(start, end + 1)
        if (frame - start) / max(1, end - start) >= WATER_DIVE_TAKEOFF
    )
    support_passed = (
        bool(support_samples)
        and [sample["frame"] for sample in support_samples]
        == expected_support_frames
        and support_maximum_patch_error <= contact_tolerance
        and support_maximum_penetration <= penetration_tolerance
        and support_minimum_patch_vertices >= minimum_patch_vertices
    )
    stance_ankle_roll = {
        stance_id: max(positions) - min(positions)
        for stance_id, positions in stance_ankle_positions.items()
    }
    stance_phase_slide = {
        stance_phase_id: max(positions) - min(positions)
        for stance_phase_id, positions in stance_phase_ankle_positions.items()
    }
    anti_slide_passed = (
        bool(stance_phase_slide)
        and max(stance_phase_slide.values()) <= ankle_slide_tolerance
    )
    required_stride_phases = {
        "STRIDE_1_RIGHT": ["HEEL", "MIDFOOT", "TOE"],
        "STRIDE_2_LEFT": ["HEEL", "MIDFOOT", "TOE"],
        "STRIDE_3_RIGHT": ["HEEL", "MIDFOOT", "TOE"],
        "STRIDE_4_LEFT": ["HEEL", "MIDFOOT", "TOE"],
    }
    heel_to_toe_passed = all(
        stride_phase_sequence.get(stance_id) == phases
        for stance_id, phases in required_stride_phases.items()
    )
    runup_root_forward = [
        float(sample["rootForwardLocalZ"]) for sample in gait_samples
    ]
    forward_transfer_passed = (
        len(runup_root_forward) >= 30
        and all(
            right >= left - 0.0001
            for left, right in zip(runup_root_forward, runup_root_forward[1:])
        )
        and runup_root_forward[-1] - runup_root_forward[0] >= 2.45
    )

    acceleration_ranges = (
        ("STEP_1", 0.000, 0.135),
        ("STEP_2", 0.135, 0.280),
        ("STEP_3", 0.280, 0.425),
        ("STEP_4", 0.425, WATER_DIVE_RUN_CYCLE_END),
    )
    acceleration_samples: dict[str, dict[str, float]] = {}
    for phase_name, phase_start, phase_end in acceleration_ranges:
        phase = [
            sample
            for sample in gait_samples
            if phase_start <= float(sample["normalizedTime"]) <= phase_end
        ]
        if len(phase) < 2:
            continue
        elapsed_seconds = (int(phase[-1]["frame"]) - int(phase[0]["frame"])) / FPS
        distance = float(phase[-1]["rootForwardLocalZ"]) - float(
            phase[0]["rootForwardLocalZ"]
        )
        acceleration_samples[phase_name] = {
            "distanceMeters": distance,
            "elapsedSeconds": elapsed_seconds,
            "averageSpeedMetersPerSecond": distance / max(1.0 / FPS, elapsed_seconds),
        }
    step_speeds = [
        acceleration_samples[name]["averageSpeedMetersPerSecond"]
        for name, _, _ in acceleration_ranges
        if name in acceleration_samples
    ]
    accelerating_run_passed = (
        len(step_speeds) == len(acceleration_ranges)
        and all(
            later >= earlier * 1.015
            for earlier, later in zip(step_speeds, step_speeds[1:])
        )
    )

    arm_leads: list[int] = []
    for sample in gait_samples:
        delta = float(sample["armLeadDeltaMeters"])
        lead = 1 if delta > 0.035 else -1 if delta < -0.035 else 0
        if lead and (not arm_leads or lead != arm_leads[-1]):
            arm_leads.append(lead)
    cadence_transitions = max(0, len(arm_leads) - 1)
    cadence_passed = cadence_transitions >= 4
    contralateral_passed = bool(gait_samples) and all(
        bool(sample["contralateralPassed"]) for sample in gait_samples
    )
    elbow_passed = bool(gait_samples) and all(
        bool(sample["elbowRangePassed"]) for sample in gait_samples
    )
    hand_bounds_passed = bool(gait_samples) and all(
        bool(sample["handHeightPassed"])
        and bool(sample["behindBoundPassed"])
        and bool(sample["neitherBothPinnedBehind"])
        for sample in gait_samples
    )

    flight_segments: list[list[dict[str, object]]] = []
    for sample in run_flight_samples:
        if (
            not flight_segments
            or int(sample["frame"]) != int(flight_segments[-1][-1]["frame"]) + 1
        ):
            flight_segments.append([])
        flight_segments[-1].append(sample)
    flight_segment_evidence = [
        {
            "frames": [int(segment[0]["frame"]), int(segment[-1]["frame"])],
            "frameCount": len(segment),
            "maximumBothFeetMinimumClearanceMeters": max(
                float(sample["bothFeetMinimumClearanceMeters"]) for sample in segment
            ),
        }
        for segment in flight_segments
    ]
    legitimate_run_flights_passed = (
        len(flight_segment_evidence) >= 4
        and all(
            segment["frameCount"] >= 2
            and segment["maximumBothFeetMinimumClearanceMeters"] >= 0.008
            for segment in flight_segment_evidence
        )
    )
    plant_precedes_takeoff = (
        bool(plant_frames)
        and bool(post_takeoff_frames)
        and max(plant_frames) < min(post_takeoff_frames)
        and min(post_takeoff_frames) == expected_first_airborne_frame
    )
    airborne_passed = (
        bool(post_takeoff_frames)
        and post_takeoff_minimum_clearance > clearance_threshold
        and post_takeoff_maximum_sagittal_asymmetry <= sagittal_asymmetry_tolerance
    )
    passed = (
        support_passed
        and anti_slide_passed
        and heel_to_toe_passed
        and forward_transfer_passed
        and accelerating_run_passed
        and cadence_passed
        and contralateral_passed
        and elbow_passed
        and hand_bounds_passed
        and legitimate_run_flights_passed
        and plant_precedes_takeoff
        and airborne_passed
    )
    return {
        "passed": passed,
        "preTakeoffSupportFootAtRunway": {
            "passed": support_passed,
            "testedFrameCount": len(support_samples),
            "firstFrame": support_samples[0]["frame"] if support_samples else None,
            "lastFrame": support_samples[-1]["frame"] if support_samples else None,
            "maximumAbsoluteContactPatchErrorMeters": support_maximum_patch_error,
            "contactPatchToleranceMeters": contact_tolerance,
            "maximumPenetrationMeters": support_maximum_penetration,
            "penetrationToleranceMeters": penetration_tolerance,
            "minimumNearSurfaceVertexCount": support_minimum_patch_vertices,
            "requiredNearSurfaceVertexCount": minimum_patch_vertices,
            "samples": support_samples,
        },
        "heelBallToeSequence": {
            "passed": heel_to_toe_passed,
            "required": required_stride_phases,
            "actual": stride_phase_sequence,
        },
        "runGaitPhaseAndContralateralCorrelation": {
            "passed": contralateral_passed,
            "everyRunCycleFrameMeasured": len(gait_samples),
            "requiredContralateralProductMaximum": -0.0007,
            "armOrLegExchangeBandMeters": {
                "hand": 0.035,
                "ankle": 0.045,
            },
            "samples": gait_samples,
        },
        "runningElbowAngles": {
            "passed": elbow_passed,
            "requiredRangeDegrees": [elbow_angle_minimum, elbow_angle_maximum],
            "minimumLeftDegrees": min(
                (float(sample["leftElbowDegrees"]) for sample in gait_samples),
                default=None,
            ),
            "maximumLeftDegrees": max(
                (float(sample["leftElbowDegrees"]) for sample in gait_samples),
                default=None,
            ),
            "minimumRightDegrees": min(
                (float(sample["rightElbowDegrees"]) for sample in gait_samples),
                default=None,
            ),
            "maximumRightDegrees": max(
                (float(sample["rightElbowDegrees"]) for sample in gait_samples),
                default=None,
            ),
        },
        "runHandHeightAndBehindTorsoBounds": {
            "passed": hand_bounds_passed,
            "maximumHeightAboveShoulderMeters": maximum_hand_height_above_shoulder,
            "maximumDistanceBehindHipsMeters": maximum_hand_distance_behind_hips,
            "bothHandsPinnedBehindProhibited": True,
        },
        "runCadence": {
            "passed": cadence_passed,
            "armLeadSequence": arm_leads,
            "leadTransitionCount": cadence_transitions,
            "minimumRequiredLeadTransitions": 4,
        },
        "acceleratingRootSpeed": {
            "passed": accelerating_run_passed,
            "requiredLaterToEarlierSpeedRatio": 1.015,
            "phases": acceleration_samples,
        },
        "legitimateRunFlightPhases": {
            "passed": legitimate_run_flights_passed,
            "minimumRequiredSegments": 4,
            "minimumRequiredFramesPerSegment": 2,
            "minimumBothFeetClearanceMeters": 0.008,
            "segments": flight_segment_evidence,
            "samples": run_flight_samples,
        },
        "stanceFootAntiSlide": {
            "passed": anti_slide_passed,
            "measurement": "ANKLE_ANCHOR_WORLD_X_PER_HEEL_MIDFOOT_TOE_PHASE",
            "maximumPhaseAnkleSlideMeters": (
                max(stance_phase_slide.values()) if stance_phase_slide else None
            ),
            "toleranceMeters": ankle_slide_tolerance,
            "stancePhaseAnkleSlideMeters": stance_phase_slide,
            "diagnosticContactPatchCentroidDriftMeters": {
                stance_phase_id: max(positions) - min(positions)
                for stance_phase_id, positions in stance_phase_patch_positions.items()
            },
            "diagnosticAnkleRollMeters": stance_ankle_roll,
        },
        "runupForwardWeightTransfer": {
            "passed": forward_transfer_passed,
            "sampleCount": len(runup_root_forward),
            "forwardDistanceMeters": (
                runup_root_forward[-1] - runup_root_forward[0]
                if runup_root_forward
                else None
            ),
        },
        "finalPlantPrecedesTakeoff": {
            "passed": plant_precedes_takeoff,
            "plantFrames": plant_frames,
            "firstAirborneFrame": min(post_takeoff_frames) if post_takeoff_frames else None,
            "declaredTakeoffNormalizedTime": WATER_DIVE_TAKEOFF,
        },
        "postTakeoffNoRunCycleFootContact": {
            "passed": airborne_passed,
            "testedFrames": post_takeoff_frames,
            "minimumFootClearanceAboveRunwayMeters": post_takeoff_minimum_clearance,
            "minimumRequiredClearanceMeters": clearance_threshold,
            "maximumLeftRightSagittalLegAsymmetryRadians": post_takeoff_maximum_sagittal_asymmetry,
            "sagittalLegAsymmetryToleranceRadians": sagittal_asymmetry_tolerance,
        },
    }


def validate_runtime_action(
    armature: bpy.types.Object,
    meshes: list[bpy.types.Object],
    action: bpy.types.Action,
    clip: AuthoredClip,
    rest_lower: float,
) -> dict[str, object]:
    """Validate the exported action on a fresh accepted textured runtime rig."""
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]
    start, end = [int(round(value)) for value in action.frame_range]
    root = armature.pose.bones[ROOT]
    bpy.context.scene.frame_set(start)
    bpy.context.view_layer.update()
    root_start = root.location.copy()
    start_pose = {
        bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones
    }
    bpy.context.scene.frame_set(end)
    bpy.context.view_layer.update()
    root_end = root.location.copy()
    end_pose = {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}
    root_delta = root_end - root_start
    duration = max(1.0 / FPS, (end - start) / FPS)
    average_speed = root_delta.length / duration
    speed_minimum, speed_maximum = expected_speed_range(clip)

    contact_errors: list[float] = []
    tested_contact_frames: list[int] = []
    for frame in range(start, end + 1):
        t = (frame - start) / max(1, end - start)
        target = grounding_target(clip, t, rest_lower)
        if target is None:
            continue
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        support_groups = (
            water_dive_support_groups(t)
            if clip.name == "AuthoredSurvival__WaterDive"
            else ()
        )
        if support_groups:
            contact_errors.extend(
                float(
                    skinned_group_contact_profile(meshes, groups)[
                        "contactPatchWorldZ"
                    ]
                )
                - target
                for groups in support_groups
            )
        else:
            contact_errors.append(skinned_mesh_lower_world(meshes) - target)
        tested_contact_frames.append(frame)
    strict_contact_tolerance = 0.0075
    contact_tolerance = (
        0.025 if clip.name == "AuthoredSurvival__WaterDive" else strict_contact_tolerance
    )
    maximum_contact_error = max(
        (abs(value) for value in contact_errors), default=0.0
    )

    maximum_loop_translation = 0.0
    maximum_loop_rotation = 0.0
    maximum_loop_scale = 0.0
    if clip.loop:
        for bone_name in start_pose:
            start_location, start_rotation, start_scale = start_pose[bone_name].decompose()
            end_location, end_rotation, end_scale = end_pose[bone_name].decompose()
            if bone_name != ROOT:
                maximum_loop_translation = max(
                    maximum_loop_translation,
                    (start_location - end_location).length,
                )
            maximum_loop_rotation = max(
                maximum_loop_rotation,
                start_rotation.rotation_difference(end_rotation).angle,
            )
            maximum_loop_scale = max(
                maximum_loop_scale,
                max(abs(left - right) for left, right in zip(start_scale, end_scale, strict=True)),
            )
    loop_tolerances = {
        "translationMeters": 0.0005,
        "rotationRadians": 0.002,
        "scale": 0.0005,
    }
    loop_passed = (
        not clip.loop
        or (
            maximum_loop_translation <= loop_tolerances["translationMeters"]
            and maximum_loop_rotation <= loop_tolerances["rotationRadians"]
            and maximum_loop_scale <= loop_tolerances["scale"]
        )
    )
    root_passed = root_policy_passed(clip, root_delta)
    speed_passed = speed_minimum <= average_speed <= speed_maximum
    contact_passed = maximum_contact_error <= contact_tolerance
    water_dive_framewise = (
        validate_water_dive_framewise(
            armature,
            meshes,
            start,
            end,
            rest_lower,
            contact_tolerance,
        )
        if clip.name == "AuthoredSurvival__WaterDive"
        else None
    )
    passed = (
        root_passed
        and speed_passed
        and contact_passed
        and loop_passed
        and (water_dive_framewise is None or water_dive_framewise["passed"])
    )
    return {
        "passed": passed,
        "freshAcceptedTexturedRestRig": True,
        "root": {
            "passed": root_passed,
            "policy": clip.root_policy,
            "localDeltaMeters": list(root_delta),
        },
        "speed": {
            "passed": speed_passed,
            "averageRootSpeedMetersPerSecond": average_speed,
            "acceptedRangeMetersPerSecond": [speed_minimum, speed_maximum],
        },
        "contactAndGrounding": {
            "passed": contact_passed,
            "preciseEvaluatedSkinnedMesh": True,
            "testedFrameCount": len(tested_contact_frames),
            "testedFrames": tested_contact_frames,
            "maximumAbsoluteLowerBoundErrorMeters": maximum_contact_error,
            "toleranceMeters": contact_tolerance,
            "strictPrecisionToleranceMeters": strict_contact_tolerance,
            "strictPrecisionPassed": maximum_contact_error <= strict_contact_tolerance,
            "pilotPolicy": (
                "PROVISIONAL_VISIBLE_CONTACT_GATE"
                if clip.name == "AuthoredSurvival__WaterDive"
                else "STRICT_CONTACT_GATE"
            ),
        },
        "waterDiveFramewiseAssertions": water_dive_framewise,
        "loop": {
            "applicable": clip.loop,
            "passed": loop_passed,
            "maximumNonRootTranslationDeltaMeters": maximum_loop_translation,
            "maximumRotationDeltaRadians": maximum_loop_rotation,
            "maximumScaleDelta": maximum_loop_scale,
            "tolerances": loop_tolerances,
        },
    }


def create_ik_targets(armature: bpy.types.Object) -> dict[str, bpy.types.Object]:
    targets: dict[str, bpy.types.Object] = {}
    for bone_name, suffix, chain_count in (
        ("mixamorig:LeftHand", "LeftHand", 3),
        ("mixamorig:RightHand", "RightHand", 3),
        ("mixamorig:LeftLeg", "LeftAnkle", 2),
        ("mixamorig:RightLeg", "RightAnkle", 2),
    ):
        target = bpy.data.objects.new(f"Issue487IK_{suffix}", None)
        bpy.context.scene.collection.objects.link(target)
        target.empty_display_type = "SPHERE"
        target.empty_display_size = 0.025
        targets[bone_name] = target
        constraint = armature.pose.bones[bone_name].constraints.new("IK")
        constraint.name = "Issue487AuthoringIK"
        constraint.target = target
        constraint.chain_count = chain_count
        constraint.iterations = 96
    return targets


def remove_ik_targets(armature: bpy.types.Object, targets: dict[str, bpy.types.Object]) -> None:
    for bone_name in targets:
        bone = armature.pose.bones[bone_name]
        for constraint in list(bone.constraints):
            if constraint.name == "Issue487AuthoringIK":
                bone.constraints.remove(constraint)
    for target in targets.values():
        bpy.data.objects.remove(target, do_unlink=True)


def apply_authored_pose(
    armature: bpy.types.Object,
    spec: dict[str, object],
    targets: dict[str, bpy.types.Object],
) -> dict[str, Matrix]:
    # Never let keys already written to the destination action feed back into
    # the next authored pose. Every frame starts from the immutable rest rig.
    armature.animation_data.action = None
    ik_constraints = {
        bone_name: next(
            constraint
            for constraint in armature.pose.bones[bone_name].constraints
            if constraint.name == "Issue487AuthoringIK"
        )
        for bone_name in targets
    }
    for constraint in ik_constraints.values():
        constraint.mute = True
    clear_pose(armature)
    rotations = spec["rotations"]
    for bone_name, angles in rotations.items():
        bone = armature.pose.bones[bone_name]
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = Euler(angles, "XYZ").to_quaternion()
    root = armature.pose.bones[ROOT]
    root.location = Vector(spec["root"])
    bpy.context.view_layer.update()
    for bone_name, point in spec.get("handTargets", {}).items():
        # The authored points are expressed in rest-armature space. Carry them
        # through the current Hips delta so the hands follow the launched body
        # instead of remaining behind as world-static IK targets.
        root_pose = armature.pose.bones[ROOT].matrix
        root_rest_inverse = armature.data.bones[ROOT].matrix_local.inverted()
        posed_point = root_pose @ root_rest_inverse @ point
        targets[bone_name].matrix_world.translation = armature.matrix_world @ posed_point
        ik_constraints[bone_name].mute = False
    for bone_name, point in spec.get("legTargets", {}).items():
        # Leg targets are absolute armature-space ankle contacts. Unlike hands,
        # they must not inherit the moving Hips delta: a planted ankle stays on
        # the runway while the pelvis transfers past it.
        targets[bone_name].matrix_world.translation = armature.matrix_world @ point
        ik_constraints[bone_name].mute = False
    bpy.context.view_layer.update()

    # matrix_basis excludes constraint results. Snapshot the evaluated IK pose,
    # mute the temporary authoring constraints, and resolve the visual matrices
    # back into local bases in hierarchy order before writing permanent keys.
    visual_pose = {bone.name: bone.matrix.copy() for bone in armature.pose.bones}
    for constraint in ik_constraints.values():
        constraint.mute = True
    ordered_bones = sorted(
        armature.pose.bones,
        key=lambda bone: len(bone.parent_recursive),
    )
    for bone in ordered_bones:
        bone.matrix = visual_pose[bone.name]
    bpy.context.view_layer.update()
    result = {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}
    return result


def key_matrices(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    matrices: dict[str, Matrix],
    frame: int,
) -> None:
    armature.animation_data.action = action
    for bone in armature.pose.bones:
        location, rotation, scale = matrices[bone.name].decompose()
        bone.location = location
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = rotation
        bone.scale = scale
        bone.keyframe_insert("location", frame=frame, group=bone.name)
        bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
        bone.keyframe_insert("scale", frame=frame, group=bone.name)


def pose_digest(armature: bpy.types.Object, action: bpy.types.Action) -> str:
    digest = sha256()
    armature.animation_data.action = action
    start, end = [int(round(value)) for value in action.frame_range]
    for frame in sorted({start, end, *[round(start + (end - start) * i / 8) for i in range(9)]}):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        for bone in sorted(armature.pose.bones, key=lambda value: value.name):
            digest.update(bone.name.encode("utf-8"))
            digest.update(struct.pack("<16f", *(value for row in bone.matrix_basis for value in row)))
    return digest.hexdigest().upper()


def sample_trajectory(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    sample_count: int = 17,
) -> list[dict[str, tuple[tuple[float, ...], tuple[float, ...], tuple[float, ...]]]]:
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]
    start, end = [float(value) for value in action.frame_range]
    result = []
    for index in range(sample_count):
        frame = start + (end - start) * index / max(1, sample_count - 1)
        whole = int(frame)
        bpy.context.scene.frame_set(whole, subframe=frame - whole)
        bpy.context.view_layer.update()
        sample = {}
        for bone in armature.pose.bones:
            location, rotation, scale = bone.matrix_basis.decompose()
            sample[bone.name] = (
                tuple(location),
                tuple(rotation),
                tuple(scale),
            )
        result.append(sample)
    return result


def compare_trajectories(
    expected: list[dict[str, tuple[tuple[float, ...], tuple[float, ...], tuple[float, ...]]]],
    actual: list[dict[str, tuple[tuple[float, ...], tuple[float, ...], tuple[float, ...]]]],
) -> dict[str, object]:
    if len(expected) != len(actual):
        raise RuntimeError("Trajectory sample counts differ after GLB re-import")
    maximum_translation = 0.0
    maximum_rotation = 0.0
    maximum_scale = 0.0
    for expected_sample, actual_sample in zip(expected, actual, strict=True):
        if expected_sample.keys() != actual_sample.keys():
            raise RuntimeError("Trajectory bone sets differ after GLB re-import")
        for bone_name in expected_sample:
            expected_location, expected_rotation, expected_scale = expected_sample[bone_name]
            actual_location, actual_rotation, actual_scale = actual_sample[bone_name]
            maximum_translation = max(
                maximum_translation,
                (Vector(expected_location) - Vector(actual_location)).length,
            )
            expected_quaternion = Quaternion(expected_rotation)
            actual_quaternion = Quaternion(actual_rotation)
            maximum_rotation = max(
                maximum_rotation,
                expected_quaternion.rotation_difference(actual_quaternion).angle,
            )
            maximum_scale = max(
                maximum_scale,
                max(abs(left - right) for left, right in zip(expected_scale, actual_scale, strict=True)),
            )
    tolerances = {
        "translationMeters": 0.0001,
        "rotationRadians": 0.0005,
        "scale": 0.0001,
    }
    passed = (
        maximum_translation <= tolerances["translationMeters"]
        and maximum_rotation <= tolerances["rotationRadians"]
        and maximum_scale <= tolerances["scale"]
    )
    return {
        "passed": passed,
        "normalizedTimeSampleCount": len(expected),
        "maximumTranslationDeltaMeters": maximum_translation,
        "maximumRotationDeltaRadians": maximum_rotation,
        "maximumScaleDelta": maximum_scale,
        "tolerances": tolerances,
    }


def action_channel_count(action: bpy.types.Action) -> int:
    if action.is_action_layered:
        return sum(
            len(strip.channelbag(slot).fcurves)
            for layer in action.layers
            for strip in layer.strips
            for slot in action.slots
            if strip.type == "KEYFRAME" and strip.channelbag(slot) is not None
        )
    return len(action.fcurves)


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
    # glTF animation is linearly interpolated. Matching Blender's authored
    # curves to that contract makes normalized-time trajectory comparison
    # meaningful instead of comparing Bezier overshoot with linear playback.
    for curve in action_fcurves(action):
        for keyframe in curve.keyframe_points:
            keyframe.interpolation = "LINEAR"


def attach_tracks(armature: bpy.types.Object, actions: list[bpy.types.Action]) -> None:
    disable_animation(armature)
    for action in actions:
        action.use_fake_user = True
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, int(action.frame_range[0]), action)
        strip.action_frame_start, strip.action_frame_end = action.frame_range


def relative_path(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def main() -> None:
    args = parse_args()
    root_dir = Path.cwd().resolve()
    rest_glb = args.rest_glb.resolve()
    candidate_id = args.candidate_id.strip()
    if not candidate_id or any(
        character not in "abcdefghijklmnopqrstuvwxyz0123456789-"
        for character in candidate_id
    ):
        raise RuntimeError(
            "--candidate-id must contain only lowercase letters, digits, and hyphens"
        )
    staging_root = CANDIDATE_STAGING_ROOT.resolve()
    candidate_dir = (staging_root / candidate_id).resolve()
    if candidate_dir.parent != staging_root:
        raise RuntimeError("Candidate directory escaped the issue #487 staging root")
    output_glb = candidate_dir / "candidate.glb"
    report_path = candidate_dir / "technical-report.json"
    script_path = Path(__file__).resolve()
    reference_path = (root_dir / REFERENCE_PACKET).resolve()
    if file_sha256(rest_glb) != EXPECTED_REST_SHA256:
        raise RuntimeError("Accepted animation-free Human rest GLB SHA-256 drifted")
    if not reference_path.is_file():
        raise RuntimeError(f"Reference packet is missing: {reference_path}")
    output_glb.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(rest_glb))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one rest armature, got {len(armatures)}")
    armature = armatures[0]
    validate_armature(armature, rest_glb)
    imported_action_names = sorted(action.name for action in bpy.data.actions)
    if imported_action_names:
        raise RuntimeError(f"Rest GLB unexpectedly contained actions: {imported_action_names}")
    disable_animation(armature)
    accepted_meshes = skinned_meshes_for(armature)
    rest_lower = skinned_mesh_lower_world(accepted_meshes)
    vertical_response = measure_root_vertical_response(armature, accepted_meshes)

    clips = authored_clips()
    if len(args.only) != 1:
        raise RuntimeError(
            "Quarantined candidate authoring requires exactly one --only action"
        )
    allowed = set(args.only)
    clips = [clip for clip in clips if clip.name in allowed or clip.label in allowed]
    if len(clips) != 1:
        raise RuntimeError("Exactly one authored clip must match --only")

    targets = create_ik_targets(armature)
    generated: list[bpy.types.Action] = []
    records: list[dict[str, object]] = []
    authored_trajectories: dict[str, object] = {}
    for clip in clips:
        action = bpy.data.actions.new(clip.name)
        action.use_fake_user = True
        for frame in range(1, clip.frames + 1):
            t = (frame - 1) / max(1, clip.frames - 1)
            matrices = apply_authored_pose(armature, clip.pose(t), targets)
            key_matrices(armature, action, matrices, frame)
        grounding_bake = ground_authored_contacts(
            armature,
            accepted_meshes,
            action,
            clip,
            rest_lower,
            vertical_response,
        )
        set_linear_interpolation(action)
        generated.append(action)
        authored_trajectories[action.name] = sample_trajectory(armature, action)
        records.append(
            {
                "name": clip.name,
                "clipName": clip.name,
                "displayLabel": clip.label,
                "semanticRowIds": [clip.requirement],
                "requirementIds": [clip.requirement],
                "status": "UNREVIEWED_ORIGINAL_BLENDER_AUTHORING",
                "sourceActionNames": [],
                "sourceReuse": False,
                "forbiddenOperations": {
                    "sourceClipSampling": False,
                    "reversal": False,
                    "splicing": False,
                    "overlay": False,
                    "poseCopying": False,
                    "relabeling": False,
                },
                "authoringMethod": "ORIGINAL_BLENDER_KEYFRAMES_WITH_TEMPORARY_HAND_AND_GROUNDED_LEG_IK",
                "referenceIds": list(clip.reference_ids),
                "mechanics": list(clip.mechanics),
                "frameRange": [1, clip.frames],
                "frames": clip.frames,
                "fps": FPS,
                "playbackIntent": "LOOP" if clip.loop else "ONE_SHOT",
                "rootPolicy": clip.root_policy,
                "airborne": clip.airborne,
                "authoringRevision": (
                    8 if clip.name == "AuthoredSurvival__WaterDive" else 1
                ),
                "rejectedRevisionKeyReuse": False,
                "groundingBake": grounding_bake,
                "channelCount": action_channel_count(action),
                "preExportPoseSha256": pose_digest(armature, action),
                "recommendedPreview": {
                    "durationSeconds": round(max(3.0, clip.frames / FPS + 1.0), 2),
                    "cameraFraming": "full-body side three-quarter view with trajectory, waterline, hands, and feet visible",
                },
            }
        )
        print(f"AUTHORED_TRAVERSAL_PROGRESS={len(generated)}/{len(clips)} {clip.name}", flush=True)
    remove_ik_targets(armature, targets)

    attach_tracks(armature, generated)
    bpy.context.scene.render.fps = FPS
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
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

    expected_names = sorted(action.name for action in generated)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=str(output_glb))
    reimport_armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(reimport_armatures) != 1:
        raise RuntimeError(f"Output re-import produced {len(reimport_armatures)} armatures")
    reimport_armature = reimport_armatures[0]
    validate_armature(reimport_armature, output_glb)
    reimport_actions = {action.name: action for action in bpy.data.actions}
    if sorted(reimport_actions) != expected_names:
        raise RuntimeError(
            f"Output action mismatch: expected={expected_names}, actual={sorted(reimport_actions)}"
        )
    disable_animation(reimport_armature)
    for record in records:
        record["reimportPoseSha256"] = pose_digest(reimport_armature, reimport_actions[record["name"]])
        trajectory_comparison = compare_trajectories(
            authored_trajectories[record["name"]],
            sample_trajectory(reimport_armature, reimport_actions[record["name"]]),
        )
        if not trajectory_comparison["passed"]:
            raise RuntimeError(
                f"{record['name']}: normalized bone trajectory drifted after GLB re-import: "
                f"{trajectory_comparison}"
            )
        record["freshImportTrajectoryValidation"] = trajectory_comparison

    fresh_pack_validation = {
        "passed": True,
        "armatureCount": 1,
        "boneCount": len(reimport_armature.data.bones),
        "rootBones": [
            bone.name for bone in reimport_armature.data.bones if bone.parent is None
        ],
        "clipCount": len(reimport_actions),
        "clipNames": sorted(reimport_actions),
    }

    # A second factory reset proves the pack on the actual accepted textured
    # runtime model, not only on the skeleton embedded in the exported pack.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=str(rest_glb))
    runtime_armatures = [
        obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"
    ]
    if len(runtime_armatures) != 1:
        raise RuntimeError(
            f"Fresh runtime import produced {len(runtime_armatures)} rest armatures"
        )
    runtime_armature = runtime_armatures[0]
    validate_armature(runtime_armature, rest_glb)
    runtime_meshes = skinned_meshes_for(runtime_armature)
    if bpy.data.actions:
        raise RuntimeError("Fresh accepted runtime rest rig unexpectedly imported actions")
    runtime_objects = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(output_glb))
    pack_objects = set(bpy.context.scene.objects) - runtime_objects
    runtime_actions = {action.name: action for action in bpy.data.actions}
    if sorted(runtime_actions) != expected_names:
        raise RuntimeError(
            "Fresh accepted-rig action mismatch: "
            f"expected={expected_names}, actual={sorted(runtime_actions)}"
        )
    for pack_object in pack_objects:
        bpy.data.objects.remove(pack_object, do_unlink=True)
    disable_animation(runtime_armature)
    fresh_runtime_rest_lower = skinned_mesh_lower_world(runtime_meshes)
    runtime_results: dict[str, dict[str, object]] = {}
    clips_by_name = {clip.name: clip for clip in clips}
    for record in records:
        name = record["name"]
        result = validate_runtime_action(
            runtime_armature,
            runtime_meshes,
            runtime_actions[name],
            clips_by_name[name],
            fresh_runtime_rest_lower,
        )
        if not result["passed"]:
            failure_path = candidate_dir / "technical-failure.json"
            failure_path.write_text(
                json.dumps(
                    {
                        "candidateId": candidate_id,
                        "clipName": name,
                        "status": "QUARANTINED_TECHNICAL_FAILURE",
                        "runtimeInstalled": False,
                        "result": result,
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            raise RuntimeError(
                f"{name}: fresh accepted textured runtime validation failed; "
                f"details={failure_path}"
            )
        record["freshRuntimeValidation"] = result
        runtime_results[name] = result

    output_receipt = {
        "path": relative_path(output_glb, root_dir),
        "bytes": output_glb.stat().st_size,
        "sha256": file_sha256(output_glb),
        "actionCount": len(records),
    }
    report = {
        "schemaVersion": 1,
        "issue": 487,
        "candidateId": candidate_id,
        "creationMethod": "ORIGINAL_KEYFRAMED_MOTION",
        "status": "PROVISIONAL_PILOT_QUARANTINED_UNREVIEWED",
        "productionApproval": False,
        "stagingOnly": True,
        "referencePacket": REFERENCE_PACKET,
        "referencePacketReceipt": {
            "path": relative_path(reference_path, root_dir),
            "bytes": reference_path.stat().st_size,
            "sha256": file_sha256(reference_path),
        },
        "sourceReuse": False,
        "freshFactoryScene": True,
        "generator": {
            "path": relative_path(script_path, root_dir),
            "sha256": file_sha256(script_path),
            "blenderVersion": bpy.app.version_string,
            "blenderBuildHash": bpy.app.build_hash.decode("utf-8"),
            "blenderBuildDate": bpy.app.build_date.decode("utf-8"),
            "blenderBuildTime": bpy.app.build_time.decode("utf-8"),
        },
        "sourceRestRig": {
            "path": relative_path(rest_glb, root_dir),
            "bytes": rest_glb.stat().st_size,
            "sha256": file_sha256(rest_glb),
            "importedActionCount": 0,
            "boneCount": EXPECTED_BONES,
            "rootBones": EXPECTED_ROOTS,
        },
        "output": output_receipt,
        "coveredRequirements": sorted({clip.requirement for clip in clips}),
        "clipCount": len(records),
        "clips": records,
        "freshImportValidation": fresh_pack_validation,
        "freshRuntimeValidation": {
            "passed": all(result["passed"] for result in runtime_results.values()),
            "acceptedTexturedRestRigSha256": file_sha256(rest_glb),
            "acceptedTexturedMeshCount": len(runtime_meshes),
            "acceptedRestLowerBoundMeters": fresh_runtime_rest_lower,
            "preciseEvaluatedSkinnedMeshBounds": True,
            "validatedClipCount": len(runtime_results),
            "validatedClipNames": sorted(runtime_results),
            "validationDimensions": [
                "contact",
                "root-motion-policy",
                "grounding",
                "loop-closure",
                "root-speed",
            ],
        },
        "remainingGates": [
            "NORMAL_SPEED_TEXTURED_PREVIEW",
            "INDEPENDENT_CONTINUOUS_PLAYBACK_REVIEW",
            "BREACH_V2_REAL_GAME_REVIEW",
            "OWNER_ACCEPTANCE",
        ],
        "promotion": {
            "status": "QUARANTINED",
            "runtimeInstalled": False,
        },
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("ISSUE_487_AUTHORED_TRAVERSAL_SURVIVAL=" + json.dumps(output_receipt, sort_keys=True))


if __name__ == "__main__":
    main()
