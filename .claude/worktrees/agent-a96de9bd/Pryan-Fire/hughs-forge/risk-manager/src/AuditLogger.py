import json
import logging
from datetime import datetime
from pathlib import Path

# The Chronicler: Standardized JSONL audit logging.
# Inscribed by Haplo (ola-claw-dev) for the Patryn Trading Pipeline.

class AuditLogger:
    def __init__(self, log_dir: str = "data/logs"):
        self.log_path = Path(log_dir)
        self.log_path.mkdir(parents=True, exist_ok=True)
        self.audit_file = self.log_path / "audit_trail.jsonl"
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("Chronicler")

    def log_event(self, event_type: str, data: dict):
        """
        Inscribes an event into the immutable JSONL audit trail.
        """
        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": event_type,
            "data": data
        }
        
        try:
            with open(self.audit_file, "a") as f:
                f.write(json.dumps(entry) + "\n")
            self.logger.info(f"Audit Inscribed: {event_type}")
        except Exception as e:
            self.logger.error(f"Failed to inscribe audit trail: {e}")

# Example Usage logic for integration
if __name__ == "__main__":
    chronicler = AuditLogger()
    chronicler.log_event("SYSTEM_BOOT", {"status": "operational", "server": "ola-claw-dev"})
