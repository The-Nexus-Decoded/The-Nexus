# Technical Specification: Volatility-Aware Rebalancing (Pryan-Fire #122)

## Objective:
Enhance the `TradeExecutor`'s rebalancing logic to be aware of Meteora's dynamic fee structure and market volatility. The goal is to minimize fee erosion and optimize rebalancing frequency by incorporating a profitability threshold and dynamic trigger widths.

## 1. Ingest Meteora Dynamic Fee Data:

### 1.1 New Method: `TradeExecutor.get_meteora_dynamic_fees(pool_pubkey: Pubkey) -> Dict[str, Any]`
*   This asynchronous method will be responsible for querying the Meteora DLMM program or a relevant on-chain source to extract the dynamic fee parameters for a given `pool_pubkey`.
*   It will specifically target data points that expose:
    *   `base_fee_rate`: The static, baseline fee for the pool.
    *   `variable_fee_rate`: The dynamic component, often referred to as "surge pricing" or volatility-adjusted fee.
    *   `current_total_fee_rate`: The sum of `base_fee_rate` and `variable_fee_rate`.
    *   Potentially, `fee_tier_distribution` or `bin_fee_data` if available through the program's accounts, to understand how fees are distributed across bins.
*   This method will include robust error handling and logging, similar to `get_meteora_pool_state`.

### 1.2 Integration into `TradeExecutor.run_autonomous_audit`
*   Within the main audit loop, for each `pos` (LP position) and its associated `pool_pubkey`, `get_meteora_dynamic_fees` will be called to fetch the latest fee information.
*   This fetched `dynamic_fee_data` will then be passed to the `RebalanceStrategy` instance or directly to the `check_profitability_threshold` method.

### 1.3 Impact on `RebalanceStrategy`
*   The `RebalanceStrategy.check_profitability_threshold` will utilize the `current_total_fee_rate` to calculate the `expected_fee_capture` more accurately, understanding the true cost and potential return from fees.
*   The distinction between `base_fee` and `variable_fee` will enable more nuanced profitability assessments, especially when considering rebalancing during periods of high volatility where `variable_fee_rate` might be significantly elevated.

## 2. Implement "Profitability Threshold" Check:

### 2.1 New Method: `RebalanceStrategy.check_profitability_threshold(expected_fee_capture: float, estimated_swap_gas: float, potential_slippage: float) -> bool`
*   This method will compare the `expected_fee_capture` against the sum of `estimated_swap_gas` and `potential_slippage`.
*   Rebalancing will only proceed if `expected_fee_capture > (estimated_swap_gas + potential_slippage)`.
*   The `simulate_rebalance` method will be enhanced to provide more accurate `expected_fee_capture` (based on dynamic fees), `estimated_swap_gas` (from Solana RPC/transaction simulation), and `potential_slippage` (from Jupiter quotes). These enhanced estimates will then be used by this new profitability check.

## 3. Volatility-Scaled Trigger Width:

### 3.1 Volatility Parameter in `RebalanceStrategy.should_rebalance`
*   The `should_rebalance` method will accept a `current_market_volatility: str` argument (e.g., "LOW", "MEDIUM", "HIGH"). This volatility assessment will originate from the `TradeExecutor.run_autonomous_audit` loop, which will incorporate a "Volatility Scryer" (potentially using Pyth historical data or internal metrics) to determine the current market sentiment.

### 3.2 Dynamic Adjustment of `buffer_bins` / `target_width`
*   Within `should_rebalance`, a `volatility_scale_factor` will be applied to either `self.buffer_bins` or `self.target_width` to modify the range that triggers a rebalance or stop-loss.
*   **Example Mapping (illustrative):**
    *   `LOW` volatility: `effective_buffer = self.buffer_bins * 0.75` (tighter range, more reactive)
    *   `MEDIUM` volatility: `effective_buffer = self.buffer_bins * 1.0` (standard range)
    *   `HIGH` volatility: `effective_buffer = self.buffer_bins * 1.5` (wider range, less frequent rebalancing to avoid whipsaws)
*   This dynamic adjustment will be logged to provide transparency on the strategy's adaptive behavior.

### 3.3 Impact on Trading Behavior
*   During `HIGH` volatility, the wider effective buffer will reduce the frequency of rebalances, preventing over-trading and potential fee erosion from rapid price swings.
*   During `LOW` volatility, a tighter buffer will allow the strategy to react more precisely to minor price movements, maximizing fee capture within stable ranges.
