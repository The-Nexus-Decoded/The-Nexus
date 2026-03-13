#!/bin/bash
set -euo pipefail
echo 'Installing CUDA Toolkit 12.6...'
sudo apt-get update
sudo apt-get install -y cuda-toolkit-12-6
echo 'CUDA Toolkit installation complete.'
