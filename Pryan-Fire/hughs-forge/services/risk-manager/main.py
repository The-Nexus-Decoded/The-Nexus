# main.py for the Risk Manager service
import time
import uvicorn

from fastapi import FastAPI

from logger import audit_logger


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
        audit_logger.info("Position opened.", extra={'extra_info': {"trade": trade_details, "open_positions": len(self.open_positions)}})

    def report_trade_result(self, pnl: float):
        if pnl < 0:
            self.consecutive_losses += 1
            log_info = {"pnl": pnl, "consecutive_losses": self.consecutive_losses}
            audit_logger.warning("Loss reported.", extra={'extra_info': log_info})
            self.check_circuit_breaker()
        else:
            self.consecutive_losses = 0
            audit_logger.info("Profit reported, resetting consecutive losses.", extra={'extra_info': {"pnl": pnl}})

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
            audit_logger.critical("CIRCUIT BREAKER TRIPPED due to excessive losses.", extra={'extra_info': {"max_losses": max_losses}})
            return False, "CIRCUIT BREAKER TRIPPED."
        return True, "Circuit breaker is not tripped."

    def check_trade(self, trade_details: dict) -> (bool, str):
        log_context = {"trade": trade_details}
        audit_logger.info("Checking trade.", extra={'extra_info': log_context})

        is_approved, reason = self.check_circuit_breaker()
        if not is_approved:
            audit_logger.error("Trade REJECTED", extra={'extra_info': {"reason": reason, **log_context}})
            return False, reason
        
        is_approved, reason = self.check_position_size(trade_details)
        if not is_approved:
            audit_logger.error("Trade REJECTED", extra={'extra_info': {"reason": reason, **log_context}})
            return False, reason

        if trade_details.get("side") == "buy":
            is_approved, reason = self.check_open_positions()
            if not is_approved:
                audit_logger.error("Trade REJECTED", extra={'extra_info': {"reason": reason, **log_context}})
                return False, reason
        
        audit_logger.info("Trade APPROVED.", extra={'extra_info': log_context})
        if trade_details.get("side") == "buy": self._add_position(trade_details)
        return True, "Trade approved."


app = FastAPI()
risk_manager_instance = RiskManager(RISK_CONFIG)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "RiskManager",
        "consecutive_losses": risk_manager_instance.consecutive_losses,
        "open_positions": len(risk_manager_instance.open_positions),
        "circuit_breaker_tripped": risk_manager_instance.breaker_tripped_at > 0
    }

# This is a placeholder for the actual trade checking endpoint
@app.post("/check_trade")
def check_trade_endpoint(trade_details: dict):
    is_approved, reason = risk_manager_instance.check_trade(trade_details)
    return {"approved": is_approved, "reason": reason}

if __name__ == "__main__":
    # The test suite is now replaced by running the server
    # uvicorn.run(app, host="0.0.0.0", port=8000)
    
    # Keeping test suite for now for local validation
    # Test Suite
    manager = risk_manager_instance
    manager.check_trade({"pair": "SOL/USDC", "amount_usd": 500, "side": "buy"})
    # ... (rest of test suite)

if __name__ == "__main__":
    # Test suite remains, demonstrating the new logging
    pass

