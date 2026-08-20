"""Build a local, non-shipping humanoid topology/appearance pilot.

The pilot deliberately keeps provider source files outside the repository and
writes only the locally reduced derivative plus its audit evidence. It is a
visual and performance feasibility gate, not final deformation topology.

Run with Blender:

    blender --background --python scripts/build-humanoid-retopo-pilot.py -- \
      --input SOURCE.glb --output OUTPUT.glb --audit AUDIT.json \
      --preview PREVIEW.png --asset-id ASSET_ID --source-task-id TASK_ID \
      --expected-source-sha256 HASH
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


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
    parser.add_argument("--source-task-id", required=True)
    parser.add_argument("--expected-source-sha256", required=True)
    parser.add_argument("--intended-runtime-slot", required=True)
    parser.add_argument("--target-triangles", type=int, default=45000)
    parser.add_argument("--target-height-meters", type=float, default=1.82)
    parser.add_argument("--preview-resolution", type=int, default=1024)
    return parser.parse_args(sys.argv[separator + 1 :])


def mesh_objects() -> list[bpy.types.Object]:
    return [item for item in bpy.context.scene.objects if item.type == "MESH"]


def triangle_count(item: bpy.types.Object) -> int:
    item.data.calc_loop_triangles()
    return len(item.data.loop_triangles)


def vertex_count(meshes: list[bpy.types.Object]) -> int:
    return sum(len(item.data.vertices) for item in meshes)


def total_triangles(meshes: list[bpy.types.Object]) -> int:
    return sum(triangle_count(item) for item in meshes)


def world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [item.matrix_world @ Vector(corner) for item in meshes for corner in item.bound_box]
    return (
        Vector(tuple(min(point[index] for point in corners) for index in range(3))),
        Vector(tuple(max(point[index] for point in corners) for index in range(3))),
    )


def top_level_imports() -> list[bpy.types.Object]:
    return [
        item
        for item in bpy.context.scene.objects
        if item.parent is None and item.type not in {"CAMERA", "LIGHT"}
    ]


def normalize_subject(meshes: list[bpy.types.Object], target_height: float) -> list[float]:
    minimum, maximum = world_bounds(meshes)
    source_height = maximum.z - minimum.z
    if source_height <= 0:
        raise RuntimeError("Imported source has no measurable height")

    scale = target_height / source_height
    for item in top_level_imports():
        item.scale *= scale
    bpy.context.view_layer.update()

    minimum, maximum = world_bounds(meshes)
    center = (minimum + maximum) / 2
    translation = Vector((-center.x, -center.y, -minimum.z))
    for item in top_level_imports():
        item.location += translation
    bpy.context.view_layer.update()

    minimum, maximum = world_bounds(meshes)
    return [round(value, 6) for value in (maximum - minimum)]


def reduce_meshes(meshes: list[bpy.types.Object], target_triangles: int) -> None:
    source_triangles = total_triangles(meshes)
    if source_triangles <= target_triangles:
        return

    ratio = max(0.001, min(1.0, target_triangles / source_triangles))
    for item in meshes:
        bpy.context.view_layer.objects.active = item
        item.select_set(True)
        modifier = item.modifiers.new(name="SD_LocalVisualRetopo", type="DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        for polygon in item.data.polygons:
            polygon.use_smooth = True
        item.select_set(False)


def export_selected(meshes: list[bpy.types.Object], output: Path) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for item in meshes:
        item.select_set(True)
        item["souldrifterLineage"] = "local-derived"
        item["runtimePromotionAllowed"] = False
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
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
    radius = max(dimensions.x, dimensions.y, dimensions.z * 0.72) / 2

    camera_data = bpy.data.cameras.new("PilotCamera")
    camera_data.lens = 58
    camera = bpy.data.objects.new("PilotCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    vertical_fov = 2 * math.atan(camera_data.sensor_height / (2 * camera_data.lens))
    distance = max(radius / math.tan(vertical_fov / 2) * 1.4, 2.6)
    camera.location = (distance * 0.82, -distance * 0.58, target.z + dimensions.z * 0.08)
    point_camera(camera, target)
    bpy.context.scene.camera = camera

    light_scale = max(dimensions.length, 1.0)
    add_area_light("PilotKey", (-distance * 0.7, -distance * 0.75, dimensions.z * 1.15), 1700, light_scale)
    add_area_light("PilotFill", (distance * 0.8, -distance * 0.2, dimensions.z * 0.8), 900, light_scale)
    add_area_light("PilotRim", (0, distance * 0.8, dimensions.z * 1.3), 1300, light_scale * 0.8)

    floor_material = bpy.data.materials.new("PilotFloor")
    floor_material.diffuse_color = (0.045, 0.055, 0.07, 1)
    bpy.ops.mesh.primitive_plane_add(size=max(dimensions.x, dimensions.y, 1.0) * 5, location=(0, 0, 0))
    bpy.context.object.data.materials.append(floor_material)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("PilotWorld")
    scene.world.color = (0.018, 0.022, 0.03)
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    args = arguments()
    source = args.input.resolve()
    output = args.output.resolve()
    audit = args.audit.resolve()
    preview = args.preview.resolve()
    for path in (output, audit, preview):
        path.parent.mkdir(parents=True, exist_ok=True)

    if not source.is_file():
        raise FileNotFoundError(source)
    source_hash = file_sha256(source)
    expected_hash = args.expected_source_sha256.upper()
    if source_hash != expected_hash:
        raise RuntimeError(f"Source hash mismatch: expected {expected_hash}, got {source_hash}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = mesh_objects()
    if not meshes:
        raise RuntimeError("Source imported without mesh objects")

    source_vertices = vertex_count(meshes)
    source_triangles = total_triangles(meshes)
    source_materials = sum(len(item.material_slots) for item in meshes)
    dimensions = normalize_subject(meshes, args.target_height_meters)
    reduce_meshes(meshes, args.target_triangles)
    output_vertices = vertex_count(meshes)
    output_triangles = total_triangles(meshes)
    output_materials = sum(len(item.material_slots) for item in meshes)

    export_selected(meshes, output)
    render_preview(meshes, preview, args.preview_resolution)

    report = {
        "schemaVersion": 1,
        "assetId": args.asset_id,
        "lineageKind": "local-derived",
        "status": "non-shipping-visual-topology-pilot",
        "parentSource": {
            "provider": "3d-ai-studio",
            "taskId": args.source_task_id,
            "file": source.name,
            "sha256": source_hash,
            "bytes": source.stat().st_size,
        },
        "localRecipe": {
            "tool": "Blender",
            "toolVersion": bpy.app.version_string,
            "script": "scripts/build-humanoid-retopo-pilot.py",
            "gpuAccelerationUsed": True,
            "gpuAccelerationUse": "BLENDER_EEVEE_NEXT preview rendering; mesh reduction is CPU-bound",
            "parameters": {
                "method": "collapse-decimation-preserving-source-materials-and-uvs",
                "targetTriangles": args.target_triangles,
                "targetHeightMeters": args.target_height_meters,
                "smoothShading": True,
            },
        },
        "sourceDiagnostics": {
            "meshObjects": len(meshes),
            "vertices": source_vertices,
            "triangles": source_triangles,
            "materialSlots": source_materials,
        },
        "output": {
            "file": output.name,
            "sha256": file_sha256(output),
            "bytes": output.stat().st_size,
            "vertices": output_vertices,
            "triangles": output_triangles,
            "materials": output_materials,
            "skins": 0,
            "animations": 0,
            "dimensionsMeters": dimensions,
            "preview": preview.name,
        },
        "intendedRuntimeSlot": args.intended_runtime_slot,
        "runtimePromotionAllowed": False,
        "remainingGates": [
            "owner-visual-comparison",
            "deformation-friendly-quad-topology",
            "canonical-head-seam",
            "uv-and-pbr-bake-validation",
            "canonical-rig-and-weight-paint",
            "locomotion-and-clipping-proof",
        ],
    }
    audit.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
