"""
Health server for Meteora DLMM Scanner.
Runs on separate port (default 8003) to avoid conflict with orchestrator.
"""

from fastapi import FastAPI, Response
import datetime
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

app = FastAPI()
scanner_instance = None

@app.get("/health")
def health_check():
    """Standard health endpoint."""
    status = {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "service": "MeteoraDLMMScanner"
    }
    if scanner_instance:
        status.update({
            "tracked_pools": len(scanner_instance.tracked_pools),
            "history_loaded": len(scanner_instance.pool_history),
            "last_scan": scanner_instance.last_scan_time.isoformat() if scanner_instance.last_scan_time else None,
            "consecutive_errors": scanner_instance.consecutive_errors
        })
    return status

@app.get("/ready")
def readiness():
    """Kubernetes-style readiness probe."""
    if not scanner_instance:
        return Response(status_code=503, content="Scanner not initialized")
    if scanner_instance.consecutive_errors >= scanner_instance.max_consecutive_errors:
        return Response(status_code=503, content="Too many consecutive errors")
    return {"status": "ready"}

@app.get("/metrics")
def metrics():
    """Expose basic metrics (JSON format for now)."""
    if not scanner_instance:
        return {"error": "Scanner not initialized"}

    m = {
        "tracked_pools_total": len(scanner_instance.tracked_pools),
        "history_pools_total": len(scanner_instance.pool_history),
        "consecutive_errors": scanner_instance.consecutive_errors,
        "last_scan": scanner_instance.last_scan_time.isoformat() if scanner_instance.last_scan_time else None
    }
    return m

@app.get("/pools")
def list_tracked():
    """List currently tracked pools."""
    if not scanner_instance:
        return {"error": "Scanner not initialized"}
    return {"tracked_pools": list(scanner_instance.tracked_pools)}

@app.get("/history/{pool_address}")
def get_pool_history(pool_address: str):
    """Get historical metrics for a specific pool."""
    if not scanner_instance:
        return {"error": "Scanner not initialized"}
    history = scanner_instance.pool_history.get(pool_address, [])
    return {
        "pool_address": pool_address,
        "records": [scanner_instance._metrics_to_dict(m) for m in history]
    }

def set_scanner(scanner):
    """Bind scanner instance to health server."""
    global scanner_instance
    scanner_instance = scanner
    logger.info("Scanner bound to health server")

def start_scanner_health_server(port: int = 8003):
    """Start the health server."""
    import uvicorn
    logger.info(f"Starting scanner health server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
