"""Restore complete 65-bone Mixamo hands using the accepted local hand rig.

Mixamo can report Standard Skeleton (65) yet prune all but its index chains
when these generated body meshes are downloaded. This script keeps Mixamo's
body bind, maps the proven 65-bone Human hand chains into each target hand's
local fit, transfers the canonical hand weights, limits all runtime vertices to
four influences, and exports a review-only FBX.

Run with Blender 4.5+:

    blender --background --python scripts/repair-mixamo-full-finger-rig.py -- \
      --input BODY.fbx \
      --canonical public/assets/3d/characters/human-shadowknight/human-shadowknight.glb \
      --output BODY-full-fingers.fbx \
      --report BODY-full-fingers.json
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree
import numpy as np


FINGERS = ("Thumb", "Index", "Middle", "Ring", "Pinky")
SIDES = {
    "Left": "l",
    "Right": "r",
}


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--canonical", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--neighbors", type=int, default=6)
    return parser.parse_args(sys.argv[separator + 1 :])


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def target_finger_name(side: str, finger: str, segment: int) -> str:
    return f"mixamorig:{side}Hand{finger}{segment}"


def source_finger_name(finger: str, segment: int, suffix: str) -> str:
    token = finger.lower()
    return f"{token}_{segment:02d}_{suffix}" if segment < 4 else f"{token}_04_leaf_{suffix}"


def source_to_target_bone_map(side: str, suffix: str) -> dict[str, str]:
    result = {
        f"lowerarm_{suffix}": f"mixamorig:{side}ForeArm",
        f"hand_{suffix}": f"mixamorig:{side}Hand",
    }
    for finger in FINGERS:
        for segment in range(1, 5):
            result[source_finger_name(finger, segment, suffix)] = target_finger_name(
                side, finger, segment
            )
    return result


def armature_space_vertex(
    mesh: bpy.types.Object,
    rig: bpy.types.Object,
    coordinate: Vector,
) -> Vector:
    return rig.matrix_world.inverted() @ mesh.matrix_world @ coordinate


def group_names(mesh: bpy.types.Object) -> dict[int, str]:
    return {group.index: group.name for group in mesh.vertex_groups}


def relevant_weight(
    vertex: bpy.types.MeshVertex,
    names: dict[int, str],
    prefixes: tuple[str, ...],
) -> float:
    return sum(
        assignment.weight
        for assignment in vertex.groups
        if names.get(assignment.group, "").startswith(prefixes)
    )


def local_hand_candidates(
    meshes: list[bpy.types.Object],
    rig: bpy.types.Object,
    side: str,
) -> list[tuple[bpy.types.Object, bpy.types.MeshVertex, Vector]]:
    hand = rig.data.bones[f"mixamorig:{side}Hand"]
    inverse = hand.matrix_local.inverted()
    prefix = f"mixamorig:{side}Hand"
    result = []
    for mesh in meshes:
        names = group_names(mesh)
        for vertex in mesh.data.vertices:
            if relevant_weight(vertex, names, (prefix,)) <= 0.05:
                continue
            point = armature_space_vertex(mesh, rig, vertex.co)
            result.append((mesh, vertex, inverse @ point))
    if not result:
        raise RuntimeError(f"No weighted {side} hand vertices found")
    return result


def canonical_hand_samples(
    meshes: list[bpy.types.Object],
    rig: bpy.types.Object,
    side: str,
    suffix: str,
    bone_map: dict[str, str],
) -> list[tuple[Vector, dict[str, float]]]:
    hand = rig.data.bones[f"hand_{suffix}"]
    inverse = hand.matrix_local.inverted()
    result = []
    for mesh in meshes:
        names = group_names(mesh)
        for vertex in mesh.data.vertices:
            weights: dict[str, float] = {}
            for assignment in vertex.groups:
                target_name = bone_map.get(names.get(assignment.group, ""))
                if target_name and assignment.weight > 0.000001:
                    weights[target_name] = weights.get(target_name, 0.0) + assignment.weight
            total = sum(weights.values())
            if total <= 0.05:
                continue
            point = armature_space_vertex(mesh, rig, vertex.co)
            result.append((inverse @ point, {name: weight / total for name, weight in weights.items()}))
    if not result:
        raise RuntimeError(f"No canonical {side} hand samples found")
    return result


def robust_bounds(points: list[Vector]) -> tuple[Vector, Vector]:
    data = np.array([tuple(point) for point in points], dtype=np.float64)
    minimum = np.quantile(data, 0.01, axis=0)
    maximum = np.quantile(data, 0.99, axis=0)
    if np.any(maximum - minimum < 0.000001):
        raise RuntimeError("Degenerate hand-fit bounds")
    return Vector(minimum), Vector(maximum)


def map_local(
    point: Vector,
    source_minimum: Vector,
    source_maximum: Vector,
    target_minimum: Vector,
    target_maximum: Vector,
) -> Vector:
    normalized = Vector(
        (
            (point[index] - source_minimum[index])
            / (source_maximum[index] - source_minimum[index])
            for index in range(3)
        )
    )
    return Vector(
        (
            target_minimum[index]
            + normalized[index] * (target_maximum[index] - target_minimum[index])
            for index in range(3)
        )
    )


def mapped_bone_positions(
    source_rig: bpy.types.Object,
    target_rig: bpy.types.Object,
    side: str,
    suffix: str,
    source_minimum: Vector,
    source_maximum: Vector,
    target_minimum: Vector,
    target_maximum: Vector,
) -> dict[str, tuple[Vector, Vector]]:
    source_hand = source_rig.data.bones[f"hand_{suffix}"]
    target_hand = target_rig.data.bones[f"mixamorig:{side}Hand"]
    source_inverse = source_hand.matrix_local.inverted()
    result = {}
    for finger in FINGERS:
        for segment in range(1, 5):
            source_name = source_finger_name(finger, segment, suffix)
            target_name = target_finger_name(side, finger, segment)
            bone = source_rig.data.bones[source_name]
            source_head = source_inverse @ bone.head_local
            source_tail = source_inverse @ bone.tail_local
            target_head = target_hand.matrix_local @ map_local(
                source_head,
                source_minimum,
                source_maximum,
                target_minimum,
                target_maximum,
            )
            target_tail = target_hand.matrix_local @ map_local(
                source_tail,
                source_minimum,
                source_maximum,
                target_minimum,
                target_maximum,
            )
            result[target_name] = (target_head, target_tail)
    return result


def install_finger_bones(
    rig: bpy.types.Object,
    positions: dict[str, tuple[Vector, Vector]],
) -> None:
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    edit_bones = rig.data.edit_bones
    for side in SIDES:
        hand = edit_bones[f"mixamorig:{side}Hand"]
        for finger in FINGERS:
            parent = hand
            for segment in range(1, 5):
                name = target_finger_name(side, finger, segment)
                bone = edit_bones.get(name) or edit_bones.new(name)
                bone.head, bone.tail = positions[name]
                bone.parent = parent
                bone.use_connect = False
                parent = bone
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.select_set(False)


def build_spatial_samples(
    canonical: list[tuple[Vector, dict[str, float]]],
    target_hand: bpy.types.Bone,
    source_minimum: Vector,
    source_maximum: Vector,
    target_minimum: Vector,
    target_maximum: Vector,
) -> tuple[KDTree, list[dict[str, float]], float]:
    weights = []
    tree = KDTree(len(canonical))
    for index, (local_point, sample_weights) in enumerate(canonical):
        point = target_hand.matrix_local @ map_local(
            local_point,
            source_minimum,
            source_maximum,
            target_minimum,
            target_maximum,
        )
        tree.insert(point, index)
        weights.append(sample_weights)
    tree.balance()
    diagonal = (target_maximum - target_minimum).length
    return tree, weights, diagonal


def apply_transferred_weights(
    mesh: bpy.types.Object,
    rig: bpy.types.Object,
    candidates: list[tuple[bpy.types.Object, bpy.types.MeshVertex, Vector]],
    side: str,
    tree: KDTree,
    sample_weights: list[dict[str, float]],
    neighbors: int,
    maximum_distance: float,
) -> int:
    relevant = {
        f"mixamorig:{side}ForeArm",
        f"mixamorig:{side}Hand",
        *(
            target_finger_name(side, finger, segment)
            for finger in FINGERS
            for segment in range(1, 5)
        ),
    }
    groups = {name: mesh.vertex_groups.get(name) or mesh.vertex_groups.new(name=name) for name in relevant}
    transferred = 0
    for candidate_mesh, vertex, _ in candidates:
        if candidate_mesh != mesh:
            continue
        point = armature_space_vertex(mesh, rig, vertex.co)
        nearest = tree.find_n(point, neighbors)
        if not nearest or nearest[0][2] > maximum_distance:
            continue
        aggregate: dict[str, float] = {}
        factor_total = 0.0
        for _, sample_index, distance in nearest:
            factor = 1.0 / max(distance, 0.0001) ** 2
            factor_total += factor
            for name, weight in sample_weights[sample_index].items():
                aggregate[name] = aggregate.get(name, 0.0) + weight * factor
        if factor_total <= 0:
            continue
        for group in groups.values():
            group.remove([vertex.index])
        normalized = {name: weight / factor_total for name, weight in aggregate.items()}
        total = sum(normalized.values())
        if total <= 0:
            continue
        for name, weight in normalized.items():
            groups[name].add([vertex.index], weight / total, "REPLACE")
        transferred += 1
    return transferred


def limit_influences(mesh: bpy.types.Object, maximum: int = 4) -> int:
    by_index = {group.index: group for group in mesh.vertex_groups}
    pruned = 0
    for vertex in mesh.data.vertices:
        assignments = sorted(
            ((assignment.group, assignment.weight) for assignment in vertex.groups if assignment.weight > 0.000001),
            key=lambda item: item[1],
            reverse=True,
        )
        if len(assignments) > maximum:
            for group_index, _ in assignments[maximum:]:
                by_index[group_index].remove([vertex.index])
            assignments = assignments[:maximum]
            pruned += 1
        total = sum(weight for _, weight in assignments)
        if total > 0:
            for group_index, weight in assignments:
                by_index[group_index].add([vertex.index], weight / total, "REPLACE")
    return pruned


def export_target(
    output: Path,
    rig: bpy.types.Object,
    meshes: list[bpy.types.Object],
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.fbx(
        filepath=str(output),
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
    canonical = args.canonical.resolve()
    output = args.output.resolve()
    report_path = args.report.resolve()
    if not source.is_file() or not canonical.is_file():
        raise FileNotFoundError(source if not source.is_file() else canonical)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source), automatic_bone_orientation=False)
    target_objects = set(bpy.context.scene.objects)
    target_rigs = [item for item in target_objects if item.type == "ARMATURE"]
    target_meshes = [item for item in target_objects if item.type == "MESH"]
    if len(target_rigs) != 1 or not target_meshes:
        raise RuntimeError("Target must contain one armature and at least one mesh")
    target_rig = target_rigs[0]

    bpy.ops.import_scene.gltf(filepath=str(canonical))
    canonical_objects = [item for item in bpy.context.scene.objects if item not in target_objects]
    canonical_rigs = [item for item in canonical_objects if item.type == "ARMATURE"]
    canonical_meshes = [item for item in canonical_objects if item.type == "MESH"]
    if len(canonical_rigs) != 1 or not canonical_meshes:
        raise RuntimeError("Canonical source must contain one armature and skinned meshes")
    canonical_rig = canonical_rigs[0]

    positions: dict[str, tuple[Vector, Vector]] = {}
    side_data = {}
    for side, suffix in SIDES.items():
        bone_map = source_to_target_bone_map(side, suffix)
        target_candidates = local_hand_candidates(target_meshes, target_rig, side)
        canonical_samples = canonical_hand_samples(
            canonical_meshes, canonical_rig, side, suffix, bone_map
        )
        source_minimum, source_maximum = robust_bounds([point for point, _ in canonical_samples])
        target_minimum, target_maximum = robust_bounds(
            [point for _, _, point in target_candidates]
        )
        positions.update(
            mapped_bone_positions(
                canonical_rig,
                target_rig,
                side,
                suffix,
                source_minimum,
                source_maximum,
                target_minimum,
                target_maximum,
            )
        )
        side_data[side] = {
            "boneMap": bone_map,
            "targetCandidates": target_candidates,
            "canonicalSamples": canonical_samples,
            "sourceMinimum": source_minimum,
            "sourceMaximum": source_maximum,
            "targetMinimum": target_minimum,
            "targetMaximum": target_maximum,
        }

    install_finger_bones(target_rig, positions)

    transfer_counts: dict[str, int] = {}
    pruned_vertices = 0
    for side, data in side_data.items():
        tree, weights, diagonal = build_spatial_samples(
            data["canonicalSamples"],
            target_rig.data.bones[f"mixamorig:{side}Hand"],
            data["sourceMinimum"],
            data["sourceMaximum"],
            data["targetMinimum"],
            data["targetMaximum"],
        )
        count = 0
        for mesh in target_meshes:
            count += apply_transferred_weights(
                mesh,
                target_rig,
                data["targetCandidates"],
                side,
                tree,
                weights,
                args.neighbors,
                diagonal * 0.16,
            )
        transfer_counts[side] = count
    for mesh in target_meshes:
        pruned_vertices += limit_influences(mesh)

    export_target(output, target_rig, target_meshes)
    bone_names = {bone.name for bone in target_rig.data.bones}
    missing = sorted(
        target_finger_name(side, finger, segment)
        for side in SIDES
        for finger in FINGERS
        for segment in range(1, 5)
        if target_finger_name(side, finger, segment) not in bone_names
    )
    report = {
        "schemaVersion": 1,
        "issue": 448,
        "recipe": "scripts/repair-mixamo-full-finger-rig.py",
        "input": str(source),
        "inputSha256": digest(source),
        "canonical": str(canonical),
        "canonicalSha256": digest(canonical),
        "output": str(output),
        "outputSha256": digest(output),
        "boneCount": len(bone_names),
        "missingFingerBones": missing,
        "transferredVertices": transfer_counts,
        "verticesPrunedToFourInfluences": pruned_vertices,
        "structuralPass": len(bone_names) == 65 and not missing,
        "visualDeformationReviewRequired": True,
        "runtimePromotionAllowed": False,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
