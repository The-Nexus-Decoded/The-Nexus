"""Shared safety policy for non-shipping Houdini Apprentice POC artifacts."""

from pathlib import Path


APPROVED_OUTPUT_ROOT = Path("H:/temp/SoulDrifter-Houdini-POC").resolve()


def require_apprentice_license(license_name: str) -> None:
    if license_name != "Apprentice":
        raise RuntimeError(f"Expected Houdini Apprentice; active license is {license_name}.")


def approved_output_directory(requested: Path) -> Path:
    candidate = requested.resolve()
    if candidate != APPROVED_OUTPUT_ROOT and APPROVED_OUTPUT_ROOT not in candidate.parents:
        raise RuntimeError(
            f"Houdini Apprentice POC output must stay under {APPROVED_OUTPUT_ROOT}; requested {candidate}"
        )
    candidate.mkdir(parents=True, exist_ok=True)
    return candidate
