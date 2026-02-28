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
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdQxrVca29as98E2kE53v5w5b3T97ArJC7y")

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
            print(f"[ARMORY] Program initialized with ID: {METEORA_PROGRAM_ID}")
        else:
            print("[ARMORY WARNING] IDL file not found.")

    async def get_lb_pair_state(self, lb_pair_address: str):
        """Fetches and decodes the state of an LbPair (Issue #19)."""
        if not self.program:
            await self.initialize()
        
        state = await self.program.account["LbPair"].fetch(Pubkey.from_string(lb_pair_address))
        return state

    async def scan_user_positions(self, owner_address: str) -> List[Dict[str, Any]]:
        """Scans for active positions for a given owner (Issue #19)."""
        if not self.program:
            await self.initialize()
            
        print(f"[ARMORY] Scanning positions for owner: {owner_address}...")
        try:
            all_pos = await self.program.account["Position"].all()
            results = []
            for pos in all_pos:
                if str(pos.account.owner) == owner_address:
                    results.append({
                        "address": str(pos.public_key),
                        "lb_pair": str(pos.account.lb_pair),
                        "lower_bin_id": pos.account.lower_bin_id
                    })
            return results
        except Exception as e:
            print(f"[ARMORY ERROR] Position scan failed: {e}")
            return []

    def derive_bin_array_pda(self, lb_pair: Pubkey, index: int) -> Pubkey:
        seeds = [b"bin_array", bytes(lb_pair), index.to_bytes(8, "little", signed=True)]
        pda, _ = Pubkey.find_program_address(seeds, METEORA_PROGRAM_ID)
        return pda

    def derive_position_pda(self, lb_pair: Pubkey, owner: Pubkey, lower_bin_id: int, width: int) -> Pubkey:
        seeds = [b"position", bytes(lb_pair), bytes(owner), lower_bin_id.to_bytes(4, "little", signed=True), width.to_bytes(4, "little", signed=True)]
        pda, _ = Pubkey.find_program_address(seeds, METEORA_PROGRAM_ID)
        return pda

    def derive_ata(self, owner: Pubkey, mint: Pubkey) -> Pubkey:
        ata, _ = Pubkey.find_program_address([bytes(owner), bytes(TOKEN_PROGRAM_ID), bytes(mint)], ASSOCIATED_TOKEN_PROGRAM_ID)
        return ata

    async def build_initialize_position_ix(self, pool_address: str, lower_bin_id: int, width: int):
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair = Pubkey.from_string(pool_address)
        position_pda = self.derive_position_pda(lb_pair, self.wallet.public_key, lower_bin_id, width)
        # Using snake_case for instruction names per sanitized IDL
        return self.program.instruction["initialize_position"](
            lower_bin_id, width,
            ctx=Context(accounts={
                "payer": self.wallet.public_key, "position": position_pda, "lb_pair": lb_pair,
                "owner": self.wallet.public_key, "system_program": SYS_PROGRAM_ID, "rent": RENT_SYSVAR
            })
        )

    async def build_add_liquidity_ix(self, pool_address: str, position_pda: str, amount_x: int, amount_y: int, bin_arrays: List[int]):
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        # Assuming placeholders for simulation
        user_token_x = self.wallet.public_key 
        user_token_y = self.wallet.public_key 
        return self.program.instruction["add_liquidity"](
            {"amount_x": amount_x, "amount_y": amount_y, "bin_arrays": bin_arrays[:3] + [0] * (3 - len(bin_arrays))},
            ctx=Context(accounts={
                "position": position_pubkey, "lb_pair": lb_pair_pubkey, "user_token_x": user_token_x, "user_token_y": user_token_y,
                "reserve_x": METEORA_PROGRAM_ID, "reserve_y": METEORA_PROGRAM_ID, "token_x_mint": METEORA_PROGRAM_ID, "token_y_mint": METEORA_PROGRAM_ID,
                "bin_array_0": METEORA_PROGRAM_ID, "bin_array_1": METEORA_PROGRAM_ID, "bin_array_2": METEORA_PROGRAM_ID, "oracle": METEORA_PROGRAM_ID,
                "token_program": TOKEN_PROGRAM_ID, "event_authority": METEORA_PROGRAM_ID, "program": METEORA_PROGRAM_ID
            })
        )

    async def close(self):
        await self.client.close()

if __name__ == "__main__":
    async def test():
        armory = MeteoraArmory("https://api.mainnet-beta.solana.com")
        await armory.initialize()
        await armory.close()
    asyncio.run(test())
