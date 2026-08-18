#!/usr/bin/env python3
"""Create web-runtime GLBs from the preserved 3D Studio dungeon-kit sources."""

from __future__ import annotations

import io
import json
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIRS = (
    PROJECT_ROOT / "docs" / "3d-ai-studio" / "source-models" / "environment" / "dungeon-kit",
    PROJECT_ROOT / "docs" / "3d-ai-studio" / "source-models" / "environment" / "dungeon-completion-kit",
)
RUNTIME_DIR = PROJECT_ROOT / "public" / "assets" / "3d" / "environment" / "dungeon-kit"
CLI_PATH = PROJECT_ROOT / "node_modules" / "@gltf-transform" / "cli" / "bin" / "cli.js"
TEXTURE_SIZE = 256
GLB_MAGIC = b"glTF"
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def align_four(data: bytes, padding: bytes = b"\0") -> bytes:
    return data + padding * ((-len(data)) % 4)


def parse_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    if len(data) < 28 or data[:4] != GLB_MAGIC:
        raise ValueError(f"{path.name} is not a binary glTF file")
    version, declared_length = struct.unpack_from("<II", data, 4)
    if version != 2 or declared_length != len(data):
        raise ValueError(f"{path.name} has an invalid GLB header")
    json_length, json_type = struct.unpack_from("<II", data, 12)
    if json_type != JSON_CHUNK:
        raise ValueError(f"{path.name} is missing its JSON chunk")
    json_start = 20
    json_end = json_start + json_length
    document = json.loads(data[json_start:json_end].decode("utf-8").rstrip(" \0"))
    bin_length, bin_type = struct.unpack_from("<II", data, json_end)
    if bin_type != BIN_CHUNK:
        raise ValueError(f"{path.name} is missing its binary chunk")
    binary = data[json_end + 8:json_end + 8 + bin_length]
    return document, binary


def recompress_texture(payload: bytes, image_name: str) -> bytes:
    with Image.open(io.BytesIO(payload)) as source:
        image = source.convert("RGB")
        image.thumbnail((TEXTURE_SIZE, TEXTURE_SIZE), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        is_data_map = "normal" in image_name.lower() or "orm" in image_name.lower()
        image.save(
            output,
            format="JPEG",
            quality=72 if is_data_map else 78,
            optimize=True,
            progressive=True,
            subsampling=0 if is_data_map else 2,
        )
        return output.getvalue()


def repack_glb_textures(input_path: Path, output_path: Path) -> None:
    document, binary = parse_glb(input_path)
    buffer_views = document.get("bufferViews", [])
    image_views = {
        image["bufferView"]: (index, image)
        for index, image in enumerate(document.get("images", []))
        if "bufferView" in image
    }
    rebuilt = bytearray()
    for view_index, view in enumerate(buffer_views):
        start = view.get("byteOffset", 0)
        end = start + view["byteLength"]
        payload = binary[start:end]
        image_entry = image_views.get(view_index)
        if image_entry:
            image_index, image = image_entry
            payload = recompress_texture(payload, image.get("name", f"image-{image_index}"))
            image["mimeType"] = "image/jpeg"
        while len(rebuilt) % 4:
            rebuilt.append(0)
        view["byteOffset"] = len(rebuilt)
        view["byteLength"] = len(payload)
        rebuilt.extend(payload)

    binary_chunk = align_four(bytes(rebuilt))
    document["buffers"][0]["byteLength"] = len(binary_chunk)
    json_chunk = align_four(json.dumps(document, separators=(",", ":")).encode("utf-8"), b" ")
    total_length = 12 + 8 + len(json_chunk) + 8 + len(binary_chunk)
    output_path.write_bytes(
        GLB_MAGIC
        + struct.pack("<II", 2, total_length)
        + struct.pack("<II", len(json_chunk), JSON_CHUNK)
        + json_chunk
        + struct.pack("<II", len(binary_chunk), BIN_CHUNK)
        + binary_chunk
    )
    parse_glb(output_path)


def optimize_model(source: Path, output: Path, scratch: Path) -> None:
    repacked_path = scratch / source.name
    repack_glb_textures(source, repacked_path)
    subprocess.run(
        [
            shutil.which("node") or "node",
            str(CLI_PATH),
            "optimize",
            str(repacked_path),
            str(output),
            "--compress", "meshopt",
            "--texture-compress", "false",
            "--simplify-ratio", "0.75",
            "--simplify-error", "0.0005",
        ],
        cwd=PROJECT_ROOT,
        check=True,
    )
    parse_glb(output)


def main() -> None:
    if not CLI_PATH.is_file():
        raise SystemExit("Install project dependencies before optimizing the dungeon kit.")
    sources = sorted(
        source
        for source_dir in SOURCE_DIRS
        for source in source_dir.glob("*.glb")
    )
    if not sources:
        raise SystemExit(f"No source GLBs found under {SOURCE_DIRS}")
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    source_bytes = sum(path.stat().st_size for path in sources)
    with tempfile.TemporaryDirectory(prefix="souldrifter-dungeon-kit-") as temp_dir:
        scratch = Path(temp_dir)
        outputs = scratch / "outputs"
        outputs.mkdir()
        for source in sources:
            optimize_model(source, outputs / source.name, scratch)
        for output in outputs.glob("*.glb"):
            shutil.copy2(output, RUNTIME_DIR / output.name)
    runtime_files = sorted(RUNTIME_DIR.glob("*.glb"))
    if len(runtime_files) != len(sources):
        raise SystemExit("Runtime dungeon-kit file count does not match the source kit.")
    runtime_bytes = sum(path.stat().st_size for path in runtime_files)
    reduction = 100 * (1 - runtime_bytes / source_bytes)
    print(
        f"Optimized {len(runtime_files)} dungeon props: "
        f"{source_bytes:,} -> {runtime_bytes:,} bytes ({reduction:.1f}% smaller)."
    )


if __name__ == "__main__":
    main()
