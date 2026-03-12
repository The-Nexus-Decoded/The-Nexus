# PHASE_2_SPEC.md -- Signal Intelligence Blueprint

## Overview
Phase 2 focuses on building the "Signal Intelligence" layer of Hugh's trading operative, the autonomous decision engine. This component will be responsible for consuming real-time market data, evaluating potential trading opportunities based on predefined strategies, and issuing signals for execution by the Meteora DLMM pipeline.

## Core Components

### 1. Data Ingestion & Normalization
*   **Purpose:** Aggregate real-time market data from various sources (e.g., Pump.fun WebSockets, Jupiter Aggregator APIs, potentially other DEXs).
*   **Focus:**
    *   Standardize data formats for consistent processing.
    *   Implement robust error handling and reconnection logic for streaming data.
    *   **Prioritization:** Initially focus on Pump.fun for new token discoveries (as previously explored in Phase 4a).

### 2. Strategy Engine
*   **Purpose:** Implement trading strategies to identify actionable signals.
*   **Focus:**
    *   **Jupiter Routing Integration:** Integrate with Jupiter Aggregator's API to:
        *   Obtain optimal swap routes for identified tokens.
        *   Determine available liquidity and slippage for potential trades.
        *   Calculate potential profit/loss for a given trade size before execution.
    *   **Liquidity Pool Prioritization:** Develop logic to:
        *   Identify high-liquidity pools for efficient entry/exit.
        *   Filter out low-liquidity or illiquid pools to prevent sandwich attacks and high slippage.
        *   Prioritize pools with minimal fees for maximum return.
    *   **Signal Generation:** Output structured trade signals (e.g., `OPEN`, `CLOSE`, `AMOUNT_USD`, `POOL_ADDRESS`, `STRATEGY_ID`) to a designated queue for the Risk Manager and Trade Executor.

### 3. Risk Manager Integration
*   **Purpose:** Ensure all generated signals adhere to predefined risk parameters.
*   **Focus:**
    *   Consume signals from the Strategy Engine.
    *   Perform pre-trade risk checks (e.g., exposure limits, position size, blacklisted tokens).
    *   Forward approved signals to the Trade Executor.

### 4. Telemetry & Monitoring
*   **Purpose:** Provide visibility into the decision engine's operations.
*   **Focus:**
    *   Log all incoming data, processed signals, and decisions to audit logs.
    *   Track key metrics: signal generation rate, strategy performance, API latency.

## Jupiter Routing Integration Logic (Detailed)

### Goal
Dynamically obtain the best possible trade routes and assess liquidity for any given token pair (e.g., `SOL/NEW_TOKEN`, `NEW_TOKEN/USDC`) before issuing an `OPEN` or `CLOSE` signal.

### Steps
1.  **Input:** When a potential trading opportunity is identified (e.g., a new token launch, an existing position needing adjustment), the Strategy Engine will formulate a hypothetical `(input_mint, output_mint, amount)` request.
2.  **Jupiter API Call:**
    *   Call Jupiter's `/v6/quote` endpoint (or similar) with:
        *   `inputMint`: Public key of the token to sell.
        *   `outputMint`: Public key of the token to buy.
        *   `amount`: The amount of `inputMint` to trade (in lamports/smallest unit).
        *   `slippageBps`: Acceptable slippage in basis points (e.g., 50 for 0.5%).
    *   This will return a list of possible routes, sorted by best `outAmount`.
3.  **Route Evaluation:**
    *   Extract the `outAmount` (amount of `outputMint` received), `feeAmount` (total fees incurred), and `swapMode` from the top route.
    *   If no suitable routes are found (e.g., insufficient liquidity), the signal should be discarded, and an appropriate audit log entry created.
4.  **Liquidity Assessment:**
    *   Jupiter's quote inherently provides a view into available liquidity for the requested amount. The `outAmount` directly reflects how much can be traded.
    *   If `outAmount` is significantly lower than expected for the `amount` of `inputMint` (considering slippage), it indicates low liquidity for the intended trade size.
    *   The Strategy Engine will implement thresholds for acceptable `outAmount` relative to `input_amount` and `slippageBps`.

### Example Flow (Simplified)
*   **Signal:** New token `XYZ` detected on Pump.fun, consider buying $1000 worth.
*   **Strategy Engine:**
    1.  Determines `inputMint` (USDC), `outputMint` (XYZ), `amount` (1000 USDC in lamports).
    2.  Calls Jupiter `/quote`.
    3.  Receives top route: `outAmount` (5000 XYZ), `feeAmount` (1 USDC).
    4.  Evaluates `outAmount` against `expected_outAmount` (considering market price of XYZ) and `slippage`.
    5.  If acceptable, generates `OPEN` signal for Trade Executor: `(pool=XYZ_USDC_POOL, amount_usd=1000, target_bin=current_bin, instruction_set=jupiter_swap_instructions)`.

## Liquidity Pool Prioritization (Detailed)

### Goal
Intelligently select the most efficient liquidity pools for trading to minimize costs and maximize trade execution probability.

### Factors for Prioritization
1.  **Depth of Liquidity:**
    *   **Data Source:** Jupiter API quotes, direct DEX pool queries (if necessary).
    *   **Logic:** Prioritize pools where the `outAmount` from Jupiter's quote for a given `amount` is within an acceptable slippage tolerance. Avoid pools with extreme slippage for the intended trade size.
2.  **Fee Structure:**
    *   **Data Source:** Jupiter API (`feeAmount` in quotes), DEX documentation.
    *   **Logic:** Favor pools with lower trading fees. The Strategy Engine should factor `feeAmount` into its profitability calculations.
3.  **Active Trading Volume:**
    *   **Data Source:** Historical data from Jupiter/DEX APIs (if available), or derived from frequent quote requests.
    *   **Logic:** Prioritize pools that show recent trading activity, indicating a healthier market.
4.  **Bin Array Configuration (Meteora Specific):**
    *   **Data Source:** Meteora DLMM pool on-chain data.
    *   **Logic:** When opening a position, analyze the distribution of liquidity within the bins. Prefer pools with concentrated liquidity around the target price for efficient entry.

### Prioritization Flow
1.  For a given trade intention (e.g., buy `X` with `Y`), identify all relevant pools on integrated DEXs (e.g., Meteora DLMM pools, other concentrated liquidity AMMs).
2.  For each potential pool, query Jupiter (or directly query the DEX) to get `outAmount`, `feeAmount`, and current liquidity depth for the intended trade size.
3.  Calculate a "score" for each pool based on a weighted combination of:
    *   `Effective Slippage` (derived from `amount_in` vs `outAmount`).
    *   `Fee Cost`.
    *   `Liquidity Depth` (e.g., total value locked in relevant bins for DLMM).
4.  Select the top-scoring pool for the trade. If no pool meets minimum criteria, abort the signal.

## Next Steps for Development (Post-Lobster Fix)

1.  Implement the Jupiter API client for `/v6/quote`.
2.  Develop the `JupiterRoutingStrategy` module within the Strategy Engine.
3.  Integrate `JupiterRoutingStrategy` with the existing Risk Manager and Audit Logger.
4.  Write comprehensive unit and integration tests for the new components.
