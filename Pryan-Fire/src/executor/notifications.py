from typing import Dict, Any, Optional
from decimal import Decimal

# Note: In OpenClaw, direct tool calls like 'message' are handled 
# by the agent during its turn. This module will format the 
# data and provide the strings for the agent to send.

class TradeNotifier:
    """
    Formats trade alerts for the Nexus/Lord Xar.
    """
    
    @staticmethod
    def format_auth_request(trade_data: Dict[str, Any]) -> str:
        """
        Formats a manual authorization request for Discord.
        """
        meteora = trade_data.get("meteora", {})
        usd_value = trade_data.get("usd_value", Decimal("0"))
        
        # Determine pair name from mints (simplified for now)
        input_mint = meteora.get("input_mint", "Unknown")
        output_mint = meteora.get("output_mint", "Unknown")
        
        # Shorten mints for readability
        pair = f"{input_mint[:4]}... -> {output_mint[:4]}..."
        if "description" in meteora:
            pair = meteora["description"]

        msg = (
            "⚠️ **TRADE AUTHORIZATION REQUIRED** ⚠️\n"
            f"**Pair:** `{pair}`\n"
            f"**Value:** `${usd_value:,.2f} USD`\n"
            "**Status:** `PAUSED` (Exceeds $250 limit)\n\n"
            "Respond with `APPROVE <id>` to execute (Law 3 still applies)."
        )
        return msg

    @staticmethod
    def format_kill_switch_alert(reason: str) -> str:
        """
        Formats a critical kill-switch alert.
        """
        return f"🚨 **CRITICAL: KILL-SWITCH TRIGGERED** 🚨\n**Reason:** `{reason}`\n**Action:** All trading halted immediately."
