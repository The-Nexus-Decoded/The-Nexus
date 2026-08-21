"""Inspect GLB mesh islands and bounds before retopology or rigid segmentation."""

from __future__ import annotations

import argparse
from collections import defaultdict
import json
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def arguments() -> argparse.Namespace:
    try:
        separator = sys.argv.index("--")
    except ValueError as exc:
        raise SystemExit("Blender arguments must follow --") from exc

    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--top-components", type=int, default=100)
    return parser.parse_args(sys.argv[separator + 1 :])


class DisjointSet:
    def __init__(self, size: int) -> None:
        self.parents = list(range(size))
        self.ranks = bytearray(size)

    def find(self, item: int) -> int:
        parent = self.parents[item]
        while parent != self.parents[parent]:
            parent = self.parents[parent]
        while item != parent:
            next_item = self.parents[item]
            self.parents[item] = parent
            item = next_item
        return parent

    def union(self, left: int, right: int) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root == right_root:
            return
        if self.ranks[left_root] < self.ranks[right_root]:
            left_root, right_root = right_root, left_root
        self.parents[right_root] = left_root
        if self.ranks[left_root] == self.ranks[right_root]:
            self.ranks[left_root] += 1


def inspect_mesh(item: bpy.types.Object, top_components: int) -> dict:
    mesh = item.data
    islands = DisjointSet(len(mesh.vertices))
    for edge in mesh.edges:
        islands.union(edge.vertices[0], edge.vertices[1])

    counts = defaultdict(lambda: {"vertices": 0, "polygons": 0, "minimum": None, "maximum": None})
    matrix = item.matrix_world
    for vertex in mesh.vertices:
        root = islands.find(vertex.index)
        point = matrix @ vertex.co
        component = counts[root]
        component["vertices"] += 1
        if component["minimum"] is None:
            component["minimum"] = point.copy()
            component["maximum"] = point.copy()
        else:
            minimum: Vector = component["minimum"]
            maximum: Vector = component["maximum"]
            component["minimum"] = Vector(
                (min(minimum.x, point.x), min(minimum.y, point.y), min(minimum.z, point.z))
            )
            component["maximum"] = Vector(
                (max(maximum.x, point.x), max(maximum.y, point.y), max(maximum.z, point.z))
            )
    for polygon in mesh.polygons:
        if polygon.vertices:
            counts[islands.find(polygon.vertices[0])]["polygons"] += 1

    components = []
    for component in counts.values():
        minimum = component["minimum"]
        maximum = component["maximum"]
        components.append(
            {
                "vertices": component["vertices"],
                "polygons": component["polygons"],
                "minimum": [round(value, 6) for value in minimum],
                "maximum": [round(value, 6) for value in maximum],
                "dimensions": [round(value, 6) for value in maximum - minimum],
                "center": [round(value, 6) for value in (minimum + maximum) / 2],
            }
        )
    components.sort(key=lambda component: component["polygons"], reverse=True)

    return {
        "name": item.name,
        "vertices": len(mesh.vertices),
        "edges": len(mesh.edges),
        "polygons": len(mesh.polygons),
        "connectedComponents": len(components),
        "largestComponentPolygonShare": round(
            components[0]["polygons"] / max(len(mesh.polygons), 1),
            6,
        ),
        "topComponents": components[:top_components],
    }


def main() -> None:
    args = arguments()
    source = args.input.resolve()
    output = args.output.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"{source.name} imported without meshes")

    report = {
        "source": str(source),
        "meshCount": len(meshes),
        "meshes": [inspect_mesh(item, args.top_components) for item in meshes],
        "sourceModified": False,
    }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
