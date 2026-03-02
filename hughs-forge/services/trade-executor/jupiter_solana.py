"""
Jupiter Solana integration stub.

This stub provides a minimal Jupiter class to satisfy imports during phantom-trial
CI tests. The real implementation will be provided separately (src/services/jupiter_service.py).
"""

class Jupiter:
    def __init__(self, client):
        self.client = client
        self.keypair = None
        # In real implementation: initialize Jupiter API interactions

    def get_quote(self, *args, **kwargs):
        raise NotImplementedError("Real Jupiter.get_quote not yet implemented")

    def execute_swap(self, *args, **kwargs):
        raise NotImplementedError("Real Jupiter.execute_swap not yet implemented")
