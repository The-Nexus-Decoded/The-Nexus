#!/usr/bin/env hython
"""Render one Heartvale review still from a saved .hipnc, in an isolated process.

Headless OpenGL can segfault (Vulkan driver); running one render per process
keeps a failure from taking down the other stills or the build.

Usage:
  hython render-heartvale-still.py <scene.hipnc> <ROP_NAME> <output.png>
"""

from __future__ import annotations

import sys
from pathlib import Path

import hou


def main() -> None:
    hip_path, rop_name, output = sys.argv[1], sys.argv[2], Path(sys.argv[3]).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    hou.hipFile.load(hip_path, suppress_save_prompt=True)
    rop = hou.node(f"/out/{rop_name}")
    if rop is None:
        raise RuntimeError(f"No ROP named {rop_name} in {hip_path}")
    rop.parm("picture").set(output.as_posix())
    rop.render()
    if not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError(f"Render produced no file: {output}")
    print(output.as_posix(), output.stat().st_size)


if __name__ == "__main__":
    main()
