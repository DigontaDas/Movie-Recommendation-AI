import requests  # library for making HTTP requests

OLLAMA_URL = "http://localhost:11434/api/generate"  # the endpoint

def ollama_generate(prompt: str, model: str = "llama3.1:8b", url: str = "http://localhost:11434") -> str:
    r = requests.post(
        f"{url}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False},
        timeout=120,
    )
    r.raise_for_status()
    return r.json()["response"]  # parse JSON and get the text


if __name__ == "__main__":
    print(ask_ollama("Name one popular sci-fi movie in one sentence."))
