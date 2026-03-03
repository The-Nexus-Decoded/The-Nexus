"""
Unit tests for TradeStateManager enriched field handling.
"""

import unittest
import tempfile
import os
import json
from datetime import datetime
from state.state_manager import TradeStateManager

class TestTradeStateManager(unittest.TestCase):
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
        self.db_path = self.temp_db.name
        self.temp_db.close()
        self.manager = TradeStateManager(db_path=self.db_path)

    def tearDown(self):
        os.unlink(self.db_path)

    def test_save_and_get_trade_with_enriched_fields(self):
        trade_id = "test123"
        state = "EXECUTED"
        token = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        amount = 150.75
        data = {"source": " meteora", "confidence": 0.9}

        # Save with enriched fields
        self.manager.save_trade(
            trade_id=trade_id,
            state=state,
            token_address=token,
            amount=amount,
            data=data,
            entry_price=0.00123,
            exit_price=None,
            rejection_reason=None,
            route="JUPITER",
            tx_signature="5kx7ABC123",
            slippage_bps=25,
            fee_lamports=5000,
            executed_at=datetime.utcnow().isoformat()
        )

        # Retrieve
        trade = self.manager.get_trade(trade_id)
        self.assertIsNotNone(trade)
        self.assertEqual(trade["trade_id"], trade_id)
        self.assertEqual(trade["state"], state)
        self.assertEqual(trade["token_address"], token)
        self.assertEqual(trade["amount"], amount)
        self.assertEqual(trade["data"], data)
        self.assertEqual(trade["entry_price"], 0.00123)
        self.assertEqual(trade["route"], "JUPITER")
        self.assertEqual(trade["tx_signature"], "5kx7ABC123")
        self.assertEqual(trade["slippage_bps"], 25)
        self.assertEqual(trade["fee_lamports"], 5000)

    def test_save_trade_with_only_required_fields(self):
        trade_id = "minimal"
        self.manager.save_trade(
            trade_id=trade_id,
            state="SIGNAL_RECEIVED",
            token_address="token123",
            amount=10.0,
            data={}
        )
        trade = self.manager.get_trade(trade_id)
        self.assertIsNotNone(trade)
        self.assertIsNone(trade["entry_price"])
        self.assertIsNone(trade["route"])

    def test_update_existing_trade_preserves_other_enriched_fields(self):
        # Create a trade with some enriched fields
        self.manager.save_trade(
            trade_id="update_test",
            state="EXECUTING",
            token_address="token",
            amount=50.0,
            data={},
            route="JUPITER"
        )
        # Update with additional fields
        self.manager.save_trade(
            trade_id="update_test",
            state="EXECUTED",
            token_address="token",
            amount=50.0,
            data={"extra": "data"},
            entry_price=1.234,
            tx_signature="sig123"
        )
        trade = self.manager.get_trade("update_test")
        self.assertEqual(trade["state"], "EXECUTED")
        self.assertEqual(trade["entry_price"], 1.234)
        self.assertEqual(trade["tx_signature"], "sig123")
        # route should still be present from previous save
        self.assertEqual(trade["route"], "JUPITER")

if __name__ == "__main__":
    unittest.main()
