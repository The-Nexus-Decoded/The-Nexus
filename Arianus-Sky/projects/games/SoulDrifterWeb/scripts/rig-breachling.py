"""Build the shared Breachling quadruped rig and authored animation clips in Blender 4.5."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


def script_args() -> tuple[Path, Path]:
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(args) != 2:
        raise RuntimeError("Expected: -- <output.blend> <output.glb>")
    return Path(args[0]).resolve(), Path(args[1]).resolve()


def prepare_mesh() -> bpy.types.Object:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one source mesh, found {len(meshes)}")
    mesh = meshes[0]
    world = mesh.matrix_world.copy()
    mesh.parent = None
    mesh.matrix_world = world
    for obj in list(bpy.context.scene.objects):
        if obj != mesh:
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for modifier in list(mesh.modifiers):
        mesh.modifiers.remove(modifier)
    mesh.vertex_groups.clear()
    mesh.name = "Breachling_Mesh"
    mesh.data.name = "Breachling_Mesh"
    return mesh


def create_armature() -> bpy.types.Object:
    data = bpy.data.armatures.new("Breachling_Rig")
    rig = bpy.data.objects.new("Breachling_Rig", data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    def bone(name: str, head: tuple[float, float, float], tail: tuple[float, float, float], parent: str | None = None, deform: bool = True) -> None:
        edit = data.edit_bones.new(name)
        edit.head = head
        edit.tail = tail
        edit.use_deform = deform
        if parent:
            edit.parent = data.edit_bones[parent]

    bone("root", (0.0, 0.0, 0.02), (0.0, 0.0, 0.10), deform=False)
    bone("pelvis", (-0.04, 0.0, 0.27), (0.07, 0.0, 0.34), "root")
    bone("spine.001", (0.07, 0.0, 0.34), (0.20, 0.0, 0.39), "pelvis")
    bone("spine.002", (0.20, 0.0, 0.39), (0.31, 0.0, 0.37), "spine.001")
    bone("neck", (0.31, 0.0, 0.37), (0.41, 0.0, 0.32), "spine.002")
    bone("head", (0.41, 0.0, 0.32), (0.49, 0.0, 0.29), "neck")
    bone("jaw", (0.405, 0.0, 0.285), (0.49, 0.0, 0.235), "head")

    tail_points = [
        (-0.04, 0.0, 0.28), (-0.15, 0.0, 0.25), (-0.26, 0.0, 0.19),
        (-0.36, 0.0, 0.13), (-0.45, 0.0, 0.095), (-0.50, 0.0, 0.115),
    ]
    parent = "pelvis"
    for index in range(len(tail_points) - 1):
        name = f"tail.{index + 1:03d}"
        bone(name, tail_points[index], tail_points[index + 1], parent)
        parent = name

    for suffix, side in (("L", 1.0), ("R", -1.0)):
        bone(f"front_upper.{suffix}", (0.245, 0.13 * side, 0.37), (0.27, 0.205 * side, 0.235), "spine.002")
        bone(f"front_lower.{suffix}", (0.27, 0.205 * side, 0.235), (0.35, 0.22 * side, 0.075), f"front_upper.{suffix}")
        bone(f"front_hand.{suffix}", (0.35, 0.22 * side, 0.075), (0.45, 0.22 * side, 0.025), f"front_lower.{suffix}")
        bone(f"rear_thigh.{suffix}", (-0.055, 0.13 * side, 0.30), (-0.075, 0.20 * side, 0.19), "pelvis")
        bone(f"rear_shin.{suffix}", (-0.075, 0.20 * side, 0.19), (-0.15, 0.215 * side, 0.075), f"rear_thigh.{suffix}")
        bone(f"rear_foot.{suffix}", (-0.15, 0.215 * side, 0.075), (-0.035, 0.22 * side, 0.025), f"rear_shin.{suffix}")

    bpy.ops.object.mode_set(mode="OBJECT")
    rig.show_in_front = True
    return rig


def bind_mesh(mesh: bpy.types.Object, rig: bpy.types.Object) -> dict[str, int | float]:
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")

    groups = {group.name: group for group in mesh.vertex_groups}
    left_groups = [group for name, group in groups.items() if name.endswith(".L")]
    right_groups = [group for name, group in groups.items() if name.endswith(".R")]
    for vertex in mesh.data.vertices:
        if vertex.co.y > 0.018:
            for group in right_groups:
                group.remove([vertex.index])
        elif vertex.co.y < -0.018:
            for group in left_groups:
                group.remove([vertex.index])

    jaw = groups["jaw"]
    head = groups["head"]
    for vertex in mesh.data.vertices:
        if vertex.co.x > 0.405 and vertex.co.z < 0.285:
            jaw.add([vertex.index], 0.88, "REPLACE")
            head.add([vertex.index], 0.12, "REPLACE")

    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    modifier = next(modifier for modifier in mesh.modifiers if modifier.type == "ARMATURE")
    modifier.use_deform_preserve_volume = True

    unweighted = 0
    maximum_influences = 0
    for vertex in mesh.data.vertices:
        influence_count = sum(1 for item in vertex.groups if item.weight > 0.0001)
        maximum_influences = max(maximum_influences, influence_count)
        if influence_count == 0:
            unweighted += 1
    return {"vertices": len(mesh.data.vertices), "unweighted": unweighted, "maxInfluences": maximum_influences}


def local_axis(pose_bone: bpy.types.PoseBone, global_axis: tuple[float, float, float]) -> Vector:
    return (pose_bone.bone.matrix_local.to_3x3().inverted() @ Vector(global_axis)).normalized()


def author_actions(rig: bpy.types.Object) -> list[dict[str, int | float | str]]:
    scene = bpy.context.scene
    scene.render.fps = 30
    rest_locations = {bone.name: bone.location.copy() for bone in rig.pose.bones}

    def add_action(name: str, end_frame: int, poses: dict[int, dict[str, dict[str, tuple[float, float, float] | float]]], loop: bool = False) -> None:
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        rig.animation_data_create()
        rig.animation_data.action = action
        scene.frame_start = 1
        scene.frame_end = end_frame
        for frame in sorted(poses):
            scene.frame_set(frame)
            for pose_bone in rig.pose.bones:
                pose_bone.rotation_mode = "QUATERNION"
                pose_bone.rotation_quaternion = Quaternion()
                pose_bone.location = rest_locations[pose_bone.name]
            for bone_name, values in poses[frame].items():
                pose_bone = rig.pose.bones[bone_name]
                rotation = Quaternion()
                for axis_name, axis in (("pitch", (0.0, 1.0, 0.0)), ("yaw", (0.0, 0.0, 1.0)), ("roll", (1.0, 0.0, 0.0))):
                    degrees = float(values.get(axis_name, 0.0))
                    rotation = rotation @ Quaternion(local_axis(pose_bone, axis), math.radians(degrees))
                pose_bone.rotation_quaternion = rotation
                if "location" in values:
                    pose_bone.location = Vector(values["location"])
            for pose_bone in rig.pose.bones:
                pose_bone.keyframe_insert("rotation_quaternion", frame=frame, group=pose_bone.name)
                pose_bone.keyframe_insert("location", frame=frame, group=pose_bone.name)
        for curve in action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = "BEZIER" if not loop else "LINEAR"
        action.use_frame_range = True
        action.frame_start = 1
        action.frame_end = end_frame

    def gait(frame: int, direction: float, amount: float, run: bool = False) -> dict[str, dict[str, float]]:
        bend = 28 if run else 18
        return {
            "pelvis": {"pitch": -3 * direction}, "spine.002": {"pitch": 3 * direction},
            "front_upper.L": {"pitch": amount * direction}, "front_lower.L": {"pitch": -bend * direction},
            "front_upper.R": {"pitch": -amount * direction}, "front_lower.R": {"pitch": bend * direction},
            "rear_thigh.L": {"pitch": -amount * direction}, "rear_shin.L": {"pitch": bend * direction},
            "rear_thigh.R": {"pitch": amount * direction}, "rear_shin.R": {"pitch": -bend * direction},
            "tail.001": {"yaw": 7 * direction}, "tail.002": {"yaw": 10 * direction}, "tail.003": {"yaw": 13 * direction},
        }

    idle = {
        1: {}, 30: {"spine.001": {"pitch": 2}, "neck": {"pitch": -2}, "tail.003": {"yaw": 5}, "tail.004": {"yaw": 8}},
        60: {}, 90: {"spine.001": {"pitch": -1.5}, "head": {"yaw": 2}, "tail.003": {"yaw": -5}, "tail.004": {"yaw": -8}}, 120: {},
    }
    walk = {1: gait(1, 1, 16), 9: {}, 17: gait(17, -1, 16), 25: {}, 33: gait(33, 1, 16)}
    run = {1: gait(1, 1, 27, True), 7: {}, 13: gait(13, -1, 27, True), 19: {}, 25: gait(25, 1, 27, True)}
    bite = {
        1: {}, 9: {"spine.002": {"pitch": -7}, "neck": {"pitch": -12}, "head": {"pitch": 12}, "jaw": {"pitch": -8}},
        15: {"spine.002": {"pitch": 8}, "neck": {"pitch": 22}, "head": {"pitch": -18}, "jaw": {"pitch": 24}},
        20: {"neck": {"pitch": 12}, "head": {"pitch": -8}, "jaw": {"pitch": 3}}, 34: {},
    }
    claw = {
        1: {}, 10: {"spine.002": {"yaw": -9}, "front_upper.R": {"pitch": -18, "roll": -24}, "front_lower.R": {"pitch": 32}},
        17: {"spine.002": {"yaw": 14}, "front_upper.R": {"pitch": 26, "roll": 28}, "front_lower.R": {"pitch": -18}}, 34: {},
    }
    tail_whip = {
        1: {}, 12: {"pelvis": {"yaw": 6}, "tail.001": {"yaw": 8}, "tail.002": {"yaw": 14}, "tail.003": {"yaw": 18}, "tail.004": {"yaw": 22}, "tail.005": {"yaw": 25}},
        20: {"pelvis": {"yaw": -10}, "tail.001": {"yaw": -18}, "tail.002": {"yaw": -24}, "tail.003": {"yaw": -28}, "tail.004": {"yaw": -32}, "tail.005": {"yaw": -36}},
        28: {"tail.001": {"yaw": 6}, "tail.002": {"yaw": 10}, "tail.003": {"yaw": 14}}, 46: {},
    }
    hit = {1: {}, 5: {"spine.001": {"pitch": -14}, "neck": {"pitch": -18}, "head": {"pitch": 10}}, 13: {"spine.001": {"pitch": 6}}, 24: {}}
    death = {
        1: {}, 12: {"root": {"roll": 20}, "pelvis": {"pitch": -20}, "front_upper.L": {"roll": 25}, "rear_thigh.L": {"roll": 22}},
        28: {"root": {"roll": 72}, "pelvis": {"pitch": -34, "location": (0.0, 0.0, -0.14)}, "neck": {"pitch": 24}, "front_upper.L": {"roll": 46}, "front_upper.R": {"roll": -28}, "rear_thigh.L": {"roll": 38}, "rear_thigh.R": {"roll": -24}},
        55: {"root": {"roll": 86}, "pelvis": {"pitch": -42, "location": (0.0, 0.0, -0.22)}, "neck": {"pitch": 32}, "head": {"pitch": -12}},
    }

    specifications = [
        ("Idle", 120, idle, True), ("Walk", 33, walk, True), ("Run", 25, run, True),
        ("BiteAttack", 34, bite, False), ("SwordSlashOutward", 34, bite, False),
        ("ClawAttack", 34, claw, False), ("TailWhip", 46, tail_whip, False),
        ("RecieveHit", 24, hit, False), ("Death", 55, death, False),
    ]
    for name, frames, poses, loop in specifications:
        add_action(name, frames, poses, loop)
    rig.animation_data.action = bpy.data.actions["Idle"]
    return [{"name": name, "frames": frames, "seconds": round((frames - 1) / 30, 3), "loop": loop} for name, frames, _, loop in specifications]


def save_and_export(mesh: bpy.types.Object, rig: bpy.types.Object, blend_path: Path, glb_path: Path) -> None:
    blend_path.parent.mkdir(parents=True, exist_ok=True)
    glb_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene["issue"] = 458
    bpy.context.scene["asset_family"] = "Breachling"
    bpy.context.scene["rig_policy"] = "local-species-correct-quadruped"
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), compress=True)
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="ACTIONS", export_skins=True,
        export_morph=False, export_cameras=False, export_lights=False,
    )


def main() -> None:
    blend_path, glb_path = script_args()
    mesh = prepare_mesh()
    rig = create_armature()
    bind_report = bind_mesh(mesh, rig)
    actions = author_actions(rig)
    save_and_export(mesh, rig, blend_path, glb_path)
    report = {
        "blend": str(blend_path), "glb": str(glb_path), "bones": len(rig.data.bones),
        "bind": bind_report, "actions": actions,
    }
    print("BREACHLING_RIG_REPORT=" + json.dumps(report, separators=(",", ":")))


if __name__ == "__main__":
    main()
