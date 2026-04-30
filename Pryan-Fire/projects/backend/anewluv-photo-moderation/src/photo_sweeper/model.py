from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

DEFAULT_MODEL_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "mock_model_responses.json"
DEFAULT_MINIMAX_MODEL = "minimax/MiniMax-VL-01"

FINAL_TO_RECOMMENDATION_VERDICTS = {
    "approved": "approve_recommendation",
    "approve": "approve_recommendation",
    "rejected": "reject_recommendation",
    "reject": "reject_recommendation",
}


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
        return normalize_model_result(response, default_model=response["vision_model_used"])


class MiniMaxCLIAdapter:
    """OpenClaw CLI vision adapter.

    This adapter intentionally accepts local files only. Remote image resolution/fetching
    belongs to the resolver layer so the CLI never logs URLs or raw queue records.
    """

    def __init__(self, model: str = DEFAULT_MINIMAX_MODEL, timeout_seconds: int = 120) -> None:
        self.model = model
        self.timeout_seconds = timeout_seconds

    def review(self, item: dict, deterministic_checks: dict) -> dict:
        image_path = item.get("resolved_image_path") or item.get("local_fixture_path")
        if not image_path:
            return normalize_model_result(
                {
                    "verdict": "review",
                    "confidence": 0.0,
                    "reason_code": "missing_image_reference",
                    "note": "No local image path was available for MiniMax CLI review; manual review required.",
                    "unsafe_categories": [],
                    "vision_model_used": self.model,
                    "fallback_model": None,
                    "app_profile_photo_checks": _default_profile_checks(needs_human_review=True),
                },
                default_model=self.model,
            )

        proc = subprocess.run(
            [
                "openclaw",
                "infer",
                "image",
                "describe",
                "--model",
                self.model,
                "--file",
                str(image_path),
                "--json",
            ],
            check=False,
            text=True,
            capture_output=True,
            timeout=self.timeout_seconds,
        )
        if proc.returncode != 0:
            return normalize_model_result(
                {
                    "verdict": "review",
                    "confidence": 0.0,
                    "reason_code": "api_failure_fallback",
                    "note": f"MiniMax CLI exited with status {proc.returncode}; manual review required.",
                    "unsafe_categories": [],
                    "vision_model_used": self.model,
                    "fallback_model": "manual_review",
                    "app_profile_photo_checks": _default_profile_checks(needs_human_review=True),
                },
                default_model=self.model,
            )

        description = _extract_text(proc.stdout)
        return normalize_minimax_description(description, model=self.model)


def normalize_minimax_description(description: str, *, model: str = DEFAULT_MINIMAX_MODEL) -> dict:
    text = description.lower()
    checks = _default_profile_checks(needs_human_review=True)
    unsafe_categories: list[str] = []
    verdict = "review"
    reason_code = "manual_review_needed"
    confidence = 0.55

    explicit_terms = [
        "porn",
        "pornographic",
        "explicit",
        "genital",
        "sexual act",
        "intercourse",
        "masturbat",
        "nude",
        "nudity",
    ]
    if any(term in text for term in explicit_terms):
        verdict = "reject_recommendation"
        reason_code = "sexual_content"
        confidence = 0.88
        unsafe_categories = ["sexual_content"]
    elif any(term in text for term in ["ai-generated", "ai generated", "generated image", "illustration", "cartoon", "anime", "drawing", "rendered"]):
        verdict = "review"
        reason_code = "ai_generated_image"
        confidence = 0.78
        unsafe_categories = ["ai_generated_image"]
        checks["is_ai_generated"] = True
    elif any(term in text for term in ["screenshot", "meme", "advertisement", "phone number", "email", "social media handle", "qr code"]):
        verdict = "review"
        reason_code = "contact_info_or_ad"
        confidence = 0.74
        unsafe_categories = ["contact_info_or_ad"]
        checks["has_contact_info"] = True
        checks["is_meme_or_screenshot"] = True
    elif any(term in text for term in ["blurry", "dark", "unclear", "obscured", "low quality", "not visible"]):
        verdict = "review"
        reason_code = "low_quality_or_unusable"
        confidence = 0.68
        unsafe_categories = ["low_quality_or_unusable"]
        checks["is_blank_or_unusable"] = True
    elif any(term in text for term in ["person", "people", "man", "woman", "face", "portrait", "selfie", "individual", "subject"]):
        verdict = "approve_recommendation"
        reason_code = "clean_profile_style"
        confidence = 0.82
        checks["is_profile_style_photo"] = True
        checks["needs_human_review"] = False
    else:
        verdict = "review"
        reason_code = "not_a_profile_photo"
        confidence = 0.62
        unsafe_categories = ["not_a_profile_photo"]

    return normalize_model_result(
        {
            "verdict": verdict,
            "confidence": confidence,
            "reason_code": reason_code,
            "note": _safe_note_for_reason(reason_code),
            "unsafe_categories": unsafe_categories,
            "vision_model_used": f"{model} + parser",
            "fallback_model": None,
            "app_profile_photo_checks": checks,
        },
        default_model=f"{model} + parser",
    )


def normalize_model_result(result: dict, *, default_model: str) -> dict:
    normalized = dict(result)
    raw_verdict = str(normalized.get("verdict", "review")).lower()
    normalized["verdict"] = FINAL_TO_RECOMMENDATION_VERDICTS.get(raw_verdict, raw_verdict)
    normalized.setdefault("confidence", 0.0)
    normalized.setdefault("reason_code", "manual_review_needed")
    normalized.setdefault("note", _safe_note_for_reason(normalized["reason_code"]))
    normalized.setdefault("unsafe_categories", [])
    normalized.setdefault("moderation_api_used", False)
    normalized.setdefault("moderation_model", None)
    normalized.setdefault("vision_model_used", default_model)
    normalized.setdefault("fallback_model", None)
    normalized.setdefault("app_profile_photo_checks", _default_profile_checks(needs_human_review=True))
    return normalized


def _extract_text(stdout: str) -> str:
    try:
        parsed = json.loads(stdout)
    except json.JSONDecodeError:
        return stdout
    return "\n".join(_strings(parsed))


def _strings(value: Any):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from _strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from _strings(child)


def _default_profile_checks(*, needs_human_review: bool) -> dict:
    return {
        "is_profile_style_photo": False,
        "has_contact_info": False,
        "is_meme_or_screenshot": False,
        "is_blank_or_unusable": False,
        "is_ai_generated": False,
        "needs_human_review": needs_human_review,
    }


def _safe_note_for_reason(reason_code: str) -> str:
    notes = {
        "clean_profile_style": "AI recommends approval as profile-style image; human/admin workflow remains final.",
        "sexual_content": "AI recommends rejection/escalation for possible sexual content; human/admin workflow remains final.",
        "ai_generated_image": "AI recommends manual review for possible AI-generated image.",
        "contact_info_or_ad": "AI recommends manual review for possible contact info, screenshot, or advertisement.",
        "low_quality_or_unusable": "AI recommends manual review for low-quality or unusable image.",
        "not_a_profile_photo": "AI recommends manual review because the image may not be a profile photo.",
        "api_failure_fallback": "Vision path failed; manual review required.",
        "missing_image_reference": "Image reference missing; manual review required.",
    }
    return notes.get(reason_code, "AI recommends manual review; human/admin workflow remains final.")
