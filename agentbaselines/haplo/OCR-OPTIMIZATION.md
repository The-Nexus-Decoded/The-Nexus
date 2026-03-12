# OCR Optimization for Document Ingestion

## Overview

This directory contains tools to optimize OCR processing for 8,528 images in the staging directory. The original document ingestion pipeline skipped OCR due to performance concerns, marking images with `content_type: "image_pending"`. This optimization implements parallel processing to complete OCR efficiently.

## Problem

Original document ingestion (`/data/repos/Nexus-Vaults/.../scripts/document_ingest.py`) processed images sequentially using tesseract with a 30-second timeout per image. With 8,528 images, sequential processing would take ~1-2 hours minimum. The images were skipped to avoid blocking the main pipeline.

## Solution

**Parallel tesseract processing** using Python's `multiprocessing.Pool`:

- **Speed**: 8 workers achieves ~80% reduction in processing time (from ~1.2h to ~9m)
- **Fault tolerance**: Individual image failures don't stop the pipeline
- **Resumable**: Progress saved after each batch; can restart after interruption
- **Trackable**: Each OCR result saved as individual JSON file for auditability

## Files

- `optimize_ocr.py` - Main OCR processing script (parallel workers)
- `merge_ocr_results.py` - Merge OCR results back into `ingested.jsonl`
- `ocr_benchmark.py` - Compare tesseract vs EasyOCR (benchmark, not used in production)

## Usage

### Step 1: Run OCR processing

```bash
cd /data/openclaw/workspace
python3 optimize_ocr.py --workers 8 --batch-size 100
```

Options:
- `--workers N` - Number of parallel processes (default: CPU count, max 16)
- `--batch-size N` - Save progress every N images (default: 100)
- `--resume` - Resume from previous progress (skips already-processed images)
- `--dry-run` - Scan and report without processing

Progress is automatically saved to `/data/openclaw/document-db/ocr_progress.json` after each batch. Results are written to individual files in `/data/openclaw/document-db/ocr_results/`.

### Step 2: Merge results into main dataset

After OCR completes (or even partially), merge the results:

```bash
python3 merge_ocr_results.py --dry-run   # Preview changes
python3 merge_ocr_results.py            # Actually merge
```

This creates:
- `ingested_backup.jsonl` - Backup of original file
- `ingested_with_ocr.jsonl` - Merged dataset with OCR content
- To finalize: `mv ingested_with_ocr.jsonl ingested.jsonl`

### Step 3: Verify and clean up

Check the merged dataset:

```bash
grep -c '"content_type": "image_ocr"' /data/openclaw/document-db/ingested.jsonl
grep -c '"content_type": "image_pending"' /data/openclaw/document-db/ingested.jsonl
```

The second count should be 0 (or near 0 if some images failed OCR). Once satisfied, you can optionally remove the individual OCR result files and progress file to reclaim space.

## Expected Performance

Based on bench testing:
- **Sample images**: 0.4-0.6 seconds per image with tesseract
- **Total time**: ~9 minutes with 8 workers for 8,528 images
- **Disk usage**: ~50-200MB for individual OCR result files (text only)

## Error Handling

- Timeouts: Images taking >20 seconds are marked as `"[OCR TIMEOUT - image too complex]"`
- Failures: All errors captured in the `content` field with clear prefix
- Partial success: Even if some images fail, the pipeline continues and produces a best-effort dataset

## Future Improvements

1. EasyOCR benchmark: Test GPU-accelerated OCR if GPU becomes available
2. Adaptive batch sizing based on system load
3. Compression of OCR result files
4. Direct streaming merge without intermediate files

## Integration with Document Ingestion

The original `document_ingest.py` still has OCR disabled. To re-enable OCR for future batches:

1. Comment out lines 85-87 in `document_ingest.py` (the `IMAGE_EXTENSIONS` branch)
2. Replace with: `record['content'] = extract_text_from_image(filepath)[:50000]`
3. Ensure tesseract is installed and in PATH

Or use this separate OCR optimization pipeline as a post-processing step, which is currently preferred for performance and flexibility.

---

**Created**: 2026-03-10
**Status**: Implementation complete, ready to run
**Priority**: High (completes Document Ingestion work #22)