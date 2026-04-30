from __future__ import annotations

from pathlib import Path

from .deterministic import inspect_image
from .model import CodexOpenAIAdapter, MiniMaxCLIAdapter, MockModelAdapter
from .policy import combine

CODEX_OPENAI_ADAPTER_NAMES = {"codex-openai-image", "codex-openai", "openclaw-codex-openai", "primary"}
OPENAI_MODERATIONS_ADAPTER_NAMES = {"openai-moderations"}
MINIMAX_FALLBACK_ADAPTER_NAMES = {"minimax-cli", "minimax-fallback", "minimax-vl"}
OPENROUTER_ADAPTER_NAMES = {"openrouter-multimodal"}


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
        **_provider_report(model_adapter),
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
        "fallback_usage": sum(1 for item in photos if item["model_path"].get("fallback_model")),
        "next_scheduled_run": None,
        "unresolved_escalations": sum(1 for item in photos if item["planned_action"] == "escalate"),
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


def _provider_report(model_adapter: str) -> dict:
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
        "writes": False,
        "/photos/decide": "not called",
    }
