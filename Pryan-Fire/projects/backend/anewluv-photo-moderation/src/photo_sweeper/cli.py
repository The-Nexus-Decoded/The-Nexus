from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .queue import load_queue
from .runner import run_once


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="photo-sweeper",
        description="Dry-run Anewluv photo moderation recommendation worker.",
    )
    parser.add_argument("--once", action="store_true", help="Run one dry-run sweep.")
    parser.add_argument("--dry-run", action="store_true", help="Emit recommendations without writes.")
    parser.add_argument("--limit", type=int, default=None, help="Maximum queue items to inspect.")
    parser.add_argument("--photo-id", type=str, default=None, help="Inspect one photo id from the fixture queue.")
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
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if not args.once:
        print("photo-sweeper currently supports --once only.", file=sys.stderr)
        return 2

    queue = load_queue(args.queue_fixture)
    result = run_once(
        queue,
        limit=args.limit,
        photo_id=args.photo_id,
        dry_run=True,
        force=bool(args.force),
        model_fixture=args.model_fixture,
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0
