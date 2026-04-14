"""
api/main.py
FastAPI app — exposes the Movie Recommendation pipeline via REST.

Endpoints
---------
POST /recommend          — run pipeline, save + return results
GET  /history            — list past queries
GET  /history/{query_id} — single saved query with its results
GET  /health             — liveness check
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from db.sqlite_store import init_db, save_query_and_results, get_history, get_query_by_id
from recommender.pipeline import run_pipeline   # your Phase 3 pipeline

# ── App setup ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Movie Recommendation AI",
    description="Vector search + LLM reranking pipeline exposed as a REST API.",
    version="1.0.0",
)

# Allow the React Netflix front-end (localhost:5173 / 3000) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── DB init on startup ─────────────────────────────────────────────────────────

@app.on_event("startup")
def startup_event():
    init_db()


# ── Schemas ────────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500, example="Mind-bending sci-fi thriller like Inception")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of final recommendations to return")


class MovieResult(BaseModel):
    rank:       int
    movie_id:   Optional[str]
    title:      str
    year:       Optional[str]
    genre:      Optional[str]
    score:      Optional[float]
    reason:     Optional[str]
    poster_url: Optional[str]


class RecommendResponse(BaseModel):
    query_id:        int
    query:           str
    recommendations: list[MovieResult]


class HistoryItem(BaseModel):
    query_id:        int
    query_text:      str
    created_at:      str
    recommendations: list[MovieResult]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Meta"])
def health_check():
    return {"status": "ok"}


@app.post("/recommend", response_model=RecommendResponse, tags=["Recommendation"])
def recommend(body: RecommendRequest):
    """
    Run the full pipeline:
      1. Embed the query
      2. Search Qdrant for top candidates
      3. Rerank with Ollama / LLaMA
      4. Persist to SQLite
      5. Return ranked results
    """
    try:
        results: list[dict] = run_pipeline(body.query, top_k=body.top_k)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")

    if not results:
        raise HTTPException(status_code=404, detail="No recommendations found for this query.")

    query_id = save_query_and_results(body.query, results)

    return RecommendResponse(
        query_id=query_id,
        query=body.query,
        recommendations=[MovieResult(rank=i + 1, **r) for i, r in enumerate(results)],
    )


@app.get("/history", response_model=list[HistoryItem], tags=["History"])
def list_history(
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """Return the most recent recommendation queries with their results."""
    return get_history(limit=limit, offset=offset)


@app.get("/history/{query_id}", response_model=HistoryItem, tags=["History"])
def get_single_history(query_id: int):
    """Fetch a single saved query and its results by ID."""
    record = get_query_by_id(query_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Query #{query_id} not found.")
    return record