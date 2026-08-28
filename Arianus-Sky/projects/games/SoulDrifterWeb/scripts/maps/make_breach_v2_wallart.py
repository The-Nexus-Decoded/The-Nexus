"""LEGACY BREACH-V2 placeholder wall-art generator.

The shipped narrative paintings, tapestries, and reliefs are original
lore-derived image-generation outputs. This script is retained only to explain
the superseded placeholder provenance and to rebuild the approved Thalenyr
scroll mount when explicitly requested. It refuses normal execution so it
cannot overwrite the production art with labeled UI-style placeholders.

Scroll-only rebuild:
  python make_breach_v2_wallart.py --game-root ../.. --mode scroll \
    --atlas ../../public/lore-atlas/assets/M-003_painted_atlas.png
"""

import argparse
import hashlib
import json
import os
import random
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT_NAME = "art"  # under public/assets/textures/environment/breach-v2/
PROJECT_NAME = "souldrifter-web"
ATLAS_SHA256 = "88d5fe568603d41a677feddde964b588862e6418b2c8f818ea4fc20e5582913f"
FONT_REGULAR_SHA256 = "ba5564634b93a8f8ba57b48cd4f1ae7417d2b4656fbac779028679b00de3cf12"
FONT_BOLD_SHA256 = "f4d83d34d1f6c741193e4acf4b3dff9531e5a67b6aa65228d00a7db72a4e0f34"
FONT_REGULAR = None
FONT_BOLD = None


def sha256_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stable_seed(art_id):
    return int.from_bytes(hashlib.sha256(art_id.encode("utf-8")).digest()[:8], "big")


def font(size, bold=True):
    path = FONT_BOLD if bold else FONT_REGULAR
    if path is None:
        raise RuntimeError("Wall-art fonts were not initialized")
    return ImageFont.truetype(path, size)


def scroll_map(art_id, atlas_path):
    w, h = 768, 512
    img = Image.new("RGB", (w, h), (216, 196, 158))  # parchment
    d = ImageDraw.Draw(img, "RGBA")
    rng = random.Random(stable_seed(art_id))
    for _ in range(w * h // 40):
        x, y = rng.randrange(w), rng.randrange(h)
        d.point((x, y), fill=(150, 128, 90, rng.randint(20, 60)))
    d.rectangle([10, 10, w - 10, h - 10], outline=(120, 96, 60, 160), width=3)
    if not Path(atlas_path).is_file():
        raise FileNotFoundError(f"Pinned atlas is missing: {atlas_path}")
    atlas = Image.open(atlas_path).convert("RGB").resize(
        (w - 120, h - 160), Image.Resampling.LANCZOS
    )
    img.paste(atlas, (60, 44))
    d.rectangle([60, 44, w - 60, h - 116], outline=(90, 70, 44), width=4)
    f = font(40)
    label = "THALENYR — THE VERDANT ECHO"
    tw = d.textlength(label, font=f)
    d.text(((w - tw) / 2, h - 64), label, font=f, fill=(88, 68, 40))
    return img


def validate_project(game_root, atlas):
    global FONT_REGULAR, FONT_BOLD
    package = game_root / "package.json"
    registry = game_root / "third-party-assets.json"
    if not package.is_file() or json.loads(package.read_text(encoding="utf-8")).get("name") != PROJECT_NAME:
        raise ValueError(f"Not a {PROJECT_NAME} project root: {game_root}")
    if not registry.is_file():
        raise FileNotFoundError(f"Asset registry is missing: {registry}")
    FONT_REGULAR = game_root / "public/assets/fonts/Alegreya-Variable.ttf"
    FONT_BOLD = game_root / "public/assets/fonts/Cinzel-Variable.ttf"
    checks = (
        (atlas, ATLAS_SHA256, "atlas"),
        (FONT_REGULAR, FONT_REGULAR_SHA256, "regular font"),
        (FONT_BOLD, FONT_BOLD_SHA256, "bold font"),
    )
    for path, expected, label in checks:
        if not path.is_file():
            raise FileNotFoundError(f"Pinned {label} is missing: {path}")
        actual = sha256_file(path)
        if actual != expected:
            raise RuntimeError(f"Pinned {label} hash mismatch: expected {expected}, found {actual}")
    return registry


def requested_builders(mode, atlas):
    scroll = ("art-map-thalenyr-scroll", lambda: scroll_map("art-map-thalenyr-scroll", atlas))
    return [scroll]


def build_records(written):
    return [{
        "id": f"breach-v2-wall-art-{art_id}",
        "name": f"BREACH-V2 procedural wall art — {art_id}",
        "url": "scripts/maps/make_breach_v2_wallart.py (local procedural PIL)",
        "license": "Project-original in-house art (SoulDrifter); no third-party content",
        "usage": "in-world framed wall art at named §5A sockets (banners/reliefs/painting/scroll)",
        "bundled": True,
        "sha256": sha256_file(out),
        "notes": (
            "Stable SHA-256 seed; pinned checked-in fonts and M-003 atlas; staged validation and atomic promotion."
        ),
    } for art_id, out in written]


def update_registry(registry, records):
    data = json.loads(registry.read_text(encoding="utf-8"))
    replacements = {record["id"]: record for record in records}
    shipping = []
    for asset in data.get("shippingAssets", []):
        shipping.append(replacements.pop(asset.get("id"), asset))
    shipping.extend(replacements.values())
    data["shippingAssets"] = shipping
    return data


def promote_files(staged_targets):
    promoted = []
    try:
        for staged, target in staged_targets:
            backup = target.with_name(f".{target.name}.wallart-backup")
            if backup.exists():
                raise RuntimeError(f"Stale wall-art backup blocks promotion: {backup}")
            previous = None
            if target.exists():
                previous = backup
                os.replace(target, previous)
            try:
                os.replace(staged, target)
            except Exception:
                if previous is not None:
                    os.replace(previous, target)
                raise
            promoted.append((target, previous))
    except Exception:
        for target, previous in reversed(promoted):
            target.unlink(missing_ok=True)
            if previous is not None:
                os.replace(previous, target)
        raise
    else:
        for _target, previous in promoted:
            if previous is not None:
                previous.unlink(missing_ok=True)


def generate(game_root, atlas, mode):
    registry = validate_project(game_root, atlas)
    out_dir = game_root / "public/assets/textures/environment/breach-v2/art"
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".breach-v2-wallart-", dir=out_dir) as temp_dir:
        stage = Path(temp_dir)
        written = []
        for art_id, build in requested_builders(mode, atlas):
            image = build()
            out = stage / f"{art_id}.webp"
            image.save(out, format="WEBP", quality=82, method=6, exact=True)
            with Image.open(out) as verified:
                verified.verify()
            written.append((art_id, out))
        records = build_records(written)
        staged_registry = stage / registry.name
        staged_registry.write_text(
            json.dumps(update_registry(registry, records), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        promote_files([
            *((out, out_dir / out.name) for _art_id, out in written),
            (staged_registry, registry),
        ])
    for record in records:
        print(f"{record['id']}: {record['sha256']}")
    print(f"recorded {len(records)} requested procedural art asset(s)")


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--game-root", required=True, type=Path)
    parser.add_argument("--atlas", required=True, type=Path)
    parser.add_argument("--mode", required=True, choices=("scroll", "legacy-all"))
    parser.add_argument("--acknowledge-placeholder-overwrite", action="store_true")
    args = parser.parse_args()
    if args.mode == "legacy-all" and not args.acknowledge_placeholder_overwrite:
        parser.error("legacy-all requires --acknowledge-placeholder-overwrite")
    return args


def main():
    args = parse_args()
    generate(args.game_root.expanduser().resolve(), args.atlas.expanduser().resolve(), args.mode)


if __name__ == "__main__":
    main()
