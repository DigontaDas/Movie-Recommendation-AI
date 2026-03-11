import requests  # library for making HTTP requests

OLLAMA_URL = "http://localhost:11434/api/generate"  # the endpoint

def ask_ollama(prompt):
    payload = {
        "model": "llama3",      # model name
        "prompt": prompt,         # the input text
        "stream": False           # we don't want streaming
    }
    
    response = requests.post(OLLAMA_URL, json=payload)
    return response.json()["response"]  # parse JSON and get the text


if __name__ == "__main__":
    print(ask_ollama("Name one popular sci-fi movie in one sentence."))
