import json
import subprocess
import sys
import unittest

from photo_sweeper.queue import load_queue
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

    def test_explicit_categories_are_recommendations_not_final_decisions(self):
        queue = load_queue()
        result = run_once(queue, limit=None, photo_id=None, dry_run=True, force=False, model_fixture=None)
        explicit = [
            item
            for item in result["photos"]
            if item["normalized_result"]["reason_code"]
            in {"sexual_content", "nudity", "inappropriate_photos"}
        ]

        self.assertEqual({item["planned_action"] for item in explicit}, {"escalate"})
        self.assertEqual({item["recommended_decision"] for item in explicit}, {"reject"})
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
                "contact_info_or_ad",
                "low_quality_or_unusable",
                "manual_review_needed",
            },
        )
        self.assertTrue(all(item["would_finalize_decision"] is False for item in result["photos"]))
        self.assertTrue(all(item["would_write_recommendation"] is False for item in result["photos"]))

    def test_clean_fixture_can_recommend_approve_without_final_decision_or_write(self):
        output = run_cli("--once", "--photo-id", "101", "--dry-run")
        payload = json.loads(output)
        photo = payload["photos"][0]

        self.assertEqual(photo["normalized_result"]["verdict"], "approved")
        self.assertEqual(photo["recommended_decision"], "approve")
        self.assertEqual(photo["planned_action"], "report_only")
        self.assertIs(photo["would_write_recommendation"], False)
        self.assertIs(photo["would_finalize_decision"], False)


if __name__ == "__main__":
    unittest.main()
