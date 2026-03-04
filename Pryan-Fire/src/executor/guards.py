from decimal import Decimal
from typing import Optional

class TradingGuards:
    """
    Enforces Lord Xar's Laws on-chain and off-chain.
    """
    AUTO_TRADE_THRESHOLD = Decimal("250.00")
    
    @staticmethod
    def check_trade_value(usd_amount: Decimal) -> bool:
        """
        LAW 2: The auto-trade threshold remains strictly at $250.
        Returns True if the trade is within safe automated limits.
        """
        if usd_amount > TradingGuards.AUTO_TRADE_THRESHOLD:
            print(f"[GUARD] Trade value ${usd_amount} exceeds auto-limit ${TradingGuards.AUTO_TRADE_THRESHOLD}. Manual approval required.")
            return False
        return True

    @staticmethod
    def verify_live_execution_status(is_authorized: bool):
        """
        LAW 3: Zero Live Capital Execution without explicit authorization.
        This guard must be checked before every transaction signing.
        """
        if not is_authorized:
            raise PermissionError("CRITICAL: Live capital execution is NOT authorized by Lord Xar.")
