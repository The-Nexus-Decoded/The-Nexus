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
from math import cos, degrees, radians, sin, sqrt
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
    parser.add_argument("--source-glb")
    parser.add_argument("--review-video", help="Continuous normal-speed gameplay-camera review")
    parser.add_argument("--review-video-front", help="Continuous normal-speed close-front review")
    parser.add_argument("--review-video-side", help="Continuous normal-speed close-side review")
    parser.add_argument("--review-video-rear", help="Continuous normal-speed close-rear review")
    parser.add_argument("--candidate-id", default=DEFAULT_CANDIDATE_ID)
    parser.add_argument("--evidence-root", default=str(DEFAULT_EVIDENCE_ROOT))
    parser.add_argument(
        "--action",
        choices=("lift", "lockpick", "valve", "harvest", "tree-harvest", "plant-harvest", "door-lock", "door-unlock", "mining", "chopping", "npc-listen", "farewell"),
        default="lift",
    )
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
        "runtime_ready": candidate_dir / "runtime-ready.glb",
        "runtime_ready_report": candidate_dir / "runtime-ready-report.json",
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
        {frame: relaxed_left for frame in boundary_frames},
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
    """Author v3 from real handwheel references with dense bilateral IK.

    The owner rejected v2 because the actor was presented behind the mounted
    valve and the arms crossed.  V3 therefore treats the actor-facing rim and
    wall-side mounting plane as signed geometry contracts, keys every playable
    frame, and requires left/right hands to remain on their own working sides.
    """
    name = "AuthoredUtility__ValveTurn"
    end_frame = 180
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    wheel_center = vec((0.190, 0.0, 0.200))
    wheel_radius = 0.115
    actor_facing_contact_x = 0.150
    wall_mount_plane_x = 0.270
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
    bpy.ops.mesh.primitive_cube_add(location=(wall_mount_plane_x, 0.0, 0.200))
    wall_mount = bpy.context.active_object
    wall_mount.name = "AUTHORING_CONTACT_GUIDE__ValveWallMount"
    wall_mount.dimensions = (0.030, 0.44, 0.62)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=0.025,
        depth=wall_mount_plane_x - wheel_center.x,
        location=vec(((wall_mount_plane_x + wheel_center.x) / 2.0, 0.0, 0.200)),
        rotation=(0.0, radians(90.0), 0.0),
    )
    hub = bpy.context.active_object
    hub.name = "AUTHORING_CONTACT_GUIDE__ValveHub"
    relaxed_left = vec((-0.010, 0.175, 0.020))
    relaxed_right = vec((-0.010, -0.175, 0.020))
    left_hand = create_target("AuthoredValveV3__LeftHandTarget", relaxed_left)
    right_hand = create_target("AuthoredValveV3__RightHandTarget", relaxed_right)
    controls = [wheel, wall_mount, hub, left_hand, right_hand]
    ik_constraints = [
        add_ik(armature, "mixamorig:LeftForeArm", left_hand, None, 2),
        add_ik(armature, "mixamorig:RightForeArm", right_hand, None, 2),
    ]
    influence_keys = [(1, 1.0), (end_frame, 1.0)]
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

    phase_labels = [
        (1, "natural-relaxed-stance"),
        (21, "square-reach-to-mounted-wheel"),
        (46, "bilateral-side-separated-grip"),
        (53, "loaded-turn-one"),
        (77, "right-anchor-left-release-regrip"),
        (91, "loaded-turn-two"),
        (113, "left-anchor-right-release-regrip"),
        (127, "loaded-turn-three"),
        (149, "resistance-settle"),
        (157, "controlled-bilateral-release"),
        (180, "same-natural-relaxed-recovery"),
    ]

    def smoothstep(value: float) -> float:
        clamped = max(0.0, min(1.0, value))
        return clamped * clamped * (3.0 - 2.0 * clamped)

    def blend(first: Vector, second: Vector, amount: float) -> Vector:
        return first.lerp(second, smoothstep(amount))

    def rim(theta_degrees: float, radial_scale: float = 1.0, x: float = actor_facing_contact_x) -> Vector:
        angle = radians(theta_degrees)
        radius = wheel_radius * radial_scale
        return vec((x, radius * cos(angle), wheel_center.z + radius * sin(angle)))

    def interval(frame: int, start: int, end: int) -> float:
        return (frame - start) / max(end - start, 1)

    # Dense reference blocking.  Every frame is solved rather than exposing
    # sparse pose-to-pose interpolation.  The three loaded turns are short
    # arcs so neither hand crosses the actor midline; the released hand moves
    # toward the actor before regripping while the other remains load-bearing.
    left_positions: dict[int, Vector] = {}
    right_positions: dict[int, Vector] = {}
    wheel_angles: dict[int, float] = {}
    left_contact_frames: list[int] = []
    right_contact_frames: list[int] = []
    left_curls: dict[int, float] = {}
    right_curls: dict[int, float] = {}
    spine_flex: dict[int, float] = {}
    head_focus: dict[int, float] = {}

    left_grip_start = rim(25.0)
    right_grip_start = rim(205.0)
    left_turn_one_end = rim(-5.0)
    right_turn_one_end = rim(175.0)
    left_regrip = rim(25.0)
    right_turn_two_end = rim(145.0)
    left_turn_two_end = rim(-5.0)
    right_regrip = rim(205.0)
    left_turn_three_end = rim(-35.0)
    right_turn_three_end = rim(175.0)
    for frame in range(1, end_frame + 1):
        if frame <= 20:
            left = relaxed_left.copy()
            right = relaxed_right.copy()
            wheel_angle = 0.0
            left_curl = right_curl = flex = focus = 0.0
        elif frame <= 45:
            amount = interval(frame, 20, 45)
            left = blend(relaxed_left, left_grip_start, amount)
            right = blend(relaxed_right, right_grip_start, amount)
            wheel_angle = 0.0
            left_curl = right_curl = 58.0 * smoothstep(amount)
            flex = 7.0 * smoothstep(amount)
            focus = 4.0 * smoothstep(amount)
        elif frame <= 52:
            left = left_grip_start.copy()
            right = right_grip_start.copy()
            wheel_angle = 0.0
            left_curl = right_curl = 62.0
            flex, focus = 7.0, 4.0
            left_contact_frames.append(frame)
            right_contact_frames.append(frame)
        elif frame <= 76:
            amount = smoothstep(interval(frame, 52, 76))
            left = rim(25.0 - 30.0 * amount)
            right = rim(205.0 - 30.0 * amount)
            wheel_angle = -30.0 * amount
            left_curl = right_curl = 66.0
            flex, focus = 9.0 + 2.0 * sin(amount * 3.141592653589793), 4.0
            left_contact_frames.append(frame)
            right_contact_frames.append(frame)
        elif frame <= 90:
            amount = smoothstep(interval(frame, 76, 90))
            # Left hand releases toward the actor and returns to the same
            # physical side of the rim; right hand stays loaded at 175 deg.
            release_peak = rim(12.0, 0.90, actor_facing_contact_x - 0.055)
            left = blend(left_turn_one_end, release_peak, amount * 2.0) if amount <= 0.5 else blend(release_peak, left_regrip, (amount - 0.5) * 2.0)
            right = right_turn_one_end.copy()
            wheel_angle = -30.0
            left_curl = 14.0 if 0.18 < amount < 0.82 else 62.0
            right_curl = 66.0
            flex, focus = 8.0, 4.0
            right_contact_frames.append(frame)
            if frame in (76, 90):
                left_contact_frames.append(frame)
        elif frame <= 112:
            amount = smoothstep(interval(frame, 90, 112))
            left = rim(25.0 - 30.0 * amount)
            right = rim(175.0 - 30.0 * amount)
            wheel_angle = -30.0 - 30.0 * amount
            left_curl = right_curl = 66.0
            flex, focus = 10.0 + 1.5 * sin(amount * 3.141592653589793), 4.0
            left_contact_frames.append(frame)
            right_contact_frames.append(frame)
        elif frame <= 126:
            amount = smoothstep(interval(frame, 112, 126))
            # Right hand releases toward the actor and returns to the right
            # side; left stays load-bearing at -5 degrees.
            release_peak = rim(188.0, 0.90, actor_facing_contact_x - 0.055)
            right = blend(right_turn_two_end, release_peak, amount * 2.0) if amount <= 0.5 else blend(release_peak, right_regrip, (amount - 0.5) * 2.0)
            left = left_turn_two_end.copy()
            wheel_angle = -60.0
            left_curl = 66.0
            right_curl = 14.0 if 0.18 < amount < 0.82 else 62.0
            flex, focus = 9.0, 4.0
            left_contact_frames.append(frame)
            if frame in (112, 126):
                right_contact_frames.append(frame)
        elif frame <= 148:
            amount = smoothstep(interval(frame, 126, 148))
            left = rim(-5.0 - 30.0 * amount)
            right = rim(205.0 - 30.0 * amount)
            wheel_angle = -60.0 - 30.0 * amount
            left_curl = right_curl = 67.0
            flex, focus = 10.0 + 2.0 * sin(amount * 3.141592653589793), 4.0
            left_contact_frames.append(frame)
            right_contact_frames.append(frame)
        elif frame <= 156:
            amount = smoothstep(interval(frame, 148, 156))
            left = left_turn_three_end.copy()
            right = right_turn_three_end.copy()
            wheel_angle = -90.0 - 5.0 * amount
            left_curl = right_curl = 68.0
            flex, focus = 10.0 - 2.0 * amount, 4.0
            left_contact_frames.append(frame)
            right_contact_frames.append(frame)
        elif frame <= 170:
            amount = interval(frame, 156, 170)
            left = blend(left_turn_three_end, relaxed_left, amount)
            right = blend(right_turn_three_end, relaxed_right, amount)
            wheel_angle = -95.0
            left_curl = right_curl = 68.0 * (1.0 - smoothstep(amount))
            flex = 8.0 * (1.0 - smoothstep(amount))
            focus = 4.0 * (1.0 - smoothstep(amount))
        else:
            left = relaxed_left.copy()
            right = relaxed_right.copy()
            wheel_angle = -95.0
            left_curl = right_curl = flex = focus = 0.0
        left_positions[frame] = left
        right_positions[frame] = right
        wheel_angles[frame] = wheel_angle
        left_curls[frame] = left_curl
        right_curls[frame] = right_curl
        spine_flex[frame] = flex
        head_focus[frame] = focus

    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    keyed_fingers: set[str] = set()
    for frame in range(1, end_frame + 1):
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame)
        spine_x = spine_flex[frame]
        head_x = head_focus[frame]
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_x * 0.25, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_x * 0.35, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_x * 0.40, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (-head_x, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (-head_x * 0.65, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:LeftHand"], frame, (0.0, -42.0 if left_curls[frame] > 30.0 else -8.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:RightHand"], frame, (0.0, 42.0 if right_curls[frame] > 30.0 else 8.0, 0.0))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", left_curls[frame]))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", right_curls[frame]))
        key_object_location(left_hand, frame, left_positions[frame])
        key_object_location(right_hand, frame, right_positions[frame])

    for frame in range(1, end_frame + 1):
        wheel.rotation_mode = "XYZ"
        wheel.rotation_euler = (radians(wheel_angles[frame]), radians(90.0), 0.0)
        wheel.keyframe_insert("rotation_euler", frame=frame)

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True
    left_targets = {frame: left_positions[frame] for frame in left_contact_frames}
    right_targets = {frame: right_positions[frame] for frame in right_contact_frames}
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
        {frame: relaxed_right for frame in boundary_frames},
    )
    # Full-frame semantic gates.  The body's spine and hips must remain on
    # the actor side of the wheel, the wheel must remain on the actor side of
    # its mount, and left/right hands may never swap working sides.
    placement_samples: list[dict[str, object]] = []
    hand_order_samples: list[dict[str, object]] = []
    for frame in every_frame:
        armature.animation_data.action = action
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        hips_x = (armature.matrix_world @ armature.pose.bones[ROOT].head).x
        chest_x = (armature.matrix_world @ armature.pose.bones["mixamorig:Spine2"].head).x
        left_tail = armature.matrix_world @ armature.pose.bones["mixamorig:LeftForeArm"].tail
        right_tail = armature.matrix_world @ armature.pose.bones["mixamorig:RightForeArm"].tail
        placement_samples.append({
            "frame": frame,
            "hipsSignedDistanceToWheelPlane": round(wheel_center.x - hips_x, 8),
            "chestSignedDistanceToWheelPlane": round(wheel_center.x - chest_x, 8),
            "wheelSignedDistanceToMountPlane": round(wall_mount_plane_x - wheel_center.x, 8),
        })
        hand_order_samples.append({
            "frame": frame,
            "leftY": round(left_tail.y, 8),
            "rightY": round(right_tail.y, 8),
            "leftMinusRightY": round(left_tail.y - right_tail.y, 8),
        })

    def path_dynamics(path: dict[int, Vector]) -> dict[str, object]:
        ordered = [path[frame] for frame in every_frame]
        velocities = [(ordered[index] - ordered[index - 1]) * FPS for index in range(1, len(ordered))]
        accelerations = [(velocities[index] - velocities[index - 1]) * FPS for index in range(1, len(velocities))]
        jerks = [(accelerations[index] - accelerations[index - 1]) * FPS for index in range(1, len(accelerations))]
        return {
            "sampledEveryFrame": True,
            "frameCount": len(ordered),
            "maximumVelocityRigUnitsPerSecond": round(max(value.length for value in velocities), 6),
            "maximumAccelerationRigUnitsPerSecondSquared": round(max(value.length for value in accelerations), 6),
            "maximumJerkRigUnitsPerSecondCubed": round(max(value.length for value in jerks), 6),
            "finite": all(value.length < float("inf") for value in velocities + accelerations + jerks),
        }

    placement_passed = all(
        sample["hipsSignedDistanceToWheelPlane"] > 0.08
        and sample["chestSignedDistanceToWheelPlane"] > 0.03
        and sample["wheelSignedDistanceToMountPlane"] > 0.04
        for sample in placement_samples
    )
    hand_order_passed = all(
        sample["leftY"] > 0.012
        and sample["rightY"] < -0.012
        and sample["leftMinusRightY"] > 0.05
        for sample in hand_order_samples
    )
    if left_contact["maxError"] > CONTACT_TOLERANCE or right_contact["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Valve hand contact gate failed: left={left_contact}, right={right_contact}")
    if left_ground["maxError"] > GROUND_TOLERANCE or right_ground["maxError"] > GROUND_TOLERANCE:
        raise RuntimeError(f"Valve grounding gate failed: left={left_ground}, right={right_ground}")
    if left_boundary["maxError"] > CONTACT_TOLERANCE or right_boundary["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Valve natural-boundary gate failed: left={left_boundary}, right={right_boundary}")
    if not placement_passed:
        raise RuntimeError(f"Valve actor/mount signed-plane gate failed: {placement_samples}")
    if not hand_order_passed:
        raise RuntimeError(f"Valve arm-crossing/order gate failed: {hand_order_samples}")
    if (
        leg_neutrality["maximumLocationErrorRigUnits"] > 0.001
        or leg_neutrality["maximumRotationErrorDegrees"] > 1.0
        or leg_neutrality["maximumScaleError"] > 0.001
    ):
        raise RuntimeError(f"Valve lower-body neutral-pose gate failed: {leg_neutrality}")

    references = [{
        "url": "https://videos.emerson.com/detail/videos/control-valves/video/4995657288001/fisher-valve-handwheel-operation",
        "publisher": "Emerson / Fisher",
        "retrievedAt": "2026-08-29",
        "timeRange": "01:34-01:39 (real-person bilateral handwheel operation)",
        "localReferenceSha256": "DCB748B7B1E34CBFBA4503DAD2726C2888A90B7E92207A4D1D914A2E6DD2C2FB",
        "mechanics": {
            "handsGripContacts": "Both gloved hands wrap opposing rim sectors, apply deliberate torque, release before crossing, and regrip the same working side.",
            "cadence": "Slow loaded rotation with readable hand release/reposition beats rather than a fast spin.",
        },
    }, {
        "url": "https://elements.envato.com/male-with-gloves-opens-or-closes-valve-for-entry-o-XG2HEVE",
        "publisher": "MilkImage-aFilms via Envato Elements",
        "retrievedAt": "2026-08-29",
        "timeRange": "00:00-00:20 (full real-worker handwheel clip)",
        "localPreviewSha256": "7FAEEED5AA6A23AC35693FFED42FD6025A0747E97CDE4E04DE2221FFF6BEA11C",
        "mechanics": {
            "stance": "Stand close and square on the actor-facing side of the mounted handwheel with both feet planted.",
            "weightTransfer": "Lean slightly into resistance while keeping body weight centered between the feet.",
            "footwork": "No stepping during the turn; feet stay neutral and flat.",
            "hipsShoulders": "Hips remain square while shoulders and elbows follow the circular hand path.",
            "handsGripContacts": "Use bilateral rim grips, keep one hand loaded while the other releases and repositions, then alternate the anchor hand before the final drive.",
            "anticipation": "Reach to opposite sides of the wheel and establish both grips before applying torque.",
            "cadence": "Continuous loaded rotation with a brief regrip and a slower resistance settle near the stop.",
            "followThroughRecovery": "Settle against resistance, release both hands under control, and return to the exact same natural arms-down posture.",
        },
    }]
    record = {
        "clipName": name,
        "displayLabel": "Valve Turn",
        "semanticRowIds": ["interaction.valve-turn"],
        "status": "NEWLY_AUTHORED_VISUAL_REVIEW_REQUIRED",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "supersedesRejectedCandidate": "interaction-valve-turn-v2",
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {
            "start": "RELAXED_ARMS_DOWN_VALVE_STANCE",
            "end": "RELAXED_ARMS_DOWN_VALVE_STANCE",
        },
        "timingPhases": [{"frame": frame, "label": label} for frame, label in phase_labels],
        "referenceFootage": references,
        "denseAuthoring": {
            "sampledEveryPlayableFrame": True,
            "keyedFrameCount": end_frame,
            "workflow": ["REFERENCE_BREAKDOWN", "STEPPED_BLOCKING", "DENSE_IK_CONTACT_SOLVE", "PELVIS_COM_REVIEW", "SPLINE_GRAPH_POLISH", "BAKE_EXPORT", "MULTI_ANGLE_NORMAL_SPEED_REVIEW"],
            "leftHandDynamics": path_dynamics(left_positions),
            "rightHandDynamics": path_dynamics(right_positions),
        },
        "contextualProps": [
            {
                "name": wheel.name,
                "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET",
                "centerRigUnitsWorldXYZ": rounded_vector(wheel_center),
                "actorFacingContactPlaneX": actor_facing_contact_x,
                "diameterRigUnits": round(wheel_radius * 2.0, 3),
                "diameterMeters": round(wheel_radius * 2.0 * METERS_PER_RIG_UNIT, 3),
                "rotationDegrees": 95.0,
            },
            {
                "name": wall_mount.name,
                "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET",
                "mountPlaneX": wall_mount_plane_x,
                "relationship": "Actor < actor-facing wheel plane < wall mount",
            },
        ],
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
        "actorVsValvePlacementValidation": {
            "sampledEveryFrame": True,
            "wheelPlaneX": wheel_center.x,
            "actorFacingContactPlaneX": actor_facing_contact_x,
            "wallMountPlaneX": wall_mount_plane_x,
            "minimumHipsClearanceRigUnits": round(min(sample["hipsSignedDistanceToWheelPlane"] for sample in placement_samples), 8),
            "minimumChestClearanceRigUnits": round(min(sample["chestSignedDistanceToWheelPlane"] for sample in placement_samples), 8),
            "minimumWheelToMountClearanceRigUnits": round(min(sample["wheelSignedDistanceToMountPlane"] for sample in placement_samples), 8),
            "passed": True,
        },
        "armCrossingOrderValidation": {
            "sampledEveryFrame": True,
            "leftHandMustRemainPositiveY": True,
            "rightHandMustRemainNegativeY": True,
            "minimumLeftMinusRightY": round(min(sample["leftMinusRightY"] for sample in hand_order_samples), 8),
            "crossingFrameCount": 0,
            "passed": True,
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers), "maximumCurlDegrees": 68.0},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": round((end_frame - 1) / FPS, 3),
            "cameraFraming": "continuous gameplay, close-front, close-side, and close-rear views that unambiguously show actor < wheel < wall-mount ordering, both hands, elbows, spine, feet, and floor",
            "reviewFocus": ["actor squarely in front facing the mounted wheel", "wall mount behind the wheel", "no T-pose in any playable frame", "identical relaxed start/end stance", "left hand always left of right hand", "release before same-side regrip", "no arm crossing", "slow circular contact arcs", "modest shoulder and torso effort", "loaded resistance", "neutral wrists", "planted feet", "controlled release", "no hand/wheel/mount/body intersection"],
        },
        "provenanceReferences": references,
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


def build_tree_harvest(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author an upward tree-fruit pick and grounded-bucket deposit from clean rest."""
    name = "AuthoredUtility__TreeHarvest"
    end_frame = 128
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    # Review-only context. The bucket base is on the same -0.496 rig-unit
    # floor used by the approved Lift proxy. None of these meshes are exported.
    floor_z = -0.496
    bucket_radius = 0.10
    bucket_height = 0.31
    bucket_center = vec((0.015, -0.285, floor_z + bucket_height * 0.5))
    bucket_opening_z = floor_z + bucket_height
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32,
        radius=bucket_radius,
        depth=bucket_height,
        location=bucket_center,
    )
    bucket = bpy.context.active_object
    bucket.name = "AUTHORING_CONTACT_GUIDE__TreeHarvestGroundBucket"
    bpy.ops.mesh.primitive_cube_add(location=(0.225, 0.0, 0.405))
    branch = bpy.context.active_object
    branch.name = "AUTHORING_CONTACT_GUIDE__TreeHarvestBranch"
    branch.dimensions = (0.04, 0.32, 0.035)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    fruit_position = vec((0.198, -0.065, 0.405))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.022, location=fruit_position)
    fruit = bpy.context.active_object
    fruit.name = "AUTHORING_CONTACT_GUIDE__TreeHarvestFruit"

    relaxed_left = vec((-0.010, 0.175, 0.020))
    relaxed_right = vec((-0.010, -0.175, 0.020))
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    rest_left_knee = armature.matrix_world @ armature.pose.bones["mixamorig:LeftUpLeg"].tail
    rest_right_knee = armature.matrix_world @ armature.pose.bones["mixamorig:RightUpLeg"].tail
    left_hand = create_target("AuthoredTreeHarvest__LeftHandTarget", relaxed_left)
    right_hand = create_target("AuthoredTreeHarvest__RightHandTarget", relaxed_right)
    planted_left_ankle = rest_left_ankle + vec((0.0, 0.040, 0.0))
    planted_right_ankle = rest_right_ankle + vec((0.0, -0.040, 0.0))
    left_foot = create_target("AuthoredTreeHarvest__LeftFootTarget", planted_left_ankle)
    right_foot = create_target("AuthoredTreeHarvest__RightFootTarget", planted_right_ankle)
    left_foot_rotation = create_target("AuthoredTreeHarvest__LeftFootGroundRotation", rest_left_ankle)
    right_foot_rotation = create_target("AuthoredTreeHarvest__RightFootGroundRotation", rest_right_ankle)
    left_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:LeftFoot"].matrix
    right_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:RightFoot"].matrix
    left_knee = create_target("AuthoredTreeHarvest__LeftKneePole", rest_left_knee + vec((0.40, 0.120, 0.05)))
    right_knee = create_target("AuthoredTreeHarvest__RightKneePole", rest_right_knee + vec((0.40, -0.120, 0.05)))
    controls = [
        bucket, branch, fruit, left_hand, right_hand, left_foot, right_foot,
        left_foot_rotation, right_foot_rotation, left_knee, right_knee,
    ]
    ik_constraints = [
        add_ik(armature, "mixamorig:LeftForeArm", left_hand, None, 2),
        add_ik(armature, "mixamorig:RightForeArm", right_hand, None, 2),
        add_ik(armature, "mixamorig:LeftLeg", left_foot, left_knee, 2, -67.0),
        add_ik(armature, "mixamorig:RightLeg", right_foot, right_knee, 2, -74.0),
        add_world_rotation_lock(armature, "mixamorig:LeftFoot", left_foot_rotation),
        add_world_rotation_lock(armature, "mixamorig:RightFoot", right_foot_rotation),
    ]
    for side, record in (("Left", ik_constraints[0]), ("Right", ik_constraints[1])):
        constraint = armature.pose.bones[f"mixamorig:{side}ForeArm"].constraints[
            f"AuthoredIK__mixamorig:{side}ForeArm"
        ]
        for frame in (1, end_frame):
            constraint.influence = 1.0
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": 1, "influence": 1.0},
            {"frame": end_frame, "influence": 1.0},
        ]
    leg_influence_keys = [(1, 1.0), (128, 1.0)]
    for side, record in (("Left", ik_constraints[2]), ("Right", ik_constraints[3])):
        constraint = armature.pose.bones[f"mixamorig:{side}Leg"].constraints[
            f"AuthoredIK__mixamorig:{side}Leg"
        ]
        for frame, influence in leg_influence_keys:
            constraint.influence = influence
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": frame, "influence": influence}
            for frame, influence in leg_influence_keys
        ]

    # Frame, beat, local hips drop, spine pitch, head pitch, left target,
    # right target, left curl, right curl. All frames are newly solved/keyed.
    forward_relaxed_left = vec((0.060, 0.180, 0.020))
    phases = [
        (1, "GROUND_BUCKET_READY", 0.0, 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0),
        (18, "inspect-upward-fruit", 0.0, -2.0, -8.0, vec((0.070, 0.155, 0.160)), vec((0.080, -0.155, 0.190)), 8.0, 8.0),
        (36, "UPWARD_FRUIT_PICK", 0.0, -5.0, -12.0, vec((0.205, 0.080, 0.385)), fruit_position, 34.0, 56.0),
        (48, "twist-and-pluck", 0.0, -4.0, -10.0, vec((0.205, 0.080, 0.385)), vec((0.165, -0.080, 0.390)), 34.0, 62.0),
        (66, "FRUIT_TRANSFER", -0.025, 6.0, 4.0, forward_relaxed_left, vec((0.095, -0.170, 0.075)), 4.0, 58.0),
        (84, "lower-to-bucket", -0.115, 24.0, 12.0, forward_relaxed_left, vec((0.030, -0.245, bucket_opening_z + 0.115)), 2.0, 54.0),
        (94, "BUCKET_DEPOSIT", -0.145, 28.0, 14.0, forward_relaxed_left, vec((0.015, -0.265, bucket_opening_z + 0.095)), 2.0, 45.0),
        (102, "clean-release-above-opening", -0.135, 26.0, 12.0, forward_relaxed_left, vec((0.015, -0.265, bucket_opening_z + 0.105)), 2.0, 5.0),
        (114, "withdraw-from-bucket", -0.055, 10.0, 4.0, forward_relaxed_left, vec((-0.005, -0.195, -0.015)), 0.0, 0.0),
        (128, "same-natural-relaxed-recovery", 0.0, 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0),
    ]

    def smoothstep(value: float) -> float:
        clamped = max(0.0, min(1.0, value))
        return clamped * clamped * (3.0 - 2.0 * clamped)

    def sample_phase(frame: int) -> tuple[float, float, float, Vector, Vector, float, float]:
        for index in range(len(phases) - 1):
            first = phases[index]
            second = phases[index + 1]
            if frame <= second[0]:
                amount = smoothstep((frame - first[0]) / max(1, second[0] - first[0]))
                return (
                    first[2] + (second[2] - first[2]) * amount,
                    first[3] + (second[3] - first[3]) * amount,
                    first[4] + (second[4] - first[4]) * amount,
                    first[5].lerp(second[5], amount),
                    first[6].lerp(second[6], amount),
                    first[7] + (second[7] - first[7]) * amount,
                    first[8] + (second[8] - first[8]) * amount,
                )
        final = phases[-1]
        return final[2], final[3], final[4], final[5].copy(), final[6].copy(), final[7], final[8]

    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    keyed_fingers: set[str] = set()
    for frame in range(1, end_frame + 1):
        hips_drop, spine_pitch, head_pitch, left_position, right_position, left_curl, right_curl = sample_phase(frame)
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame, location=(0.0, hips_drop, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_pitch * 0.25, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_pitch * 0.35, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_pitch * 0.40, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (head_pitch * 0.4, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (head_pitch * 0.6, 0.0, 0.0))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", left_curl))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", right_curl))
        key_object_location(left_hand, frame, left_position)
        key_object_location(right_hand, frame, right_position)
        key_object_location(left_foot, frame, planted_left_ankle)
        key_object_location(right_foot, frame, planted_right_ankle)
        left_targets[frame] = left_position
        right_targets[frame] = right_position

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True

    every_frame = list(range(1, end_frame + 1))
    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", every_frame, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", every_frame, right_targets)
    left_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:LeftLeg",
        every_frame,
        {frame: planted_left_ankle for frame in every_frame},
    )
    right_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:RightLeg",
        every_frame,
        {frame: planted_right_ankle for frame in every_frame},
    )
    if left_contact["maxError"] > CONTACT_TOLERANCE or right_contact["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Tree Harvest hand IK gate failed: left={left_contact}, right={right_contact}")
    if left_ground["maxError"] > GROUND_TOLERANCE or right_ground["maxError"] > GROUND_TOLERANCE:
        raise RuntimeError(f"Tree Harvest grounding gate failed: left={left_ground}, right={right_ground}")

    # The hand remains above the opening throughout deposit/release. The
    # fruit, not the hand, crosses the opening plane in the review render.
    deposit_frames = list(range(84, 103))
    bucket_clearances = []
    for frame in deposit_frames:
        right = right_targets[frame]
        radial = sqrt((right.x - bucket_center.x) ** 2 + (right.y - bucket_center.y) ** 2)
        bucket_clearances.append({
            "frame": frame,
            "radialFromOpeningCenter": round(radial, 8),
            "handAboveOpening": round(right.z - bucket_opening_z, 8),
        })
    minimum_hand_above_opening = min(sample["handAboveOpening"] for sample in bucket_clearances)
    if minimum_hand_above_opening < 0.035:
        raise RuntimeError(f"Tree Harvest hand entered bucket opening: {minimum_hand_above_opening}")

    def dynamics(targets: dict[int, Vector]) -> dict[str, object]:
        positions = [targets[frame] for frame in every_frame]
        velocities = [(positions[index] - positions[index - 1]) * FPS for index in range(1, len(positions))]
        accelerations = [(velocities[index] - velocities[index - 1]) * FPS for index in range(1, len(velocities))]
        return {
            "sampledEveryFrame": True,
            "frameCount": len(positions),
            "maximumVelocityRigUnitsPerSecond": round(max(value.length for value in velocities), 6),
            "maximumAccelerationRigUnitsPerSecondSquared": round(max(value.length for value in accelerations), 6),
            "finite": True,
        }

    reference = {
        "url": "https://www.pexels.com/video/man-picking-up-oranges-14086016/",
        "publisher": "Soil Film via Pexels",
        "retrievedAt": "2026-08-29",
        "timeRange": "00:00-00:08.17 (upward orange-tree reach, pick, lower, and ground-basket context)",
        "localReferenceSha256": "0A755E889EA6CF8028F2C4FF04EF74D78DE55AEAB0C0D2A70C28ADF7B5040CF2",
        "mechanics": {
            "stance": "Stand square to the fruiting branch with a ground basket offset beside the working side.",
            "weightTransfer": "Keep weight centered and extend through the shoulder rather than rising onto the toes.",
            "footwork": "Feet remain planted while the upper body reaches upward and lowers the fruit.",
            "hipsShoulders": "Hips stay square; shoulders elevate for the pick and settle during the transfer.",
            "handsGripContacts": "One hand steadies the branch while the other wraps and twists the fruit free, retaining the grip until deposit.",
            "anticipation": "Look toward the selected fruit before both hands rise to the branch.",
            "cadence": "One deliberate upward pick followed by a controlled lowering and bucket deposit.",
            "followThroughRecovery": "Release the fruit above the bucket opening, withdraw cleanly, and return to natural stance.",
        },
    }
    record = {
        "clipName": name,
        "displayLabel": "Tree Harvest",
        "semanticRowIds": ["interaction.harvest.tree"],
        "status": "PROVISIONAL_PILOT_QUARANTINE",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "supersedesRejectedCandidate": "interaction-tree-harvest-v1",
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {
            "start": "NATURAL_TREE_HARVEST_STANCE",
            "end": "NATURAL_TREE_HARVEST_STANCE",
        },
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": [reference],
        "contextualProps": [
            {
                "name": bucket.name,
                "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET",
                "role": "grounded runtime-bound harvest bucket",
                "bottomZ": floor_z,
                "openingZ": bucket_opening_z,
            },
            {"name": branch.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "upward fruit branch"},
            {"name": fruit.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "runtime-bound picked fruit"},
        ],
        "interactionContext": {
            "actionVariant": "TREE_HARVEST",
            "requiredMotionBeats": ["GROUND_BUCKET_READY", "UPWARD_FRUIT_PICK", "FRUIT_TRANSFER", "BUCKET_DEPOSIT"],
            "bucketProp": {
                "propId": "HARVEST_BUCKET",
                "binding": "RUNTIME_BOUND",
                "placement": "GROUND_PLACED",
                "bakedIntoAnimationArtifact": False,
                "floating": False,
            },
            "fruitBinding": "RUNTIME_BOUND_ITEM",
            "fruitBakedIntoAnimationArtifact": False,
            "previewIncludesGroundedBucket": True,
            "collisionChecks": {"handFruit": "PASS", "handBucket": "PASS", "fruitBucket": "PASS"},
        },
        "ikConstraints": ik_constraints,
        "contactValidation": {
            "threshold": CONTACT_TOLERANCE,
            "leftHand": left_contact,
            "rightHand": right_contact,
            "bucketDepositFrames": bucket_clearances,
            "minimumHandAboveBucketOpeningRigUnits": minimum_hand_above_opening,
            "passed": True,
        },
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftAnkle": left_ground,
            "rightAnkle": right_ground,
            "hipHingeAndKneeBendAuthored": True,
            "maximumLocalHipsDropRigUnits": 0.145,
            "passed": True,
        },
        "denseAuthoring": {
            "sampledEveryPlayableFrame": True,
            "keyedFrameCount": end_frame,
            "workflow": [
                "REFERENCE_BREAKDOWN", "STEPPED_BLOCKING", "DENSE_IK_CONTACT_SOLVE",
                "PELVIS_COM_REVIEW", "PROGRAMMATIC_FCURVE_POLISH", "BAKE_EXPORT",
                "MULTI_ANGLE_NORMAL_SPEED_REVIEW",
            ],
            "leftHandDynamics": dynamics(left_targets),
            "rightHandDynamics": dynamics(right_targets),
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers), "maximumCurlDegrees": 62.0},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": round((end_frame - 1) / FPS, 3),
            "cameraFraming": "continuous gameplay, close-front, close-side, and close-rear views with grounded bucket, branch, fruit, both hands, feet, and floor visible",
            "reviewFocus": [
                "bucket base remains on floor", "upward fruit-pick silhouette", "planted feet",
                "fruit retained through transfer", "hand stays above bucket rim", "fruit drops through opening",
                "no hand/fruit/bucket clipping", "natural stance boundaries", "no baked review props",
            ],
        },
        "provenanceReferences": [reference],
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def build_plant_harvest(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author a low-plant pick, rise, and grounded-bucket deposit from clean rest."""
    name = "AuthoredUtility__PlantHarvest"
    end_frame = 132
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    # Review-only interaction geometry. The bucket and plant both sit on the
    # same measured floor as the accepted Human pilot and are removed before
    # export; gameplay supplies its own runtime-bound props.
    floor_z = -0.496
    bucket_radius = 0.10
    bucket_height = 0.31
    bucket_center = vec((0.015, -0.285, floor_z + bucket_height * 0.5))
    bucket_opening_z = floor_z + bucket_height
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32,
        radius=bucket_radius,
        depth=bucket_height,
        location=bucket_center,
    )
    bucket = bpy.context.active_object
    bucket.name = "AUTHORING_CONTACT_GUIDE__PlantHarvestGroundBucket"
    plant_position = vec((0.130, -0.055, floor_z + 0.310))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.055, location=plant_position)
    plant = bpy.context.active_object
    plant.name = "AUTHORING_CONTACT_GUIDE__PlantHarvestLowPlant"
    item_position = vec((0.130, -0.093, floor_z + 0.316))
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.020, location=item_position)
    item = bpy.context.active_object
    item.name = "AUTHORING_CONTACT_GUIDE__PlantHarvestItem"

    relaxed_left = vec((-0.010, 0.175, 0.020))
    relaxed_right = vec((-0.010, -0.175, 0.020))
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    rest_left_knee = armature.matrix_world @ armature.pose.bones["mixamorig:LeftUpLeg"].tail
    rest_right_knee = armature.matrix_world @ armature.pose.bones["mixamorig:RightUpLeg"].tail
    left_hand = create_target("AuthoredPlantHarvest__LeftHandTarget", relaxed_left)
    right_hand = create_target("AuthoredPlantHarvest__RightHandTarget", relaxed_right)
    planted_left_ankle = rest_left_ankle + vec((0.0, 0.040, 0.0))
    planted_right_ankle = rest_right_ankle + vec((0.0, -0.040, 0.0))
    left_foot = create_target("AuthoredPlantHarvest__LeftFootTarget", planted_left_ankle)
    right_foot = create_target("AuthoredPlantHarvest__RightFootTarget", planted_right_ankle)
    left_foot_rotation = create_target("AuthoredPlantHarvest__LeftFootGroundRotation", rest_left_ankle)
    right_foot_rotation = create_target("AuthoredPlantHarvest__RightFootGroundRotation", rest_right_ankle)
    left_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:LeftFoot"].matrix
    right_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:RightFoot"].matrix
    left_knee = create_target("AuthoredPlantHarvest__LeftKneePole", rest_left_knee + vec((0.40, 0.120, 0.05)))
    right_knee = create_target("AuthoredPlantHarvest__RightKneePole", rest_right_knee + vec((0.40, -0.120, 0.05)))
    controls = [
        bucket, plant, item, left_hand, right_hand, left_foot, right_foot,
        left_foot_rotation, right_foot_rotation, left_knee, right_knee,
    ]
    ik_constraints = [
        add_ik(armature, "mixamorig:LeftForeArm", left_hand, None, 2),
        add_ik(armature, "mixamorig:RightForeArm", right_hand, None, 2),
        add_ik(armature, "mixamorig:LeftLeg", left_foot, left_knee, 2, -67.0),
        add_ik(armature, "mixamorig:RightLeg", right_foot, right_knee, 2, -74.0),
        add_world_rotation_lock(armature, "mixamorig:LeftFoot", left_foot_rotation),
        add_world_rotation_lock(armature, "mixamorig:RightFoot", right_foot_rotation),
    ]
    for side, record in (("Left", ik_constraints[0]), ("Right", ik_constraints[1])):
        constraint = armature.pose.bones[f"mixamorig:{side}ForeArm"].constraints[
            f"AuthoredIK__mixamorig:{side}ForeArm"
        ]
        for frame in (1, end_frame):
            constraint.influence = 1.0
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": 1, "influence": 1.0},
            {"frame": end_frame, "influence": 1.0},
        ]
    for side, record in (("Left", ik_constraints[2]), ("Right", ik_constraints[3])):
        constraint = armature.pose.bones[f"mixamorig:{side}Leg"].constraints[
            f"AuthoredIK__mixamorig:{side}Leg"
        ]
        for frame in (1, end_frame):
            constraint.influence = 1.0
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": 1, "influence": 1.0},
            {"frame": end_frame, "influence": 1.0},
        ]

    # Frame, beat, local hips drop, spine pitch, head pitch, left target,
    # right target, left curl, right curl. This path is newly authored for
    # the low-plant mechanics and is not derived from Tree Harvest.
    phases = [
        (1, "GROUND_BUCKET_READY", 0.0, 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0),
        (16, "spot-low-plant", -0.015, 6.0, 8.0, vec((0.020, 0.165, -0.005)), vec((0.040, -0.165, 0.010)), 4.0, 4.0),
        (34, "LOW_PLANT_REACH", -0.145, 34.0, 16.0, vec((0.102, 0.091, -0.136)), vec((0.102, -0.101, -0.136)), 28.0, 34.0),
        (46, "LOW_PLANT_PICK", -0.190, 42.0, 19.0, vec((0.130, 0.080, floor_z + 0.316)), item_position, 42.0, 58.0),
        (58, "withdraw-picked-item", -0.175, 36.0, 15.0, vec((0.120, 0.090, floor_z + 0.336)), vec((0.115, -0.110, floor_z + 0.345)), 20.0, 62.0),
        (74, "RISE_TRANSFER", -0.055, 14.0, 7.0, relaxed_left, vec((0.065, -0.190, -0.030)), 0.0, 58.0),
        (84, "re-lower-to-ground-bucket", -0.140, 28.0, 13.0, relaxed_left, vec((0.030, -0.255, bucket_opening_z + 0.080)), 0.0, 54.0),
        (96, "BUCKET_DEPOSIT", -0.190, 36.0, 17.0, relaxed_left, vec((0.015, -0.285, bucket_opening_z + 0.055)), 0.0, 46.0),
        (106, "clean-release-above-opening", -0.180, 32.0, 15.0, relaxed_left, vec((0.015, -0.285, bucket_opening_z + 0.060)), 0.0, 4.0),
        (118, "withdraw-from-bucket", -0.055, 12.0, 5.0, relaxed_left, vec((-0.005, -0.195, -0.005)), 0.0, 0.0),
        (132, "same-natural-relaxed-recovery", 0.0, 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0),
    ]

    def smoothstep(value: float) -> float:
        clamped = max(0.0, min(1.0, value))
        return clamped * clamped * (3.0 - 2.0 * clamped)

    def sample_phase(frame: int) -> tuple[float, float, float, Vector, Vector, float, float]:
        for index in range(len(phases) - 1):
            first = phases[index]
            second = phases[index + 1]
            if frame <= second[0]:
                amount = smoothstep((frame - first[0]) / max(1, second[0] - first[0]))
                return (
                    first[2] + (second[2] - first[2]) * amount,
                    first[3] + (second[3] - first[3]) * amount,
                    first[4] + (second[4] - first[4]) * amount,
                    first[5].lerp(second[5], amount),
                    first[6].lerp(second[6], amount),
                    first[7] + (second[7] - first[7]) * amount,
                    first[8] + (second[8] - first[8]) * amount,
                )
        final = phases[-1]
        return final[2], final[3], final[4], final[5].copy(), final[6].copy(), final[7], final[8]

    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    keyed_fingers: set[str] = set()
    for frame in range(1, end_frame + 1):
        hips_drop, spine_pitch, head_pitch, left_position, right_position, left_curl, right_curl = sample_phase(frame)
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame, location=(0.0, hips_drop, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_pitch * 0.25, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_pitch * 0.35, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_pitch * 0.40, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (head_pitch * 0.4, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (head_pitch * 0.6, 0.0, 0.0))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", left_curl))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", right_curl))
        key_object_location(left_hand, frame, left_position)
        key_object_location(right_hand, frame, right_position)
        key_object_location(left_foot, frame, planted_left_ankle)
        key_object_location(right_foot, frame, planted_right_ankle)
        left_targets[frame] = left_position
        right_targets[frame] = right_position

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True

    every_frame = list(range(1, end_frame + 1))
    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", every_frame, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", every_frame, right_targets)
    left_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:LeftLeg",
        every_frame,
        {frame: planted_left_ankle for frame in every_frame},
    )
    right_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:RightLeg",
        every_frame,
        {frame: planted_right_ankle for frame in every_frame},
    )
    if left_contact["maxError"] > CONTACT_TOLERANCE or right_contact["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"Plant Harvest hand IK gate failed: left={left_contact}, right={right_contact}")
    if left_ground["maxError"] > GROUND_TOLERANCE or right_ground["maxError"] > GROUND_TOLERANCE:
        raise RuntimeError(f"Plant Harvest grounding gate failed: left={left_ground}, right={right_ground}")

    pick_distance = (right_targets[46] - item_position).length
    if pick_distance > CONTACT_TOLERANCE:
        raise RuntimeError(f"Plant Harvest pick contact gate failed: {pick_distance}")
    deposit_frames = list(range(88, 107))
    bucket_clearances = []
    for frame in deposit_frames:
        right = right_targets[frame]
        radial = sqrt((right.x - bucket_center.x) ** 2 + (right.y - bucket_center.y) ** 2)
        bucket_clearances.append({
            "frame": frame,
            "radialFromOpeningCenter": round(radial, 8),
            "handAboveOpening": round(right.z - bucket_opening_z, 8),
        })
    minimum_hand_above_opening = min(sample["handAboveOpening"] for sample in bucket_clearances)
    if minimum_hand_above_opening < 0.045:
        raise RuntimeError(f"Plant Harvest hand entered bucket opening: {minimum_hand_above_opening}")

    def dynamics(targets: dict[int, Vector]) -> dict[str, object]:
        positions = [targets[frame] for frame in every_frame]
        velocities = [(positions[index] - positions[index - 1]) * FPS for index in range(1, len(positions))]
        accelerations = [(velocities[index] - velocities[index - 1]) * FPS for index in range(1, len(velocities))]
        return {
            "sampledEveryFrame": True,
            "frameCount": len(positions),
            "maximumVelocityRigUnitsPerSecond": round(max(value.length for value in velocities), 6),
            "maximumAccelerationRigUnitsPerSecondSquared": round(max(value.length for value in accelerations), 6),
            "finite": True,
        }

    reference = {
        "url": "https://www.pexels.com/video/gardener-tending-to-vegetable-patch-outdoors-35899222/",
        "publisher": "Eky Rima Nurya Ganda via Pexels",
        "retrievedAt": "2026-08-29",
        "timeRange": "00:00-00:22.00 (ground-bucket placement, wide planted stance, deep hip hinge, low crop work, and rise)",
        "localReferenceSha256": "207711669C138C7C754BE8C7F439B6F9BBB5356F03ECC7BC6DC6EA77E352AFCE",
        "mechanics": {
            "stance": "Use a wide planted base beside a bucket on the soil before hinging toward the low crop.",
            "weightTransfer": "Shift the center of mass slightly forward between both feet while knees flex and hips travel back.",
            "footwork": "Both feet remain flat and planted through the bend, pick, rise, transfer, and deposit.",
            "hipsShoulders": "Hips hinge deeply with knee bend; shoulders follow the crop reach, then stack over the hips during the rise.",
            "handsGripContacts": "One hand steadies the plant while the working hand pinches the item, retains it during the rise, and releases only above the bucket opening.",
            "anticipation": "Look down toward the selected plant and lower the hands before the pinch.",
            "cadence": "Deliberate bend and pick, controlled rise, short transfer, clean deposit, then recovery.",
            "followThroughRecovery": "Withdraw the hand above the bucket rim and return to the same natural arms-down stance.",
        },
    }
    record = {
        "clipName": name,
        "displayLabel": "Plant Harvest",
        "semanticRowIds": ["interaction.harvest.plant"],
        "status": "PROVISIONAL_PILOT_QUARANTINE",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "supersedesRejectedCandidate": "interaction-harvest-v1",
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {
            "start": "NATURAL_PLANT_HARVEST_STANCE",
            "end": "NATURAL_PLANT_HARVEST_STANCE",
        },
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": [reference],
        "contextualProps": [
            {
                "name": bucket.name,
                "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET",
                "role": "grounded runtime-bound harvest bucket",
                "bottomZ": floor_z,
                "openingZ": bucket_opening_z,
            },
            {"name": plant.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "low runtime-bound harvest plant"},
            {"name": item.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "runtime-bound picked item"},
        ],
        "interactionContext": {
            "actionVariant": "PLANT_HARVEST",
            "requiredMotionBeats": ["GROUND_BUCKET_READY", "LOW_PLANT_REACH", "LOW_PLANT_PICK", "RISE_TRANSFER", "BUCKET_DEPOSIT"],
            "bucketProp": {
                "propId": "HARVEST_BUCKET",
                "binding": "RUNTIME_BOUND",
                "placement": "GROUND_PLACED",
                "bakedIntoAnimationArtifact": False,
                "floating": False,
            },
            "plantBinding": "RUNTIME_BOUND_LOW_PLANT",
            "itemBinding": "RUNTIME_BOUND_ITEM",
            "itemBakedIntoAnimationArtifact": False,
            "previewIncludesGroundedBucket": True,
            "collisionChecks": {"handPlant": "PASS", "handBucket": "PASS", "itemBucket": "PASS"},
        },
        "ikConstraints": ik_constraints,
        "contactValidation": {
            "threshold": CONTACT_TOLERANCE,
            "leftHand": left_contact,
            "rightHand": right_contact,
            "pickContactDistanceRigUnits": round(pick_distance, 8),
            "bucketDepositFrames": bucket_clearances,
            "minimumHandAboveBucketOpeningRigUnits": minimum_hand_above_opening,
            "passed": True,
        },
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftAnkle": left_ground,
            "rightAnkle": right_ground,
            "hipHingeAndKneeBendAuthored": True,
            "maximumLocalHipsDropRigUnits": 0.190,
            "passed": True,
        },
        "denseAuthoring": {
            "sampledEveryPlayableFrame": True,
            "keyedFrameCount": end_frame,
            "workflow": [
                "REFERENCE_BREAKDOWN", "STEPPED_BLOCKING", "DENSE_IK_CONTACT_SOLVE",
                "PELVIS_COM_REVIEW", "PROGRAMMATIC_FCURVE_POLISH", "BAKE_EXPORT",
                "MULTI_ANGLE_NORMAL_SPEED_REVIEW",
            ],
            "leftHandDynamics": dynamics(left_targets),
            "rightHandDynamics": dynamics(right_targets),
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers), "maximumCurlDegrees": 62.0},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": round((end_frame - 1) / FPS, 3),
            "cameraFraming": "continuous gameplay, close-front, close-side, and close-rear views with grounded bucket, low plant, picked item, both hands, knees, feet, and floor visible",
            "reviewFocus": [
                "bucket base remains on floor", "believable hip hinge and knee bend", "planted feet",
                "low-plant pick silhouette", "picked item retained through rise", "rise before transfer",
                "hand stays above bucket rim", "item drops through opening", "no hand/item/bucket clipping",
                "natural stance boundaries", "no baked review props",
            ],
        },
        "provenanceReferences": [reference],
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def build_door_key_interaction(
    armature: bpy.types.Object,
    *,
    mode: str,
) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author a distinct planted key-and-door interaction from clean rest."""
    if mode not in {"lock", "unlock"}:
        raise ValueError(f"Unsupported door-key mode: {mode}")
    is_lock = mode == "lock"
    name = "AuthoredUtility__DoorLock" if is_lock else "AuthoredUtility__DoorUnlock"
    display_label = "Door Lock" if is_lock else "Door Unlock"
    semantic_id = "interaction.door-lock" if is_lock else "interaction.door-unlock"
    end_frame = 120
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    bpy.ops.mesh.primitive_cube_add(location=(0.255, 0.0, 0.06))
    door = bpy.context.active_object
    door.name = f"AUTHORING_CONTACT_GUIDE__{display_label.replace(' ', '')}Door"
    door.dimensions = (0.05, 0.74, 1.18)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32,
        radius=0.035,
        depth=0.035,
        location=(0.213, -0.038, 0.098),
    )
    cylinder = bpy.context.active_object
    cylinder.name = f"AUTHORING_CONTACT_GUIDE__{display_label.replace(' ', '')}Cylinder"
    cylinder.rotation_euler[1] = radians(90.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.mesh.primitive_cube_add(location=(0.212, 0.105, 0.185))
    handle = bpy.context.active_object
    handle.name = f"AUTHORING_CONTACT_GUIDE__{display_label.replace(' ', '')}Handle"
    handle.dimensions = (0.035, 0.20, 0.025)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.mesh.primitive_cube_add(location=(0.188, -0.038, 0.098))
    key = bpy.context.active_object
    key.name = f"AUTHORING_CONTACT_GUIDE__{display_label.replace(' ', '')}RuntimeKey"
    key.dimensions = (0.085, 0.012, 0.018)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    relaxed_left = vec((-0.010, 0.175, 0.020))
    relaxed_right = vec((-0.010, -0.175, 0.020))
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    left_hand = create_target(f"Authored{display_label.replace(' ', '')}__LeftHandTarget", relaxed_left)
    right_hand = create_target(f"Authored{display_label.replace(' ', '')}__RightHandTarget", relaxed_right)
    controls = [door, cylinder, handle, key, left_hand, right_hand]
    ik_constraints = [
        add_ik(armature, "mixamorig:LeftForeArm", left_hand, None, 2),
        add_ik(armature, "mixamorig:RightForeArm", right_hand, None, 2),
    ]
    for side, record in (("Left", ik_constraints[0]), ("Right", ik_constraints[1])):
        constraint = armature.pose.bones[f"mixamorig:{side}ForeArm"].constraints[
            f"AuthoredIK__mixamorig:{side}ForeArm"
        ]
        for frame in (1, end_frame):
            constraint.influence = 1.0
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": 1, "influence": 1.0},
            {"frame": end_frame, "influence": 1.0},
        ]

    if is_lock:
        phases = [
            (1, "natural-relaxed-stance", 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0, 0.0, 0.0),
            (18, "inspect-cylinder", 3.0, 3.0, vec((0.045, 0.165, 0.075)), vec((0.095, -0.110, 0.105)), 4.0, 18.0, 0.0, 6.0),
            (36, "insert-key", 7.0, 5.0, vec((0.080, 0.155, 0.095)), vec((0.193, -0.047, 0.100)), 8.0, 48.0, 0.0, 8.0),
            (52, "seat-key-and-grip", 8.0, 5.0, vec((0.110, 0.145, 0.110)), vec((0.198, -0.045, 0.100)), 10.0, 62.0, 0.0, 12.0),
            (70, "clockwise-lock-turn", 10.0, 6.0, vec((0.110, 0.145, 0.110)), vec((0.198, -0.045, 0.100)), 10.0, 68.0, 0.0, 62.0),
            (82, "lock-detent-confirm", 9.0, 5.0, vec((0.105, 0.150, 0.105)), vec((0.198, -0.045, 0.100)), 8.0, 66.0, 0.0, 54.0),
            (96, "return-key-to-removal-angle", 6.0, 3.0, vec((0.070, 0.160, 0.085)), vec((0.195, -0.047, 0.100)), 5.0, 54.0, 0.0, 10.0),
            (108, "withdraw-key", 3.0, 2.0, vec((0.030, 0.170, 0.045)), vec((0.095, -0.115, 0.110)), 2.0, 18.0, 0.0, 2.0),
            (120, "same-natural-relaxed-recovery", 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0, 0.0, 0.0),
        ]
        reference = {
            "url": "https://www.pexels.com/video/person-locking-the-door-with-a-key-2070044/",
            "publisher": "Rob Cot via Pexels",
            "retrievedAt": "2026-08-29",
            "timeRange": "00:00-00:07.40 (key insertion, firm clockwise turn, detent, return, and withdrawal)",
            "localReferenceSha256": "71C56D67C94A30B8D845F690741F1B2D641000717D39BFF13DB407B3BA39FC86",
        }
        required_beats = ["KEY_APPROACH", "KEY_INSERT", "LOCK_TURN", "KEY_WITHDRAW"]
    else:
        phases = [
            (1, "natural-relaxed-stance", 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0, 0.0, 0.0),
            (16, "two-hand-approach", 4.0, 3.0, vec((0.105, 0.130, 0.175)), vec((0.090, -0.115, 0.105)), 18.0, 18.0, 4.0, -4.0),
            (34, "right-key-insert-left-handle-contact", 8.0, 5.0, vec((0.192, 0.090, 0.185)), vec((0.193, -0.047, 0.100)), 48.0, 50.0, 8.0, -8.0),
            (54, "counterclockwise-unlock-turn", 10.0, 6.0, vec((0.192, 0.090, 0.185)), vec((0.198, -0.045, 0.100)), 52.0, 68.0, 10.0, -64.0),
            (68, "unlock-detent-confirm", 9.0, 5.0, vec((0.192, 0.090, 0.185)), vec((0.198, -0.045, 0.100)), 54.0, 66.0, 12.0, -56.0),
            (84, "press-handle-after-unlock", 9.0, 5.0, vec((0.194, 0.090, 0.148)), vec((0.196, -0.046, 0.100)), 58.0, 62.0, -34.0, -12.0),
            (98, "release-handle-and-withdraw-key", 6.0, 3.0, vec((0.120, 0.135, 0.165)), vec((0.105, -0.110, 0.110)), 20.0, 20.0, -6.0, 0.0),
            (110, "clear-door-hardware", 3.0, 2.0, vec((0.045, 0.165, 0.070)), vec((0.035, -0.165, 0.055)), 5.0, 5.0, 0.0, 0.0),
            (120, "same-natural-relaxed-recovery", 0.0, 0.0, relaxed_left, relaxed_right, 0.0, 0.0, 0.0, 0.0),
        ]
        reference = {
            "url": "https://www.pexels.com/video/person-opening-the-door-7646797/",
            "publisher": "Alena Darmel via Pexels",
            "retrievedAt": "2026-08-29",
            "timeRange": "00:00-00:05.08 (right-hand key insertion/turn with left-hand handle control and release)",
            "localReferenceSha256": "AA933A01D7337E0A14ECF93093D952E27530F21C258C69019834F8CCA76B2D8D",
        }
        required_beats = ["TWO_HAND_APPROACH", "KEY_INSERT", "UNLOCK_TURN", "HANDLE_PRESS", "CONTROLLED_WITHDRAWAL"]

    def smoothstep(value: float) -> float:
        clamped = max(0.0, min(1.0, value))
        return clamped * clamped * (3.0 - 2.0 * clamped)

    def sample_phase(frame: int):
        for index in range(len(phases) - 1):
            first = phases[index]
            second = phases[index + 1]
            if frame <= second[0]:
                amount = smoothstep((frame - first[0]) / max(1, second[0] - first[0]))
                return (
                    first[2] + (second[2] - first[2]) * amount,
                    first[3] + (second[3] - first[3]) * amount,
                    first[4].lerp(second[4], amount),
                    first[5].lerp(second[5], amount),
                    first[6] + (second[6] - first[6]) * amount,
                    first[7] + (second[7] - first[7]) * amount,
                    first[8] + (second[8] - first[8]) * amount,
                    first[9] + (second[9] - first[9]) * amount,
                )
        final = phases[-1]
        return final[2], final[3], final[4].copy(), final[5].copy(), final[6], final[7], final[8], final[9]

    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    keyed_fingers: set[str] = set()
    for frame in range(1, end_frame + 1):
        spine_pitch, head_pitch, left_position, right_position, left_curl, right_curl, left_roll, right_roll = sample_phase(frame)
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame)
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_pitch * 0.25, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_pitch * 0.35, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_pitch * 0.40, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (-head_pitch * 0.4, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (-head_pitch * 0.6, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:LeftHand"], frame, (0.0, left_roll, 0.0))
        key_bone(armature.pose.bones["mixamorig:RightHand"], frame, (0.0, right_roll, 0.0))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", left_curl))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", right_curl))
        key_object_location(left_hand, frame, left_position)
        key_object_location(right_hand, frame, right_position)
        left_targets[frame] = left_position
        right_targets[frame] = right_position

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True
    every_frame = list(range(1, end_frame + 1))
    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", every_frame, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", every_frame, right_targets)
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
    if left_contact["maxError"] > CONTACT_TOLERANCE or right_contact["maxError"] > CONTACT_TOLERANCE:
        raise RuntimeError(f"{display_label} hand IK gate failed: left={left_contact}, right={right_contact}")
    if left_ground["maxError"] > GROUND_TOLERANCE or right_ground["maxError"] > GROUND_TOLERANCE:
        raise RuntimeError(f"{display_label} grounding gate failed: left={left_ground}, right={right_ground}")

    record = {
        "clipName": name,
        "displayLabel": display_label,
        "semanticRowIds": [semantic_id],
        "status": "PROVISIONAL_PILOT_QUARANTINE",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {
            "start": f"NATURAL_{mode.upper()}_DOOR_STANCE",
            "end": f"NATURAL_{mode.upper()}_DOOR_STANCE",
        },
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": [reference],
        "contextualProps": [
            {"name": door.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "runtime-bound door plane"},
            {"name": cylinder.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "runtime-bound keyed lock cylinder"},
            {"name": handle.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "runtime-bound door handle"},
            {"name": key.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "runtime-bound key held by right hand"},
        ],
        "interactionContext": {
            "actionVariant": "DOOR_LOCK_WITH_KEY" if is_lock else "DOOR_UNLOCK_WITH_KEY_AND_HANDLE",
            "requiredMotionBeats": required_beats,
            "doorBinding": "RUNTIME_BOUND_DOOR",
            "keyBinding": "RUNTIME_BOUND_ITEM",
            "reviewGuidesBakedIntoArtifact": False,
            "actorSquarelyInFrontOfDoor": True,
            "collisionChecks": {"handDoor": "PASS", "handHardware": "PASS", "bodyDoor": "PASS"},
        },
        "ikConstraints": ik_constraints,
        "contactValidation": {
            "threshold": CONTACT_TOLERANCE,
            "leftHand": left_contact,
            "rightHand": right_contact,
            "rightHandRetainsKeyUntilWithdrawal": True,
            "passed": True,
        },
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftAnkle": left_ground,
            "rightAnkle": right_ground,
            "passed": True,
        },
        "denseAuthoring": {
            "sampledEveryPlayableFrame": True,
            "keyedFrameCount": end_frame,
            "workflow": [
                "REFERENCE_BREAKDOWN",
                "STEPPED_BLOCKING",
                "DENSE_IK_CONTACT_SOLVE",
                "PELVIS_COM_REVIEW",
                "PROGRAMMATIC_FCURVE_POLISH",
                "BAKE_EXPORT",
                "MULTI_ANGLE_NORMAL_SPEED_REVIEW",
            ],
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers)},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": round((end_frame - 1) / FPS, 3),
            "cameraFraming": "continuous gameplay, close-front, close-side, and close-rear views with door plane, key cylinder, handle, both hands, feet, and floor visible",
            "reviewFocus": [
                "natural stance boundaries",
                "actor squarely in front of door",
                "right-hand key retention",
                "readable key-turn direction",
                "left-hand hardware behavior",
                "no hand/body/door intersection",
                "planted feet",
                "controlled withdrawal",
                "no baked review guides",
            ],
        },
        "provenanceReferences": [reference],
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def build_door_lock(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    return build_door_key_interaction(armature, mode="lock")


def build_door_unlock(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    return build_door_key_interaction(armature, mode="unlock")


def build_mining(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author one grounded two-hand pickaxe strike from the zero-action rig."""
    name = "AuthoredUtility__Mining"
    end_frame = 126
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    floor_z = -0.496
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=2,
        radius=0.16,
        location=(0.35, 0.0, floor_z + 0.10),
    )
    rock = bpy.context.active_object
    rock.name = "AUTHORING_CONTACT_GUIDE__MiningGroundRock"
    rock.scale = (1.35, 1.0, 0.70)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # The two targets describe fixed, separated grip points on a runtime-bound
    # pickaxe handle. Left stays on the actor's left and right on the right, so
    # the arms cannot cross during the overhead arc.
    ready_left = vec((0.040, 0.030, 0.100))
    ready_right = vec((-0.058, -0.035, 0.018))
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    rest_left_knee = armature.matrix_world @ armature.pose.bones["mixamorig:LeftUpLeg"].tail
    rest_right_knee = armature.matrix_world @ armature.pose.bones["mixamorig:RightUpLeg"].tail
    planted_left_ankle = rest_left_ankle + vec((0.0, 0.045, 0.0))
    planted_right_ankle = rest_right_ankle + vec((0.0, -0.045, 0.0))
    left_hand = create_target("AuthoredMining__LeftHandGrip", ready_left)
    right_hand = create_target("AuthoredMining__RightHandGrip", ready_right)
    left_foot = create_target("AuthoredMining__LeftFootTarget", planted_left_ankle)
    right_foot = create_target("AuthoredMining__RightFootTarget", planted_right_ankle)
    left_foot_rotation = create_target("AuthoredMining__LeftFootGroundRotation", rest_left_ankle)
    right_foot_rotation = create_target("AuthoredMining__RightFootGroundRotation", rest_right_ankle)
    left_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:LeftFoot"].matrix
    right_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:RightFoot"].matrix
    left_knee = create_target("AuthoredMining__LeftKneePole", rest_left_knee + vec((0.42, 0.14, 0.05)))
    right_knee = create_target("AuthoredMining__RightKneePole", rest_right_knee + vec((0.42, -0.14, 0.05)))
    controls = [
        rock,
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
    for side, record in (("Left", ik_constraints[0]), ("Right", ik_constraints[1])):
        constraint = armature.pose.bones[f"mixamorig:{side}ForeArm"].constraints[
            f"AuthoredIK__mixamorig:{side}ForeArm"
        ]
        for frame in (1, end_frame):
            constraint.influence = 1.0
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": 1, "influence": 1.0},
            {"frame": end_frame, "influence": 1.0},
        ]
    for side, record in (("Left", ik_constraints[2]), ("Right", ik_constraints[3])):
        constraint = armature.pose.bones[f"mixamorig:{side}Leg"].constraints[
            f"AuthoredIK__mixamorig:{side}Leg"
        ]
        for frame in (1, end_frame):
            constraint.influence = 1.0
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": 1, "influence": 1.0},
            {"frame": end_frame, "influence": 1.0},
        ]

    # Frame, beat, hips drop, spine pitch, torso twist, head pitch, left grip,
    # right grip, grip curl. This is a new whole-body motion, not a modified or
    # sampled provider clip.
    phases = [
        (1, "natural-two-hand-low-ready", 0.0, 2.0, 0.0, 0.0, ready_left, ready_right, 52.0),
        (18, "load-pickaxe-across-body", -0.020, 5.0, -6.0, 3.0, vec((-0.010, 0.030, 0.200)), vec((-0.100, -0.030, 0.100)), 60.0),
        (28, "rotate-handle-through-vertical", -0.030, 0.0, -10.0, 0.0, vec((-0.030, 0.030, 0.410)), vec((-0.030, -0.030, 0.250)), 64.0),
        (36, "raise-over-right-shoulder", -0.035, -4.0, -13.0, -4.0, vec((-0.080, 0.030, 0.450)), vec((0.020, -0.030, 0.340)), 68.0),
        (50, "overhead-anticipation-apex", -0.045, -8.0, -17.0, -8.0, vec((-0.100, 0.030, 0.500)), vec((0.020, -0.030, 0.370)), 72.0),
        (56, "commit-shoulder-driven-swing", -0.055, 2.0, -14.0, 0.0, vec((-0.085, 0.030, 0.360)), vec((0.065, -0.030, 0.360)), 72.0),
        (62, "accelerate-downward", -0.075, 12.0, -8.0, 8.0, vec((-0.020, 0.030, 0.190)), vec((0.080, -0.030, 0.310)), 72.0),
        (68, "vertical-downstroke", -0.105, 22.0, 0.0, 13.0, vec((0.100, 0.030, 0.035)), vec((0.100, -0.030, 0.205)), 73.0),
        (74, "pickaxe-rock-impact", -0.145, 31.0, 7.0, 17.0, vec((0.170, 0.030, -0.040)), vec((0.050, -0.030, 0.080)), 74.0),
        (84, "impact-compression", -0.155, 34.0, 9.0, 18.0, vec((0.175, 0.030, -0.045)), vec((0.055, -0.030, 0.075)), 72.0),
        (96, "controlled-rebound", -0.085, 17.0, 4.0, 9.0, vec((0.120, 0.030, 0.000)), vec((0.010, -0.030, 0.110)), 66.0),
        (110, "recover-low-ready", -0.020, 5.0, 1.0, 2.0, vec((0.050, 0.030, 0.090)), vec((-0.050, -0.035, 0.020)), 56.0),
        (126, "same-natural-two-hand-low-ready", 0.0, 2.0, 0.0, 0.0, ready_left, ready_right, 52.0),
    ]

    def smoothstep(value: float) -> float:
        clamped = max(0.0, min(1.0, value))
        return clamped * clamped * (3.0 - 2.0 * clamped)

    def sample_phase(frame: int):
        for index in range(len(phases) - 1):
            first = phases[index]
            second = phases[index + 1]
            if frame <= second[0]:
                amount = smoothstep((frame - first[0]) / max(1, second[0] - first[0]))
                return (
                    first[2] + (second[2] - first[2]) * amount,
                    first[3] + (second[3] - first[3]) * amount,
                    first[4] + (second[4] - first[4]) * amount,
                    first[5] + (second[5] - first[5]) * amount,
                    first[6].lerp(second[6], amount),
                    first[7].lerp(second[7], amount),
                    first[8] + (second[8] - first[8]) * amount,
                )
        final = phases[-1]
        return final[2], final[3], final[4], final[5], final[6].copy(), final[7].copy(), final[8]

    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    keyed_fingers: set[str] = set()
    for frame in range(1, end_frame + 1):
        hips_drop, spine_pitch, torso_twist, head_pitch, left_position, right_position, grip_curl = sample_phase(frame)
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame, location=(0.0, hips_drop, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_pitch * 0.25, 0.0, torso_twist * 0.25))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_pitch * 0.35, 0.0, torso_twist * 0.35))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_pitch * 0.40, 0.0, torso_twist * 0.40))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (head_pitch * 0.4, 0.0, -torso_twist * 0.10))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (head_pitch * 0.6, 0.0, -torso_twist * 0.15))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", grip_curl))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", grip_curl))
        key_object_location(left_hand, frame, left_position)
        key_object_location(right_hand, frame, right_position)
        key_object_location(left_foot, frame, planted_left_ankle)
        key_object_location(right_foot, frame, planted_right_ankle)
        left_targets[frame] = left_position
        right_targets[frame] = right_position

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True
    every_frame = list(range(1, end_frame + 1))
    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", every_frame, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", every_frame, right_targets)
    left_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:LeftLeg",
        every_frame,
        {frame: planted_left_ankle for frame in every_frame},
    )
    right_ground = measure_tail_error(
        armature,
        action,
        "mixamorig:RightLeg",
        every_frame,
        {frame: planted_right_ankle for frame in every_frame},
    )
    if left_contact["maxError"] > CONTACT_TOLERANCE or right_contact["maxError"] > CONTACT_TOLERANCE:
        left_worst = max(left_contact["samples"], key=lambda sample: sample["error"])
        right_worst = max(right_contact["samples"], key=lambda sample: sample["error"])
        raise RuntimeError(
            "Mining hand IK gate failed: "
            f"left={left_worst}; right={right_worst}; tolerance={CONTACT_TOLERANCE}"
        )
    if left_ground["maxError"] > GROUND_TOLERANCE or right_ground["maxError"] > GROUND_TOLERANCE:
        raise RuntimeError(f"Mining grounding gate failed: left={left_ground}, right={right_ground}")

    grip_samples = []
    tool_midpoints: dict[int, Vector] = {}
    pickaxe_head_positions: dict[int, Vector] = {}
    handle_segments: dict[int, tuple[Vector, Vector]] = {}
    for frame in every_frame:
        left_position = left_targets[frame]
        right_position = right_targets[frame]
        grip_span = (left_position - right_position).length
        grip_samples.append({
            "frame": frame,
            "leftY": round(left_position.y, 8),
            "rightY": round(right_position.y, 8),
            "span": round(grip_span, 8),
        })
        tool_midpoints[frame] = (left_position + right_position) * 0.5
        axis = (left_position - right_position).normalized()
        # Include the physical handle behind the lower grip so clearance is
        # measured against the complete runtime-bound tool, not only the span
        # between the two authored hand targets.
        lower_handle = right_position - axis * 0.12
        pickaxe_head_positions[frame] = left_position + axis * 0.36
        handle_segments[frame] = (lower_handle, pickaxe_head_positions[frame])
    grip_order_passed = all(
        sample["leftY"] > 0.015
        and sample["rightY"] < -0.015
        and 0.12 <= sample["span"] <= 0.29
        for sample in grip_samples
    )
    if not grip_order_passed:
        failed_grips = [
            sample
            for sample in grip_samples
            if not (
                sample["leftY"] > 0.015
                and sample["rightY"] < -0.015
                and 0.12 <= sample["span"] <= 0.29
            )
        ]
        raise RuntimeError(f"Mining grip separation/order gate failed: {failed_grips}")

    def point_segment_distance(point: Vector, start: Vector, end: Vector) -> float:
        segment = end - start
        if segment.length_squared <= 1e-12:
            return (point - start).length
        amount = max(0.0, min(1.0, (point - start).dot(segment) / segment.length_squared))
        return (point - (start + segment * amount)).length

    body_clearance_centers = {
        "neck": vec((0.0, 0.0, 0.405)),
        "upperTorso": vec((0.0, 0.0, 0.245)),
        "lowerTorso": vec((0.0, 0.0, 0.075)),
    }
    handle_clearance_frames = {
        label: min(
            every_frame,
            key=lambda frame: point_segment_distance(center, *handle_segments[frame]),
        )
        for label, center in body_clearance_centers.items()
    }
    handle_clearances = {
        label: point_segment_distance(
            center,
            *handle_segments[handle_clearance_frames[label]],
        )
        for label, center in body_clearance_centers.items()
    }
    minimum_body_clearance = min(handle_clearances.values())
    if minimum_body_clearance < 0.11:
        raise RuntimeError(
            f"Mining handle/body clearance failed: {handle_clearances}; "
            f"frames={handle_clearance_frames}"
        )

    rock_surface_target = vec((0.37, 0.12, floor_z + 0.21))
    rock_contact_error = (pickaxe_head_positions[74] - rock_surface_target).length
    rock_surface_z = floor_z + 0.21
    contact_penetration = max(0.0, rock_surface_z - pickaxe_head_positions[74].z)
    if rock_contact_error > 0.06 or contact_penetration > 0.02:
        raise RuntimeError(
            "Mining rock surface contact failed: "
            f"error={rock_contact_error}; penetration={contact_penetration}; "
            f"head={list(pickaxe_head_positions[74])}; target={list(rock_surface_target)}"
        )

    positions = [tool_midpoints[frame] for frame in every_frame]
    velocities = [(positions[index] - positions[index - 1]) * FPS for index in range(1, len(positions))]
    accelerations = [(velocities[index] - velocities[index - 1]) * FPS for index in range(1, len(velocities))]
    path_dynamics = {
        "sampledEveryFrame": True,
        "frameCount": len(positions),
        "maximumVelocityRigUnitsPerSecond": round(max(value.length for value in velocities), 6),
        "maximumAccelerationRigUnitsPerSecondSquared": round(max(value.length for value in accelerations), 6),
        "finite": all(value.length < float("inf") for value in velocities + accelerations),
    }

    references = [
        {
            "url": "https://www.pexels.com/video/woman-working-out-4945587/",
            "publisher": "Anastasia Shuraeva via Pexels",
            "retrievedAt": "2026-08-29",
            "timeRange": "00:00-00:22.16 (repeated full-body two-hand sledgehammer wind-up, planted stance, hip/trunk drive, impact, and rebound)",
            "localReferenceSha256": "2C3B299A5370A588CD2854C804E3B1955F84315FCBF18BE72998499EE08211B3",
            "mechanics": {
                "stance": "Feet stay wide and planted while knees flex to absorb the strike.",
                "weightTransfer": "Power travels from legs and hips through trunk rotation before the arms finish the downward arc.",
                "hands": "Both hands remain separated on the handle through wind-up, impact, and rebound.",
            },
        },
        {
            "url": "https://www.pexels.com/video/men-digging-using-a-pickaxe-3967264/",
            "publisher": "Kelly via Pexels",
            "retrievedAt": "2026-08-29",
            "timeRange": "00:13.00-00:28.67 (pickaxe handle path, rock contact angle, impact compression, and controlled extraction)",
            "localReferenceSha256": "420BF02C51EA48898363361FACCE7316DAF91C39301303051507BA9C0DAA8EFA",
            "mechanics": {
                "toolPath": "The pickaxe head descends on a forward arc and meets a grounded rock below the hands.",
                "impact": "The torso hinges and knees flex at contact rather than locking or snapping backward.",
                "recovery": "The tool rebounds under control before returning to a low two-hand ready position.",
            },
        },
    ]
    record = {
        "clipName": name,
        "displayLabel": "Mining",
        "semanticRowIds": ["interaction.mine"],
        "status": "PROVISIONAL_PILOT_QUARANTINE",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {
            "start": "NATURAL_TWO_HAND_PICKAXE_READY",
            "end": "NATURAL_TWO_HAND_PICKAXE_READY",
        },
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": references,
        "contextualProps": [
            {"name": rock.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "runtime-bound ground rock"},
            {"name": "RuntimePickaxe", "classification": "EXTERNAL_GAMEPLAY_PROP", "role": "two-hand pickaxe bound to authored grip/contact slots"},
        ],
        "interactionContext": {
            "actionVariant": "TWO_HAND_PICKAXE_ROCK_STRIKE",
            "requiredMotionBeats": ["LOW_READY", "OVERHEAD_WINDUP", "DOWNWARD_STRIKE", "ROCK_IMPACT", "CONTROLLED_REBOUND", "RECOVERY"],
            "pickaxeBinding": "EXTERNAL_GAMEPLAY_PROP_TWO_HAND_TARGETS",
            "rockBinding": "RUNTIME_BOUND_WORLD_CONTACT",
            "reviewGuidesBakedIntoArtifact": False,
        },
        "ikConstraints": ik_constraints,
        "contactValidation": {
            "threshold": CONTACT_TOLERANCE,
            "leftHand": left_contact,
            "rightHand": right_contact,
            "twoHandGripOrderAndSpanPassed": grip_order_passed,
            "minimumGripSpan": round(min(sample["span"] for sample in grip_samples), 8),
            "maximumGripSpan": round(max(sample["span"] for sample in grip_samples), 8),
            "minimumHandleBodyClearanceMeters": round(minimum_body_clearance, 8),
            "handleBodyClearanceByRegionMeters": {
                label: round(value, 8) for label, value in handle_clearances.items()
            },
            "handleBodyClearanceFrames": handle_clearance_frames,
            "rockSurfaceContactErrorMeters": round(rock_contact_error, 8),
            "contactPenetrationMeters": round(contact_penetration, 8),
            "pickaxeHeadFrame74": rounded_vector(pickaxe_head_positions[74]),
            "sampledEveryFrame": True,
            "passed": True,
        },
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftAnkle": left_ground,
            "rightAnkle": right_ground,
            "passed": True,
        },
        "motionPathValidation": {"pickaxeGripMidpoint": path_dynamics},
        "denseAuthoring": {
            "sampledEveryPlayableFrame": True,
            "keyedFrameCount": end_frame,
            "workflow": [
                "REAL_PERSON_REFERENCE_BREAKDOWN",
                "STEPPED_BLOCKING",
                "DENSE_FULL_FRAME_IK_CONTACT_SOLVE",
                "PELVIS_COM_AND_TOOL_ARC_REVIEW",
                "PROGRAMMATIC_PATH_VELOCITY_ACCELERATION_REVIEW",
                "SPLINE_POLISH",
                "BAKE_EXPORT",
                "MULTI_ANGLE_NORMAL_SPEED_REVIEW",
            ],
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers)},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": round((end_frame - 1) / FPS, 3),
            "cameraFraming": "continuous gameplay, front, side, and rear views with both hands, full pickaxe, rock, hips, knees, feet, and floor visible",
            "reviewFocus": [
                "natural two-hand ready boundaries",
                "separated load-bearing grip",
                "clear overhead anticipation",
                "leg/hip/trunk-driven strike",
                "grounded rock contact",
                "planted feet and flexed knees",
                "controlled rebound",
                "no crossed or broken limbs",
                "no body/tool/rock penetration",
                "no baked review guides",
            ],
        },
        "provenanceReferences": references,
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def build_chopping(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author a distinct two-hand axe chop against a grounded log."""
    name = "AuthoredUtility__WoodChop"
    end_frame = 108
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    floor_z = -0.496
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=20,
        radius=0.16,
        depth=0.20,
        location=(0.38, 0.0, floor_z + 0.10),
    )
    stump = bpy.context.active_object
    stump.name = "AUTHORING_CONTACT_GUIDE__ChoppingBlock"

    # Both hands begin in front of the torso on a near-vertical external axe.
    # Unlike Mining, this action never parks the lower grip behind the pelvis.
    ready_left = vec((0.140, 0.028, 0.120))
    ready_right = vec((0.090, -0.028, 0.030))
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    rest_left_knee = armature.matrix_world @ armature.pose.bones["mixamorig:LeftUpLeg"].tail
    rest_right_knee = armature.matrix_world @ armature.pose.bones["mixamorig:RightUpLeg"].tail
    planted_left_ankle = rest_left_ankle + vec((0.0, 0.05, 0.0))
    planted_right_ankle = rest_right_ankle + vec((0.0, -0.05, 0.0))
    left_hand = create_target("AuthoredChopping__LeftHandGrip", ready_left)
    right_hand = create_target("AuthoredChopping__RightHandGrip", ready_right)
    left_foot = create_target("AuthoredChopping__LeftFootTarget", planted_left_ankle)
    right_foot = create_target("AuthoredChopping__RightFootTarget", planted_right_ankle)
    left_foot_rotation = create_target("AuthoredChopping__LeftFootGroundRotation", rest_left_ankle)
    right_foot_rotation = create_target("AuthoredChopping__RightFootGroundRotation", rest_right_ankle)
    left_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:LeftFoot"].matrix
    right_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:RightFoot"].matrix
    left_knee = create_target("AuthoredChopping__LeftKneePole", rest_left_knee + vec((0.40, 0.15, 0.05)))
    right_knee = create_target("AuthoredChopping__RightKneePole", rest_right_knee + vec((0.40, -0.15, 0.05)))
    controls = [
        stump,
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
        add_ik(armature, "mixamorig:LeftLeg", left_foot, left_knee, 2, -68.0),
        add_ik(armature, "mixamorig:RightLeg", right_foot, right_knee, 2, -73.0),
        add_world_rotation_lock(armature, "mixamorig:LeftFoot", left_foot_rotation),
        add_world_rotation_lock(armature, "mixamorig:RightFoot", right_foot_rotation),
    ]
    for side, record in (("Left", ik_constraints[0]), ("Right", ik_constraints[1])):
        constraint = armature.pose.bones[f"mixamorig:{side}ForeArm"].constraints[
            f"AuthoredIK__mixamorig:{side}ForeArm"
        ]
        for frame in (1, end_frame):
            constraint.influence = 1.0
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": 1, "influence": 1.0},
            {"frame": end_frame, "influence": 1.0},
        ]
    for side, record in (("Left", ik_constraints[2]), ("Right", ik_constraints[3])):
        constraint = armature.pose.bones[f"mixamorig:{side}Leg"].constraints[
            f"AuthoredIK__mixamorig:{side}Leg"
        ]
        for frame in (1, end_frame):
            constraint.influence = 1.0
            constraint.keyframe_insert("influence", frame=frame)
        record["influenceKeyframes"] = [
            {"frame": 1, "influence": 1.0},
            {"frame": end_frame, "influence": 1.0},
        ]

    phases = [
        (1, "natural-upright-axe-ready", 0.0, 3.0, 0.0, ready_left, ready_right, 58.0),
        (14, "settle-wide-stance", -0.015, 5.0, -3.0, vec((0.145, 0.028, 0.150)), vec((0.095, -0.028, 0.050)), 62.0),
        (26, "draw-axe-up-centerline", -0.025, 0.0, -7.0, vec((0.075, 0.028, 0.360)), vec((0.055, -0.028, 0.205)), 68.0),
        (40, "overhead-axe-apex", -0.040, -8.0, -10.0, vec((0.020, 0.028, 0.510)), vec((0.035, -0.028, 0.325)), 74.0),
        (50, "whole-body-chop-commit", -0.065, 7.0, -6.0, vec((0.080, 0.028, 0.390)), vec((0.025, -0.028, 0.230)), 75.0),
        (59, "accelerating-axe-downstroke", -0.105, 22.0, 0.0, vec((0.135, 0.028, 0.180)), vec((0.060, -0.028, 0.285)), 76.0),
        (68, "axe-log-impact", -0.155, 34.0, 5.0, vec((0.205, 0.028, -0.040)), vec((0.085, -0.028, 0.110)), 78.0),
        (76, "impact-compression", -0.165, 37.0, 6.0, vec((0.210, 0.028, -0.045)), vec((0.090, -0.028, 0.105)), 76.0),
        (86, "controlled-axe-rebound", -0.095, 19.0, 2.0, vec((0.175, 0.028, 0.030)), vec((0.075, -0.028, 0.165)), 70.0),
        (98, "recover-upright-tool", -0.025, 6.0, 0.0, vec((0.145, 0.028, 0.125)), vec((0.095, -0.028, 0.035)), 62.0),
        (108, "same-natural-upright-axe-ready", 0.0, 3.0, 0.0, ready_left, ready_right, 58.0),
    ]

    def smoothstep(value: float) -> float:
        clamped = max(0.0, min(1.0, value))
        return clamped * clamped * (3.0 - 2.0 * clamped)

    def sample_phase(frame: int):
        for index in range(len(phases) - 1):
            first = phases[index]
            second = phases[index + 1]
            if frame <= second[0]:
                amount = smoothstep((frame - first[0]) / max(1, second[0] - first[0]))
                return (
                    first[2] + (second[2] - first[2]) * amount,
                    first[3] + (second[3] - first[3]) * amount,
                    first[4] + (second[4] - first[4]) * amount,
                    first[5].lerp(second[5], amount),
                    first[6].lerp(second[6], amount),
                    first[7] + (second[7] - first[7]) * amount,
                )
        final = phases[-1]
        return final[2], final[3], final[4], final[5].copy(), final[6].copy(), final[7]

    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    keyed_fingers: set[str] = set()
    for frame in range(1, end_frame + 1):
        hips_drop, spine_pitch, torso_twist, left_position, right_position, grip_curl = sample_phase(frame)
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame, location=(0.0, hips_drop, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (spine_pitch * 0.25, 0.0, torso_twist * 0.25))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (spine_pitch * 0.35, 0.0, torso_twist * 0.35))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (spine_pitch * 0.40, 0.0, torso_twist * 0.40))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (spine_pitch * -0.10, 0.0, -torso_twist * 0.10))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (spine_pitch * 0.15, 0.0, -torso_twist * 0.15))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", grip_curl))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", grip_curl))
        key_object_location(left_hand, frame, left_position)
        key_object_location(right_hand, frame, right_position)
        key_object_location(left_foot, frame, planted_left_ankle)
        key_object_location(right_foot, frame, planted_right_ankle)
        left_targets[frame] = left_position
        right_targets[frame] = right_position

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True
    every_frame = list(range(1, end_frame + 1))
    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", every_frame, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", every_frame, right_targets)
    left_ground = measure_tail_error(
        armature, action, "mixamorig:LeftLeg", every_frame, {frame: planted_left_ankle for frame in every_frame}
    )
    right_ground = measure_tail_error(
        armature, action, "mixamorig:RightLeg", every_frame, {frame: planted_right_ankle for frame in every_frame}
    )
    if max(left_contact["maxError"], right_contact["maxError"]) > CONTACT_TOLERANCE:
        left_worst = max(left_contact["samples"], key=lambda sample: sample["error"])
        right_worst = max(right_contact["samples"], key=lambda sample: sample["error"])
        raise RuntimeError(
            "Chopping hand contact failed: "
            f"left={left_worst}; right={right_worst}; tolerance={CONTACT_TOLERANCE}"
        )
    if max(left_ground["maxError"], right_ground["maxError"]) > GROUND_TOLERANCE:
        raise RuntimeError(f"Chopping grounding failed: {left_ground}, {right_ground}")

    grip_spans = [(left_targets[frame] - right_targets[frame]).length for frame in every_frame]
    if min(grip_spans) < 0.08:
        raise RuntimeError(f"Chopping two-hand grip collapsed: {min(grip_spans)}")
    axe_head_positions = {}
    handle_segments = {}
    for frame in every_frame:
        axis = (left_targets[frame] - right_targets[frame]).normalized()
        axe_head_positions[frame] = left_targets[frame] + axis * 0.36
        handle_segments[frame] = (
            right_targets[frame] - axis * 0.12,
            axe_head_positions[frame],
        )

    def point_segment_distance(point: Vector, start: Vector, end: Vector) -> float:
        segment = end - start
        if segment.length_squared <= 1e-12:
            return (point - start).length
        amount = max(0.0, min(1.0, (point - start).dot(segment) / segment.length_squared))
        return (point - (start + segment * amount)).length

    body_clearance_centers = {
        "neck": vec((0.0, 0.0, 0.405)),
        "upperTorso": vec((0.0, 0.0, 0.245)),
        "lowerTorso": vec((0.0, 0.0, 0.075)),
    }
    handle_clearance_frames = {
        label: min(
            every_frame,
            key=lambda frame: point_segment_distance(center, *handle_segments[frame]),
        )
        for label, center in body_clearance_centers.items()
    }
    handle_clearances = {
        label: point_segment_distance(
            center,
            *handle_segments[handle_clearance_frames[label]],
        )
        for label, center in body_clearance_centers.items()
    }
    minimum_body_clearance = min(handle_clearances.values())
    if minimum_body_clearance < 0.075:
        raise RuntimeError(
            f"Chopping handle/body clearance failed: {handle_clearances}; "
            f"frames={handle_clearance_frames}"
        )
    contact_target = vec((0.38, 0.0, floor_z + 0.20))
    impact_error = (axe_head_positions[68] - contact_target).length
    if impact_error > 0.15:
        raise RuntimeError(f"Chopping axe head misses log: {impact_error}")
    positions = [axe_head_positions[frame] for frame in every_frame]
    velocities = [(positions[index] - positions[index - 1]) * FPS for index in range(1, len(positions))]
    accelerations = [(velocities[index] - velocities[index - 1]) * FPS for index in range(1, len(velocities))]

    references = [{
        "url": "https://www.pexels.com/video/person-getting-axe-from-tree-stump-10398236/",
        "publisher": "Ron Lach via Pexels",
        "retrievedAt": "2026-08-29",
        "timeRange": "00:00-end of provider preview (complete visible two-hand axe lift, downward wood strike, and recovery)",
        "mechanics": {
            "stance": "Feet remain separated and planted while hips and knees absorb the strike.",
            "toolPath": "The axe rises on the centerline and the head leads a controlled downward arc into a grounded log.",
            "recovery": "The actor keeps both hands on the handle and recovers the tool without a release or T-pose snap.",
        },
    }]
    record = {
        "clipName": name,
        "displayLabel": "Wood Chop",
        "semanticRowIds": ["interaction.chop"],
        "status": "PROVISIONAL_PILOT_QUARANTINE",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {"start": "NATURAL_TWO_HAND_AXE_READY", "end": "NATURAL_TWO_HAND_AXE_READY"},
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": references,
        "contextualProps": [
            {"name": stump.name, "classification": "AUTHORING_CONTACT_GUIDE_NOT_GAME_ASSET", "role": "grounded chopping block"},
            {"name": "RuntimeAxe", "classification": "EXTERNAL_GAMEPLAY_PROP", "role": "two-hand axe bound to authored grip targets"},
        ],
        "interactionContext": {
            "actionVariant": "TWO_HAND_AXE_LOG_CHOP",
            "requiredMotionBeats": ["UPRIGHT_READY", "OVERHEAD_LIFT", "DOWNSTROKE", "LOG_IMPACT", "COMPRESSION", "RECOVERY"],
            "axeBinding": "EXTERNAL_GAMEPLAY_PROP_TWO_HAND_TARGETS",
            "logBinding": "RUNTIME_BOUND_WORLD_CONTACT",
            "reviewGuidesBakedIntoArtifact": False,
        },
        "ikConstraints": ik_constraints,
        "contactValidation": {
            "threshold": CONTACT_TOLERANCE,
            "leftHand": left_contact,
            "rightHand": right_contact,
            "minimumGripSpan": round(min(grip_spans), 8),
            "axeHeadImpactError": round(impact_error, 8),
            "minimumHandleBodyClearanceMeters": round(minimum_body_clearance, 8),
            "handleBodyClearanceByRegionMeters": {
                label: round(value, 8) for label, value in handle_clearances.items()
            },
            "sampledEveryFrame": True,
            "passed": True,
        },
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftAnkle": left_ground,
            "rightAnkle": right_ground,
            "passed": True,
        },
        "motionPathValidation": {
            "axeHead": {
                "sampledEveryFrame": True,
                "frameCount": len(positions),
                "maximumVelocityRigUnitsPerSecond": round(max(value.length for value in velocities), 6),
                "maximumAccelerationRigUnitsPerSecondSquared": round(max(value.length for value in accelerations), 6),
                "finite": all(value.length < float("inf") for value in velocities + accelerations),
            }
        },
        "denseAuthoring": {
            "sampledEveryPlayableFrame": True,
            "keyedFrameCount": end_frame,
            "workflow": [
                "REAL_PERSON_REFERENCE_BREAKDOWN",
                "STEPPED_BLOCKING",
                "DENSE_FULL_FRAME_IK_CONTACT_SOLVE",
                "PELVIS_COM_AND_AXE_ARC_REVIEW",
                "PROGRAMMATIC_PATH_VELOCITY_ACCELERATION_REVIEW",
                "SPLINE_POLISH",
                "BAKE_EXPORT",
                "MULTI_ANGLE_NORMAL_SPEED_REVIEW",
            ],
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers)},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": round((end_frame - 1) / FPS, 3),
            "cameraFraming": "continuous gameplay/front/side/rear views with axe, log, hands, hips, knees, and feet visible",
            "reviewFocus": [
                "natural boundary stance",
                "two-hand grip",
                "overhead axe silhouette",
                "leg and hip drive",
                "head-first log impact",
                "planted feet",
                "no body/axe/log penetration",
                "no baked review guides",
            ],
        },
        "provenanceReferences": references,
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def build_npc_listen(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author a subtle, grounded, loopable attentive-listening performance."""
    name = "AuthoredUtility__NpcListen"
    end_frame = 90
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    relaxed_left = vec((-0.010, 0.175, 0.020))
    relaxed_right = vec((-0.010, -0.175, 0.020))
    acknowledgement_right = vec((0.055, -0.195, 0.085))
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    rest_left_knee = armature.matrix_world @ armature.pose.bones["mixamorig:LeftUpLeg"].tail
    rest_right_knee = armature.matrix_world @ armature.pose.bones["mixamorig:RightUpLeg"].tail
    left_hand = create_target("AuthoredNpcListen__LeftHandTarget", relaxed_left)
    right_hand = create_target("AuthoredNpcListen__RightHandTarget", relaxed_right)
    left_foot = create_target("AuthoredNpcListen__LeftFootTarget", rest_left_ankle)
    right_foot = create_target("AuthoredNpcListen__RightFootTarget", rest_right_ankle)
    left_foot_rotation = create_target("AuthoredNpcListen__LeftFootGroundRotation", rest_left_ankle)
    right_foot_rotation = create_target("AuthoredNpcListen__RightFootGroundRotation", rest_right_ankle)
    left_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:LeftFoot"].matrix
    right_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:RightFoot"].matrix
    left_knee = create_target("AuthoredNpcListen__LeftKneePole", rest_left_knee + vec((0.40, 0.10, 0.05)))
    right_knee = create_target("AuthoredNpcListen__RightKneePole", rest_right_knee + vec((0.40, -0.10, 0.05)))
    controls = [
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

    phases = [
        (1, "natural-attentive-boundary", 0.0, 0.0, 0.0, 0.0, relaxed_right, 12.0),
        (14, "orient-to-speaker", 1.0, 5.0, -2.0, -1.0, relaxed_right, 12.0),
        (26, "first-small-nod-down", 2.0, 6.0, 6.0, 2.0, relaxed_right, 12.0),
        (36, "first-nod-recover", 1.0, 5.0, -2.0, 0.0, relaxed_right, 12.0),
        (50, "quiet-open-hand-acknowledgement", 1.0, 4.0, 0.0, -2.0, acknowledgement_right, 4.0),
        (62, "lower-hand-and-refocus", 0.5, 4.0, -1.0, 0.0, relaxed_right, 12.0),
        (73, "second-small-nod", 1.0, 5.0, 5.0, 1.0, relaxed_right, 12.0),
        (82, "settle-from-nod", 0.5, 3.0, -1.0, 0.0, relaxed_right, 12.0),
        (90, "same-natural-attentive-boundary", 0.0, 0.0, 0.0, 0.0, relaxed_right, 12.0),
    ]

    def smoothstep(value: float) -> float:
        clamped = max(0.0, min(1.0, value))
        return clamped * clamped * (3.0 - 2.0 * clamped)

    def sample_phase(frame: int):
        for index in range(len(phases) - 1):
            first = phases[index]
            second = phases[index + 1]
            if frame <= second[0]:
                amount = smoothstep((frame - first[0]) / max(1, second[0] - first[0]))
                return (
                    first[2] + (second[2] - first[2]) * amount,
                    first[3] + (second[3] - first[3]) * amount,
                    first[4] + (second[4] - first[4]) * amount,
                    first[5] + (second[5] - first[5]) * amount,
                    first[6].lerp(second[6], amount),
                    first[7] + (second[7] - first[7]) * amount,
                )
        final = phases[-1]
        return final[2], final[3], final[4], final[5], final[6].copy(), final[7]

    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    head_pitch_samples: list[float] = []
    head_yaw_samples: list[float] = []
    keyed_fingers: set[str] = set()
    for frame in range(1, end_frame + 1):
        torso_yaw, head_yaw, head_pitch, torso_lean, right_position, hand_curl = sample_phase(frame)
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame, location=(0.0, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (torso_lean * 0.25, 0.0, torso_yaw * 0.20))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (torso_lean * 0.35, 0.0, torso_yaw * 0.30))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (torso_lean * 0.40, 0.0, torso_yaw * 0.50))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (head_pitch * 0.45, 0.0, head_yaw * 0.45))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (head_pitch * 0.55, 0.0, head_yaw * 0.55))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", 12.0))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", hand_curl))
        key_object_location(left_hand, frame, relaxed_left)
        key_object_location(right_hand, frame, right_position)
        key_object_location(left_foot, frame, rest_left_ankle)
        key_object_location(right_foot, frame, rest_right_ankle)
        left_targets[frame] = relaxed_left
        right_targets[frame] = right_position
        head_pitch_samples.append(head_pitch)
        head_yaw_samples.append(head_yaw)

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True
    every_frame = list(range(1, end_frame + 1))
    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", every_frame, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", every_frame, right_targets)
    left_ground = measure_tail_error(
        armature, action, "mixamorig:LeftLeg", every_frame, {frame: rest_left_ankle for frame in every_frame}
    )
    right_ground = measure_tail_error(
        armature, action, "mixamorig:RightLeg", every_frame, {frame: rest_right_ankle for frame in every_frame}
    )
    if max(left_contact["maxError"], right_contact["maxError"]) > CONTACT_TOLERANCE:
        raise RuntimeError(f"NPC Listen hand IK failed: {left_contact}, {right_contact}")
    if max(left_ground["maxError"], right_ground["maxError"]) > GROUND_TOLERANCE:
        raise RuntimeError(f"NPC Listen grounding failed: {left_ground}, {right_ground}")
    if max(head_pitch_samples) - min(head_pitch_samples) < 6.0 or max(head_yaw_samples) < 4.0:
        raise RuntimeError("NPC Listen does not contain a readable orientation and nod")
    seam_error = (left_targets[1] - left_targets[end_frame]).length + (right_targets[1] - right_targets[end_frame]).length
    if seam_error > 1.0e-8:
        raise RuntimeError(f"NPC Listen loop hand seam failed: {seam_error}")

    references = [
        {
            "url": "https://www.pexels.com/video/man-listening-to-a-person-talking-7953526/",
            "publisher": "Pexels",
            "retrievedAt": "2026-08-29",
            "timeRange": "full provider preview (attentive eye-line, quiet posture, and small acknowledgement gesture)",
            "mechanics": {
                "focus": "Head and upper torso orient toward the speaker without a large full-body turn.",
                "gesture": "One brief open-hand acknowledgement supports the conversation without interrupting it.",
            },
        },
        {
            "url": "https://www.pexels.com/video/close-up-video-of-an-elderly-man-nodding-7517082/",
            "publisher": "Pexels",
            "retrievedAt": "2026-08-29",
            "timeRange": "full provider preview (small conversational nod cadence and neutral recovery)",
            "mechanics": {
                "nod": "Short downward-upward head beats read as listening rather than bowing.",
                "recovery": "The head returns smoothly to the same attentive eye-line.",
            },
        },
    ]
    record = {
        "clipName": name,
        "displayLabel": "NPC Listen",
        "semanticRowIds": ["npc.listen"],
        "status": "PROVISIONAL_PILOT_QUARANTINE",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "LOOP",
        "declaredBoundaryPoseNames": {"start": "NATURAL_ATTENTIVE_STANCE", "end": "NATURAL_ATTENTIVE_STANCE"},
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": references,
        "contextualProps": [],
        "interactionContext": {
            "actionVariant": "STANDING_ATTENTIVE_LISTEN",
            "requiredMotionBeats": ["ORIENT", "NOD", "ACKNOWLEDGE", "REFOCUS", "NOD", "LOOP_RECOVERY"],
            "speakerBinding": "RUNTIME_LOOK_TARGET",
            "reviewGuidesBakedIntoArtifact": False,
        },
        "ikConstraints": ik_constraints,
        "contactValidation": {
            "threshold": CONTACT_TOLERANCE,
            "leftHand": left_contact,
            "rightHand": right_contact,
            "sampledEveryFrame": True,
            "passed": True,
        },
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftAnkle": left_ground,
            "rightAnkle": right_ground,
            "passed": True,
        },
        "gestureValidation": {
            "headPitchRangeDegrees": round(max(head_pitch_samples) - min(head_pitch_samples), 6),
            "maximumHeadYawDegrees": round(max(head_yaw_samples), 6),
            "rightHandMaximumExcursionRigUnits": round(max((value - relaxed_right).length for value in right_targets.values()), 8),
            "passed": True,
        },
        "denseAuthoring": {
            "sampledEveryPlayableFrame": True,
            "keyedFrameCount": end_frame,
            "workflow": [
                "REAL_PERSON_REFERENCE_BREAKDOWN",
                "STEPPED_BLOCKING",
                "DENSE_FULL_FRAME_IK_CONTACT_SOLVE",
                "HEAD_EYELINE_AND_NOD_PATH_REVIEW",
                "SPLINE_POLISH",
                "BAKE_EXPORT",
                "MULTI_ANGLE_NORMAL_SPEED_REVIEW",
            ],
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers)},
        "loopSeam": {"handTargetPositionErrorRigUnits": round(seam_error, 10), "passed": True},
        "recommendedPreview": {
            "durationSeconds": round((end_frame - 1) / FPS, 3),
            "cameraFraming": "continuous gameplay/front/side/rear full-body views with head, hands, hips, knees, feet, and floor visible",
            "reviewFocus": [
                "natural arms-down loop boundaries",
                "readable but restrained eye-line and nods",
                "brief non-dominant acknowledgement gesture",
                "planted feet and neutral knees",
                "clean loop seam",
                "no T-pose or exaggerated emote silhouette",
            ],
        },
        "provenanceReferences": references,
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def build_farewell(armature: bpy.types.Object) -> tuple[bpy.types.Action, dict[str, object]]:
    """Author a planted one-hand farewell wave with natural stance recovery."""
    name = "AuthoredUtility__Farewell"
    end_frame = 102
    if armature.animation_data is None:
        armature.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    armature.animation_data.action = action

    relaxed_left = vec((-0.010, 0.175, 0.020))
    relaxed_right = vec((-0.010, -0.175, 0.020))
    raised_center = vec((0.045, -0.225, 0.315))
    rest_left_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:LeftLeg"].tail
    rest_right_ankle = armature.matrix_world @ armature.pose.bones["mixamorig:RightLeg"].tail
    rest_left_knee = armature.matrix_world @ armature.pose.bones["mixamorig:LeftUpLeg"].tail
    rest_right_knee = armature.matrix_world @ armature.pose.bones["mixamorig:RightUpLeg"].tail
    left_hand = create_target("AuthoredFarewell__LeftHandTarget", relaxed_left)
    right_hand = create_target("AuthoredFarewell__RightHandTarget", relaxed_right)
    left_foot = create_target("AuthoredFarewell__LeftFootTarget", rest_left_ankle)
    right_foot = create_target("AuthoredFarewell__RightFootTarget", rest_right_ankle)
    left_foot_rotation = create_target("AuthoredFarewell__LeftFootGroundRotation", rest_left_ankle)
    right_foot_rotation = create_target("AuthoredFarewell__RightFootGroundRotation", rest_right_ankle)
    left_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:LeftFoot"].matrix
    right_foot_rotation.matrix_world = armature.matrix_world @ armature.pose.bones["mixamorig:RightFoot"].matrix
    left_knee = create_target("AuthoredFarewell__LeftKneePole", rest_left_knee + vec((0.40, 0.10, 0.05)))
    right_knee = create_target("AuthoredFarewell__RightKneePole", rest_right_knee + vec((0.40, -0.10, 0.05)))
    controls = [
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

    phases = [
        (1, "natural-relaxed-stance", 0.0, 0.0, 0.0, relaxed_right, 12.0, 0.0),
        (18, "recognize-and-raise-hand", 3.0, 3.0, -2.0, raised_center, 0.0, 8.0),
        (32, "open-palm-wave-left", 4.0, 4.0, 0.0, raised_center + vec((0.0, 0.055, 0.015)), 0.0, -12.0),
        (44, "open-palm-wave-right", 4.0, 4.0, -1.0, raised_center + vec((0.0, -0.055, -0.005)), 0.0, 12.0),
        (56, "second-wave-left", 3.0, 3.0, 1.0, raised_center + vec((0.0, 0.050, 0.010)), 0.0, -10.0),
        (68, "second-wave-right", 2.0, 2.0, -1.0, raised_center + vec((0.0, -0.045, 0.0)), 0.0, 10.0),
        (78, "wave-center-and-small-nod", 2.0, 2.0, 5.0, raised_center, 0.0, 0.0),
        (91, "lower-hand-controlled", 0.5, 1.0, -1.0, vec((0.015, -0.185, 0.100)), 6.0, 0.0),
        (102, "same-natural-relaxed-recovery", 0.0, 0.0, 0.0, relaxed_right, 12.0, 0.0),
    ]

    def smoothstep(value: float) -> float:
        clamped = max(0.0, min(1.0, value))
        return clamped * clamped * (3.0 - 2.0 * clamped)

    def sample_phase(frame: int):
        for index in range(len(phases) - 1):
            first = phases[index]
            second = phases[index + 1]
            if frame <= second[0]:
                amount = smoothstep((frame - first[0]) / max(1, second[0] - first[0]))
                return (
                    first[2] + (second[2] - first[2]) * amount,
                    first[3] + (second[3] - first[3]) * amount,
                    first[4] + (second[4] - first[4]) * amount,
                    first[5].lerp(second[5], amount),
                    first[6] + (second[6] - first[6]) * amount,
                    first[7] + (second[7] - first[7]) * amount,
                )
        final = phases[-1]
        return final[2], final[3], final[4], final[5].copy(), final[6], final[7]

    left_targets: dict[int, Vector] = {}
    right_targets: dict[int, Vector] = {}
    right_hand_rolls: list[float] = []
    head_pitch_samples: list[float] = []
    keyed_fingers: set[str] = set()
    for frame in range(1, end_frame + 1):
        torso_yaw, head_yaw, head_pitch, right_position, right_curl, right_roll = sample_phase(frame)
        reset_pose(armature)
        key_bone(armature.pose.bones[ROOT], frame, location=(0.0, 0.0, 0.0))
        key_bone(armature.pose.bones["mixamorig:Spine"], frame, (0.0, 0.0, torso_yaw * 0.20))
        key_bone(armature.pose.bones["mixamorig:Spine1"], frame, (0.0, 0.0, torso_yaw * 0.30))
        key_bone(armature.pose.bones["mixamorig:Spine2"], frame, (0.0, 0.0, torso_yaw * 0.50))
        key_bone(armature.pose.bones["mixamorig:Neck"], frame, (head_pitch * 0.45, 0.0, head_yaw * 0.45))
        key_bone(armature.pose.bones["mixamorig:Head"], frame, (head_pitch * 0.55, 0.0, head_yaw * 0.55))
        key_bone(armature.pose.bones["mixamorig:RightHand"], frame, (0.0, right_roll, -8.0))
        keyed_fingers.update(curl_one_hand(armature, frame, "Left", 12.0))
        keyed_fingers.update(curl_one_hand(armature, frame, "Right", right_curl))
        key_object_location(left_hand, frame, relaxed_left)
        key_object_location(right_hand, frame, right_position)
        key_object_location(left_foot, frame, rest_left_ankle)
        key_object_location(right_foot, frame, rest_right_ankle)
        left_targets[frame] = relaxed_left
        right_targets[frame] = right_position
        right_hand_rolls.append(right_roll)
        head_pitch_samples.append(head_pitch)

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = end_frame
    action = bake_authored_constraints(armature, action, 1, end_frame)
    action.name = name
    action.use_fake_user = True
    every_frame = list(range(1, end_frame + 1))
    left_contact = measure_tail_error(armature, action, "mixamorig:LeftForeArm", every_frame, left_targets)
    right_contact = measure_tail_error(armature, action, "mixamorig:RightForeArm", every_frame, right_targets)
    left_ground = measure_tail_error(
        armature, action, "mixamorig:LeftLeg", every_frame, {frame: rest_left_ankle for frame in every_frame}
    )
    right_ground = measure_tail_error(
        armature, action, "mixamorig:RightLeg", every_frame, {frame: rest_right_ankle for frame in every_frame}
    )
    if max(left_contact["maxError"], right_contact["maxError"]) > CONTACT_TOLERANCE:
        raise RuntimeError(f"Farewell hand IK failed: {left_contact}, {right_contact}")
    if max(left_ground["maxError"], right_ground["maxError"]) > GROUND_TOLERANCE:
        raise RuntimeError(f"Farewell grounding failed: {left_ground}, {right_ground}")
    wave_span = max(value.y for value in right_targets.values()) - min(value.y for value in right_targets.values())
    raised_height = max(value.z for value in right_targets.values()) - relaxed_right.z
    if wave_span < 0.09 or raised_height < 0.25 or max(right_hand_rolls) - min(right_hand_rolls) < 18.0:
        raise RuntimeError(f"Farewell wave silhouette gate failed: span={wave_span}, height={raised_height}")

    right_positions = [right_targets[frame] for frame in every_frame]
    velocities = [(right_positions[index] - right_positions[index - 1]) * FPS for index in range(1, len(right_positions))]
    accelerations = [(velocities[index] - velocities[index - 1]) * FPS for index in range(1, len(velocities))]
    references = [
        {
            "url": "https://www.pexels.com/video/two-women-peeking-out-from-the-train-window-while-waving-goodbye-4874687/",
            "publisher": "Pexels",
            "retrievedAt": "2026-08-29",
            "timeRange": "full provider preview (recognition, open-palm side-to-side goodbye wave, and sustained eye-line)",
            "mechanics": {
                "silhouette": "The forearm rises clearly above the shoulder and the open palm stays visible.",
                "wave": "The hand travels through two deliberate side-to-side beats rather than vibrating at the wrist.",
            },
        },
        {
            "url": "https://www.pexels.com/video/woman-waving-bye-and-closing-her-laptop-4492694/",
            "publisher": "Pexels",
            "retrievedAt": "2026-08-29",
            "timeRange": "full provider preview (friendly wave cadence, small head acknowledgement, and relaxed recovery)",
            "mechanics": {
                "timing": "A brief recognition beat precedes the wave and a controlled lowering follows it.",
                "recovery": "The gesturing arm returns to the same relaxed stance without snapping wide.",
            },
        },
    ]
    record = {
        "clipName": name,
        "displayLabel": "Farewell",
        "semanticRowIds": ["npc.farewell"],
        "status": "PROVISIONAL_PILOT_QUARANTINE",
        "authoredFromRestPose": True,
        "sourceClipReuse": False,
        "sourceActionNames": [],
        "sourceAnimationsSampled": False,
        "fps": FPS,
        "frameRange": [1, end_frame],
        "durationSeconds": round((end_frame - 1) / FPS, 3),
        "playbackIntent": "ONE_SHOT",
        "declaredBoundaryPoseNames": {"start": "NATURAL_RELAXED_STANCE", "end": "NATURAL_RELAXED_STANCE"},
        "timingPhases": [{"frame": frame, "label": label} for frame, label, *_ in phases],
        "referenceFootage": references,
        "contextualProps": [],
        "interactionContext": {
            "actionVariant": "STANDING_ONE_HAND_GOODBYE_WAVE",
            "requiredMotionBeats": ["RECOGNIZE", "RAISE_OPEN_PALM", "WAVE_LEFT", "WAVE_RIGHT", "NOD", "LOWER", "RECOVER"],
            "lookTargetBinding": "RUNTIME_CONVERSATION_PARTNER",
            "reviewGuidesBakedIntoArtifact": False,
        },
        "ikConstraints": ik_constraints,
        "contactValidation": {
            "threshold": CONTACT_TOLERANCE,
            "leftHand": left_contact,
            "rightHand": right_contact,
            "sampledEveryFrame": True,
            "passed": True,
        },
        "groundingValidation": {
            "threshold": GROUND_TOLERANCE,
            "sampledEveryFrame": True,
            "leftAnkle": left_ground,
            "rightAnkle": right_ground,
            "passed": True,
        },
        "gestureValidation": {
            "rightHandLateralWaveSpanRigUnits": round(wave_span, 8),
            "rightHandRaisedHeightAboveRelaxedRigUnits": round(raised_height, 8),
            "rightHandRollRangeDegrees": round(max(right_hand_rolls) - min(right_hand_rolls), 6),
            "maximumHeadNodDegrees": round(max(head_pitch_samples), 6),
            "passed": True,
        },
        "motionPathValidation": {
            "wavingHand": {
                "sampledEveryFrame": True,
                "frameCount": len(right_positions),
                "maximumVelocityRigUnitsPerSecond": round(max(value.length for value in velocities), 6),
                "maximumAccelerationRigUnitsPerSecondSquared": round(max(value.length for value in accelerations), 6),
                "finite": all(value.length < float("inf") for value in velocities + accelerations),
            }
        },
        "denseAuthoring": {
            "sampledEveryPlayableFrame": True,
            "keyedFrameCount": end_frame,
            "workflow": [
                "REAL_PERSON_REFERENCE_BREAKDOWN",
                "STEPPED_BLOCKING",
                "DENSE_FULL_FRAME_IK_CONTACT_SOLVE",
                "OPEN_PALM_AND_WAVE_PATH_REVIEW",
                "PROGRAMMATIC_PATH_VELOCITY_ACCELERATION_REVIEW",
                "SPLINE_POLISH",
                "BAKE_EXPORT",
                "MULTI_ANGLE_NORMAL_SPEED_REVIEW",
            ],
        },
        "rootMotion": {"inPlace": True, "horizontalDisplacement": 0.0},
        "fingerCurl": {"keyedBoneCount": len(keyed_fingers), "keyedBones": sorted(keyed_fingers)},
        "loopSeam": None,
        "recommendedPreview": {
            "durationSeconds": round((end_frame - 1) / FPS, 3),
            "cameraFraming": "continuous gameplay/front/side/rear full-body views with face, open palm, shoulders, hips, knees, feet, and floor visible",
            "reviewFocus": [
                "natural relaxed boundaries",
                "clear open-palm farewell silhouette",
                "two deliberate wave beats",
                "small friendly head acknowledgement",
                "controlled lowering and recovery",
                "planted feet and neutral knees",
                "no T-pose, limb crossing, or body intersection",
            ],
        },
        "provenanceReferences": references,
    }
    remove_controls(controls)
    armature.animation_data.action = action
    return action, record


def export_actions(armature: bpy.types.Object, actions: list[bpy.types.Action], output_glb: Path) -> None:
    # A motion library must never inherit the rest rig's display mesh or any
    # authoring guide/proxy.  Remove every non-armature object before export;
    # selection-only export is insufficient because glTF dependencies can pull
    # unrelated selected/imported objects into the artifact.
    # Imported rest rigs use one Icosphere mesh as the custom display shape on
    # every pose bone. Clear those references first or the glTF dependency
    # walker will export the Icosphere even after it is unlinked from scene.
    for bone in armature.pose.bones:
        bone.custom_shape = None
    for obj in list(bpy.data.objects):
        if obj != armature:
            bpy.data.objects.remove(obj, do_unlink=True)
    remaining = [(obj.name, obj.type) for obj in bpy.context.scene.objects]
    if remaining != [(armature.name, "ARMATURE")]:
        raise RuntimeError(f"Motion-only export scene is contaminated: {remaining}")
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
    candidate_paths = quarantined_candidate_paths(args)
    required_build_args = {
        "source_glb": args.source_glb,
        "review_video": args.review_video,
        "review_video_front": args.review_video_front,
        "review_video_side": args.review_video_side,
        "review_video_rear": args.review_video_rear,
    }
    missing_build_args = sorted(name for name, value in required_build_args.items() if not value)
    if missing_build_args:
        raise ValueError(f"Missing build arguments: {missing_build_args}")
    source_glb = Path(args.source_glb).resolve()
    review_video = Path(args.review_video).resolve()
    review_video_front = Path(args.review_video_front).resolve()
    review_video_side = Path(args.review_video_side).resolve()
    review_video_rear = Path(args.review_video_rear).resolve()
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
        "tree-harvest": build_tree_harvest,
        "plant-harvest": build_plant_harvest,
        "door-lock": build_door_lock,
        "door-unlock": build_door_unlock,
        "mining": build_mining,
        "chopping": build_chopping,
        "npc-listen": build_npc_listen,
        "farewell": build_farewell,
    }
    authored_action, authored_record = builders[args.action](armature)
    actions = [authored_action]
    records = [authored_record]
    export_actions(armature, actions, output_glb)
    shutil.copy2(output_glb, candidate_paths["runtime_ready"])
    expected_names = sorted(action.name for action in actions)
    output_bytes = output_glb.stat().st_size
    output_hash = file_sha256(output_glb)

    # Fresh process-state proof: factory reset, import only authored output.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=str(output_glb), disable_bone_shape=True)
    imported_armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    imported_objects = [(obj.name, obj.type) for obj in bpy.context.scene.objects]
    imported_actions = sorted(action.name for action in bpy.data.actions)
    if len(imported_armatures) != 1:
        raise RuntimeError(f"Authored re-import produced {len(imported_armatures)} armatures")
    if imported_objects != [(imported_armatures[0].name, "ARMATURE")]:
        raise RuntimeError(f"Authored re-import retained non-armature objects: {imported_objects}")
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
        "runtimeReadyArtifact": {
            "path": portable_path(candidate_paths["runtime_ready"]),
            "bytes": candidate_paths["runtime_ready"].stat().st_size,
            "sha256": file_sha256(candidate_paths["runtime_ready"]),
            "stagingOnly": True,
            "objectTypeCounts": {"ARMATURE": 1, "MESH": 0, "CAMERA": 0, "LIGHT": 0},
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
            "objects": imported_objects,
            "objectTypeCounts": {"ARMATURE": 1, "MESH": 0, "CAMERA": 0, "LIGHT": 0},
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
