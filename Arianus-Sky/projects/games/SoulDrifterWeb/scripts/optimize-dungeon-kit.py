#!/usr/bin/env python3
"""Reproduce the reviewed dungeon kit from its canonical provenance register."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = PROJECT_ROOT / "docs" / "3d-ai-studio" / "dungeon-kit-provenance.json"
RUNTIME_DIR = PROJECT_ROOT / "public" / "assets" / "3d" / "environment" / "dungeon-kit"
CLI_PATH = PROJECT_ROOT / "node_modules" / "@gltf-transform" / "cli" / "bin" / "cli.js"
GLB_MAGIC = b"glTF"
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942
TASK_ID_PATTERN = re.compile(r"^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$")


def align_four(data: bytes, padding: bytes = b"\0") -> bytes:
    return data + padding * ((-len(data)) % 4)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def project_path(raw_path: str) -> Path:
    candidate = (PROJECT_ROOT / raw_path).resolve()
    try:
        candidate.relative_to(PROJECT_ROOT)
    except ValueError as error:
        raise ValueError(f"Manifest path escapes the project root: {raw_path}") from error
    return candidate


def parse_glb(path: Path) -> tuple[dict[str, Any], bytes]:
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
    binary = data[json_end + 8 : json_end + 8 + bin_length]
    return document, binary


def validate_file(path: Path, record: dict[str, Any], label: str) -> None:
    if not path.is_file():
        raise ValueError(f"Missing {label}: {path.relative_to(PROJECT_ROOT)}")
    if path.stat().st_size != record["bytes"]:
        raise ValueError(f"{label} byte count drifted: {path.name}")
    if file_sha256(path) != record["sha256"]:
        raise ValueError(f"{label} SHA-256 drifted: {path.name}")
    parse_glb(path)


def load_manifest(validate_runtime: bool) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    assets = manifest.get("assets")
    if manifest.get("schemaVersion") != 1 or not isinstance(assets, list) or len(assets) != 37:
        raise ValueError("Dungeon-kit provenance must contain exactly 37 schema-v1 assets")

    seen_ids: set[str] = set()
    seen_sources: set[Path] = set()
    seen_runtimes: set[Path] = set()
    for asset in assets:
        asset_id = asset.get("id")
        if not isinstance(asset_id, str) or asset_id in seen_ids:
            raise ValueError(f"Invalid or duplicate dungeon asset id: {asset_id!r}")
        seen_ids.add(asset_id)
        if asset.get("provider") != "3D AI Studio" or not TASK_ID_PATTERN.fullmatch(
            asset.get("providerTaskId", "")
        ):
            raise ValueError(f"Missing provider/task provenance for {asset_id}")
        license_record = asset.get("license", {})
        if (
            license_record.get("commercialUse") is not True
            or license_record.get("outputRights") != "full"
            or not license_record.get("url")
            or not asset.get("ownership")
        ):
            raise ValueError(f"Incomplete ownership/license record for {asset_id}")
        if asset.get("reviewStatus") != "approved-runtime-source-pair":
            raise ValueError(f"Unapproved runtime/source pair: {asset_id}")

        source_path = project_path(asset["source"]["path"])
        runtime_path = project_path(asset["runtime"]["path"])
        if source_path in seen_sources or runtime_path in seen_runtimes:
            raise ValueError(f"Duplicate source/runtime path for {asset_id}")
        seen_sources.add(source_path)
        seen_runtimes.add(runtime_path)
        if runtime_path.parent != RUNTIME_DIR or source_path.name != runtime_path.name:
            raise ValueError(f"Invalid source/runtime mapping for {asset_id}")
        validate_file(source_path, asset["source"], "source GLB")
        if validate_runtime:
            validate_file(runtime_path, asset["runtime"], "runtime GLB")

        policy = asset.get("transformPolicy", {})
        mode = policy.get("mode")
        if mode not in {"webOptimizeV1", "preserveSource"}:
            raise ValueError(f"Unsupported transform policy for {asset_id}: {mode}")
        if mode == "preserveSource" and asset["source"]["sha256"] != asset["runtime"]["sha256"]:
            raise ValueError(f"preserveSource hashes differ for {asset_id}")

    if validate_runtime:
        actual_runtime = {path.resolve() for path in RUNTIME_DIR.glob("*.glb")}
        if actual_runtime != seen_runtimes:
            raise ValueError("Runtime dungeon-kit inventory differs from the canonical 37-file manifest")
    return manifest, assets


def validate_cli(manifest: dict[str, Any]) -> None:
    if not CLI_PATH.is_file():
        raise ValueError("Install declared project dependencies before optimizing the dungeon kit")
    result = subprocess.run(
        [shutil.which("node") or "node", str(CLI_PATH), "--version"],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    version = result.stdout.strip().lstrip("v")
    expected = manifest["optimizer"]["version"]
    if version != expected:
        raise ValueError(f"@gltf-transform/cli version {version!r} does not match pinned {expected!r}")


def recompress_texture(payload: bytes, image_name: str, texture_size: int) -> bytes:
    with Image.open(io.BytesIO(payload)) as source:
        image = source.convert("RGB")
        image.thumbnail((texture_size, texture_size), Image.Resampling.LANCZOS)
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


def repack_glb_textures(input_path: Path, output_path: Path, texture_size: int) -> None:
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
        payload = binary[start : start + view["byteLength"]]
        image_entry = image_views.get(view_index)
        if image_entry:
            image_index, image = image_entry
            payload = recompress_texture(
                payload, image.get("name", f"image-{image_index}"), texture_size
            )
            image["mimeType"] = "image/jpeg"
        while len(rebuilt) % 4:
            rebuilt.append(0)
        view["byteOffset"] = len(rebuilt)
        view["byteLength"] = len(payload)
        rebuilt.extend(payload)

    binary_chunk = align_four(bytes(rebuilt))
    document["buffers"][0]["byteLength"] = len(binary_chunk)
    json_chunk = align_four(json.dumps(document, separators=(",", ":")).encode(), b" ")
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


def optimize_model(asset: dict[str, Any], output: Path, scratch: Path) -> None:
    source = project_path(asset["source"]["path"])
    policy = asset["transformPolicy"]
    if policy["mode"] == "preserveSource":
        shutil.copy2(source, output)
    else:
        repacked_path = scratch / source.name
        repack_glb_textures(source, repacked_path, policy["textureMaxSize"])
        subprocess.run(
            [
                shutil.which("node") or "node",
                str(CLI_PATH),
                "optimize",
                str(repacked_path),
                str(output),
                "--compress",
                "meshopt",
                "--texture-compress",
                "false",
                "--simplify-ratio",
                str(policy["simplifyRatio"]),
                "--simplify-error",
                str(policy["simplifyError"]),
            ],
            cwd=PROJECT_ROOT,
            check=True,
        )
    validate_file(output, asset["runtime"], "generated runtime GLB")


def promote_runtime(staged: Path) -> None:
    backup = RUNTIME_DIR.parent / ".dungeon-kit-backup"
    if backup.exists():
        raise ValueError(f"Refusing promotion while backup exists: {backup}")
    RUNTIME_DIR.replace(backup)
    try:
        staged.replace(RUNTIME_DIR)
    except Exception:
        if not RUNTIME_DIR.exists():
            backup.replace(RUNTIME_DIR)
        raise
    shutil.rmtree(backup)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="validate dependency, provenance, source files, and current runtime files without writing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest, assets = load_manifest(validate_runtime=args.check)
    validate_cli(manifest)
    if args.check:
        print(f"Verified {len(assets)} canonical dungeon source/runtime GLB pairs.")
        return

    source_bytes = sum(asset["source"]["bytes"] for asset in assets)
    with tempfile.TemporaryDirectory(prefix="souldrifter-dungeon-kit-", dir=RUNTIME_DIR.parent) as temp_dir:
        scratch = Path(temp_dir)
        outputs = scratch / "dungeon-kit"
        outputs.mkdir()
        for asset in assets:
            optimize_model(asset, outputs / Path(asset["runtime"]["path"]).name, scratch)
        promote_runtime(outputs)

    _, verified_assets = load_manifest(validate_runtime=True)
    runtime_bytes = sum(asset["runtime"]["bytes"] for asset in verified_assets)
    reduction = 100 * (1 - runtime_bytes / source_bytes)
    print(
        f"Optimized {len(verified_assets)} dungeon props: "
        f"{source_bytes:,} -> {runtime_bytes:,} bytes ({reduction:.1f}% smaller)."
    )


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, json.JSONDecodeError, subprocess.CalledProcessError) as error:
        raise SystemExit(f"Dungeon-kit optimization failed: {error}") from error
