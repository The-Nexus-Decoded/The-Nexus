"""Merge approved Mixamo baseline clips onto the shipping Elf Shadowknight rig.

Run with Blender, opening the latest authored .blend before this script. The
result keeps the accepted existing actions, replaces/adds the named baseline
contracts below, and removes rejected BasicThrust. A JSON sidecar records every
input hash and any deterministic source-frame trim.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy


def parse_args():
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--basic-dir", required=True)
    parser.add_argument("--action-dir", required=True)
    parser.add_argument("--combat-dir", required=True)
    parser.add_argument("--basic-archive", required=True)
    parser.add_argument("--action-archive", required=True)
    parser.add_argument("--output-glb", required=True)
    parser.add_argument("--output-blend", required=True)
    parser.add_argument("--metadata", required=True)
    return parser.parse_args(values)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def bake_action(source, source_action, target, action_name, trim_frames=None):
    old = bpy.data.actions.get(action_name)
    if old is not None:
        bpy.data.actions.remove(old)
    baked = bpy.data.actions.new(action_name)
    baked.use_fake_user = True
    target.animation_data_create()
    target.animation_data.action = baked
    action_start, action_end = [int(round(value)) for value in source_action.frame_range]
    start, end = trim_frames or (action_start, action_end)
    if start < action_start or end > action_end or start >= end:
        raise RuntimeError(f"{action_name}: invalid trim {start, end} for source range {action_start, action_end}")
    for frame in range(start, end + 1):
        output_frame = frame - start + 1
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        source_pose = {bone.name: bone.matrix.copy() for bone in source.pose.bones}
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
    return baked


def main():
    args = parse_args()
    input_blend = Path(bpy.data.filepath).resolve()
    basic_dir = Path(args.basic_dir).resolve()
    action_dir = Path(args.action_dir).resolve()
    combat_dir = Path(args.combat_dir).resolve()
    output_glb = Path(args.output_glb).resolve()
    output_blend = Path(args.output_blend).resolve()
    metadata = Path(args.metadata).resolve()
    for path in (output_glb, output_blend, metadata):
        path.parent.mkdir(parents=True, exist_ok=True)

    target = bpy.data.objects.get("ElfShadowknight_Armature")
    if target is None or target.type != "ARMATURE":
        raise RuntimeError("ElfShadowknight_Armature was not found")
    target_bones = [bone.name for bone in target.data.bones]
    rejected = bpy.data.actions.get("BasicThrust")
    if rejected is not None:
        bpy.data.actions.remove(rejected)
    specs = [
        (basic_dir / "idle.fbx", "basic-locomotion/idle.fbx", "IdleRelaxed", None),
        (basic_dir / "walking.fbx", "basic-locomotion/walking.fbx", "WalkBaseline", None),
        (action_dir / "running.fbx", "action-adventure/running.fbx", "RunBaseline", None),
        (combat_dir / "One Hand Sword Combo.fbx", "One Hand Sword Combo.fbx", "WeaponStrikeBaseline", (1, 38)),
        (combat_dir / "Sword And Shield Slash.fbx", "Sword And Shield Slash.fbx", "SwordShieldSlashCandidate", None),
    ]

    records = []
    for source_path, source_label, action_name, trim_frames in specs:
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        objects_before = set(bpy.data.objects)
        actions_before = set(bpy.data.actions)
        bpy.ops.import_scene.fbx(filepath=str(source_path), automatic_bone_orientation=False)
        imported_objects = [obj for obj in bpy.data.objects if obj not in objects_before]
        imported_armatures = [obj for obj in imported_objects if obj.type == "ARMATURE"]
        new_actions = [action for action in bpy.data.actions if action not in actions_before]
        if len(imported_armatures) != 1 or len(new_actions) != 1:
            raise RuntimeError(f"{source_label}: expected one armature/action, got {len(imported_armatures)}/{len(new_actions)}")
        source_armature = imported_armatures[0]
        if [bone.name for bone in source_armature.data.bones] != target_bones:
            raise RuntimeError(f"{source_label}: source skeleton does not match shipping rig")
        source_action = new_actions[0]
        frame_range = [float(value) for value in source_action.frame_range]
        bake_action(source_armature, source_action, target, action_name, trim_frames)
        if source_armature.animation_data:
            source_armature.animation_data.action = None
        for obj in imported_objects:
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.actions.remove(source_action)
        record = {
            "source": source_label,
            "action": action_name,
            "frameRange": frame_range,
            "bytes": source_path.stat().st_size,
            "sha256": sha256(source_path),
        }
        if trim_frames is not None:
            record["trimFrames"] = list(trim_frames)
        records.append(record)

    target.animation_data_create()
    target.animation_data.action = bpy.data.actions.get("IdleRelaxed")
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
        "status": "local_visual_verification_pending",
        "sourceBlend": str(input_blend),
        "sourceBlendSha256": sha256(input_blend),
        "archives": {
            "basicLocomotionSha256": sha256(args.basic_archive),
            "actionAdventureSha256": sha256(args.action_archive),
        },
        "actions": records,
        "outputGlb": str(output_glb),
        "outputGlbBytes": output_glb.stat().st_size,
        "outputGlbSha256": sha256(output_glb),
        "actionNames": sorted(action.name for action in bpy.data.actions),
    }
    metadata.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("ANIMATION_BASELINE=" + json.dumps(payload, sort_keys=True))


if __name__ == "__main__":
    main()
