from __future__ import annotations

VALID_VERDICTS = {"approve_recommendation", "reject_recommendation", "review", "escalate"}

EXPLICIT_REASONS = {"sexual_content", "nudity", "pornographic_explicit", "inappropriate_photos"}
APPROVE_ONLY_REASONS = {"clean_profile_style"}
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
    "ai_generated_image": "fake_profile",
    "ai_generated_or_avatar": "fake_profile",
    "not_a_profile_photo": "fake_profile",
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
}

REVIEW_ITEMS = (
    {
        "name": "Sexual content",
        "reason_code": "sexual_content",
        "description": "Sexually suggestive pose, lingerie/underwear focus, explicit sexual framing, fetish/sexualized presentation.",
        "prompt_instruction": "Reject/escalate if the image appears sexually explicit or primarily sexual.",
    },
    {
        "name": "Nudity",
        "reason_code": "sexual_content or inappropriate_photos",
        "description": "Exposed genitals, breasts/nipples, buttocks, transparent clothing, or implied nudity.",
        "prompt_instruction": "Reject/escalate if nudity or likely nudity is present.",
    },
    {
        "name": "Pornographic explicit content",
        "reason_code": "sexual_content",
        "description": "Sex acts, explicit adult content, pornography, masturbation, or graphic sexual imagery.",
        "prompt_instruction": "Reject/escalate immediately.",
    },
    {
        "name": "Other inappropriate photo content",
        "reason_code": "inappropriate_photos",
        "description": "Image content that is inappropriate for a dating profile but does not fit a narrower reason.",
        "prompt_instruction": "Reject/escalate when the image is inappropriate and no narrower reason applies.",
    },
    {
        "name": "Clean profile-style photo",
        "reason_code": "clean_profile_style",
        "description": "Real person, non-explicit, usable, no contact info, no spam, no obvious AI/fake indicators.",
        "prompt_instruction": "Approve recommendation only; human/admin remains final.",
    },
    {
        "name": "Not a real profile photo",
        "reason_code": "fake_profile or inappropriate_photos",
        "description": "Meme, screenshot, celebrity/photo of someone else, object-only image, landscape, cartoon, group image with unclear owner.",
        "prompt_instruction": "Manual review or reject recommendation depending severity.",
    },
    {
        "name": "Fake / AI-generated image",
        "reason_code": "fake_profile",
        "description": "Synthetic face/body, obvious AI artifacting, unrealistic skin/eyes/hands, heavily generated avatar.",
        "prompt_instruction": "Manual review unless policy says reject.",
    },
    {
        "name": "Contact info / off-platform solicitation",
        "reason_code": "off_platform_contact",
        "description": "Phone number, email, Snapchat/Instagram/Telegram/WhatsApp handle, QR code, URL, “text me,” “add me.”",
        "prompt_instruction": "Reject/escalate if visible.",
    },
    {
        "name": "Text-only contact/ad image",
        "reason_code": "off_platform_contact or spam",
        "description": "Text-only or mostly-text image containing a handle, phone, email, external link, promo, or contact bait.",
        "prompt_instruction": "Recommend rejection when the image is text/ad content rather than a profile photo.",
    },
    {
        "name": "Low-quality or unusable",
        "reason_code": "inappropriate_photos",
        "description": "Blank image, solid color, too dark, too blurry, corrupted, no visible person.",
        "prompt_instruction": "Manual review/reject recommendation.",
    },
    {
        "name": "Meme, screenshot, or copied content",
        "reason_code": "inappropriate_photos or manual_review_needed",
        "description": "Screenshot, meme, app screen, copied/reposted content, quote card, reaction image, or non-original social-media-style image.",
        "prompt_instruction": "Recommend review/rejection if it appears to be a meme, screenshot, or copied content instead of a profile photo.",
    },
    {
        "name": "Blank or unusable image",
        "reason_code": "inappropriate_photos",
        "description": "Blank image, solid color, corrupted image, empty frame, no discernible subject, or non-viewable upload.",
        "prompt_instruction": "Recommend rejection if the image is blank or unusable.",
    },
    {
        "name": "Underage / minor concern",
        "reason_code": "underage or minor_targeting",
        "description": "Person appears under 18, school-age child/teen, or age is ambiguous in a sexual/flirt/dating context.",
        "prompt_instruction": "Never approve; escalate for human review.",
    },
    {
        "name": "Fake profile or impersonation",
        "reason_code": "fake_profile",
        "description": "Stock photo, celebrity image, influencer/public-figure image, impersonation signal, stolen-looking professional image, or fake identity cue.",
        "prompt_instruction": "Recommend rejection/review when the image appears fake, stock, celebrity, or impersonating someone.",
    },
    {
        "name": "Advertisement / spam",
        "reason_code": "spam",
        "description": "Flyer, business promo, paid service ad, crypto/financial pitch, repeated text overlay, marketing graphic.",
        "prompt_instruction": "Reject/escalate if the image is promotional/spam.",
    },
    {
        "name": "Bot/scam signal",
        "reason_code": "bot_behavior or fake_profile",
        "description": "Scammy text, fake verification graphic, reused model/stock-photo style, suspicious overlay.",
        "prompt_instruction": "Manual review or reject recommendation.",
    },
    {
        "name": "Off-platform contact attempt",
        "reason_code": "off_platform_contact",
        "description": "Attempt to move users to another platform through visible handles, QR codes, phone numbers, emails, links, or contact bait.",
        "prompt_instruction": "Recommend rejection if the image asks or hints for off-platform contact.",
    },
    {
        "name": "Hate / harassment / threats",
        "reason_code": "hate_speech or harassment",
        "description": "Hate symbols, slurs, violent threats, targeted harassment.",
        "prompt_instruction": "Reject/escalate.",
    },
    {
        "name": "Hate speech or hateful symbols",
        "reason_code": "hate_speech",
        "description": "Additional hate-symbol or hateful/dehumanizing content signal if not captured by the combined hate/harassment/threats item.",
        "prompt_instruction": "Reject/escalate if hateful content is present.",
    },
    {
        "name": "Money request / transactional dating signal",
        "reason_code": "money_request",
        "description": "CashApp/Venmo/PayPal handle, “send money,” “sugar,” explicit paid companionship solicitation.",
        "prompt_instruction": "Reject/escalate.",
    },
    {
        "name": "Manual review uncertainty",
        "reason_code": "manual_review_needed",
        "description": "Model uncertainty, ambiguous image, conflicting signals, borderline content, partial evidence, or any case not clearly covered.",
        "prompt_instruction": "Choose review/manual_review_needed when uncertain; do not approve uncertain images.",
    },
    {
        "name": "Missing image reference",
        "reason_code": "missing_image_reference",
        "description": "Queue item lacks a usable image URL/path/reference for analysis.",
        "prompt_instruction": "Return review/manual_review_needed because the image cannot be evaluated.",
    },
    {
        "name": "Provider auth unavailable",
        "reason_code": "api_auth_unavailable",
        "description": "The image-analysis provider cannot run because auth/env is missing.",
        "prompt_instruction": "Return review/manual_review_needed; do not fabricate an image decision.",
    },
    {
        "name": "Provider/API failure fallback",
        "reason_code": "api_failure_fallback",
        "description": "The provider failed, returned unusable output, timed out, or could not parse a valid response.",
        "prompt_instruction": "Return review/manual_review_needed; do not approve or reject from failed provider output.",
    },
    {
        "name": "Admin-only final decision",
        "reason_code": "manual_admin_decision",
        "description": "Existing admin-only final decision reason; this worker must not assign final approval/rejection authority to itself.",
        "prompt_instruction": "Do not write this as a worker decision. Existing admin tools remain final.",
    },
)

REASON_PROMPT_ROWS = tuple(
    (item["reason_code"], item["description"], item["prompt_instruction"]) for item in REVIEW_ITEMS
)

DEFAULT_PROFILE_CHECKS = {
    "is_profile_style_photo": False,
    "has_contact_info": False,
    "meme_or_screenshot": False,
    "blank_or_unusable": False,
    "is_ai_generated": False,
    "needs_human_review": True,
}


def review_items_text() -> str:
    blocks = []
    for index, item in enumerate(REVIEW_ITEMS, start=1):
        blocks.append(
            f"{index}. {item['name']}\n"
            f"Description: {item['description']}\n"
            f"Prompt instruction: {item['prompt_instruction']}\n"
            f"Reason code: {item['reason_code']}"
        )
    return "\n\n".join(blocks)


def provider_instructions() -> str:
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
- underage: any signs of minors (young-looking, school photos, minors present)
- money_request: CashApp/Venmo/PayPal, “send money,” “sugar,” paid companionship solicitation
- hate_speech: hate symbols, slurs, extremist or hateful content
- spam: bulk-uploaded, repetitive, obvious spam
- bot_behavior: auto-uploaded style, template-looking images
- off_platform_contact: "DM me on X/insta/snap" or similar contact bait
- harassment: bullying, threatening, or targeting content
- underage_concern: appears under 18 or age-ambiguous in dating context; never approve — escalate/review
- group_photo: multiple people, primary user unclear; review
- unclear_subject: face/person not clearly identifiable; review
- celebrity_or_stock_photo: celebrity, stock/model image, stolen-looking; fake profile — review/reject
- object_or_landscape_only: no person visible; not profile photo — review/reject
- qr_code: QR code visible; off-platform/spam — reject/review
- money_request: CashApp/Venmo/PayPal/sugar/payment solicitation; money request — reject/escalate
- hate_or_harassment: slurs, hate symbols, threats, harassment; reject/escalate
- bot_or_scam: scam graphics, fake verification, suspicious template; review/reject

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
- underage_concern -> underage or minor_targeting
- manual_review_needed -> manual_admin_decision
- api_failure_fallback -> manual_admin_decision
- missing_image_reference -> manual_admin_decision
- api_auth_unavailable -> manual_admin_decision

APPROVE ONLY:
- clean_profile_style: real human face, profile-style selfie/photo, no issues

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
"""
