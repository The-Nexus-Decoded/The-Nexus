from __future__ import annotations

import urllib.parse
import uuid
import json
from pathlib import Path
from typing import Any

from .deterministic import inspect_image
from .model import CodexOpenAIAdapter, MiniMaxCLIAdapter, MockModelAdapter
from .policy import combine
from .queue import normalize_item
from .runtime_contract import RuntimeContract, is_within_grace_period, review_items_prompt_text
from .xano_client import XanoModerationClient, XanoRaceSkip

CODEX_OPENAI_ADAPTER_NAMES = {"codex-openai-image", "codex-openai", "openclaw-codex-openai", "primary"}
OPENAI_MODERATIONS_ADAPTER_NAMES = {"openai-moderations"}
MINIMAX_FALLBACK_ADAPTER_NAMES = {"minimax-cli", "minimax-fallback", "minimax-vl"}
OPENROUTER_ADAPTER_NAMES = {"openrouter-multimodal"}

SERVER_REASON_CODE_MAP = {
    "clean_profile_style": "unclear_subject",
    "fake_profile": "celebrity_or_stock_photo",
    "ai_generated": "ai_generated",
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
        runtime_contract = _runtime_contract_from_live_payload(live_payload, xano_client=xano_client)
        raw_items = live_payload.get("items", [])
        fetched_count = len(raw_items)
        queue = [
            _normalize_live_item(item, xano_client=xano_client)
            for item in raw_items
            if _is_live_uploaded_candidate(item)
            and not is_within_grace_period(
                item.get("created_at"),
                runtime_contract.settings.get("ai_grace_period_minutes"),
            )
        ]
    else:
        runtime_contract = RuntimeContract.from_payload({}, fallback_allowed=True)
    effective_limit = _effective_limit(limit, runtime_contract.settings)
    selected = _select(queue, limit=effective_limit, photo_id=photo_id, force=force)
    auto_decide_disabled = runtime_contract.settings.get("ai_auto_decide_enabled") is False
    adapter = None if auto_decide_disabled else _build_adapter(model_adapter, model_fixture, runtime_contract=runtime_contract)
    run_id = str(uuid.uuid4())
    photos = []
    failures = []
    decision_calls = []

    for item in selected:
        if auto_decide_disabled:
            photo = _settings_disabled_photo(item, dry_run=dry_run, force=force)
            photo["server_reason_code"] = _server_reason_code(photo)
            if not dry_run:
                if xano_client is None:
                    raise ValueError("xano_client is required when dry_run is false")
                call = _submit_escalation(xano_client, photo, user_id=item.get("user_id"), settings=runtime_contract.settings, run_id=run_id)
                photo["xano_decision"] = call
                decision_calls.append(call)
                if call.get("status") == "race_skip":
                    failures.append({"photo_id": photo["photo_id"], "status": "race_skip"})
            photos.append(photo)
            continue

        checks = inspect_image(item)
        if adapter is None:
            raise ValueError("model adapter is required when ai_auto_decide_enabled is true")
        model_result = adapter.review(item, checks)
        server_reason = _server_reason_code_from_model_result(model_result, runtime_contract=runtime_contract)
        photo = combine(
            item,
            checks,
            model_result,
            dry_run=dry_run,
            force=force,
            runtime_contract=runtime_contract,
            server_reason_code=server_reason,
        )
        photo["server_reason_code"] = server_reason
        if not dry_run:
            if xano_client is None:
                raise ValueError("xano_client is required when dry_run is false")
            call = _submit_ai_decision(xano_client, photo, user_id=item.get("user_id"), runtime_contract=runtime_contract, run_id=run_id)
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
        "settings_echo_present": bool(runtime_contract.settings),
        "settings_echo": runtime_contract.settings,
        "db_reason_codes_present": runtime_contract.db_reason_codes_present,
        "db_review_items_present": runtime_contract.db_review_items_present,
        "queue_fetched": fetched_count,
        "page": page,
        "per_page": per_page or limit,
        "local_cap": effective_limit,
        "run_id": run_id,
        "photos_scanned": len(photos),
        "photos": photos,
        "decision_calls": decision_calls,
        "summary": _summary(photos, dry_run=dry_run, failures=failures),
    }


def _is_live_uploaded_candidate(item: dict) -> bool:
    return item.get("photostatus_id") == 1 and item.get("deleted") is not True


def _normalize_live_item(item: dict, *, xano_client: XanoModerationClient) -> dict:
    normalized = normalize_item({**item, "queue_source": "GET /photos/queue"})
    photo_url = normalized.get("photo_url")
    if isinstance(photo_url, str) and photo_url.startswith("/"):
        api_base = getattr(getattr(xano_client, "config", None), "api_base_url", None)
        if isinstance(api_base, str) and api_base:
            parsed = urllib.parse.urlparse(api_base)
            origin = urllib.parse.urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))
            normalized["photo_url"] = urllib.parse.urljoin(f"{origin}/", photo_url.lstrip("/"))
    return normalized


def _runtime_contract_from_live_payload(live_payload: dict[str, Any], *, xano_client: XanoModerationClient) -> RuntimeContract:
    contract = RuntimeContract.from_payload(live_payload, fallback_allowed=False)
    if not contract.settings:
        contract = contract.with_payload(_optional_client_call(xano_client, "moderation_settings"))
    if not contract.db_reason_codes_present:
        reason_payload = _optional_client_call(xano_client, "reason_codes", surface="photo")
        if reason_payload is not None:
            contract = contract.with_payload({"reason_codes": reason_payload})
    if not contract.db_review_items_present:
        review_payload = _optional_client_call(xano_client, "review_items", applies_to="photo")
        if review_payload is not None:
            contract = contract.with_payload({"review_items": review_payload})
    return contract


def _optional_client_call(client: XanoModerationClient, method_name: str, **kwargs: Any) -> dict[str, Any] | None:
    method = getattr(client, method_name, None)
    if not callable(method):
        return None
    try:
        return method(**kwargs)
    except Exception:
        return None


def _effective_limit(limit: int | None, settings: dict[str, Any]) -> int | None:
    cap = settings.get("ai_max_decisions_per_run")
    try:
        parsed_cap = int(cap)
    except (TypeError, ValueError):
        return limit
    if parsed_cap < 0:
        parsed_cap = 0
    return parsed_cap if limit is None else min(limit, parsed_cap)


def _submit_ai_decision(client: XanoModerationClient, photo: dict, *, user_id: int | str | None, runtime_contract: RuntimeContract, run_id: str) -> dict:
    decision = _xano_decision(photo, runtime_contract=runtime_contract)
    if decision is None:
        return _submit_escalation(client, photo, user_id=user_id, settings=runtime_contract.settings, run_id=run_id)
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


def _settings_disabled_photo(item: dict, *, dry_run: bool, force: bool) -> dict:
    model_result = {
        "verdict": "review",
        "confidence": 0.0,
        "reason_code": "manual_admin_decision",
        "raw_reason_code": "auto_decide_disabled",
        "note": "ai_auto_decide_enabled is false; skipped model call and routed to escalation.",
        "unsafe_categories": [],
        "moderation_api_used": False,
        "moderation_model": None,
        "vision_model_used": "settings_precheck",
        "fallback_model": "manual_review",
        "validator": "pass",
        "app_profile_photo_checks": {"needs_human_review": True},
    }
    return {
        "photo_id": item["photo_id"],
        "queue_source": item.get("queue_source", "GET /photos/queue"),
        "dry_run": dry_run,
        "force_requested": force,
        "write_enabled": not dry_run,
        "model_path": {
            "moderation_api_used": False,
            "moderation_model": None,
            "vision_model_used": "settings_precheck",
            "fallback_model": "manual_review",
        },
        "deterministic_checks": {"skipped": True, "reason": "ai_auto_decide_enabled"},
        "normalized_result": model_result,
        "planned_action": "agent_review",
        "recommended_decision": None,
        "would_write_recommendation": False,
        "would_finalize_decision": False,
        "would_escalate": True,
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
        "model_path_json": _json_string(photo.get("model_path", {})),
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


def _xano_decision(photo: dict, *, runtime_contract: RuntimeContract) -> str | None:
    settings = runtime_contract.settings
    if photo.get("planned_action") in {"leave_pending", "manual_review", "agent_review", "human_admin_review", "diagnostic_no_write"}:
        return None
    if photo.get("normalized_result", {}).get("validator") == "fail":
        return None
    if not runtime_contract.db_reason_codes_present:
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


def _json_string(value: Any) -> str:
    return json.dumps(value if value is not None else {}, sort_keys=True, separators=(",", ":"))


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
    return str(photo.get("server_reason_code") or _server_reason_code_from_model_result(photo.get("normalized_result", {})))


def _server_reason_code_from_model_result(normalized: dict, *, runtime_contract: RuntimeContract | None = None) -> str:
    reason = str(normalized.get("reason_code") or normalized.get("raw_reason_code") or "manual_admin_decision").strip()
    if runtime_contract is not None and reason in runtime_contract.reason_codes:
        return reason
    mapped = SERVER_REASON_CODE_MAP.get(reason)
    if mapped and (runtime_contract is None or mapped in runtime_contract.reason_codes or not runtime_contract.db_reason_codes_present):
        return mapped
    return "unclear_subject"


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


def _select(queue: list[dict], *, limit: int | None, photo_id: str | None, force: bool = False) -> list[dict]:
    items = queue
    if photo_id is not None:
        items = [item for item in items if str(item.get("photo_id")) == str(photo_id)]
    selected = []
    seen_photo_ids = set()
    for item in items:
        if limit is not None and len(selected) >= max(0, limit):
            break
        current_id = item.get("photo_id")
        if current_id in seen_photo_ids:
            continue
        if not force and _already_ai_processed(item):
            continue
        seen_photo_ids.add(current_id)
        selected.append(item)
    return selected


def _already_ai_processed(item: dict) -> bool:
    if item.get("ai_processed") is True or item.get("already_ai_processed") is True:
        return True
    for key in ("ai_reason_code", "ai_verdict", "ai_status", "last_ai_assessment_id", "ai_assessment_id", "moderation_run_id"):
        value = item.get(key)
        if value not in (None, ""):
            return True
    return False


def _summary(photos: list[dict], *, dry_run: bool, failures: list[dict] | None = None) -> dict:
    decision_calls = [item.get("xano_decision", {}) for item in photos]
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
        "selected_photo_ids": [item.get("photo_id") for item in photos],
        "escalation_ids": [call.get("escalation_id") for call in decision_calls if call.get("escalation_id") is not None],
        "write_counts": {
            "ai_decide": sum(1 for call in decision_calls if call.get("status") == "submitted"),
            "escalations_open": sum(1 for call in decision_calls if call.get("status") == "escalated"),
            "race_skip": sum(1 for call in decision_calls if call.get("status") == "race_skip"),
        },
    }


def _build_adapter(model_adapter: str, model_fixture: Path | None, *, runtime_contract: RuntimeContract):
    normalized = model_adapter.strip().lower()
    allowed_reason_codes = set(runtime_contract.reason_codes)
    if normalized == "mock":
        return MockModelAdapter(model_fixture, allowed_reason_codes=allowed_reason_codes)
    if normalized in CODEX_OPENAI_ADAPTER_NAMES:
        instructions = None
        if runtime_contract.review_items:
            from .moderation_contract import provider_instructions

            instructions = provider_instructions(review_items_prompt_text(runtime_contract.review_items))
        return CodexOpenAIAdapter(instructions=instructions, allowed_reason_codes=allowed_reason_codes)
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
