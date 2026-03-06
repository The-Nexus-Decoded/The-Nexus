#!/usr/bin/env python3
"""
Position Monitor — DLMM position feed to Discord
Posts formatted embeds to #bot-meteora-open-pools every 15 minutes.
"""
import requests
import json
import os
import logging
import fcntl
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from copy import deepcopy

# Import automation engine
from automation_engine import run_automation_checks

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration paths (check multiple locations)
CONFIG_PATHS = [
    "/data/repos/The-Nexus/Pryan-Fire/hughs-forge/config/mainnet/position_monitor_config.json",
    os.path.join(os.path.dirname(__file__), "..", "config", "mainnet", "position_monitor_config.json"),
    os.path.join(os.path.dirname(__file__), "config", "mainnet", "position_monitor_config.json"),
]

# State file
STATE_FILE = os.getenv("POSITION_MONITOR_STATE_FILE", "/data/openclaw/.position_monitor_state.json")

# Discord webhook
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_POSITIONS")
HEALTH_SERVER_URL = os.getenv("HEALTH_SERVER_URL", "http://127.0.0.1:8002")

# Constants
MAX_HISTORY = 96  # 24 hours of 15-min intervals
DISCORD_MAX_EMBEDS = 10


def load_config() -> Optional[Dict[str, Any]]:
    """Load config from one of the known paths."""
    for path in CONFIG_PATHS:
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    config = json.load(f)
                    logger.info(f"Loaded config from {path}")
                    return config
            except Exception as e:
                logger.warning(f"Failed to load config from {path}: {e}")
    logger.error("No config file found!")
    return None


def load_state() -> Dict[str, Any]:
    """Load state from file with locking."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                try:
                    data = json.load(f)
                    return data
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        except Exception as e:
            logger.warning(f"Failed to load state: {e}")
    return {"wallets": {}}


def save_state(state: Dict[str, Any]):
    """Save state to file with locking."""
    try:
        with open(STATE_FILE, 'w') as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                json.dump(state, f, indent=2)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    except Exception as e:
        logger.error(f"Failed to save state: {e}")


def fetch_wallet_fees(retries: int = 3) -> Optional[Dict[str, Any]]:
    """Fetch position data from health server."""
    url = f"{HEALTH_SERVER_URL}/wallet-fees"
    
    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Fetch attempt {attempt + 1}/{retries} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    
    logger.error(f"Failed to fetch wallet-fees after {retries} attempts")
    return None


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


def calculate_pnl(state_wallet: Dict[str, Any], position_addr: str, current_data: Dict[str, Any]) -> Dict[str, float]:
    """Calculate PnL for a position."""
    current_liquidity = current_data.get("liquidity_usd", 0)
    fees_24h = current_data.get("fees_24h", 0)
    
    # Initialize if first time seeing this position
    if position_addr not in state_wallet.get("positions", {}):
        state_wallet.setdefault("positions", {})[position_addr] = {
            "entry_value_usd": current_liquidity,
            "history": []
        }
    
    pos_state = state_wallet["positions"][position_addr]
    entry_value = pos_state.get("entry_value_usd", current_liquidity)
    
    # Calculate total PnL
    pnl_usd = (current_liquidity + fees_24h) - entry_value
    pnl_pct = (pnl_usd / entry_value * 100) if entry_value > 0 else 0
    
    # Update history (rolling 24h buffer)
    history = pos_state.get("history", [])
    history.append({
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "value": current_liquidity
    })
    
    # Keep only last MAX_HISTORY entries
    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]
    
    # Calculate 24h PnL
    if len(history) >= 2:
        oldest = history[0]["value"]
        pnl_24h = current_liquidity - oldest
    else:
        pnl_24h = 0
    
    # Update state
    pos_state["entry_value_usd"] = entry_value  # Keep original entry
    pos_state["history"] = history
    
    return {
        "pnl_usd": round(pnl_usd, 2),
        "pnl_pct": round(pnl_pct, 2),
        "pnl_24h": round(pnl_24h, 2),
        "entry_value_usd": entry_value,
        "current_value_usd": current_liquidity,
    }


def format_automation(automation: Dict[str, Any]) -> str:
    """Format automation settings for display."""
    if not automation.get("enabled", False):
        return "Auto: Disabled"
    
    sl = automation.get("stop_loss_pct", 10)
    tp = automation.get("take_profit_pct", 50)
    mode = automation.get("notification_mode", "alert")
    
    mode_str = {
        "alert_owner": "Alert Owner",
        "auto_execute": "Auto Execute"
    }.get(mode, mode)
    
    return f"SL: -{sl}% | TP: +{tp}% | {mode_str}"


def build_wallet_embed(wallet_name: str, wallet_config: Dict[str, Any], wallet_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build summary embed for a wallet."""
    positions = wallet_data.get("positions", [])
    sol_balance = wallet_data.get("sol_balance", 0)
    
    # Calculate totals
    total_value = sum(p.get("liquidity_usd", 0) for p in positions)
    total_fees_claimed = sum(p.get("fees_claimed_usd", 0) for p in positions)
    
    # Calculate total PnL
    total_pnl = 0
    total_pnl_pct = 0
    for p in positions:
        pnl = p.get("pnl", {})
        total_pnl += pnl.get("pnl_usd", 0)
    
    if positions and total_value > 0:
        total_pnl_pct = (total_pnl / (total_value - total_pnl)) * 100 if (total_value - total_pnl) > 0 else 0
    
    # Color based on PnL
    color = 0x00FF00 if total_pnl >= 0 else 0xFF0000
    
    label = wallet_config.get("label", wallet_name)
    
    embed = {
        "title": f"💼 {label}",
        "color": color,
        "fields": [
            {"name": "SOL Balance", "value": f"{sol_balance:.4f} SOL", "inline": True},
            {"name": "Positions", "value": str(len(positions)), "inline": True},
            {"name": "Pool TVL (all)", "value": f"${total_value:,.2f}", "inline": True},
            {"name": "Fees Claimed", "value": f"${total_fees_claimed:,.2f}", "inline": True},
            {"name": "Total PnL", "value": f"${total_pnl:,.2f} ({total_pnl_pct:.1f}%)", "inline": True},
        ],
        "footer": {"text": f"Position Monitor | {wallet_name}"},
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    return embed


def build_position_embed(wallet_name: str, position: Dict[str, Any], pnl: Dict[str, float]) -> Dict[str, Any]:
    """Build embed for a single position."""
    pool_name = position.get("pool_name", "Unknown")
    meteora_url = position.get("meteora_url", "")
    apy = position.get("apy", 0)
    in_range = position.get("in_range", False)
    lower_bin = position.get("lower_bin_id", 0)
    upper_bin = position.get("upper_bin_id", 0)
    active_bin = position.get("active_bin_id", 0)
    mint_x = position.get("mint_x", "")
    
    # Color based on PnL
    color = 0x00FF00 if pnl.get("pnl_usd", 0) >= 0 else 0xFF0000
    
    # Status
    status = "✅ IN RANGE" if in_range else "❌ OUT OF RANGE"
    
    # Automation
    automation = position.get("automation", {})
    automation_str = format_automation(automation)
    
    # Only set URL if it's valid (Discord rejects empty strings)
    embed_url = meteora_url if meteora_url and meteora_url.strip() else None
    
    fees_claimed = position.get("fees_claimed_usd", 0)

    embed = {
        "title": pool_name,
        "url": embed_url,
        "color": color,
        "fields": [
            {"name": "Fee APY (24h)", "value": f"{apy:.1f}%", "inline": True},
            {"name": "Status", "value": status, "inline": True},
            {"name": "Fees Claimed", "value": f"${fees_claimed:,.2f}", "inline": True},
            {"name": "PnL", "value": f"${pnl.get('pnl_usd', 0):,.2f} ({pnl.get('pnl_pct', 0):.1f}%)", "inline": True},
            {"name": "Entry Value", "value": f"${pnl.get('entry_value_usd', 0):,.2f}", "inline": True},
            {"name": "Current Value", "value": f"${pnl.get('current_value_usd', 0):,.2f}", "inline": True},
            {"name": "24h PnL", "value": f"${pnl.get('pnl_24h', 0):,.2f}", "inline": True},
            {"name": "Pool TVL", "value": f"${position.get('liquidity_usd', 0):,.2f}", "inline": True},
            {"name": "Volume (24h)", "value": f"${position.get('volume_24h', 0):,.2f}", "inline": True},
            {"name": "Bin Range", "value": f"{lower_bin}-{upper_bin} (Active: {active_bin})", "inline": False},
            {"name": "Links", "value": f"[Meteora]({meteora_url}) | [DexScreener]({get_dexscreener_url(mint_x)})", "inline": False},
            {"name": "Automation", "value": automation_str, "inline": False},
        ],
    }
    
    return embed


def delete_previous_messages(webhook_url: str, message_ids: List[str]):
    """Delete previous Discord messages."""
    if not message_ids:
        return
    
    # Parse webhook URL
    parts = webhook_url.split("/")
    if len(parts) < 2:
        logger.warning("Invalid webhook URL format")
        return
    
    webhook_id = parts[-2]
    token = parts[-1] if "?" not in parts[-1] else parts[-1].split("?")[0]
    
    base_url = f"https://discord.com/api/webhooks/{webhook_id}/{token}"
    
    for msg_id in message_ids:
        try:
            url = f"{base_url}/messages/{msg_id}"
            response = requests.delete(url, timeout=10)
            if response.status_code == 204:
                logger.info(f"Deleted message {msg_id}")
            else:
                logger.warning(f"Failed to delete message {msg_id}: {response.status_code}")
        except Exception as e:
            logger.warning(f"Error deleting message {msg_id}: {e}")


def post_embeds_to_discord(webhook_url: str, embeds: List[Dict[str, Any]]) -> List[str]:
    """Post embeds to Discord and return created message IDs."""
    if not webhook_url:
        logger.warning("No Discord webhook URL configured")
        return []
    
    if not embeds:
        return []
    
    # Append wait=true to get message ID back
    webhook_url = webhook_url.strip()
    if "?" not in webhook_url:
        webhook_url += "?wait=true"
    elif "wait=" not in webhook_url:
        webhook_url += "&wait=true"
    
    message_ids = []
    
    # Discord allows max 10 embeds per message
    for i in range(0, len(embeds), DISCORD_MAX_EMBEDS):
        batch = embeds[i:i + DISCORD_MAX_EMBEDS]
        
        payload = {"embeds": batch}
        
        try:
            response = requests.post(webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            
            # Extract message ID from response
            if response.json():
                msg_id = response.json().get("id")
                if msg_id:
                    message_ids.append(str(msg_id))
                    logger.info(f"Posted embed batch {i//DISCORD_MAX_EMBEDS + 1} ({len(batch)} embeds), message ID: {msg_id}")
        except Exception as e:
            logger.error(f"Failed to post embeds to Discord: {e}")
    
    return message_ids


def process_wallet(wallet_name: str, wallet_config: Dict[str, Any], wallet_data: Dict[str, Any], state: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Process a single wallet and return embeds."""
    positions = wallet_data.get("positions", [])
    
    if not positions:
        return []
    
    # Get or create wallet state
    state_wallet = state.setdefault("wallets", {}).setdefault(wallet_name, {"positions": {}})
    
    embeds = []
    
    # First, calculate PnL for ALL positions (so summary can access it)
    for pos in positions:
        position_addr = pos.get("position", "")
        pnl = calculate_pnl(state_wallet, position_addr, pos)
        pos["pnl"] = pnl
    
    # Now build summary embed (PnL is now populated in positions)
    summary_embed = build_wallet_embed(wallet_name, wallet_config, wallet_data)
    embeds.append(summary_embed)
    
    # Then individual position embeds
    for pos in positions:
        try:
            pnl = pos.get("pnl", {})
            pos_embed = build_position_embed(wallet_name, pos, pnl)
            embeds.append(pos_embed)
        except Exception as e:
            logger.error(f"Failed to build embed for position {pos.get('position', 'unknown')}: {e}")
            continue
    
    return embeds


def main():
    """Main function."""
    logger.info("Position Monitor starting...")
    
    # Ensure state directory exists
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    
    # Check if enabled
    enabled = os.getenv("POSITION_MONITOR_ENABLED", "true").lower() == "true"
    if not enabled:
        logger.info("Position monitor disabled via environment variable")
        return
    
    # Load config
    config = load_config()
    if not config:
        logger.error("No config found, exiting")
        return
    
    # Load state
    state = load_state()

    # Fetch data
    data = fetch_wallet_fees()
    if not data:
        logger.error("Failed to fetch wallet-fees data")
        return

    wallets = data.get("wallets", {})
    config_wallets = config.get("wallets", {})
    delete_prev = config.get("discord", {}).get("delete_previous_messages", True)

    total_embeds = 0
    total_messages = 0

    # Process each configured wallet — each posts to its own webhook/channel
    for wallet_name, wallet_config in config_wallets.items():
        wallet_address = wallet_config.get("address", "")

        # Resolve per-wallet webhook URL
        webhook_env = wallet_config.get("webhook_env", "DISCORD_WEBHOOK_POSITIONS")
        webhook_url = os.getenv(webhook_env)
        if not webhook_url:
            logger.error(f"Webhook env var {webhook_env} not set for wallet {wallet_name} — skipping")
            continue

        # Find matching wallet in API response
        wallet_data = None
        for api_wallet_name, api_wallet_data in wallets.items():
            if api_wallet_data.get("wallet", "").lower() == wallet_address.lower():
                wallet_data = api_wallet_data
                break

        if not wallet_data:
            logger.warning(f"No data found for wallet {wallet_name} ({wallet_address})")
            continue

        # Add automation config to positions for display
        automation = wallet_config.get("automation", {})
        for pos in wallet_data.get("positions", []):
            pos["automation"] = automation

        # Process wallet → embeds
        embeds = process_wallet(wallet_name, wallet_config, wallet_data, state)
        logger.info(f"Wallet {wallet_name}: {len(wallet_data.get('positions', []))} positions, {len(embeds)} embeds")

        # Delete previous messages for this wallet's channel
        if delete_prev:
            prev_ids = state.get("wallets", {}).get(wallet_name, {}).get("last_message_ids", [])
            if prev_ids:
                delete_previous_messages(webhook_url, prev_ids)

        # Post to this wallet's channel
        new_ids = post_embeds_to_discord(webhook_url, embeds)
        state.setdefault("wallets", {}).setdefault(wallet_name, {})["last_message_ids"] = new_ids

        total_embeds += len(embeds)
        total_messages += len(new_ids)

    # Run automation checks (SL/TP)
    for wallet_name, wallet_config in config_wallets.items():
        wallet_address = wallet_config.get("address", "")
        wallet_data = wallets.get(wallet_address.lower()) or wallets.get(wallet_address)
        if not wallet_data:
            # Try matching by address in wallets dict
            for api_wallet_name, api_wallet_data in wallets.items():
                if api_wallet_data.get("wallet", "").lower() == wallet_address.lower():
                    wallet_data = api_wallet_data
                    break
        
        if wallet_data:
            run_automation_checks(
                {wallet_name: wallet_config},
                {wallet_name: wallet_data},
                state,
                config
            )

    # Save state (after automation so alert counters are persisted)
    save_state(state)

    logger.info(f"Position monitor complete. Posted {total_embeds} embeds across {total_messages} messages")


if __name__ == "__main__":
    main()
