from __future__ import annotations

from pathlib import Path

from .deterministic import inspect_image
from .model import MiniMaxCLIAdapter, MockModelAdapter
from .policy import combine


def run_once(
    queue: list[dict],
    *,
    limit: int | None,
    photo_id: str | None,
    dry_run: bool,
    force: bool,
    model_fixture: Path | None,
    model_adapter: str = "mock",
) -> dict:
    selected = _select(queue, limit=limit, photo_id=photo_id)
    adapter = _build_adapter(model_adapter, model_fixture)
    photos = []

    for item in selected:
        checks = inspect_image(item)
        model_result = adapter.review(item, checks)
        photos.append(combine(item, checks, model_result, dry_run=dry_run, force=force))

    return {
        "dry_run": True,
        "write_enabled": False,
        "force_requested": force,
        "photos_scanned": len(photos),
        "photos": photos,
        "summary": _summary(photos),
    }


def _select(queue: list[dict], *, limit: int | None, photo_id: str | None) -> list[dict]:
    items = queue
    if photo_id is not None:
        items = [item for item in items if str(item.get("photo_id")) == str(photo_id)]
    if limit is not None:
        items = items[: max(0, limit)]
    return items


def _summary(photos: list[dict]) -> dict:
    return {
        "dry_run": True,
        "photos_scanned": len(photos),
        "auto_approved": 0,
        "auto_rejected": 0,
        "review": sum(1 for item in photos if item["planned_action"] == "manual_review"),
        "escalate": sum(1 for item in photos if item["planned_action"] == "escalate"),
        "report_only": sum(1 for item in photos if item["planned_action"] == "report_only"),
        "leave_pending": sum(1 for item in photos if item["planned_action"] == "leave_pending"),
        "failures": [],
        "model_api_path_used": sorted({item["model_path"]["vision_model_used"] for item in photos}) if photos else [],
        "fallback_usage": 0,
        "next_scheduled_run": None,
        "unresolved_escalations": sum(1 for item in photos if item["planned_action"] == "escalate"),
    }


def _build_adapter(model_adapter: str, model_fixture: Path | None):
    if model_adapter == "mock":
        return MockModelAdapter(model_fixture)
    if model_adapter == "minimax-cli":
        return MiniMaxCLIAdapter()
    raise ValueError(f"unsupported model_adapter: {model_adapter}")
