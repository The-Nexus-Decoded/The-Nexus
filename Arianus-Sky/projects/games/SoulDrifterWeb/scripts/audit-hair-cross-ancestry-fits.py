"""Render every fitted hairstyle on representative humanoid ancestry rigs.

This is a visual QA producer, not an automatic promotion gate. It proves that
the exported Head-bone-local geometry can be attached consistently and creates
the evidence needed to review scalp, ear, collar, shoulder, and silhouette fit.
"""

from __future__ import annotations

import argparse
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
    parser.add_argument("--rig-manifest", required=True, type=Path)
    parser.add_argument("--hair-manifest", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--resolution", type=int, default=320)
    return parser.parse_args(sys.argv[separator + 1 :])


def point_at(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def add_area_light(name: str, location: tuple[float, float, float], energy: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = 1.2
    light = bpy.data.objects.new(name, data)
    light.location = location
    bpy.context.collection.objects.link(light)


def neutral_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader is None:
        raise RuntimeError(f"{name}: missing Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = 0.70
    shader.inputs["Specular IOR Level"].default_value = 0.25
    return material


def configure_scene(resolution: int) -> bpy.types.Object:
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
        scene.world = bpy.data.worlds.new("HairCrossFitWorld")
    scene.world.color = (0.014, 0.018, 0.026)
    camera_data = bpy.data.cameras.new("HairCrossFitCamera")
    camera = bpy.data.objects.new("HairCrossFitCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.data.lens = 72
    return camera


def select_representatives(outputs: list[dict[str, object]]) -> list[dict[str, object]]:
    selected = {}
    for item in outputs:
        key = (item["ancestry"], item["presentation"])
        if key not in selected or item["bodyProfile"] == "heavy":
            selected[key] = item
    expected = {
        (ancestry, presentation)
        for ancestry in ("human", "elf", "dwarf", "halfling")
        for presentation in ("feminine", "masculine")
    }
    if set(selected) != expected:
        raise RuntimeError(f"Missing ancestry/presentation representatives: {expected - set(selected)}")
    return [selected[key] for key in sorted(selected)]


def find_head_bone(rig: bpy.types.Object) -> bpy.types.Bone:
    candidates = [
        bone for bone in rig.data.bones
        if bone.name == "Head" or bone.name.endswith(":Head")
    ]
    if len(candidates) != 1:
        raise RuntimeError(f"{rig.name}: expected one Head bone, found {len(candidates)}")
    return candidates[0]


def import_hair(path: Path) -> bpy.types.Object:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [
        item for item in bpy.context.scene.objects
        if item not in before and item.type == "MESH"
    ]
    if len(meshes) != 1:
        raise RuntimeError(f"{path.name}: expected one hair mesh, found {len(meshes)}")
    return meshes[0]


def bounds(points: list[Vector]) -> tuple[Vector, Vector]:
    if not points:
        raise RuntimeError("Cannot calculate bounds for an empty point set")
    return (
        Vector(min(point[index] for point in points) for index in range(3)),
        Vector(max(point[index] for point in points) for index in range(3)),
    )


def canonical_head_profile(path: Path) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    head = bpy.data.objects.get("SK_HumanHead")
    rigs = [item for item in bpy.context.scene.objects if item.type == "ARMATURE"]
    if head is None or len(rigs) != 1:
        raise RuntimeError("Canonical actor must contain SK_HumanHead and one armature")
    bone = rigs[0].data.bones.get("Head")
    if bone is None:
        raise RuntimeError("Canonical actor is missing its Head bone")
    minimum, maximum = bounds([
        head.matrix_world @ vertex.co for vertex in head.data.vertices
    ])
    return {
        "matrix": (rigs[0].matrix_world @ bone.matrix_local).copy(),
        "minimum": minimum.copy(),
        "maximum": maximum.copy(),
    }


def weighted_head_bounds(
    meshes: list[bpy.types.Object], head_bone_name: str
) -> tuple[Vector, Vector]:
    points = []
    for mesh in meshes:
        group = mesh.vertex_groups.get(head_bone_name)
        if group is None:
            continue
        for vertex in mesh.data.vertices:
            if any(
                membership.group == group.index and membership.weight > 0.15
                for membership in vertex.groups
            ):
                points.append(mesh.matrix_world @ vertex.co)
    if len(points) < 100:
        raise RuntimeError(
            f"{head_bone_name}: only {len(points)} sufficiently weighted head vertices"
        )
    return bounds(points)


def attachment_fit(
    canonical: dict[str, object],
    target_head_matrix: Matrix,
    target_minimum: Vector,
    target_maximum: Vector,
) -> tuple[Matrix, tuple[float, float, float]]:
    canonical_minimum = canonical["minimum"]
    canonical_maximum = canonical["maximum"]
    canonical_dimensions = canonical_maximum - canonical_minimum
    target_dimensions = target_maximum - target_minimum
    scale_x = target_dimensions.x / canonical_dimensions.x
    scale_y = target_dimensions.y / canonical_dimensions.y
    scale_z = (scale_x + scale_y) * 0.5
    scales = (scale_x, scale_y, scale_z)
    canonical_center = (canonical_minimum + canonical_maximum) * 0.5
    target_center = (target_minimum + target_maximum) * 0.5
    canonical_top = canonical_maximum.z + canonical_dimensions.z * 0.08
    target_top = target_maximum.z + target_dimensions.z * 0.08
    translation = Vector((
        target_center.x - canonical_center.x * scale_x,
        target_center.y - canonical_center.y * scale_y,
        target_top - canonical_top * scale_z,
    ))
    world_fit = (
        Matrix.Translation(translation)
        @ Matrix.Diagonal((*scales, 1.0))
    )
    attachment = (
        target_head_matrix.inverted()
        @ world_fit
        @ canonical["matrix"]
    )
    return attachment, scales


def render_body_hair_matrix(
    body_record: dict[str, object],
    hair_records: list[dict[str, object]],
    canonical: dict[str, object],
    output_root: Path,
    resolution: int,
) -> list[dict[str, object]]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(Path(body_record["riggedFbx"])))
    rigs = [item for item in bpy.context.scene.objects if item.type == "ARMATURE"]
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if len(rigs) != 1 or not meshes:
        raise RuntimeError(f"{body_record['assetId']}: invalid rigged FBX scene")
    rig = rigs[0]
    head_bone = find_head_bone(rig)
    head_matrix = rig.matrix_world @ head_bone.matrix_local
    head_minimum, head_maximum = weighted_head_bounds(meshes, head_bone.name)
    attachment, attachment_scales = attachment_fit(
        canonical, head_matrix, head_minimum, head_maximum
    )
    head_target = (head_minimum + head_maximum) * 0.5
    body_height = max(
        (item.matrix_world @ Vector(corner)).z
        for item in meshes
        for corner in item.bound_box
    ) - min(
        (item.matrix_world @ Vector(corner)).z
        for item in meshes
        for corner in item.bound_box
    )
    if body_height <= 0.0:
        raise RuntimeError(f"{body_record['assetId']}: body height is zero")

    head_target += Vector((0.0, 0.0, (head_maximum.z - head_minimum.z) * 0.08))
    camera = configure_scene(resolution)
    distance = body_height * 0.38
    camera.location = (
        head_target.x + distance * 0.34,
        head_target.y - distance,
        head_target.z + body_height * 0.015,
    )
    point_at(camera, head_target)
    add_area_light(
        "HairFitKey",
        (head_target.x - distance, head_target.y - distance, head_target.z + distance),
        250,
    )
    add_area_light(
        "HairFitFill",
        (head_target.x + distance, head_target.y - distance * 0.3, head_target.z),
        110,
    )
    body_material = neutral_material("HairFitBody", (0.18, 0.10, 0.07, 1.0))
    hair_material = neutral_material("HairFitHair", (0.025, 0.018, 0.015, 1.0))
    for mesh in meshes:
        mesh.data.materials.clear()
        mesh.data.materials.append(body_material)

    body_root = output_root / str(body_record["assetId"])
    body_root.mkdir(parents=True, exist_ok=True)
    baseline = body_root / "00-body-baseline.png"
    bpy.context.scene.render.filepath = str(baseline)
    bpy.ops.render.render(write_still=True)
    records = []
    for hair_record in hair_records:
        hair = import_hair(Path(hair_record["output"]))
        hair.matrix_world = head_matrix @ attachment
        hair.data.materials.clear()
        hair.data.materials.append(hair_material)
        preview = body_root / f"{hair_record['assetId']}-cross-fit.png"
        bpy.context.scene.render.filepath = str(preview)
        bpy.ops.render.render(write_still=True)
        records.append({
            "bodyAssetId": body_record["assetId"],
            "ancestry": body_record["ancestry"],
            "presentation": body_record["presentation"],
            "bodyProfile": body_record["bodyProfile"],
            "hairAssetId": hair_record["assetId"],
            "preview": str(preview),
            "bodyBaseline": str(baseline),
            "attachmentBone": head_bone.name,
            "attachmentScale": [round(value, 8) for value in attachment_scales],
            "attachmentTransform": [
                round(attachment[row][column], 8)
                for row in range(4)
                for column in range(4)
            ],
            "targetHeadBounds": {
                "minimum": [round(value, 8) for value in head_minimum],
                "maximum": [round(value, 8) for value in head_maximum],
            },
            "visualScalpCoverageReviewRequired": True,
            "visualEarClearanceReviewRequired": True,
            "visualCollarShoulderClearanceReviewRequired": True,
            "runtimePromotionAllowed": False,
        })
        bpy.data.objects.remove(hair, do_unlink=True)
    return records


def main() -> None:
    args = arguments()
    canonical_path = args.canonical.resolve()
    rig_manifest_path = args.rig_manifest.resolve()
    hair_manifest_path = args.hair_manifest.resolve()
    output_root = args.output_root.resolve()
    rig_manifest = json.loads(rig_manifest_path.read_text(encoding="utf-8"))
    hair_manifest = json.loads(hair_manifest_path.read_text(encoding="utf-8"))
    canonical = canonical_head_profile(canonical_path)
    representatives = select_representatives(rig_manifest["outputs"])
    records = []
    for index, body in enumerate(representatives):
        body_records = render_body_hair_matrix(
            body, hair_manifest["outputs"], canonical, output_root, args.resolution
        )
        records.extend(body_records)
        print(f"[{index + 1}/{len(representatives)}] rendered {body['assetId']}")

    result = {
        "schemaVersion": 1,
        "issue": 448,
        "recipe": "scripts/audit-hair-cross-ancestry-fits.py",
        "canonical": str(canonical_path),
        "rigManifest": str(rig_manifest_path),
        "hairManifest": str(hair_manifest_path),
        "representativeBodyCount": len(representatives),
        "hairStyleCount": len(hair_manifest["outputs"]),
        "previewCount": len(records),
        "requiredVisualGates": [
            "scalp-coverage",
            "ear-clearance",
            "collar-and-shoulder-clearance",
            "weapon-clearance",
            "smallest-viewport-readability",
        ],
        "runtimePromotionAllowed": False,
        "records": records,
    }
    output_root.mkdir(parents=True, exist_ok=True)
    manifest = output_root / "hair-cross-ancestry-fit-audit-v001.json"
    manifest.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "manifest": str(manifest),
        "representativeBodyCount": len(representatives),
        "hairStyleCount": len(hair_manifest["outputs"]),
        "previewCount": len(records),
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception:  # noqa: BLE001 - Blender must propagate batch failures.
        traceback.print_exc()
        raise SystemExit(1)
