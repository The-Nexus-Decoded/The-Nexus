"""Prepare a material-correct LOD from a licensed glTF for review, using Houdini.

Preserves each material's selected UV channel before reduction. Some multi-UV
glTF importers collapse the last channel into uv, including empty channels.
All output stays in the explicitly named quarantine directory, never the input.
Run with hython; ordinary game builds do not require Houdini.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import time
import hou


def prepare(source, output, triangles, feature_weight, material_budgets):
    source, output = source.resolve(), output.resolve()
    if source.parent == output or source.parent in output.parents:
        raise ValueError("Use a separate quarantine output directory")
    output.mkdir(parents=True, exist_ok=True)
    doc = json.loads(source.read_text(encoding="utf-8"))
    original = json.loads(json.dumps(doc))
    changes = []
    for mesh in doc["meshes"]:
        for primitive in mesh["primitives"]:
            material = doc["materials"][primitive["material"]]
            maps = [material.get("normalTexture"), material.get("occlusionTexture"),
                    material.get("emissiveTexture")]
            maps += [material.get("pbrMetallicRoughness", {}).get(k)
                     for k in ["baseColorTexture", "metallicRoughnessTexture"]]
            channels = {m.get("texCoord", 0) for m in maps if m}
            if len(channels) != 1:
                raise ValueError("Material must use one explicit texture channel")
            channel = next(iter(channels))
            selected = primitive["attributes"][f"TEXCOORD_{channel}"]
            primitive["attributes"] = {k: v for k, v in primitive["attributes"].items()
                                       if not k.startswith("TEXCOORD_")}
            primitive["attributes"]["TEXCOORD_0"] = selected
            changes.append({"material": material["name"], "selectedUV": channel})
    # Geometry-only import: final pack restores the unchanged original PBR maps.
    doc["materials"] = [{"name": m["name"]} for m in doc["materials"]]
    for key in ["images", "textures", "samplers"]:
        doc.pop(key, None)
    for index, buffer in enumerate(doc["buffers"]):
        filename = f"source-buffer-{index}.bin"
        shutil.copyfile(source.parent / buffer["uri"], output / filename)
        buffer["uri"] = filename
    prepared = output / "uv-selected.gltf"
    prepared.write_text(json.dumps(doc), encoding="utf-8")
    geo = hou.Geometry()
    geo.loadFromFile(prepared.as_posix())
    flat = hou.Geometry()
    for primitive in geo.prims():
        if primitive.type() == hou.primType.PackedGeometry:
            part = primitive.getEmbeddedGeometry().freeze()
            part.transform(primitive.fullTransform())
            flat.merge(part)
        else:
            flat.merge(geo)
            break
    container = hou.node("/obj").createNode("geo", "REVIEW_PROP_LOD")
    try:
        for child in container.children():
            child.destroy()
        stash = container.createNode("stash", "SOURCE")
        stash.parm("stash").set(flat)
        def reduce_part(input_node, budget, count):
            node = container.createNode("polyreduce::2.0", "LOD")
            node.setInput(0, input_node)
            node.parm("percentage").set(min(100, budget / count * 100))
            node.parm("boundaryweight").set(feature_weight)
            node.parm("vattribseamweight").set(feature_weight)
            node.parm("silhouetteweight").set(feature_weight)
            return node

        if material_budgets:
            names = sorted(set(flat.findPrimAttrib("gltf_material_name").strings()))
            if set(names) != set(material_budgets):
                raise ValueError("Provide an explicit triangle budget for every source material")
            reduce = container.createNode("merge", "MATERIAL_LODS")
            for index, name in enumerate(names):
                part = container.createNode("blast", "SOURCE_MATERIAL")
                part.setInput(0, stash)
                part.parm("group").set(f"@gltf_material_name={name}")
                part.parm("negate").set(True)
                reduce.setInput(index, reduce_part(part, material_budgets[name], len(part.geometry().prims())))
        else:
            reduce = reduce_part(stash, triangles, len(flat.prims()))
        reduced = reduce.geometry()
        materials = sorted(set(reduced.findPrimAttrib("gltf_material_name").strings()))
        reduced.saveToFile((output / "review-lod.bgeo.sc").as_posix())
        for material in materials:
            blast = container.createNode("blast", "MATERIAL")
            blast.setInput(0, reduce)
            blast.parm("group").set(f"@gltf_material_name={material}")
            blast.parm("negate").set(True)
            target = output / f"{material}.gltf"
            rop = hou.node("/out").createNode("gltf", "REVIEW_EXPORT")
            try:
                rop.parm("usesoppath").set(True)
                rop.parm("soppath").set(blast.path())
                rop.parm("outputfile").set(target.as_posix())
                rop.render(verbose=False)
            finally:
                rop.destroy()
            # Houdini's URI can contain unescaped Windows separators.
            text = target.read_text(encoding="utf-8")
            text = re.sub(r'("uri"\s*:\s*")([^"]*_data\.bin)(")',
                          lambda m: m[1] + m[2].replace("\\", "/").split("/")[-1] + m[3], text)
            target.write_text(text, encoding="utf-8")
            blast.destroy()
        receipt = {"source": str(source), "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                   "sourceTriangles": len(flat.prims()), "reducedTriangles": len(reduced.prims()), "featureWeight": feature_weight,
                   "materials": materials, "selectedUVs": changes, "materialBudgets": material_budgets,
                   "sourceMaterials": original["materials"], "status": "geometry prepared; PBR and visual review pending"}
        (output / "preparation.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
        print(json.dumps({k: v for k, v in receipt.items() if k != "sourceMaterials"}))
    finally:
        container.destroy()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--triangles", type=int, default=60000)
    parser.add_argument("--feature-weight", type=float, default=10)
    parser.add_argument("--material-triangles", action="append", default=[], metavar="MATERIAL=COUNT")
    args = parser.parse_args()
    if not 100 <= args.triangles <= 1000000:
        parser.error("triangles must be 100–1000000")
    if not 1 <= args.feature_weight <= 1000:
        parser.error("feature-weight must be 1–1000")
    budgets = {}
    for item in args.material_triangles:
        name, separator, value = item.rpartition("=")
        if not separator or not name or not value.isdecimal() or not 100 <= int(value) <= 1000000 or name in budgets:
            parser.error("material-triangles needs unique MATERIAL=COUNT entries, count 100–1000000")
        budgets[name] = int(value)
    started = time.monotonic()
    prepare(args.source, args.output, args.triangles, args.feature_weight, budgets)
    print(f"Completed in {time.monotonic() - started:.1f}s")
