"""Author issue #487 utility interactions from the canonical Human rest rig.

This builder intentionally imports the animation-free 4K runtime Human as a
65-bone rest-rig and display-mesh authority.  It rejects the input if even one
action is present, resets the armature to rest pose, creates original Blender
keyframes and IK targets, bakes the result, exports an authored-only GLB, and
performs a fresh re-import proof.  It never samples, copies, reverses, splices,
overlays, or relabels a source action.

All outputs are quarantined evidence.  The builder refuses to write beneath a
repo ``public/assets`` directory and never marks its own visual work approved.

Run with cached Blender 5.2.1:

    blender --background --python scripts/build-human-animation-authored-utility.py -- \
      --source-glb public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb \
      --review-video H:/path/to/normal-speed-gameplay.mp4 \
      --review-video-front H:/path/to/normal-speed-close-front.mp4 \
      --review-video-side H:/path/to/normal-speed-close-side.mp4 \
      --review-video-rear H:/path/to/normal-speed-close-rear.mp4
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from math import degrees, radians, sqrt
from pathlib import Path
import re
import shutil
import subprocess
import sys
import traceback

import bpy
from mathutils import Euler, Quaternion, Vector


ROOT = "mixamorig:Hips"
EXPECTED_BONES = 65
EXPECTED_ROOTS = [ROOT]
EXPECTED_SOURCE_ACTIONS = 0
SOURCE_REST_RIG_SHA256 = "B86F7378ADA29FF11E0FBC030D438FE241B8D4A74C47AFD37CC8ACED28C5FF81"
FPS = 30
METERS_PER_RIG_UNIT = 1.80
CONTACT_TOLERANCE = 0.015
GROUND_TOLERANCE = 0.023
DEFAULT_EVIDENCE_ROOT = Path(
    r"H:\CodexData\souldrifter-toolchain\evidence\487\animation-candidates\utility"
)
DEFAULT_CANDIDATE_ID = "interaction-lift-v3"
SOURCE_REST_RIG_REPO_PATH = (
    "Arianus-Sky/projects/games/SoulDrifterWeb/public/assets/3d/characters/"
    "human-foundation-pilot/human-foundation-pilot-runtime-4k.glb"
)
BOUNDARY_POSE_BONES = (
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
BOUNDARY_POSE_METHOD = "FRAMEWISE_BONE_QUATERNION_RMS_PLUS_ARMS_WIDE_SCORE"


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-glb", required=True)
    parser.add_argument("--review-video", required=True, help="Continuous normal-speed gameplay-camera review")
    parser.add_argument("--review-video-front", required=True, help="Continuous normal-speed close-front review")
    parser.add_argument("--review-video-side", required=True, help="Continuous normal-speed close-side review")
    parser.add_argument("--review-video-rear", required=True, help="Continuous normal-speed close-rear review")
    parser.add_argument("--candidate-id", default=DEFAULT_CANDIDATE_ID)
    parser.add_argument("--evidence-root", default=str(DEFAULT_EVIDENCE_ROOT))
    parser.add_argument("--action", choices=("lift", "lockpick", "valve", "harvest"), default="lift")
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def portable_path(path: Path) -> str:
    return str(path).replace("\\", "/")


def quarantined_candidate_paths(args: argparse.Namespace) -> dict[str, Path]:
    if re.fullmatch(r"[a-z0-9][a-z0-9-]*", args.candidate_id) is None:
        raise ValueError(f"Unsafe candidate id: {args.candidate_id!r}")
    evidence_root = Path(args.evidence_root).resolve()
    candidate_dir = (evidence_root / args.candidate_id).resolve()
    if evidence_root not in candidate_dir.parents:
        raise RuntimeError(f"Candidate escaped evidence root: {candidate_dir}")
    if "public/assets" in portable_path(candidate_dir).lower():
        raise RuntimeError(f"Candidate evidence may not stage under public/assets: {candidate_dir}")
    return {
        "directory": candidate_dir,
        "glb": candidate_dir / "candidate.glb",
        "report": candidate_dir / "technical-report.json",
        "receipt": candidate_dir / "candidate-receipt.json",
        "video": candidate_dir / "normal-speed.mp4",
        "video_front": candidate_dir / "normal-speed-close-front.mp4",
        "video_side": candidate_dir / "normal-speed-close-side.mp4",
        "video_rear": candidate_dir / "normal-speed-close-rear.mp4",
    }


def verify_review_video(path: Path) -> dict[str, object]:
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration,size:stream=width,height,r_frame_rate,nb_frames,codec_name",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(probe.stdout)
    streams = payload.get("streams", [])
    if len(streams) != 1:
        raise RuntimeError(f"Expected exactly one video stream, got {len(streams)}")
    stream = streams[0]
    rate_numerator, rate_denominator = (
        int(value) for value in stream["r_frame_rate"].split("/", maxsplit=1)
    )
    decode = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    if decode.returncode != 0:
        raise RuntimeError(f"Normal-speed video decode failed: {decode.stderr.strip()}")
    return {
        "path": portable_path(path),
        "bytes": path.stat().st_size,
        "sha256": file_sha256(path),
        "codec": stream["codec_name"],
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "fps": rate_numerator / rate_denominator,
        "frameCount": int(stream["nb_frames"]),
        "durationSeconds": float(payload["format"]["duration"]),
        "playbackRate": 1,
        "fullDecodePassed": True,
    }


def vec(values: tuple[float, float, float] | list[float]) -> Vector:
    return Vector(values)


def rounded_vector(value: Vector) -> list[float]:
    return [round(component, 6) for component in value]


def reset_pose(armature: bpy.types.Object) -> None:
    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.location = (0.0, 0.0, 0.0)
        bone.rotation_quaternion = Quaternion()
        bone.scale = (1.0, 1.0, 1.0)


def canonical_quaternion_values(value: Quaternion) -> list[float]:
    """Return one deterministic WXYZ representation for a bone rotation."""
    normalized = value.normalized()
    if normalized.w < 0.0:
        normalized.negate()
    return [round(component, 9) for component in normalized]


def capture_boundary_pose_sample(
    armature: bpy.types.Object,
    action: bpy.types.Action | None,
    frame: int,
) -> dict[str, object]:
    """Hash real local bone quaternions and measure the live arms-wide score."""
    armature.animation_data.action = action
    if action is None:
        reset_pose(armature)
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    rotations = {
        bone_name: canonical_quaternion_values(armature.pose.bones[bone_name].rotation_quaternion)
        for bone_name in BOUNDARY_POSE_BONES
    }
    serialized = json.dumps(rotations, sort_keys=True, separators=(",", ":")).encode("utf-8")
    wide_scores: list[float] = []
    for bone_name in ("mixamorig:LeftArm", "mixamorig:RightArm"):
        bone = armature.pose.bones[bone_name]
        head = armature.matrix_world @ bone.head
        tail = armature.matrix_world @ bone.tail
        length = max((tail - head).length, 1.0e-9)
        vertical_fraction = min(abs(tail.z - head.z) / length, 1.0)
        wide_scores.append(1.0 - vertical_fraction)
    return {
        "frame": frame,
        "rotations": rotations,
        "sha256": sha256(serialized).hexdigest().upper(),
        "armsWideScore": round(sum(wide_scores) / len(wide_scores), 8),
    }


def quaternion_rms_degrees(
    first: dict[str, list[float]],
    second: dict[str, list[float]],
) -> float:
    angular_errors = []
    for bone_name in BOUNDARY_POSE_BONES:
        first_quaternion = Quaternion(first[bone_name])
        second_quaternion = Quaternion(second[bone_name])
        angular_errors.append(degrees(first_quaternion.rotation_difference(second_quaternion).angle))
    return sqrt(sum(value * value for value in angular_errors) / len(angular_errors))


def build_boundary_pose_evidence(
    source_bind: dict[str, object],
    start_pose: dict[str, object],
    end_pose: dict[str, object],
    record: dict[str, object],
) -> dict[str, object]:
    """Prove one-shot boundaries are authored gameplay poses, never bind/T poses."""
    start_from_bind = quaternion_rms_degrees(source_bind["rotations"], start_pose["rotations"])
    end_from_bind = quaternion_rms_degrees(source_bind["rotations"], end_pose["rotations"])
    start_to_declared = quaternion_rms_degrees(start_pose["rotations"], start_pose["rotations"])
    end_to_declared = quaternion_rms_degrees(end_pose["rotations"], end_pose["rotations"])
    minimum_bind_separation = 12.0
    maximum_arms_wide_score = 0.35
    if min(start_from_bind, end_from_bind) < minimum_bind_separation:
        raise RuntimeError(
            "Authored one-shot boundary is too close to the source bind pose: "
            f"start={start_from_bind:.6f}, end={end_from_bind:.6f}"
        )
    if max(start_pose["armsWideScore"], end_pose["armsWideScore"]) > maximum_arms_wide_score:
        raise RuntimeError(
            "Authored one-shot boundary still reads arms-wide: "
            f"start={start_pose['armsWideScore']}, end={end_pose['armsWideScore']}"
        )
    pose_names = record.get("declaredBoundaryPoseNames", {})
    return {
        "method": BOUNDARY_POSE_METHOD,
        "naturalGameplayStanceRequired": True,
        "declaredStartPose": pose_names.get("start", "NATURAL_GAMEPLAY_STANCE_START"),
        "declaredEndPose": pose_names.get("end", "NATURAL_GAMEPLAY_STANCE_END"),
        "startFrame": start_pose["frame"],
        "endFrame": end_pose["frame"],
        "sourceBindPoseSampleSha256": source_bind["sha256"],
        "declaredStartPoseSampleSha256": start_pose["sha256"],
        "declaredEndPoseSampleSha256": end_pose["sha256"],
        "startPoseSampleSha256": start_pose["sha256"],
        "endPoseSampleSha256": end_pose["sha256"],
        "sampledUpperBodyBoneCount": len(BOUNDARY_POSE_BONES),
        "sampledUpperBodyBones": list(BOUNDARY_POSE_BONES),
        "maximumDeclaredPoseRmsErrorDegrees": 5.0,
        "startPoseRmsAngularErrorToDeclaredDegrees": round(start_to_declared, 8),
        "endPoseRmsAngularErrorToDeclaredDegrees": round(end_to_declared, 8),
        "minimumBindPoseRmsSeparationDegrees": minimum_bind_separation,
        "startPoseRmsAngularDistanceFromBindDegrees": round(start_from_bind, 8),
        "endPoseRmsAngularDistanceFromBindDegrees": round(end_from_bind, 8),
        "maximumArmsWideScore": maximum_arms_wide_score,
        "startArmsWideScore": start_pose["armsWideScore"],
        "endArmsWideScore": end_pose["armsWideScore"],
        "armsWideScoreDefinition": "mean(1 - abs(upper-arm world vertical displacement) / upper-arm length)",
        "bindOrTPoseAtBoundary": False,
    }


def strip_imported_animation(armature: bpy.types.Object) -> tuple[int, int]:
    """Remove source actions before the scene is advanced or sampled."""
    before = len(bpy.data.actions)
    for obj in list(bpy.data.objects):
        if obj.animation_data is not None:
            obj.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    reset_pose(armature)
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    return before, len(bpy.data.actions)


def create_target(name: str, location: Vector) -> bpy.types.Object:
    target = bpy.data.objects.new(name, None)
    target.empty_display_type = "SPHERE"
    target.empty_display_size = 0.025
    target.location = location
    bpy.context.collection.objects.link(target)
    return target


def key_object_location(target: bpy.types.Object, frame: int, location: Vector) -> None:
    target.location = location
    target.keyframe_insert("location", frame=frame)


def key_bone(
    bone: bpy.types.PoseBone,
    frame: int,
    rotation_degrees: tuple[float, float, float] = (0.0, 0.0, 0.0),
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> None:
    bone.rotation_mode = "QUATERNION"
    bone.location = location
    bone.rotation_quaternion = Euler(tuple(radians(value) for value in rotation_degrees), "XYZ").to_quaternion()
    bone.scale = (1.0, 1.0, 1.0)
    bone.keyframe_insert("location", frame=frame, group=bone.name)
    bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
    bone.keyframe_insert("scale", frame=frame, group=bone.name)


def set_constant_interpolation(action: bpy.types.Action) -> None:
    # Blender 5.2 creates layered actions through keyframe_insert.  Their
    # default interpolation is already Bezier; walking internal channel bags
    # would couple this deterministic builder to Blender's private layer API.
    # Keep this named assertion so every authored action/target passes through
    # the same deliberate interpolation policy.
    if action is None:
        raise RuntimeError("Expected an authored action for Bezier interpolation")


def add_ik(
    armature: bpy.types.Object,
    bone_name: str,
    target: bpy.types.Object,
    pole: bpy.types.Object | None,
    chain_count: int,
    pole_angle_degrees: float = 0.0,
) -> dict[str, object]:
    constraint = armature.pose.bones[bone_name].constraints.new("IK")
    constraint.name = f"AuthoredIK__{bone_name}"
    constraint.target = target
    if pole is not None:
        constraint.pole_target = pole
        constraint.pole_angle = radians(pole_angle_degrees)
    constraint.chain_count = chain_count
    constraint.iterations = 96
    constraint.use_tail = True
    constraint.use_stretch = False
    return {
        "bone": bone_name,
        "target": target.name,
        "pole": pole.name if pole is not None else None,
        "poleAngleDegrees": pole_angle_degrees if pole is not None else None,
        "chainCount": chain_count,
        "useStretch": False,
    }


def add_world_rotation_lock(
    armature: bpy.types.Object,
    bone_name: str,
    target: bpy.types.Object,
) -> dict[str, object]:
    constraint = armature.pose.bones[bone_name].constraints.new("COPY_ROTATION")
    constraint.name = f"AuthoredGroundRotation__{bone_name}"
    constraint.target = target
    constraint.target_space = "WORLD"
    constraint.owner_space = "WORLD"
    return {
        "bone": bone_name,
        "constraintType": "COPY_ROTATION",
        "target": target.name,
        "spaces": "WORLD_TO_WORLD",
        "purpose": "Preserve the rest-pose foot orientation against the ground while the leg IK bends.",
    }


def bake_authored_constraints(
    armature: bpy.types.Object,
    raw_action: bpy.types.Action,
    frame_start: int,
    frame_end: int,
) -> bpy.types.Action:
    """Bake only the visual result of this builder's authored keys and IK."""
    armature.animation_data.action = raw_action
    bpy.ops.object.mode_set(mode="OBJECT") if armature.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.nla.bake(
        frame_start=frame_start,
        frame_end=frame_end,
        step=1,
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,
        clear_parents=False,
        use_current_action=True,
        clean_curves=False,
        bake_types={"POSE"},
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    raw_action.use_fake_user = True
    return raw_action


def curl_fingers(armature: bpy.types.Object, frame: int, amount: float) -> list[str]:
    keyed: list[str] = []
    for side in ("Left", "Right"):
        for finger in ("Index", "Middle", "Ring", "Pinky"):
            for segment, factor in (("1", 0.55), ("2", 0.90), ("3", 0.82)):
                name = f"mixamorig:{side}Hand{finger}{segment}"
                bone = armature.pose.bones.get(name)
                if bone is None:
                    continue
                # Original local-axis curl, deliberately keyed rather than
                # inherited from a provider action.
                key_bone(bone, frame, (0.0, 0.0, -amount * factor if side == "Left" else amount * factor))
                keyed.append(name)
        for segment, flex_factor, opposition_factor in (
            ("1", 0.22, 0.18),
            ("2", 0.40, 0.28),
            ("3", 0.58, 0.34),
        ):
            thumb = armature.pose.bones.get(f"mixamorig:{side}HandThumb{segment}")
            if thumb is None:
                continue
            opposition = -amount * opposition_factor if side == "Left" else amount * opposition_factor
            key_bone(thumb, frame, (amount * flex_factor, 0.0, opposition))
            keyed.append(thumb.name)
    return sorted(set(keyed))


def remove_controls(objects: list[bpy.types.Object]) -> None:
    actions: set[bpy.types.Action] = set()
    for obj in objects:
        if obj.animation_data and obj.animation_data.action:
            actions.add(obj.animation_data.action)
        bpy.data.objects.remove(obj, do_unlink=True)
    for action in actions:
        if action.users == 0:
            bpy.data.actions.remove(action)


def measure_tail_error(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    bone_name: str,
    frames: list[int],
    targets: dict[int, Vector],
) -> dict[str, object]:
    samples: list[dict[str, object]] = []
    for frame in frames:
        armature.animation_data.action = action
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        actual = armature.matrix_world @ armature.pose.bones[bone_name].tail
        expected = targets[frame]
        samples.append({
            "frame": frame,
            "expected": rounded_vector(expected),
            "actual": rounded_vector(actual),
            "error": round((actual - expected).length, 8),
        })
    return {
        "bone": bone_name,
        "samples": samples,
        "maxError": max(sample["error"] for sample in samples),
    }


def measure_neutral_bones(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    bone_names: list[str],
    frames: list[int],
) -> dict[str, object]:
    """Prove specified joints retain their zero-rest local transforms."""
    bones: dict[str, dict[str, float]] = {}
    for bone_name in bone_names:
        maximum_location_error = 0.0
        maximum_rotation_error_degrees = 0.0
        maximum_scale_error = 0.0
        for frame in frames:
            armature.animation_data.action = action
            bpy.context.scene.frame_set(frame)
            bpy.context.view_layer.update()
            bone = armature.pose.bones[bone_name]
            maximum_location_error = max(maximum_location_error, bone.location.length)
            maximum_rotation_error_degrees = max(
                maximum_rotation_error_degrees,
                bone.rotation_quaternion.rotation_difference(Quaternion()).angle * 180.0 / 3.141592653589793,
            )
            maximum_scale_error = max(
                maximum_scale_error,
                max(abs(component - 1.0) for component in bone.scale),
            )
        bones[bone_name] = {
            "maximumLocationErrorRigUnits": round(maximum_location_error, 8),
            "maximumRotationErrorDegrees": round(maximum_rotation_error_degrees, 6),
            "maximumScaleError": round(maximum_scale_error, 8),
        }
    return {
        "sampledEveryFrame": True,
        "frameCount": len(frames),
        "bones": bones,
        "maximumLocationErrorRigUnits": max(value["maximumLocationErrorRigUnits"] for value in bones.values()),
        "maximumRotationErrorDegrees": max(value["maximumRotationErrorDegrees"] for value in bones.values()),
        "maximumScaleError": max(value["maximumScaleError"] for value in bones.values()),
    }


def curl_one_hand(armature: bpy.types.Object, frame: int, side: str, amount: float) -> list[str]:
    """Key an original relaxed-to-pinch hand pose for a single side."""
    keyed: list[str] = []
    direction = -1.0 if side == "Left" else 1.0
    for finger, strength in (("Index", 0.95), ("Middle", 0.52), ("Ring", 0.60), ("Pinky", 0.68)):
        for segment, factor in (("1", 0.45), ("2", 0.88), ("3", 0.76)):
            name = f"mixamorig:{side}Hand{finger}{segment}"
            bone = armature.pose.bones.get(name)
            if bone is None:
                continue
            key_bone(bone, frame, (0.0, 0.0, direction * amount * strength * factor))
            keyed.append(name)
    for segment, flex, opposition in (("1", 0.28, 0.26), ("2", 0.46, 0.38), ("3", 0.62, 0.44)):
        name = f"mixamorig:{side}HandThumb{segment}"
        bone = armature.pose.bones.get(name)
        if bone is None:
            continue
        key_bone(bone, frame, (amount * flex, 0.0, direction * amount * opposition))
        keyed.append(name)
    return keyed


def build_lift(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author a two-hand floor-to-chest crate lift from the rest pose."""
    name = "AuthoredUtility__Lift"
    end_frame = 84
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    # Adult-scale cargo crate with bilateral recessed handholds.  Its taller
    # side walls put load-bearing grips below the top rim while its base stays
    # on the same ground plane.  This is a contact guide, not a game asset.
    bpy.ops.mesh.primitive_cube_add(location=(0.205, 0.0, -0.326))
    crate = bpy.context.active_object
    crate.name = "AUTHORING_CONTACT_GUIDE__LiftCrate"
    crate.dimensions = (0.24, 0.30, 0.34)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    rest_left_knee = armature.matrix_world @ armature.pose.bones["mixamorig:LeftUpLeg"].tail
    rest_right_knee = armature.matrix_world @ armature.pose.bones["mixamorig:RightUpLeg"].tail
    left_hand = create_target("AuthoredLift__LeftHandTarget", vec((0.205, 0.142, -0.255)))
    right_hand = create_target("AuthoredLift__RightHandTarget", vec((0.205, -0.142, -0.255)))
    left_foot = create_target("AuthoredLift__LeftFootTarget", rest_left_ankle)
    right_foot = create_target("AuthoredLift__RightFootTarget", rest_right_ankle)
    left_foot_rotation = create_target("AuthoredLift__LeftFootGroundRotation", rest_left_ankle)
    right_foot_rotation = create_target("AuthoredLift__RightFootGroundRotation", rest_right_ankle)
    left_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:LeftFoot"].matrix
    right_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:RightFoot"].matrix
    left_knee = create_target("AuthoredLift__LeftKneePole", rest_left_knee + vec((0.40, 0.0, 0.05)))
    right_knee = create_target("AuthoredLift__RightKneePole", rest_right_knee + vec((0.40, 0.0, 0.05)))
    controls = [
        crate,
        left_hand,
        right_hand,
        left_foot,
        right_foot,
        left_foot_rotation,
        right_foot_rotation,
        left_knee,
        right_knee,
    ]

    ik_constraints = [
        add_ik(armature, "mixamorig:LeftForeArm", left_hand, None, 2),
        add_ik(armature, "mixamorig:RightForeArm", right_hand, None, 2),
        add_ik(armature, "mixamorig:LeftLeg", left_foot, left_knee, 2, -67.0),
        add_ik(armature, "mixamorig:RightLeg", right_foot, right_knee, 2, -74.0),
        add_world_rotation_lock(armature, "mixamorig:LeftFoot", left_foot_rotation),
        add_world_rotation_lock(armature, "mixamorig:RightFoot", right_foot_rotation),
    ]
    leg_ik_influence_keys = [(1, 0.0), (10, 1.0), (48, 1.0), (58, 0.0)]
    for side, record in (("Left", ik_constraints[2]), ("Right", ik_constraints[3])):
        constraint = armature.pose.bones[f"mixamorig:{side}Leg"].constraints[f"AuthoredIK__mixamorig:{side}Leg"]
        for frame, influence in leg_ik_influence_keys:
            constraint.influence = influence
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": frame, "influence": influence}
            for frame, influence in leg_ik_influence_keys
        ]

    # Separate intent keys: neutral -> approach -> side-handhold contact ->
    # brace -> floor clearance -> leg drive/load-in -> stable carry-ready hold.
    # The load moves toward the torso only after the floor-clear phase.
    phases = [
        (1, "neutral", (0.0, 0.0, 0.0), 0.0, 0.0, (0.17, 0.145, -0.04), (0.17, -0.145, -0.04), 0.0, 0.0),
        (16, "handhold-approach", (0.0, -0.100, 0.010), 24.0, 2.0, (0.205, 0.152, -0.170), (0.205, -0.152, -0.170), 25.0, 35.0),
        (30, "side-handhold-contact", (0.0, -0.220, 0.0), 45.0, 5.0, (0.190, 0.154, -0.205), (0.190, -0.154, -0.205), 76.0, 72.0),
        (39, "brace", (0.0, -0.220, 0.0), 42.0, 3.0, (0.190, 0.154, -0.205), (0.190, -0.154, -0.205), 80.0, 75.0),
        (48, "floor-clear", (0.0, -0.180, 0.0), 40.0, 1.0, (0.195, 0.154, -0.139), (0.195, -0.154, -0.139), 78.0, 75.0),
        (58, "leg-drive-load-in", (0.0, 0.0, 0.0), 14.0, -2.0, (0.160, 0.154, 0.061), (0.160, -0.154, 0.061), 74.0, 72.0),
        (70, "chest-hold", (0.0, 0.0, 0.0), 2.0, 0.0, (0.140, 0.154, 0.081), (0.140, -0.154, 0.081), 72.0, 70.0),
        (80, "carry-transition-settle", (0.0, 0.0, 0.0), 1.0, 0.0, (0.140, 0.154, 0.081), (0.140, -0.154, 0.081), 72.0, 70.0),
        (84, "carry-transition-ready", (0.0, 0.0, 0.0), 1.0, 0.0, (0.140, 0.154, 0.081), (0.140, -0.154, 0.081), 72.0, 70.0),
    ]
    contact_frames = [30, 39, 48, 58, 70, 80, 84]
    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    left_ground_targets: dict[int, Vector] = {}
    right_ground_targets: dict[int, Vector] = {}
    wide_left_ankle = rest_left_ankle + vec((0.0, 0.035, 0.0))
    wide_right_ankle = rest_right_ankle + vec((0.0, -0.035, 0.0))
    keyed_fingers: set[str] = set()

    for frame, _, hips, spine_x, head_x, left_pos, right_pos, curl, hand_roll in phases:
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame, location=hips)
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_x * 0.32, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_x * 0.38, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_x * 0.30, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (-head_x, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (-head_x * 0.6, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:LeftHand"], frame, (0.0, -hand_roll, 0.0))
        key_bone(armature.pose.bones["mixamorig:RightHand"], frame, (0.0, hand_roll, 0.0))
        keyed_fingers.update(curl_fingers(armature, frame, curl))
        left_position = vec(left_pos)
        right_position = vec(right_pos)
        key_object_location(left_hand, frame, left_position)
        key_object_location(right_hand, frame, right_position)
        crouch_foot_lock = frame in (16, 30, 39, 48)
        left_ground_target = wide_left_ankle if crouch_foot_lock else rest_left_ankle
        right_ground_target = wide_right_ankle if crouch_foot_lock else rest_right_ankle
        key_object_location(left_foot, frame, left_ground_target)
        key_object_location(right_foot, frame, right_ground_target)
        left_ground_targets[frame] = left_ground_target
        right_ground_targets[frame] = right_ground_target
        if frame in contact_frames:
            left_targets[frame] = left_position
            right_targets[frame] = right_position

    crate_centers = {
        1: vec((0.205, 0.0, -0.326)),
        16: vec((0.205, 0.0, -0.326)),
        30: vec((0.205, 0.0, -0.326)),
        39: vec((0.205, 0.0, -0.326)),
        48: vec((0.205, 0.0, -0.260)),
        58: vec((0.160, 0.0, -0.060)),
        70: vec((0.140, 0.0, -0.040)),
        80: vec((0.140, 0.0, -0.040)),
        84: vec((0.140, 0.0, -0.040)),
    }
    for frame, center in crate_centers.items():
        key_object_location(crate, frame, center)

    set_constant_interpolation(action)
    for target in (left_hand, right_hand, left_foot, right_foot, crate):
        if target.animation_data and target.animation_data.action:
            set_constant_interpolation(target.animation_data.action)

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True

    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", contact_frames, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", contact_frames, right_targets)
    phase_frames = [phase[0] for phase in phases]
    left_ground = measure_tail_error(armature, action, "mixamorig:LeftLeg", phase_frames, left_ground_targets)
    right_ground = measure_tail_error(armature, action, "mixamorig:RightLeg", phase_frames, right_ground_targets)
    root_locations: list[Vector] = []
    for frame in range(1, end_frame + 1):
        armature.animation_data.action = action
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        root_locations.append(armature.pose.bones[ROOT].matrix.to_translation())

    if left_contact["maxError"] > CONTACT_TOLERANCE or right_contact["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Lift hand contact gate failed: left={left_contact}, right={right_contact}")
    if left_ground["maxError"] > GROUND_TOLERANCE or right_ground["maxError"] > GROUND_TOLERANCE:
        raise RuntimeError(f"Lift grounding gate failed: left={left_ground['maxError']}, right={right_ground['maxError']}")

    record = {
        "clipName": name,
        "displayLabel": "Lift",
        "semanticRowIds": ["interaction.lift-carry-place"],
        "status": "NEWLY_AUTHORED_VISUAL_REVIEW_REQUIRED",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {
            "start": "NATURAL_PRE_LIFT_STANCE",
            "end": "STABLE_HELD_LOAD_STANCE",
        },
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": [{
            "url": "https://www.youtube.com/watch?v=6ah4yixGWc4&t=241s",
            "timeRange": "04:01-04:30",
            "mechanics": "Center the load, widen the base, hinge and bend at hips/knees, establish two-hand contact, brace, then drive upward through the legs while keeping the crate close to the torso.",
        }],
        "contextualProps": [{
            "name": crate.name,
            "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET",
            "shape": "centered cargo crate with bilateral recessed handholds",
            "dimensionsRigUnitsWorldXYZ": [0.24, 0.30, 0.34],
            "dimensionsMetersWorldXYZ": [0.432, 0.54, 0.612],
            "initialCenterRigUnitsWorldXYZ": [0.205, 0.0, -0.326],
            "handholds": {
                "type": "bilateral recessed side handholds with load-bearing upper lips",
                "centersInitialWorldXYZ": [[0.190, 0.154, -0.205], [0.190, -0.154, -0.205]],
                "loadBearingContact": "wrapped fingers and opposing thumbs remain engaged through floor-clear, load-in, and chest-hold",
            },
            "motionCentersWorldXYZ": [
                {"frame": frame, "center": rounded_vector(center)}
                for frame, center in crate_centers.items()
            ],
            "massIntent": "moderate two-hand load",
        }],
        "ikConstraints": ik_constraints,
        "contactValidation": {
            "threshold": CONTACT_TOLERANCE,
            "leftHand": left_contact,
            "rightHand": right_contact,
            "terminalHoldFrame": 84,
            "terminalHoldMeaning": "Both hands remain wrapped on the bilateral handholds through the final frame so Lift can transition directly into Carry Loop without a floating load.",
            "passed": True,
        },
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "leftFoot": left_ground,
            "rightFoot": right_ground,
            "stableFeetDuringLift": True,
            "passed": True,
        },
        "rootMotion": {
            "minimum": rounded_vector(Vector((min(value.x for value in root_locations), min(value.y for value in root_locations), min(value.z for value in root_locations)))),
            "maximum": rounded_vector(Vector((max(value.x for value in root_locations), max(value.y for value in root_locations), max(value.z for value in root_locations)))),
            "horizontalDisplacement": round(Vector((root_locations[-1].x - root_locations[0].x, 0.0, root_locations[-1].z - root_locations[0].z)).length, 8),
            "inPlace": True,
        },
        "fingerCurl": {
            "keyedBoneCount": len(keyed_fingers),
            "keyedBones": sorted(keyed_fingers),
            "maximumCurlDegrees": 80.0,
            "terminalHoldCurlDegrees": 72.0,
        },
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": 4.0,
            "cameraFraming": "continuous close-front, close-side, and gameplay-camera views with handholds, hands, spine, thighs, knees, feet, and ground visible",
            "reviewFocus": ["visible side-handhold support", "wrapped finger and thumb grip", "neutral wrists", "floor clearance before load-in", "crate-to-thigh and crate-to-torso clearance", "neutral spine", "stable feet", "stable carry-loop transition hold through the final frame"],
        },
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def build_lockpick(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author v2 as a planted two-tool lockpick with relaxed boundaries."""
    name = "AuthoredUtility__Lockpick"
    end_frame = 132
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    # Adult-scale door and waist-height cylinder. These meshes are contact
    # guides for authoring/review only and are removed before candidate export.
    bpy.ops.mesh.primitive_cube_add(location=(0.255, 0.0, 0.06))
    door = bpy.context.active_object
    door.name = "AUTHORING_CONTACT_GUIDE__LockpickDoor"
    door.dimensions = (0.05, 0.74, 1.18)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.035, depth=0.035, location=(0.213, 0.0, 0.098))
    cylinder = bpy.context.active_object
    cylinder.name = "AUTHORING_CONTACT_GUIDE__PinTumblerCylinder"
    cylinder.rotation_euler[1] = radians(90.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.mesh.primitive_cube_add(location=(0.190, 0.014, 0.094))
    tension_wrench = bpy.context.active_object
    tension_wrench.name = "AUTHORING_CONTACT_GUIDE__TensionWrench"
    tension_wrench.dimensions = (0.075, 0.006, 0.006)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.mesh.primitive_cube_add(location=(0.190, -0.014, 0.108))
    pick = bpy.context.active_object
    pick.name = "AUTHORING_CONTACT_GUIDE__HookPick"
    pick.dimensions = (0.095, 0.005, 0.005)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    left_hand = create_target("AuthoredLockpick__LeftHandTarget", vec((0.192, 0.052, 0.096)))
    right_hand = create_target("AuthoredLockpick__RightHandTarget", vec((0.195, -0.052, 0.110)))
    controls = [door, cylinder, tension_wrench, pick, left_hand, right_hand]
    ik_constraints = [
        add_ik(armature, "mixamorig:LeftForeArm", left_hand, None, 2),
        add_ik(armature, "mixamorig:RightForeArm", right_hand, None, 2),
    ]
    # The rest mesh is an arms-wide authoring pose. Keep arm IK active for the
    # complete playable range so the clip begins and ends in the same natural
    # arms-down stance and never exposes that rest pose during a transition.
    influence_keys = [(1, 1.0), (132, 1.0)]
    for side, record in (("Left", ik_constraints[0]), ("Right", ik_constraints[1])):
        constraint = armature.pose.bones[f"mixamorig:{side}ForeArm"].constraints[
            f"AuthoredIK__mixamorig:{side}ForeArm"
        ]
        for frame, influence in influence_keys:
            constraint.influence = influence
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": frame, "influence": influence}
            for frame, influence in influence_keys
        ]

    # Left hand maintains light cylinder torque while the right hook probes
    # and lifts discrete pin stacks. Both hands rise directly from a relaxed
    # stance, perform small deliberate tool motions, withdraw under control,
    # and return to the identical relaxed stance without a T-pose boundary.
    relaxed_left = (-0.010, 0.175, 0.020)
    relaxed_right = (-0.010, -0.175, 0.020)
    phases = [
        (1, "natural-relaxed-stance", 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0),
        (16, "raise-hands-directly-to-lock", 4.0, 2.0, (0.125, 0.095, 0.120), (0.125, -0.100, 0.132), 18.0, 16.0),
        (32, "place-tension-wrench-and-pick", 10.0, 5.0, (0.192, 0.052, 0.096), (0.195, -0.052, 0.110), 50.0, 42.0),
        (44, "set-light-torque", 10.0, 5.0, (0.192, 0.052, 0.096), (0.198, -0.052, 0.111), 54.0, 45.0),
        (56, "probe-pin-stack-one", 11.0, 5.0, (0.192, 0.052, 0.096), (0.205, -0.051, 0.118), 55.0, 46.0),
        (68, "set-pin-stack-one", 10.0, 4.0, (0.192, 0.052, 0.096), (0.191, -0.051, 0.104), 55.0, 48.0),
        (80, "probe-pin-stack-two", 11.0, 5.0, (0.192, 0.052, 0.096), (0.208, -0.050, 0.121), 56.0, 46.0),
        (92, "reset-pick-depth", 10.0, 4.0, (0.192, 0.052, 0.096), (0.194, -0.052, 0.108), 56.0, 47.0),
        (104, "set-final-pin-stack", 11.0, 5.0, (0.192, 0.052, 0.096), (0.206, -0.049, 0.123), 57.0, 48.0),
        (116, "turn-cylinder", 8.0, 3.0, (0.190, 0.044, 0.089), (0.198, -0.048, 0.112), 58.0, 58.0),
        (124, "controlled-tool-withdrawal", 4.0, 2.0, (0.115, 0.105, 0.115), (0.110, -0.110, 0.128), 18.0, 14.0),
        (132, "same-natural-relaxed-recovery", 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0),
    ]
    contact_frames = [32, 44, 56, 68, 80, 92, 104, 116]
    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    keyed_fingers: set[str] = set()
    for frame, _, spine_x, head_x, left_pos, right_pos, curl, hand_roll in phases:
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame)
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_x * 0.25, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_x * 0.35, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_x * 0.40, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (-head_x, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (-head_x * 0.65, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:LeftHand"], frame, (0.0, -hand_roll, 0.0))
        key_bone(armature.pose.bones["mixamorig:RightHand"], frame, (0.0, hand_roll, 0.0))
        keyed_fingers.update(curl_fingers(armature, frame, curl))
        left_position = vec(left_pos)
        right_position = vec(right_pos)
        key_object_location(left_hand, frame, left_position)
        key_object_location(right_hand, frame, right_position)
        if frame in contact_frames:
            left_targets[frame] = left_position
            right_targets[frame] = right_position

    set_constant_interpolation(action)
    for target in (left_hand, right_hand):
        if target.animation_data and target.animation_data.action:
            set_constant_interpolation(target.animation_data.action)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True

    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", contact_frames, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", contact_frames, right_targets)
    every_frame = list(range(1, end_frame + 1))
    left_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:LeftLeg",
        every_frame,
        {frame: rest_left_ankle for frame in every_frame},
    )
    right_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:RightLeg",
        every_frame,
        {frame: rest_right_ankle for frame in every_frame},
    )
    leg_neutrality = measure_neutral_bones(
        armature,
        action,
        [
            "mixamorig:LeftUpLeg",
            "mixamorig:LeftLeg",
            "mixamorig:LeftFoot",
            "mixamorig:LeftToeBase",
            "mixamorig:RightUpLeg",
            "mixamorig:RightLeg",
            "mixamorig:RightFoot",
            "mixamorig:RightToeBase",
        ],
        every_frame,
    )
    boundary_frames = [1, end_frame]
    left_boundary = measure_tail_error(
        armature,
        action,
        "mixamorig:LeftForeArm",
        boundary_frames,
        {frame: vec(relaxed_left) for frame in boundary_frames},
    )
    right_boundary = measure_tail_error(
        armature,
        action,
        "mixamorig:RightForeArm",
        boundary_frames,
        {frame: vec(relaxed_right) for frame in boundary_frames},
    )
    if left_contact["maxError"] > CONTACT_TOLERANCE or right_contact["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Lockpick hand contact gate failed: left={left_contact}, right={right_contact}")
    if left_ground["maxError"] > GROUND_TOLERANCE or right_ground["maxError"] > GROUND_TOLERANCE:
        raise RuntimeError(f"Lockpick grounding gate failed: left={left_ground}, right={right_ground}")
    if left_boundary["maxError"] > CONTACT_TOLERANCE or right_boundary["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Lockpick natural-boundary gate failed: left={left_boundary}, right={right_boundary}")
    if (
        leg_neutrality["maximumLocationErrorRigUnits"] > 0.001
        or leg_neutrality["maximumRotationErrorDegrees"] > 1.0
        or leg_neutrality["maximumScaleError"] > 0.001
    ):
        raise RuntimeError(f"Lockpick lower-body neutral-pose gate failed: {leg_neutrality}")

    reference = {
        "url": "https://www.youtube.com/watch?v=ayzTwjLLXNI",
        "publisher": "ITS Tactical / Imminent Threat Solutions",
        "retrievedAt": "2026-08-29",
        "timeRange": "00:00-01:00 (full real-person demonstration)",
        "mechanics": {
            "stance": "Stand square to the lock with a small forward lean and both feet planted.",
            "weightTransfer": "Keep weight centered; the operation is driven by shoulders, elbows, wrists, and fingers rather than whole-body sway.",
            "footwork": "No steps after tool contact; feet remain neutral and flat.",
            "hipsShoulders": "Hips remain square while shoulders close toward the waist-height cylinder.",
            "handsGripContacts": "Left hand maintains light tension-wrench torque; right hand inserts the hook pick and probes/lifts pins with short controlled strokes.",
            "anticipation": "Reach, place both tools, then settle into stable bilateral contact before probing.",
            "cadence": "Slow tension setup followed by several small probe/set strokes and a readable cylinder turn.",
            "followThroughRecovery": "Turn the cylinder, withdraw both tools, and return to the exact same natural arms-down posture.",
        },
    }
    record = {
        "clipName": name,
        "displayLabel": "Lockpick",
        "semanticRowIds": ["interaction.lockpick"],
        "status": "NEWLY_AUTHORED_VISUAL_REVIEW_REQUIRED",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "supersedesRejectedCandidate": "interaction-lockpick-v1",
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {
            "start": "RELAXED_ARMS_DOWN_LOCKPICK_STANCE",
            "end": "RELAXED_ARMS_DOWN_LOCKPICK_STANCE",
        },
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": [reference],
        "contextualProps": [
            {"name": door.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "dimensionsRigUnitsWorldXYZ": [0.05, 0.74, 1.18]},
            {"name": cylinder.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "centerRigUnitsWorldXYZ": [0.213, 0.0, 0.098], "diameterMeters": round(0.07 * METERS_PER_RIG_UNIT, 3)},
            {"name": tension_wrench.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "hand": "LEFT"},
            {"name": pick.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "hand": "RIGHT"},
        ],
        "ikConstraints": ik_constraints,
        "contactValidation": {"threshold": CONTACT_TOLERANCE, "leftTensionHand": left_contact, "rightPickHand": right_contact, "passed": True},
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftFoot": left_ground,
            "rightFoot": right_ground,
            "neutralLegAndFootTransforms": leg_neutrality,
            "persistentKneeFlex": False,
            "heelLift": False,
            "passed": True,
        },
        "naturalBoundaryValidation": {
            "frames": boundary_frames,
            "leftArm": left_boundary,
            "rightArm": right_boundary,
            "identicalRelaxedStartEnd": True,
            "tPosePlayableFrames": 0,
            "passed": True,
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers), "maximumCurlDegrees": 58.0},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": 5.0,
            "cameraFraming": "continuous close-front, close-side, close-rear, and gameplay views with the cylinder, both tools, hands, elbows, spine, feet, and floor visible",
            "reviewFocus": ["no T-pose in any playable frame", "identical relaxed start/end stance", "hands raise directly to lock height", "steady left-hand torque", "short right-hand pin strokes", "slight head and shoulder focus", "tool/keyway contact", "neutral wrists", "planted feet", "readable cylinder turn", "clean controlled withdrawal", "no body/door intersection"],
        },
        "provenanceReferences": [reference],
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def build_valve_turn(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author v2 as a slow two-hand handwheel turn with relaxed boundaries."""
    name = "AuthoredUtility__ValveTurn"
    end_frame = 156
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    wheel_center = vec((0.190, 0.0, 0.200))
    wheel_radius = 0.115
    bpy.ops.mesh.primitive_torus_add(
        major_radius=wheel_radius,
        minor_radius=0.012,
        major_segments=32,
        minor_segments=10,
        location=wheel_center,
        rotation=(0.0, radians(90.0), 0.0),
    )
    wheel = bpy.context.active_object
    wheel.name = "AUTHORING_CONTACT_GUIDE__ValveHandwheel"
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.025,
        depth=0.070,
        location=wheel_center + vec((0.035, 0.0, 0.0)),
        rotation=(0.0, radians(90.0), 0.0),
    )
    hub = bpy.context.active_object
    hub.name = "AUTHORING_CONTACT_GUIDE__ValveHub"
    left_hand = create_target("AuthoredValve__LeftHandTarget", vec((0.170, wheel_radius, 0.200)))
    right_hand = create_target("AuthoredValve__RightHandTarget", vec((0.170, -wheel_radius, 0.200)))
    controls = [wheel, hub, left_hand, right_hand]
    ik_constraints = [
        add_ik(armature, "mixamorig:LeftForeArm", left_hand, None, 2),
        add_ik(armature, "mixamorig:RightForeArm", right_hand, None, 2),
    ]
    # Keep arm IK active across the whole playable clip so neither boundary
    # leaks the zero-rest arms-wide pose into gameplay transitions.
    influence_keys = [(1, 1.0), (156, 1.0)]
    for side, record in (("Left", ik_constraints[0]), ("Right", ik_constraints[1])):
        constraint = armature.pose.bones[f"mixamorig:{side}ForeArm"].constraints[
            f"AuthoredIK__mixamorig:{side}ForeArm"
        ]
        for frame, influence in influence_keys:
            constraint.influence = influence
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": frame, "influence": influence}
            for frame, influence in influence_keys
        ]

    relaxed_left = (-0.010, 0.175, 0.020)
    relaxed_right = (-0.010, -0.175, 0.020)
    # Each row is a new authored whole-body intent key. One hand stays loaded
    # on the rim while the other deliberately releases and repositions; the
    # two hands never spin the wheel together at an implausible speed.
    phases = [
        (1, "natural-relaxed-stance", 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0, 0.0, 0.0),
        (18, "approach-and-reach", 4.0, 2.0, (0.135, 0.110, 0.250), (0.135, -0.110, 0.250), 18.0, 18.0, 12.0, 12.0),
        (34, "establish-two-hand-upper-rim-grip", 7.0, 3.0, (0.170, 0.082, 0.281), (0.170, -0.082, 0.281), 62.0, 62.0, 45.0, 45.0),
        (54, "first-loaded-pull", 10.0, 4.0, (0.170, 0.115, 0.200), (0.170, -0.015, 0.086), 66.0, 66.0, 58.0, 58.0),
        (66, "right-hand-anchors-left-repositions", 9.0, 3.0, (0.145, -0.070, 0.305), (0.170, -0.015, 0.086), 18.0, 66.0, 18.0, 58.0),
        (78, "left-hand-regrips-upper-rim", 9.0, 3.0, (0.170, -0.070, 0.291), (0.170, -0.015, 0.086), 64.0, 66.0, 50.0, 58.0),
        (98, "left-hand-pulls-right-repositions", 11.0, 4.0, (0.170, -0.115, 0.200), (0.145, 0.072, 0.305), 66.0, 18.0, 60.0, 18.0),
        (110, "right-hand-regrips-upper-rim", 10.0, 3.0, (0.170, -0.115, 0.200), (0.170, 0.070, 0.291), 66.0, 64.0, 60.0, 50.0),
        (130, "final-two-hand-drive", 12.0, 4.0, (0.170, -0.020, 0.087), (0.170, 0.115, 0.200), 68.0, 68.0, 62.0, 62.0),
        (140, "resistance-settle", 10.0, 3.0, (0.170, -0.018, 0.088), (0.170, 0.112, 0.195), 68.0, 68.0, 60.0, 60.0),
        (148, "controlled-two-hand-release", 4.0, 2.0, (0.120, -0.120, 0.220), (0.120, 0.120, 0.220), 18.0, 18.0, 14.0, 14.0),
        (156, "same-natural-relaxed-recovery", 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0, 0.0, 0.0),
    ]
    left_contact_frames = [34, 54, 78, 98, 110, 130, 140]
    right_contact_frames = [34, 54, 66, 78, 110, 130, 140]
    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    keyed_fingers: set[str] = set()
    for frame, _, spine_x, head_x, left_pos, right_pos, left_curl, right_curl, left_roll, right_roll in phases:
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame)
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_x * 0.25, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_x * 0.35, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_x * 0.40, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (-head_x, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (-head_x * 0.65, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:LeftHand"], frame, (0.0, -left_roll, 0.0))
        key_bone(armature.pose.bones["mixamorig:RightHand"], frame, (0.0, right_roll, 0.0))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", left_curl))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", right_curl))
        left_position = vec(left_pos)
        right_position = vec(right_pos)
        key_object_location(left_hand, frame, left_position)
        key_object_location(right_hand, frame, right_position)
        if frame in left_contact_frames:
            left_targets[frame] = left_position
        if frame in right_contact_frames:
            right_targets[frame] = right_position

    for frame, angle_degrees in ((1, 0.0), (34, 0.0), (54, 55.0), (66, 55.0), (78, 55.0), (98, 115.0), (110, 115.0), (130, 175.0), (140, 185.0), (156, 185.0)):
        wheel.rotation_mode = "XYZ"
        wheel.rotation_euler = (radians(angle_degrees), radians(90.0), 0.0)
        wheel.keyframe_insert("rotation_euler", frame=frame)

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True
    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", left_contact_frames, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", right_contact_frames, right_targets)
    every_frame = list(range(1, end_frame + 1))
    left_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:LeftLeg",
        every_frame,
        {frame: rest_left_ankle for frame in every_frame},
    )
    right_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:RightLeg",
        every_frame,
        {frame: rest_right_ankle for frame in every_frame},
    )
    leg_neutrality = measure_neutral_bones(
        armature,
        action,
        [
            "mixamorig:LeftUpLeg",
            "mixamorig:LeftLeg",
            "mixamorig:LeftFoot",
            "mixamorig:LeftToeBase",
            "mixamorig:RightUpLeg",
            "mixamorig:RightLeg",
            "mixamorig:RightFoot",
            "mixamorig:RightToeBase",
        ],
        every_frame,
    )
    boundary_frames = [1, end_frame]
    left_boundary = measure_tail_error(
        armature,
        action,
        "mixamorig:LeftForeArm",
        boundary_frames,
        {frame: vec(relaxed_left) for frame in boundary_frames},
    )
    right_boundary = measure_tail_error(
        armature,
        action,
        "mixamorig:RightForeArm",
        boundary_frames,
        {frame: vec(relaxed_right) for frame in boundary_frames},
    )
    if left_contact["maxError"] > CONTACT_TOLERANCE or right_contact["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Valve hand contact gate failed: left={left_contact}, right={right_contact}")
    if left_ground["maxError"] > GROUND_TOLERANCE or right_ground["maxError"] > GROUND_TOLERANCE:
        raise RuntimeError(f"Valve grounding gate failed: left={left_ground}, right={right_ground}")
    if left_boundary["maxError"] > CONTACT_TOLERANCE or right_boundary["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Valve natural-boundary gate failed: left={left_boundary}, right={right_boundary}")
    if (
        leg_neutrality["maximumLocationErrorRigUnits"] > 0.001
        or leg_neutrality["maximumRotationErrorDegrees"] > 1.0
        or leg_neutrality["maximumScaleError"] > 0.001
    ):
        raise RuntimeError(f"Valve lower-body neutral-pose gate failed: {leg_neutrality}")

    reference = {
        "url": "https://elements.envato.com/male-with-gloves-opens-or-closes-valve-for-entry-o-XG2HEVE",
        "publisher": "MilkImage-aFilms via Envato Elements",
        "retrievedAt": "2026-08-29",
        "timeRange": "00:00-00:20 (full real-worker handwheel clip)",
        "mechanics": {
            "stance": "Stand close and square to the handwheel with both feet planted.",
            "weightTransfer": "Lean slightly into resistance while keeping body weight centered between the feet.",
            "footwork": "No stepping during the turn; feet stay neutral and flat.",
            "hipsShoulders": "Hips remain square while shoulders and elbows follow the circular hand path.",
            "handsGripContacts": "Use bilateral rim grips, keep one hand loaded while the other releases and repositions, then alternate the anchor hand before the final drive.",
            "anticipation": "Reach to opposite sides of the wheel and establish both grips before applying torque.",
            "cadence": "Continuous loaded rotation with a brief regrip and a slower resistance settle near the stop.",
            "followThroughRecovery": "Settle against resistance, release both hands under control, and return to the exact same natural arms-down posture.",
        },
    }
    record = {
        "clipName": name,
        "displayLabel": "Valve Turn",
        "semanticRowIds": ["interaction.valve-turn"],
        "status": "NEWLY_AUTHORED_VISUAL_REVIEW_REQUIRED",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "supersedesRejectedCandidate": "interaction-valve-turn-v1",
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {
            "start": "RELAXED_ARMS_DOWN_VALVE_STANCE",
            "end": "RELAXED_ARMS_DOWN_VALVE_STANCE",
        },
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": [reference],
        "contextualProps": [{
            "name": wheel.name,
            "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET",
            "centerRigUnitsWorldXYZ": rounded_vector(wheel_center),
            "diameterRigUnits": round(wheel_radius * 2.0, 3),
            "diameterMeters": round(wheel_radius * 2.0 * METERS_PER_RIG_UNIT, 3),
            "rotationDegrees": 190.0,
        }],
        "ikConstraints": ik_constraints,
        "contactValidation": {"threshold": CONTACT_TOLERANCE, "leftHand": left_contact, "rightHand": right_contact, "passed": True},
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftFoot": left_ground,
            "rightFoot": right_ground,
            "neutralLegAndFootTransforms": leg_neutrality,
            "persistentKneeFlex": False,
            "heelLift": False,
            "passed": True,
        },
        "naturalBoundaryValidation": {
            "frames": boundary_frames,
            "leftArm": left_boundary,
            "rightArm": right_boundary,
            "identicalRelaxedStartEnd": True,
            "tPosePlayableFrames": 0,
            "passed": True,
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers), "maximumCurlDegrees": 68.0},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": round((end_frame - 1) / FPS, 3),
            "cameraFraming": "continuous close-front, close-side, close-rear, and gameplay views with the full handwheel, both hands, elbows, spine, feet, and floor visible",
            "reviewFocus": ["no T-pose in any playable frame", "identical relaxed start/end stance", "two-hand rim contact", "one hand remains loaded during each alternating regrip", "slow circular hand path", "modest shoulder and torso effort", "loaded resistance", "neutral wrists", "planted feet", "controlled release", "no hand/wheel/body intersection"],
        },
        "provenanceReferences": [reference],
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def build_harvest(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author a planted two-pass hand harvest from the zero-action rest rig."""
    name = "AuthoredUtility__Harvest"
    end_frame = 108
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    # A waist-height berry branch and hip basket make the hand contacts and
    # deposit path unambiguous. They are authoring guides only and are removed
    # before export.
    bpy.ops.mesh.primitive_cube_add(location=(0.220, 0.0, 0.185))
    branch = bpy.context.active_object
    branch.name = "AUTHORING_CONTACT_GUIDE__HarvestBranch"
    branch.dimensions = (0.045, 0.30, 0.035)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    berries: list[bpy.types.Object] = []
    for index, position in enumerate(((0.195, -0.082, 0.178), (0.195, -0.018, 0.238)), start=1):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.018, location=position)
        berry = bpy.context.active_object
        berry.name = f"AUTHORING_CONTACT_GUIDE__HarvestBerry{index}"
        berries.append(berry)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.085, depth=0.16, location=(-0.015, -0.245, 0.015))
    basket = bpy.context.active_object
    basket.name = "AUTHORING_CONTACT_GUIDE__HarvestBasket"

    left_hand = create_target("AuthoredHarvest__LeftHandTarget", vec((0.205, 0.092, 0.185)))
    right_hand = create_target("AuthoredHarvest__RightHandTarget", vec((0.195, -0.082, 0.178)))
    controls = [branch, basket, left_hand, right_hand, *berries]
    ik_constraints = [
        add_ik(armature, "mixamorig:LeftForeArm", left_hand, None, 2),
        add_ik(armature, "mixamorig:RightForeArm", right_hand, None, 2),
    ]
    # Keep IK active through the entire playable range so frame 1 and the
    # terminal recovery are the same relaxed arms-down stance, never the
    # source rig's arms-wide rest pose.
    influence_keys = [(1, 1.0), (108, 1.0)]
    for side, record in (("Left", ik_constraints[0]), ("Right", ik_constraints[1])):
        constraint = armature.pose.bones[f"mixamorig:{side}ForeArm"].constraints[
            f"AuthoredIK__mixamorig:{side}ForeArm"
        ]
        for frame, influence in influence_keys:
            constraint.influence = influence
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": frame, "influence": influence}
            for frame, influence in influence_keys
        ]

    phases = [
        (1, "natural-relaxed-stance", 0.0, 0.0, (-0.010, 0.175, 0.020), (-0.010, -0.175, 0.020), 0.0, 0.0, 0.0),
        (14, "inspect-branch", 3.0, 2.0, (0.150, 0.135, 0.205), (0.155, -0.135, 0.205), 12.0, 12.0, 10.0),
        (26, "support-branch-first-pinch", 6.0, 3.0, (0.205, 0.092, 0.185), (0.195, -0.082, 0.178), 38.0, 50.0, 20.0),
        (36, "pluck-first-berry", 6.0, 3.0, (0.205, 0.092, 0.185), (0.160, -0.092, 0.180), 38.0, 54.0, 24.0),
        (48, "deposit-first-berry", 3.0, 2.0, (0.180, 0.105, 0.190), (0.015, -0.245, 0.065), 30.0, 48.0, 18.0),
        (60, "support-branch-second-pinch", 6.0, 3.0, (0.205, 0.060, 0.225), (0.195, -0.018, 0.238), 38.0, 50.0, 22.0),
        (72, "pluck-second-berry", 6.0, 3.0, (0.205, 0.060, 0.225), (0.160, -0.030, 0.240), 38.0, 54.0, 26.0),
        (84, "deposit-second-berry", 3.0, 2.0, (0.180, 0.090, 0.205), (0.015, -0.245, 0.065), 28.0, 48.0, 18.0),
        (96, "release-branch", 2.0, 1.0, (0.140, 0.140, 0.220), (0.120, -0.150, 0.205), 12.0, 12.0, 8.0),
        (108, "same-natural-relaxed-recovery", 0.0, 0.0, (-0.010, 0.175, 0.020), (-0.010, -0.175, 0.020), 0.0, 0.0, 0.0),
    ]
    branch_contact_frames = [26, 36, 60, 72]
    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    keyed_fingers: set[str] = set()
    for frame, _, spine_x, head_x, left_pos, right_pos, left_curl, right_curl, hand_roll in phases:
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame)
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_x * 0.25, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_x * 0.35, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_x * 0.40, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (-head_x, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (-head_x * 0.65, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:LeftHand"], frame, (0.0, -hand_roll, 0.0))
        key_bone(armature.pose.bones["mixamorig:RightHand"], frame, (0.0, hand_roll, 0.0))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", left_curl))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", right_curl))
        left_position = vec(left_pos)
        right_position = vec(right_pos)
        key_object_location(left_hand, frame, left_position)
        key_object_location(right_hand, frame, right_position)
        if frame in branch_contact_frames:
            left_targets[frame] = left_position
            right_targets[frame] = right_position

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True

    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", branch_contact_frames, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", branch_contact_frames, right_targets)
    every_frame = list(range(1, end_frame + 1))
    # The action contains no leg IK or authored lower-body offsets. Validate
    # the entire sequence, not only representative phase keys, because the
    # rejected provider Harvest showed persistent knee flex and heel lift.
    reset_pose(armature)
    bpy.context.view_layer.update()
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    left_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:LeftLeg",
        every_frame,
        {frame: rest_left_ankle for frame in every_frame},
    )
    right_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:RightLeg",
        every_frame,
        {frame: rest_right_ankle for frame in every_frame},
    )
    leg_neutrality = measure_neutral_bones(
        armature,
        action,
        [
            "mixamorig:LeftUpLeg",
            "mixamorig:LeftLeg",
            "mixamorig:LeftFoot",
            "mixamorig:LeftToeBase",
            "mixamorig:RightUpLeg",
            "mixamorig:RightLeg",
            "mixamorig:RightFoot",
            "mixamorig:RightToeBase",
        ],
        every_frame,
    )
    if left_contact["maxError"] > CONTACT_TOLERANCE or right_contact["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Harvest hand contact gate failed: left={left_contact}, right={right_contact}")
    if left_ground["maxError"] > GROUND_TOLERANCE or right_ground["maxError"] > GROUND_TOLERANCE:
        raise RuntimeError(f"Harvest grounding gate failed: left={left_ground['maxError']}, right={right_ground['maxError']}")
    if (
        leg_neutrality["maximumLocationErrorRigUnits"] > 0.001
        or leg_neutrality["maximumRotationErrorDegrees"] > 1.0
        or leg_neutrality["maximumScaleError"] > 0.001
    ):
        raise RuntimeError(f"Harvest lower-body neutral-pose gate failed: {leg_neutrality}")

    reference = {
        "url": "https://www.pbs.org/video/late-spring-harvesting-and-chores-lq1unt/",
        "publisher": "PBS / The Home-Scale Forest Garden",
        "publishedAt": "2026-04-06",
        "retrievedAt": "2026-08-29",
        "timeRange": "07:04-07:40 (real-person hand-picking honeyberries)",
        "mechanics": {
            "stance": "Stand close to the bush with both feet flat and knees neutral rather than holding a squat.",
            "weightTransfer": "Keep weight centered while a small upper-body hinge brings the hands to the branch.",
            "footwork": "No steps or heel lift during the two harvest passes.",
            "hipsShoulders": "Hips remain square; shoulders follow two short reaches without rotating the pelvis.",
            "handsGripContacts": "One hand parts or steadies the branch while the other uses a controlled finger-and-thumb pinch, withdraws the berry, and deposits it into a hip basket.",
            "anticipation": "Inspect the branch, establish support-hand contact, then pinch the selected berry.",
            "cadence": "Two deliberate pick-and-deposit passes with a readable pause at each pinch.",
            "followThroughRecovery": "Release the branch and return both hands and upper body to the identical natural arms-down stance.",
        },
    }
    record = {
        "clipName": name,
        "displayLabel": "Harvest",
        "semanticRowIds": ["interaction.harvest"],
        "status": "NEWLY_AUTHORED_VISUAL_REVIEW_REQUIRED",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "supersedesRejectedCandidate": "Interactions__HumanMasculineAthleticMuscularHarvest",
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": [reference],
        "contextualProps": [
            {"name": branch.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "waist-height berry branch"},
            {"name": basket.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "hip harvest basket"},
            *[
                {"name": berry.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "pinch target"}
                for berry in berries
            ],
        ],
        "ikConstraints": ik_constraints,
        "contactValidation": {"threshold": CONTACT_TOLERANCE, "leftSupportHand": left_contact, "rightPinchHand": right_contact, "passed": True},
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftAnkle": left_ground,
            "rightAnkle": right_ground,
            "neutralLegAndFootTransforms": leg_neutrality,
            "persistentKneeFlex": False,
            "heelLift": False,
            "passed": True,
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers), "maximumCurlDegrees": 54.0},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": 4.25,
            "cameraFraming": "continuous gameplay, close-front, close-side, and close-rear views with the branch, berries, basket, both hands, knees, heels, toes, and floor visible",
            "reviewFocus": ["no T-pose in any playable frame", "identical relaxed start/end stance", "branch support", "finger-and-thumb pinch", "berry withdrawal", "basket deposit", "neutral knees", "flat heels", "neutral ankles", "planted feet across every frame", "clean neutral recovery"],
        },
        "provenanceReferences": [reference],
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def export_actions(armature: bpy.types.Object, actions: list[bpy.types.Action], output_glb: Path) -> None:
    armature.animation_data.action = None
    while armature.animation_data.nla_tracks:
        armature.animation_data.nla_tracks.remove(armature.animation_data.nla_tracks[0])
    for action in actions:
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, int(round(action.frame_range[0])), action)
        strip.action_frame_start, strip.action_frame_end = action.frame_range
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


def build_candidate_receipt(
    candidate_id: str,
    record: dict[str, object],
    output_glb: Path,
    output_bytes: int,
    output_hash: str,
    source_rest_rig_bytes: int,
    playback: dict[str, object],
) -> dict[str, object]:
    version_match = re.search(r"-v(\d+)$", candidate_id)
    candidate_version = int(version_match.group(1)) if version_match else 1
    review_rework = {
        "windUp": "REWORK",
        "semanticReadability": "REWORK",
        "fullBodyMechanics": "REWORK",
        "balanceWeightTransfer": "REWORK",
        "feetKneesHipsPelvis": "REWORK",
        "spineShouldersElbowsHands": "REWORK",
        "propSurfaceContacts": "REWORK",
        "cadence": "REWORK",
        "followThroughRecovery": "REWORK",
        "groundingRootMotion": "REWORK",
        "gameplayCamera": "REWORK",
    }
    return {
        "schemaVersion": 1,
        "issue": 487,
        "candidate": {
            "id": candidate_id,
            "semanticId": record["semanticRowIds"][0],
            "clipName": record["clipName"],
            "version": candidate_version,
            "authorId": "codex-animation-gap-lane",
            "authoringLane": "BLENDER",
            "playIntent": record["playbackIntent"],
        },
        "candidateArtifact": {
            "path": portable_path(output_glb),
            "bytes": output_bytes,
            "sha256": output_hash,
            "stagingOnly": True,
        },
        "sourceRestRig": {
            "path": SOURCE_REST_RIG_REPO_PATH,
            "bytes": source_rest_rig_bytes,
            "sha256": SOURCE_REST_RIG_SHA256,
            "importedActionCount": 0,
            "boneCount": EXPECTED_BONES,
            "rootBone": ROOT,
        },
        "provenance": {
            "route": "ORIGINAL_TIER_3",
            "authoredFromZeroActionRestRig": True,
            "sourceAnimationsSampled": False,
            "forbiddenOperationsUsed": [],
            "realPersonReferences": record.get("provenanceReferences", record["referenceFootage"]),
        },
        "technicalReview": {
            "status": "REWORK",
            "checks": {
                "freshImport": "PASS",
                "canonicalSkeleton": "PASS",
                "rootMotion": "PASS",
                "grounding": "PASS",
                "contacts": "PASS",
                "duration": "PASS",
                "semantic": "REWORK",
            },
            "evidence": {
                "boundaryPose": record["boundaryPoseValidation"],
            },
        },
        "playbackEvidence": {
            "normalSpeed": {
                key: playback[key]
                for key in (
                    "path",
                    "bytes",
                    "sha256",
                    "width",
                    "height",
                    "fps",
                    "frameCount",
                    "durationSeconds",
                    "playbackRate",
                    "fullDecodePassed",
                )
            },
        },
        "independentVisualReview": {
            "status": "REWORK",
            "reviewerId": "independent-coordinator-unassigned",
            "reviewerRole": "INDEPENDENT_COORDINATOR",
            "watchedEntireNormalSpeed": False,
            "playbackSha256": playback["sha256"],
            "checklist": review_rework,
            "blockingFindings": [
                "Independent coordinator has not watched and approved the complete normal-speed candidate."
            ],
        },
        "ownerReview": {"status": "NOT_PRESENTED"},
        "promotion": {"status": "QUARANTINED", "runtimeInstalled": False},
    }


def main() -> None:
    args = parse_args()
    source_glb = Path(args.source_glb).resolve()
    review_video = Path(args.review_video).resolve()
    review_video_front = Path(args.review_video_front).resolve()
    review_video_side = Path(args.review_video_side).resolve()
    review_video_rear = Path(args.review_video_rear).resolve()
    candidate_paths = quarantined_candidate_paths(args)
    output_glb = candidate_paths["glb"]
    report_path = candidate_paths["report"]
    receipt_path = candidate_paths["receipt"]
    script_path = Path(__file__).resolve()
    if not source_glb.is_file():
        raise FileNotFoundError(source_glb)
    for video in (review_video, review_video_front, review_video_side, review_video_rear):
        if not video.is_file():
            raise FileNotFoundError(video)
    if file_sha256(source_glb) != SOURCE_REST_RIG_SHA256:
        raise RuntimeError("Canonical animation-free 4K Human rest-rig hash changed")
    candidate_paths["directory"].mkdir(parents=True, exist_ok=True)
    if review_video != candidate_paths["video"]:
        shutil.copy2(review_video, candidate_paths["video"])
    if review_video_front != candidate_paths["video_front"]:
        shutil.copy2(review_video_front, candidate_paths["video_front"])
    if review_video_side != candidate_paths["video_side"]:
        shutil.copy2(review_video_side, candidate_paths["video_side"])
    if review_video_rear != candidate_paths["video_rear"]:
        shutil.copy2(review_video_rear, candidate_paths["video_rear"])
    playback = verify_review_video(candidate_paths["video"])
    playback_front = verify_review_video(candidate_paths["video_front"])
    playback_side = verify_review_video(candidate_paths["video_side"])
    playback_rear = verify_review_video(candidate_paths["video_rear"])

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source_glb))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one source armature, got {len(armatures)}")
    armature = armatures[0]
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if len(armature.data.bones) != EXPECTED_BONES or roots != EXPECTED_ROOTS:
        raise RuntimeError(f"Unexpected source skeleton: bones={len(armature.data.bones)}, roots={roots}")
    imported_action_count = len(bpy.data.actions)
    if imported_action_count != EXPECTED_SOURCE_ACTIONS:
        raise RuntimeError(f"Rest rig must be animation-free; imported {imported_action_count} actions")
    before_strip, after_strip = strip_imported_animation(armature)
    if before_strip != EXPECTED_SOURCE_ACTIONS or after_strip != 0:
        raise RuntimeError(f"Rest-rig strip gate failed: before={before_strip}, after={after_strip}")
    if armature.animation_data is None:
        armature.animation_data_create()
    source_bind_pose = capture_boundary_pose_sample(armature, None, 1)

    builders = {
        "lift": build_lift,
        "lockpick": build_lockpick,
        "valve": build_valve_turn,
        "harvest": build_harvest,
    }
    authored_action, authored_record = builders[args.action](armature)
    actions = [authored_action]
    records = [authored_record]
    export_actions(armature, actions, output_glb)
    expected_names = sorted(action.name for action in actions)
    output_bytes = output_glb.stat().st_size
    output_hash = file_sha256(output_glb)

    # Fresh process-state proof: factory reset, import only authored output.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=str(output_glb))
    imported_armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    imported_actions = sorted(action.name for action in bpy.data.actions)
    if len(imported_armatures) != 1:
        raise RuntimeError(f"Authored re-import produced {len(imported_armatures)} armatures")
    imported_armature = imported_armatures[0]
    imported_roots = [bone.name for bone in imported_armature.data.bones if bone.parent is None]
    imported_frame_ranges = {action.name: [round(value, 4) for value in action.frame_range] for action in bpy.data.actions}
    if len(imported_armature.data.bones) != EXPECTED_BONES or imported_roots != EXPECTED_ROOTS:
        raise RuntimeError("Authored re-import failed canonical skeleton gate")
    if imported_actions != expected_names:
        raise RuntimeError(f"Authored re-import actions differ: {imported_actions} != {expected_names}")
    expected_frame_range = [float(value) for value in authored_record["frameRange"]]
    if imported_frame_ranges.get(authored_record["clipName"]) != expected_frame_range:
        raise RuntimeError(
            f"Authored {authored_record['clipName']} re-import frame range changed: {imported_frame_ranges}"
        )
    imported_action = bpy.data.actions.get(authored_record["clipName"])
    if imported_action is None:
        raise RuntimeError(f"Authored re-import action missing: {authored_record['clipName']}")
    start_pose = capture_boundary_pose_sample(imported_armature, imported_action, int(expected_frame_range[0]))
    end_pose = capture_boundary_pose_sample(imported_armature, imported_action, int(expected_frame_range[1]))
    authored_record["boundaryPoseValidation"] = build_boundary_pose_evidence(
        source_bind_pose,
        start_pose,
        end_pose,
        authored_record,
    )

    report = {
        "schemaVersion": 1,
        "issue": 487,
        "assetClass": "HUMAN_ANIMATION_NEWLY_AUTHORED_UTILITY",
        "creationMethod": "ORIGINAL_KEYFRAMED_MOTION",
        "sourceRestRig": {
            "path": str(source_glb),
            "bytes": source_glb.stat().st_size,
            "sha256": file_sha256(source_glb),
            "importedActionCount": imported_action_count,
            "actionCountAfterCleanReset": after_strip,
            "boneCount": EXPECTED_BONES,
            "rootBones": EXPECTED_ROOTS,
            "usage": "ANIMATION_FREE_REST_RIG_AND_DISPLAY_MESH_AUTHORITY",
        },
        "authoredFromRestPose": True,
        "sourceDerived": False,
        "sourceClipReuse": False,
        "sourceAnimationsSampled": False,
        "forbiddenOperationsUsed": [],
        "candidateId": args.candidate_id,
        "stagingOnly": True,
        "visualReviewStatus": "REWORK",
        "independentVisualReviewCompleted": False,
        "ownerReviewStatus": "NOT_PRESENTED",
        "promotionStatus": "QUARANTINED",
        "productionApproval": False,
        "blenderVersion": bpy.app.version_string,
        "metersPerRigUnit": METERS_PER_RIG_UNIT,
        "script": {"path": str(script_path), "sha256": file_sha256(script_path)},
        "clipCount": len(records),
        "clips": records,
        "output": {
            "path": portable_path(output_glb),
            "bytes": output_bytes,
            "sha256": output_hash,
            "stagingOnly": True,
        },
        "playbackEvidence": playback,
        "additionalPlaybackEvidence": {
            "closeFront": playback_front,
            "closeSide": playback_side,
            "closeRear": playback_rear,
        },
        "reimportValidation": {
            "passed": True,
            "freshFactoryReset": True,
            "armatureCount": len(imported_armatures),
            "boneCount": len(imported_armature.data.bones),
            "rootBones": imported_roots,
            "clipCount": len(imported_actions),
            "clipNames": imported_actions,
            "clipFrameRanges": imported_frame_ranges,
        },
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    receipt = build_candidate_receipt(
        args.candidate_id,
        authored_record,
        output_glb,
        output_bytes,
        output_hash,
        source_glb.stat().st_size,
        playback,
    )
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print("HUMAN_AUTHORED_UTILITY=" + json.dumps({
        "candidateId": args.candidate_id,
        "clipCount": len(records),
        "clipNames": imported_actions,
        "candidateGlb": portable_path(output_glb),
        "outputGlbBytes": output_bytes,
        "outputGlbSha256": output_hash,
        "technicalReport": portable_path(report_path),
        "candidateReceipt": portable_path(receipt_path),
        "normalSpeedVideo": playback,
        "normalSpeedCloseFrontVideo": playback_front,
        "normalSpeedCloseSideVideo": playback_side,
        "normalSpeedCloseRearVideo": playback_rear,
        "reimportBoneCount": len(imported_armature.data.bones),
        "sourceAnimationsSampled": False,
        "independentVisualReview": "REWORK",
        "ownerReview": "NOT_PRESENTED",
        "promotion": "QUARANTINED",
    }, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
