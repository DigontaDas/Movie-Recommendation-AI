import requests

from movie_recommender.config import get_settings


def ollama_generate(prompt: str, model: str | None = None, url: str | None = None) -> str:
    settings = get_settings()
    resolved_url = (url or settings.ollama_base_url).rstrip("/")
    resolved_model = model or settings.ollama_model
    timeout = settings.ollama_timeout

    endpoints = [
        (
            f"{resolved_url}/api/generate",
            {"model": resolved_model, "prompt": prompt, "stream": False},
            "generate",
        ),
        (
            f"{resolved_url}/api/chat",
            {
                "model": resolved_model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
            },
            "chat",
        ),
    ]

    last_error: Exception | None = None
    for endpoint, payload, mode in endpoints:
        try:
            response = requests.post(endpoint, json=payload, timeout=timeout)
            response.raise_for_status()
            data = response.json()
            if mode == "generate":
                return data["response"]
            return data["message"]["content"]
        except Exception as exc:
            last_error = exc
            continue

    raise RuntimeError(
        f"Ollama request failed for base URL '{resolved_url}' and model '{resolved_model}'."
    ) from last_error


if __name__ == "__main__":
    print(ollama_generate("best romantic movie with a twist at the end"))
