from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

@dataclass(frozen=True)
class RuntimeContract:
    settings: dict[str, Any]
    reason_codes: dict[str, dict[str, Any]]
    review_items: tuple[dict[str, Any], ...]
    db_reason_codes_present: bool
    db_review_items_present: bool

    @classmethod
    def from_payload(
        cls,
        payload: dict[str, Any] | None,
        *,
        fallback_allowed: bool,
    ) -> "RuntimeContract":
        payload = payload or {}
        settings = normalize_settings(_first_present(payload, "moderation_settings", "settings"))
        reason_rows = normalize_rows(_first_present(payload, "reason_codes", "moderation_reason_codes"))
        review_rows = normalize_rows(_first_present(payload, "review_items", "moderation_review_items"))

        db_reason_codes_present = bool(reason_rows)
        db_review_items_present = bool(review_rows)
        return cls(
            settings=settings,
            reason_codes={str(row.get("code", "")).strip(): row for row in reason_rows if str(row.get("code", "")).strip()},
            review_items=tuple(review_rows),
            db_reason_codes_present=db_reason_codes_present,
            db_review_items_present=db_review_items_present,
        )

    def with_payload(self, payload: dict[str, Any] | None) -> "RuntimeContract":
        incoming = RuntimeContract.from_payload(payload, fallback_allowed=False)
        settings = {**self.settings, **incoming.settings}
        reason_codes = incoming.reason_codes or self.reason_codes
        review_items = incoming.review_items or self.review_items
        return RuntimeContract(
            settings=settings,
            reason_codes=reason_codes,
            review_items=review_items,
            db_reason_codes_present=self.db_reason_codes_present or incoming.db_reason_codes_present,
            db_review_items_present=self.db_review_items_present or incoming.db_review_items_present,
        )

    def auto_reject_allowed(self, server_reason_code: str, confidence: float) -> bool:
        if not self.db_reason_codes_present:
            return False
        row = self.reason_codes.get(server_reason_code)
        if not row:
            return False
        threshold = row.get("auto_reject_threshold")
        if threshold is None:
            return False
        try:
            return confidence >= float(threshold)
        except (TypeError, ValueError):
            return False


def normalize_settings(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return {str(key): _coerce_setting_value(value) for key, value in raw.items()}
    rows = normalize_rows(raw)
    settings: dict[str, Any] = {}
    for row in rows:
        key = row.get("key") or row.get("name")
        if not key:
            continue
        settings[str(key)] = _coerce_setting_value(row.get("value"), value_type=row.get("type"))
    return settings


def normalize_rows(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, list):
        return [dict(item) for item in raw if isinstance(item, dict)]
    if isinstance(raw, dict):
        for key in ("items", "rows", "data", "result"):
            value = raw.get(key)
            if isinstance(value, list):
                return [dict(item) for item in value if isinstance(item, dict)]
    return []


def review_items_prompt_text(rows: tuple[dict[str, Any], ...]) -> str:
    blocks = []
    for index, row in enumerate(rows, start=1):
        label = row.get("label") or row.get("name") or row.get("code") or f"review_item_{index}"
        hint = row.get("prompt_hint") or row.get("prompt_instruction") or row.get("description") or ""
        code = row.get("code") or row.get("reason_code") or label
        blocks.append(f"{index}. {label}\nPrompt instruction: {hint}\nReason code: {code}")
    return "\n\n".join(blocks)


def is_within_grace_period(created_at: Any, grace_minutes: Any, *, now: datetime | None = None) -> bool:
    if grace_minutes is None or created_at in (None, ""):
        return False
    try:
        grace = float(grace_minutes)
    except (TypeError, ValueError):
        return False
    created = _parse_datetime(created_at)
    if created is None:
        return False
    now = now or datetime.now(timezone.utc)
    return (now - created).total_seconds() < grace * 60


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, (int, float)):
        timestamp = float(value)
        if timestamp > 10_000_000_000:
            timestamp = timestamp / 1000.0
        return datetime.fromtimestamp(timestamp, tz=timezone.utc)
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _first_present(payload: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in payload:
            return payload[key]
    return None


def _coerce_setting_value(value: Any, *, value_type: Any = None) -> Any:
    if value_type:
        type_name = str(value_type).lower()
        if type_name == "bool":
            return _parse_bool(value)
        if type_name == "int":
            try:
                return int(value)
            except (TypeError, ValueError):
                return value
        if type_name == "float":
            try:
                return float(value)
            except (TypeError, ValueError):
                return value
    if isinstance(value, str):
        parsed = _parse_bool(value)
        if parsed is not None:
            return parsed
        try:
            return int(value)
        except ValueError:
            try:
                return float(value)
            except ValueError:
                return value
    return value


def _parse_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if not isinstance(value, str):
        return None
    lowered = value.strip().lower()
    if lowered in {"true", "1", "yes", "on"}:
        return True
    if lowered in {"false", "0", "no", "off"}:
        return False
    return None
