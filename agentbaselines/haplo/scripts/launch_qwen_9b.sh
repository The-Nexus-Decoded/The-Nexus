#!/bin/bash
/home/openclaw/.local/bin/vllm serve /data/repos/Qwen3.5-9B \
  --host 0.0.0.0 --port 8000 \
  --tensor-parallel-size 2 \
  --gpu-memory-utilization 0.9 \
  --max-model-len 262144 \
  --enforce-eager \
  --swap-space 4
