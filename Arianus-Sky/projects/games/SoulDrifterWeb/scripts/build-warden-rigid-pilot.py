"""Build a non-shipping rigid-hierarchy pilot from the accepted Warden source."""

from __future__ import annotations

import argparse
from collections import defaultdict
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


TARGET_HEIGHT_METERS = 2.13

EYE_EMISSION = (0.95, 0.002, 0.001, 1.0)
EMBER_EMISSION = (1.0, 0.055, 0.002, 1.0)


def arguments() -> argparse.Namespace:
    separator = sys.argv.index("--") if "--" in sys.argv else -1
    if separator < 0:
        raise SystemExit("Blender arguments must follow --")
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-glb", required=True, type=Path)
    parser.add_argument("--output-blend", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--target-triangles", type=int, default=80_000)
    return parser.parse_args(sys.argv[separator + 1 :])


class DisjointSet:
    def __init__(self, size: int) -> None:
        self.parents = list(range(size))
        self.ranks = bytearray(size)

    def find(self, item: int) -> int:
        root = item
        while root != self.parents[root]:
            root = self.parents[root]
        while item != root:
            next_item = self.parents[item]
            self.parents[item] = root
            item = next_item
        return root

    def union(self, left: int, right: int) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root == right_root:
            return
        if self.ranks[left_root] < self.ranks[right_root]:
            left_root, right_root = right_root, left_root
        self.parents[right_root] = left_root
        if self.ranks[left_root] == self.ranks[right_root]:
            self.ranks[left_root] += 1


def bounds(item: bpy.types.Object) -> tuple[Vector, Vector]:
    points = [item.matrix_world @ Vector(corner) for corner in item.bound_box]
    return (
        Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points))),
        Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points))),
    )


def normalize_source(item: bpy.types.Object) -> None:
    minimum, maximum = bounds(item)
    scale = TARGET_HEIGHT_METERS / (maximum.z - minimum.z)
    item.scale *= scale
    bpy.context.view_layer.objects.active = item
    item.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    minimum, maximum = bounds(item)
    center = (minimum + maximum) / 2
    item.location += Vector((-center.x, -center.y, -minimum.z))
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    item.select_set(False)


def create_armature() -> tuple[bpy.types.Object, dict[str, tuple[Vector, Vector]]]:
    specs = {
        "root": ((0, 0, 0.02), (0, 0, 0.22), None),
        "pelvis": ((0, 0, 0.82), (0, 0, 1.08), "root"),
        "spine.lower": ((0, 0, 1.05), (0, 0, 1.35), "pelvis"),
        "spine.upper": ((0, 0, 1.33), (0, 0, 1.65), "spine.lower"),
        "head": ((0, 0, 1.62), (0, 0, 2.08), "spine.upper"),
        "upper_arm.L": ((0, 0.26, 1.68), (0, 0.56, 1.40), "spine.upper"),
        "forearm.L": ((0, 0.56, 1.40), (0, 0.76, 1.00), "upper_arm.L"),
        "hand.L": ((0, 0.76, 1.00), (0, 0.82, 0.78), "forearm.L"),
        "upper_arm.R": ((0, -0.26, 1.68), (0, -0.56, 1.40), "spine.upper"),
        "forearm.R": ((0, -0.56, 1.40), (0, -0.76, 1.00), "upper_arm.R"),
        "hand.R": ((0, -0.76, 1.00), (0, -0.82, 0.78), "forearm.R"),
        "thigh.L": ((0, 0.14, 0.92), (0, 0.16, 0.58), "pelvis"),
        "shin.L": ((0, 0.16, 0.58), (0, 0.16, 0.18), "thigh.L"),
        "foot.L": ((0, 0.16, 0.18), (0.24, 0.16, 0.08), "shin.L"),
        "thigh.R": ((0, -0.14, 0.92), (0, -0.16, 0.58), "pelvis"),
        "shin.R": ((0, -0.16, 0.58), (0, -0.16, 0.18), "thigh.R"),
        "foot.R": ((0, -0.16, 0.18), (0.24, -0.16, 0.08), "shin.R"),
    }

    data = bpy.data.armatures.new("WardenMechanicalRig")
    rig = bpy.data.objects.new("WardenMechanicalRig", data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (head, tail, _) in specs.items():
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.use_deform = name != "root"
    for name, (_, _, parent) in specs.items():
        if parent:
            data.edit_bones[name].parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.select_set(False)
    rig.show_in_front = True
    rig["runtimePromotionAllowed"] = False
    rig["sourceRole"] = "cinderbound-warden-rigid-hierarchy-pilot"
    return rig, {name: (Vector(head), Vector(tail)) for name, (head, tail, _) in specs.items() if name != "root"}


def distance_to_segment(point: Vector, head: Vector, tail: Vector) -> float:
    segment = tail - head
    length_squared = segment.length_squared
    if length_squared == 0:
        return (point - head).length
    factor = max(0.0, min(1.0, (point - head).dot(segment) / length_squared))
    return (point - (head + segment * factor)).length


def rigid_component_weights(
    item: bpy.types.Object,
    bones: dict[str, tuple[Vector, Vector]],
) -> dict[str, int]:
    mesh = item.data
    islands = DisjointSet(len(mesh.vertices))
    for edge in mesh.edges:
        islands.union(edge.vertices[0], edge.vertices[1])

    component_vertices: dict[int, list[int]] = defaultdict(list)
    component_centers: dict[int, Vector] = defaultdict(Vector)
    for vertex in mesh.vertices:
        root = islands.find(vertex.index)
        component_vertices[root].append(vertex.index)
        component_centers[root] += vertex.co

    assignments = defaultdict(int)
    vertex_groups = {name: item.vertex_groups.new(name=name) for name in bones}
    for root, indices in component_vertices.items():
        center = component_centers[root] / len(indices)
        bone_name = min(
            bones,
            key=lambda name: distance_to_segment(center, *bones[name]),
        )
        vertex_groups[bone_name].add(indices, 1.0, "REPLACE")
        assignments[bone_name] += 1
    return dict(sorted(assignments.items()))


def add_rig_proof_action(rig: bpy.types.Object) -> None:
    rig.animation_data_create()
    action = bpy.data.actions.new("Warden_RigidProof")
    rig.animation_data.action = action
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 30

    animated = {
        "forearm.R": ("Y", math.radians(-24)),
        "forearm.L": ("Y", math.radians(18)),
        "head": ("Z", math.radians(12)),
    }
    for name in animated:
        pose_bone = rig.pose.bones[name]
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler = (0, 0, 0)
        pose_bone.keyframe_insert("rotation_euler", frame=1, group=name)
    for name, (axis, value) in animated.items():
        pose_bone = rig.pose.bones[name]
        pose_bone.rotation_euler["XYZ".index(axis)] = value
        pose_bone.keyframe_insert("rotation_euler", frame=15, group=name)
        pose_bone.rotation_euler = (0, 0, 0)
        pose_bone.keyframe_insert("rotation_euler", frame=30, group=name)
    scene.frame_set(1)


def apply_mechanical_lod(item: bpy.types.Object, target_triangles: int) -> tuple[int, int]:
    source_triangles = len(item.data.polygons)
    if target_triangles <= 0 or source_triangles <= target_triangles:
        return source_triangles, source_triangles
    modifier = item.modifiers.new(name="MechanicalLOD0", type="DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = target_triangles / source_triangles
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = item
    item.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    item.select_set(False)
    return source_triangles, len(item.data.polygons)


def create_emissive_material(
    name: str,
    color: tuple[float, float, float, float],
    strength: float,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = color
    material.surface_render_method = "DITHERED"
    principled = next(
        node
        for node in material.node_tree.nodes
        if node.type == "BSDF_PRINCIPLED"
    )
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Metallic"].default_value = 0.0
    principled.inputs["Roughness"].default_value = 0.28
    principled.inputs["Emission Color"].default_value = color
    principled.inputs["Emission Strength"].default_value = strength
    return material


def add_emissive_semantics(warden: bpy.types.Object) -> list[str]:
    """Add explicit eye and furnace meshes without inventing a second rear core."""

    eye_material = create_emissive_material(
        "Warden_EyeGlow_Red",
        EYE_EMISSION,
        18.0,
    )
    ember_material = create_emissive_material(
        "Warden_CoreEmbers",
        EMBER_EMISSION,
        12.0,
    )
    specs = (
        ("EyeGlow.L", (0.105, 0.026, 1.950), (0.008, 0.009, 0.006), eye_material, "head"),
        ("EyeGlow.R", (0.105, -0.026, 1.950), (0.008, 0.009, 0.006), eye_material, "head"),
        ("CoreEmber.Center", (0.050, 0.000, 1.410), (0.020, 0.028, 0.035), ember_material, "spine.upper"),
        ("CoreEmber.Upper", (0.045, 0.020, 1.465), (0.014, 0.018, 0.024), ember_material, "spine.upper"),
        ("CoreEmber.Lower", (0.045, -0.020, 1.355), (0.012, 0.016, 0.020), ember_material, "spine.upper"),
    )
    semantics = [name for name, *_ in specs]
    semantic_parts: list[bpy.types.Object] = []
    for name, location, scale, material, bone_name in specs:
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2,
            radius=1.0,
            location=location,
        )
        part = bpy.context.object
        part.name = name
        part.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        part.data.materials.append(material)
        group = part.vertex_groups.new(name=bone_name)
        group.add(range(len(part.data.vertices)), 1.0, "REPLACE")
        semantic_parts.append(part)

    bpy.ops.object.select_all(action="DESELECT")
    warden.select_set(True)
    for part in semantic_parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = warden
    bpy.ops.object.join()

    warden["emissiveVisualSemantics"] = "|".join(semantics)
    warden["weaponSemantics"] = "ClawBlade.Right|SoulTaxPalm.Left"
    return semantics


def main() -> None:
    args = arguments()
    source = args.input.resolve()
    output_glb = args.output_glb.resolve()
    output_blend = args.output_blend.resolve()
    report_path = args.report.resolve()
    for output in (output_glb, output_blend, report_path):
        output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one accepted Warden source mesh, got {len(meshes)}")
    warden = meshes[0]
    warden.name = "CinderboundWarden_SourcePilot"
    normalize_source(warden)

    rig, bones = create_armature()
    assignments = rigid_component_weights(warden, bones)
    source_triangles, output_triangles = apply_mechanical_lod(
        warden,
        args.target_triangles,
    )
    emissive_semantics = add_emissive_semantics(warden)
    output_triangles = len(warden.data.polygons)
    modifier = warden.modifiers.new(name="WardenMechanicalRig", type="ARMATURE")
    modifier.object = rig
    warden.parent = rig
    warden["runtimePromotionAllowed"] = False
    warden["technicalizationStatus"] = "rigid-hierarchy-proof-retopology-pending"
    add_rig_proof_action(rig)

    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.object.select_all(action="DESELECT")
    warden.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
    )

    source_bytes = source.read_bytes()
    output_bytes = output_glb.read_bytes()
    report = {
        "source": str(source),
        "sourceBytes": len(source_bytes),
        "sourceSha256": sha256(source_bytes).hexdigest().upper(),
        "outputGlb": str(output_glb),
        "outputGlbBytes": len(output_bytes),
        "outputGlbSha256": sha256(output_bytes).hexdigest().upper(),
        "outputBlend": str(output_blend),
        "targetHeightMeters": TARGET_HEIGHT_METERS,
        "boneCount": len(rig.data.bones),
        "deformBoneCount": len(bones),
        "connectedComponentsAssigned": sum(assignments.values()),
        "componentAssignments": assignments,
        "sourceTriangles": source_triangles,
        "targetTriangles": args.target_triangles,
        "outputTriangles": output_triangles,
        "emissiveVisualSemantics": emissive_semantics,
        "weaponSemantics": ["ClawBlade.Right", "SoulTaxPalm.Left"],
        "animation": "Warden_RigidProof",
        "animationFrameRange": [1, 30],
        "status": "external-rigid-hierarchy-emissive-proof-dynamic-core-vfx-and-gameplay-qa-pending",
        "runtimePromotionAllowed": False,
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
