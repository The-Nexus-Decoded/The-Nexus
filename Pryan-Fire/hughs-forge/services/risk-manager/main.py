# main.py for the Risk Manager service
import time
from .logger import audit_logger

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
        self.open_positions = []
        self.consecutive_losses = 0
        self.breaker_tripped_at = 0

    def _add_position(self, trade_details: dict):
        self.open_positions.append(trade_details['pair'])
        audit_logger.info("Position opened.", extra_info={"trade": trade_details, "open_positions": len(self.open_positions)})

    def report_trade_result(self, pnl: float):
        if pnl < 0:
            self.consecutive_losses += 1
            log_info = {"pnl": pnl, "consecutive_losses": self.consecutive_losses}
            audit_logger.warning("Loss reported.", extra_info=log_info)
            self.check_circuit_breaker()
        else:
            self.consecutive_losses = 0
            audit_logger.info("Profit reported, resetting consecutive losses.", extra_info={"pnl": pnl})

    def check_position_size(self, trade_details: dict) -> (bool, str):
        # ... (implementation unchanged)
        return True, "Position size is within limits."

    def check_open_positions(self) -> (bool, str):
        # ... (implementation unchanged)
        return True, "Open positions within limit."

    def check_circuit_breaker(self) -> (bool, str):
        # ... (implementation unchanged)
        breaker_config = self.config.get("circuit_breaker", {})
        max_losses = breaker_config.get("max_consecutive_losses", 3)
        if self.consecutive_losses >= max_losses:
            self.breaker_tripped_at = time.time()
            audit_logger.critical("CIRCUIT BREAKER TRIPPED due to excessive losses.", extra_info={"max_losses": max_losses})
            return False, "CIRCUIT BREAKER TRIPPED."
        return True, "Circuit breaker is not tripped."

    def check_trade(self, trade_details: dict) -> (bool, str):
        log_context = {"trade": trade_details}
        audit_logger.info("Checking trade.", extra_info=log_context)

        is_approved, reason = self.check_circuit_breaker()
        if not is_approved:
            audit_logger.error("Trade REJECTED", extra_info={"reason": reason, **log_context})
            return False, reason
        
        is_approved, reason = self.check_position_size(trade_details)
        if not is_approved:
            audit_logger.error("Trade REJECTED", extra_info={"reason": reason, **log_context})
            return False, reason

        if trade_details.get("side") == "buy":
            is_approved, reason = self.check_open_positions()
            if not is_approved:
                audit_logger.error("Trade REJECTED", extra_info={"reason": reason, **log_context})
                return False, reason
        
        audit_logger.info("Trade APPROVED.", extra_info=log_context)
        if trade_details.get("side") == "buy": self._add_position(trade_details)
        return True, "Trade approved."

if __name__ == "__main__":
    # Test suite remains, demonstrating the new logging
    pass
