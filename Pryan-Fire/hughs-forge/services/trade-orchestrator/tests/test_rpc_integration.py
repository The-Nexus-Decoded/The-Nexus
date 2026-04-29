"""Tests for RpcIntegrator — Jupiter trade execution (ticket #212)."""

import json
import os
import base64
from unittest.mock import patch, MagicMock

import pytest

# Patch solders/solana imports before importing the module under test
# These libs may not be installed in the test environment

mock_keypair = MagicMock()
mock_keypair.pubkey.return_value = "FakePublicKey11111111111111111111111111111111"

mock_versioned_tx_cls = MagicMock()
mock_legacy_tx_cls = MagicMock()
mock_signature_cls = MagicMock()
mock_client_cls = MagicMock()

import sys
sys.modules.setdefault("solders", MagicMock())
sys.modules.setdefault("solders.keypair", MagicMock(Keypair=MagicMock(from_secret_key=MagicMock(return_value=mock_keypair))))
sys.modules.setdefault("solders.transaction", MagicMock(VersionedTransaction=mock_versioned_tx_cls, Transaction=mock_legacy_tx_cls))
sys.modules.setdefault("solders.signature", MagicMock(Signature=mock_signature_cls))
sys.modules.setdefault("solana", MagicMock())
sys.modules.setdefault("solana.rpc", MagicMock())
sys.modules.setdefault("solana.rpc.api", MagicMock(Client=mock_client_cls))
sys.modules.setdefault("solana.rpc.types", MagicMock())
sys.modules.setdefault("solana.rpc.commitment", MagicMock())

# Now safe to import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
import core.rpc_integration as rpc_module
from core.rpc_integration import RpcIntegrator, TX_CONFIRM_TIMEOUT


class TestDryRunMode:
    """Verify dry_run mode skips wallet and trade execution."""

    def test_init_dry_run_no_wallet(self):
        rpc = RpcIntegrator(dry_run=True)
        assert rpc.dry_run is True
        assert rpc.wallet is None

    def test_execute_trade_returns_dry_run_error(self):
        rpc = RpcIntegrator(dry_run=True)
        result = rpc.execute_jupiter_trade(
            input_mint="So11111111111111111111111111111111111111112",
            output_mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            amount=1.0,
        )
        assert result["success"] is False
        assert result["error"] == "dry_run"
        assert result["signature"] is None

    @patch("core.rpc_integration.httpx")
    def test_dry_run_never_signs_or_executes(self, mock_httpx, monkeypatch):
        signed = {"called": False}

        class FailIfUsedTransaction:
            @staticmethod
            def from_bytes(_tx_bytes):
                signed["called"] = True
                raise AssertionError("dry-run must not deserialize/sign transactions")

        monkeypatch.setattr(rpc_module, "VersionedTransaction", FailIfUsedTransaction)
        rpc = RpcIntegrator(dry_run=True)

        result = rpc.execute_jupiter_trade(
            input_mint="So11111111111111111111111111111111111111112",
            output_mint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            amount=1.0,
        )

        assert result == {"success": False, "signature": None, "error": "dry_run"}
        assert signed["called"] is False
        assert mock_httpx.get.called is False
        assert mock_httpx.post.called is False


class TestWalletLoading:
    """Verify wallet loading behaviour."""

    def test_init_missing_wallet_raises(self, tmp_path):
        os.environ["TRADING_WALLET_PATH"] = str(tmp_path / "nonexistent.json")
        with pytest.raises(FileNotFoundError):
            RpcIntegrator(dry_run=False)
        del os.environ["TRADING_WALLET_PATH"]

    def test_init_valid_wallet(self, tmp_path):
        wallet_file = tmp_path / "wallet.json"
        wallet_file.write_text(json.dumps(list(range(64))))
        os.environ["TRADING_WALLET_PATH"] = str(wallet_file)
        rpc = RpcIntegrator(dry_run=False)
        assert rpc.wallet is not None
        del os.environ["TRADING_WALLET_PATH"]


class TestExecuteJupiterTrade:
    """Verify trade execution flow."""

    def setup_method(self):
        self.rpc = RpcIntegrator(dry_run=True)
        # Override dry_run and wallet for trade tests
        self.rpc.dry_run = False
        self.rpc.wallet = mock_keypair

    def test_no_wallet_returns_error(self):
        self.rpc.wallet = None
        result = self.rpc.execute_jupiter_trade("A", "B", 1.0)
        assert result["success"] is False
        assert result["error"] == "no_wallet"

    @patch("core.rpc_integration.httpx")
    def test_ultra_order_failure_returns_error(self, mock_httpx):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.text = "Internal Server Error"
        mock_httpx.get.return_value = mock_resp

        result = self.rpc.execute_jupiter_trade(
            "So11111111111111111111111111111111111111112",
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            1.0,
        )
        assert result["success"] is False
        assert result["error"] == "order_failed"

    @patch("core.rpc_integration.httpx")
    def test_invalid_ultra_order_returns_error(self, mock_httpx):
        # Ultra order succeeds but is malformed
        order_resp = MagicMock()
        order_resp.status_code = 200
        order_resp.json.return_value = {"routes": []}

        mock_httpx.get.return_value = order_resp

        result = self.rpc.execute_jupiter_trade(
            "So11111111111111111111111111111111111111112",
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            1.0,
        )
        assert result["success"] is False
        assert result["error"] == "invalid_order_response"

    def test_ultra_order_missing_transaction_fails_closed(self, monkeypatch):
        self.rpc._fetch_ultra_order = lambda *_: {"requestId": "req-123"}
        self.rpc._execute_ultra_order = lambda *_: pytest.fail("must not execute malformed Ultra order")

        result = self.rpc.execute_jupiter_trade("A", "B", 1.0)

        assert result["success"] is False
        assert result["error"] == "invalid_order_response"

    def test_ultra_order_missing_request_id_fails_closed(self, monkeypatch):
        tx_b64 = base64.b64encode(b"unsigned-tx").decode()
        self.rpc._fetch_ultra_order = lambda *_: {"transaction": tx_b64}
        self.rpc._execute_ultra_order = lambda *_: pytest.fail("must not execute malformed Ultra order")

        result = self.rpc.execute_jupiter_trade("A", "B", 1.0)

        assert result["success"] is False
        assert result["error"] == "invalid_order_response"

    def test_ultra_order_malformed_transaction_fails_closed(self, monkeypatch):
        self.rpc._fetch_ultra_order = lambda *_: {"transaction": "not-base64!!!", "requestId": "req-123"}
        self.rpc._execute_ultra_order = lambda *_: pytest.fail("must not execute malformed Ultra transaction")

        result = self.rpc.execute_jupiter_trade("A", "B", 1.0)

        assert result["success"] is False
        assert result["error"] == "invalid_order_transaction"

    def test_ultra_execute_uses_signed_transaction_and_request_id(self, monkeypatch):
        calls = {}

        class FakeUnsignedTransaction:
            message = "message-to-sign"

        class FakeVersionedTransaction:
            def __init__(self, message=None, signers=None):
                self.message = message
                self.signers = signers

            @staticmethod
            def from_bytes(tx_bytes):
                calls["decoded"] = tx_bytes
                return FakeUnsignedTransaction()

        tx_b64 = base64.b64encode(b"unsigned-tx").decode()
        monkeypatch.setattr(rpc_module, "VersionedTransaction", FakeVersionedTransaction)
        self.rpc._fetch_ultra_order = lambda *_: {"transaction": tx_b64, "requestId": "req-123"}

        def fake_execute(signed_tx, request_id):
            calls["signed_tx"] = signed_tx
            calls["request_id"] = request_id
            return {"status": "Success", "signature": "sig123"}

        self.rpc._execute_ultra_order = fake_execute

        result = self.rpc.execute_jupiter_trade("A", "B", 1.0)

        assert result == {"success": True, "signature": "sig123", "error": None}
        assert calls["decoded"] == b"unsigned-tx"
        assert calls["request_id"] == "req-123"
        assert calls["signed_tx"].message == "message-to-sign"
        assert calls["signed_tx"].signers == [mock_keypair]


class TestReturnSignature:
    """Verify the return dict structure."""

    def test_return_dict_keys(self):
        rpc = RpcIntegrator(dry_run=True)
        result = rpc.execute_jupiter_trade("A", "B", 1.0)
        assert "success" in result
        assert "signature" in result
        assert "error" in result


class TestParameterization:
    """Verify parameterized mints and decimals."""

    def test_custom_decimals(self):
        rpc = RpcIntegrator(dry_run=True)
        # Should not raise with custom decimals
        result = rpc.execute_jupiter_trade(
            input_mint="A",
            output_mint="B",
            amount=1.0,
            decimals=6,
            slippage_bps=100,
        )
        assert result["error"] == "dry_run"


class TestConstants:
    def test_confirm_timeout_value(self):
        assert TX_CONFIRM_TIMEOUT == 30
