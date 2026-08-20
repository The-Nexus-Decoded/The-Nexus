"""Fit the 12 technicalized hairstyles to the canonical SoulDrifter head.

The fitted meshes are exported in canonical Head-bone local space. Runtime can
therefore attach one hairstyle geometry to the resolved humanoid head bone and
apply any approved hair-color material without duplicating meshes.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys
import traceback

import bpy
from mathutils import Matrix, Vector


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical", required=True, type=Path)
    parser.add_argument("--hair-manifest", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--resolution", type=int, default=512)
    return parser.parse_args(sys.argv[separator + 1 :])


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def world_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [
        item.matrix_world @ Vector(corner)
        for item in objects
        for corner in item.bound_box
    ]
    return (
        Vector(min(point[index] for point in points) for index in range(3)),
        Vector(max(point[index] for point in points) for index in range(3)),
    )


def join_meshes(objects: list[bpy.types.Object], name: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for item in objects:
        item.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    result = bpy.context.object
    result.name = name
    return result


def apply_world_fit(
    hair: bpy.types.Object,
    source_minimum: Vector,
    source_maximum: Vector,
    head_minimum: Vector,
    head_maximum: Vector,
) -> dict[str, list[float]]:
    source_dimensions = source_maximum - source_minimum
    head_dimensions = head_maximum - head_minimum
    source_center = (source_minimum + source_maximum) * 0.5
    head_center = (head_minimum + head_maximum) * 0.5

    scale_x = (head_dimensions.x * 1.12) / source_dimensions.x
    scale_y = (head_dimensions.y * 1.08) / source_dimensions.y
    scale_z = (scale_x + scale_y) * 0.5
    target_top = head_maximum.z + head_dimensions.z * 0.08
    translation = Vector((
        head_center.x - source_center.x * scale_x,
        head_center.y - source_center.y * scale_y,
        target_top - source_maximum.z * scale_z,
    ))
    hair.matrix_world = Matrix.Translation(translation) @ Matrix.Diagonal(
        (scale_x, scale_y, scale_z, 1.0)
    )
    return {
        "scale": [round(scale_x, 8), round(scale_y, 8), round(scale_z, 8)],
        "translation": [round(value, 8) for value in translation],
    }


def convert_to_bone_local(hair: bpy.types.Object, head_matrix: Matrix) -> None:
    transform = head_matrix.inverted() @ hair.matrix_world
    for vertex in hair.data.vertices:
        vertex.co = transform @ vertex.co
    hair.matrix_world = head_matrix


def add_area_light(name: str, location: tuple[float, float, float], energy: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = 1.3
    light = bpy.data.objects.new(name, data)
    light.location = location
    bpy.context.collection.objects.link(light)


def point_at(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def configure_render(output_root: Path, resolution: int, target: Vector) -> bpy.types.Object:
    scene = bpy.context.scene
    engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = next(
        engine for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE") if engine in engines
    )
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("HairFitWorld")
    scene.world.color = (0.018, 0.022, 0.03)

    camera_data = bpy.data.cameras.new("HairFitCamera")
    camera = bpy.data.objects.new("HairFitCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.location = (target.x + 0.34, target.y - 0.52, target.z + 0.11)
    camera.data.lens = 58
    point_at(camera, target)
    add_area_light("HairKey", (-0.42, -0.55, target.z + 0.35), 900)
    add_area_light("HairFill", (0.55, -0.2, target.z + 0.15), 550)
    add_area_light("HairRim", (0.0, 0.45, target.z + 0.25), 750)
    output_root.mkdir(parents=True, exist_ok=True)
    return camera


def export_hair(hair: bpy.types.Object, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    hair.select_set(True)
    bpy.context.view_layer.objects.active = hair
    original_matrix = hair.matrix_world.copy()
    hair.matrix_world = Matrix.Identity(4)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_yup=True,
    )
    hair.matrix_world = original_matrix


def main() -> None:
    args = arguments()
    canonical = args.canonical.resolve()
    manifest_path = args.hair_manifest.resolve()
    output_root = args.output_root.resolve()
    if not canonical.is_file() or not manifest_path.is_file():
        raise FileNotFoundError(canonical if not canonical.is_file() else manifest_path)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(canonical))
    canonical_objects = set(bpy.context.scene.objects)
    head = bpy.data.objects.get("SK_HumanHead")
    rigs = [item for item in canonical_objects if item.type == "ARMATURE"]
    if head is None or len(rigs) != 1:
        raise RuntimeError("Canonical actor must contain SK_HumanHead and one armature")
    rig = rigs[0]
    head_bone = rig.data.bones.get("Head")
    if head_bone is None:
        raise RuntimeError("Canonical actor is missing the Head attachment bone")
    head_matrix = rig.matrix_world @ head_bone.matrix_local
    head_minimum, head_maximum = world_bounds([head])
    head_center = (head_minimum + head_maximum) * 0.5

    for item in canonical_objects:
        if item.type == "MESH" and item != head:
            item.hide_render = True
    configure_render(output_root, args.resolution, head_center)
    source_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    outputs = []

    for index, source_record in enumerate(source_manifest["outputs"]):
        source = Path(source_record["output"])
        before = set(bpy.context.scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(source))
        imported = [item for item in bpy.context.scene.objects if item not in before]
        imported_names = [item.name for item in imported]
        hair_meshes = [item for item in imported if item.type == "MESH"]
        if not hair_meshes:
            raise RuntimeError(f"No hair mesh imported for {source_record['id']}")
        hair = join_meshes(hair_meshes, f"SD_Hair_{source_record['id']}")
        source_minimum, source_maximum = world_bounds([hair])
        fit = apply_world_fit(hair, source_minimum, source_maximum, head_minimum, head_maximum)
        fitted_minimum, fitted_maximum = world_bounds([hair])
        convert_to_bone_local(hair, head_matrix)
        hair["souldrifterAssetId"] = f"hair-{source_record['id']}-v001"
        hair["attachmentBone"] = "humanoid.head"
        hair["attachmentProfile"] = "head-seam-v1"
        hair["hairColorMaterialFamily"] = "natural-hair-v1"

        output = output_root / f"sd-hair-{source_record['id']}-head-fit-v001.glb"
        preview = output_root / f"sd-hair-{source_record['id']}-head-fit-v001.png"
        export_hair(hair, output)
        bpy.context.scene.render.filepath = str(preview)
        bpy.ops.render.render(write_still=True)
        outputs.append({
            "assetId": f"hair-{source_record['id']}-v001",
            "source": str(source),
            "sourceSha256": digest(source),
            "output": str(output),
            "outputBytes": output.stat().st_size,
            "outputSha256": digest(output),
            "preview": str(preview),
            "triangles": sum(len(polygon.vertices) - 2 for polygon in hair.data.polygons),
            "fit": fit,
            "fittedWorldBounds": {
                "minimum": [round(value, 8) for value in fitted_minimum],
                "maximum": [round(value, 8) for value in fitted_maximum],
            },
            "attachmentBone": "humanoid.head",
            "attachmentProfile": "head-seam-v1",
            "independentHairColor": True,
            "visualScalpEarShoulderClippingReviewRequired": True,
            "runtimePromotionAllowed": False,
        })
        bpy.data.objects.remove(hair, do_unlink=True)
        for name in imported_names:
            item = bpy.data.objects.get(name)
            if item is not None:
                bpy.data.objects.remove(item, do_unlink=True)
        print(f"[{index + 1}/{len(source_manifest['outputs'])}] fitted {source_record['id']}")

    result = {
        "schemaVersion": 1,
        "issue": 448,
        "recipe": "scripts/fit-hair-library-to-canonical-head.py",
        "canonicalHead": str(canonical),
        "canonicalHeadSha256": digest(canonical),
        "headObject": head.name,
        "headBone": head_bone.name,
        "attachmentProfile": "head-seam-v1",
        "styleCount": len(outputs),
        "independentHairColor": True,
        "runtimePromotionAllowed": False,
        "outputs": outputs,
    }
    result_path = output_root / "hair-library-head-fit-v001.json"
    result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"manifest": str(result_path), "styleCount": len(outputs)}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception:  # noqa: BLE001 - Blender must propagate batch failures.
        traceback.print_exc()
        raise SystemExit(1)
