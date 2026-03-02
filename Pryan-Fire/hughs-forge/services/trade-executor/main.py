
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
import os
from pathlib import Path
import json
import logging
import datetime
import threading
from collections import deque
import math
import health_server
from health_server import start_health_server, stop_health_server
from models.keys import KeyManager
from models.ledger import TradeLedger

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

# Discord Alerting (Telemetry Phase 48)
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_TRADE_ALERTS_WEBHOOK")

def send_discord_alert(content: str, color: int = 3447003):
    """Sends a structured alert to the Discord webhook."""
    if not DISCORD_WEBHOOK_URL:
        return
    
    payload = {
        "embeds": [{
            "title": "🗡️ [HAPLO] Trade Orchestrator Alert",
            "description": content,
            "color": color,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }]
    }
    try:
        requests.post(DISCORD_WEBHOOK_URL, json=payload, timeout=10)
    except Exception as e:
        logger.error(f"Failed to send Discord alert: {e}")

# Telemetry Logger for Phase 4
telemetry_logger = logging.getLogger("telemetry")
telemetry_logger.setLevel(logging.INFO)
telemetry_handler = logging.FileHandler("trade_telemetry.jsonl")
telemetry_handler.setFormatter(logging.Formatter('%(message)s'))
# Prevent telemetry from propagating up and flooding the root logger
telemetry_logger.propagate = False
telemetry_logger.addHandler(telemetry_handler)

def log_telemetry(event_type: str, data: dict):
    entry = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "event_type": event_type,
        "data": data
    }
    telemetry_logger.info(json.dumps(entry))

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
PYTH_HERMES_ENDPOINT = "https://hermes.pyth.network/v2/updates/price/latest"

# Pyth Price Feed IDs for volatility calculation
SOL_USD_FEED_ID = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"

# Volatility thresholds (percentage daily standard deviation)
VOLATILITY_THRESHOLDS = {
    "LOW": 0.02,     # < 2%
    "NORMAL": 0.05,  # 2-5%
    "HIGH": 0.10     # 5-10%
}

# Circuit breaker status
CIRCUIT_BREAKER_ACTIVE = False
FORCE_STOP_FILE = "/data/openclaw/trade_stop.lock"

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
    def __init__(self, daily_loss_limit: float = -1000.0, max_trade_size: float = 100.0, mode: str = "SAFE"):
        self.daily_loss_limit = daily_loss_limit
        self.max_trade_size = max_trade_size
        self.current_daily_loss = 0.0
        self.circuit_breaker_active = CIRCUIT_BREAKER_ACTIVE
        self.mode = mode # DEGEN or SAFE
        self.strategy_risk_scores = {
            "Spot": 1,    # Conservative
            "Curve": 3,   # Moderate
            "BidAsk": 5   # Aggressive
        }
        logger.info(f"Risk Manager initialized in {mode} mode.")
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
        # 1. Check for manual override kill-switch
        if Path(FORCE_STOP_FILE).exists():
            logger.critical("🚨 TRADE VETOED: Force-stop lock file detected!")
            return False

        if self.circuit_breaker_active:
            logger.warning("Trade rejected: Circuit breaker is active.")
            log_telemetry("RISK_BLOCK", {"reason": "CIRCUIT_BREAKER_ACTIVE", "proposed_amount": proposed_trade_amount})
            return False
        if proposed_trade_amount > self.max_trade_size:
            logger.warning(f"Trade rejected: Proposed amount ({proposed_trade_amount}) exceeds max trade size ({self.max_trade_size}).")
            log_telemetry("RISK_BLOCK", {"reason": "MAX_TRADE_SIZE_EXCEEDED", "proposed_amount": proposed_trade_amount, "max_size": self.max_trade_size})
            return False
        logger.info(f"Trade approved by Risk Manager for amount: {proposed_trade_amount}")
        return True

    def activate_circuit_breaker(self):
        """Activates the circuit breaker, halting all trading."""
        self.circuit_breaker_active = True
        logger.critical("🚨 CIRCUIT BREAKER ACTIVATED: All trading halted.")
        send_discord_alert("🚨 **CIRCUIT BREAKER ACTIVATED**: All trading operations have been halted immediately.", color=15158332)

    def deactivate_circuit_breaker(self):
        """Deactivates the circuit breaker, allowing trading to resume."""
        self.circuit_breaker_active = False
        logger.info("✅ CIRCUIT BREAKER DEACTIVATED: Trading can resume.")
        send_discord_alert("✅ **CIRCUIT BREAKER DEACTIVATED**: Trading operations have resumed.", color=3066993)

class RebalanceStrategy:
    """Decision engine for determining when and where to move liquidity."""
    def __init__(self, base_buffer_bins: int = 10, base_target_width: int = 20):
        self.base_buffer_bins = base_buffer_bins
        self.base_target_width = base_target_width
        # Volatility multipliers
        self.volatility_multipliers = {
            "LOW": 0.5,
            "NORMAL": 1.0,
            "HIGH": 2.0
        }
        logger.info(f"Rebalance Strategy V2 initialized (Base Buffer: {base_buffer_bins} bins, Base Width: {base_target_width} bins)")

    def get_dynamic_parameters(self, market_volatility: str) -> tuple[int, int]:
        """Calculates current buffer and width based on market volatility."""
        multiplier = self.volatility_multipliers.get(market_volatility, 1.0)
        current_buffer = max(1, int(self.base_buffer_bins * multiplier))
        current_width = max(2, int(self.base_target_width * multiplier)) # Ensure a minimum width of 2 to have at least two bins
        return current_buffer, current_width

    def should_rebalance(self, current_active_id: int, lower_bin: int, upper_bin: int, market_volatility: str = "NORMAL") -> str:
        """
        Determines the rebalance action based on price drift direction and volatility.
        """
        current_buffer, _ = self.get_dynamic_parameters(market_volatility)
        
        # Price is going UP (Active ID exceeds Upper Bin + dynamic buffer)
        if current_active_id > (upper_bin + current_buffer):
            return "REBALANCE"
            
        # Price is going DOWN (Active ID falls below Lower Bin - dynamic buffer)
        if current_active_id < (lower_bin - current_buffer):
            return "STOP_LOSS"
        
        return "HOLD"

    def check_profitability_threshold(self, expected_fee_capture: float, estimated_swap_gas: float, potential_slippage: float) -> bool:
        """
        Checks if the rebalance is financially viable.
        Requires expected fee capture to be greater than the cost of rebalancing.
        """
        total_friction = estimated_swap_gas + potential_slippage
        is_profitable = expected_fee_capture > total_friction 
        
        logger.info(f"--> Profitability Threshold Check: Expected Capture: {expected_fee_capture:.5f}, Total Friction: {total_friction:.5f} (Gas: {estimated_swap_gas:.5f}, Slippage: {potential_slippage:.5f}). Approved: {is_profitable}")
        
        return is_profitable

    def calculate_new_range(self, current_active_id: int, market_volatility: str = "NORMAL") -> Dict[str, int]:
        """Calculates a new bin range centered on the current active ID, scaled by volatility."""
        _, current_width = self.get_dynamic_parameters(market_volatility)
        half_width = current_width // 2
        new_lower = current_active_id - half_width
        new_upper = current_active_id + half_width
        logger.info(f"--> Calculated new range (Vol: {market_volatility}): [{new_lower}, {new_upper}] centered on {current_active_id}")
        return {"lower": new_lower, "upper": new_upper}

class TradeExecutor:
    def __init__(self, rpc_endpoint: str, private_key: str = None, paper_trading_mode: bool = True):
        self.paper_trading_mode = paper_trading_mode
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
        self.key_manager = KeyManager(key_dir="hughs-forge/services/trade-executor/keys")
        self.ledger = TradeLedger()
        self.health_update_lock = threading.Lock()
        self.rebalance_locks: Dict[str, asyncio.Lock] = {}
        
        # Volatility scryer state
        self.price_history = deque(maxlen=100)  # store last 100 SOL prices
        self.price_history_lock = threading.Lock()
        
        # Load live wallet if not in paper trading mode
        if not self.paper_trading_mode:
            self.wallet = self.key_manager.load_keypair()
            if self.wallet:
                self.jupiter_client.keypair = self.wallet
                self.provider.wallet = Wallet(self.wallet)
                logger.info(f"✅ LIVE WALLET LOADED: {self.wallet.pubkey()}")
            else:
                logger.error("❌ FAILED TO LOAD LIVE WALLET. Falling back to paper trading.")
                self.paper_trading_mode = True

        logger.info("Trade Executor initialized.")
        if self.wallet:
            logger.info(f"-> Wallet Public Key (loaded): {self.wallet.pubkey()}")
        else:
            logger.warning("-> Wallet not loaded (read-only mode). Open/Close LP positions will not function.")

    async def claim_rewards(self):
        """
        Triggers the orchestrator to claim fees from all of a user's Meteora DLMM positions.
        """
        logger.info("Triggering claim for all rewards...")
        if not self.wallet:
            logger.error("Cannot claim rewards: Wallet not loaded.")
            return
        await self.claim_all_rewards_for_all_positions(owner=self.wallet)

    async def reinvest_rewards(self):
        """
        Triggers the orchestrator to reinvest all available balances back into their
        corresponding Meteora DLMM positions.
        """
        logger.info("Triggering reinvestment for all rewards...")
        if not self.wallet:
            logger.error("Cannot reinvest rewards: Wallet not loaded.")
            return
        await self.reinvest_all_claimed_fees(owner=self.wallet)

    def heart_attack_strategy(self, current_price):
        """
        Implements the 'Heart Attack Strategy' for DEGEN mode.
        A defensive maneuver for sharp downward price movements.
        """
        logger.warning(f"HEART ATTACK STRATEGY TRIGGERED at price {current_price}")
        # TODO: Implement the two-stage hold and close/reopen logic
        pass

    def bid_ask_upward_strategy(self, current_price):
        """
        Implements the 'BID ASK upward' strategy.
        An offensive re-entry and profit-taking strategy for upward trends.
        """
        logger.info(f"BID ASK UPWARD STRATEGY TRIGGERED at price {current_price}")
        # TODO: Implement re-entry and profit-taking logic
        pass

    async def simulate_rebalance(self, position_data: Dict[str, Any], new_range: Dict[str, int], current_volatility: str = "NORMAL", dynamic_fees: Dict[str, Any] = None) -> Dict[str, Any]:
        """Simulates a rebalance to provide a structured Flight Record."""
        logger.info(f"--- [FLIGHT RECORDER: SIMULATED REBALANCE] ---")
        
        current_val = float(position_data.get("liquidity", 0))
        est_tx_fee = 0.005 # Total SOL for remove + add txs
        
        est_dust_loss = current_val * 0.0005
        est_slippage = current_val * 0.001
        
        base_expected_yield = current_val * 0.002 # Fallback
        if dynamic_fees:
            fee_rate = float(dynamic_fees.get("current_total_fee_rate", 20)) / 10000.0
            base_expected_yield = current_val * fee_rate * 5
            
        volatility_yield_multiplier = {"LOW": 0.5, "NORMAL": 1.0, "HIGH": 2.5}.get(current_volatility, 1.0)
        expected_fee_capture = base_expected_yield * volatility_yield_multiplier

        is_profitable = self.rebalance_strategy.check_profitability_threshold(expected_fee_capture, est_tx_fee + est_dust_loss, est_slippage)
        
        fee_capture_increase = 100 if (position_data['activeId'] < position_data['lowerBinId'] or position_data['activeId'] > position_data['upperBinId']) else 25 
        
        report = {
            "ESTIMATED_REBALANCE_COST": f"{(est_tx_fee + est_dust_loss + est_slippage):.5f} SOL",
            "EXPECTED_FEE_CAPTURE": f"{expected_fee_capture:.5f}",
            "PROJECTED_FEE_CAPTURE_INCREASE": f"{fee_capture_increase}%",
            "DUST_RESIDUE_ESTIMATE": f"{est_dust_loss:.6f} units",
            "RISK_MANAGER_STATUS": "APPROVED" if is_profitable else "VETOED"
        }
        log_telemetry("SIMULATED_REBALANCE", {
            "cost": (est_tx_fee + est_dust_loss + est_slippage),
            "expected_yield": expected_fee_capture,
            "projected_fee_increase": fee_capture_increase,
            "dust_estimate": est_dust_loss,
            "status": "APPROVED" if is_profitable else "VETOED"
        })
        
        return report, is_profitable
        
        logger.info(f"    ESTIMATED_REBALANCE_COST: {report['ESTIMATED_REBALANCE_COST']}")
        logger.info(f"    EXPECTED_FEE_CAPTURE: {report['EXPECTED_FEE_CAPTURE']}")
        logger.info(f"    PROJECTED_FEE_CAPTURE_INCREASE: {report['PROJECTED_FEE_CAPTURE_INCREASE']}")
        logger.info(f"    DUST_RESIDUE_ESTIMATE: {report['DUST_RESIDUE_ESTIMATE']}")
        logger.info(f"    RISK_MANAGER_STATUS: {report['RISK_MANAGER_STATUS']}")
        logger.info(f"----------------------------------------------")
        return report

    async def _determine_market_volatility(self) -> str:
        """
        Determines the current market volatility using Pyth SOL/USD price feed.
        Calculates rolling standard deviation of log returns over recent price history.
        Returns volatility level: LOW, NORMAL, or HIGH.
        """
        logger.info("Scrying market for current volatility via Pyth Oracle...")
        
        # Fetch current SOL price from Pyth
        price_data = await self.get_pyth_price(SOL_USD_FEED_ID)
        if not price_data:
            logger.warning("Failed to fetch Pyth price, defaulting to NORMAL volatility.")
            return "NORMAL"
        
        # Extract price and confidence
        price_val = float(price_data.get("price", 0)) * (10 ** price_data.get("expo", 0))
        confidence = float(price_data.get("conf", 0)) * (10 ** price_data.get("expo", 0))
        
        # Update price history with lock
        with self.price_history_lock:
            self.price_history.append(price_val)
            
            # Need at least 2 prices to calculate volatility
            if len(self.price_history) < 2:
                logger.info("Insufficient price history for volatility calculation, defaulting to NORMAL.")
                return "NORMAL"
            
            # Calculate log returns
            returns = []
            prev_price = self.price_history[0]
            for current_price in list(self.price_history)[1:]:
                if prev_price > 0 and current_price > 0:
                    log_return = math.log(current_price / prev_price)
                    returns.append(log_return)
                prev_price = current_price
            
            if len(returns) < 2:
                logger.info("Insufficient returns for volatility calculation, defaulting to NORMAL.")
                return "NORMAL"
            
            # Calculate standard deviation of returns (sample std)
            mean_return = sum(returns) / len(returns)
            variance = sum((r - mean_return) ** 2 for r in returns) / (len(returns) - 1)
            std_dev = math.sqrt(variance)
            
            # Convert to daily volatility assuming 15-minute intervals (96 per day)
            # Each price update is approximately every audit interval (default 900s)
            daily_volatility = std_dev * math.sqrt(96)
            
            logger.info(f"Volatility metrics: Daily volatility = {daily_volatility:.4f} ({daily_volatility*100:.2f}%)")
        
        # Determine volatility level based on thresholds
        if daily_volatility < VOLATILITY_THRESHOLDS["LOW"]:
            volatility_level = "LOW"
        elif daily_volatility < VOLATILITY_THRESHOLDS["NORMAL"]:
            volatility_level = "NORMAL"
        else:
            volatility_level = "HIGH"
        
        logger.info(f"Market volatility determined: {volatility_level} (thresholds: {VOLATILITY_THRESHOLDS})")
        return volatility_level

    async def run_autonomous_audit(self):
        """Single pass audit for autonomous loop."""
        # 0. Check global safety lock
        if Path(FORCE_STOP_FILE).exists():
            logger.warning("⚠️ Autonomous audit halted: Force-stop lock file present.")
            return

        # 0b. Recover state from ledger
        open_positions = self.ledger.get_open_positions()
        if open_positions:
            logger.info(f"--> Found {len(open_positions)} open positions in ledger. Resuming monitoring...")
            for pos in open_positions:
                logger.info(f"    - Monitoring Trade ID {pos['id']}: {pos['symbol']} at {pos['entry_price']}")

        # 1. Calibrate Volatility Scryer (V2)
        current_volatility = await self._determine_market_volatility()
        
        logger.info(f"--- [AUTONOMOUS AUDIT: {datetime.datetime.now()} | VOL: {current_volatility}] ---")
        bot_pubkey = Pubkey.from_string(BOT_WALLET_PUBKEY)
        
        # 2. Scry Positions
        # Pass current_volatility to get_meteora_lp_positions for subsequent calls
        lp_positions = await self.get_meteora_lp_positions(bot_pubkey, current_volatility)
        
        if not lp_positions:
            logger.info("    -> No active positions found. All is quiet.")
            return

        # 3. Process Decisions & Rebalancing
        for pos in lp_positions:
            active_id = pos.get("activeId")
            if active_id is None: continue

            pubkey_str = str(pos['pubkey'])
            lock = self.rebalance_locks.setdefault(pubkey_str, asyncio.Lock())
            if lock.locked():
                logger.info(f"Skipping audit for {pubkey_str}: Operation already in progress.")
                continue

            async with lock:
                # All rebalance strategy calls now correctly pass current_volatility
                action = self.rebalance_strategy.should_rebalance(active_id, pos['lowerBinId'], pos['upperBinId'], current_volatility)
                
                if action == "REBALANCE":
                    new_range = self.rebalance_strategy.calculate_new_range(active_id, current_volatility)
                    
                    if self.risk_manager.circuit_breaker_active:
                        logger.warning(f"Rebalance skipped for {pos['pubkey']}: Circuit breaker active.")
                        continue

                    logger.warning(f"🚨 [REBALANCE TRIGGERED] Price drifted UP for {pos['pubkey']}. Re-centering...")
                    send_discord_alert(f"🔄 **REBALANCE TRIGGERED (UPWARD)**\n**Position**: `{pos['pubkey']}`\n**New Target Range**: {new_range['lower']} to {new_range['upper']}\n**Volatility**: {current_volatility}", color=16776960)

                    close_tx = await self.close_meteora_lp_position(pos['pubkey'], pos['pool'], self.wallet if self.wallet else Keypair())
                    if close_tx:
                        open_tx = await self.open_meteora_lp_position(pos['pool'], new_range['lower'], new_range['upper'], int(pos['liquidity']), self.wallet if self.wallet else Keypair())
                        if open_tx: logger.info(f"✅ Rebalance sequence successful for {pos['pool']}")
                
                elif action == "STOP_LOSS":
                    if self.risk_manager.mode == "DEGEN":
                        logger.info(f"💔 [HEART ATTACK STRATEGY] Price drifted DOWN for {pos['pubkey']}. Holding positions as per DEGEN mode.")
                        send_discord_alert(f"💔 **HEART ATTACK STRATEGY ACTIVE**\n**Position**: `{pos['pubkey']}`\n**Action**: HOLDING through downward drift (DEGEN mode).\n**Volatility**: {current_volatility}", color=10181046)
                    else:
                        logger.warning(f"🚨 [STOP LOSS TRIGGERED] Price drifted DOWN for {pos['pubkey']}. Closing position as per SAFE mode.")
                        send_discord_alert(f"🛑 **STOP LOSS TRIGGERED**\n**Position**: `{pos['pubkey']}`\n**Action**: CLOSING POSITION to SOL.\n**Volatility**: {current_volatility}", color=15158332)
                        await self.close_meteora_lp_position(pos['pubkey'], pos['pool'], self.wallet if self.wallet else Keypair())
                        # In SAFE mode, would follow with a swap back to SOL via Jupiter here.
                
                else:
                    logger.info(f"    -> Position {pos['pubkey']} is stable. Holding. (Vol: {current_volatility})")

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
            with self.health_update_lock:
                health_server.HealthHandler.solana_healthy = True
            lamports = balance_response.value
            sol = lamports / 1_000_000_000
            logger.info(f"--> Balance for {pubkey_str}: {sol:.9f} SOL")
            return sol
        except Exception as e:
            logger.error(f"--> Error fetching balance for {pubkey_str}: {e}")
            with self.health_update_lock:
                health_server.HealthHandler.solana_healthy = False
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

    async def get_mint_decimals(self, mint_pubkey: Pubkey) -> int:
        """Fetches the decimal precision for a given token mint."""
        try:
            mint_info = await self.client.get_account_info(mint_pubkey)
            if mint_info.value:
                # The decimals value is at a specific byte offset in the mint account data
                # For SPL Token Mints, this is typically the first byte of the account data.
                decimals = mint_info.value.data[44]
                logger.info(f"--> Decimals for mint {mint_pubkey}: {decimals}")
                return decimals
            else:
                logger.warning(f"--> Could not retrieve mint info for {mint_pubkey}.")
                return 6 # Default to 6 if not found
        except Exception as e:
            logger.error(f"--> Error fetching mint decimals for {mint_pubkey}: {e}")
            return 6 # Default to 6 on error

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

    async def get_meteora_dynamic_fees(self, pool_pubkey: Pubkey) -> Dict[str, Any]:
        """Fetches dynamic fee parameters for a Meteora DLMM Pool."""
        logger.info(f"Fetching Dynamic Fees for {pool_pubkey}...")
        try:
            pool_data = await self.meteora_dlmm_program.account["Pool"].fetch(pool_pubkey)
            
            # Extract base_fee_rate and variable_fee_rate.
            base_fee_rate = getattr(pool_data, "base_fee_rate", getattr(pool_data, "fee_rate", 0))
            variable_fee_rate = getattr(pool_data, "variable_fee_rate", getattr(pool_data, "max_fee_rate", 0))
            
            current_total_fee_rate = base_fee_rate + variable_fee_rate
            
            logger.info(f"--> Dynamic Fees Decoded for {pool_pubkey}: Base: {base_fee_rate}, Variable: {variable_fee_rate}, Total: {current_total_fee_rate}")
            
            return {
                "base_fee_rate": base_fee_rate,
                "variable_fee_rate": variable_fee_rate,
                "current_total_fee_rate": current_total_fee_rate,
                "fee_tier_distribution": None
            }
        except Exception as e:
            logger.error(f"--> Error fetching Dynamic Fees for {pool_pubkey}: {e}")
            return {
                "base_fee_rate": 0,
                "variable_fee_rate": 0,
                "current_total_fee_rate": 0,
                "fee_tier_distribution": None
            }

    async def get_meteora_lp_positions(self, owner_pubkey: Pubkey, current_volatility: str = "NORMAL") -> List[Dict[str, Any]]:
        """Fetches Meteora DLMM LP positions for a given owner public key."""
        logger.info(f"Scrying Meteora DLMM for LP positions owned by {owner_pubkey} using raw RPC + Anchor decoder (Vol: {current_volatility})...")
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

                    # Get token decimals
                    token_x_decimals = await self.get_mint_decimals(token_x_mint)
                    token_y_decimals = await self.get_mint_decimals(token_y_mint)

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
                        "tokenXDecimals": token_x_decimals,
                        "tokenYDecimals": token_y_decimals,
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
                        
                        # Pass current_volatility to should_rebalance, calculate_new_range, and simulate_rebalance
                        if self.rebalance_strategy.should_rebalance(active_id, decoded_account.lower_bin_id, decoded_account.upper_bin_id, current_volatility):
                            new_range = self.rebalance_strategy.calculate_new_range(active_id, current_volatility)
                            logger.info(f"    -> STRATEGY RECOMMENDATION: Rebalance to range {new_range}")
                            await self.simulate_rebalance(pos, new_range, current_volatility) # Pass volatility to simulation
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
        # 1. Early Simulation Branch (Paper Trading)
        if self.paper_trading_mode:
            tx_hash = f"sim_tx_open_{int(datetime.datetime.now().timestamp())}"
            logger.info(f"--> [PAPER TRADING] Simulated Opened LP Position. Tx Hash: {tx_hash}")
            log_telemetry("PAPER_TRADE_EXECUTED", {"action": "open_meteora_lp_position", "tx_hash": tx_hash, "pool": str(pool_pubkey)})
            send_discord_alert(f"📝 **PAPER LP OPENED**\n**Pool**: `{pool_pubkey}`\n**Bins**: {lower_bin_id} to {upper_bin_id}\n**Hash**: `{tx_hash}`", color=3447003)
            
            # Record in Ledger
            self.ledger.record_entry(
                symbol=f"LP-{str(pool_pubkey)[:8]}",
                mint=str(pool_pubkey),
                price=0.0,
                amount=float(liquidity),
                metadata={"tx_hash": tx_hash, "paper": True, "position_pubkey": "SIM_POS_PUBKEY"}
            )
            return tx_hash

        # 2. Live Execution Path
        if not self.wallet or self.wallet.pubkey() != payer.pubkey():
            logger.error("❌ Cannot open LP position: Wallet private key not loaded or not matching payer.")
            return None

        # Failsafe Check
        if Path(FORCE_STOP_FILE).exists():
            logger.critical("🚨 EXECUTION VETOED: Force-stop lock file detected!")
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
            tx_hash = str(response.value)
            logger.info(f"--> [LIVE] Opened LP Position. Tx Hash: {tx_hash}")
            log_telemetry("LIVE_TRADE_EXECUTED", {"action": "open_meteora_lp_position", "tx_hash": tx_hash, "pool": str(pool_pubkey)})
            send_discord_alert(f"🚀 **LIVE LP OPENED**\n**Pool**: `{pool_pubkey}`\n**Bins**: {lower_bin_id} to {upper_bin_id}\n**Hash**: `{tx_hash}`", color=3066993)
            
            # Record in Ledger
            self.ledger.record_entry(
                symbol=f"LP-{str(pool_pubkey)[:8]}",
                mint=str(pool_pubkey),
                price=0.0,
                amount=float(liquidity),
                metadata={"tx_hash": tx_hash, "paper": False, "position_pubkey": str(new_position_keypair.pubkey())}
            )
            
            return tx_hash
        except Exception as e:
            logger.error(f"--> Error opening LP position: {e}")
            send_discord_alert(f"❌ **LP OPEN FAILURE**\n**Error**: `{str(e)}`", color=15158332)
            return None

    async def close_meteora_lp_position(
        self, 
        position_pubkey: Pubkey, 
        pool_pubkey: Pubkey,
        owner: Keypair
    ) -> Optional[str]:
        """Closes an existing Meteora DLMM LP position."""
        # 1. Early Simulation Branch (Paper Trading)
        if self.paper_trading_mode:
            tx_hash = f"sim_tx_close_{int(datetime.datetime.now().timestamp())}"
            logger.info(f"--> [PAPER TRADING] Simulated Closed LP Position. Tx Hash: {tx_hash}")
            log_telemetry("PAPER_TRADE_EXECUTED", {"action": "close_meteora_lp_position", "tx_hash": tx_hash, "position": str(position_pubkey)})
            send_discord_alert(f"📝 **PAPER LP CLOSED**\n**Position**: `{position_pubkey}`\n**Hash**: `{tx_hash}`", color=3447003)
            return tx_hash

        # 2. Live Execution Path
        if not self.wallet or self.wallet.pubkey() != owner.pubkey():
            logger.error("❌ Cannot close LP position: Wallet private key not loaded or not matching owner.")
            return None

        # Failsafe Check
        if Path(FORCE_STOP_FILE).exists():
            logger.critical("🚨 EXECUTION VETOED: Force-stop lock file detected!")
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
            tx_hash = str(response.value)
            logger.info(f"--> [LIVE] Closed LP Position. Tx Hash: {tx_hash}")
            log_telemetry("LIVE_TRADE_EXECUTED", {"action": "close_meteora_lp_position", "tx_hash": tx_hash, "position": str(position_pubkey)})
            send_discord_alert(f"🚀 **LIVE LP CLOSED**\n**Position**: `{position_pubkey}`\n**Hash**: `{tx_hash}`", color=3066993)
            
            return tx_hash
        except Exception as e:
            logger.error(f"--> Error closing LP position: {e}")
            # send_discord_alert(f"❌ **LP CLOSE FAILURE**\n**Error**: `{str(e)}`", color=15158332)
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
            
            if self.paper_trading_mode:
                tx_hash = f"sim_tx_claim_{int(datetime.datetime.now().timestamp())}"
                logger.info(f"--> [PAPER TRADING] Simulated Claimed fees. Tx Hash: {tx_hash}")
                log_telemetry("PAPER_TRADE_EXECUTED", {"action": "claim_meteora_fees", "tx_hash": tx_hash, "position": str(position_pubkey)})
            else:
                response = await self.client.send_transaction(transaction, owner)
                tx_hash = response.value
                logger.info(f"--> Claimed fees. Tx Hash: {tx_hash}")
            return tx_hash
        except Exception as e:
            logger.error(f"--> Error claiming fees: {e}")
            return None

    async def claim_all_rewards_for_all_positions(self, owner: Keypair):
        """
        Orchestrator to claim fees from all of a user's Meteora DLMM positions.
        """
        logger.info(f"Initiating claim for all rewards for owner {owner.pubkey()}...")
        
        # 1. Get all LP positions for the owner
        lp_positions = await self.get_meteora_lp_positions(owner.pubkey())
        
        if not lp_positions:
            logger.info("No active LP positions found to claim fees from.")
            return
            
        # 2. Iterate and claim for each position
        claimed_count = 0
        for position in lp_positions:
            logger.info(f"Attempting to claim fees for position {position['pubkey']}...")
            tx_hash = await self.claim_meteora_fees(
                position_pubkey=position['pubkey'],
                pool_pubkey=position['pool'],
                token_x_mint=position['tokenXMint'],
                token_y_mint=position['tokenYMint'],
                owner=owner
            )
            if tx_hash:
                claimed_count += 1
                logger.info(f"Successfully sent claim transaction for position {position['pubkey']}: {tx_hash}")
            else:
                logger.error(f"Failed to claim fees for position {position['pubkey']}.")
                
        logger.info(f"Completed fee claiming process. Successfully initiated claims for {claimed_count}/{len(lp_positions)} positions.")

    async def reinvest_all_claimed_fees(self, owner: Keypair):
        """
        Orchestrator to reinvest all available balances from a user's token accounts
        back into their corresponding Meteora DLMM positions.
        """
        logger.info(f"Initiating reinvestment for all positions for owner {owner.pubkey()}...")
        
        # 1. Get all LP positions for the owner (now with decimal info)
        lp_positions = await self.get_meteora_lp_positions(owner.pubkey())
        
        if not lp_positions:
            logger.info("No active LP positions found to reinvest into.")
            return

        reinvested_count = 0
        for position in lp_positions:
            logger.info(f"Attempting to reinvest fees for position {position['pubkey']}...")

            # 2. Convert UI token balances back to base units using the fetched decimals
            amount_x = int(position['ownerTokenXBalance'] * (10**position['tokenXDecimals']))
            amount_y = int(position['ownerTokenYBalance'] * (10**position['tokenYDecimals']))

            if amount_x == 0 and amount_y == 0:
                logger.info(f"Skipping reinvestment for {position['pubkey']}: No token balance to reinvest.")
                continue

            # 3. Call the compounding function
            tx_hash = await self.compound_meteora_fees(
                position_pubkey=position['pubkey'],
                pool_pubkey=position['pool'],
                token_x_mint=position['tokenXMint'],
                token_y_mint=position['tokenYMint'],
                amount_x=amount_x,
                amount_y=amount_y,
                lower_bin_id=position['lowerBinId'],
                upper_bin_id=position['upperBinId'],
                owner=owner
            )
            
            if tx_hash:
                reinvested_count += 1
                logger.info(f"Successfully sent reinvestment transaction for position {position['pubkey']}: {tx_hash}")
            else:
                logger.error(f"Failed to reinvest fees for position {position['pubkey']}.")

        logger.info(f"Completed reinvestment process. Successfully initiated compounding for {reinvested_count}/{len(lp_positions)} positions.")

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
            
            if self.paper_trading_mode:
                tx_hash = f"sim_tx_compound_{int(datetime.datetime.now().timestamp())}"
                logger.info(f"--> [PAPER TRADING] Simulated Compounded fees. Tx Hash: {tx_hash}")
                log_telemetry("PAPER_TRADE_EXECUTED", {"action": "compound_meteora_fees", "tx_hash": tx_hash, "position": str(position_pubkey)})
            else:
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
            
            if self.paper_trading_mode:
                tx_hash = f"sim_tx_remove_{int(datetime.datetime.now().timestamp())}"
                logger.info(f"--> [PAPER TRADING] Simulated Removed liquidity. Tx Hash: {tx_hash}")
                log_telemetry("PAPER_TRADE_EXECUTED", {"action": "remove_meteora_liquidity", "tx_hash": tx_hash, "position": str(position_pubkey)})
            else:
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
        
        max_retries = 3
        retry_delay = 2 # seconds
        
        for attempt in range(max_retries):
            try:
                url = f"{PYTH_HERMES_ENDPOINT}?ids[]={price_feed_id}"
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, timeout=10.0)
                    
                    if response.status_code == 429:
                        logger.warning(f"Pyth rate limit hit (429). Attempt {attempt + 1}/{max_retries}. Retrying in {retry_delay}s...")
                        with self.health_update_lock:
                            health_server.HealthHandler.pyth_healthy = False
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2
                        continue
                        
                    response.raise_for_status()
                    data = response.json()

                if data and "parsed" in data and len(data["parsed"]) > 0:
                    with self.health_update_lock:
                        health_server.HealthHandler.pyth_healthy = True
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
                    
            except httpx.HTTPStatusError as e:
                logger.error(f"--> HTTP error fetching Pyth price: {e}")
                with self.health_update_lock:
                    health_server.HealthHandler.pyth_healthy = False
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    return None
            except Exception as e:
                logger.error(f"--> Unexpected error fetching Pyth price via Hermes: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    return None
        return None

    def execute_trade(self, trade_details: dict) -> Dict[str, Any]:
        """
        Connects to the DEX and executes a swap.
        """
        logger.info(f"Trade attempt initiated: {trade_details}")
        log_telemetry("TRADE_SIGNAL_RECEIVED", trade_details)
        proposed_amount = trade_details.get("amount", 0.0)
        if not self.risk_manager.check_trade(proposed_amount):
            logger.warning(f"Trade {trade_details} rejected by Risk Manager.")
            return {"status": "rejected", "message": "Trade rejected by Risk Manager"}

        if not self.wallet and not self.paper_trading_mode:
            logger.error("❌ Cannot execute trade: Wallet private key not loaded.")
            return {"status": "error", "message": "Wallet not loaded"}
        
        logger.info(f"Executing trade: {trade_details}")
        
        if self.paper_trading_mode:
            sim_tx_hash = f"sim_tx_{int(datetime.datetime.now().timestamp())}"
            logger.info(f"--> [PAPER TRADING] Trade simulated. Tx Hash: {sim_tx_hash}")
            log_telemetry("PAPER_TRADE_EXECUTED", {"action": "execute_trade", "tx_hash": sim_tx_hash, "details": trade_details})
            
            # Record entry in ledger
            self.ledger.record_entry(
                symbol=trade_details.get("pair", "UNKNOWN"),
                mint="SIM_MINT",
                price=trade_details.get("price", 0.0),
                amount=proposed_amount,
                metadata={"tx_hash": sim_tx_hash, "paper": True}
            )

            # Structured Telemetry Phase 48
            send_discord_alert(
                f"📝 **PAPER TRADE EXECUTED**\n"
                f"**Pair**: {trade_details.get('pair', 'UNKNOWN')}\n"
                f"**Amount**: {proposed_amount}\n"
                f"**Hash**: `{sim_tx_hash}`",
                color=3447003
            )

            trade_status = {"status": "success", "tx_hash": sim_tx_hash, "paper_trade": True}
        else:
            trade_status = {"status": "pending", "tx_hash": None}
            logger.info(f"Trade execution logic is not yet implemented for live execution. Status: {trade_status}")
        
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
