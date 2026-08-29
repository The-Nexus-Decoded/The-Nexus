"""Build the two issue-458 Cinderbound Wardens as local mechanical rigs.

The Tripo Smart Mesh exports are source geometry only.  This script keeps their
material and source identity, removes only a disconnected presentation plinth,
groups disconnected generated surface patches into rigid mechanical zones,
authors in-place actions, and exports separately named breakaway armor meshes.

Run both Wardens in one Blender 4.5 LTS process.  No provider rig or animation
service is involved.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from hashlib import sha256
import json
import math
from pathlib import Path
import sys
from typing import Iterable

import bmesh
import bpy
from mathutils import Vector


@dataclass(frozen=True)
class WardenSpec:
    slug: str
    display_name: str
    tripo_model_id: str
    source_sha256: str
    source_path: Path
    output_glb: Path
    output_blend: Path


EXPECTED_ACTIONS = (
    "Idle",
    "CombatIdle",
    "HeavyWalk",
    "HeavyRun",
    "TurnLeft",
    "TurnRight",
    "HeadLook",
    "BladeSweep",
    "CinderSweep",
    "PalmFire",
    "AshCall",
    "HitReact",
    "DeathCollapse",
)

BREAKOFF_STAGES = (
    ("Breakoff_30_Shoulders", 0.30),
    ("Breakoff_60_Forearms", 0.60),
    ("Breakoff_90_Thighs", 0.90),
)


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--greater-source", required=True)
    parser.add_argument("--wayfarer-source", required=True)
    parser.add_argument("--runtime-root", required=True)
    parser.add_argument("--blend-root", required=True)
    parser.add_argument("--evidence-root", required=True)
    parser.add_argument("--report", required=True)
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30


def require_single_source_mesh() -> bpy.types.Object:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one source mesh, got {[obj.name for obj in meshes]}")
    mesh = meshes[0]
    bpy.context.view_layer.objects.active = mesh
    mesh.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return mesh


def object_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return low, high


def connected_components(mesh: bpy.types.Mesh) -> list[set[int]]:
    parent = list(range(len(mesh.vertices)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for edge in mesh.edges:
        union(edge.vertices[0], edge.vertices[1])
    groups: dict[int, set[int]] = {}
    for vertex in mesh.vertices:
        groups.setdefault(find(vertex.index), set()).add(vertex.index)
    return list(groups.values())


def component_bounds(mesh: bpy.types.Mesh, vertices: Iterable[int]) -> tuple[Vector, Vector]:
    coords = [mesh.vertices[index].co for index in vertices]
    low = Vector(tuple(min(point[axis] for point in coords) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in coords) for axis in range(3)))
    return low, high


def delete_vertices(mesh: bpy.types.Mesh, vertex_indices: set[int]) -> None:
    if not vertex_indices:
        return
    editable = bmesh.new()
    editable.from_mesh(mesh)
    editable.verts.ensure_lookup_table()
    doomed = [vertex for vertex in editable.verts if vertex.index in vertex_indices]
    bmesh.ops.delete(editable, geom=doomed, context="VERTS")
    editable.to_mesh(mesh)
    editable.free()
    mesh.update()


def remove_presentation_plinth(obj: bpy.types.Object) -> int:
    low, high = object_bounds(obj)
    dimensions = high - low
    doomed: set[int] = set()
    for component in connected_components(obj.data):
        component_low, component_high = component_bounds(obj.data, component)
        component_size = component_high - component_low
        center_z = (component_low.z + component_high.z) * 0.5
        is_floor_slab = (
            center_z <= low.z + dimensions.z * 0.055
            and component_size.z <= dimensions.z * 0.040
            and (
                component_size.x >= dimensions.x * 0.20
                or component_size.y >= dimensions.y * 0.20
            )
        )
        if is_floor_slab:
            doomed.update(component)
    delete_vertices(obj.data, doomed)
    return len(doomed)


def breakoff_zone(
    center: Vector,
    span: Vector,
    low: Vector,
    high: Vector,
) -> str | None:
    size = high - low
    body_center = (low + high) * 0.5
    lateral_normalized = (center.y - body_center.y) / max(size.y * 0.5, 1e-6)
    z_normalized = (center.z - low.z) / max(size.z, 1e-6)
    # The integrated blade is a long connected patch; it must remain on the rig.
    if max(span) >= size.z * 0.24:
        return None
    if 0.68 <= z_normalized <= 0.86 and abs(lateral_normalized) >= 0.42:
        return "Breakoff_30_Shoulders"
    if 0.39 <= z_normalized <= 0.62 and abs(lateral_normalized) >= 0.58:
        return "Breakoff_60_Forearms"
    if 0.27 <= z_normalized <= 0.49 and 0.26 <= abs(lateral_normalized) <= 0.60:
        return "Breakoff_90_Thighs"
    return None


def duplicate_subset(
    source: bpy.types.Object,
    name: str,
    keep_vertices: set[int],
) -> bpy.types.Object:
    copied_mesh = source.data.copy()
    copied = bpy.data.objects.new(name, copied_mesh)
    bpy.context.scene.collection.objects.link(copied)
    editable = bmesh.new()
    editable.from_mesh(copied_mesh)
    editable.verts.ensure_lookup_table()
    doomed = [vertex for vertex in editable.verts if vertex.index not in keep_vertices]
    bmesh.ops.delete(editable, geom=doomed, context="VERTS")
    editable.to_mesh(copied_mesh)
    editable.free()
    copied_mesh.update()
    return copied


def split_breakoff_sections(body: bpy.types.Object) -> list[bpy.types.Object]:
    low, high = object_bounds(body)
    zones: dict[str, set[int]] = {name: set() for name, _ in BREAKOFF_STAGES}
    for component in connected_components(body.data):
        component_low, component_high = component_bounds(body.data, component)
        zone = breakoff_zone(
            (component_low + component_high) * 0.5,
            component_high - component_low,
            low,
            high,
        )
        if zone is not None:
            zones[zone].update(component)
    if any(len(vertices) < 400 for vertices in zones.values()):
        counts = {name: len(vertices) for name, vertices in zones.items()}
        raise RuntimeError(f"Could not identify meaningful breakoff stages: {counts}")
    pieces: list[bpy.types.Object] = []
    for name, threshold in BREAKOFF_STAGES:
        piece = duplicate_subset(body, name, zones[name])
        piece["sectionId"] = name
        piece["damageFraction"] = threshold
        piece["detachable"] = True
        pieces.append(piece)
    delete_vertices(body.data, set().union(*zones.values()))
    return pieces


def create_armature(
    body: bpy.types.Object,
    name: str,
    model_bounds: tuple[Vector, Vector],
) -> bpy.types.Object:
    low, high = model_bounds
    size = high - low
    center = (low + high) * 0.5
    armature_data = bpy.data.armatures.new(f"{name}_Skeleton")
    armature = bpy.data.objects.new(f"{name}_Rig", armature_data)
    bpy.context.scene.collection.objects.link(armature)
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    def add_bone(
        bone_name: str,
        head: tuple[float, float, float],
        tail: tuple[float, float, float],
        parent: str | None = None,
    ) -> None:
        bone = armature_data.edit_bones.new(bone_name)
        bone.head = Vector(head)
        bone.tail = Vector(tail)
        if parent:
            bone.parent = armature_data.edit_bones[parent]
        try:
            bone.align_roll(Vector((0.0, -1.0, 0.0)))
        except ValueError:
            pass

    z = lambda fraction: low.z + size.z * fraction
    lateral = lambda fraction: center.y + size.y * fraction
    depth = center.x
    add_bone("root", (depth, center.y, z(0.02)), (depth, center.y, z(0.39)))
    add_bone("pelvis", (depth, center.y, z(0.39)), (depth, center.y, z(0.49)), "root")
    add_bone("spine", (depth, center.y, z(0.49)), (depth, center.y, z(0.64)), "pelvis")
    add_bone("chest", (depth, center.y, z(0.64)), (depth, center.y, z(0.76)), "spine")
    add_bone("neck", (depth, center.y, z(0.76)), (depth, center.y, z(0.83)), "chest")
    add_bone("head", (depth, center.y, z(0.83)), (depth, center.y, z(0.98)), "neck")
    for side, sign in (("L", 1.0), ("R", -1.0)):
        add_bone(
            f"upper_arm_{side}",
            (depth, lateral(0.16 * sign), z(0.73)),
            (depth, lateral(0.31 * sign), z(0.57)),
            "chest",
        )
        add_bone(
            f"lower_arm_{side}",
            (depth, lateral(0.31 * sign), z(0.57)),
            (depth, lateral(0.38 * sign), z(0.41)),
            f"upper_arm_{side}",
        )
        add_bone(
            f"hand_{side}",
            (depth, lateral(0.38 * sign), z(0.41)),
            (depth, lateral(0.38 * sign), z(0.32)),
            f"lower_arm_{side}",
        )
        add_bone(
            f"thigh_{side}",
            (depth, lateral(0.11 * sign), z(0.44)),
            (depth, lateral(0.14 * sign), z(0.27)),
            "pelvis",
        )
        add_bone(
            f"lower_leg_{side}",
            (depth, lateral(0.14 * sign), z(0.27)),
            (depth, lateral(0.14 * sign), z(0.10)),
            f"thigh_{side}",
        )
        add_bone(
            f"foot_{side}",
            (depth, lateral(0.14 * sign), z(0.10)),
            (depth + size.x * 0.14, lateral(0.14 * sign), z(0.03)),
            f"lower_leg_{side}",
        )
    bpy.ops.object.mode_set(mode="OBJECT")
    return armature


def classify_component_bone(
    center: Vector,
    span: Vector,
    low: Vector,
    high: Vector,
) -> str:
    size = high - low
    body_center = (low + high) * 0.5
    lateral_normalized = (center.y - body_center.y) / max(size.y * 0.5, 1e-6)
    z_normalized = (center.z - low.z) / max(size.z, 1e-6)
    side = "L" if lateral_normalized >= 0 else "R"
    outward = abs(lateral_normalized)
    # Both selected concepts have a long integrated blade on the right arm.
    # Bind its disconnected generated patches as one rigid weapon assembly.
    if (
        lateral_normalized < -0.12
        and z_normalized < 0.66
        and max(span) >= size.z * 0.18
    ):
        return "lower_arm_R"
    if z_normalized < 0.13:
        return f"foot_{side}"
    if lateral_normalized < -0.50 and z_normalized < 0.62:
        return "lower_arm_R"
    if outward >= 0.34 and z_normalized >= 0.30:
        if z_normalized >= 0.60:
            return f"upper_arm_{side}"
        if z_normalized >= 0.39:
            return f"lower_arm_{side}"
        return f"hand_{side}"
    if z_normalized < 0.30:
        return f"lower_leg_{side}"
    if z_normalized < 0.49:
        return f"thigh_{side}" if outward >= 0.12 else "pelvis"
    if z_normalized < 0.63:
        return "spine"
    if z_normalized < 0.78:
        return "chest"
    if z_normalized < 0.84:
        return "neck"
    return "head"


def rigid_bind(
    mesh_object: bpy.types.Object,
    armature: bpy.types.Object,
    model_bounds: tuple[Vector, Vector],
) -> None:
    low, high = model_bounds
    assignments: dict[str, list[int]] = {}
    for component in connected_components(mesh_object.data):
        component_low, component_high = component_bounds(mesh_object.data, component)
        center = (component_low + component_high) * 0.5
        if mesh_object.name == "Breakoff_30_Shoulders":
            bone_name = "chest"
        elif mesh_object.name == "Breakoff_60_Forearms":
            bone_name = "lower_arm_L" if center.y >= (low.y + high.y) * 0.5 else "lower_arm_R"
        elif mesh_object.name == "Breakoff_90_Thighs":
            bone_name = "thigh_L" if center.y >= (low.y + high.y) * 0.5 else "thigh_R"
        else:
            bone_name = classify_component_bone(
                center,
                component_high - component_low,
                low,
                high,
            )
        assignments.setdefault(bone_name, []).extend(component)
    assigned = sum(len(indices) for indices in assignments.values())
    if assigned != len(mesh_object.data.vertices):
        raise RuntimeError(f"{mesh_object.name}: {assigned} of {len(mesh_object.data.vertices)} vertices assigned")
    for bone_name, indices in assignments.items():
        group = mesh_object.vertex_groups.new(name=bone_name)
        group.add(indices, 1.0, "REPLACE")
    modifier = mesh_object.modifiers.new(name="MechanicalRig", type="ARMATURE")
    modifier.object = armature
    mesh_object.parent = armature


def reset_pose(armature: bpy.types.Object) -> None:
    for bone in armature.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.location = (0.0, 0.0, 0.0)
        bone.rotation_euler = (0.0, 0.0, 0.0)
        bone.scale = (1.0, 1.0, 1.0)


def author_action(
    armature: bpy.types.Object,
    name: str,
    frame_poses: dict[int, dict[str, dict[str, tuple[float, float, float]]]],
    loop: bool,
) -> bpy.types.Action:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    action["loop"] = loop
    armature.animation_data_create()
    armature.animation_data.action = action
    for frame, pose in sorted(frame_poses.items()):
        reset_pose(armature)
        for bone_name, values in pose.items():
            bone = armature.pose.bones.get(bone_name)
            if bone is None:
                raise RuntimeError(f"{name}: missing bone {bone_name}")
            if "rotation" in values:
                bone.rotation_euler = values["rotation"]
            if "location" in values:
                bone.location = values["location"]
            if "scale" in values:
                bone.scale = values["scale"]
        for bone in armature.pose.bones:
            bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
            bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
            bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)
    armature.animation_data.action = None
    return action


def degrees(x: float, y: float = 0.0, z: float = 0.0) -> tuple[float, float, float]:
    return tuple(math.radians(value) for value in (x, y, z))


def create_actions(armature: bpy.types.Object) -> None:
    author_action(
        armature,
        "Idle",
        {
            1: {},
            45: {"spine": {"rotation": degrees(-1.5)}, "chest": {"scale": (1.006, 1.006, 1.006)}},
            90: {"neck": {"rotation": degrees(0.0, 0.0, 2.0)}, "head": {"rotation": degrees(0.0, 0.0, -3.0)}},
            135: {"spine": {"rotation": degrees(1.5)}, "chest": {"scale": (0.996, 0.996, 0.996)}},
            180: {},
        },
        True,
    )
    author_action(
        armature,
        "CombatIdle",
        {
            1: {"spine": {"rotation": degrees(5.0)}, "upper_arm_R": {"rotation": degrees(-8.0, 0.0, -8.0)}},
            30: {"spine": {"rotation": degrees(2.0)}, "head": {"rotation": degrees(0.0, 0.0, 4.0)}},
            60: {"spine": {"rotation": degrees(5.0)}, "head": {"rotation": degrees(0.0, 0.0, -4.0)}},
            90: {"spine": {"rotation": degrees(5.0)}, "upper_arm_R": {"rotation": degrees(-8.0, 0.0, -8.0)}},
        },
        True,
    )
    walk = {
        1: {"thigh_L": {"rotation": degrees(24)}, "thigh_R": {"rotation": degrees(-24)}, "upper_arm_L": {"rotation": degrees(-15)}, "upper_arm_R": {"rotation": degrees(15)}},
        15: {"lower_leg_L": {"rotation": degrees(-28)}, "root": {"location": (0.0, 0.006, 0.0)}},
        30: {"thigh_L": {"rotation": degrees(-24)}, "thigh_R": {"rotation": degrees(24)}, "upper_arm_L": {"rotation": degrees(15)}, "upper_arm_R": {"rotation": degrees(-15)}},
        45: {"lower_leg_R": {"rotation": degrees(-28)}, "root": {"location": (0.0, 0.006, 0.0)}},
        60: {"thigh_L": {"rotation": degrees(24)}, "thigh_R": {"rotation": degrees(-24)}, "upper_arm_L": {"rotation": degrees(-15)}, "upper_arm_R": {"rotation": degrees(15)}},
    }
    author_action(armature, "HeavyWalk", walk, True)
    run = {
        1: {"spine": {"rotation": degrees(9)}, "thigh_L": {"rotation": degrees(38)}, "thigh_R": {"rotation": degrees(-38)}, "upper_arm_L": {"rotation": degrees(-24)}, "upper_arm_R": {"rotation": degrees(24)}},
        10: {"lower_leg_L": {"rotation": degrees(-42)}},
        20: {"spine": {"rotation": degrees(9)}, "thigh_L": {"rotation": degrees(-38)}, "thigh_R": {"rotation": degrees(38)}, "upper_arm_L": {"rotation": degrees(24)}, "upper_arm_R": {"rotation": degrees(-24)}},
        30: {"lower_leg_R": {"rotation": degrees(-42)}},
        40: {"spine": {"rotation": degrees(9)}, "thigh_L": {"rotation": degrees(38)}, "thigh_R": {"rotation": degrees(-38)}, "upper_arm_L": {"rotation": degrees(-24)}, "upper_arm_R": {"rotation": degrees(24)}},
    }
    author_action(armature, "HeavyRun", run, True)
    author_action(armature, "TurnLeft", {1: {}, 20: {"root": {"rotation": degrees(0, 0, 22)}, "head": {"rotation": degrees(0, 0, 18)}}, 40: {}}, False)
    author_action(armature, "TurnRight", {1: {}, 20: {"root": {"rotation": degrees(0, 0, -22)}, "head": {"rotation": degrees(0, 0, -18)}}, 40: {}}, False)
    author_action(armature, "HeadLook", {1: {}, 30: {"neck": {"rotation": degrees(0, 0, 12)}, "head": {"rotation": degrees(0, 0, 24)}}, 60: {"neck": {"rotation": degrees(0, 0, -12)}, "head": {"rotation": degrees(0, 0, -24)}}, 90: {}}, True)
    author_action(
        armature,
        "BladeSweep",
        {
            1: {"upper_arm_R": {"rotation": degrees(-12, 0, -10)}},
            18: {"spine": {"rotation": degrees(0, 0, -18)}, "upper_arm_R": {"rotation": degrees(-28, 0, 12)}},
            34: {"spine": {"rotation": degrees(0, 0, 25)}, "upper_arm_R": {"rotation": degrees(30, 0, -18)}},
            54: {},
        },
        False,
    )
    author_action(
        armature,
        "CinderSweep",
        {
            1: {},
            20: {"spine": {"rotation": degrees(0, 0, -28)}, "upper_arm_R": {"rotation": degrees(-28, 0, 18)}},
            45: {"spine": {"rotation": degrees(0, 0, 32)}, "upper_arm_R": {"rotation": degrees(34, 0, -22)}, "upper_arm_L": {"rotation": degrees(-12)}},
            70: {},
        },
        False,
    )
    author_action(
        armature,
        "PalmFire",
        {
            1: {},
            24: {"spine": {"rotation": degrees(7)}, "upper_arm_L": {"rotation": degrees(-36, 0, -12)}},
            45: {"spine": {"rotation": degrees(10)}, "upper_arm_L": {"rotation": degrees(-48, 0, -15)}, "hand_L": {"scale": (1.04, 1.04, 1.04)}},
            66: {"upper_arm_L": {"rotation": degrees(-36, 0, -12)}},
            90: {},
        },
        False,
    )
    author_action(
        armature,
        "AshCall",
        {
            1: {},
            30: {"spine": {"rotation": degrees(-8)}, "upper_arm_L": {"rotation": degrees(-42, 0, -18)}, "upper_arm_R": {"rotation": degrees(-42, 0, 18)}, "head": {"rotation": degrees(-14)}},
            70: {"chest": {"scale": (1.035, 1.035, 1.035)}, "upper_arm_L": {"rotation": degrees(-52, 0, -22)}, "upper_arm_R": {"rotation": degrees(-52, 0, 22)}},
            110: {},
        },
        False,
    )
    author_action(armature, "HitReact", {1: {}, 6: {"root": {"rotation": degrees(-8)}, "spine": {"rotation": degrees(-16)}, "head": {"rotation": degrees(12)}}, 18: {}}, False)
    author_action(
        armature,
        "DeathCollapse",
        {
            1: {},
            26: {"root": {"rotation": degrees(28)}, "thigh_L": {"rotation": degrees(-22)}, "thigh_R": {"rotation": degrees(18)}, "upper_arm_L": {"rotation": degrees(26)}, "upper_arm_R": {"rotation": degrees(-22)}},
            54: {"root": {"rotation": degrees(72)}, "spine": {"rotation": degrees(18)}, "lower_leg_L": {"rotation": degrees(-48)}, "lower_leg_R": {"rotation": degrees(-36)}},
            90: {"root": {"rotation": degrees(88)}, "spine": {"rotation": degrees(28)}, "head": {"rotation": degrees(-18)}, "upper_arm_L": {"rotation": degrees(35)}, "upper_arm_R": {"rotation": degrees(-42)}},
        },
        False,
    )
    if tuple(sorted(action.name for action in bpy.data.actions)) != tuple(sorted(EXPECTED_ACTIONS)):
        raise RuntimeError("Authored action contract does not match expected action set")


def export_warden(spec: WardenSpec, evidence_root: Path) -> dict:
    if file_sha256(spec.source_path) != spec.source_sha256:
        raise RuntimeError(f"{spec.slug}: source hash mismatch")
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(spec.source_path))
    body = require_single_source_mesh()
    body.name = f"{spec.display_name}_Body"
    body.data.name = f"{spec.display_name}_BodyMesh"
    removed_plinth_vertices = remove_presentation_plinth(body)
    model_bounds = object_bounds(body)
    breakoff_pieces = split_breakoff_sections(body)
    armature = create_armature(body, spec.display_name, model_bounds)
    all_meshes = [body, *breakoff_pieces]
    for mesh_object in all_meshes:
        rigid_bind(mesh_object, armature, model_bounds)
        mesh_object["sourceTripoModelId"] = spec.tripo_model_id
        mesh_object["sourceSha256"] = spec.source_sha256
    armature["creatureId"] = spec.slug
    armature["displayName"] = spec.display_name.replace("_", " ")
    armature["sourceTripoModelId"] = spec.tripo_model_id
    armature["sourceSha256"] = spec.source_sha256
    armature["rigType"] = "local-mechanical-rigid-v1"
    armature["runtimeScale"] = 2.0
    armature["palmFireBone"] = "hand_L"
    armature["integratedBladeBone"] = "lower_arm_R"
    create_actions(armature)
    armature.animation_data_create()
    armature.animation_data.action = bpy.data.actions["Idle"]
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 180

    spec.output_blend.parent.mkdir(parents=True, exist_ok=True)
    spec.output_glb.parent.mkdir(parents=True, exist_ok=True)
    evidence_root.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(spec.output_blend))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [armature, *all_meshes]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(spec.output_glb),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_frame_step=1,
        export_skins=True,
        export_def_bones=True,
        export_leaf_bone=False,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
        export_apply=False,
        export_all_influences=False,
        export_influence_nb=4,
    )
    result = {
        "slug": spec.slug,
        "displayName": spec.display_name,
        "source": str(spec.source_path),
        "sourceBytes": spec.source_path.stat().st_size,
        "sourceSha256": spec.source_sha256,
        "tripoModelId": spec.tripo_model_id,
        "rigType": "local-mechanical-rigid-v1",
        "boneCount": len(armature.data.bones),
        "meshCount": len(all_meshes),
        "meshNames": [obj.name for obj in all_meshes],
        "vertexCounts": {obj.name: len(obj.data.vertices) for obj in all_meshes},
        "unweightedVertices": {
            obj.name: sum(1 for vertex in obj.data.vertices if not vertex.groups)
            for obj in all_meshes
        },
        "removedPresentationPlinthVertices": removed_plinth_vertices,
        "actions": sorted(action.name for action in bpy.data.actions),
        "breakoffStages": [
            {"mesh": name, "damageFraction": threshold}
            for name, threshold in BREAKOFF_STAGES
        ],
        "outputBlend": str(spec.output_blend),
        "outputBlendBytes": spec.output_blend.stat().st_size,
        "outputBlendSha256": file_sha256(spec.output_blend),
        "outputGlb": str(spec.output_glb),
        "outputGlbBytes": spec.output_glb.stat().st_size,
        "outputGlbSha256": file_sha256(spec.output_glb),
    }
    if any(result["unweightedVertices"].values()):
        raise RuntimeError(f"{spec.slug}: unweighted vertices {result['unweightedVertices']}")
    (evidence_root / f"{spec.slug}-rig-report.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    return result


def validate_export(spec: WardenSpec) -> dict:
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(spec.output_glb))
    armatures = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "ARMATURE" and obj.name == f"{spec.display_name}_Rig"
    ]
    meshes = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH"
        and (
            obj.name == f"{spec.display_name}_Body"
            or obj.name.startswith("Breakoff_")
        )
    ]
    actions = sorted(action.name for action in bpy.data.actions)
    if len(armatures) != 1:
        raise RuntimeError(f"{spec.slug}: exported armature count {len(armatures)}")
    if len(meshes) != 4:
        raise RuntimeError(f"{spec.slug}: exported mesh count {len(meshes)}")
    missing = sorted(set(EXPECTED_ACTIONS) - set(actions))
    if missing:
        raise RuntimeError(f"{spec.slug}: missing exported actions {missing}")
    breakoff_names = {name for name, _ in BREAKOFF_STAGES}
    exported_names = {mesh.name for mesh in meshes}
    if not all(any(name in exported for exported in exported_names) for name in breakoff_names):
        raise RuntimeError(f"{spec.slug}: missing breakoff meshes in {sorted(exported_names)}")
    return {
        "armatureCount": len(armatures),
        "meshCount": len(meshes),
        "meshNames": sorted(exported_names),
        "actionNames": actions,
    }


def main() -> None:
    args = parse_args()
    runtime_root = Path(args.runtime_root).resolve()
    blend_root = Path(args.blend_root).resolve()
    evidence_root = Path(args.evidence_root).resolve()
    report_path = Path(args.report).resolve()
    specs = (
        WardenSpec(
            slug="greater-cinderbound-warden",
            display_name="Greater_Cinderbound_Warden",
            tripo_model_id="248467bb-1824-46d1-9d2a-5d8a1d3147cf",
            source_sha256="08067E65782DE77B749202AE692DBCE5B2AB6631879478584DA120E6FB45C758",
            source_path=Path(args.greater_source).resolve(),
            output_glb=runtime_root / "greater-cinderbound-warden.glb",
            output_blend=blend_root / "greater-cinderbound-warden-rigged.blend",
        ),
        WardenSpec(
            slug="cinderbound-warden",
            display_name="Cinderbound_Warden",
            tripo_model_id="c609af31-3f47-450b-be5e-664d78ad36af",
            source_sha256="180B3FE5113FAC2AEDD95CFC6DA95B60251DE13E95F85F7641284D7B23A9D374",
            source_path=Path(args.wayfarer_source).resolve(),
            output_glb=runtime_root / "cinderbound-warden.glb",
            output_blend=blend_root / "cinderbound-warden-rigged.blend",
        ),
    )
    report_path.parent.mkdir(parents=True, exist_ok=True)
    records = []
    for spec in specs:
        built = export_warden(spec, evidence_root)
        built["roundTrip"] = validate_export(spec)
        records.append(built)
    payload = {
        "status": "local_rig_and_animation_complete",
        "blenderVersion": bpy.app.version_string,
        "serializedInSingleProcess": True,
        "wardens": records,
    }
    report_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("WARDEN_BUILD_REPORT=" + json.dumps(payload, sort_keys=True))


if __name__ == "__main__":
    main()
