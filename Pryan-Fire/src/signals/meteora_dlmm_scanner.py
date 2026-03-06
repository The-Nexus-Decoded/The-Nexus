"""
Meteora DLMM Scanner — polls devnet/mainnet pools and feeds trade signals to orchestrator.

Configuration priority:
1. Environment variables (override)
2. JSON config file (orchestrator_config.json)
3. Hardcoded defaults

Environment:
- METEORA_POLL_INTERVAL=30 (seconds)
- METEORA_MIN_LIQUIDITY=1000 (pool tokens - raw, not USD)
- METEORA_MIN_VOLUME=1000 (24h USD)
- METEORA_MIN_APY=20.0 (percent) - default changed from 10.0
- METEORA_FEE_TIER_CUTOFF=0.5 (percent)
- METEORA_VOLUME_SPIKE_MULTIPLIER=2.0
- METEORA_VOLUME_SPIKE_WINDOW=300 (seconds)
- METEORA_CONFIG_PATH=/path/to/orchestrator_config.json
"""
import os
import asyncio
import json
import logging
import aiohttp
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


def load_scanner_config() -> Dict[str, Any]:
    """
    Load scanner config from JSON file, with env var override.
    Priority: env vars > JSON config > defaults
    """
    # Default config
    config = {
        "enabled": True,
        "min_apy": 20.0,
        "min_liquidity": 5000,
        "min_volume_24h": 1000,
        "fee_tier_cutoff": 0.5,
        "poll_interval_seconds": 30,
        "max_pools": 500,
        "devnet": False,
    }
    
    # Try to load from JSON config
    config_path = os.getenv("METEORA_CONFIG_PATH")
    if not config_path:
        # Default paths to check (relative to common deployment locations)
        default_paths = [
            "/data/openclaw/workspace/The-Nexus/Pryan-Fire/hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
            "/data/openclaw/workspace/Pryan-Fire/hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
            "Pryan-Fire/hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
            "/opt/openclaw/hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
            "./hughs-forge/services/trade-orchestrator/config/orchestrator_config.json",
        ]
        for path in default_paths:
            if os.path.exists(path):
                config_path = path
                break
    
    if config_path and os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                json_config = json.load(f)
                if "meteora_scanner" in json_config:
                    config.update(json_config["meteora_scanner"])
                    logger.info(f"Loaded scanner config from {config_path}")
        except Exception as e:
            logger.warning(f"Failed to load config from {config_path}: {e}")
    
    # Override with env vars if set
    if os.getenv("METEORA_MIN_APY"):
        config["min_apy"] = float(os.getenv("METEORA_MIN_APY"))
    if os.getenv("METEORA_MIN_LIQUIDITY"):
        config["min_liquidity"] = float(os.getenv("METEORA_MIN_LIQUIDITY"))
    if os.getenv("METEORA_MIN_VOLUME"):
        config["min_volume_24h"] = float(os.getenv("METEORA_MIN_VOLUME"))
    if os.getenv("METEORA_FEE_TIER_CUTOFF"):
        config["fee_tier_cutoff"] = float(os.getenv("METEORA_FEE_TIER_CUTOFF"))
    if os.getenv("METEORA_POLL_INTERVAL"):
        config["poll_interval_seconds"] = int(os.getenv("METEORA_POLL_INTERVAL"))
    if os.getenv("METEORA_MAX_POOLS"):
        config["max_pools"] = int(os.getenv("METEORA_MAX_POOLS"))
    if os.getenv("METEORA_DEVNET"):
        config["devnet"] = os.getenv("METEORA_DEVNET").lower() == "true"
    
    return config


class MeteoraDLMMScanner:
    """
    The Meteora Watcher — detects DLMM pool opportunities on Solana.
    Polls Meteora's REST API, applies filters, and sends signals to the TradeOrchestrator.
    """
    def __init__(self, orchestrator=None, devnet: bool = False):
        """
        Args:
            orchestrator: TradeOrchestrator instance to receive signals (can be None for standalone)
            devnet: if True, query devnet pools; else mainnet (can be overridden by config)
        """
        # Load config
        config = load_scanner_config()
        
        # Allow devnet param to override config
        if devnet:
            config["devnet"] = True
        
        self.orchestrator = orchestrator
        self.devnet = config["devnet"]
        self.running = False
        self.poll_interval = config["poll_interval_seconds"]
        self.min_liquidity = config["min_liquidity"]
        self.min_volume_24h_usd = config["min_volume_24h"]
        self.min_apy = config["min_apy"]
        self.fee_tier_cutoff_percent = config["fee_tier_cutoff"]
        self.volume_spike_multiplier = float(os.getenv("METEORA_VOLUME_SPIKE_MULTIPLIER", "2.0"))
        self.volume_spike_window_seconds = int(os.getenv("METEORA_VOLUME_SPIKE_WINDOW", "300"))
        
        logger.info(f"Scanner config: min_apy={self.min_apy}%, min_liquidity={self.min_liquidity}, min_volume={self.min_volume_24h_usd}")

        # Meteora public REST API endpoint (updated from GraphQL)
        # Old (broken): https://api.meteora.ag/v1/graphql
        # New: https://dlmm-api.meteora.ag/pair/all
        # Note: API returns ~136k pools (ignores limit param), we slice in code
        if devnet:
            self.api_url = "https://api.devnet.meteora.ag/pair/all"
        else:
            self.api_url = "https://dlmm-api.meteora.ag/pair/all"

        # Max pools to process per poll (API ignores limit param)
        self.max_pools = int(os.getenv("METEORA_MAX_POOLS", "500"))

        # Headers to handle compression properly
        self.headers = {
            "Accept-Encoding": "gzip, deflate",
            "Accept": "application/json"
        }

        # Known DLMM program IDs (same for devnet and mainnet currently)
        self.dlmm_program_id = "DLMMx4jLqB2HqEi5djXq55Up5EMhYWDDfGqZq3iSpUW"

        # HTTP session (will be created on first use)
        self.session: Optional[aiohttp.ClientSession] = None

        # Pool tracking for spike detection and new pool detection
        self._seen_pools: Dict[str, Dict[str, Any]] = {}  # pool_address -> last record
        self._pool_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)  # pool_address -> list of {timestamp, volume_24h}

        # Statistics
        self._stats = {
            "polls": 0,
            "pools_fetched": 0,
            "signals_sent": 0,
            "errors": 0
        }

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=15)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session

    async def fetch_dlmm_pools(self) -> List[Dict[str, Any]]:
        """
        Query Meteora REST API for active DLMM pools.
        Returns list of pool dicts with keys: address, mint_x, mint_y, liquidity, trade_volume_24h, base_fee_percentage, apy
        
        Uses synchronous requests to avoid aiohttp brotli decompression issues.
        """
        try:
            # Use requests (sync) to avoid aiohttp brotli issues
            resp = requests.get(self.api_url, headers=self.headers, timeout=15)
            if resp.status_code != 200:
                logger.error(f"Meteora API HTTP {resp.status_code}: {resp.text[:200]}")
                return []
            data = resp.json()
            pools = data if isinstance(data, list) else data.get("data", [])
            
            # Filter for DLMM v2 pools only (exclude DAMM v1)
            # v2 pools DON'T have program_id field, v1 pools DO have it
            v2_pools = []
            for pool in pools:
                pool_program_id = pool.get("program_id", "")
                # v2 pools have no program_id field (or it's empty) - these are DLMM v2
                # v1 pools have a program_id field pointing to old DAMM program
                if not pool_program_id:
                    v2_pools.append(pool)
                # Also keep pools that explicitly use the DLMM program
                elif pool_program_id == self.dlmm_program_id:
                    v2_pools.append(pool)
            
            self._stats["v1_filtered"] = len(pools) - len(v2_pools)
            if self._stats.get("v1_filtered", 0) > 0:
                logger.info(f"Filtered out {self._stats['v1_filtered']} v1 pools, keeping {len(v2_pools)} v2 pools")
            
            # Slice to max_pools to avoid processing all 136k
            v2_pools = v2_pools[:self.max_pools]
            self._stats["pools_fetched"] += len(v2_pools)
            logger.info(f"Fetched {len(v2_pools)} DLMM pools from Meteora (capped from {len(data)})")
            return v2_pools
        except requests.Timeout:
            logger.error("Meteora API request timed out")
            self._stats["errors"] += 1
            return []
        except Exception as e:
            logger.error(f"Failed to fetch Meteora pools: {e}", exc_info=True)
            self._stats["errors"] += 1
            return []

    def _cleanup_old_history(self, max_age_seconds: int = 600):
        """Remove history entries older than max_age_seconds to bound memory."""
        cutoff = datetime.utcnow() - timedelta(seconds=max_age_seconds)
        to_remove = []
        for pool_addr, hist in self._pool_history.items():
            # Keep only entries >= cutoff
            new_hist = [entry for entry in hist if entry["timestamp"] >= cutoff]
            if len(new_hist) < len(hist):
                self._pool_history[pool_addr] = new_hist
            if not new_hist and pool_addr not in self._seen_pools:
                to_remove.append(pool_addr)
        for addr in to_remove:
            del self._pool_history[addr]

    def detect_volume_spike(self, pool: Dict[str, Any]) -> bool:
        """Detect if current volume is > volume_spike_multiplier times the average over recent window."""
        pool_addr = pool.get("address", pool.get("pool_address", ""))
        current_volume = float(pool.get("trade_volume_24h", pool.get("volume24h", 0)))
        now = datetime.utcnow()

        # Add current measurement to history
        self._pool_history[pool_addr].append({"timestamp": now, "volume_24h": current_volume})

        # Cleanup old entries periodically
        self._cleanup_old_history(self.volume_spike_window_seconds * 2)

        # Get historical volumes within window (excluding current)
        window_start = now - timedelta(seconds=self.volume_spike_window_seconds)
        recent_volumes = [entry["volume_24h"] for entry in self._pool_history[pool_addr] if entry["timestamp"] >= window_start and entry["timestamp"] < now]

        if len(recent_volumes) < 2:
            return False  # Not enough data to compare

        avg_prev = sum(recent_volumes) / len(recent_volumes)
        if avg_prev <= 0:
            return False

        spike_ratio = current_volume / avg_prev
        logger.debug(f"Volume spike check: current={current_volume}, avg={avg_prev:.2f}, ratio={spike_ratio:.2f}")
        return spike_ratio >= self.volume_spike_multiplier

    def passes_base_filters(self, pool: Dict[str, Any]) -> bool:
        """Apply basic liquidity, volume, APY, fee tier filters."""
        try:
            # Meteora API field names: trade_volume_24h, liquidity (raw), base_fee_percentage, apy
            liquidity = float(pool.get("liquidity", 0))
            volume = float(pool.get("trade_volume_24h", pool.get("volume_24h", 0)))
            apy = float(pool.get("apy", 0))
            fee_percent = float(pool.get("base_fee_percentage", pool.get("feeTier", 0)))
            
            # Skip pools with missing essential data
            if fee_percent is None:
                return False
        except (ValueError, TypeError) as e:
            logger.warning(f"Failed to parse pool metrics: {e}")
            return False

        # Use raw liquidity (pool tokens) with configurable threshold
        # Note: This is NOT USD value - just pool token count
        if liquidity < self.min_liquidity:
            return False
        if volume < self.min_volume_24h_usd:
            return False
        if apy < self.min_apy:
            return False
        if fee_percent > self.fee_tier_cutoff_percent:
            return False

        return True

    def determine_signal_type(self, pool: Dict[str, Any], is_new: bool) -> str:
        """Determine the primary signal type for this pool."""
        if is_new:
            return "new_pool"
        elif self.detect_volume_spike(pool):
            return "volume_spike"
        elif self.passes_base_filters(pool):
            # Additional check: fee arbitrage (low fee)
            try:
                fee_percent = float(pool.get("base_fee_percentage", pool.get("feeTier", 100))) / 100.0
                if fee_percent <= self.fee_tier_cutoff_percent:
                    return "fee_arbitrage"
            except:
                pass
        return "generic_opportunity"

    def calculate_confidence(self, pool: Dict[str, Any], signal_type: str) -> float:
        """Return confidence score 0.0-1.0 based on signal type and pool metrics."""
        confidence_map = {
            "new_pool": 0.9,
            "volume_spike": 0.7,
            "fee_arbitrage": 0.6,
            "generic_opportunity": 0.5
        }
        base = confidence_map.get(signal_type, 0.5)

        # Could add scaling based on liquidity, volume, APY
        # For now, use base confidence
        return min(1.0, base)

    def generate_signal_payload(self, pool: Dict[str, Any], signal_type: str, confidence: float) -> Dict[str, Any]:
        """
        Create a signal payload compatible with TradeOrchestrator.process_signal().
        Expected keys: token_address, amount, trade_id (optional), metadata (optional)
        """
        # Handle both naming conventions
        token_mint = pool.get("mint_x", pool.get("baseMint", ""))
        # Fixed amount for dry-run testing; could be dynamic based on confidence or liquidity
        suggested_amount = 10.0  # USD equivalent
        pool_address = pool.get("address", pool.get("pool_address", ""))
        trade_id = f"meteora-{pool_address[:8]}"

        return {
            "token_address": token_mint,
            "amount": suggested_amount,
            "trade_id": trade_id,
            "source": "meteora_dlmm",
            "signal_type": signal_type,
            "confidence": confidence,
            "metadata": {
                "pool_address": pool_address,
                "liquidity": float(pool.get("liquidity", 0)),
                "volume_24h_usd": float(pool.get("trade_volume_24h", pool.get("volume24h", 0))),
                "apy": float(pool.get("apy", 0)),
                "fee_tier_percent": float(pool.get("base_fee_percentage", pool.get("feeTier", 0))) / 100.0 if pool.get("base_fee_percentage") or pool.get("feeTier") else None
            }
        }

    async def poll_once(self):
        """Single polling cycle: fetch pools, filter, generate and send signals."""
        self._stats["polls"] += 1
        pools = await self.fetch_dlmm_pools()
        if not pools:
            logger.warning("No pools fetched this cycle")
            return

        signals_sent_this_cycle = 0
        for pool in pools:
            # Base filter
            if not self.passes_base_filters(pool):
                continue

            pool_id = pool.get("address", pool.get("pool_address", ""))
            is_new = pool_id not in self._seen_pools

            # Determine signal type and confidence
            signal_type = self.determine_signal_type(pool, is_new)
            confidence = self.calculate_confidence(pool, signal_type)

            # Minimum confidence threshold to avoid noise
            if confidence < 0.6:
                continue

            # Track seen pools
            if is_new:
                self._seen_pools[pool_id] = pool
                logger.info(f"New pool detected: {pool.get('mint_x', pool.get('baseMint', 'unknown'))} (APY: {pool.get('apy', 'N/A')}%, Fee: {pool.get('base_fee_percentage', 'N/A')}%)")
            else:
                self._seen_pools[pool_id] = pool

            # Generate signal
            signal = self.generate_signal_payload(pool, signal_type, confidence)

            logger.info(f"Meteora signal: {signal_type} (conf={confidence:.2f}) token={signal['token_address']} amount=${signal['amount']}")
            
            # Send to orchestrator if available
            if self.orchestrator:
                try:
                    # orchestrator.process_signal expects dict and returns final state
                    final_state = self.orchestrator.process_signal(signal)
                    logger.info(f"Signal delivered to orchestrator, final state: {final_state}")
                    self._stats["signals_sent"] += 1
                    signals_sent_this_cycle += 1
                except Exception as e:
                    logger.error(f"Failed to deliver signal to orchestrator: {e}", exc_info=True)
            else:
                logger.info(f"[Standalone mode] Would enqueue signal: {signal}")

        logger.info(f"Poll cycle complete: {signals_sent_this_cycle} signals sent")

    async def run(self):
        """Main loop: poll continuously with configured interval."""
        self.running = True
        logger.info(f"Meteora DLMM scanner started (devnet={self.devnet}, interval={self.poll_interval}s)")
        logger.info(f"Filters: min_liquidity={self.min_liquidity} tokens, min_volume_24h=${self.min_volume_24h_usd}, min_apy={self.min_apy}%, fee_tier<={self.fee_tier_cutoff_percent}%")
        
        while self.running:
            try:
                await self.poll_once()
            except Exception as e:
                logger.error(f"Polling cycle failed: {e}", exc_info=True)
                self._stats["errors"] += 1
            await asyncio.sleep(self.poll_interval)

    def stop(self):
        self.running = False
        logger.info("Meteora DLMM scanner stopped")
        # Session cleanup happens asynchronously; best effort
        if self.session and not self.session.closed:
            asyncio.create_task(self.session.close())

# Helper for synchronous launch (if running standalone)
def main(orchestrator=None, devnet: bool = False):
    """
    Entry point for running scanner as a standalone process.
    Sets up basic logging and runs the async loop.
    """
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
        datefmt='%H:%M:%S'
    )
    scanner = MeteoraDLMMScanner(orchestrator=orchestrator, devnet=devnet)
    try:
        asyncio.run(scanner.run())
    except KeyboardInterrupt:
        scanner.stop()

if __name__ == "__main__":
    main()
