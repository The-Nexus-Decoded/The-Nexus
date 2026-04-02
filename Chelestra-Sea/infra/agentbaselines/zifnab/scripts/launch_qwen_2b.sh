#!/bin/bash
/home/openclaw/.local/bin/vllm serve /data/repos/Qwen3.5-2B \
  --host 0.0.0.0 --port 8000 \
  --gpu-memory-utilization 0.9 \
  --max-model-len 32768 \
  --enforce-eager \
  --swap-space 4
