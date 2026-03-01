# main.py for the Risk Manager service
import time
import uvicorn
from typing import Dict, Any, Optional

from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

from logger import audit_logger
import discord_gate

# Configuration will be moved to a separate file later
RISK_CONFIG = {
    "max_trade_size_usd": 1000.00,
    "max_open_positions": 5,
    "circuit_breaker": {
        "max_consecutive_losses": 3,
        "cooldown_period_seconds": 300, # 5 minutes
    },
    "manual_approval_threshold_usd": 500.00 # Trades above this need manual approval
}

class TradeDetails(BaseModel):
    pair: str
    amount_usd: float
    side: str
    price: Optional[float] = None

class Resolution(BaseModel):
    trade_id: str
    approved: bool
    user: str

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

    def check_position_size(self, trade_details: dict) -> tuple[bool, str]:
        max_size = self.config.get("max_trade_size_usd", 1000.0)
        if trade_details.get("amount_usd", 0) > max_size:
            return False, f"Trade size exceeds limit of {max_size} USD."
        return True, "Position size is within limits."

    def check_open_positions(self) -> tuple[bool, str]:
        max_positions = self.config.get("max_open_positions", 5)
        if len(self.open_positions) >= max_positions:
            return False, f"Maximum open positions ({max_positions}) reached."
        return True, "Open positions within limit."

    def check_circuit_breaker(self) -> tuple[bool, str]:
        breaker_config = self.config.get("circuit_breaker", {})
        max_losses = breaker_config.get("max_consecutive_losses", 3)
        if self.consecutive_losses >= max_losses:
            self.breaker_tripped_at = time.time()
            audit_logger.critical("CIRCUIT BREAKER TRIPPED due to excessive losses.", extra={'extra_info': {"max_losses": max_losses}})
            return False, "CIRCUIT BREAKER TRIPPED."
        return True, "Circuit breaker is not tripped."

    def check_trade(self, trade_details: dict) -> tuple[bool, str]:
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
        
        # Manual approval check
        threshold = self.config.get("manual_approval_threshold_usd", 500.00)
        if trade_details.get("amount_usd", 0) >= threshold:
            audit_logger.info("Trade requires MANUAL APPROVAL.", extra={'extra_info': log_context})
            return False, "MANUAL_APPROVAL_REQUIRED"

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

@app.post("/check_trade")
async def check_trade_endpoint(trade: TradeDetails):
    trade_dict = trade.model_dump()
    is_approved, reason = risk_manager_instance.check_trade(trade_dict)
    
    if not is_approved and reason == "MANUAL_APPROVAL_REQUIRED":
        trade_id = discord_gate.request_approval(trade_dict)
        # Note: In a real scenario, we'd trigger the discord message here.
        # For this design, we'll return the trade_id so the caller knows it's pending.
        return {"approved": False, "reason": reason, "trade_id": trade_id}
        
    return {"approved": is_approved, "reason": reason}

@app.post("/resolve_trade")
def resolve_trade_endpoint(res: Resolution):
    try:
        discord_gate.resolve_trade(res.trade_id, res.approved, res.user)
        return {"status": "success"}
    except ValueError as e:
        return {"status": "error", "message": str(e)}

@app.get("/check_status/{trade_id}")
def check_status_endpoint(trade_id: str):
    status, info = discord_gate.check_status(trade_id)
    return {"status": status, "info": info}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
