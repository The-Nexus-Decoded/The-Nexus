from __future__ import annotations

import os
import subprocess
import urllib.error
import urllib.request
from typing import Any, Callable, Mapping

ReportPoster = Callable[[str, str], None]

JARVIS_CHANNEL_ENV = "JARVIS_REPORT_CHANNEL"
DISCORD_CHANNEL_ENV = "DISCORD_REPORT_CHANNEL"
WEBHOOK_ENV = "DISCORD_WEBHOOK_URL"
ROUTINE_ENV = "ANEWLUV_PHOTO_REPORT_ROUTINE"


def maybe_report_run(
    kind: str,
    result: Mapping[str, Any],
    *,
    enabled: bool = False,
    channel_id: str | None = None,
    env: Mapping[str, str] | None = None,
    poster: ReportPoster | None = None,
) -> dict[str, Any]:
    """Post a sanitized Jarvis/Discord status report when configured.

    Routine reports are opt-in via --report or ANEWLUV_PHOTO_REPORT_ROUTINE=1.
    Failure/escalation reports still post promptly when a destination is configured.
    """
    if env is None:
        env = os.environ
    destination = _destination(channel_id=channel_id, env=env)
    if not destination:
        return {"posted": False, "reason": "destination_not_configured"}

    urgent = _is_urgent(kind, result)
    routine_enabled = enabled or _truthy(env.get(ROUTINE_ENV))
    if not routine_enabled and not urgent:
        return {"posted": False, "reason": "routine_suppressed", "urgent": False}

    message = format_report(kind, result, urgent=urgent)
    try:
        if poster:
            poster(destination, message)
        elif _looks_like_webhook(destination):
            _post_webhook(destination, message)
        else:
            default_discord_report_poster(destination, message)
    except Exception as exc:  # pragma: no cover - exact transport failures vary by host
        return {"posted": False, "failed": True, "error": exc.__class__.__name__}
    return {"posted": True, "urgent": urgent, "destination": _destination_label(destination), "bytes": len(message.encode("utf-8"))}


def format_report(kind: str, result: Mapping[str, Any], *, urgent: bool = False) -> str:
    if kind == "agent_review":
        return _format_agent_review_report(result, urgent=urgent)
    return _format_initial_sweeper_report(result, urgent=urgent)


def default_discord_report_poster(channel_id: str, message: str) -> None:
    subprocess.run(
        ["openclaw", "message", "send", "--channel", "discord", "--target", f"channel:{channel_id}", "--message", message],
        check=True,
        text=True,
        capture_output=True,
    )


def _format_initial_sweeper_report(result: Mapping[str, Any], *, urgent: bool) -> str:
    summary = _mapping(result.get("summary"))
    provider = str(result.get("provider") or _first(summary.get("model_api_path_used")) or "unknown")
    write_counts = _mapping(summary.get("write_counts"))
    failures = _list(summary.get("failures"))
    status = "ALERT" if urgent else "STATUS"
    return "\n".join(
        [
            f"Anewluv photo moderation initial sweeper {status}",
            f"dry_run={_bool_text(summary.get('dry_run', result.get('dry_run')))} photos_scanned={_int(summary.get('photos_scanned'))}",
            f"auto_approved={_int(summary.get('auto_approved'))} auto_rejected={_int(summary.get('auto_rejected'))} review={_int(summary.get('review'))}",
            f"agent_review={_int(summary.get('agent_review'))} human_admin_review={_int(summary.get('human_admin_review'))} escalations_opened={_int(summary.get('escalations_opened'))}",
            f"failures={len(failures)} race_skips={_int(summary.get('race_skips'))} fallback_usage={_int(summary.get('fallback_usage'))}",
            f"model_api_path={provider} writes_ai_decide={_int(write_counts.get('ai_decide'))} writes_escalations={_int(write_counts.get('escalations_open'))}",
            f"unresolved_escalations={_int(summary.get('unresolved_escalations'))} next_scheduled_run={summary.get('next_scheduled_run') or 'unknown'}",
        ]
    )


def _format_agent_review_report(result: Mapping[str, Any], *, urgent: bool) -> str:
    decisions = _list(result.get("decisions"))
    status = "ALERT" if urgent else "STATUS"
    decision_counts: dict[str, int] = {}
    for item in decisions:
        if isinstance(item, Mapping):
            decision = str(item.get("decision") or item.get("status") or "unknown")
            decision_counts[decision] = decision_counts.get(decision, 0) + 1
    decision_text = ",".join(f"{key}:{decision_counts[key]}" for key in sorted(decision_counts)) or "none"
    audit = _mapping(result.get("audit"))
    return "\n".join(
        [
            f"Anewluv photo moderation agent-review sweeper {status}",
            f"run_id={result.get('run_id') or 'unknown'} route={result.get('route') or 'agent_review'} polled={_int(result.get('polled'))}",
            f"acked={_int(result.get('acked'))} race_skips={_int(result.get('race_skips'))} deferred={_int(result.get('deferred'))}",
            f"decisions={decision_text}",
            f"audit_posted={_bool_text(audit.get('posted'))} audit_failed={_bool_text(audit.get('failed'))}",
        ]
    )


def _is_urgent(kind: str, result: Mapping[str, Any]) -> bool:
    if kind == "agent_review":
        audit = _mapping(result.get("audit"))
        return bool(audit.get("failed")) or _int(result.get("deferred")) > 0 or _int(result.get("race_skips")) > 0
    summary = _mapping(result.get("summary"))
    return bool(_list(summary.get("failures"))) or _int(summary.get("escalations_opened")) > 0 or _int(summary.get("unresolved_escalations")) > 0


def _destination(*, channel_id: str | None, env: Mapping[str, str]) -> str | None:
    for value in (channel_id, env.get(JARVIS_CHANNEL_ENV), env.get(DISCORD_CHANNEL_ENV), env.get(WEBHOOK_ENV)):
        if value and str(value).strip():
            return str(value).strip()
    return None


def _post_webhook(url: str, message: str) -> None:
    data = ("{\"content\": " + _json_string(message) + "}").encode("utf-8")
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=10) as response:  # noqa: S310 - operator configured webhook URL
        if response.status >= 400:
            raise urllib.error.HTTPError(url, response.status, "webhook post failed", response.headers, None)


def _json_string(value: str) -> str:
    # Avoid importing json in the hot path just for a single string payload.
    return '"' + value.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n') + '"'


def _looks_like_webhook(value: str) -> bool:
    return value.startswith("https://") or value.startswith("http://")


def _destination_label(value: str) -> str:
    return "webhook" if _looks_like_webhook(value) else "discord_channel"


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _first(value: Any) -> Any:
    if isinstance(value, list) and value:
        return value[0]
    return value


def _bool_text(value: Any) -> str:
    return "true" if bool(value) else "false"


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}
