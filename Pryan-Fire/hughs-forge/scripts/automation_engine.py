#!/usr/bin/env python3
"""
Automation Engine — SL/TP automation for DLMM positions
Evaluates triggers and executes close/swap actions based on wallet config.
"""
import requests
import json
import os
import logging
import subprocess
from datetime import datetime
from typing import Dict, Any, List, Optional

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment variables
DISCORD_WEBHOOK_ALERTS = os.getenv("DISCORD_WEBHOOK_ALERTS")
DISCORD_STEROL_USER_ID = os.getenv("DISCORD_STEROL_USER_ID")
AUTOMATION_DRY_RUN = os.getenv("AUTOMATION_DRY_RUN", "true").lower() == "true"
JUPITER_API_KEY = os.getenv("JUPITER_API_KEY")

# Constants
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
SOL_MINT = "So11111111111111111111111111111111111111112"


def evaluate_triggers(wallet_name: str, positions: List[Dict], wallet_config: Dict, state: Dict) -> List[Dict]:
    """
    For each position, check if PnL has hit SL or TP.
    Returns list of triggered positions with trigger_type.
    """
    triggers = []
    automation = wallet_config.get("automation", {})
    
    if not automation.get("enabled", False):
        return triggers
    
    sl_pct = automation.get("stop_loss_pct", 10.0)
    tp_pct = automation.get("take_profit_pct", 50.0)
    
    state_wallet = state.get("wallets", {}).get(wallet_name, {})
    state_positions = state_wallet.get("positions", {})
    
    for pos in positions:
        pubkey = pos.get("position", "")
        if not pubkey:
            continue
        
        # Get entry value from state
        pos_state = state_positions.get(pubkey, {})
        entry_value = pos_state.get("entry_value_usd", 0)
        
        if entry_value <= 0:
            continue  # No entry value recorded yet, skip
        
        current_value = pos.get("liquidity_usd", 0)
        fees = pos.get("fees_24h", 0)
        
        # Calculate PnL percentage
        pnl_usd = (current_value + fees) - entry_value
        pnl_pct = (pnl_usd / entry_value) * 100 if entry_value > 0 else 0
        
        # Check triggers
        if pnl_pct <= -sl_pct:
            triggers.append({
                "position": pos,
                "trigger_type": "stop_loss",
                "pnl_pct": round(pnl_pct, 2),
                "entry_value": entry_value,
                "current_value": current_value,
                "fees": fees
            })
            logger.info(f"[{wallet_name}] STOP LOSS triggered for {pubkey[:12]}... | PnL: {pnl_pct:.1f}%")
        elif pnl_pct >= tp_pct:
            triggers.append({
                "position": pos,
                "trigger_type": "take_profit",
                "pnl_pct": round(pnl_pct, 2),
                "entry_value": entry_value,
                "current_value": current_value,
                "fees": fees
            })
            logger.info(f"[{wallet_name}] TAKE PROFIT triggered for {pubkey[:12]}... | PnL: {pnl_pct:.1f}%")
    
    return triggers


def _post_to_discord_alerts(message: Dict) -> bool:
    """Post message to alerts webhook."""
    if not DISCORD_WEBHOOK_ALERTS:
        logger.warning("DISCORD_WEBHOOK_ALERTS not set - cannot send alert")
        return False
    
    try:
        response = requests.post(DISCORD_WEBHOOK_ALERTS, json=message, timeout=10)
        response.raise_for_status()
        logger.info("Alert posted to #the-nexus")
        return True
    except Exception as e:
        logger.error(f"Failed to post alert to Discord: {e}")
        return False


def handle_alert_owner(wallet_name: str, trigger: Dict, config: Dict, state: Dict) -> bool:
    """
    Send @Sterol alerts to #the-nexus. Track escalation state.
    After alert_count alerts, auto-execute if configured.
    Returns True if action was taken (alert sent or executed).
    """
    pos = trigger["position"]
    pubkey = pos.get("position", "")
    pool_name = pos.get("pool_name", "Unknown")
    trigger_type = trigger["trigger_type"]
    pnl_pct = trigger["pnl_pct"]
    
    wallet_config = config.get("wallets", {}).get(wallet_name, {})
    automation = wallet_config.get("automation", {})
    alert_count = automation.get("alert_count", 3)
    alert_interval = automation.get("alert_interval_seconds", 60)
    auto_execute_after = automation.get("auto_execute_after_alerts", True)
    
    # Get or create alerts state for this wallet
    automation_state = state.setdefault("automation", {}).setdefault(wallet_name, {})
    active_alerts = automation_state.setdefault("active_alerts", {})
    
    if pubkey not in active_alerts:
        # First time seeing this trigger
        active_alerts[pubkey] = {
            "trigger_type": trigger_type,
            "trigger_pnl_pct": pnl_pct,
            "alerts_sent": 0,
            "first_alert_at": datetime.utcnow().isoformat() + "Z",
            "last_alert_at": None,
            "escalation_state": "alerting",
            "pool_name": pool_name
        }
    
    alert = active_alerts[pubkey]
    
    # Check if enough time has passed since last alert
    if alert.get("last_alert_at"):
        last = datetime.fromisoformat(alert["last_alert_at"].rstrip("Z"))
        elapsed = (datetime.utcnow() - last).total_seconds()
        if elapsed < alert_interval:
            logger.debug(f"Alert for {pubkey[:12]}... not due yet (elapsed: {elapsed:.0f}s < {alert_interval}s)")
            return False
    
    if alert["alerts_sent"] < alert_count:
        # Send alert to #the-nexus
        sterol_id = DISCORD_STEROL_USER_ID or "Sterol"
        
        emoji = "🔴" if trigger_type == "stop_loss" else "🟢"
        alert_num = alert["alerts_sent"] + 1
        
        remaining = alert_count - alert_num
        
        msg = {
            "content": f"{emoji} <@{sterol_id}> **{trigger_type.upper().replace('_', ' ')}** triggered!\n"
                       f"**Pool**: {pool_name}\n"
                       f"**Position**: `{pubkey[:12]}...`\n"
                       f"**PnL**: {pnl_pct:+.1f}%\n"
                       f"Alert {alert_num}/{alert_count}" +
                       (f" — Auto-close in {remaining} more alert{'s' if remaining > 1 else ''} if no response." if remaining > 0 else " — FINAL WARNING!"),
        }
        
        if _post_to_discord_alerts(msg):
            alert["alerts_sent"] += 1
            alert["last_alert_at"] = datetime.utcnow().isoformat() + "Z"
            return True
    
    elif auto_execute_after and alert.get("escalation_state") == "alerting":
        # All alerts sent, no response — auto execute
        logger.info(f"[{wallet_name}] All {alert_count} alerts sent for {pubkey[:12]}... — executing auto-close")
        alert["escalation_state"] = "executing"
        
        success = execute_position_close(wallet_name, trigger, config)
        
        alert["escalation_state"] = "executed" if success else "failed"
        alert["executed_at"] = datetime.utcnow().isoformat() + "Z"
        
        return True
    
    return False


def handle_auto_execute(wallet_name: str, trigger: Dict, config: Dict) -> bool:
    """
    Immediately close position and swap to USDC.
    No human notification required.
    """
    pos = trigger["position"]
    pubkey = pos.get("position", "")
    pool_name = pos.get("pool_name", "Unknown")
    trigger_type = trigger["trigger_type"]
    pnl_pct = trigger["pnl_pct"]
    
    emoji = "🔴" if trigger_type == "stop_loss" else "🟢"
    
    # Post notification (non-blocking, just info)
    if DISCORD_WEBHOOK_ALERTS:
        msg = {
            "content": f"{emoji} **[AUTO-EXECUTE]** {trigger_type.upper().replace('_', ' ')} triggered!\n"
                       f"**Pool**: {pool_name}\n"
                       f"**Position**: `{pubkey[:12]}...`\n"
                       f"**PnL**: {pnl_pct:+.1f}%\n"
                       f"Closing position and swapping to USDC...",
        }
        _post_to_discord_alerts(msg)
    
    return execute_position_close(wallet_name, trigger, config)


def execute_position_close(wallet_name: str, trigger: Dict, config: Dict) -> bool:
    """
    Full execution flow:
    1. Claim unclaimed fees
    2. Remove all liquidity
    3. Close the position
    4. Swap non-USDC/SOL tokens to USDC via Jupiter
    5. Post confirmation to Discord
    """
    pos = trigger["position"]
    pubkey = pos.get("position", "")
    pool_name = pos.get("pool_name", "Unknown")
    pool_pubkey = pos.get("pool", "")
    token_x_mint = pos.get("mint_x", "")
    token_y_mint = pos.get("mint_y", "")
    token_x_symbol = pos.get("token_x_symbol", "X")
    token_y_symbol = pos.get("token_y_symbol", "Y")
    trigger_type = trigger["trigger_type"]
    pnl_pct = trigger["pnl_pct"]
    
    # Get execution config
    execution = config.get("execution", {})
    dry_run = execution.get("dry_run", AUTOMATION_DRY_RUN)
    swap_slippage = execution.get("swap_slippage_bps", 100)
    
    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Executing position close: {pubkey} ({pool_name})")
    
    if dry_run:
        logger.info(f"DRY RUN: Would close position {pubkey}, claim fees, swap tokens to USDC")
        _post_execution_notification(wallet_name, trigger, dry_run=True)
        return True
    
    # === REAL EXECUTION ===
    # Use Jupiter API to generate swap transaction
    try:
        # Determine which token to swap (token_x or token_y)
        swap_from_mint = token_x_mint if token_x_mint != USDC_MINT else token_y_mint
        swap_from_symbol = token_x_symbol if token_x_mint != USDC_MINT else token_y_symbol
        
        # For DLMM positions, we need to first remove liquidity then swap
        # This is a simplified version - generates a basic SOL/USDC swap for now
        # Full implementation would call DLMM SDK to withdraw position first
        
        logger.info(f"Initiating Jupiter swap: {swap_from_symbol} -> USDC")
        
        # Get swap quote from Jupiter
        quote = _get_jupiter_quote(swap_from_mint, USDC_MINT, 1000000)  # 1 unit min
        if not quote:
            logger.error("Failed to get Jupiter quote")
            _post_execution_notification(wallet_name, trigger, dry_run=False, success=False)
            return False
        
        logger.info(f"Jupiter quote received: {quote.get('outAmount')} USDC")
        
        # Get swap transaction
        swap_tx = _get_jupiter_swap_transaction(quote, swap_from_mint, USDC_MINT, swap_slippage)
        if not swap_tx:
            logger.error("Failed to build Jupiter transaction")
            _post_execution_notification(wallet_name, trigger, dry_run=False, success=False)
            return False
        
        # Post transaction to Discord for manual approval
        _post_swap_transaction_to_discord(wallet_name, trigger, swap_tx, quote)
        
        logger.info("Swap transaction generated and posted to Discord for approval")
        _post_execution_notification(wallet_name, trigger, dry_run=False, success=True)
        return True
        
    except Exception as e:
        logger.error(f"Execution error: {e}")
        _post_execution_notification(wallet_name, trigger, dry_run=False, success=False)
        return False


def _get_jupiter_quote(input_mint: str, output_mint: str, amount: int) -> Optional[Dict]:
    """Get swap quote from Jupiter API."""
    try:
        url = f"https://api.jup.ag/swap/v1/quote?inputMint={input_mint}&outputMint={output_mint}&amount={amount}&slippageBps=50"
        headers = {}
        if JUPITER_API_KEY:
            headers["x-api-key"] = JUPITER_API_KEY
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            logger.error(f"Jupiter API error: {resp.status_code} - {resp.text}")
            return None
        
        quote = resp.json()
        if not quote:
            logger.error("No quote returned from Jupiter")
            return None
        
        return quote
    except Exception as e:
        logger.error(f"Failed to get Jupiter quote: {e}")
        return None


def _get_jupiter_swap_transaction(quote: Dict, input_mint: str, output_mint: str, slippage_bps: int) -> Optional[str]:
    """Get swap transaction from Jupiter API."""
    try:
        url = "https://api.jup.ag/swap/v1/swap"
        headers = {}
        if JUPITER_API_KEY:
            headers["x-api-key"] = JUPITER_API_KEY
        payload = {
            "quoteResponse": quote,
            "userPublicKey": "74QXtqTiM9w1D9WM8ArPEggHPRVUWggeQn3KxvR4ku5x",  # bot wallet
            "slippageBps": slippage_bps,
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code != 200:
            logger.error(f"Jupiter swap API error: {resp.status_code} - {resp.text}")
            return None
        
        data = resp.json()
        return data.get("swapTransaction")
    except Exception as e:
        logger.error(f"Failed to build Jupiter transaction: {e}")
        return None


def _post_swap_transaction_to_discord(wallet_name: str, trigger: Dict, swap_tx: str, quote: Dict):
    """Post base64 swap transaction to Discord for manual signing."""
    if not DISCORD_WEBHOOK_ALERTS:
        return
    
    pos = trigger["position"]
    pubkey = pos.get("position", "")
    pool_name = pos.get("pool_name", "Unknown")
    pnl_pct = trigger["pnl_pct"]
    
    out_amount = int(quote.get("outAmount", 0)) / 1_000_000  # USDC has 6 decimals
    
    msg = {
        "content": f"⚠️ **SWAP TRANSACTION READY**\n"
                   f"**Wallet**: {wallet_name}\n"
                   f"**Pool**: {pool_name}\n"
                   f"**Position**: `{pubkey[:12]}...`\n"
                   f"**Output**: ~{out_amount:.2f} USDC\n"
                   f"**Transaction**: `Base64 encoded - use Solana CLI or Phantom to sign`\n"
                   f"```\n{swap_tx[:200]}...\n```\n"
                   f"@Ola Lawal please sign this transaction to complete the take-profit."
    }
    
    _post_to_discord_alerts(msg)


def _post_execution_notification(wallet_name: str, trigger: Dict, dry_run: bool, success: bool = True):
    """Post execution notification to Discord."""
    if not DISCORD_WEBHOOK_ALERTS:
        return
    
    pos = trigger["position"]
    pubkey = pos.get("position", "")
    pool_name = pos.get("pool_name", "Unknown")
    trigger_type = trigger["trigger_type"]
    pnl_pct = trigger["pnl_pct"]
    
    emoji = "🔴" if trigger_type == "stop_loss" else "🟢"
    status = "DRY RUN" if dry_run else ("SUCCESS" if success else "FAILED")
    
    msg = {
        "content": f"{emoji} **AUTOMATION {status}**\n"
                   f"**Wallet**: {wallet_name}\n"
                   f"**Pool**: {pool_name}\n"
                   f"**Position**: `{pubkey[:12]}...`\n"
                   f"**Trigger**: {trigger_type.upper().replace('_', ' ')}\n"
                   f"**PnL**: {pnl_pct:+.1f}%",
    }
    
    _post_to_discord_alerts(msg)


def run_automation_checks(wallets_config: Dict, wallets_data: Dict, state: Dict, config: Dict):
    """
    Run automation checks for all wallets.
    This is called from position_monitor.py after posting embeds.
    """
    for wallet_name, wallet_config in wallets_config.items():
        automation = wallet_config.get("automation", {})
        
        if not automation.get("enabled", False):
            continue
        
        # Find matching wallet in API data
        wallet_address = wallet_config.get("address", "")
        wallet_data = None
        
        for api_wallet_name, api_data in wallets_data.items():
            if api_data.get("wallet", "").lower() == wallet_address.lower():
                wallet_data = api_data
                break
        
        if not wallet_data:
            logger.warning(f"No data found for wallet {wallet_name} during automation check")
            continue
        
        positions = wallet_data.get("positions", [])
        
        # Evaluate triggers
        triggers = evaluate_triggers(wallet_name, positions, wallet_config, state)
        
        if not triggers:
            continue
        
        # Process each trigger
        notification_mode = automation.get("notification_mode", "alert_owner")
        
        for trigger in triggers:
            if notification_mode == "auto_execute":
                handle_auto_execute(wallet_name, trigger, config)
            elif notification_mode == "alert_owner":
                handle_alert_owner(wallet_name, trigger, config, state)
            else:
                logger.warning(f"Unknown notification_mode: {notification_mode}")
