import os
import signal
import logging
from typing import Callable, List

logger = logging.getLogger("ShutdownManager")

class ShutdownManager:
    """
    The Global Kill-Switch of the Patryn Trader (Phase 7).
    Ensures safe, atomic shutdown of all trading loops and connections.
    """
    def __init__(self):
        self._shutdown_callbacks: List[Callable] = []
        self.is_active = True
        
        # Bind system signals (SIGINT, SIGTERM)
        signal.signal(signal.SIGINT, self._handle_signal)
        signal.signal(signal.SIGTERM, self._handle_signal)

    def register_callback(self, callback: Callable):
        """Registers a service (e.g., WebSocket, DB, Executor) to be shut down safely."""
        self._shutdown_callbacks.append(callback)

    def _handle_signal(self, signum, frame):
        """Internal handler for OS-level kill signals."""
        logger.warning(f"Kill-Switch Triggered (Signal: {signum}). Commencing emergency shutdown...")
        self.initiate_shutdown()

    def initiate_shutdown(self):
        """The Master Kill-Switch: Executes all registered cleanup runes."""
        if not self.is_active:
            return
            
        self.is_active = False
        logger.info("Deactivating all Patryn trading runes...")
        
        # Execute all cleanup callbacks (Close DBs, stop WebSockets, etc.)
        for callback in self._shutdown_callbacks:
            try:
                # Assuming callbacks are non-async for simplicity in the signal handler,
                # or we can push them to an event loop if needed.
                callback()
            except Exception as e:
                logger.error(f"Cleanup rune failed: {e}")

        logger.info("Global Kill-Switch Complete. All systems dormant.")
        # Atomic exit
        os._exit(0)

# Global Instance
kill_switch = ShutdownManager()
