#!/usr/bin/env python3
"""Download Poly Haven PBR texture sets (CC0-1.0) for Heartvale surfaces.

For each texture id in TEXTURES, fetches Diffuse / nor_gl / Rough at 1k JPG
into source-assets/polyhaven/textures/<id>/ and records provenance in the
repo-root third-party-assets.json. Idempotent: files already on disk are kept.

Run with the managed runtime:
    python scripts/houdini/download-polyhaven-textures.py
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TEX_ROOT = REPO / "source-assets" / "polyhaven" / "textures"
THIRD_PARTY = REPO / "third-party-assets.json"

UA = {"User-Agent": "SoulDrifter-AssetPipeline/1.0 (contact: local dev)"}

# id -> what it skins in the zone
TEXTURES = {
    "mossy_stone_wall": "Soulwell ring, breach arch, column stubs, Anwel footings",
    "mossy_cobblestone": "Terrace flagstones + steps",
    "plastered_wall": "Anwel house wall panels",
    "wood_planks": "Timber frame, doors, dock planks",
    "thatch_roof_angled": "Thatch cottage roofs",
    "roof_slates_02": "Slate roofs (reeve hall, barn)",
    "brown_mud_leaves_01": "Tree-base soil blend discs",
    "forest_floor": "Well surround + dark forest ground patches",
}

MAPS = {"Diffuse": "diff", "nor_gl": "nor_gl", "Rough": "rough"}


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def fetch_file(url: str, dest: Path) -> int:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as response:
        data = response.read()
    dest.write_bytes(data)
    return len(data)


def main() -> int:
    TEX_ROOT.mkdir(parents=True, exist_ok=True)
    manifest_path = TEX_ROOT.parent / "download-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
    textures_log = manifest.setdefault("textures", {})

    for index, (tex_id, use) in enumerate(TEXTURES.items(), 1):
        out_dir = TEX_ROOT / tex_id
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"[{index}/{len(TEXTURES)}] {tex_id}: {use}")
        try:
            files = fetch_json(f"https://api.polyhaven.com/files/{tex_id}")
        except Exception as exc:  # noqa: BLE001
            print(f"  !! files lookup failed: {exc}")
            continue
        saved: dict[str, str] = {}
        for api_key, tag in MAPS.items():
            entry = files.get(api_key, {})
            one_k = entry.get("1k", {})
            url = one_k.get("jpg", {}).get("url") or one_k.get("png", {}).get("url")
            if not url:
                print(f"  -- no 1k {api_key}, skipped")
                continue
            ext = ".jpg" if "jpg" in one_k and one_k.get("jpg", {}).get("url") == url else ".png"
            dest = out_dir / f"{tex_id}_{tag}_1k{ext}"
            if dest.is_file() and dest.stat().st_size > 0:
                saved[tag] = dest.name
                print(f"  .. {dest.name} already present")
                continue
            try:
                size = fetch_file(url, dest)
            except Exception as exc:  # noqa: BLE001
                print(f"  !! {api_key} download failed: {exc}")
                continue
            saved[tag] = dest.name
            print(f"  ok {dest.name} ({size // 1024} KB)")
            time.sleep(0.4)  # be polite to the CDN
        textures_log[tex_id] = {"use": use, "maps": saved, "license": "CC0-1.0"}

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    third_party = json.loads(THIRD_PARTY.read_text(encoding="utf-8")) if THIRD_PARTY.is_file() else {"shippingAssets": []}
    assets = third_party.setdefault("shippingAssets", [])
    known = {(a.get("id"), a.get("kind")) for a in assets}
    for tex_id, use in TEXTURES.items():
        if (tex_id, "texture") in known:
            continue
        assets.append({
            "id": tex_id,
            "kind": "texture",
            "source": f"https://polyhaven.com/a/{tex_id}",
            "license": "CC0-1.0",
            "use": use,
        })
    THIRD_PARTY.write_text(json.dumps(third_party, indent=2) + "\n", encoding="utf-8")
    print(f"recorded {len(TEXTURES)} texture sets; {len(assets)} shipping assets total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
