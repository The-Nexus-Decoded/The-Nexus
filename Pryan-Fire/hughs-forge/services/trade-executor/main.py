# main.py for the Trade Executor service
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.api import Client
from solana.rpc.types import TokenAccountOpts
from jupiter_solana import Jupiter, JupiterKeys, SolClient, JupReferrerAccount
from typing import Optional, List, Dict, Any
import asyncio
from anchorpy import Program, Provider, Wallet
from anchorpy.program.core import get_idl_account_address
from anchorpy.idl import Idl
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.instruction import Instruction
from solders.transaction import Transaction
from solana.rpc.api import CommitmentConfig
from spl.token.constants import TOKEN_PROGRAM_ID
from spl.associated_token_account.program import ASSOCIATED_TOKEN_PROGRAM_ID
import requests
import json
import logging # New import for logging
import datetime # New import for timestamps

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("trade_executor_audit.log"), # Log to file
        logging.StreamHandler() # Also log to console
    ]
)
logger = logging.getLogger(__name__)

# This would be loaded securely, not hardcoded
RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"
BOT_WALLET_PUBKEY = "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x" # From MEMORY.md

# Meteora DLMM Program ID
METEORA_DLMM_PROGRAM_ID = Pubkey.from_string("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")

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
                {"name": "pool", "isMut": False, "isSigner": False}, # Pool might be needed for closing
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
            "name": "depositLiquidity", # Hypothetical instruction for compounding/adding liquidity
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
    ],
}
METEORA_IDL = Idl.parse_raw(METEORA_IDL_DICT.encode('utf-8'))

class RiskManager:
    """Manages trading risk, including limits and circuit breaker functionality."""
    def __init__(self, daily_loss_limit: float = -1000.0, max_trade_size: float = 100.0):
        self.daily_loss_limit = daily_loss_limit # Example: -1000 USDC
        self.max_trade_size = max_trade_size # Example: 100 USDC equivalent
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
        # More complex checks (e.g., against current_daily_loss) would go here
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
        self.client = Client(rpc_endpoint)
        self.sol_client = SolClient(rpc_endpoint) # For Jupiter-Solana
        self.jupiter_client = Jupiter(
            self.sol_client,
            jupiter_keys=JupiterKeys(),
            referrer=JupReferrerAccount()
        )

        # Initialize AnchorPy for Meteora DLMM
        self.provider = Provider(self.client, Wallet(self.wallet) if self.wallet else None)
        self.meteora_dlmm_program = Program(
            METEORA_IDL,
            METEORA_DLMM_PROGRAM_ID,
            self.provider
        )
        self.risk_manager = RiskManager() # Initialize Risk Manager

        logger.info("Trade Executor initialized.")
        if self.wallet:
            logger.info(f"-> Wallet Public Key (loaded): {self.wallet.pubkey()}")
        else:
            logger.warning("-> Wallet not loaded (read-only mode). Open/Close LP positions will not function.")

    def get_sol_balance(self, pubkey_str: str) -> float:
        """Fetches the SOL balance for a given public key."""
        try:
            pubkey = Pubkey.from_string(pubkey_str)
            balance_response = self.client.get_balance(pubkey)
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

    async def get_quote(self, input_mint: Pubkey, output_mint: Pubkey, amount: int):
        """Fetches a quote from Jupiter for a given swap."""
        logger.info(f"Scrying market whispers for: {amount} of {input_mint} to {output_mint}")
        try:
            quote_response = await self.jupiter_client.quote_get(
                input_mint=input_mint,
                output_mint=output_mint,
                amount=amount,
                swap_mode="ExactIn"
            )
            if quote_response and quote_response.data:
                logger.info("--> Jupiter Quote Received:")
                for route in quote_response.data:
                    logger.info(f"    - In Amount: {route.in_amount}, Out Amount: {route.out_amount}, Price Impact: {route.price_impact_pct:.2f}%")
                return quote_response.data[0] # Return the first route for simplicity
            else:
                logger.warning("--> No quotes found.")
                return None
        except Exception as e:
            logger.error(f"--> Error fetching quote: {e}")
            return None

    async def get_meteora_lp_positions(self, owner_pubkey: Pubkey) -> List[Dict[str, Any]]:
        """Fetches Meteora DLMM LP positions for a given owner public key."""
        logger.info(f"Scrying Meteora DLMM for LP positions owned by {owner_pubkey}...")
        positions = []
        try:
            # Fetch all accounts owned by the Meteora DLMM program
            all_accounts = await self.client.get_program_accounts(
                METEORA_DLMM_PROGRAM_ID,
                TokenAccountOpts(encoding="base64", data_slice=None, commitment="confirmed")
            )

            # Filter and decode 'Position' accounts
            for account_info in all_accounts.value:
                try:
                    # Attempt to decode as a Position account
                    decoded_account = await self.meteora_dlmm_program.account["Position"].fetch(account_info.pubkey)
                    if decoded_account.owner == owner_pubkey:
                        positions.append({
                            "pubkey": account_info.pubkey,
                            "owner": decoded_account.owner,
                            "pool": decoded_account.pool,
                            "lowerBinId": decoded_account.lower_bin_id,
                            "upperBinId": decoded_account.upper_bin_id,
                            "liquidity": decoded_account.liquidity,
                            "totalFeeX": decoded_account.total_fee_x,
                            "totalFeeY": decoded_account.total_fee_y,
                            "lastUpdatedAt": decoded_account.last_updated_at,
                        })
                        logger.info(f"    -> Found LP Position {account_info.pubkey} in Pool {decoded_account.pool}")
                except Exception as e:
                    # This account might not be a 'Position' account or decoding failed
                    pass # Silently ignore accounts that don't match 'Position' type

            if not positions:
                logger.info(f"--> No Meteora DLMM LP positions found for {owner_pubkey}.")
            return positions
        except Exception as e:
            logger.error(f"--> Error fetching Meteora DLMM LP positions: {e}")
            return []

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
            # Construct the instruction
            # This is a simplified call assuming the IDL matches these arguments and accounts.
            # Real-world usage would require careful matching to the actual program IDL.
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
                    "rent": Pubkey.from_string("SysvarRent1111111111111111111111111111111"), # Assuming Rent Sysvar
                    "systemProgram": SYSTEM_PROGRAM_ID,
                },
            )
            
            # Create and send transaction
            recent_blockhash = (await self.client.get_latest_blockhash()).value.blockhash
            transaction = Transaction.populate(recent_blockhash, [ix], [payer, new_position_keypair])
            
            # Sign and send (assuming self.wallet is the payer)
            # If there are other signers, they would be added to the populate call
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
        pool_pubkey: Pubkey, # Pool pubkey might be required for validation
        owner: Keypair
    ) -> Optional[str]:
        """Closes an existing Meteora DLMM LP position."""
        if not self.wallet or self.wallet.pubkey() != owner.pubkey():
            logger.error("❌ Cannot close LP position: Wallet private key not loaded or not matching owner.")
            return None

        logger.info(f"Closing Meteora DLMM LP position {position_pubkey} for Pool {pool_pubkey}...")
        try:
            # Construct the instruction
            ix = await self.meteora_dlmm_program.instruction["closePosition"].build(
                {},
                {
                    "position": position_pubkey,
                    "owner": owner.pubkey(),
                    "pool": pool_pubkey,
                },
            )
            
            # Create and send transaction
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

            # This assumes a 'depositLiquidity' instruction exists for adding to an existing position.
            # The actual Meteora instruction might be different (e.g., `addLiquidity`).
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
                    "tokenXVault": Pubkey.new_unique(), # Placeholder - needs actual vault
                    "tokenYVault": Pubkey.new_unique(), # Placeholder - needs actual vault
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
        current_price_x_per_y: float # Example: price of token X in terms of token Y
    ) -> Dict[str, float]:
        """Calculates unrealized P&L for a given LP position (simplified)."""
        logger.info(f"Calculating unrealized P&L for position {position_data['pubkey']}...")
        # This is a highly simplified calculation. Real P&L requires accurate
        # tracking of initial investment, impermanent loss, current token prices,
        # and pool state.

        # Assume a simple value calculation based on liquidity and current price
        # This needs to be refined significantly with actual token amounts in bins
        # and current market prices.
        current_value_x = position_data['liquidity'] * current_price_x_per_y # Very rough estimate
        current_value_y = position_data['liquidity'] # Very rough estimate
        total_current_value = current_value_x + current_value_y

        # Placeholder for initial investment. In a real system, this would be recorded
        # when the position was opened.
        initial_investment_value = position_data['liquidity'] * 2 # Assuming 50/50 initial split for simplicity

        unrealized_pnl = total_current_value - initial_investment_value
        
        # Include fees as part of total earnings for P&L
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
            # Pyth Hermes REST API uses a list of price_feed_ids
            params = {"ids": price_feed_id}
            response = requests.get(PYTH_HERMES_ENDPOINT, params=params)
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
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
        # Audit log the attempt
        logger.info(f"Trade attempt initiated: {trade_details}")

        # Check with Risk Manager before executing trade
        proposed_amount = trade_details.get("amount", 0.0)
        if not self.risk_manager.check_trade(proposed_amount):
            logger.warning(f"Trade {trade_details} rejected by Risk Manager.")
            return {"status": "rejected", "message": "Trade rejected by Risk Manager"}

        if not self.wallet:
            logger.error("❌ Cannot execute trade: Wallet private key not loaded.")
            return {"status": "error", "message": "Wallet not loaded"}
        
        logger.info(f"Executing trade: {trade_details}")
        # ... placeholder logic ...
        trade_status = {"status": "pending", "tx_hash": None}
        logger.info(f"Trade execution logic is not yet implemented. Status: {trade_status}")
        
        # Audit log the outcome
        logger.info(f"Trade outcome: {trade_status}")

        return trade_status

from health_server import start_health_server, stop_health_server # New import
import threading # New import for running health server in a separate thread
import datetime # For health server timestamp

# ... (rest of the file content) ...

if __name__ == "__main__":
    import asyncio

    async def main_async():
        # Health Server
        health_server_thread = threading.Thread(target=start_health_server, args=(8000,), daemon=True)
        health_server_thread.start()
        logger.info("Health server started in a separate thread.")

        try:
            logger.info("Quenching the blade: Checking connection to Solana network...")
            # For testing open/close functionality, a private key is required
            # Replace with a real private key for a test wallet for actual execution
            TEST_PRIVATE_KEY = "" # WARNING: DO NOT USE A REAL WALLET'S PRIVATE KEY HERE
            executor = TradeExecutor(RPC_ENDPOINT, private_key=TEST_PRIVATE_KEY)
            
            logger.info(f"\nChecking balance for the designated bot wallet...")
            bot_pubkey = Pubkey.from_string(BOT_WALLET_PUBKEY)
            executor.get_sol_balance(BOT_WALLET_PUBKEY)

            # Example: Fetch a quote for swapping SOL to USDC
            SOL_MINT = Pubkey.from_string("So11111111111111111111111111111111111111112")
            USDC_MINT = Pubkey.from_string("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
            
            # Amount in lamports (e.g., 0.01 SOL)
            amount_to_swap = 10_000_000 # 0.01 SOL

            logger.info(f"\nAttempting to fetch a Jupiter quote for {amount_to_swap / 1_000_000_000} SOL to USDC...")
            quote = await executor.get_quote(SOL_MINT, USDC_MINT, amount_to_swap)
            if quote:
                logger.info(f"Successfully fetched a quote. Out amount: {quote.out_amount}")

            # Fetch Meteora DLMM LP positions and their balances (read-only)
            logger.info(f"\nAttempting to fetch Meteora DLMM LP positions for {BOT_WALLET_PUBKEY}...")
            lp_positions = await executor.get_meteora_lp_positions(bot_pubkey)
            
            if lp_positions:
                logger.info("--> Found LP Positions:")
                for i, pos in enumerate(lp_positions):
                    logger.info(f"    Position {i+1} (Pubkey: {pos['pubkey']}):")
                    logger.info(f"        Owner: {pos['owner']}")
                    logger.info(f"        Pool: {pos['pool']}")
                    logger.info(f"        Liquidity: {pos['liquidity']}")
                    logger.info("        (Token balances for LP positions require further pool info parsing)")

                    # Example P&L calculation for each position
                    logger.info(f"        Calculating P&L for Position {pos['pubkey']}...")
                    # Placeholder: In a real scenario, current_price_x_per_y would come from a price feed.
                    current_price_x_per_y = 0.5 # Example price
                    pnl_results = await executor.calculate_unrealized_pnl(pos, current_price_x_per_y)
                    logger.info(f"            Unrealized P&L: {pnl_results['unrealized_pnl']:.4f}")
                    logger.info(f"            Total Fees Earned: {pnl_results['total_fees_earned']}")
                    logger.info(f"            Total Current Value: {pnl_results['total_value']:.4f}")

                # Example: Claim fees from the first LP position (requires TEST_PRIVATE_KEY)
                if executor.wallet:
                    first_position_pubkey = lp_positions[0]['pubkey']
                    first_position_pool_pubkey = lp_positions[0]['pool']
                    logger.info(f"\nAttempting to claim fees from LP position {first_position_pubkey}...")
                    # Placeholder token mints for demonstration. In a real scenario, these would
                    # be derived from the pool_pubkey and its associated token mints.
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

                # Example: Compound fees back into the first LP position (requires TEST_PRIVATE_KEY)
                if executor.wallet:
                    logger.info(f"\nAttempting to compound fees back into LP position {first_position_pubkey}...")
                    # Placeholder amounts and bin IDs. These would be actual claimed fees
                    # and the current active bin range for compounding.
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

            # Example: Open a new LP position (requires TEST_PRIVATE_KEY)
            if executor.wallet:
                # These are placeholder values. In a real scenario, you'd determine
                # the actual pool, bin IDs, and liquidity based on market conditions.
                DUMMY_POOL_PUBKEY = Pubkey.new_unique()
                DUMMY_LOWER_BIN = 0
                DUMMY_UPPER_BIN = 100
                DUMMY_LIQUIDITY = 1000000 # Example liquidity amount

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
            
            # Pyth Price Feed Integration Demonstration
            logger.info("\n--- Pyth Price Feed Integration ---")
            SOL_USD_PRICE_FEED_ID = "EdVCmQyygBCjS6nMj2xT9EtsNq5V3d3g1i9j1v3BvA6Z" # Example Pyth SOL/USD price feed ID
            eth_usd_price_feed_id = "JBuCRv6r2eH2gC257y3R8XoJvK9vWpE2bS4M1f2B2Q3B" # Example Pyth ETH/USD price feed ID

            sol_price_data = await executor.get_pyth_price(SOL_USD_PRICE_FEED_ID)
            if sol_price_data:
                logger.info(f"SOL/USD Price: {sol_price_data['price']}")
            
            eth_price_data = await executor.get_pyth_price(eth_usd_price_feed_id)
            if eth_price_data:
                logger.info(f"ETH/USD Price: {eth_price_data['price']}")

            # Risk Manager Demonstration
            logger.info("\n--- Risk Manager Demonstration ---")
            test_trade_amount_ok = 50.0 # Within max_trade_size
            test_trade_amount_too_large = 150.0 # Exceeds max_trade_size

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
            # Stop the health server gracefully
            stop_health_server()
            logger.info("Main async function finished, health server stopped.")
    asyncio.run(main_async())
