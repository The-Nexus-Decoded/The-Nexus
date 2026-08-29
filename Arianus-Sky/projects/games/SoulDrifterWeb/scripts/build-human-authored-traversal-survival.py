"""Author issue #487 traversal/survival animation gaps from the clean rest rig.

This builder deliberately imports the animation-free accepted Human runtime GLB,
creates original Blender pose keys, and exports a separate action pack. It never
loads, samples, reverses, splices, overlays, relabels, or otherwise derives motion
from the canonical Mixamo animation library or the rejected gap-candidate packs.

Run with the cached Blender 5.2.1 LTS binary. Unapproved candidates are
written only to the issue evidence quarantine, never to public/assets:

    blender --background --python scripts/build-human-authored-traversal-survival.py -- \
      --rest-glb public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb \
      --candidate-id water-dive-v5 \
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


def water_dive_v5_key(
    time: float,
    root: tuple[float, float, float],
    torso: tuple[float, float, float, float, float, float],
    legs: tuple[float, float, float, float],
    feet: tuple[float, float, float, float],
    hands: tuple[tuple[float, float, float], tuple[float, float, float]],
    leg_join: float = 0.0,
) -> dict[str, object]:
    """Declare one independently authored v5 whole-body milestone."""
    root_pitch, spine, spine1, spine2, neck, head = torso
    left_up, right_up, left_knee, right_knee = legs
    left_foot, right_foot, left_toe, right_toe = feet
    return {
        "time": time,
        "root": root,
        "angles": {
            # Axis-probed on the canonical rest rig: local X is the sagittal
            # plane for Hips, torso, and legs; local Z is leg adduction.
            ROOT: (-root_pitch, 0.0, 0.0),
            "mixamorig:Spine": (-spine, 0.0, 0.0),
            "mixamorig:Spine1": (-spine1, 0.0, 0.0),
            "mixamorig:Spine2": (-spine2, 0.0, 0.0),
            "mixamorig:Neck": (-neck, 0.0, 0.0),
            "mixamorig:Head": (-head, 0.0, 0.0),
            "mixamorig:LeftUpLeg": (-left_up, 0.0, -leg_join),
            "mixamorig:RightUpLeg": (-right_up, 0.0, leg_join),
            "mixamorig:LeftLeg": (-left_knee, 0.0, 0.0),
            "mixamorig:RightLeg": (-right_knee, 0.0, 0.0),
            "mixamorig:LeftFoot": (left_foot, 0.0, 0.0),
            "mixamorig:RightFoot": (right_foot, 0.0, 0.0),
            "mixamorig:LeftToeBase": (left_toe, 0.0, 0.0),
            "mixamorig:RightToeBase": (right_toe, 0.0, 0.0),
        },
        "hands": hands,
    }


# Water Dive v5 is a new, compact milestone set authored from the zero-action
# rest pose. It does not evaluate, read, transform, or interpolate any v1-v4
# pose data. Times are normalized across a 2.5-second action.
WATER_DIVE_V5_KEYS = (
    # Three crisp sprint strides with close, opposing bent-arm drive.
    water_dive_v5_key(0.000, (0.00, 0.00, 0.0), (-17, -7, 2, -2, 7, 3), (22, -42, 30, 20), (10, -14, -4, 4), ((0.16, 0.22, -0.11), (-0.13, 0.18, 0.11))),
    water_dive_v5_key(0.075, (0.30, 0.045, 0.0), (-18, -8, 2, -2, 7, 3), (-58, 24, 74, 32), (-12, 16, 3, -5), ((-0.13, 0.18, -0.11), (0.17, 0.23, 0.11))),
    water_dive_v5_key(0.160, (0.78, 0.00, 0.0), (-18, -8, 2, -2, 7, 3), (-34, 34, 20, 48), (-12, 13, 3, -5), ((-0.12, 0.18, -0.11), (0.16, 0.22, 0.11))),
    water_dive_v5_key(0.235, (1.28, 0.050, 0.0), (-19, -8, 2, -2, 7, 3), (24, -60, 34, 76), (17, -12, -5, 3), ((0.17, 0.23, -0.11), (-0.13, 0.18, 0.11))),
    water_dive_v5_key(0.315, (1.83, 0.00, 0.0), (-19, -8, 2, -2, 7, 3), (35, -36, 50, 20), (14, -13, -5, 3), ((0.16, 0.22, -0.11), (-0.12, 0.18, 0.11))),
    water_dive_v5_key(0.390, (2.42, 0.055, 0.0), (-20, -8, 2, -2, 7, 3), (-62, 25, 78, 34), (-13, 18, 3, -5), ((-0.13, 0.18, -0.11), (0.18, 0.24, 0.11))),
    water_dive_v5_key(0.460, (3.04, 0.00, 0.0), (-20, -8, 2, -2, 7, 3), (-36, 38, 20, 54), (-13, 15, 3, -5), ((-0.12, 0.18, -0.11), (0.16, 0.22, 0.11))),
    # Penultimate one-foot hurdle and opposite-knee lift.
    water_dive_v5_key(0.505, (3.46, 0.12, 0.0), (-16, -6, 1, -1, 5, 2), (12, -72, 12, 92), (24, -12, 12, -4), ((-0.12, 0.18, -0.11), (-0.12, 0.18, 0.11))),
    water_dive_v5_key(0.535, (3.76, 0.32, 0.0), (-14, -5, 1, -1, 5, 2), (16, -76, 8, 96), (30, -12, 15, -4), ((-0.17, 0.16, -0.11), (-0.17, 0.16, 0.11))),
    # Four-to-six-frame loaded two-foot plant: hips back, knees/ankles flexed,
    # arms swept behind the torso before the immediate spear and takeoff.
    water_dive_v5_key(0.565, (4.00, -0.30, 0.0), (-24, -10, 4, -3, 8, 4), (-54, -54, 84, 84), (-28, -28, -12, -12), ((-0.20, 0.16, -0.11), (-0.20, 0.16, 0.11))),
    water_dive_v5_key(0.595, (4.24, -0.22, 0.0), (-27, -10, 3, -3, 7, 3), (-42, -42, 66, 66), (-18, -18, -8, -8), ((0.04, 0.45, -0.05), (0.04, 0.45, 0.05))),
    # Explosive triple extension and immediate joined-arm spear.
    water_dive_v5_key(0.625, (4.54, 0.34, 0.0), (-34, -6, 1, -1, 5, 1), (0, 0, -4, -4), (-48, -48, 0, 0), ((0.00, 0.76, -0.004), (0.00, 0.76, 0.004)), leg_join=7.0),
    water_dive_v5_key(0.690, (5.22, 0.86, 0.0), (-49, -3, 0, 0, 3, 0), (0, 0, -6, -6), (-50, -50, 0, 0), ((0.00, 0.78, -0.002), (0.00, 0.78, 0.002)), leg_join=9.0),
    # Ballistic apex, straight joined streamline, and head-first descent.
    water_dive_v5_key(0.755, (6.02, 1.08, 0.0), (-63, -2, 0, 0, 2, 0), (0, 0, -6, -6), (-50, -50, 0, 0), ((0.00, 0.78, 0.0), (0.00, 0.78, 0.0)), leg_join=10.0),
    water_dive_v5_key(0.830, (6.98, 0.92, 0.0), (-76, -1, 0, 0, 1, 0), (0, 0, -6, -6), (-50, -50, 0, 0), ((0.00, 0.78, 0.0), (0.00, 0.78, 0.0)), leg_join=10.0),
    water_dive_v5_key(0.900, (7.86, 0.48, 0.0), (-90, 0, 0, 0, 0, 0), (0, 0, -6, -6), (-50, -50, 0, 0), ((0.00, 0.78, 0.0), (0.00, 0.78, 0.0)), leg_join=10.0),
    water_dive_v5_key(0.945, (8.40, 0.04, 0.0), (-104, 0, 0, 0, 0, 0), (0, 0, -6, -6), (-50, -50, 0, 0), ((0.00, 0.78, 0.0), (0.00, 0.78, 0.0)), leg_join=10.0),
    water_dive_v5_key(1.000, (9.00, -1.20, 0.0), (-116, 0, 0, 0, 0, 0), (0, 0, -6, -6), (-50, -50, 0, 0), ((0.00, 0.76, 0.0), (0.00, 0.76, 0.0)), leg_join=10.0),
)


def water_dive_v5_pose(t: float) -> dict[str, object]:
    """Interpolate only the independently declared v5 milestone keys."""
    lower = WATER_DIVE_V5_KEYS[0]
    upper = WATER_DIVE_V5_KEYS[-1]
    for candidate in WATER_DIVE_V5_KEYS[1:]:
        if t <= candidate["time"]:
            upper = candidate
            break
        lower = candidate
    span = max(1e-6, float(upper["time"]) - float(lower["time"]))
    raw_blend = max(0.0, min(1.0, (t - float(lower["time"])) / span))
    pose_blend = smoothstep(raw_blend)

    # Root X uses direct interpolation so the actor never decelerates to zero
    # at a contact pose. Vertical/root-pose channels ease through the authored
    # compression, extension, and airborne-arc milestones.
    root = (
        float(lower["root"][0]) + (float(upper["root"][0]) - float(lower["root"][0])) * raw_blend,
        float(lower["root"][1]) + (float(upper["root"][1]) - float(lower["root"][1])) * pose_blend,
        0.0,
    )
    rotations = {}
    for bone_name, lower_angles in lower["angles"].items():
        upper_angles = upper["angles"][bone_name]
        interpolated = tuple(
            float(start) + (float(end) - float(start)) * pose_blend
            for start, end in zip(lower_angles, upper_angles, strict=True)
        )
        rotations[bone_name] = degrees(*interpolated)
    hand_targets = {}
    for index, bone_name in enumerate(("mixamorig:LeftHand", "mixamorig:RightHand")):
        start = lower["hands"][index]
        end = upper["hands"][index]
        hand_targets[bone_name] = Vector(
            tuple(
                float(left) + (float(right) - float(left)) * pose_blend
                for left, right in zip(start, end, strict=True)
            )
        )
    return {"root": root, "rotations": rotations, "handTargets": hand_targets}


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
    push = sin(pi * min(1.0, t * 1.35))
    return {
        "root": (0.32 * t, -0.92 + 0.94 * rise, 0.0),
        "rotations": {
            ROOT: degrees(0.0, 0.0, -62.0 * (1.0 - rise)),
            "mixamorig:Spine": degrees(0.0, 0.0, 11.0 * (1.0 - rise)),
            "mixamorig:Spine2": degrees(0.0, 0.0, -7.0 * (1.0 - rise)),
            "mixamorig:Neck": degrees(0.0, 0.0, 18.0 * (1.0 - rise)),
            "mixamorig:LeftUpLeg": degrees(0.0, 0.0, 13.0 * sin(4.0 * pi * t)),
            "mixamorig:RightUpLeg": degrees(0.0, 0.0, -13.0 * sin(4.0 * pi * t)),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 25.0 * abs(sin(4.0 * pi * t))),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 25.0 * abs(cos(4.0 * pi * t))),
        },
        "handTargets": {
            "mixamorig:LeftHand": Vector((0.46 - 0.38 * push, 0.36 - 0.22 * push, -0.08 - 0.25 * push)),
            "mixamorig:RightHand": Vector((0.46 - 0.38 * push, 0.36 - 0.22 * push, 0.08 + 0.25 * push)),
        },
    }


def drowning_pose(t: float) -> dict[str, object]:
    panic = max(0.0, 1.0 - ease_between(t, 0.48, 0.86))
    sink = ease_between(t, 0.42, 1.0)
    flail = sin(8.0 * pi * t) * panic
    return {
        "root": (0.06 * sin(3.0 * pi * t) * panic, -0.28 - 1.05 * sink + 0.08 * sin(6.0 * pi * t) * panic, 0.0),
        "rotations": {
            ROOT: degrees(0.0, 9.0 * flail, 18.0 + 24.0 * sink),
            "mixamorig:Spine": degrees(7.0 * flail, -8.0 * flail, -14.0 * sink),
            "mixamorig:Spine2": degrees(-8.0 * flail, 10.0 * flail, 9.0 * sink),
            "mixamorig:Neck": degrees(0.0, -12.0 * flail, -18.0 * sink),
            "mixamorig:Head": degrees(0.0, 11.0 * flail, 10.0 * sink),
            "mixamorig:LeftUpLeg": degrees(9.0 * flail, 0.0, 24.0 * panic),
            "mixamorig:RightUpLeg": degrees(-12.0 * flail, 0.0, -18.0 * panic),
            "mixamorig:LeftLeg": degrees(0.0, 0.0, 46.0 * panic),
            "mixamorig:RightLeg": degrees(0.0, 0.0, 35.0 * panic),
        },
        "handTargets": {
            "mixamorig:LeftHand": Vector((0.10 + 0.12 * flail, 0.52 + 0.10 * panic, -0.25 - 0.08 * flail)),
            "mixamorig:RightHand": Vector((-0.02 - 0.10 * flail, 0.57 + 0.08 * panic, 0.23 - 0.09 * flail)),
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
            frames=76,
            loop=False,
            airborne=True,
            root_policy="AUTHORED_FORWARD_AND_VERTICAL_ENTRY",
            reference_ids=(
                "springboard-full-approach-hurdle",
                "world-aquatics-running-approach",
                "water-head-first-dive",
                "water-jump-submerge-resurface",
            ),
            mechanics=(
                "three accelerating sprint strides remain forward and rhythmically continuous",
                "penultimate step becomes a one-foot hurdle and two-foot compression plant",
                "hips knees and ankles extend explosively with the arm drive",
                "hands meet overhead with the head tucked between the upper arms",
                "straight joined trailing legs and pointed feet follow a clear airborne arc",
                "hands and head cross the surface before the torso hips and feet",
            ),
            pose=water_dive_v5_pose,
        ),
        AuthoredClip("AuthoredSurvival__UnderwaterSwim", "Underwater Swim", "water.underwater-swim", 73, True, True, "FORWARD_ROOT_MOTION_SUBMERGED", ("water-dolphin-kick",), ("head-spine-hip streamline", "synchronous dolphin kick", "arms sweep out and recover forward", "small depth undulation"), underwater_swim_pose),
        AuthoredClip("AuthoredSurvival__OpenWaterSurface", "Open Water Surface", "water.surface.open", 61, False, True, "VERTICAL_ROOT_MOTION_TO_WATERLINE", ("water-sesa", "water-jump-submerge-resurface"), ("upward body angle", "arms press water down and outward", "alternating kick", "torso returns upright at surface"), open_water_surface_pose),
        AuthoredClip("AuthoredSurvival__Drowning", "Drowning", "death.drowning", 121, False, True, "TERMINAL_VERTICAL_SINK", ("water-tired-swimmer",), ("irregular asymmetric reaches", "short frantic kick", "loss of upright buoyancy", "energy decays before terminal sink"), drowning_pose),
        AuthoredClip("AuthoredNpc__Listen", "NPC Listen", "npc.listen", 121, True, False, "IN_PLACE_GROUNDED", ("npc-active-listening",), ("body and feet face speaker", "subtle forward lean", "periodic small nod", "quiet hands and no fidget loop"), npc_listen_pose),
        AuthoredClip("AuthoredNpc__Farewell", "NPC Farewell", "npc.farewell", 76, False, False, "IN_PLACE_GROUNDED_WITH_DEPARTURE_TURN", ("npc-goodbye-wave",), ("dominant hand raises near shoulder", "palm-out repeated wave", "eye-line stays on addressee", "hand lowers as torso begins departure turn"), npc_farewell_pose),
        AuthoredClip("AuthoredLocomotion__WalkStart", "Walk Start", "locomotion.start-stop", 49, False, False, "FORWARD_ROOT_MOTION_GROUNDED", ("gait-initiation-termination",), ("anticipatory weight shift", "first swing leg releases", "stride grows from quiet stance", "center of mass accelerates forward"), walk_start_pose),
        AuthoredClip("AuthoredLocomotion__WalkStop", "Walk Stop", "locomotion.start-stop", 49, False, False, "FORWARD_ROOT_MOTION_GROUNDED", ("gait-initiation-termination",), ("shortened terminal step", "front foot plants", "center of mass returns over support", "knees and torso settle to neutral"), walk_stop_pose),
        AuthoredClip("AuthoredLocomotion__RunStart", "Run Start", "locomotion.start-stop", 37, False, False, "ACCELERATING_FORWARD_ROOT_MOTION", ("nsca-acceleration-deceleration",), ("preload lowers center of mass", "forward torso projection", "rear-leg drive", "stride length and cadence build"), run_start_pose),
        AuthoredClip("AuthoredLocomotion__RunStop", "Run Stop", "locomotion.start-stop", 43, False, False, "DECELERATING_FORWARD_ROOT_MOTION", ("nsca-acceleration-deceleration",), ("hips displace back", "front plant widens braking base", "knees absorb", "torso regains vertical control"), run_stop_pose),
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


def grounding_target(clip: AuthoredClip, t: float, rest_lower: float) -> float | None:
    """Return the authored contact surface for this normalized-time pose."""
    if clip.name == "AuthoredSurvival__WaterDive":
        approach_contacts = (0.00, 0.16, 0.315, 0.46)
        running_contact = any(abs(t - center) <= 0.025 for center in approach_contacts)
        final_plant_contact = 0.555 <= t <= 0.605
        return rest_lower if running_contact or final_plant_contact else None
    if clip.name == "AuthoredTraversal__NeutralLandToRun":
        return rest_lower if t >= 0.36 else None
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
        lower = skinned_mesh_lower_world(meshes)
        correction = (target - lower) / vertical_response
        root.location.y += correction
        root.keyframe_insert("location", frame=frame, group=ROOT)
        bpy.context.view_layer.update()
        corrections.append(correction)
        contact_frames += 1
    return {
        "method": "PRE_EXPORT_PRECISE_SKINNED_MESH_CONTACT_BAKE",
        "contactFrameCount": contact_frames,
        "rootLocalYToWorldZResponse": vertical_response,
        "maximumAbsoluteRootCorrectionMeters": max(
            (abs(value) for value in corrections), default=0.0
        ),
    }


def expected_speed_range(clip: AuthoredClip) -> tuple[float, float]:
    if clip.name == "AuthoredSurvival__WaterDive":
        return (2.50, 4.25)
    if clip.root_policy.startswith("IN_PLACE"):
        return (0.0, 0.15)
    if clip.name == "AuthoredNpc__Farewell":
        return (0.0, 0.20)
    if "RUN" in clip.root_policy or "BURST" in clip.root_policy:
        return (0.35, 3.25)
    return (0.08, 2.25)


def root_policy_passed(clip: AuthoredClip, delta: Vector) -> bool:
    policy = clip.root_policy
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
        contact_errors.append(skinned_mesh_lower_world(meshes) - target)
        tested_contact_frames.append(frame)
    contact_tolerance = 0.0075
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
    passed = root_passed and speed_passed and contact_passed and loop_passed
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
        },
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
    for bone_name, suffix in (
        ("mixamorig:LeftHand", "LeftHand"),
        ("mixamorig:RightHand", "RightHand"),
    ):
        target = bpy.data.objects.new(f"Issue487IK_{suffix}", None)
        bpy.context.scene.collection.objects.link(target)
        target.empty_display_type = "SPHERE"
        target.empty_display_size = 0.025
        targets[bone_name] = target
        constraint = armature.pose.bones[bone_name].constraints.new("IK")
        constraint.name = "Issue487AuthoringIK"
        constraint.target = target
        constraint.chain_count = 3
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
                "authoringMethod": "ORIGINAL_BLENDER_KEYFRAMES_WITH_TEMPORARY_HAND_IK",
                "referenceIds": list(clip.reference_ids),
                "mechanics": list(clip.mechanics),
                "frameRange": [1, clip.frames],
                "frames": clip.frames,
                "fps": FPS,
                "playbackIntent": "LOOP" if clip.loop else "ONE_SHOT",
                "rootPolicy": clip.root_policy,
                "airborne": clip.airborne,
                "authoringRevision": (
                    5 if clip.name == "AuthoredSurvival__WaterDive" else 1
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
            raise RuntimeError(
                f"{name}: fresh accepted textured runtime validation failed: {result}"
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
        "status": "QUARANTINED_UNREVIEWED_ORIGINAL_BLENDER_AUTHORING",
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
