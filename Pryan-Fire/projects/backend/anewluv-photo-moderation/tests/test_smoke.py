import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from photo_sweeper.model import (
    CodexOpenAIAdapter,
    MiniMaxCLIAdapter,
    _codex_oauth_request_payload,
    _image_path_to_data_url,
    _redact_provider_error_body,
)
from photo_sweeper.normalization import normalize_minimax_description, normalize_model_result
from photo_sweeper.moderation_contract import IMAGE_TYPE_CLASSIFICATIONS, WORKER_MODEL_CATEGORIES, XANO_CANONICAL_REASON_CODES
from photo_sweeper.policy import combine
from photo_sweeper.queue import load_queue
from photo_sweeper.runner import run_once


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

    def test_nudity_sexual_and_explicit_categories_are_recommendations_not_final_decisions(self):
        queue = load_queue()
        result = run_once(queue, limit=None, photo_id=None, dry_run=True, force=False, model_fixture=None)
        explicit = [
            item
            for item in result["photos"]
            if item["normalized_result"].get("raw_reason_code", item["normalized_result"]["reason_code"])
            in {"sexual_content", "nudity", "pornographic_explicit", "inappropriate_photos"}
        ]

        self.assertEqual({item["planned_action"] for item in explicit}, {"escalate"})
        self.assertEqual({item["recommended_decision"] for item in explicit}, {"reject_recommendation"})
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
                "sexual_content",
                "inappropriate_photos",
                "off_platform_contact",
                "manual_admin_decision",
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
        self.assertEqual(photo["planned_action"], "manual_review")
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
        self.assertEqual(reject["verdict"], "reject_recommendation")
        self.assertEqual(reject["normalization_applied"], "yes")
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
        result = normalize_model_result({"verdict": "review", "confidence": 0.91, "canonical_reason_code": "fake_profile", "detected_category": "ai_generated_or_synthetic", "unsafe_categories": []}, default_model="fixture")

        self.assertEqual(result["detected_category"], "ai_generated_or_synthetic")
        self.assertEqual(result["reason_code"], "fake_profile")

    def test_normalized_output_keeps_detected_category_and_canonical_reason(self):
        result = normalize_model_result({"verdict": "review", "confidence": 0.91, "reason_code": "ai_generated_or_synthetic", "unsafe_categories": []}, default_model="fixture")

        self.assertEqual(result["detected_category"], "ai_generated_or_synthetic")
        self.assertEqual(result["reason_code"], "fake_profile")

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

        self.assertEqual(result["planned_action"], "manual_review")
        self.assertEqual(result["would_write_recommendation"], False)
        self.assertEqual(result["would_finalize_decision"], False)

    def test_xano_canonical_reason_code_set_is_locked(self):
        self.assertEqual(
            XANO_CANONICAL_REASON_CODES,
            {
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
            },
        )

    def test_ai_generated_or_synthetic_requires_high_confidence_for_fake_profile(self):
        high = normalize_model_result({"verdict": "review", "confidence": 0.91, "reason_code": "ai_generated_or_synthetic", "unsafe_categories": []}, default_model="fixture")
        uncertain = normalize_model_result({"verdict": "review", "confidence": 0.79, "reason_code": "ai_generated_or_synthetic", "unsafe_categories": []}, default_model="fixture")

        self.assertEqual(high["detected_category"], "ai_generated_or_synthetic")
        self.assertEqual(high["reason_code"], "fake_profile")
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
            "not_a_profile_photo": "fake_profile",
            "celebrity_or_stock_photo": "fake_profile",
            "object_or_landscape_only": "fake_profile",
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
            "ai_generated_or_synthetic -> fake_profile if high confidence, otherwise review/manual_admin_decision",
            "explicit_adult_image -> reject/escalate",
            "low_quality_or_unusable -> review/reject",
            "underage_concern -> never approve; escalate/review",
            "money_request -> reject/escalate",
            "hate_or_harassment -> reject/escalate",
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
        self.assertIn("Confidence below 0.6", instructions)
        for reason_code in {
            "sexual_content",
            "nudity",
            "pornographic_explicit",
            "inappropriate_photos",
            "ai_generated_or_synthetic",
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


if __name__ == "__main__":
    unittest.main()
