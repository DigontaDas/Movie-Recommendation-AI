"""
recommender/rerank.py

Takes the raw candidates from ChromaDB (retrieve.py) and asks Ollama
to pick the best ones and explain WHY each movie fits the user's query.

Flow:
    candidates (list of movie dicts from ChromaDB)
        ↓
    Build a prompt describing all candidates + user query
        ↓
    Send to Ollama (LLaMA 3.1)
        ↓
    Parse LLM response → ranked list with reasons
        ↓
    Return top_n results matching main.py's expected format
"""

from __future__ import annotations

import json
import re
import os
import requests

from dotenv import load_dotenv
from movie_recommender.config import ROOT_DIR
load_dotenv(ROOT_DIR / ".env", override=True)

# ── Config ────────────────────────────────────────────────────────────────────

OLLAMA_URL   = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:3b"
TIMEOUT      = 120  # seconds

TMDB_API_KEY = os.getenv("TMDB_API_KEY") or os.getenv("VITE_TMDB_API_KEY") 
TMDB_BASE    = "https://api.themoviedb.org/3"
TMDB_IMG     = "https://image.tmdb.org/t/p/w500"
# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(query: str, candidates: list[dict]) -> str:
    """
    Build the prompt we send to the LLM.
    We give it the user query + all candidate movies and ask it to
    rank and explain the top ones in strict JSON format.
    """
    candidate_lines = []
    for i, movie in enumerate(candidates):
        title      = movie.get("clean_title") or movie.get("title", "Unknown")
        year       = movie.get("year", "")
        genres     = movie.get("genres_str") or movie.get("genres", "")
        avg_rating = movie.get("avg_rating", "")
        tags       = movie.get("tags_text", "")

        line = f'{i+1}. "{title}" ({year}) | Genres: {genres} | Rating: {avg_rating}'
        if tags:
            line += f" | Tags: {tags}"
        candidate_lines.append(line)

    candidates_text = "\n".join(candidate_lines)

    prompt = f"""You are a movie recommendation expert. A user is looking for: "{query}"

Here are {len(candidates)} candidate movies retrieved by a vector search:

{candidates_text}

Your task:
- Pick the TOP 5 movies that best match what the user is looking for.
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
  }},
  ...
]

Remember: respond with ONLY the JSON array, nothing else."""

    return prompt


# ── LLM call ──────────────────────────────────────────────────────────────────

def _call_ollama(prompt: str) -> str:
    """Send prompt to Ollama and return raw text response."""
    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model":  OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
        },
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    return response.json()["response"]


# ── JSON parser ───────────────────────────────────────────────────────────────





def _fetch_poster(title: str, year: str) -> str | None:
    if not TMDB_API_KEY:
        print(f"Warning: TMDB_API_KEY missing")
        return None
    
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_API_KEY}"
    }
    
    # Try 1: with year
    # Try 2: without year (year mismatch between MovieLens and TMDB is common)
    attempts = [
        {"query": title, "year": year} if year and year != "0" else {"query": title},
        {"query": title},  # fallback without year
    ]
    
    for params in attempts:
        try:
            r = requests.get(
                f"{TMDB_BASE}/search/movie",
                params=params,
                headers=headers,
                timeout=5,
            )
            r.raise_for_status()
            results = r.json().get("results", [])
            if results and results[0].get("poster_path"):
                return f"{TMDB_IMG}{results[0]['poster_path']}"
        except Exception as e:
            print(f"Poster fetch error for '{title}': {e}")
            continue
    
    return None
def _parse_llm_response(raw: str, candidates: list[dict], top_n: int) -> list[dict]:
    # Strip any accidental markdown fences the LLM might add
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()

    # Find the JSON array even if LLM added text before/after
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find JSON array in LLM response:\n{raw[:500]}")

    ranked = json.loads(match.group())

    # Build a lookup from title → candidate metadata (for movie_id etc.)
    title_lookup: dict[str, dict] = {}
    for c in candidates:
        key = (c.get("clean_title") or c.get("title", "")).lower().strip()
        title_lookup[key] = c

    results = []
    for item in ranked[:top_n]:
        title     = item.get("title", "Unknown")
        lookup_key = title.lower().strip()
        candidate  = title_lookup.get(lookup_key, {})

        results.append({
            "movie_id":  str(candidate.get("movieId", "")),
            "title":     title,
            "year":      str(item.get("year") or candidate.get("year", "")),
            "genre":     item.get("genre") or candidate.get("genres_str", ""),
            "score":     float(item.get("score", 0.0)),
            "reason":    item.get("reason", ""),
           "poster_url": _fetch_poster(
    candidate.get("clean_title") or title,   
    str(candidate.get("year", "") or item.get("year", ""))
),
        })

    return results


# ── Fallback ──────────────────────────────────────────────────────────────────

def _fallback_results(candidates: list[dict], top_n: int) -> list[dict]:
    """
    If Ollama fails or returns unparseable output,
    fall back to returning the top candidates by ChromaDB score.
    """
    results = []
    for c in candidates[:top_n]:
        title = c.get("clean_title") or c.get("title", "Unknown")
        results.append({
            "movie_id":  str(c.get("movieId", "")),
            "title":     title,
            "year":      str(c.get("year", "")),
            "genre":     c.get("genres_str", ""),
            "score":     float(c.get("avg_rating", 0.0)),
            "reason":    "Matched by semantic similarity to your query.",
            "poster_url": _fetch_poster(title, str(c.get("year", ""))),
        })
    return results


# ── Public API ────────────────────────────────────────────────────────────────

def rerank(query: str, candidates: list[dict], top_n: int = 5) -> list[dict]:
    """
    Rerank ChromaDB candidates using Ollama LLM.

    Parameters
    ----------
    query:      original user query string
    candidates: list of movie metadata dicts from retrieve.py
    top_n:      how many final results to return

    Returns
    -------
    List of dicts matching main.py's MovieResult schema, ranked best → worst.
    Falls back to score-based ranking if LLM call fails.
    """
    if not candidates:
        return []

    prompt = _build_prompt(query, candidates)

    try:
        raw_response = _call_ollama(prompt)
        results      = _parse_llm_response(raw_response, candidates, top_n)
        return results
    except Exception as e:
        print(f"[rerank] Ollama reranking failed: {e}. Using fallback.")
        return _fallback_results(candidates, top_n)