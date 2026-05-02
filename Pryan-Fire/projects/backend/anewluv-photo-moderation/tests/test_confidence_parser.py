"""Tests for confidence_parser.py."""

import unittest
from photo_sweeper.confidence_parser import (
    confidence_from_text,
    expand_patterns_from_reason_codes,
    DEFAULT_PATTERNS,
)


SAMPLE_REASON_CODES = [
    {"code": "underage_concern", "label": "Underage concern", "severity": "high", "auto_reject_threshold": 0.95},
    {"code": "nudity_explicit", "label": "Explicit nudity", "severity": "high", "auto_reject_threshold": 0.90},
    {"code": "sexual_content", "label": "Sexual content", "severity": "high", "auto_reject_threshold": 0.88},
    {"code": "drug_use", "label": "Drug use", "severity": "medium", "auto_reject_threshold": 0.85},
    {"code": "money_request", "label": "Money request", "severity": "medium", "auto_reject_threshold": 0.80},
    {"code": "hate_symbols", "label": "Hate symbols", "severity": "high", "auto_reject_threshold": 0.95},
    {"code": "violence_credible", "label": "Credible violence", "severity": "high", "auto_reject_threshold": 0.92},
    {"code": "self_harm", "label": "Self-harm", "severity": "high", "auto_reject_threshold": 0.93},
    {"code": "ai_generated", "label": "AI-generated", "severity": "medium", "auto_reject_threshold": 0.90},
    {"code": "celebrity_or_stock_photo", "label": "Celebrity/stock photo", "severity": "low", "auto_reject_threshold": 0.0},
    {"code": "low_quality", "label": "Low quality", "severity": "low", "auto_reject_threshold": 0.0},
    {"code": "unclear_subject", "label": "Unclear subject", "severity": "low", "auto_reject_threshold": 0.0},
    {"code": "object_or_landscape_only", "label": "Object/landscape only", "severity": "low", "auto_reject_threshold": 0.0},
]


class TestConfidenceFromText(unittest.TestCase):
    def test_underage_concern_keywords(self):
        for text in [
            "image of a child in a park",
            "person appears to be under 18",
            "appears to be a minor",
            "possibly underage individual",
            "may be a minor",
        ]:
            conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
            self.assertEqual(code, "underage_concern", f"Failed on: {text}")
            self.assertGreaterEqual(conf, 0.90, f"Failed on: {text}")

    def test_nudity_explicit_keywords(self):
        for text in [
            "image contains explicit sexual content",
            "nude adult subject",
            "pornographic imagery",
            "sexually explicit",
        ]:
            conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
            self.assertEqual(code, "nudity_explicit", f"Failed on: {text}")
            self.assertGreaterEqual(conf, 0.85, f"Failed on: {text}")

    def test_drug_use_keywords(self):
        for text in [
            "person is using drugs visible drug paraphernalia",
            "white powder visible on surface",
            "needle and drug use visible",
        ]:
            conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
            self.assertEqual(code, "drug_use", f"Failed on: {text}")

    def test_strong_positive_language(self):
        for text in [
            "clearly adult subject appropriate clothing no safety concerns",
            "definitely a real person clearly visible face",
            "obviously appropriate profile photo no issues",
        ]:
            conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
            self.assertGreaterEqual(conf, 0.85, f"Failed on: {text}")
            self.assertIsNone(code, f"Failed on: {text}")

    def test_hedging_language_not_underage(self):
        """Hedging without underage keywords → 0.50."""
        for text in [
            "maybe an adult person in frame",
            "could be fully clothed but hard to confirm",
            "questionable composition",
        ]:
            conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
            self.assertGreaterEqual(conf, 0.45, f"Failed on: {text}")
            self.assertLessEqual(conf, 0.55, f"Failed on: {text}")

    def test_unmatched_has_content(self):
        text = "photo shows a person standing in a room with furniture visible"
        conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
        self.assertEqual(conf, 0.60)
        self.assertIsNone(code)

    def test_empty_text(self):
        for text in ["", "   ", "   \n\t  "]:
            conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
            self.assertEqual(conf, 0.0)
            self.assertIsNone(code)

    def test_garbage_text(self):
        # Fewer than 5 alpha chars → treated as garbage
        text = "123 456 789 !@#$ %%%"
        conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
        self.assertEqual(conf, 0.0)
        self.assertIsNone(code)

    def test_auto_reject_threshold_used_for_matches(self):
        text = "person appears to be under 18"
        conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
        self.assertEqual(code, "underage_concern")
        self.assertEqual(conf, 0.95)

    def test_code_with_zero_threshold_gets_default_090(self):
        text = "blurry pixelated low quality image"
        conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
        self.assertEqual(code, "low_quality")
        self.assertEqual(conf, 0.90)

    def test_severity_high_wins_over_medium(self):
        text = "child with drug paraphernalia visible"
        conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
        self.assertEqual(code, "underage_concern")

    def test_expand_patterns_from_reason_codes(self):
        custom_codes = [
            {
                "code": "new_category",
                "label": "New category",
                "severity": "medium",
                "auto_reject_threshold": 0.80,
                "patterns": ["unusual new pattern", "custom keyword"],
            }
        ]
        result = expand_patterns_from_reason_codes(custom_codes, DEFAULT_PATTERNS)
        self.assertIn("unusual new pattern", result["new_category"])
        self.assertIn("custom keyword", result["new_category"])
        self.assertIn("child", result["underage_concern"])

    def test_sexual_content_code(self):
        for text in [
            "sexual context detected",
            "sex activity visible",
            "intimate area visible in frame",
        ]:
            conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
            self.assertEqual(code, "sexual_content", f"Failed on: {text}")
            self.assertGreaterEqual(conf, 0.85)

    def test_self_harm_code(self):
        for text in [
            "person showing signs of self harm",
            "suicidal ideation visible",
            "self injury on arm",
        ]:
            conf, code = confidence_from_text(text, SAMPLE_REASON_CODES)
            self.assertEqual(code, "self_harm", f"Failed on: {text}")


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
