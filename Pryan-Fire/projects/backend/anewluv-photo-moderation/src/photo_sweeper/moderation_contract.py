from __future__ import annotations

EXPLICIT_REASONS = {"sexual_content", "nudity", "pornographic_explicit", "inappropriate_photos"}
APPROVE_ONLY_REASONS = {"clean_profile_style"}
BUSINESS_REJECT_REASONS = {"not_person_photo", "policy_violation", "too_blurry_or_blank", "explicit_content", "unsafe_content"}
HARD_SAFETY_HUMAN_ONLY_REASONS = {
    "sexual_content",
    "explicit_content",
    "unsafe_content",
    "underage",
    "minor_targeting",
    "hate_speech",
    "harassment",
}
MANUAL_REVIEW_REASONS = {
    "ai_generated_or_synthetic",
    "contact_info_or_ad",
    "contact_info_text_only_ad",
    "low_quality_or_unusable",
    "not_a_profile_photo",
    "manual_review_needed",
    "api_failure_fallback",
    "api_auth_unavailable",
    "missing_image_reference",
    "meme_or_screenshot",
    "blank_or_unusable",
    "ai_generated_or_synthetic",
}

PHOTO_FINAL_DECISION_REASON_CODES = {"inappropriate_photos", "fake_profile", "underage", "sexual_content"}


WORKER_MODEL_CATEGORIES = {
    "clean_profile_style",
    "ai_generated_or_synthetic",
    "sexual_content",
    "nudity",
    "pornographic_explicit",
    "inappropriate_photos",
    "contact_info_or_ad",
    "contact_info_text_only_ad",
    "low_quality_or_unusable",
    "not_a_profile_photo",
    "manual_review_needed",
    "api_failure_fallback",
    "missing_image_reference",
    "api_auth_unavailable",
}

IMAGE_TYPE_CLASSIFICATIONS = {
    "real_person_profile_photo",
    "selfie",
    "group_photo",
    "unclear_subject",
    "meme_or_screenshot",
    "text_only_image",
    "advertisement_or_flyer",
    "contact_card_or_social_handle",
    "qr_code",
    "object_or_landscape_only",
    "celebrity_or_stock_photo",
    "ai_generated_or_synthetic",
    "explicit_adult_image",
    "low_quality_or_unusable",
    "underage_concern",
    "money_request",
    "hate_or_harassment",
    "bot_or_scam",
}

CANONICAL_REASON_MAP = {
    "clean_profile_style": "clean_profile_style",
    "sexual_content": "sexual_content",
    "nudity": "sexual_content",
    "pornographic_explicit": "sexual_content",
    "inappropriate_photos": "inappropriate_photos",
    "ai_generated_or_synthetic": "fake_profile",
    "not_a_profile_photo": "not_person_photo",
    "celebrity_or_stock_photo": "fake_profile",
    "object_or_landscape_only": "fake_profile",
    "fake_profile": "fake_profile",
    "contact_info_or_ad": "off_platform_contact",
    "contact_info_text_only_ad": "off_platform_contact",
    "qr_code": "off_platform_contact",
    "off_platform_contact": "off_platform_contact",
    "advertisement_or_flyer": "spam",
    "spam": "spam",
    "money_request": "money_request",
    "hate_or_harassment": "harassment",
    "hate_speech": "hate_speech",
    "harassment": "harassment",
    "bot_or_scam": "bot_behavior",
    "bot_behavior": "bot_behavior",
    "underage_concern": "underage",
    "underage": "underage",
    "minor_targeting": "minor_targeting",
    "low_quality_or_unusable": "inappropriate_photos",
    "meme_or_screenshot": "inappropriate_photos",
    "is_meme_or_screenshot": "inappropriate_photos",
    "blank_or_unusable": "inappropriate_photos",
    "is_blank_or_unusable": "inappropriate_photos",
    "manual_review_needed": "manual_admin_decision",
    "api_failure_fallback": "manual_admin_decision",
    "api_auth_unavailable": "manual_admin_decision",
    "missing_image_reference": "manual_admin_decision",
    "manual_admin_decision": "manual_admin_decision",
    "uncertain": "manual_admin_decision",
    "ok": "clean_profile_style",
    "not_person_photo": "not_person_photo",
    "policy_violation": "inappropriate_photos",
    "explicit_content": "explicit_content",
    "unsafe_content": "unsafe_content",
    "too_blurry_or_blank": "too_blurry_or_blank",
}

DEFAULT_REVIEW_PROMPT_TEXT = "No DB review_items rows were returned for this run. Fail closed to review/escalation instead of inventing local policy vocabulary."


DEFAULT_PROFILE_CHECKS = {
    "is_profile_style_photo": False,
    "has_contact_info": False,
    "meme_or_screenshot": False,
    "blank_or_unusable": False,
    "ai_generated_or_synthetic": False,
    "needs_human_review": True,
}


def provider_instructions(review_items_text_override: str | None = None) -> str:
    review_text = review_items_text_override or DEFAULT_REVIEW_PROMPT_TEXT
    return """You are an ANewLuv photo moderator. Classify profile photo candidates.

Return ONLY JSON with this exact shape:
{
  "detected_category": "specific visual category",
  "canonical_reason_code": "existing Xano-compatible reason",
  "verdict": "approve_recommendation | reject_recommendation | review | escalate",
  "confidence": 0.0-1.0,
  "note": "brief reason"
}

Identify which type of image this is:
- real_person_profile_photo
- selfie
- group_photo
- unclear_subject
- meme_or_screenshot
- text_only_image
- advertisement_or_flyer
- contact_card_or_social_handle
- qr_code
- object_or_landscape_only
- celebrity_or_stock_photo
- ai_generated_or_synthetic
- explicit_adult_image
- low_quality_or_unusable
- underage_concern
- money_request
- hate_or_harassment
- bot_or_scam

Image type mapping:
- real_person_profile_photo/selfie -> possible approve_recommendation if all safety checks pass
- group_photo/unclear_subject -> review
- meme_or_screenshot/text_only/ad/contact/qr -> reject_recommendation or review
- object_or_landscape_only -> reject_recommendation/review
- celebrity_or_stock_photo -> fake_profile/review
- ai_generated_or_synthetic -> fake_profile if high confidence, otherwise review/manual_admin_decision
- explicit_adult_image -> reject/escalate
- low_quality_or_unusable -> review/reject
- underage_concern -> never approve; escalate/review
- money_request -> reject/escalate
- hate_or_harassment -> reject/escalate
- bot_or_scam -> review/reject

Prompt instruction: First classify the image type. Then evaluate safety/policy checks. If the image is not clearly a usable profile photo of a real person, do not approve it.

Final output layers:
- detected_category = detailed AI/image classification
- canonical_reason_code = canonical Xano-compatible moderation reason

Detailed flags to inspect:
- sexual_content: porn, sexual acts, genital content
- nudity: partial or full nudity
- pornographic_explicit: hard porn, explicit sexual material
- inappropriate_photos: other inappropriate content
- ai_generated_or_synthetic: AI-generated, synthetic, or digitally created people
- contact_info_or_ad: phone/email/social handles, promotional content
- contact_info_text_only_ad: text-only image with handles, numbers, or ads
- not_a_profile_photo: book, object, illustration, artwork, animal, scenery
- low_quality_or_unusable: blurry, dark, obscured, grainy, unwatchable
- meme_or_screenshot: memes, screenshots, copied/pasted images
- blank_or_unusable: solid color, blank, fully black/white images
- fake_profile: stock photos, celebrity images, catfishing
- underage: use when the image subject appears under 18
- minor_targeting: use when content appears to target minors or sexualizes youth context
- money_request: CashApp/Venmo/PayPal/sugar/payment solicitation; money/payment solicitation — reject/escalate
- hate_speech: hate symbols, slurs, protected-class attacks; hate speech — escalate
- spam: bulk-uploaded, repetitive, obvious spam
- bot_behavior: auto-uploaded style, template-looking images
- off_platform_contact: "DM me on X/insta/snap" or similar contact bait
- harassment: bullying, threatening, or targeting content
- underage_concern: appears under 18 or age-ambiguous in dating context; map to underage when the subject appears under 18, or minor_targeting when content targets minors/sexualizes youth context; never approve — escalate/review
- group_photo: multiple people, primary user unclear; review
- unclear_subject: face/person not clearly identifiable; review
- celebrity_or_stock_photo: celebrity, stock/model image, stolen-looking; fake profile — review/reject
- object_or_landscape_only: no person visible; not profile photo — review/reject
- qr_code: QR code visible; off-platform/spam — reject/review
- money_request: CashApp/Venmo/PayPal/sugar/payment solicitation; money/payment solicitation — reject/escalate
- hate_or_harassment: slurs, hate symbols, protected-class attacks, threats, harassment; use hate_speech for hate symbols/slurs/protected-class attacks and harassment for threats/targeting; reject/escalate
- bot_or_scam: scam graphics, fake verification, suspicious template; review/reject

DB-provided review checks for this run:
__DB_REVIEW_CHECKS_TEXT__

CANONICAL canonical_reason_code output only:
- clean_profile_style -> no rejection code / approve_recommendation
- sexual_content -> sexual_content
- nudity -> sexual_content
- pornographic_explicit -> sexual_content
- inappropriate_photos -> inappropriate_photos
- low_quality_or_unusable -> inappropriate_photos
- ai_generated_or_synthetic -> fake_profile only if high confidence; otherwise manual_admin_decision/review
- not_a_profile_photo -> subtype required: meme_or_screenshot/text/ad/contact -> spam/off_platform_contact/inappropriate_photos; object/landscape/group unclear -> inappropriate_photos or review; celebrity/stock/stolen-looking -> fake_profile
- celebrity_or_stock_photo -> fake_profile
- object_or_landscape_only -> fake_profile
- contact_info_or_ad -> off_platform_contact or spam
- contact_info_text_only_ad -> off_platform_contact or spam
- qr_code -> off_platform_contact or spam
- advertisement_or_flyer -> spam
- money_request -> money_request
- hate_or_harassment -> hate_speech or harassment
- bot_or_scam -> bot_behavior
- underage_concern -> underage when the image subject appears under 18; minor_targeting when content targets minors or sexualizes youth context
- manual_review_needed -> manual_admin_decision
- api_failure_fallback -> manual_admin_decision
- missing_image_reference -> manual_admin_decision
- api_auth_unavailable -> manual_admin_decision

APPROVE ONLY:
- clean_profile_style: real human face, profile-style selfie/photo, no issues

CORE APPROVAL RULE:
- Only approve clean_profile_style when all other checks pass.
- If uncertain, choose review/escalate. Never approve uncertainty.

RULES:
- Final canonical_reason_code must be one canonical Xano-compatible code from the CANONICAL list above; never emit only worker-local detected_category codes
- If unsure, return "review" or "escalate" with canonical_reason_code "manual_admin_decision" — never approve uncertain
- Reject AI-generated people with canonical_reason_code "fake_profile"
- Reject books/objects/artwork with canonical_reason_code "fake_profile"
- Reject images with contact info with canonical_reason_code "off_platform_contact" unless it is clearly spam/ad-only, then use "spam"
- Escalate sexual content, nudity, porn, and underage immediately
- Confidence below 0.6 should be "review" or "escalate" with canonical_reason_code "manual_admin_decision"
- Existing admin/photo moderation paths are final authority; this worker only produces normalized recommendations
- Do not make final moderation decisions. Do not generate or edit images.
""".replace("__DB_REVIEW_CHECKS_TEXT__", review_text)
