# main.py for the Risk Manager service
import time

# Configuration will be moved to a separate file later
RISK_CONFIG = {
    "max_trade_size_usd": 1000.00,
    "max_open_positions": 5,
    "circuit_breaker": {
        "max_consecutive_losses": 3,
        "cooldown_period_seconds": 300, # 5 minutes
    }
}

class RiskManager:
    def __init__(self, config):
        self.config = config
        self.open_positions = []  # In-memory store for now. Will move to Redis/DB.
        self.consecutive_losses = 0
        self.breaker_tripped_at = 0

    def _add_position(self, trade_details: dict):
        print(f"-> Opening position for {trade_details['pair']}...")
        self.open_positions.append(trade_details['pair'])

    def report_trade_result(self, pnl: float):
        """Reports the result of a closed trade to update risk metrics."""
        if pnl < 0:
            self.consecutive_losses += 1
            print(f"⚠️ Loss reported. Consecutive losses are now {self.consecutive_losses}.")
            self.check_circuit_breaker()
        else:
            print("✅ Profit reported. Resetting consecutive losses.")
            self.consecutive_losses = 0

    def check_position_size(self, trade_details: dict) -> (bool, str):
        trade_size = trade_details.get("amount_usd", 0)
        max_size = self.config.get("max_trade_size_usd", 0)
        if trade_size <= 0: return False, "Trade size must be positive."
        if trade_size > max_size: return False, f"Trade size {trade_size} USD exceeds max of {max_size} USD."
        return True, "Position size is within limits."

    def check_open_positions(self) -> (bool, str):
        current_positions = len(self.open_positions)
        max_positions = self.config.get("max_open_positions", 0)
        if current_positions >= max_positions: return False, f"Cannot open new position. Already at max of {max_positions}."
        return True, f"Open positions ({current_positions}) within limit ({max_positions})."

    def check_circuit_breaker(self) -> (bool, str):
        """Checks the state of the circuit breaker."""
        breaker_config = self.config.get("circuit_breaker", {})
        
        # Check if we are in a cooldown period
        if self.breaker_tripped_at > 0:
            elapsed = time.time() - self.breaker_tripped_at
            cooldown = breaker_config.get("cooldown_period_seconds", 300)
            if elapsed < cooldown:
                return False, f"CIRCUIT BREAKER TRIPPED. In cooldown for another {cooldown - elapsed:.0f} seconds."
            else:
                print("Circuit breaker cooldown has ended. Resetting.")
                self.breaker_tripped_at = 0
                self.consecutive_losses = 0
        
        # Check if we need to trip the breaker
        max_losses = breaker_config.get("max_consecutive_losses", 3)
        if self.consecutive_losses >= max_losses:
            print(f"🚨🚨 CIRCUIT BREAKER TRIPPED! Max consecutive losses ({max_losses}) reached. 🚨🚨")
            self.breaker_tripped_at = time.time()
            return False, "CIRCUIT BREAKER TRIPPED due to excessive losses."
            
        return True, "Circuit breaker is not tripped."

    def check_trade(self, trade_details: dict) -> (bool, str):
        print(f"\n--- Checking Trade: {trade_details['pair']} for {trade_details['amount_usd']} USD ---")

        # Rule 0: Circuit Breaker
        is_approved, reason = self.check_circuit_breaker()
        if not is_approved:
            print(f"❌ Trade REJECTED: {reason}")
            return False, reason
        
        # Rule 1: Position Sizing
        is_approved, reason = self.check_position_size(trade_details)
        if not is_approved: print(f"❌ Trade REJECTED: {reason}"); return False, reason
        print(f"✅ Rule 1 Passed: {reason}")

        # Rule 2: Max Open Positions
        if trade_details.get("side") == "buy":
            is_approved, reason = self.check_open_positions()
            if not is_approved: print(f"❌ Trade REJECTED: {reason}"); return False, reason
            print(f"✅ Rule 2 Passed: {reason}")
        
        print(f"======> ✅✅✅ Trade APPROVED. <======")
        if trade_details.get("side") == "buy": self._add_position(trade_details)
        return True, "Trade approved."

if __name__ == "__main__":
    manager = RiskManager(RISK_CONFIG)

    # Test Suite
    manager.check_trade({"pair": "SOL/USDC", "amount_usd": 500, "side": "buy"})
    manager.check_trade({"pair": "BTC/USDC", "amount_usd": 900, "side": "buy"})
    
    # Simulate some losses
    manager.report_trade_result(-100)
    manager.report_trade_result(-150)
    
    # This trade should be fine
    manager.check_trade({"pair": "ETH/USDC", "amount_usd": 200, "side": "buy"})
    
    # One more loss should trip the breaker
    manager.report_trade_result(-50)
    
    # This trade should be rejected by the breaker
    manager.check_trade({"pair": "JUP/USDC", "amount_usd": 100, "side": "buy"})
    
    # Simulate a profit to show it resets
    manager.breaker_tripped_at = 0 # Manually reset for test
    manager.consecutive_losses = 0
    print("\n--- Resetting breaker for profit test ---")
    manager.report_trade_result(200)
    manager.check_trade({"pair": "WIF/USDC", "amount_usd": 50, "side": "buy"})
