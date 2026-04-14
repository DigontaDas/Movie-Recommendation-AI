"""
tests/test_loader.py

Unit tests for the MovieLens loader and preprocessing pipeline.
Uses in-memory fake CSVs — no real files needed.
"""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest

from movie_recommender.data.preprocess import (
    aggregate_tags,
    build_movie_records,
    clean_title,
    compute_rating_stats,
    extract_year,
    split_genres,
)


# ---------------------------------------------------------------------------
# extract_year
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("title, expected", [
    ("Toy Story (1995)", 1995),
    ("Matrix, The (1999)", 1999),
    ("No Year Here", None),
    ("Bad Year (abcd)", None),
    ("Trailing space (2001) ", 2001),
])
def test_extract_year(title: str, expected: int | None) -> None:
    assert extract_year(title) == expected


# ---------------------------------------------------------------------------
# clean_title
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("title, expected", [
    ("Toy Story (1995)", "Toy Story"),
    ("Matrix, The (1999)", "The Matrix"),
    ("Beauty and the Beast, The (1991)", "The Beauty and the Beast"),
    ("Shrek (2001)", "Shrek"),
])
def test_clean_title(title: str, expected: str) -> None:
    assert clean_title(title) == expected


# ---------------------------------------------------------------------------
# split_genres
# ---------------------------------------------------------------------------

def test_split_genres_normal() -> None:
    assert split_genres("Action|Adventure|Sci-Fi") == ["Action", "Adventure", "Sci-Fi"]


def test_split_genres_empty() -> None:
    assert split_genres("(no genres listed)") == []
    assert split_genres("") == []


# ---------------------------------------------------------------------------
# compute_rating_stats
# ---------------------------------------------------------------------------

def _make_ratings() -> pd.DataFrame:
    return pd.DataFrame({
        "userId":  [1, 2, 3, 1],
        "movieId": [1, 1, 1, 2],
        "rating":  [4.0, 3.0, 5.0, 2.0],
        "timestamp": [0, 0, 0, 0],
    })


def test_compute_rating_stats() -> None:
    ratings = _make_ratings()
    stats = compute_rating_stats(ratings)
    row = stats[stats["movieId"] == 1].iloc[0]
    assert row["num_ratings"] == 3
    assert abs(row["avg_rating"] - 4.0) < 0.01


# ---------------------------------------------------------------------------
# aggregate_tags
# ---------------------------------------------------------------------------

def test_aggregate_tags() -> None:
    tags = pd.DataFrame({
        "userId":  [1, 2, 1],
        "movieId": [1, 1, 2],
        "tag":     ["sci-fi", "space", "comedy"],
        "timestamp": [0, 0, 0],
    })
    agg = aggregate_tags(tags)
    row = agg[agg["movieId"] == 1].iloc[0]
    assert "sci-fi" in row["tags_text"]
    assert "space" in row["tags_text"]


# ---------------------------------------------------------------------------
# build_movie_records
# ---------------------------------------------------------------------------

def _make_movies() -> pd.DataFrame:
    return pd.DataFrame({
        "movieId": [1, 2, 3],
        "title":   ["Toy Story (1995)", "Jumanji (1995)", "Rare Movie (2000)"],
        "genres":  ["Animation|Children", "Adventure|Children", "Drama"],
    })


def _make_full_ratings() -> pd.DataFrame:
    # movie 3 gets only 2 ratings → should be filtered out (MIN_RATINGS=5)
    rows = []
    for uid in range(1, 8):
        rows.append({"userId": uid, "movieId": 1, "rating": 4.0, "timestamp": 0})
        rows.append({"userId": uid, "movieId": 2, "rating": 3.5, "timestamp": 0})
    rows.append({"userId": 1, "movieId": 3, "rating": 5.0, "timestamp": 0})
    rows.append({"userId": 2, "movieId": 3, "rating": 4.0, "timestamp": 0})
    return pd.DataFrame(rows)


def _make_tags() -> pd.DataFrame:
    return pd.DataFrame({
        "userId":  [1],
        "movieId": [1],
        "tag":     ["pixar"],
        "timestamp": [0],
    })


def test_build_movie_records_basic() -> None:
    movies = _make_movies()
    ratings = _make_full_ratings()
    tags = _make_tags()

    result = build_movie_records(movies, ratings, tags, min_ratings=5)

    # Movie 3 has only 2 ratings — must be excluded
    assert 3 not in result["movieId"].values
    assert len(result) == 2


def test_build_movie_records_text_blob() -> None:
    movies = _make_movies()
    ratings = _make_full_ratings()
    tags = _make_tags()

    result = build_movie_records(movies, ratings, tags, min_ratings=5)
    blob = result[result["movieId"] == 1]["text_blob"].iloc[0]

    assert "Toy Story" in blob
    assert "1995" in blob
    assert "Animation" in blob
    assert "pixar" in blob