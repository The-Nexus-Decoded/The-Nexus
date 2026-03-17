# DLMM Close-Path Handoff

## Status
- `AGENTS.md` and `SOUL.md` read.
- Live repo found at `/data/repos/The-Nexus`.
- Repo is on `main` with unrelated dirty changes already present:
  - `Pryan-Fire/zifnabs-scriptorium/scripts/claude-session-pool.sh`
  - `Arianus-Sky/projects/games/soul-drifter-vr/ProjectSettings/`
  - `Arianus-Sky/projects/games/soul-drifter-vr/ProjectVersion.txt`
- Sandbox in this session blocks writes to `/data/repos/The-Nexus`, so this is a handoff patch, not a landed commit.

## Problem
- The SL/TP loop in `Pryan-Fire/hughs-forge/scripts/automation_engine.py` can keep re-triggering on the same DLMM position after close execution begins.
- Current code tracks alert state, but `evaluate_triggers()` does not suppress positions in `executing` or `executed` state.
- `run_automation_checks()` also does not clean stale alert state when a position disappears from the feed after a manual close.
- Result: the same SOL-USDC position can re-enter the alert/close loop.

## Minimal Fix
Patch `/data/repos/The-Nexus/Pryan-Fire/hughs-forge/scripts/automation_engine.py`.

1. Add a cleanup pass before trigger evaluation.
2. Add a close suppression window keyed by position pubkey.
3. Make `auto_execute` write suppression state too.
4. Remove stale alert state once a position disappears from the monitor feed.

Suggested patch:

```diff
diff --git a/Pryan-Fire/hughs-forge/scripts/automation_engine.py b/Pryan-Fire/hughs-forge/scripts/automation_engine.py
--- a/Pryan-Fire/hughs-forge/scripts/automation_engine.py
+++ b/Pryan-Fire/hughs-forge/scripts/automation_engine.py
@@
-from datetime import datetime
+from datetime import datetime
@@
 SOL_MINT = "So11111111111111111111111111111111111111112"
+DEFAULT_CLOSE_COOLDOWN_SECONDS = 1800
+
+
+def _wallet_automation_state(state: Dict, wallet_name: str) -> Dict[str, Any]:
+    return state.setdefault("automation", {}).setdefault(wallet_name, {})
+
+
+def _active_alerts(state: Dict, wallet_name: str) -> Dict[str, Any]:
+    return _wallet_automation_state(state, wallet_name).setdefault("active_alerts", {})
+
+
+def _is_close_suppressed(alert: Dict[str, Any], cooldown_seconds: int) -> bool:
+    escalation_state = alert.get("escalation_state")
+    if escalation_state not in {"executing", "executed", "manual_close"}:
+        return False
+
+    executed_at = alert.get("executed_at")
+    if not executed_at:
+        return True
+
+    try:
+        executed_dt = datetime.fromisoformat(executed_at.rstrip("Z"))
+    except ValueError:
+        return True
+
+    return (datetime.utcnow() - executed_dt).total_seconds() < cooldown_seconds
+
+
+def _cleanup_alert_state(wallet_name: str, positions: List[Dict], wallet_config: Dict, state: Dict) -> None:
+    automation = wallet_config.get("automation", {})
+    cooldown_seconds = automation.get("close_cooldown_seconds", DEFAULT_CLOSE_COOLDOWN_SECONDS)
+    active_alerts = _active_alerts(state, wallet_name)
+    current_pubkeys = {pos.get("position", "") for pos in positions if pos.get("position")}
+
+    for pubkey in list(active_alerts.keys()):
+        alert = active_alerts[pubkey]
+        if pubkey not in current_pubkeys:
+            logger.info(f"[{wallet_name}] Clearing alert state for closed/missing position {pubkey[:12]}...")
+            del active_alerts[pubkey]
+            continue
+
+        if not _is_close_suppressed(alert, cooldown_seconds):
+            continue
+
+        executed_at = alert.get("executed_at")
+        if not executed_at:
+            continue
+
+        executed_dt = datetime.fromisoformat(executed_at.rstrip("Z"))
+        if (datetime.utcnow() - executed_dt).total_seconds() >= cooldown_seconds:
+            logger.info(f"[{wallet_name}] Cooldown expired for {pubkey[:12]}..., re-arming automation")
+            del active_alerts[pubkey]
@@
 def evaluate_triggers(wallet_name: str, positions: List[Dict], wallet_config: Dict, state: Dict) -> List[Dict]:
@@
-    state_wallet = state.get("wallets", {}).get(wallet_name, {})
-    state_positions = state_wallet.get("positions", {})
+    state_wallet = state.get("wallets", {}).get(wallet_name, {})
+    state_positions = state_wallet.get("positions", {})
+    active_alerts = _active_alerts(state, wallet_name)
+    cooldown_seconds = automation.get("close_cooldown_seconds", DEFAULT_CLOSE_COOLDOWN_SECONDS)
@@
         pubkey = pos.get("position", "")
         if not pubkey:
             continue
+
+        alert = active_alerts.get(pubkey)
+        if alert and _is_close_suppressed(alert, cooldown_seconds):
+            logger.info(f"[{wallet_name}] Skipping suppressed position {pubkey[:12]}...")
+            continue
@@
-def handle_auto_execute(wallet_name: str, trigger: Dict, config: Dict) -> bool:
+def handle_auto_execute(wallet_name: str, trigger: Dict, config: Dict, state: Dict) -> bool:
@@
     pos = trigger["position"]
     pubkey = pos.get("position", "")
@@
+    alert = _active_alerts(state, wallet_name).setdefault(pubkey, {
+        "trigger_type": trigger_type,
+        "pool_name": pool_name,
+        "alerts_sent": 0,
+        "first_alert_at": datetime.utcnow().isoformat() + "Z",
+    })
+    alert["escalation_state"] = "executing"
@@
-    return execute_position_close(wallet_name, trigger, config)
+    success = execute_position_close(wallet_name, trigger, config)
+    alert["escalation_state"] = "executed" if success else "failed"
+    alert["executed_at"] = datetime.utcnow().isoformat() + "Z"
+    return success
@@
 def run_automation_checks(wallets_config: Dict, wallets_data: Dict, state: Dict, config: Dict):
@@
         positions = wallet_data.get("positions", [])
+
+        _cleanup_alert_state(wallet_name, positions, wallet_config, state)
@@
         for trigger in triggers:
             if notification_mode == "auto_execute":
-                handle_auto_execute(wallet_name, trigger, config)
+                handle_auto_execute(wallet_name, trigger, config, state)
             elif notification_mode == "alert_owner":
                 handle_alert_owner(wallet_name, trigger, config, state)
```

## Optional Config Addition
Patch `/data/repos/The-Nexus/Pryan-Fire/hughs-forge/config/mainnet/position_monitor_config.json`.

```diff
diff --git a/Pryan-Fire/hughs-forge/config/mainnet/position_monitor_config.json b/Pryan-Fire/hughs-forge/config/mainnet/position_monitor_config.json
--- a/Pryan-Fire/hughs-forge/config/mainnet/position_monitor_config.json
+++ b/Pryan-Fire/hughs-forge/config/mainnet/position_monitor_config.json
@@
       "automation": {
         "enabled": true,
         "stop_loss_pct": 10.0,
         "take_profit_pct": 50.0,
+        "close_cooldown_seconds": 1800,
         "notification_mode": "alert_owner",
@@
       "automation": {
         "enabled": true,
         "stop_loss_pct": 10.0,
         "take_profit_pct": 50.0,
+        "close_cooldown_seconds": 1800,
         "notification_mode": "auto_execute",
```

## Tests To Add
Add `/data/repos/The-Nexus/Pryan-Fire/hughs-forge/tests/test_automation_reentry_guard.py`.

```python
from automation_engine import evaluate_triggers, run_automation_checks


def test_evaluate_triggers_skips_recently_executed_position():
    state = {
        "wallets": {
            "owner": {
                "positions": {
                    "pos-1": {"entry_value_usd": 100.0}
                }
            }
        },
        "automation": {
            "owner": {
                "active_alerts": {
                    "pos-1": {
                        "escalation_state": "executed",
                        "executed_at": "2026-03-14T23:00:00Z"
                    }
                }
            }
        }
    }
    wallet_config = {
        "automation": {
            "enabled": True,
            "stop_loss_pct": 10.0,
            "take_profit_pct": 50.0,
            "close_cooldown_seconds": 1800,
        }
    }
    positions = [{
        "position": "pos-1",
        "liquidity_usd": 60.0,
        "fees_24h": 0.0,
    }]
    assert evaluate_triggers("owner", positions, wallet_config, state) == []


def test_run_automation_checks_clears_alert_when_position_disappears():
    state = {
        "automation": {
            "owner": {
                "active_alerts": {
                    "pos-1": {
                        "escalation_state": "executed",
                        "executed_at": "2026-03-14T23:00:00Z"
                    }
                }
            }
        }
    }
    wallets_config = {
        "owner": {
            "address": "wallet-1",
            "automation": {
                "enabled": True,
                "notification_mode": "alert_owner",
                "close_cooldown_seconds": 1800,
            }
        }
    }
    wallets_data = {
        "owner": {
            "wallet": "wallet-1",
            "positions": [],
        }
    }
    run_automation_checks(wallets_config, wallets_data, state, {"wallets": wallets_config})
    assert state["automation"]["owner"]["active_alerts"] == {}
```

## Apply Sequence In Live Repo
From `/data/repos/The-Nexus`:

```bash
git status --short --branch
git fetch origin
git log --oneline HEAD..origin/main
git switch -c hotfix/dlmm-close-reentry-guard
```

Apply the patch above, then run:

```bash
cd /data/repos/The-Nexus/Pryan-Fire/hughs-forge
pytest tests/test_automation_reentry_guard.py
pytest tests/test_ledger.py
```

## Remaining Live-Ops Gap
- This fix stops the same position from re-entering the automation loop after close execution starts or after the position disappears from the feed.
- It does not implement full DLMM withdrawal on-chain. Current `execute_position_close()` still only generates a Jupiter swap payload and posts it for manual signing.
- If the close button handler lives outside this repo path, it should also mark the same position pubkey as `manual_close` in `state["automation"][wallet]["active_alerts"][pubkey]` with `executed_at` set immediately.
