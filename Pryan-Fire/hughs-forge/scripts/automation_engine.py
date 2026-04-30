#!/usr/bin/env python3
"""
Automation Engine — SL/TP automation for DLMM positions
Evaluates triggers and executes close actions based on wallet config.
"""
import requests
import json
import os
import logging
import subprocess
import shlex
from datetime import datetime, timezone
from pathlib import Path
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

# Constants
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
SOL_MINT = "So11111111111111111111111111111111111111112"

# Retry / cooldown constants. These keep a bad live close from hammering the
# wallet, RPC, or Discord forever after an SL/TP trigger.
MAX_EXECUTE_RETRIES = 3
BACKOFF_MULTIPLIER = 2.0
MAX_ALERT_INTERVAL = 3600
COOLDOWN_DURATION_SECONDS = 7200
DEFAULT_KILL_SWITCH_FILE = "/data/openclaw/trade_stop.lock"


def _utcnow() -> datetime:
    return datetime.utcnow()


def _parse_utc(value: Any) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _approval_scope(wallet_name: str, trigger: Dict[str, Any]) -> Dict[str, str]:
    pos = trigger.get("position", {})
    return {
        "action": "dlmm_close",
        "wallet_name": wallet_name,
        "position": pos.get("position", ""),
        "pool": pos.get("pool") or pos.get("lb_pair", ""),
        "trigger_type": trigger.get("trigger_type", ""),
    }


def _risk_approval_id(wallet_name: str, trigger: Dict[str, Any]) -> str:
    scope = _approval_scope(wallet_name, trigger)
    return ":".join([
        scope["action"],
        scope["wallet_name"],
        scope["position"],
        scope["pool"],
        scope["trigger_type"],
    ])


def _get_risk_approval_record(wallet_name: str, approval_id: str, state: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not state:
        return None
    approvals = state.get("risk_approvals", {})
    if approval_id in approvals:
        return approvals[approval_id]
    wallet_approvals = state.get("automation", {}).get(wallet_name, {}).get("risk_approvals", {})
    return wallet_approvals.get(approval_id)


def _check_live_risk_approval(
    wallet_name: str,
    trigger: Dict[str, Any],
    config: Dict[str, Any],
    state: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """Fail-closed live-money approval gate for DLMM closes.

    Dry runs are always allowed. Live closes require an explicit, scoped,
    unexpired approval record written by the risk/approval layer. This keeps
    legacy mock RiskManager behavior from silently authorizing real money.
    """
    execution = config.get("execution", {})
    dry_run = execution.get("dry_run", AUTOMATION_DRY_RUN)
    approval_id = _risk_approval_id(wallet_name, trigger)

    if dry_run:
        return {
            "approved": True,
            "approval_id": approval_id,
            "state": "dry_run",
            "source": "dry_run",
            "approved_by": "not_required",
        }

    kill_switch_file = execution.get("kill_switch_file", DEFAULT_KILL_SWITCH_FILE)
    if kill_switch_file and Path(kill_switch_file).exists():
        return {
            "approved": False,
            "approval_id": approval_id,
            "state": "denied",
            "source": "kill_switch",
            "reason": "kill_switch_active",
        }

    record = _get_risk_approval_record(wallet_name, approval_id, state)
    if not record:
        return {
            "approved": False,
            "approval_id": approval_id,
            "state": "missing",
            "source": "none",
            "reason": "risk_approval_required",
        }

    source = str(record.get("source") or record.get("approval_source") or "unknown")
    status = str(record.get("status") or record.get("state") or "").lower()
    if status != "approved":
        return {
            "approved": False,
            "approval_id": approval_id,
            "state": status or "not_approved",
            "source": source,
            "reason": "risk_approval_not_approved",
        }

    approved_by = record.get("approved_by") or record.get("operator")
    approved_by_id = record.get("approved_by_id") or record.get("operator_id")
    auth_method = record.get("auth_method") or record.get("authentication")
    if not approved_by or not approved_by_id or not auth_method:
        return {
            "approved": False,
            "approval_id": approval_id,
            "state": "unauthenticated",
            "source": source,
            "reason": "risk_approval_unauthenticated",
        }

    expires_at = _parse_utc(record.get("expires_at"))
    if not expires_at or expires_at <= _utcnow():
        return {
            "approved": False,
            "approval_id": approval_id,
            "state": "expired",
            "source": source,
            "approved_by": approved_by,
            "reason": "risk_approval_expired",
        }

    expected_scope = _approval_scope(wallet_name, trigger)
    record_scope = record.get("scope", {})
    if not isinstance(record_scope, dict):
        return {
            "approved": False,
            "approval_id": approval_id,
            "state": "scope_mismatch",
            "source": source,
            "approved_by": approved_by,
            "reason": "risk_approval_scope_mismatch",
            "scope_key": "scope",
        }
    for key, expected_value in expected_scope.items():
        if str(record_scope.get(key, "")) != str(expected_value):
            return {
                "approved": False,
                "approval_id": approval_id,
                "state": "scope_mismatch",
                "source": source,
                "approved_by": approved_by,
                "reason": "risk_approval_scope_mismatch",
                "scope_key": key,
            }

    return {
        "approved": True,
        "approval_id": approval_id,
        "state": "approved",
        "source": source,
        "approved_by": approved_by,
        "approved_by_id": str(approved_by_id),
        "auth_method": str(auth_method),
        "expires_at": record.get("expires_at"),
    }



def _position_fee_value(pos: Dict[str, Any]) -> float:
    """Return the best per-position fee value available for PnL math."""
    # fees_claimed_usd is per-position from Meteora. fees_24h is currently
    # pool-level in health_server, so only use it as legacy fallback.
    return float(pos.get("fees_claimed_usd", pos.get("fees_24h", 0)) or 0)


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

        current_value = float(pos.get("liquidity_usd", 0) or 0)
        fees = _position_fee_value(pos)

        # Closed/stale positions should not fire. Do not infer staleness from
        # zero value alone: a live position can collapse to zero and still needs
        # stop-loss handling. Upstream must mark closed/stale explicitly.
        is_stale = bool(pos.get("stale") or pos.get("closed") or pos.get("pnl", {}).get("stale"))
        value_unavailable = bool(
            pos.get("pnl_value_unavailable")
            or pos.get("liquidity_value_source") == "unavailable"
            or pos.get("pnl", {}).get("value_unavailable")
        )
        if is_stale or value_unavailable:
            logger.debug(f"[{wallet_name}] Skipping stale/value-unavailable position {pubkey}")
            continue
        
        # Get entry value from state
        pos_state = state_positions.get(pubkey, {})
        entry_value = pos_state.get("entry_value_usd", 0)
        
        if entry_value <= 0:
            continue  # No entry value recorded yet, skip
        
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

    # Failed live closes enter cooldown instead of spamming retries forever.
    cooldowns = automation_state.get("cooldowns", {})
    if pubkey in cooldowns:
        cooldown_info = cooldowns[pubkey]
        cooldown_until = cooldown_info.get("cooldown_until", "")
        if cooldown_until:
            try:
                until = datetime.fromisoformat(cooldown_until.rstrip("Z"))
                if datetime.utcnow() < until:
                    remaining = (until - datetime.utcnow()).total_seconds()
                    logger.info(f"[{wallet_name}] Position {pubkey} in cooldown ({remaining:.0f}s remaining) — skipping")
                    return False
                logger.info(f"[{wallet_name}] Position {pubkey} cooldown expired — resuming alerts")
                del cooldowns[pubkey]
                active_alerts.pop(pubkey, None)
            except (ValueError, TypeError):
                del cooldowns[pubkey]
    
    if pubkey not in active_alerts:
        # First time seeing this trigger
        active_alerts[pubkey] = {
            "trigger_type": trigger_type,
            "trigger_pnl_pct": pnl_pct,
            "alerts_sent": 0,
            "execute_attempts": 0,
            "first_alert_at": datetime.utcnow().isoformat() + "Z",
            "last_alert_at": None,
            "escalation_state": "alerting",
            "pool_name": pool_name
        }
    
    alert = active_alerts[pubkey]
    
    # Check if enough time has passed since last alert. After failed execution
    # attempts, back off before the next alert/attempt.
    effective_interval = alert_interval
    execute_attempts = alert.get("execute_attempts", 0)
    if execute_attempts > 0:
        effective_interval = min(alert_interval * (BACKOFF_MULTIPLIER ** execute_attempts), MAX_ALERT_INTERVAL)

    if alert.get("last_alert_at"):
        last = datetime.fromisoformat(alert["last_alert_at"].rstrip("Z"))
        elapsed = (datetime.utcnow() - last).total_seconds()
        if elapsed < effective_interval:
            logger.debug(f"Alert for {pubkey} not due yet (elapsed: {elapsed:.0f}s < {effective_interval:.0f}s)")
            return False
    
    if alert["alerts_sent"] < alert_count:
        # Send alert to #the-nexus
        sterol_id = DISCORD_STEROL_USER_ID or "Sterol"
        
        emoji = "🔴" if trigger_type == "stop_loss" else "🟢"
        alert_num = alert["alerts_sent"] + 1
        
        remaining = alert_count - alert_num
        entry_val = trigger.get("entry_value", 0)
        current_val = trigger.get("current_value", 0)
        fees_val = trigger.get("fees", 0)
        token_x = pos.get("token_x_symbol", pos.get("mint_x", "?")[:8])
        token_y = pos.get("token_y_symbol", pos.get("mint_y", "?")[:8])
        
        msg = {
            "content": f"{emoji} <@{sterol_id}> **{trigger_type.upper().replace('_', ' ')}** triggered!\n"
                       f"**Pool**: {pool_name} ({token_x}/{token_y})\n"
                       f"**Position**: `{pubkey}`\n"
                       f"**PnL**: {pnl_pct:+.1f}% (${entry_val:,.2f} → ${current_val:,.2f})\n"
                       f"**Fees**: ${fees_val:,.2f}\n"
                       f"Alert {alert_num}/{alert_count}" +
                       (f" — Auto-close in {remaining} more alert{'s' if remaining > 1 else ''} if no response." if remaining > 0 else " — FINAL WARNING!"),
        }
        
        logger.info(f"[{wallet_name}] ALERT: {trigger_type.upper()} {pool_name} Position={pubkey} PnL={pnl_pct:+.1f}% (alert {alert_num}/{alert_count})")
        if _post_to_discord_alerts(msg):
            alert["alerts_sent"] += 1
            alert["last_alert_at"] = datetime.utcnow().isoformat() + "Z"
            return True
    
    elif auto_execute_after and alert.get("escalation_state") == "alerting":
        # All alerts sent, no response — auto execute with bounded retries.
        execute_attempts = alert.get("execute_attempts", 0)
        if execute_attempts >= MAX_EXECUTE_RETRIES:
            cooldown_until = datetime.utcnow().timestamp() + COOLDOWN_DURATION_SECONDS
            cooldown_until_iso = datetime.utcfromtimestamp(cooldown_until).isoformat() + "Z"
            automation_state.setdefault("cooldowns", {})[pubkey] = {
                "cooldown_at": datetime.utcnow().isoformat() + "Z",
                "cooldown_until": cooldown_until_iso,
                "reason": f"Failed {execute_attempts} auto-close attempts",
                "trigger_type": trigger_type,
                "pnl_pct": pnl_pct,
                "pool_name": pool_name,
            }
            alert["escalation_state"] = "cooldown"
            sterol_id = DISCORD_STEROL_USER_ID or "Sterol"
            _post_to_discord_alerts({
                "content": f"⏸️ <@{sterol_id}> Position entering cooldown after {execute_attempts} failed auto-close attempts.\n"
                           f"**Pool**: {pool_name}\n"
                           f"**Position**: `{pubkey}`\n"
                           f"**PnL**: {pnl_pct:+.1f}%\n"
                           f"Manual close recommended; alerts resume after cooldown."
            })
            return True

        logger.info(f"[{wallet_name}] All {alert_count} alerts sent for {pubkey} — executing auto-close (attempt {execute_attempts + 1}/{MAX_EXECUTE_RETRIES})")
        alert["escalation_state"] = "executing"
        alert["execute_attempts"] = execute_attempts + 1
        alert["last_alert_at"] = datetime.utcnow().isoformat() + "Z"
        
        success = execute_position_close(wallet_name, trigger, config, state)
        execution_result = trigger.get("_execution_result", {})
        
        if success:
            alert["escalation_state"] = "executed"
            alert["executed_at"] = datetime.utcnow().isoformat() + "Z"
            alert["execution_result"] = execution_result
        else:
            alert["escalation_state"] = "alerting"
            alert["last_error"] = execution_result.get("error", "close_failed")
            logger.warning(f"[{wallet_name}] Auto-close attempt {alert['execute_attempts']}/{MAX_EXECUTE_RETRIES} FAILED for {pubkey}")
        
        return True
    
    return False


def handle_auto_execute(wallet_name: str, trigger: Dict, config: Dict, state: Dict) -> bool:
    """
    Immediately close position and swap to USDC.
    Tracks retries and fails closed after repeated execution failures.
    """
    pos = trigger["position"]
    pubkey = pos.get("position", "")
    pool_name = pos.get("pool_name", "Unknown")
    trigger_type = trigger["trigger_type"]
    pnl_pct = trigger["pnl_pct"]
    entry_val = trigger.get("entry_value", 0)
    current_val = trigger.get("current_value", 0)
    token_x = pos.get("token_x_symbol", pos.get("mint_x", "?")[:8])
    token_y = pos.get("token_y_symbol", pos.get("mint_y", "?")[:8])
    automation_state = state.setdefault("automation", {}).setdefault(wallet_name, {})
    blacklist = automation_state.setdefault("blacklist", {})
    if pubkey in blacklist:
        logger.info(f"[{wallet_name}] Position {pubkey} is blacklisted — skipping auto-execute")
        return False

    exec_tracker = automation_state.setdefault("exec_attempts", {})
    tracker = exec_tracker.setdefault(pubkey, {"attempts": 0, "first_attempt_at": datetime.utcnow().isoformat() + "Z"})

    if tracker["attempts"] >= MAX_EXECUTE_RETRIES:
        logger.warning(f"[{wallet_name}] Position {pubkey} failed {tracker['attempts']} auto-execute attempts — blacklisting")
        blacklist[pubkey] = {
            "blacklisted_at": datetime.utcnow().isoformat() + "Z",
            "reason": f"Failed {tracker['attempts']} auto-execute attempts",
            "trigger_type": trigger_type,
            "pnl_pct": pnl_pct,
            "pool_name": pool_name,
        }
        exec_tracker.pop(pubkey, None)
        _post_to_discord_alerts({
            "content": f"⚠️ Auto-execute blacklisted a position after {tracker['attempts']} failures.\n"
                       f"**Pool**: {pool_name} ({token_x}/{token_y})\n"
                       f"**Position**: `{pubkey}`\n"
                       f"**PnL**: {pnl_pct:+.1f}%\n"
                       f"Manual intervention required."
        })
        return True

    if tracker.get("last_attempt_at"):
        last = datetime.fromisoformat(tracker["last_attempt_at"].rstrip("Z"))
        backoff_secs = min(60 * (BACKOFF_MULTIPLIER ** tracker["attempts"]), MAX_ALERT_INTERVAL)
        elapsed = (datetime.utcnow() - last).total_seconds()
        if elapsed < backoff_secs:
            logger.debug(f"[{wallet_name}] Auto-execute backoff for {pubkey}: {elapsed:.0f}s < {backoff_secs:.0f}s")
            return False
    
    emoji = "🔴" if trigger_type == "stop_loss" else "🟢"
    attempt_num = tracker["attempts"] + 1
    
    # Post notification (non-blocking, just info)
    if DISCORD_WEBHOOK_ALERTS:
        msg = {
            "content": f"{emoji} **[AUTO-EXECUTE]** {trigger_type.upper().replace('_', ' ')} triggered!\n"
                       f"**Pool**: {pool_name} ({token_x}/{token_y})\n"
                       f"**Position**: `{pubkey}`\n"
                       f"**PnL**: {pnl_pct:+.1f}% (${entry_val:,.2f} → ${current_val:,.2f})\n"
                       f"Attempt {attempt_num}/{MAX_EXECUTE_RETRIES} — closing DLMM position...",
        }
        _post_to_discord_alerts(msg)
    
    tracker["attempts"] = attempt_num
    tracker["last_attempt_at"] = datetime.utcnow().isoformat() + "Z"
    success = execute_position_close(wallet_name, trigger, config, state)
    execution_result = trigger.get("_execution_result", {})
    if success:
        automation_state.setdefault("executions", {})[pubkey] = {
            "status": "executed",
            "executed_at": datetime.utcnow().isoformat() + "Z",
            "trigger_type": trigger_type,
            "pnl_pct": pnl_pct,
            "pool_name": pool_name,
            "signatures": execution_result.get("signatures", []),
            "dry_run": execution_result.get("dry_run", False),
        }
        tracker["executed_at"] = datetime.utcnow().isoformat() + "Z"
        del exec_tracker[pubkey]
    else:
        tracker["last_status"] = "failed"
        tracker["last_error"] = execution_result.get("error", "close_failed")
        tracker["pool_name"] = pool_name
    return success


def _set_execution_result(trigger: Dict, **result: Any) -> Dict[str, Any]:
    """Attach the latest executor result to the trigger for state persistence."""
    trigger["_execution_result"] = result
    return result


def _default_dlmm_close_command() -> Optional[List[str]]:
    script_path = Path(__file__).resolve().parents[1] / "services" / "meteora-trader" / "scripts" / "close-position.mjs"
    if script_path.exists():
        return ["node", str(script_path)]
    return None


def _resolve_dlmm_close_command(execution: Dict[str, Any]) -> Optional[List[str]]:
    command = execution.get("dlmm_close_command") or os.getenv("DLMM_CLOSE_COMMAND")
    if isinstance(command, list):
        return [str(part) for part in command]
    if isinstance(command, str) and command.strip():
        return shlex.split(command)
    return _default_dlmm_close_command()


def _run_dlmm_close_command(wallet_name: str, trigger: Dict, config: Dict, pool_pubkey: str) -> Dict[str, Any]:
    """Run the configured DLMM close executor and return its JSON result."""
    execution = config.get("execution", {})
    command = _resolve_dlmm_close_command(execution)
    if not command:
        return {"success": False, "error": "dlmm_close_command_not_configured"}

    payload = {
        "wallet_name": wallet_name,
        "wallet": config.get("wallets", {}).get(wallet_name, {}),
        "trigger": trigger,
        "position": trigger.get("position", {}),
        "pool": pool_pubkey,
        "execution": execution,
    }
    payload_json = json.dumps(payload)
    env = os.environ.copy()
    env["DLMM_CLOSE_PAYLOAD"] = payload_json
    timeout = int(execution.get("close_timeout_seconds", 180))

    try:
        completed = subprocess.run(
            command,
            input=payload_json,
            text=True,
            capture_output=True,
            timeout=timeout,
            env=env,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "dlmm_close_timeout"}
    except Exception as exc:
        return {"success": False, "error": "dlmm_close_command_error", "message": str(exc)}

    stdout = (completed.stdout or "").strip()
    stderr = (completed.stderr or "").strip()
    result: Dict[str, Any] = {}
    if stdout:
        try:
            result = json.loads(stdout.splitlines()[-1])
        except json.JSONDecodeError:
            result = {"success": False, "error": "dlmm_close_invalid_json", "stdout": stdout[-500:]}

    if completed.returncode != 0:
        result.setdefault("success", False)
        result.setdefault("error", "dlmm_close_command_failed")
        if stderr:
            result["stderr"] = stderr[-500:]
        return result

    if not result:
        result = {"success": False, "error": "dlmm_close_no_result"}
    return result


def execute_position_close(wallet_name: str, trigger: Dict, config: Dict, state: Optional[Dict[str, Any]] = None) -> bool:
    """
    Full execution flow:
    1. Claim unclaimed fees
    2. Remove all liquidity
    3. Close the position
    4. Optionally hand off post-close swaps to a configured executor
    5. Post confirmation to Discord
    """
    pos = trigger["position"]
    pubkey = pos.get("position", "")
    pool_name = pos.get("pool_name", "Unknown")
    pool_pubkey = pos.get("pool") or pos.get("lb_pair", "")
    token_x_mint = pos.get("mint_x", "")
    token_y_mint = pos.get("mint_y", "")
    token_x_symbol = pos.get("token_x_symbol", "X")
    token_y_symbol = pos.get("token_y_symbol", "Y")
    trigger_type = trigger["trigger_type"]
    pnl_pct = trigger["pnl_pct"]
    
    # Get execution config
    execution = config.get("execution", {})
    dry_run = execution.get("dry_run", AUTOMATION_DRY_RUN)
    
    logger.info(f"{'[DRY RUN] ' if dry_run else ''}Executing position close: {pubkey} ({pool_name})")
    
    if dry_run:
        logger.info(f"DRY RUN: Would close position {pubkey}, claim fees, swap tokens to USDC")
        approval = _check_live_risk_approval(wallet_name, trigger, config, state)
        _set_execution_result(trigger, success=True, dry_run=True, signatures=[], approval=approval)
        _post_execution_notification(wallet_name, trigger, dry_run=True)
        return True

    approval = _check_live_risk_approval(wallet_name, trigger, config, state)
    if not approval.get("approved"):
        reason = approval.get("reason", "risk_approval_required")
        logger.error(f"Live DLMM close denied for {pubkey}: {reason} ({approval.get('state')} via {approval.get('source')})")
        _set_execution_result(trigger, success=False, dry_run=False, error=reason, signatures=[], approval=approval)
        _post_execution_notification(wallet_name, trigger, dry_run=False, success=False, error=reason)
        return False

    if not pool_pubkey:
        logger.error(f"Cannot close DLMM position {pubkey}: missing pool/lb_pair")
        _set_execution_result(trigger, success=False, dry_run=False, error="missing_pool", signatures=[], approval=approval)
        _post_execution_notification(wallet_name, trigger, dry_run=False, success=False, error="missing_pool")
        return False
    
    # === REAL EXECUTION ===
    # Close the DLMM position first. Previous code skipped this and jumped
    # directly to Jupiter, creating a dangerous false-success path.
    try:
        close_result = _run_dlmm_close_command(wallet_name, trigger, config, pool_pubkey)
        if not close_result.get("success"):
            error = close_result.get("error", "dlmm_close_failed")
            logger.error(f"DLMM close failed for {pubkey}: {error}")
            _set_execution_result(
                trigger,
                success=False,
                dry_run=False,
                error=error,
                signatures=close_result.get("signatures", []),
                raw_result=close_result,
                approval=approval,
            )
            _post_execution_notification(wallet_name, trigger, dry_run=False, success=False, error=error)
            return False

        signatures = close_result.get("signatures", [])
        logger.info(f"DLMM close completed for {pubkey}: {signatures}")

        if execution.get("swap_after_close", False):
            logger.warning("swap_after_close is configured but not implemented in automation_engine; DLMM close succeeded, swap skipped")

        _set_execution_result(trigger, success=True, dry_run=False, signatures=signatures, raw_result=close_result, approval=approval)
        _post_execution_notification(wallet_name, trigger, dry_run=False, success=True, signatures=signatures)
        return True
        
    except Exception as e:
        logger.error(f"Execution error: {e}")
        _set_execution_result(trigger, success=False, dry_run=False, error=str(e), signatures=[], approval=approval)
        _post_execution_notification(wallet_name, trigger, dry_run=False, success=False, error=str(e))
        return False


JUPITER_ULTRA_ENDPOINT = os.getenv("JUPITER_ULTRA_ENDPOINT", "https://api.jup.ag/ultra/v1")


def _jupiter_headers() -> Dict[str, str]:
    headers = {"User-Agent": "OpenClaw-Hugh/1.0"}
    api_key = os.getenv("JUPITER_API_KEY")
    if api_key:
        headers["x-api-key"] = api_key
    return headers


def _get_jupiter_quote(input_mint: str, output_mint: str, amount: int) -> Optional[Dict]:
    """Get an unsigned Jupiter Ultra order preview/transaction.

    Kept under the historical helper name for compatibility. This no longer
    calls legacy quote-api v6; with a configured taker it returns an Ultra
    order containing `transaction` and `requestId` for manual signing.
    """
    return _get_jupiter_ultra_order(input_mint, output_mint, amount, 50)


def _get_jupiter_ultra_order(
    input_mint: str,
    output_mint: str,
    amount: int,
    slippage_bps: int,
    user_public_key: Optional[str] = None,
) -> Optional[Dict]:
    """Request a Jupiter Ultra order and fail closed on malformed responses."""
    taker = user_public_key or os.getenv("TRADING_WALLET_PUBLIC_KEY", "")
    if not taker:
        logger.error("No user public key configured for Jupiter Ultra order")
        return None

    params = {
        "inputMint": input_mint,
        "outputMint": output_mint,
        "amount": str(amount),
        "slippageBps": slippage_bps,
        "taker": taker,
    }
    try:
        resp = requests.get(f"{JUPITER_ULTRA_ENDPOINT}/order", params=params, headers=_jupiter_headers(), timeout=15)
        if resp.status_code != 200:
            logger.error(f"Jupiter Ultra order API error: {resp.status_code}")
            return None

        order = resp.json()
        if not isinstance(order, dict):
            logger.error("Jupiter Ultra order response was not an object")
            return None
        if not isinstance(order.get("transaction"), str) or not order.get("transaction", "").strip():
            logger.error("Jupiter Ultra order missing transaction")
            return None
        if not isinstance(order.get("requestId"), str) or not order.get("requestId", "").strip():
            logger.error("Jupiter Ultra order missing requestId")
            return None
        return order
    except Exception as e:
        logger.error(f"Failed to get Jupiter Ultra order: {e}")
        return None


def _get_jupiter_swap_transaction(quote: Dict, input_mint: str, output_mint: str, slippage_bps: int, user_public_key: Optional[str] = None) -> Optional[str]:
    """Return the unsigned Ultra transaction from a validated order.

    `quote` is accepted for backward compatibility. If it is already an Ultra
    order, use it; otherwise request a fresh Ultra order. No legacy v6 swap API
    is used here.
    """
    order = quote if isinstance(quote, dict) and "transaction" in quote else None
    if order is None:
        amount = int((quote or {}).get("inAmount") or (quote or {}).get("amount") or 0)
        if amount <= 0:
            logger.error("Cannot build Jupiter Ultra transaction without input amount")
            return None
        order = _get_jupiter_ultra_order(input_mint, output_mint, amount, slippage_bps, user_public_key)

    if not isinstance(order, dict):
        return None
    transaction = order.get("transaction")
    request_id = order.get("requestId")
    if not isinstance(transaction, str) or not transaction.strip():
        logger.error("Jupiter Ultra order missing transaction")
        return None
    if not isinstance(request_id, str) or not request_id.strip():
        logger.error("Jupiter Ultra order missing requestId")
        return None
    return transaction


def _post_swap_transaction_to_discord(wallet_name: str, trigger: Dict, swap_tx: str, quote: Dict):
    """Post base64 swap transaction to Discord for manual signing."""
    if not DISCORD_WEBHOOK_ALERTS:
        return
    
    pos = trigger["position"]
    pubkey = pos.get("position", "")
    pool_name = pos.get("pool_name", "Unknown")
    pnl_pct = trigger["pnl_pct"]
    
    out_amount = int(quote.get("outAmount", 0)) / 1_000_000  # USDC has 6 decimals
    sterol_id = DISCORD_STEROL_USER_ID or "Sterol"
    
    msg = {
        "content": f"⚠️ **SWAP TRANSACTION READY**\n"
                   f"**Wallet**: {wallet_name}\n"
                   f"**Pool**: {pool_name}\n"
                   f"**Position**: `{pubkey}`\n"
                   f"**Output**: ~{out_amount:.2f} USDC\n"
                   f"**Transaction**: `Base64 encoded - use Solana CLI or Phantom to sign`\n"
                   f"```\n{swap_tx[:200]}...\n```\n"
                   f"<@{sterol_id}> please sign this transaction to complete the take-profit."
    }
    
    _post_to_discord_alerts(msg)


def _post_execution_notification(
    wallet_name: str,
    trigger: Dict,
    dry_run: bool,
    success: bool = True,
    error: Optional[str] = None,
    signatures: Optional[List[str]] = None,
):
    """Post execution notification to Discord."""
    if not DISCORD_WEBHOOK_ALERTS:
        return
    
    pos = trigger["position"]
    pubkey = pos.get("position", "")
    pool_name = pos.get("pool_name", "Unknown")
    pool_pubkey = pos.get("pool") or pos.get("lb_pair", "")
    token_x = pos.get("token_x_symbol", pos.get("mint_x", "?")[:8])
    token_y = pos.get("token_y_symbol", pos.get("mint_y", "?")[:8])
    trigger_type = trigger["trigger_type"]
    pnl_pct = trigger["pnl_pct"]
    entry_val = trigger.get("entry_value", 0)
    current_val = trigger.get("current_value", 0)
    fees_val = trigger.get("fees", 0)
    
    emoji = "🔴" if trigger_type == "stop_loss" else "🟢"
    status = "DRY RUN" if dry_run else ("SUCCESS" if success else "FAILED")
    
    content = (
        f"{emoji} **AUTOMATION {status}**\n"
        f"**Wallet**: {wallet_name}\n"
        f"**Pool**: {pool_name} ({token_x}/{token_y})\n"
        f"**Pool ID**: `{pool_pubkey or 'unavailable'}`\n"
        f"**Position**: `{pubkey}`\n"
        f"**Trigger**: {trigger_type.upper().replace('_', ' ')}\n"
        f"**PnL**: {pnl_pct:+.1f}% (${entry_val:,.2f} → ${current_val:,.2f})\n"
        f"**Fees**: ${fees_val:,.2f}"
    )
    if error:
        content += f"\n**Error**: `{error}`"
    execution_result = trigger.get("_execution_result", {})
    approval = execution_result.get("approval") or {}
    if approval:
        approval_source = approval.get("source", "unknown")
        approval_state = approval.get("state", "unknown")
        approved_by = approval.get("approved_by")
        content += f"\n**Approval**: `{approval_source}` / `{approval_state}`"
        if approved_by and approved_by != "not_required":
            content += f" by `{approved_by}`"
    if not dry_run and not success:
        content += "\n**Tx**: none submitted"
    if signatures:
        content += "\n**Tx**: " + ", ".join(f"`{sig}`" for sig in signatures[:3])

    _post_to_discord_alerts({"content": content})


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
                handle_auto_execute(wallet_name, trigger, config, state)
            elif notification_mode == "alert_owner":
                handle_alert_owner(wallet_name, trigger, config, state)
            else:
                logger.warning(f"Unknown notification_mode: {notification_mode}")
