from fastapi import FastAPI
import datetime
import logging
import os
import asyncio
import requests
import json
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# Standard version for the fleet
SERVICE_VERSION = "1.5.0"

app = FastAPI()

# Solana RPC config
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
# Updated: Meteora DLMM program ID (as of 2025)
DLMM_PROGRAM_ID = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"

# Shyft API for position queries (free tier)
SHYFT_API_KEY = os.getenv("SHYFT_API_KEY", "")
SHYFT_GRAPHQL_URL = "https://programs.shyft.to/v0/graphql/accounts"

# Wallet-specific profit rules (configured per Lord Xar's request)
# Each wallet can have different take-profit %, stop-loss %, alert thresholds
WALLET_RULES = {
    "sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb": {  # Owner wallet
        "name": "owner",
        "take_profit_pct": 50.0,      # Close at 50% profit
        "stop_loss_pct": -10.0,       # Close at -10% loss
        "alert_at_pct": 30.0,         # Alert at 30% profit
        "rebalance_at_pct": 75.0,     # Rebalance/harvest at 75%
    },
    "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x": {  # Bot wallet
        "name": "bot",
        "take_profit_pct": 20.0,      # Close at 20% profit (aggressive)
        "stop_loss_pct": -5.0,        # Tight stop-loss
        "alert_at_pct": 10.0,         # Alert early
        "rebalance_at_pct": 25.0,     # Harvest frequently
    },
}

def load_wallet_rules() -> Dict[str, Dict]:
    """Load wallet rules from env var JSON override."""
    rules_json = os.getenv("WALLET_RULES_JSON", "")
    if rules_json:
        try:
            custom_rules = json.loads(rules_json)
            WALLET_RULES.update(custom_rules)
            logger.info(f"Loaded custom wallet rules: {list(custom_rules.keys())}")
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse WALLET_RULES_JSON: {e}")
    return WALLET_RULES

# Load any custom rules at startup
load_wallet_rules()


def load_scanner_config() -> Dict[str, Any]:
    """Load scanner config from JSON file, with env var override."""
    config = {
        "enabled": True,
        "min_apy": 20.0,
        "min_liquidity": 5000,
        "min_volume_24h": 1000,
        "fee_tier_cutoff": 0.5,
        "poll_interval_seconds": 30,
        "max_pools": 500,
        "devnet": False,
    }
    
    default_paths = [
        "/data/openclaw/workspace/The-Nexus/Pryan-Fire/hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
        "/data/openclaw/workspace/Pryan-Fire/hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
        "Pryan-Fire/hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
        "/opt/openclaw/hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
        "./hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
    ]
    
    for path in default_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    json_config = json.load(f)
                    if "meteora_scanner" in json_config:
                        config.update(json_config["meteora_scanner"])
                        logger.info(f"Loaded scanner config from {path}")
            except Exception as e:
                logger.warning(f"Failed to load config from {path}: {e}")
            break
    
    # Override with env vars
    if os.getenv("METEORA_MIN_APY"):
        config["min_apy"] = float(os.getenv("METEORA_MIN_APY"))
    if os.getenv("METEORA_MIN_LIQUIDITY"):
        config["min_liquidity"] = float(os.getenv("METEORA_MIN_LIQUIDITY"))
    if os.getenv("METEORA_MIN_VOLUME"):
        config["min_volume_24h"] = float(os.getenv("METEORA_MIN_VOLUME"))
    if os.getenv("METEORA_FEE_TIER_CUTOFF"):
        config["fee_tier_cutoff"] = float(os.getenv("METEORA_FEE_TIER_CUTOFF"))
    if os.getenv("METEORA_POLL_INTERVAL"):
        config["poll_interval_seconds"] = int(os.getenv("METEORA_POLL_INTERVAL"))
    if os.getenv("METEORA_MAX_POOLS"):
        config["max_pools"] = int(os.getenv("METEORA_MAX_POOLS"))
    if os.getenv("METEORA_DEVNET"):
        config["devnet"] = os.getenv("METEORA_DEVNET").lower() == "true"
    
    return config


# Load scanner configuration
SCANNER_CONFIG = load_scanner_config()

# Scanner state (updated by scanner when running)
_scanner_state = {
    "running": False,
    "last_poll": None,
    "pools_fetched": 0,
    "signals_sent": 0,
    "errors": 0,
}

def _rpc_call(method: str, params: List[Any]) -> Optional[Dict]:
    """Make a Solana RPC call."""
    try:
        response = requests.post(
            SOLANA_RPC_URL,
            json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        return response.json()
    except Exception as e:
        logger.error(f"RPC call failed: {e}")
        return None

@app.get("/health")
def health_check():
    """Standardized health endpoint for fleet monitoring."""
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "version": SERVICE_VERSION,
        "service": "TradeOrchestrator"
    }

@app.get("/dashboard")
def get_dashboard():
    """
    DLMM Scanner Dashboard - returns scanner config, status, and position info.
    """
    return {
        "service": "Meteora DLMM Scanner",
        "version": SERVICE_VERSION,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "config": SCANNER_CONFIG,
        "scanner_state": _scanner_state,
        "owner_wallet": os.getenv("OWNER_WALLET_PUBLIC_KEY", "sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb"),
        "bot_wallet": os.getenv("TRADING_WALLET_PUBLIC_KEY", "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x"),
        "wallet_rules": {
            "owner": {
                "take_profit_pct": 50.0,
                "stop_loss_pct": -10.0,
                "alert_at_pct": 30.0,
                "rebalance_at_pct": 75.0,
            },
            "bot": {
                "take_profit_pct": 20.0,
                "stop_loss_pct": -5.0,
                "alert_at_pct": 10.0,
                "rebalance_at_pct": 25.0,
            }
        },
        "endpoints": {
            "owner_positions": "/positions/owner",
            "bot_positions": "/positions/bot",
            "all_positions": "/positions",
            "monitored": "/monitor/positions",
            "rules": "/monitor/rules",
            "pools": "/pools",
            "killfeed": "/killfeed",
        },
        "note": "Configure custom rules per wallet via WALLET_RULES_JSON env var",
        "shyft_api_configured": bool(SHYFT_API_KEY),
    }

@app.get("/positions/owner")
def get_owner_positions():
    """
    Get DLMM positions for the owner wallet.
    Owner wallet holds the main Meteora positions.
    """
    owner_wallet = os.getenv("OWNER_WALLET_PUBLIC_KEY", "sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb")
    result = get_positions_internal(owner_wallet)
    result["wallet_type"] = "owner"
    return result

@app.get("/positions/bot")
def get_bot_positions():
    """
    Get DLMM positions for the bot/trading wallet.
    Bot wallet holds active trading positions.
    """
    bot_wallet = os.getenv("TRADING_WALLET_PUBLIC_KEY", "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x")
    result = get_positions_internal(bot_wallet)
    result["wallet_type"] = "bot"
    return result

def get_positions_internal(wallet_address: str):
    """
    Get DLMM positions for a specific wallet via Shyft API.
    
    Uses Shyft's GraphQL API to query Meteora DLMM positions.
    Requires SHYFT_API_KEY env var to be set.
    """
    if not SHYFT_API_KEY:
        return {
            "wallet": wallet_address,
            "positions": [],
            "count": 0,
            "error": "SHYFT_API_KEY not configured. Set SHYFT_API_KEY env var.",
            "solution": "Get free API key at https://shyft.to"
        }
    
    try:
        # Query positions via Shyft GraphQL
        query = """
        query MyQuery {
            meteora_dlmm_PositionV2(
                where: {owner: {_eq: "%s"}}
            ) {
                upperBinId
                lowerBinId
                totalClaimedFeeYAmount
                totalClaimedFeeXAmount
                lbPair
                owner
            }
            meteora_dlmm_Position(
                where: {owner: {_eq: "%s"}}
            ) {
                lbPair
                lowerBinId
                upperBinId
                totalClaimedFeeYAmount
                totalClaimedFeeXAmount
                owner
            }
        }
        """ % (wallet_address, wallet_address)
        
        response = requests.get(
            f"{SHYFT_GRAPHQL_URL}?api_key={SHYFT_API_KEY}&network=mainnet-beta",
            json={"query": query},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        data = response.json()
        
        positions_v2 = data.get("data", {}).get("meteora_dlmm_PositionV2", [])
        positions_v1 = data.get("data", {}).get("meteora_dlmm_Position", [])
        
        all_positions = positions_v2 + positions_v1
        
        return {
            "wallet": wallet_address,
            "positions": all_positions,
            "count": len(all_positions),
            "position_v2_count": len(positions_v2),
            "position_v1_count": len(positions_v1),
            "source": "Shyft API"
        }
        
    except Exception as e:
        return {
            "wallet": wallet_address,
            "positions": [],
            "count": 0,
            "error": str(e)
        }

@app.get("/positions/{wallet_address}")
def get_positions(wallet_address: str):
    """Get positions for a specific wallet address."""
    return get_positions_internal(wallet_address)

@app.get("/positions")
def get_all_positions():
    """
    Get DLMM positions for both owner and bot wallets.
    Returns combined position data for monitoring.
    """
    owner_wallet = os.getenv("OWNER_WALLET_PUBLIC_KEY", "sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb")
    bot_wallet = os.getenv("TRADING_WALLET_PUBLIC_KEY", "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x")
    
    owner_result = get_positions_internal(owner_wallet)
    bot_result = get_positions_internal(bot_wallet)
    
    return {
        "owner_wallet": owner_wallet,
        "bot_wallet": bot_wallet,
        "owner_positions": owner_result.get("positions", []),
        "owner_count": owner_result.get("count", 0),
        "bot_positions": bot_result.get("positions", []),
        "bot_count": bot_result.get("count", 0),
        "total_positions": owner_result.get("count", 0) + bot_result.get("count", 0),
        "shyft_configured": bool(SHYFT_API_KEY)
    }

@app.get("/monitor/positions")
def get_monitored_positions():
    """
    Get positions with profit rule analysis per wallet.
    Shows which positions are hitting profit/loss thresholds based on each wallet's rules.
    
    Each wallet has configurable rules:
    - take_profit_pct: Close position at this profit %
    - stop_loss_pct: Close position at this loss %
    - alert_at_pct: Send alert when profit reaches this %
    - rebalance_at_pct: Harvest/rebalance when profit reaches this %
    
    Override via WALLET_RULES_JSON env var.
    """
    owner_wallet = os.getenv("OWNER_WALLET_PUBLIC_KEY", "sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb")
    bot_wallet = os.getenv("TRADING_WALLET_PUBLIC_KEY", "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x")
    
    owner_result = get_positions_internal(owner_wallet)
    bot_result = get_positions_internal(bot_wallet)
    
    # Get rules for each wallet
    owner_rules = WALLET_RULES.get(owner_wallet, {"name": "owner", "take_profit_pct": 50.0})
    bot_rules = WALLET_RULES.get(bot_wallet, {"name": "bot", "take_profit_pct": 20.0})
    
    def analyze_positions(positions: List, rules: Dict, wallet_type: str) -> List[Dict]:
        """Analyze positions against rules - returns simulated PnL (requires entry price tracking)."""
        analyzed = []
        for pos in positions:
            # Note: Real implementation needs entry price from position history
            # Here we show the rules that WOULD apply
            analyzed.append({
                "position": pos,
                "rules": rules,
                "wallet_type": wallet_type,
                "note": "Entry price required for actual PnL calculation",
                "would_trigger": {
                    "take_profit": rules.get("take_profit_pct"),
                    "stop_loss": rules.get("stop_loss_pct"),
                    "alert_at": rules.get("alert_at_pct"),
                    "rebalance_at": rules.get("rebalance_at_pct"),
                }
            })
        return analyzed
    
    return {
        "wallets": {
            owner_wallet: {
                "name": "owner",
                "rules": owner_rules,
                "positions": analyze_positions(owner_result.get("positions", []), owner_rules, "owner"),
                "position_count": owner_result.get("count", 0),
            },
            bot_wallet: {
                "name": "bot", 
                "rules": bot_rules,
                "positions": analyze_positions(bot_result.get("positions", []), bot_rules, "bot"),
                "position_count": bot_result.get("count", 0),
            }
        },
        "configure_rules": "Set WALLET_RULES_JSON env var with custom rules per wallet",
        "example_rules": {
            "take_profit_pct": 50.0,
            "stop_loss_pct": -10.0,
            "alert_at_pct": 30.0,
            "rebalance_at_pct": 75.0
        }
    }

@app.get("/monitor/rules")
def get_wallet_rules():
    """
    Get all configured wallet rules.
    Use this to see what rules are active for each wallet.
    """
    return {
        "configured_wallets": WALLET_RULES,
        "override_instructions": "Set WALLET_RULES_JSON env var as JSON to override defaults",
        "example": {
            "wallet_address": {
                "name": "custom",
                "take_profit_pct": 100.0,
                "stop_loss_pct": -15.0,
                "alert_at_pct": 50.0,
                "rebalance_at_pct": 80.0
            }
        }
    }

@app.get("/pools")
def get_pools(limit: int = 100, min_apy: float = None, min_liquidity: float = None):
    """
    Get pools from Meteora DLMM API with optional filters.
    
    Query params:
    - limit: max pools to return (default 100, max 500)
    - min_apy: filter by minimum APY (default from config)
    - min_liquidity: filter by minimum liquidity in USD (default from config)
    """
    
    min_apy = min_apy or SCANNER_CONFIG["min_apy"]
    min_liquidity = min_liquidity or SCANNER_CONFIG["min_liquidity"]
    limit = min(limit, 500)  # Cap at 500
    
    try:
        # Fetch from Meteora API
        response = requests.get(
            "https://dlmm-api.meteora.ag/pair/all",
            timeout=30
        )
        pools = response.json()
        
        if not isinstance(pools, list):
            return {"error": "Invalid API response", "pools": []}
        
        # Apply filters - calculate USD liquidity
        filtered = []
        for pool in pools:
            try:
                pool_apy = float(pool.get("apy", 0))
                
                # Calculate USD liquidity from reserves
                reserve_x = float(pool.get("reserve_x_amount", 0))
                reserve_y = float(pool.get("reserve_y_amount", 0))
                mint_x = pool.get("mint_x", "")
                mint_y = pool.get("mint_y", "")
                
                # Estimate USD value
                # USDC mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
                USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                
                usd_liquidity = 0.0
                
                if mint_y == USDC_MINT:
                    # mint_y is USDC - reserve_y is in USDC (6 decimals)
                    usd_liquidity = reserve_y / 1_000_000
                    # Add estimate for mint_x using current_price
                    current_price = float(pool.get("current_price", 0))
                    if current_price > 0:
                        usd_liquidity += (reserve_x * current_price) / 1e9
                elif mint_x == USDC_MINT:
                    # mint_x is USDC
                    usd_liquidity = reserve_x / 1_000_000
                    current_price = float(pool.get("current_price", 0))
                    if current_price > 0:
                        usd_liquidity += (reserve_y * current_price) / 1e9
                else:
                    # No USDC pair - use cumulative fee volume as proxy
                    usd_liquidity = float(pool.get("cumulative_fee_volume", 0))
                
                if pool_apy >= min_apy and usd_liquidity >= min_liquidity:
                    # Cap APY at 10000% to filter out API data errors
                    display_apy = min(pool_apy, 10000.0)
                    filtered.append({
                        "address": pool.get("address"),
                        "name": pool.get("name"),
                        "mint_x": mint_x,
                        "mint_y": mint_y,
                        "liquidity_usd": round(usd_liquidity, 2),
                        "apy": round(display_apy, 2),
                        "fee": pool.get("base_fee_percentage"),
                        "volume_24h": pool.get("trade_volume_24h"),
                    })
                    
                    if len(filtered) >= limit:
                        break
            except (ValueError, TypeError, ZeroDivisionError):
                continue
        
        return {
            "pools": filtered,
            "count": len(filtered),
            "filters": {
                "min_apy": min_apy,
                "min_liquidity_usd": min_liquidity
            },
            "total_available": len(pools)
        }
    except Exception as e:
        return {"error": str(e), "pools": []}

def update_scanner_state(running: bool, last_poll: str = None, pools_fetched: int = 0, signals_sent: int = 0, errors: int = 0):
    """Update scanner state from external caller."""
    global _scanner_state
    _scanner_state = {
        "running": running,
        "last_poll": last_poll,
        "pools_fetched": pools_fetched,
        "signals_sent": signals_sent,
        "errors": errors,
    }

@app.get("/killfeed")
def get_killfeed(min_apy: float = None, min_liquidity: float = None):
    """
    Kill Feed - ALL pools matching threshold with full details.
    Shows every pool that passes the filter criteria.
    
    Query params:
    - min_apy: filter by minimum APY (default from config)
    - min_liquidity: filter by minimum liquidity in USD (default from config)
    """
    
    min_apy = min_apy or SCANNER_CONFIG["min_apy"]
    min_liquidity = min_liquidity or SCANNER_CONFIG["min_liquidity"]
    
    try:
        response = requests.get(
            "https://dlmm-api.meteora.ag/pair/all",
            timeout=30
        )
        pools = response.json()
        
        if not isinstance(pools, list):
            return {"error": "Invalid API response", "pools": []}
        
        USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        
        filtered = []
        for pool in pools:
            try:
                pool_apy = float(pool.get("apy", 0))
                
                reserve_x = float(pool.get("reserve_x_amount", 0))
                reserve_y = float(pool.get("reserve_y_amount", 0))
                mint_x = pool.get("mint_x", "")
                mint_y = pool.get("mint_y", "")
                
                usd_liquidity = 0.0
                
                if mint_y == USDC_MINT:
                    usd_liquidity = reserve_y / 1_000_000
                    current_price = float(pool.get("current_price", 0))
                    if current_price > 0:
                        usd_liquidity += (reserve_x * current_price) / 1e9
                elif mint_x == USDC_MINT:
                    usd_liquidity = reserve_x / 1_000_000
                    current_price = float(pool.get("current_price", 0))
                    if current_price > 0:
                        usd_liquidity += (reserve_y * current_price) / 1e9
                else:
                    usd_liquidity = float(pool.get("cumulative_fee_volume", 0))
                
                if pool_apy >= min_apy and usd_liquidity >= min_liquidity:
                    # Cap APY at 10000% to filter out API data errors
                    display_apy = min(pool_apy, 10000.0)
                    filtered.append({
                        "address": pool.get("address"),
                        "name": pool.get("name"),
                        "mint_x": mint_x,
                        "mint_y": mint_y,
                        "liquidity_usd": round(usd_liquidity, 2),
                        "apy": round(display_apy, 2),
                        "fee": pool.get("base_fee_percentage"),
                        "volume_24h": round(float(pool.get("trade_volume_24h", 0)), 2),
                        "reserve_x": int(reserve_x),
                        "reserve_y": int(reserve_y),
                    })
            except (ValueError, TypeError, ZeroDivisionError):
                continue
        
        # Sort by APY descending
        filtered.sort(key=lambda x: x["apy"], reverse=True)
        
        return {
            "killfeed": filtered,
            "count": len(filtered),
            "filters": {
                "min_apy": min_apy,
                "min_liquidity_usd": min_liquidity
            },
            "total_pools_scanned": len(pools)
        }
    except Exception as e:
        return {"error": str(e), "killfeed": []}

def start_orchestrator_health_server(port=8002):
    """Starts the health server using uvicorn."""
    import uvicorn
    logger.info(f"Starting Orchestrator health server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
