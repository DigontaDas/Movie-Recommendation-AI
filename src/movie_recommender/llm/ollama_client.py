import requests

def ollama_generate(prompt: str, model: str = "qwen3-coder:30b", url: str = "http://localhost:11434") -> str:
    r = requests.post(
        f"{url}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False},
        timeout=120,
    )
    r.raise_for_status()
    return r.json()["response"]


if __name__ == "__main__":
    print(ollama_generate("best romantic movie with a twist at the end"))