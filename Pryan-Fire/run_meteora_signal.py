#!/usr/bin/env python3
"""
Standalone runner for Meteora DLMM signal generator.
Invokes the signal generator which then POSTs to the orchestrator.
"""

import sys
import os

# Add service src to path for imports
SERVICE_SRC = os.path.join(os.path.dirname(__file__), "services", "trade-orchestrator", "src")
if SERVICE_SRC not in sys.path:
    sys.path.insert(0, SERVICE_SRC)

try:
    from signals.meteora_dlmm_signal import main as signal_main
except ImportError as e:
    print(f"Failed to import MeteoraSignalGenerator: {e}", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    sys.exit(signal_main())
