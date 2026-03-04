# Solana Wallet Analyzer

Tools for extracting and analyzing historical on-chain activity of a Solana wallet.

## Components

- `01_pull_transactions.py` — Fetches full transaction history from Helius for configured wallets and stores raw data in `output/`. Requires `.env` with `HELIUS_API_KEY` and wallet addresses.
- `analyze_trades.py` — Processes the raw JSON to extract token balance changes (trades). Produces CSV and summary markdown in `output_analysis/`.

## Data Flow

1. Run `01_pull_transactions.py` to populate `output/wallet_N/raw_transactions.json`.
2. Run `analyze_trades.py` on each raw file:
   ```bash
   python analyze_trades.py output/wallet_1/raw_transactions.json owner
   python analyze_trades.py output/wallet_2/raw_transactions.json wallet2
   python analyze_trades.py output/wallet_3/raw_transactions.json bot
   ```
3. Results appear under `output_analysis/`.

## Notes

- The `output/` directory is gitignored to avoid storing large raw JSON blobs in the repo. Keep only derived CSVs and summaries in version control.
- The raw data is archived on the respective server and can be re-processed as needed.
- Use the summaries to inform trading strategy parameters (fee tolerance, token preferences, timing).
