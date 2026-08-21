"""Build the reusable SoulDrifter modular head and expression prototype.

The output is deliberately gated from runtime promotion. The eight restrained
deformation profiles prove shared topology, the canonical neck seam, and one
facial-control contract. They remain reference-review prototypes rather than
validated representations of any identity group.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import sys
import traceback

import bpy
from mathutils import Matrix, Vector


FAMILIES = {
    "african-diaspora-black": {
        "nose_width": 0.006,
        "nose_projection": 0.006,
        "lip_fullness": 0.012,
        "cheek_width": 0.008,
        "jaw_width": 0.003,
    },
    "east-asian": {
        "nose_width": 0.002,
        "nose_projection": -0.006,
        "lip_fullness": 0.004,
        "cheek_width": 0.012,
        "jaw_width": 0.002,
    },
    "south-asian-indian": {
        "nose_width": 0.003,
        "nose_projection": 0.008,
        "lip_fullness": 0.006,
        "cheek_width": 0.004,
        "jaw_width": 0.001,
    },
    "european": {
        "nose_width": 0.0,
        "nose_projection": 0.004,
        "lip_fullness": 0.0,
        "cheek_width": 0.0,
        "jaw_width": 0.0,
    },
}

PRESENTATIONS = {
    "feminine": {"jaw_width": -0.007, "chin_depth": -0.002, "brow_depth": -0.001},
    "masculine": {"jaw_width": 0.008, "chin_depth": 0.004, "brow_depth": 0.003},
}

SKIN_TONES = {
    "deep": "#3B241D",
    "dark": "#5A3528",
    "medium-deep": "#7A4A36",
    "medium": "#A86F52",
    "tan-olive": "#C08B68",
    "light-pale": "#E1B99B",
}

CONTROL_NAMES = [
    "blink.left",
    "blink.right",
    "squint",
    "brow.raise",
    "brow.lower",
    "brow.asymmetry",
    "jaw.open",
    "smile",
    "frown",
    "viseme.aa",
    "viseme.ee",
    "viseme.oh",
]


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--resolution", type=int, default=512)
    return parser.parse_args(sys.argv[separator + 1 :])


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def smoothstep(edge0: float, edge1: float, value: float) -> float:
    if edge0 == edge1:
        return float(value >= edge1)
    t = clamp((value - edge0) / (edge1 - edge0))
    return t * t * (3.0 - 2.0 * t)


def band(value: float, minimum: float, maximum: float, feather: float) -> float:
    return smoothstep(minimum - feather, minimum + feather, value) * (
        1.0 - smoothstep(maximum - feather, maximum + feather, value)
    )


def world_bounds(mesh: bpy.types.Object) -> tuple[Vector, Vector]:
    points = [mesh.matrix_world @ Vector(corner) for corner in mesh.bound_box]
    return (
        Vector(min(point[index] for point in points) for index in range(3)),
        Vector(max(point[index] for point in points) for index in range(3)),
    )


def normalized(point: Vector, minimum: Vector, maximum: Vector) -> tuple[float, float, float]:
    center_x = (minimum.x + maximum.x) * 0.5
    half_x = max((maximum.x - minimum.x) * 0.5, 1e-6)
    return (
        (point.x - center_x) / half_x,
        (point.y - minimum.y) / max(maximum.y - minimum.y, 1e-6),
        (point.z - minimum.z) / max(maximum.z - minimum.z, 1e-6),
    )


def profile_offset(
    point: Vector,
    minimum: Vector,
    maximum: Vector,
    family: dict[str, float],
    presentation: dict[str, float],
) -> Vector:
    nx, ny, nz = normalized(point, minimum, maximum)
    front = 1.0 - smoothstep(0.35, 0.82, ny)
    seam_guard = smoothstep(0.15, 0.25, nz)
    offset = Vector((0.0, 0.0, 0.0))

    nose = band(abs(nx), 0.0, 0.24, 0.12) * band(nz, 0.43, 0.69, 0.07) * front
    nose_direction = clamp(nx / 0.24, -1.0, 1.0)
    offset.x += family["nose_width"] * nose * nose_direction
    offset.y -= family["nose_projection"] * nose

    lips = band(abs(nx), 0.0, 0.34, 0.12) * band(nz, 0.30, 0.45, 0.06) * front
    offset.y -= family["lip_fullness"] * lips

    cheeks = band(abs(nx), 0.28, 0.78, 0.18) * band(nz, 0.42, 0.67, 0.10) * front
    offset.x += math.copysign(family["cheek_width"] * cheeks, nx)

    jaw = band(abs(nx), 0.22, 0.95, 0.20) * band(nz, 0.16, 0.38, 0.10) * front
    jaw_amount = family["jaw_width"] + presentation["jaw_width"]
    offset.x += math.copysign(jaw_amount * jaw, nx)

    chin = band(abs(nx), 0.0, 0.34, 0.14) * band(nz, 0.15, 0.31, 0.08) * front
    offset.y -= presentation["chin_depth"] * chin

    brow = band(abs(nx), 0.10, 0.72, 0.15) * band(nz, 0.66, 0.80, 0.06) * front
    offset.y -= presentation["brow_depth"] * brow
    return offset * seam_guard


def expression_offset(
    control: str,
    point: Vector,
    minimum: Vector,
    maximum: Vector,
) -> Vector:
    nx, ny, nz = normalized(point, minimum, maximum)
    front = 1.0 - smoothstep(0.32, 0.76, ny)
    seam_guard = smoothstep(0.14, 0.23, nz)
    delta = Vector((0.0, 0.0, 0.0))

    if control.startswith("blink."):
        side = -1.0 if control.endswith("left") else 1.0
        eye = band(abs(nx), 0.18, 0.69, 0.13) * band(nz, 0.55, 0.70, 0.055) * front
        eye *= smoothstep(-0.08, 0.15, nx * side)
        eye_center = minimum.z + (maximum.z - minimum.z) * 0.625
        delta.z += (eye_center - point.z) * 0.78 * eye
    elif control == "squint":
        eye = band(abs(nx), 0.18, 0.72, 0.14) * band(nz, 0.52, 0.70, 0.065) * front
        eye_center = minimum.z + (maximum.z - minimum.z) * 0.61
        delta.z += (eye_center - point.z) * 0.36 * eye
        delta.x += math.copysign(0.0025 * eye, nx)
    elif control.startswith("brow."):
        brow = band(abs(nx), 0.10, 0.76, 0.16) * band(nz, 0.67, 0.84, 0.07) * front
        direction = 0.009 if control == "brow.raise" else -0.007
        if control == "brow.asymmetry":
            direction = 0.009 if nx < 0.0 else -0.004
        delta.z += direction * brow
        delta.y -= 0.002 * brow * (1.0 if direction > 0.0 else -1.0)
    elif control in {"jaw.open", "viseme.aa"}:
        lower = band(abs(nx), 0.0, 0.76, 0.20) * band(nz, 0.12, 0.43, 0.11) * front
        amount = 0.034 if control == "jaw.open" else 0.019
        delta.z -= amount * lower
        delta.y += amount * 0.20 * lower
    elif control in {"smile", "frown"}:
        mouth = band(abs(nx), 0.17, 0.58, 0.13) * band(nz, 0.29, 0.45, 0.06) * front
        sign = 1.0 if control == "smile" else -1.0
        delta.x += math.copysign(0.009 * mouth, nx)
        delta.z += sign * 0.010 * mouth
        delta.y -= sign * 0.002 * mouth
    elif control == "viseme.ee":
        mouth = band(abs(nx), 0.05, 0.55, 0.14) * band(nz, 0.29, 0.44, 0.06) * front
        delta.x += math.copysign(0.008 * mouth, nx)
        delta.z += (0.002 if nz > 0.365 else -0.002) * mouth
    elif control == "viseme.oh":
        mouth = band(abs(nx), 0.0, 0.48, 0.14) * band(nz, 0.27, 0.46, 0.07) * front
        delta.x -= math.copysign(0.009 * mouth, nx)
        delta.z += (0.008 if nz > 0.365 else -0.008) * mouth
        delta.y -= 0.003 * mouth
    return delta * seam_guard


def clone_head(
    source: bpy.types.Object,
    family_id: str,
    presentation_id: str,
    minimum: Vector,
    maximum: Vector,
) -> bpy.types.Object:
    clone = source.copy()
    clone.data = source.data.copy()
    clone.name = f"SD_Head_{family_id}_{presentation_id}"
    bpy.context.collection.objects.link(clone)

    original_matrix = source.matrix_world.copy()
    world_points = [original_matrix @ vertex.co for vertex in clone.data.vertices]
    clone.matrix_world = Matrix.Identity(4)
    family = FAMILIES[family_id]
    presentation = PRESENTATIONS[presentation_id]
    for vertex, world_point in zip(clone.data.vertices, world_points, strict=True):
        vertex.co = world_point + profile_offset(
            world_point, minimum, maximum, family, presentation
        )

    clone.shape_key_add(name="Basis")
    for control in CONTROL_NAMES:
        key = clone.shape_key_add(name=control)
        for index, base in enumerate(clone.data.shape_keys.key_blocks["Basis"].data):
            key.data[index].co = base.co + expression_offset(
                control, base.co, minimum, maximum
            )
    for modifier in list(clone.modifiers):
        clone.modifiers.remove(modifier)
    for group in list(clone.vertex_groups):
        clone.vertex_groups.remove(group)
    return clone


def convert_keys_to_bone_local(head: bpy.types.Object, head_matrix: Matrix) -> None:
    inverse = head_matrix.inverted()
    if head.data.shape_keys is None:
        raise RuntimeError(f"{head.name} is missing expression shape keys")
    for key in head.data.shape_keys.key_blocks:
        for point in key.data:
            point.co = inverse @ point.co
    head.matrix_world = head_matrix


def point_at(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def add_area_light(name: str, location: tuple[float, float, float], energy: float) -> None:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = 1.1
    light = bpy.data.objects.new(name, data)
    light.location = location
    bpy.context.collection.objects.link(light)


def preview_material() -> bpy.types.Material:
    material = bpy.data.materials.new("ModularHeadPreviewMaterial")
    material.diffuse_color = (0.24, 0.11, 0.07, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader is None:
        raise RuntimeError("Preview material is missing its Principled BSDF shader")
    shader.inputs["Base Color"].default_value = (0.24, 0.11, 0.07, 1.0)
    shader.inputs["Roughness"].default_value = 0.72
    shader.inputs["Specular IOR Level"].default_value = 0.28
    return material


def configure_render(output_root: Path, resolution: int, target: Vector) -> None:
    scene = bpy.context.scene
    engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = next(
        engine for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE") if engine in engines
    )
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("ModularHeadWorld")
    scene.world.color = (0.018, 0.022, 0.03)
    camera_data = bpy.data.cameras.new("ModularHeadCamera")
    camera = bpy.data.objects.new("ModularHeadCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera.location = (target.x + 0.19, target.y - 0.52, target.z + 0.045)
    camera.data.lens = 72
    point_at(camera, target)
    add_area_light("HeadKey", (-0.36, -0.52, target.z + 0.30), 180)
    add_area_light("HeadFill", (0.44, -0.22, target.z + 0.10), 75)
    add_area_light("HeadRim", (0.0, 0.42, target.z + 0.22), 120)
    output_root.mkdir(parents=True, exist_ok=True)


def export_head(head: bpy.types.Object, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    head.select_set(True)
    bpy.context.view_layer.objects.active = head
    original_matrix = head.matrix_world.copy()
    head.matrix_world = Matrix.Identity(4)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_morph=True,
        export_morph_normal=True,
        export_yup=True,
    )
    head.matrix_world = original_matrix


def render_preview(head: bpy.types.Object, output: Path, expression: str | None = None) -> None:
    if head.data.shape_keys is None:
        raise RuntimeError(f"{head.name} has no expression keys")
    for key in head.data.shape_keys.key_blocks:
        if key.name != "Basis":
            key.value = 0.0
    if expression is not None:
        head.data.shape_keys.key_blocks[expression].value = 0.72
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    args = arguments()
    canonical = args.canonical.resolve()
    output_root = args.output_root.resolve()
    if not canonical.is_file():
        raise FileNotFoundError(canonical)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(canonical))
    source_head = bpy.data.objects.get("SK_HumanHead")
    rigs = [item for item in bpy.context.scene.objects if item.type == "ARMATURE"]
    if source_head is None or len(rigs) != 1:
        raise RuntimeError("Canonical actor must contain SK_HumanHead and one armature")
    rig = rigs[0]
    head_bone = rig.data.bones.get("Head")
    if head_bone is None:
        raise RuntimeError("Canonical actor is missing the Head attachment bone")
    head_matrix = rig.matrix_world @ head_bone.matrix_local
    minimum, maximum = world_bounds(source_head)
    target = (minimum + maximum) * 0.5
    configure_render(output_root, args.resolution, target)
    neutral_preview_material = preview_material()

    for item in bpy.context.scene.objects:
        if item.type == "MESH":
            item.hide_render = True

    outputs = []
    for family_id in FAMILIES:
        for presentation_id in PRESENTATIONS:
            head = clone_head(
                source_head, family_id, presentation_id, minimum, maximum
            )
            convert_keys_to_bone_local(head, head_matrix)
            head.hide_render = False
            head["souldrifterAssetId"] = f"head-{family_id}-{presentation_id}-v001"
            head["attachmentBone"] = "humanoid.head"
            head["attachmentProfile"] = "head-seam-v1"
            head["prototypeStatus"] = "reference-review-required"
            output = output_root / f"sd-head-{family_id}-{presentation_id}-v001.glb"
            neutral = output_root / f"sd-head-{family_id}-{presentation_id}-neutral-v001.png"
            expressive = output_root / f"sd-head-{family_id}-{presentation_id}-expression-v001.png"
            export_head(head, output)
            head.data.materials.clear()
            head.data.materials.append(neutral_preview_material)
            render_preview(head, neutral)
            render_preview(head, expressive, "smile")
            outputs.append({
                "assetId": head["souldrifterAssetId"],
                "familyId": family_id,
                "presentation": presentation_id,
                "output": str(output),
                "outputBytes": output.stat().st_size,
                "outputSha256": digest(output),
                "neutralPreview": str(neutral),
                "expressionPreview": str(expressive),
                "vertices": len(head.data.vertices),
                "triangles": sum(len(polygon.vertices) - 2 for polygon in head.data.polygons),
                "morphTargets": CONTROL_NAMES,
                "sharedGazeControl": {
                    "mesh": "SK_Eyes",
                    "axes": ["gaze.horizontal", "gaze.vertical"],
                },
                "attachmentBone": "humanoid.head",
                "attachmentProfile": "head-seam-v1",
                "skinToneMaterialFamilies": SKIN_TONES,
                "sameTopologyAsCanonical": True,
                "identityReferenceReviewRequired": True,
                "runtimePromotionAllowed": False,
            })
            head.hide_render = True
            print(f"built {family_id}/{presentation_id}")

    result = {
        "schemaVersion": 1,
        "issue": 448,
        "recipe": "scripts/build-modular-head-library.py",
        "canonicalHead": str(canonical),
        "canonicalHeadSha256": digest(canonical),
        "headObject": source_head.name,
        "headBone": head_bone.name,
        "attachmentProfile": "head-seam-v1",
        "familyCount": len(FAMILIES),
        "presentationCount": len(PRESENTATIONS),
        "variantCount": len(outputs),
        "skinToneMaterialFamilies": SKIN_TONES,
        "facialControlContract": {
            "morphTargets": CONTROL_NAMES,
            "sharedGazeMesh": "SK_Eyes",
            "sharedBrowMesh": "SK_Eyebrows",
        },
        "prototypePolicy": {
            "caricatureAllowed": False,
            "referenceGuidedTechnicalApproximation": True,
            "identityReferenceReviewRequired": True,
            "runtimePromotionAllowed": False,
        },
        "outputs": outputs,
    }
    manifest = output_root / "modular-head-library-v001.json"
    manifest.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"manifest": str(manifest), "variantCount": len(outputs)}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception:  # noqa: BLE001 - Blender must propagate batch failures.
        traceback.print_exc()
        raise SystemExit(1)
