from fastapi import FastAPI
import datetime
import logging

logger = logging.getLogger(__name__)

# Standard version for the fleet
SERVICE_VERSION = "1.0.0"

app = FastAPI()

@app.get("/health")
def health_check():
    """Standardized health endpoint for fleet monitoring."""
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "version": SERVICE_VERSION,
        "service": "TradeOrchestrator"
    }

def start_orchestrator_health_server(port=8002):
    """Starts the health server using uvicorn."""
    import uvicorn
    logger.info(f"Starting Orchestrator health server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
