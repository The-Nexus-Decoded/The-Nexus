from __future__ import annotations

VALID_VERDICTS = {"approve_recommendation", "reject_recommendation", "review", "escalate"}

EXPLICIT_REASONS = {"sexual_content", "nudity", "pornographic_explicit", "inappropriate_photos"}
APPROVE_ONLY_REASONS = {"clean_profile_style"}
MANUAL_REVIEW_REASONS = {
    "ai_generated_image",
    "contact_info_or_ad",
    "contact_info_text_only_ad",
    "low_quality_or_unusable",
    "not_a_profile_photo",
    "manual_review_needed",
    "api_failure_fallback",
    "api_auth_unavailable",
    "missing_image_reference",
    "is_meme_or_screenshot",
    "is_blank_or_unusable",
    "is_ai_generated",
}

XANO_CANONICAL_REASON_CODES = {
    "spam",
    "off_platform_contact",
    "harassment",
    "fake_profile",
    "inappropriate_photos",
    "money_request",
    "hate_speech",
    "bot_behavior",
    "sexual_content",
    "minor_targeting",
    "underage",
    "manual_admin_decision",
}

PHOTO_FINAL_DECISION_REASON_CODES = {"inappropriate_photos", "fake_profile", "underage", "sexual_content"}

REASON_PROMPT_ROWS = (
    ("clean_profile_style", "Real human, profile-style photo, no issues", "Real person, profile photo — approve"),
    ("not_a_profile_photo", "Book, object, illustration, artwork, pet-only, logo, landscape, or unrelated image", "Not a real person/profile photo — reject/review"),
    ("ai_generated_image", "AI-generated, synthetic, illustrated, cartoon, anime, rendered, or avatar-style imagery", "AI/synthetic image — reject/review"),
    ("sexual_content", "Explicit sexual content or sexualized framing", "Sexual content — escalate"),
    ("nudity", "Partial or full nudity", "Nudity — escalate"),
    ("pornographic_explicit", "Hard porn or explicit adult material", "Explicit porn — escalate"),
    ("inappropriate_photos", "Other inappropriate image content that does not fit a narrower reason", "Inappropriate — escalate"),
    ("contact_info_or_ad", "Phone, email, social handle, QR code, or ad/promo content in the image", "Contact info/ad — reject/review"),
    ("contact_info_text_only_ad", "Text-only image with handle, phone, email, promo, or contact bait", "Text/ad — reject"),
    ("low_quality_or_unusable", "Blurry, dark, obscured, unreadable, too small, or no visible subject", "Low quality — review"),
    ("is_meme_or_screenshot", "Screenshot, meme, copied content, app screen, or repost-like image", "Meme/screenshot — review"),
    ("is_blank_or_unusable", "Blank, solid color, corrupted, or otherwise unusable image", "Blank/unusable — reject"),
    ("is_ai_generated", "Flagged as AI/synthetic by image features or metadata-like clues", "AI flagged — review"),
    ("underage", "Signs the person may be a minor or age-risk uncertainty", "Minor — escalate"),
    ("fake_profile", "Stock photo, celebrity, impersonation, or fake identity signal", "Fake profile — reject"),
    ("spam", "Spam, bulk-uploaded, sales, solicitation, or repetitive promo content", "Spam — reject"),
    ("manual_review_needed", "Model uncertainty, ambiguous image, edge case, or conflicting signals", "Uncertain — manual review"),
    ("bot_behavior", "Bot-style uploaded content, templated promo image, or automation artifact", "Bot behavior — reject"),
    ("off_platform_contact", "Off-platform contact attempt or contact bait", "Contact bait — reject"),
    ("harassment", "Harassment, bullying, threatening, or abusive content", "Harassment — escalate"),
    ("hate_speech", "Hate symbols, slurs, or hateful content", "Hate speech — escalate"),
    ("money_request", "Payment request, crypto/CashApp, scam, sugar/money solicitation", "Money request — reject"),
    ("minor_targeting", "Minor-targeting or minor-safety risk beyond age uncertainty", "Minor safety risk — escalate"),
    ("manual_admin_decision", "Existing admin-only final decision reason; the worker must not assign this as its own final action", "Admin-only final decision — do not write"),
)

DEFAULT_PROFILE_CHECKS = {
    "is_profile_style_photo": False,
    "has_contact_info": False,
    "is_meme_or_screenshot": False,
    "is_blank_or_unusable": False,
    "is_ai_generated": False,
    "needs_human_review": True,
}


def provider_instructions() -> str:
    checklist = "\n".join(
        f"- {reason_code}: {what_we_check}. Prompt meaning: {prompt_description}."
        for reason_code, what_we_check, prompt_description in REASON_PROMPT_ROWS
    )
    return (
        "Return only compact JSON for Anewluv profile photo moderation. "
        "Use recommendation language only: approve_recommendation, reject_recommendation, review, or escalate. "
        "Existing admin/photo moderation paths are final authority; this worker only produces normalized recommendations. "
        "Do not make final moderation decisions. Do not generate or edit images. "
        "Only approve clean_profile_style when all other checks pass. Anything uncertain escalates or goes to manual review. "
        "Review the image against this checklist:\n"
        f"{checklist}\n"
        "Return JSON with keys: verdict, reason_code, confidence, image_type, description, note, unsafe_categories, app_profile_photo_checks. "
        "app_profile_photo_checks must include is_profile_style_photo, has_contact_info, is_meme_or_screenshot, "
        "is_blank_or_unusable, is_ai_generated, and needs_human_review."
    )
