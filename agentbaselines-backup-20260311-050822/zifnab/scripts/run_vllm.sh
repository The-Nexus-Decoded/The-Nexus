#!/bin/bash
export VLLM_USE_V1=0
exec /home/openclaw/.local/bin/vllm serve /data/repos/Qwen3.5-9B-AWQ \
  --quantization awq \
  --host 0.0.0.0 --port 8000 \
  --gpu-memory-utilization 0.7 \
  --max-model-len 8192 \
  --enforce-eager \
  > /data/openclaw/logs/vllm_final.log 2>&1
