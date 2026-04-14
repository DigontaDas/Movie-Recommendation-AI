import chromadb
from chromadb.config import Settings
from movie_recommender.config import get_settings
def make_client(persist_directory: str = "./chroma_storage") -> chromadb.Client:
    client = chromadb.PersistentClient(path=persist_directory)
    return client
def ensure_collection(client):
    settings = get_settings()
    return client.get_or_create_collection(name=settings.chroma_collection_name)

def upload_movies(collection, records, vectors):
    ids = [str(record["movieId"]) for record in records]
    
    metadatas = [
        {
            "title":       record["clean_title"],
            "year":        int(record["year"]) if record["year"] else 0,
            "genres":      record["genres_str"],
            "avg_rating":  float(record["avg_rating"]),
            "num_ratings": int(record["num_ratings"]),
            "tags":        record["tags_text"],
        }
        for record in records
    ]
    
    collection.add(
        ids        = ids,
        embeddings = vectors.tolist(),
        metadatas  = metadatas,
        documents  = [record["text_blob"] for record in records]
    )