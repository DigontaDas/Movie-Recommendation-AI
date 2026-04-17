"""
recommender/pipeline.py

The single entry point for the entire recommendation flow.
main.py calls run_pipeline() and gets back a ranked list of movies.

Flow:
    User query (string)
        ↓
    retrieve.py  — embed query → search ChromaDB → top 20 candidates
        ↓
    rerank.py    — send candidates to Ollama → ranked top 5 with reasons
        ↓
    list[dict]   — matches main.py's MovieResult schema
"""

from __future__ import annotations

# Retrieve candidates from ChromaDB
from movie_recommender.recommender.retrieve import retrieve_movies

# Rerank with Ollama LLM
from movie_recommender.recommender.rerank import rerank

# How many candidates to fetch from ChromaDB before reranking
RETRIEVAL_K = 20


def run_pipeline(query: str, top_k: int = 5) -> list[dict]:
    """
    Full end-to-end recommendation pipeline.

    Parameters
    ----------
    query:  natural language query from the user
            e.g. "mind-bending sci-fi thriller like Inception"
    top_k:  number of final recommendations to return (default 5)

    Returns
    -------
    List of dicts, each containing:
        movie_id, title, year, genre, score, reason, poster_url
    Ordered from best match (#1) to least.

    Example
    -------
    >>> results = run_pipeline("fun animated movie for kids")
    >>> results[0]["title"]
    'Toy Story'
    >>> results[0]["reason"]
    'A beloved Pixar classic that perfectly matches...'
    """
    # ── Step 1: Retrieve top candidates from ChromaDB ─────────────────────
    # We fetch more than top_k so the LLM has enough to choose from
    candidates = retrieve_movies(query, k=RETRIEVAL_K)

    if not candidates:
        return []

    # ── Step 2: Rerank with Ollama and return final results ───────────────
    results = rerank(query, candidates, top_n=top_k)

    return results
