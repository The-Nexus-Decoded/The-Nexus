"""
Meteora DLMM Scanner — polls devnet/mainnet pools and feeds trade signals to orchestrator.

Accepts configuration via environment:
- METEORA_POLL_INTERVAL=30 (seconds)
- METEORA_MIN_LIQUIDITY=5000 (USD)
- METEORA_MIN_VOLUME=5000 (24h USD)
- METEORA_MIN_APY=50.0 (percent)
- METEORA_FEE_TIER_CUTOFF=0.5 (percent)
- METEORA_VOLUME_SPIKE_MULTIPLIER=2.0
- METEORA_VOLUME_SPIKE_WINDOW=300 (seconds)
- METEORA_TRADE_AMOUNT=0.1 (token native units, e.g., SOL)
"""
import os
import asyncio
import json
import logging
import aiohttp
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from collections import defaultdict

logger = logging.getLogger(__name__)

class MeteoraDLMMScanner:
    """
    The Meteora Watcher — detects DLMM pool opportunities on Solana.
    Polls Meteora's GraphQL API, applies filters, and sends signals to the TradeOrchestrator.
    """
    def __init__(self, orchestrator=None, devnet: bool = True):
        """
        Args:
            orchestrator: TradeOrchestrator instance to receive signals (can be None for standalone)
            devnet: if True, query devnet pools; else mainnet
        """
        self.orchestrator = orchestrator
        self.devnet = devnet
        self.running = False
        self.poll_interval = int(os.getenv("METEORA_POLL_INTERVAL", "30"))
        self.min_liquidity_usd = float(os.getenv("METEORA_MIN_LIQUIDITY", "5000"))
        self.min_volume_24h_usd = float(os.getenv("METEORA_MIN_VOLUME", "5000"))
        self.min_apy = float(os.getenv("METEORA_MIN_APY", "50.0"))
        self.fee_tier_cutoff_percent = float(os.getenv("METEORA_FEE_TIER_CUTOFF", "0.5"))
        self.volume_spike_multiplier = float(os.getenv("METEORA_VOLUME_SPIKE_MULTIPLIER", "2.0"))
        self.volume_spike_window_seconds = int(os.getenv("METEORA_VOLUME_SPIKE_WINDOW", "300"))
        # Trade amount in token native units (e.g., SOL). Not USD.
        self.trade_amount = float(os.getenv("METEORA_TRADE_AMOUNT", "0.1"))

        # Meteora public GraphQL endpoint
        self.graphql_url = "https://api.meteora.ag/v1/graphql"
        if devnet:
            self.graphql_url = "https://api.devnet.meteora.ag/v1/graphql"

        # Known DLMM program IDs (same for devnet and mainnet currently)
        self.dlmm_program_id = "DLMMxxGJZRBXixYk9Kf8J38XaJrZtgZ4GdZYrMVPmRX"

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
        Query Meteora GraphQL for active DLMM pools.
        Returns list of pool dicts with keys: address, baseMint, quoteMint, liquidityUsd, volume24h, feeTier, apy
        """
        query = """
        query GetPools($programId: String!) {
          pools(where: {programId: $programId, status: ACTIVE}) {
            address
            baseMint
            quoteMint
            liquidityUsd
            volume24h
            feeTier
            apy
          }
        }
        """
        variables = {"programId": self.dlmm_program_id}
        headers = {"Content-Type": "application/json"}
        payload = {"query": query, "variables": variables}

        session = await self._get_session()
        try:
            async with session.post(self.graphql_url, json=payload, headers=headers) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    logger.error(f"Meteora API HTTP {resp.status}: {text[:200]}")
                    return []
                data = await resp.json()
                if "errors" in data:
                    logger.error(f"Meteora GraphQL errors: {data['errors']}")
                    return []
                pools = data.get("data", {}).get("pools", [])
                self._stats["pools_fetched"] += len(pools)
                logger.info(f"Fetched {len(pools)} DLMM pools from Meteora")
                return pools
        except asyncio.TimeoutError:
            logger.error("Meteora API request timed out")
            self._stats["errors"] += 1
            return []
        except Exception as e:
            logger.error(f"Failed to fetch Meteora pools: {e}", exc_info=True)
            self._stats["errors"] += 1
            return []

    def _cleanup_old_history(self, max_age_seconds: int = 600):
        """Remove history entries older than max_age_seconds to bound memory."""
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=max_age_seconds)
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
        pool_addr = pool["address"]
        current_volume = float(pool.get("volume24h", 0))
        now = datetime.now(timezone.utc)

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
            liquidity = float(pool.get("liquidityUsd", 0))
            volume = float(pool.get("volume24h", 0))
            apy = float(pool.get("apy", 0))
            fee_tier = pool.get("feeTier")
            if fee_tier is None:
                return False
            fee_percent = float(fee_tier) / 100.0  # assuming feeTier is in basis points or percent; Meteora typically returns as percent? Adjust as needed.
        except (ValueError, TypeError) as e:
            logger.warning(f"Failed to parse pool metrics: {e}")
            return False

        if liquidity < self.min_liquidity_usd:
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
                fee_percent = float(pool.get("feeTier", 100)) / 100.0
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
        token_mint = pool["baseMint"]
        # Use configured token amount (native units)
        trade_id = f"meteora-{pool['address'][:8]}"

        return {
            "token_address": token_mint,
            "amount": self.trade_amount,  # token native units (e.g., SOL)
            "trade_id": trade_id,
            "source": "meteora_dlmm",
            "signal_type": signal_type,
            "confidence": confidence,
            "metadata": {
                "pool_address": pool["address"],
                "liquidity_usd": float(pool.get("liquidityUsd", 0)),
                "volume_24h_usd": float(pool.get("volume24h", 0)),
                "apy": float(pool.get("apy", 0)),
                "fee_tier_percent": float(pool.get("feeTier", 0)) / 100.0 if pool.get("feeTier") else None
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

            pool_id = pool["address"]
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
                logger.info(f"New pool detected: {pool.get('baseMint')} (APY: {pool.get('apy')}%, Fee: {pool.get('feeTier')}%)")
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
        logger.info(f"Filters: min_liquidity=${self.min_liquidity_usd}, min_volume_24h=${self.min_volume_24h_usd}, min_apy={self.min_apy}%, fee_tier<={self.fee_tier_cutoff_percent}%")
        
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
def main(orchestrator=None, devnet: bool = True):
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
