# Profit Locker: Deterministic Pool-Campaign Controller

## Purpose and boundary

Profit Locker manages Meteora DLMM positions from discovery through a configured net-profit exit. It is a standalone deterministic service. Monitoring, accounting, range construction, guard evaluation, simulation, and action generation do not require an LLM. An AI or OpenClaw agent may submit advisory suggestions and deliver notifications, but it cannot access private keys, sign, submit, or bypass the validator.

Mainnet execution is disabled and dry-run by default. A separate local signer adapter may execute an action only after validating its scope, idempotency key, enrollment authorization, current state, and successful simulation. The signer never exposes key material to the monitor, notification system, AI, logs, or repository.

## Enrollment is the one owner decision

Every newly discovered live position begins in `pending`; the default is never enrolled. The service sends an in-app and email yes/no prompt every 15 minutes until an authenticated answer is recorded. Silence never becomes consent.

- **No:** mark that exact position declined and stop reminders unless the owner explicitly resets it.
- **Yes:** create a durable authorization scoped to wallet, pool, and originating position. This begins a pool campaign and stores its target and risk envelope.

The campaign authorization covers deterministic management of its descendant positions: profit exit, two-position recovery, tight-position rolls, fee harvesting, and capped top-side re-entry. These actions notify the owner but do not start another approval timer. An action outside the enrolled envelope stops and requests a new owner decision.

Targets are configurable per campaign from 10% through 80%, inclusive. The default is 30%. While profit sweeping is active, enrollment also requires a valid profit-vault public address that differs from the trading wallet. A missing or same-wallet destination fails closed.

## Pool-campaign identity and lifecycle accounting

One campaign follows economic value across the original position and every close, roll, recovery position, and re-entry it creates. Closing a child position does not reset the target or establish a new cost basis.

Each accounting row has an immutable `source_id`, timestamp, campaign ID, transaction or quote provenance, token quantities, and USD valuation source. Net campaign profit is:

`realized liquidity proceeds + claimed fees + current simulated exit value + unclaimed fees not already in that exit value - external capital contributions - execution costs`

Execution costs include swap fees, modeled slippage, priority fees, network fees, rent, and unrecovered transaction costs. Rolled capital is an internal transfer, not a new contribution or realized gain. Duplicate source IDs, incomplete basis, stale valuations, or more than one current exit valuation make the calculation ineligible to trade.

The target can trigger only from current, executable values. Projected future fees never prove that a profit target has been reached.

## Two-position recovery

Recovery is used when a position has moved heavily to the token side. It divides only the enrolled inventory available after the protected reserve:

1. **Wide upward recovery position.** A BidAsk ladder starts at the fresh active bin and sells progressively into an upward move. Its top is solved bin by bin so deterministic proceeds can recover campaign basis plus the selected target after costs. A rough entry-price/current-price multiple, such as an 8.5x drawdown, is useful context but is not the answer: a BidAsk distribution has unequal inventory per bin, so the validator must simulate each bin's proceeds. If the allowed range cannot reach the target without future fees, the plan is rejected.
2. **Tight upward fee position.** A smaller Spot sleeve starts at the active bin and concentrates liquidity near current trading. Spot is used here because it gives the active bin useful inventory instead of starving it with a second wide BidAsk distribution. It earns fees while recovery develops. Its inventory is capped independently and it may not consume the protected reserve.

The default allocation is 60% wide recovery, 20% tight fee sleeve, and 20% reserve outside all LP positions. Percentages are enrollment settings rather than universal constants. A range is rejected if its price multiple, allocation, liquidity, price impact, expected hold-relative drag, or deterministic proceeds exceed the enrolled limits.

## Continuous monitoring and rolls

The tight position is actively managed, not fire-and-forget. The service subscribes to the pool's active-bin account over Solana WebSocket. Every active-bin update schedules a deterministic range check. If the subscription drops, a 15-second poll is the fallback while the service reconnects; a full position and accounting snapshot runs every 60 seconds.

An upward roll is considered as price approaches the configured upper-edge buffer. The replacement range is anchored to the freshly read active bin and must preserve reserve and campaign accounting. A roll proceeds only when expected fee capture exceeds swap, slippage, priority, rent, and network costs and all fresh guards and simulation pass. Minimum dwell time, edge hysteresis, execution locks, and hourly roll limits prevent churn.

Downward anti-chase is the default. The engine does not repeatedly move the recovery ladder down after every falling bin and crystallize a worsening target. It may observe and wait for confirmed recovery, but it cannot move the campaign floor below the enrolled floor or use protected reserve without new owner approval.

## Fee harvesting and SOL realization

While positions are in range, the controller evaluates fees every minute and normally claims no more frequently than every 15 minutes. It claims only when gross value meets both the configured USD minimum and the minimum value-to-cost multiple. Token-side fee proceeds are quoted and swapped to SOL within enrolled slippage and impact limits. Realized SOL is recorded in the campaign ledger and remains protected from accidental double counting or unrestricted recycling.

A campaign may optionally retain a configured percentage of token fees for parabolic upside. The default retention is zero. An advisory system can recommend changing that percentage, widening the target, tightening/widening the fee sleeve, or enabling a trailing floor, but the deterministic engine accepts only changes inside the enrollment envelope and notifies the owner before applying them.

## Profit-vault settlement

Profit sweeping is designed to stop successful campaigns from automatically compounding their winnings into the next trade. After all campaign positions close, the executor converts the campaign proceeds to SOL, reconciles every close and swap, and calculates the final realized net campaign profit after fees, slippage, priority fees, rent, and transfer costs.

Only that realized net profit is eligible for transfer. Returned principal remains in the trading wallet and is never part of the sweep. The destination must be a separately configured Solana wallet, distinct from the trading wallet. The transfer is simulated, uses a settlement fingerprint and one idempotency key, and is recorded only after finalized on-chain reconciliation. A retry returns the prior result instead of sending again.

If the destination is missing, the balance is not sufficient to send the full profit while retaining principal and the source-wallet reserve, or any close/quote/simulation guard fails, the sweep blocks and notifies. It does not send a partial amount by dipping into principal. Future trade-scanning and automatic entry may use only the principal/risk budget explicitly left in the trading wallet; the profit-vault balance is outside the engine's deployable capital.

## SOL-only top-side behavior

If an upward position finishes above its range as SOL-only before the campaign reaches its net-profit target, management continues. The engine protects at least 80% of recovered SOL and may recycle at most 20% into a new in-range fee position. Creating the required token side therefore uses a capped SOL-to-token swap.

Re-entry must still have positive expected net fees, acceptable liquidity, impact and slippage, a current quote, and a successful transaction simulation. It inherits the campaign ID and authorization. If those checks fail, recovered SOL remains protected and the engine alerts instead of chasing the market.

## Deterministic action pipeline

Every mutating action follows the same pipeline:

1. Read the enrolled policy and exact wallet/pool/position or campaign scope.
2. Obtain fresh pool, active-bin, wallet, ledger, liquidity, and quote data.
3. Construct an immutable proposal with a unique fingerprint and idempotency key.
4. Notify the owner when the enrolled policy calls for notification.
5. Re-read state immediately before execution.
6. Validate owner/scope match, freshness, balances, recovery feasibility, liquidity, price impact, slippage, hold-relative drag, and protected-reserve invariants.
7. Simulate every transaction. Any missing or failed guard fails closed.
8. Send the approved payload to the isolated local signer and record signatures and provenance.
9. Reconcile confirmed on-chain state before another action for that scope.

There is one execution lock per position and a campaign lock for shared accounting and capital. Independent campaigns may be monitored and preflighted concurrently; one campaign's enrollment never authorizes another.

## Intelligence and evidence building

AI is a supervised strategy adviser, never the money-moving control plane. It can propose a larger target when volume and momentum remain strong, a token-fee retention percentage, range-width changes, a smaller risk allocation, a trailing profit floor, or a pause when liquidity and volume deteriorate. Each suggestion is structured data, logged, and evaluated by the same deterministic guard pipeline. Until explicitly promoted, it cannot change live policy.

For every proposal—accepted, rejected, or advisory—the learning ledger records the observed features, chosen action, policy version, predicted return and risk, deterministic guard results, and later outcomes at 15-minute, one-hour, six-hour, and 24-hour horizons. Outcomes include net campaign return, fees, hold-relative return, drawdown, roll cost, time in range, target success, and time to target.

The evaluator also records counterfactual results for holding, wide-only recovery, no harvesting, no top-side re-entry, and alternate targets using the same market observations without executing them. This prevents attributing every favorable market move to the chosen policy. Win rate, calibrated success probability, sample size, confidence interval, market regime, and drawdown must all be reported together.

No learned policy automatically reaches production. Promotion requires at least 30 evaluated campaigns, configured probability and confidence thresholds, a reproducible backtest/shadow report, deterministic bounds, and explicit owner approval. Rollback is a policy-version change; it never requires modifying or exposing the signer.

## Sparky proof of concept

The Sparky campaign is the first dry-run two-position proof. Before any additional live capital movement, the report must show the fresh active bin, original campaign basis, prior realized proceeds and fees, current inventory, protected reserve, wide and tight allocations, bin-by-bin proceeds, target sensitivity from 10% through 80%, all costs, hold-relative comparison, and every rejected guard.

The POC first shadows active-bin monitoring and roll decisions without signing. A live opening requires mainnet execution to be enabled deliberately, the exact Sparky campaign to be enrolled, a fresh simulation to pass, and the local signer to receive the validated action. The bounded opening test withdraws and repositions inventory; it does not claim that movement as realized profit. Success means both positions reconcile on chain, reserve remains outside LP, lifecycle accounting remains unchanged except for execution costs and internal transfers, and tight-position monitoring continues through at least one edge/roll scenario. A later profitable campaign close must use the profit-vault settlement pipeline.
