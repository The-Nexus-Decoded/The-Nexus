"""
Meteora DLMM Signal Scanner

Scans Meteora DLMM pools for trading opportunities:
- Volume spike detection (pools with sudden volume increase)
- New pool detection (recently created pools)

Designed for devnet deployment with simple tracked pool list.
"""

import os
import json
import yaml
import logging
import httpx
import time
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class PoolMetrics:
    """Metrics for a Meteora DLMM pool."""
    pool_address: str
    token_a: str
    token_b: str
    liquidity: float
    volume_24h: float
    fee_tier: float
    apy: float
    created_at: Optional[datetime] = None
    token_a_symbol: str = ""
    token_b_symbol: str = ""

@dataclass
class ScanConfig:
    """Configuration for scanner."""
    # Network
    rpc_url: str = "https://api.devnet.solana.com"
    meteora_api: str = "https://dlmm-api.meteora.ag"

    # Scanning parameters
    scan_interval_seconds: int = 300  # 5 minutes
    volume_spike_threshold: float = 2.0  # 2x increase from baseline
    new_pool_age_hours: int = 1  # pools created in last hour
    min_liquidity: float = 100.0
    min_volume_24h: float = 1000.0

    # Tracking
    tracked_pools_file: str = "tracked_pools.json"
    history_file: str = "pool_history.json"
    max_history_records: int = 1000

    # Health server
    health_port: int = 8003

    # Rate limiting & recovery
    max_retries: int = 3
    retry_delay_seconds: float = 1.0

class MeteoraDLMMScanner:
    def __init__(self, config: ScanConfig, dry_run: bool = False):
        self.config = config
        self.dry_run = dry_run
        self.logger = logging.getLogger(__name__)

        # State: tracked pools and historical metrics
        self.tracked_pools: Set[str] = set()
        self.pool_history: Dict[str, List[PoolMetrics]] = {}
        self.last_scan_time: Optional[datetime] = None

        # Error tracking
        self.consecutive_errors: int = 0
        self.max_consecutive_errors: int = 5

        # Load state from files if they exist
        self._load_state()

    def _load_state(self):
        """Load tracked pools and history from disk."""
        try:
            if os.path.exists(self.config.tracked_pools_file):
                with open(self.config.tracked_pools_file, 'r') as f:
                    data = json.load(f)
                    self.tracked_pools = set(data.get("pools", []))
                self.logger.info(f"Loaded {len(self.tracked_pools)} tracked pools from {self.config.tracked_pools_file}")
        except Exception as e:
            self.logger.warning(f"Failed to load tracked pools: {e}")

        try:
            if os.path.exists(self.config.history_file):
                with open(self.config.history_file, 'r') as f:
                    data = json.load(f)
                    for pool_addr, records in data.items():
                        self.pool_history[pool_addr] = [
                            self._dict_to_metrics(r) for r in records
                        ]
                self.logger.info(f"Loaded history for {len(self.pool_history)} pools")
        except Exception as e:
            self.logger.warning(f"Failed to load pool history: {e}")

    def _save_tracked_pools(self):
        """Persist tracked pools list."""
        try:
            with open(self.config.tracked_pools_file, 'w') as f:
                json.dump({"pools": list(self.tracked_pools)}, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save tracked pools: {e}")

    def _save_history(self):
        """Persist pool history with rotation."""
        try:
            # Rotate: keep only last N records per pool
            truncated = {}
            for pool_addr, records in self.pool_history.items():
                if len(records) > self.config.max_history_records:
                    truncated[pool_addr] = records[-self.config.max_history_records:]
                else:
                    truncated[pool_addr] = records

            with open(self.config.history_file, 'w') as f:
                # Convert metrics to dict for JSON
                serializable = {
                    addr: [self._metrics_to_dict(m) for m in records]
                    for addr, records in truncated.items()
                }
                json.dump(serializable, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save pool history: {e}")

    def _metrics_to_dict(self, m: PoolMetrics) -> Dict[str, Any]:
        """Convert PoolMetrics to JSON-serializable dict."""
        return {
            "pool_address": m.pool_address,
            "token_a": m.token_a,
            "token_b": m.token_b,
            "liquidity": m.liquidity,
            "volume_24h": m.volume_24h,
            "fee_tier": m.fee_tier,
            "apy": m.apy,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "token_a_symbol": m.token_a_symbol,
            "token_b_symbol": m.token_b_symbol
        }

    def _dict_to_metrics(self, d: Dict[str, Any]) -> PoolMetrics:
        """Convert dict to PoolMetrics."""
        created_at = None
        if d.get("created_at"):
            try:
                created_at = datetime.fromisoformat(d["created_at"])
            except:
                pass
        return PoolMetrics(
            pool_address=d["pool_address"],
            token_a=d.get("token_a", ""),
            token_b=d.get("token_b", ""),
            liquidity=float(d.get("liquidity", 0)),
            volume_24h=float(d.get("volume_24h", 0)),
            fee_tier=float(d.get("fee_tier", 0)),
            apy=float(d.get("apy", 0)),
            created_at=created_at,
            token_a_symbol=d.get("token_a_symbol", ""),
            token_b_symbol=d.get("token_b_symbol", "")
        )

    def _fetch_all_pools(self) -> List[PoolMetrics]:
        """Fetch all DLMM pools from Meteora API."""
        pools = []
        try:
            url = f"{self.config.meteora_api}/pools"
            response = httpx.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                for pool in data.get("pools", []):
                    metrics = PoolMetrics(
                        pool_address=pool.get("pool_address", ""),
                        token_a=pool.get("token_a", ""),
                        token_b=pool.get("token_b", ""),
                        liquidity=float(pool.get("liquidity", 0)),
                        volume_24h=float(pool.get("volume_24h", 0)),
                        fee_tier=float(pool.get("fee_tier", 0)),
                        apy=float(pool.get("apy", 0)),
                        created_at=self._parse_timestamp(pool.get("created_at")),
                        token_a_symbol=pool.get("token_a_symbol", ""),
                        token_b_symbol=pool.get("token_b_symbol", "")
                    )
                    pools.append(metrics)
            else:
                self.logger.error(f"Failed to fetch pools: {response.status_code}")
        except httpx.HTTPError as e:
            self.logger.error(f"HTTP error fetching pools: {e}")
        except Exception as e:
            self.logger.error(f"Error fetching pools: {e}", exc_info=True)
        return pools

    def _parse_timestamp(self, ts: Any) -> Optional[datetime]:
        """Parse ISO8601 or unix timestamp."""
        if not ts:
            return None
        try:
            if isinstance(ts, (int, float)):
                return datetime.fromtimestamp(ts)
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except:
            return None

    def _detect_volume_spikes(self, current_pools: List[PoolMetrics]) -> List[Dict[str, Any]]:
        """Detect pools with volume spikes compared to historical average."""
        signals = []
        for pool in current_pools:
            if pool.pool_address in self.pool_history:
                history = self.pool_history[pool.pool_address]
                if len(history) >= 2:
                    # Compute average volume over last N records (excluding current to avoid self-comparison)
                    recent_volumes = [h.volume_24h for h in history[-10:]]
                    avg_volume = sum(recent_volumes) / len(recent_volumes) if recent_volumes else 0
                    if avg_volume > 0 and pool.volume_24h > avg_volume * self.config.volume_spike_threshold:
                        signal = {
                            "action": "ALERT_VOLUME_SPIKE",
                            "pool_address": pool.pool_address,
                            "token_a": pool.token_a,
                            "token_b": pool.token_b,
                            "current_volume": pool.volume_24h,
                            "average_volume": avg_volume,
                            "spike_factor": pool.volume_24h / avg_volume,
                            "liquidity": pool.liquidity,
                            "apy": pool.apy,
                            "reason": "volume_spike",
                            "details": f"Volume {pool.volume_24h:.2f} is {pool.volume_24h/avg_volume:.1f}x historical average ({avg_volume:.2f})",
                            "timestamp": datetime.utcnow().isoformat() + "Z"
                        }
                        signals.append(signal)
                        self.logger.info(f"Volume spike detected: {pool.pool_address} - {signal['spike_factor']:.1f}x")
        return signals

    def _detect_new_pools(self, current_pools: List[PoolMetrics]) -> List[Dict[str, Any]]:
        """Detect newly created pools."""
        signals = []
        cutoff = datetime.utcnow() - timedelta(hours=self.config.new_pool_age_hours)
        for pool in current_pools:
            if pool.created_at and pool.created_at > cutoff:
                # New pool not yet tracked
                if pool.pool_address not in self.tracked_pools:
                    signal = {
                        "action": "ALERT_NEW_POOL",
                        "pool_address": pool.pool_address,
                        "token_a": pool.token_a,
                        "token_b": pool.token_b,
                        "liquidity": pool.liquidity,
                        "volume_24h": pool.volume_24h,
                        "fee_tier": pool.fee_tier,
                        "apy": pool.apy,
                        "created_at": pool.created_at.isoformat() if pool.created_at else None,
                        "reason": "new_pool",
                        "details": f"New pool created: {pool.token_a_symbol}/{pool.token_b_symbol}",
                        "timestamp": datetime.utcnow().isoformat() + "Z"
                    }
                    signals.append(signal)
                    self.logger.info(f"New pool detected: {pool.pool_address}")
                    self.tracked_pools.add(pool.pool_address)
        return signals

    def scan(self) -> List[Dict[str, Any]]:
        """
        Perform one scan cycle.
        Returns list of signals (volume spikes, new pools).
        """
        self.logger.info("Starting DLMM scan cycle...")
        signals = []

        try:
            current_pools = self._fetch_all_pools()
            self.logger.info(f"Fetched {len(current_pools)} pools from Meteora")

            # Update history with current metrics
            now = datetime.utcnow()
            for pool in current_pools:
                if pool.pool_address not in self.pool_history:
                    self.pool_history[pool.pool_address] = []
                self.pool_history[pool.pool_address].append(pool)

            # Detect volume spikes
            spike_signals = self._detect_volume_spikes(current_pools)
            signals.extend(spike_signals)

            # Detect new pools
            new_signals = self._detect_new_pools(current_pools)
            signals.extend(new_signals)

            # Save state
            self._save_history()
            self._save_tracked_pools()

            self.last_scan_time = now
            self.consecutive_errors = 0  # reset on success

        except Exception as e:
            self.consecutive_errors += 1
            self.logger.error(f"Scan failed (error {self.consecutive_errors}/{self.max_consecutive_errors}): {e}", exc_info=True)
            if self.consecutive_errors >= self.max_consecutive_errors:
                self.logger.critical("Max consecutive errors reached. Pausing scans until recovery.")

        self.logger.info(f"Scan complete. Generated {len(signals)} signals.")
        return signals

    def run_loop(self, orchestrator_url: str = "http://localhost:8002"):
        """Run continuous scanning loop."""
        self.logger.info("Starting Meteora DLMM scanner loop...")
        while True:
            try:
                if self.consecutive_errors >= self.max_consecutive_errors:
                    self.logger.warning("Paused due to excessive errors. Waiting for manual intervene or recovery...")
                    time.sleep(self.config.scan_interval_seconds * 2)
                    continue

                signals = self.scan()

                for signal in signals:
                    self._send_signal(signal, orchestrator_url)

                time.sleep(self.config.scan_interval_seconds)
            except KeyboardInterrupt:
                self.logger.info("Scanner stopped by user")
                break
            except Exception as e:
                self.logger.error(f"Unexpected error in loop: {e}", exc_info=True)
                time.sleep(self.config.scan_interval_seconds)

    def _send_signal(self, signal: Dict[str, Any], orchestrator_url: str):
        """Send signal to orchestrator."""
        if self.dry_run:
            self.logger.info(f"[DRY RUN] Signal: {json.dumps(signal, indent=2)}")
            return

        try:
            response = httpx.post(
                f"{orchestrator_url}/signal",
                json=signal,
                timeout=10.0
            )
            if response.status_code == 200:
                self.logger.info(f"Signal sent: {signal['action']} for {signal['pool_address']}")
            else:
                self.logger.error(f"Failed to send signal: {response.status_code} - {response.text}")
        except Exception as e:
            self.logger.error(f"Error sending signal: {e}", exc_info=True)

def load_config_from_file(path: str) -> ScanConfig:
    """Load configuration from YAML or JSON file."""
    with open(path, 'r') as f:
        if path.endswith(('.yaml', '.yml')):
            data = yaml.safe_load(f)
        else:
            data = json.load(f)
    return ScanConfig(**data)

def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Meteora DLMM Signal Scanner")
    parser.add_argument('--config', type=str, help="Path to config file (YAML or JSON)")
    parser.add_argument('--dry-run', action='store_true', help="Don't send signals, just log")
    parser.add_argument('--orchestrator-url', type=str, default="http://localhost:8002", help="Orchestrator /signal endpoint")
    parser.add_argument('--once', action='store_true', help="Run one scan and exit")
    args = parser.parse_args()

    # Determine config source
    if args.config:
        config = load_config_from_file(args.config)
    else:
        # Use environment variables with defaults
        config = ScanConfig(
            rpc_url=os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
            meteora_api=os.getenv("METEORA_API", "https://dlmm-api.meteora.ag"),
            scan_interval_seconds=int(os.getenv("SCAN_INTERVAL_SECONDS", "300")),
            volume_spike_threshold=float(os.getenv("VOLUME_SPIKE_THRESHOLD", "2.0")),
            new_pool_age_hours=int(os.getenv("NEW_POOL_AGE_HOURS", "1")),
            min_liquidity=float(os.getenv("MIN_LIQUIDITY", "100.0")),
            min_volume_24h=float(os.getenv("MIN_VOLUME_24H", "1000.0")),
            orchestrator_url=args.orchestrator_url
        )
        # Override health port if env set
        if os.getenv("HEALTH_PORT"):
            config.health_port = int(os.getenv("HEALTH_PORT"))

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    scanner = MeteoraDLMMScanner(config, dry_run=args.dry_run)

    if args.once:
        signals = scanner.scan()
        for sig in signals:
            scanner._send_signal(sig, config.orchestrator_url)
        return 0

    scanner.run_loop(orchestrator_url=config.orchestrator_url)
    return 0

if __name__ == "__main__":
    exit(main())
