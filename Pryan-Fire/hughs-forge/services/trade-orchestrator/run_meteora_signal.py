#!/usr/bin/env python3
"""
Meteora signal generator runner (installed within the orchestrator service).
"""

import sys
import os

# Ensure we can import from the service src
current_dir = os.path.dirname(__file__)
src_dir = os.path.join(current_dir, "src")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

try:
    from signals.meteora_dlmm_signal import main as signal_main
except ImportError as e:
    print(f"Failed to import signal generator: {e}", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    sys.exit(signal_main())
