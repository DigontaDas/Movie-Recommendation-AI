from qdrant_client import QdrantClient

def make_client(url: str = "http://localhost:6333") -> QdrantClient:
    return QdrantClient(url=url)
