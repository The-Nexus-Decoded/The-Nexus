"""Render four non-destructive audit views of an untouched GLB source.

Run with Blender, keeping outputs outside the repository unless a reviewed proof
is intentionally committed:

    blender --background --python scripts/render-source-turntable.py -- \
      --input SOURCE.glb --output-dir AUDIT_DIR --label asset-id
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
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--label", required=True)
    parser.add_argument("--resolution", type=int, default=768)
    parser.add_argument("--front-axis", choices=("+X", "-X", "+Y", "-Y"), default="+X")
    return parser.parse_args(sys.argv[separator + 1 :])


def scene_meshes() -> list[bpy.types.Object]:
    return [item for item in bpy.context.scene.objects if item.type == "MESH"]


def world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [
        item.matrix_world @ Vector(corner)
        for item in meshes
        for corner in item.bound_box
    ]
    return (
        Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners))),
        Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners))),
    )


def add_area_light(name: str, location: tuple[float, float, float], energy: float, size: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    light.location = location
    bpy.context.collection.objects.link(light)


def point_camera(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def main() -> None:
    args = arguments()
    source = args.input.resolve()
    output_dir = args.output_dir.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    output_dir.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = scene_meshes()
    if not meshes:
        raise RuntimeError(f"{source.name} imported without meshes")

    minimum, maximum = world_bounds(meshes)
    center = (minimum + maximum) / 2
    root_objects = [item for item in bpy.context.scene.objects if item.parent is None]
    translation = Vector((-center.x, -center.y, -minimum.z))
    for item in root_objects:
        item.location += translation
    bpy.context.view_layer.update()

    minimum, maximum = world_bounds(meshes)
    dimensions = maximum - minimum
    target = Vector((0, 0, minimum.z + dimensions.z * 0.52))
    subject_radius = max(dimensions.x, dimensions.y, dimensions.z * 0.72) / 2

    camera_data = bpy.data.cameras.new("AuditCamera")
    camera_data.lens = 62
    camera_data.sensor_width = 36
    camera = bpy.data.objects.new("AuditCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    vertical_fov = 2 * math.atan(camera_data.sensor_height / (2 * camera_data.lens))
    distance = max(subject_radius / math.tan(vertical_fov / 2) * 1.35, 2.0)

    light_scale = max(dimensions.length, 1.0)
    add_area_light("Key", (-distance * 0.65, -distance * 0.8, dimensions.z * 1.1), 1500, light_scale)
    add_area_light("Fill", (distance * 0.8, -distance * 0.25, dimensions.z * 0.7), 900, light_scale)
    add_area_light("Rim", (0, distance * 0.75, dimensions.z * 1.25), 1200, light_scale * 0.8)

    floor_material = bpy.data.materials.new("AuditFloor")
    floor_material.diffuse_color = (0.07, 0.085, 0.10, 1)
    bpy.ops.mesh.primitive_plane_add(size=max(dimensions.x, dimensions.y, 1.0) * 4, location=(0, 0, 0))
    bpy.context.object.data.materials.append(floor_material)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = args.resolution
    scene.render.resolution_y = args.resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("AuditWorld")
    scene.world.color = (0.025, 0.03, 0.04)

    front_direction = {
        "+X": Vector((1, 0, 0)),
        "-X": Vector((-1, 0, 0)),
        "+Y": Vector((0, 1, 0)),
        "-Y": Vector((0, -1, 0)),
    }[args.front_axis]
    left_direction = Vector((-front_direction.y, front_direction.x, 0))
    view_directions = {
        "front": front_direction,
        "left": left_direction,
        "rear": -front_direction,
        "right": -left_direction,
    }
    views = {
        name: Vector((direction.x * distance, direction.y * distance, target.z))
        for name, direction in view_directions.items()
    }
    rendered = []
    for view, location in views.items():
        camera.location = location
        point_camera(camera, target)
        output = output_dir / f"{args.label}-{view}.png"
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        rendered.append(output.name)

    source_bytes = source.read_bytes()
    report = {
        "source": str(source),
        "sourceBytes": len(source_bytes),
        "sourceSha256": sha256(source_bytes).hexdigest().upper(),
        "label": args.label,
        "meshCount": len(meshes),
        "meshNames": [item.name for item in meshes],
        "dimensions": [round(value, 6) for value in dimensions],
        "materials": len(bpy.data.materials) - 1,
        "skins": len([item for item in bpy.context.scene.objects if item.type == "ARMATURE"]),
        "renderEngine": scene.render.engine,
        "frontAxis": args.front_axis,
        "views": rendered,
        "sourceModified": False,
    }
    (output_dir / f"{args.label}-audit.json").write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
