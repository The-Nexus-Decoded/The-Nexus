import os
import logging
from solders.keypair import Keypair
from pathlib import Path

logger = logging.getLogger(__name__)

class KeyManager:
    """Manages secure loading of trading keys."""
    def __init__(self, key_dir: str = "keys"):
        self.key_dir = Path(key_dir)
        self.key_dir.mkdir(parents=True, exist_ok=True)

    def load_keypair(self, name: str = "trading_wallet.json") -> Keypair:
        """Loads a Keypair from a JSON file or environment variable."""
        # 1. Check Environment Variable (Primary for CI/CD / Prod)
        env_key = os.environ.get("TRADING_WALLET_SECRET")
        if env_key:
            try:
                logger.info(f"Loading keypair from environment variable.")
                return Keypair.from_base58_string(env_key)
            except Exception as e:
                logger.error(f"Failed to load keypair from environment: {e}")

        # 2. Check Local File (Secondary for Dev)
        key_path = self.key_dir / name
        if key_path.exists():
            try:
                logger.info(f"Loading keypair from {key_path}")
                with open(key_path, "r") as f:
                    import json
                    secret = json.load(f)
                    return Keypair.from_bytes(bytes(secret))
            except Exception as e:
                logger.error(f"Failed to load keypair from file {key_path}: {e}")

        logger.warning(f"No keypair found for {name}. Operating in read-only mode.")
        return None
