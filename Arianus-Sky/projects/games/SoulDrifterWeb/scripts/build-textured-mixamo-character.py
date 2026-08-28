"""Build a textured SoulDrifter character on an accepted Mixamo rig.

The Tripo OBJ is the UV/material authority. The Mixamo FBX is the geometry,
skeleton, and skin-weight authority. The script reconstructs the shared vertex
identity from both topology graphs, moves every split Tripo UV vertex onto its
accepted Mixamo T-pose vertex, copies the exact Mixamo weights, and exports one
auditable GLB plus a Blender source and JSON receipt.

Run with Blender:

    blender --background --python scripts/build-textured-mixamo-character.py -- \
      --source-obj SOURCE.obj --rigged-fbx RIGGED.fbx \
      --output-glb OUTPUT.glb --output-blend OUTPUT.blend --report REPORT.json
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import bmesh
import bpy


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-obj", required=True)
    parser.add_argument("--rigged-fbx", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--runtime-texture")
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def replace_base_color_texture(source: bpy.types.Object, texture_path: Path) -> None:
    if not texture_path.is_file():
        raise FileNotFoundError(texture_path)
    image = bpy.data.images.load(str(texture_path), check_existing=True)
    image_nodes = []
    for material in source.data.materials:
        if material is None or material.node_tree is None:
            continue
        image_nodes.extend(
            node for node in material.node_tree.nodes if node.type == "TEX_IMAGE"
        )
    if not image_nodes:
        raise RuntimeError("Tripo material has no image texture node")
    image_nodes[0].image = image


def triangulate(mesh: bpy.types.Object) -> None:
    editable = bmesh.new()
    editable.from_mesh(mesh.data)
    bmesh.ops.triangulate(
        editable,
        faces=list(editable.faces),
        quad_method="BEAUTY",
        ngon_method="BEAUTY",
    )
    editable.to_mesh(mesh.data)
    editable.free()
    mesh.data.update()


def build_vertex_identity_mapping(
    source: bpy.types.Object,
    target: bpy.types.Object,
) -> tuple[list[int], dict[str, float | int]]:
    triangulate(target)
    if len(source.data.polygons) != len(target.data.polygons):
        raise RuntimeError(
            "Tripo/Mixamo polygon count differs after triangulation: "
            f"{len(source.data.polygons)} != {len(target.data.polygons)}"
        )
    if len(source.data.loops) != len(target.data.loops):
        raise RuntimeError(
            "Tripo/Mixamo loop count differs after triangulation: "
            f"{len(source.data.loops)} != {len(target.data.loops)}"
        )
    unique_positions = []
    unique_index = {}
    source_to_unique = []
    for vertex in source.data.vertices:
        key = tuple(round(value, 7) for value in vertex.co)
        if key not in unique_index:
            unique_index[key] = len(unique_positions)
            unique_positions.append(vertex.co.copy())
        source_to_unique.append(unique_index[key])
    if len(unique_positions) != len(target.data.vertices):
        raise RuntimeError(
            "Collapsed Tripo/Mixamo vertex count differs: "
            f"{len(unique_positions)} != {len(target.data.vertices)}"
        )

    candidate_targets = {index: set() for index in range(len(unique_positions))}
    for source_polygon, target_polygon in zip(source.data.polygons, target.data.polygons):
        source_ids = [source_to_unique[index] for index in source_polygon.vertices]
        for source_id, target_id in zip(source_ids, target_polygon.vertices):
            candidate_targets[source_id].add(target_id)
    mapping = {
        source_id: next(iter(targets))
        for source_id, targets in candidate_targets.items()
        if len(targets) == 1
    }
    if len(set(mapping.values())) != len(mapping):
        raise RuntimeError("Direct Tripo/Mixamo topology mapping is not one-to-one")

    source_adjacency = {index: set() for index in range(len(unique_positions))}
    for polygon in source.data.polygons:
        ids = [source_to_unique[index] for index in polygon.vertices]
        for left, right in zip(ids, ids[1:] + ids[:1]):
            source_adjacency[left].add(right)
            source_adjacency[right].add(left)
    target_adjacency = {index: set() for index in range(len(target.data.vertices))}
    for polygon in target.data.polygons:
        ids = list(polygon.vertices)
        for left, right in zip(ids, ids[1:] + ids[:1]):
            target_adjacency[left].add(right)
            target_adjacency[right].add(left)

    def coordinate_bounds(coordinates):
        return (
            [min(coordinate[axis] for coordinate in coordinates) for axis in range(3)],
            [max(coordinate[axis] for coordinate in coordinates) for axis in range(3)],
        )

    source_min, source_max = coordinate_bounds(unique_positions)
    target_positions = [vertex.co.copy() for vertex in target.data.vertices]
    target_min, target_max = coordinate_bounds(target_positions)
    normalized_positions = [
        [
            target_min[axis]
            + ((position[axis] - source_min[axis]) / (source_max[axis] - source_min[axis]))
            * (target_max[axis] - target_min[axis])
            for axis in range(3)
        ]
        for position in unique_positions
    ]

    remaining_targets = set(range(len(target.data.vertices))) - set(mapping.values())
    unresolved = set(range(len(unique_positions))) - set(mapping)
    direct_resolved = len(mapping)
    while unresolved:
        source_id = max(
            unresolved,
            key=lambda item: sum(
                1 for neighbor in source_adjacency[item] if neighbor in mapping
            ),
        )
        mapped_neighbors = {
            mapping[neighbor]
            for neighbor in source_adjacency[source_id]
            if neighbor in mapping
        }
        candidates = candidate_targets[source_id] & remaining_targets
        if not candidates:
            candidates = remaining_targets
        target_id = max(
            sorted(candidates),
            key=lambda item: (
                len(mapped_neighbors & target_adjacency[item]),
                -abs(len(source_adjacency[source_id]) - len(target_adjacency[item])),
                -sum(
                    (normalized_positions[source_id][axis] - target_positions[item][axis]) ** 2
                    for axis in range(3)
                ),
            ),
        )
        mapping[source_id] = target_id
        remaining_targets.remove(target_id)
        unresolved.remove(source_id)

    source_edges = {
        tuple(sorted((left, right)))
        for left, neighbors in source_adjacency.items()
        for right in neighbors
    }
    preserved_edges = sum(
        1
        for left, right in source_edges
        if mapping[right] in target_adjacency[mapping[left]]
    )
    edge_ratio = preserved_edges / len(source_edges)
    if edge_ratio < 0.995:
        raise RuntimeError(f"Topology mapping preserved only {edge_ratio:.4%} of edges")
    return source_to_unique, {
        "collapsedSourceVertices": len(unique_positions),
        "directResolvedVertices": direct_resolved,
        "resolvedVertices": len(mapping),
        "sourceEdges": len(source_edges),
        "preservedEdges": preserved_edges,
        "edgePreservationRatio": edge_ratio,
        "mapping": mapping,
    }


def apply_mixamo_geometry_and_weights(
    source: bpy.types.Object,
    target: bpy.types.Object,
    source_to_unique: list[int],
    mapping: dict[int, int],
) -> tuple[int, int]:
    groups = {
        group.index: source.vertex_groups.new(name=group.name)
        for group in target.vertex_groups
    }
    weighted_vertices = 0
    max_influences = 0
    for source_vertex in source.data.vertices:
        target_vertex = target.data.vertices[mapping[source_to_unique[source_vertex.index]]]
        source_vertex.co = target_vertex.co
        max_influences = max(max_influences, len(target_vertex.groups))
        if target_vertex.groups:
            weighted_vertices += 1
        for membership in target_vertex.groups:
            groups[membership.group].add(
                [source_vertex.index], membership.weight, "REPLACE"
            )
    source.data.update()
    return weighted_vertices, max_influences


def main() -> None:
    args = parse_args()
    source_obj = Path(args.source_obj).resolve()
    rigged_fbx = Path(args.rigged_fbx).resolve()
    output_glb = Path(args.output_glb).resolve()
    output_blend = Path(args.output_blend).resolve()
    report_path = Path(args.report).resolve()
    runtime_texture = Path(args.runtime_texture).resolve() if args.runtime_texture else None
    for path in (source_obj, rigged_fbx):
        if not path.is_file():
            raise FileNotFoundError(path)
    for path in (output_glb, output_blend, report_path):
        path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.obj_import(filepath=str(source_obj))
    source_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(source_meshes) != 1:
        raise RuntimeError(f"Expected one Tripo mesh, got {[obj.name for obj in source_meshes]}")
    source = source_meshes[0]
    if not source.data.uv_layers:
        raise RuntimeError("Tripo source has no UV layer")
    if runtime_texture is not None:
        replace_base_color_texture(source, runtime_texture)

    objects_before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(rigged_fbx), automatic_bone_orientation=False)
    imported = [obj for obj in bpy.data.objects if obj not in objects_before]
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    weighted_meshes = [obj for obj in imported if obj.type == "MESH"]
    if len(armatures) != 1 or len(weighted_meshes) != 1:
        raise RuntimeError(
            f"Expected one Mixamo armature/mesh, got {len(armatures)}/{len(weighted_meshes)}"
        )
    armature = armatures[0]
    weighted_mesh = weighted_meshes[0]
    armature.name = "HumanFoundation_Armature"
    if len(armature.data.bones) != 65:
        raise RuntimeError(f"Expected 65 Mixamo bones, got {len(armature.data.bones)}")
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if roots != ["mixamorig:Hips"]:
        raise RuntimeError(f"Unexpected Mixamo roots: {roots}")

    source_to_unique, topology = build_vertex_identity_mapping(
        source, weighted_mesh
    )
    mapping = topology.pop("mapping")
    weighted_vertices, max_influences = apply_mixamo_geometry_and_weights(
        source, weighted_mesh, source_to_unique, mapping
    )
    mesh_validation_changed = source.data.validate(clean_customdata=False)
    source.data.update()
    if weighted_vertices != len(source.data.vertices):
        raise RuntimeError(
            f"Only {weighted_vertices}/{len(source.data.vertices)} textured vertices have weights"
        )
    source.name = "HumanFoundation_Body"
    source.data.name = "HumanFoundation_BodyMesh"
    modifier = source.modifiers.new(name="MixamoArmature", type="ARMATURE")
    modifier.object = armature
    source.parent = armature
    source.matrix_parent_inverse = armature.matrix_world.inverted()
    bpy.data.objects.remove(weighted_mesh, do_unlink=True)
    if armature.animation_data is not None:
        armature.animation_data_clear()
    armature.data.pose_position = "POSE"

    bpy.ops.object.select_all(action="DESELECT")
    source.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_morph=False,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_apply=False,
        export_all_influences=False,
        export_influence_nb=4,
    )

    images = [
        {"name": image.name, "size": list(image.size), "packed": bool(image.packed_file)}
        for image in bpy.data.images
        if image.size[0] and image.size[1]
    ]
    report = {
        "sourceObj": str(source_obj),
        "sourceObjSha256": file_sha256(source_obj),
        "riggedFbx": str(rigged_fbx),
        "riggedFbxSha256": file_sha256(rigged_fbx),
        "runtimeTexture": str(runtime_texture) if runtime_texture else None,
        "runtimeTextureSha256": file_sha256(runtime_texture) if runtime_texture else None,
        "outputGlb": str(output_glb),
        "outputGlbBytes": output_glb.stat().st_size,
        "outputGlbSha256": file_sha256(output_glb),
        "outputBlend": str(output_blend),
        "outputBlendSha256": file_sha256(output_blend),
        "mesh": source.name,
        "vertices": len(source.data.vertices),
        "polygons": len(source.data.polygons),
        "loops": len(source.data.loops),
        "meshValidationChanged": mesh_validation_changed,
        "uvLayers": [layer.name for layer in source.data.uv_layers],
        "images": images,
        "armature": armature.name,
        "boneCount": len(armature.data.bones),
        "rootBones": roots,
        "weightedVertices": weighted_vertices,
        "maxInfluences": max_influences,
        "uvTransfer": "topology-identity-with-split-uv-vertices",
        "topologyMapping": topology,
        "status": "runtime_visual_verification_pending",
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("TEXTURED_MIXAMO_CHARACTER=" + json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
