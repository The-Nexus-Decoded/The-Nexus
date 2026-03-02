from fastapi import FastAPI, HTTPException
import datetime
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Standard version for the fleet
SERVICE_VERSION = "1.0.0"

app = FastAPI()
orchestrator_instance = None

@app.get("/health")
def health_check():
    """Standardized health endpoint for fleet monitoring."""
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "version": SERVICE_VERSION,
        "service": "TradeOrchestrator"
    }

@app.post("/signal")
async def receive_signal(signal: Dict[str, Any]):
    """
    Receives trade signals from external generators (Meteora DLMM, etc.).
    Expected signal format:
    {
        "action": "CLAIM_FEES | REBALANCE_OUT | ENTER_POSITION",
        "pool_address": "string",
        "token_a": "string",
        "token_b": "string",
        "position_value": float,
        "liquidity": float,
        "apy": float,
        "reason": "string",
        "details": "string",
        "timestamp": "ISO8601"
    }
    """
    global orchestrator_instance

    if not orchestrator_instance:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    try:
        # Validate required fields
        required = ["action", "pool_address", "reason"]
        missing = [f for f in required if f not in signal]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing required fields: {missing}")

        # Transform signal into trade_intent for orchestrator
        trade_intent = {
            "source": "meteora_signal",
            "strategy": "DLMM_REBALANCE",
            "pool_address": signal["pool_address"],
            "token_a": signal.get("token_a", ""),
            "token_b": signal.get("token_b", ""),
            "action": signal["action"],
            "position_value": signal.get("position_value", 0),
            "metadata": {
                "reason": signal["reason"],
                "details": signal.get("details", ""),
                "apy": signal.get("apy"),
                "liquidity": signal.get("liquidity"),
                "signal_timestamp": signal.get("timestamp")
            }
        }

        # Send to orchestrator asynchronously
        success = await orchestrator_instance.process_signal(trade_intent)

        if success:
            return {"status": "accepted", "action": signal["action"], "pool": signal["pool_address"]}
        else:
            raise HTTPException(status_code=500, detail="Orchestrator failed to process signal")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

def set_orchestrator(orchestrator):
    """
    Bind the orchestrator instance to the signal server.
    Called by main.py during startup.
    """
    global orchestrator_instance
    orchestrator_instance = orchestrator
    logger.info("Orchestrator bound to signal server")

def start_orchestrator_health_server(port=8002):
    """Starts the health server using uvicorn."""
    import uvicorn
    logger.info(f"Starting Orchestrator health server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
