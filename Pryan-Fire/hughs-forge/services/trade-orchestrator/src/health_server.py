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
SERVICE_VERSION = "1.3.0"

app = FastAPI()

# Solana RPC config
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
DLMM_PROGRAM_ID = "DLMMx4jLqB2HqEi5djXq55Up5EMhYWDDfGqZq3iSpUW"


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
        "trading_wallet": os.getenv("TRADING_WALLET_PUBLIC_KEY", "NOT_CONFIGURED"),
        "positions_endpoint": "/positions/{wallet_address}",
        "pools_endpoint": "/pools",
        "note": "Use /positions/{wallet_address} to check DLMM positions"
    }

@app.get("/positions/{wallet_address}")
def get_positions(wallet_address: str):
    """
    Get DLMM positions for a specific wallet via Solana RPC.
    
    Fetches all Position accounts owned by the given wallet from the DLMM program.
    """
    # Get all position accounts for this owner
    result = _rpc_call("getProgramAccounts", [
        DLMM_PROGRAM_ID,
        {
            "dataSize": 358,  # Position account size
            "memcmp": {
                "offset": 8,  # Owner field starts at offset 8
                "bytes": wallet_address
            }
        }
    ])
    
    if not result or "result" not in result:
        return {
            "wallet": wallet_address,
            "positions": [],
            "count": 0,
            "error": result.get("error", {}).get("message") if result else "RPC call failed"
        }
    
    positions = result["result"]
    return {
        "wallet": wallet_address,
        "positions": positions,
        "count": len(positions),
        "dlmm_program": DLMM_PROGRAM_ID,
        "note": "Raw positions returned. Decode using Meteora DLMM SDK for detailed info."
    }

@app.get("/pools")
def get_pools(limit: int = 100, min_apy: float = None, min_liquidity: float = None):
    """
    Get pools from Meteora DLMM API with optional filters.
    
    Query params:
    - limit: max pools to return (default 100)
    - min_apy: filter by minimum APY (default from config)
    - min_liquidity: filter by minimum liquidity (default from config)
    """
    import aiohttp
    
    min_apy = min_apy or SCANNER_CONFIG["min_apy"]
    min_liquidity = min_liquidity or SCANNER_CONFIG["min_liquidity"]
    
    try:
        # Fetch from Meteora API
        response = requests.get(
            "https://dlmm-api.meteora.ag/pair/all",
            timeout=30
        )
        pools = response.json()
        
        if not isinstance(pools, list):
            return {"error": "Invalid API response", "pools": []}
        
        # Apply filters
        filtered = []
        for pool in pools[:limit]:
            try:
                pool_apy = float(pool.get("apy", 0))
                pool_liquidity = float(pool.get("liquidity", 0))
                
                if pool_apy >= min_apy and pool_liquidity >= min_liquidity:
                    filtered.append({
                        "address": pool.get("address"),
                        "mint_x": pool.get("mint_x"),
                        "mint_y": pool.get("mint_y"),
                        "liquidity": pool_liquidity,
                        "apy": pool_apy,
                        "fee": pool.get("base_fee_percentage"),
                        "volume_24h": pool.get("trade_volume_24h"),
                    })
            except (ValueTypeError, TypeError):
                continue
        
        return {
            "pools": filtered,
            "count": len(filtered),
            "filters": {
                "min_apy": min_apy,
                "min_liquidity": min_liquidity
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

def start_orchestrator_health_server(port=8002):
    """Starts the health server using uvicorn."""
    import uvicorn
    logger.info(f"Starting Orchestrator health server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
