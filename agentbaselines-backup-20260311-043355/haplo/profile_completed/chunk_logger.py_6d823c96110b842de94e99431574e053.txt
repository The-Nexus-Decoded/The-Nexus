# logger.py - Structured JSON Logger for the Risk Manager
import logging
import json
import sys

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        if hasattr(record, 'extra_info'):
            log_record.update(record.extra_info)
        return json.dumps(log_record)

def get_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        formatter = JsonFormatter()
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger

audit_logger = get_logger("risk_manager_audit")
