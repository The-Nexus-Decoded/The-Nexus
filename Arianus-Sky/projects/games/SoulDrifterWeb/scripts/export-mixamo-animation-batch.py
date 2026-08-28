"""Batch-convert body-specific Mixamo FBXs into animation-only GLB packs."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
import sys

import bpy


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--pattern", default="*-animation-only.fbx")
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def semantic_name(source: Path) -> str:
    stem = re.sub(r"-animation-only$", "", source.stem, flags=re.IGNORECASE)
    tokens = [token for token in re.split(r"[^A-Za-z0-9]+", stem) if token]
    return "".join(token[:1].upper() + token[1:] for token in tokens)


def export_one(source: Path, output: Path) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source), automatic_bone_orientation=False)
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"{source.name}: expected one armature, got {len(armatures)}")
    armature = armatures[0]
    if len(armature.data.bones) != 65:
        raise RuntimeError(f"{source.name}: expected 65 bones, got {len(armature.data.bones)}")
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if roots != ["mixamorig:Hips"]:
        raise RuntimeError(f"{source.name}: unexpected roots {roots}")
    actions = list(bpy.data.actions)
    if not actions:
        raise RuntimeError(f"{source.name}: no animation action")
    action = max(actions, key=lambda item: item.frame_range[1] - item.frame_range[0])
    armature.animation_data_create()
    armature.animation_data.action = action
    semantic = semantic_name(source)
    action.name = semantic
    bpy.context.scene.render.fps = 30
    bpy.context.scene.frame_start = int(round(action.frame_range[0]))
    bpy.context.scene.frame_end = int(round(action.frame_range[1]))
    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_frame_step=1,
        export_skins=True,
        export_def_bones=False,
        export_leaf_bone=False,
        export_materials="NONE",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
        export_apply=False,
        export_all_influences=False,
        export_influence_nb=4,
    )
    return {
        "source": str(source),
        "sourceBytes": source.stat().st_size,
        "sourceSha256": file_sha256(source),
        "output": str(output),
        "outputBytes": output.stat().st_size,
        "outputSha256": file_sha256(output),
        "armature": armature.name,
        "boneCount": len(armature.data.bones),
        "rootBones": roots,
        "sourceAction": action.name,
        "semanticAction": semantic,
        "frameRange": [float(value) for value in action.frame_range],
        "fps": 30,
        "meshCount": len([obj for obj in bpy.context.scene.objects if obj.type == "MESH"]),
    }


def main() -> None:
    args = parse_args()
    source_dir = Path(args.source_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    report_path = Path(args.report).resolve()
    if not source_dir.is_dir():
        raise NotADirectoryError(source_dir)
    sources = sorted(source_dir.glob(args.pattern))
    if not sources:
        raise RuntimeError(f"No Mixamo files matched {args.pattern!r} in {source_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    records = []
    for source in sources:
        output = output_dir / f"{source.stem}.glb"
        records.append(export_one(source, output))
        print(f"EXPORTED {source.name} -> {output.name}")

    report = {
        "sourceDir": str(source_dir),
        "outputDir": str(output_dir),
        "count": len(records),
        "records": records,
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("MIXAMO_ANIMATION_BATCH=" + json.dumps({"count": len(records)}))


if __name__ == "__main__":
    main()
