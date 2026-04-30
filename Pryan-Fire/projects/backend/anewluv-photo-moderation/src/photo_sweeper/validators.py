from __future__ import annotations

from .moderation_contract import CANONICAL_REASON_MAP, DEFAULT_PROFILE_CHECKS, VALID_VERDICTS

FINAL_TO_RECOMMENDATION_VERDICTS = {
    "rejected": "reject_recommendation",
    "reject": "reject_recommendation",
}


def normalize_model_result(result: dict, *, default_model: str) -> dict:
    normalized = dict(result)
    if "verdict" not in normalized and "recommendation" in normalized:
        normalized["verdict"] = normalized.get("recommendation")
    if "reason_code" not in normalized and "reason" in normalized:
        normalized["reason_code"] = normalized.get("reason")

    raw_verdict = str(normalized.get("verdict", "review")).lower()
    normalized["verdict"] = FINAL_TO_RECOMMENDATION_VERDICTS.get(raw_verdict, raw_verdict)
    normalized["normalization_applied"] = "yes" if normalized["verdict"] != raw_verdict else "no"

    normalized.setdefault("confidence", 0.0)
    raw_reason_code = str(normalized.get("reason_code", "manual_review_needed")).lower()
    normalized["reason_code"] = CANONICAL_REASON_MAP.get(raw_reason_code, "manual_admin_decision")
    if normalized["reason_code"] != raw_reason_code:
        normalized["raw_reason_code"] = raw_reason_code

    normalized.setdefault("note", safe_note_for_reason(normalized["reason_code"]))
    normalized.setdefault("unsafe_categories", [])
    normalized.setdefault("moderation_api_used", False)
    normalized.setdefault("moderation_model", None)
    normalized.setdefault("vision_model_used", default_model)
    normalized.setdefault("fallback_model", None)
    normalized.setdefault("image_generation_events", 0)
    normalized.setdefault("output_type", "text_json")
    normalized.setdefault("app_profile_photo_checks", default_profile_checks(needs_human_review=True))

    normalized["validator"] = "pass" if is_valid_normalized_result(normalized) else "fail"
    if normalized["validator"] == "fail":
        normalized["verdict"] = "review"
        normalized["reason_code"] = CANONICAL_REASON_MAP["manual_review_needed"]
        normalized["raw_reason_code"] = "manual_review_needed"
        normalized["note"] = "Model output failed strict validation; manual review required."
        normalized["validator"] = "fail"
    return normalized


def is_valid_normalized_result(result: dict) -> bool:
    if result.get("verdict") not in VALID_VERDICTS:
        return False
    if not isinstance(result.get("unsafe_categories"), list):
        return False
    if result.get("reason_code") == "clean_profile_style" and result.get("verdict") != "approve_recommendation":
        return False
    return True


def default_profile_checks(*, needs_human_review: bool) -> dict:
    checks = dict(DEFAULT_PROFILE_CHECKS)
    checks["needs_human_review"] = needs_human_review
    return checks


def safe_note_for_reason(reason_code: str) -> str:
    notes = {
        "clean_profile_style": "AI recommends approval as profile-style image; human/admin workflow remains final.",
        "sexual_content": "AI recommends rejection/escalation for possible sexual content; human/admin workflow remains final.",
        "inappropriate_photos": "AI recommends rejection/escalation for possible inappropriate photo content; human/admin workflow remains final.",
        "fake_profile": "AI recommends rejection/review for possible fake, non-profile, or AI-generated image.",
        "off_platform_contact": "AI recommends rejection/review for possible off-platform contact or contact bait.",
        "spam": "AI recommends rejection/review for possible spam or advertisement content.",
        "money_request": "AI recommends rejection/review for possible money request or transactional dating signal.",
        "hate_speech": "AI recommends rejection/escalation for possible hate speech.",
        "harassment": "AI recommends rejection/escalation for possible harassment or threat content.",
        "bot_behavior": "AI recommends rejection/review for possible bot or scam signal.",
        "underage": "AI recommends escalation for possible underage/minor concern.",
        "minor_targeting": "AI recommends escalation for possible minor-safety targeting concern.",
        "manual_admin_decision": "AI recommends manual admin review; human/admin workflow remains final.",
    }
    return notes.get(reason_code, "AI recommends manual review; human/admin workflow remains final.")
