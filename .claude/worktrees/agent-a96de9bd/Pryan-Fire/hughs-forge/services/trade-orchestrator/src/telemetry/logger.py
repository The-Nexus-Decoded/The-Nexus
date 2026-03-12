import logging
import json
import os
from datetime import datetime

class JsonFormatter(logging.Formatter):
    """
    Format logs as JSON lines for ingestion into ELK/Datadog or simple parsing.
    """
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # We allow arbitrary dictionary payloads passed via extra={"payload": {...}}
        if hasattr(record, 'payload') and isinstance(record.payload, dict):
            log_entry.update(record.payload)
            
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
            
        return json.dumps(log_entry)

def setup_telemetry_logger(name="TradeOrchestrator", log_file="orchestrator.jsonl", level=logging.INFO):
    """
    Configures and returns a logger that outputs JSON-formatted logs to a file and console.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Prevent duplicate handlers if called multiple times
    if logger.hasHandlers():
        logger.handlers.clear()
        
    formatter = JsonFormatter()
    
    # File Handler
    log_dir = os.path.dirname(log_file)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)
        
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger

def get_telemetry_logger(name="TradeOrchestrator"):
    return logging.getLogger(name)
