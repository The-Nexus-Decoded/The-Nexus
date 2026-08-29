"""Render a carry candidate with a real 3D, two-hand-driven QA crate."""

from __future__ import annotations

import argparse
import importlib.util
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--candidates", required=True, type=Path)
    parser.add_argument("--clip", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--size", type=int, default=560)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def load_preview_helpers():
    helper_path = Path(__file__).with_name(
        "render-human-animation-candidate-previews.py"
    )
    spec = importlib.util.spec_from_file_location("issue487_preview_helpers", helper_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load preview helpers from {helper_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def add_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    material: bpy.types.Material,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    box = bpy.context.object
    box.name = name
    box.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    box.data.materials.append(material)
    box.parent = parent
    return box


def create_qa_crate() -> bpy.types.Object:
    root = bpy.data.objects.new("Issue487QaCarryCrateRoot", None)
    bpy.context.collection.objects.link(root)

    wood = bpy.data.materials.new("Issue487QaCrateWood")
    wood.diffuse_color = (0.28, 0.105, 0.035, 1.0)
    trim = bpy.data.materials.new("Issue487QaCrateTrim")
    trim.diffuse_color = (0.52, 0.24, 0.075, 1.0)

    body = add_box(
        "Issue487QaCrateBody",
        (0.34, 0.22, 0.24),
        (0.0, 0.0, 0.0),
        wood,
        root,
    )
    bevel = body.modifiers.new("Issue487QaCrateBevel", "BEVEL")
    bevel.width = 0.025
    bevel.segments = 2

    for x in (-0.142, 0.142):
        add_box(
            f"Issue487QaCrateVertical{x:+.3f}",
            (0.035, 0.235, 0.26),
            (x, 0.0, 0.0),
            trim,
            root,
        )
    for z in (-0.095, 0.095):
        add_box(
            f"Issue487QaCrateHorizontal{z:+.3f}",
            (0.34, 0.235, 0.035),
            (0.0, 0.0, z),
            trim,
            root,
        )
    add_box(
        "Issue487QaCrateCenterBrace",
        (0.035, 0.24, 0.24),
        (0.0, 0.0, 0.0),
        trim,
        root,
    )
    return root


def bake_two_hand_crate(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    crate: bpy.types.Object,
    frame_start: int,
    frame_end: int,
) -> None:
    left = armature.pose.bones.get("mixamorig:LeftHand")
    right = armature.pose.bones.get("mixamorig:RightHand")
    if left is None or right is None:
        raise RuntimeError("Carry preview requires both Mixamo hand bones")

    for frame in range(frame_start, frame_end + 1):
        scene.frame_set(frame)
        left_world = armature.matrix_world @ left.matrix.translation
        right_world = armature.matrix_world @ right.matrix.translation
        midpoint = (left_world + right_world) * 0.5
        hand_axis = right_world - left_world
        crate.location = midpoint + Vector((0.0, 0.0, -0.10))
        crate.rotation_euler = (0.0, 0.0, math.atan2(hand_axis.y, hand_axis.x))
        crate.keyframe_insert(data_path="location", frame=frame)
        crate.keyframe_insert(data_path="rotation_euler", frame=frame)


def main() -> None:
    args = parse_args()
    helpers = load_preview_helpers()
    helpers.clear_scene()

    model_objects = helpers.import_glb(args.model)
    armature = helpers.choose_armature(model_objects)
    meshes = {obj for obj in model_objects if obj.type == "MESH"}
    scene = bpy.context.scene
    scene.frame_set(1)
    base_min, _ = helpers.world_bounds(meshes)
    armature.location.z -= base_min.z

    existing_actions = set(bpy.data.actions)
    candidate_objects = helpers.import_glb(args.candidates)
    actions = {
        action.name: action
        for action in bpy.data.actions
        if action not in existing_actions
    }
    helpers.remove_imported_objects(candidate_objects)
    action = actions.get(args.clip) or bpy.data.actions.get(args.clip)
    if action is None:
        raise RuntimeError(f"Carry candidate not found: {args.clip}")

    armature.animation_data_create()
    armature.animation_data.action = action
    if action.slots:
        armature.animation_data.action_slot = action.slots[0]
    frame_start = max(1, int(math.floor(action.frame_range[0])))
    frame_end = max(frame_start + 1, int(math.ceil(action.frame_range[1])))
    scene.frame_start = frame_start
    scene.frame_end = frame_end
    scene.frame_step = 2

    stage = helpers.create_stage(scene, args.size, 24)
    camera = stage["camera"]
    crate = create_qa_crate()
    bake_two_hand_crate(scene, armature, crate, frame_start, frame_end)

    _, _, _, width, body_height = helpers.sampled_action_bounds(
        scene, meshes, frame_start, frame_end
    )
    camera.data.ortho_scale = max(1.75, body_height * 0.82, width * 0.92)
    scene.frame_set(frame_start)
    hips = armature.pose.bones["mixamorig:Hips"]
    hips_world = armature.matrix_world @ hips.matrix.translation
    camera.location = hips_world + Vector((4.6, -7.4, 2.0))
    helpers.look_at(camera, hips_world + Vector((0.0, 0.0, 0.30)))
    helpers.bake_camera_follow(
        scene, camera, armature, frame_start, frame_end, 4.6, -7.4, 2.0
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    frames_dir = args.output.parent / ".carry-context-frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(frames_dir / "frame-")
    bpy.ops.render.render(animation=True)
    helpers.encode_preview(
        frames_dir,
        args.output,
        max(1, round(scene.render.fps / scene.frame_step)),
        "14. Carry Loop - 3D QA crate",
    )
    print(f"WROTE {args.output}")


if __name__ == "__main__":
    main()
