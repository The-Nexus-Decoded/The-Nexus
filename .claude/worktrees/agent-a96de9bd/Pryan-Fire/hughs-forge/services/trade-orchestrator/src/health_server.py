from fastapi import FastAPI
import base64
import datetime
import logging
import os
import asyncio
import requests
import json
import struct
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# Standard version for the fleet
SERVICE_VERSION = "1.4.0"

app = FastAPI()

# Solana RPC config
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")

# DLMM program IDs
DLMM_V2_PROGRAM_ID = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
POSITION_V2_DATA_SIZE = 8120
POSITION_V2_OWNER_OFFSET = 40

# Known wallets for fee display
TRACKED_WALLETS = {
    "owner": os.getenv("WALLET_OWNER", "sh36vHUDHcXqVD8aZJR8GF3Z3PdaU69XG8wJeB1e1xb"),
    "bot": os.getenv("WALLET_BOT", "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x"),
}

_B58_ALPHABET = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def _bytes_to_base58(data: bytes) -> str:
    """Convert raw bytes to base58 string."""
    n = int.from_bytes(data, "big")
    result = b""
    while n > 0:
        n, r = divmod(n, 58)
        result = _B58_ALPHABET[r : r + 1] + result
    for byte in data:
        if byte == 0:
            result = b"1" + result
        else:
            break
    return result.decode()


def load_scanner_config() -> Dict[str, Any]:
    """Load scanner config from JSON file, with env var override."""
    config = {
        "enabled": True,
        "min_apy": 100.0,
        "min_liquidity": 5000,
        "min_volume_24h": 1000,
        "fee_tier_cutoff": 0.5,
        "poll_interval_seconds": 30,
        "max_pools": 500,
        "devnet": False,
        "allowed_bin_steps": [20, 80, 100],
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

def _calculate_usd_liquidity(pool: Dict[str, Any]) -> float:
    """Calculate USD liquidity for a pool from reserve amounts."""
    USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    reserve_x = float(pool.get("reserve_x_amount", 0))
    reserve_y = float(pool.get("reserve_y_amount", 0))
    mint_x = pool.get("mint_x", "")
    mint_y = pool.get("mint_y", "")

    if mint_y == USDC_MINT:
        usd = reserve_y / 1_000_000
        current_price = float(pool.get("current_price", 0))
        if current_price > 0:
            usd += (reserve_x * current_price) / 1e9
        return usd
    elif mint_x == USDC_MINT:
        usd = reserve_x / 1_000_000
        current_price = float(pool.get("current_price", 0))
        if current_price > 0:
            usd += (reserve_y * current_price) / 1e9
        return usd
    else:
        return float(pool.get("cumulative_fee_volume", 0))


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
        "trading_wallet": os.getenv("TRADING_WALLET_PUBLIC_KEY", "NOT_CONFIGURED"),
        "positions_endpoint": "/positions/{wallet_address}",
        "pools_endpoint": "/pools",
        "note": "Use /positions/{wallet_address} to check DLMM positions"
    }

def _find_dlmm_positions(wallet_address: str) -> List[Dict[str, Any]]:
    """Find all DLMM V2 position accounts for a wallet."""
    result = _rpc_call("getProgramAccounts", [
        DLMM_V2_PROGRAM_ID,
        {
            "encoding": "base64",
            "filters": [
                {"dataSize": POSITION_V2_DATA_SIZE},
                {"memcmp": {"offset": POSITION_V2_OWNER_OFFSET, "bytes": wallet_address}},
            ],
        },
    ])
    if not result or "result" not in result:
        error = result.get("error", {}).get("message") if result else "RPC call failed"
        logger.warning(f"Position lookup failed for {wallet_address}: {error}")
        return []
    return result["result"]


def _parse_position(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Parse a raw DLMM V2 position account into a summary."""
    pubkey = raw["pubkey"]
    data = base64.b64decode(raw["account"]["data"][0])
    lb_pair = _bytes_to_base58(data[8:40])
    # Bin range from position binary data (DLMM V2 PositionV2 struct)
    # Offsets 7912/7916 confirmed via on-chain struct scan (POSITION_MIN_SIZE=8112, bin_data array ends at 8112)
    lower_bin_id = struct.unpack_from("<i", data, 7912)[0] if len(data) > 7916 else 0
    upper_bin_id = struct.unpack_from("<i", data, 7916)[0] if len(data) > 7920 else 0
    return {"position": pubkey, "lb_pair": lb_pair, "lower_bin_id": lower_bin_id, "upper_bin_id": upper_bin_id}


def _enrich_positions(parsed: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich parsed positions with pool info from Meteora API."""
    # Dedupe lb_pairs to minimize API calls
    lb_pairs = {p["lb_pair"] for p in parsed}
    pool_cache: Dict[str, Dict[str, Any]] = {}
    for pair_addr in lb_pairs:
        try:
            resp = requests.get(
                f"https://dlmm-api.meteora.ag/pair/{pair_addr}", timeout=10
            )
            if resp.status_code == 200:
                pool_cache[pair_addr] = resp.json()
        except Exception as e:
            logger.warning(f"Meteora API error for {pair_addr}: {e}")

    # Fetch active_bin_id from lb_pair on-chain account (offset 76 confirmed via binary scan)
    lb_pair_active_ids: Dict[str, int] = {}
    for pair_addr in lb_pairs:
        try:
            res = _rpc_call("getAccountInfo", [pair_addr, {"encoding": "base64"}])
            if res and res.get("result", {}).get("value"):
                lp_data = base64.b64decode(res["result"]["value"]["data"][0])
                if len(lp_data) > 80:
                    lb_pair_active_ids[pair_addr] = struct.unpack_from("<i", lp_data, 76)[0]
        except Exception as e:
            logger.warning(f"lb_pair active_id fetch failed for {pair_addr}: {e}")

    # Fetch per-position data (fee_apy_24h, total_fee_usd_claimed)
    position_cache: Dict[str, Dict[str, Any]] = {}
    for p in parsed:
        try:
            resp = requests.get(
                f"https://dlmm-api.meteora.ag/position/{p['position']}", timeout=10
            )
            if resp.status_code == 200:
                position_cache[p["position"]] = resp.json()
        except Exception as e:
            logger.warning(f"Meteora position API error for {p['position']}: {e}")

    enriched = []
    for p in parsed:
        pool = pool_cache.get(p["lb_pair"], {})
        pos_data = position_cache.get(p["position"], {})

        # active_bin_id from on-chain lb_pair account (offset 76, confirmed via binary scan)
        current_price = float(pool.get("current_price", 0))
        bin_step = int(pool.get("bin_step", 0))
        active_bin_id = lb_pair_active_ids.get(p["lb_pair"], 0)

        lower_bin = p.get("lower_bin_id", 0)
        upper_bin = p.get("upper_bin_id", 0)

        # Per-position APY from Meteora position endpoint
        fee_apy_24h = float(pos_data.get("fee_apy_24h", 0))
        fees_claimed_usd = float(pos_data.get("total_fee_usd_claimed", 0))

        enriched.append({
            "position": p["position"],
            "lb_pair": p["lb_pair"],
            "pool_name": pool.get("name", "Unknown"),
            "apy": round(fee_apy_24h, 2),          # per-position 24h APY
            "fees_claimed_usd": round(fees_claimed_usd, 2),   # historical claimed fees per position
            "fees_24h": round(float(pool.get("today_fees", 0)), 2),  # pool-level total
            "base_fee": pool.get("base_fee_percentage", "?"),
            "volume_24h": round(float(pool.get("trade_volume_24h", 0)), 2),
            "liquidity_usd": round(_calculate_usd_liquidity(pool), 2) if pool else 0,
            "mint_x": pool.get("mint_x", ""),
            "mint_y": pool.get("mint_y", ""),
            "meteora_url": f"https://app.meteora.ag/dlmm/{p['lb_pair']}",
            "active_bin_id": active_bin_id,
            "bin_step": bin_step,
            "current_price": current_price,
            "cumulative_fee_volume": float(pool.get("cumulative_fee_volume", 0)),
            # Bin range from position on-chain data
            "lower_bin_id": lower_bin,
            "upper_bin_id": upper_bin,
            "in_range": lower_bin <= active_bin_id <= upper_bin,
        })
    return enriched


@app.get("/positions/{wallet_address}")
def get_positions(wallet_address: str):
    """
    Get DLMM V2 positions for a wallet with pool info.
    """
    raw_positions = _find_dlmm_positions(wallet_address)
    if not raw_positions:
        return {
            "wallet": wallet_address,
            "positions": [],
            "count": 0,
            "dlmm_program": DLMM_V2_PROGRAM_ID,
        }

    parsed = [_parse_position(r) for r in raw_positions]
    enriched = _enrich_positions(parsed)

    return {
        "wallet": wallet_address,
        "positions": enriched,
        "count": len(enriched),
        "dlmm_program": DLMM_V2_PROGRAM_ID,
    }


@app.get("/wallet-fees")
def get_wallet_fees():
    """
    Read-only fee display for tracked wallets (owner + bot).

    Shows DLMM positions, pool info, and current APY/volume for each wallet.
    No management — display only.
    """
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    wallets = {}

    for name, address in TRACKED_WALLETS.items():
        raw_positions = _find_dlmm_positions(address)
        if not raw_positions:
            wallets[name] = {
                "wallet": address,
                "positions": [],
                "count": 0,
                "sol_balance": _get_sol_balance(address),
            }
            continue

        parsed = [_parse_position(r) for r in raw_positions]
        enriched = _enrich_positions(parsed)

        wallets[name] = {
            "wallet": address,
            "positions": enriched,
            "count": len(enriched),
            "sol_balance": _get_sol_balance(address),
        }

    return {
        "timestamp": timestamp,
        "wallets": wallets,
        "version": SERVICE_VERSION,
    }


def _get_sol_balance(wallet: str) -> float:
    """Get SOL balance for a wallet in SOL (not lamports)."""
    result = _rpc_call("getBalance", [wallet])
    if result and "result" in result:
        lamports = result["result"].get("value", 0)
        return round(lamports / 1e9, 6)
    return 0.0

@app.get("/pools")
def get_pools(limit: int = 100, min_apy: float = None, min_liquidity: float = None, min_volume_24h: float = None):
    """
    Get pools from Meteora DLMM API with optional filters.

    Query params:
    - limit: max pools to return (default 100, max 500)
    - min_apy: filter by minimum APY (default from config)
    - min_liquidity: filter by minimum liquidity in USD (default from config)
    - min_volume_24h: filter by minimum 24h volume in USD (default from config)
    """

    if min_apy is None:
        min_apy = SCANNER_CONFIG["min_apy"]
    if min_liquidity is None:
        min_liquidity = SCANNER_CONFIG["min_liquidity"]
    if min_volume_24h is None:
        min_volume_24h = SCANNER_CONFIG["min_volume_24h"]
    limit = min(limit, 500)

    try:
        response = requests.get(
            "https://dlmm-api.meteora.ag/pair/all",
            timeout=30
        )
        pools = response.json()

        if not isinstance(pools, list):
            return {"error": "Invalid API response", "pools": []}

        allowed_bins = set(SCANNER_CONFIG.get("allowed_bin_steps", []))
        filtered = []
        for pool in pools:
            try:
                bin_step = int(pool.get("bin_step", 0))
                if allowed_bins and bin_step not in allowed_bins:
                    continue
                pool_apy = float(pool.get("apy", 0))
                usd_liquidity = _calculate_usd_liquidity(pool)
                volume_24h = float(pool.get("trade_volume_24h", 0))

                fees_24h = float(pool.get("today_fees", 0))
                if (pool_apy >= min_apy and pool_apy < 1000
                        and usd_liquidity >= min_liquidity
                        and volume_24h >= min_volume_24h):
                    display_apy = min(pool_apy, 500.0)
                    fee_tvl_ratio = round(fees_24h / usd_liquidity, 6) if usd_liquidity > 0 else 0
                    filtered.append({
                        "address": pool.get("address"),
                        "name": pool.get("name"),
                        "mint_x": pool.get("mint_x"),
                        "mint_y": pool.get("mint_y"),
                        "bin_step": bin_step,
                        "liquidity_usd": round(usd_liquidity, 2),
                        "apy": round(display_apy, 2),
                        "apy_spike": pool_apy > 500,
                        "fee": pool.get("base_fee_percentage"),
                        "fees_24h": round(fees_24h, 2),
                        "fee_tvl_ratio": fee_tvl_ratio,
                        "volume_24h": round(volume_24h, 2),
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
                "min_liquidity_usd": min_liquidity,
                "min_volume_24h": min_volume_24h,
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
def get_killfeed(min_apy: float = None, min_liquidity: float = None, min_volume_24h: float = None):
    """
    Kill Feed - ALL pools matching threshold with full details.
    Shows every pool that passes the filter criteria.

    Query params:
    - min_apy: filter by minimum APY (default from config)
    - min_liquidity: filter by minimum liquidity in USD (default from config)
    - min_volume_24h: filter by minimum 24h volume in USD (default from config) — kills stale APY spikes
    """

    if min_apy is None:
        min_apy = SCANNER_CONFIG["min_apy"]
    if min_liquidity is None:
        min_liquidity = SCANNER_CONFIG["min_liquidity"]
    if min_volume_24h is None:
        min_volume_24h = SCANNER_CONFIG["min_volume_24h"]
    allowed_bins = set(SCANNER_CONFIG.get("allowed_bin_steps", []))

    try:
        response = requests.get(
            "https://dlmm-api.meteora.ag/pair/all",
            timeout=30
        )
        pools = response.json()

        if not isinstance(pools, list):
            return {"error": "Invalid API response", "killfeed": []}

        filtered = []
        for pool in pools:
            try:
                bin_step = int(pool.get("bin_step", 0))
                if allowed_bins and bin_step not in allowed_bins:
                    continue
                pool_apy = float(pool.get("apy", 0))
                usd_liquidity = _calculate_usd_liquidity(pool)

                volume_24h = float(pool.get("trade_volume_24h", 0))
                fees_24h = float(pool.get("today_fees", 0))
                if (pool_apy >= min_apy and pool_apy < 1000
                        and usd_liquidity >= min_liquidity
                        and volume_24h >= min_volume_24h):
                    display_apy = min(pool_apy, 500.0)
                    fee_tvl_ratio = round(fees_24h / usd_liquidity, 6) if usd_liquidity > 0 else 0
                    filtered.append({
                        "address": pool.get("address"),
                        "name": pool.get("name"),
                        "mint_x": pool.get("mint_x"),
                        "mint_y": pool.get("mint_y"),
                        "bin_step": bin_step,
                        "liquidity_usd": round(usd_liquidity, 2),
                        "apy": round(display_apy, 2),
                        "apy_spike": pool_apy > 500,
                        "fee": pool.get("base_fee_percentage"),
                        "fees_24h": round(fees_24h, 2),
                        "fee_tvl_ratio": fee_tvl_ratio,
                        "volume_24h": round(volume_24h, 2),
                        "reserve_x": int(float(pool.get("reserve_x_amount", 0))),
                        "reserve_y": int(float(pool.get("reserve_y_amount", 0))),
                    })
            except (ValueError, TypeError, ZeroDivisionError):
                continue

        # Sort by fee/TVL ratio descending (more reliable than raw APY)
        filtered.sort(key=lambda x: x["fee_tvl_ratio"], reverse=True)

        return {
            "killfeed": filtered,
            "count": len(filtered),
            "filters": {
                "min_apy": min_apy,
                "min_liquidity_usd": min_liquidity,
                "min_volume_24h": min_volume_24h,
            },
            "total_pools_scanned": len(pools)
        }
    except Exception as e:
        return {"error": str(e), "killfeed": []}

@app.get("/toppools")
def get_toppools(limit: int = 20, min_liquidity: float = None, min_apy: float = None):
    """
    Top Pools - sorted by USD liquidity descending.

    Query params:
    - limit: max pools to return (default 20, max 100)
    - min_liquidity: minimum liquidity in USD (default from config)
    - min_apy: minimum APY filter (default 0 — all pools)
    """
    if min_liquidity is None:
        min_liquidity = SCANNER_CONFIG["min_liquidity"]
    if min_apy is None:
        min_apy = 0.0
    limit = min(limit, 100)

    try:
        response = requests.get(
            "https://dlmm-api.meteora.ag/pair/all",
            timeout=30
        )
        pools = response.json()

        if not isinstance(pools, list):
            return {"error": "Invalid API response", "pools": []}

        allowed_bins = set(SCANNER_CONFIG.get("allowed_bin_steps", []))
        filtered = []
        for pool in pools:
            try:
                bin_step = int(pool.get("bin_step", 0))
                if allowed_bins and bin_step not in allowed_bins:
                    continue
                pool_apy = float(pool.get("apy", 0))
                usd_liquidity = _calculate_usd_liquidity(pool)
                volume_24h = float(pool.get("trade_volume_24h", 0))
                fees_24h = float(pool.get("today_fees", 0))

                if usd_liquidity >= min_liquidity and pool_apy >= min_apy and pool_apy < 1000:
                    display_apy = min(pool_apy, 500.0)
                    fee_tvl_ratio = round(fees_24h / usd_liquidity, 6) if usd_liquidity > 0 else 0
                    filtered.append({
                        "address": pool.get("address"),
                        "name": pool.get("name"),
                        "mint_x": pool.get("mint_x"),
                        "mint_y": pool.get("mint_y"),
                        "bin_step": bin_step,
                        "liquidity_usd": round(usd_liquidity, 2),
                        "apy": round(display_apy, 2),
                        "apy_spike": pool_apy > 500,
                        "fee": pool.get("base_fee_percentage"),
                        "fees_24h": round(fees_24h, 2),
                        "fee_tvl_ratio": fee_tvl_ratio,
                        "volume_24h": round(volume_24h, 2),
                    })
            except (ValueError, TypeError, ZeroDivisionError):
                continue

        # Sort by fee/TVL ratio descending (more reliable than liquidity alone)
        filtered.sort(key=lambda x: x["fee_tvl_ratio"], reverse=True)

        return {
            "pools": filtered[:limit],
            "count": min(len(filtered), limit),
            "total_matched": len(filtered),
            "filters": {
                "min_liquidity_usd": min_liquidity,
                "min_apy": min_apy,
            },
            "total_pools_scanned": len(pools)
        }
    except Exception as e:
        return {"error": str(e), "pools": []}


def start_orchestrator_health_server(port=8002):
    """Starts the health server using uvicorn."""
    import uvicorn
    logger.info(f"Starting Orchestrator health server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
