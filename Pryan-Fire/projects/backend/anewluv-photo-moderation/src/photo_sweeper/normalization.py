from __future__ import annotations

import re
from typing import Any

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

DERIVED_CONFIDENCE_BY_REASON = {
    "clean_profile_style": 0.88,
    "sexual_content": 0.93,
    "underage": 0.94,
    "minor_targeting": 0.92,
    "hate_speech": 0.90,
    "harassment": 0.88,
    "money_request": 0.86,
    "off_platform_contact": 0.84,
    "spam": 0.82,
    "bot_behavior": 0.82,
    "ai_generated": 0.86,
    "fake_profile": 0.84,
    "not_person_photo": 0.84,
    "inappropriate_photos": 0.78,
    "too_blurry_or_blank": 0.74,
}

REASON_TEXT_FIELDS = ("reason_code", "canonical_reason_code", "reason", "detected_category", "note")
LEVENSHTEIN_SIMILARITY_THRESHOLD = 0.82
LEVENSHTEIN_MAX_DISTANCE = 2
SUBSTRING_MIN_TOKEN_LEN = 4
FUZZY_MATCH_MIN_SCORE = 0.45

REASON_VOCAB_ALIAS_FIELDS = (
    "alias",
    "aliases",
    "synonym",
    "synonyms",
    "keyword",
    "keywords",
    "match_term",
    "match_terms",
    "prompt_hint",
    "prompt_instruction",
    "description",
    "label",
    "name",
)

REASON_VOCAB_WEIGHT_FIELDS = (
    "keyword_weight",
    "match_weight",
    "confidence_weight",
    "weight",
)

def normalize_model_result(
    result: dict,
    *,
    default_model: str,
    allowed_reason_codes: set[str] | None = None,
    reason_vocabulary: tuple[dict[str, Any], ...] | list[dict[str, Any]] | None = None,
) -> dict:
    normalized = dict(result)
    allowed_reason_codes = {str(code).strip() for code in (allowed_reason_codes or set()) if str(code).strip()}
    if allowed_reason_codes:
        normalized["allowed_reason_codes"] = sorted(allowed_reason_codes)
    if "verdict" not in normalized and "recommendation" in normalized:
        normalized["verdict"] = normalized.get("recommendation")

    # Capture original provider reason BEFORE any normalization — used for audit trail only
    original_provider_reason = str(normalized.get("reason_code") or normalized.get("canonical_reason_code") or normalized.get("reason") or "").strip()

    resolved_raw_reason, reason_resolution = _resolve_reason_hint(
        normalized,
        allowed_reason_codes,
        reason_vocabulary=reason_vocabulary,
    )
    if resolved_raw_reason:
        normalized["reason_code"] = resolved_raw_reason
    normalized["match_source"] = reason_resolution.get("mode")
    normalized["match_evidence"] = reason_resolution

    confidence_value, confidence_source, confidence_evidence = _resolve_confidence(
        normalized.get("confidence"),
        reason_hint=resolved_raw_reason,
        verdict_hint=str(normalized.get("verdict") or normalized.get("recommendation") or normalized.get("decision") or "review").lower(),
        reason_resolution=reason_resolution,
    )
    normalized["confidence"] = confidence_value
    normalized["confidence_source"] = confidence_source
    normalized["confidence_evidence"] = confidence_evidence

    original_reason_hint = str(normalized.get("reason_code", "manual_review_needed")).lower()
    if "verdict" not in normalized and "decision" in normalized:
        normalized["verdict"] = DECISION_TO_RECOMMENDATION_VERDICTS.get(str(normalized.get("decision")).lower(), normalized.get("decision"))

    normalized = _apply_person_photo_business_gate(normalized)

    raw_verdict = str(normalized.get("verdict", "review")).lower()
    normalized["verdict"] = FINAL_TO_RECOMMENDATION_VERDICTS.get(raw_verdict, raw_verdict)
    normalized["normalization_applied"] = "yes" if normalized["verdict"] != raw_verdict else "no"

    raw_reason_code = str(normalized.get("reason_code", "manual_review_needed")).lower()
    if raw_reason_code == "ai_generated_or_synthetic" and float(normalized.get("confidence") or 0.0) < AI_GENERATED_HIGH_CONFIDENCE_THRESHOLD:
        normalized["reason_code"] = "manual_admin_decision"
        normalized["verdict"] = "review"
    else:
        mapped_reason = CANONICAL_REASON_MAP.get(raw_reason_code)
        if mapped_reason is None and raw_reason_code in allowed_reason_codes:
            mapped_reason = raw_reason_code
        normalized["reason_code"] = mapped_reason or "manual_admin_decision"
    # Always capture original provider reason as audit trail, for cases where canonical map changed reason_code
    if normalized["reason_code"] != raw_reason_code:
        normalized.setdefault("raw_reason_code", original_provider_reason)
    else:
        normalized.setdefault("raw_reason_code", original_provider_reason)

    raw_reason_hint = str(normalized.get("raw_reason_code") or raw_reason_code).lower()
    if normalized.get("reason_code") in {"underage", "minor_targeting"} or raw_reason_hint in {"underage_concern", "underage", "minor_targeting"}:
        checks = dict(normalized.get("app_profile_photo_checks") or default_profile_checks(needs_human_review=True))
        checks["needs_human_review"] = True
        normalized["app_profile_photo_checks"] = checks
        normalized["verdict"] = "escalate"
        normalized["needs_human_admin"] = True
        normalized["fail_closed_route"] = "needs_human_admin"
        if normalized.get("reason_code") not in {"underage", "minor_targeting"}:
            normalized["reason_code"] = "underage" if "underage" in raw_reason_hint else "minor_targeting"

    if confidence_source == "derived_ambiguous_fail_closed" and normalized.get("verdict") in {"approve_recommendation", "reject_recommendation", "review", "escalate"}:
        checks = dict(normalized.get("app_profile_photo_checks") or default_profile_checks(needs_human_review=True))
        checks["needs_human_review"] = True
        normalized["app_profile_photo_checks"] = checks
        normalized["verdict"] = "escalate"
        normalized["reason_code"] = "manual_admin_decision"
        normalized.setdefault("raw_reason_code", raw_reason_code or "manual_review_needed")
        normalized["stale_assessment"] = True
        normalized["needs_human_admin"] = True
        normalized["fail_closed_route"] = "needs_human_admin"
        normalized["note"] = _append_note(
            normalized.get("note"),
            "Confidence was missing/invalid and deterministic parser remained ambiguous; fail-closed to human-admin escalation.",
        )

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
        normalized["raw_reason_code"] = original_reason_hint
        normalized["note"] = "Model output failed strict validation; manual review required."
        normalized["validator"] = "fail"
    return normalized


def _resolve_reason_hint(
    normalized: dict,
    allowed_reason_codes: set[str],
    *,
    reason_vocabulary: tuple[dict[str, Any], ...] | list[dict[str, Any]] | None,
) -> tuple[str, dict]:
    canonical_values = set(CANONICAL_REASON_MAP.values())
    reason_alias_map, db_vocab_present = _build_reason_alias_map(allowed_reason_codes, reason_vocabulary)
    candidate_tokens: list[tuple[str, str]] = []
    for field in ("reason_code", "canonical_reason_code", "reason", "detected_category"):
        normalized_token = _normalize_reason_token(normalized.get(field))
        if not normalized_token:
            continue
        candidate_tokens.append((field, normalized_token))
        # Provider's own canonical code should pass through unchanged
        if normalized_token in CANONICAL_REASON_MAP:
            return normalized_token, {
                "mode": "exact_normalized",
                "field": field,
                "token": normalized_token,
                "score": 1.0,
                "keyword_weight": 1.0,
                "db_vocab_present": db_vocab_present,
            }
        if normalized_token in reason_alias_map:
            alias = reason_alias_map[normalized_token]
            return alias["code"], {
                "mode": "db_exact_normalized",
                "field": field,
                "token": alias["code"],
                "matched_alias": normalized_token,
                "score": min(1.0, float(alias["weight"])),
                "keyword_weight": alias["weight"],
                "vocab_source": alias["source"],
                "db_vocab_present": db_vocab_present,
            }
        if normalized_token in allowed_reason_codes:
            return normalized_token, {
                "mode": "allowed_reason_exact",
                "field": field,
                "token": normalized_token,
                "score": 1.0,
                "keyword_weight": 1.0,
                "db_vocab_present": db_vocab_present,
            }
        if normalized_token in canonical_values:
            return normalized_token, {
                "mode": "exact_normalized",
                "field": field,
                "token": normalized_token,
                "score": 1.0,
                "keyword_weight": 1.0,
                "db_vocab_present": db_vocab_present,
            }

    reason_vocab = set(reason_alias_map.keys())
    substring_match = _best_substring_reason_match(candidate_tokens, reason_vocab)
    if substring_match is not None:
        alias = reason_alias_map[substring_match[0]]
        weighted_score = min(1.0, substring_match[3] * float(alias["weight"]))
        return alias["code"], {
            "mode": "db_normalized_substring",
            "field": substring_match[1],
            "token": alias["code"],
            "matched_alias": substring_match[0],
            "matched_fragment": substring_match[2],
            "score": weighted_score,
            "raw_score": substring_match[3],
            "keyword_weight": alias["weight"],
            "vocab_source": alias["source"],
            "db_vocab_present": db_vocab_present,
        }

    combined_text = " ".join(str(normalized.get(field, "")) for field in REASON_TEXT_FIELDS if normalized.get(field) is not None).lower()
    fuzzy_vocab_match = _best_allowed_reason_match(combined_text, reason_alias_map)
    if fuzzy_vocab_match is not None:
        alias = reason_alias_map[fuzzy_vocab_match[0]]
        # Only accept fuzzy match if the matched code is meaningfully related
        # (i.e., the provider's own reason code is unknown to the DB)
        # If the provider's own reason code is NOT in allowed_reason_codes,
        # never map it to a different code via fuzzy matching.
        # Preserve the provider's raw reason and fail-closed.
        explicit_provider_code = _normalize_reason_token(normalized.get("reason_code") or normalized.get("canonical_reason_code"))
        if explicit_provider_code and explicit_provider_code not in allowed_reason_codes:
            # Provider emitted an explicit reason_code unknown to DB; do not remap it
            # to a fuzzy-matched different code. Preserve provider reason and fail closed.
            fuzzy_vocab_match = None

    if fuzzy_vocab_match is not None:
        alias = reason_alias_map[fuzzy_vocab_match[0]]
        return alias["code"], {
            "mode": "db_fuzzy_token",
            "field": "text",
            "token": alias["code"],
            "matched_alias": fuzzy_vocab_match[0],
            "score": fuzzy_vocab_match[1],
            "raw_score": fuzzy_vocab_match[4],
            "keyword_weight": fuzzy_vocab_match[5],
            "matched_tokens": fuzzy_vocab_match[2],
            "token_matches": fuzzy_vocab_match[3],
            "vocab_source": alias["source"],
            "db_vocab_present": db_vocab_present,
        }

    fallback_token = _normalize_reason_token(normalized.get("reason_code") or normalized.get("canonical_reason_code") or normalized.get("reason"))
    if fallback_token:
        return fallback_token, {
            "mode": "fallback_token",
            "field": "reason_code",
            "token": fallback_token,
            "db_vocab_present": db_vocab_present,
            "fail_closed_reason": "db_vocab_unusable" if not db_vocab_present else "no_reason_match",
        }

    return "manual_review_needed", {
        "mode": "unresolved",
        "field": "none",
        "token": "manual_review_needed",
        "db_vocab_present": db_vocab_present,
        "fail_closed_reason": "db_vocab_unusable" if not db_vocab_present else "no_reason_match",
    }


def _build_reason_alias_map(
    allowed_reason_codes: set[str],
    reason_vocabulary: tuple[dict[str, Any], ...] | list[dict[str, Any]] | None,
) -> tuple[dict[str, dict[str, Any]], bool]:
    alias_map: dict[str, dict[str, Any]] = {}

    for raw_code in sorted(allowed_reason_codes):
        code = _normalize_reason_token(raw_code)
        if not code:
            continue
        _upsert_reason_alias(alias_map, code, code, 1.0, "reason_codes.code")

    for row in tuple(reason_vocabulary or ()):
        if not isinstance(row, dict):
            continue
        code = _normalize_reason_token(row.get("code") or row.get("reason_code") or row.get("canonical_reason_code"))
        if not code:
            continue
        weight = _reason_keyword_weight(row)
        _upsert_reason_alias(alias_map, code, code, weight, "reason_vocabulary.code")
        for field in REASON_VOCAB_ALIAS_FIELDS:
            for raw_alias in _iter_alias_candidates(row.get(field)):
                alias = _normalize_reason_token(raw_alias)
                if not alias:
                    continue
                _upsert_reason_alias(alias_map, alias, code, weight, f"reason_vocabulary.{field}")

    return alias_map, bool(alias_map)


def _upsert_reason_alias(
    alias_map: dict[str, dict[str, Any]],
    alias: str,
    code: str,
    weight: float,
    source: str,
) -> None:
    current = alias_map.get(alias)
    if current is None:
        alias_map[alias] = {
            "code": code,
            "weight": float(weight),
            "source": source,
        }
        return
    existing_weight = float(current.get("weight", 0.0))
    # Only replace if new weight is strictly greater
    # and don't replace a canonical code entry with an alias entry of equal weight
    if float(weight) > existing_weight:
        alias_map[alias] = {
            "code": code,
            "weight": float(weight),
            "source": source,
        }


def _reason_keyword_weight(row: dict[str, Any]) -> float:
    for field in REASON_VOCAB_WEIGHT_FIELDS:
        value = row.get(field)
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            continue
        if parsed > 0.0:
            return min(1.5, max(0.2, parsed))
    return 1.0


def _iter_alias_candidates(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        parts = [text]
        parts.extend(piece.strip() for piece in re.split(r"[\n,;|]+", text) if piece.strip())
        seen: set[str] = set()
        deduped: list[str] = []
        for part in parts:
            key = part.lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(part)
        return deduped
    if isinstance(value, (list, tuple, set)):
        flattened: list[str] = []
        for child in value:
            flattened.extend(_iter_alias_candidates(child))
        return flattened
    return [str(value)]


def _resolve_confidence(
    confidence_value: object,
    *,
    reason_hint: str,
    verdict_hint: str,
    reason_resolution: dict,
) -> tuple[float, str, dict]:
    provider_conf = _normalize_confidence(confidence_value)
    if provider_conf is not None:
        return provider_conf, "provider", {
            "mode": "provider",
            "reason_hint": reason_hint,
            "reason_resolution": reason_resolution,
            "semantic_layer": "skipped_non_deterministic",
        }

    canonical_reason = CANONICAL_REASON_MAP.get(reason_hint, reason_hint)
    derived = DERIVED_CONFIDENCE_BY_REASON.get(canonical_reason)
    if derived is None:
        if verdict_hint in {"approve", "approved", "approve_recommendation"}:
            derived = 0.82
        elif verdict_hint in {"reject", "rejected", "reject_recommendation", "escalate"}:
            derived = 0.78
        elif canonical_reason == "manual_admin_decision":
            derived = 0.0
        else:
            derived = 0.64

    unresolved = canonical_reason in {"manual_admin_decision", "manual_review_needed"} or reason_resolution.get("mode") in {"unresolved", "fallback_token"}
    if unresolved:
        return 0.0, "derived_ambiguous_fail_closed", {
            "mode": "derived_ambiguous_fail_closed",
            "reason_hint": reason_hint,
            "canonical_reason": canonical_reason,
            "reason_resolution": reason_resolution,
            "fail_closed_route": "needs_human_admin",
            "semantic_layer": "skipped_non_deterministic",
        }

    match_score = _normalize_confidence(reason_resolution.get("score"))
    if match_score is None:
        match_score = 1.0 if reason_resolution.get("mode") in {"db_exact_normalized", "exact_normalized"} else 0.7
    keyword_weight = _safe_positive_float(reason_resolution.get("keyword_weight"), default=1.0)
    quality_factor = min(1.0, max(0.35, match_score * min(1.25, keyword_weight)))
    weighted = float(derived) * quality_factor

    return float(weighted), "derived_reason_map", {
        "mode": "derived_reason_map",
        "reason_hint": reason_hint,
        "canonical_reason": canonical_reason,
        "reason_resolution": reason_resolution,
        "match_score": match_score,
        "keyword_weight": keyword_weight,
        "quality_factor": quality_factor,
        "semantic_layer": "skipped_non_deterministic",
    }


def _normalize_confidence(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed < 0.0 or parsed > 1.0:
        return None
    return parsed


def _safe_positive_float(value: object, *, default: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return float(default)
    if parsed <= 0.0:
        return float(default)
    return float(parsed)


def _normalize_reason_token(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    if not text:
        return ""
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def _contains_marker(text: str, marker: str) -> bool:
    phrase = marker.lower().strip()
    if not phrase:
        return False
    pattern = r"\b" + r"\s+".join(re.escape(part) for part in phrase.split()) + r"\b"
    return re.search(pattern, text) is not None


def _best_substring_reason_match(
    candidate_tokens: list[tuple[str, str]],
    reason_vocab: set[str],
) -> tuple[str, str, str, float] | None:
    best: tuple[str, str, str, float] | None = None
    sorted_vocab = sorted(reason_vocab, key=lambda value: (-len(value), value))
    for field, candidate in candidate_tokens:
        if not candidate:
            continue
        for reason in sorted_vocab:
            if len(reason) < SUBSTRING_MIN_TOKEN_LEN:
                continue
            if reason in candidate:
                score = len(reason) / max(1, len(candidate))
                current = (reason, field, reason, score)
            elif len(candidate) >= SUBSTRING_MIN_TOKEN_LEN and candidate in reason:
                score = len(candidate) / max(1, len(reason))
                current = (reason, field, candidate, score)
            else:
                continue
            if best is None or (current[3], len(current[0]), current[0], current[1]) > (best[3], len(best[0]), best[0], best[1]):
                best = current
    return best


def _best_allowed_reason_match(
    text: str,
    reason_alias_map: dict[str, dict[str, Any]],
) -> tuple[str, float, list[str], list[dict[str, object]], float, float] | None:
    if not text or not reason_alias_map:
        return None
    raw_tokens = re.findall(r"[a-z0-9]+", text.lower())
    text_tokens = set(raw_tokens)
    for index in range(len(raw_tokens) - 1):
        joined = f"{raw_tokens[index]}{raw_tokens[index + 1]}"
        if len(joined) >= SUBSTRING_MIN_TOKEN_LEN:
            text_tokens.add(joined)

    best: tuple[str, float, list[str], list[dict[str, object]], float, float] | None = None
    for alias in sorted(reason_alias_map):
        meta = reason_alias_map[alias]
        weight = _safe_positive_float(meta.get("weight"), default=1.0)
        tokens = [token for token in _normalize_reason_token(alias).split("_") if token]
        if not tokens:
            continue

        exact_matches: list[str] = []
        fuzzy_matches: list[dict[str, object]] = []
        for token in tokens:
            if token in text_tokens:
                exact_matches.append(token)
                continue
            fuzzy_match = None
            fuzzy_score = 0.0
            for observed in text_tokens:
                similarity = _token_similarity(token, observed)
                if similarity >= LEVENSHTEIN_SIMILARITY_THRESHOLD:
                    if fuzzy_match is None or (similarity, observed) > (fuzzy_score, str(fuzzy_match)):
                        fuzzy_match = observed
                        fuzzy_score = similarity
            if fuzzy_match is not None:
                fuzzy_matches.append({"expected": token, "observed": fuzzy_match, "similarity": round(fuzzy_score, 4)})

        phrase_match = _contains_marker(text, alias.replace("_", " "))
        if phrase_match:
            raw_score = 1.0
        else:
            weighted = len(exact_matches) + (0.8 * len(fuzzy_matches))
            raw_score = weighted / len(tokens)

        if raw_score < FUZZY_MATCH_MIN_SCORE and not phrase_match:
            continue

        weighted_score = min(1.0, raw_score * min(1.5, weight))
        matched_tokens = sorted(set(exact_matches + [item["expected"] for item in fuzzy_matches]))
        candidate = (alias, weighted_score, matched_tokens, fuzzy_matches, raw_score, weight)
        if best is None:
            best = candidate
            continue
        if (weighted_score, raw_score, len(matched_tokens), len(alias), alias) > (best[1], best[4], len(best[2]), len(best[0]), best[0]):
            best = candidate
    return best


def _token_similarity(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0
    distance = _levenshtein_distance(left, right)
    if distance > LEVENSHTEIN_MAX_DISTANCE:
        return 0.0
    denominator = max(len(left), len(right), 1)
    return max(0.0, 1.0 - (distance / denominator))


def _levenshtein_distance(left: str, right: str) -> int:
    if left == right:
        return 0
    if not left:
        return len(right)
    if not right:
        return len(left)
    previous = list(range(len(right) + 1))
    for i, lch in enumerate(left, start=1):
        current = [i]
        for j, rch in enumerate(right, start=1):
            insert_cost = current[j - 1] + 1
            delete_cost = previous[j] + 1
            replace_cost = previous[j - 1] + (0 if lch == rch else 1)
            current.append(min(insert_cost, delete_cost, replace_cost))
        previous = current
    return previous[-1]


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

    if _looks_ai_generated(detected_text, checks):
        checks["ai_generated_or_synthetic"] = True
        if confidence >= AI_GENERATED_HIGH_CONFIDENCE_THRESHOLD:
            checks["needs_human_review"] = False
            normalized["verdict"] = "reject_recommendation"
            normalized["reason_code"] = "ai_generated"
            normalized.setdefault("raw_reason_code", raw_reason_hint or "ai_generated_or_synthetic")
            raw_reason_hint = "ai_generated"
        else:
            checks["needs_human_review"] = True
            normalized["verdict"] = "review"
            normalized["reason_code"] = "manual_review_needed"
            normalized.setdefault("raw_reason_code", raw_reason_hint or "ai_generated_or_synthetic")
            raw_reason_hint = "manual_review_needed"

    if normalized.get("verdict") == "reject_recommendation" and _off_platform_contact_without_evidence(raw_reason_hint, detected_text, checks):
        checks["needs_human_review"] = True
        normalized["verdict"] = "review"
        normalized["reason_code"] = "manual_review_needed"
        normalized["raw_reason_code"] = raw_reason_hint
        normalized["note"] = _append_note(
            normalized.get("note"),
            "Off-platform contact/QR reason lacked explicit visible QR/contact evidence; routed to review instead of auto-reject.",
        )

    if "screenshot" in detected_text or "meme" in detected_text or "trading card" in detected_text:
        checks["meme_or_screenshot"] = True
    normalized["app_profile_photo_checks"] = checks
    return normalized


def _looks_ai_generated(detected_text: str, checks: dict) -> bool:
    return checks.get("ai_generated_or_synthetic") is True or any(
        marker in detected_text
        for marker in (
            "ai_generated_or_synthetic",
            "ai generated",
            "ai-generated",
            "synthetic",
            "generated image",
            "digitally created",
        )
    )


def _off_platform_contact_without_evidence(raw_reason_hint: str, detected_text: str, checks: dict) -> bool:
    if raw_reason_hint not in {"qr_code", "contact_info_or_ad", "contact_info_text_only_ad", "off_platform_contact"}:
        return False
    evidence_terms = {
        "qr code",
        "qrcode",
        "qr-code",
        "barcode",
        "phone number",
        "email",
        "social handle",
        "social media handle",
        "instagram",
        "snapchat",
        "telegram",
        "whatsapp",
        "@",
    }
    has_text_evidence = any(term in detected_text for term in evidence_terms)
    has_flag_evidence = checks.get("has_contact_info") is True
    return not (has_text_evidence or has_flag_evidence)


def _append_note(existing: object, addition: str) -> str:
    text = str(existing or "").strip()
    return f"{text} {addition}".strip()


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
        "fake_profile": "AI recommends rejection/review for possible fake or stolen-looking profile image.",
        "ai_generated": "AI recommends rejection/review for possible AI-generated or synthetic profile image.",
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
