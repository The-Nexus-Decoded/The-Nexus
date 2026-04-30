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
    normalize_minimax_description,
    normalize_model_result,
)
from photo_sweeper.moderation_contract import REASON_PROMPT_ROWS, XANO_CANONICAL_REASON_CODES
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
            if item["normalized_result"]["reason_code"]
            in {"sexual_content", "nudity", "pornographic_explicit", "inappropriate_photos"}
        ]

        self.assertEqual({item["planned_action"] for item in explicit}, {"escalate"})
        self.assertEqual({item["recommended_decision"] for item in explicit}, {"reject_recommendation"})
        self.assertTrue(all(item["would_finalize_decision"] is False for item in explicit))
        self.assertTrue(all(item["would_write_recommendation"] is False for item in explicit))

    def test_mock_manifest_covers_required_categories_offline(self):
        queue = load_queue()
        result = run_once(queue, limit=None, photo_id=None, dry_run=True, force=False, model_fixture=None)
        reasons = {item["normalized_result"]["reason_code"] for item in result["photos"]}

        self.assertGreaterEqual(
            reasons,
            {
                "clean_profile_style",
                "ai_generated_image",
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
        self.assertTrue(all(item["would_finalize_decision"] is False for item in result["photos"]))
        self.assertTrue(all(item["would_write_recommendation"] is False for item in result["photos"]))

    def test_api_failure_fallback_becomes_manual_review_without_writes(self):
        output = run_cli("--once", "--photo-id", "110", "--dry-run").stdout
        payload = json.loads(output)
        photo = payload["photos"][0]

        self.assertEqual(photo["normalized_result"]["reason_code"], "api_failure_fallback")
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
        self.assertEqual(result["photos"][0]["normalized_result"]["reason_code"], "api_auth_unavailable")

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
        self.assertIn("Only approve clean_profile_style when all other checks pass", instructions)
        for reason_code, what_we_check, prompt_description in REASON_PROMPT_ROWS:
            self.assertIn(reason_code, instructions)
            self.assertIn(what_we_check, instructions)
            self.assertIn(prompt_description, instructions)
        for reason_code in XANO_CANONICAL_REASON_CODES:
            self.assertIn(reason_code, instructions)

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
        self.assertEqual(result["reason_code"], "low_quality_or_unusable")
        self.assertEqual(result["vision_model_used"], "minimax/MiniMax-VL-01 + parser")


if __name__ == "__main__":
    unittest.main()
