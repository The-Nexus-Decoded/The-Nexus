from __future__ import annotations

import json
import subprocess
import time
import uuid
from dataclasses import dataclass
from typing import Any, Callable

from .xano_client import XanoClientError, XanoModerationClient, XanoRaceSkip

AGENT_REVIEW_ROUTE = "agent_review"
OPEN_STATUS = "open"
AuditPoster = Callable[[str, str], None]
Sleeper = Callable[[float], None]


@dataclass(frozen=True)
class AgentReviewDecision:
    status: str
    reason_code: str | None
    note: str


def run_agent_review_once(
    client: XanoModerationClient,
    *,
    limit: int | None = None,
    run_id: str | None = None,
    audit_poster: AuditPoster | None = None,
    sleeper: Sleeper = time.sleep,
) -> dict[str, Any]:
    run_id = run_id or str(uuid.uuid4())
    settings = _safe_settings(client)
    if settings.get("agent_review_enabled") is False:
        return _summary(run_id=run_id, polled=0, decisions=[])

    payload = client.escalations(status=OPEN_STATUS, route=AGENT_REVIEW_ROUTE)
    rows = _rows(payload)
    if limit is not None:
        rows = rows[: max(0, int(limit))]

    decisions: list[dict[str, Any]] = []
    for row in rows:
        escalation_id = row.get("id") or row.get("escalation_id")
        if escalation_id is None:
            decisions.append({"status": "skipped", "reason": "missing_escalation_id", "row": _redacted_row(row)})
            continue
        decision = decide_escalation(row)
        ack_payload = _ack_payload(decision, escalation_id=escalation_id, run_id=run_id)
        result = _ack_with_backoff(client, ack_payload, sleeper=sleeper)
        record = {
            "escalation_id": escalation_id,
            "photo_id": _photo_id(row),
            "status": result["status"],
            "decision": decision.status,
            "reason_code": decision.reason_code,
            "idempotency_key": ack_payload["idempotency_key"],
            "ack_payload": ack_payload,
        }
        if result.get("skipped"):
            record["skipped"] = True
        if result.get("deferred"):
            record["deferred"] = True
        decisions.append(record)

    channel_id = str(settings.get("agent_review_discord_channel_id") or "").strip()
    audit = _post_audit(decisions, channel_id=channel_id, audit_poster=audit_poster)
    summary = _summary(run_id=run_id, polled=len(rows), decisions=decisions)
    summary["audit"] = audit
    return summary


def decide_escalation(row: dict[str, Any]) -> AgentReviewDecision:
    assessment = _assessment(row)
    decision = str(assessment.get("recommended_decision") or assessment.get("decision") or assessment.get("verdict") or "").lower()
    reason_code = _first_str(
        assessment.get("reason_code"),
        assessment.get("server_reason_code"),
        assessment.get("canonical_reason_code"),
        row.get("reason_code"),
    )
    confidence = _confidence(assessment)

    if decision in {"approved", "approve", "approve_recommendation"} and confidence >= 0.80:
        return AgentReviewDecision("approved", reason_code, f"Zifnab autonomous approval at confidence {confidence:.2f}.")
    if decision in {"rejected", "reject", "reject_recommendation"} and confidence >= 0.80:
        return AgentReviewDecision("rejected", reason_code, f"Zifnab autonomous rejection at confidence {confidence:.2f}.")
    return AgentReviewDecision("needs_human_admin", reason_code, "Zifnab autonomous review deferred to human admin.")


def default_discord_audit_poster(channel_id: str, message: str) -> None:
    subprocess.run(
        ["openclaw", "message", "send", "--channel", "discord", "--target", f"channel:{channel_id}", "--message", message],
        check=True,
        text=True,
        capture_output=True,
    )


def _safe_settings(client: XanoModerationClient) -> dict[str, Any]:
    try:
        raw = client.moderation_settings()
    except Exception:
        return {}
    settings = raw.get("settings") if isinstance(raw, dict) else None
    if isinstance(settings, dict):
        return settings
    if isinstance(raw, dict):
        return raw
    return {}


def _ack_payload(decision: AgentReviewDecision, *, escalation_id: Any, run_id: str) -> dict[str, Any]:
    payload = {
        "escalation_id": escalation_id,
        "status": decision.status,
        "expected_current_status": OPEN_STATUS,
        "expected_route": AGENT_REVIEW_ROUTE,
        "idempotency_key": f"{run_id}:{escalation_id}",
        "note": decision.note,
    }
    if decision.reason_code:
        payload["override_reason_code"] = decision.reason_code
    return payload


def _ack_with_backoff(client: XanoModerationClient, payload: dict[str, Any], *, sleeper: Sleeper) -> dict[str, Any]:
    for attempt in range(4):
        try:
            client.escalation_ack(payload)
            return {"status": "acked"}
        except XanoRaceSkip:
            return {"status": "race_skip", "skipped": True}
        except XanoClientError as exc:
            if getattr(exc, "status_code", None) and int(exc.status_code) >= 500 and attempt < 3:
                sleeper(2**attempt)
                continue
            return {"status": "deferred", "deferred": True, "error": str(exc)}
    return {"status": "deferred", "deferred": True}


def _post_audit(decisions: list[dict[str, Any]], *, channel_id: str, audit_poster: AuditPoster | None) -> dict[str, Any]:
    posted = [item for item in decisions if item.get("status") == "acked"]
    if not posted or not channel_id:
        return {"posted": False, "reason": "empty" if not posted else "channel_not_configured"}
    always = [item for item in posted if item.get("decision") == "needs_human_admin"]
    if len(posted) <= 5:
        lines = [_audit_line(item) for item in posted]
    else:
        top = always or posted[:5]
        lines = [f"Zifnab photo escalation review: {len(posted)} decisions"] + [_audit_line(item) for item in top]
    message = "\n".join(lines)
    try:
        (audit_poster or default_discord_audit_poster)(channel_id, message)
    except Exception as exc:
        return {"posted": False, "failed": True, "error": exc.__class__.__name__}
    return {"posted": True, "count": len(lines)}


def _audit_line(item: dict[str, Any]) -> str:
    return (
        f"photo_id={item.get('photo_id')} decision={item.get('decision')} "
        f"reason_code={item.get('reason_code') or 'none'} idempotency_key={item.get('idempotency_key')}"
    )


def _summary(*, run_id: str, polled: int, decisions: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "route": AGENT_REVIEW_ROUTE,
        "polled": polled,
        "acked": sum(1 for item in decisions if item.get("status") == "acked"),
        "race_skips": sum(1 for item in decisions if item.get("status") == "race_skip"),
        "deferred": sum(1 for item in decisions if item.get("status") == "deferred"),
        "decisions": decisions,
    }


def _rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    for key in ("items", "rows", "data", "result"):
        value = payload.get(key) if isinstance(payload, dict) else None
        if isinstance(value, list):
            return [dict(item) for item in value if isinstance(item, dict)]
    return []


def _assessment(row: dict[str, Any]) -> dict[str, Any]:
    value = row.get("last_ai_assessment") or row.get("ai_assessment") or row.get("normalized_result") or {}
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return {}
    return value if isinstance(value, dict) else {}


def _photo_id(row: dict[str, Any]) -> Any:
    photo = row.get("photo") if isinstance(row.get("photo"), dict) else {}
    return row.get("photo_id") or photo.get("id") or photo.get("photo_id")


def _confidence(assessment: dict[str, Any]) -> float:
    try:
        return max(0.0, min(1.0, float(assessment.get("confidence", 0.0))))
    except (TypeError, ValueError):
        return 0.0


def _first_str(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _redacted_row(row: dict[str, Any]) -> dict[str, Any]:
    return {"id": row.get("id"), "escalation_id": row.get("escalation_id"), "photo_id": _photo_id(row)}
