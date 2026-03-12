#!/bin/bash
set -euo pipefail
cd /data/repos/vllm
# Correct path to requirements
pip install -r requirements/build.txt --break-system-packages
export TORCH_CUDA_ARCH_LIST='6.1'
# Build and install in editable mode
pip install -e . --break-system-packages
