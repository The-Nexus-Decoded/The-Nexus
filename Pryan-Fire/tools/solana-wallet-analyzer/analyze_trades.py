#!/usr/bin/env python3
"""
Wallet Trade Analysis

Parses raw_transactions.json produced by 01_pull_transactions.py and extracts
token balance changes (trades) for the wallet.

Outputs:
- trades_<label>.csv: one row per trade (blockTime, mint, delta_raw, fee_lamports)
- summary_<label>.md: summary statistics

Usage:
  python analyze_trades.py /path/to/raw_transactions.json [label]

The label is used for output filenames; default "owner".
"""

import json
import csv
import sys
import os
from collections import defaultdict, Counter
from datetime import datetime

def extract_trades(txns, wallet_addr):
    """Extract trade entries from transactions."""
    rows = []
    mint_volumes = defaultdict(int)
    mint_trade_counts = Counter()
    mint_fee_sums = defaultdict(int)
    trade_timestamps = []

    for tx in txns:
        fee = tx.get("meta", {}).get("fee", 0)
        block_time = tx.get("blockTime", 0)
        if block_time:
            trade_timestamps.append(block_time)

        pre_tok_map = {}
        for entry in tx.get("meta", {}).get("preTokenBalances", []):
            if entry.get("owner") == wallet_addr:
                mint = entry["mint"]
                amount = int(entry["uiTokenAmount"]["amount"])
                pre_tok_map[mint] = amount
        post_tok_map = {}
        for entry in tx.get("meta", {}).get("postTokenBalances", []):
            if entry.get("owner") == wallet_addr:
                mint = entry["mint"]
                amount = int(entry["uiTokenAmount"]["amount"])
                post_tok_map[mint] = amount

        all_mints = set(pre_tok_map.keys()) | set(post_tok_map.keys())
        for mint in all_mints:
            pre = pre_tok_map.get(mint, 0)
            post = post_tok_map.get(mint, 0)
            delta = post - pre
            if delta != 0:
                rows.append((block_time, mint, delta, fee))
                mint_trade_counts[mint] += 1
                mint_volumes[mint] += abs(delta)
                mint_fee_sums[mint] += fee

    return rows, mint_trade_counts, mint_volumes, mint_fee_sums, trade_timestamps

def main():
    if len(sys.argv) < 2:
        print("Usage: analyze_trades.py <raw_transactions.json> [label]")
        sys.exit(1)
    input_path = sys.argv[1]
    label = sys.argv[2] if len(sys.argv) > 2 else "owner"

    out_dir = os.path.join(os.path.dirname(input_path), "output_analysis")
    os.makedirs(out_dir, exist_ok=True)

    print(f"Loading {input_path}...")
    with open(input_path) as f:
        txns = json.load(f)
    print(f"Loaded {len(txns)} transactions")

    # Determine wallet address from first transaction
    wallet_addr = txns[0]["transaction"]["message"]["accountKeys"][0] if txns else None

    rows, mint_trade_counts, mint_volumes, mint_fee_sums, trade_timestamps = extract_trades(txns, wallet_addr)
    print(f"Trade entries: {len(rows)}")

    # Write CSV
    csv_path = os.path.join(out_dir, f"trades_{label}.csv")
    with open(csv_path, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["blockTime", "mint", "delta_raw", "fee_lamports"])
        writer.writerows(rows)
    print(f"CSV: {csv_path}")

    # Summary
    summary_path = os.path.join(out_dir, f"summary_{label}.md")
    with open(summary_path, "w") as f:
        f.write(f"# {label.title()} Wallet Trade Summary\n\n")
        f.write(f"- Transactions analyzed: {len(txns)}\n")
        f.write(f"- Trade entries (token balance changes): {len(rows)}\n")
        if trade_timestamps:
            start_ts = min(trade_timestamps)
            end_ts = max(trade_timestamps)
            start_dt = datetime.fromtimestamp(start_ts)
            end_dt = datetime.fromtimestamp(end_ts)
            days = (end_ts - start_ts) / 86400 if end_ts > start_ts else 0
            f.write(f"- Date range (trades): {start_dt.date()} to {end_dt.date()} ({days:.1f} days)\n")
        f.write("\n")
        f.write(f"- Distinct mints traded: {len(mint_trade_counts)}\n")
        total_fees = sum(mint_fee_sums.values())
        avg_fee = total_fees / len(rows) if rows else 0
        f.write(f"- Total fees (lamports) across trades: {total_fees:,}\n")
        f.write(f"- Average fee per trade: {avg_fee:,.0f} lamports\n")
        f.write("\n## Top Mints by Trade Count\n\n")
        f.write("| Mint (truncated) | Trades |\n")
        f.write("|--|--|\n")
        for mint, cnt in mint_trade_counts.most_common(10):
            f.write(f"| {mint[:16]}... | {cnt} |\n")
        f.write("\n## Top Mints by Volume (raw token units)\n\n")
        f.write("| Mint (truncated) | Volume |\n")
        f.write("|--|--|\n")
        for mint, vol in sorted(mint_volumes.items(), key=lambda x: x[1], reverse=True)[:10]:
            f.write(f"| {mint[:16]}... | {vol} |\n")
        f.write("\n## Notes\n")
        wSOL = "So11111111111111111111111111111111111111112"
        if wSOL in mint_trade_counts:
            f.write(f"- wSOL trades: {mint_trade_counts[wSOL]}, volume: {mint_volumes[wSOL]}\n")
        pump_count = sum(1 for m in mint_trade_counts if "pump" in m.lower())
        f.write(f"- Mints containing 'pump': {pump_count}\n")
    print(f"Summary: {summary_path}")

if __name__ == "__main__":
    main()
