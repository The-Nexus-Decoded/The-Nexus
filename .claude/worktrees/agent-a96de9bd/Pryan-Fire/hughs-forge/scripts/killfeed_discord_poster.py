#!/usr/bin/env python3
"""
Kill Feed Discord Poster — LIVE FEED
Posts top Meteora DLMM pools to Discord every cycle, ranked by fee/TVL ratio.
No dedup — the deck reshuffles every run. Whatever's hot right now gets posted.
Routes to different channels based on fee/TVL tier:
- Extreme: 0.5%+/day fee/TVL
- Killer: 0.25-0.5%/day
- Alpha: 0.1-0.25%/day
"""
import requests
import os
import logging
import time
from datetime import datetime
from typing import Dict, Any, List

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
KILLFEED_URL = os.getenv("KILLFEED_URL", "http://100.104.166.53:8002/killfeed")
TOPPOOLS_URL = os.getenv("TOPPOOLS_URL", "http://100.104.166.53:8002/toppools")

# Tiered Discord webhooks
WEBHOOK_EXTREME = os.getenv("DISCORD_WEBHOOK_EXTREME")   # 0.5%+/day
WEBHOOK_KILLER = os.getenv("DISCORD_WEBHOOK_KILLER")     # 0.25-0.5%/day
WEBHOOK_ALPHA = os.getenv("DISCORD_WEBHOOK_ALPHA")       # 0.1-0.25%/day
WEBHOOK_TOPPOOLS = os.getenv("DISCORD_WEBHOOK_TOPPOOLS") # Top by liquidity

MIN_APY = float(os.getenv("KILLFEED_MIN_APY", "50"))
MIN_LIQUIDITY = float(os.getenv("KILLFEED_MIN_LIQUIDITY", "5000"))

# Fee/TVL ratio thresholds (daily ratio — primary tier signal)
FEE_TVL_EXTREME = 0.005   # 0.5%+ daily fee/tvl ratio
FEE_TVL_KILLER = 0.0025   # 0.25-0.5%
FEE_TVL_ALPHA = 0.001     # 0.1-0.25%

# Max embeds per tier per cycle
MAX_EMBEDS_PER_TIER = int(os.getenv("KILLFEED_MAX_EMBEDS", "5"))


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


def get_tier(pool: Dict[str, Any]) -> str:
    """Determine tier for a pool using fee/TVL ratio (primary) with APY fallback."""
    fee_tvl = float(pool.get('fee_tvl_ratio', 0))

    if fee_tvl > 0:
        if fee_tvl >= FEE_TVL_EXTREME:
            return "extreme"
        elif fee_tvl >= FEE_TVL_KILLER:
            return "killer"
        else:
            return "alpha"

    # Fallback to APY if fee_tvl_ratio not available
    try:
        apy = float(pool.get('apy', 0)) if pool.get('apy') not in (None, 'N/A', '') else 0
    except (ValueError, TypeError):
        apy = 0
    if apy >= 200:
        return "extreme"
    elif apy >= 100:
        return "killer"
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
    is_spike = pool.get('apy_spike', False) or apy > APY_CAP
    if apy > APY_CAP:
        apy_str = "500%+ SPIKE" if is_spike else "500%+"
    else:
        apy_str = f"{apy:,.1f}%" if apy and apy > 0 else "N/A"

    fee_tvl = float(pool.get('fee_tvl_ratio', 0))
    fee_tvl_str = f"{fee_tvl * 100:.2f}%/day" if fee_tvl > 0 else "N/A"

    fees_24h = float(pool.get('fees_24h', 0))
    fees_str = f"${fees_24h:,.0f}" if fees_24h else "$0"

    liquidity_str = f"${liquidity:,.0f}" if liquidity else "$0"
    volume_str = f"${volume:,.0f}" if volume else "$0"

    mint_x = pool.get('mint_x', '')[:8] + '...' if len(pool.get('mint_x', '')) > 8 else pool.get('mint_x', '')
    mint_y = pool.get('mint_y', '')[:8] + '...' if len(pool.get('mint_y', '')) > 8 else pool.get('mint_y', '')

    bin_step = pool.get('bin_step', 'N/A')

    pool_url = get_pool_url(pool.get('address', ''))
    dex_url = get_dexscreener_url(pool.get('mint_x', ''))

    return [
        {"name": "💧 Liquidity", "value": liquidity_str, "inline": True},
        {"name": "📈 APY", "value": apy_str, "inline": True},
        {"name": "📊 Fee/TVL", "value": fee_tvl_str, "inline": True},
        {"name": "💰 Fees (24h)", "value": fees_str, "inline": True},
        {"name": "📊 Vol (24h)", "value": volume_str, "inline": True},
        {"name": "💰 Base Fee", "value": f"{fee}%", "inline": True},
        {"name": "🔢 Bin Step", "value": str(bin_step), "inline": True},
        {"name": "🪙 Tokens", "value": f"{mint_x} / {mint_y}", "inline": False},
        {"name": "🔗 Links", "value": f"[Meteora]({pool_url}) | [DexScreener]({dex_url})", "inline": False},
    ]


def post_to_discord(pools: List[Dict[str, Any]], tier: str):
    """Post top pools for a tier to the appropriate Discord channel."""
    webhook_url = {
        "extreme": WEBHOOK_EXTREME,
        "killer": WEBHOOK_KILLER,
        "alpha": WEBHOOK_ALPHA,
    }.get(tier)

    if not webhook_url:
        logger.warning(f"No webhook configured for tier: {tier}")
        return

    tier_names = {
        "extreme": "⚡ EXTREME",
        "killer": "🗡️ KILLER",
        "alpha": "📈 ALPHA"
    }

    if not pools:
        return

    # Already sorted by fee_tvl_ratio desc from main — take top N
    top_pools = pools[:MAX_EMBEDS_PER_TIER]

    embeds = []
    for pool in top_pools:
        embed = {
            "title": f"🚀 {pool.get('name', 'Unknown')}",
            "url": get_pool_url(pool['address']),
            "color": {"extreme": 0xFF0000, "killer": 0xFF6600, "alpha": 0x00FF00}.get(tier, 0x00FF00),
            "fields": format_pool_fields(pool),
            "footer": {"text": f"Hugh Kill Feed | {datetime.utcnow().strftime('%H:%M UTC')}"},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        embeds.append(embed)

    payload = {
        "content": f"{tier_names.get(tier, 'KILL FEED')} — Top {len(top_pools)} by fees",
        "embeds": embeds
    }

    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Posted {len(top_pools)} pools to {tier} channel")
    except Exception as e:
        logger.error(f"Failed to post to {tier} channel: {e}")


def fetch_toppools(limit: int = 20) -> List[Dict[str, Any]]:
    """Fetch top pools by liquidity from /toppools endpoint."""
    for attempt in range(3):
        try:
            response = requests.get(
                TOPPOOLS_URL,
                params={"limit": limit},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            return data.get("pools", [])
        except Exception as e:
            logger.warning(f"Toppools fetch attempt {attempt + 1}/3 failed: {e}")
            if attempt < 2:
                time.sleep(2 ** attempt)
    logger.error("Failed to fetch toppools after 3 attempts")
    return []


def post_toppools_to_discord(pools: List[Dict[str, Any]]):
    """Post top pools by liquidity to the toppools channel."""
    if not WEBHOOK_TOPPOOLS:
        logger.warning("No webhook configured for toppools (DISCORD_WEBHOOK_TOPPOOLS)")
        return
    if not pools:
        return

    embeds = []
    for pool in pools[:10]:
        embed = {
            "title": f"💧 {pool.get('name', 'Unknown')}",
            "url": get_pool_url(pool.get("address", "")),
            "color": 0x0099FF,
            "fields": format_pool_fields(pool),
            "footer": {"text": f"Hugh Top Pools | {datetime.utcnow().strftime('%H:%M UTC')}"},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        embeds.append(embed)

    payload = {
        "content": f"💧 **TOP POOLS by Liquidity** — {len(pools)} pools",
        "embeds": embeds
    }
    if len(pools) > 10:
        payload["content"] += f"\n_+{len(pools) - 10} more_"

    try:
        response = requests.post(WEBHOOK_TOPPOOLS, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Posted {len(pools)} toppools to toppools channel")
    except Exception as e:
        logger.error(f"Failed to post to toppools channel: {e}")


def main():
    """Main — fetch current pools, rank by fees, post top per tier."""
    logger.info("Kill Feed Discord Poster (LIVE FEED) starting...")

    if not any([WEBHOOK_EXTREME, WEBHOOK_KILLER, WEBHOOK_ALPHA, WEBHOOK_TOPPOOLS]):
        logger.warning("No Discord webhooks configured! Set DISCORD_WEBHOOK_EXTREME/KILLER/ALPHA/TOPPOOLS")
        return

    pools = fetch_killfeed()
    logger.info(f"Fetched {len(pools)} pools from killfeed")

    if not pools:
        logger.warning("No pools fetched, exiting")
        return

    valid_pools = [p for p in pools if p.get('address') and p.get('name')]

    # Sort all pools by fee_tvl_ratio descending — the deck shuffle
    valid_pools.sort(key=lambda x: float(x.get('fee_tvl_ratio', 0)), reverse=True)

    # Group into tiers
    tiers: Dict[str, List[Dict[str, Any]]] = {"extreme": [], "killer": [], "alpha": []}

    for pool in valid_pools:
        tier = get_tier(pool)
        tiers[tier].append(pool)

    # Log and post each tier
    for tier, tier_pools in tiers.items():
        logger.info(f"Tier {tier}: {len(tier_pools)} pools")
        if tier_pools:
            post_to_discord(tier_pools, tier)

    # Post toppools snapshot
    if WEBHOOK_TOPPOOLS:
        top_pools = fetch_toppools(limit=20)
        if top_pools:
            logger.info(f"Fetched {len(top_pools)} top pools by liquidity")
            post_toppools_to_discord(top_pools)

    logger.info("Kill Feed cycle complete.")


if __name__ == "__main__":
    main()
