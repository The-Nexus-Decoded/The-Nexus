"""
Unit tests for RpcIntegrator: quote fetching, swap transaction with ALT addresses, and structured returns.
"""

import unittest
from unittest.mock import patch, MagicMock, ANY
import json
from datetime import datetime
from core.rpc_integration import RpcIntegrator
from solders.keypair import Keypair
from solders.publickey import Pubkey

class TestRpcIntegrator(unittest.TestCase):
    def setUp(self):
        # Generate a random wallet for testing
        self.test_wallet = Keypair()
        self.dry_run = False

    @patch('core.rpc_integration.httpx.get')
    def test_fetch_quote_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "inputMint": "So111...",
            "outputMint": "EPjF...",
            "inAmount": "1000000000",
            "outAmount": "17000000",
            "slippageBps": 50
        }
        mock_get.return_value = mock_response

        integrator = RpcIntegrator(dry_run=True)
        # Override client to avoid RPC calls
        integrator.client = None
        quote = integrator._fetch_quote(
            input_mint="So111...",
            output_mint="EPjF...",
            amount=1000000000,
            user_pubkey=str(self.test_wallet.pubkey())
        )
        self.assertIsNotNone(quote)
        self.assertEqual(quote["outAmount"], "17000000")

    @patch('core.rpc_integration.httpx.post')
    def test_fetch_swap_transaction_returns_alt_addresses(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "swapTransaction": "AQAAAAAAAA...",
            "addressLookupTableAddresses": ["GxS6FiQ9RbErBB48mE34U4Jv13MdEJov4R1e5KgFzRFY"]
        }
        mock_post.return_value = mock_response

        integrator = RpcIntegrator(dry_run=True)
        tx_b64, alt_addresses = integrator._fetch_swap_transaction(
            quote={"dummy": "quote"},
            user_public_key=str(self.test_wallet.pubkey())
        )
        self.assertIsNotNone(tx_b64)
        self.assertEqual(len(alt_addresses), 1)
        self.assertEqual(alt_addresses[0], "GxS6FiQ9RbErBB48mE34U4Jv13MdEJov4R1e5KgFzRFY")

    @patch('core.rpc_integration.httpx.post')
    def test_fetch_swap_transaction_no_alt_returns_empty_list(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "swapTransaction": "AQAAAAAAAA..."
        }
        mock_post.return_value = mock_response

        integrator = RpcIntegrator(dry_run=True)
        tx_b64, alt_addresses = integrator._fetch_swap_transaction(
            quote={"dummy": "quote"},
            user_public_key=str(self.test_wallet.pubkey())
        )
        self.assertIsNotNone(tx_b64)
        self.assertEqual(alt_addresses, [])

    @patch.object(RpcIntegrator, '_fetch_quote')
    @patch.object(RpcIntegrator, '_fetch_swap_transaction')
    def test_execute_jupiter_trade_returns_structured_dict_on_success_versioned(self, mock_fetch_swap, mock_fetch_quote):
        # Mock quote and swap response
        mock_fetch_quote.return_value = {"outAmount": "17000000", "inAmount": "1000000000"}
        mock_fetch_swap.return_value = ("AQAAAAAAAA...", ["GxS6..."])
        integrator = RpcIntegrator(dry_run=True)
        integrator.client = MagicMock()

        # Mock the send_raw_transaction to return a signature
        mock_result = MagicMock()
        mock_result.value = "5kx7ABC123"
        integrator.client.send_raw_transaction.return_value = mock_result

        result = integrator.execute_jupiter_trade("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 0.001)
        self.assertTrue(result["success"])
        self.assertEqual(result["tx_signature"], "5kx7ABC123")
        self.assertIsNotNone(result["entry_price"])
        self.assertIsNotNone(result["slippage_bps"])
        self.assertIsNone(result["error"])

    @patch.object(RpcIntegrator, '_fetch_quote')
    def test_execute_jupiter_trade_handles_quote_failure(self, mock_fetch_quote):
        mock_fetch_quote.return_value = None
        integrator = RpcIntegrator(dry_run=True)
        result = integrator.execute_jupiter_trade("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 0.001)
        self.assertFalse(result["success"])
        self.assertIn("quote", result["error"].lower())

    def test_dry_run_returns_mock_dict(self):
        integrator = RpcIntegrator(dry_run=True)
        result = integrator.execute_jupiter_trade("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 0.001)
        self.assertTrue(result["success"])
        self.assertEqual(result["tx_signature"], "dry_run_mock_signature")
        self.assertEqual(result["slippage_bps"], 0)

if __name__ == "__main__":
    unittest.main()
