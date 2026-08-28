"""Build neutral, tintable SoulDrifter hairstyle pilots from preserved sources.

Run with Blender 4.5+:

    blender --background --python scripts/technicalize-hair-library.py -- \
      --source-root H:/.../issue-448/model-sources \
      --output-root H:/.../technicalized-pilots/hair-library-v001

The outputs remain outside the shipping tree until skull fitting and clipping
QA pass. Source geometry is preserved; this pass normalizes provenance,
triangle budgets, texture size, neutral color response, naming, and previews.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector
import numpy as np


STYLE_SOURCES = {
    "masc-cropped-fade": "sd-hair-masc-cropped-meshy-lowpoly-",
    "masc-short-curly": "sd-hair-masc-curly-meshy-lowpoly-",
    "masc-shoulder-loose": "sd-hair-masc-shoulder-meshy-lowpoly-",
    "masc-swept-back": "sd-hair-masc-swept-meshy-lowpoly-",
    "masc-topknot": "sd-hair-masc-topknot-meshy-lowpoly-",
    "masc-warrior-braid": "sd-hair-masc-warrior-braid-meshy-lowpoly-",
    "fem-bob": "sd-hair-fem-bob-meshy-lowpoly-",
    "fem-braided-crown": "sd-hair-fem-braided-crown-meshy-lowpoly-",
    "fem-high-ponytail": "sd-hair-fem-high-ponytail-meshy-lowpoly-",
    "fem-long-wavy": "sd-hair-fem-long-wavy-meshy-lowpoly-",
    "fem-pixie": "sd-hair-fem-pixie-meshy-lowpoly-",
    "fem-twin-braids": "sd-hair-fem-twin-braids-meshy-lowpoly-",
}


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--target-triangles", type=int, default=6000)
    parser.add_argument("--texture-size", type=int, default=1024)
    parser.add_argument("--preview-resolution", type=int, default=720)
    return parser.parse_args(sys.argv[separator + 1 :])


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def resolve_source(root: Path, prefix: str) -> Path:
    matches = sorted(root.glob(f"{prefix}*.glb"))
    if len(matches) != 1:
        raise RuntimeError(f"Expected one source for {prefix}; found {len(matches)}")
    return matches[0]


def triangle_count(mesh: bpy.types.Object) -> int:
    mesh.data.calc_loop_triangles()
    return len(mesh.data.loop_triangles)


def bounds(mesh: bpy.types.Object) -> tuple[Vector, Vector]:
    corners = [mesh.matrix_world @ Vector(corner) for corner in mesh.bound_box]
    return (
        Vector(tuple(min(point[index] for point in corners) for index in range(3))),
        Vector(tuple(max(point[index] for point in corners) for index in range(3))),
    )


def join_meshes(meshes: list[bpy.types.Object]) -> bpy.types.Object:
    if len(meshes) == 1:
        bpy.context.view_layer.objects.active = meshes[0]
        return meshes[0]
    bpy.ops.object.select_all(action="DESELECT")
    for mesh in meshes:
        mesh.hide_set(False)
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    result = bpy.context.object
    if result is None or result.type != "MESH":
        raise RuntimeError("Failed to join hairstyle meshes")
    return result


def linked_base_color_images(material: bpy.types.Material) -> set[bpy.types.Image]:
    if not material.use_nodes or material.node_tree is None:
        return set()
    result: set[bpy.types.Image] = set()
    for node in material.node_tree.nodes:
        if node.type != "BSDF_PRINCIPLED":
            continue
        socket = node.inputs.get("Base Color")
        if socket is None:
            continue
        for link in socket.links:
            image = getattr(link.from_node, "image", None)
            if image is not None:
                result.add(image)
    return result


def linked_images(material: bpy.types.Material) -> set[bpy.types.Image]:
    if not material.use_nodes or material.node_tree is None:
        return set()
    return {
        node.image
        for node in material.node_tree.nodes
        if node.type == "TEX_IMAGE" and node.image is not None
    }


def resize_and_pack_image(image: bpy.types.Image, texture_size: int) -> None:
    width, height = image.size
    if width <= 0 or height <= 0:
        return
    if max(width, height) > texture_size:
        scale = texture_size / max(width, height)
        image.scale(max(1, round(width * scale)), max(1, round(height * scale)))
    image.pack()


def neutralize_image(image: bpy.types.Image, texture_size: int) -> None:
    width, height = image.size
    if width <= 0 or height <= 0:
        return
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    rgba = pixels.reshape((-1, 4))
    luminance = rgba[:, :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    # Keep strand variation while avoiding a grey multiplier that muddies the
    # runtime-selected color.
    neutral = np.clip(0.55 + luminance * 0.45, 0.0, 1.0)
    rgba[:, 0] = neutral
    rgba[:, 1] = neutral
    rgba[:, 2] = neutral
    image.pixels.foreach_set(pixels)
    image.name = f"SD_HairNeutral_{image.name}"
    resize_and_pack_image(image, texture_size)


def prepare_materials(mesh: bpy.types.Object, texture_size: int) -> None:
    neutralized: set[bpy.types.Image] = set()
    resized: set[bpy.types.Image] = set()
    for index, material in enumerate(mesh.data.materials):
        if material is None:
            continue
        base_color_images = linked_base_color_images(material)
        for image in linked_images(material):
            if image not in resized and image not in base_color_images:
                resize_and_pack_image(image, texture_size)
                resized.add(image)
        for image in base_color_images:
            if image not in neutralized:
                neutralize_image(image, texture_size)
                neutralized.add(image)
                resized.add(image)
        material.name = f"SD_Hair_Neutral_{index + 1:02d}"
        material.diffuse_color = (1.0, 1.0, 1.0, 1.0)
        if material.use_nodes and material.node_tree is not None:
            for node in material.node_tree.nodes:
                if node.type != "BSDF_PRINCIPLED":
                    continue
                base = node.inputs.get("Base Color")
                roughness = node.inputs.get("Roughness")
                if base is not None:
                    base.default_value = (1.0, 1.0, 1.0, 1.0)
                if roughness is not None:
                    roughness.default_value = max(float(roughness.default_value), 0.62)


def reduce_mesh(mesh: bpy.types.Object, target: int) -> tuple[int, int]:
    before = triangle_count(mesh)
    if before <= target:
        return before, before
    modifier = mesh.modifiers.new("SD_Hair_LOD0_Budget", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = max(0.05, min(1.0, target / before))
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    return before, triangle_count(mesh)


def add_area_light(name: str, location: tuple[float, float, float], energy: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = 1.6
    light = bpy.data.objects.new(name, data)
    light.location = location
    bpy.context.collection.objects.link(light)


def render_preview(mesh: bpy.types.Object, output: Path, resolution: int) -> None:
    minimum, maximum = bounds(mesh)
    dimensions = maximum - minimum
    center = (minimum + maximum) * 0.5
    camera_data = bpy.data.cameras.new("HairPreviewCamera")
    camera_data.lens = 58
    camera = bpy.data.objects.new("HairPreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (center.x + dimensions.x * 1.3, center.y - max(dimensions.y, dimensions.z) * 2.1, center.z + dimensions.z * 0.15)
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera
    add_area_light("HairKey", (center.x - 1.3, center.y - 1.6, center.z + 1.4), 1200)
    add_area_light("HairFill", (center.x + 1.4, center.y - 0.4, center.z + 0.6), 700)
    add_area_light("HairRim", (center.x, center.y + 1.2, center.z + 1.2), 950)
    scene = bpy.context.scene
    engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("HairPreviewWorld")
    scene.world.color = (0.025, 0.03, 0.04)
    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def process(style_id: str, source: Path, output_root: Path, args: argparse.Namespace) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"No mesh found in {source}")
    mesh = join_meshes(meshes)
    mesh.name = f"SD_Hair_{style_id.replace('-', '_')}"
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    original_triangles, output_triangles = reduce_mesh(mesh, args.target_triangles)
    prepare_materials(mesh, args.texture_size)
    minimum, maximum = bounds(mesh)
    output = output_root / f"sd-hair-{style_id}-technicalized-v001.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_apply=True,
        use_selection=False,
        export_cameras=False,
        export_lights=False,
    )
    preview = output.with_suffix(".png")
    render_preview(mesh, preview, args.preview_resolution)
    return {
        "id": style_id,
        "presentationSource": style_id.split("-", 1)[0],
        "source": str(source),
        "sourceBytes": source.stat().st_size,
        "sourceSha256": digest(source),
        "sourceTriangles": original_triangles,
        "output": str(output),
        "outputBytes": output.stat().st_size,
        "outputSha256": digest(output),
        "outputTriangles": output_triangles,
        "materialSlots": len(mesh.material_slots),
        "bounds": {
            "minimum": [round(value, 6) for value in minimum],
            "maximum": [round(value, 6) for value in maximum],
        },
        "preview": str(preview),
        "status": "technicalized-pilot-skull-fit-and-clipping-qa-required",
        "runtimePromotionAllowed": False,
    }


def main() -> None:
    args = arguments()
    source_root = args.source_root.resolve()
    output_root = args.output_root.resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [
        process(style_id, resolve_source(source_root, prefix), output_root, args)
        for style_id, prefix in STYLE_SOURCES.items()
    ]
    manifest = {
        "schemaVersion": 1,
        "issue": 448,
        "recipe": "scripts/technicalize-hair-library.py",
        "targetTrianglesPerStyle": args.target_triangles,
        "textureSize": args.texture_size,
        "styleCount": len(outputs),
        "independentRuntimeHairColorRequired": True,
        "outputs": outputs,
    }
    manifest_path = output_root / "hair-library-technicalization-v001.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"manifest": str(manifest_path), "styleCount": len(outputs)}, indent=2))


if __name__ == "__main__":
    main()
