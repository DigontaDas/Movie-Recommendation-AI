"""
ChromaDB client wrapper.

Handles:
  - Creating / verifying the movies collection
  - Uploading movie vectors with metadata (payload)
  - Searching by vector similarity
"""

from __future__ import annotations

import chromadb
from chromadb.config import Settings as ChromaSettings

from movie_recommender.config import get_settings
from movie_recommender.logging_config import get_logger

log = get_logger(__name__)


def make_client() -> chromadb.Client:
    """
    Create and return a ChromaDB client.
    Uses persistent storage so data survives restarts.
    """
    settings = get_settings()
    log.info("connecting to chromadb", path=str(settings.chroma_persist_dir))

    client = chromadb.PersistentClient(
        path=str(settings.chroma_persist_dir),
        settings=ChromaSettings(anonymized_telemetry=False),
    )
    return client


def ensure_collection(client: chromadb.Client) -> chromadb.Collection:
    """
    Get the movies collection if it exists, or create it fresh.

    ChromaDB handles embeddings externally (we pass them in manually),
    so we set embedding_function=None.

    Parameters
    ----------
    client: connected ChromaDB PersistentClient

    Returns
    -------
    chromadb.Collection
    """
    settings = get_settings()
    name = settings.chroma_collection_name

    collection = client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},  # cosine similarity, matches normalised embeddings
    )
    log.info("collection ready", collection=name, existing_docs=collection.count())
    return collection


def upload_movies(
    collection: chromadb.Collection,
    records: list[dict],
    vectors: list[list[float]],
    batch_size: int = 128,
) -> None:
    """
    Upload movie vectors + metadata to ChromaDB in batches.

    Parameters
    ----------
    collection: ChromaDB collection object
    records:    list of dicts, one per movie
    vectors:    list of embedding vectors, same order as records
    batch_size: how many to upload per call
    """
    total = len(records)
    log.info("uploading to chromadb", total=total)

    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        batch_records = records[start:end]
        batch_vectors = vectors[start:end]

        ids = [str(r["movieId"]) for r in batch_records]

        embeddings = [
            v.tolist() if hasattr(v, "tolist") else v
            for v in batch_vectors
        ]

        metadatas = [
            {
                "movieId":     int(r["movieId"]),
                "title":       str(r.get("title", "")),
                "clean_title": str(r.get("clean_title", "")),
                "year":        int(r["year"]) if r.get("year") and str(r["year"]) != "nan" else 0,
                "genres_str":  str(r.get("genres_str", "")),
                "avg_rating":  float(r.get("avg_rating", 0.0)),
                "num_ratings": int(r.get("num_ratings", 0)),
                "tags_text":   str(r.get("tags_text", "")),
            }
            for r in batch_records
        ]

        documents = [str(r.get("text_blob", "")) for r in batch_records]

        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents,
        )
        log.info("uploaded batch", start=start, end=end, total=total)

    log.info("upload complete", total=total)


def search_movies(
    collection: chromadb.Collection,
    query_vector: list[float],
    top_k: int | None = None,
) -> list[dict]:
    """
    Search for the most similar movies to a query vector.

    Parameters
    ----------
    collection:   ChromaDB collection
    query_vector: embedded query (1D list/array)
    top_k:        number of results to return (default from config)

    Returns
    -------
    List of metadata dicts ordered by similarity, each with a 'score' key.
    """
    settings = get_settings()
    k = top_k or settings.retrieval_top_k

    qv = query_vector.tolist() if hasattr(query_vector, "tolist") else query_vector

    results = collection.query(
        query_embeddings=[qv],
        n_results=k,
        include=["metadatas", "documents", "distances"],
    )

    hits = []
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    for meta, dist in zip(metadatas, distances):
        item = dict(meta)
        # ChromaDB returns cosine distance (0=identical, 2=opposite)
        # Convert to similarity score (1=identical, -1=opposite)
        item["score"] = round(1 - dist, 4)
        hits.append(item)

    log.info("search complete", results=len(hits), top_k=k)
    return hits
