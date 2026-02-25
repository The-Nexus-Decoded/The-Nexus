import json
import asyncio
import websockets
from typing import Callable, Dict, Any
from src.services.security_scanner import AntiRugScanner

class PumpFunSignal:
    """
    The High-Velocity Ear of the Patryn Trader.
    Connects to the Pump.fun WebSocket to detect new token launches in real-time.
    """
    def __init__(self, on_token_received: Callable, endpoint: str = "wss://pumpportal.fun/api/data"):
        self.endpoint = endpoint
        self.on_token_received = on_token_received
        self.active = False
        self.retry_delay = 5

    async def run(self):
        """Main listening loop with auto-reconnect logic."""
        self.active = True
        print(f"[SIGNAL] Initializing Pump.fun WebSocket at {self.endpoint}")
        
        while self.active:
            try:
                async with websockets.connect(self.endpoint) as websocket:
                    # Subscribe to New Token Creation events
                    payload = {"method": "subscribeNewToken"}
                    await websocket.send(json.dumps(payload))
                    print("[SIGNAL] Connection Established. Subscribing to New Token Stream.")

                    async for message in websocket:
                        data = json.loads(message)
                        await self._process_message(data)
                        
            except asyncio.CancelledError:
                self.active = False
                break
            except Exception as e:
                print(f"[SIGNAL] Connection error: {e}. Retrying in {self.retry_delay}s...")
                await asyncio.sleep(self.retry_delay)

    async def _process_message(self, data: Dict[str, Any]):
        """Processes raw WebSocket data and triggers the callback if a token is found."""
        # Check if the message is a new token event (based on pumpportal.fun schema)
        if "signature" in data and "mint" in data:
            mint = data["mint"]
            symbol = data.get("symbol", "UNKNOWN")
            print(f"[SIGNAL] NEW TOKEN DETECTED: {symbol} ({mint})")
            
            # Delegate to the provided callback for scanning/execution
            await self.on_token_received(mint, data)

    def stop(self):
        self.active = False
        print("[SIGNAL] Pump.fun stream halted.")

# Integration Scaffold
async def handle_discovery(mint: str, metadata: Dict[str, Any]):
    """
    The Handshake. 
    New token -> AntiRugScanner (Phase 3) -> Decision.
    """
    print(f"[SENTINEL] Intercepted {mint}. Commencing deep-scan with active profile...")
    # This will be integrated with the main TradeEngine to pull config/active_profile.json
    pass

if __name__ == "__main__":
    signal = PumpFunSignal(on_token_received=handle_discovery)
    try:
        asyncio.run(signal.run())
    except KeyboardInterrupt:
        signal.stop()
