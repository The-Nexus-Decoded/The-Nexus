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
        "description": "Hard porn, explicit adult material, visible sexual acts, genital focus, intercourse, masturbation, or pornographic framing.",
        "prompt_instruction": "Escalate and recommend rejection if explicit pornographic content is present.",
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
        "description": "Real human, profile-style photo, visible subject/face or acceptable portrait framing, no policy issue found.",
        "prompt_instruction": "Approve recommendation only when this is a clean profile photo and every other check passes.",
    },
    {
        "name": "Not a profile photo",
        "reason_code": "inappropriate_photos",
        "description": "Book, object, illustration, artwork, pet-only image, logo, landscape, food, vehicle, room, or unrelated image.",
        "prompt_instruction": "Recommend rejection/review if the image is not a real profile-style photo of a person.",
    },
    {
        "name": "AI-generated or synthetic image",
        "reason_code": "fake_profile or manual_review_needed",
        "description": "AI-generated face, synthetic person, rendered avatar, cartoon/anime style, illustration, drawing, or obviously artificial profile image.",
        "prompt_instruction": "Recommend rejection/review for synthetic identity imagery; use manual review if uncertain.",
    },
    {
        "name": "Contact info or advertisement",
        "reason_code": "off_platform_contact or spam",
        "description": "Phone number, email, social handle, QR code, external username, promo flyer, sales content, watermark/contact bait, or ad-like image.",
        "prompt_instruction": "Recommend rejection/review when contact info or ad content is visible.",
    },
    {
        "name": "Text-only contact/ad image",
        "reason_code": "off_platform_contact or spam",
        "description": "Text-only or mostly-text image containing a handle, phone, email, external link, promo, or contact bait.",
        "prompt_instruction": "Recommend rejection when the image is text/ad content rather than a profile photo.",
    },
    {
        "name": "Low quality or unusable image",
        "reason_code": "inappropriate_photos or manual_review_needed",
        "description": "Blurry, dark, obscured, unreadable, too small, cropped beyond usefulness, subject not visible, or otherwise unusable.",
        "prompt_instruction": "Send to manual review or recommend rejection if the image cannot be evaluated as a profile photo.",
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
        "name": "Underage or minor risk",
        "reason_code": "underage or minor_targeting",
        "description": "Subject appears to be a minor, age is ambiguous with childlike presentation, or content raises minor-safety concerns.",
        "prompt_instruction": "Escalate if the person may be underage or if any minor-safety risk is present.",
    },
    {
        "name": "Fake profile or impersonation",
        "reason_code": "fake_profile",
        "description": "Stock photo, celebrity image, influencer/public-figure image, impersonation signal, stolen-looking professional image, or fake identity cue.",
        "prompt_instruction": "Recommend rejection/review when the image appears fake, stock, celebrity, or impersonating someone.",
    },
    {
        "name": "Spam or bulk-uploaded content",
        "reason_code": "spam",
        "description": "Spam graphic, repeated/template content, sales pitch, bulk promo image, solicitation, or obviously non-personal upload.",
        "prompt_instruction": "Recommend rejection if the image appears to be spam or bulk promotional content.",
    },
    {
        "name": "Bot-style content",
        "reason_code": "bot_behavior",
        "description": "Bot-like promo image, automation artifact, repetitive template, machine-posted style, or suspicious non-human profile content.",
        "prompt_instruction": "Recommend rejection/review if the image suggests bot behavior.",
    },
    {
        "name": "Off-platform contact attempt",
        "reason_code": "off_platform_contact",
        "description": "Attempt to move users to another platform through visible handles, QR codes, phone numbers, emails, links, or contact bait.",
        "prompt_instruction": "Recommend rejection if the image asks or hints for off-platform contact.",
    },
    {
        "name": "Harassment or bullying",
        "reason_code": "harassment",
        "description": "Harassing, bullying, threatening, degrading, or targeted abusive text/image content.",
        "prompt_instruction": "Escalate if harassment, bullying, or threats are present.",
    },
    {
        "name": "Hate speech or hateful symbols",
        "reason_code": "hate_speech",
        "description": "Hate symbols, slurs, extremist imagery, or hateful/dehumanizing content targeting protected groups.",
        "prompt_instruction": "Escalate if hate speech or hateful symbols are present.",
    },
    {
        "name": "Money request or scam signal",
        "reason_code": "money_request",
        "description": "CashApp/Venmo/crypto/payment request, sugar/scam solicitation, money demand, donation ask, or financial bait in the image.",
        "prompt_instruction": "Recommend rejection if payment or money-solicitation content appears.",
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
    "is_meme_or_screenshot": False,
    "is_blank_or_unusable": False,
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
    return (
        "Return only compact JSON for Anewluv profile photo moderation. "
        "Use recommendation language only: approve_recommendation, reject_recommendation, review, or escalate. "
        "Existing admin/photo moderation paths are final authority; this worker only produces normalized recommendations. "
        "Do not make final moderation decisions. Do not generate or edit images. "
        "Only approve clean_profile_style when all other checks pass. Anything uncertain escalates or goes to manual review. "
        "Review the image against these Photo moderation review items:\n"
        f"{review_items_text()}\n"
        "Return JSON with keys: verdict, reason_code, confidence, image_type, description, note, unsafe_categories, app_profile_photo_checks. "
        "app_profile_photo_checks must include is_profile_style_photo, has_contact_info, is_meme_or_screenshot, "
        "is_blank_or_unusable, is_ai_generated, and needs_human_review."
    )
