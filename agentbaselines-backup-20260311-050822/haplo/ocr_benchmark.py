#!/usr/bin/env python3
"""
OCR Benchmark Script
Compares performance of Tesseract vs EasyOCR on a sample of images.
"""

import time
import subprocess
from pathlib import Path
import json
from datetime import datetime

# Sample images to benchmark
SAMPLE_IMAGES = [
    "/data/openclaw/staging/Guild Wars 2/Screens/gw001.jpg",
    "/data/openclaw/staging/IDS/1daXKWn.jpg",
    "/data/openclaw/staging/IDS/IMG_8523.jpg",
    "/data/openclaw/staging/IDS/Medical/Screenshot 2026-01-20 085856.png",
    "/data/openclaw/staging/IDS/IMG_1317.jpg",
]

def benchmark_tesseract(image_path: str) -> dict:
    """Benchmark tesseract OCR."""
    start = time.time()
    try:
        result = subprocess.run(
            ['tesseract', image_path, 'stdout'],
            capture_output=True, text=True, timeout=30
        )
        elapsed = time.time() - start
        success = result.returncode == 0
        text_len = len(result.stdout) if success else 0
        return {
            "engine": "tesseract",
            "image": Path(image_path).name,
            "elapsed_sec": round(elapsed, 3),
            "success": success,
            "text_length": text_len,
            "error": result.stderr.decode()[:100] if result.stderr else None
        }
    except subprocess.TimeoutExpired:
        return {
            "engine": "tesseract",
            "image": Path(image_path).name,
            "elapsed_sec": 30.0,
            "success": False,
            "text_length": 0,
            "error": "TIMEOUT"
        }
    except Exception as e:
        return {
            "engine": "tesseract",
            "image": Path(image_path).name,
            "elapsed_sec": round(time.time() - start, 3),
            "success": False,
            "text_length": 0,
            "error": str(e)
        }

def benchmark_easyocr(image_path: str) -> dict:
    """Benchmark EasyOCR."""
    try:
        import easyocr
        reader = easyocr.Reader(['en'], gpu=False)  # CPU for consistent comparison
    except ImportError:
        return {
            "engine": "easyocr",
            "image": Path(image_path).name,
            "elapsed_sec": 0,
            "success": False,
            "text_length": 0,
            "error": "EasyOCR not installed"
        }
    
    start = time.time()
    try:
        result = reader.readtext(image_path, detail=0, paragraph=True)
        elapsed = time.time() - start
        text = '\n'.join(result)
        return {
            "engine": "easyocr",
            "image": Path(image_path).name,
            "elapsed_sec": round(elapsed, 3),
            "success": True,
            "text_length": len(text),
            "error": None
        }
    except Exception as e:
        return {
            "engine": "easyocr",
            "image": Path(image_path).name,
            "elapsed_sec": round(time.time() - start, 3),
            "success": False,
            "text_length": 0,
            "error": str(e)
        }

def main():
    print("OCR Benchmark: Tesseract vs EasyOCR")
    print("=" * 60)
    
    results = []
    
    # Benchmark Tesseract
    print("\nBenchmarking Tesseract...")
    tesseract_times = []
    for img in SAMPLE_IMAGES:
        result = benchmark_tesseract(img)
        results.append(result)
        if result['success']:
            tesseract_times.append(result['elapsed_sec'])
        status = "✓" if result['success'] else "✗"
        print(f"  {status} {result['image']}: {result['elapsed_sec']:.3f}s")
    
    # Benchmark EasyOCR
    print("\nBenchmarking EasyOCR...")
    easyocr_times = []
    for img in SAMPLE_IMAGES:
        result = benchmark_easyocr(img)
        results.append(result)
        if result['success']:
            easyocr_times.append(result['text_length'])
        status = "✓" if result['success'] else "✗"
        print(f"  {status} {result['image']}: {result['elapsed_sec']:.3f}s")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if tesseract_times:
        avg_tesseract = sum(tesseract_times) / len(tesseract_times)
        print(f"Tesseract average: {avg_tesseract:.3f}s per image")
    else:
        print("Tesseract: no successful runs")
    
    if easyocr_times:
        avg_easyocr = sum(easyocr_times) / len(easyocr_times)
        print(f"EasyOCR average: {avg_easyocr:.3f}s per image")
    else:
        print("EasyOCR: no successful runs")
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"/data/openclaw/workspace/ocr_benchmark_{timestamp}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nDetailed results saved to: {output_file}")

if __name__ == '__main__':
    main()