
# main.py for the Trade Executor service
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient
from solana.rpc.types import MemcmpOpts, TokenAccountOpts
# from jupiter_solana import Jupiter, JupiterKeys, SolClient, JupReferrerAccount # Commented out Jupiter imports
from typing import Optional, List, Dict, Any
import asyncio
from anchorpy import Program, Provider, Wallet, Idl
# from anchorpy.program.core import get_idl_account_address # Removed this import
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.instruction import Instruction
from solders.transaction import Transaction
# from solana.rpc.api import CommitmentConfig # Removed this import
# from spl.token.constants import TOKEN_PROGRAM_ID # Removed this import
# from spl.associated_token_account.program import ASSOCIATED_TOKEN_PROGRAM_ID # Removed this import
import requests
import json
import logging
import datetime
import threading
from health_server import start_health_server, stop_health_server

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("trade_executor_audit.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# This would be loaded securely, not hardcoded
RPC_ENDPOINT = "https://api.mainnet-beta.solana.com" # Updated RPC_ENDPOINT
TRADING_WALLET_PUBLIC_KEY = "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x" # From MEMORY.md (should be loaded securely in production)
BOT_WALLET_PUBKEY = TRADING_WALLET_PUBLIC_KEY # Aligning with the issue's requirement

# Meteora DLMM Program ID
METEORA_DLMM_PROGRAM_ID = Pubkey.from_string("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")

# Define SPL Token Program ID and Associated Token Account Program ID directly
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXAbZf5XpyXYETzN5Zs")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL") # Corrected Base58 string

# Pyth Hermes REST API Endpoint
PYTH_HERMES_ENDPOINT = "https://hermes.pyth.network/api/latest_price_feeds" # Example endpoint

# Circuit breaker status
CIRCUIT_BREAKER_ACTIVE = False

# Placeholder for Meteora IDL - in a real scenario, this would be loaded from a file or fetched
# This IDL is a *simplified assumption* for demonstration purposes and may not precisely
# match the actual Meteora DLMM IDL. For a production system, the accurate IDL is required.
METEORA_IDL_DICT = {
    "version": "0.1.0",
    "name": "dlmm",
    "instructions": [
        {
            "name": "initializePosition",
            "accounts": [
                {"name": "position", "isMut": True, "isSigner": True},
                {"name": "owner", "isMut": True, "isSigner": True},
                {"name": "pool", "isMut": False, "isSigner": False},
                {"name": "rent", "isMut": False, "isSigner": False},
                {"name": "systemProgram", "isMut": False, "isSigner": False},
            ],
            "args": [
                {"name": "lowerBinId", "type": "i64"},
                {"name": "upperBinId", "type": "i64"},
                {"name": "liquidity", "type": "u64"},
            ],
        },
        {
            "name": "closePosition",
            "accounts": [
                {"name": "position", "isMut": True, "isSigner": False},
                {"name": "owner", "isMut": True, "isSigner": True},
                {"name": "pool", "isMut": False, "isSigner": False},
            ],
            "args": [],
        },
        {
            "name": "claimFees",
            "accounts": [
                {"name": "position", "isMut": True, "isSigner": False},
                {"name": "owner", "isMut": True, "isSigner": True},
                {"name": "pool", "isMut": True, "isSigner": False},
                {"name": "tokenXMint", "isMut": False, "isSigner": False},
                {"name": "tokenYMint", "isMut": False, "isSigner": False},
                {"name": "tokenXAccount", "isMut": True, "isSigner": False},
                {"name": "tokenYAccount", "isMut": True, "isSigner": False},
                {"name": "tokenProgram", "isMut": False, "isSigner": False},
            ],
            "args": [],
        },
        {
            "name": "depositLiquidity",
            "accounts": [
                {"name": "position", "isMut": True, "isSigner": False},
                {"name": "owner", "isMut": True, "isSigner": True},
                {"name": "pool", "isMut": True, "isSigner": False},
                {"name": "tokenXSource", "isMut": True, "isSigner": False},
                {"name": "tokenYSource", "isMut": True, "isSigner": False},
                {"name": "tokenXVault", "isMut": True, "isSigner": False},
                {"name": "tokenYVault", "isMut": True, "isSigner": False},
                {"name": "tokenProgram", "isMut": False, "isSigner": False},
            ],
            "args": [
                {"name": "amountX", "type": "u64"},
                {"name": "amountY", "type": "u64"},
                {"name": "lowerBinId", "type": "i64"},
                {"name": "upperBinId", "type": "i64"},
            ],
        },
    ],
    "accounts": [
        {
            "name": "Position",
            "type": {
                "kind": "struct",
                "fields": [
                    {"name": "owner", "type": "publicKey"},
                    {"name": "pool", "type": "publicKey"},
                    {"name": "lowerBinId", "type": "i64"},
                    {"name": "upperBinId", "type": "i64"},
                    {"name": "liquidity", "type": "u64"},
                    {"name": "totalFeeX", "type": "u64"},
                    {"name": "totalFeeY", "type": "u64"},
                    {"name": "lastUpdatedAt", "type": "i64"},
                ],
            },
        },
        {
            "name": "Pool",
            "type": {
                "kind": "struct",
                "fields": [
                    {"name": "tokenXMint", "type": "publicKey"},
                    {"name": "tokenYMint", "type": "publicKey"},
                ],
            },
        },
    ],
}
METEORA_IDL = Idl.from_json(json.dumps(METEORA_IDL_DICT))

class RiskManager:
    """Manages trading risk, including limits and circuit breaker functionality."""
    def __init__(self, daily_loss_limit: float = -1000.0, max_trade_size: float = 100.0):
        self.daily_loss_limit = daily_loss_limit
        self.max_trade_size = max_trade_size
        self.current_daily_loss = 0.0
        self.circuit_breaker_active = CIRCUIT_BREAKER_ACTIVE
        logger.info("Risk Manager initialized.")
        logger.info(f"-> Daily Loss Limit: {self.daily_loss_limit}")
        logger.info(f"-> Max Trade Size: {self.max_trade_size}")

    def check_trade(self, proposed_trade_amount: float) -> bool:
        """Checks if a proposed trade adheres to risk parameters."""
        if self.circuit_breaker_active:
            logger.warning("Trade rejected: Circuit breaker is active.")
            return False
        if proposed_trade_amount > self.max_trade_size:
            logger.warning(f"Trade rejected: Proposed amount ({proposed_trade_amount}) exceeds max trade size ({self.max_trade_size}).")
            return False
        logger.info(f"Trade approved by Risk Manager for amount: {proposed_trade_amount}")
        return True

    def activate_circuit_breaker(self):
        """Activates the circuit breaker, halting all trading."""
        self.circuit_breaker_active = True
        logger.critical("🚨 CIRCUIT BREAKER ACTIVATED: All trading halted.")

    def deactivate_circuit_breaker(self):
        """Deactivates the circuit breaker, allowing trading to resume."""
        self.circuit_breaker_active = False
        logger.info("✅ CIRCUIT BREAKER DEACTIVATED: Trading can resume.")

class TradeExecutor:
    def __init__(self, rpc_endpoint: str, private_key: str = None):
        self.wallet: Optional[Keypair] = Keypair.from_base58_string(private_key) if private_key else None
        self.client = AsyncClient(rpc_endpoint)
        # self.sol_client = SolClient(rpc_endpoint) # Commented out Jupiter client init
        # self.jupiter_client = Jupiter(
        #     self.sol_client,
        #     jupiter_keys=JupiterKeys(),
        #     referrer=JupReferrerAccount()
        # ) # Commented out Jupiter client init

        self.provider = Provider(self.client, Wallet(self.wallet) if self.wallet else None)
        self.meteora_dlmm_program = Program(
            METEORA_IDL,
            METEORA_DLMM_PROGRAM_ID,
            self.provider
        )
        self.risk_manager = RiskManager()

        logger.info("Trade Executor initialized.")
        if self.wallet:
            logger.info(f"-> Wallet Public Key (loaded): {self.wallet.pubkey()}")
        else:
            logger.warning("-> Wallet not loaded (read-only mode). Open/Close LP positions will not function.")

    async def get_sol_balance(self, pubkey_str: str) -> float:
        """Fetches the SOL balance for a given public key."""
        try:
            pubkey = Pubkey.from_string(pubkey_str)
            balance_response = await self.client.get_balance(pubkey)
            lamports = balance_response.value
            sol = lamports / 1_000_000_000
            logger.info(f"--> Balance for {pubkey_str}: {sol:.9f} SOL")
            return sol
        except Exception as e:
            logger.error(f"--> Error fetching balance for {pubkey_str}: {e}")
            return 0.0

    async def get_token_balance(self, token_account_pubkey: Pubkey) -> float:
        """Fetches the balance of a specific token account."""
        try:
            token_balance_response = await self.client.get_token_account_balance(token_account_pubkey)
            amount = int(token_balance_response.value.amount)
            decimals = token_balance_response.value.decimals
            balance = amount / (10**decimals)
            logger.info(f"--> Token Balance for {token_account_pubkey}: {balance:.{decimals}f}")
            return balance
        except Exception as e:
            logger.error(f"--> Error fetching token balance for {token_account_pubkey}: {e}")
            return 0.0

    # async def get_quote(self, input_mint: Pubkey, output_mint: Pubkey, amount: int):
    #     """Fetches a quote from Jupiter for a given swap."""
    #     logger.info(f"Scrying market whispers for: {amount} of {input_mint} to {output_mint}")
    #     try:
    #         quote_response = await self.jupiter_client.quote_get(
    #             input_mint=input_mint,
    #             output_mint=output_mint,
    #             amount=amount,
    #             swap_mode="ExactIn"
    #         )
    #         if quote_response and quote_response.data:
    #             logger.info("--> Jupiter Quote Received:")
    #             for route in quote_response.data:
    #                 logger.info(f"    - In Amount: {route.in_amount}, Out Amount: {route.out_amount}, Price Impact: {route.price_impact_pct:.2f}%")
    #             return quote_response.data[0]
    #         else:
    #             logger.warning("--> No quotes found.")
    #             return None
    #     except Exception as e:
    #         logger.error(f"--> Error fetching quote: {e}")
    #         return None

    async def get_meteora_lp_positions(self, owner_pubkey: Pubkey) -> List[Dict[str, Any]]:
        """Fetches Meteora DLMM LP positions for a given owner public key."""
        logger.info(f"Scrying Meteora DLMM for LP positions owned by {owner_pubkey} using raw RPC + Anchor decoder...")
        positions = []
        try:
            # Corrected: Pass MemcmpOpts objects directly in the filters list
            filters = [MemcmpOpts(offset=8, bytes=str(owner_pubkey))]

            raw_accounts_response = await self.client.get_program_accounts(
                METEORA_DLMM_PROGRAM_ID,
                filters=filters
            )

            if raw_accounts_response and raw_accounts_response.value:
                for account_info in raw_accounts_response.value:
                    pubkey = account_info.pubkey
                    data = account_info.account.data

                    decoded_account = self.meteora_dlmm_program.coder.accounts.decode("Position", data)

                    pool_data = await self.meteora_dlmm_program.account["Pool"].fetch(decoded_account.pool)
                    token_x_mint = pool_data.token_x_mint
                    token_y_mint = pool_data.token_y_mint

                    owner_token_x_ata = Pubkey.find_program_address(
                        [owner_pubkey.to_bytes(), TOKEN_PROGRAM_ID.to_bytes(), token_x_mint.to_bytes()],
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    )[0]
                    owner_token_y_ata = Pubkey.find_program_address(
                        [owner_pubkey.to_bytes(), TOKEN_PROGRAM_ID.to_bytes(), token_y_mint.to_bytes()],
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    )[0]

                    token_x_balance = await self.get_token_balance(owner_token_x_ata)
                    token_y_balance = await self.get_token_balance(owner_token_y_ata)

                    positions.append({
                        "pubkey": pubkey,
                        "owner": decoded_account.owner,
                        "pool": decoded_account.pool,
                        "tokenXMint": token_x_mint,
                        "tokenYMint": token_y_mint,
                        "ownerTokenXBalance": token_x_balance,
                        "ownerTokenYBalance": token_y_balance,
                        "lowerBinId": decoded_account.lower_bin_id,
                        "upperBinId": decoded_account.upper_bin_id,
                        "liquidity": decoded_account.liquidity,
                        "totalFeeX": decoded_account.total_fee_x,
                        "totalFeeY": decoded_account.total_fee_y,
                        "lastUpdatedAt": decoded_account.last_updated_at,
                    })
                    logger.info(f"    -> Found LP Position {pubkey} in Pool {decoded_account.pool} (TokenX: {token_x_balance}, TokenY: {token_y_balance})")

            else:
                logger.info(f"No raw accounts found for owner {owner_pubkey}.")

            logger.info(f"Found {len(positions)} decoded Position accounts.")

        except Exception as e:
            import traceback
            logger.error(f"--> Error fetching Meteora DLMM LP positions: {e}")
            traceback.print_exc()
        return positions

    async def open_meteora_lp_position(
        self, 
        pool_pubkey: Pubkey, 
        lower_bin_id: int, 
        upper_bin_id: int, 
        liquidity: int,
        payer: Keypair
    ) -> Optional[str]:
        """Opens a new Meteora DLMM LP position."""
        if not self.wallet or self.wallet.pubkey() != payer.pubkey():
            logger.error("❌ Cannot open LP position: Wallet private key not loaded or not matching payer.")
            return None

        logger.info(f"Opening Meteora DLMM LP position for Pool {pool_pubkey}...")
        new_position_keypair = Keypair()

        try:
            ix = await self.meteora_dlmm_program.instruction["initializePosition"].build(
                {
                    "lowerBinId": lower_bin_id,
                    "upperBinId": upper_bin_id,
                    "liquidity": liquidity,
                },
                {
                    "position": new_position_keypair.pubkey(),
                    "owner": payer.pubkey(),
                    "pool": pool_pubkey,
                    "rent": Pubkey.from_string("SysvarRent1111111111111111111111111111111"),
                    "systemProgram": SYSTEM_PROGRAM_ID,
                },
            )
            
            recent_blockhash = (await self.client.get_latest_blockhash()).value.blockhash
            transaction = Transaction.populate(recent_blockhash, [ix], [payer, new_position_keypair])
            
            response = await self.client.send_transaction(transaction, payer, new_position_keypair)
            tx_hash = response.value
            logger.info(f"--> Opened LP Position. Tx Hash: {tx_hash}")
            return tx_hash
        except Exception as e:
            logger.error(f"--> Error opening LP position: {e}")
            return None

    async def close_meteora_lp_position(
        self, 
        position_pubkey: Pubkey, 
        pool_pubkey: Pubkey,
        owner: Keypair
    ) -> Optional[str]:
        """Closes an existing Meteora DLMM LP position."""
        if not self.wallet or self.wallet.pubkey() != owner.pubkey():
            logger.error("❌ Cannot close LP position: Wallet private key not loaded or not matching owner.")
            return None

        logger.info(f"Closing Meteora DLMM LP position {position_pubkey} for Pool {pool_pubkey}...")
        try:
            ix = await self.meteora_dlmm_program.instruction["closePosition"].build(
                {},
                {
                    "position": position_pubkey,
                    "owner": owner.pubkey(),
                    "pool": pool_pubkey,
                },
            )
            
            recent_blockhash = (await self.client.get_latest_blockhash()).value.blockhash
            transaction = Transaction.populate(recent_blockhash, [ix], [owner])
            
            response = await self.client.send_transaction(transaction, owner)
            tx_hash = response.value
            logger.info(f"--> Closed LP Position. Tx Hash: {tx_hash}")
            return tx_hash
        except Exception as e:
            logger.error(f"--> Error closing LP position: {e}")
            return None

    async def claim_meteora_fees(
        self, 
        position_pubkey: Pubkey,
        pool_pubkey: Pubkey,
        token_x_mint: Pubkey,
        token_y_mint: Pubkey,
        owner: Keypair,
    ) -> Optional[str]:
        """Claims accumulated fees from a Meteora DLMM LP position."""
        if not self.wallet or self.wallet.pubkey() != owner.pubkey():
            logger.error("❌ Cannot claim fees: Wallet private key not loaded or not matching owner.")
            return None
        
        logger.info(f"Claiming fees for LP position {position_pubkey} in Pool {pool_pubkey}...")
        try:
            owner_token_x_account = Pubkey.find_program_address(
                [owner.pubkey().to_bytes(), TOKEN_PROGRAM_ID.to_bytes(), token_x_mint.to_bytes()],
                ASSOCIATED_TOKEN_PROGRAM_ID
            )[0]
            owner_token_y_account = Pubkey.find_program_address(
                [owner.pubkey().to_bytes(), TOKEN_PROGRAM_ID.to_bytes(), token_y_mint.to_bytes()],
                ASSOCIATED_TOKEN_PROGRAM_ID
            )[0]

            ix = await self.meteora_dlmm_program.instruction["claimFees"].build(
                {},
                {
                    "position": position_pubkey,
                    "owner": owner.pubkey(),
                    "pool": pool_pubkey,
                    "tokenXMint": token_x_mint,
                    "tokenYMint": token_y_mint,
                    "tokenXAccount": owner_token_x_account,
                    "tokenYAccount": owner_token_y_account,
                    "tokenProgram": TOKEN_PROGRAM_ID,
                },
            )

            recent_blockhash = (await self.client.get_latest_blockhash()).value.blockhash
            transaction = Transaction.populate(recent_blockhash, [ix], [owner])
            
            response = await self.client.send_transaction(transaction, owner)
            tx_hash = response.value
            logger.info(f"--> Claimed fees. Tx Hash: {tx_hash}")
            return tx_hash
        except Exception as e:
            logger.error(f"--> Error claiming fees: {e}")
            return None

    async def compound_meteora_fees(
        self, 
        position_pubkey: Pubkey,
        pool_pubkey: Pubkey,
        token_x_mint: Pubkey,
        token_y_mint: Pubkey,
        amount_x: int,
        amount_y: int,
        lower_bin_id: int,
        upper_bin_id: int,
        owner: Keypair,
    ) -> Optional[str]:
        """Compounds (re-invests) claimed fees back into a Meteora DLMM LP position."""
        if not self.wallet or self.wallet.pubkey() != owner.pubkey():
            logger.error("❌ Cannot compound fees: Wallet private key not loaded or not matching owner.")
            return None
        
        logger.info(f"Compounding fees into LP position {position_pubkey} in Pool {pool_pubkey}...")
        try:
            owner_token_x_account = Pubkey.find_program_address(
                [owner.pubkey().to_bytes(), TOKEN_PROGRAM_ID.to_bytes(), token_x_mint.to_bytes()],
                ASSOCIATED_TOKEN_PROGRAM_ID
            )[0]
            owner_token_y_account = Pubkey.find_program_address(
                [owner.pubkey().to_bytes(), TOKEN_PROGRAM_ID.to_bytes(), token_y_mint.to_bytes()],
                ASSOCIATED_TOKEN_PROGRAM_ID
            )[0]

            ix = await self.meteora_dlmm_program.instruction["depositLiquidity"].build(
                {
                    "amountX": amount_x,
                    "amountY": amount_y,
                    "lowerBinId": lower_bin_id,
                    "upperBinId": upper_bin_id,
                },
                {
                    "position": position_pubkey,
                    "owner": owner.pubkey(),
                    "pool": pool_pubkey,
                    "tokenXSource": owner_token_x_account,
                    "tokenYSource": owner_token_y_account,
                    "tokenXVault": Pubkey.new_unique(),
                    "tokenYVault": Pubkey.new_unique(),
                    "tokenProgram": TOKEN_PROGRAM_ID,
                },
            )

            recent_blockhash = (await self.client.get_latest_blockhash()).value.blockhash
            transaction = Transaction.populate(recent_blockhash, [ix], [owner])
            
            response = await self.client.send_transaction(transaction, owner)
            tx_hash = response.value
            logger.info(f"--> Compounded fees. Tx Hash: {tx_hash}")
            return tx_hash
        except Exception as e:
            logger.error(f"--> Error compounding fees: {e}")
            return None

    async def calculate_unrealized_pnl(
        self, 
        position_data: Dict[str, Any],
        current_price_x_per_y: float
    ) -> Dict[str, float]:
        """Calculates unrealized P&L for a given LP position (simplified)."""
        logger.info(f"Calculating unrealized P&L for position {position_data['pubkey']}...")
        current_value_x = position_data['liquidity'] * current_price_x_per_y
        current_value_y = position_data['liquidity']
        total_current_value = current_value_x + current_value_y
        initial_investment_value = position_data['liquidity'] * 2
        unrealized_pnl = total_current_value - initial_investment_value
        total_fees_earned = position_data['totalFeeX'] + position_data['totalFeeY']

        return {
            "unrealized_pnl": unrealized_pnl,
            "total_fees_earned": total_fees_earned,
            "total_value": total_current_value
        }

    async def get_pyth_price(self, price_feed_id: str) -> Optional[Dict[str, Any]]:
        """Fetches the latest Pyth price for a given price feed ID via Hermes REST API."""
        logger.info(f"Consulting the oracle for Pyth price feed {price_feed_id}...")
        try:
            params = {"ids": price_feed_id}
            response = requests.get(PYTH_HERMES_ENDPOINT, params=params)
            response.raise_for_status()
            data = response.json()

            if data and data["evm"] and len(data["evm"]) > 0:
                price_data = data["evm"][0]
                logger.info(f"--> Pyth Price for {price_feed_id}: {price_data['price']} +/- {price_data['conf']} (expo: {price_data['expo']})")
                return price_data
            else:
                logger.warning(f"--> No Pyth price data found for {price_feed_id}.")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"--> Error fetching Pyth price via Hermes: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"--> Error decoding JSON response from Hermes: {e}")
            return None
        except Exception as e:
            logger.error(f"--> An unexpected error occurred: {e}")
            return None

    def execute_trade(self, trade_details: dict) -> Dict[str, Any]:
        """
        Connects to the DEX and executes a swap.
        """
        logger.info(f"Trade attempt initiated: {trade_details}")
        proposed_amount = trade_details.get("amount", 0.0)
        if not self.risk_manager.check_trade(proposed_amount):
            logger.warning(f"Trade {trade_details} rejected by Risk Manager.")
            return {"status": "rejected", "message": "Trade rejected by Risk Manager"}

        if not self.wallet:
            logger.error("❌ Cannot execute trade: Wallet private key not loaded.")
            return {"status": "error", "message": "Wallet not loaded"}
        
        logger.info(f"Executing trade: {trade_details}")
        trade_status = {"status": "pending", "tx_hash": None}
        logger.info(f"Trade execution logic is not yet implemented. Status: {trade_status}")
        logger.info(f"Trade outcome: {trade_status}")

        return trade_status

from health_server import start_health_server, stop_health_server
import threading
import datetime

if __name__ == "__main__":
    import asyncio

    async def main_async():
        health_server_thread = threading.Thread(target=start_health_server, args=(8000,), daemon=True)
        health_server_thread.start()
        logger.info("Health server started in a separate thread.")

        try:
            logger.info("Quenching the blade: Checking connection to Solana network...")
            TEST_PRIVATE_KEY = "" # WARNING: DO NOT USE A REAL WALLET'S PRIVATE KEY HERE
            executor = TradeExecutor(RPC_ENDPOINT, private_key=TEST_PRIVATE_KEY)
            
            logger.info(f"\nChecking balance for the designated bot wallet...")
            bot_pubkey = Pubkey.from_string(BOT_WALLET_PUBKEY)
            await executor.get_sol_balance(BOT_WALLET_PUBKEY)

            SOL_MINT = Pubkey.from_string("So11111111111111111111111111111111111111112")
            USDC_MINT = Pubkey.from_string("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
            
            amount_to_swap = 10_000_000

            # logger.info(f"\nAttempting to fetch a Jupiter quote for {amount_to_swap / 1_000_000_000} SOL to USDC...") # Commented out Jupiter call
            # quote = await executor.get_quote(SOL_MINT, USDC_MINT, amount_to_swap)
            # if quote:
            #     logger.info(f"Successfully fetched a quote. Out amount: {quote.out_amount}")

            logger.info(f"\nAttempting to fetch Meteora DLMM LP positions for {BOT_WALLET_PUBKEY}...")
            lp_positions = await executor.get_meteora_lp_positions(bot_pubkey)
            
            if lp_positions:
                logger.info("--> Found LP Positions:")
                for i, pos in enumerate(lp_positions):
                    logger.info(f"    Position {i+1} (Pubkey: {pos['pubkey']}):")
                    logger.info(f"        Owner: {pos['owner']}")
                    logger.info(f"        Pool: {pos['pool']}")
                    logger.info(f"        Liquidity: {pos['liquidity']}")
                    logger.info(f"        Token X Mint: {pos['tokenXMint']}")
                    logger.info(f"        Token Y Mint: {pos['tokenYMint']}")
                    logger.info(f"        Owner Token X Balance: {pos['ownerTokenXBalance']:.4f}")
                    logger.info(f"        Owner Token Y Balance: {pos['ownerTokenYBalance']:.4f}")

                    logger.info(f"        Calculating P&L for Position {pos['pubkey']}...")
                    current_price_x_per_y = 0.5
                    pnl_results = await executor.calculate_unrealized_pnl(pos, current_price_x_per_y)
                    logger.info(f"            Unrealized P&L: {pnl_results['unrealized_pnl']:.4f}")
                    logger.info(f"            Total Fees Earned: {pnl_results['total_fees_earned']}")
                    logger.info(f"            Total Current Value: {pnl_results['total_value']:.4f}")

                if executor.wallet:
                    first_position_pubkey = lp_positions[0]['pubkey']
                    first_position_pool_pubkey = lp_positions[0]['pool']
                    logger.info(f"\nAttempting to claim fees from LP position {first_position_pubkey}...")
                    DUMMY_TOKEN_X_MINT = Pubkey.new_unique()
                    DUMMY_TOKEN_Y_MINT = Pubkey.new_unique()

                    tx_claim = await executor.claim_meteora_fees(
                        position_pubkey=first_position_pubkey,
                        pool_pubkey=first_position_pool_pubkey,
                        token_x_mint=DUMMY_TOKEN_X_MINT,
                        token_y_mint=DUMMY_TOKEN_Y_MINT,
                        owner=executor.wallet
                    )
                    if tx_claim:
                        logger.info(f"Claim fees transaction sent: {tx_claim}")
                else:
                    logger.warning("Cannot claim fees: Wallet not loaded.")

                if executor.wallet:
                    logger.info(f"\nAttempting to compound fees back into LP position {first_position_pubkey}...")
                    COMPOUND_AMOUNT_X = 1000
                    COMPOUND_AMOUNT_Y = 500
                    COMPOUND_LOWER_BIN = lp_positions[0]['lowerBinId']
                    COMPOUND_UPPER_BIN = lp_positions[0]['upperBinId']

                    tx_compound = await executor.compound_meteora_fees(
                        position_pubkey=first_position_pubkey,
                        pool_pubkey=first_position_pool_pubkey,
                        token_x_mint=DUMMY_TOKEN_X_MINT,
                        token_y_mint=DUMMY_TOKEN_Y_MINT,
                        amount_x=COMPOUND_AMOUNT_X,
                        amount_y=COMPOUND_AMOUNT_Y,
                        lower_bin_id=COMPOUND_LOWER_BIN,
                        upper_bin_id=COMPOUND_UPPER_BIN,
                        owner=executor.wallet
                    )
                    if tx_compound:
                        logger.info(f"Compound fees transaction sent: {tx_compound}")
                else:
                    logger.warning("Cannot compound fees: Wallet not loaded.")

            else:
                logger.info("--> No LP positions found for the bot wallet. Cannot demonstrate claiming or compounding.")

            if executor.wallet:
                DUMMY_POOL_PUBKEY = Pubkey.new_unique()
                DUMMY_LOWER_BIN = 0
                DUMMY_UPPER_BIN = 100
                DUMMY_LIQUIDITY = 1000000

                logger.info(f"\nAttempting to open a new LP position in dummy pool {DUMMY_POOL_PUBKEY}...")
                tx_open = await executor.open_meteora_lp_position(
                    pool_pubkey=DUMMY_POOL_PUBKEY,
                    lower_bin_id=DUMMY_LOWER_BIN,
                    upper_bin_id=DUMMY_UPPER_BIN,
                    liquidity=DUMMY_LIQUIDITY,
                    payer=executor.wallet
                )
                if tx_open:
                    logger.info(f"Open transaction sent: {tx_open}")
            else:
                logger.warning("Cannot open LP position: Wallet not loaded.")
            
            logger.info("\n--- Pyth Price Feed Integration ---")
            SOL_USD_PRICE_FEED_ID = "EdVCmQyygBCjS6nMj2xT9EtsNq5V3d3g1i9j1v3BvA6Z"
            eth_usd_price_feed_id = "JBuCRv6r2eH2gC257y3R8XoJvK9vWpE2bS4M1f2B2Q3B"

            sol_price_data = await executor.get_pyth_price(SOL_USD_PRICE_FEED_ID)
            if sol_price_data:
                logger.info(f"SOL/USD Price: {sol_price_data['price']}")
            
            eth_price_data = await executor.get_pyth_price(eth_usd_price_feed_id)
            if eth_price_data:
                logger.info(f"ETH/USD Price: {eth_price_data['price']}")

            logger.info("\n--- Risk Manager Demonstration ---")
            test_trade_amount_ok = 50.0
            test_trade_amount_too_large = 150.0

            logger.info(f"Attempting trade with amount: {test_trade_amount_ok}")
            trade_result_ok = executor.execute_trade({"amount": test_trade_amount_ok, "pair": "SOL/USDC"})
            logger.info(f"Trade result: {trade_result_ok}")

            logger.info(f"\nAttempting trade with amount: {test_trade_amount_too_large}")
            trade_result_too_large = executor.execute_trade({"amount": test_trade_amount_too_large, "pair": "SOL/USDC"})
            logger.info(f"Trade result: {trade_result_too_large}")

            logger.info("\nActivating circuit breaker...")
            executor.risk_manager.activate_circuit_breaker()
            trade_result_cb = executor.execute_trade({"amount": test_trade_amount_ok, "pair": "SOL/USDC"})
            logger.info(f"Trade result after circuit breaker: {trade_result_cb}")

            logger.info("\nDeactivating circuit breaker...")
            executor.risk_manager.deactivate_circuit_breaker()
            trade_result_deactivated = executor.execute_trade({"amount": test_trade_amount_ok, "pair": "SOL/USDC"})
            logger.info(f"Trade result after deactivation: {trade_result_deactivated}")

        finally:
            stop_health_server()
            logger.info("Main async function finished, health server stopped.")
    asyncio.run(main_async())
