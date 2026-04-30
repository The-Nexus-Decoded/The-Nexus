from __future__ import annotations

from .moderation_contract import CANONICAL_REASON_MAP, DEFAULT_PROFILE_CHECKS
from .validators import is_valid_normalized_result

AI_GENERATED_HIGH_CONFIDENCE_THRESHOLD = 0.80
DEFAULT_MINIMAX_MODEL = "minimax/MiniMax-VL-01"
DETECTED_CATEGORY_ALIASES = {
    "is_blank_or_unusable": "blank_or_unusable",
}

FINAL_TO_RECOMMENDATION_VERDICTS = {
    "rejected": "reject_recommendation",
    "reject": "reject_recommendation",
}

DECISION_TO_RECOMMENDATION_VERDICTS = {
    "approve": "approve_recommendation",
    "approved": "approve_recommendation",
    "reject": "reject_recommendation",
    "rejected": "reject_recommendation",
    "review": "review",
}

HIGH_CONFIDENCE_PERSON_GATE_THRESHOLD = 0.80


def normalize_model_result(result: dict, *, default_model: str) -> dict:
    normalized = dict(result)
    if "verdict" not in normalized and "recommendation" in normalized:
        normalized["verdict"] = normalized.get("recommendation")
    if "reason_code" not in normalized and "canonical_reason_code" in normalized:
        normalized["reason_code"] = normalized.get("canonical_reason_code")
    if "reason_code" not in normalized and "reason" in normalized:
        normalized["reason_code"] = normalized.get("reason")
    if "verdict" not in normalized and "decision" in normalized:
        normalized["verdict"] = DECISION_TO_RECOMMENDATION_VERDICTS.get(str(normalized.get("decision")).lower(), normalized.get("decision"))

    normalized = _apply_person_photo_business_gate(normalized)

    raw_verdict = str(normalized.get("verdict", "review")).lower()
    normalized["verdict"] = FINAL_TO_RECOMMENDATION_VERDICTS.get(raw_verdict, raw_verdict)
    normalized["normalization_applied"] = "yes" if normalized["verdict"] != raw_verdict else "no"

    normalized.setdefault("confidence", 0.0)
    raw_reason_code = str(normalized.get("reason_code", "manual_review_needed")).lower()
    if raw_reason_code == "ai_generated_or_synthetic" and float(normalized.get("confidence") or 0.0) < AI_GENERATED_HIGH_CONFIDENCE_THRESHOLD:
        normalized["reason_code"] = "manual_admin_decision"
        normalized["verdict"] = "review"
    else:
        normalized["reason_code"] = CANONICAL_REASON_MAP.get(raw_reason_code, "manual_admin_decision")
    if normalized["reason_code"] != raw_reason_code:
        normalized["raw_reason_code"] = raw_reason_code

    detected_category = str(normalized.get("detected_category") or normalized.get("raw_reason_code") or normalized["reason_code"]).lower()
    normalized["detected_category"] = DETECTED_CATEGORY_ALIASES.get(detected_category, detected_category)
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


def _apply_person_photo_business_gate(normalized: dict) -> dict:
    confidence = _safe_confidence(normalized.get("confidence"))
    checks = dict(normalized.get("app_profile_photo_checks") or default_profile_checks(needs_human_review=True))
    is_person_photo = normalized.get("is_person_photo")
    if is_person_photo is None:
        is_person_photo = normalized.get("is_photo_of_person")
    if is_person_photo is None and "is_real_person_profile_photo" in normalized:
        legacy_value = str(normalized.get("is_real_person_profile_photo")).lower()
        is_person_photo = {"yes": True, "no": False, "uncertain": "uncertain"}.get(legacy_value, normalized.get("is_real_person_profile_photo"))

    if is_person_photo is True:
        checks["is_profile_style_photo"] = True
        checks["needs_human_review"] = False
        if str(normalized.get("reason_code", "")).lower() == "ok":
            normalized["reason_code"] = "clean_profile_style"
    elif is_person_photo is False:
        checks["is_profile_style_photo"] = False
        checks["needs_human_review"] = False
        normalized["verdict"] = "reject_recommendation"
        normalized["reason_code"] = "not_person_photo"
        normalized.setdefault("detected_category", str(normalized.get("evidence") or "not_person_photo"))
    elif str(is_person_photo).lower() == "uncertain":
        checks["needs_human_review"] = True
        normalized["verdict"] = "review"
        normalized["reason_code"] = "manual_review_needed"

    raw_reason_hint = str(normalized.get("reason_code") or "").lower()
    if raw_reason_hint in {"explicit_content", "unsafe_content"}:
        checks["needs_human_review"] = True
        normalized["verdict"] = "escalate"
        normalized["reason_code"] = raw_reason_hint
    elif raw_reason_hint in {"too_blurry_or_blank", "blank_or_unusable", "low_quality_or_unusable"} and str(normalized.get("verdict", "")).lower() == "reject_recommendation":
        checks["needs_human_review"] = False
        normalized["reason_code"] = "too_blurry_or_blank"

    detected_text = " ".join(
        str(normalized.get(key, ""))
        for key in ("detected_category", "evidence", "note", "raw_reason_code")
    ).lower()
    if (
        is_person_photo is None
        and confidence >= HIGH_CONFIDENCE_PERSON_GATE_THRESHOLD
        and checks.get("is_profile_style_photo") is False
        and any(marker in detected_text for marker in ("no real person", "not a real person", "no person", "not a person", "not profile photo", "no visible person"))
    ):
        checks["needs_human_review"] = False
        normalized["verdict"] = "reject_recommendation"
        normalized["reason_code"] = "not_person_photo"

    if "screenshot" in detected_text or "meme" in detected_text or "trading card" in detected_text:
        checks["meme_or_screenshot"] = True
    normalized["app_profile_photo_checks"] = checks
    return normalized


def _safe_confidence(value: object) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def default_profile_checks(*, needs_human_review: bool) -> dict:
    checks = dict(DEFAULT_PROFILE_CHECKS)
    checks["needs_human_review"] = needs_human_review
    return checks


def normalize_minimax_description(description: str, *, model: str = DEFAULT_MINIMAX_MODEL) -> dict:
    text = description.lower()
    checks = default_profile_checks(needs_human_review=True)
    unsafe_categories: list[str] = []
    verdict = "review"
    reason_code = "manual_review_needed"
    confidence = 0.55

    if any(term in text for term in ["porn", "pornographic", "explicit", "genital", "sexual act", "intercourse", "masturbat", "nude", "nudity"]):
        verdict = "reject_recommendation"
        reason_code = "sexual_content"
        confidence = 0.88
        unsafe_categories = ["sexual_content"]
    elif any(term in text for term in ["ai-generated", "ai generated", "generated image", "illustration", "cartoon", "anime", "drawing", "rendered"]):
        reason_code = "ai_generated_or_synthetic"
        confidence = 0.78
        unsafe_categories = ["ai_generated_or_synthetic"]
        checks["ai_generated_or_synthetic"] = True
    elif any(term in text for term in ["screenshot", "meme", "advertisement", "phone number", "email", "social media handle", "qr code"]):
        reason_code = "contact_info_or_ad"
        confidence = 0.74
        unsafe_categories = ["contact_info_or_ad"]
        checks["has_contact_info"] = True
        checks["meme_or_screenshot"] = True
    elif any(term in text for term in ["blurry", "dark", "unclear", "obscured", "low quality", "not visible"]):
        reason_code = "low_quality_or_unusable"
        confidence = 0.68
        unsafe_categories = ["low_quality_or_unusable"]
        checks["blank_or_unusable"] = True
    elif any(term in text for term in ["person", "people", "man", "woman", "face", "portrait", "selfie", "individual", "subject"]):
        verdict = "approve_recommendation"
        reason_code = "clean_profile_style"
        confidence = 0.82
        checks["is_profile_style_photo"] = True
        checks["needs_human_review"] = False
    else:
        reason_code = "not_a_profile_photo"
        confidence = 0.62
        unsafe_categories = ["not_a_profile_photo"]

    return normalize_model_result(
        {
            "verdict": verdict,
            "confidence": confidence,
            "reason_code": reason_code,
            "note": safe_note_for_reason(reason_code),
            "unsafe_categories": unsafe_categories,
            "vision_model_used": f"{model} + parser",
            "fallback_model": None,
            "app_profile_photo_checks": checks,
        },
        default_model=f"{model} + parser",
    )


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
