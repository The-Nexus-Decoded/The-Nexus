"""
Unit tests for discord_broadcaster rate limiting.
"""

import unittest
import time
import os
from unittest.mock import patch, MagicMock
from feed.discord_broadcaster import DiscordBroadcaster

class TestDiscordBroadcaster(unittest.TestCase):
    @patch.dict(os.environ, {"DISCORD_TRADE_ALERTS_WEBHOOK": "https://discord.com/api/webhooks/test"})
    def test_rate_limit_blocks_excess_messages(self):
        broadcaster = DiscordBroadcaster()
        # Mock the actual POST
        with patch('requests.post') as mock_post:
            # First 5 messages should be sent immediately (tokens available)
            for i in range(5):
                broadcaster.broadcast_trade_executed({"trade_id": f"t{i}"})
            self.assertEqual(mock_post.call_count, 5)

            # 6th message should be dropped due to rate limit
            mock_post.reset_mock()
            broadcaster.broadcast_trade_executed({"trade_id": "t6"})
            mock_post.assert_not_called()

    @patch.dict(os.environ, {"DISCORD_TRADE_ALERTS_WEBHOOK": "https://discord.com/api/webhooks/test"})
    def test_rate_limit_refills_over_time(self):
        broadcaster = DiscordBroadcaster()
        with patch('requests.post') as mock_post:
            # Send 5 messages to exhaust tokens
            for i in range(5):
                broadcaster.broadcast_trade_executed({"trade_id": f"t{i}"})
            self.assertEqual(mock_post.call_count, 5)

            # Wait for token refill (~12 seconds for 1 token)
            time.sleep(12.1)

            # Should be able to send 1 more
            mock_post.reset_mock()
            broadcaster.broadcast_trade_executed({"trade_id": "t6"})
            self.assertEqual(mock_post.call_count, 1)

if __name__ == "__main__":
    unittest.main()
