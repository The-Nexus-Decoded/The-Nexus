import json
import subprocess
import sys
import unittest
from unittest import mock

from photo_sweeper.deterministic import inspect_image
from photo_sweeper.model import MiniMaxCLIAdapter, normalize_minimax_description, normalize_model_result
from photo_sweeper.queue import load_queue, normalize_item
from photo_sweeper.runner import run_once


def run_cli(*args):
    proc = subprocess.run(
        [sys.executable, "-m", "photo_sweeper", *args],
        check=True,
        text=True,
        capture_output=True,
    )
    return proc.stdout


class PhotoSweeperSmokeTests(unittest.TestCase):
    def test_cli_limit_works_and_redacts_email(self):
        output = run_cli("--once", "--dry-run", "--limit", "2")
        payload = json.loads(output)

        self.assertIs(payload["dry_run"], True)
        self.assertIs(payload["write_enabled"], False)
        self.assertEqual(payload["photos_scanned"], 2)
        self.assertNotIn("user_email", output)

    def test_photo_id_force_does_not_enable_writes(self):
        output = run_cli("--once", "--photo-id", "101", "--force")
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
        output = run_cli("--once", "--photo-id", "110", "--dry-run")
        payload = json.loads(output)
        photo = payload["photos"][0]

        self.assertEqual(photo["normalized_result"]["reason_code"], "api_failure_fallback")
        self.assertEqual(photo["planned_action"], "manual_review")
        self.assertEqual(photo["model_path"]["vision_model_used"], "unavailable")
        self.assertEqual(photo["model_path"]["fallback_model"], "mock_failure_fallback")
        self.assertIs(photo["would_write_recommendation"], False)
        self.assertIs(photo["would_finalize_decision"], False)

    def test_clean_fixture_can_recommend_approve_without_final_decision_or_write(self):
        output = run_cli("--once", "--photo-id", "101", "--dry-run")
        payload = json.loads(output)
        photo = payload["photos"][0]

        self.assertEqual(photo["normalized_result"]["verdict"], "approve_recommendation")
        self.assertEqual(photo["recommended_decision"], "approve_recommendation")
        self.assertEqual(photo["planned_action"], "report_only")
        self.assertIs(photo["would_write_recommendation"], False)
        self.assertIs(photo["would_finalize_decision"], False)

    def test_normalizer_forbids_final_state_verdict_terms(self):
        approved = normalize_model_result({"verdict": "approved"}, default_model="fixture")
        rejected = normalize_model_result({"verdict": "rejected"}, default_model="fixture")

        self.assertEqual(approved["verdict"], "approve_recommendation")
        self.assertEqual(rejected["verdict"], "reject_recommendation")

    def test_queue_shape_prefers_photo_data_url_and_sanitizes_user_fields(self):
        item = normalize_item(
            {
                "id": 123,
                "users_id": 456,
                "PhotoUrl": "/vault/fallback.jpg",
                "PhotoData": {"url": "https://example.invalid/photo-data.jpg", "mime": "image/jpeg"},
                "user_name": "Do Not Log",
                "user_email": "do-not-log@example.invalid",
                "photostatus_id": 1,
            }
        )

        self.assertEqual(item["photo_id"], 123)
        self.assertEqual(item["source_field"], "PhotoData.url")
        self.assertEqual(item["photo_url"], "https://example.invalid/photo-data.jpg")
        self.assertNotIn("user_name", item)
        self.assertNotIn("user_email", item)
        self.assertNotIn("user_id", item)

    def test_remote_probe_uses_get_range_not_head(self):
        class FakeResponse:
            status = 206
            headers = {"Content-Range": "bytes 0-31/2048"}

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self, _size):
                return b"x" * 32

        seen = {}

        def fake_urlopen(request, timeout):
            seen["method"] = request.get_method()
            seen["range"] = request.headers.get("Range")
            seen["timeout"] = timeout
            return FakeResponse()

        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen):
            checks = inspect_image({"photo_url": "https://example.invalid/image.jpg"})

        self.assertEqual(seen["method"], "GET")
        self.assertEqual(seen["range"], "bytes=0-31")
        self.assertIs(checks["exists"], True)
        self.assertEqual(checks["remote_probe_method"], "GET_RANGE")

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
