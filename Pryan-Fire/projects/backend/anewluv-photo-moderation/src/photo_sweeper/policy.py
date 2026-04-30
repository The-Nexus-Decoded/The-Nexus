from __future__ import annotations

from .moderation_contract import APPROVE_ONLY_REASONS, EXPLICIT_REASONS, XANO_CANONICAL_REASON_CODES


def combine(item: dict, checks: dict, model_result: dict, *, dry_run: bool, force: bool) -> dict:
    reason = model_result.get("reason_code", "manual_admin_decision")
    if reason not in XANO_CANONICAL_REASON_CODES and reason not in APPROVE_ONLY_REASONS:
        reason = "manual_admin_decision"
    verdict = model_result.get("verdict", "review")
    flags = model_result.get("app_profile_photo_checks", {})
    warnings = checks.get("warnings") or []

    planned_action = "manual_review"
    recommended_decision = None

    if model_result.get("validator") == "fail":
        planned_action = "manual_review"
    elif not checks.get("image_reference_present") or checks.get("exists") is False:
        planned_action = "leave_pending"
        recommended_decision = None
    elif verdict == "approve_recommendation" and reason in APPROVE_ONLY_REASONS and _checks_pass(checks) and _profile_clean(flags):
        planned_action = "report_only"
        recommended_decision = "approve_recommendation"
    elif verdict == "reject_recommendation" and reason in EXPLICIT_REASONS:
        planned_action = "escalate"
        recommended_decision = "reject_recommendation"
    elif verdict == "reject_recommendation":
        planned_action = "manual_review"
        recommended_decision = "reject_recommendation"
    elif verdict == "escalate" or reason in EXPLICIT_REASONS:
        planned_action = "escalate"
    elif verdict == "review" or warnings:
        planned_action = "manual_review"

    return {
        "photo_id": item["photo_id"],
        "queue_source": item.get("queue_source", "local_redacted_fixture"),
        "dry_run": True,
        "force_requested": force,
        "write_enabled": False,
        "model_path": {
            "moderation_api_used": model_result.get("moderation_api_used", False),
            "moderation_model": model_result.get("moderation_model"),
            "vision_model_used": model_result.get("vision_model_used", "mock_fixture"),
            "fallback_model": model_result.get("fallback_model"),
        },
        "deterministic_checks": checks,
        "normalized_result": model_result,
        "planned_action": planned_action,
        "recommended_decision": recommended_decision,
        "would_write_recommendation": False,
        "would_finalize_decision": False,
        "would_escalate": planned_action == "escalate",
    }


def _checks_pass(checks: dict) -> bool:
    if checks.get("exists") is False or not checks.get("supported_reference"):
        return False
    if checks.get("blank_solid_color_score") is not None and checks["blank_solid_color_score"] > 0.98:
        return False
    if checks.get("darkness_score") is not None and checks["darkness_score"] > 0.94:
        return False
    return True


def _profile_clean(flags: dict) -> bool:
    return (
        flags.get("is_profile_style_photo") is True
        and not flags.get("has_contact_info")
        and not flags.get("meme_or_screenshot")
        and not flags.get("is_meme_or_screenshot")
        and not flags.get("is_blank_or_unusable")
        and not flags.get("is_ai_generated")
        and not flags.get("needs_human_review")
    )
