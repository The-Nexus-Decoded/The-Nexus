# /data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/tests/market_intelligence/test_scanner.py
import unittest
from src.market_intelligence.scanner import MomentumScanner

class TestMomentumScanner(unittest.TestCase):

    def test_find_opportunities_positive(self):
        """
        Tests if the scanner correctly identifies a token that meets the momentum criteria.
        """
        config = {'min_price_change_pct': 5}
        scanner = MomentumScanner(config)
        
        tokens = [
            {'symbol': 'GOOD', 'price_change_pct': 10},
            {'symbol': 'BAD', 'price_change_pct': 2},
        ]
        
        opportunities = scanner.find_opportunities(tokens)
        
        self.assertEqual(len(opportunities), 1)
        self.assertEqual(opportunities[0]['symbol'], 'GOOD')

    def test_find_opportunities_negative(self):
        """
        Tests if the scanner correctly ignores tokens that do not meet the criteria.
        """
        config = {'min_price_change_pct': 10}
        scanner = MomentumScanner(config)
        
        tokens = [
            {'symbol': 'WEAK', 'price_change_pct': 9},
            {'symbol': 'BAD', 'price_change_pct': -5},
        ]
        
        opportunities = scanner.find_opportunities(tokens)
        
        self.assertEqual(len(opportunities), 0)

if __name__ == '__main__':
    unittest.main()
