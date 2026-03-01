import argparse
import sys
import threading
import time
from core.orchestrator import TradeOrchestrator
from core.event_loop import EventLoop
from telemetry.logger import setup_telemetry_logger
from health_server import start_orchestrator_health_server

def main():
    parser = argparse.ArgumentParser(description="Hugh's Trade Orchestrator Engine")
    parser.add_argument('--db', type=str, default="trades.db", help="Path to SQLite persistence database")
    parser.add_argument('--log', type=str, default="logs/orchestrator.jsonl", help="Path to JSONL telemetry log")
    parser.add_argument('--health-port', type=int, default=8002, help="Port for the /health endpoint")
    args = parser.parse_args()

    # Initialize Telemetry
    logger = setup_telemetry_logger(log_file=args.log)
    logger.info("Initializing the Trade Orchestrator", extra={"payload": {"db_path": args.db, "version": "0.1.0"}})

    # Start the health server in a daemon thread
    health_thread = threading.Thread(
        target=start_orchestrator_health_server, 
        args=(args.health_port,), 
        daemon=True, 
        name="Orchestrator-Health"
    )
    health_thread.start()

    # Scaffold the engine components
    orchestrator = TradeOrchestrator(db_path=args.db)
    event_loop = EventLoop(orchestrator)

    # Start the event loop in a daemon thread
    loop_thread = threading.Thread(target=event_loop.run, daemon=True, name="Orchestrator-Loop")
    loop_thread.start()
    
    logger.info("Trade Orchestrator is running. Waiting for signals (Ctrl+C to exit).")

    try:
        # Main thread simply sleeps and watches the world burn (or listens to Hugh's signals)
        while True:
            time.sleep(1)
            # In a real system, you'd ingest WebSockets or Redis pub/sub here
            # e.g., if a new signal arrives: event_loop.enqueue_signal(signal_data)
            
    except KeyboardInterrupt:
        logger.info("Received interrupt. Shutting down gracefully...")
        event_loop.stop()
        loop_thread.join(timeout=5.0)
        logger.info("Shutdown complete.", extra={"payload": {"uptime_seconds": "N/A"}})
        sys.exit(0)

if __name__ == "__main__":
    main()
