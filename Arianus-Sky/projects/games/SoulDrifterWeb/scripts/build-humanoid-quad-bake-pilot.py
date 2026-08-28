"""Build a local quad topology diagnostic and bake the reviewed appearance.

This is an issue #448 feasibility recipe, not a runtime-promotion recipe. It
fuses the source model's disconnected pieces with Blender's voxel remesher,
creates a fresh UV atlas, and bakes base-color and tangent-space normal maps
from the reviewed local topology pilot. Voxel union can erase finger spacing,
so this recipe is cage/topology evidence only and must never be promoted as a
visible character surface. The exported GLB remains gated until a separate,
hand-preserving visible surface passes deformation, seam, and clipping review.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

import bpy


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--texture-dir", required=True, type=Path)
    parser.add_argument("--asset-id", required=True)
    parser.add_argument("--parent-asset-id", required=True)
    parser.add_argument("--expected-source-sha256", required=True)
    parser.add_argument("--voxel-size", type=float, default=0.008)
    parser.add_argument("--texture-resolution", type=int, default=2048)
    return parser.parse_args(values)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def import_single_mesh(source: Path) -> bpy.types.Object:
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if not meshes:
        raise RuntimeError("The input GLB did not contain a mesh object")
    bpy.ops.object.select_all(action="DESELECT")
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    source_object = bpy.context.view_layer.objects.active
    source_object.name = "SourceAppearance"
    return source_object


def select_for_bake(source: bpy.types.Object, target: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    source.select_set(True)
    target.select_set(True)
    bpy.context.view_layer.objects.active = target


def select_bake_device(scene: bpy.types.Scene) -> str:
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    try:
        preferences = bpy.context.preferences.addons["cycles"].preferences
        preferences.get_devices()
        gpu = next(
            device
            for device in preferences.devices
            if device.type in {"OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"}
        )
        for device in preferences.devices:
            device.use = device == gpu
        scene.cycles.device = "GPU"
        return gpu.type
    except (KeyError, StopIteration, RuntimeError):
        return "CPU"


def make_bake_material(
    target: bpy.types.Object,
    texture_dir: Path,
    resolution: int,
) -> tuple[
    bpy.types.Material,
    bpy.types.Image,
    bpy.types.ShaderNodeTexImage,
    bpy.types.Image,
    bpy.types.ShaderNodeTexImage,
]:
    material = bpy.data.materials.new("SD_HumanoidQuadBaked")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output_node = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    material.node_tree.links.new(bsdf.outputs["BSDF"], output_node.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = 0.72
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Alpha"].default_value = 1.0
    target.data.materials.clear()
    target.data.materials.append(material)

    base = bpy.data.images.new(
        "SD_HumanoidBaseColor",
        width=resolution,
        height=resolution,
        alpha=False,
    )
    base.filepath_raw = str(texture_dir / "base-color.png")
    base.file_format = "PNG"
    base_node = nodes.new("ShaderNodeTexImage")
    base_node.name = "BakedBaseColor"
    base_node.image = base
    base_node.interpolation = "Linear"

    normal = bpy.data.images.new(
        "SD_HumanoidNormal",
        width=resolution,
        height=resolution,
        alpha=False,
    )
    normal.colorspace_settings.name = "Non-Color"
    normal.filepath_raw = str(texture_dir / "normal.png")
    normal.file_format = "PNG"
    normal_node = nodes.new("ShaderNodeTexImage")
    normal_node.name = "BakedNormal"
    normal_node.image = normal
    normal_node.interpolation = "Linear"
    return material, base, base_node, normal, normal_node


def bake_appearance(
    source: bpy.types.Object,
    target: bpy.types.Object,
    texture_dir: Path,
    resolution: int,
) -> tuple[str, bpy.types.Material]:
    material, base, base_node, normal, normal_node = make_bake_material(
        target,
        texture_dir,
        resolution,
    )
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    scene = bpy.context.scene
    device = select_bake_device(scene)
    scene.render.bake.use_selected_to_active = True
    scene.render.bake.cage_extrusion = 0.012
    scene.render.bake.max_ray_distance = 0.03
    scene.render.bake.margin = 16
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    scene.render.bake.use_pass_color = True

    select_for_bake(source, target)
    nodes.active = base_node
    bpy.ops.object.bake(type="DIFFUSE")
    base.save()
    base.pack()

    select_for_bake(source, target)
    nodes.active = normal_node
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT")
    normal.save()
    normal.pack()

    links.new(base_node.outputs["Color"], bsdf.inputs["Base Color"])
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.name = "BakedNormalMap"
    links.new(normal_node.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    return device, material


def main() -> None:
    args = parse_args()
    source = args.input.resolve()
    output = args.output.resolve()
    audit_path = args.audit.resolve()
    texture_dir = args.texture_dir.resolve()
    expected_hash = args.expected_source_sha256.upper()

    if not source.is_file():
        raise FileNotFoundError(source)
    actual_source_hash = sha256(source)
    if actual_source_hash != expected_hash:
        raise RuntimeError(
            f"Source SHA-256 mismatch: expected {expected_hash}, got {actual_source_hash}"
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    texture_dir.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    high = import_single_mesh(source)
    low = high.copy()
    low.data = high.data.copy()
    low.name = "SD_HumanoidUnifiedQuadCage"
    bpy.context.collection.objects.link(low)

    bpy.ops.object.select_all(action="DESELECT")
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    low.data.remesh_voxel_size = args.voxel_size
    low.data.remesh_voxel_adaptivity = 0.0
    low.data.use_remesh_preserve_volume = True
    bpy.ops.object.voxel_remesh()

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(
        angle_limit=1.15192,
        island_margin=0.01,
        area_weight=0.0,
        correct_aspect=True,
        scale_to_bounds=True,
    )
    bpy.ops.object.mode_set(mode="OBJECT")

    device, _material = bake_appearance(
        high,
        low,
        texture_dir,
        args.texture_resolution,
    )
    high.hide_render = True
    low["assetId"] = args.asset_id
    low["lineageKind"] = "local-derived"
    low["parentAssetId"] = args.parent_asset_id
    low["parentSha256"] = actual_source_hash
    low["runtimePromotionAllowed"] = False
    low["status"] = "non-shipping-quad-topology-diagnostic"
    low["visibleSurfaceAllowed"] = False

    bpy.ops.object.select_all(action="DESELECT")
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    low.data.calc_loop_triangles()
    quads = sum(1 for polygon in low.data.polygons if len(polygon.vertices) == 4)
    non_quads = len(low.data.polygons) - quads
    if non_quads:
        raise RuntimeError(f"Expected all-quads topology; found {non_quads} non-quads")

    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_extras=True,
        export_cameras=False,
        export_lights=False,
    )

    audit = {
        "schemaVersion": 1,
        "issue": 448,
        "assetId": args.asset_id,
        "status": "non-shipping-quad-topology-diagnostic",
        "runtimePromotionAllowed": False,
        "visibleSurfaceAllowed": False,
        "tool": {"name": "Blender", "version": bpy.app.version_string},
        "source": {
            "assetId": args.parent_asset_id,
            "file": source.name,
            "sha256": actual_source_hash,
            "bytes": source.stat().st_size,
        },
        "recipe": {
            "method": "voxel-remesh-union-smart-uv-selected-to-active-opaque-pbr-bake",
            "voxelSize": args.voxel_size,
            "textureResolution": args.texture_resolution,
            "bakeDevice": device,
            "cageExtrusion": 0.012,
            "maximumRayDistance": 0.03,
        },
        "output": {
            "file": output.name,
            "sha256": sha256(output),
            "bytes": output.stat().st_size,
            "vertices": len(low.data.vertices),
            "polygons": len(low.data.polygons),
            "quads": quads,
            "nonQuads": non_quads,
            "triangles": len(low.data.loop_triangles),
            "uvLayers": len(low.data.uv_layers),
            "materials": len(low.material_slots),
            "embeddedTextures": ["base-color", "normal"],
            "skins": 0,
            "animations": 0,
        },
        "remainingGates": [
            "hand-preserving-visible-surface-replacement",
            "close-up-elbow-wrist-and-hand-deformation-review",
            "artist-authored-edge-flow-review",
            "canonical-head-seam",
            "locomotion-retarget-proof",
            "equipment-clipping-proof",
        ],
    }
    audit_path.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(audit, indent=2))


if __name__ == "__main__":
    main()
