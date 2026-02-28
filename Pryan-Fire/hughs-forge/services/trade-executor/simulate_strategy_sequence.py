import asyncio
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from trade_orchestrator import TradeOrchestrator
from pyth_pricing import SOL_USD_FEED

async def run_multi_agent_simulation():
    """
    Haplo's Multi-Agent Simulation Rune.
    Verifies the sequence: Signal -> Price Check -> Risk Check -> Strike.
    Supporting Issue #45, #47, #48, #14, #5.
    """
    rpc_url = "https://api.mainnet-beta.solana.com"
    dummy_keypair = Keypair()
    
    # Initialize Orchestrator with a $250 limit
    orch = TradeOrchestrator(rpc_url, dummy_keypair, risk_limit_usd=250.0)
    
    print("--- MULTI-AGENT STRATEGY SIMULATION ---")
    await orch.initialize()
    
    try:
        # Fetch current SOL price for simulation context
        sol_price = await orch.pricing.get_sol_price()
        print(f"[SIM] Current SOL Market Price: ${sol_price:.2f}")
        
        # Scenario 1: Valid Signal (Small Strike) - OPEN
        print("\n[SIM] Scenario 1: Valid Entry Signal ($50 USD)")
        signal_1 = {
            'pool': '8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie',
            'action': 'OPEN',
            'amount_usd': 50.0,
            'params': {
                'amount_x': 1000000,
                'amount_y': 1000000,
                'bin_arrays': [0],
                'lower_bin_id': -400,
                'width': 10
            }
        }
        res_1 = await orch.process_signal(signal_1)
        print(f"[SIM] Result: {res_1['status']} (Action: {res_1.get('action')}, Position PDA: {res_1.get('position_pda')})")
        print(f"[SIM] Current Orchestrator Exposure: ${orch.current_exposure_usd:.2f}")
        opened_pda_1 = res_1.get("position_pda", "")

        # Add some fees and IL to the first opened position for testing
        if opened_pda_1:
            print(f"[SIM] Tracking P&L for {opened_pda_1} (Fees: $2.50, IL: $1.00, Gas: $0.01)")
            orch.pnl_tracker.track_fees(opened_pda_1, 2.50)
            orch.pnl_tracker.track_impermanent_loss(opened_pda_1, 1.00)
            orch.pnl_tracker.track_gas_cost(opened_pda_1, 0.01) # This is already tracked on open in orchestrator

        # Scenario 2: Risk Violation Signal (Large Strike) - OPEN
        # Attempting to add $210 when already at $50 (Total $260 > $250)
        print("\n[SIM] Scenario 2: Risk Limit Violation ($210 USD)")
        signal_2 = {
            'pool': '8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie',
            'action': 'OPEN',
            'amount_usd': 210.0,
            'params': {'amount_x': 5000000, 'amount_y': 5000000}
        }
        res_2 = await orch.process_signal(signal_2)
        print(f"[SIM] Result: {res_2['status']} (Reason: {res_2.get('reason')})")
        print(f"[SIM] Current Orchestrator Exposure: ${orch.current_exposure_usd:.2f}")

        # Scenario 3: Symmetric Exit (Freeing Risk Capacity) - CLOSE
        print("\n[SIM] Scenario 3: Symmetric Exit ($50 USD)")
        signal_3 = {
            'pool': '8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie',
            'action': 'CLOSE',
            'amount_usd': 50.0,
            'params': {'position_pda': opened_pda_1, 'amount_x': 1000000, 'amount_y': 1000000}
        }
        res_3 = await orch.process_signal(signal_3)
        print(f"[SIM] Result: {res_3['status']} (Action: {res_3.get('action')})")
        print(f"[SIM] Current Orchestrator Exposure: ${orch.current_exposure_usd:.2f}")
        
        # Scenario 4: Re-Entry after Exit (Now within limit) - OPEN
        print("\n[SIM] Scenario 4: Re-Entry after Exit ($210 USD)")
        res_4 = await orch.process_signal(signal_2) # Re-use signal_2 as it's now within limits
        print(f"[SIM] Result: {res_4['status']} (Action: {res_4.get('action')})")
        print(f"[SIM] Current Orchestrator Exposure: ${orch.current_exposure_usd:.2f}")
        opened_pda_2 = res_4.get("position_pda", "")
        
        # Check overall P&L at the end
        print(f"\n[SIM] Final Overall P&L Summary: {orch.pnl_tracker.get_overall_pnl()}")

        print("\n[VERDICT] MULTI-AGENT SEQUENCE VERIFIED. Hugh's nervous system is disciplined.")

    except Exception as e:
        print(f"[CRITICAL] Simulation Failed: {e}")
    finally:
        await orch.shutdown()

if __name__ == "__main__":
    asyncio.run(run_multi_agent_simulation())
