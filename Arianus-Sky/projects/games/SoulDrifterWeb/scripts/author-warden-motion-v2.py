"""Author source-grounded Warden motion-v2 clips on an existing owned rig.

This never creates or repairs geometry. It imports one pinned GLB, replaces only
the named plan actions with rest-relative poses, and exports a versioned draft.
"""
from __future__ import annotations

import argparse
from hashlib import sha256
import importlib.util
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector


def args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--input-sha256", required=True)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--clip")
    return parser.parse_args(values)


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def legacy_module(script_root: Path):
    path = script_root / "rig-cinderbound-wardens.py"
    spec = importlib.util.spec_from_file_location("warden_rig_legacy", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load the owned Warden authoring helpers")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def pose_payload(phase: dict, degrees) -> dict:
    result = {}
    for bone, values in phase["bones"].items():
        converted = {}
        if "rotation" in values:
            converted["rotation"] = degrees(*values["rotation"])
        if "location" in values:
            converted["location"] = tuple(values["location"])
        if set(values) - {"rotation", "location"}:
            raise RuntimeError(f"{phase['id']}: unsupported pose channel")
        result[bone] = converted
    return result


def evaluated_surface_floor(meshes: list[bpy.types.Object]) -> float:
    """Return the lowest actual deformed surface point in Blender world Z."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    floor = float("inf")
    for mesh in meshes:
        evaluated_object = mesh.evaluated_get(depsgraph)
        evaluated_mesh = evaluated_object.to_mesh()
        try:
            floor = min(floor, min((evaluated_object.matrix_world @ vertex.co).z for vertex in evaluated_mesh.vertices))
        finally:
            evaluated_object.to_mesh_clear()
    if floor == float("inf"):
        raise RuntimeError("Cannot ground an empty Warden surface")
    return floor


def plant_action_surface(
    armature, meshes, action, duration_frames: int, target_floor: float, surface_inset: float = 0.0
) -> dict:
    """Bake 30 Hz root-Y corrections so the real four-mesh surface stays planted."""
    root = armature.pose.bones.get("root")
    if root is None:
        raise RuntimeError("Grounding requires the owned root bone")
    armature.animation_data.action = action
    contact_floor = target_floor - surface_inset
    corrections = []
    for frame in range(1, duration_frames + 1):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        correction = contact_floor - evaluated_surface_floor(meshes)
        root.location.y += correction
        root.keyframe_insert(data_path="location", index=1, frame=frame, group=root.name)
        corrections.append(correction)
    residuals = []
    for frame in range(1, duration_frames + 1):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        residuals.append(evaluated_surface_floor(meshes) - contact_floor)
    max_residual = max(abs(value) for value in residuals)
    if max_residual > 0.0001:
        raise RuntimeError(f"{action.name}: planted-surface residual {max_residual:.6f}m")
    return {
        "frames": duration_frames,
        "surfaceInsetMeters": surface_inset,
        "maxAbsCorrectionMeters": max(abs(value) for value in corrections),
        "maxAbsResidualMeters": max_residual,
    }


def solve_hand_target(armature, hand_name: str, root_relative_target: list[float], frame: int) -> dict:
    """CCD-solve an owned two-link arm to an explicit world-space review target."""
    chains = {
        "hand_L": ("lower_arm_L", "upper_arm_L"),
        "hand_R": ("lower_arm_R", "upper_arm_R"),
    }
    if hand_name not in chains:
        raise RuntimeError(f"Unsupported Warden hand target {hand_name}")
    hand = armature.pose.bones.get(hand_name)
    root = armature.pose.bones.get("root")
    joints = [armature.pose.bones.get(name) for name in chains[hand_name]]
    if hand is None or root is None or any(joint is None for joint in joints):
        raise RuntimeError(f"Incomplete Warden IK chain for {hand_name}")
    target = armature.matrix_world @ root.head + Vector(root_relative_target)
    inverse_armature = armature.matrix_world.inverted()
    iterations = 0
    for iterations in range(1, 65):
        for joint in joints:
            bpy.context.view_layer.update()
            joint_point = armature.matrix_world @ joint.head
            end_point = armature.matrix_world @ hand.head
            toward_end = end_point - joint_point
            toward_target = target - joint_point
            if toward_end.length < 1e-7 or toward_target.length < 1e-7:
                continue
            correction = toward_end.rotation_difference(toward_target)
            if correction.angle > math.radians(12):
                correction = Quaternion(correction.axis, math.radians(12))
            joint_world = armature.matrix_world @ joint.matrix
            rotate_about_joint = (
                Matrix.Translation(joint_point)
                @ correction.to_matrix().to_4x4()
                @ Matrix.Translation(-joint_point)
            )
            joint.matrix = inverse_armature @ rotate_about_joint @ joint_world
        bpy.context.view_layer.update()
        residual = (armature.matrix_world @ hand.head - target).length
        if residual <= 0.001:
            break
    residual = (armature.matrix_world @ hand.head - target).length
    if residual > 0.01:
        actual = armature.matrix_world @ hand.head
        shoulder = armature.matrix_world @ joints[-1].head
        raise RuntimeError(
            f"{hand_name} frame {frame}: target residual {residual:.6f}m; "
            f"target={tuple(round(value, 6) for value in target)}; "
            f"actual={tuple(round(value, 6) for value in actual)}; "
            f"shoulder={tuple(round(value, 6) for value in shoulder)}"
        )
    for joint in joints:
        joint.keyframe_insert(data_path="rotation_euler", frame=frame, group=joint.name)
    return {
        "target": list(target),
        "actual": list(armature.matrix_world @ hand.head),
        "residualMeters": residual,
        "iterations": iterations,
    }


def main() -> None:
    options = args()
    source, plan_path = Path(options.input).resolve(), Path(options.plan).resolve()
    output, report_path = Path(options.output).resolve(), Path(options.report).resolve()
    expected_sha = options.input_sha256.lower()
    if digest(source) != expected_sha:
        raise RuntimeError("Pinned input SHA-256 does not match")
    plan_bytes = plan_path.read_bytes()
    plan = json.loads(plan_bytes)
    if plan.get("schemaVersion") != 1 or plan.get("rules", {}).get("phaseCount") != 8:
        raise RuntimeError("Unsupported Warden motion plan")
    selected_clips = [clip for clip in plan["clips"] if options.clip is None or clip["name"] == options.clip]
    if not selected_clips:
        raise RuntimeError(f"Requested Warden clip {options.clip!r} is not in the pinned plan")
    legacy = legacy_module(Path(__file__).resolve().parent)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = plan["fps"]
    bpy.ops.import_scene.gltf(filepath=str(source))
    armatures = [node for node in bpy.context.scene.objects if node.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one mechanical armature; got {len(armatures)}")
    armature = armatures[0]
    # The reviewed authoring GLB may carry an unparented furnace-light helper.
    # Export only the four armature-owned mechanical surfaces; never weaken the
    # contract by silently accepting or exporting arbitrary scene meshes.
    meshes = [node for node in bpy.context.scene.objects if node.type == "MESH"
              and node.parent == armature
              and any(modifier.type == "ARMATURE" and modifier.object == armature for modifier in node.modifiers)]
    if len(meshes) != 4:
        raise RuntimeError(f"Expected four armature-owned mechanical meshes; got {len(meshes)}")
    actual_bones = sorted(bone.name for bone in armature.data.bones)
    if actual_bones != sorted(plan["boneContract"]):
        raise RuntimeError("Warden bone contract does not match the selected owned rig")
    source_actions = sorted(action.name for action in bpy.data.actions)
    replacements = {clip["name"] for clip in selected_clips}
    for action in list(bpy.data.actions):
        if action.name in replacements:
            bpy.data.actions.remove(action)
    armature.animation_data_create()
    armature.animation_data.action = None
    legacy.reset_pose(armature)
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    source_floor = evaluated_surface_floor(meshes)
    for clip in selected_clips:
        phases = clip["phases"]
        if len(phases) != 8 or phases[0]["frame"] != 1 or phases[-1]["frame"] != clip["durationFrames"]:
            raise RuntimeError(f"{clip['name']}: exact eight-phase boundary contract failed")
        frames = [phase["frame"] for phase in phases]
        if frames != sorted(set(frames)):
            raise RuntimeError(f"{clip['name']}: phase frames must be strictly increasing")
        authored = {phase["frame"]: pose_payload(phase, legacy.degrees) for phase in phases}
        legacy.author_action(armature, clip["name"], authored, bool(clip["loop"]))
    target_solutions = {}
    for clip in selected_clips:
        armature.animation_data.action = bpy.data.actions[clip["name"]]
        for phase in clip["phases"]:
            if not phase.get("handTargets"):
                continue
            bpy.context.scene.frame_set(phase["frame"])
            bpy.context.view_layer.update()
            key = f"{clip['name']}:{phase['id']}"
            target_solutions[key] = {
                hand: solve_hand_target(armature, hand, target, phase["frame"])
                for hand, target in phase["handTargets"].items()
            }
    grounding = {}
    for clip in selected_clips:
        grounding[clip["name"]] = plant_action_surface(
            armature, meshes, bpy.data.actions[clip["name"]], clip["durationFrames"], source_floor,
            0.00001 if clip["name"] == "DeathCollapse" else 0.0,
        )
    armature.animation_data.action = bpy.data.actions.get("CombatIdle") or bpy.data.actions.get("Idle")
    output.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for node in [armature, *meshes]:
        node.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True,
        export_frame_step=1, export_skins=True, export_def_bones=True, export_leaf_bone=False,
        export_materials="EXPORT", export_cameras=False, export_lights=False, export_extras=True,
        export_yup=True, export_apply=False, export_all_influences=False, export_influence_nb=4,
    )
    output_actions = sorted(action.name for action in bpy.data.actions)
    if not replacements.issubset(output_actions):
        raise RuntimeError("A planned motion was not exported")
    payload = {
        "status": "draft-not-promoted", "source": str(source), "sourceSha256": expected_sha,
        "plan": str(plan_path), "planSha256": sha256(plan_bytes).hexdigest(),
        "output": str(output), "outputBytes": output.stat().st_size, "outputSha256": digest(output),
        "armature": armature.name, "bones": actual_bones, "meshNames": sorted(node.name for node in meshes),
        "sourceActions": source_actions, "outputActions": output_actions,
        "replacedActions": sorted(replacements),
        "phaseFrames": {clip["name"]: [phase["frame"] for phase in clip["phases"]] for clip in selected_clips},
        "handTargetSolutions": target_solutions,
        "surfaceGrounding": {"targetFloorMeters": source_floor, "actions": grounding},
        "blenderVersion": bpy.app.version_string,
    }
    report_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("WARDEN_MOTION_V2_REPORT=" + json.dumps(payload, sort_keys=True))


if __name__ == "__main__":
    main()
