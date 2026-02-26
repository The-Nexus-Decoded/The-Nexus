import unittest
from main import RiskManager

class TestRiskManager(unittest.TestCase):
    def setUp(self):
        self.rm = RiskManager(daily_loss_limit=-500.0, max_trade_size=50.0)

    def test_initialization(self):
        self.assertEqual(self.rm.daily_loss_limit, -500.0)
        self.assertEqual(self.rm.max_trade_size, 50.0)
        self.assertFalse(self.rm.circuit_breaker_active)

    def test_check_strategy_risk(self):
        # Conservative strategy should pass even in HIGH volatility
        self.assertTrue(self.rm.check_strategy_risk("Spot", "HIGH"))
        self.assertTrue(self.rm.check_strategy_risk("Curve", "HIGH"))
        
        # Aggressive strategy should fail in HIGH volatility
        self.assertFalse(self.rm.check_strategy_risk("BidAsk", "HIGH"))
        
        # Aggressive strategy should pass in NORMAL volatility
        self.assertTrue(self.rm.check_strategy_risk("BidAsk", "NORMAL"))

    def test_check_trade_within_limits(self):
        self.assertTrue(self.rm.check_trade(25.0))
        self.assertTrue(self.rm.check_trade(50.0))

    def test_check_trade_exceeds_limits(self):
        self.assertFalse(self.rm.check_trade(51.0))

    def test_circuit_breaker(self):
        self.rm.activate_circuit_breaker()
        self.assertTrue(self.rm.circuit_breaker_active)
        self.assertFalse(self.rm.check_trade(25.0)) # Even a valid trade fails when breaker is active
        
        self.rm.deactivate_circuit_breaker()
        self.assertFalse(self.rm.circuit_breaker_active)
        self.assertTrue(self.rm.check_trade(25.0)) # Works again

if __name__ == '__main__':
    unittest.main()
