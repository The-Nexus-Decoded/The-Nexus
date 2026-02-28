# /data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/tests/market_intelligence/test_scanner.py
import unittest
from src.market_intelligence.scanner import MomentumScanner

class TestMomentumScanner(unittest.TestCase):

    def test_find_opportunities_positive(self):
        """
        Tests if the scanner correctly identifies a token that meets the momentum criteria.
        """
        config = {'min_momentum_score': 100}
        scanner = MomentumScanner(config)
        
        tokens = [
            {'symbol': 'GOOD', 'price_change_pct': 10, 'volume_change_pct': 15}, # score = 150
            {'symbol': 'BAD', 'price_change_pct': 5, 'volume_change_pct': 10},    # score = 50
        ]
        
        opportunities = scanner.find_opportunities(tokens)
        
        self.assertEqual(len(opportunities), 1)
        self.assertEqual(opportunities[0]['symbol'], 'GOOD')
        self.assertEqual(opportunities[0]['momentum_score'], 150)

    def test_find_opportunities_negative(self):
        """
        Tests if the scanner correctly ignores tokens that do not meet the criteria.
        """
        config = {'min_momentum_score': 100}
        scanner = MomentumScanner(config)
        
        tokens = [
            {'symbol': 'WEAK', 'price_change_pct': 9, 'volume_change_pct': 11},   # score = 99
            {'symbol': 'BAD', 'price_change_pct': -5, 'volume_change_pct': 20},   # score = 0
            {'symbol': 'NO_VOL', 'price_change_pct': 20, 'volume_change_pct': 0}, # score = 0
        ]
        
        opportunities = scanner.find_opportunities(tokens)
        
        self.assertEqual(len(opportunities), 0)

    def test_sorting_of_opportunities(self):
        """
        Tests if the scanner correctly sorts the opportunities by score.
        """
        config = {'min_momentum_score': 50}
        scanner = MomentumScanner(config)
        
        tokens = [
            {'symbol': 'OK', 'price_change_pct': 8, 'volume_change_pct': 8},     # score = 64
            {'symbol': 'BEST', 'price_change_pct': 10, 'volume_change_pct': 10}, # score = 100
            {'symbol': 'GOOD', 'price_change_pct': 9, 'volume_change_pct': 9},   # score = 81
        ]
        
        opportunities = scanner.find_opportunities(tokens)
        
        self.assertEqual(len(opportunities), 3)
        self.assertEqual(opportunities[0]['symbol'], 'BEST')
        self.assertEqual(opportunities[1]['symbol'], 'GOOD')
        self.assertEqual(opportunities[2]['symbol'], 'OK')

if __name__ == '__main__':
    unittest.main()
