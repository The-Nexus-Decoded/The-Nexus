#!/usr/bin/env python3
"""
Kill Feed Discord Poster
Posts NEW high-APY Meteora DLMM pools to Discord automatically.
Diff against previous state and only posts new pools.
"""
import requests
import json
import os
import logging
import fcntl
import time
from datetime import datetime
from typing import Set, Dict, Any, List

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
# Default to Hugh's trade server (ola-claw-trade)
KILLFEED_URL = os.getenv("KILLFEED_URL", "http://100.104.166.53:8002/killfeed")
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_KILLFEED_WEBHOOK")
STATE_FILE = os.getenv("KILLFEED_STATE_FILE", "/data/openclaw/.killfeed_state.json")
MIN_APY = float(os.getenv("KILLFEED_MIN_APY", "100"))
MIN_LIQUIDITY = float(os.getenv("KILLFEED_MIN_LIQUIDITY", "5000"))

# Ensure state directory exists
os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)


def load_seen_pools() -> Set[str]:
    """Load previously seen pool addresses from state file with locking."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                try:
                    data = json.load(f)
                    return set(data.get('seen_pools', []))
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        except Exception as e:
            logger.warning(f"Failed to load state: {e}")
    return set()


def save_seen_pools(seen: Set[str]):
    """Save seen pool addresses to state file with locking."""
    try:
        with open(STATE_FILE, 'w') as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                json.dump({'seen_pools': list(seen)}, f)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    except Exception as e:
        logger.error(f"Failed to save state: {e}")


def fetch_killfeed(retries: int = 3) -> List[Dict[str, Any]]:
    """Fetch pools from killfeed endpoint with retry logic."""
    params = {
        'min_apy': MIN_APY,
        'min_liquidity': MIN_LIQUIDITY
    }
    
    for attempt in range(retries):
        try:
            response = requests.get(KILLFEED_URL, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data.get('killfeed', [])
        except Exception as e:
            logger.warning(f"Fetch attempt {attempt + 1}/{retries} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
    
    logger.error(f"Failed to fetch killfeed after {retries} attempts")
    return []


def get_pool_url(address: str) -> str:
    """Get clickable Meteora URL for pool."""
    return f"https://www.meteora.ag/pools/{address}"


# Cache for DexScreener URLs (avoid repeated API calls)
DEXSCREENER_CACHE: Dict[str, str] = {}
DEXSCREENER_CACHE_TTL = 300  # 5 minutes


def get_dexscreener_url(mint_address: str) -> str:
    """Get DexScreener URL for token via API (returns working link)."""
    if not mint_address:
        return "N/A"
    
    # Check cache first
    if mint_address in DEXSCREENER_CACHE:
        return DEXSCREENER_CACHE[mint_address]
    
    try:
        response = requests.get(
            f"https://api.dexscreener.com/latest/dex/tokens/{mint_address}",
            timeout=5
        )
        data = response.json()
        
        pairs = data.get("pairs", [])
        if pairs and len(pairs) > 0:
            url = pairs[0].get("url", "")
            if url:
                DEXSCREENER_CACHE[mint_address] = url
                return url
    except Exception as e:
        logger.debug(f"DexScreener API error for {mint_address}: {e}")
    
    # Fallback to direct URL (likely blocked)
    return f"https://dexscreener.com/solana/{mint_address}"


def format_pool_fields(pool: Dict[str, Any]) -> List[Dict[str, str]]:
    """Format pool data for Discord embed - DIFFERENT from raw API."""
    # Calculate additional metrics not in raw API - handle NaN/None safely
    try:
        apy = float(pool.get('apy', 0)) if pool.get('apy') not in (None, 'N/A', '') else 0
        liquidity = float(pool.get('liquidity_usd', 0)) if pool.get('liquidity_usd') not in (None, 'N/A', '') else 0
        volume = float(pool.get('volume_24h', 0)) if pool.get('volume_24h') not in (None, 'N/A', '') else 0
    except (ValueError, TypeError):
        apy = liquidity = volume = 0
    
    fee = pool.get('fee', '0')
    
    # Format values
    apy_str = f"{apy:,.1f}%" if apy and apy > 0 else "N/A"
    liquidity_str = f"${liquidity:,.0f}" if liquidity else "$0"
    volume_str = f"${volume:,.0f}" if volume else "$0"
    
    # Shorten mint addresses for display
    mint_x = pool.get('mint_x', '')[:8] + '...' if len(pool.get('mint_x', '')) > 8 else pool.get('mint_x', '')
    mint_y = pool.get('mint_y', '')[:8] + '...' if len(pool.get('mint_y', '')) > 8 else pool.get('mint_y', '')
    
    return [
        {"name": "💧 Liquidity", "value": liquidity_str, "inline": true},
        {"name": "📈 APY", "value": apy_str, "inline": true},
        {"name": "📊 24h Volume", "value": volume_str, "inline": true},
        {"name": "💰 Fee", "value": f"{fee}%", "inline": true},
        {"name": "🪙 Tokens", "value": f"{mint_x} / {mint_y}", "inline": false},
        {"name": "🔗 Meteora", "value": f"[Pool]({get_pool_url(pool.get('address', ''))})", "inline": true},
        {"name": "📈 DexScreener", "value": f"[Chart]({get_dexscreener_url(pool.get('mint_x', ''))})", "inline": true},
    ]


def post_to_discord(pools: List[Dict[str, Any]]):
    """Post new pools to Discord webhook."""
    if not DISCORD_WEBHOOK_URL:
        logger.warning("DISCORD_KILLFEED_WEBHOOK not set, skipping Discord post")
        return
    
    if not pools:
        return
    
    # Build embed - different format than raw API
    # Shows: Pool link, liquidity, APY, volume, fee, tokens
    # Unlike raw API which shows address, name, reserves, etc.
    
    # Sort by APY descending
    pools_sorted = sorted(pools, key=lambda x: x.get('apy', 0), reverse=True)
    
    # Take top 5 for embed size
    top_pools = pools_sorted[:5]
    
    embeds = []
    for pool in top_pools:
        embed = {
            "title": f"🚀 NEW POOL: {pool.get('name', 'Unknown')}",
            "url": get_pool_url(pool['address']),
            "color": 0x00FF00,  # Green
            "fields": format_pool_fields(pool),
            "footer": {
                "text": f"Haplo Kill Feed | Min APY: {MIN_APY}% | Min Liquidity: ${MIN_LIQUIDITY:,}"
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        embeds.append(embed)
    
    # Build payload
    if len(pools) > 5:
        description = f"**+{len(pools) - 5} more pools** passing threshold"
    else:
        description = f"**{len(pools)} new pool(s)** passing threshold"
    
    payload = {
        "content": f"🗡️ **KILL FEED** — {len(pools)} new high-APY pool(s) detected!",
        "embeds": embeds
    }
    
    if len(pools) > 5:
        payload["content"] += f"\n_{description}_"
    
    try:
        response = requests.post(DISCORD_WEBHOOK_URL, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Posted {len(pools)} new pools to Discord")
    except Exception as e:
        logger.error(f"Failed to post to Discord: {e}")


def main():
    """Main loop - check for new pools and post to Discord."""
    logger.info("Kill Feed Discord Poster starting...")
    
    # Load previously seen pools
    seen_pools = load_seen_pools()
    logger.info(f"Loaded {len(seen_pools)} previously seen pools")
    
    # Fetch current killfeed
    pools = fetch_killfeed()
    logger.info(f"Fetched {len(pools)} pools from killfeed")
    
    if not pools:
        logger.warning("No pools fetched, exiting")
        return
    
    # Validate and filter pools - require address and name
    valid_pools = [p for p in pools if p.get('address') and p.get('name')]
    logger.info(f"Validated {len(valid_pools)} pools with required fields")
    
    # Find NEW pools (not in seen set)
    current_addresses = {pool['address'] for pool in valid_pools}
    new_pools = [pool for pool in valid_pools if pool['address'] not in seen_pools]
    
    logger.info(f"Found {len(new_pools)} NEW pools")
    
    if new_pools:
        # Post new pools to Discord
        post_to_discord(new_pools)
        
        # Update seen pools
        seen_pools.update(current_addresses)
        save_seen_pools(seen_pools)
        logger.info(f"Updated state with {len(seen_pools)} total seen pools")
    else:
        logger.info("No new pools since last check")


if __name__ == "__main__":
    main()
