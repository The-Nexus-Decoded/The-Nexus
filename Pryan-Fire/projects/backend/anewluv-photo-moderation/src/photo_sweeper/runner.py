from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from .deterministic import inspect_image
from .model import CodexOpenAIAdapter, MiniMaxCLIAdapter, MockModelAdapter
from .policy import combine
from .queue import normalize_item
from .xano_client import XanoModerationClient, XanoRaceSkip

CODEX_OPENAI_ADAPTER_NAMES = {"codex-openai-image", "codex-openai", "openclaw-codex-openai", "primary"}
OPENAI_MODERATIONS_ADAPTER_NAMES = {"openai-moderations"}
MINIMAX_FALLBACK_ADAPTER_NAMES = {"minimax-cli", "minimax-fallback", "minimax-vl"}
OPENROUTER_ADAPTER_NAMES = {"openrouter-multimodal"}

SERVER_REASON_CODE_MAP = {
    "clean_profile_style": "unclear_subject",
    "fake_profile": "celebrity_or_stock_photo",
    "sexual_content": "nudity_explicit",
    "inappropriate_photos": "low_quality",
    "off_platform_contact": "qr_code",
    "manual_admin_decision": "unclear_subject",
    "not_person_photo": "not_person_photo",
    "policy_violation": "low_quality",
    "explicit_content": "nudity_explicit",
    "unsafe_content": "low_quality",
    "too_blurry_or_blank": "low_quality",
    "spam": "bot_or_scam",
    "harassment": "hate_or_harassment",
    "hate_speech": "hate_or_harassment",
    "bot_behavior": "bot_or_scam",
    "minor_targeting": "minor_in_photo",
    "underage": "underage_concern",
    "money_request": "money_request",
}


def run_once(
    queue: list[dict],
    *,
    limit: int | None,
    photo_id: str | None,
    page: int = 1,
    per_page: int | None = None,
    dry_run: bool,
    force: bool,
    model_fixture: Path | None,
    model_adapter: str = "mock",
    xano_client: XanoModerationClient | None = None,
) -> dict:
    fetched_count = len(queue)
    if xano_client is not None and photo_id is None:
        live_payload = xano_client.queue(page=page, per_page=per_page or limit)
        raw_items = live_payload.get("items", [])
        fetched_count = len(raw_items)
        queue = [normalize_item(item) for item in raw_items if _is_live_uploaded_candidate(item)]
        settings = live_payload.get("settings") if isinstance(live_payload.get("settings"), dict) else {}
    else:
        settings = {}
    selected = _select(queue, limit=limit, photo_id=photo_id)
    adapter = _build_adapter(model_adapter, model_fixture)
    photos = []
    failures = []
    decision_calls = []

    for item in selected:
        checks = inspect_image(item)
        model_result = adapter.review(item, checks)
        photo = combine(item, checks, model_result, dry_run=dry_run, force=force)
        if not dry_run:
            if xano_client is None:
                raise ValueError("xano_client is required when dry_run is false")
            call = _submit_ai_decision(xano_client, photo, user_id=item.get("user_id"), settings=settings)
            photo["xano_decision"] = call
            decision_calls.append(call)
            if call.get("status") == "race_skip":
                failures.append({"photo_id": photo["photo_id"], "status": "race_skip"})
        photos.append(photo)

    return {
        "dry_run": dry_run,
        "write_enabled": not dry_run,
        "force_requested": force,
        **_provider_report(model_adapter, dry_run=dry_run),
        "settings_echo_present": bool(settings),
        "queue_fetched": fetched_count,
        "page": page,
        "per_page": per_page or limit,
        "local_cap": limit,
        "photos_scanned": len(photos),
        "photos": photos,
        "decision_calls": decision_calls,
        "summary": _summary(photos, dry_run=dry_run, failures=failures),
    }


def _is_live_uploaded_candidate(item: dict) -> bool:
    return item.get("photostatus_id") == 1 and item.get("deleted") is not True


def _submit_ai_decision(client: XanoModerationClient, photo: dict, *, user_id: int | str | None, settings: dict[str, Any]) -> dict:
    run_id = str(uuid.uuid4())
    decision = _xano_decision(photo, settings=settings)
    if decision is None:
        return _submit_escalation(client, photo, user_id=user_id, settings=settings, run_id=run_id)
    payload = {
        "photo_id": photo["photo_id"],
        "decision": decision,
        "confidence": _confidence(photo),
        "reason_code": _server_reason_code(photo),
        "note": _note(photo),
        "run_id": run_id,
        "idempotency_key": f"{run_id}:{photo['photo_id']}",
        "expected_current_status": 1,
    }
    try:
        response = client.ai_decide(payload)
    except XanoRaceSkip:
        return {
            "status": "race_skip",
            "photo_id": photo["photo_id"],
            "run_id": run_id,
            "idempotency_key": payload["idempotency_key"],
            "decision": decision,
            "expected_current_status": 1,
            "skipped": True,
        }
    return {
        "status": "submitted",
        "photo_id": photo["photo_id"],
        "run_id": run_id,
        "idempotency_key": payload["idempotency_key"],
        "decision": decision,
        "expected_current_status": 1,
        "coerced": response.get("coerced"),
        "payload": payload,
    }


def _submit_escalation(client: XanoModerationClient, photo: dict, *, user_id: int | str | None, settings: dict[str, Any], run_id: str) -> dict:
    route = _escalation_route(photo)
    idempotency_key = f"{run_id}:{photo['photo_id']}:escalation"
    reason = _escalation_reason(photo, settings=settings)
    payload = {
        "photo_id": photo["photo_id"],
        "user_id": user_id,
        "route": route,
        "reason_code": _server_reason_code(photo),
        "note": _note(photo),
        "severity": _escalation_severity(route),
        "model_path_json": photo.get("model_path", {}),
        "run_id": run_id,
        "idempotency_key": idempotency_key,
        "expected_current_status": 1,
    }
    try:
        response = client.escalation_open(payload)
    except XanoRaceSkip:
        return {
            "status": "race_skip",
            "photo_id": photo["photo_id"],
            "run_id": run_id,
            "idempotency_key": idempotency_key,
            "decision": None,
            "route": route,
            "expected_current_status": 1,
            "skipped": True,
        }
    return {
        "status": "escalated",
        "photo_id": photo["photo_id"],
        "run_id": run_id,
        "idempotency_key": idempotency_key,
        "decision": None,
        "route": route,
        "expected_current_status": 1,
        "reason": reason,
        "escalation_id": response.get("id") or response.get("escalation_id"),
        "payload": payload,
    }


def _xano_decision(photo: dict, *, settings: dict[str, Any]) -> str | None:
    if photo.get("planned_action") in {"leave_pending", "manual_review", "agent_review", "human_admin_review", "diagnostic_no_write"}:
        return None
    if photo.get("normalized_result", {}).get("validator") == "fail":
        return None

    confidence = _confidence(photo)
    if settings.get("ai_auto_decide_enabled") is False:
        return None
    floor = settings.get("ai_escalate_below_confidence")
    if isinstance(floor, (int, float)) and confidence < float(floor):
        return None
    if photo.get("recommended_decision") == "approve_recommendation" and photo.get("planned_action") == "report_only":
        return "approved"
    if photo.get("recommended_decision") == "reject_recommendation" and photo.get("planned_action") == "auto_reject":
        return "rejected"
    return None


def _escalation_route(photo: dict) -> str:
    if photo.get("planned_action") == "human_admin_review":
        return "human_admin_review"
    return "agent_review"


def _escalation_reason(photo: dict, *, settings: dict[str, Any]) -> str:
    confidence = _confidence(photo)
    floor = settings.get("ai_escalate_below_confidence")
    if settings.get("ai_auto_decide_enabled") is False:
        return "auto_decide_disabled"
    if isinstance(floor, (int, float)) and confidence < float(floor):
        return "confidence_below_floor"
    if photo.get("planned_action") == "human_admin_review":
        return "human_admin_review"
    return "unresolved_model_result"


def _escalation_severity(route: str) -> str:
    return "high" if route == "human_admin_review" else "normal"


def _confidence(photo: dict) -> float:
    try:
        value = float(photo.get("normalized_result", {}).get("confidence", 0.0))
    except (TypeError, ValueError):
        value = 0.0
    return min(1.0, max(0.0, value))


def _server_reason_code(photo: dict) -> str:
    normalized = photo.get("normalized_result", {})
    reason = normalized.get("reason_code") or normalized.get("raw_reason_code") or "manual_admin_decision"
    return SERVER_REASON_CODE_MAP.get(reason, "unclear_subject")


def _note(photo: dict) -> str:
    normalized = photo.get("normalized_result", {})
    detected = normalized.get("detected_category") or normalized.get("raw_reason_code") or normalized.get("reason_code")
    model = photo.get("model_path", {}).get("vision_model_used")
    parts = [
        f"photo_sweeper decision={photo.get('recommended_decision') or 'review'}",
        f"category={detected}",
        f"model={model}",
    ]
    provider_detail = _compact_note_detail(normalized.get("note"))
    if provider_detail:
        parts.append(f"detail={provider_detail}")
    return " ".join(parts)


def _compact_note_detail(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    detail = " ".join(value.split())
    if not detail:
        return None
    return detail[:900]


def _select(queue: list[dict], *, limit: int | None, photo_id: str | None) -> list[dict]:
    items = queue
    if photo_id is not None:
        items = [item for item in items if str(item.get("photo_id")) == str(photo_id)]
    if limit is not None:
        items = items[: max(0, limit)]
    return items


def _summary(photos: list[dict], *, dry_run: bool, failures: list[dict] | None = None) -> dict:
    return {
        "dry_run": dry_run,
        "photos_scanned": len(photos),
        "auto_approved": sum(1 for item in photos if item.get("xano_decision", {}).get("decision") == "approved"),
        "auto_rejected": sum(1 for item in photos if item.get("xano_decision", {}).get("decision") == "rejected"),
        "review": sum(1 for item in photos if item["planned_action"] in {"manual_review", "agent_review", "human_admin_review"}),
        "agent_review": sum(1 for item in photos if item["planned_action"] == "agent_review"),
        "human_admin_review": sum(1 for item in photos if item["planned_action"] == "human_admin_review"),
        "diagnostic_no_write": sum(1 for item in photos if item["planned_action"] == "diagnostic_no_write"),
        "escalate": 0,
        "report_only": sum(1 for item in photos if item["planned_action"] == "report_only"),
        "leave_pending": sum(1 for item in photos if item["planned_action"] == "leave_pending"),
        "race_skips": sum(1 for item in photos if item.get("xano_decision", {}).get("status") == "race_skip"),
        "escalations_opened": sum(1 for item in photos if item.get("xano_decision", {}).get("status") == "escalated"),
        "failures": failures or [],
        "model_api_path_used": sorted({item["model_path"]["vision_model_used"] for item in photos}) if photos else [],
        "fallback_usage": sum(1 for item in photos if item["model_path"].get("fallback_model")),
        "next_scheduled_run": None,
        "unresolved_escalations": sum(1 for item in photos if item.get("xano_decision", {}).get("status") == "escalated"),
    }


def _build_adapter(model_adapter: str, model_fixture: Path | None):
    normalized = model_adapter.strip().lower()
    if normalized == "mock":
        return MockModelAdapter(model_fixture)
    if normalized in CODEX_OPENAI_ADAPTER_NAMES:
        return CodexOpenAIAdapter()
    if normalized in OPENAI_MODERATIONS_ADAPTER_NAMES:
        raise ValueError("openai-moderations adapter is not available in this checkout")
    if normalized in MINIMAX_FALLBACK_ADAPTER_NAMES:
        return MiniMaxCLIAdapter()
    if normalized in OPENROUTER_ADAPTER_NAMES:
        raise ValueError("openrouter-multimodal adapter is not available in this checkout")
    raise ValueError(f"unsupported model_adapter: {model_adapter}")


def _provider_report(model_adapter: str, *, dry_run: bool) -> dict:
    normalized = model_adapter.strip().lower()
    if normalized in CODEX_OPENAI_ADAPTER_NAMES:
        provider = "codex-openai-image"
        model_route = "Codex OAuth/OpenClaw gpt-5.5 + gpt-image-2 configured image route"
    elif normalized in OPENAI_MODERATIONS_ADAPTER_NAMES:
        provider = "openai-moderations"
        model_route = "openai-moderations"
    elif normalized in MINIMAX_FALLBACK_ADAPTER_NAMES:
        provider = "minimax-cli"
        model_route = "minimax-vl"
    elif normalized in OPENROUTER_ADAPTER_NAMES:
        provider = "openrouter-multimodal"
        model_route = "openrouter-multimodal"
    else:
        provider = "mock"
        model_route = "mock_fixture"
    return {
        "provider": provider,
        "model_route": model_route,
        "image_generation_events": 0,
        "output_type": "text_json",
        "writes": not dry_run,
        "/photos/decide": "not called",
        "/photos/ai_decide": "called when write_enabled" if not dry_run else "not called",
    }
