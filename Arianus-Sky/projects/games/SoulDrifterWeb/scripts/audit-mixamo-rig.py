"""Fresh-import and stress-test a Mixamo-rigged humanoid FBX.

Run with Blender:

    blender --background --python scripts/audit-mixamo-rig.py -- \
      --input RIGGED.fbx --output-dir AUDIT_DIR --label body-id

Outputs stay outside the repository until the visual proof is reviewed. The
script is reusable for every preserved humanoid body bind in issue #448.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


EXPECTED_BONES = {
    "mixamorig:Hips",
    "mixamorig:Spine",
    "mixamorig:Spine1",
    "mixamorig:Spine2",
    "mixamorig:Neck",
    "mixamorig:Head",
    "mixamorig:LeftShoulder",
    "mixamorig:LeftArm",
    "mixamorig:LeftForeArm",
    "mixamorig:LeftHand",
    "mixamorig:RightShoulder",
    "mixamorig:RightArm",
    "mixamorig:RightForeArm",
    "mixamorig:RightHand",
    "mixamorig:LeftUpLeg",
    "mixamorig:LeftLeg",
    "mixamorig:LeftFoot",
    "mixamorig:LeftToeBase",
    "mixamorig:RightUpLeg",
    "mixamorig:RightLeg",
    "mixamorig:RightFoot",
    "mixamorig:RightToeBase",
}
EXPECTED_FINGER_BONES = {
    f"mixamorig:{side}Hand{finger}{segment}"
    for side in ("Left", "Right")
    for finger in ("Thumb", "Index", "Middle", "Ring", "Pinky")
    for segment in (1, 2, 3, 4)
}
MINIMUM_PRODUCTION_BONES = 65


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--label", required=True)
    parser.add_argument("--resolution", type=int, default=900)
    return parser.parse_args(sys.argv[separator + 1 :])


def world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [item.matrix_world @ Vector(corner) for item in meshes for corner in item.bound_box]
    return (
        Vector(tuple(min(point[index] for point in corners) for index in range(3))),
        Vector(tuple(max(point[index] for point in corners) for index in range(3))),
    )


def triangle_count(item: bpy.types.Object) -> int:
    item.data.calc_loop_triangles()
    return len(item.data.loop_triangles)


def weight_audit(item: bpy.types.Object, bone_names: set[str]) -> dict[str, object]:
    group_names = {group.index: group.name for group in item.vertex_groups}
    influence_counts: list[int] = []
    sums: list[float] = []
    weighted_bones: set[str] = set()
    for vertex in item.data.vertices:
        weights = []
        for assignment in vertex.groups:
            name = group_names.get(assignment.group)
            if name in bone_names and assignment.weight > 0.000001:
                weights.append(assignment.weight)
                weighted_bones.add(name)
        influence_counts.append(len(weights))
        sums.append(sum(weights))
    return {
        "vertexGroups": len(item.vertex_groups),
        "boneVertexGroups": len(set(group_names.values()) & bone_names),
        "weightedBones": len(weighted_bones),
        "vertices": len(item.data.vertices),
        "unweightedVertices": sum(count == 0 for count in influence_counts),
        "verticesOverFourInfluences": sum(count > 4 for count in influence_counts),
        "maxInfluences": max(influence_counts, default=0),
        "averageInfluences": round(sum(influence_counts) / max(len(influence_counts), 1), 4),
        "nonNormalizedVertices": sum(count > 0 and abs(total - 1.0) > 0.02 for count, total in zip(influence_counts, sums)),
        "minimumWeightSum": round(min((total for total in sums if total > 0), default=0.0), 6),
        "maximumWeightSum": round(max(sums, default=0.0), 6),
    }


def add_area_light(name: str, location: tuple[float, float, float], energy: float, size: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    light.location = location
    bpy.context.collection.objects.link(light)


def point_camera(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def reset_pose(rig: bpy.types.Object) -> None:
    for bone in rig.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)


def rotate(rig: bpy.types.Object, name: str, x: float = 0, y: float = 0, z: float = 0) -> None:
    bone = rig.pose.bones.get(name)
    if bone is None:
        return
    bone.rotation_mode = "XYZ"
    bone.rotation_euler = tuple(math.radians(value) for value in (x, y, z))


def apply_stress_pose(rig: bpy.types.Object, pose: str) -> None:
    reset_pose(rig)
    if pose in {"arm-elbow", "wrist-finger"}:
        rotate(rig, "mixamorig:LeftShoulder", z=-8)
        rotate(rig, "mixamorig:RightShoulder", z=8)
        rotate(rig, "mixamorig:LeftArm", x=-18, z=-38)
        rotate(rig, "mixamorig:RightArm", x=-18, z=38)
        rotate(rig, "mixamorig:LeftForeArm", z=-96)
        rotate(rig, "mixamorig:RightForeArm", z=96)
    if pose == "wrist-finger":
        rotate(rig, "mixamorig:LeftHand", x=25, z=-18)
        rotate(rig, "mixamorig:RightHand", x=25, z=18)
        for side in ("Left", "Right"):
            for finger in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
                for segment in (1, 2, 3):
                    rotate(rig, f"mixamorig:{side}Hand{finger}{segment}", z=32 if side == "Left" else -32)
    if pose == "hip-knee":
        rotate(rig, "mixamorig:Hips", x=8)
        rotate(rig, "mixamorig:LeftUpLeg", x=-35, z=-12)
        rotate(rig, "mixamorig:RightUpLeg", x=18, z=8)
        rotate(rig, "mixamorig:LeftLeg", x=72)
        rotate(rig, "mixamorig:RightLeg", x=28)
        rotate(rig, "mixamorig:LeftFoot", x=-28)
        rotate(rig, "mixamorig:RightFoot", x=-12)
    bpy.context.view_layer.update()


def main() -> None:
    args = arguments()
    source = args.input.resolve()
    output_dir = args.output_dir.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    output_dir.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source), automatic_bone_orientation=False)
    rigs = [item for item in bpy.context.scene.objects if item.type == "ARMATURE"]
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if len(rigs) != 1 or not meshes:
        raise RuntimeError(f"Expected one armature and at least one mesh; got {len(rigs)} and {len(meshes)}")
    rig = rigs[0]
    bone_names = {bone.name for bone in rig.data.bones}
    minimum, maximum = world_bounds(meshes)
    dimensions = maximum - minimum

    camera_data = bpy.data.cameras.new("RigAuditCamera")
    camera_data.lens = 58
    camera = bpy.data.objects.new("RigAuditCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    distance = max(dimensions.z * 1.45, 2.4)
    add_area_light("RigKey", (-distance * 0.55, -distance * 0.65, maximum.z * 0.9), 1700, 2.4)
    add_area_light("RigFill", (distance * 0.6, -distance * 0.25, maximum.z * 0.65), 950, 2.2)
    add_area_light("RigRim", (0, distance * 0.55, maximum.z * 0.95), 1300, 1.8)
    floor_material = bpy.data.materials.new("RigAuditFloor")
    floor_material.diffuse_color = (0.055, 0.065, 0.08, 1)
    bpy.ops.mesh.primitive_plane_add(size=max(dimensions.x, dimensions.y, 1.0) * 5, location=(0, 0, minimum.z))
    bpy.context.object.data.materials.append(floor_material)

    scene = bpy.context.scene
    render_engines = {
        item.identifier
        for item in scene.render.bl_rna.properties["engine"].enum_items
    }
    preferred_engine = next(
        (engine for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE") if engine in render_engines),
        None,
    )
    if preferred_engine is None:
        raise RuntimeError(f"No supported Eevee render engine found: {sorted(render_engines)}")
    scene.render.engine = preferred_engine
    scene.render.resolution_x = args.resolution
    scene.render.resolution_y = args.resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("RigAuditWorld")
    scene.world.color = (0.018, 0.022, 0.03)

    rendered = []
    pose_views = {
        "neutral": (0.52, 1.45),
        "arm-elbow": (0.66, 1.05),
        "wrist-finger": (0.62, 0.88),
        "hip-knee": (0.32, 1.0),
    }
    for pose, (height_fraction, distance_scale) in pose_views.items():
        apply_stress_pose(rig, pose)
        target = Vector((0, 0, minimum.z + dimensions.z * height_fraction))
        camera.location = (distance * 0.32, -distance * distance_scale, target.z + dimensions.z * 0.03)
        point_camera(camera, target)
        output = output_dir / f"{args.label}-{pose}.png"
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        rendered.append(output.name)

    mesh_reports = []
    for item in meshes:
        mesh_reports.append({
            "name": item.name,
            "vertices": len(item.data.vertices),
            "triangles": triangle_count(item),
            "materials": len(item.material_slots),
            "armatureModifiers": [modifier.object.name for modifier in item.modifiers if modifier.type == "ARMATURE" and modifier.object],
            "weights": weight_audit(item, bone_names),
        })
    missing_expected_bones = EXPECTED_BONES - bone_names
    missing_finger_bones = EXPECTED_FINGER_BONES - bone_names
    weights_pass = all(
        mesh_report["weights"]["unweightedVertices"] == 0
        and mesh_report["weights"]["verticesOverFourInfluences"] == 0
        and mesh_report["weights"]["nonNormalizedVertices"] == 0
        for mesh_report in mesh_reports
    )
    report = {
        "schemaVersion": 1,
        "issue": 448,
        "label": args.label,
        "source": str(source),
        "sourceBytes": source.stat().st_size,
        "sourceSha256": sha256(source.read_bytes()).hexdigest().upper(),
        "blenderVersion": bpy.app.version_string,
        "armature": rig.name,
        "bones": len(bone_names),
        "rootBones": sorted(bone.name for bone in rig.data.bones if bone.parent is None),
        "minimumProductionBones": MINIMUM_PRODUCTION_BONES,
        "fullFingerChainsRequired": True,
        "missingExpectedBones": sorted(missing_expected_bones),
        "missingFingerBones": sorted(missing_finger_bones),
        "boneNames": sorted(bone_names),
        "dimensionsMeters": [round(value, 6) for value in dimensions],
        "meshes": mesh_reports,
        "actions": sorted(action.name for action in bpy.data.actions),
        "structuralPass": (
            len(bone_names) >= MINIMUM_PRODUCTION_BONES
            and not missing_expected_bones
            and not missing_finger_bones
            and weights_pass
        ),
        "renders": rendered,
        "visualDeformationReviewRequired": True,
        "runtimePromotionAllowed": False,
    }
    audit = output_dir / f"{args.label}-rig-audit.json"
    audit.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
