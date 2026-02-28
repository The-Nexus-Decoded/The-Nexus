# /data/repos/Pryan-Fire/hughs-forge/services/trade-orchestrator/src/market_intelligence/scanner.py

class MomentumScanner:
    def __init__(self, config):
        """
        Initializes the MomentumScanner with a configuration dictionary.
        Expected config keys:
        - min_momentum_score (float): The minimum score to qualify as an opportunity.
        """
        self.config = config

    def find_opportunities(self, tokens):
        """
        Analyzes a list of tokens and identifies potential momentum-based trading opportunities.
        
        Args:
            tokens (list of dict): A list of token data dictionaries. Each dict is expected
                                   to have 'price_change_pct' and 'volume_change_pct'.

        Returns:
            list of dict: A list of tokens that meet the momentum criteria, sorted by score.
        """
        opportunities = []
        min_score = self.config.get('min_momentum_score', 100)

        for token in tokens:
            price_change = token.get('price_change_pct', 0)
            volume_change = token.get('volume_change_pct', 0)

            # A simple momentum score calculation.
            # Avoids multiplying by zero if one metric is flat.
            # Gives a boost to tokens with both price and volume momentum.
            if price_change > 0 and volume_change > 0:
                score = price_change * volume_change
            else:
                score = 0
            
            token['momentum_score'] = score

            if score > min_score:
                opportunities.append(token)
        
        # Sort opportunities by score in descending order
        opportunities.sort(key=lambda x: x['momentum_score'], reverse=True)
        
        return opportunities
