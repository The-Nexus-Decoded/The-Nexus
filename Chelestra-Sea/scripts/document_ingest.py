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
"""

import os
import json
import hashlib
import subprocess
from pathlib import Path
from datetime import datetime
import argparse

STAGING_DIR = "/data/openclaw/staging"
OUTPUT_FILE = "/data/openclaw/document-db/ingested.jsonl"

# File type handlers
TEXT_EXTENSIONS = {'.txt', '.rtf', '.md', '.json', '.csv', '.xml', '.html', '.htm'}
DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.xlsx', '.doc', '.xls'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif'}
# Binary extensions - metadata only
BINARY_EXTENSIONS = {'.dll', '.exe', '.assetbundle', '.rom', '.mp3', '.mp4', '.wav', '.zip', '.tar', '.gz'}


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


def extract_text_from_image(filepath: str) -> str:
    """Extract text from image using tesseract OCR."""
    try:
        result = subprocess.run(
            ['tesseract', filepath, 'stdout'],
            capture_output=True, text=True, timeout=120
        )
        return result.stdout if result.returncode == 0 else ""
    except FileNotFoundError:
        return "[OCR NOT INSTALLED: tesseract]"
    except Exception as e:
        return f"[OCR ERROR: {e}]"


def process_file(filepath: str, relative_path: str) -> dict:
    """Process a single file and return document record."""
    stat = os.stat(filepath)
    ext = Path(filepath).suffix.lower()
    
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
    
    # Images - OCR
    elif ext in IMAGE_EXTENSIONS:
        record['content'] = extract_text_from_image(filepath)[:50000]
        record['content_type'] = 'image_ocr'
    
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
    parser = argparse.ArgumentParser(description='Document ingestion pipeline')
    parser.add_argument('--staging', default=STAGING_DIR, help='Staging directory')
    parser.add_argument('--output', default=OUTPUT_FILE, help='Output JSONL file')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of files')
    args = parser.parse_args()
    
    print(f"Scanning {args.staging}...")
    files = scan_staging_directory(args.staging)
    print(f"Found {len(files)} files")
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    processed = 0
    errors = 0
    
    with open(args.output, 'w') as outfile:
        for i, (filepath, relative_path) in enumerate(files):
            if args.limit and i >= args.limit:
                break
            
            try:
                record = process_file(filepath, relative_path)
                outfile.write(json.dumps(record) + '\n')
                processed += 1
                
                if processed % 100 == 0:
                    print(f"Processed {processed} files...")
                    
            except Exception as e:
                errors += 1
                print(f"Error processing {filepath}: {e}")
    
    print(f"\nComplete!")
    print(f"Processed: {processed}")
    print(f"Errors: {errors}")
    print(f"Output: {args.output}")


if __name__ == '__main__':
    main()
