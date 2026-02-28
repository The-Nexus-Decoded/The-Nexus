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
METEORA_PROGRAM_ID = Pubkey.from_string("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")
RENT_SYSVAR = Pubkey.from_string("SysvarRent111111111111111111111111111111111")
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdQxrVca29as98E2kE53v5w5b3T97ArJC7y")

class MeteoraArmory:
    """
    Hugh's Execution Core for Meteora DLMM.
    Updated for IDL v0.9.1 and 'Pool' discriminator alignment.
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
            print(f"[ARMORY] Program initialized with ID: {METEORA_PROGRAM_ID} (IDL v0.9.1, Pool alignment)")
        else:
            print("[ARMORY WARNING] IDL file not found.")

    async def get_pool_state(self, pool_address: str):
        """Fetches and decodes the state of a Pool."""
        if not self.program:
            await self.initialize()
        # IDL updated from 'LbPair' to 'Pool' to match f19a6d0411b16dbc
        state = await self.program.account["Pool"].fetch(Pubkey.from_string(pool_address))
        return state

    async def scan_user_positions(self, owner_address: str) -> List[Dict[str, Any]]:
        """Scans for active positions for a given owner."""
        if not self.program:
            await self.initialize()
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
        state = await self.get_pool_state(pool_address) 
        user_token_x = self.derive_ata(self.wallet.public_key, state.token_x_mint)
        user_token_y = self.derive_ata(self.wallet.public_key, state.token_y_mint)
        
        # In anchorpy, struct args are often passed as kwargs directly if they are the only arg, or named explicitly
        liquidity_parameter = {
            "amount_x": amount_x, 
            "amount_y": amount_y, 
            "bin_arrays": bin_arrays[:3] + [0] * (3 - len(bin_arrays))
        }

        return self.program.instruction["add_liquidity"](
            liquidity_parameter, # Pass as positional arg mapped to the struct
            ctx=Context(accounts={
                "position": position_pubkey, "lb_pair": lb_pair_pubkey, 
                "bin_array_bitmap_extension": METEORA_PROGRAM_ID, 
                "user_token_x": user_token_x, "user_token_y": user_token_y,
                "reserve_x": state.reserve_x, "reserve_y": state.reserve_y, 
                "token_x_mint": state.token_x_mint, "token_y_mint": state.token_y_mint,
                "bin_array_lower": self.derive_bin_array_pda(lb_pair_pubkey, bin_arrays[0]), 
                "bin_array_upper": self.derive_bin_array_pda(lb_pair_pubkey, bin_arrays[-1]),
                "sender": self.wallet.public_key,
                "token_x_program": TOKEN_PROGRAM_ID, "token_y_program": TOKEN_PROGRAM_ID,
                "event_authority": METEORA_PROGRAM_ID, "program": METEORA_PROGRAM_ID
            })
        )

    async def build_remove_liquidity_ix(self, pool_address: str, position_pda: str, amount_x: int, amount_y: int, bin_arrays: List[int]):
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        state = await self.get_pool_state(pool_address) 
        user_token_x = self.derive_ata(self.wallet.public_key, state.token_x_mint)
        user_token_y = self.derive_ata(self.wallet.public_key, state.token_y_mint)
        
        liquidity_parameter = {
            "amount_x": amount_x, 
            "amount_y": amount_y, 
            "bin_arrays": bin_arrays[:3] + [0] * (3 - len(bin_arrays))
        }

        return self.program.instruction["remove_liquidity"](
            liquidity_parameter,
            ctx=Context(accounts={
                "position": position_pubkey, "lb_pair": lb_pair_pubkey,
                "bin_array_bitmap_extension": METEORA_PROGRAM_ID, 
                "user_token_x": user_token_x, "user_token_y": user_token_y,
                "reserve_x": state.reserve_x, "reserve_y": state.reserve_y, 
                "token_x_mint": state.token_x_mint, "token_y_mint": state.token_y_mint,
                "bin_array_lower": self.derive_bin_array_pda(lb_pair_pubkey, bin_arrays[0]), 
                "bin_array_upper": self.derive_bin_array_pda(lb_pair_pubkey, bin_arrays[-1]),
                "sender": self.wallet.public_key,
                "token_x_program": TOKEN_PROGRAM_ID, "token_y_program": TOKEN_PROGRAM_ID,
                "event_authority": METEORA_PROGRAM_ID, "program": METEORA_PROGRAM_ID
            })
        )

    async def build_close_position_ix(self, pool_address: str, position_pda: str):
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        return self.program.instruction["close_position"](
            ctx=Context(accounts={
                "position": position_pubkey, "lb_pair": lb_pair_pubkey,
                "bin_array_lower": METEORA_PROGRAM_ID, "bin_array_upper": METEORA_PROGRAM_ID, 
                "sender": self.wallet.public_key, "rent_receiver": self.wallet.public_key,
                "event_authority": METEORA_PROGRAM_ID, "program": METEORA_PROGRAM_ID
            })
        )

    async def build_claim_fee_ix(self, pool_address: str, position_pda: str):
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        state = await self.get_pool_state(pool_address) 
        user_token_x_ata = self.derive_ata(self.wallet.public_key, state.token_x_mint)
        user_token_y_ata = self.derive_ata(self.wallet.public_key, state.token_y_mint)

        return self.program.instruction["claim_fee"](
            ctx=Context(accounts={
                "lb_pair": lb_pair_pubkey, "position": position_pubkey,
                "bin_array_lower": METEORA_PROGRAM_ID, "bin_array_upper": METEORA_PROGRAM_ID, 
                "sender": self.wallet.public_key,
                "reserve_x": state.reserve_x, "reserve_y": state.reserve_y,
                "user_token_x": user_token_x_ata, "user_token_y": user_token_y_ata,
                "token_x_mint": state.token_x_mint, "token_y_mint": state.token_y_mint,
                "token_program": TOKEN_PROGRAM_ID, "event_authority": METEORA_PROGRAM_ID, "program": METEORA_PROGRAM_ID
            })
        )

    async def build_claim_reward_ix(self, pool_address: str, position_pda: str, reward_index: int = 0):
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        return self.program.instruction["claim_reward"](
            reward_index,
            ctx=Context(accounts={
                "lb_pair": lb_pair_pubkey, "position": position_pubkey,
                "bin_array_lower": METEORA_PROGRAM_ID, "bin_array_upper": METEORA_PROGRAM_ID, 
                "sender": self.wallet.public_key, "reward_vault": METEORA_PROGRAM_ID,
                "reward_mint": METEORA_PROGRAM_ID, "user_token_account": self.wallet.public_key,
                "token_program": TOKEN_PROGRAM_ID, "event_authority": METEORA_PROGRAM_ID, "program": METEORA_PROGRAM_ID
            })
        )

    async def close(self):
        await self.client.close()

if __name__ == "__main__":
    async def test():
        armory = MeteoraArmory("https://api.mainnet-beta.solana.com", Keypair())
        await armory.initialize()
        try:
            # SOL/USDC Pool
            state = await armory.get_pool_state("8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie")
            print(f"SUCCESS! token_x_mint: {state.token_x_mint}")
        except Exception as e:
            print(f"FAILED! issue: {e}")
        await armory.close()
    asyncio.run(test())
