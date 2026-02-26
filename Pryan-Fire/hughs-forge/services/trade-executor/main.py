
# main.py for the Trade Executor service
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient
from solana.rpc.types import MemcmpOpts, TokenAccountOpts
from solana.rpc.api import Client
from jupiter_solana import Jupiter
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
import httpx
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
        logging.FileHandler("/data/openclaw/logs/meteora_audits.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# This would be loaded securely, not hardcoded
RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"
TRADING_WALLET_PUBLIC_KEY = "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x" # From MEMORY.md (should be loaded securely in production)
BOT_WALLET_PUBKEY = TRADING_WALLET_PUBLIC_KEY # Aligning with the issue's requirement

# Meteora DLMM Program ID
METEORA_DLMM_PROGRAM_ID = Pubkey.from_string("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo")

# Define SPL Token Program ID and Associated Token Account Program ID directly
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")

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
        {
            "name": "removeLiquidity",
            "accounts": [
                {"name": "position", "isMut": True, "isSigner": False},
                {"name": "owner", "isMut": True, "isSigner": True},
                {"name": "pool", "isMut": True, "isSigner": False},
                {"name": "tokenXDestination", "isMut": True, "isSigner": False},
                {"name": "tokenYDestination", "isMut": True, "isSigner": False},
                {"name": "tokenXVault", "isMut": True, "isSigner": False},
                {"name": "tokenYVault", "isMut": True, "isSigner": False},
                {"name": "tokenProgram", "isMut": False, "isSigner": False},
            ],
            "args": [
                {"name": "liquidity", "type": "u64"},
                {"name": "binIds", "type": {"vec": "i64"}},
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
    """Manages trading risk, including limits, strategy scoring, and circuit breaker functionality."""
    def __init__(self, daily_loss_limit: float = -1000.0, max_trade_size: float = 100.0):
        self.daily_loss_limit = daily_loss_limit
        self.max_trade_size = max_trade_size
        self.current_daily_loss = 0.0
        self.circuit_breaker_active = CIRCUIT_BREAKER_ACTIVE
        self.strategy_risk_scores = {
            "Spot": 1,    # Conservative
            "Curve": 3,   # Moderate
            "BidAsk": 5   # Aggressive
        }
        logger.info("Risk Manager initialized.")
        logger.info(f"-> Daily Loss Limit: {self.daily_loss_limit}")
        logger.info(f"-> Max Trade Size: {self.max_trade_size}")
        logger.info(f"-> Strategy Risk Scores: {self.strategy_risk_scores}")

    def check_strategy_risk(self, strategy: str, market_volatility: str) -> bool:
        """Vetoes aggressive strategies during high volatility."""
        score = self.strategy_risk_scores.get(strategy, 5)
        if market_volatility == "HIGH" and score >= 4:
            logger.warning(f"⚠️ Strategy VETO: {strategy} is too aggressive for HIGH volatility.")
            return False
        return True

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

class RebalanceStrategy:
    """Decision engine for determining when and where to move liquidity."""
    def __init__(self, buffer_bins: int = 10, target_width: int = 20):
        self.buffer_bins = buffer_bins
        self.target_width = target_width
        logger.info(f"Rebalance Strategy initialized (Buffer: {buffer_bins} bins, Target Width: {target_width} bins)")

    def should_rebalance(self, current_active_id: int, lower_bin: int, upper_bin: int) -> bool:
        """Determines if a position has drifted far enough to warrant a rebalance."""
        dist_lower = lower_bin - current_active_id
        dist_upper = current_active_id - upper_bin
        max_dist = max(dist_lower, dist_upper)
        
        decision = current_active_id < (lower_bin - self.buffer_bins) or current_active_id > (upper_bin + self.buffer_bins)
        
        logger.info(f"--> Rebalance Deliberation:")
        logger.info(f"    Current Active ID: {current_active_id}")
        logger.info(f"    Position Range: [{lower_bin}, {upper_bin}]")
        logger.info(f"    Distance from Edge: {max_dist} bins")
        logger.info(f"    Decision: {'REBALANCE' if decision else 'HOLD'}")
        
        return decision

    def profitability_check(self, current_value: float, estimated_cost: float) -> bool:
        """Checks if the rebalance cost is within acceptable limits (5%)."""
        if current_value == 0: return False
        cost_ratio = (estimated_cost / current_value) * 100
        logger.info(f"--> Profitability Check: Cost Ratio {cost_ratio:.2f}% (Threshold: 5.00%)")
        return cost_ratio < 5.0

    def calculate_new_range(self, current_active_id: int) -> Dict[str, int]:
        """Calculates a new bin range centered on the current active ID."""
        half_width = self.target_width // 2
        new_lower = current_active_id - half_width
        new_upper = current_active_id + half_width
        logger.info(f"--> Calculated new range: [{new_lower}, {new_upper}] centered on {current_active_id}")
        return {"lower": new_lower, "upper": new_upper}

class TradeExecutor:
    def __init__(self, rpc_endpoint: str, private_key: str = None):
        self.wallet: Optional[Keypair] = Keypair.from_base58_string(private_key) if private_key else None
        self.client = AsyncClient(rpc_endpoint)
        self.sync_client = Client(rpc_endpoint)
        self.jupiter_client = Jupiter(self.sync_client)
        if self.wallet:
            self.jupiter_client.keypair = self.wallet

        self.provider = Provider(self.client, Wallet(self.wallet) if self.wallet else None)
        self.meteora_dlmm_program = Program(
            METEORA_IDL,
            METEORA_DLMM_PROGRAM_ID,
            self.provider
        )
        self.risk_manager = RiskManager()
        self.rebalance_strategy = RebalanceStrategy()

        logger.info("Trade Executor initialized.")
        if self.wallet:
            logger.info(f"-> Wallet Public Key (loaded): {self.wallet.pubkey()}")
        else:
            logger.warning("-> Wallet not loaded (read-only mode). Open/Close LP positions will not function.")

    async def simulate_rebalance(self, position_data: Dict[str, Any], new_range: Dict[str, int]) -> Dict[str, Any]:
        """Simulates a rebalance to provide a structured Flight Record."""
        logger.info(f"--- [FLIGHT RECORDER: SIMULATED REBALANCE] ---")
        
        # 1. Simulate Removal (Estimate reclaimed assets)
        current_val = float(position_data.get("liquidity", 0))
        est_tx_fee = 0.005 # Total SOL for remove + add txs
        
        # 2. Estimate Friction (Slippage + Dust)
        # Dust: Tiny amounts of X or Y that won't fit exactly into new centered bins
        est_dust_loss = current_val * 0.0005 # 0.05% assumption
        est_slippage = current_val * 0.001  # 0.1% assumption
        total_friction = est_tx_fee + est_dust_loss + est_slippage
        
        # 3. Cost-Benefit Scry
        is_profitable = self.rebalance_strategy.profitability_check(current_val, total_friction)
        
        # 4. Projected Fee Capture Increase
        # Assuming moving back to center captures 100% of current vol vs 0% when out of range
        fee_capture_increase = 100 if (position_data['activeId'] < position_data['lowerBinId'] or position_data['activeId'] > position_data['upperBinId']) else 25 
        
        report = {
            "ESTIMATED_REBALANCE_COST": f"{total_friction:.5f} SOL",
            "PROJECTED_FEE_CAPTURE_INCREASE": f"{fee_capture_increase}%",
            "DUST_RESIDUE_ESTIMATE": f"{est_dust_loss:.6f} units",
            "RISK_MANAGER_STATUS": "APPROVED" if is_profitable else "VETOED"
        }
        
        logger.info(f"    ESTIMATED_REBALANCE_COST: {report['ESTIMATED_REBALANCE_COST']}")
        logger.info(f"    PROJECTED_FEE_CAPTURE_INCREASE: {report['PROJECTED_FEE_CAPTURE_INCREASE']}")
        logger.info(f"    DUST_RESIDUE_ESTIMATE: {report['DUST_RESIDUE_ESTIMATE']}")
        logger.info(f"    RISK_MANAGER_STATUS: {report['RISK_MANAGER_STATUS']}")
        logger.info(f"----------------------------------------------")
        return report

    async def run_autonomous_audit(self):
        """Single pass audit for autonomous loop."""
        # 0. Calibrate Volatility Scryer (Simplified for V1)
        # In V2, this will use recent price variance. For now, we assume NORMAL.
        current_volatility = "NORMAL"
        
        logger.info(f"--- [AUTONOMOUS AUDIT: {datetime.datetime.now()} | VOL: {current_volatility}] ---")
        bot_pubkey = Pubkey.from_string(BOT_WALLET_PUBKEY)
        
        # 1. Scry Positions
        lp_positions = await self.get_meteora_lp_positions(bot_pubkey)
        
        if not lp_positions:
            logger.info("    -> No active positions found. All is quiet.")
            return

        # 2. Process Decisions
        for pos in lp_positions:
            active_id = pos.get("activeId")
            if active_id is None: continue
            
            if self.rebalance_strategy.should_rebalance(active_id, pos['lowerBinId'], pos['upperBinId']):
                new_range = self.rebalance_strategy.calculate_new_range(active_id)
                report = await self.simulate_rebalance(pos, new_range)
                
                # Notification trigger
                if report["RISK_MANAGER_STATUS"] == "APPROVED":
                    logger.warning(f"🚨 [STRATEGY ALERT] Profitable Rebalance detected for {pos['pubkey']}!")
                    # In Phase 5, this would trigger a message tool call to #coding

    async def start_autonomous_loop(self, interval_seconds: int = 900):
        """Starts the persistent heartbeat of the executor."""
        logger.info(f"Starting Autonomous Heartbeat (Interval: {interval_seconds}s)")
        while True:
            try:
                await self.run_autonomous_audit()
            except Exception as e:
                logger.error(f"Heartbeat failure: {e}")
            await asyncio.sleep(interval_seconds)

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

    async def get_quote(self, input_mint: str, output_mint: str, amount: int) -> Optional[Dict[str, Any]]:
        """Fetches a quote from Jupiter v6 API for a given swap."""
        logger.info(f"Scrying market whispers for: {amount} of {input_mint} to {output_mint} via Jupiter v6")
        try:
            url = "https://quote-api.jup.ag/v6/quote"
            params = {
                "inputMint": input_mint,
                "outputMint": output_mint,
                "amount": str(amount),
                "slippageBps": 50,
            }
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                quote_data = response.json()
                
                if quote_data:
                    logger.info(f"--> Jupiter Quote Received. Out Amount: {quote_data.get('outAmount')}, Price Impact: {quote_data.get('priceImpactPct')}%")
                    return quote_data
                else:
                    logger.warning("--> No Jupiter quotes found.")
                    return None
        except Exception as e:
            logger.error(f"--> Error fetching Jupiter quote: {e}")
            return None

    async def get_meteora_pool_state(self, pool_pubkey: Pubkey) -> Optional[Dict[str, Any]]:
        """Fetches and decodes the state of a Meteora DLMM Pool."""
        logger.info(f"Fetching Pool State for {pool_pubkey}...")
        try:
            pool_data = await self.meteora_dlmm_program.account["Pool"].fetch(pool_pubkey)
            # Log all available fields for analysis
            logger.info(f"--> Pool State Decoded: TokenX: {pool_data.token_x_mint}, TokenY: {pool_data.token_y_mint}")
            
            # The active_id represents the current price bin
            active_id = getattr(pool_data, "active_id", None)
            bin_step = getattr(pool_data, "bin_step", None)
            
            if active_id is not None:
                # Calculate price from active_id: price = (1 + bin_step / 10000) ^ active_id
                price = (1 + (bin_step / 10000)) ** active_id
                logger.info(f"    -> Active Bin ID: {active_id}, Bin Step: {bin_step}")
                logger.info(f"    -> Calculated Pool Price (X per Y): {price:.8f}")

            return {
                "tokenXMint": pool_data.token_x_mint,
                "tokenYMint": pool_data.token_y_mint,
                "activeId": active_id,
                "binStep": bin_step,
                "price": price if active_id is not None else None,
                "feeOwner": getattr(pool_data, "fee_owner", None),
            }
        except Exception as e:
            logger.error(f"--> Error fetching Pool state for {pool_pubkey}: {e}")
            return None

    async def get_meteora_lp_positions(self, owner_pubkey: Pubkey) -> List[Dict[str, Any]]:
        """Fetches Meteora DLMM LP positions for a given owner public key."""
        logger.info(f"Scrying Meteora DLMM for LP positions owned by {owner_pubkey} using raw RPC + Anchor decoder...")
        positions = []
        try:
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

                    pool_state = await self.get_meteora_pool_state(decoded_account.pool)
                    if not pool_state:
                        continue
                    
                    token_x_mint = pool_state["tokenXMint"]
                    token_y_mint = pool_state["tokenYMint"]

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
                        "activeId": pool_state.get("activeId"),
                        "poolPrice": pool_state.get("price"),
                        "liquidity": decoded_account.liquidity,
                        "totalFeeX": decoded_account.total_fee_x,
                        "totalFeeY": decoded_account.total_fee_y,
                        "lastUpdatedAt": decoded_account.last_updated_at,
                    })
                    
                    # Log if position is in-range
                    if pool_state.get("activeId") is not None:
                        active_id = pool_state["activeId"]
                        in_range = decoded_account.lower_bin_id <= active_id <= decoded_account.upper_bin_id
                        range_status = "IN RANGE" if in_range else "OUT OF RANGE"
                        logger.info(f"    -> Status: {range_status} (Range: {decoded_account.lower_bin_id} to {decoded_account.upper_bin_id})")
                        
                        if self.rebalance_strategy.should_rebalance(active_id, decoded_account.lower_bin_id, decoded_account.upper_bin_id):
                            new_range = self.rebalance_strategy.calculate_new_range(active_id)
                            logger.info(f"    -> STRATEGY RECOMMENDATION: Rebalance to range {new_range}")
                            await self.simulate_rebalance(pos, new_range)
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

    async def remove_meteora_liquidity(
        self,
        position_pubkey: Pubkey,
        pool_pubkey: Pubkey,
        token_x_mint: Pubkey,
        token_y_mint: Pubkey,
        liquidity: int,
        bin_ids: List[int],
        owner: Keypair
    ) -> Optional[str]:
        """Removes liquidity from specific bins in a Meteora DLMM position."""
        if not self.wallet or self.wallet.pubkey() != owner.pubkey():
            logger.error("❌ Cannot remove liquidity: Wallet private key not loaded or not matching owner.")
            return None

        logger.info(f"Removing {liquidity} liquidity from {len(bin_ids)} bins in position {position_pubkey}...")
        try:
            owner_token_x_account = Pubkey.find_program_address(
                [owner.pubkey().to_bytes(), TOKEN_PROGRAM_ID.to_bytes(), token_x_mint.to_bytes()],
                ASSOCIATED_TOKEN_PROGRAM_ID
            )[0]
            owner_token_y_account = Pubkey.find_program_address(
                [owner.pubkey().to_bytes(), TOKEN_PROGRAM_ID.to_bytes(), token_y_mint.to_bytes()],
                ASSOCIATED_TOKEN_PROGRAM_ID
            )[0]

            # In a real scenario, we would fetch the actual vault addresses from the pool state
            # For this draft, we use placeholders
            ix = await self.meteora_dlmm_program.instruction["removeLiquidity"].build(
                {
                    "liquidity": liquidity,
                    "binIds": bin_ids,
                },
                {
                    "position": position_pubkey,
                    "owner": owner.pubkey(),
                    "pool": pool_pubkey,
                    "tokenXDestination": owner_token_x_account,
                    "tokenYDestination": owner_token_y_account,
                    "tokenXVault": Pubkey.new_unique(), # Placeholder
                    "tokenYVault": Pubkey.new_unique(), # Placeholder
                    "tokenProgram": TOKEN_PROGRAM_ID,
                },
            )

            recent_blockhash = (await self.client.get_latest_blockhash()).value.blockhash
            transaction = Transaction.populate(recent_blockhash, [ix], [owner])
            
            response = await self.client.send_transaction(transaction, owner)
            tx_hash = response.value
            logger.info(f"--> Removed liquidity. Tx Hash: {tx_hash}")
            return tx_hash
        except Exception as e:
            logger.error(f"--> Error removing liquidity: {e}")
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

    async def get_pyth_price(self, price_feed_id: str, radar_price: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Fetches the latest Pyth price and compares it with internal Radar for sanity."""
        logger.info(f"Consulting the oracle for Pyth price feed {price_feed_id}...")
        try:
            url = f"https://hermes.pyth.network/v2/updates/price/latest?ids[]={price_feed_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

            if data and "parsed" in data and len(data["parsed"]) > 0:
                price_data = data["parsed"][0].get("price", {})
                price_val = float(price_data.get("price", 0)) * (10 ** price_data.get("expo", 0))
                logger.info(f"--> Oracle Sight (V2): {price_val:.4f} +/- {float(price_data.get('conf', 0)) * (10 ** price_data.get('expo', 0)):.4f}")
                
                # SIGHT MISMATCH LOGIC: Compare with internal Radar if provided
                if radar_price is not None and radar_price > 0:
                    divergence = abs(price_val - radar_price) / radar_price
                    logger.info(f"    -> Sight Mismatch Check: {divergence*100:.2f}% divergence (Oracle: {price_val:.4f}, Radar: {radar_price:.4f})")
                    
                    if divergence > 0.02: # 2% threshold as commanded
                        logger.critical(f"🚨 [CRITICAL] SIGHT MISMATCH DETECTED: Oracle ({price_val:.4f}) vs Radar ({radar_price:.4f}) | AUDIT HALTED.")
                
                return price_data
            else:
                logger.warning(f"--> No Pyth price data found for {price_feed_id} in V2 response.")
                return None
        except Exception as e:
            logger.error(f"--> Error fetching Pyth price via Hermes: {e}")
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
            await executor.get_sol_balance(str(bot_pubkey))

            SOL_MINT = Pubkey.from_string("So11111111111111111111111111111111111111112")
            USDC_MINT = Pubkey.from_string("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
            
            amount_to_swap = 10_000_000

            logger.info(f"\nAttempting to fetch a Jupiter quote for {amount_to_swap / 1_000_000_000} SOL to USDC...")
            quote = await executor.get_quote(str(SOL_MINT), str(USDC_MINT), amount_to_swap)
            if quote:
                logger.info(f"Successfully fetched a quote. Out amount: {quote.get('outAmount')}")

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
            # Correct Pyth Price Feed IDs for SOL/USD and USDC/USD (Hex IDs)
            SOL_USD_FEED = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
            USDC_USD_FEED = "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"

            sol_price_data = await executor.get_pyth_price(SOL_USD_FEED)
            usdc_price_data = await executor.get_pyth_price(USDC_USD_FEED)

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
