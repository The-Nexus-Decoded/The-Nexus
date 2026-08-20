"""Build the three First Breach named NPCs from shared humanoid rig families.

The body FBX supplies the canonical 65-bone skeleton and skin. Modular heads,
hair, colors, and simple role clothing remain separate inputs to this local
assembly step. The output GLBs are MVP actors, not new per-NPC skeletons.

Run with Blender 4.5+:

    blender --background --python scripts/build-named-npc-runtime-assemblies.py -- \
      --intake-root H:/.../issue-448/technicalized-pilots \
      --output-root public/assets/3d/local-derived/issue-448/named-npcs \
      --evidence-root H:/CodexData/.codex/tmp/issue-448-named-npc-evidence
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector


NPCS = (
    {
        "npcId": "ilyra",
        "runtimeAssetId": "npc.named.ilyra.canonical-v001",
        "bodyRigAssetId": "body-human-feminine-heavy-v001",
        "body": "full-finger-rigs-v001/body-human-feminine-heavy-v001-full-fingers-v002.fbx",
        "headAssetId": "head-european-feminine-v001",
        "head": "modular-head-library-v001/sd-head-european-feminine-v001.glb",
        "hairAssetId": "hair-fem-braided-crown-v001",
        "hair": "hair-head-fits-v001/sd-hair-fem-braided-crown-head-fit-v001.glb",
        "hairColor": "#A6A8B4",
        "skinColor": "#9A6653",
        "torsoColor": "#596B78",
        "legColor": "#35444D",
        "ancestry": "human",
        "presentation": "feminine",
        "role": "wellkeeper",
    },
    {
        "npcId": "orren",
        "runtimeAssetId": "npc.named.orren.canonical-v001",
        "bodyRigAssetId": "body-elf-masculine-heavy-v001",
        "body": "humanoid-rigs-v001/body-elf-masculine-heavy-v001/body-elf-masculine-heavy-v001-rigged-v001.fbx",
        "headAssetId": "head-south-asian-indian-masculine-v001",
        "head": "modular-head-library-v001/sd-head-south-asian-indian-masculine-v001.glb",
        "hairAssetId": "hair-masc-topknot-v001",
        "hair": "hair-head-fits-v001/sd-hair-masc-topknot-head-fit-v001.glb",
        "hairColor": "#17131A",
        "skinColor": "#82573F",
        "torsoColor": "#405C50",
        "legColor": "#293A35",
        "ancestry": "elf",
        "presentation": "masculine",
        "role": "scout",
    },
    {
        "npcId": "brannoc",
        "runtimeAssetId": "npc.named.brannoc.canonical-v001",
        "bodyRigAssetId": "body-dwarf-masculine-heavy-v001",
        "body": "full-finger-rigs-v001/body-dwarf-masculine-heavy-v001-full-fingers-v002.fbx",
        "headAssetId": "head-european-masculine-v001",
        "head": "modular-head-library-v001/sd-head-european-masculine-v001.glb",
        "hairAssetId": "hair-masc-swept-back-v001",
        "hair": "hair-head-fits-v001/sd-hair-masc-swept-back-head-fit-v001.glb",
        "hairColor": "#9699A5",
        "skinColor": "#A46D50",
        "torsoColor": "#5B4638",
        "legColor": "#37454E",
        "ancestry": "dwarf",
        "presentation": "masculine",
        "role": "arena-warden",
    },
)


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc
    parser = argparse.ArgumentParser()
    parser.add_argument("--intake-root", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--evidence-root", required=True, type=Path)
    return parser.parse_args(sys.argv[separator + 1 :])


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest().upper()


def import_asset(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.context.scene.objects)
    if path.suffix.lower() == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    else:
        bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def world_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector(tuple(min(point[index] for point in points) for index in range(3))),
        Vector(tuple(max(point[index] for point in points) for index in range(3))),
    )


def bone_world_point(armature: bpy.types.Object, bone_name: str, tail: bool = False) -> Vector:
    bone = armature.data.bones[bone_name]
    return armature.matrix_world @ (bone.tail_local if tail else bone.head_local)


def parent_to_bone(obj: bpy.types.Object, armature: bpy.types.Object, bone_name: str) -> None:
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def material(name: str, color: str, roughness: float = 0.72, metallic: float = 0.0) -> bpy.types.Material:
    value = color.lstrip("#")
    rgb = tuple(int(value[index : index + 2], 16) / 255.0 for index in (0, 2, 4))
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*rgb, 1.0)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    return result


def tint_mesh(obj: bpy.types.Object, tint: bpy.types.Material) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(tint)


def paint_body_regions(
    body: bpy.types.Object,
    minimum: Vector,
    maximum: Vector,
    config: dict,
) -> dict[str, int]:
    """Restore an MVP skin/clothing palette to single-material intake bodies.

    The local rig intake has valid topology, weights, and a complete skeleton,
    but its FBX does not embed the authored 3D Studio texture set. Its geometry
    still has clearly separated head, arms, shirt, shorts, and legs, so assign
    stable materials by each polygon's spatial region. This keeps the canonical
    skin and avoids pretending the gray diagnostic material is production art.
    """
    skin = material(f"MAT_{config['npcId']}_skin", config["skinColor"], 0.62)
    torso = material(f"MAT_{config['npcId']}_torso_cloth", config["torsoColor"], 0.82)
    legs = material(f"MAT_{config['npcId']}_leg_cloth", config["legColor"], 0.86)
    body.data.materials.clear()
    for region_material in (skin, torso, legs):
        body.data.materials.append(region_material)

    height = max(0.001, maximum.z - minimum.z)
    width = max(0.001, maximum.x - minimum.x)
    center_x = (minimum.x + maximum.x) * 0.5
    counts = {"skin": 0, "torsoCloth": 0, "legCloth": 0}
    for polygon in body.data.polygons:
        center = sum(
            (body.matrix_world @ body.data.vertices[index].co for index in polygon.vertices),
            Vector(),
        ) / len(polygon.vertices)
        normalized_height = (center.z - minimum.z) / height
        arm_or_hand = normalized_height > 0.49 and abs(center.x - center_x) > width * 0.20
        exposed_skin = normalized_height > 0.79 or normalized_height < 0.39 or arm_or_hand
        if exposed_skin:
            polygon.material_index = 0
            counts["skin"] += 1
        elif normalized_height < 0.58:
            polygon.material_index = 2
            counts["legCloth"] += 1
        else:
            polygon.material_index = 1
            counts["torsoCloth"] += 1
    return counts


def add_primitive(
    primitive: str,
    name: str,
    location: Vector,
    scale: tuple[float, float, float],
    tint: bpy.types.Material,
    armature: bpy.types.Object,
    bone_name: str,
) -> bpy.types.Object:
    if primitive == "cube":
        bpy.ops.mesh.primitive_cube_add(location=location)
    elif primitive == "cylinder":
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, location=location)
    elif primitive == "cone":
        bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=1.0, radius2=0.72, location=location)
    elif primitive == "torus":
        bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.18, major_segments=24, location=location)
    else:
        raise ValueError(primitive)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tint_mesh(obj, tint)
    parent_to_bone(obj, armature, bone_name)
    return obj


def add_role_layers(config: dict, armature: bpy.types.Object, body_height: float) -> list[bpy.types.Object]:
    role = config["role"]
    hip = bone_world_point(armature, "mixamorig:Hips")
    chest = bone_world_point(armature, "mixamorig:Spine2")
    neck = bone_world_point(armature, "mixamorig:Neck")
    head = bone_world_point(armature, "mixamorig:Head")
    h = body_height
    blue_grey = material(f"MAT_{role}_blue_grey", "#59656E")
    leather = material(f"MAT_{role}_leather", "#4B3024")
    green = material(f"MAT_{role}_green", "#38544A")
    metal = material(f"MAT_{role}_metal", "#8A8172", 0.38, 0.46)
    layers: list[bpy.types.Object] = []

    if role == "wellkeeper":
        layers.append(add_primitive("cone", "Ilyra_PilgrimSkirt", hip + Vector((0, 0, -h * 0.20)), (h * 0.17, h * 0.13, h * 0.24), blue_grey, armature, "mixamorig:Hips"))
        layers.append(add_primitive("torus", "Ilyra_BraidedCollar", neck + Vector((0, 0, h * 0.01)), (h * 0.075, h * 0.055, h * 0.035), blue_grey, armature, "mixamorig:Neck"))
        layers.append(add_primitive("cube", "Ilyra_KeyPouch", hip + Vector((h * 0.12, -h * 0.07, -h * 0.03)), (h * 0.045, h * 0.025, h * 0.07), leather, armature, "mixamorig:Hips"))
        for offset in (-0.018, 0.018):
            layers.append(add_primitive("torus", f"Ilyra_Key_{offset}", hip + Vector((h * (0.16 + offset), -h * 0.075, -h * 0.08)), (h * 0.018, h * 0.012, h * 0.018), metal, armature, "mixamorig:Hips"))
    elif role == "scout":
        layers.append(add_primitive("torus", "Orren_GreenScarf", neck + Vector((0, 0, h * 0.006)), (h * 0.072, h * 0.055, h * 0.036), green, armature, "mixamorig:Neck"))
        quiver = add_primitive("cylinder", "Orren_Quiver", chest + Vector((h * 0.12, h * 0.075, h * 0.02)), (h * 0.025, h * 0.025, h * 0.16), leather, armature, "mixamorig:Spine2")
        quiver.rotation_euler.y = -0.35
        layers.append(quiver)
        ear_tint = material("MAT_Orren_ears", "#8B5E46")
        for side in (-1, 1):
            ear = add_primitive("cone", f"Orren_PointEar_{side}", head + Vector((side * h * 0.075, 0, h * 0.08)), (h * 0.025, h * 0.018, h * 0.055), ear_tint, armature, "mixamorig:Head")
            ear.rotation_euler.y = side * 1.25
            layers.append(ear)
    else:
        layers.append(add_primitive("cube", "Brannoc_TrainingApron", hip + Vector((0, -h * 0.065, -h * 0.10)), (h * 0.10, h * 0.015, h * 0.11), blue_grey, armature, "mixamorig:Hips"))
    return layers


def build_one(config: dict, intake_root: Path, output_root: Path) -> dict:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    body_path = (intake_root / config["body"]).resolve()
    head_path = (intake_root / config["head"]).resolve()
    hair_path = (intake_root / config["hair"]).resolve()
    for path in (body_path, head_path, hair_path):
        if not path.is_file():
            raise FileNotFoundError(path)

    body_objects = import_asset(body_path)
    armatures = [obj for obj in body_objects if obj.type == "ARMATURE"]
    body_meshes = [obj for obj in body_objects if obj.type == "MESH"]
    if len(armatures) != 1 or len(body_meshes) != 1:
        raise RuntimeError(f"{config['npcId']}: expected one armature and one body mesh")
    armature, body = armatures[0], body_meshes[0]
    armature.name = f"SD_{config['npcId']}_CanonicalRig"
    body.name = f"SD_{config['npcId']}_Body"
    bpy.context.view_layer.update()
    body_minimum, body_maximum = world_bounds(body)
    body_height = body_maximum.z - body_minimum.z
    body_region_polygons = paint_body_regions(body, body_minimum, body_maximum, config)
    # Preserve the body rig's integrated head for the playable MVP. The earlier
    # modular-head replacement cut the skinned scalp away and fitted unskinned
    # source meshes in a different local axis, producing faceless/occluded
    # actors. The selected modular head and hair remain recorded as the locked
    # identity targets for the post-MVP deformation pass in issue #457.

    role_layers = add_role_layers(config, armature, body_height)
    armature.data["souldrifterRigFamily"] = "canonical-humanoid-65"
    armature.data["souldrifterBodyRigAssetId"] = config["bodyRigAssetId"]
    armature["souldrifterNpcId"] = config["npcId"]
    armature["souldrifterRuntimeAssetId"] = config["runtimeAssetId"]
    armature["souldrifterHeadAssetId"] = config["headAssetId"]
    armature["souldrifterHairAssetId"] = config["hairAssetId"]

    for animation in list(bpy.data.actions):
        bpy.data.actions.remove(animation)
    output_root.mkdir(parents=True, exist_ok=True)
    output = output_root / f"sd-npc-{config['npcId']}-canonical-v001.glb"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_skins=True,
        export_morph=True,
        export_morph_normal=True,
        export_yup=True,
    )
    return {
        **config,
        "bodySource": str(body_path),
        "bodySourceSha256": digest(body_path),
        "headSource": str(head_path),
        "headSourceSha256": digest(head_path),
        "hairSource": str(hair_path),
        "hairSourceSha256": digest(hair_path),
        "output": str(output.resolve()),
        "outputBytes": output.stat().st_size,
        "outputSha256": digest(output),
        "bones": len(armature.data.bones),
        "roleLayerCount": len(role_layers),
        "bodyMaterialMode": "spatial-mvp-skin-cloth-segmentation",
        "bodyRegionPolygons": body_region_polygons,
        "runtimeIdentityGeometry": "integrated-body-head",
        "modularIdentityTargetRecorded": True,
        "modularIdentityGeometryDeferredToIssue": 457,
        "sharedSkeleton": True,
        "uniqueNpcSkeleton": False,
        "mvpRuntimeAllowed": True,
        "postMvpPolishIssue": 457,
    }


def main() -> None:
    args = arguments()
    intake_root = args.intake_root.resolve()
    output_root = args.output_root.resolve()
    evidence_root = args.evidence_root.resolve()
    evidence_root.mkdir(parents=True, exist_ok=True)
    outputs = [build_one(config, intake_root, output_root) for config in NPCS]
    manifest = {
        "schemaVersion": 1,
        "issue": 448,
        "recipe": "scripts/build-named-npc-runtime-assemblies.py",
        "rigFamily": "canonical-humanoid-65",
        "namedNpcFullBodyExportRequired": False,
        "mixamoNamedNpcUseAllowed": False,
        "bodyMaterialMode": "spatial-mvp-skin-cloth-segmentation",
        "outputCount": len(outputs),
        "outputs": outputs,
    }
    manifest_path = output_root / "named-npc-runtime-assemblies-v001.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (evidence_root / manifest_path.name).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
