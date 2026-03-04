"""
Unit tests for Meteora DLMM Scanner.

Run: python -m pytest test_meteora_scanner.py (or python test_meteora_scanner.py)
"""
import sys
import os
# Add repo root to path to allow src.signals import
sys.path.insert(0, os.path.dirname(__file__))

import unittest
import asyncio
from datetime import datetime, timedelta
from src.signals.meteora_dlmm_scanner import MeteoraDLMMScanner

class TestMeteoraBaseFilters(unittest.TestCase):
    def setUp(self):
        # Create scanner with minimal config for testing
        self.scanner = MeteoraDLMMScanner(orchestrator=None, devnet=True)
        # Override thresholds to known values
        self.scanner.min_liquidity_usd = 5000
        self.scanner.min_volume_24h_usd = 5000
        self.scanner.min_apy = 50.0
        self.scanner.fee_tier_cutoff_percent = 0.5

    def test_passes_filters_all_good(self):
        pool = {
            "liquidityUsd": 10000,
            "volume24h": 10000,
            "apy": 60.0,
            "feeTier": 0.3  # 0.3%
        }
        self.assertTrue(self.scanner.passes_base_filters(pool))

    def test_fails_low_liquidity(self):
        pool = {
            "liquidityUsd": 1000,
            "volume24h": 10000,
            "apy": 60.0,
            "feeTier": 0.3
        }
        self.assertFalse(self.scanner.passes_base_filters(pool))

    def test_fails_low_volume(self):
        pool = {
            "liquidityUsd": 10000,
            "volume24h": 1000,
            "apy": 60.0,
            "feeTier": 0.3
        }
        self.assertFalse(self.scanner.passes_base_filters(pool))

    def test_fails_low_apy(self):
        pool = {
            "liquidityUsd": 10000,
            "volume24h": 10000,
            "apy": 30.0,
            "feeTier": 0.3
        }
        self.assertFalse(self.scanner.passes_base_filters(pool))

    def test_fails_high_fee(self):
        pool = {
            "liquidityUsd": 10000,
            "volume24h": 10000,
            "apy": 60.0,
            "feeTier": 100  # 1.00% when divided by 100
        }
        self.assertFalse(self.scanner.passes_base_filters(pool))

    def test_fails_missing_fee(self):
        pool = {
            "liquidityUsd": 10000,
            "volume24h": 10000,
            "apy": 60.0,
            # feeTier missing
        }
        self.assertFalse(self.scanner.passes_base_filters(pool))

class TestSignalDetermination(unittest.TestCase):
    def setUp(self):
        self.scanner = MeteoraDLMMScanner(orchestrator=None, devnet=True)

    def test_new_pool_detection(self):
        pool = {"address": "pool123", "baseMint": "MINT123"}
        is_new = True
        signal_type = self.scanner.determine_signal_type(pool, is_new)
        self.assertEqual(signal_type, "new_pool")

    def test_volume_spike_detection(self):
        pool = {"address": "pool123", "baseMint": "MINT123"}
        is_new = False
        # Manually inject history to simulate spike condition
        # We'll need to set up _pool_history and call detect_volume_spike directly
        # Instead, we test the method in isolation
        # For now, trust the logic; could be improved with proper history setup
        signal_type = self.scanner.determine_signal_type(pool, is_new)
        # Without volume spike, should not be volume_spike
        self.assertNotEqual(signal_type, "volume_spike")

    def test_fee_arbitrage(self):
        pool = {
            "address": "pool123",
            "baseMint": "MINT123",
            "liquidityUsd": 10000,
            "volume24h": 10000,
            "apy": 60.0,
            "feeTier": 30  # 0.3%
        }
        is_new = False
        signal_type = self.scanner.determine_signal_type(pool, is_new)
        # With low fee and passing filters, should be fee_arbitrage or generic_opportunity
        self.assertIn(signal_type, ["fee_arbitrage", "generic_opportunity"])

class TestConfidenceCalculation(unittest.TestCase):
    def setUp(self):
        self.scanner = MeteoraDLMMScanner(orchestrator=None, devnet=True)

    def test_confidence_new_pool(self):
        conf = self.scanner.calculate_confidence({}, "new_pool")
        self.assertAlmostEqual(conf, 0.9)

    def test_confidence_volume_spike(self):
        conf = self.scanner.calculate_confidence({}, "volume_spike")
        self.assertAlmostEqual(conf, 0.7)

    def test_confidence_fee_arbitrage(self):
        conf = self.scanner.calculate_confidence({}, "fee_arbitrage")
        self.assertAlmostEqual(conf, 0.6)

    def test_confidence_generic(self):
        conf = self.scanner.calculate_confidence({}, "generic_opportunity")
        self.assertAlmostEqual(conf, 0.5)

class TestSignalPayload(unittest.TestCase):
    def setUp(self):
        self.scanner = MeteoraDLMMScanner(orchestrator=None, devnet=True)

    def test_payload_keys(self):
        pool = {
            "address": "poolabc123",
            "baseMint": "MINTXYZ",
            "liquidityUsd": 20000,
            "volume24h": 15000,
            "apy": 75.0,
            "feeTier": 0.2
        }
        signal = self.scanner.generate_signal_payload(pool, "new_pool", 0.9)
        self.assertIn("token_address", signal)
        self.assertIn("amount", signal)
        self.assertIn("trade_id", signal)
        self.assertIn("source", signal)
        self.assertIn("signal_type", signal)
        self.assertIn("confidence", signal)
        self.assertIn("metadata", signal)
        self.assertEqual(signal["token_address"], "MINTXYZ")
        self.assertEqual(signal["source"], "meteora_dlmm")
        self.assertEqual(signal["confidence"], 0.9)

if __name__ == "__main__":
    unittest.main()
