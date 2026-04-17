"""
db/sqlite_store.py
Persists user queries and recommendation results to SQLite.
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data" / "history.db"


def _get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    with _get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS queries (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                query_text  TEXT NOT NULL,
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS recommendations (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                query_id        INTEGER NOT NULL REFERENCES queries(id),
                rank            INTEGER NOT NULL,
                movie_id        TEXT,
                title           TEXT NOT NULL,
                year            TEXT,
                genre           TEXT,
                score           REAL,
                reason          TEXT,
                poster_url      TEXT,
                created_at      TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_recommendations_query_id
                ON recommendations(query_id);
        """)


def save_query_and_results(
    query_text: str,
    results: list[dict],
) -> int:
    """
    Save a query and its ranked results.

    Each result dict is expected to have at minimum:
        title, and optionally: movie_id, year, genre, score, reason, poster_url

    Returns the query_id (int) for reference.
    """
    now = datetime.utcnow().isoformat()
    with _get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO queries (query_text, created_at) VALUES (?, ?)",
            (query_text, now),
        )
        query_id = cur.lastrowid

        conn.executemany(
            """
            INSERT INTO recommendations
                (query_id, rank, movie_id, title, year, genre, score, reason, poster_url, created_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    query_id,
                    rank,
                    r.get("movie_id"),
                    r.get("title", "Unknown"),
                    r.get("year"),
                    r.get("genre"),
                    r.get("score"),
                    r.get("reason"),
                    r.get("poster_url"),
                    now,
                )
                for rank, r in enumerate(results, start=1)
            ],
        )
    return query_id


def get_history(limit: int = 20, offset: int = 0) -> list[dict]:
    """
    Return past queries with their recommendations, newest first.
    """
    with _get_connection() as conn:
        rows = conn.execute(
            """
            SELECT q.id, q.query_text, q.created_at,
                   r.rank, r.movie_id, r.title, r.year,
                   r.genre, r.score, r.reason, r.poster_url
            FROM queries q
            JOIN recommendations r ON r.query_id = q.id
            ORDER BY q.id DESC, r.rank ASC
            LIMIT ? OFFSET ?
            """,
            (limit * 10, offset),          # fetch enough rows; grouped below
        ).fetchall()

    # Group recommendations under their parent query
    grouped: dict[int, dict] = {}
    for row in rows:
        qid = row["id"]
        if qid not in grouped:
            grouped[qid] = {
                "query_id": qid,
                "query_text": row["query_text"],
                "created_at": row["created_at"],
                "recommendations": [],
            }
        grouped[qid]["recommendations"].append({
            "rank":       row["rank"],
            "movie_id":   row["movie_id"],
            "title":      row["title"],
            "year":       row["year"],
            "genre":      row["genre"],
            "score":      row["score"],
            "reason":     row["reason"],
            "poster_url": row["poster_url"],
        })

    return list(grouped.values())[:limit]


def get_query_by_id(query_id: int) -> Optional[dict]:
    """Fetch a single saved query and its results by ID."""
    with _get_connection() as conn:
        q = conn.execute(
            "SELECT * FROM queries WHERE id = ?", (query_id,)
        ).fetchone()
        if not q:
            return None

        recs = conn.execute(
            """
            SELECT rank, movie_id, title, year, genre, score, reason, poster_url
            FROM recommendations
            WHERE query_id = ?
            ORDER BY rank ASC
            """,
            (query_id,),
        ).fetchall()

    return {
        "query_id":        q["id"],
        "query_text":      q["query_text"],
        "created_at":      q["created_at"],
        "recommendations": [dict(r) for r in recs],
    }