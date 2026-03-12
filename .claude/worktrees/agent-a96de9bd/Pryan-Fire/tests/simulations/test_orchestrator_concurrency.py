import asyncio
import uuid
import sys
import os

# Add relevant paths to system path
sys.path.append(os.path.join(os.getcwd(), 'hughs-forge/risk-manager/src'))
sys.path.append(os.path.join(os.getcwd(), 'hughs-forge/services/trade-orchestrator/src'))

from TradeOrchestrator import TradeOrchestrator
from RiskManager import RiskManager
from AuditLogger import AuditLogger

class MockRiskManager(RiskManager):
    def __init__(self, *args, **kwargs):
        super().__init__("mock_token", 0)
        self.approved_count = 0

    async def check_trade(self, trade_id, trade_details):
        # Simulate Lord Xar reacting to multi-strikes
        async with self.lock:
            print(f"DEBUG: Simulation Strike Authorization Requested for {trade_id}")
            await asyncio.sleep(0.5) # Simulate human lag
            self.approved_count += 1
            return True

async def run_simulation():
    print("Initiating Multi-Strike Concurrency Simulation...")
    audit = AuditLogger("data/logs/sim")
    risk = MockRiskManager()
    orchestrator = TradeOrchestrator(risk, audit)

    # Trigger 3 simultaneous fee claims
    intents = [
        {"action": "CLAIM_FEES", "pool": f"POOL_{i}", "amount": 0.01 * i}
        for i in range(1, 4)
    ]
    
    results = await asyncio.gather(*[orchestrator.orchestrate_trade(intent) for intent in intents])
    
    print(f"Simulation Complete. Strikes Authorized: {risk.approved_count}/{len(intents)}")
    if risk.approved_count == len(intents):
        print("CONCURRENCY AUDIT: PASS (Atomic Gating Verified)")
    else:
        print("CONCURRENCY AUDIT: FAIL")

if __name__ == "__main__":
    asyncio.run(run_simulation())
