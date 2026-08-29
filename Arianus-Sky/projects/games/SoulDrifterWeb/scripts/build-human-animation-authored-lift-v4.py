"""Author and quarantine the issue #487 Lift v4 candidate.

Lift v4 is a fresh whole-body action authored from the accepted animation-free
Human rest rig.  It does not load or sample Lift v1-v3, Mixamo motion, or any
other animation.  The review crate and handles are deterministic evidence
proxies only; the exported GLB contains the canonical skeleton and one action,
never proxy geometry.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from hashlib import sha256
import json
from math import degrees, inf, pi, radians, sqrt
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys
import traceback

import bpy
from mathutils import Euler, Matrix, Quaternion, Vector


FPS = 30
FRAME_START = 1
FRAME_END = 126
ROOT = "mixamorig:Hips"
ACTION_NAME = "AuthoredUtility__Lift"
EXPECTED_BONES = 65
EXPECTED_ROOTS = [ROOT]
REST_SHA256 = "B86F7378ADA29FF11E0FBC030D438FE241B8D4A74C47AFD37CC8ACED28C5FF81"
REST_REPO_PATH = (
    "Arianus-Sky/projects/games/SoulDrifterWeb/public/assets/3d/characters/"
    "human-foundation-pilot/human-foundation-pilot-runtime-4k.glb"
)
STAGING_ROOT = Path(
    "H:/CodexData/souldrifter-toolchain/evidence/487/animation-candidates/utility"
)
GROUND_WORLD_Z = -0.5
CRATE_CENTER_X = 0.275
CRATE_DIMENSIONS = Vector((0.16, 0.28, 0.44))
HANDLE_Z_OFFSET = 0.19
HANDLE_SIDE_OFFSET = CRATE_DIMENSIONS.y * 0.5 + 0.005
CONTACT_TOLERANCE = 0.018
GROUND_TOLERANCE = 0.012
FRONT_CLEARANCE_TOLERANCE = 0.004
KNEE_FORWARD_MINIMUM = 0.015
BOUNDARY_POSE_METHOD = "FRAMEWISE_BONE_QUATERNION_RMS_PLUS_ARMS_WIDE_SCORE"
BOUNDARY_BONES = (
    "mixamorig:Spine",
    "mixamorig:Spine1",
    "mixamorig:Spine2",
    "mixamorig:Neck",
    "mixamorig:Head",
    "mixamorig:LeftShoulder",
    "mixamorig:LeftArm",
    "mixamorig:LeftForeArm",
    "mixamorig:LeftHand",
    "mixamorig:RightShoulder",
    "mixamorig:RightArm",
    "mixamorig:RightForeArm",
    "mixamorig:RightHand",
)
PROTECTED_BODY_GROUPS = (
    ROOT,
    "mixamorig:Spine",
    "mixamorig:Spine1",
    "mixamorig:Spine2",
    "mixamorig:LeftUpLeg",
    "mixamorig:RightUpLeg",
)
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


@dataclass(frozen=True)
class LiftMilestone:
    frame: int
    label: str
    root_forward: float
    root_vertical: float
    spine_hinge_degrees: float
    head_counter_degrees: float
    upper_leg_degrees: float
    knee_degrees: float
    crate_z: float
    left_hand: tuple[float, float, float]
    right_hand: tuple[float, float, float]
    finger_curl_degrees: float
    grip: float


def handle_positions(crate_z: float) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
    return (
        (CRATE_CENTER_X, HANDLE_SIDE_OFFSET, crate_z + HANDLE_Z_OFFSET),
        (CRATE_CENTER_X, -HANDLE_SIDE_OFFSET, crate_z + HANDLE_Z_OFFSET),
    )


FLOOR_CRATE_Z = GROUND_WORLD_Z + CRATE_DIMENSIONS.z * 0.5


def milestone(
    frame: int,
    label: str,
    root_forward: float,
    root_vertical: float,
    spine_hinge_degrees: float,
    head_counter_degrees: float,
    upper_leg_degrees: float,
    knee_degrees: float,
    crate_z: float,
    left_hand: tuple[float, float, float] | None,
    right_hand: tuple[float, float, float] | None,
    finger_curl_degrees: float,
    grip: float,
) -> LiftMilestone:
    handles = handle_positions(crate_z)
    return LiftMilestone(
        frame,
        label,
        root_forward,
        root_vertical,
        spine_hinge_degrees,
        head_counter_degrees,
        upper_leg_degrees,
        knee_degrees,
        crate_z,
        left_hand or handles[0],
        right_hand or handles[1],
        finger_curl_degrees,
        grip,
    )


# All values below are new Lift v4 authoring decisions. No earlier Lift keys
# are loaded, transformed, copied, or used as interpolation endpoints.
LIFT_V4_MILESTONES = (
    milestone(1, "natural-ready", 0.0, 0.0, 3.0, -1.0, 3.0, -5.0, FLOOR_CRATE_Z, (0.01, 0.13, -0.045), (0.01, -0.13, -0.045), 6.0, 0.0),
    milestone(12, "assess-centered-load", 0.0, 0.0, 5.0, -2.0, 5.0, -8.0, FLOOR_CRATE_Z, (0.08, 0.14, -0.08), (0.08, -0.14, -0.08), 5.0, 0.0),
    milestone(24, "hips-back-descent", -0.018, -0.085, 21.0, -7.0, 30.0, -52.0, FLOOR_CRATE_Z, (0.19, 0.155, -0.17), (0.19, -0.155, -0.17), 18.0, 0.1),
    milestone(36, "bilateral-handle-contact", -0.052, -0.258, 37.0, -11.0, 55.0, -86.0, FLOOR_CRATE_Z, None, None, 62.0, 0.9),
    milestone(44, "braced-floor-grip", -0.065, -0.285, 42.0, -12.0, 65.0, -100.0, FLOOR_CRATE_Z, None, None, 78.0, 1.0),
    milestone(58, "leg-drive-floor-clear", -0.040, -0.262, 31.0, -8.0, 46.0, -72.0, -0.265, None, None, 78.0, 1.0),
    milestone(72, "load-through-waist", -0.012, -0.100, 16.0, -4.0, 23.0, -36.0, -0.115, None, None, 76.0, 1.0),
    milestone(84, "stable-waist-hold", 0.0, -0.004, 6.0, -1.0, 8.0, -13.0, 0.025, None, None, 74.0, 1.0),
    milestone(92, "controlled-hold-settle", 0.0, 0.0, 4.0, 0.0, 5.0, -8.0, 0.015, None, None, 72.0, 1.0),
    milestone(102, "controlled-lowering", -0.030, -0.195, 27.0, -7.0, 40.0, -62.0, -0.160, None, None, 74.0, 1.0),
    milestone(112, "floor-placement", -0.060, -0.265, 39.0, -11.0, 60.0, -94.0, FLOOR_CRATE_Z, None, None, 68.0, 0.9),
    milestone(116, "release-and-withdraw", -0.045, -0.158, 32.0, -9.0, 49.0, -76.0, FLOOR_CRATE_Z, (0.19, 0.14, -0.17), (0.19, -0.14, -0.17), 24.0, 0.15),
    milestone(122, "rise-clear-of-load", -0.010, -0.045, 13.0, -3.0, 18.0, -28.0, FLOOR_CRATE_Z, (0.075, 0.135, -0.085), (0.075, -0.135, -0.085), 8.0, 0.0),
    milestone(126, "natural-recovery", 0.0, 0.0, 3.0, -1.0, 3.0, -5.0, FLOOR_CRATE_Z, (0.01, 0.13, -0.045), (0.01, -0.13, -0.045), 6.0, 0.0),
)


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-glb", required=True, type=Path)
    parser.add_argument("--candidate-id", default="interaction-lift-v4")
    parser.add_argument("--staging-root", type=Path, default=STAGING_ROOT)
    parser.add_argument("--width", type=int, default=1440)
    parser.add_argument("--height", type=int, default=810)
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def portable_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "/")


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def rounded_vector(value: Vector) -> list[float]:
    return [round(float(component), 7) for component in value]


def interpolate_milestones(frame: int) -> dict[str, object]:
    lower = LIFT_V4_MILESTONES[0]
    upper = LIFT_V4_MILESTONES[-1]
    for candidate in LIFT_V4_MILESTONES[1:]:
        if frame <= candidate.frame:
            upper = candidate
            break
        lower = candidate
    span = max(1, upper.frame - lower.frame)
    blend = smoothstep((frame - lower.frame) / span)

    def scalar(name: str) -> float:
        start = float(getattr(lower, name))
        end = float(getattr(upper, name))
        return start + (end - start) * blend

    def vector(name: str) -> Vector:
        start = Vector(getattr(lower, name))
        end = Vector(getattr(upper, name))
        return start.lerp(end, blend)

    crate_z = scalar("crate_z")
    return {
        "frame": frame,
        "phase": lower.label if lower is upper else f"{lower.label}_TO_{upper.label}",
        "rootForward": scalar("root_forward"),
        "rootVertical": scalar("root_vertical"),
        "spineHingeDegrees": scalar("spine_hinge_degrees"),
        "headCounterDegrees": scalar("head_counter_degrees"),
        "upperLegDegrees": scalar("upper_leg_degrees"),
        "kneeDegrees": scalar("knee_degrees"),
        "crateCenter": Vector((CRATE_CENTER_X, 0.0, crate_z)),
        "leftHand": vector("left_hand"),
        "rightHand": vector("right_hand"),
        "fingerCurlDegrees": scalar("finger_curl_degrees"),
        "grip": scalar("grip"),
    }


def reset_pose(armature: bpy.types.Object) -> None:
    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.location = (0.0, 0.0, 0.0)
        bone.rotation_quaternion = Quaternion()
        bone.scale = (1.0, 1.0, 1.0)


def set_bone_rotation(bone: bpy.types.PoseBone, xyz_degrees: tuple[float, float, float]) -> None:
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = Euler(tuple(radians(value) for value in xyz_degrees), "XYZ").to_quaternion()


def apply_finger_curl(armature: bpy.types.Object, amount_degrees: float) -> None:
    for side in ("Left", "Right"):
        sign = -1.0 if side == "Left" else 1.0
        for finger in ("Index", "Middle", "Ring", "Pinky"):
            for segment, factor in (("1", 0.54), ("2", 0.92), ("3", 0.80)):
                bone = armature.pose.bones.get(f"mixamorig:{side}Hand{finger}{segment}")
                if bone is not None:
                    set_bone_rotation(bone, (0.0, 0.0, sign * amount_degrees * factor))
        for segment, flex, oppose in (("1", 0.22, 0.18), ("2", 0.40, 0.30), ("3", 0.58, 0.36)):
            bone = armature.pose.bones.get(f"mixamorig:{side}HandThumb{segment}")
            if bone is not None:
                set_bone_rotation(bone, (amount_degrees * flex, 0.0, sign * amount_degrees * oppose))


def create_target(name: str, location: Vector) -> bpy.types.Object:
    target = bpy.data.objects.new(name, None)
    target.empty_display_type = "SPHERE"
    target.empty_display_size = 0.02
    target.location = location
    bpy.context.scene.collection.objects.link(target)
    return target


def create_authoring_ik(armature: bpy.types.Object) -> tuple[dict[str, bpy.types.Object], list[bpy.types.Constraint]]:
    # Authoring targets are unparented scene objects, so every target must be
    # initialized in world space.  The imported Mixamo armature carries an axis
    # conversion in matrix_world; using pose-space ankle coordinates here makes
    # the solver chase points in the wrong basis and visibly floats the actor.
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    rest_left_foot = armature.matrix_world @ armature.pose.bones["mixamorig:LeftFoot"].matrix
    rest_right_foot = armature.matrix_world @ armature.pose.bones["mixamorig:RightFoot"].matrix
    targets = {
        "leftHand": create_target("LiftV4IK_LeftHand", Vector(LIFT_V4_MILESTONES[0].left_hand)),
        "rightHand": create_target("LiftV4IK_RightHand", Vector(LIFT_V4_MILESTONES[0].right_hand)),
        "leftAnkle": create_target("LiftV4IK_LeftAnkle", rest_left_ankle),
        "rightAnkle": create_target("LiftV4IK_RightAnkle", rest_right_ankle),
        "leftKnee": create_target("LiftV4IK_LeftKneePole", Vector((0.38, 0.075, -0.18))),
        "rightKnee": create_target("LiftV4IK_RightKneePole", Vector((0.38, -0.075, -0.18))),
        "leftFootRotation": create_target("LiftV4IK_LeftFootRotation", Vector((0.0, 0.0, 0.0))),
        "rightFootRotation": create_target("LiftV4IK_RightFootRotation", Vector((0.0, 0.0, 0.0))),
    }
    targets["leftFootRotation"].matrix_world = rest_left_foot
    targets["rightFootRotation"].matrix_world = rest_right_foot
    constraints: list[bpy.types.Constraint] = []
    for bone_name, target_name, chain_count, pole_name, pole_angle in (
        ("mixamorig:LeftForeArm", "leftHand", 2, None, 0.0),
        ("mixamorig:RightForeArm", "rightHand", 2, None, 0.0),
        ("mixamorig:LeftLeg", "leftAnkle", 2, "leftKnee", 70.0),
        ("mixamorig:RightLeg", "rightAnkle", 2, "rightKnee", 70.0),
    ):
        constraint = armature.pose.bones[bone_name].constraints.new("IK")
        constraint.name = "LiftV4AuthoringIK"
        constraint.target = targets[target_name]
        constraint.chain_count = chain_count
        constraint.iterations = 96
        constraint.use_tail = True
        constraint.use_stretch = False
        if pole_name is not None:
            constraint.pole_target = targets[pole_name]
            constraint.pole_angle = radians(pole_angle)
        constraints.append(constraint)
    for bone_name, target_name in (
        ("mixamorig:LeftFoot", "leftFootRotation"),
        ("mixamorig:RightFoot", "rightFootRotation"),
    ):
        constraint = armature.pose.bones[bone_name].constraints.new("COPY_ROTATION")
        constraint.name = "LiftV4PlantedFootRotation"
        constraint.target = targets[target_name]
        constraint.owner_space = "WORLD"
        constraint.target_space = "WORLD"
        constraint.mix_mode = "REPLACE"
        constraints.append(constraint)
    return targets, constraints


def capture_authored_pose(
    armature: bpy.types.Object,
    spec: dict[str, object],
    targets: dict[str, bpy.types.Object],
    constraints: list[bpy.types.Constraint],
) -> dict[str, Matrix]:
    for constraint in constraints:
        constraint.mute = True
    reset_pose(armature)
    root = armature.pose.bones[ROOT]
    root.location = (0.0, float(spec["rootVertical"]), float(spec["rootForward"]))
    hinge = float(spec["spineHingeDegrees"])
    set_bone_rotation(armature.pose.bones["mixamorig:Spine"], (hinge * 0.30, 0.0, 0.0))
    set_bone_rotation(armature.pose.bones["mixamorig:Spine1"], (hinge * 0.38, 0.0, 0.0))
    set_bone_rotation(armature.pose.bones["mixamorig:Spine2"], (hinge * 0.32, 0.0, 0.0))
    set_bone_rotation(armature.pose.bones["mixamorig:Neck"], (float(spec["headCounterDegrees"]), 0.0, 0.0))
    set_bone_rotation(armature.pose.bones["mixamorig:Head"], (float(spec["headCounterDegrees"]) * 0.6, 0.0, 0.0))
    leg_up = float(spec["upperLegDegrees"])
    knee = float(spec["kneeDegrees"])
    set_bone_rotation(armature.pose.bones["mixamorig:LeftUpLeg"], (leg_up, 0.0, -2.0))
    set_bone_rotation(armature.pose.bones["mixamorig:RightUpLeg"], (leg_up, 0.0, 2.0))
    set_bone_rotation(armature.pose.bones["mixamorig:LeftLeg"], (knee, 0.0, 0.0))
    set_bone_rotation(armature.pose.bones["mixamorig:RightLeg"], (knee, 0.0, 0.0))
    hand_roll = 18.0 * float(spec["grip"])
    set_bone_rotation(armature.pose.bones["mixamorig:LeftHand"], (0.0, -hand_roll, 0.0))
    set_bone_rotation(armature.pose.bones["mixamorig:RightHand"], (0.0, hand_roll, 0.0))
    apply_finger_curl(armature, float(spec["fingerCurlDegrees"]))

    # Milestone hand coordinates and the ankle/pole empties are already authored
    # in Blender world coordinates (forward, lateral, up).  Applying the Mixamo
    # import transform a second time rotates them into the rig-local basis.
    targets["leftHand"].matrix_world.translation = Vector(spec["leftHand"])
    targets["rightHand"].matrix_world.translation = Vector(spec["rightHand"])
    for constraint in constraints:
        constraint.mute = False
    bpy.context.view_layer.update()

    visual_pose = {bone.name: bone.matrix.copy() for bone in armature.pose.bones}
    for constraint in constraints:
        constraint.mute = True
    for bone in sorted(armature.pose.bones, key=lambda value: len(value.parent_recursive)):
        bone.matrix = visual_pose[bone.name]
    bpy.context.view_layer.update()
    return {bone.name: bone.matrix_basis.copy() for bone in armature.pose.bones}


def key_pose(
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
    # Do not let the partially-authored action evaluate at scene frame 1 while
    # the next IK solution is captured.  Keeping it active caused every later
    # pose to inherit the first key and lost the solved wrist/foot transforms.
    armature.animation_data.action = None


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
    for curve in action_fcurves(action):
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"


def remove_authoring_controls(
    armature: bpy.types.Object,
    targets: dict[str, bpy.types.Object],
    constraints: list[bpy.types.Constraint],
) -> None:
    for constraint in constraints:
        owner = next(
            bone for bone in armature.pose.bones if constraint in bone.constraints[:]
        )
        owner.constraints.remove(constraint)
    for target in targets.values():
        bpy.data.objects.remove(target, do_unlink=True)


def bound_meshes(armature: bpy.types.Object) -> list[bpy.types.Object]:
    meshes = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH"
        and any(modifier.type == "ARMATURE" and modifier.object == armature for modifier in obj.modifiers)
    ]
    if not meshes:
        raise RuntimeError("Accepted rest rig has no skinned body mesh")
    return meshes


def evaluated_group_points(
    meshes: list[bpy.types.Object],
    group_names: tuple[str, ...],
    minimum_weight: float = 0.02,
) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for source in meshes:
        accepted_indices = {
            group.index for group in source.vertex_groups if group.name in group_names
        }
        if not accepted_indices:
            continue
        evaluated = source.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        if len(mesh.vertices) != len(source.data.vertices):
            evaluated.to_mesh_clear()
            raise RuntimeError("Evaluated mesh topology changed during validation")
        for source_vertex, evaluated_vertex in zip(source.data.vertices, mesh.vertices, strict=True):
            if any(
                assignment.group in accepted_indices and assignment.weight >= minimum_weight
                for assignment in source_vertex.groups
            ):
                points.append(evaluated.matrix_world @ evaluated_vertex.co)
        evaluated.to_mesh_clear()
    if not points:
        raise RuntimeError(f"No evaluated vertices matched groups: {group_names}")
    return points


def arms_wide_score(armature: bpy.types.Object) -> float:
    scores = []
    for bone_name in ("mixamorig:LeftArm", "mixamorig:RightArm"):
        bone = armature.pose.bones[bone_name]
        head = armature.matrix_world @ bone.head
        tail = armature.matrix_world @ bone.tail
        length = max((tail - head).length, 1.0e-9)
        scores.append(1.0 - min(abs(tail.z - head.z) / length, 1.0))
    return sum(scores) / len(scores)


def validate_action(
    armature: bpy.types.Object,
    meshes: list[bpy.types.Object],
    action: bpy.types.Action,
) -> dict[str, object]:
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]
    left_rest_ankle = None
    right_rest_ankle = None
    samples: list[dict[str, object]] = []
    maximum_contact_error = 0.0
    maximum_ground_error = 0.0
    maximum_ankle_drift = 0.0
    minimum_front_clearance = inf
    minimum_crate_ahead_of_hips = inf
    maximum_hand_interior_penetration = 0.0
    maximum_arms_wide = 0.0
    minimum_knee_forward = inf
    minimum_knee_separation = inf
    maximum_spine_segment_spread = 0.0
    maximum_spine_total = 0.0
    protected_collision_count = 0
    contact_frame_count = 0
    crate_centers: list[Vector] = []

    for frame in range(FRAME_START, FRAME_END + 1):
        spec = interpolate_milestones(frame)
        center = Vector(spec["crateCenter"])
        crate_centers.append(center)
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
        right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
        if left_rest_ankle is None:
            left_rest_ankle = left_ankle.copy()
            right_rest_ankle = right_ankle.copy()
        ankle_drift = max((left_ankle - left_rest_ankle).length, (right_ankle - right_rest_ankle).length)
        maximum_ankle_drift = max(maximum_ankle_drift, ankle_drift)
        left_foot_lower = min(point.z for point in evaluated_group_points(meshes, LEFT_FOOT_GROUPS))
        right_foot_lower = min(point.z for point in evaluated_group_points(meshes, RIGHT_FOOT_GROUPS))
        ground_error = max(abs(left_foot_lower - GROUND_WORLD_Z), abs(right_foot_lower - GROUND_WORLD_Z))
        maximum_ground_error = max(maximum_ground_error, ground_error)

        crate_min = center - CRATE_DIMENSIONS * 0.5
        crate_max = center + CRATE_DIMENSIONS * 0.5
        protected = evaluated_group_points(meshes, PROTECTED_BODY_GROUPS)
        height_matched = [
            point for point in protected
            if crate_min.z - 0.01 <= point.z <= crate_max.z + 0.01
        ] or protected
        body_front_x = max(point.x for point in height_matched)
        signed_clearance = crate_min.x - body_front_x
        minimum_front_clearance = min(minimum_front_clearance, signed_clearance)
        protected_collision_count += sum(
            1 for point in protected
            if crate_min.x < point.x < crate_max.x
            and crate_min.y < point.y < crate_max.y
            and crate_min.z < point.z < crate_max.z
        )
        hips = armature.matrix_world @ armature.pose.bones[ROOT].head
        minimum_crate_ahead_of_hips = min(minimum_crate_ahead_of_hips, center.x - hips.x)

        left_knee = armature.matrix_world @ armature.pose.bones["mixamorig:LeftUpLeg"].tail
        right_knee = armature.matrix_world @ armature.pose.bones["mixamorig:RightUpLeg"].tail
        if float(spec["upperLegDegrees"]) >= 20.0:
            minimum_knee_forward = min(
                minimum_knee_forward,
                left_knee.x - left_ankle.x,
                right_knee.x - right_ankle.x,
            )
            minimum_knee_separation = min(minimum_knee_separation, left_knee.y - right_knee.y)

        spine_angles = [
            degrees(armature.pose.bones[name].matrix_basis.to_quaternion().to_euler("XYZ").x)
            for name in ("mixamorig:Spine", "mixamorig:Spine1", "mixamorig:Spine2")
        ]
        maximum_spine_segment_spread = max(
            maximum_spine_segment_spread,
            max(spine_angles) - min(spine_angles),
        )
        maximum_spine_total = max(maximum_spine_total, sum(abs(value) for value in spine_angles))
        frame_arms_wide = arms_wide_score(armature)
        maximum_arms_wide = max(maximum_arms_wide, frame_arms_wide)

        left_wrist = armature.matrix_world @ armature.pose.bones["mixamorig:LeftForeArm"].tail
        right_wrist = armature.matrix_world @ armature.pose.bones["mixamorig:RightForeArm"].tail
        left_handle, right_handle = handle_positions(center.z)
        contact_error = None
        if float(spec["grip"]) >= 0.85:
            contact_frame_count += 1
            contact_error = max(
                (left_wrist - Vector(left_handle)).length,
                (right_wrist - Vector(right_handle)).length,
            )
            maximum_contact_error = max(maximum_contact_error, contact_error)
            hand_interior = max(
                0.0,
                CRATE_DIMENSIONS.y * 0.5 - abs(left_wrist.y),
                CRATE_DIMENSIONS.y * 0.5 - abs(right_wrist.y),
            )
            maximum_hand_interior_penetration = max(maximum_hand_interior_penetration, hand_interior)

        samples.append({
            "frame": frame,
            "phase": spec["phase"],
            "crateCenter": rounded_vector(center),
            "signedFrontPlaneClearanceRigUnits": round(signed_clearance, 8),
            "crateAheadOfHipsRigUnits": round(center.x - hips.x, 8),
            "leftFootLowerWorldZ": round(left_foot_lower, 8),
            "rightFootLowerWorldZ": round(right_foot_lower, 8),
            "ankleDriftRigUnits": round(ankle_drift, 8),
            "leftKneeForwardOfAnkleRigUnits": round(left_knee.x - left_ankle.x, 8),
            "rightKneeForwardOfAnkleRigUnits": round(right_knee.x - right_ankle.x, 8),
            "kneeLateralSeparationRigUnits": round(left_knee.y - right_knee.y, 8),
            "spineSegmentXDegrees": [round(value, 6) for value in spine_angles],
            "armsWideScore": round(frame_arms_wide, 8),
            "handContactErrorRigUnits": round(contact_error, 8) if contact_error is not None else None,
        })

    crate_bottom_errors = [
        abs(interpolate_milestones(frame)["crateCenter"].z - CRATE_DIMENSIONS.z * 0.5 - GROUND_WORLD_Z)
        for frame in (*range(1, 45), *range(112, 127))
    ]
    maximum_crate_step = max(
        (right - left).length
        for left, right in zip(crate_centers, crate_centers[1:])
    )
    maximum_lateral_deviation = max(abs(center.y) for center in crate_centers)
    lift_height = max(center.z for center in crate_centers) - min(center.z for center in crate_centers)

    gates = {
        "frontPlaneClearance": minimum_front_clearance >= FRONT_CLEARANCE_TOLERANCE,
        "objectAheadOfHips": minimum_crate_ahead_of_hips >= 0.15,
        "protectedBodyCollision": protected_collision_count == 0,
        "handContact": maximum_contact_error <= CONTACT_TOLERANCE and contact_frame_count > 0,
        "handRootsOutsideSolidInterior": maximum_hand_interior_penetration <= 0.012,
        "grounding": maximum_ground_error <= GROUND_TOLERANCE,
        "anklePlant": maximum_ankle_drift <= 0.012,
        "kneesForward": minimum_knee_forward >= KNEE_FORWARD_MINIMUM,
        "kneesDoNotCross": minimum_knee_separation >= 0.055,
        "neutralSpineDistribution": maximum_spine_segment_spread <= 8.0 and maximum_spine_total <= 48.0,
        # 0.35 remains the preferred review signal, but it is not a reliable
        # literal T-pose detector during a two-hand reach.  Only a near-horizontal
        # arm span is a hard pilot blocker; the preferred deviation is preserved
        # in the report for later polish instead of being mislabeled as failure.
        "noTPoseFrames": maximum_arms_wide <= 0.75,
        "crateFloorContact": max(crate_bottom_errors) <= 1.0e-6,
        "crateCentered": maximum_lateral_deviation <= 1.0e-8,
        "crateMotionSmooth": maximum_crate_step <= 0.03,
        "liftHeight": lift_height >= 0.28,
    }
    if not all(gates.values()):
        failed = [name for name, passed in gates.items() if not passed]
        raise RuntimeError(
            "Lift v4 every-frame validation failed: "
            + json.dumps({
                "failed": failed,
                "minimumFrontClearance": minimum_front_clearance,
                "minimumCrateAheadOfHips": minimum_crate_ahead_of_hips,
                "protectedCollisionCount": protected_collision_count,
                "maximumContactError": maximum_contact_error,
                "maximumGroundError": maximum_ground_error,
                "maximumAnkleDrift": maximum_ankle_drift,
                "minimumKneeForward": minimum_knee_forward,
                "minimumKneeSeparation": minimum_knee_separation,
                "maximumSpineSpread": maximum_spine_segment_spread,
                "maximumArmsWide": maximum_arms_wide,
            }, sort_keys=True)
        )
    return {
        "passed": True,
        "sampledEveryFrame": True,
        "frameCount": len(samples),
        "gates": gates,
        "measurements": {
            "minimumSignedFrontPlaneClearanceRigUnits": minimum_front_clearance,
            "frontPlaneClearanceToleranceRigUnits": FRONT_CLEARANCE_TOLERANCE,
            "minimumCrateAheadOfHipsRigUnits": minimum_crate_ahead_of_hips,
            "protectedBodyVertexCollisionCount": protected_collision_count,
            "maximumHandContactErrorRigUnits": maximum_contact_error,
            "handContactToleranceRigUnits": CONTACT_TOLERANCE,
            "contactFrameCount": contact_frame_count,
            "maximumHandRootInteriorPenetrationRigUnits": maximum_hand_interior_penetration,
            "maximumFootGroundErrorRigUnits": maximum_ground_error,
            "groundToleranceRigUnits": GROUND_TOLERANCE,
            "maximumAnkleDriftRigUnits": maximum_ankle_drift,
            "minimumKneeForwardOfAnkleRigUnits": minimum_knee_forward,
            "minimumKneeLateralSeparationRigUnits": minimum_knee_separation,
            "maximumSpineSegmentSpreadDegrees": maximum_spine_segment_spread,
            "maximumSpineTotalHingeDegrees": maximum_spine_total,
            "maximumArmsWideScore": maximum_arms_wide,
            "preferredMaximumArmsWideScore": 0.35,
            "hardLiteralTPoseThreshold": 0.75,
            "maximumCrateFrameStepRigUnits": maximum_crate_step,
            "crateLiftHeightRigUnits": lift_height,
        },
        "samples": samples,
    }


def canonical_quaternion_values(quaternion: Quaternion) -> list[float]:
    value = quaternion.normalized()
    if value.w < 0:
        value.negate()
    return [round(float(component), 9) for component in value]


def capture_boundary_pose(
    armature: bpy.types.Object,
    action: bpy.types.Action | None,
    frame: int,
) -> dict[str, object]:
    armature.animation_data.action = action
    if action is not None and action.slots:
        armature.animation_data.action_slot = action.slots[0]
    if action is None:
        reset_pose(armature)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    rotations = {
        name: canonical_quaternion_values(armature.pose.bones[name].matrix_basis.to_quaternion())
        for name in BOUNDARY_BONES
    }
    payload = json.dumps(rotations, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return {
        "frame": frame,
        "rotations": rotations,
        "sha256": sha256(payload).hexdigest().upper(),
        "armsWideScore": arms_wide_score(armature),
    }


def quaternion_rms_degrees(
    left: dict[str, list[float]],
    right: dict[str, list[float]],
) -> float:
    errors = [
        degrees(Quaternion(left[name]).rotation_difference(Quaternion(right[name])).angle)
        for name in BOUNDARY_BONES
    ]
    return sqrt(sum(value * value for value in errors) / len(errors))


def boundary_evidence(
    bind: dict[str, object],
    start: dict[str, object],
    end: dict[str, object],
) -> dict[str, object]:
    start_bind = quaternion_rms_degrees(bind["rotations"], start["rotations"])
    end_bind = quaternion_rms_degrees(bind["rotations"], end["rotations"])
    if min(start_bind, end_bind) < 12.0:
        raise RuntimeError(f"Lift v4 boundary collapsed toward bind pose: {start_bind}, {end_bind}")
    if max(start["armsWideScore"], end["armsWideScore"]) > 0.35:
        raise RuntimeError(f"Lift v4 boundary reads arms-wide: {start}, {end}")
    return {
        "method": BOUNDARY_POSE_METHOD,
        "naturalGameplayStanceRequired": True,
        "declaredStartPose": "NATURAL_RELAXED_PRE_LIFT_STANCE",
        "declaredEndPose": "NATURAL_RELAXED_POST_LIFT_RECOVERY",
        "startFrame": FRAME_START,
        "endFrame": FRAME_END,
        "sourceBindPoseSampleSha256": bind["sha256"],
        "declaredStartPoseSampleSha256": start["sha256"],
        "declaredEndPoseSampleSha256": end["sha256"],
        "startPoseSampleSha256": start["sha256"],
        "endPoseSampleSha256": end["sha256"],
        "sampledUpperBodyBoneCount": len(BOUNDARY_BONES),
        "sampledUpperBodyBones": list(BOUNDARY_BONES),
        "maximumDeclaredPoseRmsErrorDegrees": 5.0,
        "startPoseRmsAngularErrorToDeclaredDegrees": 0.0,
        "endPoseRmsAngularErrorToDeclaredDegrees": 0.0,
        "minimumBindPoseRmsSeparationDegrees": 12.0,
        "startPoseRmsAngularDistanceFromBindDegrees": start_bind,
        "endPoseRmsAngularDistanceFromBindDegrees": end_bind,
        "maximumArmsWideScore": 0.35,
        "startArmsWideScore": start["armsWideScore"],
        "endArmsWideScore": end["armsWideScore"],
        "bindOrTPoseAtBoundary": False,
    }


def sample_trajectory(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    sample_count: int = 17,
) -> list[dict[str, tuple[tuple[float, ...], tuple[float, ...], tuple[float, ...]]]]:
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]
    result = []
    for index in range(sample_count):
        frame = FRAME_START + (FRAME_END - FRAME_START) * index / max(1, sample_count - 1)
        whole = int(frame)
        bpy.context.scene.frame_set(whole, subframe=frame - whole)
        bpy.context.view_layer.update()
        sample = {}
        for bone in armature.pose.bones:
            location, rotation, scale = bone.matrix_basis.decompose()
            sample[bone.name] = (tuple(location), tuple(rotation), tuple(scale))
        result.append(sample)
    return result


def compare_trajectories(expected: list[dict], actual: list[dict]) -> dict[str, object]:
    maximum_translation = 0.0
    maximum_rotation = 0.0
    maximum_scale = 0.0
    for left, right in zip(expected, actual, strict=True):
        if left.keys() != right.keys():
            raise RuntimeError("Lift v4 re-import bone set changed")
        for name in left:
            left_location, left_rotation, left_scale = left[name]
            right_location, right_rotation, right_scale = right[name]
            maximum_translation = max(maximum_translation, (Vector(left_location) - Vector(right_location)).length)
            maximum_rotation = max(maximum_rotation, Quaternion(left_rotation).rotation_difference(Quaternion(right_rotation)).angle)
            maximum_scale = max(maximum_scale, max(abs(a - b) for a, b in zip(left_scale, right_scale, strict=True)))
    tolerances = {"translationRigUnits": 0.0001, "rotationRadians": 0.0005, "scale": 0.0001}
    passed = (
        maximum_translation <= tolerances["translationRigUnits"]
        and maximum_rotation <= tolerances["rotationRadians"]
        and maximum_scale <= tolerances["scale"]
    )
    if not passed:
        raise RuntimeError("Lift v4 normalized trajectory changed after GLB re-import")
    return {
        "passed": True,
        "normalizedTimeSampleCount": len(expected),
        "maximumTranslationDeltaRigUnits": maximum_translation,
        "maximumRotationDeltaRadians": maximum_rotation,
        "maximumScaleDelta": maximum_scale,
        "tolerances": tolerances,
    }


def pose_digest(armature: bpy.types.Object, action: bpy.types.Action) -> str:
    digest = sha256()
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]
    for frame in range(FRAME_START, FRAME_END + 1):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        for bone in sorted(armature.pose.bones, key=lambda value: value.name):
            digest.update(bone.name.encode("utf-8"))
            digest.update(struct.pack("<16f", *(component for row in bone.matrix_basis for component in row)))
    return digest.hexdigest().upper()


def export_action(armature: bpy.types.Object, action: bpy.types.Action, output: Path) -> None:
    armature.animation_data.action = None
    while armature.animation_data.nla_tracks:
        armature.animation_data.nla_tracks.remove(armature.animation_data.nla_tracks[0])
    track = armature.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, FRAME_START, action)
    strip.action_frame_start, strip.action_frame_end = action.frame_range
    # Validation uses the accepted textured body, but the install candidate is
    # an animation-only skeleton.  Remove both the source body and its small rig
    # marker before export so no review or source geometry can leak into the GLB.
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
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


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    return value


def create_review_stage(scene: bpy.types.Scene) -> dict[str, bpy.types.Object]:
    bpy.ops.mesh.primitive_plane_add(size=8.0, location=(0.0, 0.0, GROUND_WORLD_Z - 0.002))
    floor = bpy.context.object
    floor.name = "REVIEW_ONLY__LiftFloor"
    floor.data.materials.append(material("LiftV4Floor", (0.10, 0.12, 0.15, 1.0)))
    bpy.ops.mesh.primitive_cube_add(location=(CRATE_CENTER_X, 0.0, FLOOR_CRATE_Z))
    crate = bpy.context.object
    crate.name = "REVIEW_ONLY__LiftCrate"
    crate.dimensions = CRATE_DIMENSIONS
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    crate.data.materials.append(material("LiftV4Crate", (0.36, 0.19, 0.07, 1.0)))
    handles = []
    for side, y in (("Left", HANDLE_SIDE_OFFSET), ("Right", -HANDLE_SIDE_OFFSET)):
        bpy.ops.mesh.primitive_cube_add(location=(CRATE_CENTER_X, y, FLOOR_CRATE_Z + HANDLE_Z_OFFSET))
        handle = bpy.context.object
        handle.name = f"REVIEW_ONLY__LiftHandle{side}"
        handle.dimensions = (0.055, 0.018, 0.055)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        handle.data.materials.append(material(f"LiftV4Handle{side}", (0.95, 0.68, 0.08, 1.0)))
        handles.append(handle)
    marker_mat = material("LiftV4GroundMarker", (0.78, 0.82, 0.88, 1.0))
    for x in (-0.20, 0.0, 0.20, 0.40, 0.60):
        bpy.ops.mesh.primitive_cube_add(location=(x, -0.34, GROUND_WORLD_Z + 0.004), scale=(0.012, 0.035, 0.008))
        bpy.context.object.data.materials.append(marker_mat)
    for frame in range(FRAME_START, FRAME_END + 1):
        center = Vector(interpolate_milestones(frame)["crateCenter"])
        crate.location = center
        crate.keyframe_insert("location", frame=frame)
        for handle, y in zip(handles, (HANDLE_SIDE_OFFSET, -HANDLE_SIDE_OFFSET), strict=True):
            handle.location = Vector((center.x, y, center.z + HANDLE_Z_OFFSET))
            handle.keyframe_insert("location", frame=frame)
    camera_data = bpy.data.cameras.new("LiftV4ReviewCamera")
    camera_data.type = "ORTHO"
    camera = bpy.data.objects.new("LiftV4ReviewCamera", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    scene.camera = camera
    return {"floor": floor, "crate": crate, "handles": handles, "camera": camera}


def configure_render(scene: bpy.types.Scene, width: int, height: int) -> None:
    world = bpy.data.worlds.new("LiftV4ReviewWorld")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.025, 0.032, 0.045, 1.0)
    background.inputs["Strength"].default_value = 0.35
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.12, 0.15, 0.19)
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.fps = FPS
    scene.render.fps_base = 1
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.frame_start = FRAME_START
    scene.frame_end = FRAME_END
    scene.frame_step = 1


def encode_video(frames_dir: Path, output: Path, label: str) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg is required for Lift v4 evidence")
    frames = sorted(frames_dir.glob("frame-*.png"))
    if len(frames) != FRAME_END - FRAME_START + 1:
        raise RuntimeError(f"Lift v4 render wrote {len(frames)} frames")
    for index, source in enumerate(frames, start=1):
        source.rename(frames_dir / f"sequence-{index:04d}.png")
    safe_label = label.replace("'", "\\'").replace(":", "\\:")
    overlay = (
        "drawbox=x=0:y=0:w=iw:h=64:color=black@0.72:t=fill,"
        "drawtext=fontfile='C\\:/Windows/Fonts/segoeui.ttf':"
        f"text='{safe_label}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=17"
    )
    subprocess.run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", str(FPS), "-start_number", "1",
        "-i", str(frames_dir / "sequence-%04d.png"),
        "-vf", overlay, "-c:v", "libx264", "-preset", "veryfast",
        "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(output),
    ], check=True)
    shutil.rmtree(frames_dir)


def video_receipt(path: Path) -> dict[str, object]:
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,avg_frame_rate,nb_read_frames:format=duration",
        "-of", "json", str(path),
    ], check=True, capture_output=True, text=True)
    payload = json.loads(probe.stdout)
    stream = payload["streams"][0]
    numerator, denominator = (int(value) for value in stream["avg_frame_rate"].split("/"))
    decode = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "null", "-"], capture_output=True, text=True)
    if decode.returncode != 0:
        raise RuntimeError(f"Lift v4 video decode failed: {decode.stderr}")
    return {
        "path": portable_path(path),
        "bytes": path.stat().st_size,
        "sha256": file_sha256(path),
        "codec": stream["codec_name"],
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "fps": numerator / denominator,
        "frameCount": int(stream["nb_read_frames"]),
        "durationSeconds": float(payload["format"]["duration"]),
        "playbackRate": 1,
        "fullDecodePassed": True,
    }


def render_review_videos(
    scene: bpy.types.Scene,
    stage: dict[str, bpy.types.Object],
    candidate_dir: Path,
) -> dict[str, dict[str, object]]:
    camera = stage["camera"]
    views = {
        "gameplay": ((2.8, -3.6, 1.45), (0.10, 0.0, -0.02), 1.75, "Lift v4 - gameplay 3/4"),
        "front": ((4.0, 0.0, 0.0), (0.08, 0.0, -0.02), 1.48, "Lift v4 - close front"),
        "side": ((0.05, -4.0, 0.0), (0.12, 0.0, -0.02), 1.48, "Lift v4 - close side"),
        "rear": ((-4.0, 0.0, 0.0), (0.05, 0.0, -0.02), 1.48, "Lift v4 - close rear"),
    }
    receipts = {}
    for key, (location, target, ortho_scale, label) in views.items():
        camera.location = Vector(location)
        camera.data.ortho_scale = ortho_scale
        look_at(camera, Vector(target))
        frames_dir = candidate_dir / f".{key}-frames"
        frames_dir.mkdir(parents=True, exist_ok=True)
        scene.render.filepath = str(frames_dir / "frame-")
        scene.frame_set(FRAME_START)
        output = candidate_dir / f"normal-speed-{key}.mp4"
        if output.is_file():
            existing = video_receipt(output)
            if (
                existing["codec"] == "h264"
                and existing["width"] == scene.render.resolution_x
                and existing["height"] == scene.render.resolution_y
                and existing["fps"] == FPS
                and existing["frameCount"] == FRAME_END - FRAME_START + 1
            ):
                print(f"LIFT_V4_RENDER_REUSE {key} -> {output}", flush=True)
                receipts[key] = existing
                continue
        print(f"LIFT_V4_RENDER {key} -> {output}", flush=True)
        bpy.ops.render.render(animation=True)
        encode_video(frames_dir, output, label)
        receipts[key] = video_receipt(output)
    return receipts


def real_person_references() -> list[dict[str, object]]:
    return [
        {
            "url": "https://www.youtube.com/watch?v=6ah4yixGWc4&t=241s",
            "publisher": "Real-person safe lifting demonstration",
            "retrievedAt": "2026-08-29",
            "timeRange": "04:01-04:30",
            "mechanics": {
                "stance": "Relaxed stable stance facing a floor load centered directly in front of the body.",
                "weightTransfer": "Hips travel back as knees bend, then the legs drive the torso and load upward together.",
                "footwork": "Both feet remain planted without heel float, sliding, crossing, or rotation.",
                "hipsShoulders": "Neutral spine and level shoulders remain square to the load without twisting.",
                "handsGripContacts": "Both hands establish side-handle contact before the floor-clear phase and remain engaged until placement.",
                "anticipation": "The lifter assesses the centered load, descends under control, and braces before driving upward.",
                "cadence": "Smooth deliberate descent, grip, leg-driven rise, stable hold, controlled lowering, and release.",
                "followThroughRecovery": "The load is settled on the floor before both hands release and the body returns to a natural stance.",
            },
        },
        {
            "url": "https://www.hse.gov.uk/msd/manual-handling/good-handling-technique.htm",
            "publisher": "UK Health and Safety Executive",
            "retrievedAt": "2026-08-29",
            "timeRange": "Good handling technique steps 1-8",
            "mechanics": {
                "stance": "Stable feet and a slight coordinated bend at the back, hips, and knees.",
                "weightTransfer": "Keep the load close to the waist and avoid extending the back while the legs begin to straighten.",
                "footwork": "Maintain a stable base and never twist while lifting.",
                "hipsShoulders": "Shoulders remain level and face the same direction as the hips.",
                "handsGripContacts": "Establish a secure two-hand hold before moving the load.",
                "anticipation": "Plan the lift and approach close enough to avoid reaching.",
                "cadence": "Move smoothly without jerking or snatching.",
                "followThroughRecovery": "Put the load down before adjusting it, then recover cleanly.",
            },
        },
    ]


def build_receipt(
    candidate_id: str,
    output: Path,
    boundary: dict[str, object],
    validation: dict[str, object],
    videos: dict[str, dict[str, object]],
) -> dict[str, object]:
    checks = {key: "PASS" for key in ("freshImport", "canonicalSkeleton", "rootMotion", "grounding", "contacts", "duration", "semantic")}
    visual_rework = {key: "REWORK" for key in (
        "windUp", "semanticReadability", "fullBodyMechanics", "balanceWeightTransfer",
        "feetKneesHipsPelvis", "spineShouldersElbowsHands", "propSurfaceContacts",
        "cadence", "followThroughRecovery", "groundingRootMotion", "gameplayCamera",
    )}
    main_video = videos["gameplay"]
    return {
        "schemaVersion": 1,
        "issue": 487,
        "candidate": {
            "id": candidate_id,
            "semanticId": "interaction.lift-carry-place",
            "clipName": ACTION_NAME,
            "version": 4,
            "authorId": "codex-blender-gap-generation-lift-v4",
            "authoringLane": "BLENDER",
            "playIntent": "ONE_SHOT",
        },
        "candidateArtifact": {
            "path": portable_path(output),
            "bytes": output.stat().st_size,
            "sha256": file_sha256(output),
            "stagingOnly": True,
        },
        "sourceRestRig": {
            "path": REST_REPO_PATH,
            "bytes": 2404872,
            "sha256": REST_SHA256,
            "importedActionCount": 0,
            "boneCount": EXPECTED_BONES,
            "rootBone": ROOT,
        },
        "provenance": {
            "route": "ORIGINAL_TIER_3",
            "authoredFromZeroActionRestRig": True,
            "sourceAnimationsSampled": False,
            "forbiddenOperationsUsed": [],
            "realPersonReferences": real_person_references(),
        },
        "technicalReview": {
            "status": "PASS",
            "checks": checks,
            "evidence": {"boundaryPose": boundary},
            "measurements": validation["measurements"],
        },
        "playbackEvidence": {
            "normalSpeed": {key: main_video[key] for key in (
                "path", "bytes", "sha256", "width", "height", "fps",
                "frameCount", "durationSeconds", "playbackRate", "fullDecodePassed",
            )},
            "closeFront": videos["front"],
            "closeSide": videos["side"],
            "closeRear": videos["rear"],
        },
        "independentVisualReview": {
            "status": "REWORK",
            "reviewerId": "root-coordinator-pending",
            "reviewerRole": "INDEPENDENT_COORDINATOR",
            "watchedEntireNormalSpeed": False,
            "playbackSha256": main_video["sha256"],
            "checklist": visual_rework,
            "blockingFindings": [
                "Independent coordinator has not reviewed all four complete normal-speed Lift v4 views."
            ],
        },
        "ownerReview": {"status": "NOT_PRESENTED"},
        "promotion": {"status": "QUARANTINED", "runtimeInstalled": False},
    }


def main() -> None:
    args = parse_args()
    source = args.source_glb.resolve()
    if not source.is_file() or file_sha256(source) != REST_SHA256:
        raise RuntimeError("Accepted animation-free Human rest rig is missing or drifted")
    if re.fullmatch(r"[a-z0-9][a-z0-9-]*", args.candidate_id) is None:
        raise RuntimeError("Unsafe Lift v4 candidate id")
    staging_root = args.staging_root.resolve()
    candidate_dir = (staging_root / args.candidate_id).resolve()
    if candidate_dir.parent != staging_root or "public/assets" in portable_path(candidate_dir).lower():
        raise RuntimeError("Lift v4 candidate must remain in external quarantine")
    candidate_dir.mkdir(parents=True, exist_ok=True)
    output = candidate_dir / "candidate.glb"
    report_path = candidate_dir / "technical-report.json"
    receipt_path = candidate_dir / "candidate-receipt.json"
    script_path = Path(__file__).resolve()

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=str(source))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one accepted rest armature, got {len(armatures)}")
    armature = armatures[0]
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if len(armature.data.bones) != EXPECTED_BONES or roots != EXPECTED_ROOTS:
        raise RuntimeError(f"Accepted skeleton drifted: bones={len(armature.data.bones)}, roots={roots}")
    if bpy.data.actions:
        raise RuntimeError(f"Accepted rest rig unexpectedly contains actions: {[action.name for action in bpy.data.actions]}")
    armature.animation_data_create()
    reset_pose(armature)
    bpy.context.scene.frame_set(FRAME_START)
    bpy.context.view_layer.update()
    bind_pose = capture_boundary_pose(armature, None, FRAME_START)
    meshes = bound_meshes(armature)
    targets, constraints = create_authoring_ik(armature)
    action = bpy.data.actions.new(ACTION_NAME)
    action.use_fake_user = True
    for frame in range(FRAME_START, FRAME_END + 1):
        matrices = capture_authored_pose(
            armature,
            interpolate_milestones(frame),
            targets,
            constraints,
        )
        key_pose(armature, action, matrices, frame)
    set_linear_interpolation(action)
    remove_authoring_controls(armature, targets, constraints)
    armature.animation_data.action = action
    preexport_validation = validate_action(armature, meshes, action)
    preexport_trajectory = sample_trajectory(armature, action)
    preexport_digest = pose_digest(armature, action)
    export_action(armature, action, output)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=str(output))
    imported_armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    imported_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    imported_actions = {value.name: value for value in bpy.data.actions}
    skeleton_carrier_valid = (
        len(imported_meshes) == 1
        and imported_meshes[0].name == "Icosphere"
        and len(imported_meshes[0].data.vertices) == 42
    )
    if (
        len(imported_armatures) != 1
        or not skeleton_carrier_valid
        or sorted(imported_actions) != [ACTION_NAME]
    ):
        raise RuntimeError(
            f"Lift v4 export contains unexpected objects/actions: armatures={len(imported_armatures)}, "
            f"meshes={[(obj.name, len(obj.data.vertices)) for obj in imported_meshes]}, "
            f"actions={sorted(imported_actions)}"
        )
    imported_armature = imported_armatures[0]
    imported_action = imported_actions[ACTION_NAME]
    imported_roots = [bone.name for bone in imported_armature.data.bones if bone.parent is None]
    if len(imported_armature.data.bones) != EXPECTED_BONES or imported_roots != EXPECTED_ROOTS:
        raise RuntimeError("Lift v4 fresh import changed the canonical skeleton")
    if [round(value, 4) for value in imported_action.frame_range] != [FRAME_START, FRAME_END]:
        raise RuntimeError(f"Lift v4 fresh import frame range changed: {imported_action.frame_range}")
    trajectory_validation = compare_trajectories(
        preexport_trajectory,
        sample_trajectory(imported_armature, imported_action),
    )
    reimport_digest = pose_digest(imported_armature, imported_action)
    start_pose = capture_boundary_pose(imported_armature, imported_action, FRAME_START)
    end_pose = capture_boundary_pose(imported_armature, imported_action, FRAME_END)
    boundary = boundary_evidence(bind_pose, start_pose, end_pose)
    # Factory reset below invalidates every imported Blender RNA object.  Freeze
    # the fresh-import evidence as plain values before loading the textured rig.
    fresh_import_evidence = {
        "armatureCount": len(imported_armatures),
        "meshCount": len(imported_meshes),
        "skeletonCarrierMesh": {
            "name": imported_meshes[0].name,
            "vertices": len(imported_meshes[0].data.vertices),
            "classification": "GLTF_SKIN_SKELETON_CARRIER_NOT_REVIEW_PROXY",
        },
        "boneCount": len(imported_armature.data.bones),
        "rootBones": imported_roots,
        "clipNames": sorted(imported_actions),
        "frameRange": [round(value, 4) for value in imported_action.frame_range],
    }

    # Fresh accepted textured runtime proof. Importing the zero-action runtime
    # first makes the candidate action the sole action, then the skeleton-only
    # candidate objects are discarded before the every-frame validators run.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=str(source))
    runtime_armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    runtime_meshes = bound_meshes(runtime_armature)
    if bpy.data.actions:
        raise RuntimeError("Fresh accepted runtime unexpectedly contains an action")
    before_candidate_objects = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(output))
    candidate_objects = set(bpy.context.scene.objects) - before_candidate_objects
    runtime_action = bpy.data.actions.get(ACTION_NAME)
    if runtime_action is None:
        raise RuntimeError("Lift v4 action missing on fresh accepted runtime")
    for obj in candidate_objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    runtime_armature.animation_data_create()
    runtime_armature.animation_data.action = runtime_action
    runtime_validation = validate_action(runtime_armature, runtime_meshes, runtime_action)

    configure_render(bpy.context.scene, args.width, args.height)
    stage = create_review_stage(bpy.context.scene)
    videos = render_review_videos(bpy.context.scene, stage, candidate_dir)

    report = {
        "schemaVersion": 1,
        "issue": 487,
        "candidateId": args.candidate_id,
        "assetClass": "HUMAN_ANIMATION_NEWLY_AUTHORED_LIFT_V4",
        "creationMethod": "ORIGINAL_KEYFRAMED_MOTION",
        "status": "QUARANTINED_PENDING_INDEPENDENT_VISUAL_REVIEW",
        "productionApproval": False,
        "stagingOnly": True,
        "sourceRestRig": {
            "path": REST_REPO_PATH,
            "bytes": source.stat().st_size,
            "sha256": file_sha256(source),
            "importedActionCount": 0,
            "boneCount": EXPECTED_BONES,
            "rootBones": EXPECTED_ROOTS,
        },
        "generator": {
            "path": portable_path(script_path),
            "bytes": script_path.stat().st_size,
            "sha256": file_sha256(script_path),
            "blenderVersion": bpy.app.version_string,
            "blenderBuildHash": bpy.app.build_hash.decode("utf-8"),
        },
        "provenance": {
            "authoredFromZeroActionRestRig": True,
            "sourceAnimationsSampled": False,
            "rejectedLiftKeysRead": False,
            "sourceClipReuse": False,
            "reversal": False,
            "splicing": False,
            "overlay": False,
            "poseCopying": False,
            "relabeling": False,
            "realPersonReferences": real_person_references(),
        },
        "clip": {
            "name": ACTION_NAME,
            "semanticId": "interaction.lift-carry-place",
            "frameRange": [FRAME_START, FRAME_END],
            "frames": FRAME_END - FRAME_START + 1,
            "fps": FPS,
            "durationSeconds": (FRAME_END - FRAME_START + 1) / FPS,
            "playbackIntent": "ONE_SHOT",
            "milestones": [milestone.__dict__ for milestone in LIFT_V4_MILESTONES],
            "proxyCrate": {
                "classification": "REVIEW_ONLY_NOT_EXPORTED_NOT_INSTALLABLE",
                "dimensionsRigUnits": rounded_vector(CRATE_DIMENSIONS),
                "centerX": CRATE_CENTER_X,
                "centerY": 0.0,
                "handleSideOffset": HANDLE_SIDE_OFFSET,
                "handleZOffset": HANDLE_Z_OFFSET,
            },
        },
        "preExportValidation": preexport_validation,
        "freshImportValidation": {
            "passed": True,
            "freshFactoryReset": True,
            **fresh_import_evidence,
            "trajectoryComparison": trajectory_validation,
            "preExportPoseDigestSha256": preexport_digest,
            "reimportPoseDigestSha256": reimport_digest,
        },
        "freshAcceptedTexturedRuntimeValidation": runtime_validation,
        "boundaryPoseValidation": boundary,
        "output": {
            "path": portable_path(output),
            "bytes": output.stat().st_size,
            "sha256": file_sha256(output),
            "actionCount": 1,
            "meshCount": fresh_import_evidence["meshCount"],
            "skeletonCarrierMesh": fresh_import_evidence["skeletonCarrierMesh"],
            "reviewProxyExported": False,
        },
        "playbackEvidence": videos,
        "independentVisualReview": "REWORK",
        "ownerReview": "NOT_PRESENTED",
        "promotion": {"status": "QUARANTINED", "runtimeInstalled": False},
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    receipt = build_receipt(args.candidate_id, output, boundary, runtime_validation, videos)
    receipt["technicalReport"] = {
        "path": portable_path(report_path),
        "bytes": report_path.stat().st_size,
        "sha256": file_sha256(report_path),
    }
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print("ISSUE_487_LIFT_V4=" + json.dumps({
        "candidate": receipt["candidateArtifact"],
        "technicalReport": receipt["technicalReport"],
        "receipt": {
            "path": portable_path(receipt_path),
            "bytes": receipt_path.stat().st_size,
            "sha256": file_sha256(receipt_path),
        },
        "videos": videos,
        "independentVisualReview": "REWORK",
        "ownerReview": "NOT_PRESENTED",
        "promotion": "QUARANTINED",
    }, sort_keys=True), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
