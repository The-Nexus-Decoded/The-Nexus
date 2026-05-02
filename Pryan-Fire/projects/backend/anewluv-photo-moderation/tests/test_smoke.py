import json
import subprocess
import sys
import tempfile
import uuid
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

from photo_sweeper.lock import LockHeld, RunLock
from photo_sweeper.model import (
    CodexOpenAIAdapter,
    MiniMaxCLIAdapter,
    _codex_oauth_request_payload,
    _image_path_to_data_url,
    _redact_provider_error_body,
)
from photo_sweeper.normalization import normalize_minimax_description, normalize_model_result
from photo_sweeper.moderation_contract import IMAGE_TYPE_CLASSIFICATIONS, WORKER_MODEL_CATEGORIES
from photo_sweeper.policy import combine
from photo_sweeper.queue import load_queue
from photo_sweeper.agent_review import run_agent_review_once
from photo_sweeper.reporting import format_report, maybe_report_run
from photo_sweeper.runner import run_once
from photo_sweeper.xano_client import TokenCache, XanoClientError, XanoConfig, XanoModerationClient

PHOTO_REASON_CODES = [
    {"code": "unclear_subject", "auto_reject_threshold": None, "severity": "low"},
    {"code": "celebrity_or_stock_photo", "auto_reject_threshold": None, "severity": "medium"},
    {"code": "ai_generated", "auto_reject_threshold": 0.90, "severity": "medium"},
    {"code": "object_or_landscape_only", "auto_reject_threshold": 0.90, "severity": "low"},
    {"code": "nudity_explicit", "auto_reject_threshold": 0.85, "severity": "high"},
    {"code": "low_quality", "auto_reject_threshold": None, "severity": "low"},
]

PHOTO_FALLBACK_REVIEW_ITEMS = [
    {"code": "object_or_landscape_only", "label": "Contains a person", "prompt_hint": "Does the photo contain a person?"},
]


def run_cli(*args, check=True):
    proc = subprocess.run(
        [sys.executable, "-m", "photo_sweeper", *args],
        check=check,
        text=True,
        capture_output=True,
    )
    return proc


class PhotoSweeperSmokeTests(unittest.TestCase):
    def test_cli_limit_works_and_redacts_email(self):
        output = run_cli("--once", "--dry-run", "--limit", "2").stdout
        payload = json.loads(output)

        self.assertIs(payload["dry_run"], True)
        self.assertIs(payload["write_enabled"], False)
        self.assertEqual(payload["photos_scanned"], 2)
        self.assertNotIn("user_email", output)
        self.assertNotIn("user_id", output)

    def test_photo_id_force_does_not_enable_writes(self):
        output = run_cli("--once", "--photo-id", "101", "--force").stdout
        payload = json.loads(output)

        self.assertIs(payload["force_requested"], True)
        self.assertIs(payload["write_enabled"], False)
        self.assertIs(payload["photos"][0]["write_enabled"], False)
        self.assertIs(payload["photos"][0]["would_write_recommendation"], False)
        self.assertIs(payload["photos"][0]["would_finalize_decision"], False)

    def test_cli_blocks_mock_provider_chain_for_live_write(self):
        proc = run_cli("--once", "--live-write", "--provider", "provider-chain", check=False)

        self.assertEqual(proc.returncode, 2)
        self.assertIn("blocked for --live-write", proc.stderr)

    def test_nudity_sexual_and_explicit_categories_are_recommendations_not_final_decisions(self):
        queue = load_queue()
        result = run_once(queue, limit=None, photo_id=None, dry_run=True, force=False, model_fixture=None)
        explicit = [
            item
            for item in result["photos"]
            if item["normalized_result"].get("raw_reason_code", item["normalized_result"]["reason_code"])
            in {"sexual_content", "nudity", "pornographic_explicit"}
        ]

        self.assertEqual({item["planned_action"] for item in explicit}, {"human_admin_review"})
        self.assertEqual({item["recommended_decision"] for item in explicit}, {None})
        self.assertTrue(all(item["would_finalize_decision"] is False for item in explicit))
        self.assertTrue(all(item["would_write_recommendation"] is False for item in explicit))

    def test_write_gates_are_always_false_for_all_fixtures(self):
        queue = load_queue()
        result = run_once(queue, limit=None, photo_id=None, dry_run=True, force=True, model_fixture=None)

        self.assertIs(result["write_enabled"], False)
        self.assertIs(result["writes"], False)
        self.assertEqual(result["/photos/decide"], "not called")
        for item in result["photos"]:
            self.assertIs(item["write_enabled"], False)
            self.assertIs(item["would_write_recommendation"], False)
            self.assertIs(item["would_finalize_decision"], False)

    def test_mock_manifest_covers_required_categories_offline(self):
        queue = load_queue()
        result = run_once(queue, limit=None, photo_id=None, dry_run=True, force=False, model_fixture=None)
        raw_reasons = {
            item["normalized_result"]["detected_category"]
            for item in result["photos"]
        }
        canonical_reasons = {item["normalized_result"]["reason_code"] for item in result["photos"]}

        self.assertGreaterEqual(
            raw_reasons,
            {
                "clean_profile_style",
                "ai_generated_or_synthetic",
                "sexual_content",
                "nudity",
                "inappropriate_photos",
                "pornographic_explicit",
                "contact_info_or_ad",
                "low_quality_or_unusable",
                "manual_review_needed",
                "api_failure_fallback",
            },
        )
        self.assertLessEqual(
            canonical_reasons,
            {
                "clean_profile_style",
                "fake_profile",
                "ai_generated",
                "sexual_content",
                "inappropriate_photos",
                "off_platform_contact",
                "manual_admin_decision",
                "not_person_photo",
            },
        )
        self.assertTrue(all(item["would_finalize_decision"] is False for item in result["photos"]))
        self.assertTrue(all(item["would_write_recommendation"] is False for item in result["photos"]))

    def test_api_failure_fallback_becomes_manual_review_without_writes(self):
        output = run_cli("--once", "--photo-id", "110", "--dry-run").stdout
        payload = json.loads(output)
        photo = payload["photos"][0]

        self.assertEqual(photo["normalized_result"]["raw_reason_code"], "api_failure_fallback")
        self.assertEqual(photo["normalized_result"]["reason_code"], "manual_admin_decision")
        self.assertEqual(photo["planned_action"], "agent_review")
        self.assertEqual(photo["model_path"]["vision_model_used"], "unavailable")
        self.assertEqual(photo["model_path"]["fallback_model"], "mock_failure_fallback")
        self.assertIs(photo["would_write_recommendation"], False)
        self.assertIs(photo["would_finalize_decision"], False)

    def test_clean_fixture_can_recommend_approve_without_final_decision_or_write(self):
        output = run_cli("--once", "--photo-id", "101", "--dry-run").stdout
        payload = json.loads(output)
        photo = payload["photos"][0]

        self.assertEqual(photo["normalized_result"]["verdict"], "approve_recommendation")
        self.assertEqual(photo["recommended_decision"], "approve_recommendation")
        self.assertEqual(photo["planned_action"], "report_only")
        self.assertIs(photo["would_write_recommendation"], False)
        self.assertIs(photo["would_finalize_decision"], False)

    def test_normalizer_only_reject_side_final_terms_are_normalized(self):
        approved = normalize_model_result({"verdict": "approved"}, default_model="fixture")
        approve = normalize_model_result({"verdict": "approve"}, default_model="fixture")
        reject = normalize_model_result({"verdict": "reject"}, default_model="fixture")
        unknown = normalize_model_result({"verdict": "ship_it"}, default_model="fixture")

        self.assertEqual(approved["validator"], "fail")
        self.assertEqual(approved["verdict"], "review")
        self.assertEqual(approved["normalization_applied"], "no")
        self.assertEqual(approve["validator"], "fail")
        self.assertEqual(approve["verdict"], "review")
        self.assertEqual(approve["normalization_applied"], "no")
        self.assertEqual(reject["verdict"], "escalate")
        self.assertEqual(reject["reason_code"], "manual_admin_decision")
        self.assertEqual(reject.get("fail_closed_route"), "needs_human_admin")
        self.assertEqual(reject["validator"], "pass")
        self.assertEqual(unknown["validator"], "fail")
        self.assertEqual(unknown["verdict"], "review")

    def test_worker_model_category_coverage_is_locked(self):
        self.assertEqual(
            WORKER_MODEL_CATEGORIES,
            {
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
            },
        )

    def test_image_type_classification_set_is_locked(self):
        self.assertEqual(
            IMAGE_TYPE_CLASSIFICATIONS,
            {
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
            },
        )

    def test_provider_canonical_reason_code_is_accepted(self):
        result = normalize_model_result({"verdict": "review", "confidence": 0.91, "canonical_reason_code": "ai_generated", "detected_category": "ai_generated_or_synthetic", "unsafe_categories": []}, default_model="fixture")

        self.assertEqual(result["detected_category"], "ai_generated_or_synthetic")
        self.assertEqual(result["reason_code"], "ai_generated")

    def test_normalized_output_keeps_detected_category_and_canonical_reason(self):
        result = normalize_model_result({"verdict": "review", "confidence": 0.91, "reason_code": "ai_generated_or_synthetic", "unsafe_categories": []}, default_model="fixture")

        self.assertEqual(result["detected_category"], "ai_generated_or_synthetic")
        self.assertEqual(result["reason_code"], "ai_generated")

    def test_missing_confidence_derives_non_zero_confidence_with_audit_fields(self):
        result = normalize_model_result(
            {
                "verdict": "reject_recommendation",
                "reason": "AI generated portrait with synthetic face",
                "detected_category": "rendered profile",
                "confidence": None,
                "unsafe_categories": ["ai_generated_or_synthetic"],
            },
            default_model="fixture",
            allowed_reason_codes={"ai_generated"},
            reason_vocabulary=(
                {
                    "code": "ai_generated",
                    "aliases": "ai generated|ai-generated|synthetic|digitally created|rendered|generated image",
                    "keyword_weight": 1.0,
                },
            ),
        )

        self.assertGreater(result["confidence"], 0.0)
        self.assertEqual(result["confidence_source"], "derived_reason_map")
        self.assertEqual(result["reason_code"], "ai_generated")
        self.assertIn(result["match_source"], {"db_normalized_substring", "db_fuzzy_token", "db_exact_normalized"})
        self.assertIn("match_evidence", result)

    def test_provider_confidence_is_preserved_when_valid(self):
        result = normalize_model_result(
            {
                "verdict": "reject_recommendation",
                "confidence": 0.77,
                "reason_code": "contact_info_or_ad",
                "unsafe_categories": [],
            },
            default_model="fixture",
        )

        self.assertEqual(result["confidence"], 0.77)
        self.assertEqual(result["confidence_source"], "provider")

    def test_levenshtein_fuzzy_match_maps_near_miss_reason_tokens(self):
        result = normalize_model_result(
            {
                "verdict": "review",
                "confidence": None,
                "reason": "undr-age signal detected",
                "unsafe_categories": [],
            },
            default_model="fixture",
            allowed_reason_codes={"underage", "minor_targeting"},
            reason_vocabulary=(
                {
                    "code": "underage",
                    "aliases": "under age|underage|minor|child|teen|youth",
                    "keyword_weight": 1.0,
                },
                {
                    "code": "minor_targeting",
                    "aliases": "targets minors|targeting minors|minor targeting|sexualizes youth",
                    "keyword_weight": 1.0,
                },
            ),
        )

        self.assertIn(result["reason_code"], {"underage", "minor_targeting"})
        self.assertEqual(result["verdict"], "escalate")
        self.assertIs(result.get("needs_human_admin"), True)

    def test_missing_confidence_ambiguous_fails_closed_to_human_admin_path(self):
        model_result = normalize_model_result(
            {
                "verdict": "review",
                "confidence": "unknown",
                "reason": "cannot determine",
                "note": "ambiguous visual signal",
                "unsafe_categories": [],
            },
            default_model="fixture",
        )
        item = {"photo_id": 7001}
        checks = {"image_reference_present": True, "exists": True, "supported_reference": True}
        combined = combine(item, checks, model_result, dry_run=True, force=False)

        self.assertEqual(model_result["confidence_source"], "derived_ambiguous_fail_closed")
        self.assertEqual(model_result["reason_code"], "manual_admin_decision")
        self.assertEqual(model_result.get("fail_closed_route"), "needs_human_admin")
        self.assertEqual(combined["planned_action"], "human_admin_review")

    def test_same_input_produces_same_deterministic_mapping(self):
        payload = {
            "verdict": "reject_recommendation",
            "confidence": None,
            "reason": "undr-age signal detected",
            "unsafe_categories": [],
        }
        left = normalize_model_result(payload, default_model="fixture")
        right = normalize_model_result(payload, default_model="fixture")

        self.assertEqual(left["reason_code"], right["reason_code"])
        self.assertEqual(left["confidence"], right["confidence"])
        self.assertEqual(left["confidence_source"], right["confidence_source"])
        self.assertEqual(left["match_source"], right["match_source"])

    def test_policy_falls_back_before_future_write_eligibility(self):
        item = {"photo_id": 1}
        checks = {"image_reference_present": True, "exists": True, "supported_reference": True}
        model_result = {
            "validator": "pass",
            "verdict": "reject_recommendation",
            "reason_code": "api_failure_fallback",
            "app_profile_photo_checks": {},
        }

        result = combine(item, checks, model_result, dry_run=True, force=False)

        self.assertEqual(result["planned_action"], "agent_review")
        self.assertEqual(result["would_write_recommendation"], False)
        self.assertEqual(result["would_finalize_decision"], False)

    def test_qr_or_contact_reject_requires_explicit_visible_evidence(self):
        result = normalize_model_result(
            {
                "verdict": "reject_recommendation",
                "confidence": 0.91,
                "reason_code": "qr_code",
                "detected_category": "real_person_profile_photo",
                "note": "Person smiling against a plain wall.",
                "unsafe_categories": [],
                "app_profile_photo_checks": {
                    "is_profile_style_photo": True,
                    "has_contact_info": False,
                    "is_meme_or_screenshot": False,
                    "is_blank_or_unusable": False,
                    "ai_generated_or_synthetic": False,
                    "needs_human_review": False,
                },
            },
            default_model="fixture",
        )

        item = {"photo_id": 13317}
        checks = {"image_reference_present": True, "exists": True, "supported_reference": True}
        combined = combine(item, checks, result, dry_run=True, force=False)

        self.assertEqual(result["verdict"], "review")
        self.assertEqual(result["reason_code"], "manual_admin_decision")
        self.assertEqual(combined["planned_action"], "agent_review")
        self.assertIsNone(combined["recommended_decision"])

    def test_ai_generated_evidence_overrides_hallucinated_qr_reason(self):
        result = normalize_model_result(
            {
                "verdict": "reject_recommendation",
                "confidence": 0.91,
                "reason_code": "qr_code",
                "detected_category": "ai_generated_or_synthetic",
                "note": "AI-generated looking woman pointing against a wall; no visible QR code.",
                "unsafe_categories": ["ai_generated_or_synthetic"],
                "app_profile_photo_checks": {
                    "is_profile_style_photo": False,
                    "has_contact_info": False,
                    "is_meme_or_screenshot": False,
                    "is_blank_or_unusable": False,
                    "ai_generated_or_synthetic": True,
                    "needs_human_review": False,
                },
            },
            default_model="fixture",
        )

        item = {"photo_id": 13317}
        checks = {"image_reference_present": True, "exists": True, "supported_reference": True}
        combined = combine(item, checks, result, dry_run=False, force=False)

        self.assertEqual(result["verdict"], "reject_recommendation")
        self.assertEqual(result["reason_code"], "ai_generated")
        self.assertEqual(result.get("raw_reason_code"), "qr_code")
        self.assertEqual(combined["planned_action"], "auto_reject")
        self.assertEqual(combined["recommended_decision"], "reject_recommendation")

    def test_qr_reject_with_explicit_evidence_still_maps_to_off_platform_contact(self):
        result = normalize_model_result(
            {
                "verdict": "reject_recommendation",
                "confidence": 0.91,
                "reason_code": "qr_code",
                "detected_category": "qr_code_visible_on_profile_photo",
                "note": "Visible QR code printed in the image.",
                "unsafe_categories": ["qr_code"],
                "app_profile_photo_checks": {
                    "is_profile_style_photo": False,
                    "has_contact_info": True,
                    "is_meme_or_screenshot": False,
                    "is_blank_or_unusable": False,
                    "ai_generated_or_synthetic": False,
                    "needs_human_review": False,
                },
            },
            default_model="fixture",
        )

        self.assertEqual(result["verdict"], "reject_recommendation")
        self.assertEqual(result["reason_code"], "off_platform_contact")

    def test_category_agnostic_person_gate_rejects_high_confidence_non_person(self):
        item = {"photo_id": 13286}
        checks = {"image_reference_present": True, "exists": True, "supported_reference": True}
        model_result = normalize_model_result(
            {
                "is_person_photo": False,
                "decision": "reject",
                "reason": "not_person_photo",
                "confidence": 0.98,
                "evidence": "screenshot/card; no real person profile photo",
                "unsafe_categories": ["meme_or_screenshot"],
            },
            default_model="fixture",
        )

        result = combine(item, checks, model_result, dry_run=True, force=False)

        self.assertEqual(model_result["validator"], "pass")
        self.assertEqual(model_result["reason_code"], "not_person_photo")
        self.assertEqual(result["planned_action"], "auto_reject")
        self.assertEqual(result["recommended_decision"], "reject_recommendation")
        self.assertIs(result["would_escalate"], False)

    def test_category_agnostic_person_gate_approves_clean_person_photo(self):
        item = {"photo_id": 101}
        checks = {"image_reference_present": True, "exists": True, "supported_reference": True}
        model_result = normalize_model_result(
            {
                "is_person_photo": True,
                "decision": "approve",
                "reason": "ok",
                "confidence": 0.91,
                "evidence": "usable person profile photo",
                "unsafe_categories": [],
            },
            default_model="fixture",
        )

        result = combine(item, checks, model_result, dry_run=True, force=False)

        self.assertEqual(result["planned_action"], "report_only")
        self.assertEqual(result["recommended_decision"], "approve_recommendation")

    def test_category_agnostic_person_gate_uncertain_is_no_write_review(self):
        item = {"photo_id": 999}
        checks = {"image_reference_present": True, "exists": True, "supported_reference": True}
        model_result = normalize_model_result(
            {
                "is_person_photo": "uncertain",
                "decision": "review",
                "reason": "uncertain",
                "confidence": 0.54,
                "evidence": "person/profile fit cannot be confirmed",
                "unsafe_categories": [],
            },
            default_model="fixture",
        )

        result = combine(item, checks, model_result, dry_run=True, force=False)

        self.assertEqual(result["planned_action"], "agent_review")
        self.assertIsNone(result["recommended_decision"])
        self.assertIs(result["would_escalate"], False)

    def test_explicit_or_unsafe_content_routes_human_admin_not_write(self):
        item = {"photo_id": 222}
        checks = {"image_reference_present": True, "exists": True, "supported_reference": True}
        for reason in {"explicit_content", "unsafe_content"}:
            with self.subTest(reason=reason):
                model_result = normalize_model_result(
                    {
                        "is_person_photo": True,
                        "decision": "reject",
                        "reason": reason,
                        "confidence": 0.96,
                        "evidence": "hard safety content",
                        "unsafe_categories": [reason],
                    },
                    default_model="fixture",
                )

                result = combine(item, checks, model_result, dry_run=True, force=False)

                self.assertEqual(model_result["validator"], "pass")
                self.assertEqual(result["planned_action"], "human_admin_review")
                self.assertIsNone(result["recommended_decision"])
                self.assertIs(result["would_escalate"], True)

    def test_too_blurry_or_blank_can_auto_reject_without_human_safety_route(self):
        item = {"photo_id": 333}
        checks = {"image_reference_present": True, "exists": True, "supported_reference": True}
        model_result = normalize_model_result(
            {
                "is_person_photo": False,
                "decision": "reject",
                "reason": "too_blurry_or_blank",
                "confidence": 0.93,
                "evidence": "blank/unusable image",
                "unsafe_categories": [],
            },
            default_model="fixture",
        )

        result = combine(item, checks, model_result, dry_run=True, force=False)

        self.assertEqual(model_result["validator"], "pass")
        self.assertEqual(model_result["reason_code"], "not_person_photo")
        self.assertEqual(result["planned_action"], "auto_reject")
        self.assertIs(result["would_escalate"], False)

    def test_ai_generated_or_synthetic_requires_high_confidence_for_ai_generated(self):
        high = normalize_model_result({"verdict": "review", "confidence": 0.91, "reason_code": "ai_generated_or_synthetic", "unsafe_categories": []}, default_model="fixture")
        uncertain = normalize_model_result({"verdict": "review", "confidence": 0.79, "reason_code": "ai_generated_or_synthetic", "unsafe_categories": []}, default_model="fixture")

        self.assertEqual(high["detected_category"], "ai_generated_or_synthetic")
        self.assertEqual(high["reason_code"], "ai_generated")
        self.assertEqual(uncertain["detected_category"], "ai_generated_or_synthetic")
        self.assertEqual(uncertain["reason_code"], "manual_admin_decision")
        self.assertEqual(uncertain["verdict"], "review")

    def test_reason_codes_are_canonicalized_before_policy(self):
        cases = {
            "api_failure_fallback": "manual_admin_decision",
            "missing_image_reference": "manual_admin_decision",
            "api_auth_unavailable": "manual_admin_decision",
            "nudity": "sexual_content",
            "pornographic_explicit": "sexual_content",
            "not_a_profile_photo": "not_person_photo",
            "celebrity_or_stock_photo": "fake_profile",
            "object_or_landscape_only": "fake_profile",
            "ai_generated_or_synthetic": "ai_generated",
            "ai_generated": "ai_generated",
            "contact_info_or_ad": "off_platform_contact",
            "contact_info_text_only_ad": "off_platform_contact",
            "qr_code": "off_platform_contact",
            "advertisement_or_flyer": "spam",
            "money_request": "money_request",
            "hate_or_harassment": "harassment",
            "bot_or_scam": "bot_behavior",
            "underage_concern": "underage",
            "low_quality_or_unusable": "inappropriate_photos",
        }
        for raw, canonical in cases.items():
            with self.subTest(raw=raw):
                result = normalize_model_result({"verdict": "review", "reason_code": raw, "unsafe_categories": []}, default_model="fixture")
                self.assertEqual(result.get("raw_reason_code", result["reason_code"]), raw)
                self.assertEqual(result["reason_code"], canonical)

        clean_reject = normalize_model_result({"verdict": "reject_recommendation", "reason_code": "clean_profile_style", "unsafe_categories": []}, default_model="fixture")
        self.assertEqual(clean_reject["validator"], "fail")
        self.assertEqual(clean_reject["reason_code"], "manual_admin_decision")

    def test_codex_provider_report_fields_are_zero_write_text_json(self):
        queue = load_queue()
        with mock.patch.dict("os.environ", {"CODEX_OPENAI_API_KEY": "", "OPENAI_API_KEY": "", "CODEX_AUTH_PATH": "/tmp/does-not-exist-codex-auth.json"}, clear=False):
            result = run_once(queue, limit=1, photo_id=None, dry_run=True, force=False, model_fixture=None, model_adapter="codex-openai-image")

        self.assertEqual(result["provider"], "codex-openai-image")
        self.assertEqual(result["model_route"], "Codex OAuth/OpenClaw gpt-5.5 + gpt-image-2 configured image route")
        self.assertEqual(result["image_generation_events"], 0)
        self.assertEqual(result["output_type"], "text_json")
        self.assertIs(result["writes"], False)
        self.assertEqual(result["/photos/decide"], "not called")
        self.assertIs(result["write_enabled"], False)
        self.assertEqual(result["photos"][0]["normalized_result"]["raw_reason_code"], "api_auth_unavailable")
        self.assertEqual(result["photos"][0]["normalized_result"]["reason_code"], "manual_admin_decision")

    def test_provider_error_redaction_removes_tokens_sessions_and_signed_urls(self):
        signed_marker = "X-Amz-" + "Signature"
        body = (
            "Authorization: Bearer secret-token session=abc oauth=value "
            + "https://"
            + "cdn.example/image.jpg?"
            + signed_marker
            + "=leak"
        )
        redacted = _redact_provider_error_body(body)

        self.assertNotIn("secret-token", redacted)
        self.assertNotIn("abc", redacted)
        self.assertNotIn("oauth=value", redacted)
        self.assertNotIn(signed_marker, redacted)
        self.assertIn("[redacted-url]", redacted)

    def test_provider_order_names_are_accepted_or_fail_closed_without_live_calls(self):
        self.assertEqual(json.loads(run_cli("--once", "--provider", "mock", "--limit", "1").stdout)["provider"], "mock")
        self.assertEqual(json.loads(run_cli("--once", "--provider", "provider-chain", "--limit", "1").stdout)["provider"], "provider-chain")
        self.assertEqual(json.loads(run_cli("--once", "--provider", "vision-llm-only", "--limit", "1").stdout)["provider"], "vision-llm-only")

        proc = run_cli("--once", "--provider", "openai-moderations", "--limit", "1", check=False)
        self.assertEqual(proc.returncode, 2)
        self.assertIn("not available", proc.stderr)

        proc = run_cli("--once", "--provider", "openrouter-multimodal", "--limit", "1", check=False)
        self.assertEqual(proc.returncode, 2)
        self.assertIn("not available", proc.stderr)

    def test_codex_oauth_payload_has_required_route_shape(self):
        payload = _codex_oauth_request_payload("gpt-5.5", "data:image/png;base64,abc")
        self.assertIn("instructions", payload)
        self.assertEqual(payload["model"], "gpt-5.5")
        self.assertIs(payload["store"], False)
        self.assertIs(payload["stream"], True)
        dumped = json.dumps(payload)
        self.assertIn("input_image", dumped)
        self.assertIn("image_generation", dumped.lower())

        instructions = payload["instructions"]
        self.assertIn("You are an ANewLuv photo moderator", instructions)
        self.assertIn("Return ONLY JSON with this exact shape", instructions)
        self.assertIn('"canonical_reason_code": "existing Xano-compatible reason"', instructions)
        self.assertIn('"detected_category": "specific visual category"', instructions)
        self.assertIn("detected_category", instructions)
        self.assertIn("Identify which type of image this is", instructions)
        for image_type in {
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
        }:
            self.assertIn(image_type, instructions)
        for mapping in {
            "real_person_profile_photo/selfie -> possible approve_recommendation if all safety checks pass",
            "group_photo/unclear_subject -> review",
            "meme_or_screenshot/text_only/ad/contact/qr -> reject_recommendation or review",
            "object_or_landscape_only -> reject_recommendation/review",
            "celebrity_or_stock_photo -> fake_profile/review",
            "ai_generated_or_synthetic -> ai_generated if high confidence, otherwise review/manual_admin_decision",
            "explicit_adult_image -> reject/escalate",
            "low_quality_or_unusable -> review/reject",
            "underage_concern -> never approve; escalate/review",
            "money_request -> reject/escalate",
            "hate_or_harassment -> reject/escalate",
            "underage_concern -> underage when the image subject appears under 18; minor_targeting when content targets minors or sexualizes youth context",
            "bot_or_scam -> review/reject",
        }:
            self.assertIn(mapping, instructions)
        self.assertIn("First classify the image type. Then evaluate safety/policy checks", instructions)
        self.assertIn("not clearly a usable profile photo of a real person, do not approve", instructions)
        self.assertIn("detected_category = detailed AI/image classification", instructions)
        self.assertIn("canonical_reason_code = canonical Xano-compatible moderation reason", instructions)
        self.assertIn("detected_category", instructions)
        self.assertIn("canonical_reason_code", instructions)
        self.assertIn("never emit only worker-local", instructions)
        self.assertNotIn("- is_meme_or_screenshot:", instructions)
        self.assertNotIn("ai_generated_image", instructions)
        self.assertNotIn("is_ai_generated", instructions)
        self.assertNotIn("ai_generated_or_avatar", instructions)
        self.assertIn("Detailed flags to inspect", instructions)
        self.assertIn("CANONICAL canonical_reason_code output only", instructions)
        self.assertIn("APPROVE ONLY", instructions)
        self.assertIn("If unsure", instructions)
        self.assertIn("Only approve clean_profile_style when all other checks pass", instructions)
        self.assertIn("If uncertain, choose review/escalate. Never approve uncertainty", instructions)
        self.assertIn("Confidence below 0.6", instructions)
        self.assertIn("underage: use when the image subject appears under 18", instructions)
        self.assertIn("minor_targeting: use when content appears to target minors or sexualizes youth context", instructions)
        self.assertIn("money/payment solicitation — reject/escalate", instructions)
        self.assertIn("hate symbols, slurs, protected-class attacks", instructions)
        self.assertIn("hate speech — escalate", instructions)
        for reason_code in {
            "sexual_content",
            "nudity",
            "pornographic_explicit",
            "inappropriate_photos",
            "ai_generated_or_synthetic",
            "ai_generated",
            "contact_info_or_ad",
            "contact_info_text_only_ad",
            "not_a_profile_photo",
            "low_quality_or_unusable",
            "meme_or_screenshot",
            "blank_or_unusable",
            "fake_profile",
            "underage",
            "money_request",
            "hate_speech",
            "spam",
            "bot_behavior",
            "off_platform_contact",
            "harassment",
            "clean_profile_style",
            "underage_concern",
            "group_photo",
            "unclear_subject",
            "celebrity_or_stock_photo",
            "object_or_landscape_only",
            "qr_code",
            "hate_or_harassment",
            "bot_or_scam",
        }:
            self.assertIn(reason_code, instructions)
        self.assertIn("final authority", instructions)
        self.assertNotIn("Photo moderation review items", instructions)

    def test_ppm_fixture_converts_to_png_data_url(self):
        queue = load_queue()
        ppm = queue[0]["local_fixture_path"]
        data_url = _image_path_to_data_url(__import__("pathlib").Path(ppm))
        self.assertTrue(data_url.startswith("data:image/png;base64,"))

    def test_codex_openai_adapter_strips_env_key_whitespace(self):
        adapter = CodexOpenAIAdapter(api_key=" unit_test_key\r\n")

        self.assertEqual(adapter.api_key, "unit_test_key")

    def test_codex_adapter_parses_mocked_provider_without_printing_auth(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(
                    {
                        "output_text": json.dumps(
                            {
                                "verdict": "reject",
                                "confidence": 0.91,
                                "reason_code": "sexual_content",
                                "unsafe_categories": ["sexual_content"],
                            }
                        )
                    }
                ).encode("utf-8")

        seen = {}

        def fake_urlopen(request, timeout):
            seen["authorization"] = request.headers.get("Authorization")
            seen["body"] = request.data.decode("utf-8")
            return FakeResponse()

        queue = load_queue()
        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            result = CodexOpenAIAdapter(api_key="unit_test_key", codex_auth_path=Path("/tmp/does-not-exist-codex-auth.json")).review(queue[0], {})

        self.assertEqual(result["verdict"], "reject_recommendation")
        self.assertEqual(result["normalization_applied"], "yes")
        self.assertEqual(result["validator"], "pass")
        self.assertTrue(seen["authorization"].startswith("Bearer "))
        self.assertIn('"instructions"', seen["body"])
        self.assertNotIn("unit_test_key", json.dumps(result))

    def test_codex_openai_adapter_parses_raw_responses_output_items(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(
                    {
                        "id": "resp_noise_that_must_not_be_parsed",
                        "status": "completed",
                        "output": [
                            {
                                "type": "message",
                                "content": [
                                    {
                                        "type": "output_text",
                                        "text": json.dumps(
                                            {
                                                "verdict": "approve_recommendation",
                                                "confidence": 0.88,
                                                "reason_code": "clean_profile_style",
                                                "unsafe_categories": [],
                                            }
                                        ),
                                    }
                                ],
                            }
                        ],
                    }
                ).encode("utf-8")

        with mock.patch("urllib.request.urlopen", return_value=FakeResponse()):
            result = CodexOpenAIAdapter(api_key="unit_test_key", codex_auth_path=Path("/tmp/does-not-exist-codex-auth.json")).review(load_queue()[0], {})

        self.assertEqual(result["verdict"], "approve_recommendation")
        self.assertEqual(result["reason_code"], "clean_profile_style")
        self.assertEqual(result["validator"], "pass")

    def test_image_data_url_removes_converted_temp_png(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / "source.ppm"
            source.write_text("P3\n1 1\n255\n255 255 255\n", encoding="utf-8")
            converted = Path(tmpdir) / "converted.png"
            converted.write_bytes(b"png-bytes")

            with mock.patch("photo_sweeper.model._convert_to_png", return_value=converted):
                data_url = _image_path_to_data_url(source)

            self.assertTrue(data_url.startswith("data:image/png;base64,"))
            self.assertFalse(converted.exists())

    def test_minimax_parser_outputs_recommendation_language(self):
        result = normalize_minimax_description("A clear portrait of a person smiling outdoors.")

        self.assertEqual(result["verdict"], "approve_recommendation")
        self.assertEqual(result["reason_code"], "clean_profile_style")
        self.assertIn("+ parser", result["vision_model_used"])

    def test_minimax_cli_adapter_parses_subprocess_output_without_raw_dump(self):
        completed = subprocess.CompletedProcess(
            args=["openclaw"],
            returncode=0,
            stdout=json.dumps({"description": "A blurry dark image where the person is not visible."}),
            stderr="",
        )
        with mock.patch("subprocess.run", return_value=completed):
            result = MiniMaxCLIAdapter().review({"local_fixture_path": "/tmp/fake.jpg"}, {})

        self.assertEqual(result["verdict"], "review")
        self.assertEqual(result["raw_reason_code"], "low_quality_or_unusable")
        self.assertEqual(result["reason_code"], "inappropriate_photos")
        self.assertEqual(result["vision_model_used"], "minimax/MiniMax-VL-01 + parser")

    def test_minimax_cli_adapter_missing_binary_fails_closed_to_manual_review(self):
        with mock.patch("subprocess.run", side_effect=FileNotFoundError("openclaw")):
            result = MiniMaxCLIAdapter().review({"local_fixture_path": "/tmp/fake.jpg"}, {})

        self.assertEqual(result["verdict"], "review")
        self.assertEqual(result["raw_reason_code"], "api_failure_fallback")
        self.assertEqual(result["reason_code"], "manual_admin_decision")
        self.assertEqual(result["fallback_model"], "manual_review")
        self.assertIn("dependency was not available", result["note"])

    def test_minimax_cli_adapter_timeout_fails_closed_to_manual_review(self):
        timeout = subprocess.TimeoutExpired(cmd=["openclaw"], timeout=1)
        with mock.patch("subprocess.run", side_effect=timeout):
            result = MiniMaxCLIAdapter().review({"local_fixture_path": "/tmp/fake.jpg"}, {})

        self.assertEqual(result["verdict"], "review")
        self.assertEqual(result["raw_reason_code"], "api_failure_fallback")
        self.assertEqual(result["reason_code"], "manual_admin_decision")
        self.assertEqual(result["fallback_model"], "manual_review")
        self.assertIn("timed out", result["note"])


class ProviderChainPhaseFourTests(unittest.TestCase):
    def _run_chain_case(self, stage1_key, stage2_key, *, dry_run=True, xano_client=None, fixture_extra=None):
        fixture = {
            "clean_profile_style": {
                "verdict": "approve_recommendation",
                "confidence": 0.93,
                "reason_code": "clean_profile_style",
                "note": "clean",
                "unsafe_categories": [],
                "app_profile_photo_checks": {
                    "is_profile_style_photo": True,
                    "has_contact_info": False,
                    "is_meme_or_screenshot": False,
                    "is_blank_or_unusable": False,
                    "ai_generated_or_synthetic": False,
                    "needs_human_review": False,
                },
            },
            "sexual_content": {
                "verdict": "reject_recommendation",
                "confidence": 0.91,
                "reason_code": "sexual_content",
                "note": "hard safety",
                "unsafe_categories": ["sexual_content"],
            },
            "not_person_photo": {
                "verdict": "reject_recommendation",
                "confidence": 0.94,
                "reason_code": "not_person_photo",
                "note": "no person",
                "unsafe_categories": ["not_person_photo"],
                "app_profile_photo_checks": {"needs_human_review": False},
            },
            "manual_review_needed": {
                "verdict": "review",
                "confidence": 0.42,
                "reason_code": "manual_review_needed",
                "note": "inconclusive",
                "unsafe_categories": [],
            },
            "api_failure_fallback": {
                "verdict": "review",
                "confidence": 0.0,
                "reason_code": "api_failure_fallback",
                "note": "provider unavailable",
                "unsafe_categories": [],
                "fallback_model": "mock_failure_fallback",
            },
            "ai_generated": {
                "verdict": "reject_recommendation",
                "confidence": 0.95,
                "reason_code": "ai_generated",
                "note": "synthetic person",
                "unsafe_categories": ["ai_generated_or_synthetic"],
                "app_profile_photo_checks": {
                    "is_profile_style_photo": False,
                    "has_contact_info": False,
                    "is_meme_or_screenshot": False,
                    "is_blank_or_unusable": False,
                    "ai_generated_or_synthetic": True,
                    "needs_human_review": False,
                },
            },
        }
        if fixture_extra:
            fixture.update(fixture_extra)
        queue_item = dict(load_queue()[0], photostatus_id=1, deleted=False, moderation_fixture_key=stage1_key, model_fixture_key=stage2_key)
        with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
            json.dump(fixture, handle)
            handle.flush()
            if xano_client is not None:
                xano_client.queue_item = queue_item
            return run_once([queue_item], limit=1, photo_id=None, dry_run=dry_run, force=False, model_fixture=Path(handle.name), model_adapter="provider-chain", xano_client=xano_client)

    def test_stage1_clean_approval_short_circuits_without_stage2(self):
        result = self._run_chain_case("clean_profile_style", "sexual_content")
        photo = result["photos"][0]

        self.assertEqual(photo["planned_action"], "report_only")
        self.assertEqual(photo["recommended_decision"], "approve_recommendation")
        self.assertEqual(photo["model_path"]["moderation_model"], "mock_moderation_api")
        self.assertEqual(photo["model_path"]["vision_model_used"], "not_called")
        self.assertEqual(photo["normalized_result"]["provider_chain_decision"], "stage1_short_circuit")

    def test_stage1_hard_safety_short_circuits_to_human_without_stage2(self):
        result = self._run_chain_case("sexual_content", "clean_profile_style")
        photo = result["photos"][0]

        self.assertEqual(photo["planned_action"], "human_admin_review")
        self.assertIsNone(photo["recommended_decision"])
        self.assertEqual(photo["model_path"]["vision_model_used"], "not_called")
        self.assertEqual(photo["normalized_result"]["provider_chain_decision"], "stage1_short_circuit")

    def test_stage1_clear_non_safety_reject_short_circuits(self):
        result = self._run_chain_case("not_person_photo", "clean_profile_style")
        photo = result["photos"][0]

        self.assertEqual(photo["normalized_result"]["provider_chain_decision"], "stage1_short_circuit")
        self.assertEqual(photo["model_path"]["vision_model_used"], "not_called")
        self.assertEqual(photo["normalized_result"]["verdict"], "reject_recommendation")

    def test_stage1_inconclusive_falls_through_to_stage2_vision_llm(self):
        result = self._run_chain_case("manual_review_needed", "clean_profile_style")
        photo = result["photos"][0]

        self.assertEqual(photo["planned_action"], "report_only")
        self.assertEqual(photo["model_path"]["moderation_model"], "mock_moderation_api")
        self.assertEqual(photo["model_path"]["vision_model_used"], "mock_vision_llm")
        self.assertEqual(photo["normalized_result"]["provider_chain_decision"], "stage1_fallthrough")
        self.assertEqual(photo["normalized_result"]["stage1_result"]["reason_code"], "manual_admin_decision")

    def test_stage1_failure_falls_through_to_stage2_vision_llm(self):
        result = self._run_chain_case("api_failure_fallback", "clean_profile_style")
        photo = result["photos"][0]

        self.assertEqual(photo["planned_action"], "report_only")
        self.assertEqual(photo["model_path"]["vision_model_used"], "mock_vision_llm")
        self.assertEqual(photo["normalized_result"]["provider_chain_decision"], "stage1_fallthrough")
        self.assertEqual(photo["normalized_result"]["stage1_result"]["raw_reason_code"], "api_failure_fallback")

    def test_both_providers_failed_escalates_with_provider_chain_failed_reason(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []
                self.queue_item = None

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [self.queue_item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 342}

        fake = FakeClient()
        result = self._run_chain_case("api_failure_fallback", "api_failure_fallback", dry_run=False, xano_client=fake)
        photo = result["photos"][0]

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        self.assertEqual(fake.escalations[0]["route"], "agent_review")
        self.assertEqual(result["decision_calls"][0]["reason"], "provider_chain_failed")
        self.assertEqual(fake.escalations[0]["reason_code"], "provider_chain_failed")
        self.assertEqual(photo["planned_action"], "agent_review")
        self.assertEqual(photo["server_reason_code"], "provider_chain_failed")
        self.assertEqual(photo["normalized_result"]["reason_code"], "provider_chain_failed")
        self.assertEqual(photo["normalized_result"]["raw_reason_code"], "provider_chain_failed")
        self.assertEqual(photo["normalized_result"]["provider_chain_decision"], "provider_chain_failed")

    def test_stage2_invalid_missing_provider_output_escalates_without_decision(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []
                self.queue_item = None

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [self.queue_item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 344}

        fake = FakeClient()
        result = self._run_chain_case(
            "manual_review_needed",
            "invalid_missing_reason",
            dry_run=False,
            xano_client=fake,
            fixture_extra={
                "invalid_missing_reason": {
                    "verdict": "reject_recommendation",
                    "confidence": 0.95,
                    "note": "provider omitted reason code",
                    "unsafe_categories": ["unknown"],
                }
            },
        )
        photo = result["photos"][0]

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        self.assertEqual(fake.escalations[0]["route"], "agent_review")
        self.assertEqual(photo["planned_action"], "agent_review")
        self.assertEqual(photo["normalized_result"]["provider_chain_decision"], "stage1_fallthrough")

    def test_vision_only_chain_never_auto_rejects_clean_approval_still_allowed(self):
        class FakeClient:
            def __init__(self, key):
                self.key = key
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[0], photostatus_id=1, deleted=False, model_fixture_key=self.key)
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 343}

        clean_client = FakeClient("clean_profile_style")
        clean = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, model_adapter="vision-llm-only", xano_client=clean_client)
        self.assertEqual(clean_client.decisions[0]["decision"], "approved")
        self.assertEqual(clean["photos"][0]["normalized_result"]["provider_chain_stage"], "vision_llm_only")

        reject_client = FakeClient("ai_generated_or_synthetic")
        reject = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, model_adapter="vision-llm-only", xano_client=reject_client)
        self.assertEqual(reject_client.decisions, [])
        self.assertEqual(len(reject_client.escalations), 1)
        self.assertEqual(reject_client.escalations[0]["route"], "agent_review")
        self.assertEqual(reject["photos"][0]["planned_action"], "agent_review")
        self.assertNotEqual(reject["photos"][0]["planned_action"], "auto_reject")


class XanoPhaseOneTests(unittest.TestCase):
    def test_xano_client_logs_in_caches_jwt_and_uses_page_per_page_queue_contract(self):
        class FakeResponse:
            def __init__(self, payload):
                self.payload = payload

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(self.payload).encode("utf-8")

        seen = []

        def fake_urlopen(request, timeout):
            seen.append(
                {
                    "url": request.full_url,
                    "method": request.get_method(),
                    "authorization": request.headers.get("Authorization"),
                    "body": json.loads(request.data.decode("utf-8")) if request.data else None,
                }
            )
            if request.full_url.endswith("/auth/login"):
                return FakeResponse({"authToken": "unit-test-jwt"})
            return FakeResponse({"items": [], "settings": {}})

        config = XanoConfig(
            api_base_url="https://example.invalid/api:moderation",
            auth_api_base_url="https://example.invalid/api:auth",
            actor_key="unit-test-actor",
            worker_email="devon@example.invalid",
            worker_password="unit-test-password",
        )
        client = XanoModerationClient(config, token_cache=TokenCache())

        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            client.queue(page=2, per_page=25)
            client.queue(page=3, per_page=5)

        login_calls = [item for item in seen if item["url"].endswith("/auth/login")]
        queue_calls = [item for item in seen if "/photos/queue?" in item["url"]]
        self.assertEqual(len(login_calls), 1)
        self.assertEqual(login_calls[0]["body"], {"email": "devon@example.invalid", "password": "unit-test-password"})
        self.assertIn("actor_type=ai_agent", queue_calls[0]["url"])
        self.assertIn("actor_key=unit-test-actor", queue_calls[0]["url"])
        self.assertIn("page=2", queue_calls[0]["url"])
        self.assertIn("per_page=25", queue_calls[0]["url"])
        self.assertEqual(queue_calls[0]["authorization"], "Bearer unit-test-jwt")
        self.assertEqual(queue_calls[1]["authorization"], "Bearer unit-test-jwt")

    def test_live_phase_one_posts_ai_decide_with_run_id_idempotency_and_actor_type(self):
        class FakeClient:
            def __init__(self):
                self.queue_calls = []
                self.decisions = []

            def queue(self, *, page=1, per_page=None, limit=None):
                self.queue_calls.append((page, per_page, limit))
                item = dict(load_queue()[0])
                item["user_id"] = 9
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(fake.queue_calls, [(1, 1, None)])
        self.assertEqual(len(fake.decisions), 1)
        payload = fake.decisions[0]
        self.assertEqual(payload["decision"], "approved")
        self.assertEqual(payload["expected_current_status"], 1)
        self.assertEqual(payload["idempotency_key"], f"{payload['run_id']}:101")
        self.assertEqual(result["decision_calls"][0]["run_id"], payload["run_id"])
        self.assertIs(result["decision_calls"][0]["coerced"], False)
        dumped = json.dumps(result)
        self.assertNotIn("actor_key", dumped)
        self.assertNotIn("Authorization", dumped)

    def test_live_phase_one_uses_one_run_id_and_dedupes_duplicate_photos(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[0], photostatus_id=1, deleted=False)
                duplicate = dict(item)
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item, duplicate],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

        fake = FakeClient()
        result = run_once([], limit=25, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(result["photos_scanned"], 1)
        self.assertEqual(len(fake.decisions), 1)
        self.assertEqual(fake.decisions[0]["run_id"], result["run_id"])
        self.assertEqual(fake.decisions[0]["idempotency_key"], f"{result['run_id']}:101")

    def test_live_phase_one_skips_already_ai_processed_unless_force(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []

            def queue(self, *, page=1, per_page=None, limit=None):
                processed = dict(load_queue()[0], photostatus_id=1, deleted=False, ai_reason_code="not_person_photo")
                fresh = dict(load_queue()[0], photo_id=201, photostatus_id=1, deleted=False)
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [processed, fresh],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

        no_force = FakeClient()
        no_force_result = run_once([], limit=25, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=no_force)
        self.assertEqual(no_force_result["summary"]["selected_photo_ids"], [201])
        self.assertEqual([payload["photo_id"] for payload in no_force.decisions], [201])

        forced = FakeClient()
        forced_result = run_once([], limit=25, photo_id=None, dry_run=False, force=True, model_fixture=None, xano_client=forced)
        self.assertEqual(forced_result["summary"]["selected_photo_ids"], [101, 201])
        self.assertEqual([payload["photo_id"] for payload in forced.decisions], [101, 201])

    def test_run_lock_rejects_overlap(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            lock_path = Path(tmpdir) / "photo-sweeper.lock"
            with RunLock(lock_path):
                with self.assertRaises(LockHeld):
                    with RunLock(lock_path):
                        pass

    def test_cli_live_write_lock_held_returns_tempfail(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            lock_path = Path(tmpdir) / "photo-sweeper.lock"
            with RunLock(lock_path):
                proc = run_cli("--once", "--live-write", "--lock-file", str(lock_path), "--limit", "1", check=False)

        self.assertEqual(proc.returncode, 75)
        self.assertIn("lock already held", proc.stderr)

    def test_live_phase_one_applies_client_side_limit_even_if_server_ignores_it(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": load_queue()[:3],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(result["queue_fetched"], 3)
        self.assertEqual(result["local_cap"], 1)
        self.assertEqual(result["photos_scanned"], 1)
        self.assertEqual(len(fake.decisions), 1)

    def test_live_phase_one_expands_relative_xano_vault_photo_urls(self):
        class Config:
            api_base_url = "https://example.xano.io/api:S8LKJE3D"

        class FakeClient:
            config = Config()

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[0], photo_url="/vault/redacted/file.png", local_fixture_path=None, photostatus_id=1, deleted=False)
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

        result = run_once([], limit=1, photo_id=None, dry_run=True, force=False, model_fixture=None, xano_client=FakeClient())
        photo = result["photos"][0]

        self.assertEqual(photo["queue_source"], "GET /photos/queue")
        self.assertEqual(photo["deterministic_checks"]["exists"], None)
        self.assertEqual(photo["deterministic_checks"]["warnings"], ["remote_fetch_disabled_for_dry_run"])

    def test_live_phase_one_noops_unresolved_manual_review_results(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[0])
                item["model_fixture_key"] = "manual_review_needed"
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 7}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        payload = fake.escalations[0]
        self.assertEqual(payload["route"], "agent_review")
        self.assertEqual(payload["expected_current_status"], 1)
        self.assertEqual(payload["idempotency_key"], f"{payload['run_id']}:101:escalation")
        self.assertIsInstance(payload["model_path_json"], str)
        self.assertEqual(json.loads(payload["model_path_json"]), result["photos"][0]["model_path"])
        self.assertNotIn("decision", payload)
        self.assertNotIn("gallery", payload)
        self.assertNotIn("deleted", payload)
        self.assertEqual(result["decision_calls"][0]["status"], "escalated")
        self.assertEqual(result["decision_calls"][0]["route"], "agent_review")
        self.assertIsNone(result["decision_calls"][0]["decision"])

    def test_live_phase_one_escalation_note_includes_provider_failure_detail(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[0])
                item["model_fixture_key"] = "api_failure_fallback"
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 7}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        note = fake.escalations[0]["note"]
        self.assertIn("category=api_failure_fallback", note)
        self.assertIn("detail=Mock API failure; fallback requires manual moderation.", note)
        self.assertEqual(result["decision_calls"][0]["payload"]["note"], note)
        self.assertIn("model_path_json", result["decision_calls"][0]["payload"])
        self.assertIsInstance(result["decision_calls"][0]["payload"]["model_path_json"], str)

    def test_xano_client_lists_and_acks_escalations_with_actor_params_and_idempotency(self):
        class FakeResponse:
            def __init__(self, payload):
                self.payload = payload

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return json.dumps(self.payload).encode("utf-8")

        seen = []

        def fake_urlopen(request, timeout):
            seen.append(
                {
                    "url": request.full_url,
                    "method": request.get_method(),
                    "body": json.loads(request.data.decode("utf-8")) if request.data else None,
                }
            )
            if request.full_url.endswith("/auth/login"):
                return FakeResponse({"authToken": "unit-test-jwt"})
            if "/photos/escalations?" in request.full_url:
                return FakeResponse({"items": []})
            return FakeResponse({"status": "acknowledged"})

        config = XanoConfig(
            api_base_url="https://example.invalid/api:moderation",
            auth_api_base_url="https://example.invalid/api:auth",
            actor_key="unit-test-actor",
            worker_email="devon@example.invalid",
            worker_password="unit-test-password",
        )
        client = XanoModerationClient(config, token_cache=TokenCache())
        ack_key = f"{uuid.uuid4()}:7:ack"

        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            client.escalations(status="open", route="agent_review")
            client.escalation_ack(
                {
                    "escalation_id": 7,
                    "status": "acknowledged",
                    "expected_current_status": "open",
                    "expected_route": "agent_review",
                    "idempotency_key": ack_key,
                    "note": "owner ack unit test",
                }
            )

        list_call = next(item for item in seen if "/photos/escalations?" in item["url"])
        ack_call = next(item for item in seen if item["url"].endswith("/photos/escalations/ack"))
        self.assertIn("status=open", list_call["url"])
        self.assertIn("route=agent_review", list_call["url"])
        self.assertIn("actor_key=unit-test-actor", list_call["url"])
        self.assertEqual(ack_call["body"]["idempotency_key"], ack_key)
        self.assertEqual(ack_call["body"]["expected_current_status"], "open")
        self.assertEqual(ack_call["body"]["expected_route"], "agent_review")
        self.assertEqual(ack_call["body"]["actor_type"], "ai_agent")

    def test_live_phase_one_human_admin_escalation_uses_escalations_endpoint_not_ai_decide(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[2], photostatus_id=1, deleted=False, gallery=True)
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 9}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        self.assertEqual(fake.escalations[0]["route"], "human_admin_review")
        self.assertEqual(fake.escalations[0]["severity"], "high")
        self.assertNotIn("decision", fake.escalations[0])
        self.assertNotIn("gallery", fake.escalations[0])
        self.assertNotIn("deleted", fake.escalations[0])
        self.assertEqual(result["decision_calls"][0]["status"], "escalated")
        self.assertEqual(result["decision_calls"][0]["route"], "human_admin_review")

    def test_live_phase_one_filters_to_uploaded_not_deleted_only(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []

            def queue(self, *, page=1, per_page=None, limit=None):
                uploaded = dict(load_queue()[0], photostatus_id=1, deleted=False)
                approved = dict(load_queue()[1], photostatus_id=2, deleted=False)
                escalated = dict(load_queue()[2], photostatus_id=4, deleted=False)
                deleted = dict(load_queue()[3], photostatus_id=1, deleted=True)
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [approved, escalated, deleted, uploaded],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

        fake = FakeClient()
        result = run_once([], limit=None, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(result["queue_fetched"], 4)
        self.assertEqual(result["photos_scanned"], 1)
        self.assertEqual(fake.decisions[0]["photo_id"], 101)

    def test_live_phase_one_settings_force_escalation_before_post(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": False, "ai_escalate_below_confidence": 0.9},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [load_queue()[0]],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": True}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 8}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        self.assertEqual(fake.escalations[0]["route"], "agent_review")
        self.assertNotIn("decision", fake.escalations[0])
        self.assertEqual(result["decision_calls"][0]["status"], "escalated")
        self.assertEqual(result["decision_calls"][0]["reason"], "auto_decide_disabled")

    def test_live_settings_auto_decide_disabled_skips_model_and_escalates_all(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": False, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [dict(load_queue()[0], photostatus_id=1, deleted=False), dict(load_queue()[1], photostatus_id=1, deleted=False)],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": len(self.escalations)}

        fake = FakeClient()
        with mock.patch("photo_sweeper.model.MockModelAdapter.review", side_effect=AssertionError("model call should be skipped")):
            result = run_once([], limit=None, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 2)
        self.assertEqual([call["reason"] for call in result["decision_calls"]], ["auto_decide_disabled", "auto_decide_disabled"])
        self.assertEqual(result["photos_scanned"], 2)
        self.assertEqual(result["photos"][0]["model_path"]["vision_model_used"], "settings_precheck")

    def test_live_settings_max_decisions_cap_and_zero_are_honored(self):
        class FakeClient:
            def __init__(self, cap):
                self.cap = cap
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7, "ai_max_decisions_per_run": self.cap},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [dict(item, photostatus_id=1, deleted=False) for item in load_queue()[:3]],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": len(self.escalations)}

        capped = FakeClient(2)
        capped_result = run_once([], limit=None, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=capped)
        self.assertEqual(capped_result["local_cap"], 2)
        self.assertEqual(capped_result["photos_scanned"], 2)

        zero = FakeClient(0)
        zero_result = run_once([], limit=None, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=zero)
        self.assertEqual(zero_result["local_cap"], 0)
        self.assertEqual(zero_result["photos_scanned"], 0)
        self.assertEqual(zero.decisions, [])

    def test_live_settings_grace_period_filters_client_side(self):
        now = datetime.now(timezone.utc)
        old_item = dict(load_queue()[0], photostatus_id=1, deleted=False, created_at=(now - timedelta(minutes=45)).isoformat())
        fresh_item = dict(load_queue()[1], photostatus_id=1, deleted=False, created_at=(now - timedelta(minutes=5)).isoformat())

        class FakeClient:
            def __init__(self):
                self.decisions = []

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7, "ai_grace_period_minutes": 30},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [fresh_item, old_item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

        fake = FakeClient()
        result = run_once([], limit=None, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(result["queue_fetched"], 2)
        self.assertEqual(result["photos_scanned"], 1)
        self.assertEqual(result["photos"][0]["photo_id"], old_item["photo_id"])

    def test_live_settings_echo_is_reported_at_run_start(self):
        class FakeClient:
            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7, "agent_review_discord_channel_id": ""},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [],
                }

        result = run_once([], limit=None, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=FakeClient())

        self.assertTrue(result["settings_echo_present"])
        self.assertEqual(result["settings_echo"]["ai_escalate_below_confidence"], 0.7)
        self.assertIn("agent_review_discord_channel_id", result["settings_echo"])

    def test_live_settings_confidence_floor_routes_to_escalation_before_ai_decide(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.99},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [dict(load_queue()[0], photostatus_id=1, deleted=False)],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 9}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        self.assertEqual(result["decision_calls"][0]["reason"], "confidence_below_floor")

    def test_db_reason_code_threshold_controls_auto_reject(self):
        class FakeClient:
            def __init__(self, threshold):
                self.threshold = threshold
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[6], photostatus_id=1, deleted=False)
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": [
                        {"code": "qr_code", "auto_reject_threshold": self.threshold, "severity": "medium"},
                    ],
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 18}

        below = FakeClient(0.85)
        below_result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=below)
        self.assertEqual(below.decisions, [])
        self.assertEqual(len(below.escalations), 1)
        self.assertEqual(below_result["decision_calls"][0]["route"], "agent_review")

        allowed = FakeClient(0.80)
        allowed_result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=allowed)
        self.assertEqual(len(allowed.decisions), 1)
        self.assertEqual(allowed.decisions[0]["decision"], "rejected")
        self.assertEqual(allowed.decisions[0]["reason_code"], "qr_code")
        self.assertEqual(allowed.escalations, [])
        self.assertEqual(allowed_result["summary"]["write_counts"]["ai_decide"], 1)

    def test_live_db_reason_code_added_without_code_change_can_auto_reject(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[0], photostatus_id=1, deleted=False, model_fixture_key="drug_use")
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": [
                        {"code": "drug_use", "auto_reject_threshold": 0.80, "severity": "medium"},
                    ],
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 21}

        fixture = {
            "drug_use": {
                "verdict": "reject_recommendation",
                "confidence": 0.91,
                "reason_code": "drug_use",
                "note": "DB-defined reason code fixture.",
                "unsafe_categories": ["drug_use"],
                "app_profile_photo_checks": {
                    "is_profile_style_photo": False,
                    "has_contact_info": False,
                    "is_meme_or_screenshot": False,
                    "is_blank_or_unusable": False,
                    "ai_generated_or_synthetic": False,
                    "needs_human_review": False,
                },
            },
            "manual_review_needed": {
                "verdict": "review",
                "confidence": 0.4,
                "reason_code": "manual_review_needed",
                "note": "fallback",
                "unsafe_categories": [],
            },
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
            json.dump(fixture, handle)
            handle.flush()
            fake = FakeClient()
            result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=Path(handle.name), xano_client=fake)

        self.assertEqual(fake.escalations, [])
        self.assertEqual(len(fake.decisions), 1)
        self.assertEqual(fake.decisions[0]["decision"], "rejected")
        self.assertEqual(fake.decisions[0]["reason_code"], "drug_use")
        self.assertEqual(result["photos"][0]["normalized_result"]["reason_code"], "drug_use")

    def test_live_ai_generated_missing_from_db_fails_closed_to_review(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[0], photostatus_id=1, deleted=False, model_fixture_key="ai_generated")
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": [
                        {"code": "unclear_subject", "auto_reject_threshold": None, "severity": "low"},
                    ],
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 22}

        fixture = {
            "ai_generated": {
                "verdict": "reject_recommendation",
                "confidence": 0.95,
                "reason_code": "ai_generated",
                "note": "Synthetic image fixture.",
                "unsafe_categories": ["ai_generated_or_synthetic"],
                "app_profile_photo_checks": {
                    "is_profile_style_photo": False,
                    "has_contact_info": False,
                    "is_meme_or_screenshot": False,
                    "is_blank_or_unusable": False,
                    "ai_generated_or_synthetic": True,
                    "needs_human_review": False,
                },
            },
            "manual_review_needed": {"verdict": "review", "confidence": 0.4, "reason_code": "manual_review_needed", "note": "fallback", "unsafe_categories": []},
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
            json.dump(fixture, handle)
            handle.flush()
            fake = FakeClient()
            result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=Path(handle.name), xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        self.assertEqual(fake.escalations[0]["route"], "agent_review")
        self.assertEqual(fake.escalations[0]["reason_code"], "unclear_subject")
        self.assertEqual(result["photos"][0]["normalized_result"]["reason_code"], "ai_generated")
        self.assertEqual(result["photos"][0]["planned_action"], "agent_review")

    def test_live_unknown_reason_missing_from_db_fails_closed_to_review(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[0], photostatus_id=1, deleted=False, model_fixture_key="unseeded_reason")
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": [
                        {"code": "qr_code", "auto_reject_threshold": 0.85, "severity": "medium"},
                    ],
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 23}

        fixture = {
            "unseeded_reason": {
                "verdict": "reject_recommendation",
                "confidence": 0.96,
                "reason_code": "new_unseeded_code",
                "note": "Provider emitted a reason absent from live Xano reason_codes.",
                "unsafe_categories": ["new_unseeded_code"],
                "app_profile_photo_checks": {
                    "is_profile_style_photo": False,
                    "has_contact_info": False,
                    "is_meme_or_screenshot": False,
                    "is_blank_or_unusable": False,
                    "ai_generated_or_synthetic": False,
                    "needs_human_review": False,
                },
            },
            "manual_review_needed": {"verdict": "review", "confidence": 0.4, "reason_code": "manual_review_needed", "note": "fallback", "unsafe_categories": []},
        }
        with tempfile.NamedTemporaryFile("w", suffix=".json") as handle:
            json.dump(fixture, handle)
            handle.flush()
            fake = FakeClient()
            result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=Path(handle.name), xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        self.assertEqual(fake.escalations[0]["route"], "agent_review")
        self.assertEqual(fake.escalations[0]["reason_code"], "unclear_subject")
        self.assertEqual(result["photos"][0]["normalized_result"]["raw_reason_code"], "new_unseeded_code")
        self.assertEqual(result["photos"][0]["normalized_result"]["reason_code"], "manual_admin_decision")
        self.assertEqual(result["photos"][0]["planned_action"], "agent_review")

    def test_agent_review_disabled_routes_ordinary_uncertainty_to_human_admin(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                item = dict(load_queue()[8], photostatus_id=1, deleted=False)
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7, "agent_review_enabled": False},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [item],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 19}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        self.assertEqual(fake.escalations[0]["route"], "human_admin_review")
        self.assertEqual(result["photos"][0]["planned_action"], "human_admin_review")


    def test_live_runtime_contract_marks_direct_lookup_endpoint_payloads_present(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "items": [load_queue()[0]],
                }

            def reason_codes(self, *, surface="photo"):
                return {"items": PHOTO_REASON_CODES}

            def review_items(self, *, applies_to="photo"):
                return {"items": PHOTO_FALLBACK_REVIEW_ITEMS}

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertTrue(result["db_reason_codes_present"])
        self.assertTrue(result["db_review_items_present"])
        self.assertEqual(len(fake.decisions), 1)

    def test_live_run_omitting_db_reason_codes_fails_closed_to_escalation(self):
        class FakeClient:
            def __init__(self):
                self.decisions = []
                self.escalations = []

            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "items": [load_queue()[0]],
                }

            def ai_decide(self, payload):
                self.decisions.append(payload)
                return {"coerced": False}

            def escalation_open(self, payload):
                self.escalations.append(payload)
                return {"escalation_id": 20}

        fake = FakeClient()
        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=fake)

        self.assertEqual(fake.decisions, [])
        self.assertEqual(len(fake.escalations), 1)
        self.assertFalse(result["db_reason_codes_present"])
        self.assertEqual(result["decision_calls"][0]["status"], "escalated")

    def test_live_phase_one_409_race_is_skip_not_failure(self):
        from photo_sweeper.xano_client import XanoRaceSkip

        class FakeClient:
            def queue(self, *, page=1, per_page=None, limit=None):
                return {
                    "settings": {"ai_auto_decide_enabled": True, "ai_escalate_below_confidence": 0.7},
                    "reason_codes": PHOTO_REASON_CODES,
                    "review_items": PHOTO_FALLBACK_REVIEW_ITEMS,
                    "items": [load_queue()[0]],
                }

            def ai_decide(self, payload):
                raise XanoRaceSkip("expected_current_status mismatch")

        result = run_once([], limit=1, photo_id=None, dry_run=False, force=False, model_fixture=None, xano_client=FakeClient())

        call = result["decision_calls"][0]
        self.assertEqual(call["status"], "race_skip")
        self.assertIs(call["skipped"], True)
        self.assertEqual(result["summary"]["race_skips"], 1)
        self.assertEqual(result["summary"]["failures"], [{"photo_id": 101, "status": "race_skip"}])


class JarvisReportingTests(unittest.TestCase):
    def test_initial_sweeper_report_formats_required_stats_without_photo_payloads(self):
        result = run_once(load_queue(), limit=5, photo_id=None, dry_run=True, force=False, model_fixture=None)

        message = format_report("initial_sweeper", result)

        self.assertIn("initial sweeper STATUS", message)
        self.assertIn("photos_scanned=5", message)
        self.assertIn("auto_approved=0", message)
        self.assertIn("auto_rejected=0", message)
        self.assertIn("agent_review=1", message)
        self.assertIn("human_admin_review=3", message)
        self.assertIn("fallback_usage=0", message)
        self.assertIn("next_scheduled_run=unknown", message)
        self.assertNotIn("user_email", message)
        self.assertNotIn("selected_photo_ids", message)

    def test_routine_report_is_suppressed_without_opt_in(self):
        posts = []
        result = run_once(load_queue(), limit=1, photo_id=None, dry_run=True, force=False, model_fixture=None)

        report = maybe_report_run("initial_sweeper", result, env={"JARVIS_REPORT_CHANNEL": "148"}, poster=lambda channel, message: posts.append((channel, message)))

        self.assertEqual(report["reason"], "routine_suppressed")
        self.assertEqual(posts, [])

    def test_report_posts_when_enabled(self):
        posts = []
        result = run_once(load_queue(), limit=1, photo_id=None, dry_run=True, force=False, model_fixture=None)

        report = maybe_report_run("initial_sweeper", result, enabled=True, env={"JARVIS_REPORT_CHANNEL": "148"}, poster=lambda channel, message: posts.append((channel, message)))

        self.assertTrue(report["posted"])
        self.assertEqual(posts[0][0], "148")
        self.assertIn("photos_scanned=1", posts[0][1])

    def test_escalation_or_failure_posts_as_urgent_without_routine_opt_in(self):
        posts = []
        result = {"summary": {"dry_run": False, "photos_scanned": 1, "escalations_opened": 1, "failures": [], "write_counts": {}}}

        report = maybe_report_run("initial_sweeper", result, env={"JARVIS_REPORT_CHANNEL": "148"}, poster=lambda channel, message: posts.append((channel, message)))

        self.assertTrue(report["posted"])
        self.assertTrue(report["urgent"])
        self.assertIn("initial sweeper ALERT", posts[0][1])
        self.assertIn("escalations_opened=1", posts[0][1])

    def test_agent_review_report_includes_polling_and_decision_stats(self):
        summary = {
            "run_id": "run-7",
            "route": "agent_review",
            "polled": 3,
            "acked": 2,
            "race_skips": 0,
            "deferred": 1,
            "decisions": [{"decision": "approved"}, {"decision": "rejected"}, {"status": "deferred"}],
            "audit": {"posted": True},
        }

        message = format_report("agent_review", summary, urgent=True)

        self.assertIn("agent-review sweeper ALERT", message)
        self.assertIn("polled=3", message)
        self.assertIn("acked=2", message)
        self.assertIn("deferred=1", message)
        self.assertIn("approved:1", message)
        self.assertIn("rejected:1", message)
        self.assertIn("audit_posted=true", message)

    def test_agent_review_audit_failure_is_urgent(self):
        posts = []
        summary = {
            "run_id": "run-8",
            "route": "agent_review",
            "polled": 5,
            "acked": 0,
            "race_skips": 0,
            "deferred": 0,
            "decisions": [],
            "audit": {"posted": False, "failed": True, "error": "HTTPError"},
        }
        report = maybe_report_run(
            "agent_review", summary,
            env={"JARVIS_REPORT_CHANNEL": "148"},
            poster=lambda channel, message: posts.append((channel, message)),
        )
        self.assertTrue(report["posted"])
        self.assertTrue(report["urgent"])
        self.assertIn("ALERT", posts[0][1])

    def test_empty_env_dict_is_not_replaced_by_host_env(self):
        posts = []
        result = {"summary": {"dry_run": False, "photos_scanned": 1, "escalations_opened": 0, "failures": [], "write_counts": {}}}
        # pass empty env — destination lookup must not fall back to os.environ
        report = maybe_report_run(
            "initial_sweeper", result,
            env={},
            poster=lambda channel, message: posts.append((channel, message)),
        )
        self.assertEqual(report["reason"], "destination_not_configured")
        self.assertEqual(posts, [])


class AgentReviewLoopTests(unittest.TestCase):
    def test_agent_review_polls_agent_review_route_and_acks_with_idempotency(self):
        fake = FakeAgentReviewClient([
            {
                "id": 501,
                "photo_id": 101,
                "reason_code": "unclear_subject",
                "last_ai_assessment": {"recommended_decision": "approve_recommendation", "confidence": 0.91, "reason_code": "unclear_subject"},
            }
        ])

        result = run_agent_review_once(fake, run_id="run-1")

        self.assertEqual(fake.polls, [{"status": "open", "route": "agent_review"}])
        self.assertEqual(result["acked"], 1)
        self.assertEqual(fake.acks[0]["status"], "approved")
        self.assertEqual(fake.acks[0]["expected_current_status"], "open")
        self.assertEqual(fake.acks[0]["expected_route"], "agent_review")
        self.assertEqual(fake.acks[0]["idempotency_key"], "run-1:501")

    def test_agent_review_409_is_skip_not_error(self):
        fake = FakeAgentReviewClient([{"id": 502, "photo_id": 102}], race_skip=True)

        result = run_agent_review_once(fake, run_id="run-2")

        self.assertEqual(result["race_skips"], 1)
        self.assertEqual(result["decisions"][0]["status"], "race_skip")
        self.assertIs(result["decisions"][0]["skipped"], True)

    def test_agent_review_empty_discord_channel_still_acks_without_post(self):
        fake = FakeAgentReviewClient([{"id": 503, "photo_id": 103}], settings={"agent_review_discord_channel_id": ""})
        posts = []

        result = run_agent_review_once(fake, run_id="run-3", audit_poster=lambda channel, message: posts.append((channel, message)))

        self.assertEqual(result["acked"], 1)
        self.assertEqual(posts, [])
        self.assertEqual(result["audit"], {"posted": False, "reason": "channel_not_configured"})

    def test_agent_review_discord_failure_does_not_rollback_ack(self):
        fake = FakeAgentReviewClient([{"id": 504, "photo_id": 104}], settings={"agent_review_discord_channel_id": "148"})

        result = run_agent_review_once(fake, run_id="run-4", audit_poster=lambda channel, message: (_ for _ in ()).throw(RuntimeError("discord down")))

        self.assertEqual(len(fake.acks), 1)
        self.assertEqual(result["acked"], 1)
        self.assertTrue(result["audit"]["failed"])

    def test_agent_review_disabled_does_not_poll_queue(self):
        fake = FakeAgentReviewClient([{"id": 505, "photo_id": 105}], settings={"agent_review_enabled": False})

        result = run_agent_review_once(fake, run_id="run-5")

        self.assertEqual(result["polled"], 0)
        self.assertEqual(fake.polls, [])
        self.assertEqual(fake.acks, [])

    def test_agent_review_5xx_retries_then_defers(self):
        fake = FakeAgentReviewClient([{"id": 506, "photo_id": 106}], server_errors=4)
        sleeps = []

        result = run_agent_review_once(fake, run_id="run-6", sleeper=sleeps.append)

        self.assertEqual(result["deferred"], 1)
        self.assertEqual(sleeps, [1, 2, 4])
        self.assertEqual(len(fake.acks), 4)

    def test_cli_agent_review_lock_held_returns_tempfail_before_xano_env(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            lock_path = Path(tmpdir) / "photo-sweeper-agent-review.lock"
            with RunLock(lock_path):
                proc = run_cli("--once", "--live-write", "--agent-review", "--lock-file", str(lock_path), "--limit", "1", check=False)

        self.assertEqual(proc.returncode, 75)
        self.assertIn("lock already held", proc.stderr)


class FakeAgentReviewClient:
    def __init__(self, rows, *, settings=None, race_skip=False, server_errors=0):
        self.rows = rows
        self.settings = {"agent_review_enabled": True, **(settings or {})}
        self.race_skip = race_skip
        self.server_errors = server_errors
        self.polls = []
        self.acks = []

    def moderation_settings(self):
        return {"settings": self.settings}

    def escalations(self, *, status="open", route=None):
        self.polls.append({"status": status, "route": route})
        return {"items": self.rows}

    def escalation_ack(self, payload):
        self.acks.append(payload)
        if self.race_skip:
            from photo_sweeper.xano_client import XanoRaceSkip

            raise XanoRaceSkip("expected_current_status mismatch")
        if len(self.acks) <= self.server_errors:
            raise XanoClientError("Xano POST /photos/escalations/ack returned HTTP 500", status_code=500)
        return {"ok": True}


if __name__ == "__main__":
    unittest.main()
