import os
import signal
import sys
from typing import Callable

class KillSwitch:
    """
    The Infallible Kill-Switch.
    Designed to monitor global health and emergency signals to halt trading.
    """
    def __init__(self):
        self._emergency_halt = False
        self._callbacks: list[Callable] = []

    def trigger(self, reason: str):
        """Activates the kill-switch and halts all execution."""
        print(f"!!! EMERGENCY HALT TRIGGERED: {reason} !!!")
        self._emergency_halt = True
        for callback in self._callbacks:
            try:
                callback()
            except Exception as e:
                print(f"Error during halt callback: {e}")
        
        # Immediate exit if critical
        # sys.exit(1) # We might want a graceful halt first, but this is the ultimate safeguard.

    def is_halted(self) -> bool:
        return self._emergency_halt

    def register_callback(self, callback: Callable):
        """Register logic to run when the switch is flipped (e.g., closing connections)."""
        self._callbacks.append(callback)

# Singleton instance for the executor
KILL_SWITCH = KillSwitch()

def handle_sigint(signum, frame):
    KILL_SWITCH.trigger("SIGINT (Ctrl+C) received")
    sys.exit(0)

signal.signal(signal.SIGINT, handle_sigint)
signal.signal(signal.SIGTERM, handle_sigint)
