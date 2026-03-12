from vllm import LLM, SamplingParams
import multiprocessing

if __name__ == '__main__':
    multiprocessing.set_start_method('spawn', force=True)
    prompts = ['Hello, my name is']
    sampling_params = SamplingParams(temperature=0.8, top_p=0.95)
    llm = LLM(model='/data/repos/Qwen3.5-2B', gpu_memory_utilization=0.7, enforce_eager=True)
    outputs = llm.generate(prompts, sampling_params)
    for output in outputs:
        print(f'Prompt: {output.prompt!r} Generated text: {output.outputs[0].text!r}')
