#!/bin/bash
set -euo pipefail

echo "=== vLLM Installation ==="
echo "Time: $(date)"
echo "CUDA Version: $(nvcc --version 2>&1 | grep 'release' || echo 'nvcc not found')"
echo "GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo 'nvidia-smi not found')"

# Install prerequisites with system package override
echo "Installing prerequisites..."
pip install --upgrade pip setuptools --break-system-packages
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --break-system-packages

# Try installing vLLM with retries
MAX_RETRIES=3
RETRY_DELAY=30

for ((i=1; i<=MAX_RETRIES; i++)); do
    echo "Attempt $i/$MAX_RETRIES: Installing vLLM..."
    if pip install vllm --no-cache-dir --timeout=300 --break-system-packages; then
        echo "vLLM installed successfully"
        break
    else
        echo "Attempt $i failed. Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo "All retries exhausted. Exiting."
        exit 1
    fi
done

# Verify installation
echo "Verifying vLLM installation..."
python -c "import vllm; print('vLLM version:', vllm.__version__)" || {
    echo "vLLM import failed!"
    exit 1
}

echo "=== vLLM installation complete ==="
echo "Time: $(date)"