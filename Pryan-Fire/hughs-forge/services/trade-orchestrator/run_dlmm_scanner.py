#!/usr/bin/env python3
"""
Meteora DLMM Signal Scanner (installed within orchestrator service).
"""

import sys
import os

# Ensure we can import from service src
current_dir = os.path.dirname(__file__)
src_dir = os.path.join(current_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

try:
    from signals.meteora_dlmm_scanner import MeteoraDLMMScanner, ScanConfig, load_config_from_file
    from signals.scanner_health_server import set_scanner, start_scanner_health_server
except ImportError as e:
    print(f"Failed to import scanner: {e}", file=sys.stderr)
    sys.exit(1)

def main():
    import argparse

    parser = argparse.ArgumentParser(description="Meteora DLMM Signal Scanner")
    parser.add_argument('--config', type=str, help="Path to config file (YAML or JSON)")
    parser.add_argument('--dry-run', action='store_true', help="Don't send signals, just log")
    parser.add_argument('--orchestrator-url', type=str, default=os.getenv("ORCHESTRATOR_URL", "http://localhost:8002"), help="Orchestrator /signal endpoint")
    parser.add_argument('--once', action='store_true', help="Run one scan and exit")
    parser.add_argument('--health-port', type=int, default=int(os.getenv("SCANNER_HEALTH_PORT", "8003")), help="Health endpoint port")
    args = parser.parse_args()

    if args.config:
        config = load_config_from_file(args.config)
        config.health_port = args.health_port
    else:
        config = ScanConfig(
            rpc_url=os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
            meteora_api=os.getenv("METEORA_API", "https://dlmm-api.meteora.ag"),
            scan_interval_seconds=int(os.getenv("SCAN_INTERVAL_SECONDS", "300")),
            volume_spike_threshold=float(os.getenv("VOLUME_SPIKE_THRESHOLD", "2.0")),
            new_pool_age_hours=int(os.getenv("NEW_POOL_AGE_HOURS", "1")),
            min_liquidity=float(os.getenv("MIN_LIQUIDITY", "100.0")),
            min_volume_24h=float(os.getenv("MIN_VOLUME_24H", "1000.0")),
            orchestrator_url=args.orchestrator_url,
            health_port=args.health_port
        )

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    scanner = MeteoraDLMMScanner(config, dry_run=args.dry_run)
    set_scanner(scanner)

    import threading
    health_thread = threading.Thread(
        target=start_scanner_health_server,
        args=(config.health_port,),
        daemon=True,
        name="Scanner-Health"
    )
    health_thread.start()
    time.sleep(1)

    logging.info(f"Meteora DLMM Scanner started. Health: http://0.0.0.0:{config.health_port}/health")
    logging.info(f"Orchestrator: {config.orchestrator_url}")

    if args.once:
        signals = scanner.scan()
        for sig in signals:
            scanner._send_signal(sig, config.orchestrator_url)
        return 0

    scanner.run_loop(orchestrator_url=config.orchestrator_url)
    return 0

if __name__ == "__main__":
    import time
    sys.exit(main())
