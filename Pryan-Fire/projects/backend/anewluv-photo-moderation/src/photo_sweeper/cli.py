from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .agent_review import run_agent_review_once
from .lock import LockHeld, RunLock
from .queue import load_queue
from .reporting import maybe_report_run
from .runner import run_once
from .xano_client import XanoConfig, XanoModerationClient

MODEL_PROVIDER_CHOICES = (
    "mock",
    "provider-chain",
    "anewluv-provider-chain",
    "mock-provider-chain",
    "vision-llm-only",
    "mock-vision-llm-only",
    "codex-openai-image",
    "codex-openai",
    "openclaw-codex-openai",
    "primary",
    "openai-moderations",
    "minimax-cli",
    "minimax-fallback",
    "minimax-vl",
    "openrouter-multimodal",
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="photo-sweeper",
        description="Dry-run Anewluv photo moderation recommendation worker.",
    )
    parser.add_argument("--once", action="store_true", help="Run one dry-run sweep.")
    parser.add_argument("--agent-review", action="store_true", help="Run one autonomous agent-review escalation sweep.")
    parser.add_argument("--dry-run", action="store_true", help="Emit recommendations without writes.")
    parser.add_argument(
        "--live-write",
        action="store_true",
        help="Call the live Xano moderation endpoints. Use only after owner confirms the run is safe.",
    )
    parser.add_argument("--limit", type=int, default=None, help="Maximum queue items to inspect.")
    parser.add_argument("--page", type=int, default=1, help="Live Xano queue page to request.")
    parser.add_argument("--per-page", type=int, default=None, help="Live Xano queue page size to request.")
    parser.add_argument("--photo-id", type=str, default=None, help="Inspect one photo id from the fixture queue.")
    parser.add_argument(
        "--lock-file",
        type=Path,
        default=Path("/tmp/anewluv-photo-sweeper.lock"),
        help="Nonblocking live-write lock path. Cron should keep the default unless multiple environments share a host.",
    )
    parser.add_argument(
        "--no-lock",
        action="store_true",
        help="Disable the live-write overlap lock. Intended for unit tests only; do not use from cron.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Bypass selection safety only; writes remain disabled under the locked contract.",
    )
    parser.add_argument(
        "--queue-fixture",
        type=Path,
        default=None,
        help="Path to a redacted local queue fixture JSON file.",
    )
    parser.add_argument(
        "--model-fixture",
        type=Path,
        default=None,
        help="Path to a mock model response manifest JSON file.",
    )
    parser.add_argument(
        "--provider",
        choices=MODEL_PROVIDER_CHOICES,
        default=None,
        help="Live/model provider to use. codex-openai-image is primary; minimax-cli/minimax-vl is fallback only.",
    )
    parser.add_argument(
        "--model-adapter",
        choices=MODEL_PROVIDER_CHOICES,
        default="mock",
        help="Deprecated alias for --provider. Kept for existing smoke scripts.",
    )
    parser.add_argument(
        "--report",
        action="store_true",
        help="Post a sanitized Jarvis/Discord status summary after the run. Routine posts are opt-in to avoid spam.",
    )
    parser.add_argument(
        "--report-channel",
        default=None,
        help="Discord channel id for Jarvis/status reporting. Defaults to JARVIS_REPORT_CHANNEL or DISCORD_REPORT_CHANNEL.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if not args.once:
        print("photo-sweeper currently supports --once only.", file=sys.stderr)
        return 2

    live_write = bool(args.live_write)
    provider = args.provider or args.model_adapter
    if live_write and provider in {"provider-chain", "anewluv-provider-chain", "mock-provider-chain", "vision-llm-only", "mock-vision-llm-only"}:
        print(f"{provider} uses mock provider-chain adapters and is blocked for --live-write; use --dry-run or a real provider adapter.", file=sys.stderr)
        return 2
    queue = [] if live_write else load_queue(args.queue_fixture)
    lock_context = RunLock(args.lock_file) if live_write and not args.no_lock else None
    try:
        if lock_context is None:
            if args.agent_review:
                if not live_write:
                    print("--agent-review requires --live-write.", file=sys.stderr)
                    return 2
                result = run_agent_review_once(XanoModerationClient(XanoConfig.from_env()), limit=args.limit)
            else:
                result = run_once(
                    queue,
                    limit=args.limit,
                    photo_id=args.photo_id,
                    page=args.page,
                    per_page=args.per_page,
                    dry_run=not live_write,
                    force=bool(args.force),
                    model_fixture=args.model_fixture,
                    model_adapter=provider,
                    xano_client=XanoModerationClient(XanoConfig.from_env()) if live_write else None,
                )
        else:
            with lock_context:
                if args.agent_review:
                    result = run_agent_review_once(XanoModerationClient(XanoConfig.from_env()), limit=args.limit)
                else:
                    result = run_once(
                        queue,
                        limit=args.limit,
                        photo_id=args.photo_id,
                        page=args.page,
                        per_page=args.per_page,
                        dry_run=not live_write,
                        force=bool(args.force),
                        model_fixture=args.model_fixture,
                        model_adapter=provider,
                        xano_client=XanoModerationClient(XanoConfig.from_env()),
                    )
    except LockHeld as exc:
        print(str(exc), file=sys.stderr)
        return 75
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    report_kind = "agent_review" if args.agent_review else "initial_sweeper"
    result["jarvis_report"] = maybe_report_run(report_kind, result, enabled=args.report, channel_id=args.report_channel)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0
