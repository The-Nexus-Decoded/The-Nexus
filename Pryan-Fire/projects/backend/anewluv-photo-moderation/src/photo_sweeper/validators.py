from __future__ import annotations

from .moderation_contract import BUSINESS_REJECT_REASONS, CANONICAL_REASON_MAP

REQUIRED_NORMALIZED_KEYS = {"verdict", "confidence", "reason_code", "detected_category", "note", "unsafe_categories"}


def is_valid_normalized_result(result: dict) -> bool:
    if not REQUIRED_NORMALIZED_KEYS.issubset(result):
        return False
    if result.get("verdict") not in {"approve_recommendation", "reject_recommendation", "review", "escalate"}:
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
    return reason_code in set(CANONICAL_REASON_MAP.values()) or reason_code in BUSINESS_REJECT_REASONS


def _valid_detected_category(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())
