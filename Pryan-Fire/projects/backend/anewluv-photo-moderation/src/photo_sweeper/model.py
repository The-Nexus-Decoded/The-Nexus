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

from .moderation_contract import HARD_SAFETY_HUMAN_ONLY_REASONS, provider_instructions
from .normalization import default_profile_checks, normalize_minimax_description, normalize_model_result

DEFAULT_MODEL_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "mock_model_responses.json"
DEFAULT_CODEX_MODEL_ROUTE = "Codex OAuth/OpenClaw gpt-5.5 + gpt-image-2 configured image route"
DEFAULT_CODEX_MODEL = "gpt-5.5"
DEFAULT_CODEX_OAUTH_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses"
DEFAULT_PUBLIC_OPENAI_ENDPOINT = "https://api.openai.com/v1/responses"
DEFAULT_MINIMAX_MODEL = "minimax/MiniMax-VL-01"



PROVIDER_UNAVAILABLE_REASONS = {"api_failure_fallback", "api_auth_unavailable", "missing_image_reference", "provider_chain_failed"}
STAGE1_INCONCLUSIVE_REASONS = {"manual_admin_decision", "manual_review_needed"}
STAGE1_HARD_SAFETY_REASONS = HARD_SAFETY_HUMAN_ONLY_REASONS | {
    "nudity",
    "pornographic_explicit",
    "underage_concern",
    "hate_or_harassment",
}


class MockModelAdapter:
    def __init__(
        self,
        manifest_path: Path | None = None,
        *,
        allowed_reason_codes: set[str] | None = None,
        reason_vocabulary: tuple[dict[str, Any], ...] | list[dict[str, Any]] | None = None,
        key_field: str = "model_fixture_key",
        default_model: str = "mock_fixture",
        provider_defaults: dict[str, Any] | None = None,
    ) -> None:
        with (manifest_path or DEFAULT_MODEL_FIXTURE).open("r", encoding="utf-8") as handle:
            self._responses = json.load(handle)
        self.allowed_reason_codes = allowed_reason_codes or set()
        self.reason_vocabulary = tuple(reason_vocabulary or ())
        self.key_field = key_field
        self.default_model = default_model
        self.provider_defaults = provider_defaults or {}

    def review(self, item: dict, deterministic_checks: dict) -> dict:
        key = item.get(self.key_field) or item.get("model_fixture_key") or "manual_review_needed"
        response = dict(self._responses.get(key, self._responses["manual_review_needed"]))
        for field, value in self.provider_defaults.items():
            response.setdefault(field, value)
        response.setdefault("moderation_api_used", False)
        response.setdefault("moderation_model", None)
        response.setdefault("vision_model_used", self.default_model)
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
        return normalize_model_result(
            response,
            default_model=self.default_model,
            allowed_reason_codes=self.allowed_reason_codes,
            reason_vocabulary=self.reason_vocabulary,
        )


class ProviderChainAdapter:
    """Two-stage moderation chain: cheap moderation API, then vision LLM fallback."""

    def __init__(self, *, stage1: Any | None, stage2: Any, vision_only: bool = False) -> None:
        self.stage1 = stage1
        self.stage2 = stage2
        self.vision_only = vision_only

    def review(self, item: dict, deterministic_checks: dict) -> dict:
        if self.vision_only or self.stage1 is None:
            return _guard_vision_only_result(self.stage2.review(item, deterministic_checks))

        stage1_result = self.stage1.review(item, deterministic_checks)
        if _stage1_can_short_circuit(stage1_result):
            stage1_result["provider_chain_stage"] = "stage1_moderation_api"
            stage1_result["provider_chain_decision"] = "stage1_short_circuit"
            return stage1_result

        stage2_result = self.stage2.review(item, deterministic_checks)
        if _provider_unavailable(stage1_result) and _provider_unavailable(stage2_result):
            return _provider_chain_failed(stage1_result, stage2_result)

        stage2_result["moderation_api_used"] = bool(stage1_result.get("moderation_api_used"))
        stage2_result["moderation_model"] = stage1_result.get("moderation_model")
        stage2_result["provider_chain_stage"] = "stage2_vision_llm"
        stage2_result["provider_chain_decision"] = "stage1_fallthrough"
        stage2_result["stage1_result"] = _provider_result_summary(stage1_result)
        return stage2_result


class CodexOpenAIAdapter:
    """Primary text-json image moderation adapter.

    This sends image input for analysis only. It does not call Xano, does not call
    /photos/decide, and does not write final moderation decisions. Provider order
    is Codex OAuth/OpenClaw first, then public OpenAI only if API-key auth exists.
    Auth material is read from approved local/env paths and is never returned in
    reports.
    """

    provider = "codex-openai-image"
    model_route = DEFAULT_CODEX_MODEL_ROUTE

    def __init__(
        self,
        *,
        api_key: str | None = None,
        endpoint: str | None = None,
        model: str = DEFAULT_CODEX_MODEL,
        timeout_seconds: int = 120,
        codex_auth_path: Path | None = None,
        instructions: str | None = None,
        allowed_reason_codes: set[str] | None = None,
        reason_vocabulary: tuple[dict[str, Any], ...] | list[dict[str, Any]] | None = None,
    ) -> None:
        raw_api_key = api_key or os.environ.get("CODEX_OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        self.api_key = raw_api_key.strip() if raw_api_key else None
        self.endpoint = endpoint
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.codex_auth_path = codex_auth_path or Path(os.environ.get("CODEX_AUTH_PATH", Path.home() / ".codex" / "auth.json"))
        self.instructions = instructions
        self.allowed_reason_codes = allowed_reason_codes or set()
        self.reason_vocabulary = tuple(reason_vocabulary or ())

    def review(self, item: dict, deterministic_checks: dict) -> dict:
        image_path = item.get("resolved_image_path") or item.get("local_fixture_path")
        remote_image_url = item.get("photo_url") if isinstance(item.get("photo_url"), str) else None
        if not image_path and not remote_image_url:
            return _manual_failure("missing_image_reference", DEFAULT_CODEX_MODEL_ROUTE, "No image reference was available for Codex/OpenAI review.")
        try:
            image_url = remote_image_url or _image_path_to_data_url(Path(image_path))
            request = self._build_request(image_url)
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                payload = _read_provider_payload(response)
        except urllib.error.HTTPError as exc:
            return _manual_failure("api_failure_fallback", DEFAULT_CODEX_MODEL_ROUTE, _safe_http_error_note(exc))
        except RuntimeError as exc:
            return _manual_failure("api_auth_unavailable", DEFAULT_CODEX_MODEL_ROUTE, f"{exc}; manual review required.")
        except Exception as exc:  # pragma: no cover - network/provider dependent
            return _manual_failure("api_failure_fallback", DEFAULT_CODEX_MODEL_ROUTE, f"Codex/OpenAI route failed with {exc.__class__.__name__}; manual review required.")

        return normalize_model_result(
            _extract_provider_json(payload),
            default_model=DEFAULT_CODEX_MODEL_ROUTE,
            allowed_reason_codes=self.allowed_reason_codes,
            reason_vocabulary=self.reason_vocabulary,
        )

    def _build_request(self, image_url: str) -> urllib.request.Request:
        oauth = _load_codex_oauth(self.codex_auth_path)
        if oauth:
            token, account_id = oauth
            body = json.dumps(_codex_oauth_request_payload(self.model, image_url, instructions=self.instructions)).encode("utf-8")
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "text/event-stream, application/json",
            }
            if account_id:
                headers["ChatGPT-Account-ID"] = account_id
            return urllib.request.Request(
                self.endpoint or DEFAULT_CODEX_OAUTH_ENDPOINT,
                data=body,
                method="POST",
                headers=headers,
            )

        if not self.api_key:
            raise RuntimeError("Codex OAuth/OpenAI auth was not available")

        body = json.dumps(_public_openai_request_payload(self.model, image_url, instructions=self.instructions)).encode("utf-8")
        return urllib.request.Request(
            self.endpoint or DEFAULT_PUBLIC_OPENAI_ENDPOINT,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )


class MiniMaxCLIAdapter:
    """OpenClaw CLI vision adapter, fallback only."""

    def __init__(self, model: str = DEFAULT_MINIMAX_MODEL, timeout_seconds: int = 120) -> None:
        self.model = model
        self.timeout_seconds = timeout_seconds

    def review(self, item: dict, deterministic_checks: dict) -> dict:
        image_path = item.get("resolved_image_path") or item.get("local_fixture_path")
        if not image_path:
            return _manual_failure("missing_image_reference", self.model, "No local image path was available for MiniMax CLI review.")

        try:
            proc = subprocess.run(
                ["openclaw", "infer", "image", "describe", "--model", self.model, "--file", str(image_path), "--json"],
                check=False,
                text=True,
                capture_output=True,
                timeout=self.timeout_seconds,
            )
        except FileNotFoundError:
            return _manual_failure("api_failure_fallback", self.model, "MiniMax CLI dependency was not available; manual review required.", fallback="manual_review")
        except subprocess.TimeoutExpired:
            return _manual_failure("api_failure_fallback", self.model, "MiniMax CLI timed out; manual review required.", fallback="manual_review")
        if proc.returncode != 0:
            return _manual_failure("api_failure_fallback", self.model, f"MiniMax CLI exited with status {proc.returncode}; manual review required.", fallback="manual_review")

        return normalize_minimax_description(_extract_text(proc.stdout), model=self.model)


def _provider_instructions(instructions: str | None = None) -> str:
    return instructions or provider_instructions()


def _codex_oauth_request_payload(model: str, image_url: str, *, instructions: str | None = None) -> dict:
    return {
        "model": model,
        "store": False,
        "stream": True,
        "instructions": _provider_instructions(instructions),
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Classify this profile photo candidate and return strict JSON."},
                    {"type": "input_image", "image_url": image_url},
                ],
            }
        ],
        "tools": [{"type": "image_generation", "model": "gpt-image-2"}],
        "text": {"format": {"type": "json_object"}},
    }


def _public_openai_request_payload(model: str, image_url: str, *, instructions: str | None = None) -> dict:
    return {
        "model": model,
        "instructions": _provider_instructions(instructions),
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


def _load_codex_oauth(path: Path) -> tuple[str, str | None] | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    tokens = payload.get("tokens") if isinstance(payload, dict) else None
    if not isinstance(tokens, dict):
        return None
    token = tokens.get("access_token")
    if not isinstance(token, str) or not token.strip():
        return None
    account_id = tokens.get("account_id")
    return token.strip(), account_id.strip() if isinstance(account_id, str) and account_id.strip() else None


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
        raw_model_response = dict(parsed)
        parsed.setdefault("vision_model_used", DEFAULT_CODEX_MODEL_ROUTE)
        parsed.setdefault("raw_model_response", raw_model_response)
        return parsed
    return {"verdict": "review", "reason_code": "manual_review_needed", "vision_model_used": DEFAULT_CODEX_MODEL_ROUTE}


def _read_provider_payload(response: Any) -> dict:
    raw = response.read().decode("utf-8", errors="replace")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return _parse_sse_payload(raw)


def _parse_sse_payload(raw: str) -> dict:
    events: list[dict] = []
    text_parts: list[str] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue
        data = line.removeprefix("data:").strip()
        if not data or data == "[DONE]":
            continue
        try:
            event = json.loads(data)
        except json.JSONDecodeError:
            continue
        events.append(event)
        extracted = _extract_provider_text(event)
        if not extracted and isinstance(event.get("text"), str):
            extracted = event["text"]
        if not extracted and isinstance(event.get("delta"), str):
            text_parts.append(event["delta"])
            continue
        if extracted:
            text_parts.append(extracted)
    for event in reversed(events):
        extracted = _extract_provider_text(event)
        if not extracted and isinstance(event.get("text"), str):
            extracted = event["text"]
        if extracted:
            return {"output_text": extracted}
    if text_parts:
        return {"output_text": "\n".join(text_parts)}
    return {"events": events, "output_text": ""}


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
            "app_profile_photo_checks": default_profile_checks(needs_human_review=True),
        },
        default_model=model,
    )


def _stage1_can_short_circuit(result: dict) -> bool:
    if result.get("validator") == "fail" or _provider_unavailable(result):
        return False
    verdict = result.get("verdict")
    reason = str(result.get("reason_code") or result.get("raw_reason_code") or "").lower()
    raw_reason = str(result.get("raw_reason_code") or reason).lower()
    if verdict == "approve_recommendation" and reason == "clean_profile_style":
        return True
    if verdict == "escalate" or reason in HARD_SAFETY_HUMAN_ONLY_REASONS or raw_reason in STAGE1_HARD_SAFETY_REASONS:
        return True
    if verdict == "reject_recommendation" and reason not in STAGE1_INCONCLUSIVE_REASONS and raw_reason not in STAGE1_HARD_SAFETY_REASONS:
        return True
    return False


def _provider_unavailable(result: dict) -> bool:
    reason = str(result.get("reason_code") or "").lower()
    raw_reason = str(result.get("raw_reason_code") or reason).lower()
    return result.get("validator") == "fail" or reason in PROVIDER_UNAVAILABLE_REASONS or raw_reason in PROVIDER_UNAVAILABLE_REASONS


def _guard_vision_only_result(result: dict) -> dict:
    guarded = dict(result)
    if guarded.get("verdict") in {"approve_recommendation", "review"}:
        guarded["provider_chain_stage"] = "vision_llm_only"
        return guarded

    reason = str(guarded.get("reason_code") or guarded.get("raw_reason_code") or "manual_admin_decision").lower()
    raw_reason = str(guarded.get("raw_reason_code") or reason).lower()
    guarded.setdefault("raw_reason_code", raw_reason)
    guarded["provider_chain_stage"] = "vision_llm_only"
    guarded["provider_chain_decision"] = "vision_only_reject_escalated"
    guarded["note"] = _append_note(
        guarded.get("note"),
        "Vision-only chain does not auto-reject; routed to escalation.",
    )
    if reason in HARD_SAFETY_HUMAN_ONLY_REASONS or raw_reason in STAGE1_HARD_SAFETY_REASONS:
        guarded["verdict"] = "escalate"
    else:
        guarded["verdict"] = "review"
        guarded["reason_code"] = "manual_admin_decision"
    return guarded


def _provider_chain_failed(stage1_result: dict, stage2_result: dict) -> dict:
    return normalize_model_result(
        {
            "verdict": "review",
            "confidence": 0.0,
            "reason_code": "provider_chain_failed",
            "raw_reason_code": "provider_chain_failed",
            "note": "Moderation API and vision LLM providers were both unavailable; routed to agent review.",
            "unsafe_categories": [],
            "moderation_api_used": bool(stage1_result.get("moderation_api_used")),
            "moderation_model": stage1_result.get("moderation_model"),
            "vision_model_used": stage2_result.get("vision_model_used") or "unavailable",
            "fallback_model": "provider_chain_failed",
            "provider_chain_stage": "provider_chain_failed",
            "provider_chain_decision": "provider_chain_failed",
            "stage1_result": _provider_result_summary(stage1_result),
            "stage2_result": _provider_result_summary(stage2_result),
            "app_profile_photo_checks": default_profile_checks(needs_human_review=True),
        },
        default_model=stage2_result.get("vision_model_used") or "unavailable",
        allowed_reason_codes={"provider_chain_failed"},
    )


def _provider_result_summary(result: dict) -> dict:
    return {
        "verdict": result.get("verdict"),
        "reason_code": result.get("reason_code"),
        "raw_reason_code": result.get("raw_reason_code"),
        "validator": result.get("validator"),
        "confidence": result.get("confidence"),
        "moderation_model": result.get("moderation_model"),
        "vision_model_used": result.get("vision_model_used"),
    }


def _append_note(existing: object, addition: str) -> str:
    text = str(existing or "").strip()
    return f"{text} {addition}".strip()


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
