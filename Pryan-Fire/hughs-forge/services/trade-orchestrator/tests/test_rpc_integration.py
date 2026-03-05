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
    def test_quote_failure_returns_error(self, mock_httpx):
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
        assert result["error"] == "quote_failed"

    @patch("core.rpc_integration.httpx")
    def test_swap_tx_failure_returns_error(self, mock_httpx):
        # Quote succeeds
        quote_resp = MagicMock()
        quote_resp.status_code = 200
        quote_resp.json.return_value = {"routes": []}

        # Swap fails
        swap_resp = MagicMock()
        swap_resp.status_code = 500
        swap_resp.text = "Swap error"

        mock_httpx.get.return_value = quote_resp
        mock_httpx.post.return_value = swap_resp

        result = self.rpc.execute_jupiter_trade(
            "So11111111111111111111111111111111111111112",
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            1.0,
        )
        assert result["success"] is False
        assert result["error"] == "swap_tx_failed"


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
