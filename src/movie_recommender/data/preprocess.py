"""
Preprocessing pipeline for MovieLens data.

Transforms raw DataFrames into enriched, embedding-ready records.

Main output: a DataFrame where every row = one movie, with:
  - movieId, title, year, genres (list), clean_genres (str)
  - avg_rating, num_ratings
  - tags (aggregated free-text)
  - text_blob  ← the field we embed into Qdrant
"""

from __future__ import annotations

import re

import pandas as pd

from movie_recommender.logging_config import get_logger

log = get_logger(__name__)

# Minimum number of ratings for a movie to be included in the index
MIN_RATINGS = 5


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_year(title: str) -> int | None:
    """Pull the 4-digit year from a MovieLens title like 'Toy Story (1995)'."""
    m = re.search(r"\((\d{4})\)$", title.strip())
    return int(m.group(1)) if m else None


def clean_title(title: str) -> str:
    """Strip the trailing year token and normalise whitespace."""
    cleaned = re.sub(r"\s*\(\d{4}\)\s*$", "", title).strip()
    # Move leading article to end: "The Matrix" → already fine; "Matrix, The" → "The Matrix"
    cleaned = re.sub(r"^(.+),\s+(The|A|An)$", r"\2 \1", cleaned, flags=re.IGNORECASE)
    return cleaned


def split_genres(genres_str: str) -> list[str]:
    """'Action|Adventure|Sci-Fi' → ['Action', 'Adventure', 'Sci-Fi']"""
    if not genres_str or genres_str == "(no genres listed)":
        return []
    return [g.strip() for g in genres_str.split("|")]


# ---------------------------------------------------------------------------
# Rating stats
# ---------------------------------------------------------------------------

def compute_rating_stats(ratings: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate per-movie rating statistics.

    Returns
    -------
    DataFrame indexed on movieId with columns: avg_rating, num_ratings
    """
    stats = (
        ratings.groupby("movieId")["rating"]
        .agg(avg_rating="mean", num_ratings="count")
        .reset_index()
    )
    stats["avg_rating"] = stats["avg_rating"].round(2).astype("float32")
    stats["num_ratings"] = stats["num_ratings"].astype("int32")
    log.info("rating stats computed", movies_with_ratings=len(stats))
    return stats


# ---------------------------------------------------------------------------
# Tag aggregation
# ---------------------------------------------------------------------------

def aggregate_tags(tags: pd.DataFrame) -> pd.DataFrame:
    """
    Collapse all user tags per movie into a single space-joined string.

    Returns
    -------
    DataFrame with columns: movieId, tags_text
    """
    agg = (
        tags[tags["tag"].str.len() > 0]
        .groupby("movieId")["tag"]
        .apply(lambda s: " ".join(s.str.lower().unique()))
        .reset_index()
        .rename(columns={"tag": "tags_text"})
    )
    log.info("tags aggregated", movies_with_tags=len(agg))
    return agg


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def build_movie_records(
    movies: pd.DataFrame,
    ratings: pd.DataFrame,
    tags: pd.DataFrame,
    min_ratings: int = MIN_RATINGS,
) -> pd.DataFrame:
    """
    Produce the canonical movie DataFrame used for embedding and indexing.

    Parameters
    ----------
    movies:      raw movies DataFrame from load_movies()
    ratings:     raw ratings DataFrame from load_ratings()
    tags:        raw tags DataFrame from load_tags()
    min_ratings: movies with fewer ratings are excluded

    Returns
    -------
    DataFrame with one row per movie, sorted by movieId.
    Key columns:
        movieId, title, clean_title, year, genres (list[str]),
        genres_str, avg_rating, num_ratings, tags_text, text_blob
    """
    log.info("building movie records", raw_movies=len(movies))

    df = movies.copy()

    # --- Title cleanup & year extraction ---
    df["year"] = df["title"].apply(extract_year)
    df["clean_title"] = df["title"].apply(clean_title)

    # --- Genre expansion ---
    df["genres"] = df["genres"].apply(split_genres)
    df["genres_str"] = df["genres"].apply(lambda g: ", ".join(g) if g else "Unknown")

    # --- Rating stats ---
    stats = compute_rating_stats(ratings)
    df = df.merge(stats, on="movieId", how="left")
    df["avg_rating"] = df["avg_rating"].fillna(0.0).astype("float32")
    df["num_ratings"] = df["num_ratings"].fillna(0).astype("int32")

    # --- Filter low-signal movies ---
    before = len(df)
    df = df[df["num_ratings"] >= min_ratings].copy()
    log.info(
        "filtered low-rating movies",
        removed=before - len(df),
        remaining=len(df),
        min_ratings=min_ratings,
    )

    # --- Tags ---
    tag_agg = aggregate_tags(tags)
    df = df.merge(tag_agg, on="movieId", how="left")
    df["tags_text"] = df["tags_text"].fillna("")

    # --- Text blob for embedding ---
    # Format: "<title> [<year>] Genres: <genres>. Tags: <tags>."
    df["text_blob"] = df.apply(_build_text_blob, axis=1)

    df = df.sort_values("movieId").reset_index(drop=True)
    log.info("movie records ready", total=len(df))
    return df


def _build_text_blob(row: pd.Series) -> str:
    """Compose the text that will be embedded for each movie."""
    year_part = f" [{row['year']}]" if pd.notna(row["year"]) else ""
    genres_part = f"Genres: {row['genres_str']}." if row["genres_str"] != "Unknown" else ""
    tags_part = f"Tags: {row['tags_text']}." if row["tags_text"] else ""

    parts = [f"{row['clean_title']}{year_part}", genres_part, tags_part]
    return " ".join(p for p in parts if p).strip()


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def save_processed(df: pd.DataFrame, processed_dir) -> None:
    """Persist the processed DataFrame as a Parquet file."""
    import pathlib
    out = pathlib.Path(processed_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / "movies_processed.parquet"
    df.to_parquet(path, index=False)
    log.info("saved processed movies", path=str(path), rows=len(df))


def load_processed(processed_dir) -> pd.DataFrame:
    """Load the previously saved processed Parquet file."""
    import pathlib
    path = pathlib.Path(processed_dir) / "movies_processed.parquet"
    if not path.exists():
        raise FileNotFoundError(
            f"Processed file not found: {path}\n"
            "Run `python scripts/build_index.py` first."
        )
    df = pd.read_parquet(path)
    log.info("loaded processed movies", path=str(path), rows=len(df))
    return df