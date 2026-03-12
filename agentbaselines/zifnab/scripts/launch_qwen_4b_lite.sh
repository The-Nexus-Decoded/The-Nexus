#!/bin/bash
/home/openclaw/.local/bin/vllm serve /data/repos/Qwen3.5-4B \
  --host 0.0.0.0 --port 8000 \
  --gpu-memory-utilization 0.8 \
  --max-model-len 8192 \
  --language-model-only \
  --enforce-eager \
  --swap-space 4
