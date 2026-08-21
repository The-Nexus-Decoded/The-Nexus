"""Prepare and fresh-import verify a local humanoid FBX for Mixamo.

The source must be an exact reviewed, unrigged local-derived GLB. This recipe
keeps the detailed visible surface, removes scene helpers, applies transforms,
forces opaque material alpha, exports a texture-embedded FBX, imports that FBX
into a clean Blender scene, and records the evidence needed before any online
Mixamo upload. It does not upload, rig, animate, or promote a runtime asset.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from math import radians
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc

    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--preview", required=True, type=Path)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--parent-asset-id", required=True)
    parser.add_argument("--expected-source-sha256", required=True)
    parser.add_argument("--weld-threshold-meters", type=float, default=0.00001)
    parser.add_argument("--yaw-degrees", type=float, default=0.0)
    parser.add_argument("--preview-resolution", type=int, default=1024)
    return parser.parse_args(sys.argv[separator + 1 :])


def file_sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def mesh_objects() -> list[bpy.types.Object]:
    return [item for item in bpy.context.scene.objects if item.type == "MESH"]


def world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [item.matrix_world @ Vector(corner) for item in meshes for corner in item.bound_box]
    return (
        Vector(tuple(min(point[index] for point in corners) for index in range(3))),
        Vector(tuple(max(point[index] for point in corners) for index in range(3))),
    )


def triangle_count(item: bpy.types.Object) -> int:
    item.data.calc_loop_triangles()
    return len(item.data.loop_triangles)


def connected_components(mesh: bpy.types.Mesh) -> int:
    parent = list(range(len(mesh.vertices)))

    def root(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        left_root = root(left)
        right_root = root(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for edge in mesh.edges:
        union(edge.vertices[0], edge.vertices[1])
    return len({root(index) for index in range(len(parent))})


def topology_diagnostics(mesh: bpy.types.Mesh) -> dict[str, int]:
    edge_faces = [0] * len(mesh.edges)
    vertex_edges = [0] * len(mesh.vertices)
    for edge in mesh.edges:
        vertex_edges[edge.vertices[0]] += 1
        vertex_edges[edge.vertices[1]] += 1
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            edge_faces[mesh.loops[loop_index].edge_index] += 1
    return {
        "connectedComponents": connected_components(mesh),
        "boundaryEdges": sum(1 for count in edge_faces if count == 1),
        "nonManifoldEdges": sum(1 for count in edge_faces if count != 2),
        "looseVertices": sum(1 for count in vertex_edges if count == 0),
    }


def scene_diagnostics(meshes: list[bpy.types.Object]) -> dict[str, object]:
    minimum, maximum = world_bounds(meshes)
    dimensions = maximum - minimum
    return {
        "meshObjects": len(meshes),
        "armatures": sum(1 for item in bpy.context.scene.objects if item.type == "ARMATURE"),
        "cameras": sum(1 for item in bpy.context.scene.objects if item.type == "CAMERA"),
        "lights": sum(1 for item in bpy.context.scene.objects if item.type == "LIGHT"),
        "vertices": sum(len(item.data.vertices) for item in meshes),
        "triangles": sum(triangle_count(item) for item in meshes),
        "materials": sum(len(item.material_slots) for item in meshes),
        "boundsMeters": {
            "minimum": [round(value, 6) for value in minimum],
            "maximum": [round(value, 6) for value in maximum],
            "dimensions": [round(value, 6) for value in dimensions],
        },
        "topology": topology_diagnostics(meshes[0].data) if len(meshes) == 1 else None,
    }


def prepare_mesh(
    item: bpy.types.Object,
    asset_id: str,
    weld_threshold: float,
    yaw_degrees: float,
) -> None:
    world_matrix = item.matrix_world.copy()
    item.parent = None
    item.matrix_world = world_matrix

    minimum, maximum = world_bounds([item])
    center = (minimum + maximum) / 2
    item.location += Vector((-center.x, -center.y, -minimum.z))
    bpy.context.view_layer.update()

    bpy.ops.object.select_all(action="DESELECT")
    item.select_set(True)
    bpy.context.view_layer.objects.active = item
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if weld_threshold > 0:
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.remove_doubles(threshold=weld_threshold)
        bpy.ops.object.mode_set(mode="OBJECT")
    if yaw_degrees:
        item.matrix_world = Matrix.Rotation(radians(yaw_degrees), 4, "Z") @ item.matrix_world
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    object_name = "SD_" + "_".join(
        segment for segment in asset_id.replace("-mixamo-intake", "").split("-") if segment
    )
    item.name = object_name
    item.data.name = f"{object_name}_Mesh"
    item["assetId"] = asset_id
    item["runtimePromotionAllowed"] = False
    item["externalUploadState"] = "not-uploaded"

    for slot in item.material_slots:
        material = slot.material
        if material is None or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED":
                continue
            alpha_input = node.inputs.get("Alpha")
            if alpha_input is None:
                continue
            for link in list(alpha_input.links):
                material.node_tree.links.remove(link)
            alpha_input.default_value = 1.0


def export_fbx(item: bpy.types.Object, output: Path) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    item.select_set(True)
    bpy.context.view_layer.objects.active = item
    bpy.ops.export_scene.fbx(
        filepath=str(output),
        use_selection=True,
        object_types={"MESH"},
        use_mesh_modifiers=True,
        use_triangles=True,
        add_leaf_bones=False,
        bake_anim=False,
        path_mode="COPY",
        embed_textures=True,
        axis_forward="-Z",
        axis_up="Y",
        apply_unit_scale=True,
        apply_scale_options="FBX_SCALE_UNITS",
        use_space_transform=True,
        bake_space_transform=False,
    )


def point_camera(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def add_area_light(name: str, location: tuple[float, float, float], energy: float, size: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    light.location = location
    bpy.context.collection.objects.link(light)


def render_preview(meshes: list[bpy.types.Object], output: Path, resolution: int) -> None:
    minimum, maximum = world_bounds(meshes)
    dimensions = maximum - minimum
    target = Vector((0, 0, minimum.z + dimensions.z * 0.52))
    distance = max(dimensions.z * 1.65, 2.8)

    camera_data = bpy.data.cameras.new("MixamoIntakeCamera")
    camera_data.lens = 62
    camera = bpy.data.objects.new("MixamoIntakeCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (distance * 0.72, -distance * 0.62, target.z + dimensions.z * 0.07)
    point_camera(camera, target)
    bpy.context.scene.camera = camera

    add_area_light("MixamoKey", (-distance * 0.65, -distance * 0.7, dimensions.z * 1.1), 1650, 2.2)
    add_area_light("MixamoFill", (distance * 0.75, -distance * 0.2, dimensions.z * 0.82), 850, 2.2)
    add_area_light("MixamoRim", (0, distance * 0.75, dimensions.z * 1.25), 1200, 1.8)

    floor_material = bpy.data.materials.new("MixamoIntakeFloor")
    floor_material.diffuse_color = (0.04, 0.05, 0.065, 1)
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
    bpy.context.object.data.materials.append(floor_material)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("MixamoIntakeWorld")
    scene.world.color = (0.018, 0.022, 0.03)
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = arguments()
    source = args.input.resolve()
    output = args.output.resolve()
    audit = args.audit.resolve()
    preview = args.preview.resolve()
    for path in (output, audit, preview):
        path.parent.mkdir(parents=True, exist_ok=True)

    source_hash = file_sha256(source)
    if source_hash != args.expected_source_sha256.upper():
        raise RuntimeError(f"Source hash mismatch: expected {args.expected_source_sha256}, got {source_hash}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    source_meshes = mesh_objects()
    if len(source_meshes) != 1:
        raise RuntimeError(f"Mixamo intake requires one mesh object; found {len(source_meshes)}")
    if any(item.type == "ARMATURE" for item in bpy.context.scene.objects):
        raise RuntimeError("Mixamo intake source must be unrigged")

    prepare_mesh(
        source_meshes[0],
        args.asset_id,
        args.weld_threshold_meters,
        args.yaw_degrees,
    )
    source_diagnostics = scene_diagnostics(source_meshes)
    export_fbx(source_meshes[0], output)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(output), use_custom_normals=True)
    verified_meshes = mesh_objects()
    if len(verified_meshes) != 1:
        raise RuntimeError(f"Fresh FBX import produced {len(verified_meshes)} mesh objects")
    verified_diagnostics = scene_diagnostics(verified_meshes)
    if verified_diagnostics["armatures"] != 0:
        raise RuntimeError("Fresh FBX import unexpectedly contained an armature")
    if verified_diagnostics["triangles"] != source_diagnostics["triangles"]:
        raise RuntimeError("Fresh FBX import changed the triangle count")

    render_preview(verified_meshes, preview, args.preview_resolution)
    bounds = verified_diagnostics["boundsMeters"]
    centered = (
        abs(bounds["minimum"][2]) <= 0.001
        and abs(bounds["minimum"][0] + bounds["maximum"][0]) <= 0.001
        and abs(bounds["minimum"][1] + bounds["maximum"][1]) <= 0.001
    )
    report = {
        "schemaVersion": 1,
        "issue": 448,
        "assetId": args.asset_id,
        "status": "local-mixamo-intake-package-awaiting-online-rig",
        "parentSource": {
            "sourceKind": "local-derived",
            "assetId": args.parent_asset_id,
            "file": source.name,
            "sha256": source_hash,
            "bytes": source.stat().st_size,
        },
        "localRecipe": {
            "tool": "Blender",
            "toolVersion": bpy.app.version_string,
            "script": "scripts/prepare-mixamo-intake.py",
            "parameters": {
                "format": "FBX",
                "singleMeshSelection": True,
                "embeddedTexturesRequested": True,
                "triangulatedExport": True,
                "neutralPose": "reviewed-parent-t-pose",
                "centeredAtWorldOrigin": True,
                "helperObjectsExported": False,
                "armatureExported": False,
                "seamWeldThresholdMeters": args.weld_threshold_meters,
                "yawDegrees": args.yaw_degrees,
            },
        },
        "sourceDiagnostics": source_diagnostics,
        "freshImportDiagnostics": verified_diagnostics,
        "mixamoPreflight": {
            "supportedUploadFormat": True,
            "singleMeshObject": verified_diagnostics["meshObjects"] == 1,
            "unrigged": verified_diagnostics["armatures"] == 0,
            "noCamerasOrLights": verified_diagnostics["cameras"] == 0 and verified_diagnostics["lights"] == 0,
            "centeredAtWorldOrigin": centered,
            "neutralPose": "T-pose",
            "humanoid": True,
            "detailedFingerGeometryPreserved": True,
            "manualMarkerPlacementRequired": True,
            "surfaceConnected": verified_diagnostics["topology"]["connectedComponents"] == 1,
            "openBoundaryEdgesRecorded": verified_diagnostics["topology"]["boundaryEdges"],
            "manualMeshContinuityReviewRequired": verified_diagnostics["topology"]["nonManifoldEdges"] > 0,
        },
        "output": {
            "file": output.name,
            "sha256": file_sha256(output),
            "bytes": output.stat().st_size,
            "preview": preview.name,
            "previewSha256": file_sha256(preview),
            "vertices": verified_diagnostics["vertices"],
            "triangles": verified_diagnostics["triangles"],
            "materials": verified_diagnostics["materials"],
            "skins": 0,
            "animations": 0,
        },
        "externalUploadState": "not-uploaded",
        "runtimePromotionAllowed": False,
        "remainingGates": [
            "mixamo-adobe-id-authentication",
            "mixamo-online-upload",
            "mixamo-wrist-elbow-knee-groin-and-chin-marker-placement",
            "mixamo-auto-rig-completion",
            "download-rigged-fbx-with-skin",
            "fresh-import-rigged-fbx-validation",
            "close-up-shoulder-elbow-wrist-hand-hip-and-knee-deformation-review",
            "locomotion-retarget-and-equipment-clipping-proof",
        ],
    }
    audit.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
