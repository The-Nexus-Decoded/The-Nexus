"""Retarget the reviewed Mixamo sword and unarmed motions onto SoulDrifter's rig.

Run Blender with the existing animation-library .blend as the input file. The
script only owns the named actions below; all other authored and imported
actions remain untouched in the candidate GLB.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy


ACTION_SOURCES = (
    ("One Hand Sword Combo.fbx", "SwordComboMixamo"),
    ("Standing Melee Attack Horizontal.fbx", "SiphonCleaveCandidate"),
    ("Stable Sword Outward Slash.fbx", "SiphonCleaveSource"),
    ("Unarmed Cross Punch.fbx", "UnarmedPunch"),
    ("Unarmed Front Kick.fbx", "UnarmedKick"),
)


def parse_args() -> argparse.Namespace:
    raw_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--metadata", required=True)
    return parser.parse_args(raw_args)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def remove_action(name: str) -> None:
    existing = bpy.data.actions.get(name)
    if existing is None:
        return
    for obj in bpy.data.objects:
        if obj.animation_data and obj.animation_data.action == existing:
            obj.animation_data.action = None
    bpy.data.actions.remove(existing)


def bake_action_to_target(source, source_action, target, action_name):
    remove_action(action_name)
    baked = bpy.data.actions.new(action_name)
    baked.use_fake_user = True
    target.animation_data_create()
    target.animation_data.action = baked
    start, end = [int(round(value)) for value in source_action.frame_range]
    for source_frame in range(start, end + 1):
        output_frame = source_frame - start + 1
        bpy.context.scene.frame_set(source_frame)
        bpy.context.view_layer.update()
        # Mixamo's FBX round trip can preserve bone names/topology while changing
        # individual rest-axis bases. Copying matrix_basis therefore turns a good
        # source pose into the familiar twisted torso/looping-arm failure. PoseBone
        # matrices are in armature space, so transfer those evaluated matrices and
        # let Blender solve the correct target-local basis before keying it.
        source_pose = {
            bone.name: bone.matrix.copy()
            for bone in source.pose.bones
        }
        for target_bone in target.pose.bones:
            source_matrix = source_pose.get(target_bone.name)
            if source_matrix is None:
                continue
            target_bone.matrix = source_matrix
            target_bone.keyframe_insert(data_path="location", frame=output_frame, group=target_bone.name)
            rotation_path = "rotation_quaternion" if target_bone.rotation_mode == "QUATERNION" else "rotation_euler"
            target_bone.keyframe_insert(data_path=rotation_path, frame=output_frame, group=target_bone.name)
            target_bone.keyframe_insert(data_path="scale", frame=output_frame, group=target_bone.name)
    target.animation_data.action = None
    return baked, [start, end]


def main() -> None:
    args = parse_args()
    source_dir = Path(args.source_dir).resolve()
    output_glb = Path(args.output_glb).resolve()
    output_blend = Path(args.output_blend).resolve()
    metadata_path = Path(args.metadata).resolve()
    for path in (output_glb, output_blend, metadata_path):
        path.parent.mkdir(parents=True, exist_ok=True)

    target = bpy.data.objects.get("ElfShadowknight_Armature")
    if target is None or target.type != "ARMATURE":
        raise RuntimeError("ElfShadowknight_Armature was not found in the input blend")
    target_bones = [bone.name for bone in target.data.bones]
    imported_records = []

    for source_name, action_name in ACTION_SOURCES:
        source_path = source_dir / source_name
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        objects_before = set(bpy.data.objects)
        actions_before = set(bpy.data.actions)
        bpy.ops.import_scene.fbx(filepath=str(source_path), automatic_bone_orientation=False)
        imported_objects = [obj for obj in bpy.data.objects if obj not in objects_before]
        imported_armatures = [obj for obj in imported_objects if obj.type == "ARMATURE"]
        new_actions = [action for action in bpy.data.actions if action not in actions_before]
        if len(imported_armatures) != 1 or len(new_actions) != 1:
            raise RuntimeError(
                f"{source_name}: expected one armature/action, found "
                f"{len(imported_armatures)} armatures and {len(new_actions)} actions"
            )
        source_armature = imported_armatures[0]
        imported_bones = [bone.name for bone in source_armature.data.bones]
        if imported_bones != target_bones:
            raise RuntimeError(f"{source_name}: Mixamo skeleton no longer matches the SoulDrifter target rig")
        source_action = new_actions[0]
        _, frame_range = bake_action_to_target(source_armature, source_action, target, action_name)
        if source_armature.animation_data:
            source_armature.animation_data.action = None
        for obj in imported_objects:
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.actions.remove(source_action)
        imported_records.append(
            {
                "source": source_name,
                "action": action_name,
                "frame_range": frame_range,
                "bytes": source_path.stat().st_size,
                "sha256": sha256(source_path),
            }
        )

    target.animation_data_create()
    target.animation_data.action = bpy.data.actions.get("Idle")
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))

    bpy.ops.object.select_all(action="DESELECT")
    export_objects = [obj for obj in bpy.context.scene.objects if obj.type in {"ARMATURE", "MESH"}]
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_skins=True,
        export_morph=False,
        export_materials="EXPORT",
        export_yup=True,
    )

    payload = {
        "status": "mixamo_combat_actions_merged",
        "input_blend": bpy.data.filepath,
        "target_armature": target.name,
        "bone_count": len(target_bones),
        "actions": imported_records,
        "output_glb": str(output_glb),
        "output_glb_bytes": output_glb.stat().st_size,
        "output_glb_sha256": sha256(output_glb),
        "output_blend": str(output_blend),
    }
    metadata_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("MIXAMO_COMBAT_MERGE=" + json.dumps(payload, sort_keys=True))


if __name__ == "__main__":
    main()
