"""User types: "dark psychological thriller"
        ↓
Convert that text into a vector (numbers)
        ↓
Search ChromaDB for movies with similar vectors
        ↓
Return the top 5 matches"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2].parent / "src"))

import chromadb
from movie_recommender.embeddings.embedder import Embedder

embedder = Embedder("all-MiniLM-L6-v2")
client     = chromadb.PersistentClient(path="./chroma_storage")
collection = client.get_collection(name="movies")
def retrieve_movies(query, k=5):
    query_vector = embedder.encode([query])
    results = collection.query(
        query_embeddings=query_vector,
        n_results=k
    )
    return results["metadatas"][0]

if __name__ == "__main__":
    results = retrieve_movies("dark psychological thriller")
    for movie in results:
        print(f"{movie['title']} ({movie['year']}) | {movie['genres']}")