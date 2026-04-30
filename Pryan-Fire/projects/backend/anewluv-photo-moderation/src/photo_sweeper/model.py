from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_MODEL_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "mock_model_responses.json"
DEFAULT_CODEX_MODEL_ROUTE = "gpt-5.5 + gpt-image-2 configured image route"
DEFAULT_CODEX_MODEL = "gpt-5.5"
DEFAULT_CODEX_ENDPOINT = "https://api.openai.com/v1/responses"
DEFAULT_MINIMAX_MODEL = "minimax/MiniMax-VL-01"

FINAL_TO_RECOMMENDATION_VERDICTS = {
    "rejected": "reject_recommendation",
    "reject": "reject_recommendation",
}
VALID_VERDICTS = {"approve_recommendation", "reject_recommendation", "review", "escalate"}


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


class CodexOpenAIAdapter:
    """Primary text-json image moderation adapter.

    This sends image input for analysis only. It does not call Xano, does not call
    /photos/decide, and does not generate images. Auth material is read from the
    process environment and is never returned in reports.
    """

    provider = "codex-openai-image"
    model_route = DEFAULT_CODEX_MODEL_ROUTE

    def __init__(
        self,
        *,
        api_key: str | None = None,
        endpoint: str = DEFAULT_CODEX_ENDPOINT,
        model: str = DEFAULT_CODEX_MODEL,
        timeout_seconds: int = 120,
    ) -> None:
        raw_api_key = api_key or os.environ.get("CODEX_OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        self.api_key = raw_api_key.strip() if raw_api_key else None
        self.endpoint = endpoint
        self.model = model
        self.timeout_seconds = timeout_seconds

    def review(self, item: dict, deterministic_checks: dict) -> dict:
        image_path = item.get("resolved_image_path") or item.get("local_fixture_path")
        if not image_path:
            return _manual_failure("missing_image_reference", DEFAULT_CODEX_MODEL_ROUTE, "No local image path was available for Codex/OpenAI review.")
        if not self.api_key:
            return _manual_failure("api_auth_unavailable", DEFAULT_CODEX_MODEL_ROUTE, "Codex/OpenAI auth was not available; manual review required.")

        try:
            image_url = _image_path_to_data_url(Path(image_path))
            body = json.dumps(_codex_request_payload(self.model, image_url)).encode("utf-8")
            request = urllib.request.Request(
                self.endpoint,
                data=body,
                method="POST",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            return _manual_failure("api_failure_fallback", DEFAULT_CODEX_MODEL_ROUTE, _safe_http_error_note(exc))
        except Exception as exc:  # pragma: no cover - network/provider dependent
            return _manual_failure("api_failure_fallback", DEFAULT_CODEX_MODEL_ROUTE, f"Codex/OpenAI route failed with {exc.__class__.__name__}; manual review required.")

        return normalize_model_result(_extract_provider_json(payload), default_model=DEFAULT_CODEX_MODEL_ROUTE)


class MiniMaxCLIAdapter:
    """OpenClaw CLI vision adapter, fallback only."""

    def __init__(self, model: str = DEFAULT_MINIMAX_MODEL, timeout_seconds: int = 120) -> None:
        self.model = model
        self.timeout_seconds = timeout_seconds

    def review(self, item: dict, deterministic_checks: dict) -> dict:
        image_path = item.get("resolved_image_path") or item.get("local_fixture_path")
        if not image_path:
            return _manual_failure("missing_image_reference", self.model, "No local image path was available for MiniMax CLI review.")

        proc = subprocess.run(
            ["openclaw", "infer", "image", "describe", "--model", self.model, "--file", str(image_path), "--json"],
            check=False,
            text=True,
            capture_output=True,
            timeout=self.timeout_seconds,
        )
        if proc.returncode != 0:
            return _manual_failure("api_failure_fallback", self.model, f"MiniMax CLI exited with status {proc.returncode}; manual review required.", fallback="manual_review")

        return normalize_minimax_description(_extract_text(proc.stdout), model=self.model)


def normalize_minimax_description(description: str, *, model: str = DEFAULT_MINIMAX_MODEL) -> dict:
    text = description.lower()
    checks = _default_profile_checks(needs_human_review=True)
    unsafe_categories: list[str] = []
    verdict = "review"
    reason_code = "manual_review_needed"
    confidence = 0.55

    if any(term in text for term in ["porn", "pornographic", "explicit", "genital", "sexual act", "intercourse", "masturbat", "nude", "nudity"]):
        verdict = "reject_recommendation"
        reason_code = "sexual_content"
        confidence = 0.88
        unsafe_categories = ["sexual_content"]
    elif any(term in text for term in ["ai-generated", "ai generated", "generated image", "illustration", "cartoon", "anime", "drawing", "rendered"]):
        reason_code = "ai_generated_image"
        confidence = 0.78
        unsafe_categories = ["ai_generated_image"]
        checks["is_ai_generated"] = True
    elif any(term in text for term in ["screenshot", "meme", "advertisement", "phone number", "email", "social media handle", "qr code"]):
        reason_code = "contact_info_or_ad"
        confidence = 0.74
        unsafe_categories = ["contact_info_or_ad"]
        checks["has_contact_info"] = True
        checks["is_meme_or_screenshot"] = True
    elif any(term in text for term in ["blurry", "dark", "unclear", "obscured", "low quality", "not visible"]):
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
    normalized["normalization_applied"] = "yes" if normalized["verdict"] != raw_verdict else "no"
    normalized.setdefault("confidence", 0.0)
    normalized.setdefault("reason_code", "manual_review_needed")
    normalized.setdefault("note", _safe_note_for_reason(normalized["reason_code"]))
    normalized.setdefault("unsafe_categories", [])
    normalized.setdefault("moderation_api_used", False)
    normalized.setdefault("moderation_model", None)
    normalized.setdefault("vision_model_used", default_model)
    normalized.setdefault("fallback_model", None)
    normalized.setdefault("image_generation_events", 0)
    normalized.setdefault("output_type", "text_json")
    normalized.setdefault("app_profile_photo_checks", _default_profile_checks(needs_human_review=True))
    normalized["validator"] = "pass" if _is_valid_normalized_result(normalized) else "fail"
    if normalized["validator"] == "fail":
        normalized["verdict"] = "review"
        normalized["reason_code"] = "manual_review_needed"
        normalized["note"] = "Model output failed strict validation; manual review required."
        normalized["validator"] = "fail"
    return normalized


def _is_valid_normalized_result(result: dict) -> bool:
    return result.get("verdict") in VALID_VERDICTS and isinstance(result.get("unsafe_categories"), list)


def _codex_request_payload(model: str, image_url: str) -> dict:
    instructions = (
        "Return only compact JSON for Anewluv profile photo moderation. "
        "Use recommendation language only: approve_recommendation, reject_recommendation, review, or escalate. "
        "Do not make final moderation decisions. Do not generate or edit images."
    )
    return {
        "model": model,
        "instructions": instructions,
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Classify this profile photo candidate and return strict JSON."},
                    {"type": "input_image", "image_url": image_url},
                ],
            }
        ],
        "text": {"format": {"type": "json_object"}},
    }


def _image_path_to_data_url(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(str(path))
    send_path = path
    converted_path: Path | None = None
    mime = mimetypes.guess_type(path.name)[0]
    if path.suffix.lower() == ".ppm" or mime not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        send_path = _convert_to_png(path)
        converted_path = send_path
        mime = "image/png"
    try:
        encoded = base64.b64encode(send_path.read_bytes()).decode("ascii")
    finally:
        if converted_path is not None:
            converted_path.unlink(missing_ok=True)
    return f"data:{mime};base64,{encoded}"


def _convert_to_png(path: Path) -> Path:
    from PIL import Image

    with Image.open(path) as image:
        tmp = tempfile.NamedTemporaryFile(prefix="photo-sweeper-", suffix=".png", delete=False)
        tmp_path = Path(tmp.name)
        tmp.close()
        image.save(tmp_path, format="PNG")
    return tmp_path


def _extract_provider_json(payload: dict) -> dict:
    text = _extract_provider_text(payload)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {"verdict": "review", "reason_code": "manual_review_needed", "note": "Provider returned non-JSON text; manual review required.", "vision_model_used": DEFAULT_CODEX_MODEL_ROUTE}
    if isinstance(parsed, dict):
        parsed.setdefault("vision_model_used", DEFAULT_CODEX_MODEL_ROUTE)
        return parsed
    return {"verdict": "review", "reason_code": "manual_review_needed", "vision_model_used": DEFAULT_CODEX_MODEL_ROUTE}


def _extract_provider_text(payload: dict) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str):
        return output_text

    text_parts: list[str] = []
    for item in payload.get("output") or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content") or []:
            if not isinstance(content, dict):
                continue
            if content.get("type") in {"output_text", "text"} and isinstance(content.get("text"), str):
                text_parts.append(content["text"])

    return "\n".join(text_parts)


def _manual_failure(reason_code: str, model: str, note: str, *, fallback: str | None = None) -> dict:
    return normalize_model_result(
        {
            "verdict": "review",
            "confidence": 0.0,
            "reason_code": reason_code,
            "note": note,
            "unsafe_categories": [],
            "vision_model_used": model,
            "fallback_model": fallback,
            "app_profile_photo_checks": _default_profile_checks(needs_human_review=True),
        },
        default_model=model,
    )


def _safe_http_error_note(exc: urllib.error.HTTPError) -> str:
    try:
        body = exc.read(512).decode("utf-8", errors="replace")
    except Exception:
        body = ""
    redacted = _redact_provider_error_body(body)
    return f"Codex/OpenAI route returned HTTP {exc.code} {exc.__class__.__name__}; manual review required. Body snippet: {redacted[:240]}"


def _redact_provider_error_body(body: str) -> str:
    redacted = body
    for value in (os.environ.get("CODEX_OPENAI_API_KEY"), os.environ.get("OPENAI_API_KEY")):
        if value:
            redacted = redacted.replace(value, "[redacted]")
    redacted = re.sub(r"Bearer\s+[A-Za-z0-9._~+/=-]+", "Bearer [redacted]", redacted, flags=re.IGNORECASE)
    redacted = re.sub(r"https?://[^\s'\"<>]+", "[redacted-url]", redacted)
    redacted = re.sub(r"(?i)(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|oauth|session)(['\"\s:=]+)[^,}\]\s]+", r"\1\2[redacted]", redacted)
    return redacted


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
        "nudity": "AI recommends rejection/escalation for possible nudity; human/admin workflow remains final.",
        "pornographic_explicit": "AI recommends rejection/escalation for possible explicit content; human/admin workflow remains final.",
        "inappropriate_photos": "AI recommends rejection/escalation for possible inappropriate photo content; human/admin workflow remains final.",
        "ai_generated_image": "AI recommends manual review for possible AI-generated image.",
        "contact_info_or_ad": "AI recommends manual review for possible contact info, screenshot, or advertisement.",
        "low_quality_or_unusable": "AI recommends manual review for low-quality or unusable image.",
        "not_a_profile_photo": "AI recommends manual review because the image may not be a profile photo.",
        "api_failure_fallback": "Vision path failed; manual review required.",
        "api_auth_unavailable": "Vision auth unavailable; manual review required.",
        "missing_image_reference": "Image reference missing; manual review required.",
    }
    return notes.get(reason_code, "AI recommends manual review; human/admin workflow remains final.")
