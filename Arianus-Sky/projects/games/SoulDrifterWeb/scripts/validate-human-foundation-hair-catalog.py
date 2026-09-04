#!/usr/bin/env python3
"""Validate and lock the six Human hairstyle source candidates for issue #487."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


SOURCE_SHA256 = "5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8"
VIEWS = ("front", "left", "right", "rear", "crown")
CATALOG_STATUS = "rejected-by-owner"
CATALOG_REJECTION_REASON = (
    "Visual quality failed owner review; do not export or promote these candidates."
)
DEFAULT_EVIDENCE_ROOT = Path(r"H:\CodexData\souldrifter-toolchain\evidence\487")
CANDIDATES = {
    "short-side-swept": "modular-appearance-short-parted-native-groom-v033",
    "mohawk": "human-hair-mohawk-v006",
    "long-loose": "human-hair-long-loose-v005",
    "braid": "human-hair-braid-v006",
    "locs": "human-hair-locs-v011",
    "bald": "human-hair-bald-v001",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def require_file(path: Path, minimum_size: int = 1) -> None:
    if not path.is_file():
        raise RuntimeError(f"Missing catalog artifact: {path}")
    if path.stat().st_size < minimum_size:
        raise RuntimeError(
            f"Catalog artifact is unexpectedly small: {path} ({path.stat().st_size} bytes)"
        )


def receipt_render_paths(receipt: dict[str, object]) -> list[Path]:
    values = receipt.get("render_paths")
    if not isinstance(values, list):
        raise RuntimeError("Receipt is missing render_paths")
    return [Path(str(value)) for value in values]


def validate_candidate(style: str, directory: Path) -> dict[str, object]:
    receipt_path = directory / "receipt.json"
    require_file(receipt_path, 100)
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    if receipt.get("source_sha256") != SOURCE_SHA256:
        raise RuntimeError(f"{style} was not built from the canonical Human head")
    if receipt.get("visible_cap_mesh") is True:
        raise RuntimeError(f"{style} reintroduced a visible cap mesh")
    if receipt.get("blender_version") != "5.2.1 LTS":
        raise RuntimeError(f"{style} was not authored in Blender 5.2.1 LTS")

    blend_value = receipt.get("editable_blend") or receipt.get("blend_path")
    if not blend_value:
        raise RuntimeError(f"{style} receipt is missing its editable Blender source")
    blend_path = Path(str(blend_value))
    require_file(blend_path, 100_000)

    render_paths = receipt_render_paths(receipt)
    if len(render_paths) != len(VIEWS):
        raise RuntimeError(f"{style} does not have exactly five review renders")
    for view, render_path in zip(VIEWS, render_paths):
        if view not in render_path.stem:
            raise RuntimeError(f"{style} review order is invalid at {view}: {render_path.name}")
        require_file(render_path, 100_000)

    if style == "short-side-swept":
        preservation = receipt.get("source_groom_preservation")
        if not isinstance(preservation, dict) or not preservation.get("scalp_attachment_preserved"):
            raise RuntimeError("Short side-swept groom lost its exact-scalp attachment")
        if float(receipt.get("maximum_root_clearance_m", 1.0)) > 1.0e-5:
            raise RuntimeError("Short side-swept guide roots are detached from the scalp")
    elif style == "bald":
        if receipt.get("bald_uses_canonical_head") is not True:
            raise RuntimeError("Bald option is not using the canonical head directly")
        if receipt.get("objects"):
            raise RuntimeError("Bald option contains unexpected proxy hair geometry")
    else:
        objects = receipt.get("objects")
        if not isinstance(objects, list) or not objects:
            raise RuntimeError(f"{style} receipt contains no editable hair objects")
        if not any(item.get("exact_head_attached") for item in objects if isinstance(item, dict)):
            raise RuntimeError(f"{style} contains no exact-head-attached hair object")

    return {
        "style": style,
        "review_status": CATALOG_STATUS,
        "evidence_directory": str(directory),
        "receipt": str(receipt_path),
        "receipt_sha256": sha256(receipt_path),
        "editable_blend": str(blend_path),
        "editable_blend_sha256": sha256(blend_path),
        "review_renders": [
            {
                "view": view,
                "path": str(path),
                "sha256": sha256(path),
            }
            for view, path in zip(VIEWS, render_paths)
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-root", type=Path, default=DEFAULT_EVIDENCE_ROOT)
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_EVIDENCE_ROOT / "human-hair-catalog-canonical.json",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    entries = [
        validate_candidate(style, args.evidence_root / relative_directory)
        for style, relative_directory in CANDIDATES.items()
    ]
    manifest = {
        "schema": "souldrifter.human-hair-source-catalog.v1",
        "issue": 487,
        "canonical_head_sha256": SOURCE_SHA256,
        "style_count": len(entries),
        "review_views": list(VIEWS),
        "visible_cap_mesh_allowed": False,
        "approval_state": CATALOG_STATUS,
        "rejection_reason": CATALOG_REJECTION_REASON,
        "styles": entries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
