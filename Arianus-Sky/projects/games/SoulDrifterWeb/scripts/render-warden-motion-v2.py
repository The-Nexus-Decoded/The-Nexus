"""Render exact-eight PBR review panels for authored Warden motion-v2 clips."""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def arguments() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--input-sha256", required=True)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--clip")
    return parser.parse_args(values)


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def surface_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    low = Vector((float("inf"),) * 3)
    high = Vector((float("-inf"),) * 3)
    for mesh in meshes:
        evaluated_object = mesh.evaluated_get(depsgraph)
        evaluated_mesh = evaluated_object.to_mesh()
        try:
            for vertex in evaluated_mesh.vertices:
                point = evaluated_object.matrix_world @ vertex.co
                for axis in range(3):
                    low[axis] = min(low[axis], point[axis])
                    high[axis] = max(high[axis], point[axis])
        finally:
            evaluated_object.to_mesh_clear()
    return low, high


def point_at(rig: bpy.types.Object, name: str) -> list[float]:
    bone = rig.pose.bones.get(name)
    if bone is None:
        raise RuntimeError(f"Missing review bone {name}")
    return list(rig.matrix_world @ bone.head)


def aim_at(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def add_area(name: str, location: tuple[float, float, float], energy: float, size: float,
             color: tuple[float, float, float]) -> None:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    light.location = location
    bpy.context.scene.collection.objects.link(light)
    aim_at(light, Vector((0.1, 0.0, 0.0)))


def main() -> None:
    options = arguments()
    source = Path(options.input).resolve()
    plan_path = Path(options.plan).resolve()
    output = Path(options.output).resolve()
    expected_sha = options.input_sha256.lower()
    if digest(source) != expected_sha:
        raise RuntimeError("Pinned composed Warden draft hash changed")
    plan_bytes = plan_path.read_bytes()
    plan = json.loads(plan_bytes)
    if any(len(clip["phases"]) != 8 for clip in plan["clips"]):
        raise RuntimeError("Every rendered Warden action must have exactly eight phases")
    selected_clips = [clip for clip in plan["clips"] if options.clip is None or clip["name"] == options.clip]
    if not selected_clips:
        raise RuntimeError(f"Requested Warden render clip {options.clip!r} is not in the pinned plan")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source), import_pack_images=False)
    rigs = [node for node in bpy.context.scene.objects if node.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"Expected one Warden rig; got {len(rigs)}")
    rig = rigs[0]
    meshes = [node for node in bpy.context.scene.objects if node.type == "MESH"
              and node.parent == rig
              and any(modifier.type == "ARMATURE" and modifier.object == rig for modifier in node.modifiers)]
    if len(meshes) != 4:
        raise RuntimeError(f"Expected four Warden review meshes; got {len(meshes)}")
    for node in bpy.context.scene.objects:
        if node.type == "MESH" and node not in meshes:
            node.hide_render = True

    rig.animation_data_create()
    rig.animation_data.action = None
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    rest_low, rest_high = surface_bounds(meshes)
    floor = rest_low.z

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.world = bpy.data.worlds.new("WARDEN_MOTION_REVIEW_WORLD")
    scene.world.color = (0.012, 0.016, 0.024)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.mesh.primitive_plane_add(size=5.5, location=(0, 0, floor - 0.001))
    ground = bpy.context.object
    ground.name = "REVIEW_ONLY_FIXED_FLOOR"
    ground_material = bpy.data.materials.new("REVIEW_ONLY_FLOOR_MATERIAL")
    ground_material.diffuse_color = (0.045, 0.055, 0.07, 1)
    ground_material.roughness = 0.82
    ground.data.materials.append(ground_material)

    add_area("REVIEW_KEY", (3.4, -3.8, 4.1), 780, 3.0, (1.0, 0.73, 0.5))
    add_area("REVIEW_FILL", (-2.8, -2.2, 2.2), 520, 2.8, (0.45, 0.62, 1.0))
    add_area("REVIEW_RIM", (-0.4, 3.8, 3.4), 880, 2.4, (1.0, 0.27, 0.12))
    camera_data = bpy.data.cameras.new("FIXED_WARDEN_MOTION_CAMERA")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max(1.7, (rest_high.z - rest_low.z) * 1.65)
    camera = bpy.data.objects.new("FIXED_WARDEN_MOTION_CAMERA", camera_data)
    camera.location = (3.6, -5.2, floor + 2.5)
    scene.collection.objects.link(camera)
    scene.camera = camera
    aim_at(camera, Vector((0.18, 0.0, floor + (rest_high.z - floor) * 0.52)))

    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "status": "pbr-eight-phase-draft-review-not-approval",
        "input": str(source),
        "inputSha256": expected_sha,
        "plan": str(plan_path),
        "planSha256": sha256(plan_bytes).hexdigest(),
        "fixedFloorMeters": floor,
        "camera": {"type": "orthographic", "location": list(camera.location), "scale": camera_data.ortho_scale},
        "clips": [],
    }
    for clip in selected_clips:
        action = bpy.data.actions.get(clip["name"])
        if action is None:
            raise RuntimeError(f"Missing composed action {clip['name']}")
        rig.animation_data.action = action
        clip_dir = output / clip["name"]
        clip_dir.mkdir(parents=True, exist_ok=True)
        panels = []
        for panel, phase in enumerate(clip["phases"], start=1):
            bpy.context.scene.frame_set(phase["frame"])
            bpy.context.view_layer.update()
            low, high = surface_bounds(meshes)
            path = clip_dir / f"{panel:02d}-{phase['id']}.png"
            scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            panels.append({
                "panel": panel,
                "phase": phase["id"],
                "frame": phase["frame"],
                "path": str(path),
                "surfaceBounds": {"min": list(low), "max": list(high)},
                "floorClearanceMeters": low.z - floor,
                "root": point_at(rig, "root"),
                "leftHand": point_at(rig, "hand_L"),
                "rightHand": point_at(rig, "hand_R"),
            })
        if len(panels) != 8:
            raise RuntimeError(f"{clip['name']}: exact-eight render failed")
        manifest["clips"].append({"name": clip["name"], "semantic": clip["semantic"], "panels": panels})
    (output / "render-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("WARDEN_MOTION_V2_RENDER=" + str(output))


if __name__ == "__main__":
    main()
