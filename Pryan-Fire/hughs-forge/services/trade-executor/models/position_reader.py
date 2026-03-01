from typing import Dict, Any, List
import logging
import datetime
import json
from solders.pubkey import Pubkey

logger = logging.getLogger(__name__)

class PositionReader:
    """
    Issue #11: Meteora LP Position Reader + Balances.
    Provides deep visibility into DLMM/Dynamic positions and integrates with telemetry.
    """
    def __init__(self, executor):
        self.executor = executor # Reference to TradeExecutor

    async def get_detailed_positions(self, owner_pubkey: Pubkey) -> List[Dict[str, Any]]:
        """
        Fetches all LP positions for an owner and enriches them with current market state,
        profitability metrics, and balance snapshots.
        """
        logger.info(f"--- [POSITION READER] Auditing positions for {owner_pubkey} ---")
        
        # 1. Fetch raw positions using the executor's scryer
        raw_positions = await self.executor.get_meteora_lp_positions(owner_pubkey)
        enriched_positions = []

        for pos in raw_positions:
            # 2. Enrich with P&L (using pool price as current price for unrealized estimate)
            pnl = await self.executor.calculate_unrealized_pnl(pos, pos.get('poolPrice', 0.0))
            
            # 3. Snapshot structure
            snapshot = {
                "position_pubkey": str(pos['pubkey']),
                "pool_pubkey": str(pos['pool']),
                "range": {
                    "lower_bin": pos['lowerBinId'],
                    "upper_bin": pos['upperBinId'],
                    "active_bin": pos['activeId'],
                    "is_in_range": pos['lowerBinId'] <= pos['activeId'] <= pos['upperBinId'] if pos['activeId'] is not None else False
                },
                "balances": {
                    "token_x": {
                        "mint": str(pos['tokenXMint']),
                        "wallet_balance": pos['ownerTokenXBalance'],
                        "earned_fees": pos['totalFeeX']
                    },
                    "token_y": {
                        "mint": str(pos['tokenYMint']),
                        "wallet_balance": pos['ownerTokenYBalance'],
                        "earned_fees": pos['totalFeeY']
                    }
                },
                "valuation": {
                    "liquidity": pos['liquidity'],
                    "pool_price": pos['poolPrice'],
                    "unrealized_pnl": pnl['unrealized_pnl'],
                    "total_value": pnl['total_value']
                },
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
            }
            
            # 4. Telemetry Linkage
            self._log_telemetry_snapshot(snapshot)
            enriched_positions.append(snapshot)
            
            logger.info(f"    -> Audited {snapshot['position_pubkey']} | InRange: {snapshot['range']['is_in_range']} | PnL: {snapshot['valuation']['unrealized_pnl']:.4f}")

        return enriched_positions

    def _log_telemetry_snapshot(self, snapshot: Dict[str, Any]):
        """Integrates snapshot data with the central telemetry pipeline."""
        # Use the executor's telemetry logger if available
        if hasattr(self.executor, 'log_telemetry'):
            self.executor.log_telemetry("POSITION_AUDIT_SNAPSHOT", snapshot)
        else:
            # Fallback to direct logging if executor structure differs
            telemetry_logger = logging.getLogger("telemetry")
            telemetry_logger.info(json.dumps({
                "timestamp": snapshot['timestamp'],
                "event_type": "POSITION_AUDIT_SNAPSHOT",
                "data": snapshot
            }))
