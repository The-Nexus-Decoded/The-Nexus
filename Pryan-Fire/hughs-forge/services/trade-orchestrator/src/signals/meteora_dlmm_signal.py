"""
Meteora DLMM Signal Generator

Scans Meteora DLMM pools owned by our wallet, evaluates profitability,
and generates rebalance/claim signals when thresholds are met.
"""

import os
import json
import logging
import httpx
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class DLMMPosition:
    """Represents a Meteora DLMM position."""
    pool_address: str
    token_a: str
    token_b: str
    liquidity: float
    fees_collected: float
    fees_uncollected: float
    position_value: float
    bin_lower: int
    bin_upper: int
    fee_tier: float
    apy: float
    volume_24h: float

    @property
    def total_fees(self) -> float:
        return self.fees_collected + self.fees_uncollected

    @property
    def is_profitable(self) -> bool:
        """Simple profitability check."""
        return self.total_fees > 0 and self.apy > 0

class MeteoraSignalGenerator:
    def __init__(
        self,
        wallet_address: str,
        rpc_url: str,
        min_liquidity: float = 1000.0,
        min_volume_24h: float = 10000.0,
        min_fee_tier: float = 0.0,
        min_apy: float = 5.0,
        dry_run: bool = False
    ):
        self.wallet_address = wallet_address
        self.rpc_url = rpc_url
        self.min_liquidity = min_liquidity
        self.min_volume_24h = min_volume_24h
        self.min_fee_tier = min_fee_tier
        self.min_apy = min_apy
        self.dry_run = dry_run
        self.logger = logging.getLogger(__name__)

        # Try Meteora public API first; if unavailable, we'll use direct RPC (future)
        self.meteora_api = "https://dlmm-api.meteora.ag"

    def fetch_positions(self) -> List[DLMMPosition]:
        """Fetch all DLMM positions for the wallet from Meteora."""
        positions = []
        try:
            url = f"{self.meteora_api}/positions"
            params = {"wallet": self.wallet_address}
            response = httpx.get(url, params=params, timeout=10.0)

            if response.status_code == 200:
                data = response.json()
                for pos in data.get("positions", []):
                    position = DLMMPosition(
                        pool_address=pos.get("pool_address", ""),
                        token_a=pos.get("token_a", ""),
                        token_b=pos.get("token_b", ""),
                        liquidity=float(pos.get("liquidity", 0)),
                        fees_collected=float(pos.get("fees_collected", 0)),
                        fees_uncollected=float(pos.get("fees_uncollected", 0)),
                        position_value=float(pos.get("position_value", 0)),
                        bin_lower=int(pos.get("bin_lower", 0)),
                        bin_upper=int(pos.get("bin_upper", 0)),
                        fee_tier=float(pos.get("fee_tier", 0)),
                        apy=float(pos.get("apy", 0)),
                        volume_24h=float(pos.get("volume_24h", 0))
                    )
                    positions.append(position)
            else:
                self.logger.error(f"Failed to fetch positions: {response.status_code}")
        except Exception as e:
            self.logger.error(f"Error fetching Meteora positions: {e}", exc_info=True)

        return positions

    def evaluate_position(self, position: DLMMPosition) -> Optional[Dict[str, Any]]:
        """
        Evaluate a position against thresholds.
        Returns a signal dict if action is needed, None if position is fine.
        """
        signal = None

        if position.liquidity < self.min_liquidity:
            signal = {
                "action": "REBALANCE_OUT",
                "reason": "low_liquidity",
                "details": f"Liquidity {position.liquidity} below threshold {self.min_liquidity}"
            }
        elif position.volume_24h < self.min_volume_24h:
            signal = {
                "action": "REBALANCE_OUT",
                "reason": "low_volume",
                "details": f"24h volume {position.volume_24h} below threshold {self.min_volume_24h}"
            }
        elif position.fee_tier < self.min_fee_tier:
            signal = {
                "action": "REBALANCE_OUT",
                "reason": "low_fee_tier",
                "details": f"Fee tier {position.fee_tier} below threshold {self.min_fee_tier}"
            }
        elif position.apy < self.min_apy:
            signal = {
                "action": "REBALANCE_OUT",
                "reason": "low_apy",
                "details": f"APY {position.apy}% below threshold {self.min_apy}%"
            }
        elif position.is_profitable:
            if position.fees_uncollected > (position.position_value * 0.01):
                signal = {
                    "action": "CLAIM_FEES",
                    "reason": "high_uncollected_fees",
                    "details": f"Uncollected fees: {position.fees_uncollected} ({(position.fees_uncollected/position.position_value)*100:.1f}% of position)"
                }

        if signal:
            signal["pool_address"] = position.pool_address
            signal["token_a"] = position.token_a
            signal["token_b"] = position.token_b
            signal["position_value"] = position.position_value
            signal["liquidity"] = position.liquidity
            signal["apy"] = position.apy
            signal["timestamp"] = datetime.utcnow().isoformat() + "Z"

        return signal

    def generate_signals(self) -> List[Dict[str, Any]]:
        """
        Main entry point: fetch positions, evaluate, return list of signals.
        """
        self.logger.info("Generating Meteora DLMM signals...")
        positions = self.fetch_positions()
        signals = []

        for position in positions:
            signal = self.evaluate_position(position)
            if signal:
                signals.append(signal)
                self.logger.info(f"Signal generated: {signal['action']} for pool {position.pool_address} - {signal['reason']}")

        self.logger.info(f"Generated {len(signals)} signals from {len(positions)} positions")
        return signals

    def send_signal_to_orchestrator(self, signal: Dict[str, Any], orchestrator_url: str = "http://localhost:8002") -> bool:
        """POST signal to orchestrator's /signal endpoint."""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Would send signal to {orchestrator_url}: {json.dumps(signal, indent=2)}")
            return True

        try:
            response = httpx.post(
                f"{orchestrator_url}/signal",
                json=signal,
                timeout=10.0
            )
            if response.status_code == 200:
                self.logger.info(f"Signal sent successfully: {signal['action']}")
                return True
            else:
                self.logger.error(f"Failed to send signal: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.logger.error(f"Error sending signal to orchestrator: {e}", exc_info=True)
            return False

def main():
    """Standalone runner for the signal generator."""
    logging.basicConfig(level=logging.INFO)

    wallet_address = os.getenv("TRADING_WALLET_PUBLIC_KEY")
    rpc_url = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
    orchestrator_url = os.getenv("ORCHESTRATOR_URL", "http://localhost:8002")
    dry_run = os.getenv("DRY_RUN", "false").lower() == "true"

    min_liquidity = float(os.getenv("MIN_LIQUIDITY", "1000"))
    min_volume_24h = float(os.getenv("MIN_VOLUME_24H", "10000"))
    min_fee_tier = float(os.getenv("MIN_FEE_TIER", "0"))
    min_apy = float(os.getenv("MIN_APY", "5"))

    if not wallet_address:
        logger.error("TRADING_WALLET_PUBLIC_KEY environment variable is required")
        return 1

    generator = MeteoraSignalGenerator(
        wallet_address=wallet_address,
        rpc_url=rpc_url,
        min_liquidity=min_liquidity,
        min_volume_24h=min_volume_24h,
        min_fee_tier=min_fee_tier,
        min_apy=min_apy,
        dry_run=dry_run
    )

    signals = generator.generate_signals()

    for signal in signals:
        generator.send_signal_to_orchestrator(signal, orchestrator_url)

    return 0

if __name__ == "__main__":
    exit(main())
