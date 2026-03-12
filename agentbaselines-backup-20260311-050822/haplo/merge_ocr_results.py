#!/usr/bin/env python3
"""
Merge OCR Results into Ingested Dataset
Takes individual OCR result JSON files and updates the ingested.jsonl records for images.

Usage:
    python3 merge_ocr_results.py [--dry-run]
"""

import json
import argparse
from pathlib import Path
from collections import defaultdict

OCR_DIR = "/data/openclaw/document-db/ocr_results"
INGESTED_FILE = "/data/openclaw/document-db/ingested.jsonl"
MERGED_OUTPUT = "/data/openclaw/document-db/ingested_with_ocr.jsonl"
BACKUP_FILE = "/data/openclaw/document-db/ingested_backup.jsonl"

def load_ocr_results():
    """Load all OCR result JSON files into a dict keyed by path."""
    ocr_results = {}
    ocr_dir = Path(OCR_DIR)
    
    if not ocr_dir.exists():
        print(f"OCR results directory not found: {OCR_DIR}")
        return {}
    
    json_files = sorted(ocr_dir.glob("ocr_*.json"))
    print(f"Loading {len(json_files)} OCR result files...")
    
    for jf in json_files:
        try:
            with open(jf, 'r') as f:
                data = json.load(f)
                if 'path' in data:
                    ocr_results[data['path']] = data
        except Exception as e:
            print(f"Error loading {jf}: {e}")
    
    print(f"Loaded {len(ocr_results)} OCR results")
    return ocr_results

def merge_ocr_results(dry_run=False):
    """Merge OCR results back into ingested dataset."""
    
    # Load OCR results
    ocr_results = load_ocr_results()
    if not ocr_results:
        print("No OCR results to merge.")
        return False
    
    # Read ingested records
    ingested_path = Path(INGESTED_FILE)
    if not ingested_path.exists():
        print(f"Ingested file not found: {INGESTED_FILE}")
        return False
    
    records = []
    updated_count = 0
    missing_count = 0
    
    print(f"Reading {INGESTED_FILE}...")
    with open(ingested_path, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                record = json.loads(line.strip())
                path = record.get('path', '')
                
                # Check if this is an image_pending record that we have OCR for
                if (record.get('content_type') == 'image_pending' and 
                    path in ocr_results):
                    
                    ocr_data = ocr_results[path]
                    # Update record with OCR content
                    record['content'] = ocr_data.get('content', '')
                    record['content_type'] = 'image_ocr'
                    record['ocr_engine'] = ocr_data.get('ocr_engine', 'tesseract')
                    record['ocr_timestamp'] = ocr_data.get('ocr_timestamp')
                    record['ocr_text_length'] = len(ocr_data.get('content', ''))
                    updated_count += 1
                elif record.get('content_type') == 'image_pending' and path not in ocr_results:
                    missing_count += 1
                
                records.append(record)
            except Exception as e:
                print(f"Error parsing line {line_num}: {e}")
                continue
    
    print(f"\nMerge Summary:")
    print(f"  Total records: {len(records)}")
    print(f"  Images updated with OCR: {updated_count}")
    print(f"  Images still pending: {missing_count}")
    
    if dry_run:
        print("\n[Dry run] No changes written.")
        return True
    
    # Backup original
    print(f"\nBacking up original to: {BACKUP_FILE}")
    with open(ingested_path, 'r') as src, open(BACKUP_FILE, 'w') as dst:
        dst.write(src.read())
    
    # Write merged output
    print(f"Writing merged output to: {MERGED_OUTPUT}")
    with open(MERGED_OUTPUT, 'w') as f:
        for record in records:
            f.write(json.dumps(record) + '\n')
    
    print(f"\nMerge complete! Merged file: {MERGED_OUTPUT}")
    print(f"To replace original: mv {MERGED_OUTPUT} {INGESTED_FILE}")
    
    return True

def main():
    parser = argparse.ArgumentParser(description='Merge OCR results into ingested dataset')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without writing')
    args = parser.parse_args()
    
    print("Merge OCR Results")
    print("=" * 60)
    success = merge_ocr_results(dry_run=args.dry_run)
    
    if not success:
        print("\nMerge failed.")
        sys.exit(1)

if __name__ == '__main__':
    main()