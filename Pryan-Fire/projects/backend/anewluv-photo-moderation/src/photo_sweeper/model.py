from __future__ import annotations

import json
from pathlib import Path

DEFAULT_MODEL_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "mock_model_responses.json"


class MockModelAdapter:
    def __init__(self, manifest_path: Path | None = None) -> None:
        with (manifest_path or DEFAULT_MODEL_FIXTURE).open("r", encoding="utf-8") as handle:
            self._responses = json.load(handle)

    def review(self, item: dict, deterministic_checks: dict) -> dict:
        key = item.get("model_fixture_key") or "manual_review_needed"
        response = dict(self._responses.get(key, self._responses["manual_review_needed"]))
        response.setdefault("moderation_api_used", False)
        response.setdefault("moderation_model", None)
        response.setdefault("vision_model_used", "mock_fixture")
        response.setdefault("fallback_model", None)
        response["deterministic_checks_used"] = [
            "image_reference_present",
            "supported_reference",
            "file_size_bytes",
            "dimensions",
            "blank_solid_color_score",
            "darkness_score",
            "sharpness_edge_score",
        ]
        return response
