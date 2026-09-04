"""Build exact-head native Blender Hair Curves proofs for the Human hair catalog.

This catalog generator deliberately reuses the audited canonical-head import,
scalp extraction, studio, material, and node-library helpers from the short
side-swept proof.  It authors distinct geometry for mohawk, long loose hair,
braid, and locs, plus a canonical bald option, instead of stretching or
combining animation-era proxy meshes.
"""

from __future__ import annotations

import argparse
from bisect import bisect_left
import importlib.util
import json
import math
import sys
from pathlib import Path
from typing import Callable, Iterable

import bpy
from mathutils import Vector


SCRIPT_PATH = Path(__file__).resolve()
BASE_SCRIPT = SCRIPT_PATH.with_name("build-human-foundation-short-parted-hair-proof.py")
DEFAULT_EVIDENCE_ROOT = Path(r"H:\CodexData\souldrifter-toolchain\evidence\487")
SUPPORTED_STYLES = ("mohawk", "long-loose", "braid", "locs", "bald")


def load_base_module():
    spec = importlib.util.spec_from_file_location("souldrifter_hair_base", BASE_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load shared Human hair pipeline: {BASE_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BASE = load_base_module()


def scalp_bounds(scalp: bpy.types.Object) -> list[tuple[float, float]]:
    points = [scalp.matrix_world @ vertex.co for vertex in scalp.data.vertices]
    return [
        (min(point[axis] for point in points), max(point[axis] for point in points))
        for axis in range(3)
    ]


def sample_scalp_roots(
    scalp: bpy.types.Object,
    count: int,
    predicate: Callable[[Vector, Vector, list[tuple[float, float]]], bool],
) -> list[tuple[Vector, Vector]]:
    """Sample deterministic attached roots from the exact extracted scalp."""
    mesh = scalp.data
    mesh.calc_loop_triangles()
    triangles = list(mesh.loop_triangles)
    if not triangles:
        raise RuntimeError("Exact Human scalp has no triangles")
    cumulative_areas: list[float] = []
    total_area = 0.0
    for triangle in triangles:
        points = [scalp.matrix_world @ mesh.vertices[index].co for index in triangle.vertices]
        total_area += (points[1] - points[0]).cross(points[2] - points[0]).length * 0.5
        cumulative_areas.append(total_area)
    if total_area <= 1.0e-10:
        raise RuntimeError("Exact Human scalp has degenerate area")

    bounds = scalp_bounds(scalp)
    roots: list[tuple[Vector, Vector]] = []
    candidate_count = max(count * 40, 4000)
    golden = 0.6180339887498949
    for candidate_index in range(candidate_count):
        area_phase = (0.5 + candidate_index * golden) % 1.0
        triangle = triangles[
            min(bisect_left(cumulative_areas, total_area * area_phase), len(triangles) - 1)
        ]
        phase = (0.25 + candidate_index * 0.7548776662466927) % 1.0
        radial = math.sqrt((0.5 + candidate_index * 0.5698402909980532) % 1.0)
        barycentric = (1.0 - radial, radial * (1.0 - phase), radial * phase)
        position = Vector((0.0, 0.0, 0.0))
        normal = Vector((0.0, 0.0, 0.0))
        for weight, vertex_index in zip(barycentric, triangle.vertices):
            vertex = mesh.vertices[vertex_index]
            position += vertex.co * weight
            normal += vertex.normal * weight
        normal.normalize()
        world_position = scalp.matrix_world @ position
        world_normal = (scalp.matrix_world.to_3x3() @ normal).normalized()
        if predicate(world_position, world_normal, bounds):
            roots.append((position, normal))
            if len(roots) == count:
                break
    if len(roots) != count:
        raise RuntimeError(f"Could only sample {len(roots)} of {count} requested scalp roots")
    return roots


def create_native_curves(
    name: str,
    scalp: bpy.types.Object,
    curves: list[list[Vector]],
    radius: float,
    *,
    official_chain_density: float | None = None,
) -> bpy.types.Object:
    if not curves or any(len(curve) < 2 for curve in curves):
        raise RuntimeError(f"{name} received invalid native curve geometry")
    curve_data = bpy.data.hair_curves.new(f"{name}_Curves")
    curve_data.add_curves([len(curve) for curve in curves])
    positions = curve_data.attributes.get("position")
    if positions is None:
        raise RuntimeError(f"{name} did not create a native position attribute")
    flat = [coordinate for curve in curves for point in curve for coordinate in point]
    positions.data.foreach_set("vector", flat)
    curve_data.surface = scalp
    curve_data.surface_uv_map = scalp.data.uv_layers.active.name
    groom = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(groom)
    groom.matrix_world = scalp.matrix_world.copy()
    groom["souldrifter_exact_head_attached"] = True
    groom["souldrifter_curve_count"] = len(curves)
    groom["souldrifter_point_count"] = sum(len(curve) for curve in curves)

    if official_chain_density is not None:
        BASE.configure_official_hair_chain(groom, scalp, official_chain_density)
        BASE.create_root_darkened_hair_material(groom)
        return groom

    node_groups = BASE.load_official_hair_node_assets(("Set Hair Curve Profile",))
    profile = BASE.add_official_hair_modifier(
        groom,
        node_groups,
        "01 Native Catalog Hair Profile",
        "Set Hair Curve Profile",
    )
    for display_name, value in (
        ("Replace Radius", True),
        ("Radius", radius),
        ("Shape", 0.48),
        ("Factor Min", 0.44),
        ("Factor Max", 1.0),
    ):
        BASE.set_modifier_value(profile, display_name, value)
    BASE.create_root_darkened_hair_material(groom)
    return groom


def create_tubular_curves(
    name: str,
    scalp: bpy.types.Object,
    curves: list[list[Vector]],
    radius: float,
    *,
    root_flare: float = 1.0,
) -> bpy.types.Object:
    """Create thick clustered hair geometry for locs and braided bundles."""
    curve_data = bpy.data.curves.new(f"{name}_Curves", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 2
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 3
    curve_data.resolution_u = 2
    curve_data.fill_mode = "FULL"
    for curve in curves:
        spline = curve_data.splines.new("POLY")
        spline.points.add(len(curve) - 1)
        for point_index, (point, position) in enumerate(zip(spline.points, curve)):
            point.co = (*position, 1.0)
            t = point_index / max(1, len(curve) - 1)
            if t < 0.16:
                point.radius = root_flare + (1.0 - root_flare) * (t / 0.16)
            else:
                point.radius = max(0.22, 1.0 - 0.72 * ((t - 0.16) / 0.84))
    groom = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(groom)
    groom.matrix_world = scalp.matrix_world.copy()
    groom["souldrifter_exact_head_attached"] = True
    groom["souldrifter_curve_count"] = len(curves)
    groom["souldrifter_point_count"] = sum(len(curve) for curve in curves)

    BASE.create_root_darkened_hair_material(groom)
    return groom


def create_root_undercoat(
    name: str,
    scalp: bpy.types.Object,
    strand_count: int = 18000,
    length: float = 0.003,
) -> bpy.types.Object:
    roots = sample_scalp_roots(scalp, strand_count, lambda _position, _normal, _bounds: True)
    curves = []
    for index, (root, normal) in enumerate(roots):
        strand_length = length * (0.82 + 0.18 * ((index * 0.6180339887498949) % 1.0))
        curves.append([root + normal * (strand_length * point_index / 4) for point_index in range(5)])
    undercoat = create_native_curves(name, scalp, curves, 0.000055)
    undercoat["souldrifter_style_role"] = "dense exact-scalp root coverage"
    return undercoat


def build_mohawk(scalp: bpy.types.Object) -> list[bpy.types.Object]:
    bounds = scalp_bounds(scalp)
    y_center = (bounds[1][0] + bounds[1][1]) * 0.5
    y_half = max(1.0e-8, (bounds[1][1] - bounds[1][0]) * 0.5)

    def center_strip(position: Vector, _normal: Vector, _bounds) -> bool:
        return abs(position.y - y_center) / y_half <= 0.11

    roots = sample_scalp_roots(scalp, 5000, center_strip)
    curves: list[list[Vector]] = []
    for index, (root, normal) in enumerate(roots):
        world_root = scalp.matrix_world @ root
        front_fraction = (world_root.x - bounds[0][0]) / max(1.0e-8, bounds[0][1] - bounds[0][0])
        arch = 1.0 - abs(front_fraction - 0.52) * 1.35
        lateral = abs(root.y - y_center) / y_half
        length = 0.010 + max(0.0, arch) * 0.020
        length *= (0.72 + 0.28 * ((index * 0.7548776662466927) % 1.0)) * (1.0 - 0.58 * lateral)
        lateral_sign = -1.0 if root.y < y_center else 1.0
        direction = (
            normal * 0.30
            + Vector((-0.10, lateral_sign * 0.34 * lateral, 0.94))
        ).normalized()
        curve = []
        for point_index in range(9):
            t = point_index / 8
            sway = Vector((-0.0025 * math.sin(t * math.pi), 0.0008 * math.sin(index * 1.7) * t, 0.0))
            curve.append(root + direction * (length * t) + sway)
        curves.append(curve)
    mohawk = create_native_curves("HumanFoundation_Hair_Mohawk", scalp, curves, 0.000075)
    mohawk["souldrifter_style"] = "fantasy mohawk, tapered center strip, shaved lateral scalp"
    return [mohawk]


def build_long_loose(scalp: bpy.types.Object) -> list[bpy.types.Object]:
    bounds = scalp_bounds(scalp)
    roots = sample_scalp_roots(scalp, 320, lambda _position, _normal, _bounds: True)
    curves: list[list[Vector]] = []
    for index, (root, normal) in enumerate(roots):
        random_length = (index * 0.6180339887498949) % 1.0
        front_fraction = (root.x - bounds[0][0]) / max(1.0e-8, bounds[0][1] - bounds[0][0])
        length = (0.12 + 0.10 * random_length ** 0.72) if front_fraction > 0.56 else (0.14 + 0.11 * random_length ** 0.72)
        side = -1.0 if root.y < 0.0 or (abs(root.y) < 0.004 and index % 2 == 0) else 1.0
        curve = []
        clump_phase = math.floor(index / 7) * 0.79
        for point_index in range(18):
            t = point_index / 17
            sweep = min(1.0, t / 0.48)
            drop_t = max(0.0, (t - 0.13) / 0.87)
            outward = normal * (0.010 * math.sin(min(1.0, t * 2.2) * math.pi * 0.5))
            side_clearance = 0.028 if front_fraction > 0.56 else 0.012
            gravity_drape = Vector(
                (
                    -0.021 * sweep,
                    side * side_clearance * sweep,
                    -length * drop_t ** 1.12,
                )
            )
            wave_envelope = math.sin(t * math.pi) ** 0.75
            wave = Vector(
                (
                    0.0050 * math.sin(t * math.pi * 2.2 + clump_phase),
                    0.0035 * math.sin(t * math.pi * 2.8 + clump_phase * 1.3),
                    0.0015 * math.sin(t * math.pi * 3.4 + index * 0.17),
                )
            ) * wave_envelope
            curve.append(root + outward + gravity_drape + wave)
        curves.append(curve)
    undercoat = create_root_undercoat("HumanFoundation_Hair_LongLoose_Undercoat", scalp, 12000, 0.012)
    long_hair = create_native_curves(
        "HumanFoundation_Hair_LongLoose",
        scalp,
        curves,
        0.000055,
        official_chain_density=900_000.0,
    )
    long_hair["souldrifter_style"] = "long loose fantasy hair, layered ends, clustered wave, gravity drape"
    return [undercoat, long_hair]


def build_locs(scalp: bpy.types.Object) -> list[bpy.types.Object]:
    bounds = scalp_bounds(scalp)
    roots = sample_scalp_roots(scalp, 300, lambda _position, _normal, _bounds: True)
    lock_curves: list[list[Vector]] = []
    for index, (root, normal) in enumerate(roots):
        length = 0.075 + 0.085 * ((index * 0.5698402909980532) % 1.0)
        front_fraction = (root.x - bounds[0][0]) / max(1.0e-8, bounds[0][1] - bounds[0][0])
        side = -1.0 if root.y < -0.002 else 1.0
        tangent_a = normal.cross(Vector((0.0, 0.0, 1.0)))
        if tangent_a.length_squared < 1.0e-8:
            tangent_a = normal.cross(Vector((1.0, 0.0, 0.0)))
        tangent_a.normalize()
        tangent_b = normal.cross(tangent_a).normalized()
        side_clearance = 0.036 if front_fraction > 0.56 else 0.019
        for strand_index in range(3):
            phase = strand_index * (math.tau / 3.0) + index * 0.29
            curve = []
            for point_index in range(28):
                t = point_index / 27
                root_lift = math.sin(min(1.0, t * 2.1) * math.pi * 0.5)
                outward = normal * (0.012 * root_lift)
                fall = Vector((-0.016 * t, side * side_clearance * t, -length * t ** 1.08))
                bend_envelope = math.sin(t * math.pi)
                natural_bend = Vector(
                    (
                        0.0040 * math.sin(t * math.pi * 1.3 + index * 0.43),
                        0.0030 * math.sin(t * math.pi * 1.9 + index * 0.71),
                        0.0012 * math.sin(t * math.pi * 2.4 + index * 0.19),
                    )
                ) * bend_envelope
                root_envelope = math.sin(min(1.0, t / 0.15) * math.pi * 0.5)
                rope_radius = 0.00115 * root_envelope * (1.0 - 0.48 * t)
                rope_angle = math.tau * 6.5 * t + phase
                rope_offset = (
                    tangent_a * math.cos(rope_angle) + tangent_b * math.sin(rope_angle)
                ) * rope_radius
                curve.append(root + outward + fall + natural_bend + rope_offset)
            lock_curves.append(curve)

    locs = create_tubular_curves(
        "HumanFoundation_Hair_Locs",
        scalp,
        lock_curves,
        0.00070,
        root_flare=3.5,
    )
    locs["souldrifter_style"] = "three-strand rope-textured locs, varied length, gravity drape"
    locs["souldrifter_lock_count"] = len(roots)
    locs["souldrifter_strands_per_lock"] = 3
    return [locs]


def build_bald(_scalp: bpy.types.Object) -> list[bpy.types.Object]:
    """Use the canonical exact head directly; bald is not invisible proxy hair."""
    return []


def build_braid(scalp: bpy.types.Object) -> list[bpy.types.Object]:
    bounds = scalp_bounds(scalp)
    anchor = Vector((bounds[0][0] - 0.008, (bounds[1][0] + bounds[1][1]) * 0.5, bounds[2][1] - 0.045))
    roots = sample_scalp_roots(scalp, 22000, lambda _position, _normal, _bounds: True)
    gathered_curves: list[list[Vector]] = []
    for index, (root, normal) in enumerate(roots):
        target = anchor + Vector((0.0, 0.003 * math.sin(index * 0.31), 0.003 * math.cos(index * 0.47)))
        gathered_curves.append(
            [
                root,
                root + normal * 0.007,
                root.lerp(target, 0.34) + normal * 0.010,
                root.lerp(target, 0.72) + normal * 0.004,
                target,
            ]
        )
    gathered = create_native_curves("HumanFoundation_Hair_BraidGather", scalp, gathered_curves, 0.000055)

    braid_curves: list[list[Vector]] = []
    turns = 5.5
    for strand_index in range(3):
        strand = []
        phase = strand_index * (math.tau / 3.0)
        for point_index in range(72):
            t = point_index / 71
            radius = 0.0050 * (1.0 - 0.58 * t)
            angle = turns * math.tau * t + phase
            strand.append(
                anchor
                + Vector(
                    (
                        -0.018 * t + 0.002 * math.sin(t * math.pi),
                        math.cos(angle) * radius,
                        -0.255 * t + math.sin(angle) * radius,
                    )
                )
            )
        braid_curves.append(strand)
    braid = create_tubular_curves("HumanFoundation_Hair_BraidTail", scalp, braid_curves, 0.00175)
    braid["souldrifter_exact_head_attached"] = False
    braid["souldrifter_attachment_mode"] = "continuous gathered-hair anchor"
    braid["souldrifter_style"] = "single three-strand fantasy braid, gathered exact-scalp roots"
    return [gathered, braid]


BUILDERS = {
    "mohawk": build_mohawk,
    "long-loose": build_long_loose,
    "braid": build_braid,
    "locs": build_locs,
    "bald": build_bald,
}


def object_curve_statistics(item: bpy.types.Object) -> tuple[int, int]:
    if item.type == "CURVES":
        return len(item.data.curves), len(item.data.points)
    if item.type == "CURVE":
        return len(item.data.splines), sum(len(spline.points) for spline in item.data.splines)
    raise RuntimeError(f"Unexpected hair catalog object type: {item.type}")


def render_views(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    target: Vector,
    evidence_dir: Path,
    style: str,
) -> list[str]:
    directions = {
        "front": Vector((1.0, 0.0, 0.03)),
        "left": Vector((0.0, -1.0, 0.03)),
        "right": Vector((0.0, 1.0, 0.03)),
        "rear": Vector((-1.0, 0.0, 0.03)),
        "crown": Vector((0.12, 0.0, 1.0)),
    }
    close_portrait = style in {"mohawk", "bald"}
    scale = 0.31 if close_portrait else 0.47
    target = target if close_portrait else target + Vector((0.0, 0.0, -0.065))
    paths = []
    for view_name, direction in directions.items():
        camera.location = target + direction.normalized() * 0.75
        camera.data.ortho_scale = scale
        BASE.look_at(camera, target)
        path = evidence_dir / f"{style}-{view_name}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        paths.append(str(path))
    return paths


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--style", choices=SUPPORTED_STYLES, required=True)
    parser.add_argument("--version", type=int, default=1)
    parser.add_argument("--source-asset", type=Path, default=BASE.DEFAULT_SOURCE_ASSET)
    parser.add_argument("--evidence-root", type=Path, default=DEFAULT_EVIDENCE_ROOT)
    return parser.parse_args(list(argv))


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    args = parse_args(argv)
    evidence_dir = args.evidence_root / f"human-hair-{args.style}-v{args.version:03d}"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    BASE.clear_scene()
    head = BASE.import_exact_head(args.source_asset)
    scalp, scalp_receipt = BASE.extract_exact_head_scalp(head)
    objects = BUILDERS[args.style](scalp)
    scene, camera, target = BASE.setup_neutral_studio(head)
    render_paths = render_views(scene, camera, target, evidence_dir, args.style)

    blend_path = evidence_dir / f"human-hair-{args.style}-editable.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
    receipt = {
        "style": args.style,
        "source_asset": str(args.source_asset.resolve()),
        "source_sha256": BASE.sha256(args.source_asset),
        "scalp": scalp_receipt,
        "objects": [
            {
                "name": item.name,
                "type": item.type,
                "curve_count": object_curve_statistics(item)[0],
                "point_count": object_curve_statistics(item)[1],
                "exact_head_attached": bool(item.get("souldrifter_exact_head_attached")),
            }
            for item in objects
        ],
        "visible_cap_mesh": False,
        "bald_uses_canonical_head": args.style == "bald",
        "blender_version": bpy.app.version_string,
        "editable_blend": str(blend_path),
        "render_paths": render_paths,
    }
    (evidence_dir / "receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
