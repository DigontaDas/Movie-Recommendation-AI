"""
MovieLens data loader.

Reads the raw CSV files from data/raw/ml-latest-small/ and returns
clean, typed DataFrames ready for preprocessing.

ml-latest-small files:
    movies.csv   — movieId, title, genres
    ratings.csv  — userId, movieId, rating, timestamp
    links.csv    — movieId, imdbId, tmdbId
    tags.csv     — userId, movieId, tag, timestamp
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from movie_recommender.logging_config import get_logger

log = get_logger(__name__)

# Expected files and their required columns
_REQUIRED: dict[str, list[str]] = {
    "movies.csv":  ["movieId", "title", "genres"],
    "ratings.csv": ["userId", "movieId", "rating", "timestamp"],
    "links.csv":   ["movieId", "imdbId", "tmdbId"],
    "tags.csv":    ["userId", "movieId", "tag", "timestamp"],
}


def _read_csv(path: Path, dtype: dict | None = None) -> pd.DataFrame:
    """Read a CSV with basic validation."""
    if not path.exists():
        raise FileNotFoundError(
            f"Expected MovieLens file not found: {path}\n"
            "Run `python scripts/download_movielens.py` first."
        )
    df = pd.read_csv(path, dtype=dtype)
    log.info("loaded csv", file=path.name, rows=len(df), cols=list(df.columns))
    return df


def load_movies(raw_dir: Path) -> pd.DataFrame:
    """
    Load movies.csv.

    Returns
    -------
    DataFrame with columns: movieId (int), title (str), genres (str)
    """
    df = _read_csv(raw_dir / "movies.csv", dtype={"movieId": "int32"})
    df["genres"] = df["genres"].fillna("(no genres listed)")
    return df


def load_ratings(raw_dir: Path) -> pd.DataFrame:
    """
    Load ratings.csv.

    Returns
    -------
    DataFrame with columns: userId (int), movieId (int), rating (float), timestamp (int)
    """
    df = _read_csv(
        raw_dir / "ratings.csv",
        dtype={"userId": "int32", "movieId": "int32", "rating": "float32"},
    )
    return df


def load_links(raw_dir: Path) -> pd.DataFrame:
    """
    Load links.csv.

    Returns
    -------
    DataFrame with columns: movieId (int), imdbId (str), tmdbId (str)
    """
    # imdbId / tmdbId can have leading zeros — keep as string
    df = _read_csv(
        raw_dir / "links.csv",
        dtype={"movieId": "int32", "imdbId": "str", "tmdbId": "str"},
    )
    return df


def load_tags(raw_dir: Path) -> pd.DataFrame:
    """
    Load tags.csv.

    Returns
    -------
    DataFrame with columns: userId (int), movieId (int), tag (str), timestamp (int)
    """
    df = _read_csv(
        raw_dir / "tags.csv",
        dtype={"userId": "int32", "movieId": "int32"},
    )
    df["tag"] = df["tag"].fillna("").str.strip()
    return df


def load_all(raw_dir: Path) -> dict[str, pd.DataFrame]:
    """
    Convenience: load all four CSVs and return as a named dict.

    Usage
    -----
    >>> from movie_recommender.config import get_settings
    >>> data = load_all(get_settings().data_raw_dir)
    >>> data["movies"].head()
    """
    log.info("loading all movielens files", raw_dir=str(raw_dir))
    return {
        "movies":  load_movies(raw_dir),
        "ratings": load_ratings(raw_dir),
        "links":   load_links(raw_dir),
        "tags":    load_tags(raw_dir),
    }