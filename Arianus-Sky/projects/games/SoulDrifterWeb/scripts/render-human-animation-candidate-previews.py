"""Render labeled, textured animation candidates for owner review."""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--candidates", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--only", action="append", default=[])
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--size", type=int, default=720)
    parser.add_argument("--samples", type=int, default=32)
    parser.add_argument("--frame-step", type=int, default=2)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.actions,
        bpy.data.armatures,
        bpy.data.cameras,
        bpy.data.curves,
        bpy.data.lights,
        bpy.data.materials,
        bpy.data.meshes,
    ):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def import_glb(path: Path) -> set[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return set(bpy.data.objects) - before


def choose_armature(objects: set[bpy.types.Object]) -> bpy.types.Object:
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if not armatures:
        raise RuntimeError("The accepted Human GLB contains no armature")
    return max(armatures, key=lambda obj: len(obj.data.bones))


def remove_imported_objects(objects: set[bpy.types.Object]) -> None:
    for obj in objects:
        if obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)


def world_bounds(objects: set[bpy.types.Object]) -> tuple[Vector, Vector]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    depsgraph = bpy.context.evaluated_depsgraph_get()
    found = False
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            point = evaluated.matrix_world @ Vector(corner)
            for axis in range(3):
                minimum[axis] = min(minimum[axis], point[axis])
                maximum[axis] = max(maximum[axis], point[axis])
            found = True
    if not found:
        raise RuntimeError("The accepted Human GLB contains no renderable meshes")
    return minimum, maximum


def sampled_action_bounds(
    scene: bpy.types.Scene,
    meshes: set[bpy.types.Object],
    frame_start: int,
    frame_end: int,
) -> tuple[Vector, Vector, Vector, float, float]:
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))
    first_center: Vector | None = None
    max_horizontal_extent = 0.0
    max_vertical_extent = 0.0
    span = max(1, frame_end - frame_start)
    samples = min(18, span + 1)
    frames = {
        int(round(frame_start + span * index / max(1, samples - 1)))
        for index in range(samples)
    }
    for frame in sorted(frames):
        scene.frame_set(frame)
        frame_min, frame_max = world_bounds(meshes)
        if first_center is None:
            first_center = (frame_min + frame_max) * 0.5
        max_horizontal_extent = max(
            max_horizontal_extent,
            frame_max.x - frame_min.x,
            frame_max.y - frame_min.y,
        )
        max_vertical_extent = max(
            max_vertical_extent,
            frame_max.z - frame_min.z,
        )
        for axis in range(3):
            minimum[axis] = min(minimum[axis], frame_min[axis])
            maximum[axis] = max(maximum[axis], frame_max[axis])
    if first_center is None:
        raise RuntimeError("Unable to sample animation bounds")
    return (
        minimum,
        maximum,
        first_center,
        max_horizontal_extent,
        max_vertical_extent,
    )


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def bake_camera_follow(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    armature: bpy.types.Object,
    frame_start: int,
    frame_end: int,
    offset_x: float,
    offset_y: float,
    offset_z: float,
) -> None:
    camera.animation_data_clear()
    hips = armature.pose.bones.get("mixamorig:Hips")
    if hips is None:
        raise RuntimeError("Canonical camera follow bone mixamorig:Hips is missing")
    for frame in range(frame_start, frame_end + 1):
        scene.frame_set(frame)
        frame_center = armature.matrix_world @ hips.matrix.translation
        camera.location = Vector(
            (
                frame_center.x + offset_x,
                frame_center.y + offset_y,
                frame_center.z + offset_z,
            )
        )
        camera.keyframe_insert(data_path="location", frame=frame)


def create_stage(
    scene: bpy.types.Scene, size: int, samples: int
) -> dict[str, bpy.types.Object]:
    world = bpy.data.worlds.new("Issue487PreviewWorld")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.018, 0.024, 0.035, 1.0)
    background.inputs["Strength"].default_value = 0.32

    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    floor = bpy.context.object
    floor.name = "Issue487PreviewFloor"
    floor_material = bpy.data.materials.new("Issue487PreviewFloorMaterial")
    floor_material.diffuse_color = (0.045, 0.065, 0.085, 1.0)
    floor.data.materials.append(floor_material)

    def add_area(
        name: str,
        location: tuple[float, float, float],
        energy: float,
        area_size: float,
    ) -> None:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = area_size
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        look_at(light, Vector((0, 0, 1.1)))

    add_area("Issue487Key", (4.5, -5.5, 7.0), 1050, 4.5)
    add_area("Issue487Fill", (-4.0, -2.0, 4.2), 650, 3.5)
    add_area("Issue487Rim", (1.0, 4.5, 5.0), 900, 3.0)

    camera_data = bpy.data.cameras.new("Issue487PreviewCamera")
    camera = bpy.data.objects.new("Issue487PreviewCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    scene.camera = camera

    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "FLAT"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.12, 0.15, 0.19)
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.show_specular_highlight = True
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = 1
    scene.render.pixel_aspect_y = 1
    scene.render.fps = 30
    scene.render.fps_base = 1
    scene.render.film_transparent = False
    scene.render.use_file_extension = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.color_management = "FOLLOW_SCENE"
    scene.view_settings.look = "AgX - Medium High Contrast"
    return {"camera": camera, "floor": floor}


def safe_filename(name: str) -> str:
    return "".join(
        character if character.isalnum() else "-" for character in name
    ).strip("-").lower()


def encode_preview(
    frames_dir: Path,
    output: Path,
    fps: int,
    label: str,
) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg is required to encode the preview videos")
    rendered_frames = sorted(frames_dir.glob("frame-*.png"))
    if not rendered_frames:
        raise RuntimeError(f"No rendered frames found in {frames_dir}")
    for sequence, source in enumerate(rendered_frames, start=1):
        source.rename(frames_dir / f"sequence-{sequence:04d}.png")
    escaped_label = label.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    overlay = (
        "drawbox=x=0:y=0:w=iw:h=64:color=black@0.72:t=fill,"
        "drawtext=fontfile='C\\:/Windows/Fonts/segoeui.ttf':"
        f"text='{escaped_label}':fontcolor=white:fontsize=28:"
        "x=(w-text_w)/2:y=17"
    )
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-framerate",
            str(fps),
            "-start_number",
            "1",
            "-i",
            str(frames_dir / "sequence-%04d.png"),
            "-vf",
            overlay,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )
    shutil.rmtree(frames_dir)


def main() -> None:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    report = json.loads(args.report.read_text(encoding="utf-8"))
    clips = report.get("clips") or report.get("candidates")
    if not clips:
        raise RuntimeError("Candidate report has no clips or candidates array")
    if args.only:
        clips = [
            clip
            for clip in clips
            if (clip.get("clipName") or clip.get("name")) in set(args.only)
        ]
    if args.limit > 0:
        clips = clips[: args.limit]
    if not clips:
        raise RuntimeError("No candidate clips matched the requested selection")

    clear_scene()
    model_objects = import_glb(args.model)
    armature = choose_armature(model_objects)
    meshes = {obj for obj in model_objects if obj.type == "MESH"}
    scene = bpy.context.scene
    scene.frame_step = max(1, args.frame_step)
    scene.frame_set(1)
    base_min, _ = world_bounds(meshes)
    armature.location.z -= base_min.z

    existing_actions = set(bpy.data.actions)
    candidate_objects = import_glb(args.candidates)
    candidate_actions = {
        action.name: action
        for action in bpy.data.actions
        if action not in existing_actions
    }
    remove_imported_objects(candidate_objects)

    stage = create_stage(scene, args.size, args.samples)
    camera = stage["camera"]
    floor = stage["floor"]
    rendered: list[dict[str, object]] = []

    for index, clip in enumerate(clips, start=1):
        clip_name = clip.get("clipName") or clip["name"]
        action = candidate_actions.get(clip_name) or bpy.data.actions.get(clip_name)
        if action is None:
            raise RuntimeError(f"Candidate action is missing after import: {clip_name}")
        if armature.animation_data is None:
            armature.animation_data_create()
        armature.animation_data.action = action
        if action.slots:
            armature.animation_data.action_slot = action.slots[0]
        frame_start = max(1, int(math.floor(action.frame_range[0])))
        frame_end = max(frame_start + 1, int(math.ceil(action.frame_range[1])))
        scene.frame_start = frame_start
        scene.frame_end = frame_end

        bounds_min, bounds_max, _, width, body_height = sampled_action_bounds(
            scene, meshes, frame_start, frame_end
        )
        center = (bounds_min + bounds_max) * 0.5
        aggregate_height = max(1.0, bounds_max.z - bounds_min.z)
        body_height = max(1.0, body_height)
        aggregate_width = max(
            bounds_max.x - bounds_min.x,
            bounds_max.y - bounds_min.y,
        )
        camera.data.ortho_scale = max(
            1.8,
            body_height * 0.9,
            width * 0.95,
            min(aggregate_width * 0.72, width * 1.45),
            min(aggregate_height * 0.75, body_height * 1.65),
        )
        print(
            f"FRAMING bodyHeight={body_height:.3f} bodyWidth={width:.3f} "
            f"aggregateHeight={aggregate_height:.3f} "
            f"aggregateWidth={aggregate_width:.3f} ortho={camera.data.ortho_scale:.3f}",
            flush=True,
        )
        scene.frame_set(frame_start)
        hips = armature.pose.bones.get("mixamorig:Hips")
        if hips is None:
            raise RuntimeError("Canonical camera target mixamorig:Hips is missing")
        hips_world = armature.matrix_world @ hips.matrix.translation
        camera.location = hips_world + Vector((4.6, -7.4, 2.1))
        look_at(camera, hips_world + Vector((0, 0, 0.35)))
        bake_camera_follow(
            scene,
            camera,
            armature,
            frame_start,
            frame_end,
            4.6,
            -7.4,
            2.1,
        )
        floor.location.x = center.x
        floor.location.y = center.y

        display_label = clip.get("displayLabel", clip_name)
        output = args.output / f"{index:02d}-{safe_filename(display_label)}.mp4"
        frames_dir = args.output / f".{index:02d}-frames"
        frames_dir.mkdir(parents=True, exist_ok=True)
        scene.render.filepath = str(frames_dir / "frame-")
        scene.frame_set(frame_start)
        print(f"RENDER {index}/{len(clips)} {clip_name} -> {output}", flush=True)
        bpy.ops.render.render(animation=True)
        encode_preview(
            frames_dir,
            output,
            max(1, round(scene.render.fps / scene.frame_step)),
            f"{index:02d}. {display_label}",
        )
        rendered.append(
            {
                "index": index,
                "clipName": clip_name,
                "displayLabel": display_label,
                "path": str(output),
                "frameStart": frame_start,
                "frameEnd": frame_end,
            }
        )

    manifest = args.output / "preview-render-manifest.json"
    manifest.write_text(json.dumps({"clips": rendered}, indent=2), encoding="utf-8")
    print(f"WROTE {manifest}", flush=True)


if __name__ == "__main__":
    main()
