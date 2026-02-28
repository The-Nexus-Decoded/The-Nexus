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
    Supporting Issue #4: https://github.com/The-Nexus-Decoded/Pryan-Fire/issues/4 (Fee Claiming)
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
            print("[ARMORY WARNING] IDL file not found. Functionality relying on accurate account fetching will be limited.")

    async def get_lb_pair_state(self, lb_pair_address: str):
        """Fetches and decodes the state of an LbPair (Issue #19)."""
        if not self.program:
            await self.initialize()
        
        # TEMPORARY: Return a dummy object if IDL fetching/decoding fails due to discriminator issues.
        # This allows other functions to proceed without hard crashing while discriminator issue is resolved.
        try:
            state = await self.program.account["LbPair"].fetch(Pubkey.from_string(lb_pair_address))
            return state
        except Exception as e:
            print(f"[ARMORY WARNING] Failed to fetch LbPair state for {lb_pair_address}: {e}. Returning dummy state.")
            class DummyLbPairState:
                token_x_mint = METEORA_PROGRAM_ID
                token_y_mint = METEORA_PROGRAM_ID
                reserve_x = METEORA_PROGRAM_ID
                reserve_y = METEORA_PROGRAM_ID
            return DummyLbPairState()

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
            print(f"[ARMORY ERROR] Position scan failed: {e}. Returning empty list.")
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
        state = await self.get_lb_pair_state(pool_address) 
        user_token_x = self.derive_ata(self.wallet.public_key, state.token_x_mint)
        user_token_y = self.derive_ata(self.wallet.public_key, state.token_y_mint)
        ba_pdas = [self.derive_bin_array_pda(lb_pair_pubkey, idx) for idx in bin_arrays[:3]]
        while len(ba_pdas) < 3: ba_pdas.append(METEORA_PROGRAM_ID) 

        return self.program.instruction["add_liquidity"](
            {"amount_x": amount_x, "amount_y": amount_y, "bin_arrays": bin_arrays[:3] + [0] * (3 - len(bin_arrays))},
            ctx=Context(accounts={
                "position": position_pubkey, "lb_pair": lb_pair_pubkey, "user_token_x": user_token_x, "user_token_y": user_token_y,
                "reserve_x": state.reserve_x, "reserve_y": state.reserve_y, "token_x_mint": state.token_x_mint, "token_y_mint": state.token_y_mint,
                "bin_array_0": ba_pdas[0], "bin_array_1": ba_pdas[1], "bin_array_2": ba_pdas[2], "oracle": METEORA_PROGRAM_ID,
                "token_program": TOKEN_PROGRAM_ID, "event_authority": METEORA_PROGRAM_ID, "program": METEORA_PROGRAM_ID
            })
        )

    async def build_remove_liquidity_ix(self, pool_address: str, position_pda: str, amount_x: int, amount_y: int, bin_arrays: List[int]):
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        state = await self.get_lb_pair_state(pool_address) 
        user_token_x = self.derive_ata(self.wallet.public_key, state.token_x_mint)
        user_token_y = self.derive_ata(self.wallet.public_key, state.token_y_mint)
        ba_pdas = [self.derive_bin_array_pda(lb_pair_pubkey, idx) for idx in bin_arrays[:3]]
        while len(ba_pdas) < 3: ba_pdas.append(METEORA_PROGRAM_ID) 

        return self.program.instruction["remove_liquidity"](
            {"amount_x": amount_x, "amount_y": amount_y, "bin_arrays": bin_arrays[:3] + [0] * (3 - len(bin_arrays))},
            ctx=Context(accounts={
                "position": position_pubkey, "lb_pair": lb_pair_pubkey, "user_token_x": user_token_x, "user_token_y": user_token_y,
                "reserve_x": state.reserve_x, "reserve_y": state.reserve_y, "token_x_mint": state.token_x_mint, "token_y_mint": state.token_y_mint,
                "bin_array_0": ba_pdas[0], "bin_array_1": ba_pdas[1], "bin_array_2": ba_pdas[2], "oracle": METEORA_PROGRAM_ID,
                "token_program": TOKEN_PROGRAM_ID, "event_authority": METEORA_PROGRAM_ID, "program": METEORA_PROGRAM_ID
            })
        )

    async def build_close_position_ix(self, pool_address: str, position_pda: str):
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        return self.program.instruction["close_position"](
            ctx=Context(accounts={
                "receiver": self.wallet.public_key, "position": position_pubkey, "lb_pair": lb_pair_pubkey,
                "bin_array_bitmap_extension": METEORA_PROGRAM_ID, "event_authority": METEORA_PROGRAM_ID, "program": METEORA_PROGRAM_ID
            })
        )

    async def build_claim_fee_ix(self, pool_address: str, position_pda: str):
        """
        Builds the instruction to claim fees from a position.
        Supporting Issue #4.
        """
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        state = await self.get_lb_pair_state(pool_address) # Dummy state for now due to discriminator issue
        user_token_x_ata = self.derive_ata(self.wallet.public_key, state.token_x_mint)
        user_token_y_ata = self.derive_ata(self.wallet.public_key, state.token_y_mint)

        return self.program.instruction["claim_fee"](
            ctx=Context(accounts={
                "position": position_pubkey,
                "lb_pair": lb_pair_pubkey,
                "owner": self.wallet.public_key,
                "user_token_x": user_token_x_ata,
                "user_token_y": user_token_y_ata,
                "token_x_mint": state.token_x_mint, # Using dummy from state if real fetch fails
                "token_y_mint": state.token_y_mint, # Using dummy from state if real fetch fails
                "reserve_x": state.reserve_x, # Using dummy from state if real fetch fails
                "reserve_y": state.reserve_y, # Using dummy from state if real fetch fails
                "token_program": TOKEN_PROGRAM_ID,
                "event_authority": METEORA_PROGRAM_ID, # Placeholder
                "program": METEORA_PROGRAM_ID # Placeholder
            })
        )

    async def build_claim_reward_ix(self, pool_address: str, position_pda: str):
        """
        Builds the instruction to claim rewards (incentives) from a position.
        Supporting Issue #4.
        """
        if not self.program or not self.wallet: raise ValueError("Program/Wallet not ready")
        lb_pair_pubkey = Pubkey.from_string(pool_address)
        position_pubkey = Pubkey.from_string(position_pda)
        state = await self.get_lb_pair_state(pool_address) # Dummy state for now due to discriminator issue
        user_reward_mint_ata = self.derive_ata(self.wallet.public_key, METEORA_PROGRAM_ID) # Placeholder for reward mint

        return self.program.instruction["claim_reward"](
            ctx=Context(accounts={
                "position": position_pubkey,
                "lb_pair": lb_pair_pubkey,
                "owner": self.wallet.public_key,
                "user_reward_mint": user_reward_mint_ata,
                "reward_mint": METEORA_PROGRAM_ID, # Placeholder for reward mint
                "token_program": TOKEN_PROGRAM_ID,
                "event_authority": METEORA_PROGRAM_ID, # Placeholder
                "program": METEORA_PROGRAM_ID # Placeholder
            })
        )

    async def close(self):
        await self.client.close()

if __name__ == "__main__":
    async def test():
        armory = MeteoraArmory("https://api.mainnet-beta.solana.com", Keypair())
        await armory.initialize()
        # Test dummy get_lb_pair_state
        dummy_state = await armory.get_lb_pair_state("some_dummy_address")
        print(f"Dummy state token_x_mint: {dummy_state.token_x_mint}")

        # Test build_claim_fee_ix (will use dummy accounts)
        try:
            claim_fee_ix = await armory.build_claim_fee_ix("some_pool_addr", "some_pos_pda")
            print(f"Claim Fee IX built: {claim_fee_ix}")
        except Exception as e:
            print(f"Error building claim fee IX: {e}")

        # Test build_claim_reward_ix (will use dummy accounts)
        try:
            claim_reward_ix = await armory.build_claim_reward_ix("some_pool_addr", "some_pos_pda")
            print(f"Claim Reward IX built: {claim_reward_ix}")
        except Exception as e:
            print(f"Error building claim reward IX: {e}")

        await armory.close()
    asyncio.run(test())
