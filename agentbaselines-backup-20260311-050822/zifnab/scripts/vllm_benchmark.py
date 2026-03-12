import time
from vllm import LLM, SamplingParams
import multiprocessing

if __name__ == '__main__':
    multiprocessing.set_start_method('spawn', force=True)
    print('Initiating Trial of the 2080...')
    prompts = ['The history of the Nexus Decoded is'] * 5
    sampling_params = SamplingParams(temperature=0.0, max_tokens=128)
    
    print('Loading model into VRAM...')
    llm = LLM(model='/data/repos/Qwen3.5-2B', gpu_memory_utilization=0.7, enforce_eager=True)
    
    print('Starting Generation...')
    start_time = time.time()
    outputs = llm.generate(prompts, sampling_params)
    end_time = time.time()
    
    total_tokens = sum(len(output.outputs[0].token_ids) for output in outputs)
    duration = end_time - start_time
    tps = total_tokens / duration
    
    print(f'--- Benchmark Results ---')
    print(f'Total Tokens: {total_tokens}')
    print(f'Duration: {duration:.2f}s')
    print(f'Tokens per Second: {tps:.2f}')
