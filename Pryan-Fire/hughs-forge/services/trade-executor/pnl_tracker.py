import json
import datetime
from typing import Dict, Any, Optional

class PnLTracker:
    """
    Hugh's Accountant: Tracks Profit & Loss metrics for trading operations.
    Covers Issue #14: P&L tracking (fees - IL - gas)
    Covers Issue #5: P&L Tracking
    """
    def __init__(self, pnl_log_file: str = "pnl_audit.jsonl"):
        self.pnl_log_file = f"/data/repos/Pryan-Fire/hughs-forge/services/trade-executor/audit_logs/{pnl_log_file}"
        self._ensure_log_directory()
        self.positions_pnl: Dict[str, Dict[str, Any]] = {}

    def _ensure_log_directory(self):
        import os
        log_dir = os.path.dirname(self.pnl_log_file)
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)

    def _log_pnl_event(self, event_type: str, data: Dict[str, Any]):
        log_entry = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "event_type": event_type,
            **data
        }
        with open(self.pnl_log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
        print(f"[PNL] {event_type.upper()} logged to {self.pnl_log_file}")

    def track_open_position(self, position_pda: str, pool: str, initial_usd_value: float):
        self.positions_pnl[position_pda] = {
            "pool": pool,
            "initial_usd_value": initial_usd_value,
            "fees_earned": 0.0,
            "impermanent_loss": 0.0,
            "gas_costs": 0.0,
            "status": "OPEN"
        }
        self._log_pnl_event("position_opened", {
            "position_pda": position_pda,
            "pool": pool,
            "initial_usd_value": initial_usd_value
        })

    def track_fees(self, position_pda: str, fee_amount: float):
        if position_pda in self.positions_pnl:
            self.positions_pnl[position_pda]["fees_earned"] += fee_amount
            self._log_pnl_event("fees_tracked", {
                "position_pda": position_pda,
                "fee_amount_usd": fee_amount,
                "total_fees_earned": self.positions_pnl[position_pda]["fees_earned"]
            })

    def track_impermanent_loss(self, position_pda: str, il_amount: float):
        if position_pda in self.positions_pnl:
            self.positions_pnl[position_pda]["impermanent_loss"] += il_amount
            self._log_pnl_event("impermanent_loss_tracked", {
                "position_pda": position_pda,
                "il_amount_usd": il_amount,
                "total_impermanent_loss": self.positions_pnl[position_pda]["impermanent_loss"]
            })
            
    def track_gas_cost(self, position_pda: str, gas_cost_amount: float):
        if position_pda in self.positions_pnl:
            self.positions_pnl[position_pda]["gas_costs"] += gas_cost_amount
            self._log_pnl_event("gas_cost_tracked", {
                "position_pda": position_pda,
                "gas_cost_usd": gas_cost_amount,
                "total_gas_costs": self.positions_pnl[position_pda]["gas_costs"]
            })

    def track_close_position(self, position_pda: str, final_usd_value: float):
        if position_pda in self.positions_pnl:
            position_data = self.positions_pnl[position_pda]
            net_pnl = (final_usd_value - position_data["initial_usd_value"] +
                       position_data["fees_earned"] - position_data["impermanent_loss"] -
                       position_data["gas_costs"])
            position_data["status"] = "CLOSED"
            self._log_pnl_event("position_closed", {
                "position_pda": position_pda,
                "pool": position_data["pool"],
                "initial_usd_value": position_data["initial_usd_value"],
                "final_usd_value": final_usd_value,
                "fees_earned": position_data["fees_earned"],
                "impermanent_loss": position_data["impermanent_loss"],
                "gas_costs": position_data["gas_costs"],
                "net_pnl_usd": net_pnl
            })
            del self.positions_pnl[position_pda] # Remove from active tracking

    def get_overall_pnl(self) -> Dict[str, float]:
        total_fees = sum(p["fees_earned"] for p in self.positions_pnl.values())
        total_il = sum(p["impermanent_loss"] for p in self.positions_pnl.values())
        total_gas = sum(p["gas_costs"] for p in self.positions_pnl.values())
        # For active positions, we can't get final P&L without closing
        return {"total_fees_earned": total_fees, "total_impermanent_loss": total_il, "total_gas_costs": total_gas}

    def get_position_pnl(self, position_pda: str) -> Optional[Dict[str, Any]]:
        return self.positions_pnl.get(position_pda)

if __name__ == "__main__":
    async def test_pnl_tracker():
        tracker = PnLTracker()
        position_id = "test_position_123"
        pool_id = "SOL/USDC"

        print("\n--- P&L Tracker Test: Open Position ---")
        tracker.track_open_position(position_id, pool_id, 100.0)

        print("\n--- P&L Tracker Test: Track Fees & Gas ---")
        tracker.track_fees(position_id, 5.0)
        tracker.track_gas_cost(position_id, 0.5)
        print(f"Current P&L for {position_id}: {tracker.get_position_pnl(position_id)}")

        print("\n--- P&L Tracker Test: Track Impermanent Loss ---")
        tracker.track_impermanent_loss(position_id, 2.0)
        print(f"Current P&L for {position_id}: {tracker.get_position_pnl(position_id)}")

        print("\n--- P&L Tracker Test: Close Position ---")
        tracker.track_close_position(position_id, 103.0) # Final value after market changes
        print(f"Overall P&L summary: {tracker.get_overall_pnl()}")

    asyncio.run(test_pnl_tracker())
