"""Merge verified same-rig issue-487 animation supplements into one review GLB.

This script never edits an input asset.  Every supplement must contain one
Mixamo-standard 65-bone armature plus uniquely named candidate actions.  The
base rest skeleton is authoritative; supplements whose bone set or rest pose
drifts are rejected before export.

Run with the cached Blender receipt, for example:

    blender --background --python scripts/merge-human-animation-gap-libraries.py -- \
      --base base.glb --supplement combat.glb --supplement utility.glb \
      --output merged.glb --report merged.json
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import bpy


EXPECTED_BONE_COUNT = 65
EXPECTED_ROOT = "mixamorig:Hips"
MAXIMUM_REST_DIFFERENCE = 0.001


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--supplement", action="append", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--report", required=True)
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


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


def validate_armature(armature: bpy.types.Object, source: Path) -> None:
    if len(armature.data.bones) != EXPECTED_BONE_COUNT:
        raise RuntimeError(
            f"{source.name}: expected {EXPECTED_BONE_COUNT} bones, "
            f"got {len(armature.data.bones)}"
        )
    roots = [bone.name for bone in armature.data.bones if bone.parent is None]
    if roots != [EXPECTED_ROOT]:
        raise RuntimeError(f"{source.name}: unexpected root bones {roots}")


def import_glb(path: Path) -> tuple[bpy.types.Object, set[bpy.types.Object], set[bpy.types.Action]]:
    objects_before = set(bpy.data.objects)
    actions_before = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported_objects = set(bpy.data.objects) - objects_before
    imported_actions = set(bpy.data.actions) - actions_before
    armatures = [obj for obj in imported_objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"{path.name}: expected one armature, got {len(armatures)}")
    validate_armature(armatures[0], path)
    if not imported_actions:
        raise RuntimeError(f"{path.name}: no animation actions")
    return armatures[0], imported_objects, imported_actions


def remove_objects(objects: set[bpy.types.Object], keep: bpy.types.Object | None = None) -> None:
    for obj in objects:
        if obj != keep:
            bpy.data.objects.remove(obj, do_unlink=True)


def attach_action(armature: bpy.types.Object, action: bpy.types.Action) -> None:
    armature.animation_data_create()
    track = armature.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, int(action.frame_range[0]), action)
    strip.action_frame_start = action.frame_range[0]
    strip.action_frame_end = action.frame_range[1]


def output_receipt(path: Path) -> dict[str, object]:
    return {
        "path": str(path),
        "bytes": path.stat().st_size,
        "sha256": file_sha256(path),
    }


def main() -> None:
    args = parse_args()
    base_path = Path(args.base).resolve()
    supplement_paths = [Path(value).resolve() for value in args.supplement]
    output_path = Path(args.output).resolve()
    report_path = Path(args.report).resolve()
    for source in [base_path, *supplement_paths]:
        if not source.is_file():
            raise FileNotFoundError(source)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    base, base_objects, base_actions = import_glb(base_path)
    authority_pose = rest_pose(base)
    base_names = {action.name for action in base_actions}
    if len(base_names) != len(base_actions):
        raise RuntimeError("Base library contains duplicate action names")

    supplement_records: list[dict[str, object]] = []
    merged_names = set(base_names)
    for supplement_path in supplement_paths:
        armature, imported_objects, imported_actions = import_glb(supplement_path)
        maximum_rest_difference = rest_difference(authority_pose, rest_pose(armature))
        if maximum_rest_difference > MAXIMUM_REST_DIFFERENCE:
            raise RuntimeError(
                f"{supplement_path.name}: rest skeleton differs by "
                f"{maximum_rest_difference:.8f}"
            )
        names = sorted(action.name for action in imported_actions)
        duplicates = sorted(merged_names.intersection(names))
        if duplicates:
            raise RuntimeError(
                f"{supplement_path.name}: duplicate merged action names {duplicates}"
            )
        for action in sorted(imported_actions, key=lambda value: value.name.lower()):
            action.use_fake_user = True
            attach_action(base, action)
        merged_names.update(names)
        remove_objects(imported_objects)
        supplement_records.append(
            {
                **output_receipt(supplement_path),
                "actionCount": len(names),
                "actionNames": names,
                "maximumRestDifference": maximum_rest_difference,
            }
        )

    remove_objects(base_objects, keep=base)
    base.animation_data_create()
    base.animation_data.action = None
    bpy.ops.object.select_all(action="DESELECT")
    base.select_set(True)
    bpy.context.view_layer.objects.active = base
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
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

    expected_names = sorted(merged_names)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    validated_armature, _, validated_actions = import_glb(output_path)
    validated_names = sorted(action.name for action in validated_actions)
    if validated_names != expected_names:
        missing = sorted(set(expected_names) - set(validated_names))
        extra = sorted(set(validated_names) - set(expected_names))
        raise RuntimeError(f"Merged GLB action mismatch; missing={missing}, extra={extra}")

    report = {
        "schemaVersion": 1,
        "issue": 487,
        "status": "UNREVIEWED_SOURCE_DERIVED_CANDIDATES",
        "base": {**output_receipt(base_path), "actionCount": len(base_names)},
        "supplements": supplement_records,
        "output": {**output_receipt(output_path), "actionCount": len(validated_names)},
        "skeleton": {
            "boneCount": len(validated_armature.data.bones),
            "rootBones": [
                bone.name for bone in validated_armature.data.bones if bone.parent is None
            ],
            "maximumAllowedRestDifference": MAXIMUM_REST_DIFFERENCE,
        },
        "actionNames": validated_names,
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        "ISSUE_487_GAP_LIBRARY_MERGE="
        + json.dumps(
            {
                "actionCount": len(validated_names),
                "outputSha256": report["output"]["sha256"],
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
