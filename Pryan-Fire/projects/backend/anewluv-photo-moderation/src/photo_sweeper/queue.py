from __future__ import annotations

import json
from pathlib import Path

from .deterministic import resolve_fixture_path

DEFAULT_QUEUE_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "queue_redacted.json"


def load_queue(path: Path | None = None) -> list[dict]:
    with (path or DEFAULT_QUEUE_FIXTURE).open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    items = payload.get("items", payload if isinstance(payload, list) else [])
    return [normalize_item(item) for item in items]


def normalize_item(raw: dict) -> dict:
    local_path = resolve_fixture_path(raw.get("local_fixture_path"))
    return {
        "photo_id": raw.get("id") or raw.get("photo_id"),
        "user_id": raw.get("users_id") or raw.get("user_id"),
        "photo_url": raw.get("photo_url"),
        "local_fixture_path": local_path,
        "image_url_present": bool(raw.get("photo_url") or local_path),
        "queue_source": raw.get("queue_source", "local_redacted_fixture"),
        "photostatus_id": raw.get("photostatus_id"),
        "gallery": raw.get("gallery"),
        "created_at": raw.get("created_at"),
        "model_fixture_key": raw.get("model_fixture_key", "manual_review_needed"),
    }
