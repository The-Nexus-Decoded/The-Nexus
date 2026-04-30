from __future__ import annotations

import math
import os
from pathlib import Path
from urllib.parse import urlparse

SUPPORTED_SCHEMES = {"http", "https", "file"}
SUPPORTED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".ppm"}


def inspect_image(item: dict) -> dict:
    ref = item.get("local_fixture_path") or item.get("photo_url") or ""
    parsed = urlparse(ref)
    checks: dict = {
        "image_reference_present": bool(ref),
        "supported_reference": False,
        "exists": None,
        "file_size_bytes": None,
        "dimensions": None,
        "blank_solid_color_score": None,
        "darkness_score": None,
        "sharpness_edge_score": None,
        "dependency_status": {"pillow": "not_used", "numpy": "not_used"},
        "warnings": [],
    }

    if not ref:
        checks["warnings"].append("missing_image_reference")
        return checks

    if parsed.scheme:
        checks["supported_reference"] = parsed.scheme in SUPPORTED_SCHEMES
        if parsed.scheme in {"http", "https"}:
            checks["warnings"].append("remote_fetch_disabled_for_dry_run")
            return checks
        path = Path(parsed.path)
    else:
        checks["supported_reference"] = Path(ref).suffix.lower() in SUPPORTED_SUFFIXES
        path = Path(ref)

    if path.exists():
        checks["exists"] = True
        checks["file_size_bytes"] = path.stat().st_size
    else:
        checks["exists"] = False
        checks["warnings"].append("local_image_missing")
        return checks

    try:
        from PIL import Image

        checks["dependency_status"]["pillow"] = "available"
        with Image.open(path) as image:
            image = image.convert("L")
            checks["dimensions"] = {"width": image.width, "height": image.height}
            try:
                import numpy as np

                checks["dependency_status"]["numpy"] = "available"
                pixels = np.asarray(image, dtype=np.float32)
                checks["blank_solid_color_score"] = _solid_color_score(pixels)
                checks["darkness_score"] = _darkness_score(pixels)
                checks["sharpness_edge_score"] = _edge_score(pixels)
            except Exception as exc:  # pragma: no cover - environment dependent
                checks["dependency_status"]["numpy"] = f"unavailable:{exc.__class__.__name__}"
                checks["warnings"].append("numpy_checks_unavailable")
    except Exception as exc:
        checks["dependency_status"]["pillow"] = f"unavailable:{exc.__class__.__name__}"
        checks["warnings"].append("pillow_checks_unavailable")

    return checks


def resolve_fixture_path(path: str | None) -> str | None:
    if not path:
        return None
    candidate = Path(path)
    if candidate.is_absolute():
        return str(candidate)
    return str(Path(__file__).resolve().parent / "fixtures" / candidate)


def _solid_color_score(pixels) -> float:
    stddev = float(pixels.std())
    return round(max(0.0, min(1.0, 1.0 - (stddev / 64.0))), 4)


def _darkness_score(pixels) -> float:
    mean = float(pixels.mean())
    return round(max(0.0, min(1.0, 1.0 - (mean / 255.0))), 4)


def _edge_score(pixels) -> float:
    if pixels.shape[0] < 2 or pixels.shape[1] < 2:
        return 0.0
    vertical = abs(pixels[1:, :] - pixels[:-1, :]).mean()
    horizontal = abs(pixels[:, 1:] - pixels[:, :-1]).mean()
    score = math.sqrt(float(vertical + horizontal)) / 16.0
    return round(max(0.0, min(1.0, score)), 4)
