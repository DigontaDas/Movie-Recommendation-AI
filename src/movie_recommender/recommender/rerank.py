"""
recommender/rerank.py

Takes the raw candidates from ChromaDB and asks the configured Ollama
endpoint to rank the best matches and explain why they fit.
"""

from __future__ import annotations

import json
import re

import requests

from movie_recommender.config import get_settings

SETTINGS = get_settings()
OLLAMA_URL = SETTINGS.ollama_base_url.rstrip("/")
OLLAMA_MODEL = SETTINGS.ollama_model
TIMEOUT = SETTINGS.ollama_timeout

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMG = "https://image.tmdb.org/t/p/w500"


def _build_prompt(query: str, candidates: list[dict], top_n: int) -> str:
    candidate_lines = []
    for i, movie in enumerate(candidates, start=1):
        title = movie.get("clean_title") or movie.get("title", "Unknown")
        year = movie.get("year", "")
        genres = movie.get("genres_str") or movie.get("genres", "")
        avg_rating = movie.get("avg_rating", "")
        tags = movie.get("tags_text", "")

        line = f'{i}. "{title}" ({year}) | Genres: {genres} | Rating: {avg_rating}'
        if tags:
            line += f" | Tags: {tags}"
        candidate_lines.append(line)

    candidates_text = "\n".join(candidate_lines)

    return f"""You are a movie recommendation expert. A user is looking for: "{query}"

Here are {len(candidates)} candidate movies retrieved by a vector search:

{candidates_text}

Your task:
- Pick the TOP {top_n} movies that best match what the user is looking for.
- For each, write a short 1-2 sentence reason explaining WHY it fits their request.
- Rank them from best match (#1) to least.

Respond ONLY with a valid JSON array. No extra text, no markdown, no explanation outside the JSON.
Use exactly this format:

[
  {{
    "rank": 1,
    "title": "Movie Title",
    "year": "1999",
    "genre": "Sci-Fi / Action",
    "score": 0.95,
    "reason": "This movie fits because..."
  }}
]
"""


def _call_ollama(prompt: str) -> str:
    generate_payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    chat_payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }

    endpoints = [
        (f"{OLLAMA_URL}/api/generate", generate_payload, "generate"),
        (f"{OLLAMA_URL}/api/chat", chat_payload, "chat"),
    ]

    last_error: Exception | None = None
    for url, payload, mode in endpoints:
        try:
            response = requests.post(url, json=payload, timeout=TIMEOUT)
            response.raise_for_status()
            data = response.json()
            if mode == "generate":
                return data["response"]
            return data["message"]["content"]
        except Exception as exc:
            last_error = exc
            continue

    raise RuntimeError(
        f"Ollama reranking failed for base URL '{OLLAMA_URL}' and model '{OLLAMA_MODEL}'."
    ) from last_error


def _fetch_poster(title: str, year: str) -> str | None:
    tmdb_bearer_token = SETTINGS.effective_tmdb_bearer_token
    tmdb_api_key = SETTINGS.tmdb_api_key

    if not tmdb_bearer_token and not tmdb_api_key:
        return None

    headers = {"accept": "application/json"}
    base_params: dict[str, str] = {}

    if tmdb_bearer_token:
        headers["Authorization"] = f"Bearer {tmdb_bearer_token}"
    elif tmdb_api_key:
        base_params["api_key"] = tmdb_api_key

    attempts = [
        {"query": title, "year": year} if year and year != "0" else {"query": title},
        {"query": title},
    ]

    for params in attempts:
        try:
            response = requests.get(
                f"{TMDB_BASE}/search/movie",
                params={**base_params, **params},
                headers=headers,
                timeout=5,
            )
            response.raise_for_status()
            results = response.json().get("results", [])
            if results and results[0].get("poster_path"):
                return f"{TMDB_IMG}{results[0]['poster_path']}"
        except Exception:
            continue

    return None


def _parse_llm_response(raw: str, candidates: list[dict], top_n: int) -> list[dict]:
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find JSON array in LLM response:\n{raw[:500]}")

    ranked = json.loads(match.group())

    title_lookup: dict[str, dict] = {}
    for candidate in candidates:
        key = (candidate.get("clean_title") or candidate.get("title", "")).lower().strip()
        title_lookup[key] = candidate

    results = []
    used_titles: set[str] = set()
    for item in ranked[:top_n]:
        title = item.get("title", "Unknown")
        lookup_key = title.lower().strip()
        candidate = title_lookup.get(lookup_key, {})
        used_titles.add(lookup_key)

        results.append(
            {
                "movie_id": str(candidate.get("movieId", "")),
                "title": title,
                "year": str(item.get("year") or candidate.get("year", "")),
                "genre": item.get("genre") or candidate.get("genres_str", ""),
                "score": float(candidate.get("avg_rating") or item.get("score", 0.0)),
                "reason": item.get("reason", ""),
                "poster_url": _fetch_poster(
                    candidate.get("clean_title") or title,
                    str(candidate.get("year", "") or item.get("year", "")),
                ),
            }
        )

    if len(results) < top_n:
        next_rank = len(results) + 1
        for candidate in candidates:
            lookup_key = (
                candidate.get("clean_title") or candidate.get("title", "")
            ).lower().strip()
            if not lookup_key or lookup_key in used_titles:
                continue

            title = candidate.get("clean_title") or candidate.get("title", "Unknown")
            results.append(
                {
                    "rank": next_rank,
                    "movie_id": str(candidate.get("movieId", "")),
                    "title": title,
                    "year": str(candidate.get("year", "")),
                    "genre": candidate.get("genres_str", ""),
                    "score": float(candidate.get("avg_rating", 0.0)),
                    "reason": "Matched by semantic similarity to your query.",
                    "poster_url": _fetch_poster(title, str(candidate.get("year", ""))),
                }
            )
            used_titles.add(lookup_key)
            next_rank += 1
            if len(results) >= top_n:
                break

    return results


def _fallback_results(candidates: list[dict], top_n: int) -> list[dict]:
    results = []
    for candidate in candidates[:top_n]:
        title = candidate.get("clean_title") or candidate.get("title", "Unknown")
        results.append(
            {
                "movie_id": str(candidate.get("movieId", "")),
                "title": title,
                "year": str(candidate.get("year", "")),
                "genre": candidate.get("genres_str", ""),
                "score": float(candidate.get("avg_rating", 0.0)),
                "reason": "Matched by semantic similarity to your query.",
                "poster_url": _fetch_poster(title, str(candidate.get("year", ""))),
            }
        )
    return results


def rerank(query: str, candidates: list[dict], top_n: int = 5) -> list[dict]:
    if not candidates:
        return []

    # Skip Ollama if disabled in settings (e.g. for production free tier)
    if not SETTINGS.enable_ollama:
        print("[rerank] Ollama is disabled. Using fallback semantic results.")
        return _fallback_results(candidates, top_n)

    prompt = _build_prompt(query, candidates, top_n)

    try:
        raw_response = _call_ollama(prompt)
        return _parse_llm_response(raw_response, candidates, top_n)
    except Exception as exc:
        print(f"[rerank] Ollama reranking failed: {exc}. Using fallback.")
        return _fallback_results(candidates, top_n)
