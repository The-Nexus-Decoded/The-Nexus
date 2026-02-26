import asyncio
import logging
import random
import datetime
from main import TradeExecutor, RPC_ENDPOINT, log_telemetry
from strategy_engine import StrategyEngine

# Configure root logger for the pipeline entry point
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

async def main_loop():
    logger.info("Initializing Crypto Trading Pipeline (Phase 5)...")
    
    # Initialize Trade Executor in Paper Trading mode
    executor = TradeExecutor(RPC_ENDPOINT, private_key=None, paper_trading_mode=True)
    
    # Initialize Mock Strategy Engine
    strategy = StrategyEngine(threshold_buy=-0.015, threshold_sell=0.015)

    current_mock_price = 150.0 # Starting mock price for SOL
    logger.info(f"Pipeline running. Starting mock price: ${current_mock_price:.2f}")

    while True:
        try:
            logger.info("--- Pipeline Heartbeat ---")
            
            # 1. Ingest Price Data (Mocked with random walk)
            price_shift = random.uniform(-0.03, 0.03) # Up to 3% swing
            current_mock_price *= (1 + price_shift)
            logger.info(f"--> Mock Price updated: ${current_mock_price:.2f}")

            # 2. Evaluate Strategy
            signal = strategy.evaluate(current_mock_price)
            
            # 3. Handle Signals & Telemetry
            if signal:
                logger.info(f"--> Signal generated: {signal}")
                # Log the strategy signal directly to telemetry
                log_telemetry("STRATEGY_SIGNAL", {
                    "price": current_mock_price,
                    "signal": signal
                })
                
                # Trigger trade execution
                executor.execute_trade(signal)
            else:
                logger.info("--> No signal generated. Holding position.")
                
            # 4. Sleep until next cycle
            await asyncio.sleep(5) # 5 seconds for rapid testing/simulation

        except Exception as e:
            logger.error(f"Pipeline error in main loop: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    try:
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        logger.info("Pipeline terminated by user request.")
