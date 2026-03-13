import logging
import time
import queue
from typing import Dict, Any
from .orchestrator import TradeOrchestrator

class EventLoop:
    def __init__(self, orchestrator: TradeOrchestrator):
        self.logger = logging.getLogger("EventLoop")
        self.orchestrator = orchestrator
        self.signal_queue = queue.Queue()
        self.is_running = False

    def enqueue_signal(self, signal_data: Dict[str, Any]):
        """Puts a new signal onto the queue for processing."""
        self.signal_queue.put(signal_data)
        self.logger.info(f"Enqueued signal for {signal_data.get('token_address')}")

    def run(self):
        """Starts the event loop to process signals continuously."""
        self.logger.info("Starting Trade Orchestrator Event Loop...")
        self.is_running = True
        
        while self.is_running:
            try:
                # Block for up to 1 second waiting for a signal
                signal = self.signal_queue.get(timeout=1.0)
                self.logger.info(f"Dequeued signal. Processing...")
                
                final_state = self.orchestrator.process_signal(signal)
                self.logger.info(f"Finished processing signal. Final State: {final_state}")
                
                self.signal_queue.task_done()
                
            except queue.Empty:
                # No signals in the queue, just loop again
                pass
            except Exception as e:
                self.logger.error(f"Error processing signal in event loop: {e}", exc_info=True)

    def stop(self):
        """Stops the event loop gracefully."""
        self.logger.info("Stopping Event Loop...")
        self.is_running = False
