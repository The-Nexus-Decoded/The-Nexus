"""Export one untouched Mixamo FBX animation as a small GLB pack.

Run with a Python environment that provides Blender's ``bpy`` module:

    python scripts/export-mixamo-animation-pack.py SOURCE.fbx OUTPUT.glb REPORT.json

The script deliberately does not retarget, bake a replacement pose, edit bones,
or alter animation timing. Runtime code owns semantic naming, exact frame-window
trimming, playback speed, and root-motion policy so the source curves remain
auditable and reusable.
"""

from __future__ import annotations

from contextlib import redirect_stdout
from hashlib import sha256
from io import StringIO
import json
from pathlib import Path
import sys

import bpy


def require_args() -> tuple[Path, Path, Path]:
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: export-mixamo-animation-pack.py SOURCE.fbx OUTPUT.glb REPORT.json"
        )
    return tuple(Path(value).resolve() for value in sys.argv[1:4])


def main() -> None:
    source, output, report_path = require_args()
    if not source.is_file():
        raise FileNotFoundError(source)

    output.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source), automatic_bone_orientation=False)

    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(
            f"Expected one Mixamo armature, got {[obj.name for obj in armatures]}"
        )
    actions = list(bpy.data.actions)
    if not actions:
        raise RuntimeError("Mixamo FBX imported without an animation action")

    armature = armatures[0]
    action = max(actions, key=lambda candidate: candidate.frame_range[1] - candidate.frame_range[0])
    armature.animation_data_create()
    armature.animation_data.action = action
    bpy.context.scene.render.fps = 30
    bpy.context.scene.frame_start = int(action.frame_range[0])
    bpy.context.scene.frame_end = int(action.frame_range[1])

    for obj in bpy.context.scene.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    with redirect_stdout(StringIO()):
        bpy.ops.export_scene.gltf(
            filepath=str(output),
            export_format="GLB",
            use_selection=True,
            export_animations=True,
            export_animation_mode="ACTIONS",
            export_force_sampling=True,
            export_frame_step=1,
            export_skins=True,
            export_def_bones=False,
            export_leaf_bone=False,
            export_materials="EXPORT",
            export_cameras=False,
            export_lights=False,
            export_extras=True,
            export_yup=True,
            export_apply=False,
            export_all_influences=False,
            export_influence_nb=4,
        )

    source_bytes = source.read_bytes()
    output_bytes = output.read_bytes()
    report = {
        "source": str(source),
        "sourceBytes": len(source_bytes),
        "sourceSha256": sha256(source_bytes).hexdigest().upper(),
        "output": str(output),
        "outputBytes": len(output_bytes),
        "outputSha256": sha256(output_bytes).hexdigest().upper(),
        "armature": armature.name,
        "boneCount": len(armature.pose.bones),
        "sourceAction": action.name,
        "frameRange": list(action.frame_range),
        "fps": bpy.context.scene.render.fps,
        "meshNames": [obj.name for obj in bpy.context.scene.objects if obj.type == "MESH"],
    }
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
