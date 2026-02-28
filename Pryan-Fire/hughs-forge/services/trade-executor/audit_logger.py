import json
import datetime
from typing import Dict, Any, Optional

class AuditLogger:
    """
    Hugh's Chronicler: Logs all trade activities in structured JSONL format.
    Supporting Issue #17: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/17
    Supporting Issue #8: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/8
    Supporting Issue #4: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/4 (Fee Claiming)
    """
    def __init__(self, log_file: str = "trade_audit.jsonl"):
        self.log_file = f"/data/repos/Pryan-Fire/hughs-forge/services/trade-executor/audit_logs/{log_file}"
        self._ensure_log_directory()

    def _ensure_log_directory(self):
        import os
        log_dir = os.path.dirname(self.log_file)
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)

    def _log(self, event_type: str, data: Dict[str, Any]):
        log_entry = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "event_type": event_type,
            **data
        }
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
        print(f"[AUDIT] {event_type.upper()} logged to {self.log_file}")

    def log_signal_received(self, signal: Dict[str, Any]):
        self._log("signal_received", {"signal": signal})

    def log_risk_check(self, signal: Dict[str, Any], status: str, reason: Optional[str] = None, current_exposure: float = 0.0, projected_exposure: float = 0.0, risk_limit: float = 0.0):
        self._log("risk_check", {
            "signal": signal,
            "status": status,
            "reason": reason,
            "current_exposure_usd": current_exposure,
            "projected_exposure_usd": projected_exposure,
            "risk_limit_usd": risk_limit
        })

    def log_trade_executed(self, action: str, pool: str, amount_usd: float, ix_count: int, transaction_id: Optional[str] = None):
        self._log("trade_executed", {
            "action": action,
            "pool": pool,
            "amount_usd": amount_usd,
            "instruction_count": ix_count,
            "transaction_id": transaction_id
        })

    def log_trade_failed(self, action: str, pool: str, reason: str):
        self._log("trade_failed", {
            "action": action,
            "pool": pool,
            "reason": reason
        })

    def log_fee_claimed(self, position_pda: str, pool: str, claimed_amount_x: float, claimed_amount_y: float, ix_count: int):
        self._log("fee_claimed", {
            "position_pda": position_pda,
            "pool": pool,
            "claimed_amount_x": claimed_amount_x,
            "claimed_amount_y": claimed_amount_y,
            "instruction_count": ix_count
        })

    def log_reward_claimed(self, position_pda: str, pool: str, claimed_amount_reward: float, ix_count: int):
        self._log("reward_claimed", {
            "position_pda": position_pda,
            "pool": pool,
            "claimed_amount_reward": claimed_amount_reward,
            "instruction_count": ix_count
        })

if __name__ == "__main__":
    # Example Usage
    logger = AuditLogger()
    logger.log_signal_received({'pool': 'SOL/USDC', 'action': 'OPEN', 'amount_usd': 100.0})
    logger.log_risk_check(
        {'pool': 'SOL/USDC', 'action': 'OPEN', 'amount_usd': 100.0},
        "APPROVED",
        current_exposure=0.0,
        projected_exposure=100.0,
        risk_limit=250.0
    )
    logger.log_trade_executed("OPEN", "SOL/USDC", 100.0, 2)
    logger.log_trade_failed("CLOSE", "SOL/USDC", "Insufficient funds")
    logger.log_fee_claimed("test_position_pda", "SOL/USDC", 1.23, 0.45, 1)
    logger.log_reward_claimed("test_position_pda", "SOL/USDC", 0.78, 1)
