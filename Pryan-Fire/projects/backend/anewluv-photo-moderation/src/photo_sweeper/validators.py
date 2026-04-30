from __future__ import annotations

from .moderation_contract import CANONICAL_REASON_MAP, IMAGE_TYPE_CLASSIFICATIONS, VALID_VERDICTS, WORKER_MODEL_CATEGORIES, XANO_CANONICAL_REASON_CODES

REQUIRED_NORMALIZED_KEYS = {"verdict", "confidence", "reason_code", "detected_category", "note", "unsafe_categories"}


def is_valid_normalized_result(result: dict) -> bool:
    if not REQUIRED_NORMALIZED_KEYS.issubset(result):
        return False
    if result.get("verdict") not in VALID_VERDICTS:
        return False
    if not _valid_confidence(result.get("confidence")):
        return False
    if not isinstance(result.get("unsafe_categories"), list):
        return False
    if not _valid_reason_code(result):
        return False
    if not _valid_detected_category(result.get("detected_category")):
        return False
    if not isinstance(result.get("note"), str):
        return False
    return True


def _valid_confidence(value: object) -> bool:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return False
    return 0.0 <= float(value) <= 1.0


def _valid_reason_code(result: dict) -> bool:
    reason_code = result.get("reason_code")
    if reason_code == "clean_profile_style":
        return result.get("verdict") == "approve_recommendation"
    return reason_code in XANO_CANONICAL_REASON_CODES


def _valid_detected_category(value: object) -> bool:
    if not isinstance(value, str) or not value:
        return False
    return value in IMAGE_TYPE_CLASSIFICATIONS or value in WORKER_MODEL_CATEGORIES or value in XANO_CANONICAL_REASON_CODES or value in CANONICAL_REASON_MAP
