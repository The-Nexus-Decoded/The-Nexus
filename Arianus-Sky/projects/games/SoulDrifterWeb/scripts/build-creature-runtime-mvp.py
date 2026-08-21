"""Build bounded First Breach creature visuals for the internal MVP.

This local-only step preserves the accepted authored PBR sources while reducing
geometry and texture cost enough for the Sites package. Runtime transform clips
remain code-authored for the MVP; anatomy-specific deformation is tracked by
issue #458.

Run with Blender 5.2+:

    blender --background --python scripts/build-creature-runtime-mvp.py -- \
      --intake-root H:/Projects/AI_Tools_And_Information/The-Nexus-asset-intake/SoulDrifter/issue-448 \
      --output-root public/assets/3d/local-derived/issue-448/creatures
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import bpy


BREACHLING_SOURCE = "model-sources/sd-creature-breachling-base-meshy7-multiview-ash-tail-source.glb"
WARDEN_SOURCE = "technicalized-pilots/warden-rigid-v006-emissive/sd-creature-cinderbound-warden-rigid-lod0-pilot-v006.glb"


def arguments() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--intake-root", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    return parser.parse_args(values)


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def triangle_count() -> int:
    return sum(len(obj.data.polygons) for obj in bpy.context.scene.objects if obj.type == "MESH")


def reduce_geometry(target_triangles: int) -> tuple[int, int]:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    source_triangles = sum(len(obj.data.polygons) for obj in meshes)
    if source_triangles <= target_triangles:
        return source_triangles, source_triangles
    ratio = max(0.001, min(1.0, target_triangles / source_triangles))
    for mesh in meshes:
        if len(mesh.data.polygons) < 32:
            continue
        bpy.context.view_layer.objects.active = mesh
        mesh.select_set(True)
        modifier = mesh.modifiers.new(name="SD_RuntimeLOD", type="DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        for polygon in mesh.data.polygons:
            polygon.use_smooth = True
        mesh.select_set(False)
    return source_triangles, triangle_count()


def resize_images(max_dimension: int) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for image in bpy.data.images:
        width, height = image.size
        if width < 1 or height < 1:
            continue
        original = [width, height]
        largest = max(width, height)
        if largest > max_dimension:
            scale = max_dimension / largest
            image.scale(max(1, round(width * scale)), max(1, round(height * scale)))
        image.pack()
        records.append({"name": image.name, "sourceSize": original, "runtimeSize": list(image.size)})
    return records


def export_runtime(output: Path, include_animations: bool) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_apply=False,
        export_animations=include_animations,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_materials="EXPORT",
        export_image_format="WEBP",
        export_image_quality=72,
        export_image_webp_fallback=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
    )


def process(
    intake_root: Path,
    relative_source: str,
    output: Path,
    target_triangles: int,
    texture_size: int,
    include_animations: bool,
    role: str,
) -> dict[str, object]:
    source = (intake_root / relative_source).resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    source_triangles, output_triangles = reduce_geometry(target_triangles)
    textures = resize_images(texture_size)
    for obj in bpy.context.scene.objects:
        obj["souldrifterLineage"] = "issue-448-local-runtime-mvp"
        obj["mvpRuntimeAllowed"] = True
        obj["postMvpPolishIssue"] = 458
    export_runtime(output, include_animations)
    return {
        "role": role,
        "source": str(source),
        "sourceSha256": digest(source),
        "sourceBytes": source.stat().st_size,
        "output": str(output.resolve()),
        "outputSha256": digest(output),
        "outputBytes": output.stat().st_size,
        "sourceTriangles": source_triangles,
        "targetTriangles": target_triangles,
        "outputTriangles": output_triangles,
        "textureLimit": texture_size,
        "textures": textures,
        "mvpMotionMode": "runtime-transform-clips",
        "postMvpPolishIssue": 458,
    }


def main() -> None:
    args = arguments()
    intake_root = args.intake_root.resolve()
    output_root = args.output_root.resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [
        process(
            intake_root,
            BREACHLING_SOURCE,
            output_root / "sd-creature-breachling-base-runtime-mvp-v001.glb",
            18_000,
            512,
            False,
            "breachling-family-base",
        ),
        process(
            intake_root,
            WARDEN_SOURCE,
            output_root / "sd-creature-cinderbound-warden-runtime-mvp-v001.glb",
            32_000,
            512,
            False,
            "cinderbound-warden-and-reduced-sentinel-visual",
        ),
    ]
    manifest = {
        "schemaVersion": 1,
        "issue": 448,
        "recipe": "scripts/build-creature-runtime-mvp.py",
        "runtimeScope": "internal-first-breach-mvp",
        "postMvpPolishIssue": 458,
        "outputs": outputs,
    }
    (output_root / "creature-runtime-mvp-v001.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
