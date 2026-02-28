import json
import logging
import os
from typing import List

logger = logging.getLogger("WatchlistMonitor")

class WatchlistMonitor:
    """
    The Watcher in the Sky.
    Manages a list of tokens to monitor for market opportunities.
    """
    def __init__(self, config_path: str = "hughs-forge/config/watchlist.json"):
        self.config_path = config_path
        self.watchlist: List[str] = []
        self.load_watchlist()

    def load_watchlist(self):
        """Loads the watchlist from the JSON configuration."""
        if not os.path.exists(self.config_path):
            logger.warning(f"Watchlist config not found at {self.config_path}. Using empty list.")
            self.watchlist = []
            return

        try:
            with open(self.config_path, "r") as f:
                data = json.load(f)
                self.watchlist = data.get("watchlist", [])
                logger.info(f"Watchlist loaded: {len(self.watchlist)} tokens found.")
        except Exception as e:
            logger.error(f"Failed to load watchlist: {e}")
            self.watchlist = []

    def get_tokens(self) -> List[str]:
        """Returns the current list of mint addresses in the watchlist."""
        return self.watchlist
