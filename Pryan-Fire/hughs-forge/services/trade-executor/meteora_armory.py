import asyncio
import json
import os
from typing import Dict, Any, List, Optional
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.system_program import ID as SYS_PROGRAM_ID
from solana.rpc.commitment import Confirmed
from anchorpy import Program, Provider, Wallet, Idl, Context

# Meteora DLMM Program ID
METEORA_PROGRAM_ID = Pubkey.from_string("Lb2fG9zH3KBCCcHpxJpSst87YySAs29vBEnK9F16nC6")
RENT_SYSVAR = Pubkey.from_string("SysvarRent111111111111111111111111111111111")

class MeteoraArmory:
    """
    Hugh's Execution Core for Meteora DLMM.
    Handles on-chain interactions for position management.
    
    Supporting Issue #3: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/3
    Supporting Issue #19: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/19
    """
    def __init__(self, rpc_url: str, wallet_keypair: Optional[Keypair] = None):
        self.client = AsyncClient(rpc_url)
        self.wallet = Wallet(wallet_keypair) if wallet_keypair else None
        self.provider = Provider(self.client, self.wallet)
        self.program: Optional[Program] = None

    async def initialize(self):
        """Loads the IDL and initializes the Anchor Program."""
        idl_path = "/data/repos/Pryan-Fire/hughs-forge/services/trade-executor/idl/dlmm.json"
        if os.path.exists(idl_path):
            with open(idl_path, 'r') as f:
                idl_dict = json.load(f)
            self.program = Program(Idl.from_json(json.dumps(idl_dict)), METEORA_PROGRAM_ID, self.provider)
            print("[ARMORY] Program initialized with local IDL.")
        else:
            print("[ARMORY WARNING] IDL file not found. Position management will be restricted.")

    async def get_lb_pair_state(self, lb_pair_address: str):
        """Fetches and decodes the state of an LbPair (Issue #19)."""
        if not self.program:
            await self.initialize()
        
        state = await self.program.account["LbPair"].fetch(Pubkey.from_string(lb_pair_address))
        return state

    def derive_position_pda(self, lb_pair: Pubkey, owner: Pubkey, lower_bin_id: int, width: int) -> Pubkey:
        """
        Derives the PDA for a Meteora DLMM Position.
        Rune: PDA(["position", lb_pair, owner, lower_bin_id, width], program_id)
        """
        seeds = [
            b"position",
            bytes(lb_pair),
            bytes(owner),
            lower_bin_id.to_bytes(4, "little", signed=True),
            width.to_bytes(4, "little", signed=True)
        ]
        pda, _ = Pubkey.find_program_address(seeds, METEORA_PROGRAM_ID)
        return pda

    async def build_initialize_position_tx(self, pool_address: str, lower_bin_id: int, width: int):
        """
        Builds the 'initializePosition' transaction.
        Issue #3: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/3
        """
        if not self.program or not self.wallet:
            raise ValueError("Program or Wallet not initialized")

        lb_pair = Pubkey.from_string(pool_address)
        position_pda = self.derive_position_pda(lb_pair, self.wallet.public_key, lower_bin_id, width)

        print(f"[ARMORY] Building 'initializePosition' for PDA: {position_pda}")

        # Construct accounts context for Anchor
        # Expected: payer, position, lbPair, owner, systemProgram, rent
        ix = self.program.instruction["initializePosition"](
            lower_bin_id, 
            width,
            ctx=Context(
                accounts={
                    "payer": self.wallet.public_key,
                    "position": position_pda,
                    "lbPair": lb_pair,
                    "owner": self.wallet.public_key,
                    "systemProgram": SYS_PROGRAM_ID,
                    "rent": RENT_SYSVAR
                }
            )
        )
        return ix

    async def close(self):
        await self.client.close()

if __name__ == "__main__":
    async def test():
        # Test using the known SOL/USDC pair
        pair_addr = "8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie"
        armory = MeteoraArmory("https://api.mainnet-beta.solana.com")
        await armory.initialize()
        
        try:
            state = await armory.get_lb_pair_state(pair_addr)
            print(f"Decoded LbPair BinStep: {state.parameters.bin_step}")
        except Exception as e:
            print(f"State Fetch Failed: {e}")
            
        await armory.close()
    asyncio.run(test())
