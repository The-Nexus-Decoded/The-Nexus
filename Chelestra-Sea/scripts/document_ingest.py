#!/usr/bin/env python3
"""
Document Ingestion Pipeline
Parses documents from staging directory into JSONL format for database import.

Supported formats:
- Text: txt, rtf, md, json
- Documents: pdf, docx, xlsx
- Images: png, jpg, jpeg (via OCR)
- Binary: stores metadata only

Output: JSONL file with one document per line

Optimization (Nexus-Vaults#23):
- OCR for images can be enabled with --ocr (disabled by default for backward compatibility)
- Parallel OCR using thread pool (--ocr-workers)
- Image preprocessing: resize and grayscale (--max-image-size, --preprocess)
"""

import os
import json
import hashlib
import subprocess
import argparse
import concurrent.futures
from pathlib import Path
from datetime import datetime
from threading import Lock

# Import PIL for image preprocessing if needed
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

STAGING_DIR = "/data/openclaw/staging"
OUTPUT_FILE = "/data/openclaw/document-db/ingested.jsonl"

# File type handlers
TEXT_EXTENSIONS = {'.txt', '.rtf', '.md', '.json', '.csv', '.xml', '.html', '.htm'}
DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.xlsx', '.doc', '.xls'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif'}
# Binary extensions - metadata only
BINARY_EXTENSIONS = {'.dll', '.exe', '.assetbundle', '.rom', '.mp3', '.mp4', '.wav', '.zip', '.tar', '.gz'}
# Skip these - not documents (code, game assets, etc)
SKIP_EXTENSIONS = {
    '.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx',
    '.py', '.pyw', '.pyc',
    '.map', '.d.ts',
    '.lua', '.cs', '.java', '.go', '.rs', '.rb', '.php',
    '.dds', '.cts', '.asset', '.prefab', '.mat', '.anim',
    '.mp3', '.wav', '.ogg', '.flac',  # Audio - skip
    '.mp4', '.mkv', '.avi', '.mov', '.webm',  # Video - skip
    '.css', '.scss', '.sass', '.less',
    '.sql', '.sh', '.bash', '.zsh',
}

# Global flags for OCR (set in main)
OCR_ENABLED = False
OCR_WORKERS = 4
MAX_IMAGE_SIZE = 3000
PREPROCESS = True

# Thread safety locks
print_lock = Lock()
processed_lock = Lock()


def get_file_hash(filepath: str) -> str:
    """Calculate SHA256 hash of file."""
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def extract_text_from_pdf(filepath: str) -> str:
    """Extract text from PDF using pdftotext."""
    try:
        result = subprocess.run(
            ['pdftotext', '-layout', filepath, '-'],
            capture_output=True, text=True, timeout=60
        )
        return result.stdout if result.returncode == 0 else ""
    except Exception as e:
        return f"[PDF PARSE ERROR: {e}]"


def extract_text_from_docx(filepath: str) -> str:
    """Extract text from DOCX using python-docx."""
    try:
        import docx
        doc = docx.Document(filepath)
        return '\n'.join([p.text for p in doc.paragraphs])
    except Exception as e:
        return f"[DOCX PARSE ERROR: {e}]"


def extract_text_from_rtf(filepath: str) -> str:
    """Basic RTF text extraction (strips RTF tags)."""
    try:
        with open(filepath, 'r', errors='ignore') as f:
            content = f.read()
        # Strip RTF tags
        import re
        text = re.sub(r'\\[a-z]+\d*\s?', '', content)
        text = re.sub(r'[{}]', '', text)
        return text
    except Exception as e:
        return f"[RTF PARSE ERROR: {e}]"


def extract_text_from_image(filepath: str, max_size: int = 3000, preprocess: bool = True) -> str:
    """Extract text from image using tesseract OCR with optional preprocessing."""
    temp_path = None
    try:
        input_path = filepath
        if preprocess:
            if not PIL_AVAILABLE:
                return "[OCR PREPROCESS SKIPPED: PIL not available]"
            try:
                img = Image.open(filepath)
                # Convert to grayscale
                if img.mode != 'L':
                    img = img.convert('L')
                # Resize if too large
                if max(img.size) > max_size:
                    ratio = max_size / max(img.size)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)
                # Save to temporary PNG
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    img.save(tmp.name, 'PNG')
                    temp_path = tmp.name
                input_path = temp_path
            except Exception as e:
                return f"[OCR PREPROCESS ERROR: {e}]"

        # Run tesseract
        result = subprocess.run(
            ['tesseract', input_path, 'stdout'],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            return f"[OCR FAILED: {result.stderr[:100]}]"
        text = result.stdout
        return text[:50000] if text else ""
    except subprocess.TimeoutExpired:
        return "[OCR TIMEOUT - image too complex]"
    except FileNotFoundError:
        return "[OCR NOT INSTALLED: tesseract]"
    except Exception as e:
        return f"[OCR ERROR: {e}]"
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass


def process_file(filepath: str, relative_path: str) -> dict | None:
    """Process a single file and return document record. Returns None if skipped."""
    global OCR_ENABLED, MAX_IMAGE_SIZE, PREPROCESS
    try:
        stat = os.stat(filepath)
        ext = Path(filepath).suffix.lower()
    except Exception:
        return None

    # Skip non-document files
    if ext in SKIP_EXTENSIONS:
        return None

    record = {
        "path": relative_path,
        "filename": os.path.basename(filepath),
        "extension": ext,
        "size_bytes": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "hash": get_file_hash(filepath),
        "content": "",
        "content_type": "unknown"
    }

    # Text files
    if ext in TEXT_EXTENSIONS:
        try:
            with open(filepath, 'r', errors='ignore') as f:
                record['content'] = f.read()[:50000]  # Limit content size
            record['content_type'] = 'text'
        except Exception as e:
            record['content'] = f"[TEXT ERROR: {e}]"
            record['content_type'] = 'text_error'

    # Documents
    elif ext == '.pdf':
        record['content'] = extract_text_from_pdf(filepath)[:50000]
        record['content_type'] = 'pdf'

    elif ext in {'.docx', '.doc'}:
        if ext == '.docx':
            record['content'] = extract_text_from_docx(filepath)[:50000]
        else:
            record['content'] = "[DOC format not supported - convert to DOCX]"
        record['content_type'] = 'docx'

    elif ext in {'.xlsx', '.xls'}:
        record['content'] = "[Excel not supported - metadata only]"
        record['content_type'] = 'excel'

    # Images - OCR (if enabled)
    elif ext in IMAGE_EXTENSIONS:
        if OCR_ENABLED:
            record['content'] = extract_text_from_image(filepath, MAX_IMAGE_SIZE, PREPROCESS)[:50000]
            record['content_type'] = 'image'
        else:
            record['content'] = "[Image - OCR disabled for performance]"
            record['content_type'] = 'image_pending'

    # Binary - metadata only
    else:
        record['content'] = "[Binary file - metadata only]"
        record['content_type'] = 'binary_metadata'

    return record


def scan_staging_directory(staging_dir: str) -> list:
    """Scan staging directory and return all files."""
    files = []
    for root, dirs, filenames in os.walk(staging_dir):
        for filename in filenames:
            filepath = os.path.join(root, filename)
            relative_path = os.path.relpath(filepath, staging_dir)
            files.append((filepath, relative_path))
    return files


def main():
    global OCR_ENABLED, OCR_WORKERS, MAX_IMAGE_SIZE, PREPROCESS

    parser = argparse.ArgumentParser(description='Document ingestion pipeline')
    parser.add_argument('--staging', default=STAGING_DIR, help='Staging directory')
    parser.add_argument('--output', default=OUTPUT_FILE, help='Output JSONL file')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of files')
    parser.add_argument('--ocr', action='store_true', help='Enable OCR for images')
    parser.add_argument('--ocr-workers', type=int, default=os.cpu_count() or 4,
                        help='Number of concurrent OCR workers (default: CPU count)')
    parser.add_argument('--max-image-size', type=int, default=3000,
                        help='Maximum dimension for image preprocessing (pixels)')
    parser.add_argument('--no-preprocess', dest='preprocess', action='store_false',
                        help='Disable image preprocessing (resize/grayscale)')
    args = parser.parse_args()

    # Set global OCR flags
    OCR_ENABLED = args.ocr
    OCR_WORKERS = args.ocr_workers
    MAX_IMAGE_SIZE = args.max_image_size
    PREPROCESS = args.preprocess

    print(f"Scanning {args.staging}...")
    files = scan_staging_directory(args.staging)
    print(f"Found {len(files)} files")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    processed = 0
    errors = 0

    if OCR_ENABLED:
        print(f"OCR enabled: {OCR_WORKERS} workers, max_image_size={MAX_IMAGE_SIZE}, preprocess={PREPROCESS}")
        with concurrent.futures.ThreadPoolExecutor(max_workers=OCR_WORKERS) as executor:
            futures = {}
            # Submit all file processing tasks
            for i, (filepath, relative_path) in enumerate(files):
                if args.limit and i >= args.limit:
                    break
                future = executor.submit(process_file, filepath, relative_path)
                futures[future] = relative_path

            with open(args.output, 'w') as outfile:
                for future in concurrent.futures.as_completed(futures):
                    try:
                        record = future.result()
                        if record is not None:
                            outfile.write(json.dumps(record) + '\n')
                            with processed_lock:
                                processed += 1
                                if processed % 100 == 0:
                                    with print_lock:
                                        print(f"Processed {processed} documents...")
                    except Exception as e:
                        errors += 1
                        with print_lock:
                            print(f"Error in worker: {e}")
    else:
        # Sequential processing (original behavior)
        with open(args.output, 'w') as outfile:
            for i, (filepath, relative_path) in enumerate(files):
                if args.limit and i >= args.limit:
                    break
                try:
                    record = process_file(filepath, relative_path)
                    if record is not None:
                        outfile.write(json.dumps(record) + '\n')
                        processed += 1
                        if processed % 100 == 0:
                            print(f"Processed {processed} documents...")
                except Exception as e:
                    errors += 1
                    print(f"Error processing {filepath}: {e}")

    print(f"\nComplete!")
    print(f"Processed: {processed}")
    print(f"Errors: {errors}")
    print(f"Output: {args.output}")


if __name__ == '__main__':
    main()
