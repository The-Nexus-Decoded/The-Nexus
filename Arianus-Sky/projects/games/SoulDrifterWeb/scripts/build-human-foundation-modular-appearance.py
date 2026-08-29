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
from hashlib import sha256
import json
from math import cos, pi, sin
from pathlib import Path
import sys
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


ISSUE = 487
SOURCE_HEAD_SHA256 = "5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8"
MAKEHUMAN_ARCHIVE_SHA256 = "B542127A8E25547C7C29C19F2D1D2ADB9A664C80396ECD694095DBC8028A0107"
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
APPROVED_MODULE_NAMES = (
    "SK_Hair_Parted",
    "SK_Hair_TiedBack",
    "SK_Hair_Braided",
    "SK_FacialHair_Moustache",
)
WITHHELD_MODULES = {
    "SK_Hair_Cropped": "front-left source seam remains visibly open",
    "SK_Hair_CurlyCoiled": "source cards expose glossy scalp patches",
    "SK_Hair_Long": "source part exposes a visible scalp strip",
    "SK_FacialHair_Stubble": "candidate reads as patchy bulk instead of surface stubble",
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
    texture.image = bpy.data.images.load(str(texture_path), check_existing=True)
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


def make_facial_hair_material(module_name: str, kind: str) -> bpy.types.Material:
    """Create a packed tintable strand/stubble map for the fitted cards."""
    suffix = module_name.removeprefix("SK_FacialHair_")
    material = bpy.data.materials.new(f"{MATERIAL_PREFIX}_Facial_{suffix}")
    material.use_nodes = True
    material.diffuse_color = (0.18, 0.065, 0.022, 1.0)
    material["souldrifterTintable"] = True
    material["souldrifterMaterialFamily"] = MATERIAL_PREFIX
    material["souldrifterSeparateFromSkin"] = True
    material["souldrifterHairTextureKind"] = "STUBBLE_MASK" if kind == "stubble" else "STRAND_CARD"

    size = 128
    image = bpy.data.images.new(
        f"TX_HumanFacialHair_{suffix}_Packed",
        width=size,
        height=size,
        alpha=True,
    )
    pixels: list[float] = []
    for y in range(size):
        for x in range(size):
            noise = ((x * 37 + y * 19 + x * y * 3) % 101) / 100.0
            strand = 0.5 + 0.5 * cos((x * 0.55) + (y * 0.13))
            shade = 0.72 + strand * 0.28
            if kind == "stubble":
                alpha = 0.58 if noise > 0.70 else 0.04
                shade = 0.70 + noise * 0.30
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
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"
    elif hasattr(material, "blend_method"):
        material.blend_method = "HASHED"
    material.use_backface_culling = False
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
    for material in list(obj.data.materials):
        obj.data.materials.pop(index=0)
    obj.data.materials.append(make_textured_hair_material(module_name, paths["diffuse"]))
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    add_module_contract(obj, armature, "hair", "MAKEHUMAN_SYSTEM_ASSET_CC0")
    obj["souldrifterUpstreamAsset"] = asset
    obj["souldrifterUpstreamLicense"] = MAKEHUMAN_LICENSE
    return obj, {
        "asset": asset,
        "license": MAKEHUMAN_LICENSE,
        "packUrl": MAKEHUMAN_PACK_URL,
        "files": {
            key: {
                "path": str(path).replace("\\", "/"),
                "sha256": file_sha256(path),
            }
            for key, path in paths.items()
        },
    }


SurfaceRow = tuple[float, float, float, int]


def exact_head_surface(reference_head: bpy.types.Object) -> BVHTree:
    return BVHTree.FromPolygons(
        [vertex.co.copy() for vertex in reference_head.data.vertices],
        [tuple(polygon.vertices) for polygon in reference_head.data.polygons],
        all_triangles=False,
    )


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


def append_beard_strands(
    vertices: list[tuple[float, float, float]],
    faces: list[tuple[int, int, int, int]],
    surface: BVHTree,
    offset: float,
    kind: str,
) -> None:
    """Create separated tapered chin/jaw cards instead of a beard plate."""
    if kind == "goatee":
        central_count, half_width, end_y = 35, 0.016, 0.363
        side_count = 0
    elif kind == "short":
        central_count, half_width, end_y = 61, 0.028, 0.350
        side_count = 28
    elif kind == "full":
        central_count, half_width, end_y = 73, 0.031, 0.326
        side_count = 35
    else:
        raise ValueError(kind)

    for index in range(central_count):
        amount = index / (central_count - 1)
        z = -half_width + amount * (2.0 * half_width)
        edge = abs(z) / half_width
        stagger = (index % 4) * 0.00055
        start_y = 0.384 + edge * 0.004 - stagger
        tip_y = (
            end_y
            + edge * (0.004 if kind == "goatee" else 0.006 if kind != "full" else 0.011)
            - ((index * 7) % 5) * (0.00030 if kind == "goatee" else 0.00065)
        )
        width = 0.00050 if kind == "goatee" else 0.00052
        lower_surface_y = 0.369 if kind == "goatee" else 0.362
        start = len(vertices)
        for y, strand_z, width_scale in (
            (start_y, z * 0.92, 0.82),
            (0.375 - stagger * 0.25, z * 0.96, 1.00),
            (lower_surface_y - stagger * 0.15, z, 0.96),
            (tip_y, z * (0.90 + edge * 0.10), 0.16),
        ):
            lateral = width * width_scale
            vertices.append(tuple(sampled_head_point(surface, y, strand_z - lateral, offset)))
            vertices.append(tuple(sampled_head_point(surface, y, strand_z + lateral, offset)))
        faces.extend(
            (
                (start, start + 2, start + 3, start + 1),
                (start + 2, start + 4, start + 5, start + 3),
                (start + 4, start + 6, start + 7, start + 5),
            )
        )

    for side in (-1.0, 1.0):
        for index in range(side_count):
            amount = index / max(side_count - 1, 1)
            start_z = side * (0.019 + amount * 0.013)
            middle_z = side * (0.020 + amount * 0.013)
            end_z = side * (0.018 + amount * 0.012)
            start_y = 0.390 - amount * 0.010
            tip_y = (0.352 if kind == "short" else 0.334) - amount * 0.004
            width = 0.00050
            start = len(vertices)
            for y, z, width_scale in (
                (start_y, start_z, 0.82),
                (0.375 - amount * 0.005, (start_z + middle_z) * 0.5, 1.00),
                (0.362 - amount * 0.004, middle_z, 0.92),
                (tip_y, end_z, 0.16),
            ):
                lateral = width * width_scale
                vertices.append(tuple(sampled_head_point(surface, y, z - lateral, offset)))
                vertices.append(tuple(sampled_head_point(surface, y, z + lateral, offset)))
            faces.extend(
                (
                    (start, start + 2, start + 3, start + 1),
                    (start + 2, start + 4, start + 5, start + 3),
                    (start + 4, start + 6, start + 7, start + 5),
                )
            )


def facial_card_plan(kind: str) -> tuple[tuple[SurfaceRow, ...], ...]:
    stubble_cheeks = mirrored_rows(
        (
            (0.401, 0.022, 0.034, 5),
            (0.389, 0.021, 0.033, 5),
            (0.377, 0.016, 0.030, 5),
        )
    )
    stubble_chin = (
        (
            (0.384, -0.020, 0.020, 9),
            (0.374, -0.026, 0.026, 9),
            (0.363, -0.021, 0.021, 9),
        ),
    )
    if kind == "stubble":
        return stubble_cheeks + stubble_chin
    if kind in {"moustache", "goatee", "short", "full"}:
        return ()
    raise ValueError(kind)


def build_facial_shell(
    name: str,
    kind: str,
    reference_head: bpy.types.Object,
    armature: bpy.types.Object,
) -> bpy.types.Object:
    surface = exact_head_surface(reference_head)
    offset = {
        "stubble": 0.00035,
        "moustache": 0.00085,
        "goatee": 0.00095,
        "short": 0.00115,
        "full": 0.00135,
    }[kind]
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    if kind in {"moustache", "goatee", "short", "full"}:
        append_moustache_strands(vertices, faces, surface, offset)
    if kind in {"goatee", "short", "full"}:
        append_beard_strands(vertices, faces, surface, offset, kind)
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
        solidify.thickness = 0.00035 if kind == "moustache" else 0.00055
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
) -> tuple[bpy.types.Object, Vector, Vector, Vector, Vector]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
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
    evidence_skin = bpy.data.materials.new("MAT_EvidenceNeutralSkin")
    evidence_skin.use_nodes = True
    evidence_skin.diffuse_color = (0.33, 0.19, 0.12, 1.0)
    skin_shader = evidence_skin.node_tree.nodes.get("Principled BSDF")
    skin_shader.inputs["Base Color"].default_value = (0.33, 0.19, 0.12, 1.0)
    skin_shader.inputs["Roughness"].default_value = 0.58
    reference_head.data.materials.clear()
    reference_head.data.materials.append(evidence_skin)
    body = bpy.data.objects.get("HumanFoundation_BodyNoHead")
    if body:
        body.hide_render = False
        body.data.materials.clear()
        body.data.materials.append(evidence_skin)

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
        (1.0, 0.82, 0.68),
    )
    add_area_light(
        "AppearanceFill",
        target + face_axis * 0.22 + lateral_axis * 0.24 + vertical_axis * 0.06,
        8.0,
        0.34,
        (0.62, 0.76, 1.0),
    )
    add_area_light(
        "AppearanceRim",
        target - face_axis * 0.24 + lateral_axis * 0.12 + vertical_axis * 0.22,
        12.0,
        0.24,
        (0.78, 0.88, 1.0),
    )

    camera_data = bpy.data.cameras.new("AppearanceEvidenceCamera")
    camera = bpy.data.objects.new("AppearanceEvidenceCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.data.lens = 58
    scene.camera = camera
    return camera, target, face_axis, vertical_axis, lateral_axis


def render_evidence(
    evidence_dir: Path,
    reference_head: bpy.types.Object,
    modules: list[bpy.types.Object],
    smoke: bool = False,
    evidence_module: str | None = None,
) -> dict[str, object]:
    evidence_dir.mkdir(parents=True, exist_ok=True)
    camera, target, face_axis, vertical_axis, lateral_axis = prepare_evidence_scene(reference_head)
    scene = bpy.context.scene
    radius = 0.44
    rendered = {}
    if evidence_module:
        rendered_modules = [module for module in modules if module.name == evidence_module]
    else:
        rendered_modules = modules[:1] if smoke else modules
    for module in rendered_modules:
        for candidate in modules:
            candidate.hide_render = candidate != module
        module_dir = evidence_dir / module.name
        module_dir.mkdir(parents=True, exist_ok=True)
        views = {"front": 0.0, "side": pi / 2.0, "rear": pi}
        for label, angle in views.items():
            direction = face_axis * cos(angle) + lateral_axis * sin(angle)
            camera.location = target + direction * radius + vertical_axis * 0.003
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
        )
    )
    fresh_import = fresh_import_validation(output)
    report = {
        "schemaVersion": 2,
        "issue": ISSUE,
        "status": "LOCAL_PARTIAL_MODULAR_APPEARANCE_AUTHORED",
        "ownerReviewStatus": "PARTIAL_VISUAL_QA_ACCEPTED",
        "route": "OFFICIAL_MAKEHUMAN_CC0_MESH_ADAPTATION_AND_EXACT_HEAD_FITTED_STRAND_CARDS",
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
                "hairAssets": upstream,
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
            "All modules remain separate from skin and carry tintable material metadata.",
            "All vertices are rigidly weighted to mixamorig:Head on the canonical 65-bone pilot.",
            "Long, tied-back, and braided secondary motion remains a runtime spring-bone follow-up.",
            "Only individually visual-QA-cleared modules are embedded; rejected candidates fail closed.",
            "SK_Hair_Parted currently reads as a slicked-back short style and should use that creator label.",
        ],
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("HUMAN_MODULAR_APPEARANCE=" + json.dumps(report, sort_keys=True))
    return report


if __name__ == "__main__":
    build()
