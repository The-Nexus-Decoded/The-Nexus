from fastapi import FastAPI
import datetime
import logging
import os
import time
import requests
import json
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# Standard version for the fleet
SERVICE_VERSION = "1.5.0"

app = FastAPI()

# Solana RPC config
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
# Meteora DLMM program ID
DLMM_PROGRAM_ID = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"

# Shyft API for position queries (fallback)
SHYFT_API_KEY = os.getenv("SHYFT_API_KEY", "")
SHYFT_GRAPHQL_URL = "https://programs.shyft.to/v0/graphql/accounts"

# Wallet config
OWNER_WALLET = os.getenv("OWNER_WALLET_PUBLIC_KEY", "sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb")
BOT_WALLET = os.getenv("TRADING_WALLET_PUBLIC_KEY", "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x")

# Rate limiter for external API calls (Shyft free tier: 1 req/sec)
_last_shyft_call = 0.0
SHYFT_MIN_INTERVAL = 1.0  # seconds between calls


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


def _query_positions_helius(wallet_address: str) -> Optional[List]:
    """Try to get positions via Helius/Solana RPC (getProgramAccounts)."""
    pos_v2_discriminator = "LgkNAEYaVX3"
    filters = [
        {"memcmp": {"offset": 0, "bytes": pos_v2_discriminator}},
        {"memcmp": {"offset": 40, "bytes": wallet_address}}
    ]
    result = _rpc_call("getProgramAccounts", [
        DLMM_PROGRAM_ID,
        {"filters": filters}
    ])
    if result and "result" in result and len(result["result"]) > 0:
        return result["result"]
    return None


def _query_positions_shyft(wallet_address: str) -> Optional[List]:
    """Try to get positions via Shyft GraphQL API (fallback)."""
    global _last_shyft_call

    if not SHYFT_API_KEY:
        return None

    # Rate limit: 1 req/sec for free tier
    now = time.time()
    elapsed = now - _last_shyft_call
    if elapsed < SHYFT_MIN_INTERVAL:
        time.sleep(SHYFT_MIN_INTERVAL - elapsed)

    query = """
    query GetPositions($wallet: String!) {
        meteora_dlmm_PositionV2(
            where: {owner: {_eq: $wallet}}
        ) {
            upperBinId
            lowerBinId
            totalClaimedFeeYAmount
            totalClaimedFeeXAmount
            lbPair
            owner
        }
        meteora_dlmm_Position(
            where: {owner: {_eq: $wallet}}
        ) {
            lbPair
            lowerBinId
            upperBinId
            totalClaimedFeeYAmount
            totalClaimedFeeXAmount
            owner
        }
    }
    """
    variables = {"wallet": wallet_address}

    try:
        _last_shyft_call = time.time()
        response = requests.post(
            f"{SHYFT_GRAPHQL_URL}?network=mainnet-beta",
            json={"query": query, "variables": variables},
            headers={
                "Content-Type": "application/json",
                "x-api-key": SHYFT_API_KEY,
            },
            timeout=30
        )
        data = response.json()
        positions_v2 = data.get("data", {}).get("meteora_dlmm_PositionV2", [])
        positions_v1 = data.get("data", {}).get("meteora_dlmm_Position", [])
        return positions_v2 + positions_v1
    except Exception as e:
        logger.error(f"Shyft API call failed: {e}")
        return None


def _get_positions_for_wallet(wallet_address: str) -> Dict:
    """Get positions for a wallet. Tries Helius first, falls back to Shyft."""
    # Try Helius RPC first
    positions = _query_positions_helius(wallet_address)
    if positions is not None:
        return {
            "wallet": wallet_address,
            "positions": positions,
            "count": len(positions),
            "source": "Helius RPC",
        }

    # Fall back to Shyft
    positions = _query_positions_shyft(wallet_address)
    if positions is not None:
        return {
            "wallet": wallet_address,
            "positions": positions,
            "count": len(positions),
            "source": "Shyft API",
        }

    # Both failed
    return {
        "wallet": wallet_address,
        "positions": [],
        "count": 0,
        "error": "Both Helius RPC and Shyft API failed. Check SOLANA_RPC_URL and SHYFT_API_KEY.",
    }


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
    """DLMM Scanner Dashboard - returns scanner config, status, and position info."""
    return {
        "service": "Meteora DLMM Scanner",
        "version": SERVICE_VERSION,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "config": SCANNER_CONFIG,
        "scanner_state": _scanner_state,
        "owner_wallet": OWNER_WALLET,
        "bot_wallet": BOT_WALLET,
        "positions_endpoints": ["/positions", "/positions/owner", "/positions/bot", "/positions/{wallet_address}"],
        "pools_endpoint": "/pools",
        "shyft_api_configured": bool(SHYFT_API_KEY),
    }

@app.get("/positions")
def get_all_positions():
    """Get DLMM positions for both owner and bot wallets."""
    owner_result = _get_positions_for_wallet(OWNER_WALLET)
    bot_result = _get_positions_for_wallet(BOT_WALLET)
    return {
        "owner": owner_result,
        "bot": bot_result,
        "total_positions": owner_result["count"] + bot_result["count"],
    }

@app.get("/positions/owner")
def get_owner_positions():
    """Get DLMM positions for the owner wallet."""
    result = _get_positions_for_wallet(OWNER_WALLET)
    result["wallet_type"] = "owner"
    return result

@app.get("/positions/bot")
def get_bot_positions():
    """Get DLMM positions for the bot/trading wallet."""
    result = _get_positions_for_wallet(BOT_WALLET)
    result["wallet_type"] = "bot"
    return result

@app.get("/positions/{wallet_address}")
def get_positions(wallet_address: str):
    """Get DLMM positions for any wallet address."""
    return _get_positions_for_wallet(wallet_address)

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
        USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
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
