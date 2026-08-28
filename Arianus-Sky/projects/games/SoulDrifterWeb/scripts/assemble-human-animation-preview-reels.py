"""Assemble labeled candidate previews into compact owner-review reels."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--group-size", type=int, default=16)
    return parser.parse_args()


def quote_concat_path(path: Path) -> str:
    return "file '" + path.resolve().as_posix().replace("'", "'\\''") + "'"


def main() -> None:
    args = parse_args()
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg is required to assemble preview reels")
    if args.group_size < 1:
        raise ValueError("--group-size must be at least 1")

    source_manifest = args.input / "preview-render-manifest.json"
    source = json.loads(source_manifest.read_text(encoding="utf-8"))["clips"]
    if not source:
        raise RuntimeError(f"No preview clips found in {source_manifest}")

    args.output.mkdir(parents=True, exist_ok=True)
    reels: list[dict[str, object]] = []
    for offset in range(0, len(source), args.group_size):
        group = source[offset : offset + args.group_size]
        reel_number = len(reels) + 1
        reel_path = args.output / f"{args.prefix}-{reel_number:02d}.mp4"
        concat_path = args.output / f".{args.prefix}-{reel_number:02d}.concat.txt"
        paths = [Path(item["path"]) for item in group]
        missing = [str(path) for path in paths if not path.is_file()]
        if missing:
            raise FileNotFoundError(f"Missing preview clips: {missing}")
        concat_path.write_text(
            "\n".join(quote_concat_path(path) for path in paths) + "\n",
            encoding="utf-8",
        )
        try:
            subprocess.run(
                [
                    ffmpeg,
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-f",
                    "concat",
                    "-safe",
                    "0",
                    "-i",
                    str(concat_path),
                    "-c",
                    "copy",
                    "-movflags",
                    "+faststart",
                    str(reel_path),
                ],
                check=True,
            )
        finally:
            concat_path.unlink(missing_ok=True)
        reels.append(
            {
                "reel": reel_number,
                "path": str(reel_path),
                "firstIndex": group[0]["index"],
                "lastIndex": group[-1]["index"],
                "clips": group,
            }
        )

    manifest_path = args.output / f"{args.prefix}-reel-manifest.json"
    manifest_path.write_text(json.dumps({"reels": reels}, indent=2), encoding="utf-8")
    print(f"WROTE {manifest_path}")


if __name__ == "__main__":
    main()
