"""Build one auditable GLB animation library from same-body Mixamo FBXs.

Each input directory is labeled on the command line so duplicate Mixamo names
remain distinct review candidates. The first FBX supplies the exported
armature; every subsequent action is attached as its own NLA track after the
65-bone hierarchy and rest skeleton are verified against that authority.

Run with Blender:

    blender --background --python scripts/build-mixamo-animation-library.py -- \
      --source-dir interactions=C:/clips/interactions \
      --source-dir locomotion=C:/clips/locomotion \
      --output-glb C:/out/library.glb --report C:/out/library.json
"""

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
    parser.add_argument("--source-dir", action="append", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--report", required=True)
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def pascal_case(value: str) -> str:
    tokens = [token for token in re.split(r"[^A-Za-z0-9]+", value) if token]
    return "".join(token[:1].upper() + token[1:] for token in tokens)


def parse_sources(values: list[str]) -> list[tuple[str, Path, str]]:
    sources = []
    labels = set()
    for value in values:
        label, separator, raw_path = value.partition("=")
        if not separator or not label or not raw_path:
            raise ValueError(f"Expected LABEL=PATH for --source-dir, got {value!r}")
        semantic_label = pascal_case(label)
        if semantic_label in labels:
            raise ValueError(f"Duplicate source label: {semantic_label}")
        raw_directory, pattern_separator, pattern = raw_path.partition("|")
        path = Path(raw_directory).resolve()
        if not path.is_dir():
            raise NotADirectoryError(path)
        pattern = pattern if pattern_separator else "*.fbx"
        if not pattern.lower().endswith(".fbx"):
            raise ValueError(f"Source pattern must select FBXs, got {pattern!r}")
        labels.add(semantic_label)
        sources.append((semantic_label, path, pattern))
    return sources


def imported_armature(path: Path) -> tuple[bpy.types.Object, set[bpy.types.Object]]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    imported = set(bpy.data.objects) - before
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"{path.name}: expected one armature, got {len(armatures)}")
    armature = armatures[0]
    if len(armature.data.bones) != 65:
        raise RuntimeError(f"{path.name}: expected 65 bones, got {len(armature.data.bones)}")
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if roots != ["mixamorig:Hips"]:
        raise RuntimeError(f"{path.name}: unexpected root bones {roots}")
    if armature.animation_data is None or armature.animation_data.action is None:
        raise RuntimeError(f"{path.name}: no animation action")
    return armature, imported


def rest_pose(armature: bpy.types.Object) -> dict[str, tuple[float, ...]]:
    return {
        bone.name: tuple(round(value, 7) for row in bone.matrix_local for value in row)
        for bone in armature.data.bones
    }


def rest_difference(
    authority: dict[str, tuple[float, ...]],
    candidate: dict[str, tuple[float, ...]],
) -> float:
    if authority.keys() != candidate.keys():
        missing = sorted(authority.keys() - candidate.keys())
        extra = sorted(candidate.keys() - authority.keys())
        raise RuntimeError(f"Mixamo bone-name mismatch; missing={missing}, extra={extra}")
    return max(
        abs(left - right)
        for name in authority
        for left, right in zip(authority[name], candidate[name])
    )


def remove_objects(objects: set[bpy.types.Object], keep: bpy.types.Object | None = None) -> None:
    for obj in objects:
        if obj != keep:
            bpy.data.objects.remove(obj, do_unlink=True)


def main() -> None:
    args = parse_args()
    sources = parse_sources(args.source_dir)
    files = [
        (label, path)
        for label, directory, pattern in sources
        for path in sorted(directory.glob(pattern), key=lambda item: item.name.lower())
    ]
    if not files:
        raise RuntimeError("No FBXs found in the labeled source directories")
    output_glb = Path(args.output_glb).resolve()
    report_path = Path(args.report).resolve()
    output_glb.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    records = []
    clip_names = set()
    base: bpy.types.Object | None = None
    authority_pose: dict[str, tuple[float, ...]] | None = None

    for index, (label, path) in enumerate(files):
        armature, imported = imported_armature(path)
        candidate_pose = rest_pose(armature)
        if base is None:
            base = armature
            authority_pose = candidate_pose
            action = armature.animation_data.action
            remove_objects(imported, keep=base)
        else:
            assert authority_pose is not None
            maximum_rest_difference = rest_difference(authority_pose, candidate_pose)
            if maximum_rest_difference > 0.001:
                raise RuntimeError(
                    f"{path.name}: rest skeleton differs by {maximum_rest_difference:.8f}"
                )
            original = armature.animation_data.action
            action = original.copy()
            armature.animation_data.action = None
            remove_objects(imported)
            if original.users == 0:
                bpy.data.actions.remove(original)

        clip_name = f"{label}__{pascal_case(path.stem.removesuffix('-animation-only'))}"
        if clip_name in clip_names:
            raise RuntimeError(f"Duplicate library clip name: {clip_name}")
        clip_names.add(clip_name)
        action.name = clip_name
        action.use_fake_user = True
        records.append({
            "libraryClipName": clip_name,
            "source": str(path),
            "sourceSha256": file_sha256(path),
            "sourceFrameRange": [float(value) for value in action.frame_range],
            "sourceFps": 30,
        })
        if (index + 1) % 25 == 0 or index + 1 == len(files):
            print(f"LIBRARY_PROGRESS={index + 1}/{len(files)}")

    assert base is not None
    base.animation_data_create()
    base.animation_data.action = None
    for record in records:
        action = bpy.data.actions[record["libraryClipName"]]
        track = base.animation_data.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, int(action.frame_range[0]), action)
        strip.action_frame_start = action.frame_range[0]
        strip.action_frame_end = action.frame_range[1]

    bpy.ops.object.select_all(action="DESELECT")
    base.select_set(True)
    bpy.context.view_layer.objects.active = base
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
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
    )
    report = {
        "outputGlb": str(output_glb),
        "outputGlbBytes": output_glb.stat().st_size,
        "outputGlbSha256": file_sha256(output_glb),
        "armature": base.name,
        "boneCount": len(base.data.bones),
        "rootBones": [bone.name for bone in base.data.bones if bone.parent is None],
        "clipCount": len(records),
        "records": records,
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("MIXAMO_ANIMATION_LIBRARY=" + json.dumps({
        "clipCount": len(records),
        "outputGlbSha256": report["outputGlbSha256"],
    }))


if __name__ == "__main__":
    main()
