import gradio as gr
from openai import OpenAI
client = OpenAI(base_url='http://localhost:8000/v1', api_key='empty')
def predict(message, history):
    history_openai = []
    for human, assistant in history:
        history_openai.append({'role': 'user', 'content': human})
        history_openai.append({'role': 'assistant', 'content': assistant})
    history_openai.append({'role': 'user', 'content': message})
    response = client.chat.completions.create(
        model='/data/repos/Qwen3.5-9B-AWQ',
        messages=history_openai,
        stream=True
    )
    partial_message = ''
    for chunk in response:
        if chunk.choices[0].delta.content is not None:
            partial_message = partial_message + chunk.choices[0].delta.content
            yield partial_message
gr.ChatInterface(predict, title='Qwen 3.5-9B-AWQ Nexus Dashboard').launch(server_name='0.0.0.0', server_port=7860)
