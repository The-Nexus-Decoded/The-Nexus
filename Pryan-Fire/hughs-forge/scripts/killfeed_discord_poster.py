#!/usr/bin/env python3
"""
Kill Feed Discord Poster — TIERED VERSION
Posts NEW high-APY Meteora DLMM pools to Discord automatically.
Routes to different channels based on APY tier:
- 50-100% APY → kill-feed-50
- 100-200% APY → kill-feed-100  
- 200%+ APY → killfeed-extreme
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
KILLFEED_URL = os.getenv("KILLFEED_URL", "http://100.104.166.53:8002/killfeed")

# Tiered Discord webhooks
WEBHOOK_EXTREME = os.getenv("DISCORD_WEBHOOK_EXTREME")  # 200%+
WEBHOOK_KILLER = os.getenv("DISCORD_WEBHOOK_KILLER")    # 100-200%
WEBHOOK_ALPHA = os.getenv("DISCORD_WEBHOOK_ALPHA")      # 50-100%

STATE_FILE = os.getenv("KILLFEED_STATE_FILE", "/data/openclaw/.killfeed_state.json")
MIN_APY = float(os.getenv("KILLFEED_MIN_APY", "50"))  # Baseline: 50%
MIN_LIQUIDITY = float(os.getenv("KILLFEED_MIN_LIQUIDITY", "5000"))

# APY thresholds for tiers
APY_EXTREME = 200  # 200%+
APY_KILLER = 100   # 100-200%
APY_ALPHA = 50     # 50-100%

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
                time.sleep(2 ** attempt)
    
    logger.error(f"Failed to fetch killfeed after {retries} attempts")
    return []


def get_pool_url(address: str) -> str:
    """Get clickable Meteora URL for pool."""
    return f"https://app.meteora.ag/dlmm/{address}?referrer=portfolio"


# Cache for DexScreener URLs
DEXSCREENER_CACHE: Dict[str, str] = {}


def get_dexscreener_url(mint_address: str) -> str:
    """Get DexScreener URL for token via API."""
    if not mint_address:
        return "N/A"
    
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
    
    return f"https://dexscreener.com/solana/{mint_address}"


def get_tier(apy: float) -> str:
    """Determine APY tier for a pool."""
    if apy >= APY_EXTREME:
        return "extreme"
    elif apy >= APY_KILLER:
        return "killer"
    else:
        return "alpha"


def format_pool_fields(pool: Dict[str, Any]) -> List[Dict[str, str]]:
    """Format pool data for Discord embed."""
    try:
        apy = float(pool.get('apy', 0)) if pool.get('apy') not in (None, 'N/A', '') else 0
        liquidity = float(pool.get('liquidity_usd', 0)) if pool.get('liquidity_usd') not in (None, 'N/A', '') else 0
        volume = float(pool.get('volume_24h', 0)) if pool.get('volume_24h') not in (None, 'N/A', '') else 0
    except (ValueError, TypeError):
        apy = liquidity = volume = 0
    
    fee = pool.get('fee', '0')
    
    APY_CAP = 500
    if apy > APY_CAP:
        apy_str = f"500%+"
    else:
        apy_str = f"{apy:,.1f}%" if apy and apy > 0 else "N/A"
    
    liquidity_str = f"${liquidity:,.0f}" if liquidity else "$0"
    volume_str = f"${volume:,.0f}" if volume else "$0"
    
    mint_x = pool.get('mint_x', '')[:8] + '...' if len(pool.get('mint_x', '')) > 8 else pool.get('mint_x', '')
    mint_y = pool.get('mint_y', '')[:8] + '...' if len(pool.get('mint_y', '')) > 8 else pool.get('mint_y', '')
    
    return [
        {"name": "💧 Liquidity", "value": liquidity_str, "inline": True},
        {"name": "📈 APY", "value": apy_str, "inline": True},
        {"name": "📊 24h", "value": volume_str, "inline": True},
        {"name": "💰 Fee", "value": f"{fee}%", "inline": True},
        {"name": "🪙 Tokens", "value": f"{mint_x} / {mint_y}", "inline": False},
        {"name": "🔗 Meteora", "value": get_pool_url(pool.get('address', '')), "inline": False},
        {"name": "📈 DexScreener", "value": get_dexscreener_url(pool.get('mint_x', '')), "inline": False},
    ]


def post_to_discord(pools: List[Dict[str, Any]], tier: str):
    """Post new pools to the appropriate tier channel."""
    webhook_url = {
        "extreme": WEBHOOK_EXTREME,
        "killer": WEBHOOK_KILLER,
        "alpha": WEBHOOK_ALPHA,
    }.get(tier)
    
    if not webhook_url:
        logger.warning(f"No webhook configured for tier: {tier}")
        return
    
    tier_names = {
        "extreme": "⚡ EXTREME (200%+)",
        "killer": "🗡️ KILLER (100-200%)", 
        "alpha": "📈 ALPHA (50-100%)"
    }
    
    if not pools:
        return
    
    pools_sorted = sorted(pools, key=lambda x: x.get('apy', 0), reverse=True)
    top_pools = pools_sorted[:5]
    
    embeds = []
    for pool in top_pools:
        embed = {
            "title": f"🚀 {pool.get('name', 'Unknown')}",
            "url": get_pool_url(pool['address']),
            "color": {"extreme": 0xFF0000, "killer": 0xFF6600, "alpha": 0x00FF00}.get(tier, 0x00FF00),
            "fields": format_pool_fields(pool),
            "footer": {"text": f"Haplo Kill Feed | Min APY: {MIN_APY}%"},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        embeds.append(embed)
    
    description = f"**+{len(pools) - 5} more**" if len(pools) > 5 else f"**{len(pools)} pool(s)**"
    
    payload = {
        "content": f"{tier_names.get(tier, 'KILL FEED')} — {len(pools)} new pool(s)!",
        "embeds": embeds
    }
    
    if len(pools) > 5:
        payload["content"] += f"\n_{description}_"
    
    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Posted {len(pools)} pools to {tier} channel")
    except Exception as e:
        logger.error(f"Failed to post to {tier} channel: {e}")


def main():
    """Main loop - check for new pools and post to tiered Discord channels."""
    logger.info("Kill Feed Discord Poster (TIERED) starting...")
    
    # Validate webhooks configured
    if not any([WEBHOOK_EXTREME, WEBHOOK_KILLER, WEBHOOK_ALPHA]):
        logger.warning("No Discord webhooks configured! Set DISCORD_WEBHOOK_EXTREME/KILL/ALPHA")
        return
    
    seen_pools = load_seen_pools()
    logger.info(f"Loaded {len(seen_pools)} previously seen pools")
    
    pools = fetch_killfeed()
    logger.info(f"Fetched {len(pools)} pools from killfeed")
    
    if not pools:
        logger.warning("No pools fetched, exiting")
        return
    
    valid_pools = [p for p in pools if p.get('address') and p.get('name')]
    
    # Group pools by tier
    tiers = {"extreme": [], "killer": [], "alpha": []}
    
    for pool in valid_pools:
        try:
            apy = float(pool.get('apy', 0)) if pool.get('apy') not in (None, 'N/A', '') else 0
        except (ValueError, TypeError):
            apy = 0
        
        tier = get_tier(apy)
        tiers[tier].append(pool)
    
    # Log tier counts
    for t, pool_list in tiers.items():
        if pool_list:
            logger.info(f"Tier {t}: {len(pool_list)} pools")
    
    current_addresses = {pool['address'] for pool in valid_pools}
    
    # Process each tier
    for tier, tier_pools in tiers.items():
        new_pools = [p for p in tier_pools if p['address'] not in seen_pools]
        
        if new_pools:
            logger.info(f"Found {len(new_pools)} NEW pools in {tier} tier")
            post_to_discord(new_pools, tier)
        else:
            logger.info(f"No new pools in {tier} tier")
    
    # Update seen pools
    if current_addresses:
        seen_pools.update(current_addresses)
        save_seen_pools(seen_pools)
        logger.info(f"Updated state with {len(seen_pools)} total seen pools")


if __name__ == "__main__":
    main()
