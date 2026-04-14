# task: load data(processed) -> embeddings -> Qdrant

from __future__ import annotations
import argparse
import sys
from pathlib import Path

# to make it importable from src/
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from movie_recommender.config import get_settings
from movie_recommender.data.preprocess import load_processed
from movie_recommender.embeddings.embedder import Embedder
from movie_recommender.logging_config import configure_logging, get_logger
from movie_recommender.vector_db.chroma_client import (
    ensure_collection,
    make_client,
    upload_movies,
)
configure_logging()
log = get_logger(__name__)

def build_idx(recreate: bool = False) -> None:
    settings = get_settings()

    log.info("loading")
    df = load_processed(settings.data_processed_dir)
    records = df.to_dict(orient = "records")
    texts = df["text_blob"].tolist()
    log.info(f"loaded {len(records)} movie records")

    log.info("embedding")
    embedder = Embedder()
    vectors = embedder.encode(texts)

    log.info("chromadb connection and collection")
    client = make_client()
    if recreate:
        log.info("delete existing collection")
        try:
            client.delete_collection(settings.chroma_collection_name)
            log.info("collection deleted", collection=settings.chroma_collection_collection_name)
        except Exception:
            pass
    
    collection = ensure_collection(client)


    log.info("uploading to chromadb")
    upload_movies(collection, records, vectors)
    
    final_count = collection.count()
    log.info("idx build done",
             collection=settings.chroma_collection_name,
             vectors_count=final_count,
             dimension=embedder,
    )

    print(f"\nIdx built with \nvector count{final_count} \ndimension {embedder.dimension} and \ncollection '{settings.chroma_collection_name}'.")

def main() -> None:
    parser = argparse.ArgumentParser(description="Build ChromaDB movie idx")
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Drop(delete) and recreate the ChromaDB collection before indexing",
    )
    args = parser.parse_args()
    build_idx(recreate=args.recreate)


if __name__ == "__main__":
    main()