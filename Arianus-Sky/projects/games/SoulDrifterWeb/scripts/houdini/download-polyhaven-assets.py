#!/usr/bin/env python
"""Download Poly Haven CC0 model packs (1k glTF + JPG textures) for the
Heartvale Houdini scene.

Usage (managed python, from SoulDrifterWeb):
  python scripts/houdini/download-polyhaven-assets.py <asset_id> [<asset_id> ...]

Each asset lands in source-assets/polyhaven/<id>/ as:
  <id>.gltf            (renamed from <id>_1k.gltf)
  <id>.bin             (geometry buffer)
  textures/*.jpg       (every texture the glTF references)

The script also strips a *required* KHR_texture_transform flag from the glTF
JSON when present: Houdini's glTF importer rejects files that require it.
The geometry and texture files are untouched; the flag only governs optional
UV tiling metadata. All assets are CC0 — record them in third-party-assets.json.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urljoin

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_ROOT = REPO_ROOT / "source-assets" / "polyhaven"
FILES_API = "https://api.polyhaven.com/files/{id}"
UA = {"User-Agent": "SoulDrifter-AssetFetch/1.0"}


def fetch(url: str, timeout: int = 120) -> bytes:
    request = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def download(url: str, dest: Path) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.is_file() and dest.stat().st_size > 0:
        return dest.stat().st_size
    data = fetch(url, timeout=300)
    dest.write_bytes(data)
    return len(data)


def strip_khr_texture_transform(gltf: dict) -> bool:
    """Remove KHR_texture_transform from required/used lists and materials."""
    removed = False
    for key in ("extensionsRequired", "extensionsUsed"):
        if key in gltf and "KHR_texture_transform" in gltf[key]:
            gltf[key] = [e for e in gltf[key] if e != "KHR_texture_transform"]
            if not gltf[key]:
                del gltf[key]
            removed = True

    def scrub(node: object) -> None:
        nonlocal removed
        if isinstance(node, dict):
            ext = node.get("extensions")
            if isinstance(ext, dict) and "KHR_texture_transform" in ext:
                del ext["KHR_texture_transform"]
                if not ext:
                    del node["extensions"]
                removed = True
            for value in node.values():
                scrub(value)
        elif isinstance(node, list):
            for value in node:
                scrub(value)

    scrub(gltf.get("materials", []))
    return removed


def process_asset(aid: str) -> dict:
    info = json.loads(fetch(FILES_API.format(id=aid)).decode("utf-8"))
    gltf_variants = info.get("gltf", {})
    variant = gltf_variants.get("1k") or next(iter(gltf_variants.values()))
    gltf_url = variant["gltf"]["url"]

    asset_dir = OUT_ROOT / aid
    gltf_path = asset_dir / f"{aid}.gltf"
    gltf_path.parent.mkdir(parents=True, exist_ok=True)
    gltf = json.loads(fetch(gltf_url).decode("utf-8"))
    if strip_khr_texture_transform(gltf):
        print(f"  {aid}: stripped required KHR_texture_transform (Houdini import fix)")
    gltf_path.write_text(json.dumps(gltf), encoding="utf-8")

    files = [f"{aid}.gltf"]
    base_url = gltf_url.rsplit("/", 1)[0] + "/"
    for buffer in gltf.get("buffers", []):
        uri = buffer.get("uri", "")
        if uri and not uri.startswith("data:"):
            # Normalize the buffer name to <id>.bin so build scripts can rely on it.
            dest = asset_dir / f"{aid}.bin"
            size = download(urljoin(base_url, uri), dest)
            if buffer.get("uri") != f"{aid}.bin":
                # Re-point the glTF at the normalized local name.
                pass
            files.append(f"{aid}.bin")
            print(f"  {aid}/{aid}.bin  {size / 1e6:.1f} MB")
    for image in gltf.get("images", []):
        uri = image.get("uri", "")
        if not uri or uri.startswith("data:"):
            continue
        name = uri.rsplit("/", 1)[-1]
        # Textures are not hosted beside the glTF; they live under the jpg tree.
        url = f"https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/{aid}/{name}"
        size = download(url, asset_dir / "textures" / name)
        files.append(f"textures/{name}")
        print(f"  {aid}/textures/{name}  {size / 1e6:.1f} MB")

    # Normalize buffer uri references after downloads.
    if (asset_dir / f"{aid}.bin").is_file():
        for buffer in gltf.get("buffers", []):
            if buffer.get("uri") and not buffer["uri"].startswith("data:"):
                buffer["uri"] = f"{aid}.bin"
        gltf_path.write_text(json.dumps(gltf), encoding="utf-8")

    return {"gltf": f"{aid}.gltf", "files": sorted(set(files))}


def main() -> None:
    asset_ids = sys.argv[1:]
    if not asset_ids:
        print(__doc__)
        raise SystemExit(1)

    manifest_path = OUT_ROOT / "download-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
    for aid in asset_ids:
        print(f"{aid}:")
        manifest[aid] = process_asset(aid)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"manifest updated: {manifest_path}")


if __name__ == "__main__":
    main()
