from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from crypto_ops_api.facade import build_app_payloads, persist_validation_result


class CryptoOpsFacadeTest(unittest.TestCase):
    def test_required_read_only_endpoints_exist(self) -> None:
        payloads = build_app_payloads()
        required = {
            "/api/crypto/health",
            "/api/crypto/portfolio",
            "/api/crypto/positions/dlmm",
            "/api/crypto/positions/monitor",
            "/api/crypto/close/state",
            "/api/crypto/sniper/status",
            "/api/crypto/sniper/candidates",
            "/api/crypto/pools/top",
            "/api/crypto/risk/feed",
            "/api/crypto/kill-switch",
            "/api/crypto/validation/prs",
            "/api/crypto-ops/summary.json",
        }
        self.assertTrue(required.issubset(payloads))
        self.assertEqual(payloads["/api/crypto/health"]["liveExecution"], "disabled")
        self.assertFalse(payloads["/api/crypto/kill-switch"]["liveTrading"])

    def test_fixture_never_claims_submitted_transactions(self) -> None:
        payloads = build_app_payloads()
        positions = payloads["/api/crypto/positions/dlmm"]["positions"]
        self.assertTrue(all(position["lastTx"] == "none submitted" for position in positions))
        close_state = payloads["/api/crypto/close/state"]
        self.assertEqual(close_state["txStatus"], "none submitted")

    def test_validation_result_persistence_allows_evidence_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "validation.jsonl")
            record = persist_validation_result(
                "296",
                {"result": "passed", "evidence": "screen reviewed", "tester": "Hugh"},
                path,
            )
            self.assertEqual(record["liveExecution"], "disabled")
            saved = json.loads(Path(path).read_text(encoding="utf-8"))
            self.assertEqual(saved["id"], "296")

    def test_validation_result_rejects_trading_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = str(Path(tmp) / "validation.jsonl")
            with self.assertRaises(ValueError):
                persist_validation_result("296", {"result": "passed", "trade": "SOL/USDC"}, path)


if __name__ == "__main__":
    unittest.main()
