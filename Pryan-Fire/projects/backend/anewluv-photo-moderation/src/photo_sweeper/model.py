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

from .moderation_contract import provider_instructions
from .validators import default_profile_checks, normalize_minimax_description, normalize_model_result

DEFAULT_MODEL_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "mock_model_responses.json"
DEFAULT_CODEX_MODEL_ROUTE = "Codex OAuth/OpenClaw gpt-5.5 + gpt-image-2 configured image route"
DEFAULT_CODEX_MODEL = "gpt-5.5"
DEFAULT_CODEX_OAUTH_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses"
DEFAULT_PUBLIC_OPENAI_ENDPOINT = "https://api.openai.com/v1/responses"
DEFAULT_MINIMAX_MODEL = "minimax/MiniMax-VL-01"



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
    ) -> None:
        raw_api_key = api_key or os.environ.get("CODEX_OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        self.api_key = raw_api_key.strip() if raw_api_key else None
        self.endpoint = endpoint
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.codex_auth_path = codex_auth_path or Path(os.environ.get("CODEX_AUTH_PATH", Path.home() / ".codex" / "auth.json"))

    def review(self, item: dict, deterministic_checks: dict) -> dict:
        image_path = item.get("resolved_image_path") or item.get("local_fixture_path")
        if not image_path:
            return _manual_failure("missing_image_reference", DEFAULT_CODEX_MODEL_ROUTE, "No local image path was available for Codex/OpenAI review.")
        try:
            image_url = _image_path_to_data_url(Path(image_path))
            request = self._build_request(image_url)
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                payload = _read_provider_payload(response)
        except urllib.error.HTTPError as exc:
            return _manual_failure("api_failure_fallback", DEFAULT_CODEX_MODEL_ROUTE, _safe_http_error_note(exc))
        except RuntimeError as exc:
            return _manual_failure("api_auth_unavailable", DEFAULT_CODEX_MODEL_ROUTE, f"{exc}; manual review required.")
        except Exception as exc:  # pragma: no cover - network/provider dependent
            return _manual_failure("api_failure_fallback", DEFAULT_CODEX_MODEL_ROUTE, f"Codex/OpenAI route failed with {exc.__class__.__name__}; manual review required.")

        return normalize_model_result(_extract_provider_json(payload), default_model=DEFAULT_CODEX_MODEL_ROUTE)

    def _build_request(self, image_url: str) -> urllib.request.Request:
        oauth = _load_codex_oauth(self.codex_auth_path)
        if oauth:
            token, account_id = oauth
            body = json.dumps(_codex_oauth_request_payload(self.model, image_url)).encode("utf-8")
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

        body = json.dumps(_public_openai_request_payload(self.model, image_url)).encode("utf-8")
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


def _provider_instructions() -> str:
    return provider_instructions()


def _codex_oauth_request_payload(model: str, image_url: str) -> dict:
    return {
        "model": model,
        "store": False,
        "stream": True,
        "instructions": _provider_instructions(),
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


def _public_openai_request_payload(model: str, image_url: str) -> dict:
    return {
        "model": model,
        "instructions": _provider_instructions(),
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
        parsed.setdefault("vision_model_used", DEFAULT_CODEX_MODEL_ROUTE)
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


