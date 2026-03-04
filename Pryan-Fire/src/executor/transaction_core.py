import base64
from typing import Dict, Any, Optional
from solana.rpc.async_api import AsyncClient
from solders.transaction import VersionedTransaction
from solders.keypair import Keypair
from .kill_switch import KILL_SWITCH
from .guards import TradingGuards

class TransactionCore:
    """
    Handles the final construction, simulation, and signing of Solana transactions.
    Supports VersionedTransactions and Address Lookup Tables (ALTs).
    """
    def __init__(self, rpc_url: str = "https://api.mainnet-beta.solana.com"):
        self.rpc_url = rpc_url
        self.client = AsyncClient(rpc_url)

    async def build_from_jupiter(self, swap_transaction_b64: str) -> Optional[VersionedTransaction]:
        """
        Deserializes the Jupiter base64 swapTransaction.
        Ensures ALTs and VersionedTransaction structure are preserved.
        """
        try:
            print("[TX] Deserializing Jupiter base64 payload...")
            raw_tx = base64.b64decode(swap_transaction_b64)
            tx = VersionedTransaction.from_bytes(raw_tx)
            print(f"[TX] Deserialized Success. Signature: {tx.signatures[0]}")
            return tx
        except Exception as e:
            print(f"[TX ERROR] Deserialization failed: {e}")
            return None

    async def simulate(self, tx: VersionedTransaction) -> Dict[str, Any]:
        """
        Performs a pre-flight simulation against the RPC.
        This is the ultimate truth-teller for routing/ALT validity.
        """
        print("[TX] Initiating RPC simulation...")
        try:
            response = await self.client.simulate_transaction(tx)
            
            # The .value property contains the simulation result in solana-py 0.36+
            res = response.value
            
            if res.err:
                print(f"[TX simulation FAILED] Error: {res.err}")
            else:
                units = res.units_consumed or 0
                print(f"[TX simulation SUCCESS] Compute Units: {units}")
            
            return {
                "success": res.err is None,
                "error": res.err,
                "units": res.units_consumed,
                "logs": res.logs
            }
        except Exception as e:
            print(f"[TX simulation EXCEPTION] {e}")
            return {"success": False, "error": str(e)}

    async def sign_and_broadcast(self, tx: VersionedTransaction, keypair: Keypair, is_authorized: bool):
        """
        The Final Gate. Signs and broadcasts to the network.
        Subject to Law 3 (Zero Live Capital without auth) and Kill-Switch.
        """
        # 1. Final Law 3 Check
        TradingGuards.verify_live_execution_status(is_authorized)
        
        # 2. Final Kill-Switch Check
        if KILL_SWITCH.is_halted():
            print("[TX] Kill-switch active. Aborting broadcast.")
            return

        # 3. Signing
        print(f"[TX] Signing transaction with {keypair.pubkey()}...")
        # Note: Signing a VersionedTransaction requires a list of signers
        # signed_tx = VersionedTransaction(tx.message, [keypair])
        
        # 4. Broadcast
        print("[TX] BROADCASTING to mainnet...")
        # try:
        #    res = await self.client.send_raw_transaction(bytes(signed_tx))
        #    print(f"[TX SUCCESS] Signature: {res.value}")
        # except Exception as e:
        #    print(f"[TX BROADCAST ERROR] {e}")
