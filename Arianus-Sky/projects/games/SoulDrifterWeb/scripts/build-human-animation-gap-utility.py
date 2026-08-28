"""Build source-derived #487 utility animation candidates on the Human pilot rig.

The script never invents a second skeleton and never mutates the canonical
400-clip library.  It samples named actions from that immutable library,
applies the documented deterministic transforms below, bakes the results onto
the same 65-bone armature, exports a candidate-only GLB, and re-imports that GLB
before writing its provenance report.

Run with cached Blender:

    blender --background --python scripts/build-human-animation-gap-utility.py -- \
      --source-glb public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb \
      --output-glb public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-gap-utility-candidates.glb \
      --report public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-gap-utility-candidates-report.json
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from math import cos, floor, pi, sin
from pathlib import Path
import re
import struct
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector


ROOT = "mixamorig:Hips"
EXPECTED_BONES = 65
EXPECTED_ROOTS = [ROOT]
EXPECTED_SOURCE_CLIPS = 400
SOURCE_LIBRARY_SHA256 = "6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793"

IDLE = "Interactions__HumanMasculineAthleticMuscularIdleStandingRelaxed"
LADDER = "Interactions__HumanMasculineAthleticMuscularClimbLadderLoop"
SWIM = "Interactions__HumanMasculineAthleticMuscularSwimForwardLoop"
TREAD = "Interactions__HumanMasculineAthleticMuscularSwimIdleTread"
DEATH_BACK = "Interactions__HumanMasculineAthleticMuscularDeathBack"
PUSH_BUTTON = "Interactions__HumanMasculineAthleticMuscularPushButton"
HARVEST = "Interactions__HumanMasculineAthleticMuscularHarvest"
PULL_LEVER = "Interactions__HumanMasculineAthleticMuscularPullLever"
PICKUP_ITEM = "Interactions__HumanMasculineAthleticMuscularPickupItem"
PICKUP_OBJECT = "Interactions__HumanMasculineAthleticMuscularPickupObject"
THOUGHTFUL_NOD = "Interactions__HumanMasculineAthleticMuscularHeadNodThoughtful"
WAVE = "Interactions__HumanMasculineAthleticMuscularWaveGreeting"
AXE_DOWN = "ProMeleeAxe__StandingMeleeAttackDownward"
AXE_HORIZONTAL = "ProMeleeAxe__StandingMeleeAttackHorizontal"
CROUCH_IDLE = "ProMagic__CrouchIdle"
RUN = "MaleLocomotion__StandardRun"
WALK = "BasicLocomotion__Walking"
WALK_START = "Shooter__StartWalking"
WALK_STOP = "Shooter__StopWalking"
RUN_STOP = "ProLongbow__StandingRunForwardStop"
FALL_LAND_IDLE = "ProLongbow__FallALandToStandingIdle01"
FALL_LAND_RUN = "ProLongbow__FallALandToRunForward"
EXAMINE = "ProLongbow__StandingIdle03Examine"
JUMP = "ProMagic__StandingJumpRunning"

UPPER_PREFIXES = (
    "mixamorig:Spine",
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


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-glb", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--report", required=True)
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def ping_pong(value: float) -> float:
    phase = value % 2.0
    return phase if phase <= 1.0 else 2.0 - phase


def matrix_with_translation(matrix: Matrix, translation: Vector) -> Matrix:
    _, rotation, scale = matrix.decompose()
    return Matrix.LocRotScale(translation, rotation, scale)


def blend_matrix(left: Matrix, right: Matrix, weight: float) -> Matrix:
    left_location, left_rotation, left_scale = left.decompose()
    right_location, right_rotation, right_scale = right.decompose()
    return Matrix.LocRotScale(
        left_location.lerp(right_location, weight),
        left_rotation.slerp(right_rotation, weight),
        left_scale.lerp(right_scale, weight),
    )


class Baker:
    def __init__(self, armature: bpy.types.Object, source_actions: dict[str, bpy.types.Action]):
        self.armature = armature
        self.source_actions = source_actions
        self.bone_names = [bone.name for bone in armature.pose.bones]
        self.cache: dict[tuple[str, int], dict[str, Matrix]] = {}

    def sample(self, action_name: str, normalized_time: float) -> dict[str, Matrix]:
        key = (action_name, round(max(0.0, min(1.0, normalized_time)) * 1_000_000))
        if key in self.cache:
            return {name: matrix.copy() for name, matrix in self.cache[key].items()}
        action = self.source_actions[action_name]
        start, end = action.frame_range
        source_frame = float(start) + (float(end) - float(start)) * max(0.0, min(1.0, normalized_time))
        whole_frame = floor(source_frame)
        self.armature.animation_data.action = action
        bpy.context.scene.frame_set(whole_frame, subframe=source_frame - whole_frame)
        bpy.context.view_layer.update()
        pose = {bone.name: bone.matrix_basis.copy() for bone in self.armature.pose.bones}
        self.cache[key] = pose
        return {name: matrix.copy() for name, matrix in pose.items()}

    def blend(self, left: dict[str, Matrix], right: dict[str, Matrix], weight: float) -> dict[str, Matrix]:
        return {name: blend_matrix(left[name], right[name], weight) for name in self.bone_names}

    def overlay(self, base: dict[str, Matrix], upper: dict[str, Matrix], weight: float = 1.0) -> dict[str, Matrix]:
        result = {name: matrix.copy() for name, matrix in base.items()}
        for name in self.bone_names:
            if name.startswith(UPPER_PREFIXES):
                result[name] = blend_matrix(result[name], upper[name], weight)
        return result

    def rotate_bone(self, pose: dict[str, Matrix], bone_name: str, axis: tuple[float, float, float], angle: float) -> None:
        location, rotation, scale = pose[bone_name].decompose()
        pose[bone_name] = Matrix.LocRotScale(location, Quaternion(axis, angle) @ rotation, scale)

    def bake(self, name: str, frames: int, producer) -> bpy.types.Action:
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        for output_frame in range(1, frames + 1):
            normalized_time = (output_frame - 1) / max(1, frames - 1)
            pose = producer(normalized_time)
            self.armature.animation_data.action = action
            bpy.context.scene.frame_set(output_frame)
            for bone in self.armature.pose.bones:
                bone.rotation_mode = "QUATERNION"
                bone.matrix_basis = pose[bone.name]
                bone.keyframe_insert("location", frame=output_frame, group=bone.name)
                bone.keyframe_insert("rotation_quaternion", frame=output_frame, group=bone.name)
                bone.keyframe_insert("scale", frame=output_frame, group=bone.name)
        self.armature.animation_data.action = None
        self.source_actions[name] = action
        return action


def pose_digest(baker: Baker, action_name: str, sample_count: int = 33) -> str:
    digest = sha256()
    for sample_index in range(sample_count):
        pose = baker.sample(action_name, sample_index / (sample_count - 1))
        for bone_name in sorted(pose):
            digest.update(bone_name.encode("utf-8"))
            digest.update(struct.pack("<16f", *(value for row in pose[bone_name] for value in row)))
    return digest.hexdigest().upper()


def review_metadata(name: str, requirements: list[str], frames: int) -> dict[str, object]:
    semantic = requirements[0]
    raw_label = name.split("__", 1)[-1].removesuffix("Candidate")
    loop_tokens = ("Loop", "Shimmy", "Underwater", "Lockpick", "Valve", "Mining", "Chop", "Carry", "Listen", "Stairs")
    playback_intent = "LOOP" if any(token in raw_label for token in loop_tokens) else "ONE_SHOT"
    if semantic.startswith("npc."):
        camera = "chest-up three-quarter view with face and both hands visible"
    elif semantic.startswith("water.") or semantic == "death.drowning":
        camera = "full-body side three-quarter view with waterline and root displacement visible"
    elif semantic.startswith("interaction."):
        camera = "full-body three-quarter view with both hands, contact target, and feet visible"
    else:
        camera = "full-body side view with root travel and both foot contacts visible"
    clip_duration = frames / 30.0
    duration = max(4.0, clip_duration * 2.0) if playback_intent == "LOOP" else max(3.0, clip_duration + 1.0)
    return {
        "displayLabel": re.sub(r"(?<!^)(?=[A-Z])", " ", raw_label),
        "semanticRowIds": requirements,
        "derivedActionName": name,
        "playbackIntent": playback_intent,
        "recommendedPreview": {
            "durationSeconds": round(duration, 2),
            "cameraFraming": camera,
        },
    }


def main() -> None:
    args = parse_args()
    source_glb = Path(args.source_glb).resolve()
    output_glb = Path(args.output_glb).resolve()
    report_path = Path(args.report).resolve()
    script_path = Path(__file__).resolve()
    if not source_glb.is_file():
        raise FileNotFoundError(source_glb)
    if file_sha256(source_glb) != SOURCE_LIBRARY_SHA256:
        raise RuntimeError("The canonical 400-clip source library hash changed")
    output_glb.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source_glb))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one source armature, got {len(armatures)}")
    armature = armatures[0]
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if len(armature.data.bones) != EXPECTED_BONES or roots != EXPECTED_ROOTS:
        raise RuntimeError(f"Unexpected source skeleton: bones={len(armature.data.bones)}, roots={roots}")
    source_actions = {action.name: action for action in bpy.data.actions}
    if len(source_actions) != EXPECTED_SOURCE_CLIPS:
        raise RuntimeError(f"Expected 400 source actions, got {len(source_actions)}")
    if armature.animation_data is None:
        armature.animation_data_create()
    armature.animation_data.action = None
    while armature.animation_data.nla_tracks:
        armature.animation_data.nla_tracks.remove(armature.animation_data.nla_tracks[0])
    for bone in armature.pose.bones:
        bone.rotation_mode = "QUATERNION"

    baker = Baker(armature, source_actions)
    generated: list[dict[str, object]] = []

    def add(name: str, requirements: list[str], sources: list[str], frames: int, transform: dict[str, object], producer) -> None:
        missing = [source for source in sources if source not in source_actions]
        if missing:
            raise RuntimeError(f"{name}: missing source actions {missing}")
        action = baker.bake(name, frames, producer)
        generated.append({
            "clipName": name,
            "requirements": requirements,
            "candidateStatus": "SOURCE_DERIVED_VISUAL_REVIEW_REQUIRED",
            "sourceActionNames": sources,
            "sourceActions": [
                {"clipName": source, "poseSampleSha256": pose_digest(baker, source)}
                for source in sources
            ],
            "transform": transform,
            "frameRange": [float(value) for value in action.frame_range],
            "fps": 30,
            **review_metadata(name, requirements, frames),
        })

    def shimmy(direction: float):
        source_start = baker.sample(LADDER, 0.0)[ROOT].to_translation()
        source_end = baker.sample(LADDER, 1.0)[ROOT].to_translation()
        lateral_distance = abs(source_end.y - source_start.y) * 3.2
        def produce(t: float):
            pose = baker.sample(LADDER, (t * 2.0) % 1.0 if t < 1.0 else 1.0)
            root = pose[ROOT].to_translation()
            root.x = source_start.x + direction * lateral_distance * t
            root.y = source_start.y
            root.z = source_start.z
            pose[ROOT] = matrix_with_translation(pose[ROOT], root)
            return pose
        return produce

    add("GapUtility__ShimmyLeftCandidate", ["locomotion.shimmy"], [LADDER], 49,
        {"operation": "two-cycle ladder-limb motion with source vertical root delta remapped to left lateral travel"}, shimmy(-1.0))
    add("GapUtility__ShimmyRightCandidate", ["locomotion.shimmy"], [LADDER], 49,
        {"operation": "two-cycle ladder-limb motion with source vertical root delta remapped to right lateral travel"}, shimmy(1.0))

    jump_end = baker.sample(JUMP, 0.72)[ROOT].to_translation()
    swim_start = baker.sample(SWIM, 0.0)[ROOT].to_translation()
    def dive(t: float):
        jump_pose = baker.sample(JUMP, min(0.72, t / 0.62 * 0.72))
        swim_pose = baker.sample(SWIM, max(0.0, (t - 0.42) / 0.58) * 0.28)
        swim_root = swim_pose[ROOT].to_translation() + (jump_end - swim_start)
        swim_pose[ROOT] = matrix_with_translation(swim_pose[ROOT], swim_root)
        pose = baker.blend(jump_pose, swim_pose, smoothstep((t - 0.42) / 0.24))
        root = pose[ROOT].to_translation()
        root.y -= 0.55 * smoothstep((t - 0.48) / 0.52)
        pose[ROOT] = matrix_with_translation(pose[ROOT], root)
        return pose
    add("GapUtility__WaterDiveCandidate", ["water.dive"], [JUMP, SWIM], 73,
        {"operation": "trim running jump before landing, crossfade to swim stroke, then apply 0.55m source-root descent"}, dive)

    def underwater(t: float):
        pose = baker.sample(SWIM, t)
        root = pose[ROOT].to_translation()
        root.y += -0.45 + 0.06 * sin(2.0 * pi * t)
        pose[ROOT] = matrix_with_translation(pose[ROOT], root)
        return pose
    add("GapUtility__UnderwaterSwimCandidate", ["water.underwater-swim"], [SWIM], 110,
        {"operation": "preserve swim stroke and forward root motion with 0.45m depth bias and 0.06m depth cycle"}, underwater)

    swim_origin = baker.sample(SWIM, 0.0)[ROOT].to_translation()
    tread_origin = baker.sample(TREAD, 0.0)[ROOT].to_translation()
    def surface(t: float):
        swim_pose = baker.sample(SWIM, t * 0.22)
        swim_root = swim_pose[ROOT].to_translation()
        swim_root.y -= 0.45 * (1.0 - smoothstep(t))
        swim_pose[ROOT] = matrix_with_translation(swim_pose[ROOT], swim_root)
        tread_pose = baker.sample(TREAD, t)
        tread_root = tread_pose[ROOT].to_translation() + (swim_origin - tread_origin)
        tread_pose[ROOT] = matrix_with_translation(tread_pose[ROOT], tread_root)
        return baker.blend(swim_pose, tread_pose, smoothstep((t - 0.35) / 0.45))
    add("GapUtility__OpenWaterSurfaceCandidate", ["water.surface.open"], [SWIM, TREAD], 65,
        {"operation": "blend submerged forward stroke into aligned tread while removing 0.45m depth bias"}, surface)

    tread_seam = baker.sample(TREAD, 0.5)[ROOT].to_translation()
    death_origin = baker.sample(DEATH_BACK, 0.0)[ROOT].to_translation()
    def drown(t: float):
        tread_pose = baker.sample(TREAD, (t * 1.8) % 1.0)
        death_pose = baker.sample(DEATH_BACK, max(0.0, (t - 0.42) / 0.58))
        death_root = death_pose[ROOT].to_translation() + (tread_seam - death_origin)
        death_pose[ROOT] = matrix_with_translation(death_pose[ROOT], death_root)
        pose = baker.blend(tread_pose, death_pose, smoothstep((t - 0.42) / 0.20))
        root = pose[ROOT].to_translation()
        root.y -= 0.9 * smoothstep((t - 0.55) / 0.45)
        pose[ROOT] = matrix_with_translation(pose[ROOT], root)
        return pose
    add("GapUtility__DrowningCandidate", ["death.drowning"], [TREAD, DEATH_BACK], 121,
        {"operation": "tread struggle crossfaded to aligned backward collapse with terminal 0.9m sink"}, drown)

    def lock_motion(reverse: bool):
        def produce(t: float):
            pose = baker.sample(PUSH_BUTTON, 1.0 - t if reverse else t)
            sign = -1.0 if reverse else 1.0
            baker.rotate_bone(pose, "mixamorig:RightForeArm", (0.0, 0.0, 1.0), sign * 0.38 * sin(pi * t))
            baker.rotate_bone(pose, "mixamorig:RightHand", (1.0, 0.0, 0.0), sign * 0.48 * sin(pi * t))
            return pose
        return produce
    add("GapUtility__DoorLockCandidate", ["interaction.door.lock-unlock"], [PUSH_BUTTON], 61,
        {"operation": "button reach retimed forward with deterministic right wrist and forearm key-turn arc"}, lock_motion(False))
    add("GapUtility__DoorUnlockCandidate", ["interaction.door.lock-unlock"], [PUSH_BUTTON], 61,
        {"operation": "button reach reversed with opposing deterministic right wrist and forearm key-turn arc"}, lock_motion(True))

    def lockpick(t: float):
        lower = baker.sample(CROUCH_IDLE, (t * 1.5) % 1.0)
        upper = baker.sample(HARVEST, (t * 2.0) % 1.0)
        return baker.overlay(lower, upper, 0.78)
    add("GapUtility__LockpickCandidate", ["interaction.lockpick"], [CROUCH_IDLE, HARVEST], 97,
        {"operation": "crouch lower-body loop with 78% two-cycle harvest hand-motion upper-body overlay"}, lockpick)

    def valve(t: float):
        pose = baker.sample(PULL_LEVER, ping_pong(t * 2.0))
        arc = 0.42 * sin(4.0 * pi * t)
        baker.rotate_bone(pose, "mixamorig:RightHand", (0.0, 1.0, 0.0), arc)
        baker.rotate_bone(pose, "mixamorig:LeftHand", (0.0, 1.0, 0.0), -arc)
        return pose
    add("GapUtility__ValveTurnCandidate", ["interaction.valve"], [PULL_LEVER], 97,
        {"operation": "two ping-pong lever cycles with opposing 0.42-radian hand arcs"}, valve)

    add("GapUtility__MiningCandidate", ["interaction.mine"], [AXE_DOWN], 97,
        {"operation": "two complete downward axe-contact cycles"}, lambda t: baker.sample(AXE_DOWN, (t * 2.0) % 1.0 if t < 1.0 else 1.0))
    add("GapUtility__WoodChopCandidate", ["interaction.chop"], [AXE_HORIZONTAL], 97,
        {"operation": "two complete horizontal axe-contact cycles"}, lambda t: baker.sample(AXE_HORIZONTAL, (t * 2.0) % 1.0 if t < 1.0 else 1.0))

    add("GapUtility__LiftCandidate", ["interaction.lift-carry-place"], [PICKUP_OBJECT], 73,
        {"operation": "complete source heavy-object pickup"}, lambda t: baker.sample(PICKUP_OBJECT, t))
    carry_pose = baker.sample(PICKUP_OBJECT, 0.58)
    def carry(t: float):
        walking = baker.sample(WALK, (t * 2.0) % 1.0 if t < 1.0 else 1.0)
        return baker.overlay(walking, carry_pose, 1.0)
    add("GapUtility__CarryLoopCandidate", ["interaction.lift-carry-place"], [PICKUP_OBJECT, WALK], 97,
        {"operation": "two-cycle walk lower body with held-object pickup pose upper-body overlay"}, carry)
    add("GapUtility__PlaceCandidate", ["interaction.lift-carry-place"], [PICKUP_OBJECT], 73,
        {"operation": "time-reversed heavy-object pickup for controlled placement"}, lambda t: baker.sample(PICKUP_OBJECT, 1.0 - t))

    def listen(t: float):
        return baker.overlay(baker.sample(IDLE, t), baker.sample(THOUGHTFUL_NOD, t), 0.45)
    add("GapUtility__NpcListenCandidate", ["npc.listen"], [IDLE, THOUGHTFUL_NOD], 121,
        {"operation": "relaxed idle with 45% thoughtful-nod upper-body overlay"}, listen)
    add("GapUtility__NpcFarewellCandidate", ["npc.farewell"], [WAVE], 121,
        {"operation": "time-reversed greeting wave to produce neutral-to-dismissive farewell cadence"}, lambda t: baker.sample(WAVE, 1.0 - t))

    add("GapUtility__WalkStartCandidate", ["locomotion.start-stop"], [WALK_START], 49,
        {"operation": "complete source walk-start transition"}, lambda t: baker.sample(WALK_START, t))
    add("GapUtility__WalkStopCandidate", ["locomotion.start-stop"], [WALK_STOP], 49,
        {"operation": "complete source walk-stop transition"}, lambda t: baker.sample(WALK_STOP, t))
    add("GapUtility__RunStartCandidate", ["locomotion.start-stop"], [WALK_START], 37,
        {"operation": "walk-start retimed to 75% duration with forward root displacement scaled 1.65x"},
        lambda t: root_scale(baker, WALK_START, t, 1.65))
    add("GapUtility__RunStopCandidate", ["locomotion.start-stop"], [RUN_STOP], 49,
        {"operation": "complete source run-to-stop transition"}, lambda t: baker.sample(RUN_STOP, t))

    def fall_loop(t: float):
        phase = ping_pong(t * 2.0) * 0.36
        pose = baker.sample(FALL_LAND_IDLE, phase)
        root = pose[ROOT].to_translation()
        start = baker.sample(FALL_LAND_IDLE, 0.0)[ROOT].to_translation()
        root.x, root.y, root.z = start.x, start.y, start.z
        pose[ROOT] = matrix_with_translation(pose[ROOT], root)
        return pose
    add("GapUtility__NeutralFallLoopCandidate", ["locomotion.fall.loop"], [FALL_LAND_IDLE], 65,
        {"operation": "first 36% airborne window ping-ponged twice with root translation held in-place"}, fall_loop)

    def neutral_land_run(t: float):
        landing = baker.sample(FALL_LAND_RUN, t)
        neutral_run = baker.sample(RUN, t)
        return baker.overlay(landing, neutral_run, smoothstep((t - 0.48) / 0.35))
    add("GapUtility__NeutralLandToRunCandidate", ["locomotion.land.running"], [FALL_LAND_RUN, RUN], 73,
        {"operation": "source land-to-run with upper body crossfaded to neutral run after foot contact"}, neutral_land_run)

    for direction, source in (
        ("Forward", "ProLongbow__StandingDodgeForward"),
        ("Backward", "ProLongbow__StandingDodgeBackward"),
        ("Left", "ProLongbow__StandingDodgeLeft"),
        ("Right", "ProLongbow__StandingDodgeRight"),
    ):
        add(f"GapUtility__Dodge{direction}Candidate", ["locomotion.dodge.directional"], [source, IDLE], 49,
            {"operation": "source directional dodge with 60% neutral idle upper-body overlay"},
            lambda t, source=source: baker.overlay(baker.sample(source, t), baker.sample(IDLE, t), 0.60))

    def stairs(t: float, direction: float):
        pose = baker.sample(WALK, (t * 2.0) % 1.0 if t < 1.0 else 1.0)
        root = pose[ROOT].to_translation()
        source_start = baker.sample(WALK, 0.0)[ROOT].to_translation()
        source_end = baker.sample(WALK, 1.0)[ROOT].to_translation()
        root.y = source_start.y + direction * abs(source_end.z - source_start.z) * 0.42 * t + 0.025 * (1.0 - cos(8.0 * pi * t))
        pose[ROOT] = matrix_with_translation(pose[ROOT], root)
        return pose
    add("GapUtility__StairsAscendCandidate", ["locomotion.stairs"], [WALK], 97,
        {"operation": "two walk cycles with forward root distance remapped to 42% vertical ascent plus four-step contact bob"}, lambda t: stairs(t, 1.0))
    add("GapUtility__StairsDescendCandidate", ["locomotion.stairs"], [WALK], 97,
        {"operation": "two walk cycles with forward root distance remapped to 42% vertical descent plus four-step contact bob"}, lambda t: stairs(t, -1.0))

    def ground_loot(t: float):
        if t < 0.55:
            return baker.sample(PICKUP_ITEM, t / 0.55)
        picked = baker.sample(PICKUP_ITEM, 1.0)
        examined = baker.sample(EXAMINE, (t - 0.55) / 0.45)
        return baker.overlay(picked, examined, smoothstep((t - 0.55) / 0.25))
    add("GapUtility__LootInspectGroundCandidate", ["interaction.loot-inspect"], [PICKUP_ITEM, EXAMINE], 121,
        {"operation": "ground pickup followed by upper-body crossfade into source examination"}, ground_loot)
    add("GapUtility__LootInspectStandingCandidate", ["interaction.loot-inspect"], [EXAMINE], 121,
        {"operation": "complete source standing examination"}, lambda t: baker.sample(EXAMINE, t))

    generated_actions = [bpy.data.actions[record["clipName"]] for record in generated]
    generated_names = [action.name for action in generated_actions]
    for record in generated:
        record["generatedPoseSampleSha256"] = pose_digest(baker, record["clipName"])

    armature.animation_data.action = None
    for action in generated_actions:
        track = armature.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, int(round(action.frame_range[0])), action)
        strip.action_frame_start, strip.action_frame_end = action.frame_range
    bpy.context.scene.render.fps = 30
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="NLA_TRACKS",
        export_force_sampling=True, export_frame_step=1, export_skins=True,
        export_def_bones=False, export_leaf_bone=False, export_materials="NONE",
        export_cameras=False, export_lights=False, export_extras=True, export_yup=True,
    )

    output_bytes = output_glb.stat().st_size
    output_hash = file_sha256(output_glb)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(output_glb))
    imported_armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    imported_actions = sorted(action.name for action in bpy.data.actions)
    if len(imported_armatures) != 1:
        raise RuntimeError(f"Candidate re-import produced {len(imported_armatures)} armatures")
    imported_armature = imported_armatures[0]
    imported_roots = [bone.name for bone in imported_armature.data.bones if bone.parent is None]
    if len(imported_armature.data.bones) != EXPECTED_BONES or imported_roots != EXPECTED_ROOTS:
        raise RuntimeError("Candidate re-import failed the canonical 65-bone skeleton gate")
    if imported_actions != sorted(generated_names):
        raise RuntimeError("Candidate re-import action names differ from the generated catalog")

    requirements = sorted({requirement for record in generated for requirement in record["requirements"]})
    report = {
        "schemaVersion": 1,
        "issue": 487,
        "assetClass": "HUMAN_ANIMATION_SOURCE_DERIVED_CANDIDATES",
        "sourceDerivedOnly": True,
        "visualReviewStatus": "REQUIRED",
        "productionApproval": False,
        "blenderVersion": bpy.app.version_string,
        "script": str(script_path),
        "scriptSha256": file_sha256(script_path),
        "sourceLibrary": {
            "path": str(source_glb), "bytes": source_glb.stat().st_size,
            "sha256": file_sha256(source_glb), "clipCount": EXPECTED_SOURCE_CLIPS,
            "boneCount": EXPECTED_BONES, "rootBones": EXPECTED_ROOTS,
        },
        "coveredRequirements": requirements,
        "clipCount": len(generated),
        "clips": generated,
        "output": {"path": str(output_glb), "bytes": output_bytes, "sha256": output_hash},
        "reimportValidation": {
            "passed": True, "armatureCount": 1,
            "boneCount": len(imported_armature.data.bones), "rootBones": imported_roots,
            "clipCount": len(imported_actions), "clipNames": imported_actions,
        },
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("HUMAN_GAP_UTILITY=" + json.dumps({
        "clipCount": len(generated), "requirements": len(requirements),
        "outputGlbBytes": output_bytes, "outputGlbSha256": output_hash,
        "reimportBoneCount": report["reimportValidation"]["boneCount"],
    }, sort_keys=True))


def root_scale(baker: Baker, source: str, normalized_time: float, multiplier: float) -> dict[str, Matrix]:
    pose = baker.sample(source, normalized_time)
    start = baker.sample(source, 0.0)[ROOT].to_translation()
    location = pose[ROOT].to_translation()
    location = start + (location - start) * multiplier
    pose[ROOT] = matrix_with_translation(pose[ROOT], location)
    return pose


if __name__ == "__main__":
    main()
