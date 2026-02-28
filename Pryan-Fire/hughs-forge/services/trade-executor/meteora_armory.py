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
            print("[ARMORY] Program initialized with local IDL.")
        else:
            print("[ARMORY WARNING] IDL file not found. Position management will be restricted.")

    async def get_lb_pair_state(self, lb_pair_address: str):
        """Fetches and decodes the state of an LbPair (Issue #19)."""
        if not self.program:
            await self.initialize()
        
        state = await self.program.account["LbPair"].fetch(Pubkey.from_string(lb_pair_address))
        return state

    def derive_bin_array_pda(self, lb_pair: Pubkey, index: int) -> Pubkey:
        """Derives the PDA for a Meteora DLMM BinArray."""
        seeds = [
            b"bin_array",
            bytes(lb_pair),
            index.to_bytes(8, "little", signed=True)
        ]
        pda, _ = Pubkey.find_program_address(seeds, METEORA_PROGRAM_ID)
        return pda

    def derive_position_pda(self, lb_pair: Pubkey, owner: Pubkey, lower_bin_id: int, width: int) -> Pubkey:
        """Derives the PDA for a Meteora DLMM Position."""
        seeds = [
            b"position",
            bytes(lb_pair),
            bytes(owner),
            lower_bin_id.to_bytes(4, "little", signed=True),
            width.to_bytes(4, "little", signed=True)
        ]
        pda, _ = Pubkey.find_program_address(seeds, METEORA_PROGRAM_ID)
        return pda

    def derive_ata(self, owner: Pubkey, mint: Pubkey) -> Pubkey:
        """Derives the Associated Token Account (ATA) for a mint."""
        ata, _ = Pubkey.find_program_address(
            [bytes(owner), bytes(TOKEN_PROGRAM_ID), bytes(mint)],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )
        return ata

    async def build_add_liquidity_ix(self, pool_address: str, position_pda: str, amount_x: int, amount_y: int, bin_arrays: List[int]):
        """
        Builds the 'addLiquidity' instruction.
        Issue #3: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/3
        """
        if not self.program or not self.wallet:
            raise ValueError("Program or Wallet not initialized")

        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        
        # Fetch LbPair state for reserve addresses
        state = await self.get_lb_pair_state(pool_address)
        
        # Derive ATAs for the bot wallet
        user_token_x = self.derive_ata(self.wallet.public_key, state.token_x_mint)
        user_token_y = self.derive_ata(self.wallet.public_key, state.token_y_mint)
        
        # Derive BinArray PDAs
        ba_pdas = [self.derive_bin_array_pda(lb_pair_pubkey, idx) for idx in bin_arrays[:3]]
        while len(ba_pdas) < 3:
            ba_pdas.append(METEORA_PROGRAM_ID)

        print(f"[ARMORY] Building 'addLiquidity' for position: {position_pubkey}")

        # Construct instruction with encoded LiquidityParameter
        # bin_arrays args expects list of i64
        ix = self.program.instruction["addLiquidity"](
            {
                "amount_x": amount_x,
                "amount_y": amount_y,
                "bin_arrays": bin_arrays[:3] + [0] * (3 - len(bin_arrays))
            },
            ctx=Context(
                accounts={
                    "position": position_pubkey,
                    "lbPair": lb_pair_pubkey,
                    "userTokenX": user_token_x,
                    "userTokenY": user_token_y,
                    "reserveX": state.reserve_x,
                    "reserveY": state.reserve_y,
                    "tokenXMint": state.token_x_mint,
                    "tokenYMint": state.token_y_mint,
                    "binArray0": ba_pdas[0],
                    "binArray1": ba_pdas[1],
                    "binArray2": ba_pdas[2],
                    "oracle": METEORA_PROGRAM_ID, # Placeholder if optional/unused
                    "tokenProgram": TOKEN_PROGRAM_ID,
                    "eventAuthority": METEORA_PROGRAM_ID, # Placeholder
                    "program": METEORA_PROGRAM_ID
                }
            )
        )
        return ix

    async def close(self):
        await self.client.close()

if __name__ == "__main__":
    async def test():
        armory = MeteoraArmory("https://api.mainnet-beta.solana.com")
        await armory.initialize()
        await armory.close()
    asyncio.run(test())
