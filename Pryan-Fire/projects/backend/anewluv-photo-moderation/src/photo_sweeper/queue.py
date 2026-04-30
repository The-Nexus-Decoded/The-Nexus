from __future__ import annotations

import json
from pathlib import Path

from .deterministic import resolve_fixture_path

XANO_VAULT_BASE_URL = "https://xvlh-aq5j-qiqk.n7d.xano.io"

DEFAULT_QUEUE_FIXTURE = Path(__file__).resolve().parent / "fixtures" / "queue_redacted.json"


def load_queue(path: Path | None = None) -> list[dict]:
    with (path or DEFAULT_QUEUE_FIXTURE).open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    items = payload.get("items", payload if isinstance(payload, list) else [])
    return [normalize_item(item) for item in items]


def normalize_item(raw: dict) -> dict:
    local_path = resolve_fixture_path(raw.get("local_fixture_path"))
    photo_data = raw.get("PhotoData") or raw.get("photo_data") or {}
    photo_data_url = photo_data.get("url") if isinstance(photo_data, dict) else None
    photo_url = raw.get("photo_url") or raw.get("PhotoUrl")
    resolved_url, source_field = _choose_image_ref(photo_data_url, photo_url, local_path)
    return {
        "photo_id": raw.get("id") or raw.get("photo_id"),
        "photo_url": resolved_url,
        "local_fixture_path": local_path,
        "image_url_present": bool(resolved_url or local_path),
        "queue_source": raw.get("queue_source", "local_redacted_fixture"),
        "photostatus_id": raw.get("photostatus_id"),
        "gallery": raw.get("gallery"),
        "created_at": raw.get("created_at"),
        "model_fixture_key": raw.get("model_fixture_key", "manual_review_needed"),
        "source_field": source_field,
        "has_photo_url": bool(photo_url or photo_data_url),
    }


def _choose_image_ref(photo_data_url: str | None, photo_url: str | None, local_path: str | None) -> tuple[str | None, str | None]:
    if local_path:
        return None, "local_fixture_path"
    if photo_data_url:
        return photo_data_url, "PhotoData.url"
    if photo_url:
        if photo_url.startswith("http://") or photo_url.startswith("https://"):
            return photo_url, "PhotoUrl"
        if photo_url.startswith("/"):
            return f"{XANO_VAULT_BASE_URL}{photo_url}", "PhotoUrl"
        return photo_url, "PhotoUrl"
    return None, None
