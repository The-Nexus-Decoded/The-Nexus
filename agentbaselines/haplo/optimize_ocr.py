#!/usr/bin/env python3
"""
Optimized OCR Pipeline
Processes images in parallel using tesseract with improved error handling and progress tracking.

Usage:
    python3 optimize_ocr.py [--workers N] [--batch-size N] [--resume]
"""

import os
import json
import argparse
import signal
import sys
import time
from pathlib import Path
from datetime import datetime
from multiprocessing import Pool, cpu_count, Manager
import subprocess

STAGING_DIR = "/data/openclaw/staging"
OUTPUT_JSONL = "/data/openclaw/document-db/ingested.jsonl"
OCR_OUTPUT_DIR = "/data/openclaw/document-db/ocr_results"
OCR_PROGRESS_FILE = "/data/openclaw/document-db/ocr_progress.json"

# Ensure output directories exist
os.makedirs(OCR_OUTPUT_DIR, exist_ok=True)

# Global flag for graceful shutdown
shutdown_flag = None

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global shutdown_flag
    if shutdown_flag is not None:
        print("\nShutdown requested... saving progress and exiting.")
        shutdown_flag['shutdown'] = True

def extract_text_from_image_tesseract(image_path: str) -> str:
    """Extract text from image using tesseract OCR with improved error handling."""
    try:
        # Use -c preserve_interword_spaces=1 for better formatting
        result = subprocess.run(
            ['tesseract', image_path, 'stdout', '-c', 'preserve_interword_spaces=1'],
            capture_output=True, text=True, timeout=20  # 20s timeout
        )
        if result.returncode != 0:
            error_msg = result.stderr.strip()[:200] if result.stderr else "Unknown error"
            return f"[OCR FAILED: {error_msg}]"
        text = result.stdout.strip()
        return text if text else "[OCR: No text detected]"
    except subprocess.TimeoutExpired:
        return "[OCR TIMEOUT - image too complex]"
    except FileNotFoundError:
        return "[OCR NOT INSTALLED: tesseract]"
    except Exception as e:
        return f"[OCR ERROR: {type(e).__name__}: {e}]"

def process_image_task(args):
    """Process a single image with OCR. Designed for multiprocessing."""
    global shutdown_flag
    if shutdown_flag and shutdown_flag.get('shutdown'):
        return None
    
    filepath, relative_path = args
    try:
        text = extract_text_from_image_tesseract(filepath)
        return {
            "path": relative_path,
            "filename": Path(filepath).name,
            "extension": Path(filepath).suffix.lower(),
            "content": text,
            "content_type": "image_ocr",
            "ocr_engine": "tesseract",
            "ocr_timestamp": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        return {
            "path": relative_path,
            "filename": Path(filepath).name,
            "extension": Path(filepath).suffix.lower(),
            "content": f"[PROCESSING ERROR: {e}]",
            "content_type": "ocr_error",
            "ocr_engine": "tesseract",
            "ocr_timestamp": datetime.utcnow().isoformat() + "Z"
        }

def load_progress():
    """Load previously processed images from progress file."""
    if os.path.exists(OCR_PROGRESS_FILE):
        try:
            with open(OCR_PROGRESS_FILE, 'r') as f:
                return set(json.load(f))
        except:
            return set()
    return set()

def save_progress(processed_paths):
    """Save progress to file."""
    with open(OCR_PROGRESS_FILE, 'w') as f:
        json.dump(list(processed_paths), f, indent=1)

def find_images_to_process():
    """Find all image files in staging directory."""
    image_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif'}
    images = []
    staging = Path(STAGING_DIR)
    
    for ext in image_extensions:
        images.extend(staging.rglob(f"*{ext}"))
        images.extend(staging.rglob(f"*{ext.upper()}"))
    
    return [(str(img), str(img.relative_to(staging))) for img in images if img.is_file()]

def main():
    parser = argparse.ArgumentParser(description='Optimized OCR processing with parallel workers')
    parser.add_argument('--workers', type=int, default=cpu_count(), help='Number of parallel workers')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size for progress reporting')
    parser.add_argument('--resume', action='store_true', help='Resume from previous progress')
    parser.add_argument('--dry-run', action='store_true', help='Scan and report without processing')
    args = parser.parse_args()
    
    # Set up signal handling
    global shutdown_flag
    manager = Manager()
    shutdown_flag = manager.dict()
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("Optimized OCR Pipeline")
    print("=" * 60)
    
    # Find all images
    all_images = find_images_to_process()
    print(f"Found {len(all_images)} images in staging directory")
    
    # Load or initialize progress
    processed_paths = load_progress() if args.resume else set()
    todo = [(fp, rp) for fp, rp in all_images if fp not in processed_paths]
    already_done = len(all_images) - len(todo)
    
    print(f"Already processed: {already_done}")
    print(f"Remaining to process: {len(todo)}")
    print(f"Using {args.workers} workers")
    
    if args.dry_run:
        print("\nDry run complete. No processing performed.")
        return
    
    if len(todo) == 0:
        print("\nAll images already processed!")
        return
    
    # Determine number of workers (limit to reasonable amount)
    workers = min(args.workers, 16)  # Cap at 16 to avoid overwhelming system
    print(f"\nStarting OCR processing with {workers} workers...")
    
    start_time = time.time()
    batch_size = args.batch_size
    results_buffer = []
    processed_count = 0
    error_count = 0
    
    try:
        with Pool(processes=workers) as pool:
            # Process images in async batches
            for i in range(0, len(todo), batch_size):
                if shutdown_flag.get('shutdown'):
                    print("\nShutdown flag set. Breaking processing loop.")
                    break
                
                batch = todo[i:i+batch_size]
                batch_results = pool.map(process_image_task, batch)
                
                # Collect results
                for result in batch_results:
                    processed_paths.add(result['path'])
                    results_buffer.append(result)
                    processed_count += 1
                    
                    if 'error' in result.get('content', '').lower() or 'failed' in result.get('content', '').lower():
                        error_count += 1
                    
                    # Write batch to individual files
                    outfile = os.path.join(OCR_OUTPUT_DIR, f"ocr_{processed_count:06d}.json")
                    with open(outfile, 'w') as f:
                        json.dump(result, f)
                
                # Save progress every batch
                save_progress(processed_paths)
                
                # Report progress
                elapsed = time.time() - start_time
                rate = processed_count / elapsed if elapsed > 0 else 0
                remaining = len(todo) - processed_count
                eta = remaining / rate if rate > 0 else 0
                
                print(f"[{processed_count}/{len(todo)}] "
                      f"Rate: {rate:.1f} img/s, "
                      f"Elapsed: {elapsed/60:.1f}m, "
                      f"ETA: {eta/60:.1f}m, "
                      f"Errors: {error_count}")
                
                # Clear buffer periodically to avoid memory buildup
                if len(results_buffer) >= 1000:
                    results_buffer.clear()
    
    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Saving progress and exiting.")
    except Exception as e:
        print(f"\nError during processing: {e}")
        import traceback
        traceback.print_exc()
    
    # Finalize
    total_elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("OCR Processing Complete")
    print(f"Total processed: {processed_count}")
    print(f"Total time: {total_elapsed/60:.1f} minutes")
    print(f"Average rate: {processed_count/total_elapsed if total_elapsed>0 else 0:.1f} images/second")
    print(f"Errors encountered: {error_count}")
    print(f"Progress saved to: {OCR_PROGRESS_FILE}")
    print(f"Individual results in: {OCR_OUTPUT_DIR}")
    
    # Next steps summary
    print("\n" + "=" * 60)
    print("NEXT STEPS:")
    print("1. Verify OCR results quality")
    print("2. Merge OCR results back into ingested.jsonl")
    print("   (use script: merge_ocr_results.py)")
    print("3. Re-run document ingestion with OCR enabled for remaining images")

if __name__ == '__main__':
    main()