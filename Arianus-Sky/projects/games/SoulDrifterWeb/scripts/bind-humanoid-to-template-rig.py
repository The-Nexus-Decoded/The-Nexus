"""Bind an unrigged humanoid derivative to an accepted 65-bone template.

The target keeps its reviewed geometry and materials. The template contributes
only its skeleton hierarchy and normalized skin-weight field. Bone locations
and weight samples are fitted through robust normalized body bounds, allowing
the same production skeleton contract to be applied to different humanoid
proportions without another browser upload.

Run with Blender 4.5+:

    blender --background --python scripts/bind-humanoid-to-template-rig.py -- \
      --input TARGET.glb --template TEMPLATE.fbx --output TARGET-rigged.fbx \
      --report TARGET-rigged.json --asset-id body-dwarf-feminine-heavy-v001
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree
import numpy as np


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--template", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--neighbors", type=int, default=6)
    return parser.parse_args(sys.argv[separator + 1 :])


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def import_model(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    suffix = path.suffix.lower()
    if suffix == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    elif suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(path))
    else:
        raise ValueError(f"Unsupported model format: {path.suffix}")
    return [item for item in bpy.context.scene.objects if item not in before]


def mesh_points(meshes: list[bpy.types.Object]) -> list[Vector]:
    return [mesh.matrix_world @ vertex.co for mesh in meshes for vertex in mesh.data.vertices]


def align_target_to_template_axes(meshes: list[bpy.types.Object]) -> bool:
    """Convert generated +X-facing bodies to Mixamo's -Y-facing convention."""
    points = mesh_points(meshes)
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    dimensions = maximum - minimum
    if dimensions.x >= dimensions.y:
        return False
    rotation = Matrix.Rotation(math.radians(-90.0), 4, "Z")
    for mesh in meshes:
        mesh.matrix_world = rotation @ mesh.matrix_world
    bpy.context.view_layer.update()
    return True


def robust_bounds(points: list[Vector]) -> tuple[Vector, Vector]:
    if not points:
        raise RuntimeError("Cannot fit an empty mesh collection")
    coordinates = np.asarray([tuple(point) for point in points], dtype=np.float64)
    minimum = np.quantile(coordinates, 0.005, axis=0)
    maximum = np.quantile(coordinates, 0.995, axis=0)
    if np.any(maximum - minimum < 0.000001):
        raise RuntimeError("Degenerate body-fit bounds")
    return Vector(minimum), Vector(maximum)


def normalize(point: Vector, minimum: Vector, maximum: Vector) -> Vector:
    return Vector(
        tuple(
            (point[index] - minimum[index]) / (maximum[index] - minimum[index])
            for index in range(3)
        )
    )


def denormalize(point: Vector, minimum: Vector, maximum: Vector) -> Vector:
    return Vector(
        tuple(
            minimum[index] + point[index] * (maximum[index] - minimum[index])
            for index in range(3)
        )
    )


def clone_fitted_armature(
    template: bpy.types.Object,
    template_bounds: tuple[Vector, Vector],
    target_bounds: tuple[Vector, Vector],
    asset_id: str,
) -> bpy.types.Object:
    data = bpy.data.armatures.new(f"{asset_id}-rig")
    rig = bpy.data.objects.new(f"{asset_id}-rig", data)
    bpy.context.collection.objects.link(rig)
    rig.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    source_minimum, source_maximum = template_bounds
    target_minimum, target_maximum = target_bounds
    created: dict[str, bpy.types.EditBone] = {}
    for source in template.data.bones:
        bone = data.edit_bones.new(source.name)
        source_head = template.matrix_world @ source.head_local
        source_tail = template.matrix_world @ source.tail_local
        bone.head = denormalize(
            normalize(source_head, source_minimum, source_maximum),
            target_minimum,
            target_maximum,
        )
        bone.tail = denormalize(
            normalize(source_tail, source_minimum, source_maximum),
            target_minimum,
            target_maximum,
        )
        if (bone.tail - bone.head).length < 0.00001:
            bone.tail = bone.head + Vector((0.0, 0.0001, 0.0))
        bone.roll = source.matrix_local.to_3x3().to_euler().y
        bone.use_deform = source.use_deform
        created[source.name] = bone
    for source in template.data.bones:
        if source.parent:
            created[source.name].parent = created[source.parent.name]
            created[source.name].use_connect = source.use_connect
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.select_set(False)
    rig["issue"] = 448
    rig["assetId"] = asset_id
    rig["runtimePromotionAllowed"] = False
    return rig


def template_weight_samples(
    meshes: list[bpy.types.Object],
    bounds: tuple[Vector, Vector],
    bone_names: set[str],
) -> tuple[KDTree, list[dict[str, float]]]:
    minimum, maximum = bounds
    sample_count = sum(len(mesh.data.vertices) for mesh in meshes)
    tree = KDTree(sample_count)
    samples: list[dict[str, float]] = []
    for mesh in meshes:
        names = {group.index: group.name for group in mesh.vertex_groups}
        for vertex in mesh.data.vertices:
            weights = {
                names[assignment.group]: assignment.weight
                for assignment in vertex.groups
                if names.get(assignment.group) in bone_names and assignment.weight > 0.000001
            }
            point = normalize(mesh.matrix_world @ vertex.co, minimum, maximum)
            tree.insert(point, len(samples))
            samples.append(weights)
    tree.balance()
    return tree, samples


def transfer_weights(
    mesh: bpy.types.Object,
    bounds: tuple[Vector, Vector],
    tree: KDTree,
    samples: list[dict[str, float]],
    neighbors: int,
) -> dict[str, int]:
    minimum, maximum = bounds
    for group in list(mesh.vertex_groups):
        mesh.vertex_groups.remove(group)
    groups: dict[str, bpy.types.VertexGroup] = {}
    unweighted = 0
    for vertex in mesh.data.vertices:
        point = normalize(mesh.matrix_world @ vertex.co, minimum, maximum)
        nearest = tree.find_n(point, neighbors)
        aggregate: dict[str, float] = {}
        factor_total = 0.0
        for _, sample_index, distance in nearest:
            sample = samples[sample_index]
            if not sample:
                continue
            factor = 1.0 / max(distance, 0.0001) ** 2
            factor_total += factor
            for name, weight in sample.items():
                aggregate[name] = aggregate.get(name, 0.0) + weight * factor
        if factor_total <= 0.0 or not aggregate:
            unweighted += 1
            continue
        ranked = sorted(
            ((name, weight / factor_total) for name, weight in aggregate.items()),
            key=lambda item: item[1],
            reverse=True,
        )[:4]
        total = sum(weight for _, weight in ranked)
        if total <= 0.0:
            unweighted += 1
            continue
        for name, weight in ranked:
            group = groups.get(name)
            if group is None:
                group = mesh.vertex_groups.new(name=name)
                groups[name] = group
            group.add([vertex.index], weight / total, "REPLACE")
    return {
        "vertices": len(mesh.data.vertices),
        "unweightedVertices": unweighted,
        "weightedGroups": len(groups),
    }


def attach(meshes: list[bpy.types.Object], rig: bpy.types.Object) -> None:
    for mesh in meshes:
        modifier = mesh.modifiers.new(name="Armature", type="ARMATURE")
        modifier.object = rig
        mesh.parent = rig
        mesh.matrix_parent_inverse = rig.matrix_world.inverted()


def remove_objects(objects: list[bpy.types.Object]) -> None:
    for item in objects:
        bpy.data.objects.remove(item, do_unlink=True)


def export_fbx(path: Path, rig: bpy.types.Object, meshes: list[bpy.types.Object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.fbx(
        filepath=str(path),
        use_selection=True,
        object_types={"ARMATURE", "MESH"},
        add_leaf_bones=False,
        bake_anim=False,
        apply_unit_scale=True,
        apply_scale_options="FBX_SCALE_ALL",
        axis_forward="-Z",
        axis_up="Y",
    )


def main() -> None:
    args = arguments()
    source = args.input.resolve()
    template_path = args.template.resolve()
    output = args.output.resolve()
    report_path = args.report.resolve()
    if not source.is_file() or not template_path.is_file():
        raise FileNotFoundError(source if not source.is_file() else template_path)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    target_objects = import_model(source)
    target_meshes = [item for item in target_objects if item.type == "MESH"]
    target_rigs = [item for item in target_objects if item.type == "ARMATURE"]
    if not target_meshes or target_rigs:
        raise RuntimeError("Target must contain meshes and no armature")
    targetAxisRotationApplied = align_target_to_template_axes(target_meshes)

    template_objects = import_model(template_path)
    template_meshes = [item for item in template_objects if item.type == "MESH"]
    template_rigs = [item for item in template_objects if item.type == "ARMATURE"]
    if not template_meshes or len(template_rigs) != 1:
        raise RuntimeError("Template must contain one armature and skinned meshes")
    template_rig = template_rigs[0]
    bone_names = {bone.name for bone in template_rig.data.bones}
    if len(bone_names) != 65:
        raise RuntimeError(f"Template must contain exactly 65 bones; found {len(bone_names)}")

    target_bounds = robust_bounds(mesh_points(target_meshes))
    template_bounds = robust_bounds(mesh_points(template_meshes))
    rig = clone_fitted_armature(
        template_rig,
        template_bounds,
        target_bounds,
        args.asset_id,
    )
    tree, samples = template_weight_samples(template_meshes, template_bounds, bone_names)
    mesh_reports = [
        {
            "mesh": mesh.name,
            **transfer_weights(mesh, target_bounds, tree, samples, args.neighbors),
        }
        for mesh in target_meshes
    ]
    attach(target_meshes, rig)
    remove_objects(template_objects)
    export_fbx(output, rig, target_meshes)

    report = {
        "schemaVersion": 1,
        "issue": 448,
        "assetId": args.asset_id,
        "recipe": "scripts/bind-humanoid-to-template-rig.py",
        "input": str(source),
        "inputSha256": digest(source),
        "template": str(template_path),
        "templateSha256": digest(template_path),
        "output": str(output),
        "outputSha256": digest(output),
        "boneCount": len(rig.data.bones),
        "rootBones": sorted(bone.name for bone in rig.data.bones if bone.parent is None),
        "targetAxisRotationApplied": targetAxisRotationApplied,
        "meshes": mesh_reports,
        "structuralPass": len(rig.data.bones) == 65
        and all(item["unweightedVertices"] == 0 for item in mesh_reports),
        "visualDeformationReviewRequired": True,
        "runtimePromotionAllowed": False,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
