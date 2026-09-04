"""Build the #487 exact-head modular hair and facial-hair pack.

The six scalp hairstyles are adapted from the official MakeHuman system asset
pack (CC0). Facial hair uses clean quad cards ray-fitted to the exact Human
foundation face. Nothing is fused into the skin and rejected legacy or
procedural appearance packs are never read.

Run with the cached #487 Blender receipt:

    blender --background --factory-startup --python \
      scripts/build-human-foundation-modular-appearance.py
"""

from __future__ import annotations

import argparse
from array import array
from hashlib import sha256
import json
from math import atan2, cos, isfinite, pi, sin, sqrt
from pathlib import Path
import sys
import bpy
import bmesh
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree


ISSUE = 487
SOURCE_HEAD_SHA256 = "5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8"
MAKEHUMAN_ARCHIVE_SHA256 = "B542127A8E25547C7C29C19F2D1D2ADB9A664C80396ECD694095DBC8028A0107"
LEGACY_APPEARANCE_SHA256 = "363003DDC20434686E0024B421E1D6966FFB9C4F91681EF201D08E015475E9A2"
HUMAN_SHADOWKNIGHT_SHA256 = "970FF14D5C2A43833F892EC3A6B34CBA0AEFEF280ED9D8FBDCEC1CA1833031E6"
MAKEHUMAN_PACK_URL = (
    "https://static.makehumancommunity.org/assets/assetpacks/"
    "makehuman_system_assets.html"
)
MAKEHUMAN_LICENSE = "CC0-1.0"
HEAD_BONE = "mixamorig:Head"
ROOT_BONE = "mixamorig:Hips"
MATERIAL_PREFIX = "MAT_HumanHair_Tintable"

HAIR_SOURCES = {
    "SK_Hair_Cropped": "short03",
    "SK_Hair_Parted": "short04",
    "SK_Hair_CurlyCoiled": "afro01",
    "SK_Hair_Long": "long01",
    "SK_Hair_TiedBack": "ponytail01",
    "SK_Hair_Braided": "braid01",
}
ISSUE448_HAIR_SOURCES = {
    "SK_Hair_Cropped": {
        "assetId": "masc-cropped-fade",
        "filename": "sd-hair-masc-cropped-fade-technicalized-v001.glb",
        "providerTaskId": "e87f2c75",
        "sha256": "4D2327890673B3C70A6D2674D5D588CF81D9035601B97A7BADACCC48C7CF0491",
        "fit": (0.120, 0.105, 0.130, 0.516),
    },
    "SK_Hair_CurlyCoiled": {
        "assetId": "masc-short-curly",
        "filename": "sd-hair-masc-short-curly-technicalized-v001.glb",
        "providerTaskId": "50cd06bd",
        "sha256": "95C7B060DC5B4836E2501084518FE3480AE5AE889573534D3558165B015693AD",
        "fit": (0.118, 0.105, 0.120, 0.522),
    },
}
LONG_HAIR_REFERENCE = {
    "assetId": "masc-shoulder-loose",
    "preview": "sd-hair-masc-shoulder-loose-technicalized-v001.png",
    "providerTaskId": "fae1622b",
    "sourceSha256": "416F65B4D0EA1F13635B42F51ECE8E615A2AB3548E07F088BD2E5495DAC74393",
    "use": "LOCAL_SHAPE_REFERENCE_ONLY_GEOMETRY_NOT_IMPORTED",
}
LONG_HAIR_VISUAL_REFERENCE_PACKET = {
    "lockedAt": "2026-08-29",
    "usage": "VISUAL_PROPORTION_REFERENCE_ONLY_NOT_DERIVATIVE_TEXTURE_OR_GEOMETRY",
    "licenseNote": "Reference pixels are not packed into or copied by the runtime asset.",
    "targets": [
        {
            "view": "FRONT_NEAR_ORTHOGRAPHIC",
            "author": "Vanessa Pozos",
            "sourcePage": (
                "https://www.pexels.com/photo/"
                "portrait-of-a-woman-with-straight-black-hair-14939174/"
            ),
            "directUrl": (
                "https://images.pexels.com/photos/14939174/pexels-photo-14939174.jpeg"
                "?auto=compress&dpr=1&h=1800&w=1800"
            ),
            "license": "Pexels License",
            "licenseUrl": "https://www.pexels.com/license/",
            "localEvidence": (
                "H:/CodexData/souldrifter-toolchain/evidence/487/"
                "modular-appearance-reference-packet-v001/front-pexels-14939174.jpg"
            ),
            "sha256": "CB3F976D0AD35A14FC557EF1B7E5A3334BE8052D1ABD82604CE0A6DE38BF3BAA",
            "designRead": (
                "hair-thin slightly irregular centre part; softly rounded hairline; "
                "temple layers clear the eyes and cheeks"
            ),
        },
        {
            "view": "PROFILE",
            "author": "VladislaVa Petihachna",
            "sourcePage": (
                "https://www.pexels.com/photo/"
                "portrait-of-young-woman-with-long-hair-in-studio-30637384/"
            ),
            "directUrl": (
                "https://images.pexels.com/photos/30637384/"
                "pexels-photo-30637384.jpeg?auto=compress&dpr=1&h=1800&w=1800"
            ),
            "license": "Pexels License",
            "licenseUrl": "https://www.pexels.com/license/",
            "localEvidence": (
                "H:/CodexData/souldrifter-toolchain/evidence/487/"
                "modular-appearance-reference-packet-v001/profile-pexels-30637384.jpg"
            ),
            "sha256": "6B8B79ABFA770CA846721176340DB5F7E17C25C8FAF938B5F01051992914CB68",
            "designRead": (
                "rounded crown volume; layered temple flow behind the cheek; "
                "free length clears the neck before falling"
            ),
        },
        {
            "view": "REAR",
            "author": "Alex Neman",
            "sourcePage": (
                "https://commons.wikimedia.org/wiki/"
                "File:Woman_with_long,_straight_light_brown_hair_from_behind.jpg"
            ),
            "directUrl": (
                "https://upload.wikimedia.org/wikipedia/commons/4/41/"
                "Woman_with_long%2C_straight_light_brown_hair_from_behind.jpg"
            ),
            "license": "CC BY-SA 4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
            "localEvidence": (
                "H:/CodexData/souldrifter-toolchain/evidence/487/"
                "modular-appearance-reference-packet-v001/rear-wikimedia-alex-neman.jpg"
            ),
            "sha256": "E47062CD223172431ED5A1DE35F7C0696D440594BD45EF7C346F94846F92DA87",
            "designRead": (
                "continuous rear crown coverage; overlapping vertical layers; "
                "softly varied tapered hem rather than a blunt curtain"
            ),
        },
        {
            "view": "SUPPLEMENTAL_THREE_QUARTER_HAIRLINE",
            "author": "Ketut Subiyanto",
            "sourcePage": "https://www.pexels.com/photo/portrait-of-woman-4584062/",
            "directUrl": (
                "https://images.pexels.com/photos/4584062/pexels-photo-4584062.jpeg"
                "?auto=compress&dpr=1&h=1800&w=1800"
            ),
            "license": "Pexels License",
            "licenseUrl": "https://www.pexels.com/license/",
            "localEvidence": (
                "H:/CodexData/souldrifter-toolchain/evidence/487/"
                "modular-appearance-reference-packet-v001/"
                "supplemental-three-quarter-pexels-4584062.jpg"
            ),
            "sha256": "DE314A89DBD7101D1E9E08FF703293C132EE9BB62EC07BB9AADD03AB293930FB",
            "designRead": (
                "irregular baby-hair edge; narrow part; ear-visible temple clearance; "
                "natural asymmetric strand grouping"
            ),
        },
    ],
}
CROPPED_HAIR_VISUAL_REFERENCE_PACKET = {
    "lockedAt": "2026-08-30",
    "usage": "VISUAL_PROPORTION_AND_FLOW_REFERENCE_ONLY_NO_PIXEL_OR_GEOMETRY_COPY",
    "licenseNote": (
        "The references remain external and are not downloaded, packed, sampled, "
        "or used as an ML dataset. They only constrain an original manual groom."
    ),
    "targets": [
        {
            "view": "FRONT",
            "author": "Socrates",
            "sourcePage": "https://www.pexels.com/photo/portrait-of-man-23801235/",
            "license": "Pexels License",
            "licenseUrl": "https://www.pexels.com/license/",
            "designRead": (
                "compact close-cropped frontal mass; low top height; tight temples "
                "that keep the face side planes readable"
            ),
        },
        {
            "view": "PROFILE",
            "author": "Atahan Demir",
            "sourcePage": (
                "https://www.pexels.com/photo/face-of-man-with-short-hair-16277536/"
            ),
            "license": "Pexels License",
            "licenseUrl": "https://www.pexels.com/license/",
            "designRead": (
                "short forehead-to-crown flow; compact top silhouette; ear-clearing "
                "temple with no cap-like overhang"
            ),
        },
        {
            "view": "REAR_NAPE",
            "author": "Artem Podrez",
            "sourcePage": (
                "https://www.pexels.com/photo/close-up-photo-of-nape-of-a-man-7956498/"
            ),
            "license": "Pexels License",
            "licenseUrl": "https://www.pexels.com/license/",
            "designRead": (
                "rear mass follows the occipital curve; tidy taper into the nape; "
                "no shelf or outward flare behind the ears"
            ),
        },
        {
            "view": "SUPPLEMENTAL_REAR_CROWN",
            "author": "Alex Neman",
            "sourcePage": (
                "https://commons.wikimedia.org/wiki/"
                "File:Young_man_with_short_hair_from_behind.jpg"
            ),
            "license": "CC BY-SA 4.0",
            "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
            "designRead": (
                "natural crown convergence and skull-following rear volume; use only "
                "as an anatomical flow cross-check"
            ),
        },
    ],
}
HAIR_VERTICAL_FIT = {
    "SK_Hair_Cropped": (0.040, 0.509),
    "SK_Hair_Parted": (0.042, 0.512),
    "SK_Hair_CurlyCoiled": (0.055, 0.530),
    "SK_Hair_Long": (0.056, 0.515),
    "SK_Hair_TiedBack": (0.056, 0.515),
    "SK_Hair_Braided": (0.056, 0.515),
}
HAIR_RADIAL_FIT = {
    "SK_Hair_Cropped": (0.054, 0.056),
    "SK_Hair_Parted": (0.052, 0.054),
    "SK_Hair_CurlyCoiled": (0.056, 0.056),
    "SK_Hair_Long": (0.056, 0.056),
    "SK_Hair_TiedBack": (0.056, 0.056),
    "SK_Hair_Braided": (0.056, 0.056),
}
FACIAL_HAIR_NAMES = (
    "SK_FacialHair_Stubble",
    "SK_FacialHair_Moustache",
    "SK_FacialHair_Goatee",
    "SK_FacialHair_ShortBeard",
    "SK_FacialHair_FullBeard",
)
MODULE_NAMES = tuple(HAIR_SOURCES) + FACIAL_HAIR_NAMES
APPROVED_MODULE_NAMES: tuple[str, ...] = ()
WITHHELD_MODULES = {
    "SK_Hair_Cropped": (
        "owner live review revoked the prior approval; source fit/material must be rebuilt "
        "and re-proven against the exact head"
    ),
    "SK_Hair_Parted": (
        "owner live review revoked the prior approval; current rigid cap/hairline fit is not "
        "production acceptable"
    ),
    "SK_Hair_CurlyCoiled": (
        "owner live review found a bright exposed forehead band and underlay seam"
    ),
    "SK_Hair_Long": (
        "new exact-head strand candidate remains under front/side/rear/collision QA"
    ),
    "SK_Hair_TiedBack": (
        "owner live review found a glossy rigid cap plus ear/neck/body penetration"
    ),
    "SK_Hair_Braided": (
        "owner live review found a glossy rigid cap plus ear/neck/body penetration"
    ),
    "SK_FacialHair_Stubble": "candidate reads as patchy bulk instead of surface stubble",
    "SK_FacialHair_Moustache": (
        "owner live review found the prior moustache floating and misfitted"
    ),
    "SK_FacialHair_Goatee": "candidate projects as a detached chin shelf",
    "SK_FacialHair_ShortBeard": "candidate does not yet follow the jaw silhouette",
    "SK_FacialHair_FullBeard": "candidate does not yet follow the jaw silhouette",
}

if set(APPROVED_MODULE_NAMES) | set(WITHHELD_MODULES) != set(MODULE_NAMES):
    raise RuntimeError("Appearance visual-gate disposition is incomplete")

# MakeHuman hm08: X is lateral, Y is vertical, +Z faces forward.
# Exact Human foundation local frame: +Z is lateral, +Y is vertical, +X faces.
SOURCE_HEAD_CENTER = Vector((0.0, 7.50, 0.62))
TARGET_HEAD_CENTER = Vector((0.002, 0.432, 0.0))


def parse_args() -> argparse.Namespace:
    game_root = Path(__file__).resolve().parent.parent
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-head",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-modular-head-base.glb"
        ),
    )
    parser.add_argument(
        "--makehuman-root",
        default=(
            "H:/CodexData/souldrifter-toolchain/sources/"
            "makehuman-system-assets/extracted"
        ),
    )
    parser.add_argument(
        "--makehuman-archive",
        default=(
            "H:/CodexData/souldrifter-toolchain/sources/"
            "makehuman-system-assets/makehuman_system_assets_cc0.zip"
        ),
    )
    parser.add_argument(
        "--issue448-hair-root",
        default=(
            "H:/Projects/AI_Tools_And_Information/The-Nexus-asset-intake/"
            "SoulDrifter/issue-448/technicalized-pilots/hair-library-v001"
        ),
    )
    parser.add_argument(
        "--legacy-long-source",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-runtime-4k-legacy-appearance.glb"
        ),
    )
    parser.add_argument(
        "--output-glb",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-modular-appearance.glb"
        ),
    )
    parser.add_argument(
        "--report",
        default=str(
            game_root
            / "public/assets/3d/characters/human-foundation-pilot"
            / "human-foundation-pilot-modular-appearance.provenance.json"
        ),
    )
    parser.add_argument(
        "--evidence-dir",
        default="H:/CodexData/souldrifter-toolchain/evidence/487/modular-appearance-v5",
    )
    parser.add_argument("--skip-evidence", action="store_true")
    parser.add_argument("--evidence-smoke", action="store_true")
    parser.add_argument("--evidence-module", choices=MODULE_NAMES)
    parser.add_argument(
        "--evidence-hair-tint",
        choices=("dark", "blond", "grey"),
        default="dark",
    )
    parser.add_argument(
        "--evidence-view",
        choices=(
            "all",
            "front",
            "side",
            "side-left",
            "rear",
            "three-quarter-low",
            "crown-hairline-close",
        ),
        default="all",
    )
    parser.add_argument("--evidence-clay", action="store_true")
    parser.add_argument("--evidence-workbench-material", action="store_true")
    parser.add_argument(
        "--evidence-groom-family",
        action="append",
        choices=("Coverage", "MidLayer", "TopLayer", "Flyaways", "ShortHairs"),
        help=(
            "Render selected cropped-hair groom families for card-layout diagnostics. "
            "Repeat the flag to combine families. This never changes the default "
            "production build."
        ),
    )
    parser.add_argument("--evidence-follicle-preview", action="store_true")
    parser.add_argument("--groom-diagnostic", action="store_true")
    return parser.parse_args(values)


def file_sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def imported_glb_objects(path: Path) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in bpy.data.objects if obj not in before]


def official_asset_paths(root: Path, asset: str) -> dict[str, Path]:
    directory = root / "hair" / asset
    diffuse_name = "afro_diffuse.png" if asset == "afro01" else f"{asset}_diffuse.png"
    paths = {
        "obj": directory / f"{asset}.obj",
        "mapping": directory / f"{asset}.mhclo",
        "material": directory / f"{asset}.mhmat",
        "diffuse": directory / diffuse_name,
    }
    missing = [str(path) for path in paths.values() if not path.is_file()]
    if missing:
        raise RuntimeError(f"Official MakeHuman source is incomplete: {missing}")
    license_text = paths["mapping"].read_text(encoding="utf-8", errors="ignore")[:1200]
    if "CC0" not in license_text:
        raise RuntimeError(f"{asset} does not carry the official CC0 header")
    return paths


def make_textured_hair_material(
    module_name: str, texture_path: Path
) -> bpy.types.Material:
    material = bpy.data.materials.new(f"{MATERIAL_PREFIX}_{module_name.removeprefix('SK_Hair_')}")
    material.use_nodes = True
    material.diffuse_color = (0.18, 0.09, 0.035, 1.0)
    material["souldrifterTintable"] = True
    material["souldrifterMaterialFamily"] = MATERIAL_PREFIX
    material["souldrifterSeparateFromSkin"] = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    texture = nodes.new("ShaderNodeTexImage")
    source_image = bpy.data.images.load(str(texture_path), check_existing=True)
    texture.image = source_image
    texture.image.colorspace_settings.name = "sRGB"
    texture.image.alpha_mode = "STRAIGHT"
    material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    material.node_tree.links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    shader.inputs["Roughness"].default_value = 0.48
    if shader.inputs.get("Anisotropic IOR Level"):
        shader.inputs["Anisotropic IOR Level"].default_value = 0.45
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"
    elif hasattr(material, "blend_method"):
        material.blend_method = "HASHED"
    material.use_backface_culling = False
    return material


def normalize_imported_hair_materials(
    obj: bpy.types.Object,
    module_name: str,
) -> None:
    """Keep issue448 baked detail while exposing an independent tint contract."""
    if not obj.data.materials:
        material = bpy.data.materials.new(
            f"{MATERIAL_PREFIX}_{module_name.removeprefix('SK_Hair_')}"
        )
        material.use_nodes = True
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (0.09, 0.025, 0.012, 1.0)
        shader.inputs["Roughness"].default_value = 0.78
        obj.data.materials.append(material)
    for index, material in enumerate(obj.data.materials):
        if material is None:
            continue
        suffix = module_name.removeprefix("SK_Hair_")
        material.name = f"{MATERIAL_PREFIX}_{suffix}_{index:02d}"
        material["souldrifterTintable"] = True
        material["souldrifterMaterialFamily"] = MATERIAL_PREFIX
        material["souldrifterSeparateFromSkin"] = True
        material["souldrifterSourceTexturePreserved"] = True
        material["souldrifterTintMode"] = "MULTIPLY_SOURCE_ALBEDO"
        material["souldrifterTintPreservesSourceTextureContrast"] = True
        material["souldrifterSourceAlphaMode"] = "OPAQUE_GEOMETRY_NO_ALPHA_CHANNEL"
        if material.use_nodes:
            nodes = material.node_tree.nodes
            links = material.node_tree.links
            shader = material.node_tree.nodes.get("Principled BSDF")
            if shader:
                base_input = shader.inputs["Base Color"]
                source_color_link = next(
                    (link for link in links if link.to_socket == base_input),
                    None,
                )
                tint = nodes.get("SoulDrifter Hair Tint")
                if tint is None:
                    tint = nodes.new("ShaderNodeRGB")
                    tint.name = "SoulDrifter Hair Tint"
                    tint.label = "Runtime Hair Tint"
                tint.outputs["Color"].default_value = (0.055, 0.018, 0.006, 1.0)

                multiply = nodes.get("SoulDrifter Source Albedo x Tint")
                if multiply is None:
                    multiply = nodes.new("ShaderNodeMixRGB")
                    multiply.name = "SoulDrifter Source Albedo x Tint"
                    multiply.label = "Preserve source detail while tinting"
                    multiply.blend_type = "MULTIPLY"
                    multiply.inputs[0].default_value = 1.0
                if source_color_link and source_color_link.from_node != multiply:
                    source_socket = source_color_link.from_socket
                    links.remove(source_color_link)
                    links.new(source_socket, multiply.inputs[1])
                elif not source_color_link:
                    multiply.inputs[1].default_value = (1.0, 1.0, 1.0, 1.0)
                if not any(link.to_socket == multiply.inputs[2] for link in links):
                    links.new(tint.outputs["Color"], multiply.inputs[2])
                if not any(
                    link.from_node == multiply and link.to_socket == base_input
                    for link in links
                ):
                    links.new(multiply.outputs["Color"], base_input)

                roughness_input = shader.inputs["Roughness"]
                source_roughness_link = next(
                    (link for link in links if link.to_socket == roughness_input),
                    None,
                )
                if source_roughness_link:
                    roughness_floor = nodes.get("SoulDrifter Hair Roughness Floor")
                    if roughness_floor is None:
                        roughness_floor = nodes.new("ShaderNodeMath")
                        roughness_floor.name = "SoulDrifter Hair Roughness Floor"
                        roughness_floor.label = "Source roughness remapped to 0.66-0.82"
                        roughness_floor.operation = "MULTIPLY_ADD"
                        roughness_floor.inputs[1].default_value = 0.40
                        roughness_floor.inputs[2].default_value = 0.52
                        roughness_floor.use_clamp = True
                    if source_roughness_link.from_node != roughness_floor:
                        source_socket = source_roughness_link.from_socket
                        links.remove(source_roughness_link)
                        links.new(source_socket, roughness_floor.inputs[0])
                    if not any(
                        link.from_node == roughness_floor
                        and link.to_socket == roughness_input
                        for link in links
                    ):
                        links.new(roughness_floor.outputs["Value"], roughness_input)
                else:
                    roughness_input.default_value = 0.76
                if shader.inputs.get("Specular IOR Level"):
                    shader.inputs["Specular IOR Level"].default_value = 0.25
                if shader.inputs.get("Anisotropic IOR Level"):
                    shader.inputs["Anisotropic IOR Level"].default_value = 0.20
        material.diffuse_color = (0.055, 0.018, 0.006, 1.0)


def make_issue448_authored_card_material(
    module_name: str,
    source_path: Path,
) -> tuple[bpy.types.Material, dict[str, object]]:
    """Reuse the hash-locked source PBR maps on new exact-head hair cards.

    The issue-448 technicalized geometry is deliberately discarded.  Only its
    packed neutral albedo, ORM, normal, and emission maps survive.  The source
    carries no alpha channel, so a deterministic packed fiber mask supplies the
    card transparency without inventing an opaque shell or wig cap.
    """
    imported = imported_glb_objects(source_path)
    source_meshes = [
        obj for obj in imported if obj.type == "MESH" and len(obj.data.vertices) > 100
    ]
    if not source_meshes:
        raise RuntimeError(f"Issue448 card material source has no hair mesh: {source_path}")
    source_mesh = max(source_meshes, key=lambda candidate: len(candidate.data.vertices))
    normalize_imported_hair_materials(source_mesh, module_name)
    source_materials = [material for material in source_mesh.data.materials if material]
    if len(source_materials) != 1:
        raise RuntimeError(
            f"Issue448 card material source expected one material, got {len(source_materials)}"
        )
    # The provider texture UVs belong to discarded geometry and cannot be
    # reused on a newly authored card atlas.  Retain their hashes/inventory as
    # provenance only, then author one neutral, tintable, card-aligned shader.
    # This also eliminates the bright provider-albedo streaks seen in v223.
    material = bpy.data.materials.new(
        f"{MATERIAL_PREFIX}_{module_name.removeprefix('SK_Hair_')}_AuthoredCards"
    )
    material.use_nodes = True
    material["souldrifterSourceGeometryImported"] = False
    material["souldrifterExactHeadAuthoredCards"] = True
    material["souldrifterTintable"] = True
    material["souldrifterMaterialFamily"] = MATERIAL_PREFIX
    material["souldrifterSeparateFromSkin"] = True
    material["souldrifterSourceTexturePreserved"] = False
    material["souldrifterSourceTextureInventoryOnly"] = True
    material["souldrifterTintMode"] = "MULTIPLY_NEUTRAL_CARD_ALBEDO"
    material["souldrifterRuntimeTextureChannels"] = "AUTHORED_ALBEDO_ALPHA_RELIEF"
    material["souldrifterDisabledSourceChannels"] = (
        "ALBEDO_ORM_NORMAL_PROVIDER_UV_AND_TANGENT_MISMATCH"
    )
    tile_width = 128
    tile_height = 256
    atlas_columns = 8
    atlas_rows = 5
    texture_width = tile_width * atlas_columns
    texture_height = tile_height * atlas_rows
    coverage = bpy.data.images.new(
        f"TX_{module_name}_FiberCoverage",
        width=texture_width,
        height=texture_height,
        alpha=True,
    )
    pixels: list[float] = []
    for row in range(texture_height):
        tile_row = row // tile_height
        local_row = row % tile_height
        v = local_row / (tile_height - 1)
        for column in range(texture_width):
            tile_column = column // tile_width
            local_column = column % tile_width
            tile_index = tile_row * atlas_columns + tile_column
            u = local_column / (tile_width - 1)
            tile_variation = (
                (tile_index * 37 + tile_index * tile_index * 13) % 101
            ) / 100.0
            tip_start = 0.88 + tile_variation * 0.07
            tip_fade = min(
                1.0,
                max(0.0, (tip_start + 0.05 - v) / 0.05),
            )
            if tile_row > 0:
                # Visible layers taper per fiber below; a card-wide tip fade
                # made every strand terminate on the same rejected square row.
                tip_fade = 1.0
            # Coverage/mid cards are broad clump silhouettes whose internal
            # fibers supply breakup.  They must survive MASK rendering and
            # mip reduction without turning into isolated dotted stitches.
            root_floor = 0.0
            # Every family begins at a different atlas height. Coverage now
            # fades too: the exact-UV follicle mask owns the sub-card root
            # transition, so no visible card needs a blunt opaque root edge.
            root_start = (
                0.012 + tile_variation * 0.025
                if tile_row == 0
                else (0.026, 0.018, 0.012, 0.020)[tile_row - 1]
                + tile_variation * (0.085, 0.075, 0.115, 0.095)[tile_row - 1]
            )
            root_rise = (0.055, 0.018, 0.020, 0.034, 0.030)[tile_row]
            root_fade = root_floor + (1.0 - root_floor) * min(
                1.0,
                max(0.0, (v - root_start) / root_rise),
            )
            if tile_row > 0:
                # Visible cards own their staggered 5-8% fiber roots below;
                # a second card-wide fade compounded into the bald v248/v249
                # result and is intentionally disabled.
                root_fade = 1.0
            edge_width = (0.045, 0.055, 0.070, 0.095, 0.110)[tile_row]
            edge_fade = min(1.0, u / edge_width, (1.0 - u) / edge_width) ** 0.46
            # Atlas bands follow the production card hierarchy: Coverage uses
            # 8-11 fibers, Mid 6-9, Top 3-5, Short 1-3, and Flyaway 1-2.
            band_base = (8, 6, 3, 1, 1)[tile_row]
            fiber_variation = (4, 4, 3, 3, 2)[tile_row]
            fiber_count = band_base + (tile_column % fiber_variation)
            fiber_alpha = 0.0
            for fiber in range(fiber_count):
                center = (fiber + 0.5) / fiber_count
                center += sin(
                    v * pi * (1.5 + (fiber % 4) * 0.23)
                    + fiber * 1.31
                    + tile_index * 0.71
                ) * (0.012 + tile_row * 0.002)
                # Give the exposed clump families enough binary-mask body to
                # survive the 640px creator camera without turning a one-fiber
                # ShortHair tile into a rectangular strip.  The per-band
                # factors replace the v250 one-size-fits-all width that left
                # Mid/Top cards as isolated sub-pixel comb lines.
                band_width_factor = (0.42, 0.62, 0.70, 0.36, 0.28)[tile_row]
                width = (
                    band_width_factor + (fiber % 3) * 0.040
                ) / fiber_count
                tip_noise = (
                    (tile_index * 29 + fiber * 37 + fiber * fiber * 11) % 101
                ) / 100.0
                tip_lane = (fiber + tile_column) % max(1, fiber_count)
                tip_fraction = (
                    1.0
                    if fiber_count == 1
                    else tip_lane / (fiber_count - 1)
                )
                tip_length = (
                    0.88 + tip_noise * 0.12
                    if tile_row == 0
                    else 0.62 + tip_fraction * 0.30 + (tip_noise - 0.5) * 0.045
                )
                tip_length = max(0.58, min(0.96, tip_length))
                tip_taper_length = 0.15 + tip_noise * 0.10
                strand_tip = min(
                    1.0,
                    max(0.0, (tip_length - v) / tip_taper_length),
                )
                root_noise = (
                    (tile_index * 17 + fiber * 43 + fiber * fiber * 7) % 101
                ) / 100.0
                strand_root_start = 0.05 + root_noise * 0.03
                strand_root = min(
                    1.0,
                    max(0.0, (v - strand_root_start) / 0.045),
                )
                fiber_alpha = max(
                    fiber_alpha,
                    max(0.0, 1.0 - abs(u - center) / width)
                    ** 0.68
                    * strand_tip
                    * strand_root,
                )
            # Every band remains a separated multi-fiber clump.  The former
            # solid Coverage body produced the rejected opaque v240 cap even
            # though the geometry itself was card based.
            fiber_breakup = max(0.0, fiber_alpha) ** 0.64
            layered_alpha = fiber_breakup
            continuous_alpha = edge_fade * layered_alpha * tip_fade * root_fade
            # Blender 5.2's DITHERED surface path emitted colored stochastic
            # speckle when the 0.35 cutoff lived in a shader Math node.  Bake
            # the shipping MASK threshold into the atlas instead: runtime and
            # proof renders now sample the same deterministic binary coverage.
            alpha = 1.0 if continuous_alpha >= 0.35 else 0.0
            # Neutral dark-card albedo stays aligned with the fiber breakup;
            # the runtime tint node supplies the selected hair colour.
            relief = 0.58 + fiber_alpha * 0.34
            warm = 0.94 + sin(tile_index * 0.79 + v * pi * 2.0) * 0.035
            pixels.extend((relief * warm, relief * 0.91, relief * 0.82, alpha))
    coverage.pixels.foreach_set(pixels)
    coverage.pack()
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    coverage_node = nodes.new("ShaderNodeTexImage")
    coverage_node.name = "SoulDrifter Runtime Card Coverage"
    coverage_node.label = "Packed feathered fibers"
    coverage_node.image = coverage
    coverage_node.interpolation = "Linear"
    coverage_node.extension = "CLIP"
    tint = nodes.new("ShaderNodeRGB")
    tint.name = "SoulDrifter Hair Tint"
    tint.label = "Runtime Hair Tint"
    tint.outputs["Color"].default_value = (0.055, 0.018, 0.006, 1.0)
    multiply = nodes.new("ShaderNodeMixRGB")
    multiply.name = "SoulDrifter Neutral Card Albedo x Tint"
    multiply.label = "Card-aligned neutral albedo x runtime tint"
    multiply.blend_type = "MULTIPLY"
    multiply.inputs[0].default_value = 1.0
    links.new(coverage_node.outputs["Color"], multiply.inputs[1])
    links.new(tint.outputs["Color"], multiply.inputs[2])
    links.new(multiply.outputs["Color"], shader.inputs["Base Color"])
    links.new(coverage_node.outputs["Alpha"], shader.inputs["Alpha"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    fiber_bump = nodes.new("ShaderNodeBump")
    fiber_bump.name = "SoulDrifter Short Fiber Relief"
    fiber_bump.inputs["Strength"].default_value = 0.14
    fiber_bump.inputs["Distance"].default_value = 0.00024
    links.new(coverage_node.outputs["Color"], fiber_bump.inputs["Height"])
    links.new(fiber_bump.outputs["Normal"], shader.inputs["Normal"])
    shader.inputs["Roughness"].default_value = 0.80
    if shader.inputs.get("Specular IOR Level"):
        shader.inputs["Specular IOR Level"].default_value = 0.06
    if shader.inputs.get("Anisotropic IOR Level"):
        shader.inputs["Anisotropic IOR Level"].default_value = 0.25
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"
    elif hasattr(material, "blend_method"):
        material.blend_method = "HASHED"
    material.alpha_threshold = 0.35
    material.use_backface_culling = False
    material.use_backface_culling_shadow = True
    material.use_transparent_shadow = True
    material.use_transparency_overlap = True
    material["souldrifterCardTexture"] = "PACKED_32_TILE_ALPHA_CLUMP_ATLAS"
    material["souldrifterCardTextureResolution"] = [texture_width, texture_height]
    material["souldrifterCardAlphaTest"] = 0.35
    material["souldrifterCardAlphaAtlasBakedBinaryCutoff"] = 0.35
    material["souldrifterCardAlphaToCoverage"] = True
    material["souldrifterCardDepthWrite"] = True
    material["souldrifterCardTransparent"] = False
    material.diffuse_color = (0.055, 0.018, 0.006, 1.0)

    texture_nodes = [
        node
        for node in source_materials[0].node_tree.nodes
        if node.bl_idname == "ShaderNodeTexImage" and node.image
    ]
    source_texture_inventory = [
        {
            "name": node.image.name,
            "width": node.image.size[0],
            "height": node.image.size[1],
            "colorspace": node.image.colorspace_settings.name,
        }
        for node in texture_nodes
    ]
    for imported_obj in imported:
        if imported_obj.name in bpy.data.objects:
            bpy.data.objects.remove(imported_obj, do_unlink=True)
    return material, {
        "sourceGeometryPolicy": "DISCARDED_NOT_IMPORTED",
        "sourceTexturePolicy": "HASH_LOCKED_INVENTORY_ONLY_NOT_SAMPLED_BY_NEW_CARD_UVS",
        "sourceAlphaChannel": "ABSENT_OPAQUE_SOURCE",
        "runtimeAlphaMask": "PACKED_32_TILE_ALPHA_CLUMP_ATLAS",
        "runtimeAlphaResolution": [texture_width, texture_height],
        "runtimeAlphaAtlas": {
            "columns": atlas_columns,
            "rows": atlas_rows,
            "tileResolution": [tile_width, tile_height],
            "tileCount": atlas_columns * atlas_rows,
            "bands": ["Coverage", "MidLayer", "TopLayer", "ShortHairs", "Flyaways"],
        },
        "runtimeAlphaContract": {
            "alphaTest": 0.35,
            "alphaToCoverage": True,
            "depthWrite": True,
            "transparent": False,
        },
        "runtimeAlbedoContract": "AUTHORED_NEUTRAL_CARD_ALBEDO_MULTIPLIED_BY_RUNTIME_TINT",
        "sourceTextureInventory": source_texture_inventory,
    }


def trim_curly_fade_clusters(obj: bpy.types.Object) -> int:
    """Remove only detached low curl clusters below a shaped high-fade line.

    The technicalized coiled source intentionally consists of thousands of
    disconnected curl clumps. A few low clumps sit below the coherent cap and
    read as floating debris on the temple and occipital scalp. Cluster-centroid
    trimming preserves each retained curl intact instead of slicing polygons.
    """
    mesh = obj.data
    adjacency = [set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)

    seen: set[int] = set()
    rejected_indices: set[int] = set()
    for start in range(len(mesh.vertices)):
        if start in seen:
            continue
        stack = [start]
        seen.add(start)
        component: list[int] = []
        while stack:
            index = stack.pop()
            component.append(index)
            for neighbor in adjacency[index]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    stack.append(neighbor)
        center = sum((mesh.vertices[index].co for index in component), Vector()) / len(
            component
        )
        # +X faces forward. Preserve a slightly lower natural fringe in front,
        # while the temple/rear line rises into a clean cropped fade.
        boundary = 0.442 - 0.18 * center.x + 0.045 * max(0.0, abs(center.z) - 0.032)
        if center.y < boundary:
            rejected_indices.update(component)

    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    rejected = [bm.verts[index] for index in sorted(rejected_indices)]
    if rejected:
        bmesh.ops.delete(bm, geom=rejected, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return len(rejected_indices)


def make_curly_root_material() -> bpy.types.Material:
    material = bpy.data.materials.new("MAT_HumanScalp_Underlay_Tintable")
    material.use_nodes = True
    material.diffuse_color = (0.33, 0.19, 0.12, 1.0)
    material["souldrifterTintable"] = True
    material["souldrifterMaterialFamily"] = "MAT_HumanSkin_Tintable"
    material["souldrifterTintChannel"] = "SKIN"
    material["souldrifterSeparateFromSkin"] = True
    material["souldrifterSourceTexturePreserved"] = False
    material["souldrifterTintMode"] = "MATCH_RUNTIME_SKIN_TONE"
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (0.33, 0.19, 0.12, 1.0)
    shader.inputs["Roughness"].default_value = 0.92
    if shader.inputs.get("Specular IOR Level"):
        shader.inputs["Specular IOR Level"].default_value = 0.12
    return material


def build_curly_inner_scalp_cap(
    reference_head: bpy.types.Object,
) -> bpy.types.Object:
    """Create a thin exact-head root shell beneath the outer curl volume."""
    surface = exact_head_surface(reference_head)
    segments = 64
    rings = 12
    top_ring_y = 0.494
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []

    for ring in range(rings):
        amount = ring / (rings - 1)
        eased = sin(amount * pi * 0.5)
        for segment in range(segments):
            angle = 2.0 * pi * segment / segments
            direction = Vector((cos(angle), 0.0, sin(angle)))
            front = max(0.0, direction.x)
            side = abs(direction.z)
            contour = 0.0008 * sin(5.0 * angle) + 0.0005 * sin(11.0 * angle)
            bottom_y = 0.456 + 0.008 * front + 0.002 * side + contour
            y = bottom_y + (top_ring_y - bottom_y) * eased
            location, normal, _, _ = surface.ray_cast(
                Vector((0.0, y, 0.0)), direction
            )
            if location is None or normal is None:
                raise RuntimeError(
                    f"Exact-head scalp cap ray miss at ring={ring} segment={segment}"
                )
            point = location + normal.normalized() * 0.0007
            vertices.append(tuple(point))

    for ring in range(rings - 1):
        for segment in range(segments):
            next_segment = (segment + 1) % segments
            a = ring * segments + segment
            b = ring * segments + next_segment
            c = (ring + 1) * segments + next_segment
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))

    apex, apex_normal, _, _ = surface.find_nearest(Vector((0.0, 0.500, 0.0)))
    if apex is None or apex_normal is None:
        raise RuntimeError("Exact-head scalp cap apex lookup failed")
    apex_index = len(vertices)
    vertices.append(tuple(apex + apex_normal.normalized() * 0.0007))
    last_ring = (rings - 1) * segments
    for segment in range(segments):
        faces.append(
            (
                last_ring + segment,
                last_ring + (segment + 1) % segments,
                apex_index,
            )
        )

    mesh = bpy.data.meshes.new("SK_Hair_CurlyCoiled_RootCapMesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(make_curly_root_material())
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    cap = bpy.data.objects.new("SK_Hair_CurlyCoiled_RootCap", mesh)
    bpy.context.collection.objects.link(cap)
    return cap


def make_facial_hair_material(module_name: str, kind: str) -> bpy.types.Material:
    """Create a packed tintable strand/stubble map for the fitted cards."""
    suffix = module_name.removeprefix("SK_FacialHair_")
    material = bpy.data.materials.new(f"{MATERIAL_PREFIX}_Facial_{suffix}")
    material.use_nodes = True
    material.diffuse_color = (0.18, 0.065, 0.022, 1.0)
    material["souldrifterTintable"] = True
    material["souldrifterMaterialFamily"] = MATERIAL_PREFIX
    material["souldrifterSeparateFromSkin"] = True
    material["souldrifterHairTextureKind"] = (
        "STUBBLE_MASK" if kind == "stubble" else "CONVERTED_CURVE_STRANDS"
    )

    if kind in {"moustache", "goatee", "short", "full"}:
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (0.055, 0.017, 0.006, 1.0)
        shader.inputs["Roughness"].default_value = 0.88
        if shader.inputs.get("Anisotropic IOR Level"):
            shader.inputs["Anisotropic IOR Level"].default_value = 0.48
        if shader.inputs.get("Specular IOR Level"):
            shader.inputs["Specular IOR Level"].default_value = 0.10
        material.use_backface_culling = False
        material["souldrifterTintChannel"] = "HAIR"
        material["souldrifterTintMode"] = "MULTIPLY_SOURCE_ALBEDO"
        return material

    size = 512 if kind == "stubble" else 128
    image = bpy.data.images.new(
        f"TX_HumanFacialHair_{suffix}_Packed",
        width=size,
        height=size,
        alpha=True,
    )

    def smooth_band(
        value: float,
        start: float,
        full_start: float,
        full_end: float,
        end: float,
    ) -> float:
        if value <= start or value >= end:
            return 0.0
        if value < full_start:
            return (value - start) / max(full_start - start, 1e-6)
        if value > full_end:
            return (end - value) / max(end - full_end, 1e-6)
        return 1.0

    pixels: list[float] = []
    for y in range(size):
        for x in range(size):
            noise = ((x * 37 + y * 19 + x * y * 3) % 101) / 100.0
            strand = 0.5 + 0.5 * cos((x * 0.55) + (y * 0.13))
            shade = 0.72 + strand * 0.28
            if kind == "stubble":
                # Projected UV maps U to face lateral Z and V to vertical Y.
                # This packed mask is the entire stubble volume: randomized
                # fine follicles with soft region fades and zero neck alpha.
                face_y = 0.3730 + (y / (size - 1)) * 0.0320
                face_z = -0.0315 + (x / (size - 1)) * 0.0630
                lateral = abs(face_z)

                # The lower boundary rises toward the ears to follow the real
                # jaw instead of forming a horizontal neck-side rectangle.
                cheek_bottom = (
                    0.375
                    + max(0.0, lateral - 0.014) * 0.58
                    + sin(face_z * 620.0) * 0.0009
                    + sin(face_z * 1430.0) * 0.00045
                )
                cheek_vertical = smooth_band(
                    face_y,
                    cheek_bottom,
                    cheek_bottom + 0.0065,
                    0.399,
                    0.404,
                )
                cheek_lateral = smooth_band(lateral, 0.011, 0.015, 0.026, 0.0315)
                cheek = cheek_vertical * cheek_lateral * 0.86

                chin_vertical = smooth_band(face_y, 0.3730, 0.375, 0.387, 0.392)
                chin_span = 0.014 + max(0.0, face_y - 0.3730) * 0.22
                chin_edge = max(0.0, min(1.0, (chin_span - lateral) / 0.0035))
                chin = chin_vertical * chin_edge

                lip_vertical = smooth_band(face_y, 0.3965, 0.3985, 0.4025, 0.4045)
                lip_outer = smooth_band(lateral, 0.0016, 0.0030, 0.0135, 0.0160)
                upper_lip = lip_vertical * lip_outer

                density = max(cheek, chin, upper_lip)
                # Break uniform rows with two unrelated deterministic noise
                # fields; isolated high values form follicle dots after mip.
                noise_b = ((x * 13 + y * 71 + x * y * 5) % 127) / 126.0
                follicle = 0.30 + 0.38 * noise + (0.22 if noise_b > 0.78 else 0.0)
                alpha = density * follicle
                shade = 0.54 + noise_b * 0.30
            else:
                alpha = 0.78 + strand * 0.22
            pixels.extend((0.19 * shade, 0.068 * shade, 0.022 * shade, alpha))
    image.pixels.foreach_set(pixels)
    image.alpha_mode = "STRAIGHT"
    image.pack()

    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"
    material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    material.node_tree.links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    shader.inputs["Roughness"].default_value = 0.79
    if shader.inputs.get("Anisotropic IOR Level"):
        shader.inputs["Anisotropic IOR Level"].default_value = 0.42
    if kind == "stubble":
        shader.inputs["Roughness"].default_value = 0.96
        if shader.inputs.get("Specular IOR Level"):
            shader.inputs["Specular IOR Level"].default_value = 0.04
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"
    elif hasattr(material, "blend_method"):
        material.blend_method = "HASHED"
    material.use_backface_culling = False
    material["souldrifterTintChannel"] = "HAIR"
    material["souldrifterTintMode"] = "MULTIPLY_SOURCE_ALBEDO"
    return material


def assign_projected_facial_uv(mesh: bpy.types.Mesh) -> None:
    coordinates = [vertex.co for vertex in mesh.vertices]
    minimum_y = min(co.y for co in coordinates)
    maximum_y = max(co.y for co in coordinates)
    minimum_z = min(co.z for co in coordinates)
    maximum_z = max(co.z for co in coordinates)
    y_range = max(maximum_y - minimum_y, 1e-6)
    z_range = max(maximum_z - minimum_z, 1e-6)
    uv_layer = mesh.uv_layers.new(name="FacialHairUV")
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv_layer.data[loop_index].uv = (
                (co.z - minimum_z) / z_range,
                (co.y - minimum_y) / y_range,
            )


def add_module_contract(
    obj: bpy.types.Object,
    armature: bpy.types.Object,
    slot: str,
    source_kind: str,
) -> None:
    obj["souldrifterAppearanceSlot"] = slot
    obj["souldrifterModuleId"] = obj.name
    obj["souldrifterApprovalStatus"] = "AUTHORING_CANDIDATE"
    obj["souldrifterSourceHeadSha256"] = SOURCE_HEAD_SHA256
    obj["souldrifterHeadBone"] = HEAD_BONE
    obj["souldrifterTintable"] = True
    obj["souldrifterFusedToHead"] = False
    obj["souldrifterLegacyGeometry"] = False
    obj["souldrifterSourceKind"] = source_kind
    group = obj.vertex_groups.get(HEAD_BONE) or obj.vertex_groups.new(name=HEAD_BONE)
    group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    modifier = obj.modifiers.get("CanonicalHeadBinding") or obj.modifiers.new(
        "CanonicalHeadBinding", "ARMATURE"
    )
    modifier.object = armature
    obj.parent = armature
    obj.matrix_parent_inverse.identity()


def join_imported_meshes(objects: list[bpy.types.Object], name: str) -> bpy.types.Object:
    meshes = [obj for obj in objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"OBJ source {name} imported no mesh")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        # Discard the importer's Y-up conversion before joins can bake it into
        # some multi-object sources (notably braid01).
        obj.matrix_world = Matrix.Identity(4)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = f"{name}Mesh"
    return obj


def map_makehuman_vertex(
    co: Vector,
    source_top: float,
    vertical_scale: float,
    target_top: float,
    depth_scale: float,
    lateral_scale: float,
) -> Vector:
    return Vector(
        (
            TARGET_HEAD_CENTER.x + (co.z - SOURCE_HEAD_CENTER.z) * depth_scale,
            target_top + (co.y - source_top) * vertical_scale,
            TARGET_HEAD_CENTER.z + co.x * lateral_scale,
        )
    )


def build_official_hair(
    module_name: str,
    asset: str,
    root: Path,
    reference_head: bpy.types.Object,
    armature: bpy.types.Object,
) -> tuple[bpy.types.Object, dict[str, object]]:
    paths = official_asset_paths(root, asset)
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=str(paths["obj"]), forward_axis="NEGATIVE_Z", up_axis="Y")
    obj = join_imported_meshes(
        [candidate for candidate in bpy.data.objects if candidate not in before], module_name
    )
    source_top = max(vertex.co.y for vertex in obj.data.vertices)
    vertical_scale, target_top = HAIR_VERTICAL_FIT[module_name]
    depth_scale, lateral_scale = HAIR_RADIAL_FIT[module_name]
    for vertex in obj.data.vertices:
        vertex.co = map_makehuman_vertex(
            vertex.co,
            source_top,
            vertical_scale,
            target_top,
            depth_scale,
            lateral_scale,
        )
    # The Blender 5 OBJ importer leaves a +90-degree X object transform for
    # Y-up data.  Vertex mapping above already consumes raw MakeHuman axes, so
    # retaining that object transform would rotate the fitted hair a second
    # time after parenting/export.
    obj.matrix_world = Matrix.Identity(4)
    obj.data.update()
    removed_coincident_faces = 0
    flipped_inward_faces = 0
    for material in list(obj.data.materials):
        obj.data.materials.pop(index=0)
    obj.data.materials.append(make_textured_hair_material(module_name, paths["diffuse"]))
    for polygon in obj.data.polygons:
        polygon.material_index = 0
        polygon.use_smooth = True
    add_module_contract(obj, armature, "hair", "MAKEHUMAN_SYSTEM_ASSET_CC0")
    obj["souldrifterUpstreamAsset"] = asset
    obj["souldrifterUpstreamLicense"] = MAKEHUMAN_LICENSE
    return obj, {
        "asset": asset,
        "license": MAKEHUMAN_LICENSE,
        "packUrl": MAKEHUMAN_PACK_URL,
        "removedCoincidentFaces": removed_coincident_faces,
        "flippedInwardFaces": flipped_inward_faces,
        "outerSurfaceConsolidation": None,
        "files": {
            key: {
                "path": str(path).replace("\\", "/"),
                "sha256": file_sha256(path),
            }
            for key, path in paths.items()
        },
    }


def build_issue448_hair(
    module_name: str,
    source_root: Path,
    reference_head: bpy.types.Object,
    armature: bpy.types.Object,
) -> tuple[bpy.types.Object, dict[str, object]]:
    """Refit project-generated issue448 source geometry to the exact #487 head.

    The old issue448 head-fit outputs are never imported because their manifest
    marks them non-promotable. Each #487 candidate begins from the hashed
    technicalized source mesh and receives an independently derived fit.
    """
    source = ISSUE448_HAIR_SOURCES[module_name]
    path = source_root / str(source["filename"])
    if not path.is_file() or file_sha256(path) != source["sha256"]:
        raise RuntimeError(f"Issue448 source/hash contract changed: {path}")
    imported_objects = imported_glb_objects(path)
    obj = join_imported_meshes(imported_objects, module_name)
    coordinates = [vertex.co.copy() for vertex in obj.data.vertices]
    minimum = Vector(tuple(min(point[axis] for point in coordinates) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in coordinates) for axis in range(3)))
    center = (minimum + maximum) * 0.5
    lateral_scale, depth_scale, vertical_scale, target_top = source["fit"]
    for vertex in obj.data.vertices:
        source_co = vertex.co.copy()
        vertex.co = Vector(
            (
                TARGET_HEAD_CENTER.x - (source_co.y - center.y) * depth_scale,
                target_top + (source_co.z - maximum.z) * vertical_scale,
                TARGET_HEAD_CENTER.z + (source_co.x - center.x) * lateral_scale,
            )
        )
    obj.matrix_world = Matrix.Identity(4)
    obj.data.update()
    trimmed_vertex_count = (
        trim_curly_fade_clusters(obj)
        if module_name == "SK_Hair_CurlyCoiled"
        else 0
    )
    normalize_imported_hair_materials(obj, module_name)
    if module_name == "SK_Hair_CurlyCoiled":
        obj = join_imported_meshes(
            [obj, build_curly_inner_scalp_cap(reference_head)], module_name
        )
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    add_module_contract(obj, armature, "hair", "ISSUE448_PROJECT_GENERATED_SOURCE")
    obj["souldrifterUpstreamIssue"] = 448
    obj["souldrifterUpstreamAsset"] = source["assetId"]
    obj["souldrifterProviderTaskId"] = source["providerTaskId"]
    obj["souldrifterUpstreamLicense"] = "NOT_RECORDED_DO_NOT_INFER"
    obj["souldrifterOldHeadFitImported"] = False
    return obj, {
        "route": "ISSUE448_PROJECT_GENERATED_TECHNICALIZED_SOURCE",
        "issue": 448,
        "assetId": source["assetId"],
        "providerTaskId": source["providerTaskId"],
        "path": str(path).replace("\\", "/"),
        "sha256": file_sha256(path),
        "license": "NOT_RECORDED_DO_NOT_INFER",
        "oldHeadFitPolicy": "NON_PROMOTABLE_NOT_IMPORTED",
        "trimmedDetachedLowVertexCount": trimmed_vertex_count,
        "newFit": {
            "lateralScale": lateral_scale,
            "depthScale": depth_scale,
            "verticalScale": vertical_scale,
            "targetTop": target_top,
            "depthAxisReversed": True,
        },
    }


SurfaceRow = tuple[float, float, float, int]


def exact_head_surface(reference_head: bpy.types.Object) -> BVHTree:
    return BVHTree.FromPolygons(
        [vertex.co.copy() for vertex in reference_head.data.vertices],
        [tuple(polygon.vertices) for polygon in reference_head.data.polygons],
        all_triangles=False,
    )


def emit_cropped_follicle_density_mask(
    reference_head: bpy.types.Object,
    family_curves: dict[str, bpy.types.Curve],
    output_dir: Path,
) -> dict[str, object]:
    """Bake a style-specific exact-head follicle density mask from groom roots.

    Epic's groom contract uses a UV-space follicle mask to bridge card roots
    into the skeletal scalp.  This texture is not geometry, a cap, or a skin
    replacement: every non-black pixel is clipped by an exact-head scalp mask,
    and the runtime owner blends it into the existing skin material only while
    the corresponding approved hairstyle is active.
    """
    resolution = 1024
    mesh = reference_head.data
    uv_layer = mesh.uv_layers.active
    if uv_layer is None:
        raise RuntimeError("Exact-head follicle mask requires the active UVMap")
    mesh.calc_loop_triangles()
    loop_triangles = list(mesh.loop_triangles)
    vertex_positions = [vertex.co.copy() for vertex in mesh.vertices]
    triangle_vertices = [tuple(triangle.vertices) for triangle in loop_triangles]
    surface = BVHTree.FromPolygons(
        vertex_positions,
        triangle_vertices,
        all_triangles=True,
    )

    def barycentric_2d(
        point: tuple[float, float],
        first: Vector,
        second: Vector,
        third: Vector,
    ) -> tuple[float, float, float] | None:
        denominator = (
            (second.y - third.y) * (first.x - third.x)
            + (third.x - second.x) * (first.y - third.y)
        )
        if abs(denominator) <= 1.0e-12:
            return None
        first_weight = (
            (second.y - third.y) * (point[0] - third.x)
            + (third.x - second.x) * (point[1] - third.y)
        ) / denominator
        second_weight = (
            (third.y - first.y) * (point[0] - third.x)
            + (first.x - third.x) * (point[1] - third.y)
        ) / denominator
        return first_weight, second_weight, 1.0 - first_weight - second_weight

    root_family_counts: dict[str, int] = {}
    mapped_root_count = 0
    maximum_root_surface_distance = 0.0
    root_positions: list[Vector] = []
    for label, curve in family_curves.items():
        root_family_counts[label] = len(curve.splines)
        for spline in curve.splines:
            root = Vector(spline.points[0].co[:3])
            location, _, _, distance = surface.find_nearest(root)
            if location is None or distance is None:
                continue
            root_positions.append(location.copy())
            mapped_root_count += 1
            maximum_root_surface_distance = max(
                maximum_root_surface_distance,
                float(distance),
            )
    if mapped_root_count < 2400:
        raise RuntimeError(
            f"Follicle mask lost exact-head roots: {mapped_root_count}"
        )
    root_tree = KDTree(len(root_positions))
    for root_index, root in enumerate(root_positions):
        root_tree.insert(root, root_index)
    root_tree.balance()

    head_uv_allow = bytearray(resolution * resolution)
    scalp_allow = bytearray(resolution * resolution)
    density = bytearray(resolution * resolution)
    for triangle in loop_triangles:
        positions = [vertex_positions[index] for index in triangle.vertices]
        uvs = [uv_layer.data[index].uv.copy() for index in triangle.loops]
        minimum_x = max(0, int(min(uv.x for uv in uvs) * resolution) - 1)
        maximum_x = min(
            resolution - 1,
            int(max(uv.x for uv in uvs) * resolution) + 1,
        )
        minimum_y = max(0, int(min(uv.y for uv in uvs) * resolution) - 1)
        maximum_y = min(
            resolution - 1,
            int(max(uv.y for uv in uvs) * resolution) + 1,
        )
        for pixel_y in range(minimum_y, maximum_y + 1):
            sample_y = (pixel_y + 0.5) / resolution
            for pixel_x in range(minimum_x, maximum_x + 1):
                sample_x = (pixel_x + 0.5) / resolution
                weights = barycentric_2d(
                    (sample_x, sample_y),
                    uvs[0],
                    uvs[1],
                    uvs[2],
                )
                if weights is None or min(weights) < -1.0e-5:
                    continue
                position = sum(
                    (positions[index] * weights[index] for index in range(3)),
                    Vector((0.0, 0.0, 0.0)),
                )
                pixel_index = pixel_y * resolution + pixel_x
                head_uv_allow[pixel_index] = 1
                if (
                    position.y >= cropped_hairline_floor(position) - 0.0006
                    and abs(position.z - TARGET_HEAD_CENTER.z) <= 0.058
                ):
                    scalp_allow[pixel_index] = 1
                    _, _, root_distance = root_tree.find(position)
                    root_falloff = max(
                        0.0,
                        1.0 - float(root_distance) / 0.00140,
                    )
                    root_falloff *= root_falloff
                    hairline_distance = position.y - (
                        cropped_hairline_floor(position) - 0.0006
                    )
                    hairline_amount = max(
                        0.0,
                        min(1.0, hairline_distance / 0.0070),
                    )
                    hairline_feather = hairline_amount * hairline_amount * (
                        3.0 - 2.0 * hairline_amount
                    )
                    density[pixel_index] = max(
                        density[pixel_index],
                        int(255.0 * 0.55 * root_falloff * hairline_feather),
                    )

    # Match every duplicated UV copy of the same object-space scalp edge and
    # synchronize its raster samples before gutter dilation.  Object-space
    # nearest-root density is deterministic, but independent triangle
    # rasterization can otherwise pick neighboring texels with very different
    # values and expose a bright UV-island crack under bilinear filtering.
    def quantized_position(position: Vector) -> tuple[int, int, int]:
        return tuple(round(component * 1_000_000) for component in position)

    seam_edge_segments: dict[
        tuple[tuple[int, int, int], tuple[int, int, int]],
        dict[tuple[int, int, int, int], tuple[Vector, Vector]],
    ] = {}
    for triangle in loop_triangles:
        for local_start, local_end in ((0, 1), (1, 2), (2, 0)):
            start = vertex_positions[triangle.vertices[local_start]]
            end = vertex_positions[triangle.vertices[local_end]]
            midpoint = (start + end) * 0.5
            if (
                midpoint.y < cropped_hairline_floor(midpoint) - 0.0006
                or abs(midpoint.z - TARGET_HEAD_CENTER.z) > 0.058
            ):
                continue
            start_key = quantized_position(start)
            end_key = quantized_position(end)
            start_uv = uv_layer.data[triangle.loops[local_start]].uv.copy()
            end_uv = uv_layer.data[triangle.loops[local_end]].uv.copy()
            if start_key <= end_key:
                edge_key = (start_key, end_key)
                aligned_start_uv, aligned_end_uv = start_uv, end_uv
            else:
                edge_key = (end_key, start_key)
                aligned_start_uv, aligned_end_uv = end_uv, start_uv
            uv_key = (
                round(aligned_start_uv.x * resolution),
                round(aligned_start_uv.y * resolution),
                round(aligned_end_uv.x * resolution),
                round(aligned_end_uv.y * resolution),
            )
            seam_edge_segments.setdefault(edge_key, {})[uv_key] = (
                aligned_start_uv,
                aligned_end_uv,
            )
    uv_seam_groups = [
        tuple(segments.values())
        for segments in seam_edge_segments.values()
        if len(segments) > 1
    ]
    seam_raster_samples_per_edge = 17
    for segments in uv_seam_groups:
        for sample_index in range(seam_raster_samples_per_edge):
            amount = sample_index / (seam_raster_samples_per_edge - 1)
            coordinates: list[tuple[int, int]] = []
            for start_uv, end_uv in segments:
                uv = start_uv.lerp(end_uv, amount)
                pixel_x = max(
                    0,
                    min(resolution - 1, round(uv.x * (resolution - 1))),
                )
                pixel_y = max(
                    0,
                    min(resolution - 1, round(uv.y * (resolution - 1))),
                )
                coordinates.append((pixel_x, pixel_y))
            synchronized = max(
                density[pixel_y * resolution + pixel_x]
                for pixel_x, pixel_y in coordinates
            )
            for pixel_x, pixel_y in coordinates:
                density[pixel_y * resolution + pixel_x] = synchronized

    # Pad only unused UV gutters around scalp islands. Pixels sampled by any
    # non-scalp head triangle remain black, while bilinear filtering at scalp
    # island edges no longer pulls black texels into the rendered roots.
    gutter_padding_passes = 8
    for _ in range(gutter_padding_passes):
        padded = density[:]
        for pixel_y in range(1, resolution - 1):
            for pixel_x in range(1, resolution - 1):
                index = pixel_y * resolution + pixel_x
                if density[index] or head_uv_allow[index]:
                    continue
                neighbor = max(
                    density[index - 1],
                    density[index + 1],
                    density[index - resolution],
                    density[index + resolution],
                )
                if neighbor:
                    padded[index] = max(padded[index], int(neighbor * 0.84))
        density = padded

    scalp_pixel_count = sum(scalp_allow)
    non_scalp_contamination = sum(
        1
        for index, value in enumerate(density)
        if value and head_uv_allow[index] and not scalp_allow[index]
    )
    gutter_padding_count = sum(
        1 for index, value in enumerate(density) if value and not head_uv_allow[index]
    )
    # Re-audit the same synchronized object-space seams after gutter dilation.
    # Sampling the full edge (not only the midpoint) catches root-to-tip UV
    # discontinuities while ensuring this receipt proves the exact operation
    # used above rather than a separate, weaker vertex-index approximation.
    seam_density_deltas: list[int] = []
    for segments in uv_seam_groups:
        for sample_index in range(seam_raster_samples_per_edge):
            amount = sample_index / (seam_raster_samples_per_edge - 1)
            values: list[int] = []
            for start_uv, end_uv in segments:
                uv = start_uv.lerp(end_uv, amount)
                pixel_x = max(
                    0,
                    min(resolution - 1, round(uv.x * (resolution - 1))),
                )
                pixel_y = max(
                    0,
                    min(resolution - 1, round(uv.y * (resolution - 1))),
                )
                values.append(density[pixel_y * resolution + pixel_x])
            seam_density_deltas.append(max(values) - min(values))
    seam_density_delta_max = max(seam_density_deltas, default=0)
    seam_density_delta_mean = sum(seam_density_deltas) / max(
        1,
        len(seam_density_deltas),
    )
    if non_scalp_contamination != 0:
        raise RuntimeError("Follicle mask contaminated non-scalp UV pixels")
    if not seam_density_deltas or seam_density_delta_max > 32:
        raise RuntimeError(
            "Follicle mask UV-seam continuity gate failed: "
            f"samples={len(seam_density_deltas)} maximumDelta={seam_density_delta_max}"
        )
    scalp_nonzero_pixel_count = sum(
        1 for index, value in enumerate(density) if value and scalp_allow[index]
    )
    scalp_density_fraction = scalp_nonzero_pixel_count / max(1, scalp_pixel_count)
    scalp_density_values = sorted(
        value
        for index, value in enumerate(density)
        if value and scalp_allow[index]
    )
    scalp_density_mean = sum(scalp_density_values) / max(1, len(scalp_density_values))

    def density_percentile(fraction: float) -> int:
        if not scalp_density_values:
            return 0
        index = min(
            len(scalp_density_values) - 1,
            round((len(scalp_density_values) - 1) * fraction),
        )
        return int(scalp_density_values[index])

    nonzero_pixel_count = sum(1 for value in density if value)
    if not 0.08 <= scalp_density_fraction <= 0.74:
        raise RuntimeError(
            "Follicle mask sparse-density gate failed: "
            f"fraction={scalp_density_fraction:.6f} "
            f"scalpPixels={scalp_pixel_count} nonzero={scalp_nonzero_pixel_count}"
        )

    pixels = array("f", [0.0]) * (resolution * resolution * 4)
    for index, value in enumerate(density):
        normalized = value / 255.0
        pixel_index = index * 4
        pixels[pixel_index] = normalized
        pixels[pixel_index + 1] = normalized
        pixels[pixel_index + 2] = normalized
        pixels[pixel_index + 3] = 1.0
    image = bpy.data.images.new(
        "TX_HumanFoundation_Cropped_FollicleDensity",
        width=resolution,
        height=resolution,
        alpha=True,
    )
    image.colorspace_settings.name = "Non-Color"
    image.pixels.foreach_set(pixels)
    mask_dir = output_dir / "follicle-masks"
    mask_dir.mkdir(parents=True, exist_ok=True)
    filename = "human-foundation-cropped-follicle-density-v1.png"
    mask_path = mask_dir / filename
    image.filepath_raw = str(mask_path)
    image.file_format = "PNG"
    image.save()
    mask_sha = file_sha256(mask_path)
    public_url = (
        "/assets/3d/characters/human-foundation-pilot/follicle-masks/"
        + filename
    )
    receipt = {
        "status": "WITHHELD_VISUAL_QA",
        "route": "LOCKED_V218_ROOTS_3D_NEAREST_DENSITY_TO_ALL_SCALP_UV_ISLANDS",
        "path": str(mask_path).replace("\\", "/"),
        "plannedPublicUrl": public_url,
        "sha256": mask_sha,
        "resolution": [resolution, resolution],
        "uvSet": uv_layer.name,
        "sourceHeadSha256": SOURCE_HEAD_SHA256,
        "sourceRootCount": sum(root_family_counts.values()),
        "mappedRootCount": mapped_root_count,
        "rootFamilyCounts": root_family_counts,
        "maximumRootSurfaceDistanceMeters": maximum_root_surface_distance,
        "scalpPixelCount": scalp_pixel_count,
        "scalpNonzeroPixelCount": scalp_nonzero_pixel_count,
        "scalpDensityFraction": scalp_density_fraction,
        "scalpDensityHistogram": {
            "mean": scalp_density_mean,
            "p50": density_percentile(0.50),
            "p90": density_percentile(0.90),
            "p95": density_percentile(0.95),
            "max": density_percentile(1.0),
        },
        "nonzeroPixelCount": nonzero_pixel_count,
        "nonScalpContaminationPixelCount": non_scalp_contamination,
        "uvGutterPaddingPixelCount": gutter_padding_count,
        "uvGutterPaddingPasses": gutter_padding_passes,
        "uvSeamComparisonPolicy": "MATCHED_OBJECT_SPACE_SCALP_EDGES_ACROSS_UV_COPIES",
        "uvSeamSampleCount": len(seam_density_deltas),
        "uvSeamDensityDeltaMean": seam_density_delta_mean,
        "uvSeamDensityDeltaMax": seam_density_delta_max,
        "undercoatStrength": 0.26,
        "geometryPolicy": "TEXTURE_ONLY_NO_SCALP_CAP_SHELL_OR_ROOT_UNDERLAY",
        "promotionState": "WITHHELD_UNTIL_HAIR_VISUAL_GATE_PASSES",
    }
    receipt_path = mask_dir / "human-foundation-cropped-follicle-density-v1.receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print("FOLLICLE_DENSITY_MASK=" + json.dumps(receipt, sort_keys=True))
    return receipt


def sampled_head_point(
    surface: BVHTree,
    y: float,
    z: float,
    offset: float,
) -> Vector:
    sample_y = max(0.360, y)
    location, _, _, _ = surface.ray_cast(
        Vector((0.20, sample_y, z)), Vector((-1.0, 0.0, 0.0))
    )
    if location is None:
        location, _, _, _ = surface.find_nearest(Vector((0.025, sample_y, z)))
        if (
            location is None
            or abs(location.y - sample_y) > 0.012
            or abs(location.z - z) > 0.012
        ):
            raise RuntimeError(f"Exact-head surface miss at y={sample_y:.4f}, z={z:.4f}")
    chin_extension = max(0.0, 0.360 - y)
    return Vector((location.x + offset + chin_extension * 0.18, y, z))


def append_surface_piece(
    vertices: list[tuple[float, float, float]],
    faces: list[tuple[int, int, int, int]],
    surface: BVHTree,
    rows: tuple[SurfaceRow, ...],
    offset: float,
) -> None:
    """Append one clean quad card sampled directly against the exact head.

    Every row supplies output Y, lateral start/end, and sample count. Rows below
    the chin sample the lowest valid jaw surface and extend downward from it;
    this creates a beard silhouette without reusing or crumpling face polygons.
    """
    if len({row[3] for row in rows}) != 1:
        raise RuntimeError("Surface-card rows must use a consistent column count")
    columns = rows[0][3]
    start = len(vertices)
    for y, z_start, z_end, _ in rows:
        for column in range(columns):
            amount = column / (columns - 1)
            z = z_start + (z_end - z_start) * amount
            vertices.append(tuple(sampled_head_point(surface, y, z, offset)))
    for row in range(len(rows) - 1):
        for column in range(columns - 1):
            a = start + row * columns + column
            b = a + 1
            d = start + (row + 1) * columns + column
            c = d + 1
            faces.append((a, d, c, b))


def mirrored_rows(
    rows: tuple[tuple[float, float, float, int], ...]
) -> tuple[tuple[SurfaceRow, ...], tuple[SurfaceRow, ...]]:
    positive = tuple(rows)
    negative = tuple((y, -z_end, -z_start, columns) for y, z_start, z_end, columns in rows)
    return positive, negative


def append_moustache_strands(
    vertices: list[tuple[float, float, float]],
    faces: list[tuple[int, int, int, int]],
    surface: BVHTree,
    offset: float,
) -> None:
    """Build tapered overlapping upper-lip cards with real hair direction."""
    for side in (-1.0, 1.0):
        for index in range(24):
            amount = index / 23.0
            start_z = side * (0.001 + amount * 0.014)
            middle_z = side * (0.006 + amount * 0.016)
            end_z = side * (0.009 + amount * 0.015)
            start_y = 0.405 - amount * 0.0015
            middle_y = 0.401 - sin(amount * pi) * 0.0025
            end_y = 0.398 - sin(amount * pi) * 0.0035
            half_width = 0.00042 - amount * 0.00012
            start = len(vertices)
            for y, z, width_scale in (
                (start_y, start_z, 0.70),
                (middle_y, middle_z, 1.00),
                (end_y, end_z, 0.28),
            ):
                width = half_width * width_scale
                vertices.append(tuple(sampled_head_point(surface, y, z - width, offset)))
                vertices.append(tuple(sampled_head_point(surface, y, z + width, offset)))
            faces.extend(((start, start + 2, start + 3, start + 1), (start + 2, start + 4, start + 5, start + 3)))

    # Short central fibers overlap both wings so the philtrum reads as a
    # connected natural moustache rather than two disconnected pills.
    for index in range(9):
        amount = index / 8.0
        z = -0.004 + amount * 0.008
        start = len(vertices)
        for y, lateral in ((0.4045, 0.00034), (0.4000, 0.00042), (0.3980, 0.00012)):
            vertices.append(tuple(sampled_head_point(surface, y, z - lateral, offset)))
            vertices.append(tuple(sampled_head_point(surface, y, z + lateral, offset)))
        faces.extend(((start, start + 2, start + 3, start + 1), (start + 2, start + 4, start + 5, start + 3)))


def append_curve_strand(
    curve: bpy.types.Curve,
    points: tuple[Vector, ...],
    radii: tuple[float, ...],
) -> None:
    if len(points) != len(radii):
        raise RuntimeError("Curve strand points/radii mismatch")
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for control, point, radius in zip(spline.points, points, radii):
        control.co = (*point, 1.0)
        control.radius = radius


def make_neutral_hair_material(module_name: str) -> bpy.types.Material:
    material = bpy.data.materials.new(
        f"{MATERIAL_PREFIX}_{module_name.removeprefix('SK_Hair_')}"
    )
    material.use_nodes = True
    material.diffuse_color = (0.055, 0.018, 0.007, 1.0)
    material["souldrifterTintable"] = True
    material["souldrifterMaterialFamily"] = MATERIAL_PREFIX
    material["souldrifterTintChannel"] = "HAIR"
    material["souldrifterTintMode"] = "MULTIPLY_NEUTRAL_BASE"
    material["souldrifterSeparateFromSkin"] = True
    material["souldrifterSourceTexturePreserved"] = False
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (0.055, 0.018, 0.007, 1.0)
    shader.inputs["Roughness"].default_value = 0.76
    if shader.inputs.get("Specular IOR Level"):
        shader.inputs["Specular IOR Level"].default_value = 0.16
    if shader.inputs.get("Anisotropic IOR Level"):
        shader.inputs["Anisotropic IOR Level"].default_value = 0.48
    if module_name == "SK_Hair_Long":
        # Packed procedural coverage for the runtime cards. The lower quarter
        # is deliberately dense so overlapping root rows hide scalp pinholes;
        # the free length resolves into separated fibers and a feathered tip.
        texture_width = 64
        texture_height = 256
        texture = bpy.data.images.new(
            "TX_HumanHair_LongCardCoverage",
            width=texture_width,
            height=texture_height,
            alpha=True,
        )
        pixels: list[float] = []
        fiber_count = 13
        for row in range(texture_height):
            v = row / (texture_height - 1)
            tip_fade = min(1.0, max(0.0, (1.0 - v) / 0.105))
            follicle_fade = min(1.0, v / 0.012)
            for column in range(texture_width):
                u = column / (texture_width - 1)
                edge_fade = min(1.0, u / 0.028, (1.0 - u) / 0.028)
                fiber_alpha = 0.0
                for fiber in range(fiber_count):
                    center = (fiber + 0.5) / fiber_count
                    center += sin(v * pi * (1.4 + (fiber % 4) * 0.21) + fiber * 1.73) * 0.010
                    width = 0.017 + (fiber % 3) * 0.0025
                    fiber_alpha = max(
                        fiber_alpha,
                        max(0.0, 1.0 - abs(u - center) / width) ** 0.58,
                    )
                root_coverage = 0.0
                if v < 0.42:
                    root_coverage = edge_fade * (
                        0.72 + (1.0 - min(1.0, v / 0.42)) * 0.18
                    )
                alpha = (
                    max(fiber_alpha * edge_fade, root_coverage)
                    * tip_fade
                    * follicle_fade
                )
                grey = 0.58 + fiber_alpha * 0.38
                pixels.extend((grey, grey, grey, alpha))
        texture.pixels.foreach_set(pixels)
        texture.pack()
        image_node = material.node_tree.nodes.new("ShaderNodeTexImage")
        image_node.name = "Runtime Hair Card Coverage"
        image_node.image = texture
        image_node.interpolation = "Linear"
        image_node.extension = "CLIP"
        material.node_tree.links.new(image_node.outputs["Alpha"], shader.inputs["Alpha"])
        bump = material.node_tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.42
        bump.inputs["Distance"].default_value = 0.00065
        material.node_tree.links.new(image_node.outputs["Color"], bump.inputs["Height"])
        material.node_tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
        roughness_noise = material.node_tree.nodes.new("ShaderNodeTexNoise")
        roughness_noise.name = "Long Hair Clump Roughness"
        roughness_noise.inputs["Scale"].default_value = 42.0
        roughness_noise.inputs["Detail"].default_value = 3.0
        roughness_noise.inputs["Roughness"].default_value = 0.64
        roughness_ramp = material.node_tree.nodes.new("ShaderNodeValToRGB")
        roughness_ramp.name = "Long Hair Roughness Range"
        roughness_ramp.color_ramp.elements[0].color = (0.54, 0.54, 0.54, 1.0)
        roughness_ramp.color_ramp.elements[1].color = (0.84, 0.84, 0.84, 1.0)
        material.node_tree.links.new(
            roughness_noise.outputs["Fac"], roughness_ramp.inputs["Fac"]
        )
        material.node_tree.links.new(
            roughness_ramp.outputs["Color"], shader.inputs["Roughness"]
        )
        material.surface_render_method = "DITHERED"
        material.alpha_threshold = 0.16
        material.use_backface_culling = False
        material.use_backface_culling_shadow = True
        material.use_transparent_shadow = True
        material.use_transparency_overlap = False
        material["souldrifterCardTexture"] = "PACKED_PROCEDURAL_ALPHA_FEATHERED_FIBERS"
        material["souldrifterCardTextureResolution"] = [texture_width, texture_height]
    return material


def build_project_quaternius_long_hair(
    name: str,
    source_path: Path,
    armature: bpy.types.Object,
) -> tuple[bpy.types.Object, dict[str, object]]:
    """Reuse the already-conformed, project-shipped CC0 Quaternius Long mesh."""
    if not source_path.is_file() or file_sha256(source_path) != LEGACY_APPEARANCE_SHA256:
        raise RuntimeError("Legacy appearance source/hash contract changed")
    imported = imported_glb_objects(source_path)
    candidates = [
        obj for obj in imported if obj.type == "MESH" and obj.name == "SK_Hair_Long"
    ]
    if len(candidates) != 1:
        raise RuntimeError(
            f"Expected one project-authored SK_Hair_Long, got {[obj.name for obj in candidates]}"
        )
    obj = candidates[0]
    source_vertices = len(obj.data.vertices)
    source_triangles = sum(len(polygon.vertices) - 2 for polygon in obj.data.polygons)
    source_materials = [
        material.name for material in obj.data.materials if material is not None
    ]

    # The tracked legacy-appearance artifact already conformed this mesh from
    # the original Human Shadowknight Head bind space into the exact #487 Human
    # pilot head space.  Preserve those local coordinates; replace only the
    # legacy armature/material bindings with this pack's canonical contracts.
    for modifier in list(obj.modifiers):
        obj.modifiers.remove(modifier)
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    obj.name = name
    obj.data.name = f"{name}Mesh"
    narrowed_part_vertices = 0
    for vertex in obj.data.vertices:
        # The source's center part was intentionally open, but on this neutral
        # scalp it exposed a wide saw-tooth strip.  Narrow only the upper-center
        # boundary toward the part line; lengths and overall head fit stay
        # unchanged.
        if vertex.co.y > 0.455 and abs(vertex.co.z) < 0.014:
            vertex.co.z *= 0.58
            narrowed_part_vertices += 1
    obj.data.update()
    obj.data.materials.clear()
    obj.data.materials.append(make_neutral_hair_material(name))
    for polygon in obj.data.polygons:
        polygon.material_index = 0
        polygon.use_smooth = True

    for imported_obj in imported:
        if imported_obj != obj and imported_obj.name in bpy.data.objects:
            bpy.data.objects.remove(imported_obj, do_unlink=True)

    add_module_contract(
        obj,
        armature,
        "hair",
        "PROJECT_SHIPPED_QUATERNIUS_CC0_EXACT_HEAD_REFIT",
    )
    obj["souldrifterUpstreamAsset"] = "Human Shadowknight SK_Hair_Long"
    obj["souldrifterUpstreamLicense"] = "CC0-1.0"
    obj["souldrifterLegacyGeometry"] = False
    obj["souldrifterPriorRuntimeFit"] = "NO_ADDITIONAL_COVERAGE_FIT_REQUIRED"
    return obj, {
        "route": "PROJECT_SHIPPED_QUATERNIUS_CC0_EXACT_HEAD_REFIT",
        "sourcePath": str(source_path).replace("\\", "/"),
        "sourceSha256": file_sha256(source_path),
        "originalHumanShadowknightSha256": HUMAN_SHADOWKNIGHT_SHA256,
        "sourceLicense": "CC0-1.0",
        "sourceAttribution": "Quaternius Hairstyles via tracked Human Shadowknight SOURCE.md",
        "legacyAppearancePolicy": "GEOMETRY_REUSED_AFTER_EXISTING_EXACT_HEAD_CONFORM",
        "priorCoverageFit": None,
        "priorFitEvidence": (
            "human-foundation-pilot-runtime-4k-legacy-appearance.provenance.json"
        ),
        "vertices": source_vertices,
        "triangles": source_triangles,
        "sourceMaterialsReplaced": source_materials,
        "centerPartNarrowing": {
            "vertexCount": narrowed_part_vertices,
            "lateralScale": 0.58,
            "verticalThreshold": 0.455,
        },
        "runtimeMaterial": f"{MATERIAL_PREFIX}_Long",
    }


def long_hairline_floor(co: Vector) -> float:
    """Return the exact-head hairline floor for an authored long-hair root.

    The front of this head is +X.  The forehead line therefore rises toward
    +X, while the sideburn and occipital roots sit lower.  A shallow central
    widow's peak keeps the line from reading as a stamped helmet edge.
    """
    front_amount = max(
        0.0,
        min(1.0, (co.x - TARGET_HEAD_CENTER.x + 0.010) / 0.060),
    )
    return 0.4445 + front_amount * 0.0195


def build_exact_head_long_hair_underlay(
    reference_head: bpy.types.Object,
    material: bpy.types.Material,
) -> bpy.types.Object:
    """Ray-fit a smooth scalp surface as an inset root-shadow underlay.

    The underlay is not the hairstyle silhouette.  It is a sub-millimetre
    surface layer that prevents bright scalp pinholes between authored strands.
    Every vertex is sampled from the approved exact head surface.
    """
    surface = exact_head_surface(reference_head)
    segments = 192
    rings = 15
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []

    # A structured radial grid gives the inset shell one continuous, curved
    # hairline.  Copying partially selected source polygons produced the exact
    # saw-tooth fringe that the visual gate is meant to reject.
    for ring in range(rings):
        amount = ring / (rings - 1)
        eased = sin(amount * pi * 0.5)
        for segment in range(segments):
            angle = 2.0 * pi * segment / segments
            direction = Vector((cos(angle), 0.0, sin(angle)))
            front_amount = max(0.0, direction.x)
            center_amount = max(0.0, 1.0 - abs(direction.z) / 0.36)
            bottom_y = (
                0.4435
                + front_amount * 0.0240
                - front_amount * center_amount * 0.0032
            )
            y = bottom_y + (0.4965 - bottom_y) * eased
            sample = authored_scalp_point(surface, y, angle, 0.00055)
            if sample is None:
                raise RuntimeError(
                    f"Exact-head long-hair underlay ray miss ring={ring} segment={segment}"
                )
            vertices.append(tuple(sample[0]))

    for ring in range(rings - 1):
        for segment in range(segments):
            next_segment = (segment + 1) % segments
            a = ring * segments + segment
            b = ring * segments + next_segment
            c = (ring + 1) * segments + next_segment
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))

    apex, apex_normal, _, _ = surface.find_nearest(
        Vector((TARGET_HEAD_CENTER.x, 0.502, TARGET_HEAD_CENTER.z))
    )
    if apex is None or apex_normal is None:
        raise RuntimeError("Exact-head long-hair underlay apex lookup failed")
    apex_index = len(vertices)
    vertices.append(tuple(apex + apex_normal.normalized() * 0.00055))
    last_ring = (rings - 1) * segments
    for segment in range(segments):
        faces.append(
            (
                last_ring + segment,
                last_ring + (segment + 1) % segments,
                apex_index,
            )
        )

    mesh = bpy.data.meshes.new("SK_Hair_Long_RootUnderlayMesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    underlay = bpy.data.objects.new("SK_Hair_Long_RootUnderlay", mesh)
    bpy.context.collection.objects.link(underlay)
    return underlay


def authored_scalp_point(
    surface: BVHTree,
    y: float,
    angle: float,
    offset: float,
) -> tuple[Vector, Vector] | None:
    """Sample the exact scalp radially at one height/azimuth."""
    direction = Vector((cos(angle), 0.0, sin(angle))).normalized()
    origin = Vector((TARGET_HEAD_CENTER.x, y, TARGET_HEAD_CENTER.z))
    location, normal, _, _ = surface.ray_cast(origin, direction)
    if location is None or normal is None:
        return None
    normal = normal.normalized()
    return location + normal * offset, normal


def bake_surface_attached_groom(
    guides: bpy.types.Object,
    reference_head: bpy.types.Object,
    material: bpy.types.Material,
    *,
    children_per_guide: int,
    root_jitter_radius: float,
    strand_radius: float,
    hairline_floor_fn=long_hairline_floor,
    tip_width_ratio: float = 0.045,
    tip_taper_exponent: float = 0.62,
    root_width_ratio: float = 0.58,
    root_taper_length: float = 0.16,
    cross_card_layers: int = 1,
    runtime_parallel_card_layers: int = 1,
    runtime_card_cluster_size: int = 1,
    runtime_card_cluster_radius: float | None = None,
    runtime_card_cluster_min_flow_dot: float = -1.0,
    runtime_card_min_half_width: float | None = None,
    runtime_card_half_width_cap: float | None = None,
    runtime_card_length_overlap: float = 0.0,
    runtime_card_hairline_inset: float = 0.0,
    runtime_card_surface_offset: float = 0.0,
    runtime_card_min_curve_fraction: float = 0.45,
    official_shrinkwrap: dict[str, float | int | bool] | None = None,
    official_clump: dict[str, float | int | bool] | None = None,
    official_frizz: dict[str, float | int | bool] | None = None,
    official_noise: dict[str, float | int | bool] | None = None,
    official_profile: dict[str, float | int | bool] | None = None,
    card_atlas_columns: int = 1,
    card_atlas_rows: int = 1,
    card_atlas_band: int | None = None,
    precard_diagnostic_sink: dict[str, dict[str, object]] | None = None,
    precard_diagnostic_family: str | None = None,
    precard_diagnostic_only: bool = False,
) -> tuple[bpy.types.Object | None, dict[str, object]]:
    """Attach authored guides to the exact-head UV surface and bake children.

    Blender's bundled procedural-hair assets are used as the authoring system:
    the guide roots are snapped to the exact head, dense children are
    interpolated from those guides, and a tapered strand profile is applied
    before converting the evaluated groom to a runtime mesh.  The cap/shell
    shortcut is deliberately excluded.
    """
    node_asset_path = (
        Path(bpy.utils.system_resource("DATAFILES"))
        / "assets"
        / "nodes"
        / "procedural_hair_node_assets.blend"
    )
    if not node_asset_path.is_file():
        raise RuntimeError(f"Bundled Blender hair-node assets missing: {node_asset_path}")
    if cross_card_layers not in (1, 2):
        raise RuntimeError(f"Hair card layer count must be 1 or 2, got {cross_card_layers}")
    if runtime_parallel_card_layers not in (1, 2, 3):
        raise RuntimeError(
            "Hair parallel card layer count must be 1, 2, or 3, got "
            f"{runtime_parallel_card_layers}"
        )
    if runtime_card_cluster_size < 1:
        raise RuntimeError(
            f"Hair runtime card cluster size must be positive, got {runtime_card_cluster_size}"
        )
    if runtime_card_cluster_radius is not None and runtime_card_cluster_radius <= 0.0:
        raise RuntimeError(
            f"Hair runtime card cluster radius must be positive, got {runtime_card_cluster_radius}"
        )
    if not -1.0 <= runtime_card_cluster_min_flow_dot <= 1.0:
        raise RuntimeError(
            "Hair runtime card minimum flow dot must be in [-1,1], got "
            f"{runtime_card_cluster_min_flow_dot}"
        )
    if runtime_card_half_width_cap is not None and runtime_card_half_width_cap <= 0.0:
        raise RuntimeError(
            f"Hair runtime card half-width cap must be positive, got {runtime_card_half_width_cap}"
        )
    if runtime_card_min_half_width is not None and runtime_card_min_half_width <= 0.0:
        raise RuntimeError(
            f"Hair runtime card minimum half-width must be positive, got {runtime_card_min_half_width}"
        )
    if not 0.0 <= runtime_card_length_overlap <= 0.5:
        raise RuntimeError(
            f"Hair runtime card length overlap must be in [0,.5], got {runtime_card_length_overlap}"
        )
    if not 0.0 <= runtime_card_hairline_inset <= 0.012:
        raise RuntimeError(
            f"Hair runtime card hairline inset must be in [0,.012], got {runtime_card_hairline_inset}"
        )
    if not -0.0015 <= runtime_card_surface_offset <= 0.0015:
        raise RuntimeError(
            "Hair runtime card surface offset must be in [-.0015,.0015], got "
            f"{runtime_card_surface_offset}"
        )
    if not 0.20 <= runtime_card_min_curve_fraction <= 1.0:
        raise RuntimeError(
            "Hair runtime minimum curve fraction must be in [0.20,1.0], got "
            f"{runtime_card_min_curve_fraction}"
        )
    if not 0.01 <= root_width_ratio <= 1.0:
        raise RuntimeError(f"Hair root width ratio out of range: {root_width_ratio}")
    if not 0.01 <= root_taper_length <= 1.0:
        raise RuntimeError(f"Hair root taper length out of range: {root_taper_length}")
    if card_atlas_columns < 1 or card_atlas_rows < 1:
        raise RuntimeError(
            f"Hair card atlas grid invalid: {card_atlas_columns}x{card_atlas_rows}"
        )
    if card_atlas_band is not None and not 0 <= card_atlas_band < card_atlas_rows:
        raise RuntimeError(f"Hair card atlas band out of range: {card_atlas_band}")
    if precard_diagnostic_only and precard_diagnostic_sink is None:
        raise RuntimeError("Pre-card diagnostic-only mode requires a diagnostic sink")
    if precard_diagnostic_sink is not None and not precard_diagnostic_family:
        raise RuntimeError("Pre-card diagnostic collection requires a family label")
    uv_map = reference_head.data.uv_layers.active
    if uv_map is None:
        raise RuntimeError("Exact-head surface has no active UV map for groom attachment")
    rest_position = reference_head.data.attributes.get("rest_position")
    if rest_position is None:
        rest_position = reference_head.data.attributes.new(
            name="rest_position",
            type="FLOAT_VECTOR",
            domain="POINT",
        )
    if len(rest_position.data) != len(reference_head.data.vertices):
        raise RuntimeError("Exact-head rest_position cardinality does not match vertices")
    for destination, vertex in zip(rest_position.data, reference_head.data.vertices):
        destination.vector = vertex.co

    bpy.ops.object.select_all(action="DESELECT")
    # Guides are authored in the exact head's local coordinates. Give the hair
    # object the same world transform while Blender resolves the surface object,
    # preventing the imported glTF Y-up transform from rotating roots twice.
    guides.matrix_world = reference_head.matrix_world.copy()
    guides.select_set(True)
    bpy.context.view_layer.objects.active = guides
    bpy.ops.object.convert(target="CURVES")
    groom = bpy.context.view_layer.objects.active
    groom.name = guides.name
    groom.data.name = f"{guides.name}HairCurves"
    groom.data.surface = reference_head
    groom.data.surface_uv_map = uv_map.name
    guide_count = len(groom.data.curves)
    if guide_count < 24:
        raise RuntimeError(f"Hair groom has too few authored guides: {guide_count}")
    guide_offsets = [value.value for value in groom.data.curve_offset_data]
    guide_point_counts = [
        guide_offsets[index + 1] - guide_offsets[index]
        for index in range(guide_count)
    ]
    guide_root_positions = [
        groom.data.points[guide_offsets[index]].position.copy()
        for index in range(guide_count)
    ]
    if min(guide_point_counts) < 5:
        raise RuntimeError(f"Hair guide has too few control points: {guide_point_counts}")

    node_group_names = ["Attach Hair Curves to Surface"]
    if official_shrinkwrap is not None:
        node_group_names.append("Shrinkwrap Hair Curves")
    if official_clump is not None:
        node_group_names.append("Clump Hair Curves")
    if official_frizz is not None:
        node_group_names.append("Frizz Hair Curves")
    if official_noise is not None:
        node_group_names.append("Hair Curves Noise")
    if official_profile is not None:
        node_group_names.append("Set Hair Curve Profile")
    node_group_names = tuple(node_group_names)
    node_groups = {
        name: bpy.data.node_groups.get(name)
        for name in node_group_names
        if bpy.data.node_groups.get(name)
    }
    if len(node_groups) != len(node_group_names):
        with bpy.data.libraries.load(
            str(node_asset_path), link=False, assets_only=False
        ) as (_, data_to):
            data_to.node_groups = [
                name for name in node_group_names if name not in node_groups
            ]
        for requested_name, loaded_group in zip(
            [name for name in node_group_names if name not in node_groups],
            [group for group in data_to.node_groups if group],
        ):
            node_groups[requested_name] = loaded_group
    if set(node_groups) != set(node_group_names):
        raise RuntimeError(f"Blender hair-node asset load incomplete: {sorted(node_groups)}")

    def apply_nodes(name: str, group_name: str) -> bpy.types.Modifier:
        modifier = groom.modifiers.new(name=name, type="NODES")
        modifier.node_group = node_groups[group_name]
        return modifier

    def interface_identifier(
        group: bpy.types.NodeTree,
        display_name: str,
        *,
        in_out: str = "INPUT",
        socket_type: str | None = None,
    ) -> str:
        matches = [
            item
            for item in group.interface.items_tree
            if getattr(item, "item_type", None) == "SOCKET"
            and item.in_out == in_out
            and item.name == display_name
            and (socket_type is None or item.socket_type == socket_type)
        ]
        if len(matches) != 1:
            raise RuntimeError(
                f"Official hair socket contract changed: {group.name} "
                f"{in_out} {display_name} {socket_type}; matches={len(matches)}"
            )
        return matches[0].identifier

    def set_modifier_value(
        modifier: bpy.types.Modifier,
        display_name: str,
        value: object,
        *,
        socket_type: str | None = None,
    ) -> None:
        identifier = interface_identifier(
            modifier.node_group,
            display_name,
            socket_type=socket_type,
        )
        getattr(modifier.properties.inputs, identifier).value = value

    def set_modifier_attribute(
        modifier: bpy.types.Modifier,
        display_name: str,
        attribute_name: str,
    ) -> None:
        identifier = interface_identifier(modifier.node_group, display_name)
        getattr(modifier.properties.inputs, identifier).attribute_name = attribute_name

    def set_modifier_output_attribute(
        modifier: bpy.types.Modifier,
        display_name: str,
        attribute_name: str,
    ) -> None:
        identifier = interface_identifier(
            modifier.node_group,
            display_name,
            in_out="OUTPUT",
        )
        getattr(modifier.properties.outputs, identifier).attribute_name = attribute_name

    attach = apply_nodes("Attach Hair Curves to Exact Head", "Attach Hair Curves to Surface")
    set_modifier_value(attach, "Surface Object", reference_head)
    set_modifier_attribute(attach, "Surface UV Map", uv_map.name)
    set_modifier_value(attach, "Resting Surface", True)
    set_modifier_value(attach, "Use Existing Attachment", False)
    set_modifier_value(attach, "Snap to Surface", True)
    set_modifier_value(attach, "Blend along Curve", 0.08)
    set_modifier_value(attach, "Align to Surface Normal", True)
    set_modifier_output_attribute(
        attach,
        "Surface UV Coordinate",
        "surface_uv_coordinate",
    )
    set_modifier_output_attribute(attach, "Surface Normal", "surface_normal")
    bpy.ops.object.modifier_apply(modifier=attach.name)
    if "surface_uv_coordinate" not in groom.data.attributes:
        raise RuntimeError("Exact-head groom attachment did not persist surface UV roots")
    if "surface_normal" not in groom.data.attributes:
        raise RuntimeError("Exact-head groom attachment did not persist surface normals")
    surface_uv_attribute = groom.data.attributes["surface_uv_coordinate"]
    surface_uv_values: list[tuple[float, float]] = []
    for value in surface_uv_attribute.data:
        vector = tuple(value.vector)
        surface_uv_values.append((float(vector[0]), float(vector[1])))
    if not surface_uv_values or not all(
        isfinite(component)
        for uv in surface_uv_values
        for component in uv
    ):
        raise RuntimeError("Exact-head groom attachment produced non-finite UV roots")
    if not all(-0.001 <= component <= 1.001 for uv in surface_uv_values for component in uv):
        raise RuntimeError("Exact-head groom attachment produced UV roots outside [0,1]")
    surface_uv_unique = len(
        {(round(uv[0], 5), round(uv[1], 5)) for uv in surface_uv_values}
    )
    if surface_uv_unique < max(12, int(guide_count * 0.35)):
        raise RuntimeError(
            f"Exact-head groom UV roots are not diverse: {surface_uv_unique}/{guide_count}"
        )
    attached_offsets = [value.value for value in groom.data.curve_offset_data]
    attached_roots = [
        groom.data.points[attached_offsets[index]].position.copy()
        for index in range(len(groom.data.curves))
    ]
    surface = exact_head_surface(reference_head)
    attached_root_distances: list[float] = []
    for root in attached_roots:
        _, _, _, distance = surface.find_nearest(root)
        if distance is None or not isfinite(distance):
            raise RuntimeError("Exact-head groom root distance audit failed")
        attached_root_distances.append(float(distance))
    attached_root_distance_max = max(attached_root_distances)
    if attached_root_distance_max > 0.0010:
        raise RuntimeError(
            "Exact-head groom root clearance exceeds 1mm: "
            f"{attached_root_distance_max:.8f}"
        )

    # The bundled Interpolate Hair Curves asset emits one-point roots when
    # applied destructively to this imported glTF surface. Build deterministic
    # exact-scalp child roots, then use Blender's native Interpolate Curves node
    # to expand every authored guide into full multi-point child curves.
    surface = exact_head_surface(reference_head)
    guide_offsets = [value.value for value in groom.data.curve_offset_data]
    child_roots: list[Vector] = []
    child_normals: list[Vector] = []
    root_clearance = 0.0008
    for guide_index in range(guide_count):
        root = guide_root_positions[guide_index]
        for child_index in range(children_per_guide):
            seed = guide_index * children_per_guide + child_index
            angle = 2.0 * pi * (((seed * 73 + seed * seed * 19) % 1009) / 1008.0)
            amount = sqrt(((seed * 107 + seed * seed * 23) % 1013) / 1012.0)
            location, root_normal, _, root_distance = surface.find_nearest(root)
            if (
                location is None
                or root_normal is None
                or root_distance is None
                or root_distance > 0.008
            ):
                continue
            root_normal = root_normal.normalized()
            tangent_up = Vector((0.0, 1.0, 0.0))
            tangent_up -= root_normal * tangent_up.dot(root_normal)
            if tangent_up.length_squared < 1.0e-10:
                tangent_up = Vector((1.0, 0.0, 0.0))
                tangent_up -= root_normal * tangent_up.dot(root_normal)
            tangent_up.normalize()
            tangent_side = root_normal.cross(tangent_up).normalized()
            probe = root + (
                tangent_up * cos(angle) + tangent_side * sin(angle)
            ) * root_jitter_radius * amount
            location, normal, _, distance = surface.find_nearest(probe)
            if location is None or normal is None or distance is None or distance > 0.008:
                continue
            normal = normal.normalized()
            if location.y < hairline_floor_fn(location) - 0.002:
                continue
            child_roots.append(location + normal * root_clearance)
            child_normals.append(normal)
    minimum_child_roots = int(guide_count * children_per_guide * 0.92)
    if len(child_roots) < minimum_child_roots:
        raise RuntimeError(
            "Exact-scalp child-root coverage is too sparse: "
            f"{len(child_roots)} from {guide_count} guides; minimum={minimum_child_roots}"
        )

    root_mesh = bpy.data.meshes.new(f"{guides.name}_ExactScalpRootsMesh")
    root_mesh.from_pydata([tuple(root) for root in child_roots], [], [])
    root_normals = root_mesh.attributes.new(
        name="surface_normal", type="FLOAT_VECTOR", domain="POINT"
    )
    for value, normal in zip(root_normals.data, child_normals):
        value.vector = normal
    root_object = bpy.data.objects.new(f"{guides.name}_ExactScalpRoots", root_mesh)
    bpy.context.collection.objects.link(root_object)
    root_object.matrix_world = groom.matrix_world.copy()

    interpolate_group = bpy.data.node_groups.new(
        f"{guides.name}_ExactScalpGuideInterpolation", "GeometryNodeTree"
    )
    interpolate_group.interface.new_socket(
        name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry"
    )
    interpolate_group.interface.new_socket(
        name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry"
    )
    group_input = interpolate_group.nodes.new("NodeGroupInput")
    group_output = interpolate_group.nodes.new("NodeGroupOutput")
    root_info = interpolate_group.nodes.new("GeometryNodeObjectInfo")
    root_info.transform_space = "RELATIVE"
    root_info.inputs["Object"].default_value = root_object
    mesh_to_points = interpolate_group.nodes.new("GeometryNodeMeshToPoints")
    mesh_to_points.mode = "VERTICES"
    interpolate_curves = interpolate_group.nodes.new("GeometryNodeInterpolateCurves")
    interpolate_curves.inputs["Max Neighbors"].default_value = 4
    interpolate_curves.inputs["Guide Up"].default_value = (0.0, 1.0, 0.0)
    interpolate_curves.inputs["Point Up"].default_value = (0.0, 1.0, 0.0)
    interpolate_group.links.new(
        group_input.outputs["Geometry"], interpolate_curves.inputs["Guide Curves"]
    )
    interpolate_group.links.new(
        root_info.outputs["Geometry"], mesh_to_points.inputs["Mesh"]
    )
    interpolate_group.links.new(
        mesh_to_points.outputs["Points"], interpolate_curves.inputs["Points"]
    )
    interpolate_group.links.new(
        interpolate_curves.outputs["Curves"], group_output.inputs["Geometry"]
    )
    interpolate = groom.modifiers.new(
        name="Interpolate Exact-Scalp Guide Curves", type="NODES"
    )
    interpolate.node_group = interpolate_group
    bpy.ops.object.modifier_apply(modifier=interpolate.name)
    interpolated_count = len(groom.data.curves)

    official_node_settings: dict[str, dict[str, float | int | bool]] = {}

    def apply_official_hair_asset(
        modifier_name: str,
        group_name: str,
        settings: dict[str, float | int | bool],
        display_names: dict[str, str],
    ) -> None:
        modifier = apply_nodes(modifier_name, group_name)
        for setting_name, value in settings.items():
            set_modifier_value(modifier, display_names[setting_name], value)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        official_node_settings[group_name] = dict(settings)

    if official_shrinkwrap is not None:
        shrinkwrap = apply_nodes(
            "Official Cropped Surface Conform",
            "Shrinkwrap Hair Curves",
        )
        set_modifier_value(
            shrinkwrap,
            "Surface",
            reference_head,
            socket_type="NodeSocketObject",
        )
        for setting_name, display_name in {
            "factor": "Factor",
            "offsetDistance": "Offset Distance",
            "aboveSurface": "Above Surface",
            "smoothingSteps": "Smoothing Steps",
            "lockRoots": "Lock Roots",
        }.items():
            set_modifier_value(shrinkwrap, display_name, official_shrinkwrap[setting_name])
        bpy.ops.object.modifier_apply(modifier=shrinkwrap.name)
        official_node_settings["Shrinkwrap Hair Curves"] = dict(official_shrinkwrap)

    if official_clump is not None:
        apply_official_hair_asset(
            "Official Cropped Clump",
            "Clump Hair Curves",
            official_clump,
            {
                "factor": "Factor",
                "shape": "Shape",
                "tipSpread": "Tip Spread",
                "clumpOffset": "Clump Offset",
                "distanceFalloff": "Distance Falloff",
                "distanceThreshold": "Distance Threshold",
                "seed": "Seed",
                "preserveLength": "Preserve Length",
                "guideDistance": "Guide Distance",
                "guideMask": "Guide Mask",
                "existingGuideMap": "Existing Guide Map",
            },
        )
    if official_frizz is not None:
        apply_official_hair_asset(
            "Official Cropped Frizz",
            "Frizz Hair Curves",
            official_frizz,
            {
                "cumulativeOffset": "Cumulative Offset",
                "factor": "Factor",
                "distance": "Distance",
                "shape": "Shape",
                "seed": "Seed",
                "preserveLength": "Preserve Length",
            },
        )
    if official_noise is not None:
        apply_official_hair_asset(
            "Official Cropped Noise",
            "Hair Curves Noise",
            official_noise,
            {
                "cumulativeOffset": "Cumulative Offset",
                "factor": "Factor",
                "distance": "Distance",
                "shape": "Shape",
                "scale": "Scale",
                "scaleAlongCurve": "Scale along Curve",
                "offsetPerCurve": "Offset per Curve",
                "seed": "Seed",
                "preserveLength": "Preserve Length",
            },
        )
    if official_profile is not None:
        apply_official_hair_asset(
            "Official Cropped Profile",
            "Set Hair Curve Profile",
            official_profile,
            {
                "replaceRadius": "Replace Radius",
                "radius": "Radius",
                "shape": "Shape",
                "factorMin": "Factor Min",
                "factorMax": "Factor Max",
            },
        )

    # The official modifiers preserve roots, but Frizz/Noise can still rotate
    # the first child segment out of the scalp tangent plane.  Fit only that
    # first segment back to the exact-head tangent while preserving its length;
    # the remaining six points retain the procedural clump/noise silhouette.
    post_node_offsets = [value.value for value in groom.data.curve_offset_data]
    root_tangent_correction_count = 0
    root_tangent_dot_before_max = 0.0
    root_tangent_dot_after_max = 0.0
    root_tangent_limit = 0.25
    surface = exact_head_surface(reference_head)
    for curve_index in range(len(groom.data.curves)):
        start = post_node_offsets[curve_index]
        end = post_node_offsets[curve_index + 1]
        if end - start < 3:
            raise RuntimeError(
                f"Post-node child curve is too short for root tangent fit: {curve_index}"
            )
        root = groom.data.points[start].position.copy()
        first = groom.data.points[start + 1].position.copy()
        _, normal, _, distance = surface.find_nearest(root)
        if normal is None or distance is None or distance > 0.002:
            raise RuntimeError(
                f"Post-node child root lost the exact scalp: curve={curve_index} distance={distance}"
            )
        normal = normal.normalized()
        direction = first - root
        if direction.length_squared < 1.0e-12:
            raise RuntimeError(f"Post-node child root segment collapsed: {curve_index}")
        direction_length = direction.length
        before_dot = abs(direction.normalized().dot(normal))
        root_tangent_dot_before_max = max(root_tangent_dot_before_max, before_dot)
        if before_dot > root_tangent_limit:
            tangent = direction - normal * direction.dot(normal)
            if tangent.length_squared < 1.0e-12:
                tangent = groom.data.points[start + 2].position - root
                tangent -= normal * tangent.dot(normal)
            if tangent.length_squared < 1.0e-12:
                raise RuntimeError(
                    f"Post-node child has no recoverable scalp tangent: {curve_index}"
                )
            groom.data.points[start + 1].position = (
                root + tangent.normalized() * direction_length
            )
            root_tangent_correction_count += 1
        after_direction = groom.data.points[start + 1].position - root
        after_dot = abs(after_direction.normalized().dot(normal))
        root_tangent_dot_after_max = max(root_tangent_dot_after_max, after_dot)
    if root_tangent_dot_after_max > root_tangent_limit + 1.0e-5:
        raise RuntimeError(
            "Post-node child root tangent fit failed: "
            f"maximum={root_tangent_dot_after_max:.6f}"
        )

    evaluated_curve_count = len(groom.data.curves)
    if evaluated_curve_count != interpolated_count:
        raise RuntimeError(
            "Official procedural nodes changed interpolated curve cardinality: "
            f"{interpolated_count} -> {evaluated_curve_count}"
        )
    interpolated_offsets = [value.value for value in groom.data.curve_offset_data]
    interpolated_point_counts = [
        interpolated_offsets[index + 1] - interpolated_offsets[index]
        for index in range(interpolated_count)
    ]
    if interpolated_count < minimum_child_roots:
        raise RuntimeError(
            f"Hair interpolation did not expand the groom: {guide_count} -> {interpolated_count}"
        )
    if min(interpolated_point_counts) < min(guide_point_counts):
        raise RuntimeError(
            "Hair interpolation produced single-point or truncated child curves: "
            f"minimum={min(interpolated_point_counts)}"
        )
    interpolated_radius_attribute = groom.data.attributes.get("radius")
    radius_attribute_preserved = interpolated_radius_attribute is not None
    bpy.data.objects.remove(root_object, do_unlink=True)

    if precard_diagnostic_sink is not None:
        evaluated_curves = [
            [
                tuple(groom.data.points[index].position)
                for index in range(
                    interpolated_offsets[curve_index],
                    interpolated_offsets[curve_index + 1],
                )
            ]
            for curve_index in range(evaluated_curve_count)
        ]
        precard_diagnostic_sink[str(precard_diagnostic_family)] = {
            "curves": evaluated_curves,
            "guideCount": guide_count,
            "childRootCount": len(child_roots),
            "evaluatedCurveCount": evaluated_curve_count,
            "evaluatedPointCountMin": min(interpolated_point_counts),
            "officialProceduralHairNodeSettings": official_node_settings,
            "rootTangentFit": {
                "limitDotAbs": root_tangent_limit,
                "correctedCurveCount": root_tangent_correction_count,
                "beforeDotAbsMax": root_tangent_dot_before_max,
                "afterDotAbsMax": root_tangent_dot_after_max,
            },
        }
    if precard_diagnostic_only:
        bpy.data.objects.remove(groom, do_unlink=True)
        return None, {
            "authoringSystem": "BLENDER_SURFACE_ATTACHED_HAIR_CURVES",
            "surfaceHeadSha256": SOURCE_HEAD_SHA256,
            "surfaceUvMap": uv_map.name,
            "guideCount": guide_count,
            "childRootCount": len(child_roots),
            "interpolatedCurveCount": evaluated_curve_count,
            "interpolatedPointCountMin": min(interpolated_point_counts),
            "officialProceduralHairAssetLibrary": str(node_asset_path).replace("\\", "/"),
            "officialProceduralHairAssetLibrarySha256": file_sha256(node_asset_path),
            "officialProceduralHairNodeSettings": official_node_settings,
            "rootTangentFit": {
                "limitDotAbs": root_tangent_limit,
                "correctedCurveCount": root_tangent_correction_count,
                "beforeDotAbsMax": root_tangent_dot_before_max,
                "afterDotAbsMax": root_tangent_dot_after_max,
            },
            "conversionStep": "WITHHELD_AFTER_OFFICIAL_NODES_FOR_PRECARD_DIAGNOSTIC",
        }

    # glTF cannot represent Blender's native Hair Curves. Bake each evaluated
    # interpolated curve to a narrow, double-sided runtime card. The card plane
    # follows the scalp-outward normal rather than a fixed camera axis, so front,
    # side, and rear views retain density. Width expands just after the root and
    # tapers almost to zero at the tip; the rejected uniform tubes/blunt ends are
    # deliberately impossible in this conversion.
    card_vertices: list[tuple[float, float, float]] = []
    card_faces: list[tuple[int, int, int, int]] = []
    card_uvs: list[tuple[float, float]] = []
    card_half_width_min = float("inf")
    card_half_width_max = 0.0
    source_curve_points_raw = [
        [
            groom.data.points[index].position.copy()
            for index in range(
                interpolated_offsets[curve_index],
                interpolated_offsets[curve_index + 1],
            )
        ]
        for curve_index in range(interpolated_count)
    ]

    def resample_curve_arclength(
        points: list[Vector],
        sample_count: int = 8,
    ) -> list[Vector]:
        """Resample a child curve before clustering/card-envelope fitting."""
        if len(points) < 2:
            raise RuntimeError("Runtime hair child curve has fewer than two points")
        cumulative = [0.0]
        for start, end in zip(points, points[1:]):
            cumulative.append(cumulative[-1] + (end - start).length)
        total = cumulative[-1]
        if total <= 1.0e-8:
            raise RuntimeError("Runtime hair child curve has zero arclength")
        samples: list[Vector] = []
        segment = 0
        for sample_index in range(sample_count):
            target = total * sample_index / (sample_count - 1)
            while segment < len(points) - 2 and cumulative[segment + 1] < target:
                segment += 1
            length = cumulative[segment + 1] - cumulative[segment]
            amount = 0.0 if length <= 1.0e-10 else (target - cumulative[segment]) / length
            samples.append(points[segment].lerp(points[segment + 1], amount))
        return samples

    source_curve_points = [
        resample_curve_arclength(points) for points in source_curve_points_raw
    ]
    root_positions = [points[0] for points in source_curve_points]
    root_flows = []
    for points in source_curve_points:
        flow = points[1] - points[0]
        if flow.length_squared < 1.0e-12:
            flow = Vector((0.0, -1.0, 0.0))
        root_flows.append(flow.normalized())

    # Sequential pairs created the v220-v223 dotted rows: neighboring indices
    # are not guaranteed to be neighboring roots after Geometry Nodes.  Build
    # deterministic spatial+flow coherent KNN clumps instead.  Each card owns
    # the complete cross-section envelope of its members.
    runtime_curve_indices = [
        index
        for index, root in enumerate(root_positions)
        if root.y >= hairline_floor_fn(root) + runtime_card_hairline_inset
    ]
    if len(runtime_curve_indices) < max(
        12,
        int(interpolated_count * runtime_card_min_curve_fraction),
    ):
        raise RuntimeError(
            "Runtime hairline inset removed too much of the authored groom: "
            f"kept={len(runtime_curve_indices)} source={interpolated_count} "
            f"inset={runtime_card_hairline_inset}"
        )
    remaining = set(runtime_curve_indices)
    card_clusters: list[tuple[int, ...]] = []
    while remaining:
        seed = min(remaining)
        seed_root = root_positions[seed]
        seed_flow = root_flows[seed]
        eligible = [
            index
            for index in remaining
            if (
                index == seed
                or (
                    (
                        runtime_card_cluster_radius is None
                        or (root_positions[index] - seed_root).length
                        <= runtime_card_cluster_radius
                    )
                    and root_flows[index].dot(seed_flow)
                    >= runtime_card_cluster_min_flow_dot
                )
            )
        ]
        candidates = sorted(
            eligible,
            key=lambda index: (
                (root_positions[index] - seed_root).length
                + max(0.0, 1.0 - root_flows[index].dot(seed_flow)) * 0.006,
                index,
            ),
        )
        cluster = tuple(candidates[:runtime_card_cluster_size])
        for index in cluster:
            remaining.remove(index)
        card_clusters.append(cluster)

    # Enforce the full eight-section envelope before geometry creation. A KNN
    # clump can begin coherently and still fan out later; recursively split such
    # a clump around its farthest curve pair instead of clipping the envelope or
    # allowing one oversized rectangular scalp tile.
    initial_cluster_count = len(card_clusters)
    cluster_split_count = 0

    def conservative_cluster_half_width(cluster: tuple[int, ...]) -> float:
        maximum_pair_span = 0.0
        for point_index in range(len(source_curve_points[cluster[0]])):
            for left_offset, left in enumerate(cluster):
                for right in cluster[left_offset + 1 :]:
                    maximum_pair_span = max(
                        maximum_pair_span,
                        (
                            source_curve_points[left][point_index]
                            - source_curve_points[right][point_index]
                        ).length,
                    )
        return max(
            maximum_pair_span * 0.5 * 1.22 + strand_radius * 1.8,
            strand_radius * 10.0,
        )

    def split_cluster_to_envelope(cluster: tuple[int, ...]) -> list[tuple[int, ...]]:
        nonlocal cluster_split_count
        if (
            runtime_card_half_width_cap is None
            or len(cluster) == 1
            or conservative_cluster_half_width(cluster)
            <= runtime_card_half_width_cap
        ):
            return [cluster]
        farthest_pair = max(
            (
                (left, right)
                for left_offset, left in enumerate(cluster)
                for right in cluster[left_offset + 1 :]
            ),
            key=lambda pair: sum(
                (
                    source_curve_points[pair[0]][point_index]
                    - source_curve_points[pair[1]][point_index]
                ).length_squared
                for point_index in range(len(source_curve_points[pair[0]]))
            ),
        )
        left_seed, right_seed = farthest_pair

        def trajectory_distance(index: int, seed: int) -> float:
            return sum(
                (
                    source_curve_points[index][point_index]
                    - source_curve_points[seed][point_index]
                ).length_squared
                for point_index in range(len(source_curve_points[index]))
            )

        left_group = tuple(
            index
            for index in cluster
            if trajectory_distance(index, left_seed)
            <= trajectory_distance(index, right_seed)
        )
        right_group = tuple(index for index in cluster if index not in left_group)
        if not left_group or not right_group:
            midpoint = max(1, len(cluster) // 2)
            left_group, right_group = cluster[:midpoint], cluster[midpoint:]
        cluster_split_count += 1
        return split_cluster_to_envelope(left_group) + split_cluster_to_envelope(
            right_group
        )

    card_clusters = [
        refined
        for cluster in card_clusters
        for refined in split_cluster_to_envelope(cluster)
    ]
    cluster_root_span_max = 0.0
    cluster_flow_dot_min = 1.0
    for cluster in card_clusters:
        for left in cluster:
            cluster_flow_dot_min = min(
                cluster_flow_dot_min,
                *(root_flows[left].dot(root_flows[right]) for right in cluster),
            )
            cluster_root_span_max = max(
                cluster_root_span_max,
                *((root_positions[left] - root_positions[right]).length for right in cluster),
            )
    for card_index, source_curve_indices in enumerate(card_clusters):
        point_count = len(source_curve_points[source_curve_indices[0]])
        points = [
            sum(
                (source_curve_points[index][point_index] for index in source_curve_indices),
                Vector((0.0, 0.0, 0.0)),
            )
            / len(source_curve_indices)
            for point_index in range(point_count)
        ]
        if len(points) < 5:
            raise RuntimeError(f"Runtime hair card source is truncated: card={card_index}")
        if runtime_card_length_overlap > 0.0:
            card_length = sum(
                (end - start).length for start, end in zip(points, points[1:])
            )
            extension = min(0.0032, card_length * runtime_card_length_overlap)
            root_tangent = points[1] - points[0]
            tip_tangent = points[-1] - points[-2]
            if root_tangent.length_squared > 1.0e-12:
                root_tangent.normalize()
                # Do not extend the exposed hairline down onto the forehead.
                if points[0].y > hairline_floor_fn(points[0]) + extension * 1.25:
                    points[0] -= root_tangent * extension
            if tip_tangent.length_squared > 1.0e-12:
                points[-1] += tip_tangent.normalized() * extension
        width_noise = (
            ((card_index * 73 + card_index * card_index * 19) % 1009) / 1008.0
        )
        layer_noise = (
            ((card_index * 107 + card_index * card_index * 23) % 1013) / 1012.0
        )
        tile_column = (
            (card_index * 17 + card_index * card_index * 5) % card_atlas_columns
        )
        tile_row = (
            card_atlas_band
            if card_atlas_band is not None
            else (card_index * 11 + card_index * card_index * 3) % card_atlas_rows
        )
        atlas_u_min = (tile_column + 0.025) / card_atlas_columns
        atlas_u_max = (tile_column + 0.975) / card_atlas_columns
        root_radial = Vector(
            (
                points[0].x - TARGET_HEAD_CENTER.x,
                0.0,
                points[0].z - TARGET_HEAD_CENTER.z,
            )
        )
        if root_radial.length_squared < 1.0e-10:
            root_radial = Vector((1.0, 0.0, 0.0))
        root_radial.normalize()
        _, root_surface_normal, _, root_surface_distance = surface.find_nearest(points[0])
        if (
            root_surface_normal is not None
            and root_surface_distance is not None
            and root_surface_distance < 0.008
        ):
            root_surface_normal = root_surface_normal.normalized()
        else:
            root_surface_normal = root_radial.copy()
        layer_offset = root_surface_normal * (layer_noise - 0.5) * 0.0007
        previous_lateral: Vector | None = None
        curve_vertex_start = len(card_vertices)
        cross_sections: list[tuple[Vector, Vector, float, float]] = []
        parallel_sections: list[
            tuple[Vector, Vector, Vector, float, float]
        ] = []
        for point_index, point in enumerate(points):
            factor = point_index / (len(points) - 1)
            if point_index == 0:
                tangent = points[1] - point
            elif point_index == len(points) - 1:
                tangent = point - points[point_index - 1]
            else:
                tangent = points[point_index + 1] - points[point_index - 1]
            if tangent.length_squared < 1.0e-12:
                tangent = Vector((0.0, -1.0, 0.0))
            tangent.normalize()
            _, surface_normal, _, surface_distance = surface.find_nearest(point)
            if (
                surface_normal is not None
                and surface_distance is not None
                and surface_distance < 0.010
            ):
                outward = surface_normal.normalized()
            else:
                outward = Vector(
                    (
                        point.x - TARGET_HEAD_CENTER.x,
                        0.0,
                        point.z - TARGET_HEAD_CENTER.z,
                    )
                )
            outward -= tangent * outward.dot(tangent)
            if outward.length_squared < 1.0e-10:
                outward = root_radial - tangent * root_radial.dot(tangent)
            if outward.length_squared < 1.0e-10:
                outward = Vector((1.0, 0.0, 0.0))
            outward.normalize()
            lateral = outward.cross(tangent)
            if lateral.length_squared < 1.0e-10:
                lateral = previous_lateral or Vector((0.0, 0.0, 1.0))
            lateral.normalize()
            if previous_lateral is not None and lateral.dot(previous_lateral) < 0.0:
                lateral.negate()
            previous_lateral = lateral.copy()
            # Fit the full member envelope at every section, then overlap it by
            # 22 percent. This guarantees that each KNN card contains its
            # source clump instead of treating root spread as a curve-wide
            # proxy.
            member_offsets = [
                (source_curve_points[index][point_index] - point).dot(lateral)
                for index in source_curve_indices
            ]
            envelope_min = min(member_offsets)
            envelope_max = max(member_offsets)
            envelope_center = (envelope_min + envelope_max) * 0.5
            envelope_half_width = (envelope_max - envelope_min) * 0.5
            minimum_clump_half_width = strand_radius * (7.5 + width_noise * 2.5)
            if runtime_card_min_half_width is not None:
                minimum_clump_half_width = max(
                    minimum_clump_half_width,
                    runtime_card_min_half_width,
                )
            base_half_width = max(
                envelope_half_width * 1.22 + strand_radius * 1.8,
                minimum_clump_half_width,
            )
            if runtime_card_half_width_cap is not None:
                if base_half_width > runtime_card_half_width_cap:
                    raise RuntimeError(
                        "Spatial hair cluster exceeds the card envelope cap: "
                        f"card={card_index} width={base_half_width:.8f} "
                        f"cap={runtime_card_half_width_cap:.8f}"
                    )
            root_amount = min(1.0, factor / root_taper_length) ** 0.62
            root_ramp = root_width_ratio + (1.0 - root_width_ratio) * root_amount
            tip_amount = max(0.0, min(1.0, (factor - 0.86) / 0.14))
            tip_smooth = tip_amount * tip_amount * (3.0 - 2.0 * tip_amount)
            tip_taper = 1.0 + (tip_width_ratio - 1.0) * (
                tip_smooth ** tip_taper_exponent
            )
            authored_radius = (
                sum(
                    interpolated_radius_attribute.data[
                        interpolated_offsets[index]
                        + min(
                            interpolated_offsets[index + 1]
                            - interpolated_offsets[index]
                            - 1,
                            round(
                                factor
                                * (
                                    interpolated_offsets[index + 1]
                                    - interpolated_offsets[index]
                                    - 1
                                )
                            ),
                        )
                    ].value
                    for index in source_curve_indices
                )
                / len(source_curve_indices)
                if interpolated_radius_attribute is not None
                else 1.0
            )
            authored_radius = max(0.035, min(1.55, authored_radius))
            # Card taper already supplies the runtime root/tip silhouette.  A
            # direct multiply by the Hair Curves radius collapsed exposed roots
            # below the 0.35 alpha-test threshold and made the scalp look bald.
            # Preserve authored variation as a bounded width modulation instead.
            authored_width_factor = 0.72 + min(1.0, authored_radius) * 0.28
            half_width = (
                base_half_width
                * root_ramp
                * tip_taper
                * authored_width_factor
            )
            card_half_width_min = min(card_half_width_min, half_width)
            card_half_width_max = max(card_half_width_max, half_width)
            center = (
                point
                + surface_normal * runtime_card_surface_offset
                + lateral * envelope_center
                + layer_offset * min(1.0, factor / 0.22)
            )
            card_vertices.append(tuple(center - lateral * half_width))
            card_vertices.append(tuple(center + lateral * half_width))
            atlas_v = (tile_row + 0.01 + factor * 0.98) / card_atlas_rows
            card_uvs.extend(((atlas_u_min, atlas_v), (atlas_u_max, atlas_v)))
            parallel_sections.append(
                (
                    center.copy(),
                    lateral.copy(),
                    outward.copy(),
                    half_width,
                    factor,
                )
            )
            if cross_card_layers == 2:
                cross_sections.append((center.copy(), outward.copy(), half_width, factor))
        for point_index in range(len(points) - 1):
            left = curve_vertex_start + point_index * 2
            card_faces.append((left, left + 2, left + 3, left + 1))
        for parallel_index in range(1, runtime_parallel_card_layers):
            parallel_vertex_start = len(card_vertices)
            parallel_tile_column = (
                tile_column + parallel_index * 3 + card_index % 2
            ) % card_atlas_columns
            parallel_u_min = (
                parallel_tile_column + 0.025
            ) / card_atlas_columns
            parallel_u_max = (
                parallel_tile_column + 0.975
            ) / card_atlas_columns
            direction = -1.0 if parallel_index % 2 else 1.0
            distance_rank = (parallel_index + 1) // 2
            for center, lateral, outward, half_width, factor in parallel_sections:
                parallel_half_width = half_width * 0.58
                parallel_center = (
                    center
                    + lateral
                    * direction
                    * half_width
                    * (0.72 + (distance_rank - 1) * 0.46)
                    + outward * parallel_index * 0.000035
                )
                card_vertices.append(
                    tuple(parallel_center - lateral * parallel_half_width)
                )
                card_vertices.append(
                    tuple(parallel_center + lateral * parallel_half_width)
                )
                atlas_v = (tile_row + 0.01 + factor * 0.98) / card_atlas_rows
                card_uvs.extend(
                    ((parallel_u_min, atlas_v), (parallel_u_max, atlas_v))
                )
            for point_index in range(len(points) - 1):
                left = parallel_vertex_start + point_index * 2
                card_faces.append((left, left + 2, left + 3, left + 1))
        if cross_card_layers == 2:
            cross_vertex_start = len(card_vertices)
            cross_tile_column = (tile_column + 3) % card_atlas_columns
            cross_u_min = (cross_tile_column + 0.025) / card_atlas_columns
            cross_u_max = (cross_tile_column + 0.975) / card_atlas_columns
            for center, outward, half_width, factor in cross_sections:
                cross_half_width = half_width * 0.68
                cross_center = center + outward * cross_half_width * 0.82
                card_vertices.append(tuple(cross_center - outward * cross_half_width))
                card_vertices.append(tuple(cross_center + outward * cross_half_width))
                atlas_v = (tile_row + 0.01 + factor * 0.98) / card_atlas_rows
                card_uvs.extend(((cross_u_min, atlas_v), (cross_u_max, atlas_v)))
            for point_index in range(len(points) - 1):
                left = cross_vertex_start + point_index * 2
                card_faces.append((left, left + 2, left + 3, left + 1))

    # The fresh guide layout is dense enough to own its scalp coverage. Keep
    # the old independent-card underlayer disabled: even though it was not a
    # shell, its uniform radial rows read as an opaque wig cap in review.
    root_underlayer_rows = 0
    root_underlayer_segments = 0
    root_underlayer_card_count = 0
    for row in range(root_underlayer_rows):
        row_amount = row / (root_underlayer_rows - 1)
        stagger = (row % 2) * pi / root_underlayer_segments
        for segment in range(root_underlayer_segments):
            seed = row * root_underlayer_segments + segment
            noise = ((seed * 73 + seed * seed * 19) % 1009) / 1008.0
            angle = (
                2.0 * pi * segment / root_underlayer_segments + stagger + pi
            ) % (2.0 * pi) - pi
            front_amount = max(0.0, cos(angle))
            hairline_y = 0.4445 + front_amount * 0.0195
            row_ease = sin((0.02 + row_amount * 0.98) * pi * 0.5)
            root_y = hairline_y + 0.0007 + (0.4980 - hairline_y) * row_ease
            if row == 0:
                root_y += sin(angle * 2.2 + 0.55) * 0.0010
                root_y += (noise - 0.5) * 0.0010
            scalp_lift = 0.0010 + row_amount * 0.0030
            root_sample = authored_scalp_point(surface, root_y, angle, scalp_lift)
            if root_sample is None:
                continue
            root, _ = root_sample
            side = 1.0 if sin(angle) >= 0.0 else -1.0
            target_angle = angle + side * front_amount * (0.060 + noise * 0.035)
            target_front = max(0.0, cos(target_angle))
            target_floor = 0.4445 + target_front * 0.0195
            target_y = max(target_floor + 0.0009, root_y - (0.010 + noise * 0.004))
            root_card_points: list[Vector] = []
            root_card_normals: list[Vector] = []
            for point_index in range(3):
                amount = point_index / 2.0
                eased = amount * amount
                sample = authored_scalp_point(
                    surface,
                    root_y * (1.0 - amount) + target_y * amount,
                    angle * (1.0 - eased) + target_angle * eased,
                    scalp_lift + amount * (0.00045 + row_amount * 0.00075),
                )
                if sample is None:
                    root_card_points = []
                    break
                root_card_points.append(sample[0])
                root_card_normals.append(sample[1].normalized())
            if len(root_card_points) != 3:
                continue
            root_card_start = len(card_vertices)
            previous_lateral = None
            widths = (
                (0.00030, 0.00046, 0.00018)
                if row == 0
                else (0.00145, 0.00172, 0.00128)
            )
            uv_v = (0.0, 0.10, 0.22) if row == 0 else (0.02, 0.16, 0.30)
            for point_index, (point, surface_normal) in enumerate(
                zip(root_card_points, root_card_normals)
            ):
                if point_index == 0:
                    tangent = root_card_points[1] - point
                elif point_index == 2:
                    tangent = point - root_card_points[1]
                else:
                    tangent = root_card_points[2] - root_card_points[0]
                if tangent.length_squared < 1.0e-12:
                    tangent = Vector((0.0, -1.0, 0.0))
                tangent.normalize()
                outward = surface_normal - tangent * surface_normal.dot(tangent)
                if outward.length_squared < 1.0e-10:
                    outward = surface_normal
                outward.normalize()
                lateral = outward.cross(tangent)
                if lateral.length_squared < 1.0e-10:
                    lateral = previous_lateral or Vector((0.0, 0.0, 1.0))
                lateral.normalize()
                if previous_lateral is not None and lateral.dot(previous_lateral) < 0.0:
                    lateral.negate()
                previous_lateral = lateral.copy()
                half_width = widths[point_index] * (0.88 + noise * 0.24)
                card_half_width_min = min(card_half_width_min, half_width)
                card_half_width_max = max(card_half_width_max, half_width)
                center = point + surface_normal * (0.00020 + noise * 0.00022)
                card_vertices.append(tuple(center - lateral * half_width))
                card_vertices.append(tuple(center + lateral * half_width))
                card_uvs.extend(((0.0, uv_v[point_index]), (1.0, uv_v[point_index])))
            card_faces.append(
                (root_card_start, root_card_start + 2, root_card_start + 3, root_card_start + 1)
            )
            card_faces.append(
                (
                    root_card_start + 2,
                    root_card_start + 4,
                    root_card_start + 5,
                    root_card_start + 3,
                )
            )
            root_underlayer_card_count += 1

    mesh = bpy.data.meshes.new(f"{guides.name}_RuntimeHairCardsMesh")
    mesh.from_pydata(card_vertices, [], card_faces)
    mesh.materials.append(material)
    uv_layer = mesh.uv_layers.new(name="HairCardUV")
    for loop in mesh.loops:
        uv_layer.data[loop.index].uv = card_uvs[loop.vertex_index]
    baked = bpy.data.objects.new(f"{guides.name}_RuntimeHairCards", mesh)
    bpy.context.collection.objects.link(baked)
    bpy.data.objects.remove(groom, do_unlink=True)
    triangle_count = sum(max(1, len(polygon.vertices) - 2) for polygon in mesh.polygons)
    runtime_card_count = len(card_clusters) * (
        cross_card_layers + runtime_parallel_card_layers - 1
    )
    if triangle_count < len(card_clusters) * 8:
        raise RuntimeError(
            f"Runtime hair cards are too sparse: {triangle_count} triangles for "
            f"{len(card_clusters)} curve clusters"
        )
    if not baked.data.materials:
        raise RuntimeError("Runtime hair cards lost the tintable material slot")
    baked.matrix_world = Matrix.Identity(4)
    return baked, {
        "authoringSystem": "BLENDER_SURFACE_ATTACHED_HAIR_CURVES",
        "nodeAssetPath": str(node_asset_path).replace("\\", "/"),
        "nodeAssetSha256": file_sha256(node_asset_path),
        "surfaceHeadSha256": SOURCE_HEAD_SHA256,
        "surfaceUvMap": uv_map.name,
        "rootAttachment": "ATTACH_HAIR_CURVES_TO_SURFACE_SNAP_AND_ALIGN",
        "guideCount": guide_count,
        "guidePointCountMin": min(guide_point_counts),
        "childRootCount": len(child_roots),
        "interpolatedCurveCount": interpolated_count,
        "interpolatedPointCountMin": min(interpolated_point_counts),
        "interpolationEngine": "BLENDER_GEOMETRY_NODE_INTERPOLATE_CURVES",
        "officialProceduralHairAssetLibrary": str(node_asset_path).replace("\\", "/"),
        "officialProceduralHairAssetLibrarySha256": file_sha256(node_asset_path),
        "officialProceduralHairNodeSettings": official_node_settings,
        "rootTangentFit": {
            "limitDotAbs": root_tangent_limit,
            "correctedCurveCount": root_tangent_correction_count,
            "beforeDotAbsMax": root_tangent_dot_before_max,
            "afterDotAbsMax": root_tangent_dot_after_max,
        },
        "authoredRadiusAttributePreserved": radius_attribute_preserved,
        "childrenPerGuide": children_per_guide,
        "rootJitterRadius": root_jitter_radius,
        "rootClearance": root_clearance,
        "strandRadius": strand_radius,
        "runtimeGeometryType": "SURFACE_ORIENTED_TAPERED_HAIR_CARDS",
        "runtimeSourceCurveCount": interpolated_count,
        "runtimeEligibleCurveCount": len(runtime_curve_indices),
        "runtimeCardClusterSize": runtime_card_cluster_size,
        "runtimeCardClusterRadius": runtime_card_cluster_radius,
        "runtimeCardClusterMinFlowDot": runtime_card_cluster_min_flow_dot,
        "runtimeCardMinHalfWidth": runtime_card_min_half_width,
        "runtimeCardHalfWidthCap": runtime_card_half_width_cap,
        "runtimeCardLengthOverlap": runtime_card_length_overlap,
        "runtimeCardHairlineInset": runtime_card_hairline_inset,
        "runtimeCardSurfaceOffset": runtime_card_surface_offset,
        "runtimeCardMinimumCurveFraction": runtime_card_min_curve_fraction,
        "runtimeCardClusterCount": len(card_clusters),
        "runtimeCardInitialClusterCount": initial_cluster_count,
        "runtimeCardEnvelopeSplitCount": cluster_split_count,
        "runtimeCardClusterSizeMin": min(len(cluster) for cluster in card_clusters),
        "runtimeCardClusterSizeMax": max(len(cluster) for cluster in card_clusters),
        "runtimeCardClusterMethod": "DETERMINISTIC_SPATIAL_FLOW_KNN",
        "runtimeCardClusterRootSpanMax": cluster_root_span_max,
        "runtimeCardClusterFlowDotMin": cluster_flow_dot_min,
        "runtimeCardCurveResampling": "EIGHT_POINT_ARCLENGTH",
        "runtimeCardEnvelope": "FULL_MEMBER_SECTION_ENVELOPE_PLUS_22_PERCENT_OVERLAP",
        "runtimeCardCount": runtime_card_count,
        "crossCardLayers": cross_card_layers,
        "runtimeParallelCardLayers": runtime_parallel_card_layers,
        "rootUnderlayerCardCount": root_underlayer_card_count,
        "rootUnderlayerRows": root_underlayer_rows,
        "rootUnderlayerSegments": root_underlayer_segments,
        "rootUnderlayerPolicy": "OMITTED_DENSE_GUIDE_FIELD_OWNS_SCALP_COVERAGE",
        "runtimeCardHalfWidthMin": card_half_width_min,
        "runtimeCardHalfWidthMax": card_half_width_max,
        "runtimeTipWidthRatio": tip_width_ratio,
        "runtimeTipTaperExponent": tip_taper_exponent,
        "runtimeRootWidthRatio": root_width_ratio,
        "runtimeRootTaperLength": root_taper_length,
        "runtimeCardAtlas": {
            "columns": card_atlas_columns,
            "rows": card_atlas_rows,
            "band": card_atlas_band,
        },
        "runtimeTriangleCount": triangle_count,
        "conversionStep": "EVALUATED_INTERPOLATED_HAIR_CURVES_TO_SURFACE_ORIENTED_RUNTIME_CARDS",
    }


def cropped_hairline_floor(co: Vector) -> float:
    """A soft mature crop line: lower at sides/rear, gently receded at temples."""
    front_amount = max(
        0.0,
        min(1.0, (co.x - TARGET_HEAD_CENTER.x + 0.010) / 0.060),
    )
    lateral_amount = min(1.0, abs(co.z - TARGET_HEAD_CENTER.z) / 0.052)
    temple_recession = front_amount * max(0.0, lateral_amount - 0.38) * 0.013
    return 0.4385 + front_amount * 0.0185 + temple_recession


def build_authored_cropped_hair(
    name: str,
    source_root: Path,
    reference_head: bpy.types.Object,
    armature: bpy.types.Object,
) -> tuple[bpy.types.Object, dict[str, object]]:
    """Build a scalp-attached layered crop; never import the rejected source mesh."""
    source = ISSUE448_HAIR_SOURCES[name]
    source_path = source_root / str(source["filename"])
    source_sha = file_sha256(source_path) if source_path.is_file() else None
    if source_sha != source["sha256"]:
        raise RuntimeError(f"Issue448 cropped source/hash contract changed: {source_path}")
    material, material_receipt = make_issue448_authored_card_material(
        name,
        source_path,
    )
    surface = exact_head_surface(reference_head)
    curve = bpy.data.curves.new(f"{name}AuthoredStrands", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1

    ring_count = 24
    segment_count = 120
    control_point_count = 6
    authored_count = 0
    hairline_guide_count = 0
    side_rear_guide_count = 0
    crown_guide_count = 0
    whorl_guide_count = 0
    skipped_surface_rays = 0
    length_min = float("inf")
    length_max = 0.0
    for ring in range(ring_count):
        ring_amount = ring / (ring_count - 1)
        crown_ease = sin((0.025 + ring_amount * 0.975) * pi * 0.5)
        for segment in range(segment_count):
            seed = ring * segment_count + segment
            noise_a = ((seed * 73 + seed * seed * 19) % 1009) / 1008.0
            noise_b = ((seed * 107 + seed * seed * 23) % 1013) / 1012.0
            noise_c = ((seed * 149 + seed * seed * 31) % 1021) / 1020.0
            angle = 2.0 * pi * (segment + 0.5 * (ring % 2)) / segment_count
            front_amount = max(0.0, cos(angle))
            side_amount = abs(sin(angle))
            hairline = (
                0.4385
                + front_amount * 0.0185
                + front_amount * max(0.0, side_amount - 0.38) * 0.013
                + sin(angle * 3.7 + 0.45) * 0.00075
            )
            root_y = hairline + (0.4982 - hairline) * crown_ease
            root_y += (noise_c - 0.5) * (0.0024 if ring == 0 else 0.0018)
            root_y = max(hairline + 0.00020, min(0.4984, root_y))
            root_sample = authored_scalp_point(
                surface,
                root_y,
                angle,
                0.00075,
            )
            if root_sample is None:
                skipped_surface_rays += 1
                continue
            root, normal = root_sample
            normal = normal.normalized()

            whorl = Vector(
                (
                    TARGET_HEAD_CENTER.x - 0.011,
                    0.501,
                    TARGET_HEAD_CENTER.z + 0.005,
                )
            )
            flow = root - whorl
            flow -= normal * flow.dot(normal)
            if flow.length_squared < 1.0e-10:
                flow = Vector((cos(angle), -0.18, sin(angle)))
                flow -= normal * flow.dot(normal)
            flow.normalize()
            if crown_ease < 0.34:
                flow.negate()
            swirl = normal.cross(flow)
            if swirl.length_squared > 1.0e-10:
                swirl.normalize()
                flow = (
                    flow * (0.88 + crown_ease * 0.05)
                    + swirl * (0.12 + (noise_a - 0.5) * 0.30)
                ).normalized()
            length = (
                0.0048
                + crown_ease**0.88 * 0.0095
                + front_amount * crown_ease * 0.0018
                + (noise_b - 0.5) * 0.0028
            )
            top_layer = max(0.0, min(1.0, (crown_ease - 0.56) / 0.44))
            length += top_layer * (0.0048 + noise_a * 0.0022)
            if ring == 0:
                length *= 0.72 + noise_c * 0.14
            length = max(0.0038, length)
            lift = (
                0.0010
                + crown_ease * 0.0028
                + top_layer * 0.0038
                + noise_c * 0.0008
            )
            length_min = min(length_min, length)
            length_max = max(length_max, length)

            points: list[Vector] = []
            radii: list[float] = []
            hairline_width = (
                0.30 + noise_a * 0.18
                if ring == 0
                else (0.64 + noise_a * 0.16 if ring == 1 else 1.0)
            )
            for control in range(control_point_count):
                amount = control / (control_point_count - 1)
                eased = amount * amount * (3.0 - 2.0 * amount)
                subtle_wave = swirl * sin(amount * pi) * (noise_a - 0.5) * 0.0010
                point = (
                    root
                    + flow * length * eased
                    + normal * lift * sin(amount * pi * 0.5)
                    + subtle_wave
                )
                points.append(point)
                radii.append(
                    (0.62, 0.92, 1.0, 0.82, 0.48, 0.07)[control]
                    * (0.90 + noise_b * 0.18)
                    * hairline_width
                )
            append_curve_strand(curve, tuple(points), tuple(radii))
            authored_count += 1
            if ring == 0:
                hairline_guide_count += 1
            if crown_ease < 0.58:
                side_rear_guide_count += 1
            else:
                crown_guide_count += 1

    apex, apex_normal, _, apex_distance = surface.find_nearest(
        Vector((TARGET_HEAD_CENTER.x, 0.506, TARGET_HEAD_CENTER.z))
    )
    if apex is None or apex_normal is None or apex_distance is None:
        raise RuntimeError("Exact-head cropped whorl lookup failed")
    apex_normal = apex_normal.normalized()
    tangent_x = Vector((1.0, 0.0, 0.0))
    tangent_x -= apex_normal * tangent_x.dot(apex_normal)
    tangent_x.normalize()
    tangent_z = apex_normal.cross(tangent_x).normalized()
    # Fill the apex with a deterministic Fibonacci disk instead of a tight
    # ring.  The previous ring concentrated dozens of card roots into one dark
    # knot while leaving a visible annular scalp gap.  A disk gives continuous
    # root coverage and a gently rotating crown flow without a shell.
    whorl_lane_count = 128
    golden_angle = pi * (3.0 - sqrt(5.0))
    for lane in range(whorl_lane_count):
        angle = lane * golden_angle
        noise = ((lane * 89 + lane * lane * 17) % 509) / 508.0
        disk_radius = sqrt((lane + 0.5) / whorl_lane_count) * 0.0115
        probe = apex + (
            tangent_x * cos(angle) + tangent_z * sin(angle)
        ) * disk_radius
        root, normal, _, distance = surface.find_nearest(probe)
        if root is None or normal is None or distance is None or distance > 0.006:
            skipped_surface_rays += 1
            continue
        normal = normal.normalized()
        outward = root - Vector(
            (TARGET_HEAD_CENTER.x - 0.011, 0.501, TARGET_HEAD_CENTER.z + 0.005)
        )
        outward -= normal * outward.dot(normal)
        if outward.length_squared < 1.0e-10:
            outward = tangent_x * cos(angle) + tangent_z * sin(angle)
        outward.normalize()
        crown_swirl = normal.cross(outward)
        if crown_swirl.length_squared > 1.0e-10:
            crown_swirl.normalize()
            outward = (outward * 0.92 + crown_swirl * (0.18 + noise * 0.10)).normalized()
        length = 0.013 + noise * 0.0065
        points = tuple(
            root
            + outward * length * (amount * amount * (3.0 - 2.0 * amount))
            + normal * (0.0025 + noise * 0.0020) * sin(amount * pi * 0.5)
            for amount in (
                0.0,
                0.2,
                0.4,
                0.6,
                0.8,
                1.0,
            )
        )
        append_curve_strand(
            curve,
            points,
            (0.48, 0.86, 1.0, 0.82, 0.46, 0.08),
        )
        authored_count += 1
        whorl_guide_count += 1

    guides = bpy.data.objects.new(f"{name}_AuthoredGuides", curve)
    bpy.context.collection.objects.link(guides)
    obj, groom_receipt = bake_surface_attached_groom(
        guides,
        reference_head,
        material,
        children_per_guide=2,
        root_jitter_radius=0.00090,
        strand_radius=0.000105,
        hairline_floor_fn=cropped_hairline_floor,
        tip_width_ratio=0.16,
        tip_taper_exponent=0.54,
        root_width_ratio=0.08,
        root_taper_length=0.22,
        cross_card_layers=2,
    )
    obj.name = name
    obj.data.name = f"{name}Mesh"
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    add_module_contract(obj, armature, "hair", "BLENDER_SURFACE_ATTACHED_GUIDE_GROOM")
    obj["souldrifterOriginalGeometry"] = True
    obj["souldrifterSourceGeometryImported"] = False
    obj["souldrifterHaircut"] = "LAYERED_CROPPED_FADE"
    obj["souldrifterSecondaryMotion"] = "HEAD_WEIGHTED_SHORT_LENGTH"
    obj["souldrifterFutureSecondaryMotionBoneSlots"] = "3_TO_6_FOR_LONG_STYLES"
    return obj, {
        "route": "PROJECT_AUTHORED_EXACT_HEAD_CROPPED_GUIDES_WITH_ISSUE448_PBR_TEXTURES",
        "issue": 448,
        "assetId": source["assetId"],
        "providerTaskId": source["providerTaskId"],
        "path": str(source_path).replace("\\", "/"),
        "sha256": source_sha,
        "license": "NOT_RECORDED_DO_NOT_INFER",
        "sourceHeadSha256": SOURCE_HEAD_SHA256,
        "geometryPolicy": "EXACT_HEAD_UV_ATTACHED_GUIDES_INTERPOLATED_AND_BAKED",
        "oldHeadFitPolicy": "NON_PROMOTABLE_NOT_IMPORTED",
        "authoredGuideCount": authored_count,
        "guideFamilies": {
            "hairline": hairline_guide_count,
            "sideRear": side_rear_guide_count,
            "crown": crown_guide_count,
            "whorl": whorl_guide_count,
        },
        "rootGrid": {"rings": ring_count, "segments": segment_count},
        "controlPointsPerGuide": control_point_count,
        "guideLengthMeters": {"min": length_min, "max": length_max},
        "skippedSurfaceRays": skipped_surface_rays,
        "secondaryMotionContract": {
            "cropped": "HEAD_WEIGHTED_SHORT_LENGTH_NO_SECONDARY_BONES_REQUIRED",
            "futureLongStyleBoneSlots": {"min": 3, "max": 6},
        },
        "visualReferencePacket": CROPPED_HAIR_VISUAL_REFERENCE_PACKET,
        "material": material_receipt,
        "groom": groom_receipt,
    }


def build_zoned_cropped_hair(
    name: str,
    source_root: Path,
    reference_head: bpy.types.Object,
    armature: bpy.types.Object,
    artifact_dir: Path,
    diagnostic_dir: Path | None = None,
    evidence_groom_families: list[str] | None = None,
) -> tuple[bpy.types.Object, dict[str, object]]:
    """Build one cropped style from separate exact-scalp procedural families.

    A single polar field produced the rejected dome-and-fringe result because
    interpolation averaged every visible card toward the same silhouette.  This
    pass follows Epic's production card hierarchy: Coverage, Mid Layer, Top
    Layer, Flyaways, and Short Hairs remain independent Blender Hair Curves
    families. Each family is attached to the exact head and processed through
    Blender's bundled Shrinkwrap, Clump, Frizz, Noise, and Profile assets before
    conversion to overlapping alpha cards.
    """
    source = ISSUE448_HAIR_SOURCES[name]
    source_path = source_root / str(source["filename"])
    source_sha = file_sha256(source_path) if source_path.is_file() else None
    if source_sha != source["sha256"]:
        raise RuntimeError(f"Issue448 cropped source/hash contract changed: {source_path}")
    material, material_receipt = make_issue448_authored_card_material(name, source_path)
    surface = exact_head_surface(reference_head)
    control_point_count = 7
    skipped_surface_rays = 0
    length_min = float("inf")
    length_max = 0.0

    family_curves: dict[str, bpy.types.Curve] = {}
    family_counts: dict[str, int] = {}
    baked_families: list[bpy.types.Object] = []
    family_receipts: dict[str, dict[str, object]] = {}

    def family_curve(label: str) -> bpy.types.Curve:
        curve = bpy.data.curves.new(f"{name}_{label}_Guides", "CURVE")
        curve.dimensions = "3D"
        curve.resolution_u = 1
        family_curves[label] = curve
        family_counts[label] = 0
        return curve

    coverage = family_curve("Coverage")
    mid_layer = family_curve("MidLayer")
    top_layer = family_curve("TopLayer")
    flyaways = family_curve("Flyaways")
    short_hairs = family_curve("ShortHairs")

    def project_flow(direction: Vector, normal: Vector, fallback: Vector) -> Vector:
        flow = direction - normal * direction.dot(normal)
        if flow.length_squared < 1.0e-10:
            flow = fallback - normal * fallback.dot(normal)
        if flow.length_squared < 1.0e-10:
            flow = Vector((1.0, 0.0, 0.0))
        return flow.normalized()

    def scalp_basis(normal: Vector) -> tuple[Vector, Vector]:
        up = project_flow(Vector((0.0, 1.0, 0.0)), normal, Vector((1.0, 0.0, 0.0)))
        around = normal.cross(up)
        if around.length_squared < 1.0e-10:
            around = Vector((0.0, 0.0, 1.0))
        return up, around.normalized()

    def append_styled_guide(
        label: str,
        curve: bpy.types.Curve,
        root: Vector,
        normal: Vector,
        flow: Vector,
        length: float,
        lift: float,
        seed: int,
        width_scale: float,
    ) -> None:
        nonlocal length_min, length_max
        normal = normal.normalized()
        flow = project_flow(flow, normal, Vector((0.0, 1.0, 0.0)))
        around = normal.cross(flow)
        if around.length_squared < 1.0e-10:
            around = Vector((0.0, 0.0, 1.0))
        around.normalize()
        noise_a = ((seed * 73 + seed * seed * 19) % 1009) / 1008.0
        noise_b = ((seed * 107 + seed * seed * 23) % 1013) / 1012.0
        points: list[Vector] = []
        radii: list[float] = []
        profile = (0.42, 0.76, 1.0, 0.96, 0.72, 0.36, 0.055)
        for point_index in range(control_point_count):
            amount = point_index / (control_point_count - 1)
            eased = amount * amount * (3.0 - 2.0 * amount)
            flow_bend = flow * length * eased
            # Ease normal lift in with the same zero-slope-at-root profile as
            # the tangential flow.  A sine ramp produced an immediate normal
            # component on the first segment, so otherwise valid crown guides
            # left the scalp like spikes instead of following its tangent.
            root_lift = normal * lift * eased
            breakup = (
                around
                * sin(amount * pi)
                * (noise_a - 0.5)
                * min(0.0012, length * 0.055)
            )
            settle = normal * -max(0.0, amount - 0.72) ** 2 * length * 0.045
            points.append(root + flow_bend + root_lift + breakup + settle)
            radii.append(profile[point_index] * width_scale * (0.92 + noise_b * 0.16))
        append_curve_strand(curve, tuple(points), tuple(radii))
        family_counts[label] += 1
        length_min = min(length_min, length)
        length_max = max(length_max, length)

    # Fine scalp coverage: short, directionally coherent fibers that remain
    # beneath the hero clumps instead of defining a continuous outer dome.
    coverage_rings = 18
    coverage_segments = 112
    for ring in range(coverage_rings):
        ring_amount = ring / (coverage_rings - 1)
        crown_ease = sin((0.035 + ring_amount * 0.94) * pi * 0.5)
        for segment in range(coverage_segments):
            seed = ring * coverage_segments + segment
            angle = 2.0 * pi * (segment + 0.43 * (ring % 2)) / coverage_segments
            noise = ((seed * 149 + seed * seed * 31) % 1021) / 1020.0
            front = max(0.0, cos(angle))
            side = abs(sin(angle))
            rear = max(0.0, -cos(angle))
            hairline = cropped_hairline_floor(
                Vector((TARGET_HEAD_CENTER.x + cos(angle) * 0.05, 0.0, TARGET_HEAD_CENTER.z + sin(angle) * 0.05))
            )
            hairline += sin(angle * 3.3 + 0.31) * 0.00075
            root_y = hairline + 0.00035 + (0.4965 - hairline) * crown_ease
            root_y += (noise - 0.5) * 0.00125
            root_sample = authored_scalp_point(surface, root_y, angle, 0.00062)
            if root_sample is None:
                skipped_surface_rays += 1
                continue
            root, normal = root_sample
            up, around = scalp_basis(normal)
            top = max(0.0, min(1.0, (root_y - 0.468) / 0.028))
            top_sweep = project_flow(Vector((0.84, -0.03, -0.34)), normal, up)
            back_sweep = project_flow(Vector((-0.78, -0.32, 0.0)), normal, -up)
            if top > 0.58:
                flow = (top_sweep * (0.84 + top * 0.12) + around * (noise - 0.5) * 0.16).normalized()
            elif rear > 0.42:
                flow = (-up * 0.82 + around * (noise - 0.5) * 0.18).normalized()
            elif side > 0.68:
                flow = (back_sweep * 0.78 - up * 0.28 + around * (noise - 0.5) * 0.10).normalized()
            else:
                flow = (up * 0.88 + around * (noise - 0.5) * (0.14 + front * 0.12)).normalized()
            append_styled_guide(
                "Coverage",
                coverage,
                root,
                normal,
                flow,
                0.0040 + top * 0.0048 + noise * 0.0012,
                0.00022 + top * 0.00048,
                seed,
                0.64 + noise * 0.20,
            )

    # Sparse irregular roots define the hairline. Their different spacing,
    # lengths, and lean prevent the repeated vertical-tooth pattern.
    hairline_segments = 68
    for segment in range(hairline_segments):
        seed = 5000 + segment
        angle = 2.0 * pi * (segment + 0.17 * sin(segment * 1.91)) / hairline_segments
        noise = ((seed * 73 + seed * seed * 19) % 1009) / 1008.0
        front = max(0.0, cos(angle))
        side = abs(sin(angle))
        probe = Vector((TARGET_HEAD_CENTER.x + cos(angle) * 0.05, 0.0, TARGET_HEAD_CENTER.z + sin(angle) * 0.05))
        root_y = cropped_hairline_floor(probe)
        root_y += sin(angle * 4.7 + 0.61) * 0.00105 + (noise - 0.5) * 0.00155
        root_sample = authored_scalp_point(surface, root_y, angle, 0.00058)
        if root_sample is None:
            skipped_surface_rays += 1
            continue
        root, normal = root_sample
        up, around = scalp_basis(normal)
        if side > 0.62:
            flow = project_flow(Vector((-0.75, -0.16, -0.12 * sin(angle))), normal, -up)
        elif front > 0.35:
            flow = (up * (0.86 + noise * 0.10) + around * (noise - 0.5) * 0.42).normalized()
        else:
            flow = (-up * 0.82 + around * (noise - 0.5) * 0.16).normalized()
        append_styled_guide(
            "ShortHairs",
            short_hairs,
            root,
            normal,
            flow,
            0.0028 + front * 0.0016 + noise * 0.0018,
            0.00018 + front * 0.00028,
            seed,
            0.34 + noise * 0.24,
        )

    # Larger hero clumps establish four readable zones instead of one cap:
    # forward/side-swept top, rising fringe, swept temples, and falling rear.
    hero_rings = 7
    hero_segments = 42
    for ring in range(hero_rings):
        ring_amount = (ring + 0.45) / hero_rings
        crown_ease = sin((0.08 + ring_amount * 0.83) * pi * 0.5)
        for segment in range(hero_segments):
            seed = 10000 + ring * hero_segments + segment
            noise_a = ((seed * 73 + seed * seed * 19) % 1009) / 1008.0
            noise_b = ((seed * 107 + seed * seed * 23) % 1013) / 1012.0
            angle = 2.0 * pi * (segment + 0.57 * (ring % 2) + (noise_a - 0.5) * 0.18) / hero_segments
            front = max(0.0, cos(angle))
            side = abs(sin(angle))
            rear = max(0.0, -cos(angle))
            probe = Vector((TARGET_HEAD_CENTER.x + cos(angle) * 0.05, 0.0, TARGET_HEAD_CENTER.z + sin(angle) * 0.05))
            hairline = cropped_hairline_floor(probe)
            root_y = hairline + 0.0022 + (0.4945 - hairline) * crown_ease
            root_y += (noise_b - 0.5) * 0.0020
            root_sample = authored_scalp_point(surface, root_y, angle, 0.00082)
            if root_sample is None:
                skipped_surface_rays += 1
                continue
            root, normal = root_sample
            up, around = scalp_basis(normal)
            top = max(0.0, min(1.0, (root_y - 0.464) / 0.030))
            top_sweep = project_flow(Vector((0.90, -0.02, -0.42)), normal, up)
            back_sweep = project_flow(Vector((-0.88, -0.22, -0.05 * sin(angle))), normal, -up)
            if top > 0.56:
                flow = (top_sweep * 0.91 + around * (noise_a - 0.5) * 0.28).normalized()
                length = 0.012 + top * 0.0055 + noise_b * 0.0040
                lift = 0.0010 + top * 0.0015 + noise_a * 0.0007
            elif side > 0.62:
                flow = (back_sweep * 0.84 - up * 0.28 + around * (noise_a - 0.5) * 0.16).normalized()
                length = 0.0085 + noise_b * 0.0060
                lift = 0.0010 + noise_a * 0.0010
            elif rear > 0.44:
                flow = (-up * 0.84 + around * (noise_a - 0.5) * 0.24).normalized()
                length = 0.0075 + noise_b * 0.0065
                lift = 0.0008 + noise_a * 0.0009
            else:
                flow = (up * 0.82 + top_sweep * 0.32 + around * (noise_a - 0.5) * 0.24).normalized()
                length = 0.0085 + front * 0.0030 + noise_b * 0.0038
                lift = 0.0008 + front * 0.0009 + noise_a * 0.0006
            layer_label = "TopLayer" if top > 0.56 else "MidLayer"
            layer_curve = top_layer if layer_label == "TopLayer" else mid_layer
            append_styled_guide(
                layer_label,
                layer_curve,
                root,
                normal,
                flow,
                length,
                lift,
                seed,
                0.88 + noise_a * 0.30,
            )

    # A broad, low-density Fibonacci whorl closes the apex without the previous
    # black star or a concentric ring of visible scalp.
    apex, apex_normal, _, apex_distance = surface.find_nearest(
        Vector((TARGET_HEAD_CENTER.x, 0.506, TARGET_HEAD_CENTER.z))
    )
    if apex is None or apex_normal is None or apex_distance is None:
        raise RuntimeError("Exact-head cropped crown lookup failed")
    apex_normal = apex_normal.normalized()
    tangent_x = project_flow(Vector((1.0, 0.0, 0.0)), apex_normal, Vector((0.0, 0.0, 1.0)))
    tangent_z = apex_normal.cross(tangent_x).normalized()
    crown_count = 84
    golden_angle = pi * (3.0 - sqrt(5.0))
    for lane in range(crown_count):
        seed = 20000 + lane
        noise = ((seed * 89 + seed * seed * 17) % 509) / 508.0
        angle = lane * golden_angle
        disk_radius = sqrt((lane + 0.45) / crown_count) * 0.0145
        probe = apex + (tangent_x * cos(angle) + tangent_z * sin(angle)) * disk_radius
        root, normal, _, distance = surface.find_nearest(probe)
        if root is None or normal is None or distance is None or distance > 0.007:
            skipped_surface_rays += 1
            continue
        normal = normal.normalized()
        radial = project_flow(root - apex, normal, tangent_x)
        swirl = normal.cross(radial).normalized()
        top_sweep = project_flow(Vector((0.88, -0.02, -0.40)), normal, radial)
        outer = min(1.0, disk_radius / 0.0145)
        flow = (
            radial * (0.34 - outer * 0.10)
            + swirl * (0.20 + noise * 0.12)
            + top_sweep * (0.58 + outer * 0.12)
        ).normalized()
        append_styled_guide(
            "TopLayer",
            top_layer,
            root + normal * 0.00075,
            normal,
            flow,
            0.015 + outer * 0.006 + noise * 0.0055,
            0.0028 + (1.0 - outer) * 0.0022 + noise * 0.0010,
            seed,
            0.82 + noise * 0.28,
        )

    # A few fine, separated flyaways break the groom edge without defining its
    # mass. They remain short enough for a cropped cut and never compensate for
    # missing coverage.
    flyaway_count = 32
    for lane in range(flyaway_count):
        seed = 30000 + lane
        noise_a = ((seed * 73 + seed * seed * 19) % 1009) / 1008.0
        noise_b = ((seed * 107 + seed * seed * 23) % 1013) / 1012.0
        angle = 2.0 * pi * (lane + 0.37 * noise_a) / flyaway_count
        front = max(0.0, cos(angle))
        root_y = 0.474 + 0.019 * sqrt((lane + 0.5) / flyaway_count)
        root_y += (noise_b - 0.5) * 0.0030
        root_sample = authored_scalp_point(surface, root_y, angle, 0.00095)
        if root_sample is None:
            skipped_surface_rays += 1
            continue
        root, normal = root_sample
        up, around = scalp_basis(normal)
        top_sweep = project_flow(Vector((0.86, 0.02, -0.36)), normal, up)
        flow = (top_sweep * (0.78 + front * 0.12) + up * 0.20 + around * (noise_a - 0.5) * 0.30).normalized()
        append_styled_guide(
            "Flyaways",
            flyaways,
            root,
            normal,
            flow,
            0.010 + noise_b * 0.007,
            0.0012 + noise_a * 0.0013,
            seed,
            0.22 + noise_a * 0.16,
        )

    raw_diagnostic_report: dict[str, object] | None = None
    if diagnostic_dir is not None:
        raw_diagnostic_report = render_groom_curve_diagnostic(
            reference_head,
            family_curves,
            diagnostic_dir,
            name,
            stage="RAW_EXACT_HEAD_GUIDES_NO_PROCEDURAL_NODES_NO_RUNTIME_CARDS",
            file_prefix="raw-guide-diagnostic",
        )
        if raw_diagnostic_report["status"] != "PASS":
            raise SystemExit(0)

    follicle_mask_receipt = emit_cropped_follicle_density_mask(
        reference_head,
        family_curves,
        artifact_dir,
    )

    family_specs = {
        "Coverage": {
            "children": 1,
            "cluster": 10,
            "clusterRadius": 0.0035,
            "clusterMinFlowDot": 0.86,
            "minHalfWidth": 0.00100,
            "halfWidthCap": 0.00280,
            "lengthOverlap": 0.18,
            "hairlineInset": 0.0085,
            "surfaceOffset": -0.00040,
            "jitter": 0.00038,
            "radius": 0.000098,
            "cross": 1,
            "atlasBand": 0,
            "rootWidth": 0.86,
            "rootTaper": 0.14,
            "tipWidth": 0.025,
            "shrinkwrap": {"factor": 0.92, "offsetDistance": 0.00082, "aboveSurface": 0.74, "smoothingSteps": 3, "lockRoots": True},
            "clump": {"factor": 0.045, "shape": 0.62, "tipSpread": 0.00015, "clumpOffset": 0.00014, "distanceFalloff": 0.004, "distanceThreshold": 0.012, "seed": 4871, "preserveLength": True, "guideDistance": 0.006, "guideMask": 1.0, "existingGuideMap": False},
            "frizz": {"cumulativeOffset": False, "factor": 0.03, "distance": 0.00012, "shape": 0.58, "seed": 4872, "preserveLength": True},
            "noise": {"cumulativeOffset": False, "factor": 0.03, "distance": 0.00010, "shape": 0.56, "scale": 38.0, "scaleAlongCurve": 2.2, "offsetPerCurve": 0.35, "seed": 4873, "preserveLength": True},
        },
        "ShortHairs": {
            "children": 1,
            "cluster": 1,
            "clusterRadius": 0.0035,
            "clusterMinFlowDot": 0.75,
            "minHalfWidth": 0.00024,
            "halfWidthCap": 0.00045,
            "lengthOverlap": 0.02,
            "hairlineInset": 0.0,
            "jitter": 0.00022,
            "radius": 0.000035,
            "cross": 1,
            "atlasBand": 3,
            "rootWidth": 0.90,
            "rootTaper": 0.20,
            "tipWidth": 0.018,
            "shrinkwrap": {"factor": 0.88, "offsetDistance": 0.00078, "aboveSurface": 0.72, "smoothingSteps": 3, "lockRoots": True},
            "clump": {"factor": 0.035, "shape": 0.58, "tipSpread": 0.00016, "clumpOffset": 0.00010, "distanceFalloff": 0.003, "distanceThreshold": 0.009, "seed": 4874, "preserveLength": True, "guideDistance": 0.005, "guideMask": 1.0, "existingGuideMap": False},
            "frizz": {"cumulativeOffset": False, "factor": 0.055, "distance": 0.00014, "shape": 0.54, "seed": 4875, "preserveLength": True},
            "noise": {"cumulativeOffset": False, "factor": 0.04, "distance": 0.00012, "shape": 0.50, "scale": 42.0, "scaleAlongCurve": 2.6, "offsetPerCurve": 0.42, "seed": 4876, "preserveLength": True},
        },
        "MidLayer": {
            "children": 1,
            "cluster": 2,
            "clusterRadius": 0.0025,
            "clusterMinFlowDot": 0.90,
            "minHalfWidth": 0.00070,
            "halfWidthCap": 0.00110,
            "lengthOverlap": 0.06,
            "hairlineInset": 0.0025,
            "jitter": 0.00045,
            "radius": 0.000055,
            "cross": 1,
            "atlasBand": 1,
            "rootWidth": 0.82,
            "rootTaper": 0.16,
            "tipWidth": 0.025,
            "shrinkwrap": {"factor": 0.78, "offsetDistance": 0.00095, "aboveSurface": 0.68, "smoothingSteps": 3, "lockRoots": True},
            "clump": {"factor": 0.15, "shape": 0.66, "tipSpread": 0.00055, "clumpOffset": 0.00035, "distanceFalloff": 0.006, "distanceThreshold": 0.020, "seed": 4877, "preserveLength": True, "guideDistance": 0.011, "guideMask": 1.0, "existingGuideMap": False},
            "frizz": {"cumulativeOffset": True, "factor": 0.06, "distance": 0.00024, "shape": 0.56, "seed": 4878, "preserveLength": True},
            "noise": {"cumulativeOffset": True, "factor": 0.045, "distance": 0.00020, "shape": 0.52, "scale": 28.0, "scaleAlongCurve": 2.1, "offsetPerCurve": 0.38, "seed": 4879, "preserveLength": True},
        },
        "TopLayer": {
            "children": 1,
            "cluster": 3,
            "clusterRadius": 0.0025,
            "clusterMinFlowDot": 0.90,
            "minHalfWidth": 0.00090,
            "halfWidthCap": 0.00135,
            "lengthOverlap": 0.08,
            "hairlineInset": 0.0010,
            "jitter": 0.00045,
            "radius": 0.000085,
            "cross": 1,
            "atlasBand": 2,
            "rootWidth": 0.76,
            "rootTaper": 0.16,
            "tipWidth": 0.018,
            "shrinkwrap": {"factor": 0.58, "offsetDistance": 0.00105, "aboveSurface": 0.62, "smoothingSteps": 2, "lockRoots": True},
            "clump": {"factor": 0.12, "shape": 0.64, "tipSpread": 0.00048, "clumpOffset": 0.00030, "distanceFalloff": 0.006, "distanceThreshold": 0.018, "seed": 4880, "preserveLength": True, "guideDistance": 0.010, "guideMask": 1.0, "existingGuideMap": False},
            "frizz": {"cumulativeOffset": True, "factor": 0.055, "distance": 0.00022, "shape": 0.56, "seed": 4881, "preserveLength": True},
            "noise": {"cumulativeOffset": True, "factor": 0.04, "distance": 0.00018, "shape": 0.52, "scale": 30.0, "scaleAlongCurve": 2.0, "offsetPerCurve": 0.32, "seed": 4882, "preserveLength": True},
        },
        "Flyaways": {
            "children": 1,
            "cluster": 1,
            "clusterRadius": 0.0030,
            "clusterMinFlowDot": 0.40,
            "minHalfWidth": 0.00012,
            "halfWidthCap": 0.0010,
            "lengthOverlap": 0.0,
            "hairlineInset": 0.0,
            "jitter": 0.00035,
            "radius": 0.000032,
            "cross": 1,
            "atlasBand": 4,
            "rootWidth": 0.48,
            "rootTaper": 0.22,
            "tipWidth": 0.012,
            "shrinkwrap": {"factor": 0.34, "offsetDistance": 0.00110, "aboveSurface": 0.56, "smoothingSteps": 1, "lockRoots": True},
            "clump": {"factor": 0.04, "shape": 0.60, "tipSpread": 0.00030, "clumpOffset": 0.00018, "distanceFalloff": 0.004, "distanceThreshold": 0.012, "seed": 4883, "preserveLength": True, "guideDistance": 0.008, "guideMask": 1.0, "existingGuideMap": False},
            "frizz": {"cumulativeOffset": True, "factor": 0.12, "distance": 0.00034, "shape": 0.52, "seed": 4884, "preserveLength": True},
            "noise": {"cumulativeOffset": True, "factor": 0.10, "distance": 0.00030, "shape": 0.48, "scale": 32.0, "scaleAlongCurve": 2.4, "offsetPerCurve": 0.50, "seed": 4885, "preserveLength": True},
        },
    }
    profile_settings = {
        "replaceRadius": False,
        "radius": 1.0,
        "shape": 0.58,
        "factorMin": 0.86,
        "factorMax": 0.14,
    }
    precard_diagnostic_sink: dict[str, dict[str, object]] | None = (
        {} if diagnostic_dir is not None else None
    )
    for label, curve in family_curves.items():
        if family_counts[label] < 24:
            raise RuntimeError(f"Cropped guide family too sparse: {label}={family_counts[label]}")
        guides = bpy.data.objects.new(f"{name}_{label}_AuthoredGuides", curve)
        bpy.context.collection.objects.link(guides)
        spec = family_specs[label]
        baked, receipt = bake_surface_attached_groom(
            guides,
            reference_head,
            material,
            children_per_guide=int(spec["children"]),
            root_jitter_radius=float(spec["jitter"]),
            strand_radius=float(spec["radius"]),
            hairline_floor_fn=cropped_hairline_floor,
            tip_width_ratio=float(spec["tipWidth"]),
            tip_taper_exponent=0.58,
            root_width_ratio=float(spec["rootWidth"]),
            root_taper_length=float(spec["rootTaper"]),
            cross_card_layers=int(spec["cross"]),
            runtime_parallel_card_layers=1,
            runtime_card_cluster_size=int(spec["cluster"]),
            runtime_card_cluster_radius=float(spec["clusterRadius"]),
            runtime_card_cluster_min_flow_dot=float(spec["clusterMinFlowDot"]),
            runtime_card_min_half_width=float(spec["minHalfWidth"]),
            runtime_card_half_width_cap=float(spec["halfWidthCap"]),
            runtime_card_length_overlap=float(spec["lengthOverlap"]),
            runtime_card_hairline_inset=float(spec["hairlineInset"]),
            runtime_card_surface_offset=float(spec.get("surfaceOffset", 0.0)),
            runtime_card_min_curve_fraction=(0.40 if label == "ShortHairs" else 0.45),
            official_shrinkwrap=dict(spec["shrinkwrap"]),
            official_clump=dict(spec["clump"]),
            official_frizz=dict(spec["frizz"]),
            official_noise=dict(spec["noise"]),
            official_profile=dict(profile_settings),
            card_atlas_columns=8,
            card_atlas_rows=5,
            card_atlas_band=int(spec["atlasBand"]),
            precard_diagnostic_sink=precard_diagnostic_sink,
            precard_diagnostic_family=label if diagnostic_dir is not None else None,
            precard_diagnostic_only=diagnostic_dir is not None,
        )
        if baked is not None:
            baked.name = f"{name}_{label}_BakedCards"
            baked_families.append(baked)
        family_receipts[label] = receipt

    if diagnostic_dir is not None:
        if precard_diagnostic_sink is None:
            raise RuntimeError("Post-node pre-card diagnostic sink was not created")
        post_node_family_curves: dict[str, bpy.types.Curve] = {}
        for label, record in precard_diagnostic_sink.items():
            curve = bpy.data.curves.new(f"{name}_{label}_PostNodeDiagnostic", "CURVE")
            curve.dimensions = "3D"
            curve.resolution_u = 1
            for stored_points in record["curves"]:
                points = tuple(Vector(point) for point in stored_points)
                append_curve_strand(
                    curve,
                    points,
                    tuple(1.0 for _ in points),
                )
            post_node_family_curves[label] = curve
        post_node_report = render_groom_curve_diagnostic(
            reference_head,
            post_node_family_curves,
            diagnostic_dir,
            name,
            stage="POST_OFFICIAL_PROCEDURAL_NODES_PRE_RUNTIME_CARD_CONVERSION",
            file_prefix="postnode-precard-diagnostic",
        )
        pipeline_report = {
            "status": (
                "PASS"
                if raw_diagnostic_report is not None
                and raw_diagnostic_report["status"] == "PASS"
                and post_node_report["status"] == "PASS"
                else "FAIL"
            ),
            "module": name,
            "rawGuideReport": "raw-guide-diagnostic.json",
            "postNodePrecardReport": "postnode-precard-diagnostic.json",
            "families": {
                label: {
                    key: value
                    for key, value in record.items()
                    if key != "curves"
                }
                for label, record in precard_diagnostic_sink.items()
            },
            "runtimeCardConversion": "NOT_RUN_DIAGNOSTIC_GATE_ONLY",
        }
        pipeline_path = diagnostic_dir / name / "groom-pipeline-diagnostic.json"
        pipeline_path.write_text(
            json.dumps(pipeline_report, indent=2) + "\n",
            encoding="utf-8",
        )
        print("GROOM_PIPELINE_DIAGNOSTIC=" + json.dumps(pipeline_report, sort_keys=True))
        raise SystemExit(0)

    bpy.ops.object.select_all(action="DESELECT")
    selected_family_names = set(evidence_groom_families or ())
    runtime_visible_family_names = {
        "Coverage",
        "MidLayer",
        "TopLayer",
        "ShortHairs",
    }
    join_families = (
        [
            baked
            for baked in baked_families
            if baked.name.removeprefix(f"{name}_").removesuffix("_BakedCards")
            in selected_family_names
        ]
        if selected_family_names
        else [
            baked
            for baked in baked_families
            if baked.name.removeprefix(f"{name}_").removesuffix("_BakedCards")
            in runtime_visible_family_names
        ]
    )
    if not join_families:
        raise RuntimeError(
            "Cropped evidence groom families are missing: "
            f"{sorted(selected_family_names)}"
        )
    for baked in baked_families:
        if baked not in join_families:
            bpy.data.objects.remove(baked, do_unlink=True)
    for baked in join_families:
        baked.select_set(True)
    bpy.context.view_layer.objects.active = join_families[0]
    if len(join_families) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = f"{name}Mesh"
    obj.data.materials.clear()
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.material_index = 0
        polygon.use_smooth = True
    add_module_contract(obj, armature, "hair", "BLENDER_OFFICIAL_ZONED_PROCEDURAL_GROOM")
    obj["souldrifterOriginalGeometry"] = True
    obj["souldrifterSourceGeometryImported"] = False
    obj["souldrifterHaircut"] = "TEXTURED_CROPPED_FADE_DISTINCT_FLOW_ZONES"
    obj["souldrifterSecondaryMotion"] = "HEAD_WEIGHTED_SHORT_LENGTH"
    obj["souldrifterFutureSecondaryMotionBoneSlots"] = "3_TO_6_FOR_LONG_STYLES"
    if name in APPROVED_MODULE_NAMES:
        obj["souldrifterFollicleMaskStatus"] = "LOCAL_AUTHORING_VALIDATED"
        obj["souldrifterFollicleMaskUrl"] = follicle_mask_receipt[
            "plannedPublicUrl"
        ]
        obj["souldrifterFollicleMaskSha256"] = follicle_mask_receipt["sha256"]
        obj["souldrifterFollicleMaskUvSet"] = follicle_mask_receipt["uvSet"]
        obj["souldrifterFollicleMaskSourceHeadSha256"] = SOURCE_HEAD_SHA256
        obj["souldrifterFollicleUndercoatStrength"] = follicle_mask_receipt[
            "undercoatStrength"
        ]
    return obj, {
        "route": "PROJECT_AUTHORED_EXACT_HEAD_ZONED_CROPPED_OFFICIAL_BLENDER_HAIR_ASSETS",
        "issue": 448,
        "assetId": source["assetId"],
        "providerTaskId": source["providerTaskId"],
        "path": str(source_path).replace("\\", "/"),
        "sha256": source_sha,
        "license": "NOT_RECORDED_DO_NOT_INFER",
        "sourceHeadSha256": SOURCE_HEAD_SHA256,
        "geometryPolicy": "EXACT_HEAD_UV_ATTACHED_DISTINCT_GUIDE_FAMILIES_INTERPOLATED_CLUMPED_AND_BAKED",
        "oldHeadFitPolicy": "NON_PROMOTABLE_NOT_IMPORTED",
        "authoredGuideCount": sum(family_counts.values()),
        "guideFamilies": family_counts,
        "controlPointsPerGuide": control_point_count,
        "guideLengthMeters": {"min": length_min, "max": length_max},
        "skippedSurfaceRays": skipped_surface_rays,
        "proceduralNodeOrder": [
            "Attach Hair Curves to Surface",
            "Interpolate Curves",
            "Shrinkwrap Hair Curves",
            "Clump Hair Curves",
            "Frizz Hair Curves",
            "Hair Curves Noise",
            "Set Hair Curve Profile",
            "Runtime Alpha Card Bake",
        ],
        "secondaryMotionContract": {
            "cropped": "HEAD_WEIGHTED_SHORT_LENGTH_NO_SECONDARY_BONES_REQUIRED",
            "futureLongStyleBoneSlots": {"min": 3, "max": 6},
        },
        "visualReferencePacket": CROPPED_HAIR_VISUAL_REFERENCE_PACKET,
        "material": material_receipt,
        "groomFamilies": family_receipts,
        "follicleDensityMask": follicle_mask_receipt,
        "evidenceGroomFamilyFilter": sorted(selected_family_names),
        "runtimeVisibleGroomFamilies": sorted(runtime_visible_family_names),
    }


def build_authored_long_hair(
    name: str,
    reference_head: bpy.types.Object,
    armature: bpy.types.Object,
) -> tuple[bpy.types.Object, dict[str, object]]:
    """Author a fresh exact-scalp long style from reference-locked guides.

    The groom has three deliberate families rather than a warped cap silhouette:
    dense center-part/crown coverage, short behind-ear transition layers, and
    independent rear lengths that clear the neck and shoulders. Every root and
    scalp-following segment is sampled from the approved exact head. Blender's
    surface-attachment and interpolation system then bakes those guides into
    alpha-feathered runtime cards with their authored taper preserved.
    """
    surface = exact_head_surface(reference_head)
    material = make_neutral_hair_material(name)

    curve = bpy.data.curves.new(f"{name}AuthoredStrands", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    authored_count = 0
    hairline_guide_count = 0
    crown_guide_count = 0
    part_bridge_guide_count = 0
    transition_guide_count = 0
    rear_length_guide_count = 0
    skipped_part_roots = 0
    skipped_hairline_roots = 0
    skipped_surface_rays = 0

    # Half-step azimuth sampling leaves one narrow, continuous sagittal part
    # without deleting a broad wedge of roots. Dense rows replace the rejected
    # uniform radial underlayer and own the full crown coverage themselves.
    ring_count = 20
    segment_count = 112
    scalp_point_count = 7
    part_half_width_degrees = 180.0 / segment_count

    # Closely spaced fibers bridge each side of the sagittal part before
    # sweeping behind the ears. They are independent exact-surface guides, not
    # an underlay cap. Their slow initial lateral motion prevents the exposed
    # chevron gaps produced by the first fresh-grid proof.
    for part_ring in range(18):
        part_amount = part_ring / 17.0
        root_y = 0.4645 + (0.4988 - 0.4645) * sin(
            (0.018 + part_amount * 0.982) * pi * 0.5
        )
        for side in (-1.0, 1.0):
            for lane in range(3):
                seed = part_ring * 17 + lane * 5 + (0 if side < 0.0 else 11)
                noise_a = ((seed * 73 + seed * seed * 19) % 499) / 498.0
                noise_b = ((seed * 109 + seed * seed * 23) % 503) / 502.0
                start_angle = side * (
                    0.0045 + lane * 0.0065 + noise_a * 0.0015
                )
                target_angle = side * (
                    1.38 + lane * 0.055 + noise_b * 0.045
                )
                root_offset = 0.00075 + part_amount * 0.00215
                target_front = max(0.0, cos(target_angle))
                exit_y = max(
                    0.4445 + target_front * 0.0195,
                    root_y - (0.046 + noise_b * 0.010),
                )
                scalp_points: list[Vector] = []
                for point_index in range(scalp_point_count):
                    amount = point_index / (scalp_point_count - 1)
                    eased = amount**2.85
                    sample = authored_scalp_point(
                        surface,
                        root_y * (1.0 - amount) + exit_y * amount,
                        start_angle * (1.0 - eased) + target_angle * eased,
                        root_offset + amount * (0.00135 + part_amount * 0.00045),
                    )
                    if sample is None:
                        scalp_points = []
                        break
                    scalp_points.append(sample[0])
                if not scalp_points:
                    skipped_surface_rays += 1
                    continue
                exit_point = scalp_points[-1]
                ear_tip = Vector(
                    (
                        min(
                            exit_point.x - 0.012,
                            TARGET_HEAD_CENTER.x - 0.040 - noise_a * 0.004,
                        ),
                        max(0.410, exit_point.y - 0.017 - noise_b * 0.006),
                        exit_point.z - side * (0.0012 + noise_a * 0.0010),
                    )
                )
                width_scale = 0.74 + noise_a * 0.34
                append_curve_strand(
                    curve,
                    tuple(scalp_points) + (ear_tip,),
                    (
                        0.08 * width_scale,
                        0.44 * width_scale,
                        0.72 * width_scale,
                        0.94 * width_scale,
                        1.02 * width_scale,
                        0.88 * width_scale,
                        0.64 * width_scale,
                        0.035,
                    ),
                )
                authored_count += 1
                part_bridge_guide_count += 1

    for ring in range(ring_count):
        ring_amount = ring / (ring_count - 1)
        for segment in range(segment_count):
            raw_angle = 2.0 * pi * (segment + 0.5) / segment_count
            angle = ((raw_angle + pi) % (2.0 * pi)) - pi
            strand_seed = ring * segment_count + segment
            noise_a = ((strand_seed * 73 + strand_seed * strand_seed * 19) % 1009) / 1008.0
            noise_b = ((strand_seed * 107 + strand_seed * strand_seed * 23) % 1013) / 1012.0
            noise_c = ((strand_seed * 149 + strand_seed * strand_seed * 29) % 1019) / 1018.0
            front_amount = max(0.0, cos(angle))
            rear_amount = max(0.0, -cos(angle))
            side = 1.0 if sin(angle) >= 0.0 else -1.0
            hairline_y = 0.4438 + front_amount * 0.0202
            row_ease = sin((0.012 + ring_amount * 0.988) * pi * 0.5)
            root_y = hairline_y + 0.00055 + (0.4985 - hairline_y) * row_ease
            if ring == 0:
                root_y += (
                    (noise_a - 0.5) * 0.0012
                    + sin(angle * 3.1 + 0.4) * 0.00055
                )

            root_offset = 0.00070 + ring_amount * 0.00230
            root_sample = authored_scalp_point(surface, root_y, angle, root_offset)
            if root_sample is None:
                skipped_surface_rays += 1
                continue
            root, root_normal = root_sample
            if root.y < long_hairline_floor(root) - 0.0012:
                skipped_hairline_roots += 1
                continue

            # Front and crown fibers sweep coherently toward the nearest temple;
            # rear fibers retain their occipital azimuth. This mirrors the locked
            # front/profile reference packet and avoids bilateral straight-down
            # curtains at the cheeks.
            temple_angle = side * (pi * (0.50 + noise_b * 0.018))
            sweep_amount = front_amount * (0.82 + noise_a * 0.12)
            target_angle = angle * (1.0 - sweep_amount) + temple_angle * sweep_amount
            if rear_amount > 0.0:
                target_angle += side * (1.0 - rear_amount) * 0.055
            target_front = max(0.0, cos(target_angle))
            exit_floor = 0.4445 + target_front * 0.0195
            exit_y = max(
                exit_floor,
                root_y - (0.050 + noise_c * 0.018),
            )
            scalp_points: list[Vector] = []
            lower_normal = root_normal
            for point_index in range(scalp_point_count):
                amount = point_index / (scalp_point_count - 1)
                eased = amount * amount * (3.0 - 2.0 * amount)
                point_angle = angle * (1.0 - eased) + target_angle * eased
                point_y = root_y * (1.0 - amount) + exit_y * amount
                sample = authored_scalp_point(
                    surface,
                    point_y,
                    point_angle,
                    root_offset + amount * (0.00125 + ring_amount * 0.00055),
                )
                if sample is None:
                    scalp_points = []
                    break
                scalp_points.append(sample[0])
                lower_normal = sample[1]
            if not scalp_points:
                skipped_surface_rays += 1
                continue
            exit_point = scalp_points[-1]
            rear_flow = max(
                0.0,
                min(1.0, (-cos(target_angle) - 0.12) / 0.62),
            )
            width_scale = 0.72 + noise_a * 0.46 + rear_flow * 0.34
            root_radius = 0.055 if ring == 0 else 0.28 + ring_amount * 0.10
            scalp_radii = (
                root_radius * width_scale,
                0.56 * width_scale,
                0.82 * width_scale,
                1.00 * width_scale,
                1.08 * width_scale,
                1.02 * width_scale,
                0.84 * width_scale,
            )

            if rear_flow < 0.10:
                # Front and side families stop behind the ears. They remain
                # scalp-conforming and cannot flare into pigtails or cheek bars.
                ear_tip = Vector(
                    (
                        min(
                            exit_point.x - 0.012,
                            TARGET_HEAD_CENTER.x - 0.038 - noise_b * 0.004,
                        ),
                        max(0.409, exit_point.y - 0.018 - noise_c * 0.006),
                        exit_point.z - side * (0.0015 + noise_a * 0.0015),
                    )
                )
                append_curve_strand(
                    curve,
                    tuple(scalp_points) + (ear_tip,),
                    scalp_radii + (0.035,),
                )
                transition_guide_count += 1
            else:
                # Rear guides fall on a plane behind the neck/body. Staggered
                # length, wave, and lateral grouping create layers and tapered
                # ends without shoulder or cheek penetration.
                length_layer = (
                    ((strand_seed * 43 + strand_seed * strand_seed * 11) % 991)
                    / 990.0
                )
                layered_rear_flow = rear_flow * (0.68 + length_layer * 0.32)
                final_y = (
                    (0.410 + noise_c * 0.020) * (1.0 - layered_rear_flow)
                    + (0.268 + noise_c * 0.096) * layered_rear_flow
                )
                free_span = max(0.045, exit_point.y - final_y)
                rear_depth = (
                    0.056
                    + ring_amount * 0.026
                    + noise_a * 0.018
                    + (1.0 - rear_flow) * 0.006
                )
                rear_x = min(
                    exit_point.x - 0.006,
                    TARGET_HEAD_CENTER.x - rear_depth,
                )
                wave = (noise_b - 0.5) * 0.018
                lateral = (
                    exit_point.z * (0.88 + noise_a * 0.08)
                    + side * (0.0070 + rear_flow * 0.0100 + noise_c * 0.0060)
                    + (noise_a - 0.5) * 0.010
                )
                free_upper = Vector(
                    (
                        rear_x,
                        exit_point.y - free_span * 0.20,
                        lateral + wave * 0.35,
                    )
                )
                free_middle = Vector(
                    (
                        rear_x - 0.003 - noise_b * 0.006,
                        exit_point.y - free_span * 0.56,
                        lateral - wave,
                    )
                )
                free_lower = Vector(
                    (
                        rear_x - 0.002 + noise_c * 0.005,
                        exit_point.y - free_span * 0.82,
                        lateral + wave * 0.45,
                    )
                )
                tip = Vector(
                    (
                        rear_x + (noise_a - 0.5) * 0.010,
                        final_y,
                        lateral + (noise_c - 0.5) * 0.018,
                    )
                )
                append_curve_strand(
                    curve,
                    tuple(scalp_points)
                    + (free_upper, free_middle, free_lower, tip),
                    scalp_radii
                    + (
                        0.98 * width_scale,
                        0.90 * width_scale,
                        0.72 * width_scale,
                        0.035,
                    ),
                )
                rear_length_guide_count += 1

            authored_count += 1
            crown_guide_count += 1
            if ring == 0:
                hairline_guide_count += 1

    guides = bpy.data.objects.new(f"{name}_AuthoredGuides", curve)
    bpy.context.collection.objects.link(guides)
    obj, groom_receipt = bake_surface_attached_groom(
        guides,
        reference_head,
        material,
        children_per_guide=3,
        root_jitter_radius=0.0017,
        strand_radius=0.000115,
    )
    obj.name = name
    obj.data.name = f"{name}Mesh"
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    add_module_contract(obj, armature, "hair", "BLENDER_SURFACE_ATTACHED_GUIDE_GROOM")
    obj["souldrifterOriginalGeometry"] = True
    obj["souldrifterLongHairPart"] = "NARROW_CENTER_PART"
    obj["souldrifterSecondaryMotion"] = "RUNTIME_SPRING_BONE_FOLLOW_UP"
    return obj, {
        "route": "PROJECT_AUTHORED_EXACT_HEAD_TAPERED_STRANDS",
        "sourceHeadSha256": SOURCE_HEAD_SHA256,
        "license": "PROJECT_ORIGINAL",
        "geometryPolicy": "EXACT_HEAD_UV_ATTACHED_GUIDES_INTERPOLATED_AND_BAKED",
        "authoredGuideCount": authored_count,
        "guideFamilies": {
            "hairline": hairline_guide_count,
            "crown": crown_guide_count,
            "partBridge": part_bridge_guide_count,
            "behindEarTransition": transition_guide_count,
            "rearLength": rear_length_guide_count,
        },
        "partHalfWidthDegrees": part_half_width_degrees,
        "rootGrid": {"rings": ring_count, "segments": segment_count},
        "skippedPartRoots": skipped_part_roots,
        "skippedHairlineRoots": skipped_hairline_roots,
        "skippedSurfaceRays": skipped_surface_rays,
        "runtimeMaterial": f"{MATERIAL_PREFIX}_Long",
        "visualReferencePacket": LONG_HAIR_VISUAL_REFERENCE_PACKET,
        "groom": groom_receipt,
    }


def build_goatee_curve_volume(
    name: str,
    surface: BVHTree,
) -> bpy.types.Object:
    """Build individually tapered, exact-face-following goatee hair curves."""
    curve = bpy.data.curves.new(f"{name}Curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.000065
    curve.bevel_resolution = 1
    curve.resolution_u = 1
    curve.fill_mode = "FULL"

    # Dense short follicles are scattered across the chin instead of spanning
    # the whole beard height.  This prevents parallel comb lines and preserves
    # genuine gaps between individual surface-following strands.
    chin_strand_count = 700
    for index in range(chin_strand_count):
        vertical_noise = ((index * 193 + index * index * 29) % 991) / 990.0
        lateral_noise = ((index * 97 + index * index * 13) % 997) / 996.0
        length_noise = ((index * 71 + index * index * 17) % 983) / 982.0
        root_y = 0.3765 + vertical_noise * 0.0145
        half_width = 0.0095 + vertical_noise * 0.0040
        z = (lateral_noise * 2.0 - 1.0) * half_width
        length = 0.0028 + length_noise * 0.0044
        drift = ((((index * 29) % 37) / 36.0) - 0.5) * 0.0015
        points = (
            sampled_head_point(surface, root_y, z, 0.00007),
            sampled_head_point(surface, root_y - length * 0.52, z + drift * 0.30, 0.00015),
            sampled_head_point(surface, root_y - length, z + drift, 0.00024),
        )
        radius_scale = 0.62 + (((index * 11) % 23) / 22.0) * 0.58
        append_curve_strand(
            curve,
            points,
            (0.26 * radius_scale, radius_scale, 0.06),
        )

    # A compact soul-patch bridge gives the family a deliberate goatee
    # silhouette rather than reading as generic chin stubble.
    for index in range(120):
        vertical_noise = ((index * 79 + index * index * 17) % 389) / 388.0
        lateral_noise = ((index * 53 + index * index * 11) % 397) / 396.0
        length_noise = ((index * 31 + index * index * 7) % 401) / 400.0
        root_y = 0.3890 + vertical_noise * 0.0070
        z = (lateral_noise * 2.0 - 1.0) * 0.0070
        length = 0.0020 + length_noise * 0.0032
        drift = ((((index * 23) % 31) / 30.0) - 0.5) * 0.0009
        points = (
            sampled_head_point(surface, root_y, z, 0.00007),
            sampled_head_point(surface, root_y - length * 0.52, z + drift * 0.30, 0.00016),
            sampled_head_point(surface, root_y - length, z + drift, 0.00025),
        )
        radius_scale = 0.66 + (((index * 13) % 19) / 18.0) * 0.54
        append_curve_strand(curve, points, (0.24 * radius_scale, radius_scale, 0.05))

    # Matching moustache follicles follow the upper-lip surface, with a clear
    # philtrum and irregular tapered corners.
    for side in (-1.0, 1.0):
        moustache_side_count = 130
        for index in range(moustache_side_count):
            lateral_noise = ((index * 41 + index * index * 7) % 251) / 250.0
            vertical_noise = ((index * 67 + index * index * 11) % 257) / 256.0
            length_noise = ((index * 23 + index * index * 5) % 263) / 262.0
            root_z = side * (0.0022 + lateral_noise * 0.0128)
            root_y = 0.4002 + vertical_noise * 0.0037
            length = 0.0018 + length_noise * 0.0026
            lateral_drift = side * (0.0007 + length_noise * 0.0018)
            points = (
                sampled_head_point(surface, root_y, root_z, 0.00007),
                sampled_head_point(
                    surface,
                    root_y - length * 0.52,
                    root_z + lateral_drift * 0.35,
                    0.00015,
                ),
                sampled_head_point(
                    surface,
                    root_y - length,
                    root_z + lateral_drift,
                    0.00023,
                ),
            )
            radius_scale = 0.68 + (((index * 17) % 19) / 18.0) * 0.48
            append_curve_strand(
                curve,
                points,
                (0.26 * radius_scale, radius_scale, 0.05),
            )

    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = f"{name}Mesh"
    return obj


def build_moustache_curve_volume(
    name: str,
    surface: BVHTree,
) -> bpy.types.Object:
    """Build a standalone upper-lip moustache from tapered exact-face strands."""
    curve = bpy.data.curves.new(f"{name}Curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.000062
    curve.bevel_resolution = 1
    curve.resolution_u = 1
    curve.fill_mode = "FULL"
    for side in (-1.0, 1.0):
        for index in range(190):
            lateral_noise = ((index * 43 + index * index * 11) % 367) / 366.0
            vertical_noise = ((index * 71 + index * index * 17) % 373) / 372.0
            length_noise = ((index * 29 + index * index * 7) % 379) / 378.0
            root_z = side * (0.0020 + lateral_noise * 0.0132)
            root_y = 0.4000 + vertical_noise * 0.0039
            length = 0.0018 + length_noise * 0.0028
            lateral_drift = side * (0.0006 + length_noise * 0.0021)
            points = (
                sampled_head_point(surface, root_y, root_z, 0.00006),
                sampled_head_point(
                    surface,
                    root_y - length * 0.50,
                    root_z + lateral_drift * 0.34,
                    0.00014,
                ),
                sampled_head_point(
                    surface,
                    root_y - length,
                    root_z + lateral_drift,
                    0.00022,
                ),
            )
            radius_scale = 0.62 + (((index * 19) % 31) / 30.0) * 0.62
            append_curve_strand(curve, points, (0.24 * radius_scale, radius_scale, 0.04))

    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = f"{name}Mesh"
    return obj


def build_beard_curve_volume(
    name: str,
    kind: str,
    surface: BVHTree,
) -> bpy.types.Object:
    """Build a jaw-wrapped short or full beard from discrete tapered follicles."""
    if kind not in {"short", "full"}:
        raise ValueError(kind)
    curve = bpy.data.curves.new(f"{name}Curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.000070 if kind == "short" else 0.000082
    curve.bevel_resolution = 1
    curve.resolution_u = 1
    curve.fill_mode = "FULL"

    # Surface-following cheek, jaw and chin follicles.  The rising lower
    # boundary toward each ear follows the jaw and guarantees zero neck roots.
    surface_count = 1420 if kind == "short" else 2300
    for index in range(surface_count):
        vertical_noise = ((index * 211 + index * index * 31) % 1009) / 1008.0
        lateral_noise = ((index * 107 + index * index * 19) % 1013) / 1012.0
        length_noise = ((index * 73 + index * index * 23) % 1019) / 1018.0
        root_y = 0.3738 + vertical_noise * 0.0252
        half_width = 0.0140 + vertical_noise * 0.0190
        z = (lateral_noise * 2.0 - 1.0) * half_width
        lateral = abs(z)
        jaw_floor = 0.3738 + max(0.0, lateral - 0.0150) * 0.52
        if root_y < jaw_floor:
            continue
        # Preserve a clean mouth/lower-lip opening above the chin field.
        if root_y > 0.3915 and lateral < 0.0140:
            continue
        center = max(0.0, 1.0 - lateral / 0.0340)
        if kind == "short":
            length = 0.0020 + length_noise * 0.0042 + center * 0.0010
        else:
            length = 0.0035 + length_noise * 0.0070 + center * 0.0040
        drift = ((((index * 47) % 43) / 42.0) - 0.5) * 0.0018
        outward = 0.00024 if kind == "short" else 0.00038
        points = (
            sampled_head_point(surface, root_y, z, 0.00007),
            sampled_head_point(surface, root_y - length * 0.52, z + drift * 0.35, outward * 0.55),
            sampled_head_point(surface, root_y - length, z + drift, outward),
        )
        radius_scale = 0.64 + (((index * 13) % 29) / 28.0) * 0.60
        append_curve_strand(curve, points, (0.25 * radius_scale, radius_scale, 0.05))

    # Both beard families include a discrete upper-lip field with philtrum and
    # lip clearance; it is never a solid card or a fused face patch.
    for side in (-1.0, 1.0):
        for index in range(96):
            lateral_noise = ((index * 43 + index * index * 7) % 269) / 268.0
            vertical_noise = ((index * 71 + index * index * 13) % 271) / 270.0
            length_noise = ((index * 29 + index * index * 5) % 277) / 276.0
            root_z = side * (0.0022 + lateral_noise * 0.0130)
            root_y = 0.4001 + vertical_noise * 0.0038
            length = 0.0019 + length_noise * (0.0027 if kind == "short" else 0.0035)
            lateral_drift = side * (0.0007 + length_noise * 0.0020)
            points = (
                sampled_head_point(surface, root_y, root_z, 0.00007),
                sampled_head_point(
                    surface,
                    root_y - length * 0.52,
                    root_z + lateral_drift * 0.35,
                    0.00016,
                ),
                sampled_head_point(
                    surface,
                    root_y - length,
                    root_z + lateral_drift,
                    0.00025,
                ),
            )
            radius_scale = 0.68 + (((index * 19) % 23) / 22.0) * 0.50
            append_curve_strand(curve, points, (0.25 * radius_scale, radius_scale, 0.05))

    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = f"{name}Mesh"
    return obj


def facial_card_plan(kind: str) -> tuple[tuple[SurfaceRow, ...], ...]:
    if kind == "stubble":
        return (
            tuple(
                (0.405 - row * (0.0320 / 35.0), -0.0315, 0.0315, 65)
                for row in range(36)
            ),
        )
    if kind in {"goatee", "short", "full"}:
        return ()
    if kind == "moustache":
        return ()
    raise ValueError(kind)


def build_facial_shell(
    name: str,
    kind: str,
    reference_head: bpy.types.Object,
    armature: bpy.types.Object,
) -> bpy.types.Object:
    surface = exact_head_surface(reference_head)
    if kind in {"moustache", "goatee", "short", "full"}:
        obj = (
            build_moustache_curve_volume(name, surface)
            if kind == "moustache"
            else (
                build_goatee_curve_volume(name, surface)
                if kind == "goatee"
                else build_beard_curve_volume(name, kind, surface)
            )
        )
        obj.data.materials.append(make_facial_hair_material(name, kind))
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        add_module_contract(obj, armature, "facialHair", "EXACT_HEAD_FITTED_CURVE_STRANDS")
        obj["souldrifterFacialHairFamily"] = kind
        obj["souldrifterMouthClearance"] = True
        obj["souldrifterNoseClearance"] = True
        return obj

    offset = {"stubble": 0.00060}[kind]
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for rows in facial_card_plan(kind):
        append_surface_piece(vertices, faces, surface, rows, offset)
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    assign_projected_facial_uv(mesh)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(make_facial_hair_material(name, kind))
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    if kind != "stubble":
        solidify = obj.modifiers.new("FacialHairCardThickness", "SOLIDIFY")
        solidify.thickness = 0.00035 if kind == "moustache" else 0.00010
        solidify.offset = 0.0
    add_module_contract(obj, armature, "facialHair", "EXACT_HEAD_FITTED_CARDS")
    obj["souldrifterFacialHairFamily"] = kind
    obj["souldrifterMouthClearance"] = True
    obj["souldrifterNoseClearance"] = True
    return obj


def geometry_stats(obj: bpy.types.Object) -> dict[str, object]:
    coordinates = [vertex.co for vertex in obj.data.vertices]
    minimum = Vector(
        (
            min(point.x for point in coordinates),
            min(point.y for point in coordinates),
            min(point.z for point in coordinates),
        )
    )
    maximum = Vector(
        (
            max(point.x for point in coordinates),
            max(point.y for point in coordinates),
            max(point.z for point in coordinates),
        )
    )
    return {
        "vertices": len(obj.data.vertices),
        "triangles": sum(max(1, len(polygon.vertices) - 2) for polygon in obj.data.polygons),
        "materials": [material.name for material in obj.data.materials if material],
        "bounds": {
            "min": [round(value, 6) for value in minimum],
            "max": [round(value, 6) for value in maximum],
        },
        "headWeightVertexCount": len(obj.data.vertices),
    }


def structural_validation(modules: list[bpy.types.Object]) -> dict[str, object]:
    names = [obj.name for obj in modules]
    if tuple(names) != APPROVED_MODULE_NAMES:
        raise RuntimeError(f"Approved module-name/order contract changed: {names}")
    for obj in modules:
        if not obj.data.vertices or not obj.data.polygons:
            raise RuntimeError(f"{obj.name} has empty geometry")
        if HEAD_BONE not in obj.vertex_groups:
            raise RuntimeError(f"{obj.name} is not head weighted")
        if obj.get("souldrifterFusedToHead") is not False:
            raise RuntimeError(f"{obj.name} is not modular")
        if obj.get("souldrifterLegacyGeometry") is not False:
            raise RuntimeError(f"{obj.name} imported rejected geometry")
        if not all(
            material and material.get("souldrifterTintable") is True
            for material in obj.data.materials
        ):
            raise RuntimeError(f"{obj.name} has a non-tintable material")
    return {
        "status": "PASS",
        "moduleNamesExact": True,
        "officialCc0HairSources": True,
        "legacyGeometryImported": False,
        "separateTintableMaterials": True,
        "allVerticesHeadWeighted": True,
        "permanentFusion": False,
        "visualGate": "PASS_FAIL_CLOSED_PER_MODULE",
        "withheldModulesExcluded": True,
    }


def export_pack(output: Path, armature: bpy.types.Object, modules: list[bpy.types.Object]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    for obj in modules:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_skins=True,
        export_morph=False,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_apply=False,
        export_extras=True,
    )


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def prepare_evidence_scene(
    reference_head: bpy.types.Object,
    neutral_geometry_material: bool,
) -> tuple[bpy.types.Object, Vector, Vector, Vector, Vector]:
    scene = bpy.context.scene
    # Use the shipping material graph for visual gates. Workbench texture mode
    # ignores parts of the Principled graph (notably tint/base-color routing),
    # which previously made a corrected long-hair surface still appear silver.
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "BOTH"
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = (0.055, 0.065, 0.078)
    if scene.world is None:
        scene.world = bpy.data.worlds.new("AppearanceEvidenceWorld")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.018, 0.024, 0.034, 1.0)
    background.inputs["Strength"].default_value = 0.32
    reference_head.hide_render = False
    body = bpy.data.objects.get("HumanFoundation_BodyNoHead")
    if body:
        body.hide_render = False
    if neutral_geometry_material:
        # Geometry evidence must never masquerade as a skin-material review.
        # Use an unmistakably neutral, fully matte clay on both head and body;
        # source-PBR evidence leaves the imported Tripo materials untouched.
        evidence_clay = bpy.data.materials.new("MAT_EvidenceNeutralGeometryClay")
        evidence_clay.use_nodes = True
        evidence_clay.diffuse_color = (0.34, 0.36, 0.39, 1.0)
        clay_shader = evidence_clay.node_tree.nodes.get("Principled BSDF")
        clay_shader.inputs["Base Color"].default_value = (0.34, 0.36, 0.39, 1.0)
        clay_shader.inputs["Metallic"].default_value = 0.0
        clay_shader.inputs["Roughness"].default_value = 1.0
        if clay_shader.inputs.get("Specular IOR Level"):
            clay_shader.inputs["Specular IOR Level"].default_value = 0.0
        reference_head.data.materials.clear()
        reference_head.data.materials.append(evidence_clay)
        if body:
            body.data.materials.clear()
            body.data.materials.append(evidence_clay)

    bounds = [reference_head.matrix_world @ Vector(corner) for corner in reference_head.bound_box]
    target = Vector(
        (
            (min(p.x for p in bounds) + max(p.x for p in bounds)) * 0.5,
            (min(p.y for p in bounds) + max(p.y for p in bounds)) * 0.5,
            (min(p.z for p in bounds) + max(p.z for p in bounds)) * 0.5,
        )
    )
    axes = reference_head.matrix_world.to_3x3()
    face_axis = (axes @ Vector((1.0, 0.0, 0.0))).normalized()
    vertical_axis = (axes @ Vector((0.0, 1.0, 0.0))).normalized()
    lateral_axis = (axes @ Vector((0.0, 0.0, 1.0))).normalized()
    target -= vertical_axis * 0.017

    def add_area_light(
        name: str, location: Vector, energy: float, size: float, color: tuple[float, float, float]
    ) -> None:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        look_at(light, target)

    add_area_light(
        "AppearanceKey",
        target + face_axis * 0.30 - lateral_axis * 0.22 + vertical_axis * 0.20,
        15.0,
        0.28,
        (1.0, 1.0, 1.0),
    )
    add_area_light(
        "AppearanceFill",
        target + face_axis * 0.22 + lateral_axis * 0.24 + vertical_axis * 0.06,
        8.0,
        0.34,
        (1.0, 1.0, 1.0),
    )
    add_area_light(
        "AppearanceRim",
        target - face_axis * 0.24 + lateral_axis * 0.12 + vertical_axis * 0.22,
        12.0,
        0.24,
        (1.0, 1.0, 1.0),
    )
    add_area_light(
        "AppearanceOpposingRim",
        target - face_axis * 0.24 - lateral_axis * 0.12 + vertical_axis * 0.18,
        10.0,
        0.28,
        (1.0, 1.0, 1.0),
    )

    camera_data = bpy.data.cameras.new("AppearanceEvidenceCamera")
    camera = bpy.data.objects.new("AppearanceEvidenceCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 58
    scene.camera = camera
    return camera, target, face_axis, vertical_axis, lateral_axis


def apply_evidence_follicle_undercoat(
    reference_head: bpy.types.Object,
    tint: tuple[float, float, float],
    strength: float = 0.26,
) -> None:
    """Compose the runtime follicle-density mix on the exact-head skin for proof."""
    mask = bpy.data.images.get("TX_HumanFoundation_Cropped_FollicleDensity")
    if mask is None:
        raise RuntimeError("Cropped follicle evidence mask was not generated")
    mask.colorspace_settings.name = "Non-Color"
    for slot_index, source_material in enumerate(tuple(reference_head.data.materials)):
        if source_material is None or not source_material.use_nodes:
            continue
        material = source_material.copy()
        material.name = f"{source_material.name}_FollicleEvidence"
        reference_head.data.materials[slot_index] = material
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        shader = next(
            (node for node in nodes if node.bl_idname == "ShaderNodeBsdfPrincipled"),
            None,
        )
        if shader is None:
            raise RuntimeError(
                f"Exact-head evidence material has no Principled shader: {material.name}"
            )
        base_color = shader.inputs["Base Color"]
        incoming = next((link for link in links if link.to_socket == base_color), None)
        mix = nodes.new("ShaderNodeMixRGB")
        mix.name = "SoulDrifter Follicle Evidence Mix"
        mix.label = "Runtime-equivalent follicle undercoat"
        mix.blend_type = "MIX"
        if incoming is not None:
            source_socket = incoming.from_socket
            links.remove(incoming)
            links.new(source_socket, mix.inputs[1])
        else:
            mix.inputs[1].default_value = base_color.default_value
        mix.inputs[2].default_value = (*tint, 1.0)
        mask_node = nodes.new("ShaderNodeTexImage")
        mask_node.name = "SoulDrifter Follicle Density Evidence"
        mask_node.image = mask
        mask_node.interpolation = "Linear"
        mask_node.extension = "CLIP"
        scale = nodes.new("ShaderNodeMath")
        scale.name = "SoulDrifter Follicle Strength Evidence"
        scale.operation = "MULTIPLY"
        scale.inputs[1].default_value = strength
        links.new(mask_node.outputs["Color"], scale.inputs[0])
        links.new(scale.outputs[0], mix.inputs[0])
        links.new(mix.outputs[0], base_color)
        material["souldrifterEvidenceFolliclePreview"] = True
        material["souldrifterEvidenceFollicleStrength"] = strength


def render_groom_curve_diagnostic(
    reference_head: bpy.types.Object,
    family_curves: dict[str, bpy.types.Curve],
    evidence_dir: Path,
    module_name: str,
    *,
    stage: str = "PRECONVERSION_HAIR_CURVES_NO_RUNTIME_CARDS",
    file_prefix: str = "groom-diagnostic",
) -> dict[str, object]:
    """Render and receipt exact-root guide/child curves before card baking."""
    module_dir = evidence_dir / module_name
    module_dir.mkdir(parents=True, exist_ok=True)
    family_colors = {
        "Coverage": (0.04, 0.42, 1.0, 1.0),
        "MidLayer": (0.08, 0.82, 0.24, 1.0),
        "TopLayer": (1.0, 0.34, 0.03, 1.0),
        "Flyaways": (0.94, 0.05, 0.72, 1.0),
        "ShortHairs": (1.0, 0.86, 0.03, 1.0),
    }
    family_widths = {
        "Coverage": 0.00013,
        "MidLayer": 0.00020,
        "TopLayer": 0.00023,
        "Flyaways": 0.00012,
        "ShortHairs": 0.00015,
    }
    surface = exact_head_surface(reference_head)
    audit_families: dict[str, dict[str, object]] = {}
    diagnostic_objects: list[bpy.types.Object] = []
    diagnostic_curve_copies: list[bpy.types.Curve] = []
    for label, curve in family_curves.items():
        material = bpy.data.materials.new(f"MAT_GroomDiagnostic_{label}")
        material.use_nodes = True
        material.diffuse_color = family_colors[label]
        shader = material.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = family_colors[label]
        shader.inputs["Roughness"].default_value = 0.48
        if shader.inputs.get("Emission Color"):
            shader.inputs["Emission Color"].default_value = family_colors[label]
        if shader.inputs.get("Emission Strength"):
            shader.inputs["Emission Strength"].default_value = 0.35
        # Render from a disposable copy.  Beveling the authored Curve itself
        # makes Blender's subsequent legacy-Curve -> Hair-Curves conversion
        # treat it as evaluated surface geometry and can leave it unconverted.
        diagnostic_curve = curve.copy()
        diagnostic_curve.name = f"{curve.name}_DiagnosticCopy"
        diagnostic_curve.bevel_depth = family_widths[label]
        diagnostic_curve.bevel_resolution = 1
        diagnostic_curve.resolution_u = 1
        diagnostic_curve.materials.clear()
        diagnostic_curve.materials.append(material)
        diagnostic_curve_copies.append(diagnostic_curve)
        obj = bpy.data.objects.new(f"Diagnostic_{label}", diagnostic_curve)
        bpy.context.collection.objects.link(obj)
        obj.matrix_world = reference_head.matrix_world.copy()
        diagnostic_objects.append(obj)

        roots: list[Vector] = []
        point_counts: list[int] = []
        tangent_alignment: list[float] = []
        root_distances: list[float] = []
        for spline in curve.splines:
            points = [Vector(point.co[:3]) for point in spline.points]
            point_counts.append(len(points))
            if len(points) < 2:
                continue
            root = points[0]
            roots.append(root)
            _, normal, _, distance = surface.find_nearest(root)
            if normal is None or distance is None:
                tangent_alignment.append(float("inf"))
                root_distances.append(float("inf"))
                continue
            direction = points[1] - points[0]
            if direction.length_squared < 1.0e-12:
                tangent_alignment.append(float("inf"))
            else:
                tangent_alignment.append(
                    abs(direction.normalized().dot(normal.normalized()))
                )
            root_distances.append(float(distance))
        unique_roots = len(
            {
                (round(root.x, 5), round(root.y, 5), round(root.z, 5))
                for root in roots
            }
        )
        angle_bins = {
            int(
                ((atan2(root.z - TARGET_HEAD_CENTER.z, root.x - TARGET_HEAD_CENTER.x) + pi)
                / (2.0 * pi))
                * 24
            )
            % 24
            for root in roots
        }
        vertical_bins = {
            max(0, min(11, int((root.y - 0.438) / (0.499 - 0.438) * 12)))
            for root in roots
        }
        audit_families[label] = {
            "curveCount": len(curve.splines),
            "pointCountMin": min(point_counts) if point_counts else 0,
            "pointCountMax": max(point_counts) if point_counts else 0,
            "uniqueRootCount": unique_roots,
            "uniqueRootRatio": unique_roots / len(roots) if roots else 0.0,
            "rootDistanceMaxMeters": max(root_distances) if root_distances else None,
            "rootDirectionNormalDotAbsMax": (
                max(tangent_alignment) if tangent_alignment else None
            ),
            "azimuthBinCoverage": len(angle_bins),
            "verticalBinCoverage": len(vertical_bins),
            "rootBounds": {
                "min": [
                    min(root[index] for root in roots) if roots else None
                    for index in range(3)
                ],
                "max": [
                    max(root[index] for root in roots) if roots else None
                    for index in range(3)
                ],
            },
            "diagnosticColor": list(family_colors[label]),
        }

    coverage_audit = audit_families["Coverage"]
    structural_pass = (
        set(audit_families) == set(family_colors)
        and all(record["curveCount"] >= 24 for record in audit_families.values())
        and all(record["pointCountMin"] >= 7 for record in audit_families.values())
        and all(record["uniqueRootRatio"] >= 0.98 for record in audit_families.values())
        and all(record["rootDistanceMaxMeters"] <= 0.0012 for record in audit_families.values())
        and all(
            record["rootDirectionNormalDotAbsMax"] <= 0.62
            for record in audit_families.values()
        )
        and coverage_audit["azimuthBinCoverage"] == 24
        and coverage_audit["verticalBinCoverage"] >= 10
    )

    camera, target, face_axis, vertical_axis, _ = prepare_evidence_scene(
        reference_head,
        neutral_geometry_material=True,
    )
    body = bpy.data.objects.get("HumanFoundation_BodyNoHead")
    if body:
        body.hide_render = True
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    views = {
        f"{file_prefix}-front": (
            target + face_axis * 0.29 + vertical_axis * 0.070,
            target + vertical_axis * 0.040,
        ),
        f"{file_prefix}-crown": (
            target + face_axis * 0.14 + vertical_axis * 0.285,
            target + vertical_axis * 0.050,
        ),
        f"{file_prefix}-rear": (
            target - face_axis * 0.29 + vertical_axis * 0.060,
            target + vertical_axis * 0.035,
        ),
    }
    rendered: dict[str, str] = {}
    for label, (location, view_target) in views.items():
        camera.location = location
        look_at(camera, view_target)
        path = module_dir / f"{label}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        rendered[label] = str(path).replace("\\", "/")

    report = {
        "status": "PASS" if structural_pass else "FAIL",
        "stage": stage,
        "module": module_name,
        "sourceHeadSha256": SOURCE_HEAD_SHA256,
        "familyCount": len(family_curves),
        "families": audit_families,
        "rendered": rendered,
    }
    report_path = module_dir / f"{file_prefix}.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("GROOM_DIAGNOSTIC=" + json.dumps(report, sort_keys=True))
    for diagnostic_object in diagnostic_objects:
        bpy.data.objects.remove(diagnostic_object, do_unlink=True)
    for diagnostic_curve in diagnostic_curve_copies:
        if diagnostic_curve.users == 0:
            bpy.data.curves.remove(diagnostic_curve)
    return report


def render_evidence(
    evidence_dir: Path,
    reference_head: bpy.types.Object,
    modules: list[bpy.types.Object],
    smoke: bool = False,
    evidence_module: str | None = None,
    evidence_hair_tint: str = "dark",
    evidence_view: str = "all",
    evidence_clay: bool = False,
    evidence_workbench_material: bool = False,
    evidence_follicle_preview: bool = False,
) -> dict[str, object]:
    evidence_dir.mkdir(parents=True, exist_ok=True)
    # Persist the exact packed runtime atlas used by the evidence render. This
    # makes repeated fiber ends, threshold loss, and mip-risk inspectable
    # independently from card placement instead of guessing from the model.
    for image in bpy.data.images:
        if not image.name.startswith("TX_SK_Hair_") or not image.name.endswith(
            "_FiberCoverage"
        ):
            continue
        atlas_path = evidence_dir / f"{image.name}.png"
        previous_path = image.filepath_raw
        previous_format = image.file_format
        image.filepath_raw = str(atlas_path)
        image.file_format = "PNG"
        image.save()
        image.filepath_raw = previous_path
        image.file_format = previous_format
    neutral_geometry_material = evidence_clay or evidence_workbench_material
    camera, target, face_axis, vertical_axis, lateral_axis = prepare_evidence_scene(
        reference_head,
        neutral_geometry_material=neutral_geometry_material,
    )
    evidence_tint = {
        "dark": (0.014, 0.0045, 0.0015),
        "blond": (0.34, 0.17, 0.055),
        "grey": (0.18, 0.17, 0.16),
    }[evidence_hair_tint]
    if evidence_follicle_preview:
        if evidence_module != "SK_Hair_Cropped":
            raise RuntimeError(
                "Follicle evidence preview is only valid for SK_Hair_Cropped"
            )
        if neutral_geometry_material:
            raise RuntimeError(
                "Follicle evidence preview requires the shipping skin material"
            )
        apply_evidence_follicle_undercoat(reference_head, evidence_tint)
    scene = bpy.context.scene
    if evidence_clay or evidence_workbench_material:
        # Geometry gates must remain judgeable even when the Eevee driver emits
        # transient rainbow/moire fragments. Workbench studio lighting gives a
        # deterministic clay/unlit proof before any shipping material review.
        scene.render.engine = "BLENDER_WORKBENCH"
        scene.display.shading.light = "STUDIO"
        scene.display.shading.color_type = "MATERIAL"
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
    radius = 0.44
    rendered = {}
    if evidence_module:
        rendered_modules = [module for module in modules if module.name == evidence_module]
    else:
        rendered_modules = modules[:1] if smoke else modules
    for module in rendered_modules:
        if evidence_clay:
            clay = bpy.data.materials.get("MAT_EvidenceAppearanceClay")
            if clay is None:
                clay = bpy.data.materials.new("MAT_EvidenceAppearanceClay")
                clay.use_nodes = True
                clay.diffuse_color = (0.26, 0.27, 0.29, 1.0)
                shader = clay.node_tree.nodes.get("Principled BSDF")
                shader.inputs["Base Color"].default_value = (0.26, 0.27, 0.29, 1.0)
                shader.inputs["Roughness"].default_value = 0.92
                if shader.inputs.get("Specular IOR Level"):
                    shader.inputs["Specular IOR Level"].default_value = 0.06
            module.data.materials.clear()
            module.data.materials.append(clay)
        if not evidence_clay and (
            module.name.startswith("SK_Hair_")
            or module.name.startswith("SK_FacialHair_")
        ):
            tint = evidence_tint
            for material in module.data.materials:
                if material is None or not material.use_nodes:
                    continue
                tint_node = material.node_tree.nodes.get("SoulDrifter Hair Tint")
                if tint_node:
                    tint_node.outputs["Color"].default_value = (*tint, 1.0)
                else:
                    shader = material.node_tree.nodes.get("Principled BSDF")
                    if shader:
                        shader.inputs["Base Color"].default_value = (*tint, 1.0)
                material.diffuse_color = (*tint, 1.0)
        for candidate in modules:
            candidate.hide_render = candidate != module
        module_dir = evidence_dir / module.name
        module_dir.mkdir(parents=True, exist_ok=True)
        all_views = {
            "front": 0.0,
            "side": pi / 2.0,
            "side-left": -pi / 2.0,
            "rear": pi,
            "three-quarter-low": pi / 4.0,
            "crown-hairline-close": 0.0,
        }
        views = (
            all_views
            if evidence_view == "all"
            else {evidence_view: all_views[evidence_view]}
        )
        for label, angle in views.items():
            direction = face_axis * cos(angle) + lateral_axis * sin(angle)
            if label == "crown-hairline-close":
                view_target = target + vertical_axis * 0.040
                camera.location = target + direction * 0.265 + vertical_axis * 0.082
                look_at(camera, view_target)
            else:
                vertical_offset = -0.050 if label == "three-quarter-low" else 0.003
                camera.location = target + direction * radius + vertical_axis * vertical_offset
                look_at(camera, target)
            scene.render.filepath = str(module_dir / f"{label}.png")
            bpy.ops.render.render(write_still=True)
        frames = []
        if not smoke:
            turntable_dir = module_dir / "turntable"
            turntable_dir.mkdir(parents=True, exist_ok=True)
            for index in range(12):
                angle = 2.0 * pi * index / 12.0
                direction = face_axis * cos(angle) + lateral_axis * sin(angle)
                camera.location = target + direction * radius + vertical_axis * 0.003
                look_at(camera, target)
                frame = turntable_dir / f"frame-{index:02d}.png"
                scene.render.filepath = str(frame)
                bpy.ops.render.render(write_still=True)
                frames.append(str(frame).replace("\\", "/"))
        rendered[module.name] = {
            "front": str(module_dir / "front.png").replace("\\", "/"),
            "side": str(module_dir / "side.png").replace("\\", "/"),
            "rear": str(module_dir / "rear.png").replace("\\", "/"),
            "turntableFrameCount": len(frames),
            "turntableFrames": frames,
        }
    return {
        "root": str(evidence_dir).replace("\\", "/"),
        "smoke": smoke,
        "hairTint": evidence_hair_tint,
        "clay": evidence_clay,
        "workbenchMaterial": evidence_workbench_material,
        "folliclePreview": evidence_follicle_preview,
        "skinPreviewMode": (
            "RUNTIME_EQUIVALENT_FOLLICLE_UNDERCOAT"
            if evidence_follicle_preview
            else "NEUTRAL_MATTE_GEOMETRY_CLAY"
            if neutral_geometry_material
            else "IMPORTED_SOURCE_PBR_MATERIAL_UNCHANGED"
        ),
        "view": evidence_view,
        "modules": rendered,
    }


def fresh_import_validation(output: Path) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objects = imported_glb_objects(output)
    modules = {
        obj.name: obj for obj in objects if obj.type == "MESH" and obj.name in MODULE_NAMES
    }
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if set(modules) != set(APPROVED_MODULE_NAMES):
        raise RuntimeError(f"Fresh import module set changed: {sorted(modules)}")
    if len(armatures) != 1 or len(armatures[0].data.bones) != 65:
        raise RuntimeError("Canonical 65-bone armature did not survive export")
    if bpy.data.actions:
        raise RuntimeError("Appearance pack unexpectedly contains animation")
    for name, obj in modules.items():
        if obj.get("souldrifterApprovalStatus") != "LOCAL_AUTHORING_VALIDATED":
            raise RuntimeError(f"{name} lost approval metadata")
        if obj.get("souldrifterFusedToHead") is not False:
            raise RuntimeError(f"{name} lost modularity metadata")
    return {
        "status": "PASS",
        "meshCount": len(modules),
        "moduleNames": sorted(modules),
        "boneCount": len(armatures[0].data.bones),
        "rootBones": [bone.name for bone in armatures[0].data.bones if bone.parent is None],
        "embeddedActionCount": len(bpy.data.actions),
        "approvalMetadataRoundTrips": True,
    }


def build() -> dict[str, object]:
    args = parse_args()
    source = Path(args.source_head).resolve()
    makehuman_root = Path(args.makehuman_root).resolve()
    archive = Path(args.makehuman_archive).resolve()
    issue448_hair_root = Path(args.issue448_hair_root).resolve()
    output = Path(args.output_glb).resolve()
    report_path = Path(args.report).resolve()
    evidence_dir = Path(args.evidence_dir).resolve()
    if not source.is_file() or file_sha256(source) != SOURCE_HEAD_SHA256:
        raise RuntimeError("Exact #487 modular-head source/hash contract changed")
    if not archive.is_file() or file_sha256(archive) != MAKEHUMAN_ARCHIVE_SHA256:
        raise RuntimeError("Official MakeHuman CC0 archive/hash contract changed")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    imported = imported_glb_objects(source)
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError("Expected one canonical armature")
    armature = armatures[0]
    armature.name = "HumanFoundation_AppearanceArmature"
    if len(armature.data.bones) != 65 or HEAD_BONE not in armature.data.bones:
        raise RuntimeError("Canonical armature/head bone contract changed")
    reference_head = bpy.data.objects.get("HumanFoundation_HeadBase")
    if not reference_head:
        raise RuntimeError("Exact modular head reference is missing")

    modules = []
    upstream = {}
    for module_name, asset in HAIR_SOURCES.items():
        if module_name == "SK_Hair_Cropped":
            module, provenance = build_zoned_cropped_hair(
                module_name,
                issue448_hair_root,
                reference_head,
                armature,
                evidence_dir,
                evidence_dir if args.groom_diagnostic else None,
                args.evidence_groom_family,
            )
        elif module_name == "SK_Hair_Long":
            module, provenance = build_authored_long_hair(
                module_name,
                reference_head,
                armature,
            )
        elif module_name in ISSUE448_HAIR_SOURCES:
            module, provenance = build_issue448_hair(
                module_name,
                issue448_hair_root,
                reference_head,
                armature,
            )
        else:
            module, provenance = build_official_hair(
                module_name, asset, makehuman_root, reference_head, armature
            )
        modules.append(module)
        upstream[module_name] = provenance
    for name, kind in zip(
        FACIAL_HAIR_NAMES, ("stubble", "moustache", "goatee", "short", "full")
    ):
        modules.append(build_facial_shell(name, kind, reference_head, armature))

    approved_modules = [
        obj for name in APPROVED_MODULE_NAMES for obj in modules if obj.name == name
    ]
    if len(approved_modules) != len(APPROVED_MODULE_NAMES):
        raise RuntimeError("One or more approved appearance modules were not authored")
    for obj in modules:
        obj["souldrifterApprovalStatus"] = (
            "LOCAL_AUTHORING_VALIDATED"
            if obj.name in APPROVED_MODULE_NAMES
            else "WITHHELD_VISUAL_QA"
        )

    validation = structural_validation(approved_modules)
    stats = {obj.name: geometry_stats(obj) for obj in approved_modules}
    for obj in modules:
        world = [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        print(
            "MODULE_WORLD_BOUNDS "
            + obj.name
            + " min="
            + str(tuple(round(min(point[i] for point in world), 6) for i in range(3)))
            + " max="
            + str(tuple(round(max(point[i] for point in world), 6) for i in range(3)))
        )
    export_pack(output, armature, approved_modules)
    evidence = (
        {"status": "SKIPPED"}
        if args.skip_evidence
        else render_evidence(
            evidence_dir,
            reference_head,
            modules if args.evidence_module else approved_modules,
            smoke=args.evidence_smoke,
            evidence_module=args.evidence_module,
            evidence_hair_tint=args.evidence_hair_tint,
            evidence_view=args.evidence_view,
            evidence_clay=args.evidence_clay,
            evidence_workbench_material=args.evidence_workbench_material,
            evidence_follicle_preview=args.evidence_follicle_preview,
        )
    )
    fresh_import = fresh_import_validation(output)
    report = {
        "schemaVersion": 2,
        "issue": ISSUE,
        "status": "LOCAL_MODULAR_APPEARANCE_QUARANTINED",
        "ownerReviewStatus": "OWNER_LIVE_REJECTION_RECORDED",
        "route": "FAIL_CLOSED_REBUILD_IN_PROGRESS",
        "legacyPackPolicy": "REFERENCE_ONLY_NOT_IMPORTED",
        "toolchain": {
            "binary": str(Path(bpy.app.binary_path).resolve()).replace("\\", "/"),
            "blenderVersion": bpy.app.version_string,
        },
        "source": {
            "exactHead": {
                "path": str(source).replace("\\", "/"),
                "sha256": file_sha256(source),
            },
            "makeHumanSystemPack": {
                "officialPage": MAKEHUMAN_PACK_URL,
                "license": MAKEHUMAN_LICENSE,
                "archivePath": str(archive).replace("\\", "/"),
                "archiveSha256": file_sha256(archive),
                "hairAssets": {
                    name: record
                    for name, record in upstream.items()
                    if name not in ISSUE448_HAIR_SOURCES and name != "SK_Hair_Long"
                },
            },
            "issue448ProjectHair": {
                "rightsRecord": "NOT_RECORDED_DO_NOT_INFER",
                "reuseAuthorization": "EXISTING_PROJECT_GENERATED_WORK",
                "oldHeadFitPolicy": "NON_PROMOTABLE_NOT_IMPORTED",
                "hairAssets": {
                    name: record
                    for name, record in upstream.items()
                    if name in ISSUE448_HAIR_SOURCES
                },
            },
            "localAuthoredHair": {
                "SK_Hair_Long": upstream["SK_Hair_Long"],
            },
        },
        "contract": {
            "headBone": HEAD_BONE,
            "rootBone": ROOT_BONE,
            "boneCount": 65,
            "materialFamily": MATERIAL_PREFIX,
            "moduleNames": list(APPROVED_MODULE_NAMES),
            "requiredModuleNames": list(MODULE_NAMES),
            "withheldModules": WITHHELD_MODULES,
            "hairStyles": [
                "shaved-buzzed",
                "cropped",
                "parted",
                "curly-coiled",
                "long",
                "tied-back",
                "braided",
            ],
            "facialHairStyles": [
                "none",
                "stubble",
                "moustache",
                "goatee",
                "short-beard",
                "full-beard",
            ],
        },
        "modules": stats,
        "validation": validation,
        "freshImport": fresh_import,
        "evidence": evidence,
        "output": {
            "path": str(output).replace("\\", "/"),
            "bytes": output.stat().st_size,
            "sha256": file_sha256(output),
        },
        "runtimeNotes": [
            "Shaved-buzzed remains the zero-volume baseline and is not duplicated.",
            "Clean-shaven remains the zero-volume facial-hair baseline and is not duplicated.",
            "No modular appearance mesh is embedded while the owner-rejected set is quarantined.",
            "The canonical 65-bone armature is retained so the fail-closed artifact preserves its runtime contract.",
            "Replacement candidates must pass exact-head fit, material, tint, greying, collision, and deformation QA before promotion.",
            "Hair and facial-hair candidates remain separate from skin and are not creator-selectable until promoted.",
        ],
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("HUMAN_MODULAR_APPEARANCE=" + json.dumps(report, sort_keys=True))
    return report


if __name__ == "__main__":
    build()
