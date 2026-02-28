# /data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/src/orchestrator.py
from .market_intelligence.scanner import MomentumScanner

class Orchestrator:
    def __init__(self, config):
        self.config = config
        self.scanner = MomentumScanner(config.get('scanner_config', {}))

    def run(self):
        """
        Main processing loop for the trade orchestrator.
        """
        print("Orchestrator running...")
        
        # 1. Fetch market data (using mock data for now)
        mock_tokens = self.get_mock_market_data()
        
        # 2. Use the scanner to find opportunities
        opportunities = self.scanner.find_opportunities(mock_tokens)
        
        # 3. Process the opportunities
        if opportunities:
            print(f"Found {len(opportunities)} opportunities:")
            for op in opportunities:
                print(f"  - Symbol: {op['symbol']}, Score: {op['momentum_score']}")
        else:
            print("No opportunities found.")

    def get_mock_market_data(self):
        """
        Returns a list of mock token data for development purposes.
        """
        return [
            {'symbol': 'ALPHA', 'price_change_pct': 12, 'volume_change_pct': 18}, # score = 216
            {'symbol': 'BETA', 'price_change_pct': 5, 'volume_change_pct': 10},    # score = 50
            {'symbol': 'GAMMA', 'price_change_pct': 15, 'volume_change_pct': 10}, # score = 150
            {'symbol': 'DELTA', 'price_change_pct': 2, 'volume_change_pct': 30},  # score = 60
        ]

if __name__ == '__main__':
    # Example usage
    config = {
        'scanner_config': {
            'min_momentum_score': 100
        }
    }
    orchestrator = Orchestrator(config)
    orchestrator.run()
